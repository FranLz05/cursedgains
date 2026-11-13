// DOMS short: timeline + camera physics. 16 micro-scenes, HARD CUTS only (no flashes, no fades). Inside every shot the camera never stops:
// Easing.inOut(Easing.cubic) time-warp over a window that starts 30 % of the shot BEFORE the cut and ends 30 % AFTER it (CLAUDE.md), keys joined by a Catmull-Rom spline.
import { Easing } from "remotion";
import TL from "./timeline.json";
import WD from "./palabras.json";

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

/** index 0..14 = scenes 1..15 ; 15 = scene 16 left pane ; 16 = scene 16 right pane */
export const CAMS: Seg[][] = [
  /* 1 legs      */ one(3, [K(0, [1.9, 1.1, 5.0], [-0.4, 1.0, 0]), K(0.5, [1.5, 1.0, 4.5], [-0.4, 0.95, 0]), K(1, [1.1, 0.95, 4.0], [-0.35, 0.9, 0])]),
  /* 2 stairs    */ one(2, [K(0, [2.4, 5.4, 11.4], [1.5, 0.8, 0]), K(1, [2.4, 4.4, 10.0], [1.8, 0.7, 0])]),
  /* 3 dream     */ one(3, [K(0, [0.5, 2.3, 5.0], [0.3, 2.3, 0]), K(0.5, [0.4, 2.2, 4.5], [0.25, 2.25, 0]), K(1, [0.3, 2.15, 4.1], [0.2, 2.2, 0])]),
  /* 4 wheel     */ one(3, [K(0, [1.4, 2.5, 8.4], [0, 2.5, 0]), K(0.5, [0.5, 2.4, 7.7], [0, 2.45, 0]), K(1, [-0.5, 2.3, 7.0], [0, 2.4, 0])]),
  /* 5 court     */ one(3, [K(0, [1.8, 3.2, 5.2], [0.4, 2.8, -1.2]), K(0.5, [1.3, 3.1, 4.7], [0.4, 2.8, -1.2]), K(1, [0.8, 3.0, 4.2], [0.4, 2.8, -1.2])]),
  /* 6 paper     */ one(3, [K(0, [1.0, 1.9, 7.0], [0, 1.2, 0]), K(0.5, [0.6, 1.8, 6.4], [0, 1.2, 0]), K(1, [0.2, 1.7, 5.8], [0, 1.2, 0])]),
  /* 7 leg+tunnel*/ [
    { t0: 0, t1: 0.5, keys: [K(0, [1.0, 1.3, 3.2], [0.07, 0.95, 0]), K(1, [0.2, 0.95, 0.6], [0.07, 0.9, 0], 38)] },
    { t0: 0.5, t1: 2, keys: [K(0, [0, 1.3, 10], [0, 1.3, 0]), K(0.5, [0, 1.3, 3], [0, 1.3, -8]), K(1, [0, 1.3, -6], [0, 1.3, -16])] },
  ],
  /* 8 fire      */ one(3, [K(0, [-2.0, 2.0, 9.0], [-0.2, 1.3, 0], 44), K(0.5, [0, 1.9, 8.2], [0, 1.3, 0], 44), K(1, [2.0, 1.8, 7.4], [0.3, 1.2, 0], 44)]),
  /* 9 ball      */ one(3, [K(0, [3.6, 2.4, 8.6], [0, 2.0, 0]), K(0.5, [2.8, 2.3, 7.8], [0, 2.1, 0]), K(1, [1.8, 2.3, 6.9], [0, 2.2, 0])]),
  /* 10 anvil    */ one(2, [K(0, [2.4, 1.9, 7.4], [0, 1.4, 0]), K(1, [1.0, 1.7, 6.2], [0, 1.2, 0])]),
  /* 11 soreness */ one(2, [K(0, [1.6, 2.8, 11.4], [0, 2.9, 0]), K(1, [0.6, 2.9, 9.6], [0, 2.9, 0])]),
  /* 12 growth   */ one(3, [K(0, [-1.2, 2.9, 11.6], [0, 2.9, 0]), K(0.5, [-0.3, 3.0, 10.6], [0, 2.9, 0]), K(1, [0.6, 3.1, 9.6], [0, 2.9, 0])]),
  /* 13 barbell  */ one(3, [K(0, [-1.6, 2.4, 8.0], [0, 2.7, 0]), K(0.5, [0, 2.6, 7.0], [0, 2.7, 0]), K(1, [1.5, 2.9, 6.0], [0, 2.7, 0])]),
  /* 14 bed      */ one(3, [K(0, [1.4, 3.0, 8.0], [-0.3, 1.1, 0]), K(0.5, [0.4, 2.6, 7.0], [-0.3, 1.1, 0]), K(1, [-0.6, 2.3, 6.0], [-0.4, 1.1, 0])]),
  /* 15 toilet   */ one(3, [K(0, [3.2, 4.0, 7.6], [0.0, 1.1, 0.2]), K(0.5, [2.7, 3.7, 7.0], [0.0, 1.1, 0.2]), K(1, [2.2, 3.4, 6.4], [0.0, 1.1, 0.2])]),
  /* 16 left     */ one(7, [K(0, [0.4, 1.7, 7.4], [0, 1.6, -0.3]), K(0.5, [0.2, 1.65, 7.0], [0, 1.6, -0.3]), K(1, [0, 1.6, 6.6], [0, 1.6, -0.3])]),
  /* 16 right    */ one(7, [K(0, [0.4, 2.0, 9.4], [0, 1.9, 0]), K(0.5, [0.2, 1.9, 6.6], [0, 1.9, 0]), K(1, [0, 1.75, 3.9], [0, 1.85, 0])]),
];
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
