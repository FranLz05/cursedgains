"""Musica y efectos originales (numpy/scipy) para "The Anabolic Window Myth" (PumpParadox, Short 3).
Voz = public/voz_ventana/voz.wav (solo ganancia). Musica 128 BPM en La menor con sidechain a la voz; efectos sincronizados a las escenas
(src/videos/ventana/escenas.json). Salida: out/mezcla_ventana_raw.wav (44.1 kHz estereo) + stems.
Uso: python volumen-basura/audio/generar_audio_ventana.py"""
import os, sys, json, math, wave
import numpy as np
from scipy import signal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 44100
FPS = 30
ES = json.load(open(os.path.join(ROOT, "src", "videos", "ventana", "escenas.json")))
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
WORDS = json.load(open(os.path.join(ROOT, "src", "videos", "ventana", "palabras.json"), encoding="utf-8"))["words"]
def word_t(norm_, nth=0):
    hits = [w for w in WORDS if "".join(ch for ch in w["w"].lower() if ch.isalpha()) == norm_]
    return hits[nth]["t"]
s = [ST[i] / FPS for i in range(5)]; e = [END[i] / FPS for i in range(5)]
DB_DROP, DB_FALL, T_TIMER, T_COUGH, T_THUMB = 1.35, 0.3, 1.7, 3.9, 5.6        # same constants as world.ts (seconds into scenes 1, 2 and 5)
tDrop = s[0] + DB_DROP + DB_FALL; tTimer = s[0] + T_TIMER; tCough = s[1] + T_COUGH; tMyth = word_t("myth"); tThumb = s[4] + T_THUMB
# 1 panic: a short heroic last-rep groove, silence on the drop, then a tense pulse under the bomb timer
drums(s[0], tDrop - 0.05, clap_on=False, half=True); bassline(s[0], tDrop - 0.05, 0.8, 600)
put(music, kick(36, 0.9, 1.5), tTimer, 1.3)
dr = saw(midi(33), e[0] - tTimer, (-3, 0, 3)) * (0.8 + 0.2 * np.sin(2 * np.pi * 3.0 * tt(e[0] - tTimer))); put(music, fade(lp(dr, 420), 0.05, 0.4) * 0.5, tTimer)
drums(tTimer + 0.5, e[0] - 0.2, clap_on=True); bassline(tTimer + 0.5, e[0] - 0.2, 0.85, 700); arp(tTimer + 2 * BAR, e[0] - 0.2, 0.3, 3000)
riser(e[0] - 3.0, e[0] - 0.05, 0.4)
# 2 dry scoop: bouncy comic groove, it dies into the coughing
drums(s[1] + 0.9, tCough, clap_on=False, half=True); bassline(s[1] + 0.9, tCough, 0.7, 700); plucks(s[1] + 0.9, tCough, 0.5)
put(music, fade(lp(sweep(330, 70, 0.8, 0.8), 1200) * env_exp(0.8, 3) * 0.9, 0.01, 0.1), tCough - 0.1)
# 3 the science: boom on the myth, then a calm, curious pulse that fills out while the sponge soaks up the blocks
drums(s[2], tMyth - 0.1, clap_on=False, half=True); bassline(s[2], tMyth - 0.1, 0.5, 500)
put(music, kick(34, 1.0, 1.6), tMyth, 1.3)
t7 = SEN[7] / FPS
drums(tMyth + 0.8, e[2], clap_on=False, half=True); bassline(tMyth + 0.8, e[2], 0.55, 600); plucks(tMyth + 0.8, e[2], 0.4); arp(t7 + 2 * BAR, e[2], 0.28, 3400)
put(music, bell(midi(86), 1.8, 0.35), t7 - 0.1)
riser(e[2] - 3.0, e[2] - 0.05, 0.3)
# 4 the daily protein split: groove, sad low pad on the empty battery, bright plucks on the full one
drums(s[3], e[3] - 0.4, clap_on=False, half=True); bassline(s[3], e[3] - 0.4, 0.75, 650); plucks(s[3], e[3] - 0.4, 0.45); arp(s[3] + 4 * BAR, e[3] - 0.4, 0.25, 3200)
padL = saw(midi(45), 3.2, (-3, 0, 3)) * (1 + 0.3 * np.sin(2 * np.pi * 5.0 * tt(3.2))); put(music, fade(lp(padL, 800) * 0.4, 0.1, 0.4), s[3] + 0.5)
# 5 Dr. Pigeon: light and curious, a fanfare when the prescription lands, a hopeful final chord
drums(s[4], e[4] - 1.5, clap_on=False, half=True); bassline(s[4], e[4] - 1.5, 0.6, 600); plucks(s[4] + 0.5, e[4] - 1.5, 0.5)
for n_ in (57, 60, 64, 69): put(music, stab(midi(n_), 1.8, 4200, 0.5), tThumb)
put(music, bell(midi(81), 1.8, 0.4), tThumb + 0.05)
for n_ in (57, 60, 64, 69, 76): put(music, stab(midi(n_), 2.2, 4200, 0.45), e[4] - 1.4)
put(music, kick(40, 0.6, 1.4), e[4] - 1.4, 1.1); put(music, bell(midi(88), 2.0, 0.4), e[4] - 1.35)

