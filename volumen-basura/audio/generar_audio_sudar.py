"""Musica y efectos originales (numpy/scipy) para "Sweating != Burning Fat" (PumpParadox, Short 2).
Voz = public/voz_sudar/voz.wav (solo ganancia). Musica 128 BPM en La menor con sidechain a la voz; efectos sincronizados a las escenas
(src/videos/sudar/escenas.json). Salida: out/mezcla_sudar_raw.wav (44.1 kHz estereo) + stems.
Uso: python volumen-basura/audio/generar_audio_sudar.py"""
import os, sys, json, math, wave
import numpy as np
from scipy import signal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 44100
FPS = 30
ES = json.load(open(os.path.join(ROOT, "src", "videos", "sudar", "escenas.json")))
ST = ES["scenes"]; TOT = ES["total"]; SEN = ES["sentences"]
END = ST[1:] + [TOT]
DUR = TOT / FPS + 0.25
N = int(DUR * SR)
rng = np.random.default_rng(11)
T = lambda f: f / FPS                                     # absolute composition frame -> seconds
def ev(i, u): return (ST[i] + u * (END[i] - ST[i])) / FPS  # scene i (0..5), fraction u -> seconds

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

# ------------------------------------------------------------------ drum / synth voices
def kick(pitch=48, d=0.32, punch=1.0):
    x = sweep(150 * punch + 40, pitch, d, 0.35) * env_exp(d, 11)
    click = hp(noise(0.012), 2500) * np.linspace(1, 0, int(0.012 * SR)) * 0.35
    x[: len(click)] += click
    return fade(x * 1.0, 0.0005, 0.01)
def clap():
    x = bp(noise(0.22), 1100, 4800) * env_exp(0.22, 22)
    return fade(x * 0.9, 0.0005, 0.02)
def hat(open_=False):
    d = 0.2 if open_ else 0.05
    return fade(hp(noise(d), 7500) * env_exp(d, 18 if open_ else 70) * 0.5, 0.0003, 0.01)
def bass(f, d, cut=700, g=1.0):
    x = (saw(f, d) * 0.7 + np.sin(2 * np.pi * f * tt(d)) * 0.7)
    x = lp(x, cut) * np.minimum(1, tt(d) * 90) * np.exp(-tt(d) * 2.2)
    return fade(x * g, 0.002, 0.03)
def stab(f, d=0.25, cut=3200, g=1.0):
    x = saw(f, d, (-1, 0, 1)) * np.exp(-tt(d) * 6)
    return fade(lp(x, cut) * g, 0.002, 0.03)
def pluck(f, d=0.5, g=1.0):
    t = tt(d)
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 7), (2.76, 0.4, 14), (5.4, 0.2, 26)])
    return fade(x * g, 0.001, 0.05)
def bell(f, d=1.4, g=1.0):
    t = tt(d)
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 2.5), (2.0, 0.6, 3.5), (3.0, 0.4, 5), (4.2, 0.25, 8)])
    return fade(x * g, 0.001, 0.2)

# ------------------------------------------------------------------ the score
BPM = 128.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
PROG = [57, 53, 60, 55]                    # Am - F - C - G roots (A3 F3 C4 G3 as midi), one bar each
CHORD = {57: [57, 60, 64], 53: [53, 57, 60], 60: [60, 64, 67], 55: [55, 59, 62]}
music = np.zeros((2, N))
def sec(a, b): return T(a), T(b)

def drums(t0, t1, kick_on=True, hats=True, clap_on=True, half=False):
    t = math.ceil(t0 / BEAT - 1e-6) * BEAT
    while t < t1:
        beat = int(round(t / BEAT)) % 4
        if kick_on and (beat in (0, 2) if half else True): put(music, kick(), t, 0.95)
        if clap_on and beat in (1, 3) and not half: put(music, clap(), t, 0.45)
        if hats:
            put(music, hat(), t + BEAT / 2, 0.35)
            if beat == 3: put(music, hat(True), t + BEAT * 0.75, 0.2)
        t += BEAT

