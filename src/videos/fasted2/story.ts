// "The Fasted Cardio Myth" — DYNAMIC cut (PumpParadox, Short 5 v2). Same narration as fasted/ (palabras.json), re-directed in the Rick Clips style:
// 14 micro-scenes, one literal set / action per sentence. HARD CUTS only between sets or radically different angles (cams.json);
// inside a shot the camera glides continuously (Easing.out(cubic) / in-out cubic, never a tilt-only cut, never a flash or a crossfade).
import CAMS from "./cams.json";
import WD from "../fasted/palabras.json";
export const FPS = 30;
export const TOTAL: number = CAMS.total;
export type V3 = [number, number, number];
type Key = { t: number; pos: number[]; look: number[]; fov: number; e?: string };
export type ShotDef = { n: string; f0: number; set: string; keys: Key[] };
export const SHOTS = CAMS.shots as ShotDef[];
export const NSHOT = SHOTS.length;
export const shotStart = (i: number) => SHOTS[i].f0;                       // i = 0..13
export const shotEnd = (i: number) => (i + 1 < NSHOT ? SHOTS[i + 1].f0 : TOTAL);
export const shotOf = (f: number) => { let i = 0; for (let k = 0; k < NSHOT; k++) if (f >= SHOTS[k].f0) i = k; return i; };
export const tsOf = (i: number, f: number) => (f - SHOTS[i].f0) / FPS;
export const cutFrames = (): number[] => SHOTS.map((s) => s.f0);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
/** Remotion's Easing.out(Easing.cubic) and Easing.inOut(Easing.cubic) */
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeIO = (x: number) => { const u = clamp01(x); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
/** a damped spring (0 -> 1 with a small overshoot), for pops */
export const spring = (x: number, k = 9) => (x <= 0 ? 0 : 1 - Math.exp(-k * x * 0.6) * Math.cos(k * x));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export const wordF = (w: string, nth = 0): number => {
  const hits = (WD.words as { w: string; f: number }[]).filter((x) => norm(x.w) === norm(w));
  if (!hits[nth]) throw new Error("word not found: " + w + " #" + nth);
  return hits[nth].f;
};
/** seconds into shot i at which the nth spoken occurrence of a word lands */
export const wordTs = (i: number, w: string, nth = 0) => (wordF(w, nth) - SHOTS[i].f0) / FPS;

/** Catmull-Rom through 4 values */
const cr = (p0: number, p1: number, p2: number, p3: number, u: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
/** CAMERA PHYSICS (CLAUDE.md, dynamic cut): the camera is moving on 100 % of the frames and never stops inside a shot.
 *  Time warp = Easing.inOut(Easing.cubic) over a window that starts 30 % of the shot BEFORE the cut and ends 30 % AFTER it,
 *  so the camera enters each shot already gliding (soft in), slows smoothly (soft out) but never reaches zero speed.
 *  The keys are joined by a Catmull-Rom spline (no stop on interior keys). */
const PAD = 0.3;
export const camAt = (i: number, f: number) => {
  const K = SHOTS[i].keys, D = (shotEnd(i) - shotStart(i)) / FPS, ts = clamp01(tsOf(i, f) / D) * D;
  const P = PAD * D, e0 = easeIO(P / (D + 2 * P)), e1 = easeIO((D + P) / (D + 2 * P));
  const w = ((easeIO((ts + P) / (D + 2 * P)) - e0) / (e1 - e0)) * K[K.length - 1].t;   // warped key time
  let k = 0; for (let j = 0; j < K.length - 1; j++) if (w >= K[j].t) k = j;
  const A = K[Math.max(0, k - 1)], B = K[k], C = K[Math.min(K.length - 1, k + 1)], E = K[Math.min(K.length - 1, k + 2)];
  const u = C === B ? 0 : clamp01((w - B.t) / Math.max(0.01, C.t - B.t));
  const S = (sel: (q: Key) => number[]) => [0, 1, 2].map((d) => cr(sel(A)[d], sel(B)[d], sel(C)[d], sel(E)[d], u)) as V3;
  const pos = S((q) => q.pos), look = S((q) => q.look);
  // + a slow orbit around the subject (ARC degrees over the whole shot, same in-out warp): parallax on every frame, never a dead frame
  const ARC = (i === 11 ? 5 : 7) * (Math.PI / 180), th = (w / K[K.length - 1].t - 0.5) * ARC * (i % 2 ? 1 : -1);
  const dx = pos[0] - look[0], dz = pos[2] - look[2];
  if (i === 11) { pos[0] += 0.25 * Math.sin(th * 4); }
  else { pos[0] = look[0] + dx * Math.cos(th) - dz * Math.sin(th); pos[2] = look[2] + dx * Math.sin(th) + dz * Math.cos(th); }
  return { pos, look, fov: cr(A.fov, B.fov, C.fov, E.fov, u), roll: 0 };
};
