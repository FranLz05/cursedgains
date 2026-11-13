"""Musica + efectos (numpy/scipy) para el Video 6 DOMS (DomsShort). Voz: public/voz_sleep/voz.wav; cortes: src/videos/sleep/timeline.json.
Cada corte duro lleva whoosh + golpe; efectos sincronizados a los eventos de las escenas. Salida: public/voz_sleep/mezcla.wav (-14 LUFS).
Uso: python volumen-basura/audio/generar_audio_sleep.py"""
import os, json, math, wave, subprocess
import numpy as np
from scipy import signal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 44100
TL = json.load(open(os.path.join(ROOT, "src", "videos", "sleep_robbery", "timeline.json")))
S = TL["starts"]; DUR = TL["duration"] + 0.25; N = int(DUR * SR)
rng = np.random.default_rng(11)
tt = lambda d: np.arange(int(d * SR)) / SR
def lp(x, f): return signal.sosfilt(signal.butter(2, f, "low", fs=SR, output="sos"), x)
def hp(x, f): return signal.sosfilt(signal.butter(2, f, "high", fs=SR, output="sos"), x)
def bp(x, a, b): return signal.sosfilt(signal.butter(2, [a, b], "band", fs=SR, output="sos"), x)
def noise(d): return rng.standard_normal(int(d * SR))
def fade(x, a=0.004, b=0.004):
    x = x.copy(); i, o = min(len(x), int(a * SR)), min(len(x), int(b * SR))
    if i: x[:i] *= np.linspace(0, 1, i)
    if o: x[-o:] *= np.linspace(1, 0, o)
    return x
def sweep(f0, f1, d, c=1.0):
    t = tt(d); f = f0 + (f1 - f0) * (t / d) ** c; return np.sin(2 * np.pi * np.cumsum(f) / SR)
def put(buf, x, t, g=1.0):
    i = int(t * SR)
    if i >= N or i + len(x) <= 0: return
    a, b = max(0, i), min(N, i + len(x)); buf[:, a:b] += (x[a - i:b - i] * g)[None, :]
music = np.zeros((2, N)); sfx = np.zeros((2, N))
def kick(): return fade(sweep(190, 48, 0.3, 0.35) * np.exp(-tt(0.3) * 11), 0.0005, 0.01)
def clap(): return fade(bp(noise(0.2), 1100, 4800) * np.exp(-tt(0.2) * 22) * 0.9, 0.0005, 0.02)
def hat(): return fade(hp(noise(0.05), 7500) * np.exp(-tt(0.05) * 70) * 0.5, 0.0003, 0.01)
def bass(f, d): x = (2 * ((tt(d) * f) % 1) - 1) * 0.6 + np.sin(2 * np.pi * f * tt(d)); return fade(lp(x, 600) * np.exp(-tt(d) * 2.5), 0.002, 0.03)
def pluck(f, d=0.4): t = tt(d); return fade(sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 7), (2.76, .4, 14)]), 0.001, 0.05)
def whoosh(t, d=0.3, g=0.5):
    n = noise(d); o = np.zeros_like(n)
    for s in range(0, len(n) - 1024, 1024): f = 400 + 3800 * (s / len(n)) ** 1.3; o[s:s + 1024] = bp(n[s:s + 1024], f * .6, min(f * 1.5, 20000))[:1024]
    put(sfx, fade(o * np.sin(np.pi * np.linspace(0, 1, len(o))) ** 1.5, .01, .05), t - d * 0.8, g)
def thud(t, g=0.7, f=100): put(sfx, fade(lp(sweep(f * 1.4, f * .6, .16, .6), 400) * np.exp(-tt(.16) * 18), .001, .03), t, g)
def boom(t, g=1.0): put(sfx, fade(lp(sweep(90, 30, .9, .5), 300) * np.exp(-tt(.9) * 4), .001, .2), t, g); put(sfx, fade(lp(noise(.5), 900) * np.exp(-tt(.5) * 7), .001, .1), t, g * .6)
def beep(t, f=2093, g=.3, d=.08): put(sfx, fade(np.sin(2 * np.pi * f * tt(d)) * np.exp(-tt(d) * 6), .002, .02), t, g)
def slide(t, f0, f1, d, g=.35): put(sfx, fade(sweep(f0, f1, d) * (1 + .15 * np.sin(2 * np.pi * 6 * tt(d))), .02, .05), t, g)
def bang(t, g=1.0): put(sfx, fade(bp(noise(.25), 300, 2500) * np.exp(-tt(.25) * 18), .0005, .03), t, g); thud(t, g * .8, 160)
def spray(t, d, g=.25): put(sfx, fade(hp(noise(d), 3000) * 0.5, .05, .1), t, g)

