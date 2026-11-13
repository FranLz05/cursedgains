"""Musica y efectos originales (numpy/scipy) para "The Spot Reduction Myth" (PumpParadox, Short 4).
Voz = public/voz_spot/voz.wav. Musica 128 BPM en La menor (kick en cada pulso desde el frame 0, igual que beatPhase() de story.ts, para que la camara "golpee"
con el bombo) con sidechain a la voz. Efectos sincronizados a las escenas (escenas.json), a cada corte de camara (shots.json) y a las palabras (palabras.json).
Salida: out/mezcla_spot_raw.wav + stems, y public/voz_spot/mezcla.wav (normalizada a -14 LUFS con ffmpeg), que es el audio que usa Spot3D.tsx.
Uso: python volumen-basura/audio/generar_audio_spot.py"""
import os, json, math, wave, subprocess
import numpy as np
from scipy import signal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 44100
FPS = 30
SPOT = os.path.join(ROOT, "src", "videos", "spot")
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

tAimed = word("aimed")["t"]; tMove = word("move")["t"]
tT3 = (word("deficit", 0)["f"] - 6) / FPS; tTiny = (word("tiny")["f"] - 3) / FPS; tDrain = (word("deficit", 1)["f"] - 4) / FPS
# 1 crunch frenzy: full drive from the first beat, riser into the diagram
drums(0, e[0] - 0.1, sixteenth=True); bassline(0, e[0] - 0.1, 0.95, 650); arp(BAR, e[0] - 0.1, 0.3, 3200)
put(music, kick(34, 0.9, 1.6), 0, 1.2); riser(e[0] - 1.6, e[0] - 0.02, 0.4)
# 2 the diagram: bouncy comic groove (half-time), plucks, stabs on the shouting
drums(s[1], e[1] - 0.1, clap_on=False, half=True); bassline(s[1], e[1] - 0.1, 0.7, 650); plucks(s[1], e[1] - 0.1, 0.5)
put(music, kick(36, 0.9, 1.5), s[1], 1.2)
# 3 the sprint: full drive again, sixteenth hats
drums(s[2], e[2] - 0.1, sixteenth=True); bassline(s[2], e[2] - 0.1, 0.95, 700, 0); arp(s[2], e[2] - 0.1, 0.32, 3400)
put(music, kick(34, 0.9, 1.6), s[2], 1.2); riser(e[2] - 1.4, e[2] - 0.02, 0.35)
# 4 the pool: tension (half-time) until the drain opens, then the groove crashes in and fades while the level falls
drums(s[3], tDrain - 0.05, clap_on=False, half=True); bassline(s[3], tDrain - 0.05, 0.7, 600); plucks(s[3], tDrain - 0.05, 0.4)
put(music, kick(34, 1.0, 1.6), s[3], 1.2); riser(tDrain - 1.2, tDrain, 0.4)
put(music, kick(32, 1.1, 1.8), tDrain, 1.4); drums(tDrain + 0.1, e[3] - 0.1); bassline(tDrain + 0.1, e[3] - 0.1, 0.9, 650); arp(tDrain + 0.1, e[3] - 0.1, 0.28, 3200)
# 5 the end: exhausted wobble, then the pigeon's sign and a hopeful chord
put(music, kick(34, 1.0, 1.6), s[4], 1.2)
padL = saw(midi(45), 2.0, (-3, 0, 3)) * (1 + 0.3 * np.sin(2 * np.pi * 5.0 * tt(2.0))); put(music, fade(lp(padL, 800) * 0.45, 0.1, 0.4), s[4] + 0.1)
tSign = s[4] + 1.1
for n_ in (57, 60, 64, 69): put(music, stab(midi(n_), 1.8, 4200, 0.5), tSign)
put(music, bell(midi(81), 1.8, 0.4), tSign + 0.05)
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
def splash(t, g=0.4, d=0.25): put(sfx, fade(bp(noise(d), 600, 3500) * env_exp(d, 14), 0.002, 0.05) * g, t, pan=rng.uniform(-0.3, 0.3))
def squelch(t, g=0.5):
    put(sfx, fade(bp(noise(0.14), 1500, 5500) * env_exp(0.14, 18), 0.001, 0.03) * g, t); beep(t + 0.15, g * 0.6, 1250, 0.05)

# hard cuts: a whoosh + a hit on every camera cut (scene starts hit harder)
cuts = []
for i in range(5):
    key = "diagram" if i == 1 else "s%d" % (i + 1)
    for k, sh in enumerate(SH[key]): cuts.append((s[i] + sh["t"], k == 0))
for tc, big in cuts:
    if tc <= 0.01: continue
    whoosh(tc + 0.04, 0.3, 0.55 if big else 0.4, up=bool(int(tc * 10) % 2)); thud(tc, 0.85 if big else 0.5, 80 if big else 120)
