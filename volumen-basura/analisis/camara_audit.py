"""Auditoria de camara frame a frame (30 fps) para comparar los shorts de PumpParadox con los de Rick Clips.
Por cada video: cortes, % de frames con la camara en movimiento, duracion de cada movimiento continuo, suavidad (entradas / salidas bruscas)
y claridad del encuadre (nitidez del centro vs. fondo = profundidad de campo).
Movimiento de camara = transformacion global (traslacion + zoom + giro) estimada con RANSAC sobre puntos seguidos con Lucas-Kanade,
asi la animacion del personaje no cuenta como movimiento de camara. La franja de subtitulos se excluye.
Uso: python volumen-basura/analisis/camara_audit.py salida.json video1.mp4 [video2.mp4 ...]"""
import sys, json, math
import numpy as np, cv2

W, H = 270, 480
THR = 0.06        # px/frame (a 270 px de ancho) para considerar que la camara se mueve
MASK = np.full((H, W), 255, np.uint8); MASK[int(0.62 * H):int(0.80 * H), :] = 0   # subtitulos fuera

def frames(path):
    cap = cv2.VideoCapture(path)
    while True:
        ok, fr = cap.read()
        if not ok: break
        yield cv2.cvtColor(cv2.resize(fr, (W, H), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)

def sharp(g, y0, y1, x0, x1):
    r = g[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)]
    return float(cv2.Laplacian(r, cv2.CV_64F).var())