def bassline(t0, t1, g=0.9, cut=600, off=0):
    t = math.ceil(t0 / (BEAT / 2) - 1e-6) * (BEAT / 2)
    pat = [1, 0, 1, 1, 0, 1, 1, 0]
    while t < t1:
        bar = int(t // BAR); k = int(round((t - bar * BAR) / (BEAT / 2))) % 8
        if pat[k]:
            root = PROG[bar % 4] - 24 + off
            put(music, bass(midi(root + (12 if k in (3, 6) else 0)), BEAT * 0.45, cut, g), t)
        t += BEAT / 2

def arp(t0, t1, g=0.35, cut=3000, oct_=12):
    t = math.ceil(t0 / (BEAT / 2) - 1e-6) * (BEAT / 2)
    i = 0
    while t < t1:
        bar = int(t // BAR); ch = CHORD[PROG[bar % 4]]
        put(music, stab(midi(ch[i % 3] + oct_), BEAT * 0.4, cut, g), t, 1.0, pan=0.25 * (1 if i % 2 else -1))
        t += BEAT / 2; i += 1

def plucks(t0, t1, g=0.5):
    t = math.ceil(t0 / (BEAT / 2) - 1e-6) * (BEAT / 2)
    pat = [0, 2, 1, 2, 0, 1, 2, 1]; i = 0
    while t < t1:
        bar = int(t // BAR); ch = CHORD[PROG[bar % 4]]
        if (int(round(t / (BEAT / 2))) % 8) in (0, 2, 3, 5, 6): put(music, pluck(midi(ch[pat[i % 8] % 3] + 12), 0.45, g), t, 1.0, pan=0.3 * (1 if i % 2 else -1))
        t += BEAT / 2; i += 1

def riser(t0, t1, g=0.5):
    d = t1 - t0; n = noise(d)
    sw = np.linspace(300, 9000, len(n))
    # swept band-pass by block
    out = np.zeros_like(n); B = 2048
    for s in range(0, len(n) - B, B):
        f = sw[s]; out[s:s + B] = bp(n[s:s + B + 0], f * 0.7, min(f * 1.4, SR * 0.45), 2)[:B]
    put(music, out * np.linspace(0, 1, len(out)) ** 2 * g, t0)
    put(music, sweep(180, 1400, d, 2.5) * np.linspace(0, 1, int(d * SR)) ** 2 * g * 0.5, t0)

def snare_roll(t0, t1):
    t = t0; step = 0.2
    while t < t1:
        put(music, clap(), t, 0.25 + 0.5 * (t - t0) / (t1 - t0)); step = max(0.045, step * 0.86); t += step


# ------------------------------------------------------------------ the score (by scene)
s = [ST[i] / FPS for i in range(6)]; e = [END[i] / FPS for i in range(6)]
# 1 sauna treadmill: energetic, builds with the temperature, riser into the red zone
zo = s[0] + 4.9                                                       # the zoom-out through the window lands here
drums(s[0], zo - 0.3); bassline(s[0], zo - 0.3); arp(s[0] + 2 * BAR, zo - 0.3)
riser(s[0] + 2.8, zo); snare_roll(s[0] + 3.4, zo); put(music, kick(40, 0.7, 1.5), zo, 1.2)
# the volcano: an ominous low drone, a slow sub pulse and dark stabs until the scene ends
dr = saw(midi(33), e[0] - zo, (-3, 0, 3)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.5 * tt(e[0] - zo))); put(music, fade(lp(dr, 500), 0.2, 0.4) * 0.6, zo)
for k in range(6): put(music, kick(36, 0.5, 1.2), zo + 0.6 + k * 1.2, 0.8)
for k, n_ in enumerate((45, 48, 52)): put(music, stab(midi(n_), 1.2, 1800, 0.4), zo + 0.2 + k * 2.4)
# 2 the scale illusion: playful plucks, a bright ding on -3.0, a stab when he flexes
drums(s[1], e[1], clap_on=False, half=True); bassline(s[1], e[1], 0.7, 700); plucks(s[1], e[1], 0.55)
put(music, bell(midi(88), 1.6, 0.4), ev(1, 0.62)); put(music, bell(midi(95), 1.2, 0.25), ev(1, 0.62) + 0.12)
for n_ in (57, 60, 64, 69): put(music, stab(midi(n_), 0.9, 4200, 0.45), ev(1, 0.58))
# 3 the science: calm pulse under the narration, bubbly in the second half, a riser while the deficit bar fills
b0 = SEN[7] / FPS
drums(s[2], b0 - 0.2, kick_on=True, hats=True, clap_on=False, half=True); bassline(s[2], b0 - 0.2, 0.55, 500); plucks(s[2] + 2 * BAR, b0 - 0.2, 0.4)
drums(b0, e[2], clap_on=False, half=True); bassline(b0, e[2], 0.6, 600); arp(b0, e[2], 0.3, 3600); plucks(b0, e[2], 0.35)
riser(e[2] - 4.0, e[2] - 0.1, 0.35); put(music, bell(midi(81), 1.6, 0.35), e[2] - 0.05)
# 4 the paradox: driving at first, the sauna side winds down and the music sags
fatT = ev(3, 0.73)
drums(s[3], fatT); bassline(s[3], fatT, 0.9, 800); arp(s[3], fatT - 1.0, 0.3, 3000)
pad = saw(midi(45), e[3] - fatT, (-3, 0, 3)) * (1 + 0.35 * np.sin(2 * np.pi * 5.0 * tt(e[3] - fatT))); pad = lp(pad, 900) * np.linspace(1, 0.4, len(pad)) * 0.5
put(music, fade(pad, 0.05, 0.1), fatT)
put(music, fade(lp(sweep(330, 70, 0.7, 0.8), 1200) * env_exp(0.7, 3) * 0.9, 0.01, 0.1), ev(3, 0.75))
# 5 the rebound: light and curious, then a sad trombone on +3.0 lbs
drums(s[4], ev(4, 0.62), clap_on=False, half=True); bassline(s[4], ev(4, 0.62), 0.6, 600); plucks(s[4], ev(4, 0.62), 0.5)
for dt, nn in [(0.0, 62), (0.55, 61), (1.1, 60), (1.7, 57)]:
    ds = 0.5 if nn != 57 else 1.1
    put(music, fade(lp(saw(midi(nn), ds, (-1, 1)) * (1 + 0.15 * np.sin(2 * np.pi * 6 * tt(ds))), 1800) * 0.55, 0.02, 0.15), ev(4, 0.66) + dt)
# 6 payoff: full, hopeful, bright
drums(s[5], e[5] - 1.3); bassline(s[5], e[5] - 1.3, 0.95, 800); arp(s[5], e[5] - 1.3, 0.38, 3600); plucks(s[5], e[5] - 1.3, 0.3)
for n_ in (57, 60, 64, 69): put(music, stab(midi(n_), 1.8, 4200, 0.5), e[5] - 1.3)
put(music, kick(40, 0.6, 1.4), e[5] - 1.3, 1.1); put(music, bell(midi(81), 1.8, 0.4), e[5] - 1.2)

# ------------------------------------------------------------------ sound effects
sfx = np.zeros((2, N))
def whoosh(t_end, d=0.55, g=0.8, up=True):
    n = noise(d); out = np.zeros_like(n); B = 1024
    for s_ in range(0, len(n) - B, B):
        u = s_ / len(n); f = 400 + (3800 if up else 3000) * (u if up else 1 - u) ** 1.3
        out[s_:s_ + B] = bp(n[s_:s_ + B], max(80, f * 0.6), min(f * 1.5, SR * 0.45), 2)[:B]
    env = np.sin(np.pi * np.linspace(0, 1, len(out))) ** 1.5
    put(sfx, fade(out * env, 0.01, 0.05) * g, t_end - d * 0.8)
for i in range(1, 6): whoosh(s[i] + 0.05, 0.5, 0.7)
def tap(t, g=0.5, f0=900):
    put(sfx, fade(bp(noise(0.05), f0, f0 * 2.4) * env_exp(0.05, 60), 0.0004, 0.01) * g, t)
def thud(t, g=0.8, f=110):
    put(sfx, fade(lp(sweep(f * 1.4, f * 0.6, 0.16, 0.6), 400) * env_exp(0.16, 18), 0.001, 0.03) * g, t)
def plip(t, g=0.4):
    fq = rng.uniform(900, 1700); put(sfx, fade(sweep(fq * 1.5, fq * 0.7, 0.09, 0.7) * env_exp(0.09, 30), 0.001, 0.02) * g, t, pan=rng.uniform(-0.4, 0.4))
def beep(t, g=0.35, f=880, d=0.16): put(sfx, fade(np.sin(2 * np.pi * f * tt(d)) * env_exp(d, 6), 0.002, 0.03) * g, t)
def ding(t, g=0.5, n_=88): put(sfx, bell(midi(n_), 1.5, g), t); put(sfx, bell(midi(n_ + 7), 1.1, g * 0.55), t + 0.1)
# scene 1: running steps (2.9 per second), sweat dripping, the thermometer alarm
tt0 = s[0]
while tt0 < s[0] + 4.7: tap(tt0, 0.35 * (1 - 0.5 * max(0, (tt0 - s[0] - 3.2) / 1.5))); tt0 += 1 / 2.9
for k in range(24): plip(s[0] + 0.6 + k * 3.6 / 24 + rng.uniform(0, 0.15), 0.22 + 0.2 * k / 24)
put(sfx, sweep(200, 1400, 4.0, 2.2) * np.linspace(0, 0.18, int(4.0 * SR)), s[0] + 0.3)
for k in range(8): beep(s[0] + 2.0 + k * 0.28, 0.3 + 0.03 * k)
# the zoom-out: a big whoosh, then the volcano: rumble, lava bubbling, a distant boom
whoosh(s[0] + 4.9, 1.5, 1.0); put(sfx, fade(lp(sweep(500, 60, 1.6, 0.8), 600) * env_exp(1.6, 1.6), 0.01, 0.3) * 0.8, s[0] + 4.6)
rum = lp(noise(e[0] - s[0] - 4.8), 90) * (0.7 + 0.3 * np.sin(2 * np.pi * 1.3 * tt(e[0] - s[0] - 4.8))); put(sfx, fade(rum, 0.4, 0.5) * 1.4, s[0] + 4.8)
for k in range(30): put(sfx, fade(sweep(rng.uniform(180, 380), rng.uniform(90, 160), 0.12, 0.7) * env_exp(0.12, 22), 0.001, 0.03) * 0.5, s[0] + 5.0 + k * (e[0] - s[0] - 5.4) / 30 + rng.uniform(0, 0.1), pan=rng.uniform(-0.5, 0.5))
thud(s[0] + 7.4, 1.0, 55); put(sfx, fade(lp(noise(1.2), 300) * env_exp(1.2, 3), 0.005, 0.3) * 0.9, s[0] + 7.4)
# scene 2: tired steps, the scale ("tonk"), counting blips, ding on -3.0, the bag hits the floor
for k in range(6): thud(ev(1, 0.08) + k * 0.55, 0.4, 100)
thud(ev(1, 0.47), 0.9, 160)
for k in range(10): beep(ev(1, 0.5) + k * (ev(1, 0.62) - ev(1, 0.5)) / 10, 0.18, 1000 + 80 * k, 0.05)
ding(ev(1, 0.62), 0.5)
thud(ev(1, 0.64), 0.9, 80); thud(ev(1, 0.66), 0.5, 90)
# scene 3: drop plops, bubbles, a soft breath for the lungs, the bar fill
for k in range(6): put(sfx, fade(sweep(500 + 80 * k, 300, 0.2, 0.8) * env_exp(0.2, 10), 0.002, 0.03) * 0.35, SEN[5] / FPS + 0.6 + k * 1.3)
for k in range(30): plip(b0 + 0.4 + k * (e[2] - b0 - 1.5) / 30 + rng.uniform(0, 0.12), 0.25)
put(sfx, fade(lp(noise(1.6), 900) * np.sin(np.pi * np.linspace(0, 1, int(1.6 * SR))) ** 2, 0.05, 0.2) * 0.6, b0 + 0.9)
put(sfx, sweep(300, 1500, e[2] - b0 - 3, 2.0) * np.linspace(0, 0.14, int((e[2] - b0 - 3) * SR)), b0 + 2)
# scene 4: both sides run; the left one slows, buzzes and collapses
t4 = s[3]
while t4 < fatT:
    thud(t4, 0.22, 120); thud(t4 + 0.17, 0.18, 130); t4 += 0.69 + 4.5 * max(0, (t4 - s[3]) / (fatT - s[3])) ** 3
for k in range(4): beep(ev(3, 0.56) + k * 0.28, 0.25, 200, 0.22)
put(sfx, fade(lp(sweep(300, 60, 0.5, 0.7), 500) * env_exp(0.5, 5), 0.005, 0.1) * 0.9, ev(3, 0.82)); thud(ev(3, 0.83), 0.9, 70)
# scene 5: gulps, the step on the scale, boing and womp, then the pigeon manager (coo, paper, cash register)
for k in range(5): put(sfx, fade(lp(sweep(320, 180, 0.22, 0.8), 700) * env_exp(0.22, 8), 0.004, 0.05) * 0.7, ev(4, 0.12) + k * 0.55)
thud(ev(4, 0.58), 0.9, 160)
boing = np.sin(2 * np.pi * np.cumsum(180 + 120 * np.exp(-tt(0.5) * 6) * np.sin(2 * np.pi * 14 * tt(0.5))) / SR) * env_exp(0.5, 5)
put(sfx, fade(boing, 0.002, 0.1) * 0.55, ev(4, 0.66)); thud(ev(4, 0.67), 0.8, 90)
for k, f0 in enumerate((520, 470)): put(sfx, fade(sweep(f0, f0 * 0.72, 0.28, 0.8) * (1 + 0.2 * np.sin(2 * np.pi * 22 * tt(0.28))) * env_exp(0.28, 7), 0.01, 0.06) * 0.55, ev(4, 0.72) + k * 0.34, pan=0.3)
put(sfx, fade(hp(noise(0.5), 1500) * env_exp(0.5, 8), 0.01, 0.1) * 0.4, ev(4, 0.77)); ding(ev(4, 0.8), 0.5, 96)
# scene 6: the bag flies and hits the can, a cap pop, a sparkle
whoosh(ev(5, 0.34) + 0.02, 0.5, 0.6)
put(sfx, fade(bp(noise(0.5), 700, 3500) * env_exp(0.5, 7), 0.001, 0.1) * 0.7, ev(5, 0.35)); thud(ev(5, 0.35), 0.6, 140)
put(sfx, fade(sweep(250, 900, 0.1, 0.6) * env_exp(0.1, 14), 0.001, 0.02) * 0.6, ev(5, 0.44)); ding(ev(5, 0.46), 0.45, 91)
ding(e[5] - 1.1, 0.5, 93)
room = lp(noise(DUR), 500) * 0.03; sfx[0] += room; sfx[1] += room

# ------------------------------------------------------------------ voice, ducking, mix
w = wave.open(os.path.join(ROOT, "public", "voz_sudar", "voz.wav")); vs = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
if w.getframerate() != SR:
    g = math.gcd(SR, w.getframerate()); vs = signal.resample_poly(vs, SR // g, w.getframerate() // g)
voice = np.zeros((2, N)); voice[0, : len(vs)] = vs[:N]; voice[1] = voice[0]
act = np.abs(voice[0]); r = np.exp(-1 / (0.25 * SR))
env = np.zeros(N); ee = 0.0
for i in range(0, N, 64):
    m = act[i:i + 64].max(); ee = m if m > ee else ee * (r ** 64); env[i:i + 64] = ee
env = np.clip(env / (np.percentile(env, 95) + 1e-9), 0, 1)
duck = 1 - 0.62 * env
rms = lambda x: math.sqrt(float(np.mean(x[x != 0] ** 2))) if np.any(x != 0) else 1e-9
rv = rms(voice[0][np.abs(voice[0]) > 0.01])
mus = music * duck; mus *= (rv * 10 ** (-9 / 20)) / rms(mus[0][np.abs(mus[0]) > 1e-4])
sf = sfx.copy(); sf *= (rv * 10 ** (-12 / 20)) / rms(sf[0][np.abs(sf[0]) > 1e-3])
mix = voice + mus + sf
mix = mix / max(1.0, np.max(np.abs(mix)) / 0.89)
out_dir = os.path.join(ROOT, "out")
def wr(name, x):
    y = (np.clip(x, -1, 1).T * 32767).astype("<i2")
    with wave.open(os.path.join(out_dir, name), "wb") as o:
        o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes(y.tobytes())
wr("mezcla_sudar_raw.wav", mix); wr("stem_sudar_musica.wav", mus); wr("stem_sudar_sfx.wav", sf)
print("ok: peak", round(float(np.max(np.abs(mix))), 3), "dur", round(N / SR, 2))
