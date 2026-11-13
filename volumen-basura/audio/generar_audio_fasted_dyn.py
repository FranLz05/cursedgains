"""Musica y efectos (numpy/scipy) para el corte DINAMICO de "The Fasted Cardio Myth" (FastedCardioDynamic, 14 micro-escenas).
Misma voz que el Short 5 (public/voz_fasted/voz.wav + src/videos/fasted/palabras.json). Los cortes salen de src/videos/fasted2/cams.json:
cada corte duro lleva un whoosh + golpe, y cada micro-escena tiene su propia musica y sus efectos sincronizados a las palabras.
Salida: out/mezcla_fasted_dyn_raw.wav y public/voz_fasted/mezcla_dyn.wav (loudnorm -14 LUFS), el audio que usa Fasted2.tsx.
Uso: python volumen-basura/audio/generar_audio_fasted_dyn.py"""
import os, json, math, wave, subprocess
import numpy as np
from scipy import signal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 44100; FPS = 30
CAMS = json.load(open(os.path.join(ROOT, "src", "videos", "fasted2", "cams.json")))
WORDS = json.load(open(os.path.join(ROOT, "src", "videos", "fasted", "palabras.json"), encoding="utf-8"))["words"]
TOT = CAMS["total"]; CUT = [s["f0"] / FPS for s in CAMS["shots"]]; END = CUT[1:] + [TOT / FPS]
DUR = TOT / FPS + 0.25; N = int(DUR * SR)
rng = np.random.default_rng(7)

def word(n, nth=0):
    hits = [w for w in WORDS if "".join(ch for ch in w["w"].lower() if ch.isalnum()) == n]
    return hits[nth]["f"] / FPS
def tt(d): return np.arange(int(d * SR)) / SR
def env_exp(d, k): return np.exp(-tt(d) * k)
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, a, b, o=2): return signal.sosfilt(signal.butter(o, [a, b], "band", fs=SR, output="sos"), x)
def noise(d): return rng.standard_normal(int(d * SR))
def fade(x, a=0.004, b=0.004):
    n = len(x); i, o = min(n, int(a * SR)), min(n, int(b * SR)); x = x.copy()
    if i: x[:i] *= np.linspace(0, 1, i)
    if o: x[-o:] *= np.linspace(1, 0, o)
    return x
def put(buf, x, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(x) <= 0: return
    a, b = max(0, i), min(N, i + len(x)); seg = x[a - i: b - i] * g
    buf[0, a:b] += seg * (1 - max(0, pan)); buf[1, a:b] += seg * (1 + min(0, pan))
def sweep(f0, f1, d, curve=2.0):
    t = tt(d); u = (t / d) ** curve; f = f0 + (f1 - f0) * u
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def saw(f, d, det=(0.0,)):
    t = tt(d); y = 0
    for c in det: y = y + (2 * ((t * f * (1 + c * 0.006)) % 1.0) - 1)
    return y / len(det)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def kick(pitch=48, d=0.32, punch=1.0):
    x = sweep(150 * punch + 40, pitch, d, 0.35) * env_exp(d, 11); c = hp(noise(0.012), 2500) * np.linspace(1, 0, int(0.012 * SR)) * 0.35; x[: len(c)] += c
    return fade(x, 0.0005, 0.01)
def clap(): return fade(bp(noise(0.22), 1100, 4800) * env_exp(0.22, 22) * 0.9, 0.0005, 0.02)
def hat(open_=False):
    d = 0.2 if open_ else 0.05
    return fade(hp(noise(d), 7500) * env_exp(d, 18 if open_ else 70) * 0.5, 0.0003, 0.01)
def bass(f, d, cut=700, g=1.0):
    x = saw(f, d) * 0.7 + np.sin(2 * np.pi * f * tt(d)) * 0.7
    return fade(lp(x, cut) * np.minimum(1, tt(d) * 90) * np.exp(-tt(d) * 2.2) * g, 0.002, 0.03)
def stab(f, d=0.25, cut=3200, g=1.0): return fade(lp(saw(f, d, (-1, 0, 1)) * np.exp(-tt(d) * 6), cut) * g, 0.002, 0.03)
def pluck(f, d=0.5, g=1.0):
    t = tt(d); x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 7), (2.76, 0.4, 14), (5.4, 0.2, 26)])
    return fade(x * g, 0.001, 0.05)