def analyse(path):
    prev = None; mags = []; cuts = [0]; scs = []; bgs = []; kinds = []
    for i, g in enumerate(frames(path)):
        scs.append(sharp(g, 0.25, 0.6, 0.3, 0.7))                         # subject zone
        bgs.append(0.5 * (sharp(g, 0.02, 0.2, 0.0, 0.25) + sharp(g, 0.02, 0.2, 0.75, 1.0)))   # top corners = background
        if prev is None: prev = g; mags.append(0.0); kinds.append((0, 0, 0)); continue
        d = np.abs(cv2.calcHist([g], [0], None, [32], [0, 256]) - cv2.calcHist([prev], [0], None, [32], [0, 256])).sum() / (W * H)
        m = 0.0; k = (0, 0, 0)
        ad = float(np.abs(cv2.resize(g, (27, 48)).astype(float) - cv2.resize(prev, (27, 48)).astype(float)).mean())
        if d > 0.3 or ad > 30:
            if i - cuts[-1] > 3: cuts.append(i)
        else:
            p0 = cv2.goodFeaturesToTrack(prev, 400, 0.01, 6, mask=MASK)
            if p0 is not None and len(p0) >= 8:
                p1, st, _ = cv2.calcOpticalFlowPyrLK(prev, g, p0, None, winSize=(21, 21), maxLevel=3)
                a, b = p0[st == 1], p1[st == 1]
                if len(a) >= 8:
                    M, inl = cv2.estimateAffinePartial2D(a, b, method=cv2.RANSAC, ransacReprojThreshold=1.0)
                    if M is None or inl.mean() < 0.35:
                        if ad > 12 and i - cuts[-1] > 3: cuts.append(i)
                    else:
                        s = math.hypot(M[0, 0], M[1, 0]); rot = math.atan2(M[1, 0], M[0, 0])
                        cx, cy = W / 2, H / 2
                        tx = M[0, 2] + (M[0, 0] - 1) * cx + M[0, 1] * cy; ty = M[1, 2] + M[1, 0] * cx + (M[1, 1] - 1) * cy   # translation of the centre
                        half = math.hypot(cx, cy)
                        k = (math.hypot(tx, ty), abs(s - 1) * half, abs(rot) * half)
                        m = k[0] + k[1] + k[2]
        mags.append(m); kinds.append(k); prev = g
    n = len(mags); mags = np.array(mags)
    cutset = set(cuts)
    # smooth inside shots (median of 5) to remove tracking noise
    sm = mags.copy(); bounds = cuts + [n]
    for a, b in zip(bounds[:-1], bounds[1:]):
        for i in range(a, b):
            lo, hi = max(a + 1, i - 2), min(b, i + 3)
            sm[i] = np.median(mags[lo:hi]) if hi > lo else 0
    moving = sm > THR
    shots = []
    for a, b in zip(bounds[:-1], bounds[1:]):
        if b - a < 3: continue
        seg = moving[a + 1:b]; v = sm[a + 1:b]
        runs = []; r = 0
        for x in seg:
            if x: r += 1
            elif r: runs.append(r); r = 0
        if r: runs.append(r)
        # abrupt starts/stops: velocity jumps from still to > 4x threshold within one frame
        jumps = int(np.sum((v[1:] > 4 * THR) & (v[:-1] < THR))) + int(np.sum((v[:-1] > 4 * THR) & (v[1:] < THR)))
        acc = np.abs(np.diff(v)); jerk = float(acc.mean() / (v.mean() + 1e-6)) if len(v) > 2 else 0
        kk = np.array(kinds[a + 1:b]) if b - a > 1 else np.zeros((1, 3))
        dom = ["traslacion/paneo", "zoom/dolly", "giro"][int(np.argmax(kk.mean(0)))] if kk.size else "-"
        shots.append({"f0": a, "frames": b - a, "sec": round((b - a) / 30, 2), "moving_pct": round(100 * float(seg.mean()), 1) if len(seg) else 0,
                      "runs_sec": [round(x / 30, 2) for x in runs], "mean_px_per_frame": round(float(v.mean()), 3), "peak": round(float(v.max()), 3),
                      "abrupt": jumps, "jerk": round(jerk, 3), "dominant": dom,
                      "subject_sharp": round(float(np.mean(scs[a:b])), 1), "bg_sharp": round(float(np.mean(bgs[a:b])), 1)})
    ends = [moving[max(a + 1, b - 12):b] for a, b in zip(bounds[:-1], bounds[1:]) if b - a >= 15]
    end_still = round(100 * float(1 - np.mean(np.concatenate(ends)))) if ends else 0
    runs_all = [x for s in shots for x in s["runs_sec"]]
    tot = sum(s["frames"] - 1 for s in shots)
    out = {"video": path, "frames": n, "sec": round(n / 30, 2), "cuts": len(cuts) - 1, "end_still_pct": end_still, "avg_shot_sec": round(n / 30 / max(1, len(cuts)), 2),
           "moving_pct": round(sum(s["moving_pct"] * (s["frames"] - 1) for s in shots) / max(1, tot), 1),
           "move_run_mean_sec": round(float(np.mean(runs_all)), 2) if runs_all else 0, "move_run_median_sec": round(float(np.median(runs_all)), 2) if runs_all else 0,
           "mean_px_per_frame": round(float(sm.mean()), 3), "abrupt_per_min": round(sum(s["abrupt"] for s in shots) / (n / 1800), 1),
           "jerk": round(float(np.mean([s["jerk"] for s in shots])), 3),
           "subject_sharp": round(float(np.mean(scs)), 1), "bg_sharp": round(float(np.mean(bgs)), 1),
           "dof_ratio": round(float(np.mean(scs)) / max(1e-6, float(np.mean(bgs))), 2), "shots": shots}
    return out

if __name__ == "__main__":
    res = [analyse(p) for p in sys.argv[2:]]
    json.dump(res, open(sys.argv[1], "w"), indent=1)
    for r in res:
        print(f"{r['video'].split('/')[-1][:34]:34s} {r['sec']:5.1f}s cortes {r['cuts']:3d} plano {r['avg_shot_sec']:4.2f}s | mov {r['moving_pct']:5.1f}% "
              f"tramo med {r['move_run_median_sec']:4.2f}s vel {r['mean_px_per_frame']:.3f} bruscos/min {r['abrupt_per_min']:5.1f} jerk {r['jerk']:.2f} | "
              f"nitidez sujeto {r['subject_sharp']:7.1f} fondo {r['bg_sharp']:7.1f} ratio {r['dof_ratio']:.2f}")
