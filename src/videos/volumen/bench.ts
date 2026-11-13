// Tito lying on a bench doing a barbell press, seen from the side: a wide card (1300 x 760 design units, floor at y = 740).
// The head keeps the template's front-drawn bean face (it rests on the cushion looking at the camera); the near plate of
// the bar is the big disc over the chest, so the lift reads from any camera angle.
import { Pen, Outfit, Expr, SKIN, headBlob, blobPts, thickAngle, faceFront, lidOf, hatOn, mul } from "../alejandro/toon";

export const BENCH_W = 1300, BENCH_H = 760, BENCH_FLOOR = 740;
export type BenchOpts = { raise: number; expr: Expr; blink?: number; sweat?: number; light: number; seed?: number; plates?: number; shake?: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const benchPress = (p: Pen, o: Outfit, k: BenchOpts) => {
  const { raise, expr, blink = 0, sweat = 0, light, seed = 3, plates = 2, shake = 0 } = k;
  const skin = o.skin ?? SKIN, thick = thickAngle(light), H = headBlob(seed, 118, 0), W = 2 * H.a, u = W / 100, ow = 5 * u;
  const SH = [0.64, 0.66, 0.74] as [number, number, number];
  // bench: legs, rails, cushion
  for (const x of [380, 840]) p.poly([[x, 505], [x + 34, 505], [x + 34, BENCH_FLOOR], [x, BENCH_FLOOR]], "#8d949c", 7);
  p.poly([[330, 478], [930, 478], [940, 508], [320, 508]], "#2b3a55", 8);
  // legs (feet planted on the floor), far leg a touch behind
  const pants = mul(o.pants, [0.7, 0.7, 0.8]);
  p.line([[880, 448], [1000, 352], [1050, 722]], mul(o.pants, [0.75, 0.75, 0.85]), 15);
  p.line([[1050, 722], [1086, 724]], o.boots, 19);
  p.line([[858, 452], [972, 340], [1012, 722]], pants, 15);
  p.line([[1012, 722], [1048, 724]], o.boots, 19);
  // torso
  const T = { a: 205, b: 54, nTop: 2.4, nBot: 2.6, egg: 0, asym: 0, rot: 0, noise: 0.006, seed: seed + 7 };
  const tp = blobPts(650, 428, T);
  p.gradFill(tp, o.jacket, mul(o.jacket, SH), light);
  p.inkRing(tp, ow, thick);
  // arms to the bar (behind the plate), then the plate
  const hx = 560 + shake, hy = lerp(362, 142, raise), S: [number, number] = [575, 414];
  const E: [number, number] = [hx - 46 * (1 - raise) - 8, (S[1] + hy) / 2 + 10 * (1 - raise)];
  p.line([S, E, [hx, hy]], skin, 15);
  const R = 102;
  for (let i = Math.max(0, Math.round(plates) - 1); i >= 1; i--) p.ell(hx + 14 * i, hy - 4 * i, R, R, "#1f232c", 8); // stacked plates peek out behind
  p.ell(hx, hy, R, R, "#2f3340", 9);
  p.ell(hx, hy, 66, 66, "#c0353a", 6);
  p.ell(hx, hy, 18, 18, "#c9ccd2", 4);
  p.dot(hx - 54, hy + 6, 16, skin); p.dot(hx - 54, hy + 6, 12, skin); // a fist on the grip, in front of the plate edge
  // head resting on the cushion, looking at the camera
  const cx = 385, hc = 392;
  const hp = blobPts(cx, hc, H);
  p.shadedFill(hp, skin, mul(skin, [0.96, 0.86, 0.84]), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, cx, hc, light, seed, 0, false);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  faceFront(p, cx, hc, W, expr, 0, 0, lidOf(blink), brim, skin, o.moustache, false);
  for (let i = 0; i < Math.ceil(Math.max(0, Math.min(1, sweat)) * 3); i++) {
    const sx = [-1, 1, -1][i], x = cx + sx * (0.95 + 0.12 * i) * H.a, y = hc - (0.25 - 0.45 * i) * H.b;
    p.poly([[x, y - 11 * u], [x + 5.5 * u, y + 2 * u], [x, y + 8 * u], [x - 5.5 * u, y + 2 * u]], "#8fd3ff", 1.6 * u);
  }
};
