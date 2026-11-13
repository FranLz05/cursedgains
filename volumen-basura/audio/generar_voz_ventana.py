"""Locucion en ingles (edge-tts, en-US-ChristopherNeural) para "The Anabolic Window Myth" (PumpParadox, Short 3).
Cada frase se sintetiza por separado, se recorta y se coloca para que cada escena empiece cerca de su marca objetivo
(0, 11, 19, 35, 47 s). Duracion total objetivo 58.6 s (el render debe durar 58-59 s). Salidas:
  public/voz_ventana/voz.wav, palabras.json, escenas.json  (+ copia de los json en src/videos/ventana/)
edge-tts envia el texto del guion al servicio en linea de Microsoft Edge (sin claves ni cuenta).
Uso: python volumen-basura/audio/generar_voz_ventana.py [rate %] [voz]"""
import asyncio, json, os, re, subprocess, sys, tempfile, wave
import numpy as np
from scipy import signal
import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RATE = int(sys.argv[1]) if len(sys.argv) > 1 else 8        # +8 % = 1.08x
VOICE = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "-" else "en-US-ChristopherNeural"
FPS = 30
TARGET = [0.0, 11.0, 18.4, 35.4, 43.9]                      # scene start targets (s)
LAST_LEAD = 1.0                                             # last line starts this long after scene 5 begins (Dr. Pigeon walks in first)
TOTAL_TARGET = 55.0
GAP = 0.32
SENT = [
    (0, "Tito just finished his last set."),
    (None, "Suddenly, the Anabolic Window opens."),
    (None, "He has exactly thirty minutes to chug his protein shake, or his muscles will literally evaporate."),
    (1, "He sprints to the locker room and dry-scoops three mountains of powder."),
    (None, "Big win, right?"),
    (2, "Unfortunately, the thirty-minute anabolic window is a massive myth."),
    (None, "Your muscles don’t instantly disintegrate if you wait to eat."),
    (None, "In reality, lifting weights elevates muscle protein synthesis for up to forty-eight hours."),
    (None, "Think of your muscles like a sponge that absorbs protein slowly over two days, not a ticking time bomb."),
    (3, "What actually builds muscle is hitting your total daily protein goal, not racing the clock."),
    (None, "Chugging a shake in the locker room means nothing if you under-eat the rest of the day."),
    (4, "Relax, take a shower, and just go eat a normal meal."),
]
TMP = tempfile.mkdtemp(prefix="voz_ventana_")
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
    print("sentence durations:", [round(d, 2) for d in dur], " speech total", round(sum(dur), 2))
    t = 0.0; chunks = []; words = []; sent_starts = []; scene_starts = [0] * 5
    for i, (scene, text, x, a, ev) in enumerate(clips):
        if scene is not None:
            t = max(t, TARGET[scene] + (LAST_LEAD if scene == 4 else 0))
            scene_starts[scene] = round((TARGET[scene] if scene == 4 else t) * FPS) if scene != 4 else round(TARGET[4] * FPS)
            if scene != 4: t = max(t, TARGET[scene])
        for tk, s0, s1 in align(text.split(), ev):
            words.append({"w": tk.strip(), "t": round(max(0, t + s0 - a / SR), 3), "e": round(t + s1 - a / SR, 3)})
        chunks.append((int(t * SR), x)); sent_starts.append(round(t * FPS))
        t += len(x) / SR + GAP
    end_speech = t - GAP
    # if a scene's speech overflowed into the next one, report it
    for s in range(1, 5):
        if scene_starts[s] < scene_starts[s - 1]: print("WARN scene order")
    total_s = max(TOTAL_TARGET, end_speech + 1.6)
    out = np.zeros(int((total_s + 0.2) * SR))
    for s0, x in chunks: out[s0:s0 + len(x)] += x[: len(out) - s0]
    out = out / max(1e-9, np.max(np.abs(out))) * 0.9
    out = signal.resample_poly(out, 147, 80)
    os.makedirs(os.path.join(ROOT, "public", "voz_ventana"), exist_ok=True)
    with wave.open(os.path.join(ROOT, "public", "voz_ventana", "voz.wav"), "wb") as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(44100); o.writeframes((np.clip(out, -1, 1) * 32767).astype("<i2").tobytes())
    total_f = int(round(total_s * FPS))
    for wd in words: wd["f"] = round(wd["t"] * FPS)
    pj = {"voice": VOICE, "rate": RATE, "duration": total_s, "words": words}
    ej = {"scenes": scene_starts, "sentences": sent_starts, "total": total_f, "duration": total_s}
    for d in (os.path.join(ROOT, "public", "voz_ventana"), os.path.join(ROOT, "src", "videos", "ventana")):
        os.makedirs(d, exist_ok=True)
        json.dump(pj, open(os.path.join(d, "palabras.json"), "w", encoding="utf-8"), ensure_ascii=False)
        json.dump(ej, open(os.path.join(d, "escenas.json"), "w"))
    print(f"voice {VOICE} rate {RATE:+d}%  words {len(words)}  speech ends {end_speech:.2f}s  total {total_s:.2f}s = {total_f} frames")
    print("scene starts (s):", [round(f / FPS, 1) for f in scene_starts], " sentence starts (s):", [round(f / FPS, 1) for f in sent_starts])

asyncio.run(main())
