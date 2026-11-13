"""Musica y efectos originales (sintetizados con numpy/scipy) para "Volumen basura".
Voz = public/voz/voz.wav (solo ganancia). Musica a 128 BPM en La menor con sidechain a la voz, efectos sincronizados
a los cuadros de story.ts (30 fps). Salida: out/mezcla_v3.wav (44.1 kHz, estereo) + stems.
Uso: python -I volumen-basura/audio/generar_audio.py"""
import os, sys, json, math, wave
import numpy as np
from scipy import signal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 44100
FPS = 30
MAP = json.load(open(os.path.join(ROOT, 'src', 'videos', 'volumen', 'mapa_tiempos.json')))
AN = MAP['anchors']
DUR = MAP['total'] / FPS + 0.25
N = int(DUR * SR)
rng = np.random.default_rng(7)
def _m(f):  # authored frame -> output frame (same table Remotion plays the animation through)
    if f <= AN[0][0]: return AN[0][1] + (f - AN[0][0])
    for i in range(1, len(AN)):
        if f <= AN[i][0]: return AN[i - 1][1] + (f - AN[i - 1][0]) * (AN[i][1] - AN[i - 1][1]) / (AN[i][0] - AN[i - 1][0])
    return AN[-1][1] + (f - AN[-1][0])
T = lambda f: _m(f) / FPS

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

# --- A: hook, steady 4-on-the-floor (0 - 11.2 s). The first bar enters with kick + bass; the lead joins at bar 2.
a0, a1 = sec(0, 330)
drums(a0, a1); bassline(a0, a1); arp(T(60), a1)
# --- B: build into "serie doce" (11 - 13.3 s)
riser(T(330), T(400)); snare_roll(T(350), T(400)); bassline(T(330), T(400), 0.7)
# --- C: the numbers 12, 15, 20: heavy stabs on each pop, kick on the beat, bass sliding up each time (13.4 - 14.5 s)
c0, c1 = sec(402, 436)
drums(c0, c1, clap_on=False); bassline(c0, c1, 1.0, 900)
for k, f in enumerate([402, 419, 438]):
    for n_ in (57, 60, 64):
        put(music, stab(midi(n_ + 12 + 2 * k), 0.4, 2600 + 500 * k, 0.5), T(f))
# --- D: slow motion on "serie veinte": half-time heartbeat + sinking drone (14.5 - 16.1 s)
d0, d1 = sec(436, 482)
x = sweep(120, 38, d1 - d0, 1.0) * np.minimum(1, tt(d1 - d0) * 20) * 0.8 + 0.5 * lp(saw(55, d1 - d0, (-1, 1)), 400) * 0.7
put(music, fade(x, 0.02, 0.2) * 0.9, d0)
# --- E: fatigue: the music sags, a wobbling detuned pad, then a deflating "womp" (16.1 - 17.5 s)
e0, e1 = sec(482, 524)
pad = saw(midi(45), e1 - e0, (-3, 0, 3)) * (1 + 0.35 * np.sin(2 * np.pi * 5.0 * tt(e1 - e0)))
pad = lp(pad, 900) * np.linspace(1, 0.5, len(pad)) * 0.5
put(music, fade(pad, 0.05, 0.1), e0)
put(music, fade(lp(sweep(330, 70, 0.55, 0.8) * 1.0, 1200) * env_exp(0.55, 3) * 0.9, 0.01, 0.1), T(500))
# --- F: "por suerte / por desgracia": bright bouncy re-entry, a sad trombone for "tampoco crece el doble" (17.5 - 20.6 s)
f0, f1 = sec(525, 590)
drums(f0, f1, clap_on=True); bassline(f0, f1, 0.9, 900); plucks(f0, f1, 0.5)
for dt, nn in [(0.0, 62), (0.55, 61), (1.1, 60), (1.7, 57)]:
    ds = 0.5 if nn != 57 else 1.1
    put(music, fade(lp(saw(midi(nn), ds, (-1, 1)) * (1 + 0.15 * np.sin(2 * np.pi * 6 * tt(ds))), 1800) * 0.55, 0.02, 0.15), T(590) + dt)
