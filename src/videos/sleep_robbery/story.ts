// SLEEP ROBBERY short: timeline + camera physics. 16 micro-scenes, HARD CUTS only (no flashes, no fades). Inside every shot the camera never stops:
// Easing.inOut(Easing.cubic) time-warp over a window that starts 30 % of the shot BEFORE the cut and ends 30 % AFTER it (CLAUDE.md), keys joined by a Catmull-Rom spline.
import { Easing } from "remotion";
import TL from "./timeline.json";
import WD from "./palabras.json";
import CUTS_JSON from "./cuts.json";

export const FPS = 30;
export const TOTAL: number = TL.total;
export const STARTS: number[] = TL.startsF;
export const NSCENE = STARTS.length;
export const sceneStart = (i: number) => STARTS[i];
export const sceneEnd = (i: number) => (i + 1 < NSCENE ? STARTS[i + 1] : TOTAL);
export const sceneOf = (f: number) => { let i = 0; for (let k = 0; k < NSCENE; k++) if (f >= STARTS[k]) i = k; return i; };
export const durOf = (i: number) => (sceneEnd(i) - sceneStart(i)) / FPS;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const IO = Easing.inOut(Easing.cubic);

export type V3 = [number, number, number];
type Key = { t: number; pos: V3; look: V3; fov?: number };
type Seg = { t0: number; t1: number; keys: Key[] };
const K = (t: number, pos: V3, look: V3, fov = 40): Key => ({ t, pos, look, fov });
const one = (D: number, keys: Key[]): Seg[] => [{ t0: 0, t1: D, keys }];

