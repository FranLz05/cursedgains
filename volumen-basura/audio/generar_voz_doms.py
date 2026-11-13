"""Locucion en ingles CONTINUA y natural (edge-tts, en-US-ChristopherNeural) para el Video 6 de PumpParadox "Soreness != Muscle Growth (DOMS)" (id `DomsShort`).
Todo el guion se sintetiza de UNA sola vez (entonacion y pausas naturales entre bloques, sin cortar frases sueltas ni acelerar tramos con atempo).
Los silencios muertos (>0.3 s) se acortan, y la DURACION de cada escena sale del tiempo real de su frase: cada escena empieza en su primera palabra.
Si una escena es mas corta de lo que necesita su animacion, se inserta una pausa corta (un golpe comico) justo antes de la siguiente frase.
Salidas: public/voz_doms/{voz.wav,palabras.json,mouth.json,timeline.json} y copia de los json en src/videos/doms/.
edge-tts envia el texto del guion al servicio en linea de Microsoft Edge (sin claves ni cuenta).
Uso: python volumen-basura/audio/generar_voz_doms.py [rate %] [voz]"""
import asyncio, json, os, re, subprocess, sys, tempfile, wave
import numpy as np
from scipy import signal
import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RATE = int(sys.argv[1]) if len(sys.argv) > 1 else 8
VOICE = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "-" else "en-US-ChristopherNeural"
FPS = 30; SR = 24000
FF = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
# one block per micro-scene (the scene starts on its first word)
BLOCKS = [
    "Tito needs a wheelchair...", "to go down stairs after leg day...", "and he thinks his quads are exploding with muscle.",
    "No soreness, no gains, right?", "Wrong.", "Your muscles aren't growing, they're filing a restraining order.",
    "Delayed onset muscle soreness...", "is just localized inflammation and micro-trauma...", "from doing weird, novel stress your body hates.",
    "You get crippled by soreness when you invent circus exercises...", "every single week.", "Not when you actually stimulate hypertrophy.",
    "Real growth only cares about mechanical tension...", "and progressive overload. Not how much you cry getting out of bed.",
    "Chasing soreness wrecks recovery and turns your next workout to garbage.",
    "Track your reps, add weight over time, and stop judging your workouts by the toilet.",
]
# minimum scene length (s): what each animation needs to play out; a short beat of silence is inserted before the next phrase when needed
MINS = [1.3, 2.0, 2.3, 2.2, 1.9, 2.1, 1.7, 2.2, 2.2, 2.0, 1.7, 2.0, 2.2, 2.6, 2.6, 5.5]
LEAD = 0.10; HOLD = 1.3
alnum = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
TMP = tempfile.mkdtemp(prefix="voz_doms_")

async def synth(text):
    mp3 = os.path.join(TMP, "all.mp3"); ev = []
    com = edge_tts.Communicate(text, VOICE, rate=f"{RATE:+d}%", boundary="WordBoundary")
    with open(mp3, "wb") as fh:
        async for e in com.stream():
            if e["type"] == "audio": fh.write(e["data"])
            elif e["type"] == "WordBoundary": ev.append((e["text"], e["offset"] / 1e7, e["duration"] / 1e7))
    wav = os.path.join(TMP, "all.wav")
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", str(SR), wav], check=True)
    w = wave.open(wav); x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768
    return x, ev

def align(tokens, ev):
    out = []; j = 0
    for tk in tokens:
        need = alnum(tk); got = ""; first = last = None
        while j < len(ev) and len(got) < len(need):
            got += alnum(ev[j][0]); first = ev[j] if first is None else first; last = ev[j]; j += 1
        if first is None: first = last = ev[-1]
        out.append([tk, first[1], last[1] + last[2]])
    return out