BEAT = 60 / 128
def groove(t0, t1, hats=True, claps=True):
    t = t0
    while t < t1:
        b = int(round((t - t0) / BEAT)) % 4
        put(music, kick(), t, .9)
        if claps and b in (1, 3): put(music, clap(), t, .4)
        if hats: put(music, hat(), t + BEAT / 2, .3)
        put(music, bass(55 * (1.5 if b == 3 else 1), BEAT * .45), t, .8)
        if b % 2 == 0: put(music, pluck(440 * (1.5 if (b // 2) % 2 else 1), .4), t + BEAT / 2, .3)
        t += BEAT
groove(S[0], S[6], hats=False, claps=False); groove(S[6], S[13]); groove(S[13], DUR - .5)
put(music, lp(sweep(120, 1200, 1.2, 2.5) * np.linspace(0, 1, int(1.2 * SR)) ** 2, 3000), S[13] - 1.2, .3)
for tc in S[1:]: whoosh(tc + .04, .3, .5); thud(tc, .6, 90)
CUTS = json.load(open(os.path.join(ROOT, 'src', 'videos', 'sleep_robbery', 'cuts.json')))
for i, cs in enumerate(CUTS):                                              # extra hard cuts inside a scene: lighter whoosh + hit
    for c_ in cs: whoosh(S[i] + c_ + .03, .22, .35); thud(S[i] + c_, .4, 110)
for k in range(8): beep(S[0] + .3 + k * .22, 1568, .12, .05); beep(S[2] + .2 + k * .2, 1760 if k % 2 else 1320, .14, .05)   # 1-3: phone game blips
for k in range(5): beep(S[1] + .3 + k * .35, 330, .12, .2)
slide(S[3] + .02, 300, 1400, .25, .5); bang(S[3] + .05, .9)                      # 4: jolt awake
slide(S[4] + .5, 500, 1500, .5, .3); bang(S[4] + 1.35, .7); put(sfx, fade(bp(noise(.3), 3000, 9000) * np.exp(-tt(.3) * 8), .001, .05), S[4] + 1.5, .4)  # 5: window leap + glass
slide(S[5] + .3, 200, 900, .25, .4); thud(S[5] + .6, .8, 120)                    # 6: ring squeak
for k in range(10): thud(S[6] + .3 + k * .25, .12, 60 + 6 * k)                    # 7: hum
slide(S[7] + .6, 1000, 3200, .5, .3)                                             # 8: megaphone feedback
for k in range(6): slide(S[8] + .1 + k * .35, 700, 1200, .3, .3)                 # 9: siren
for k in range(4): thud(S[9] + .2 + k * .45, .5, 110)                            # 10: footsteps
put(sfx, fade(lp(noise(2.4), 300) * .06, .2, .5), S[10])                          # 11
for k in range(8): thud(S[11] + .2 + k * .4, .45, 100 + 8 * (k % 2))             # 12: heavy steps
slide(S[12] + .75, 300, 150, .5, .4); boom(S[12] + 1.5, 1.0); put(sfx, fade(bp(noise(1.2), 200, 3000) * np.exp(-tt(1.2) * 3), .01, .3), S[12] + 1.5, .5); beep(S[12] + 2.0, 1568, .3, .15)  # 13
boom(S[13] + 1.9, .9); slide(S[13] + 1.9, 900, 80, .6, .4)                        # 14: 60 %
slide(S[14] + .5, 400, 1800, .4, .3); put(sfx, fade(bp(noise(.5), 800, 5000) * np.exp(-tt(.5) * 5), .01, .1), S[14] + 1.5, .4); bang(S[14] + 1.6, .6)  # 15: throw + crash
for k in range(4): put(sfx, fade(sweep(520 + 90 * k, 520 + 90 * k, .45) * np.exp(-tt(.45) * 5), .004, .1), S[15] + .4 + k * .9, .2)  # 16: lullaby chimes
w = wave.open(os.path.join(ROOT, "public", "voz_sleep", "voz.wav")); vs = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
voice = np.zeros((2, N)); voice[0, :min(N, len(vs))] = vs[:N]; voice[1] = voice[0]
act = np.abs(voice[0]); env = np.zeros(N); e = 0.0; r = math.exp(-64 / (0.25 * SR))
for i in range(0, N, 64): m = act[i:i + 64].max(); e = m if m > e else e * r; env[i:i + 64] = e
duck = 1 - .55 * np.clip(env / (np.percentile(env, 95) + 1e-9), 0, 1)
rms = lambda x: math.sqrt(float(np.mean(x[x != 0] ** 2))) if np.any(x != 0) else 1e-9
rv = rms(voice[0][np.abs(voice[0]) > .01])
mus = music * duck; mus *= rv * 10 ** (-8 / 20) / rms(mus[0][np.abs(mus[0]) > 1e-4])
sf = sfx.copy(); sf *= rv * 10 ** (-8.5 / 20) / rms(sf[0][np.abs(sf[0]) > 1e-3])
mix = voice + mus + sf; mix = mix / max(1.0, np.max(np.abs(mix)) / .89)
raw = os.path.join(ROOT, "out", "mezcla_sleep_raw.wav")
with wave.open(raw, "wb") as o: o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((np.clip(mix, -1, 1).T * 32767).astype("<i2").tobytes())
FF = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
dst = os.path.join(ROOT, "public", "voz_sleep", "mezcla.wav")
subprocess.run([FF, "-y", "-v", "error", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", dst], check=True)
print("ok", dst)