# ------------------------------------------------------------------ sound effects
sfx = np.zeros((2, N))
def whoosh(t_end, d=0.55, g=0.8, up=True):
    n = noise(d); out = np.zeros_like(n); B = 1024
    for s_ in range(0, len(n) - B, B):
        u = s_ / len(n); f = 400 + (3800 if up else 3000) * (u if up else 1 - u) ** 1.3
        out[s_:s_ + B] = bp(n[s_:s_ + B], max(80, f * 0.6), min(f * 1.5, SR * 0.45), 2)[:B]
    env = np.sin(np.pi * np.linspace(0, 1, len(out))) ** 1.5
    put(sfx, fade(out * env, 0.01, 0.05) * g, t_end - d * 0.8)
for i in range(1, 5): whoosh(s[i] + 0.05, 0.5, 0.7)
def tap(t, g=0.5, f0=900):
    put(sfx, fade(bp(noise(0.05), f0, f0 * 2.4) * env_exp(0.05, 60), 0.0004, 0.01) * g, t)
def thud(t, g=0.8, f=110):
    put(sfx, fade(lp(sweep(f * 1.4, f * 0.6, 0.16, 0.6), 400) * env_exp(0.16, 18), 0.001, 0.03) * g, t)
def plip(t, g=0.4):
    fq = rng.uniform(900, 1700); put(sfx, fade(sweep(fq * 1.5, fq * 0.7, 0.09, 0.7) * env_exp(0.09, 30), 0.001, 0.02) * g, t, pan=rng.uniform(-0.4, 0.4))
def beep(t, g=0.35, f=880, d=0.16): put(sfx, fade(np.sin(2 * np.pi * f * tt(d)) * env_exp(d, 6), 0.002, 0.03) * g, t)
def ding(t, g=0.5, n_=88): put(sfx, bell(midi(n_), 1.5, g), t); put(sfx, bell(midi(n_ + 7), 1.1, g * 0.55), t + 0.1)
def clank(t, g=0.8):      # metal weight on a wooden floor: a thud plus ringing metal
    thud(t, g, 90); put(sfx, fade(bp(noise(0.35), 1800, 5200) * env_exp(0.35, 14), 0.0005, 0.05) * g * 0.7, t)
    put(sfx, fade(sum(np.sin(2 * np.pi * f * tt(0.5)) * np.exp(-tt(0.5) * k) for f, k in [(620, 9), (1540, 12), (2310, 16)]) * 0.25, 0.0005, 0.1) * g, t)
def cough(t, g=0.6):      # a dry, powdery cough: a short vowel-ish burst plus a puff of air
    n = tt(0.22); v = lp(saw(150, 0.22, (-4, 0, 4)) * np.minimum(1, n * 60) * np.exp(-n * 13), 1400)
    put(sfx, fade(v * 0.8 + bp(noise(0.22), 500, 2600) * np.exp(-n * 16) * 0.9, 0.002, 0.04) * g, t)
    put(sfx, fade(hp(noise(0.5), 2500) * env_exp(0.5, 7) * 0.5, 0.004, 0.1) * g, t + 0.05)