# --- G: the glass: light and curious, pizzicato over a soft pulse (20.6 - 25.7 s)
g0, g1 = sec(619, 770)
drums(g0, g1, clap_on=False, hats=True, half=True); bassline(g0, g1, 0.6, 500); plucks(g0, g1, 0.55)
# --- H/I: the plan: full, hopeful, bright (25.7 - 34.4 s)
h0, h1 = sec(770, 1027)
drums(h0, h1); bassline(h0, h1, 0.95, 800); arp(h0, h1, 0.38, 3600, 12); plucks(h0, h1, 0.25)
riser(T(740), T(770), 0.35)  # a short lift into the plan
# --- J: the shirt gives up: stinger chord + tail
for n_ in (57, 60, 64, 69): put(music, stab(midi(n_), 1.6, 4200, 0.55), T(1030))
put(music, kick(40, 0.6, 1.4), T(1030), 1.1)
put(music, bell(midi(81), 1.2, 0.35), T(1052))

# ------------------------------------------------------------------ sound effects
sfx = np.zeros((2, N))
def whoosh(t_end, d=0.55, g=0.8, up=True):
    n = noise(d); out = np.zeros_like(n); B = 1024
    for s in range(0, len(n) - B, B):
        u = s / len(n); f = 400 + (3800 if up else 3000) * (u if up else 1 - u) ** 1.3
        out[s:s + B] = bp(n[s:s + B], max(80, f * 0.6), min(f * 1.5, SR * 0.45), 2)[:B]
    e = np.sin(np.pi * np.linspace(0, 1, len(out))) ** 1.5
    put(sfx, fade(out * e, 0.01, 0.05) * g, t_end - d * 0.8)
for f in [88, 218, 396, 516, 612, 766, 912]: whoosh(T(f), 0.5, 0.7)

def impact(t, g=1.0, low=52):
    x = sweep(low * 2.4, low, 0.7, 0.4) * env_exp(0.7, 6) + 0.5 * np.pad(lp(noise(0.4), 600) * env_exp(0.4, 9), (0, int(0.3 * SR)))[: int(0.7 * SR)]
    put(sfx, fade(x, 0.001, 0.1) * g, t)
    put(sfx, fade(hp(noise(0.12), 1800) * env_exp(0.12, 30), 0.0005, 0.03) * 0.5 * g, t)
impact(T(12), 0.8); impact(T(126), 0.9); impact(T(402), 0.8, 58); impact(T(419), 0.9, 50); impact(T(438), 1.2, 42)
put(sfx, bell(midi(88), 1.6, 0.45), T(796)); put(sfx, bell(midi(95), 1.2, 0.25), T(796) + 0.12)

# bench reps: chest thud + lockout clank, replicated from story.ts (phase integration + slow motion)
sm = lambda x: (lambda u: u * u * (3 - 2 * u))(min(1, max(0, x)))
rate = lambda f: 1 - 0.7 * (sm((f - 436) / 8) - sm((f - 470) / 12))
WF = [0.0]
for f in range(1, 1080): WF.append(WF[-1] + rate(f - 0.5))
fat = lambda fw: sm((fw - 400) / 110)
period = lambda fw: 36 + 46 * fat(fw)
PH = [0.0]
for f in range(1, 1080): PH.append(PH[-1] + 1 / period(f - 0.5))
for f in range(1, 524):
    p0, p1 = PH[f - 1], PH[f]
    amp = 1 - 0.75 * fat(WF[f])
    for off, kind in ((0.0, "bottom"), (0.5, "top")):
        if math.floor(p1 - off) > math.floor(p0 - off):
            t = T(f)
            if kind == "bottom":
                put(sfx, fade(lp(sweep(130, 60, 0.12, 0.6), 400) * env_exp(0.12, 22), 0.001, 0.03) * 0.6 * (0.6 + 0.4 * amp), t)
            else:
                m = sum(a * np.sin(2 * np.pi * fq * tt(0.35)) * np.exp(-tt(0.35) * k) for fq, a, k in [(1850, 1, 14), (2780, 0.7, 18), (4100, 0.45, 26)])
                put(sfx, fade(m, 0.0005, 0.05) * 0.28 * amp, t, pan=0.1)

# heartbeat during the slow motion
tb = T(438)
while tb < T(480):
    put(sfx, fade(lp(sweep(90, 45, 0.18, 0.5), 300) * env_exp(0.18, 16), 0.002, 0.03) * 0.9, tb)
    put(sfx, fade(lp(sweep(80, 42, 0.16, 0.5), 280) * env_exp(0.16, 18), 0.002, 0.03) * 0.6, tb + 0.19)
    tb += 0.62
whoosh(T(444), 0.9, 0.55, up=False)
# glass filling (bubbling rising), splash and drips
fill = noise(T(690) - T(622)); out = np.zeros_like(fill); B = 2048
for s in range(0, len(fill) - B, B):
    u = s / len(fill); f = 500 + 1800 * u
    out[s:s + B] = bp(fill[s:s + B], f * 0.7, f * 1.3, 2)[:B]
