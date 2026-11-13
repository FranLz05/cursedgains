// "The Spot Reduction Myth" (PumpParadox, Short 4): 5 scenes locked to the narration (escenas.json / palabras.json written by
// volumen-basura/audio/generar_voz_soplete.py). Frantic editing: every 3D scene is a chain of hard-cut sub-shots (`cut: true` keys),
// each one with its own slow push-in, plus a 2-frame white flash on every cut (see Soplete.tsx).
//  1 torture chamber: 10,000 crunches + robotic arm blowtorch (3D) · 2 X-ray: muscle shouts at deaf fat (SVG) · 3 systemic fat loss diagram (SVG)
//  4 the body-fat pool drains evenly (3D) · 5 back in the chamber: question-mark spine + safety-inspector pigeon (3D)
import ES from "./escenas.json";
import WD from "./palabras.json";
export const FPS = 30;
export const TOTAL: number = ES.total;
export type V3 = [number, number, number];
const ST = ES.scenes as number[];
export const SENT = ES.sentences as number[];                   // first frame of each of the 10 sentences
export const sceneStart = (i: number) => ST[i];                  // i = 0..4
export const sceneEnd = (i: number) => (i < ST.length - 1 ? ST[i + 1] : TOTAL);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const smoother = (x: number) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };
export const sceneOf = (f: number) => { let i = 0; for (let k = 0; k < ST.length; k++) if (f >= ST[k]) i = k; return i; };
/** seconds into shot `id` (1..5) at frame f */
export const tsOf = (id: number, f: number) => (f - ST[id - 1]) / FPS;
export const uOf = (id: number, f: number) => clamp01((f - ST[id - 1]) / Math.max(1, sceneEnd(id - 1) - ST[id - 1]));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
/** first frame of the nth spoken occurrence of a word (normalised), absolute composition frame */
export const wordF = (w: string, nth = 0): number => {
  const hits = (WD.words as { w: string; f: number }[]).filter((x) => norm(x.w) === norm(w));
  if (!hits[nth]) throw new Error("word not found: " + w + " #" + nth);
  return hits[nth].f;
};