def bell(f, d=1.4, g=1.0):
    t = tt(d); x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 2.5), (2.0, 0.6, 3.5), (3.0, 0.4, 5), (4.2, 0.25, 8)])
    return fade(x * g, 0.001, 0.2)

BPM = 128.0; BEAT = 60.0 / BPM; BAR = 4 * BEAT
PROG = [57, 53, 60, 55]; CHORD = {57: [57, 60, 64], 53: [53, 57, 60], 60: [60, 64, 67], 55: [55, 59, 62]}
music = np.zeros((2, N)); sfx = np.zeros((2, N))
def drums(t0, t1, kick_on=True, hats=True, clap_on=True, half=False, sixteenth=False):
    t = math.ceil(t0 / BEAT - 1e-6) * BEAT
    while t < t1:
        beat = int(round(t / BEAT)) % 4
        if kick_on and (beat in (0, 2) if half else True): put(music, kick(), t, 0.95)
        if clap_on and beat in (1, 3) and not half: put(music, clap(), t, 0.45)
        if hats:
            put(music, hat(), t + BEAT / 2, 0.35)
            if sixteenth: put(music, hat(), t + BEAT / 4, 0.2); put(music, hat(), t + BEAT * 0.75, 0.2)
        t += BEAT
def bassline(t0, t1, g=0.9, cut=600, off=0):
    t = math.ceil(t0 / (BEAT / 2) - 1e-6) * (BEAT / 2); pat = [1, 0, 1, 1, 0, 1, 1, 0]
    while t < t1:
        bar = int(t // BAR); k = int(round((t - bar * BAR) / (BEAT / 2))) % 8
        if pat[k]: put(music, bass(midi(PROG[bar % 4] - 24 + off + (12 if k in (3, 6) else 0)), BEAT * 0.45, cut, g), t)
        t += BEAT / 2
def arp(t0, t1, g=0.35, cut=3000, oct_=12):
    t = math.ceil(t0 / (BEAT / 2) - 1e-6) * (BEAT / 2); i = 0
    while t < t1:
        ch = CHORD[PROG[int(t // BAR) % 4]]; put(music, stab(midi(ch[i % 3] + oct_), BEAT * 0.4, cut, g), t, 1.0, pan=0.25 * (1 if i % 2 else -1)); t += BEAT / 2; i += 1
def plucks(t0, t1, g=0.5, oct_=12):
    t = math.ceil(t0 / (BEAT / 2) - 1e-6) * (BEAT / 2); pat = [0, 2, 1, 2, 0, 1, 2, 1]; i = 0
    while t < t1:
        ch = CHORD[PROG[int(t // BAR) % 4]]
        if (int(round(t / (BEAT / 2))) % 8) in (0, 2, 3, 5, 6): put(music, pluck(midi(ch[pat[i % 8] % 3] + oct_), 0.45, g), t, 1.0, pan=0.3 * (1 if i % 2 else -1))
        t += BEAT / 2; i += 1
def riser(t0, t1, g=0.5):
    d = t1 - t0; put(music, sweep(180, 1400, d, 2.5) * np.linspace(0, 1, int(d * SR)) ** 2 * g * 0.5, t0)
    put(music, hp(noise(d), 2000) * np.linspace(0, 1, int(d * SR)) ** 2 * g * 0.3, t0)

def whoosh(t_end, d=0.4, g=0.7, up=True):
    n = noise(d); out = np.zeros_like(n); B = 1024
    for s_ in range(0, len(n) - B, B):
        u = s_ / len(n); f = 400 + 3800 * (u if up else 1 - u) ** 1.3
        out[s_:s_ + B] = bp(n[s_:s_ + B], max(80, f * 0.6), min(f * 1.5, SR * 0.45), 2)[:B]
    put(sfx, fade(out * np.sin(np.pi * np.linspace(0, 1, len(out))) ** 1.5, 0.01, 0.05) * g, t_end - d * 0.8)
def tap(t, g=0.5, f0=900, pan=0.0): put(sfx, fade(bp(noise(0.05), f0, f0 * 2.4) * env_exp(0.05, 60), 0.0004, 0.01) * g, t, pan=pan)
def thud(t, g=0.8, f=110, pan=0.0): put(sfx, fade(lp(sweep(f * 1.4, f * 0.6, 0.16, 0.6), 400) * env_exp(0.16, 18), 0.001, 0.03) * g, t, pan=pan)
def boom(t, g=1.0): put(sfx, fade(lp(sweep(90, 30, 0.9, 0.5), 300) * env_exp(0.9, 4), 0.001, 0.2) * g, t); put(sfx, fade(lp(noise(0.5), 900) * env_exp(0.5, 7), 0.001, 0.1) * g * 0.6, t)
def beep(t, g=0.35, f=880, d=0.16): put(sfx, fade(np.sin(2 * np.pi * f * tt(d)) * env_exp(d, 6), 0.002, 0.03) * g, t)
def ding(t, g=0.5, n_=88): put(sfx, bell(midi(n_), 1.5, g), t); put(sfx, bell(midi(n_ + 7), 1.1, g * 0.55), t + 0.1)
def growl(t, d=0.7, g=0.6, f=70):
    x = lp(saw(f, d, (-4, 0, 4)) * (0.7 + 0.3 * np.sin(2 * np.pi * 18 * tt(d))), 600) * np.sin(np.pi * np.linspace(0, 1, int(d * SR))) ** 0.6
    put(sfx, fade(x + lp(noise(d), 400) * 0.5 * np.sin(np.pi * np.linspace(0, 1, int(d * SR))), 0.02, 0.1) * g, t)
def pop(t, g=0.4, f=700): put(sfx, fade(sweep(f, f * 2.2, 0.08, 0.6) * env_exp(0.08, 25), 0.001, 0.02) * g, t)
def slide(t, f0, f1, d, g=0.4): put(sfx, fade(sweep(f0, f1, d, 1.0) * (1 + 0.15 * np.sin(2 * np.pi * 6 * tt(d))), 0.02, 0.05) * g, t)
def sparkle(t, g=0.3):
    for k in range(6): put(sfx, fade(np.sin(2 * np.pi * rng.uniform(2500, 5000) * tt(0.12)) * env_exp(0.12, 30), 0.001, 0.02) * g, t + k * 0.06, pan=rng.uniform(-0.5, 0.5))

# ------------------------------------------------------------------ music per micro-scene
s = CUT; e = END
# 0-1 night bedroom + fridge: no beat, a low eerie pad with a ticking clock
pad = lp(saw(midi(45), e[1], (-3, 0, 3)), 500) * 0.25; put(music, fade(pad, 0.2, 0.05), 0)
# 2-3 the gym + the bear: the drop, full drive
put(music, kick(34, 0.9, 1.6), s[2], 1.3); drums(s[2], e[3] - 0.05, sixteenth=True); bassline(s[2], e[3] - 0.05, 0.95, 700); arp(s[2], e[3] - 0.05, 0.3, 3300)
# 4 the dream: no drums, dreamy plucks + bells, harp gliss; silence after the stamp, then a riser into the tanks
tStamp = word("doesnt")
plucks(s[4], tStamp - 0.1, 0.5, 24)
for k in range(10): put(music, pluck(midi([69, 72, 76, 79, 81, 84, 88, 91, 93, 96][k]), 0.6, 0.35), s[4] + 0.05 + k * 0.05)
put(music, bell(midi(84), 2.0, 0.3), s[4] + 0.6)
riser(e[4] - 1.2, e[4] - 0.02, 0.35)
# 5-6 tanks + insulin: bright groove
put(music, kick(34, 0.9, 1.6), s[5], 1.2); drums(s[5], e[6] - 0.05, sixteenth=True); bassline(s[5], e[6] - 0.05, 0.9, 700); plucks(s[5], e[6] - 0.05, 0.4)
# 7 the brain: tense low pulse
drums(s[7], e[7] - 0.05, clap_on=False, hats=True, half=True); bassline(s[7], e[7] - 0.05, 0.9, 400, -2)
# 8 living room: lazy half-time, resolve on "budget"
tBud = word("budget"); drums(s[8], e[8] - 0.05, clap_on=False, half=True); bassline(s[8], e[8] - 0.05, 0.6, 500, -5); arp(word("carbs"), tBud, 0.22, 2800)
for n_ in (57, 60, 64, 69): put(music, stab(midi(n_), 1.4, 4200, 0.45), tBud)
# 9-10 the race + the scales: full drive
put(music, kick(34, 0.9, 1.6), s[9], 1.2); drums(s[9], e[10] - 0.05, sixteenth=True); bassline(s[9], e[10] - 0.05, 0.95, 700); arp(s[9], e[10] - 0.05, 0.3, 3300)
# 11 the splat: music stops dead on the landing, a sad wobble
tSplat = word("suffering"); drums(s[11], tSplat - 0.05, sixteenth=True); bassline(s[11], tSplat - 0.05, 0.9, 700)
padL = saw(midi(45), 1.2, (-3, 0, 3)) * (1 + 0.3 * np.sin(2 * np.pi * 5.0 * tt(1.2))); put(music, fade(lp(padL, 800) * 0.4, 0.1, 0.4), tSplat + 0.3)
# 12-13 the pigeon + the banana: bouncy pizzicato, final chord
plucks(s[12], e[13] - 1.2, 0.45); drums(s[12], e[13] - 1.2, clap_on=False, half=True); bassline(s[12], e[13] - 1.2, 0.6, 600)
for n_ in (57, 60, 64, 69, 76): put(music, stab(midi(n_), 2.2, 4200, 0.45), e[13] - 1.15)
put(music, kick(40, 0.6, 1.4), e[13] - 1.15, 1.1); put(music, bell(midi(88), 2.0, 0.4), e[13] - 1.1)

# ------------------------------------------------------------------ SFX
for k, tc in enumerate(CUT):                                         # hard cuts: whoosh + hit
    if tc < 0.01: continue
    whoosh(tc + 0.04, 0.3, 0.45, up=bool(k % 2)); thud(tc, 0.6, 90)
# 0 the alarm clock (fast double beeps), the whip pan, the bed creak + zombie groan
k = 0
while 0.05 + k * 0.25 < 2.45: beep(0.05 + k * 0.25, 0.32, 2093, 0.08); beep(0.05 + k * 0.25 + 0.1, 0.32, 2093, 0.08); k += 1
whoosh(2.62, 0.35, 0.8); thud(2.7, 0.4, 180)
put(sfx, fade(sweep(300, 180, 0.6, 1.0) * env_exp(0.6, 3) * 0.25, 0.02, 0.1), 2.8); growl(2.95, 0.9, 0.45, 95)
k = 0
while k * 1.0 < s[2] - 0.1: tap(0.5 + k * 1.0, 0.18, 1800); k += 1
# 1 the fridge: hum, a door creak, one cricket
put(sfx, fade(lp(saw(60, e[1] - s[1], (0,)), 200) * 0.12, 0.05, 0.05), s[1])
put(sfx, fade(bp(saw(140, 0.5, (0, 3)), 300, 1500) * env_exp(0.5, 2) * 0.25, 0.02, 0.1), s[1] + 0.05)
for k in range(3): put(sfx, fade(np.sin(2 * np.pi * 4200 * tt(0.05)) * (np.sin(2 * np.pi * 60 * tt(0.05)) > 0), 0.001, 0.01) * 0.12, s[1] + 0.5 + k * 0.08)
# 2 treadmill motor + frantic steps, the bear: a growl building, the ROAR on "bear"
tBear = word("bear"); d2 = e[3] - s[2]
put(sfx, fade(lp(saw(120, d2, (-3, 0, 3)), 900) * 0.25 * (1 + 0.25 * np.sin(2 * np.pi * 9 * tt(d2))), 0.1, 0.1), s[2])
k = 0
while s[2] + k / 9.0 < e[3] - 0.05: tap(s[2] + k / 9.0, 0.2, 800 + 200 * (k % 2), pan=0.15 * (1 if k % 2 else -1)); k += 1
growl(tBear - 0.9, 0.8, 0.4, 60); growl(tBear - 0.05, 1.6, 1.0, 48); boom(tBear, 0.6)
# 3 "Why?": three pops for the question marks
tWhy = word("why")
for k in range(3): pop(tWhy + k * 0.12, 0.35, 600 + 150 * k)
# 4 the dream: torches roaring, neon buzz + ding on "double", the stamp falls: whoosh, a massive THUD on "doesn't", a record scratch
d4 = tStamp - s[4]; put(sfx, fade(bp(noise(d4), 300, 2500) * 0.12, 0.2, 0.05), s[4])
tDouble = word("double"); put(sfx, fade(lp(saw(120, 0.4), 2000) * 0.15, 0.01, 0.1), tDouble - 0.1); ding(tDouble, 0.45, 91)
whoosh(tStamp + 0.02, 0.35, 1.0, up=False); boom(tStamp, 1.1); thud(tStamp, 1.0, 70)
put(sfx, fade(bp(noise(0.35), 800, 4000) * (1 + np.sin(2 * np.pi * 14 * tt(0.35))) * 0.25, 0.005, 0.05), tStamp + 0.15)
# 5 tanks bubbling + a draining tone
for k in range(40): put(sfx, fade(sweep(rng.uniform(300, 700), rng.uniform(800, 1400), 0.06, 0.7) * env_exp(0.06, 30), 0.001, 0.01) * 0.12, s[5] + rng.uniform(0, e[5] - s[5]), pan=rng.uniform(-0.6, 0.6))
put(sfx, sweep(900, 300, e[5] - s[5], 1.0) * np.linspace(0.08, 0.02, int((e[5] - s[5]) * SR)), s[5])
# 6 the gauge needle drops (descending blip + click), thumbs up: ding + sparkle
tLow = word("low"); slide(tLow - 0.4, 1200, 300, 0.45, 0.25); tap(tLow + 0.05, 0.5, 1500)
tSounds = word("sounds"); ding(tSounds, 0.45, 93); sparkle(tSounds + 0.05, 0.25)
# 7 the brain: computer chirps, the lever CLUNK on "stupid", alarm siren
for k in range(8): beep(s[7] + 0.1 + k * 0.17, 0.12, rng.choice([1320, 1760, 2093]), 0.05)
tStu = word("stupid"); thud(tStu, 1.0, 120); tap(tStu, 0.6, 600); boom(tStu + 0.02, 0.4)
for k in range(3): slide(tStu + 0.15 + k * 0.5, 700, 1100, 0.25, 0.2); slide(tStu + 0.4 + k * 0.5, 1100, 700, 0.25, 0.2)
# 8 living room: a slow clock tick, sofa groan, two blocks dropping (thud + clink), the balance creak, a chime on "budget"
for k in range(6): tap(s[8] + 0.3 + k * 0.5, 0.15, 1600)
put(sfx, fade(lp(sweep(260, 90, 0.9, 0.8), 800) * np.exp(-tt(0.9) * 1.6), 0.01, 0.2) * 0.45, s[8] + 0.15)
tC = word("carbs")
for d in (tC - 0.05 + 0.22, tC + 0.3 + 0.22): thud(d, 0.7, 150); put(sfx, bell(midi(96), 0.3, 0.15), d)
put(sfx, fade(bp(saw(90, 0.7, (0, 4)), 200, 1200) * env_exp(0.7, 3) * 0.2, 0.02, 0.1), word("balance"))
ding(tBud, 0.55, 93)
# 9 the race: two sets of steps, the tape SNAP, a jump whoosh, the landing on the scales
k = 0
while s[9] + 0.1 + k / 8.0 < s[9] + 3.2: tap(s[9] + 0.1 + k / 8.0, 0.2, 700 if k % 2 else 1000, pan=-0.3 if k % 2 else 0.3); k += 1
tJump = 1150 / FPS; whoosh(tJump + 0.3, 0.4, 0.7); put(sfx, fade(hp(noise(0.08), 2000) * env_exp(0.08, 30), 0.001, 0.02) * 0.6, tJump + 0.25); thud(tJump + 0.72, 0.9, 100)
# 10 the scales: beeps then a double ding on "same"
tSame = word("same")
for k in range(3): beep(tSame - 0.45 + k * 0.12, 0.22, 1320, 0.06)
ding(tSame, 0.55, 91); ding(tSame + 0.12, 0.4, 91)
# 11 the launch: slide whistle up and down, the SPLAT, stars twinkling
slide(s[11] + 0.02, 500, 1400, 0.35, 0.35); slide(s[11] + 0.37, 1400, 300, 0.36, 0.35)
boom(tSplat, 0.9); thud(tSplat, 1.0, 80); put(sfx, fade(bp(noise(0.25), 400, 2500) * env_exp(0.25, 12), 0.001, 0.05) * 0.6, tSplat)
for k in range(5): put(sfx, bell(midi(100 + (k % 3) * 2), 0.4, 0.12), tSplat + 0.25 + k * 0.18)
# 12 the pigeon: wing flaps, the throw whoosh, the catch pop, the battery charging, a power-up chime
for k in range(4): put(sfx, fade(bp(noise(0.06), 300, 1500) * env_exp(0.06, 30), 0.001, 0.01) * 0.3, s[12] + 0.05 + k * 0.09)
tBan = word("banana"); whoosh(tBan + 0.25, 0.35, 0.6); pop(tBan + 0.5, 0.5, 500)
put(sfx, sweep(300, 1600, 0.55, 1.2) * np.linspace(0.05, 0.2, int(0.55 * SR)), tBan + 0.5); ding(tBan + 1.05, 0.5, 96)
# 13 the sign rises: whoosh + stamp, the final sparkle
whoosh(s[13] + 0.3, 0.3, 0.5); thud(s[13] + 0.45, 0.6, 150); sparkle(e[13] - 1.15, 0.3)
room = lp(noise(DUR), 500) * 0.02; sfx[0] += room; sfx[1] += room

# ------------------------------------------------------------------ voice, ducking, mix
w = wave.open(os.path.join(ROOT, "public", "voz_fasted", "voz.wav")); vs = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
if w.getnchannels() == 2: vs = vs[::2]
if w.getframerate() != SR:
    g = math.gcd(SR, w.getframerate()); vs = signal.resample_poly(vs, SR // g, w.getframerate() // g)
voice = np.zeros((2, N)); voice[0, : min(N, len(vs))] = vs[:N]; voice[1] = voice[0]
act = np.abs(voice[0]); r = np.exp(-1 / (0.25 * SR)); env = np.zeros(N); ee = 0.0
for i in range(0, N, 64):
    m = act[i:i + 64].max(); ee = m if m > ee else ee * (r ** 64); env[i:i + 64] = ee
env = np.clip(env / (np.percentile(env, 95) + 1e-9), 0, 1); duck = 1 - 0.55 * env
rms = lambda x: math.sqrt(float(np.mean(x[x != 0] ** 2))) if np.any(x != 0) else 1e-9
rv = rms(voice[0][np.abs(voice[0]) > 0.01])
mus = music * duck; mus *= (rv * 10 ** (-8 / 20)) / rms(mus[0][np.abs(mus[0]) > 1e-4])
sf = sfx.copy(); sf *= (rv * 10 ** (-8.5 / 20)) / rms(sf[0][np.abs(sf[0]) > 1e-3])
mix = voice + mus + sf; mix = mix / max(1.0, np.max(np.abs(mix)) / 0.89)
out_dir = os.path.join(ROOT, "out")
def wr(path, x):
    y = (np.clip(x, -1, 1).T * 32767).astype("<i2")
    with wave.open(path, "wb") as o: o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes(y.tobytes())
raw = os.path.join(out_dir, "mezcla_fasted_dyn_raw.wav"); wr(raw, mix)
FF = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
dst = os.path.join(ROOT, "public", "voz_fasted", "mezcla_dyn.wav")
subprocess.run([FF, "-y", "-v", "error", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", dst], check=True)
print("ok: peak", round(float(np.max(np.abs(mix))), 3), "dur", round(N / SR, 2), "->", dst)
