"""Musica y efectos originales (numpy/scipy) para "The Fasted Cardio Myth" (PumpParadox, Short 5).
Voz = public/voz_fasted/voz.wav. Musica 128 BPM en La menor (kick en cada pulso desde el frame 0, igual que beatPhase() de story.ts, para que la camara "golpee"
con el bombo) con sidechain a la voz. Efectos sincronizados a las escenas (escenas.json), a cada corte de camara (shots.json) y a las palabras (palabras.json).
Salida: out/mezcla_fasted_raw.wav + stems, y public/voz_fasted/mezcla.wav (normalizada a -14 LUFS con ffmpeg), que es el audio que usa Fasted3D.tsx.
Uso: python volumen-basura/audio/generar_audio_fasted.py"""
import os, json, math, wave, subprocess
import numpy as np
from scipy import signal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 44100
FPS = 30
SPOT = os.path.join(ROOT, "src", "videos", "fasted")
ES = json.load(open(os.path.join(SPOT, "escenas.json")))
SH = json.load(open(os.path.join(SPOT, "shots.json")))
WORDS = json.load(open(os.path.join(SPOT, "palabras.json"), encoding="utf-8"))["words"]
ST = ES["scenes"]; TOT = ES["total"]
END = ST[1:] + [TOT]
DUR = TOT / FPS + 0.25
N = int(DUR * SR)
rng = np.random.default_rng(4)
s = [ST[i] / FPS for i in range(5)]; e = [END[i] / FPS for i in range(5)]

def word(norm_, nth=0):
    hits = [w for w in WORDS if "".join(ch for ch in w["w"].lower() if ch.isalpha()) == norm_]
    return hits[nth]

# ------------------------------------------------------------------ helpers
def tt(d): return np.arange(int(d * SR)) / SR
def env_exp(d, k): return np.exp(-tt(d) * k)
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, a, b, o=2): return signal.sosfilt(signal.butter(o, [a, b], "band", fs=SR, output="sos"), x)
def noise(d): return rng.standard_normal(int(d * SR))
def fade(x, a=0.004, b=0.004):
    n = len(x); i, o = min(n, int(a * SR)), min(n, int(b * SR))
    x = x.copy()
    if i: x[:i] *= np.linspace(0, 1, i)
    if o: x[-o:] *= np.linspace(1, 0, o)
    return x
def put(buf, x, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(x) <= 0: return
    a, b = max(0, i), min(N, i + len(x))
    seg = x[a - i: b - i] * g
    buf[0, a:b] += seg * (1 - max(0, pan)); buf[1, a:b] += seg * (1 + min(0, pan))
def sweep(f0, f1, d, curve=2.0):
    t = tt(d); u = (t / d) ** curve
    f = f0 + (f1 - f0) * u
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def saw(f, d, det=(0.0,)):
    t = tt(d); y = 0
    for c in det:
        ph = (t * f * (1 + c * 0.006)) % 1.0
        y = y + (2 * ph - 1)
    return y / len(det)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

# ------------------------------------------------------------------ voices
def kick(pitch=48, d=0.32, punch=1.0):
    x = sweep(150 * punch + 40, pitch, d, 0.35) * env_exp(d, 11)
    click = hp(noise(0.012), 2500) * np.linspace(1, 0, int(0.012 * SR)) * 0.35
    x[: len(click)] += click
    return fade(x, 0.0005, 0.01)
def clap():
    return fade(bp(noise(0.22), 1100, 4800) * env_exp(0.22, 22) * 0.9, 0.0005, 0.02)
def hat(open_=False):
    d = 0.2 if open_ else 0.05
    return fade(hp(noise(d), 7500) * env_exp(d, 18 if open_ else 70) * 0.5, 0.0003, 0.01)
def bass(f, d, cut=700, g=1.0):
    x = saw(f, d) * 0.7 + np.sin(2 * np.pi * f * tt(d)) * 0.7
    x = lp(x, cut) * np.minimum(1, tt(d) * 90) * np.exp(-tt(d) * 2.2)
    return fade(x * g, 0.002, 0.03)
def stab(f, d=0.25, cut=3200, g=1.0):
    return fade(lp(saw(f, d, (-1, 0, 1)) * np.exp(-tt(d) * 6), cut) * g, 0.002, 0.03)
def pluck(f, d=0.5, g=1.0):
    t = tt(d)
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 7), (2.76, 0.4, 14), (5.4, 0.2, 26)])
    return fade(x * g, 0.001, 0.05)