# scene 1: crunch reps (a huff on every rep, 5 per second), the sci-fi laser (electric hum + crackle) once it is aimed, the final sizzle
for fr in range(3, int(e[0] * FPS), 6): put(sfx, fade(bp(noise(0.07), 300, 1600) * env_exp(0.07, 40), 0.001, 0.02) * 0.22, fr / FPS, pan=0.2 * (1 if (fr // 6) % 2 else -1))
tl = max(0.0, tAimed - 0.35); dl = e[0] - tl
hum = (saw(110, dl, (-2, 0, 2)) * 0.6 + np.sin(2 * np.pi * 220 * tt(dl)) * 0.4) * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * tt(dl)))
crack = hp(noise(dl), 3000) * (np.sin(2 * np.pi * 13 * tt(dl)) > 0.6) * 0.5
put(sfx, fade(lp(hum, 900) * 0.45 + crack * 0.35, 0.05, 0.2), tl); put(sfx, sweep(200, 2400, 0.35, 2.0) * np.linspace(0, 0.3, int(0.35 * SR)), tl - 0.05)
for k in range(5): put(sfx, fade(hp(noise(0.08), 4500) * env_exp(0.08, 40), 0.001, 0.02) * 0.4, tl + 0.5 + k * 1.7)
# scene 2: walkie-talkie squelch bursts, the cells' lazy bubbles, a boing each time the status blinks
k = 0
while s[1] + 0.4 + k * 0.58 < e[1] - 0.2: squelch(s[1] + 0.4 + k * 0.58, 0.42); k += 1
k = 0
while s[1] + 0.5 + k * 0.35 < e[1] - 0.2: plip(s[1] + 0.5 + k * 0.35, 0.12); k += 1
for k in range(int((e[1] - s[1]) / 0.8)): beep(s[1] + 0.7 + k * 0.8, 0.12, 330, 0.12)
# scene 3: treadmill hum + running steps (2.9 per second) + micro-droplet pops once the deficit is on + a ding when the label appears
dh = e[2] - s[2]; put(sfx, fade(lp(saw(62, dh, (-2, 0, 2)), 220) * 0.35, 0.2, 0.2), s[2])
k = 0
while s[2] + 0.1 + k * 0.345 < e[2] - 0.05: thud(s[2] + 0.1 + k * 0.345, 0.5, 150, pan=0.15 * (1 if k % 2 else -1)); tap(s[2] + 0.1 + k * 0.345, 0.2, 700); k += 1
k = 0
while tT3 + k * 0.07 < e[2] - 0.1: plip(tT3 + k * 0.07, 0.1 + 0.05 * rng.random()); k += 1
ding(tT3 + 0.15, 0.45, 91)
# scene 4: water ambience, a splash per scoop (3 per second) until the drain opens, the tiny-bucket ding, then the whirlpool gurgle + slurp
put(sfx, fade(lp(noise(e[3] - s[3]), 700) * 0.08 * (1 + 0.5 * np.sin(2 * np.pi * 0.6 * tt(e[3] - s[3]))), 0.3, 0.3), s[3])
k = 0
while s[3] + 1.2 + k / 3.0 < tDrain: splash(s[3] + 1.2 + k / 3.0, 0.3, 0.2); k += 1
ding(tTiny + 0.05, 0.4, 84)
dd = e[3] - tDrain; n = noise(dd); g_ = np.zeros_like(n); B = 1024
for st_ in range(0, len(n) - B, B):
    u = st_ / len(n); f = 1200 - 900 * u; g_[st_:st_ + B] = bp(n[st_:st_ + B], f * 0.5, f * 1.3, 2)[:B]
put(sfx, fade(g_ * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * (2 + 5 * np.linspace(0, 1, len(g_))) * np.linspace(0, dd, len(g_))))) * 0.9, 0.05, 0.2), tDrain)
whoosh(tDrain + 0.3, 0.8, 0.8, up=False); ding(tDrain + 0.2, 0.3, 79)
for k in range(int(dd / 0.25)): plip(tDrain + 0.3 + k * 0.25, 0.14)
# scene 5: sad slide whistle when Tito collapses, hissing smoke, the pigeon waddles in, the sign is stamped, a success ding, the final sparkle
put(sfx, fade(sweep(1100, 220, 0.9, 1.5) * np.exp(-tt(0.9) * 1.2), 0.01, 0.2) * 0.5, s[4] + 0.05); thud(s[4] + 0.95, 0.7, 70)
put(sfx, fade(hp(noise(e[4] - s[4]), 2500) * 0.06, 0.2, 0.3), s[4])
for k in range(5): tap(s[4] + 0.15 + k * 0.17, 0.25, 700)
for k, f0 in enumerate((520, 470, 540)): put(sfx, fade(sweep(f0, f0 * 0.72, 0.28, 0.8) * (1 + 0.2 * np.sin(2 * np.pi * 22 * tt(0.28))) * env_exp(0.28, 7), 0.01, 0.06) * 0.5, s[4] + 1.2 + k * 0.3, pan=0.3)
thud(tSign, 0.8, 150); put(sfx, fade(hp(noise(0.15), 1200) * env_exp(0.15, 30), 0.0005, 0.03) * 0.5, tSign)
ding(e[4] - 1.3, 0.5, 93)
for k in range(4): put(sfx, fade(bp(noise(0.08), 3000, 9000) * env_exp(0.08, 40), 0.001, 0.02) * 0.3, e[4] - 1.3 + k * 0.25, pan=0.3)
room = lp(noise(DUR), 500) * 0.02; sfx[0] += room; sfx[1] += room

# ------------------------------------------------------------------ voice, ducking, mix
w = wave.open(os.path.join(ROOT, "public", "voz_spot", "voz.wav")); vs = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
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
wr(os.path.join(out_dir, "mezcla_spot_raw.wav"), mix); wr(os.path.join(out_dir, "stem_spot_musica.wav"), mus); wr(os.path.join(out_dir, "stem_spot_sfx.wav"), sf)
FF = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
dst = os.path.join(ROOT, "public", "voz_spot", "mezcla.wav")
subprocess.run([FF, "-y", "-v", "error", "-i", os.path.join(out_dir, "mezcla_spot_raw.wav"), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", dst], check=True)
print("ok: peak", round(float(np.max(np.abs(mix))), 3), "dur", round(N / SR, 2), "->", dst)