put(sfx, out * (0.25 + 0.6 * np.linspace(0, 1, len(out))) * 0.5, T(622))
for k in range(26):
    t = T(624) + k * (T(690) - T(624)) / 26 + rng.uniform(0, 0.06); fq = 500 + 900 * (t - T(624)) / (T(690) - T(624)) + rng.uniform(-80, 80)
    put(sfx, fade(sweep(fq, fq * 1.8, 0.07, 0.8) * env_exp(0.07, 40), 0.001, 0.01) * 0.35, t)
splash = bp(noise(1.3), 400, 6000) * env_exp(1.3, 3.2); put(sfx, fade(splash, 0.005, 0.2) * 0.9, T(700))
put(sfx, fade(bp(noise(1.6), 300, 3500) * env_exp(1.6, 2.2), 0.01, 0.3) * 0.55, T(722))
for k in range(14):
    t = T(706) + k * 0.2 + rng.uniform(0, 0.08); fq = rng.uniform(700, 1500)
    put(sfx, fade(sweep(fq * 1.6, fq * 0.6, 0.09, 0.7) * env_exp(0.09, 30), 0.001, 0.02) * 0.45, t, pan=rng.uniform(-0.4, 0.4))
# the shirt: pop, rip, boing
put(sfx, fade(sweep(250, 1100, 0.14, 0.7) * env_exp(0.14, 10), 0.001, 0.03) * 0.7, T(1027))
rip = hp(noise(0.45), 1400) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 38 * tt(0.45)))) * np.exp(-tt(0.45) * 5)
put(sfx, fade(rip, 0.002, 0.08) * 0.8, T(1028))
boing = np.sin(2 * np.pi * np.cumsum(180 + 120 * np.exp(-tt(0.5) * 6) * np.sin(2 * np.pi * 14 * tt(0.5))) / SR) * env_exp(0.5, 5)
put(sfx, fade(boing, 0.002, 0.1) * 0.5, T(1049))
# room tone: a faint gym murmur
room = lp(noise(DUR), 500) * 0.03; sfx[0] += room; sfx[1] += room

# ------------------------------------------------------------------ voice, ducking, mix
w = wave.open(os.path.join(ROOT, "public", "voz", "voz.wav")); vs = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
if w.getframerate() != SR:
    g = math.gcd(SR, w.getframerate()); vs = signal.resample_poly(vs, SR // g, w.getframerate() // g)
voice = np.zeros((2, N)); voice[0, : len(vs)] = vs[:N]; voice[1] = voice[0]
act = np.abs(voice[0]); a = np.exp(-1 / (0.02 * SR)); r = np.exp(-1 / (0.25 * SR))
env = np.zeros(N); e = 0.0
step = 64
for i in range(0, N, step):                       # block-wise follower (attack 20 ms / release 250 ms)
    m = act[i:i + step].max(); e = m if m > e else e * (r ** step)
    env[i:i + step] = e
env = np.clip(env / (np.percentile(env, 95) + 1e-9), 0, 1)
duck = 1 - 0.62 * env                             # about -8 dB of music under speech
rms = lambda x: math.sqrt(float(np.mean(x[x != 0] ** 2))) if np.any(x != 0) else 1e-9
rv = rms(voice[0][np.abs(voice[0]) > 0.01])
mus = music * duck; mus *= (rv * 10 ** (-9 / 20)) / rms(mus[0][np.abs(mus[0]) > 1e-4])
sf = sfx.copy(); sf *= (rv * 10 ** (-12 / 20)) / rms(sf[0][np.abs(sf[0]) > 1e-3])
mix = voice + mus + sf
pk = np.max(np.abs(mix)); mix = mix / max(1.0, pk / 0.89)
out_dir = os.path.join(ROOT, "out")
def wr(name, x):
    y = (np.clip(x, -1, 1).T * 32767).astype("<i2")
    with wave.open(os.path.join(out_dir, name), "wb") as o:
        o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes(y.tobytes())
wr("mezcla_v3_raw.wav", mix); wr("stem_musica.wav", mus); wr("stem_sfx.wav", sf)
print("ok: peak", round(float(np.max(np.abs(mix))), 3), "voice rms", round(rv, 4), "music/voice dB", round(20 * math.log10(rms(mus[0][np.abs(mus[0]) > 1e-4]) / rv), 1),
      "sfx/voice dB", round(20 * math.log10(rms(sf[0][np.abs(sf[0]) > 1e-3]) / rv), 1), "dur", round(N / SR, 2))