def bell(f, d=1.4, g=1.0):
    t = tt(d)
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 2.5), (2.0, 0.6, 3.5), (3.0, 0.4, 5), (4.2, 0.25, 8)])
    return fade(x * g, 0.001, 0.2)

# ------------------------------------------------------------------ the score
BPM = 128.0; BEAT = 60.0 / BPM; BAR = 4 * BEAT
PROG = [57, 53, 60, 55]
CHORD = {57: [57, 60, 64], 53: [53, 57, 60], 60: [60, 64, 67], 55: [55, 59, 62]}
music = np.zeros((2, N))

def drums(t0, t1, kick_on=True, hats=True, clap_on=True, half=False, sixteenth=False):
    t = math.ceil(t0 / BEAT - 1e-6) * BEAT
    while t < t1:
        beat = int(round(t / BEAT)) % 4
        if kick_on and (beat in (0, 2) if half else True): put(music, kick(), t, 0.95)
        if clap_on and beat in (1, 3) and not half: put(music, clap(), t, 0.45)
        if hats:
            put(music, hat(), t + BEAT / 2, 0.35)
            if sixteenth: put(music, hat(), t + BEAT / 4, 0.2); put(music, hat(), t + BEAT * 0.75, 0.2)
            elif beat == 3: put(music, hat(True), t + BEAT * 0.75, 0.2)
        t += BEAT