async def main():
    text = " ".join(BLOCKS)
    x, ev = await synth(text)
    tokens = text.split()
    words = align(tokens, ev)
    scene_first = []; n = 0
    for b in BLOCKS: scene_first.append(n); n += len(b.split())
    # trim the leading silence, keep 0.12 s
    env = np.abs(x); lead = int(np.nonzero(env > 0.02 * env.max())[0][0]); cut = max(0, lead - int(0.12 * SR))
    x = x[cut:]; off = cut / SR
    for w in words: w[1] -= off; w[2] -= off
    # shorten dead silences (> 0.3 s) to 0.24 s: audio and word times move together
    win = int(0.01 * SR); e10 = np.array([np.abs(x[i:i + win]).max() for i in range(0, len(x) - win, win)])
    quiet = e10 < 0.012 * e10.max(); runs = []; i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if (j - i) * 0.01 > 0.3: runs.append((i * win, j * win))
            i = j
        else: i += 1
    KEEP = int(0.24 * SR); pieces = []; shifts = []; pos = 0; removed = 0
    for a, b in runs:
        pieces.append(x[pos:a + KEEP // 2]); pos = b - KEEP // 2; shifts.append((b - KEEP // 2, (b - a - KEEP) / SR))
    pieces.append(x[pos:]); y = np.concatenate(pieces)
    def shift_of(t):                      # seconds removed before original time t
        return sum(s for p, s in shifts if t * SR >= p)
    for w in words: w[1] -= shift_of(w[1] + 1e-6); w[2] -= shift_of(w[2] + 1e-6)
    print("silences shortened:", len(runs), " total removed %.2fs" % sum(s for _, s in shifts))
    # minimum scene lengths: insert a short beat of silence just before the next phrase
    def starts_of(): return [max(0.0, words[k][1] - LEAD) if i else 0.0 for i, k in enumerate(scene_first)]
    for i in range(15):
        st = starts_of(); dur = st[i + 1] - st[i]
        if dur < MINS[i]:
            d = MINS[i] - dur; T = int(max(0, words[scene_first[i + 1]][1] - LEAD - 0.02) * SR)
            y = np.concatenate([y[:T], np.zeros(int(d * SR)), y[T:]])
            for w in words:
                if w[1] * SR >= T: w[1] += d; w[2] += d
            print(f"scene {i + 1}: {dur:.2f}s < {MINS[i]}s -> +{d:.2f}s beat")
    st = starts_of(); speech_end = words[-1][2]
    total = max(st[15] + MINS[15], speech_end + HOLD)
    y = np.concatenate([y, np.zeros(max(0, int((total + 0.3) * SR) - len(y)))])
    y = y / max(1e-9, np.max(np.abs(y))) * 0.9
    y44 = signal.resample_poly(y, 147, 80)
    d1 = os.path.join(ROOT, "public", "voz_doms"); d2 = os.path.join(ROOT, "src", "videos", "doms")
    os.makedirs(d1, exist_ok=True); os.makedirs(d2, exist_ok=True)
    with wave.open(os.path.join(d1, "voz.wav"), "wb") as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(44100); o.writeframes((np.clip(y44, -1, 1) * 32767).astype("<i2").tobytes())
    nf = int(round(total * FPS)); hop = 44100 // FPS; env = np.zeros(nf)
    for f_ in range(nf):
        seg = y44[max(0, f_ * hop - hop // 2): f_ * hop + hop + hop // 2]
        env[f_] = float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0
    hi = np.percentile(env[env > 1e-4], 92); mouth = np.clip(env / hi, 0, 1) ** 0.8; mouth = np.where(mouth < 0.07, 0.0, mouth); mouth = np.round(mouth * 100) / 100
    out_words = []
    for k, (tk, a, b) in enumerate(words):
        sc = max(i for i, f in enumerate(scene_first) if k >= f)
        out_words.append({"w": tk.strip(), "t": round(a, 3), "e": round(b, 3), "f": round(a * FPS), "scene": sc})
    startsF = [round(s * FPS) for s in st]
    pj = {"voice": VOICE, "rate": RATE, "duration": total, "words": out_words}
    tj = {"starts": [round(s, 3) for s in st], "startsF": startsF, "total": nf, "duration": nf / FPS}
    for d in (d1, d2):
        json.dump(pj, open(os.path.join(d, "palabras.json"), "w", encoding="utf-8"), ensure_ascii=False)
        json.dump(tj, open(os.path.join(d, "timeline.json"), "w")); json.dump(mouth.tolist(), open(os.path.join(d, "mouth.json"), "w"))
    print("scene starts (s):", [round(s, 2) for s in st])
    print("scene lengths (s):", [round(st[i + 1] - st[i], 2) for i in range(15)] + [round(total - st[15], 2)])
    print(f"voice {VOICE} {RATE:+d}%  speech ends {speech_end:.2f}s  total {total:.2f}s = {nf} frames  (continuous synthesis, no atempo)")

asyncio.run(main())
