"""English narration with edge-tts (en-US-ChristopherNeural) for "Volumen basura" v5.
Every sentence is synthesised separately, trimmed, and laid end to end with ~0.1 s between them (no silences).
The story timeline was authored against the first (Spanish) timing, so this script also writes a time map
(old frame -> new frame) built from the sentence starts and a few key words; Remotion plays the whole animation
through that map (src/videos/volumen/story.ts: toOld).
Outputs: public/voz/voz.wav (44.1 kHz mono), palabras.json (display words with real times), mapa_tiempos.json
(also copied to src/videos/volumen/). Usage: python volumen-basura/audio/generar_voz_en.py [voice] [rate %]
edge-tts sends the script text to Microsoft's online service (no key, no account)."""
import asyncio, json, os, re, subprocess, sys, tempfile, wave, shutil
import numpy as np
from scipy import signal
import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VOICE = sys.argv[1] if len(sys.argv) > 1 else "en-US-ChristopherNeural"
RATE = int(sys.argv[2]) if len(sys.argv) > 2 else 28
FPS = 30
GAP = 0.10
# (anchor = frame in the original timeline where this sentence started, tts text, display text, [(old frame, word, dframes)])
SENT = [
    (0, "You train twice as hard, but grow the exact same.", "You train twice as hard, but grow the exact same.", [(12, "twice", -1)]),
    (45, "That's the twenty-set trap.", "That's the twenty-set trap.", []),
    (88, "Look at Tito.", "Look at Tito.", []),
    (104, "Every Monday, he blasts twenty sets of chest in a single workout,", "Every Monday, he blasts twenty sets of chest in a single workout,", [(122, "twenty", -1)]),
    (192, "convinced that more is better.", "convinced that more is better.", []),
    (228, "And at first, it works.", "And at first, it works.", []),
    (256, "The first sets trigger growth.", "The first sets trigger growth.", []),
    (308, "Set three adds up.", "Set three adds up.", []),
    (329, "Set six adds up.", "Set six adds up.", []),
    (351, "But every extra set builds less than the last.", "But every extra set builds less than the last.", []),
    (402, "Set twelve.", "Set twelve.", []),
    (419, "Set fifteen.", "Set fifteen.", []),
    (438, "Set twenty.", "Set twenty.", []),
    (456, "Tito isn't lifting with intensity anymore, he's just counting reps.", "Tito isn't lifting with intensity anymore— he's just counting reps.", []),
    (525, "Luckily, his muscles aren't shrinking.", "Luckily, his muscles aren't shrinking.", []),
    (571, "Unfortunately, they aren't growing twice as fast either.", "Unfortunately, they aren't growing twice as fast either.", []),
    (619, "Think of your muscle like a glass.", "Think of your muscle like a glass.", []),
    (659, "The first sets fill it up.", "The first sets fill it up.", []),
    (692, "The rest just spill water on the floor,", "The rest just spill water on the floor—", [(698, "spill", -4)]),
    (740, "and that spill is called fatigue.", "and that spill is called fatigue.", [(765, "fatigue", -2)]),
    (776, "Science suggests ten to twenty sets per week,", "Science suggests ten to twenty sets per week,", [(796, "ten", -2)]),
    (836, "split across multiple days.", "split across multiple days.", []),
    (870, "Same sets, way more gains.", "Same sets, way more gains.", []),
    (921, "Tito split his volume,", "Tito split his volume,", []),
    (970, "spent fewer hours in the gym,", "spent fewer hours in the gym,", []),
    (1014, "and his shirt finally got tight.", "and his shirt finally got tight.", [(1027, "shirt", -1)]),
]
TMP = tempfile.mkdtemp(prefix="voz_en_")
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
    """give every display token a (start, end) from the TTS word events (merging events when a token spans several)"""
    out = []; j = 0
    for tk in tokens:
        need = alnum(tk); got = ""; first = None; last = None
        while j < len(ev) and len(got) < len(need):
            got += alnum(ev[j][0]); first = ev[j] if first is None else first; last = ev[j]; j += 1
        if first is None:  # ran out of events: reuse the last
            first = last = ev[-1]
        out.append((tk, first[1], last[1] + last[2]))
    return out

async def main():
    res = await asyncio.gather(*[synth(i, s[1]) for i, s in enumerate(SENT)])
    SR = 24000; t = 0.0
    chunks = []; words = []; anchors = [[0, 0]]
    for i, ((old, _tts, disp, cues), (wav, ev)) in enumerate(zip(SENT, res)):
        x, sr = readwav(wav); assert sr == SR
        env = np.abs(x); thr = 0.02 * env.max(); idx = np.nonzero(env > thr)[0]
        a = max(0, idx[0] - int(0.01 * SR)); b = min(len(x), idx[-1] + int(0.03 * SR)); x = x[a:b]
        toks = disp.replace("—", "— ").split()
        al = align([tk.rstrip("—") if False else tk for tk in toks], ev)
        start = t; chunks.append((int(t * SR), x))
        for tk, s0, s1 in al:
            words.append({"w": tk.replace("—", "").strip(), "t": round(start + s0 - a / SR, 3), "e": round(start + s1 - a / SR, 3)})
        anchors.append([old, round(start * FPS)])
        for cold, word, df in cues:
            for tk, s0, s1 in al:
                if alnum(tk).startswith(alnum(word)):
                    anchors.append([cold, round((start + s0 - a / SR) * FPS) + df]); break
        t += len(x) / SR + GAP
    total_s = t - GAP + 0.35
    out = np.zeros(int((total_s + 0.2) * SR))
    for s0, x in chunks: out[s0:s0 + len(x)] += x[: len(out) - s0]
    out = out / max(1e-9, np.max(np.abs(out))) * 0.9
    out = signal.resample_poly(out, 147, 80)
    dst = os.path.join(ROOT, "public", "voz", "voz.wav")
    if os.path.exists(dst): shutil.copy(dst, os.path.join(ROOT, "public", "voz", "voz_es_v4.wav"))
    with wave.open(dst, "wb") as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(44100); o.writeframes((np.clip(out, -1, 1) * 32767).astype("<i2").tobytes())
    total_f = int(round(total_s * FPS))
    anchors.append([1075, total_f])
    anchors.sort(key=lambda p: (p[0], p[1]))
    clean = []                                      # strictly increasing in both columns
    for o_, n_ in anchors:
        if clean and o_ <= clean[-1][0]: continue
        if clean and n_ <= clean[-1][1]: n_ = clean[-1][1] + 1
        clean.append([o_, n_])
    for wd in words: wd["f"] = round(wd["t"] * FPS)
    pj = {"voice": VOICE, "rate": RATE, "duration": total_s, "words": words}
    mp = {"anchors": clean, "total": total_f}
    for d in (os.path.join(ROOT, "public", "voz"), os.path.join(ROOT, "src", "videos", "volumen")):
        json.dump(pj, open(os.path.join(d, "palabras.json"), "w", encoding="utf-8"), ensure_ascii=False)
        json.dump(mp, open(os.path.join(d, "mapa_tiempos.json"), "w", encoding="utf-8"))
    nw = len(words)
    print(f"voice {VOICE} rate {RATE:+d}%  words {nw}  total {total_s:.2f}s = {total_f} frames  ({nw / total_s:.2f} words/s)")
    print("anchors:", clean)

asyncio.run(main())