type Key = { t: number; pos: V3; look: V3; fov: number; glide?: boolean; cut?: boolean };
export type ShotDef = { id: number; keys: Key[]; fog: [number, number] };
const FOG: [number, number] = [14, 70];
export const SHOTS: ShotDef[] = [
  { id: 1, fog: FOG, keys: [                                               // torture chamber: crunch frenzy, ~7 hard cuts
    { t: 0, pos: [1.9, 1.5, 6.4], look: [0.4, 0.85, 0], fov: 46 },
    { t: 1.9, pos: [0.9, 1.15, 5.6], look: [0.1, 0.65, 0], fov: 42, glide: true },
    { t: 2.0, cut: true, pos: [1.0, 0.8, 2.9], look: [-0.05, 0.55, 0], fov: 34 },             // torch tip + belly
    { t: 3.0, cut: true, pos: [-2.3, 0.45, 3.5], look: [-0.35, 0.55, 0], fov: 38 },          // low, from Tito's head side
    { t: 4.3, cut: true, pos: [0.3, 2.0, 4.2], look: [0, 0.4, 0], fov: 40 },                 // high angle
    { t: 5.6, cut: true, pos: [-1.0, 0.85, 2.4], look: [-0.78, 0.55, 0], fov: 32 },          // face
    { t: 6.8, cut: true, pos: [3.0, 1.3, 5.0], look: [0.8, 1.2, 0], fov: 40 },               // the robot arm
    { t: 8.2, cut: true, pos: [0.0, 1.15, 5.6], look: [0, 0.7, 0], fov: 46 },
    { t: 12.0, pos: [0.1, 0.95, 4.0], look: [0, 0.62, 0], fov: 38, glide: true },
  ] },
  { id: 2, fog: FOG, keys: [{ t: 0, pos: [0, 1.5, 6], look: [0, 1, 0], fov: 40 }] },     // diagram (SVG): no 3D camera
  { id: 3, fog: FOG, keys: [{ t: 0, pos: [0, 1.5, 6], look: [0, 1, 0], fov: 40 }] },     // diagram (SVG): no 3D camera
  { id: 4, fog: [18, 90], keys: [                                           // the fat pool (Tito scoops at the right-hand end, the drain is on his left)
    { t: 0, pos: [-1.0, 3.0, 9.6], look: [0, 0.5, 0], fov: 46 },
    { t: 1.15, pos: [-0.6, 2.5, 8.3], look: [0.1, 0.5, 0], fov: 46, glide: true },
    { t: 1.2, cut: true, pos: [0.6, 1.3, 5.4], look: [1.75, 0.9, -0.3], fov: 40 },           // Tito + bucket
    { t: 3.3, cut: true, pos: [-0.6, 0.55, 4.4], look: [0.4, 0.4, -0.6], fov: 44 },          // low side: level + drain
    { t: 5.2, cut: true, pos: [1.25, 0.85, 2.5], look: [1.95, 0.75, -0.4], fov: 36 },            // tiny bucket close-up
    { t: 6.4, cut: true, pos: [0.3, 2.6, 9.0], look: [0.3, 0.4, 0], fov: 46 },
    { t: 7.9, pos: [0.5, 2.8, 9.8], look: [0.3, 0.4, 0], fov: 46, glide: true },
  ] },
  { id: 5, fog: FOG, keys: [                                               // chamber again: question mark + pigeon
    { t: 0, pos: [0.3, 1.5, 9.0], look: [-0.1, 1.0, 0], fov: 46 },
    { t: 2.6, glide: true, pos: [0.2, 1.4, 8.2], look: [-0.2, 1.0, 0], fov: 44 },
    { t: 2.7, cut: true, pos: [-0.5, 1.1, 3.9], look: [-1.4, 1.0, 0], fov: 36 },
    { t: 5.2, cut: true, pos: [0.2, 1.4, 9.0], look: [0.0, 1.0, 0], fov: 46 },
    { t: 8.4, glide: true, pos: [0.3, 1.3, 8.2], look: [0.2, 1.0, 0], fov: 44 },
    { t: 8.6, cut: true, pos: [1.1, 1.2, 7.2], look: [1.15, 1.05, 0], fov: 40 },
    { t: 12.6, glide: true, pos: [1.1, 1.15, 6.6], look: [1.15, 1.08, 0], fov: 39 },
  ] },
];
export const XFADE = 6;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** sub-shot (segment between hard cuts) the time ts belongs to: [start, end] in seconds */
const subShot = (id: number, ts: number): [number, number] => {
  const k = SHOTS[id - 1].keys; let a = 0, b = (sceneEnd(id - 1) - ST[id - 1]) / FPS + 1;
  for (const q of k) if (q.cut) { if (q.t <= ts) a = q.t; else { b = q.t; break; } }
  return [a, b];
};
export const cutFrames = (id: number): number[] => SHOTS[id - 1].keys.filter((q) => q.cut).map((q) => ST[id - 1] + Math.round(q.t * FPS));
const camAt0 = (id: number, ts: number) => {
  const k = SHOTS[id - 1].keys;
  if (ts <= k[0].t) return { pos: k[0].pos, look: k[0].look, fov: k[0].fov };
  for (let i = 1; i < k.length; i++) if (ts <= k[i].t) {
    if (k[i].cut) return { pos: k[i - 1].pos, look: k[i - 1].look, fov: k[i - 1].fov };       // hold the previous framing until the cut
    const w = (ts - k[i - 1].t) / (k[i].t - k[i - 1].t), t = k[i].glide ? smoother(w) : w;
    return { pos: lerp3(k[i - 1].pos, k[i].pos, t), look: lerp3(k[i - 1].look, k[i].look, t), fov: lerp(k[i - 1].fov, k[i].fov, t) };
  }
  const l = k[k.length - 1]; return { pos: l.pos, look: l.look, fov: l.fov };
};
/** the camera never stands still: every sub-shot has its own eased push-in (fov -9 %) and a tiny drift */
export const camAt = (id: number, f: number) => {
  const ts = tsOf(id, f), c = camAt0(id, ts), [a, b] = subShot(id, ts), u = clamp01((ts - a) / Math.max(0.3, b - a));
  return {
    pos: [c.pos[0] + 0.05 * Math.sin(f * 0.043 + id), c.pos[1] + 0.03 * Math.sin(f * 0.031 + 2 * id), c.pos[2] + 0.04 * Math.sin(f * 0.027 + id)] as V3,
    look: [c.look[0] + 0.03 * Math.sin(f * 0.05 + id), c.look[1], c.look[2]] as V3, fov: c.fov * (1 - 0.09 * smooth(u)),
  };
};

/** shots on screen at frame f: each scene crossfades over the previous one for XFADE frames */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  const i = sceneOf(f);
  if (i > 0 && f < ST[i] + XFADE) return [{ id: i, alpha: 1 }, { id: i + 1, alpha: (f - ST[i] + 1) / (XFADE + 1) }];
  return [{ id: i + 1, alpha: 1 }];
};

/** thin-lens depth of field: background soft, subject sharp */
export const dofAt = (id: number, f: number): { cInf: number; focus?: V3 } => {
  const c = camAt(id, f);
  return { cInf: id === 4 ? 9 : 11, focus: c.look };
};

// ---------------------------------------------------------------- shared constants
/** scene 1: crunch cycle (seconds per rep) and the counter */
export const REP_S = 0.2;