def stamp(t, g=0.8): thud(t, g, 150); put(sfx, fade(hp(noise(0.15), 1200) * env_exp(0.15, 30), 0.0005, 0.03) * g * 0.6, t)
# scene 1: the last curl (straining rising tone), the dumbbell clanks twice, the timer is strapped on (velcro + boing), alarm and ticking
put(sfx, fade(lp(sweep(120, 190, 1.1, 1.0), 600) * np.linspace(0.1, 0.4, int(1.1 * SR)), 0.05, 0.1) * 0.6, s[0] + 0.1)
clank(tDrop, 0.9); clank(tDrop + 0.2, 0.45); thud(tDrop + 0.04, 0.7, 70)
put(sfx, fade(hp(noise(0.25), 1500) * env_exp(0.25, 12), 0.001, 0.05) * 0.5, tTimer - 0.05); thud(tTimer, 0.9, 70)
boing = np.sin(2 * np.pi * np.cumsum(240 + 140 * np.exp(-tt(0.5) * 6) * np.sin(2 * np.pi * 15 * tt(0.5))) / SR) * env_exp(0.5, 5)
put(sfx, fade(boing, 0.002, 0.1) * 0.5, tTimer + 0.05)
k = 0
while tTimer + 0.45 + k / 3.0 < e[0] - 0.1: beep(tTimer + 0.45 + k / 3.0, 0.28, 1500 if k % 6 else 2000, 0.05); k += 1
for k in range(0, 14): beep(tTimer + 0.8 + k * 0.7, 0.2, 760 if k % 2 else 980, 0.3)        # siren-ish alternating alarm
put(sfx, fade(np.sin(2 * np.pi * 2.8 * tt(0.3)) * 0, 0, 0), s[0])
# scene 2: sprint steps, three scoops (swish + powder in the funnel), the gulp, then the coughing fit with puffs
for k in range(5): tap(s[1] + 0.12 + k * 0.2, 0.4 * (1 - 0.1 * k))
for k in range(4): put(sfx, fade(bp(noise(0.4), 1800, 7000) * np.sin(np.pi * np.linspace(0, 1, int(0.4 * SR))) ** 2, 0.01, 0.1) * 0.6, s[1] + 1.05 + k * 0.91 + 0.28)
for k in range(4): put(sfx, fade(hp(noise(0.5), 3000) * env_exp(0.5, 7) * 0.5, 0.004, 0.1), s[1] + 1.05 + k * 0.91 + 0.55)
put(sfx, fade(lp(sweep(320, 160, 0.3, 0.8), 700) * env_exp(0.3, 6), 0.004, 0.05) * 0.7, s[1] + 3.5)
kk = 0
while tCough + kk * 0.83 < e[1] + 0.1: cough(tCough + kk * 0.83, 0.62); kk += 1
# scene 3: the 30-minute timer ticks, then BOOM (low boom + glassy shards), the timeline rises, amino-acid blocks drop in softly and the sponge gulps
k = 0
while s[2] + 0.2 + k * 0.5 < tMyth - 0.05: tap(s[2] + 0.2 + k * 0.5, 0.4, 1400); k += 1
thud(tMyth, 1.0, 55); put(sfx, fade(lp(noise(1.2), 400) * env_exp(1.2, 3.2), 0.003, 0.3) * 1.0, tMyth)
put(sfx, fade(bp(noise(0.8), 2000, 9000) * env_exp(0.8, 6), 0.001, 0.2) * 0.7, tMyth + 0.02)
whoosh(t7 - 0.05, 1.0, 0.7)
put(sfx, sweep(300, 1500, 1.0, 2.0) * np.linspace(0, 0.14, int(1.0 * SR)), t7 - 0.2); ding(t7 + 0.5, 0.35, 91)
nb = 13; b0_ = t7 + 24 / FPS; gap_ = (e[2] - 10 / FPS - b0_) / nb
for i in range(nb):
    tin = b0_ + i * gap_; put(sfx, fade(sweep(900, 1400, 0.12, 0.6) * env_exp(0.12, 22), 0.001, 0.02) * 0.2, tin, pan=-0.3 + 0.6 * (i % 3) / 2)
    tg = tin + 66 / FPS; put(sfx, fade(lp(sweep(260, 140, 0.18, 0.7), 600) * env_exp(0.18, 12), 0.003, 0.04) * 0.5, tg)
# scene 4: both sides, a low buzz for the red battery, a rising charge and a bright ding as the right battery fills up
put(sfx, fade(lp(saw(110, 0.5, (-3, 0, 3)), 500) * env_exp(0.5, 4), 0.01, 0.1) * 0.5, s[3] + 0.5)
for k in range(4): beep(s[3] + 4.0 + k * 0.4, 0.2, 180, 0.2)
put(sfx, sweep(300, 1800, 3.2, 1.8) * np.linspace(0, 0.16, int(3.2 * SR)), s[3] + 1.4); ding(s[3] + 4.65, 0.5, 91)
for k in range(5): put(sfx, fade(bp(noise(0.12), 700, 2200) * env_exp(0.12, 25), 0.001, 0.03) * 0.4, s[3] + 2.0 + k * 0.62)   # chewing
# scene 5: Dr. Pigeon waddles in (steps + coo), the prescription is stamped, a trembling thumbs-up sparkle, coughs keep coming
for k in range(6): tap(s[4] + 0.15 + k * 0.2, 0.25, 700)
for k, f0 in enumerate((520, 470, 540)): put(sfx, fade(sweep(f0, f0 * 0.72, 0.28, 0.8) * (1 + 0.2 * np.sin(2 * np.pi * 22 * tt(0.28))) * env_exp(0.28, 7), 0.01, 0.06) * 0.55, s[4] + 1.1 + k * 0.34, pan=0.3)
ding(s[4] + 1.4, 0.3, 93)
put(sfx, fade(hp(noise(0.5), 1500) * env_exp(0.5, 8), 0.01, 0.1) * 0.4, s[4] + 2.7); stamp(s[4] + 2.85, 0.8)
ding(tThumb + 0.05, 0.45, 96)
for k in range(5): put(sfx, fade(bp(noise(0.08), 3000, 9000) * env_exp(0.08, 40), 0.001, 0.02) * 0.3, tThumb + k * 0.4, pan=0.3)
kk = 0
while s[4] + 0.3 + kk * 1.05 < e[4] - 1.5: cough(s[4] + 0.3 + kk * 1.05, 0.38); kk += 1
ding(e[4] - 1.3, 0.5, 93)
room = lp(noise(DUR), 500) * 0.03; sfx[0] += room; sfx[1] += room

# ------------------------------------------------------------------ voice, ducking, mix
w = wave.open(os.path.join(ROOT, "public", "voz_ventana", "voz.wav")); vs = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
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
wr("mezcla_ventana_raw.wav", mix); wr("stem_ventana_musica.wav", mus); wr("stem_ventana_sfx.wav", sf)
print("ok: peak", round(float(np.max(np.abs(mix))), 3), "dur", round(N / SR, 2))
