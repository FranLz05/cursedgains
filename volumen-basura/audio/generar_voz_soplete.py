"""Locucion en ingles (edge-tts, en-US-ChristopherNeural, +12 % = 1.12x) para "The Spot Reduction Myth / Blowtorch Abs"
(PumpParadox, Short 4). Cada frase se sintetiza por separado, se recorta y se coloca de corrido (sin silencios largos: las pausas
son "beats" cortos que la mezcla rellena con efectos). Duracion total objetivo 56.6 s (el render debe durar 55-58 s).
Salidas: public/voz_soplete/voz.wav, palabras.json, escenas.json  (+ copia de los json en src/videos/soplete/)
edge-tts envia el texto del guion al servicio en linea de Microsoft Edge (sin claves ni cuenta).
Uso: python volumen-basura/audio/generar_voz_soplete.py [rate %] [voz] [total s]"""
import asyncio, json, os, re, subprocess, sys, tempfile, wave
import numpy as np
from scipy import signal
import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RATE = int(sys.argv[1]) if len(sys.argv) > 1 else 12        # +12 % = 1.12x
VOICE = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "-" else "en-US-ChristopherNeural"
TOTAL_TARGET = float(sys.argv[3]) if len(sys.argv) > 3 else 57.0
FPS = 30
TAIL = 3.0                                                   # the last scene holds the sign after the last word
GAP0 = 0.22                                                  # minimum gap between sentences
# (scene index that starts at this sentence, text)
SENT = [
    (0, "Tito wants visible abs by Friday."),
    (None, "So he’s doing ten thousand crunches in a torture chamber, with a blowtorch aimed at his stomach."),
    (None, "Smart move, right?"),
    (1, "Unfortunately, spot reduction is biologically impossible."),
    (None, "Your abs cannot magically burn the fat sitting directly on top of them."),
    (None, "Fat cells don't take orders from the muscles underneath."),
    (2, "When you're in a calorie deficit, your body pulls fat from all over your body at once—your face, your arms, your legs, and eventually your belly."),
    (3, "Think of your body fat like a swimming pool: you can't drain water from just the deep end with a tiny bucket."),
    (4, "Crunches build core muscle, which is great, but only a calorie deficit reveals them."),
    (None, "Drop the blowtorch, track your food, and save your spine."),
]
# weight of the extra pause that follows each sentence (scene changes get the longest beat)
BEAT_W = [0.8, 0.8, 2.7, 0.9, 0.9, 2.7, 2.7, 2.7, 0.9, 0]
TMP = tempfile.mkdtemp(prefix="voz_soplete_")
alnum = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())

async def synth(i, text):
    mp3 = os.path.join(TMP, f"s{i}.mp3"); ev = []
    com = edge_tts.Communicate(text, VOICE, rate=f"{RATE:+d}%", boundary="WordBoundary")
    with open(mp3, "wb") as fh:
        async for e in com.stream():
            if e["type"] == "audio": fh.write(e["data"])
            elif e["type"] == "WordBoundary": ev.append((e["text"], e["offset"] / 1e7, e["duration"] / 1e7))
    wav = os.path.join(TMP, f"s{i}.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", "24000", wav], check=True)
    return wav, ev

def readwav(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768, w.getframerate()

def align(tokens, ev):
    out = []; j = 0
    for tk in tokens:
        need = alnum(tk); got = ""; first = last = None
        while j < len(ev) and len(got) < len(need):
            got += alnum(ev[j][0]); first = ev[j] if first is None else first; last = ev[j]; j += 1
        if first is None: first = last = ev[-1]
        out.append((tk, first[1], last[1] + last[2]))
    return out

async def main():
    res = await asyncio.gather(*[synth(i, s[1]) for i, s in enumerate(SENT)])
    SR = 24000; clips = []
    for (scene, text), (wav, ev) in zip(SENT, res):
        x, sr = readwav(wav); assert sr == SR
        env = np.abs(x); idx = np.nonzero(env > 0.02 * env.max())[0]
        a = max(0, idx[0] - int(0.01 * SR)); b = min(len(x), idx[-1] + int(0.03 * SR)); clips.append((scene, text, x[a:b], a, ev))
    dur = [len(c[2]) / SR for c in clips]
    speech = sum(dur); n = len(clips) - 1
    print("sentence durations:", [round(d, 2) for d in dur], " speech total", round(speech, 2), " words", sum(len(c[1].split()) for c in clips))
    slack = TOTAL_TARGET - TAIL - speech - GAP0 * n          # extra pause to distribute (only if the speech is shorter than the target)
    W = np.array(BEAT_W[:n], dtype=float)
    extra = np.maximum(0, slack) * W / W.sum()
    t = 0.0; chunks = []; words = []; sent_starts = []; scene_starts = [0] * 5
    for i, (scene, text, x, a, ev) in enumerate(clips):
        if scene is not None: scene_starts[scene] = round((t - (1.3 if scene else 0)) * FPS)   # each scene starts ~1.3 s before its sentence (visual lead-in during the beat)
        for tk, s0, s1 in align(text.replace("—", "— ").split(), ev):
            words.append({"w": tk.strip(), "t": round(max(0, t + s0 - a / SR), 3), "e": round(t + s1 - a / SR, 3)})
        chunks.append((int(t * SR), x)); sent_starts.append(round(t * FPS))
        t += len(x) / SR + (GAP0 + extra[i] if i < n else 0)
    end_speech = t
    total_s = end_speech + TAIL
    print(f"slack distributed: {max(0, slack):.2f}s  gaps (s): {[round(GAP0 + e, 2) for e in extra]}")
    out = np.zeros(int((total_s + 0.2) * SR))
    for s0, x in chunks: out[s0:s0 + len(x)] += x[: len(out) - s0]
    out = out / max(1e-9, np.max(np.abs(out))) * 0.9
    out = signal.resample_poly(out, 147, 80)
    os.makedirs(os.path.join(ROOT, "public", "voz_soplete"), exist_ok=True)
    with wave.open(os.path.join(ROOT, "public", "voz_soplete", "voz.wav"), "wb") as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(44100); o.writeframes((np.clip(out, -1, 1) * 32767).astype("<i2").tobytes())
    total_f = int(round(total_s * FPS))
    for wd in words: wd["f"] = round(wd["t"] * FPS)
    pj = {"voice": VOICE, "rate": RATE, "duration": total_s, "words": words}
    ej = {"scenes": scene_starts, "sentences": sent_starts, "total": total_f, "duration": total_s}
    for d in (os.path.join(ROOT, "public", "voz_soplete"), os.path.join(ROOT, "src", "videos", "soplete")):
        os.makedirs(d, exist_ok=True)
        json.dump(pj, open(os.path.join(d, "palabras.json"), "w", encoding="utf-8"), ensure_ascii=False)
        json.dump(ej, open(os.path.join(d, "escenas.json"), "w"))
    print(f"voice {VOICE} rate {RATE:+d}%  words {len(words)}  speech ends {end_speech:.2f}s  total {total_s:.2f}s = {total_f} frames")
    print("scene starts (s):", [round(f / FPS, 1) for f in scene_starts], " sentence starts (s):", [round(f / FPS, 1) for f in sent_starts])

asyncio.run(main())
