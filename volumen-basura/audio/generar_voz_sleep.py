"""Locucion en ingles (edge-tts, en-US-ChristopherNeural, +8 %) para el Video 7 de PumpParadox "Sleep Robbery" (id `SleepRobbery`).
Tres BLOQUES LARGOS, cada uno sintetizado de una vez con su propio `pitch` (edge-tts solo admite rate / pitch / volume globales por llamada):
  1) gancho absurdo +5 Hz  -> pausa 200 ms ->  2) desarrollo dramatico +3 Hz  -> pausa 200 ms ->  3) remate seco -3 Hz.
Nunca se acelera el audio (sin atempo / playbackRate). Los silencios muertos (> 0.3 s) se acortan a 0.24 s y los tiempos de palabra se recalculan al unir.
La DURACION de cada escena sale del audio: cada escena empieza en su primera palabra; si una animacion necesita mas tiempo se inserta una pausa corta (MINS) antes de la siguiente frase.
Salidas: public/voz_sleep/{voz.wav,palabras.json,mouth.json,timeline.json} y copia de los json en src/videos/sleep_robbery/.
Uso: python volumen-basura/audio/generar_voz_sleep.py [rate %] [voz]"""
import asyncio, json, os, re, subprocess, sys, tempfile, wave
import numpy as np
from scipy import signal
import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RATE = int(sys.argv[1]) if len(sys.argv) > 1 else 8
VOICE = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "-" else "en-US-ChristopherNeural"
FPS = 30; SR = 24000; PAUSE = 0.20
FF = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
# (pitch Hz, [one string per micro-scene]) -- the scene starts on the first word of its string
BLOCKS = [
    (5, ["You're in a perfect calorie deficit...", "but you sleep four hours", "playing on your phone?", "— Congratulations!", "You just invited two armed robbers", "into your bedroom."]),
    (3, ["Welcome to your brain's control room at 3 AM.", "Cortisol takes the megaphone", "and declares a state of emergency!", "To survive the night,", "he ignores the cheap fat barrels...",
         "and orders the crew to throw your expensive muscle furniture", "straight into the furnace!"]),
    (-3, ["Science shows sleep deprivation can increase muscle loss by sixty percent...", "So put the phone down,", "or keep paying the sleep tax with your gains."]),
]
# minimum scene length (s) per scene (16)
MINS = [2.0, 1.8, 1.7, 2.0, 2.3, 2.4, 2.5, 2.2, 2.4, 1.9, 2.5, 3.3, 2.5, 3.9, 2.1, 4.6]
LEAD = 0.10; HOLD = 1.4
alnum = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
TMP = tempfile.mkdtemp(prefix="voz_sleep_")

async def synth(text, pitch, tag):
    mp3 = os.path.join(TMP, f"{tag}.mp3"); ev = []
    com = edge_tts.Communicate(text, VOICE, rate=f"{RATE:+d}%", pitch=f"{pitch:+d}Hz", boundary="WordBoundary")
    with open(mp3, "wb") as fh:
        async for e in com.stream():
            if e["type"] == "audio": fh.write(e["data"])
            elif e["type"] == "WordBoundary": ev.append((e["text"], e["offset"] / 1e7, e["duration"] / 1e7))
    wav = os.path.join(TMP, f"{tag}.wav")
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", str(SR), wav], check=True)
    w = wave.open(wav); x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768
    return x, ev

def align(tokens, ev):
    """character-level alignment: an event may cover several tokens ("3 AM") or one token may span several events"""
    cs = []                                                           # (char, t_start, t_end) for every alnum character of the events
    for txt, t0, d in ev:
        ch = alnum(txt)
        for i, c in enumerate(ch): cs.append((c, t0 + d * i / max(1, len(ch)), t0 + d * (i + 1) / max(1, len(ch))))
    out = []; j = 0
    for tk in tokens:
        n = len(alnum(tk)); seg = cs[j:j + n] if j < len(cs) else [cs[-1]]; j += n
        if not seg: seg = [cs[-1]]
        out.append([tk, seg[0][1], seg[-1][2]])
    return out

def trim(x, ev_words, head=0.05, tail=0.08):
    env = np.abs(x); idx = np.nonzero(env > 0.02 * env.max())[0]
    a = max(0, int(idx[0]) - int(head * SR)); b = min(len(x), int(idx[-1]) + int(tail * SR))
    for w in ev_words: w[1] -= a / SR; w[2] -= a / SR
    return x[a:b]

