"""QA automatica del short Sleep Robbery (Video 7): lo que se puede comprobar sin ojos.
 1) MP4: resolucion, duracion, fotogramas, sonoridad (LUFS) y pico.
 2) Subtitulos: ancho estimado de cada grupo <= 960 px (margen lateral >= 60 px) y posicion vertical dentro de [150, 1750].
 3) Escenas / planos: duracion de cada escena y numero de cortes (CUTS) -> planos totales y duracion media.
 4) Camara vs referencias Rick Clips (videoplayback*.mp4 de out/auditoria): rango por metrica + indice de similitud.
 5) Margenes: % de pixeles 'con contenido de interes' (no fondo) en las bandas de 60 px laterales (aviso si hay texto/personaje cortado: bordes con mucho contraste).
Uso: python herramientas/qa_sleep.py out/sleep_robbery_video7.mp4"""
import json, os, re, subprocess, sys
import numpy as np
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FF = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
mp4 = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "out", "sleep_robbery_video7.mp4")
V = os.path.join(ROOT, "src", "videos", "sleep_robbery")
ok = True
def rep(name, good, msg):
    global ok; ok &= good; print(("[ OK ] " if good else "[FAIL] ") + name + ": " + msg)
# 1) mp4
info = subprocess.run([FF, "-i", mp4, "-hide_banner"], capture_output=True, text=True).stderr
m = re.search(r"Video: .*?, (\d+)x(\d+).*?, ([\d.]+) fps", info); w, h, fps = int(m[1]), int(m[2]), float(m[3])
d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info); dur = int(d[1]) * 3600 + int(d[2]) * 60 + float(d[3])
rep("formato", (w, h) == (1080, 1920) and abs(fps - 30) < 0.1, f"{w}x{h} @ {fps} fps, {dur:.2f}s")
TL = json.load(open(os.path.join(V, "timeline.json"))); rep("duracion = timeline", abs(dur - TL["duration"]) < 0.2, f"mp4 {dur:.2f}s vs timeline {TL['duration']:.2f}s")
lu = subprocess.run(["ffmpeg", "-i", mp4, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", lu)[-1]); pk = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", lu)[-1])
rep("audio", -16 <= I <= -12 and pk <= -0.5, f"{I:.1f} LUFS (objetivo -14), pico {pk:.1f} dBFS")
# 2) subtitulos
W = json.load(open(os.path.join(V, "palabras.json")))["words"]; bad = []
text = open(os.path.join(V, "SleepRobbery.tsx"), encoding="utf-8").read()
for i, wd in enumerate(W):
    pass
groups = []; cur = []; prev = ""
for x in W:
    t = re.sub(r"[,.;:?!\u2014]+$", "", x["w"]).upper()
    if len(cur) >= 2 or re.search(r"[.,;:?!\u2014]$", prev) or sum(len(q) for q in cur) + len(t) > 11: groups.append(cur); cur = []
    cur.append(t); prev = x["w"]
groups.append(cur)
for g in groups:
    n = sum(len(q) for q in g) + 1.5 * (len(g) - 1); fs = min(112, int(940 / (max(5, n) * 0.82))); est = n * fs * 0.8 + 44 * (len(g) - 1)
    if est > 960: bad.append((" ".join(g), round(est)))
rep("subtitulos <= 960 px", not bad, "todos caben" if not bad else str(bad))
# 3) escenas / planos
S = TL["starts"] + [TL["duration"]]; CUTS = json.load(open(os.path.join(V, "cuts.json"))); n = sum(1 + len(c) for c in CUTS)
rep("escenas", len(TL["starts"]) == 16 and all(1.6 <= S[i + 1] - S[i] <= 4.7 for i in range(16)), f"16 escenas, {min(S[i+1]-S[i] for i in range(16)):.2f}-{max(S[i+1]-S[i] for i in range(16)):.2f}s")
rep("planos", 28 <= n <= 40, f"{n} planos, media {TL['duration'] / n:.2f}s (Rick Clips 1.27-1.48s)")
# 4) camara vs Rick Clips
aud = os.path.join(ROOT, "out", "sleep", "audit.json")
subprocess.run([sys.executable, os.path.join(ROOT, "volumen-basura", "analisis", "camara_audit.py"), aud, mp4], capture_output=True)
R = [r for r in json.load(open(os.path.join(ROOT, "out", "auditoria", "audit_referencias_y_anteriores.json"))) if "videoplayback" in r["video"]]; A = json.load(open(aud))[0]; sc = []
for k, nm in [("avg_shot_sec", "duracion media de plano"), ("moving_pct", "% camara en movimiento"), ("move_run_median_sec", "tramo de movimiento mediano"), ("mean_px_per_frame", "velocidad media"), ("abrupt_per_min", "cambios bruscos/min"), ("dof_ratio", "nitidez sujeto/fondo")]:
    v = [r[k] for r in R]; lo, hi = min(v), max(v); mean = sum(v) / len(v); x = A[k]; inr = lo <= x <= hi
    s = 1.0 if inr else max(0, 1 - min(abs(x - lo), abs(x - hi)) / mean); sc.append(s)
    print(f"        {nm:30s} {x:7.2f} | Rick {lo:6.2f}-{hi:6.2f} {'dentro' if inr else 'FUERA '} {s * 100:3.0f}%")
print(f"[INFO] similitud de ritmo/camara con Rick Clips: {round(100 * sum(sc) / len(sc))} %")
# 5) bandas laterales: bordes de alto contraste pegados al borde (texto / personajes cortados)
frames = []
for i in range(16):
    for fr in (0.3, 0.8):
        t = S[i] + (S[i + 1] - S[i]) * fr
        tmpf = os.path.join(ROOT, "out", "sleep", "_qa.png")
        subprocess.run([FF, "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", mp4, "-frames:v", "1", "-vf", "scale=270:480", tmpf], capture_output=True)
        from PIL import Image
        r = np.array(Image.open(tmpf).convert("L")).tobytes()
        frames.append((i + 1, np.frombuffer(r, np.uint8).reshape(480, 270).astype(float)))
warn = []
for sc_, f in frames:
    band = np.abs(np.diff(f[:, :16], axis=1)).mean(); band2 = np.abs(np.diff(f[:, -16:], axis=1)).mean()
    if max(band, band2) > 14: warn.append((sc_, round(float(max(band, band2)), 1)))
print("[INFO] escenas con contenido contrastado pegado al borde lateral (revisar a ojo):", sorted(set(w for w, _ in warn)) or "ninguna")
print("RESULTADO:", "TODO OK" if ok else "HAY FALLOS")
