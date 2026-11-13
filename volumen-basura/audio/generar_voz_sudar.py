"""Locucion en ingles (edge-tts, en-US-ChristopherNeural) para "Sweating != Burning Fat" (PumpParadox, Short 2).
Cada frase se sintetiza por separado, se recorta y se coloca una tras otra con ~0.12 s de aire. Salidas:
  public/voz_sudar/voz.wav        (44.1 kHz mono)
  public/voz_sudar/palabras.json  (palabras para subtitulos con tiempos reales) + copia en src/videos/sudar/
  public/voz_sudar/escenas.json   (cuadro de inicio de cada escena, de cada frase y duracion total) + copia en src/videos/sudar/
edge-tts envia el texto del guion al servicio en linea de Microsoft Edge (sin claves ni cuenta).
Uso: python volumen-basura/audio/generar_voz_sudar.py [rate %] [voz]"""
import asyncio, json, os, re, subprocess, sys, tempfile, wave
import numpy as np
from scipy import signal
import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RATE = int(sys.argv[1]) if len(sys.argv) > 1 else 8
PSCALE = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
VOICE = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "-" else "en-US-ChristopherNeural"
FPS = 30
GAP = 0.12
# visual beats: seconds of air AFTER each sentence (the script alone is only ~150 words; these give the images time to land)
PAUSE_AFTER = [round(x * PSCALE, 2) for x in [0.2, 0.45, 0.5, 0.25, 0.9, 0.3, 0.8, 1.2, 0.8, 1.1, 0.6, 1.2]]
# (scene index that starts with this sentence or None, text)
SENT = [
    (0, "Tito thinks wearing a trash bag on the treadmill melts fat twice as fast."),
    (None, "While everyone else trains in normal gear, he built his entire gym inside a volcano that’s about to erupt."),
    (None, "After forty minutes, he’s completely drenched."),
    (1, "He steps on the scale, sees three pounds gone, and thinks he just hacked weight loss."),
    (None, "Big win, right?"),
    (2, "Unfortunately, sweat isn’t melted fat."),
    (None, "When your body overheats, your sweat glands pump out water and electrolytes just to cool your skin down."),
    (None, "Actual body fat never leaves through your pores— eighty-four percent of it is breathed out through your lungs as carbon dioxide when you’re in a calorie deficit."),
    (3, "Even worse, overheating drains your energy early, so Tito actually burns fewer calories than if he trained comfortably."),
    (4, "Two glasses of water later, his weight is right back where it started."),
    (None, "Then the gym manager sent him a four-hundred-dollar lava fee."),
    (5, "Ditch the sauna suit, skip the volcano, stay hydrated, and let a calorie deficit do the real work."),
]
TMP = tempfile.mkdtemp(prefix="voz_sudar_")
alnum = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())

async def synth(i, text):
    mp3 = os.path.join(TMP, f"s{i}.mp3"); ev = []
    com = edge_tts.Communicate(text.replace("— ", ", "), VOICE, rate=f"{RATE:+d}%", boundary="WordBoundary")
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
    SR = 24000; t = 0.0; chunks = []; words = []; sent_starts = []; scene_starts = [0] * 6
    for i, ((scene, text), (wav, ev)) in enumerate(zip(SENT, res)):
        x, sr = readwav(wav); assert sr == SR
        env = np.abs(x); idx = np.nonzero(env > 0.02 * env.max())[0]
        a = max(0, idx[0] - int(0.01 * SR)); b = min(len(x), idx[-1] + int(0.03 * SR)); x = x[a:b]
        toks = text.replace("—", "— ").split()
        for tk, s0, s1 in align(toks, ev):
            words.append({"w": tk.replace("—", "").strip(), "t": round(max(0, t + s0 - a / SR), 3), "e": round(t + s1 - a / SR, 3)})
        chunks.append((int(t * SR), x)); sent_starts.append(round(t * FPS))
        if scene is not None: scene_starts[scene] = round(t * FPS)
        t += len(x) / SR + PAUSE_AFTER[i]
    total_s = t - PAUSE_AFTER[-1] + 1.3 + 0.2
    out = np.zeros(int((total_s + 0.2) * SR))
    for s0, x in chunks: out[s0:s0 + len(x)] += x[: len(out) - s0]
    out = out / max(1e-9, np.max(np.abs(out))) * 0.9
    out = signal.resample_poly(out, 147, 80)
    os.makedirs(os.path.join(ROOT, "public", "voz_sudar"), exist_ok=True)
    with wave.open(os.path.join(ROOT, "public", "voz_sudar", "voz.wav"), "wb") as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(44100); o.writeframes((np.clip(out, -1, 1) * 32767).astype("<i2").tobytes())
    total_f = int(round(total_s * FPS))
    for wd in words: wd["f"] = round(wd["t"] * FPS)
    pj = {"voice": VOICE, "rate": RATE, "duration": total_s, "words": words}
    ej = {"scenes": scene_starts, "sentences": sent_starts, "total": total_f, "duration": total_s}
    for d in (os.path.join(ROOT, "public", "voz_sudar"), os.path.join(ROOT, "src", "videos", "sudar")):
        os.makedirs(d, exist_ok=True)
        json.dump(pj, open(os.path.join(d, "palabras.json"), "w", encoding="utf-8"), ensure_ascii=False)
        json.dump(ej, open(os.path.join(d, "escenas.json"), "w", encoding="utf-8"))
    print(f"voice {VOICE} rate {RATE:+d}%  words {len(words)}  total {total_s:.2f}s = {total_f} frames  ({len(words) / total_s:.2f} words/s)")
    print("scene starts (s):", [round(f / FPS, 1) for f in scene_starts], " sentence starts (s):", [round(f / FPS, 1) for f in sent_starts])

asyncio.run(main())