/** extra HARD CUTS inside a scene (seconds from the scene start): more shots, Rick-Clips-like rhythm. Shared with the audio script (whoosh + hit on every cut). */
export const CUTS: number[][] = CUTS_JSON;
type P = [number, number, number];
/** one shot = a camera move from (pos,look) to (pos,look) with an optional fov; shots of a scene are listed in order, the first starts at t = 0 */
type Shot = [P, P, P, P, number?];
const SH = (p0: P, l0: P, p1: P, l1: P, fov = 40): Shot => [p0, l0, p1, l1, fov];
const SHOTS: Shot[][] = [
  /* 1  bedroom night            */ [SH([2.6, 2.6, 8.6], [-0.4, 1.1, -0.6], [1.3, 2.2, 7.0], [-0.6, 1.2, -0.4]), SH([3.0, 1.4, 4.2], [-0.6, 1.2, 0.0], [1.6, 1.5, 3.6], [-0.9, 1.25, 0.1], 38)],
  /* 2  face + eye bags          */ [SH([-0.2, 2.3, 5.8], [-1.35, 1.3, -0.1], [-0.8, 2.0, 4.6], [-1.35, 1.3, -0.1])],
  /* 3  phone close-up           */ [SH([0.4, 2.7, 5.2], [-1.2, 1.6, 0.2], [-0.4, 2.3, 4.2], [-1.3, 1.55, 0.2]), SH([-0.3, 2.4, 3.2], [-0.9, 1.7, 0.3], [-0.7, 2.2, 2.7], [-1.0, 1.65, 0.3], 34)],
  /* 4  dawn, wakes up           */ [SH([1.6, 2.2, 5.0], [-0.5, 1.6, -0.2], [0.8, 2.0, 4.0], [-0.5, 1.6, -0.2]), SH([-0.1, 2.0, 3.2], [-0.45, 1.7, -0.1], [-0.3, 1.9, 2.6], [-0.45, 1.7, -0.1], 36)],
  /* 5  robbers leap out         */ [SH([1.6, 2.3, 4.6], [3.0, 1.8, -2.4], [3.0, 2.1, 3.8], [3.6, 1.9, -3.2], 44), SH([3.6, 1.0, 2.2], [3.6, 2.1, -3.2], [3.6, 1.4, 1.6], [3.6, 2.0, -4.0], 52)],
  /* 6  the pink float           */ [SH([1.0, 1.9, 5.6], [0.1, 1.2, 0.4], [0.2, 1.55, 4.2], [0.1, 1.1, 0.4])],
  /* 7  control room             */ [SH([-3.0, 2.6, 8.0], [0.6, 1.7, -1.0], [0.2, 2.2, 6.4], [1.1, 1.7, -1.0]), SH([-4.8, 3.9, 3.4], [-4.6, 2.0, -3.6], [-4.4, 3.6, 2.6], [-4.6, 2.0, -3.6], 50), SH([5.8, 2.0, 6.5], [3.9, 1.4, -0.5], [5.0, 1.9, 5.5], [3.9, 1.4, -0.5], 42)],
  /* 8  Cortisol takes megaphone */ [SH([1.2, 1.5, 5.6], [-0.9, 1.5, 0], [0.2, 1.8, 4.1], [-0.9, 1.65, 0]), SH([-0.1, 1.9, 2.6], [-0.9, 1.7, 0], [-0.4, 1.85, 2.2], [-0.9, 1.7, 0], 34)],
  /* 9  state of emergency       */ [SH([-0.2, 1.3, 5.4], [-0.8, 1.7, 0], [-1.8, 1.9, 4.3], [-0.8, 1.8, 0]), SH([-0.5, 0.5, 3.6], [-0.9, 1.9, 0], [-0.9, 0.6, 3.0], [-0.9, 1.9, 0], 46)],
  /* 10 to survive the night     */ [SH([-2.6, 2.2, 9.0], [-0.2, 1.4, 0], [0.2, 2.0, 7.8], [0.6, 1.4, 0])],
  /* 11 ignores the fat barrels  */ [SH([-0.2, 2.2, 8.4], [-1.8, 1.3, -0.4], [-1.2, 1.9, 7.2], [-2.0, 1.3, -0.4]), SH([-2.4, 1.6, 4.6], [-0.6, 1.6, 0.4], [-1.2, 1.6, 4.2], [-0.6, 1.6, 0.4], 40)],
  /* 12 crew carries the sofa    */ [SH([-1.8, 2.0, 9.4], [-0.6, 1.2, 0], [-0.4, 1.9, 9.0], [0.6, 1.2, 0]), SH([1.0, 1.5, 7.6], [0.75, 1.2, -0.4], [0.7, 1.5, 7.2], [0.85, 1.2, -0.4], 44), SH([2.2, 1.6, 8.0], [1.9, 1.4, -0.3], [2.0, 1.6, 7.4], [2.0, 1.4, -0.3], 44)],
  /* 13 into the furnace         */ [SH([1.4, 2.3, 10.2], [2.4, 1.5, -0.2], [1.9, 2.2, 9.8], [2.5, 1.5, -0.2], 46), SH([2.8, 1.5, 5.8], [3.2, 1.7, -0.3], [3.2, 1.6, 5.2], [3.2, 1.7, -0.3], 42), SH([0.9, 1.9, 3.4], [0.0, 1.7, 0.6], [0.6, 1.9, 3.0], [0.0, 1.7, 0.6], 34)],
  /* 14 60 % chart               */ [SH([0.4, 3.0, 13.0], [0, 3.1, 0], [0.0, 2.9, 12.4], [0, 3.1, 0]), SH([-0.1, 2.3, 10.0], [0.0, 2.4, -0.6], [0.1, 2.4, 9.2], [0.0, 2.4, -0.6], 42), SH([0.2, 3.2, 14.0], [0, 3.1, 0], [0.0, 3.0, 12.5], [0, 3.1, 0])],
  /* 15 phone out the window     */ [SH([0.4, 2.2, 7.6], [1.5, 1.8, -1.0], [0.8, 2.2, 7.2], [1.7, 1.9, -1.2]), SH([3.0, 2.2, 0.6], [3.8, 1.5, -7.0], [3.5, 2.0, -0.4], [3.8, 1.5, -7.0], 40)],
  /* 16 sleeping with a nightcap */ [SH([0.2, 2.3, 5.0], [-0.9, 1.2, -0.3], [0.8, 2.5, 6.2], [-0.8, 1.2, -0.3]), SH([-0.5, 1.8, 3.8], [-1.4, 1.3, -0.2], [-0.8, 1.7, 3.4], [-1.45, 1.3, -0.2], 38), SH([1.4, 2.8, 7.6], [-0.5, 1.2, -0.3], [2.4, 3.2, 9.4], [-0.5, 1.2, -0.3])],
];
const DUR = TL.starts.map((s, i) => (i + 1 < TL.starts.length ? TL.starts[i + 1] : TL.duration) - s);
/** index 0..15 = scenes 1..16 (each shot = one Seg: its own Easing.inOut(cubic) warp, so the camera moves in 100 % of the frames) */
export const CAMS: Seg[][] = SHOTS.map((shots, i) => shots.map((sh, j) => {
  const t0 = j === 0 ? 0 : CUTS[i][j - 1], t1 = j + 1 < shots.length ? CUTS[i][j] : DUR[i] + 0.5;
  return { t0, t1, keys: [K(0, sh[0], sh[1], sh[4] ?? 40), K(1, sh[2], sh[3], sh[4] ?? 40)] };
}));
const cr = (p0: number, p1: number, p2: number, p3: number, u: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
const PAD = 0.3;

/** camera of cam-index `ci` at `ts` seconds into the scene. Moving on 100 % of the frames; time warped with Easing.inOut(Easing.cubic). */
export const camAt = (ci: number, ts: number, Dact?: number) => {
  const segs = CAMS[ci]; let s = segs[0]; for (const q of segs) if (ts >= q.t0) s = q;
  const t1 = s === segs[segs.length - 1] && Dact ? Dact : s.t1;
  const D = t1 - s.t0, t = Math.max(0, Math.min(D, ts - s.t0)), P = PAD * D, e0 = IO(P / (D + 2 * P)), e1 = IO((D + P) / (D + 2 * P));
  const u0 = (IO((t + P) / (D + 2 * P)) - e0) / (e1 - e0), Ks = s.keys, w = u0 * Ks[Ks.length - 1].t;
  let k = 0; for (let j = 0; j < Ks.length - 1; j++) if (w >= Ks[j].t) k = j;
  const A = Ks[Math.max(0, k - 1)], B = Ks[k], C = Ks[Math.min(Ks.length - 1, k + 1)], E = Ks[Math.min(Ks.length - 1, k + 2)];
  const u = C === B ? 0 : clamp01((w - B.t) / Math.max(0.001, C.t - B.t));
  const S = (sel: (q: Key) => V3) => [0, 1, 2].map((d) => cr(sel(A)[d], sel(B)[d], sel(C)[d], sel(E)[d], u)) as V3;
  return { pos: S((q) => q.pos), look: S((q) => q.look), fov: cr(A.fov ?? 40, B.fov ?? 40, C.fov ?? 40, E.fov ?? 40, u) };
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export const wordF = (w: string, nth = 0): number => { const h = (WD.words as { w: string; f: number }[]).filter((x) => norm(x.w) === norm(w)); if (!h[nth]) throw new Error("word not found: " + w); return h[nth].f; };