async def main():
    pieces = []; words = []; scene_first = []; t_off = 0.0
    for bi, (pitch, scenes) in enumerate(BLOCKS):
        text = " ".join(scenes)
        x, ev = await synth(text, pitch, f"b{bi}")
        toks = [t for t in text.split() if alnum(t)]                  # the em-dash is punctuation for the TTS only
        ws = align(toks, ev); x = trim(x, ws)
        n0 = len(words)
        k = 0
        for s in scenes:
            scene_first.append(n0 + k); k += len([t for t in s.split() if alnum(t)])
        for w in ws: w[1] += t_off; w[2] += t_off
        words += ws; pieces.append(x); t_off += len(x) / SR
        if bi < len(BLOCKS) - 1: pieces.append(np.zeros(int(PAUSE * SR))); t_off += PAUSE        # 200 ms micro-pause between blocks
        print(f"block {bi + 1}: pitch {pitch:+d} Hz  {len(x) / SR:.2f}s  words {len(ws)}")
    x = np.concatenate(pieces)
    # shorten dead silences (> 0.3 s) to 0.24 s, EXCEPT the 200 ms block joints (they are < 0.3 s anyway)
    win = int(0.01 * SR); e10 = np.array([np.abs(x[i:i + win]).max() for i in range(0, len(x) - win, win)])
    quiet = e10 < 0.012 * e10.max(); runs = []; i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if (j - i) * 0.01 > 0.3: runs.append((i * win, j * win))
            i = j
        else: i += 1
    KEEP = int(0.24 * SR); parts = []; shifts = []; pos = 0
    for a, b in runs:
        parts.append(x[pos:a + KEEP // 2]); pos = b - KEEP // 2; shifts.append((b - KEEP // 2, (b - a - KEEP) / SR))
    parts.append(x[pos:]); y = np.concatenate(parts)
    shift_of = lambda t: sum(s for p, s in shifts if t * SR >= p)
    for w in words: w[1] -= shift_of(w[1] + 1e-6); w[2] -= shift_of(w[2] + 1e-6)
    print("silences shortened:", len(runs), " total removed %.2fs" % sum(s for _, s in shifts))
    NS = len(scene_first)
    def starts_of(): return [max(0.0, words[k][1] - LEAD) if i else 0.0 for i, k in enumerate(scene_first)]
    for i in range(NS - 1):
        st = starts_of(); dur = st[i + 1] - st[i]
        if dur < MINS[i]:
            d = MINS[i] - dur; T = int(max(0, words[scene_first[i + 1]][1] - LEAD - 0.02) * SR)
            y = np.concatenate([y[:T], np.zeros(int(d * SR)), y[T:]])
            for w in words:
                if w[1] * SR >= T: w[1] += d; w[2] += d
            print(f"scene {i + 1}: {dur:.2f}s < {MINS[i]}s -> +{d:.2f}s beat")
    st = starts_of(); speech_end = words[-1][2]
    total = max(st[NS - 1] + MINS[NS - 1], speech_end + HOLD)
    y = np.concatenate([y, np.zeros(max(0, int((total + 0.3) * SR) - len(y)))])
    y = y / max(1e-9, np.max(np.abs(y))) * 0.9
    y44 = signal.resample_poly(y, 147, 80)
    d1 = os.path.join(ROOT, "public", "voz_sleep"); d2 = os.path.join(ROOT, "src", "videos", "sleep_robbery")
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
    pj = {"voice": VOICE, "rate": RATE, "pitches": [b[0] for b in BLOCKS], "duration": total, "words": out_words}
    tj = {"starts": [round(s, 3) for s in st], "startsF": startsF, "total": nf, "duration": nf / FPS}
    for d in (d1, d2):
        json.dump(pj, open(os.path.join(d, "palabras.json"), "w", encoding="utf-8"), ensure_ascii=False)
        json.dump(tj, open(os.path.join(d, "timeline.json"), "w")); json.dump(mouth.tolist(), open(os.path.join(d, "mouth.json"), "w"))
    print("scene starts (s):", [round(s, 2) for s in st])
    print("scene lengths (s):", [round(st[i + 1] - st[i], 2) for i in range(NS - 1)] + [round(total - st[NS - 1], 2)])
    print(f"voice {VOICE} {RATE:+d}%  speech ends {speech_end:.2f}s  total {total:.2f}s = {nf} frames  (3 blocks, pitch +5/+3/-3 Hz, no atempo)")

asyncio.run(main())
