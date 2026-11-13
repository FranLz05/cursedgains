"""Resumen de out/audit_*.json: solo planos reales (>= 0.5 s), velocidad en % del ancho de pantalla por segundo."""
import json, sys, numpy as np
R = json.load(open(sys.argv[1]))
print(f"{'video':30s} planos  dur.med  %mov  %quieto-final  vel.med(%ancho/s)  tramo.med  bruscos/min  nitidez(sujeto/fondo)")
for r in R:
    S = [s for s in r["shots"] if s["sec"] >= 0.5]
    fr = sum(s["frames"] for s in S); mov = sum(s["moving_pct"] * s["frames"] for s in S) / fr
    runs = [x for s in S for x in s["runs_sec"] if x >= 0.2]
    v = np.median([s["mean_px_per_frame"] for s in S]) * 30 / 270 * 100
    ab = sum(s["abrupt"] for s in S) / (r["sec"] / 60)
    still_end = 100 - np.mean([s.get("end_mov", s["moving_pct"]) for s in S])
    print(f"{r['video'].split('/')[-1][:30]:30s} {len(S):5d} {np.median([s['sec'] for s in S]):7.2f}s {mov:5.1f} {r.get('end_still_pct', 0):9.1f} {v:14.1f} {np.median(runs) if runs else 0:12.2f}s {ab:9.1f}   {r['subject_sharp']:.0f}/{r['bg_sharp']:.0f} ({r['dof_ratio']})")
