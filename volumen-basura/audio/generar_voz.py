"""Locucion neuronal gratuita con edge-tts (es-ES-AlvaroNeural) para "Volumen basura".
Cada frase se sintetiza por separado y se coloca donde empezaba en la linea de tiempo ya aprobada (los cuadros de
story.ts no cambian). Se ajusta la velocidad de cada frase (atempo) para que quepa en su hueco, sin pausas largas.
Salida: public/voz/voz.wav (44.1 kHz mono), public/voz/palabras.json y src/videos/volumen/palabras.json (tiempos reales por palabra).
Nota: edge-tts envia el texto del guion al servicio en linea de Microsoft Edge; no usa claves ni cuenta.
Uso: python volumen-basura/audio/generar_voz.py [voz] [ritmo %]"""
import asyncio, json, os, subprocess, sys, wave, shutil, tempfile
import numpy as np
from scipy import signal
import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VOICE = sys.argv[1] if len(sys.argv) > 1 else "es-ES-AlvaroNeural"
RATE = int(sys.argv[2]) if len(sys.argv) > 2 else 18
FPS = 30
TOTAL = 1075
# (start frame in the approved timeline, text)
SENT = [
    (0, "Entrenas el doble y creces lo mismo."), (45, "Esa es la trampa de las veinte series."), (88, "Mira a Tito."),
    (104, "Cada lunes mete veinte series de pecho en una sola sesión,"), (192, "convencido de que más es mejor."),
    (228, "Y al principio, sí."), (256, "Las primeras series encienden el crecimiento."), (308, "La tercera suma."), (329, "La sexta suma."),
    (351, "Pero cada serie extra suma menos que la anterior."), (402, "Serie doce."), (419, "Serie quince."), (438, "Serie veinte."),
    (456, "Tito ya no empuja con fuerza, solo cuenta repeticiones."), (525, "Por suerte, el músculo no se le esfuma."),
    (571, "Por desgracia, tampoco crece el doble."), (619, "Fíjate: tu músculo es un vaso."), (659, "Las primeras series lo llenan."),
    (692, "Las siguientes solo derraman agua en el piso,"), (740, "y ese derrame se llama fatiga."),
    (776, "La ciencia sugiere doce a veinte series por semana,"), (836, "repartidas en varios días."),
    (870, "Mismas series, mucho mejor aprovechadas."), (921, "Tito repartió su volumen,"), (970, "entrenó menos horas,"), (1014, "y por fin la camiseta le quedó chica."),
]
GAP = 3  # frames between sentences
TMP = tempfile.mkdtemp(prefix="voz_")

async def synth(i, text):
    mp3 = os.path.join(TMP, f"s{i}.mp3"); words = []
    com = edge_tts.Communicate(text, VOICE, rate=f"{RATE:+d}%", boundary="WordBoundary")
    with open(mp3, "wb") as fh:
        async for ev in com.stream():
            if ev["type"] == "audio": fh.write(ev["data"])
            elif ev["type"] == "WordBoundary": words.append((ev["text"], ev["offset"] / 1e7, ev["duration"] / 1e7))
    wav = os.path.join(TMP, f"s{i}.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", "24000", wav], check=True)
    return wav, words

def readwav(p):
    w = wave.open(p); x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768
    return x, w.getframerate()

async def main():
    res = await asyncio.gather(*[synth(i, t) for i, (_, t) in enumerate(SENT)])
    SR = 24000
    out = np.zeros(int((TOTAL / FPS + 0.3) * SR)); words_out = []
    for i, ((f0, text), (wav, words)) in enumerate(zip(SENT, res)):
        x, sr = readwav(wav); assert sr == SR
        env = np.abs(x); thr = 0.02 * env.max()
        idx = np.nonzero(env > thr)[0]; a, b = idx[0], idx[-1] + 1
        a = max(0, a - int(0.01 * SR)); x = x[a:b + int(0.03 * SR)]
        nat = len(x) / SR
        nxt = SENT[i + 1][0] if i + 1 < len(SENT) else TOTAL
        slot = (nxt - GAP - f0) / FPS if i + 1 < len(SENT) else (TOTAL - f0) / FPS - 0.05
        k = min(1.5, max(0.88, nat / slot))            # >1 = speed up
        p_in = os.path.join(TMP, f"in{i}.wav"); p_out = os.path.join(TMP, f"out{i}.wav")
        with wave.open(p_in, "wb") as o:
            o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", p_in, "-filter:a", f"atempo={k:.4f}", p_out], check=True)
        y, _ = readwav(p_out)
        s0 = int(f0 / FPS * SR); out[s0:s0 + len(y)] += y[: len(out) - s0]
        over = len(y) / SR - slot
        print(f"{i:2d} f{f0:4d} nat {nat:5.2f}s slot {slot:5.2f}s tempo {k:4.2f}" + (f"  OVER {over:+.2f}s" if over > 0.02 else ""))
        toks = text.split()
        if len(toks) == len(words): words = [(tk, o_, d_) for tk, (_, o_, d_) in zip(toks, words)]
        for w_, off, dur in words:
            t0 = f0 / FPS + (off - a / SR) / k; t1 = t0 + dur / k
            words_out.append({"w": w_, "t": round(max(f0 / FPS, t0), 3), "e": round(t1, 3)})
    # light peak normalisation, resample to 44.1 kHz
    out = out / max(1e-9, np.max(np.abs(out))) * 0.9
    out = signal.resample_poly(out, 147, 80)
    dst = os.path.join(ROOT, "public", "voz", "voz.wav")
    if os.path.exists(dst): shutil.copy(dst, os.path.join(ROOT, "public", "voz", "voz_anterior.wav"))
    with wave.open(dst, "wb") as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(44100); o.writeframes((np.clip(out, -1, 1) * 32767).astype("<i2").tobytes())
    for wd in words_out: wd["f"] = round(wd["t"] * FPS)
    js = {"voice": VOICE, "rate": RATE, "duration": len(out) / 44100, "words": words_out}
    for d in (os.path.join(ROOT, "public", "voz", "palabras.json"), os.path.join(ROOT, "src", "videos", "volumen", "palabras.json")):
        json.dump(js, open(d, "w", encoding="utf-8"), ensure_ascii=False)
    print("palabras:", len(words_out), "duracion", round(len(out) / 44100, 2), "s")

asyncio.run(main())