def bassline(t0, t1, g=0.9, cut=600, off=0):
    t = math.ceil(t0 / (BEAT / 2) - 1e-6) * (BEAT / 2)
    pat = [1, 0, 1, 1, 0, 1, 1, 0]
    while t < t1:
        bar = int(t // BAR); k = int(round((t - bar * BAR) / (BEAT / 2))) % 8
        if pat[k]: put(music, bass(midi(PROG[bar % 4] - 24 + off + (12 if k in (3, 6) else 0)), BEAT * 0.45, cut, g), t)
        t += BEAT / 2
def arp(t0, t1, g=0.35, cut=3000, oct_=12):
    t = math.ceil(t0 / (BEAT / 2) - 1e-6) * (BEAT / 2); i = 0
    while t < t1:
        bar = int(t // BAR); ch = CHORD[PROG[bar % 4]]
        put(music, stab(midi(ch[i % 3] + oct_), BEAT * 0.4, cut, g), t, 1.0, pan=0.25 * (1 if i % 2 else -1)); t += BEAT / 2; i += 1
def plucks(t0, t1, g=0.5):
    t = math.ceil(t0 / (BEAT / 2) - 1e-6) * (BEAT / 2); pat = [0, 2, 1, 2, 0, 1, 2, 1]; i = 0
    while t < t1:
        bar = int(t // BAR); ch = CHORD[PROG[bar % 4]]
        if (int(round(t / (BEAT / 2))) % 8) in (0, 2, 3, 5, 6): put(music, pluck(midi(ch[pat[i % 8] % 3] + 12), 0.45, g), t, 1.0, pan=0.3 * (1 if i % 2 else -1))
        t += BEAT / 2; i += 1
def riser(t0, t1, g=0.5):
    d = t1 - t0; n = noise(d); sw = np.linspace(300, 9000, len(n)); out = np.zeros_like(n); B = 2048
    for st_ in range(0, len(n) - B, B):
        f = sw[st_]; out[st_:st_ + B] = bp(n[st_:st_ + B], f * 0.7, min(f * 1.4, SR * 0.45), 2)[:B]
    put(music, out * np.linspace(0, 1, len(out)) ** 2 * g, t0)
    put(music, sweep(180, 1400, d, 2.5) * np.linspace(0, 1, int(d * SR)) ** 2 * g * 0.5, t0)

def wt(w, nth=0, lead=0): return (word(w, nth)["f"] - lead) / FPS
tSprint = wt("sprinting"); tCal = wt("calorie", 0); tBear = wt("bear"); tSpoil = wt("spoiler"); tIns = wt("insulin"); tLater = wt("later"); tCarbs = wt("carbs")
tBal = wt("balance"); tBud = wt("budget"); tExact = wt("exact"); tSuff = wt("suffering"); tBan = wt("banana")
tHit = tBan + 0.4 - 0.1; tSign = s[4] + 1.1
# 1 the hook: full-on frantic drive from the first beat (sixteenth hats), a riser into the bars
drums(0, e[0] - 0.1, sixteenth=True); bassline(0, e[0] - 0.1, 0.95, 650); arp(BAR, e[0] - 0.1, 0.32, 3300)
put(music, kick(34, 0.9, 1.6), 0, 1.2); riser(e[0] - 1.6, e[0] - 0.02, 0.4)
# 2 during the workout: bright drive, a bell when the yellow bar overtakes the blue one
drums(s[1], e[1] - 0.1, sixteenth=True); bassline(s[1], e[1] - 0.1, 0.9, 700); plucks(s[1], e[1] - 0.1, 0.45); put(music, kick(34, 0.9, 1.6), s[1], 1.2)
put(music, bell(midi(88), 1.6, 0.35), s[1] + 1.2); riser(e[1] - 1.2, e[1] - 0.02, 0.3)
# 3 the living room: lazy, sleepy half-time with a comic slow bass, tension building while the calculator works, resolved on "budget"
drums(s[2], tCarbs, clap_on=False, half=True, hats=False); bassline(s[2], tCarbs, 0.6, 500, -5)
put(music, kick(36, 0.9, 1.5), s[2], 1.1); drums(tCarbs, tBud - 0.05, clap_on=False, half=True); bassline(tCarbs, tBud - 0.05, 0.7, 600); arp(tCarbs, tBud - 0.05, 0.22, 2800)
riser(tBud - 1.4, tBud - 0.02, 0.35); put(music, kick(34, 1.0, 1.6), tBud, 1.2)
for n_ in (57, 60, 64, 69): put(music, stab(midi(n_), 1.4, 4200, 0.45), tBud); put(music, bell(midi(88), 1.6, 0.3), tBud + 0.02)
drums(tBud + 0.3, e[2] - 0.1, clap_on=False, half=True); bassline(tBud + 0.3, e[2] - 0.1, 0.7, 650)
# 4 the split screen: bouncy full groove
drums(s[3], e[3] - 0.1, sixteenth=True); bassline(s[3], e[3] - 0.1, 0.95, 650); arp(s[3], e[3] - 0.1, 0.3, 3300); plucks(s[3], e[3] - 0.1, 0.3)
put(music, kick(34, 0.9, 1.6), s[3], 1.2); put(music, bell(midi(91), 1.6, 0.4), tExact)
# 5 the doctor pigeon: a sad wobble, then a cheeky pizzicato fanfare on the sign, a bonk on the banana, a hopeful final chord
padL = saw(midi(45), 1.4, (-3, 0, 3)) * (1 + 0.3 * np.sin(2 * np.pi * 5.0 * tt(1.4))); put(music, fade(lp(padL, 800) * 0.45, 0.1, 0.4), s[4] + 0.1)
put(music, kick(34, 1.0, 1.6), s[4], 1.2)
for n_ in (57, 60, 64, 69): put(music, stab(midi(n_), 1.4, 4200, 0.5), tSign)
put(music, bell(midi(81), 1.8, 0.4), tSign + 0.05)
drums(tSign + 0.6, e[4] - 1.5, clap_on=False, half=True); plucks(tSign + 0.6, e[4] - 1.5, 0.45); bassline(tSign + 0.6, e[4] - 1.5, 0.6, 600)
for n_ in (57, 60, 64, 69, 76): put(music, stab(midi(n_), 2.2, 4200, 0.45), e[4] - 1.4)
put(music, kick(40, 0.6, 1.4), e[4] - 1.4, 1.1); put(music, bell(midi(88), 2.0, 0.4), e[4] - 1.35)

# ------------------------------------------------------------------ sound effects
sfx = np.zeros((2, N))
def whoosh(t_end, d=0.4, g=0.7, up=True):
    n = noise(d); out = np.zeros_like(n); B = 1024
    for s_ in range(0, len(n) - B, B):
        u = s_ / len(n); f = 400 + (3800 if up else 3000) * (u if up else 1 - u) ** 1.3
        out[s_:s_ + B] = bp(n[s_:s_ + B], max(80, f * 0.6), min(f * 1.5, SR * 0.45), 2)[:B]
    put(sfx, fade(out * np.sin(np.pi * np.linspace(0, 1, len(out))) ** 1.5, 0.01, 0.05) * g, t_end - d * 0.8)
def tap(t, g=0.5, f0=900, pan=0.0): put(sfx, fade(bp(noise(0.05), f0, f0 * 2.4) * env_exp(0.05, 60), 0.0004, 0.01) * g, t, pan=pan)
def thud(t, g=0.8, f=110, pan=0.0): put(sfx, fade(lp(sweep(f * 1.4, f * 0.6, 0.16, 0.6), 400) * env_exp(0.16, 18), 0.001, 0.03) * g, t, pan=pan)
def plip(t, g=0.4):
    fq = rng.uniform(900, 1700); put(sfx, fade(sweep(fq * 1.5, fq * 0.7, 0.09, 0.7) * env_exp(0.09, 30), 0.001, 0.02) * g, t, pan=rng.uniform(-0.4, 0.4))
def beep(t, g=0.35, f=880, d=0.16): put(sfx, fade(np.sin(2 * np.pi * f * tt(d)) * env_exp(d, 6), 0.002, 0.03) * g, t)
def ding(t, g=0.5, n_=88): put(sfx, bell(midi(n_), 1.5, g), t); put(sfx, bell(midi(n_ + 7), 1.1, g * 0.55), t + 0.1)
def growl(t, d=0.7, g=0.6, f=70):                      # a stomach rumble / bear growl: a low wobbling saw + noise
    x = lp(saw(f, d, (-4, 0, 4)) * (0.7 + 0.3 * np.sin(2 * np.pi * 18 * tt(d))), 500) * np.sin(np.pi * np.linspace(0, 1, int(d * SR))) ** 0.6
    put(sfx, fade(x + lp(noise(d), 300) * 0.4 * np.sin(np.pi * np.linspace(0, 1, int(d * SR))), 0.02, 0.1) * g, t)

# hard cuts: a whoosh + a hit on every camera cut (scene starts hit harder)
for i in range(5):
    for k, sh in enumerate(SH["s%d" % (i + 1)]):
        tc = s[i] + sh["t"]
        if tc <= 0.01: continue
        big = k == 0
        whoosh(tc + 0.04, 0.3, 0.55 if big else 0.4, up=bool(int(tc * 10) % 2)); thud(tc, 0.85 if big else 0.5, 80 if big else 120)
# scene 1: the 04:59 clock ticks (an alarm beep on the hour), the treadmill motor screams, 9 frantic steps per second, stomach growls with every shock wave, a bear growl
k = 0
while 0.3 + k * 1.0 < tSprint - 0.2: tap(0.3 + k * 1.0, 0.35, 1800); k += 1
beep(0.25, 0.3, 1760, 0.22); beep(0.55, 0.3, 1760, 0.22)
d1 = e[0] - tSprint + 0.3; put(sfx, fade(lp(saw(120, d1, (-3, 0, 3)), 900) * 0.35 * (1 + 0.25 * np.sin(2 * np.pi * 9 * tt(d1))) + hp(noise(d1), 4000) * 0.05, 0.2, 0.3), tSprint - 0.3)
put(sfx, fade(sweep(160, 520, 1.2, 2.0) * np.linspace(0, 0.18, int(1.2 * SR)), 0.1, 0.1), tSprint - 0.3)
k = 0
while tSprint + k * (1 / 9.0) < e[0] - 0.1: tap(tSprint + k / 9.0, 0.22, 800 + 200 * (k % 2), pan=0.15 * (1 if k % 2 else -1)); k += 1
k = 0
while tCal - 0.4 + k * 0.7 < e[0] - 0.3: growl(tCal - 0.4 + k * 0.7, 0.6, 0.5); thud(tCal - 0.4 + k * 0.7, 0.5, 60); k += 1
growl(tBear - 0.1, 0.9, 0.7, 55)
# scene 2: the energy bars filling (a rising tone for the fat bar, a slow one for the carbs bar), a bell for DURING WORKOUT, a ding for the insulin label, cheers
d2 = e[1] - s[1]; put(sfx, sweep(260, 1700, d2, 1.4) * np.linspace(0.05, 0.16, int(d2 * SR)) * 0.9, s[1]); put(sfx, sweep(200, 520, d2, 1.2) * np.linspace(0.03, 0.08, int(d2 * SR)), s[1])
ding(s[1] + 0.1, 0.45, 86); ding(tIns, 0.35, 91)
k = 0
while s[1] + 0.3 + k / 3.0 < e[1] - 0.2: tap(s[1] + 0.3 + k / 3.0, 0.25, 800 + 300 * (k % 2)); k += 1
for k in range(int((e[1] - s[1]) / 0.33)): put(sfx, fade(sweep(380, 700, 0.1, 0.7) * env_exp(0.1, 18), 0.002, 0.03) * 0.22, s[1] + 0.2 + k * 0.33, pan=0.3 * (1 if k % 2 else -1))
# scene 3: a sofa groan on the flop, plates clattering, the frost crackle on "later", the calculator's button clicks speeding up, a chime on "budget"
put(sfx, fade(lp(sweep(260, 90, 0.9, 0.8), 800) * np.exp(-tt(0.9) * 1.6), 0.01, 0.2) * 0.6, s[2] + 0.1); thud(s[2] + 0.05, 0.8, 70)
for k in range(4): put(sfx, fade(bp(noise(0.2), 2500, 8000) * env_exp(0.2, 18), 0.001, 0.05) * 0.3, s[2] + 0.6 + k * 0.4, pan=0.4 * (1 if k % 2 else -1))
put(sfx, fade(hp(noise(0.9), 3500) * env_exp(0.9, 3) * (rng.random(int(0.9 * SR)) > 0.9), 0.003, 0.2) * 0.8, tLater); put(sfx, sweep(1800, 400, 0.6, 1.5) * np.exp(-tt(0.6) * 3) * 0.25, tLater)
t = tCarbs; step = 0.28
while t < tBud - 0.05: tap(t, 0.4, 1500, pan=rng.uniform(-0.3, 0.3)); thud(t, 0.18, 220); t += step; step = max(0.07, step * 0.93)
ding(tBal + 0.1, 0.4, 88); ding(tBud, 0.55, 93)
# scene 4: the footsteps of both Titos (the zombie faster), the zombie groans, the banana bite, the identical scales beep, a double ding on "exact"
k = 0
while s[3] + 0.2 + k / 9.0 < e[3] - 0.1: tap(s[3] + 0.2 + k / 9.0, 0.2, 700, pan=-0.35); k += 1
k = 0
while s[3] + 0.2 + k / 6.4 < e[3] - 0.1: tap(s[3] + 0.2 + k / 6.4, 0.22, 1000, pan=0.35); thud(s[3] + 0.2 + k / 6.4, 0.18, 160, pan=0.35); k += 1
growl(s[3] + 0.6, 0.8, 0.45, 80)
for k in range(4): beep(tExact + 0.25 + k * 0.3, 0.25, 1320, 0.1)
ding(tExact, 0.5, 91); ding(tExact + 0.12, 0.4, 91)
# scene 5: Tito's faceplant (slide whistle down + thud), smoke-like hiss of the treadmill, the pigeon waddles in, stamps the sign, throws the banana (whoosh + BONK + ding), the final sparkle
put(sfx, fade(sweep(1100, 220, 0.9, 1.5) * np.exp(-tt(0.9) * 1.2), 0.01, 0.2) * 0.5, s[4] + 0.05); thud(s[4] + 0.95, 0.8, 65)
for k in range(5): tap(s[4] + 0.2 + k * 0.17, 0.25, 700)
for k, f0 in enumerate((520, 470, 540)): put(sfx, fade(sweep(f0, f0 * 0.72, 0.28, 0.8) * (1 + 0.2 * np.sin(2 * np.pi * 22 * tt(0.28))) * env_exp(0.28, 7), 0.01, 0.06) * 0.5, s[4] + 1.4 + k * 0.3, pan=0.3)
thud(tSign, 0.8, 150); put(sfx, fade(hp(noise(0.15), 1200) * env_exp(0.15, 30), 0.0005, 0.03) * 0.5, tSign)
whoosh(tHit, 0.35, 0.8, up=False); thud(tHit, 1.0, 95); put(sfx, bell(midi(60), 0.6, 0.45), tHit); put(sfx, sweep(900, 300, 0.4, 1.0) * np.exp(-tt(0.4) * 5) * 0.4, tHit + 0.05)
ding(e[4] - 1.3, 0.5, 93)
for k in range(4): put(sfx, fade(bp(noise(0.08), 3000, 9000) * env_exp(0.08, 40), 0.001, 0.02) * 0.3, e[4] - 1.3 + k * 0.25, pan=0.3)
room = lp(noise(DUR), 500) * 0.02; sfx[0] += room; sfx[1] += room

# ------------------------------------------------------------------ voice, ducking, mix
w = wave.open(os.path.join(ROOT, "public", "voz_fasted", "voz.wav")); vs = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
if w.getframerate() != SR:
    g = math.gcd(SR, w.getframerate()); vs = signal.resample_poly(vs, SR // g, w.getframerate() // g)
voice = np.zeros((2, N)); voice[0, : len(vs)] = vs[:N]; voice[1] = voice[0]
act = np.abs(voice[0]); r = np.exp(-1 / (0.25 * SR)); env = np.zeros(N); ee = 0.0
for i in range(0, N, 64):
    m = act[i:i + 64].max(); ee = m if m > ee else ee * (r ** 64); env[i:i + 64] = ee
env = np.clip(env / (np.percentile(env, 95) + 1e-9), 0, 1)
duck = 1 - 0.55 * env
rms = lambda x: math.sqrt(float(np.mean(x[x != 0] ** 2))) if np.any(x != 0) else 1e-9
rv = rms(voice[0][np.abs(voice[0]) > 0.01])
mus = music * duck; mus *= (rv * 10 ** (-8 / 20)) / rms(mus[0][np.abs(mus[0]) > 1e-4])
sf = sfx.copy(); sf *= (rv * 10 ** (-9 / 20)) / rms(sf[0][np.abs(sf[0]) > 1e-3])
mix = voice + mus + sf
mix = mix / max(1.0, np.max(np.abs(mix)) / 0.89)
out_dir = os.path.join(ROOT, "out")
def wr(path, x):
    y = (np.clip(x, -1, 1).T * 32767).astype("<i2")
    with wave.open(path, "wb") as o:
        o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes(y.tobytes())
wr(os.path.join(out_dir, "mezcla_fasted_raw.wav"), mix); wr(os.path.join(out_dir, "stem_fasted_musica.wav"), mus); wr(os.path.join(out_dir, "stem_fasted_sfx.wav"), sf)
FF = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
dst = os.path.join(ROOT, "public", "voz_fasted", "mezcla.wav")
subprocess.run([FF, "-y", "-v", "error", "-i", os.path.join(out_dir, "mezcla_fasted_raw.wav"), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", dst], check=True)
print("ok: peak", round(float(np.max(np.abs(mix))), 3), "dur", round(N / SR, 2), "->", dst)
