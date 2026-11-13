// "Sweating != Burning Fat" (PumpParadox, Short 2). The scene boundaries come from the narration (escenas.json, written by
// volumen-basura/audio/generar_voz_sudar.py): a scene starts on the first word of its first sentence. Camera keys are given
// as fractions u (0..1) of the scene, so the whole film follows whatever the voice does.
//  1 sauna treadmill · 2 the scale illusion · 3 diagram (SVG, no 3D) · 4 performance paradox (split) · 5 the rebound · 6 payoff
import ES from "./escenas.json";
export const FPS = 30;
export const TOTAL: number = ES.total;
export type V3 = [number, number, number];
const ST = ES.scenes as number[];
export const SENT = ES.sentences as number[];                   // first frame of each of the 11 sentences
export const sceneStart = (i: number) => ST[i];                  // i = 0..5
export const sceneEnd = (i: number) => (i < ST.length - 1 ? ST[i + 1] : TOTAL);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const smoother = (x: number) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };
export const sceneOf = (f: number) => { let i = 0; for (let k = 0; k < ST.length; k++) if (f >= ST[k]) i = k; return i; };
/** progress 0..1 of shot `id` (1..6) at frame f */
export const uOf = (id: number, f: number) => clamp01((f - ST[id - 1]) / Math.max(1, sceneEnd(id - 1) - ST[id - 1]));

type Key = { u: number; pos: V3; look: V3; fov: number; glide?: boolean };
export type ShotDef = { id: number; keys: Key[]; fog: [number, number] };
const FOG: [number, number] = [16, 95];
export const SHOTS: ShotDef[] = [
  { id: 1, fog: FOG, keys: [
    { u: 0, pos: [3.4, 1.7, 7.0], look: [0, 1.1, 0], fov: 44 },
    { u: 0.45, pos: [0.9, 1.5, 4.8], look: [0, 1.25, 0], fov: 38, glide: true },
    { u: 1, pos: [-0.3, 1.45, 3.5], look: [0, 1.35, 0], fov: 32, glide: true },
  ] },
  { id: 2, fog: FOG, keys: [
    { u: 0, pos: [2.0, 1.3, 5.2], look: [0, 1.0, -0.6], fov: 46 },
    { u: 0.5, pos: [0.8, 1.2, 4.0], look: [0, 1.0, 0], fov: 42, glide: true },
    { u: 1, pos: [0, 1.3, 4.0], look: [0, 1.1, 0.3], fov: 40, glide: true },
  ] },
  { id: 3, fog: FOG, keys: [{ u: 0, pos: [0, 1.5, 6], look: [0, 1, 0], fov: 40 }, { u: 1, pos: [0, 1.5, 6], look: [0, 1, 0], fov: 40 }] },   // diagram: no 3D camera
  { id: 4, fog: FOG, keys: [
    { u: 0, pos: [0, 1.6, 8.2], look: [0, 1.1, 0], fov: 50 },
    { u: 1, pos: [0, 1.5, 6.4], look: [0, 1.15, 0], fov: 46, glide: true },
  ] },
  { id: 5, fog: FOG, keys: [
    { u: 0, pos: [1.0, 1.3, 4.6], look: [0, 1.0, -0.2], fov: 42 },
    { u: 1, pos: [0.4, 1.3, 4.9], look: [0.15, 1.1, 0.2], fov: 40, glide: true },
  ] },
  { id: 6, fog: FOG, keys: [
    { u: 0, pos: [2.0, 1.4, 5.8], look: [-0.4, 1.1, 0], fov: 44 },
    { u: 0.55, pos: [1.2, 1.5, 4.4], look: [0.2, 1.3, 0], fov: 38, glide: true },
    { u: 1, pos: [0.7, 1.6, 3.6], look: [0.5, 1.5, 0], fov: 33, glide: true },
  ] },
];
export const XFADE = 8;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ZOOM = [0, 0.05, 0.05, 0, 0.04, 0.05, 0.04];
/** shot 1 is timed in seconds: running in the gym, then at ~3.2 s a fast, fluid zoom-out through the big window (z = 16) that reveals the volcano */
type K1 = { t: number; pos: V3; look: V3; fov: number };
const shot1 = (f: number) => {
  const ts = (f - ST[0]) / FPS, L = (sceneEnd(0) - ST[0]) / FPS;
  const K: K1[] = [
    { t: 0, pos: [3.4, 1.7, 7.0], look: [0, 1.1, 0], fov: 44 },
    { t: 3.1, pos: [0.7, 1.55, 5.6], look: [0, 1.2, 0], fov: 40 },
    { t: 4.85, pos: [0, 3.4, 17.5], look: [0, 1.3, 0], fov: 46 },
    { t: 8.6, pos: [0, 58, 126], look: [0, 8, 0], fov: 52 },
    { t: Math.max(L, 9.5), pos: [0, 52, 116], look: [0, 8, 0], fov: 50 },
  ];
  if (ts <= 0) return { pos: K[0].pos, look: K[0].look, fov: K[0].fov };
  for (let i = 1; i < K.length; i++) if (ts <= K[i].t) {
    const w = (ts - K[i - 1].t) / (K[i].t - K[i - 1].t), q = i === 1 ? w : smoother(w);
    return { pos: lerp3(K[i - 1].pos, K[i].pos, q), look: lerp3(K[i - 1].look, K[i].look, q), fov: lerp(K[i - 1].fov, K[i].fov, q) };
  }
  const l = K[K.length - 1]; return { pos: l.pos, look: l.look, fov: l.fov };
};
const camAt0 = (id: number, f: number) => {
  if (id === 1) return shot1(f);
  const k = SHOTS[id - 1].keys, u = uOf(id, f);
  if (u <= k[0].u) return { pos: k[0].pos, look: k[0].look, fov: k[0].fov };
  for (let i = 1; i < k.length; i++) if (u <= k[i].u) {
    const w = (u - k[i - 1].u) / (k[i].u - k[i - 1].u), t = k[i].glide ? smoother(w) : w;
    return { pos: lerp3(k[i - 1].pos, k[i].pos, t), look: lerp3(k[i - 1].look, k[i].look, t), fov: lerp(k[i - 1].fov, k[i].fov, t) };
  }
  const l = k[k.length - 1]; return { pos: l.pos, look: l.look, fov: l.fov };
};
/** the camera never stands still: eased slow zoom-in over the whole scene + a tiny drift */
export const camAt = (id: number, f: number) => {
  const c = camAt0(id, f), u = uOf(id, f);
  return {
    pos: [c.pos[0] + 0.06 * Math.sin(f * 0.043 + id), c.pos[1] + 0.03 * Math.sin(f * 0.031 + 2 * id), c.pos[2] + 0.04 * Math.sin(f * 0.027 + id)] as V3,
    look: [c.look[0] + 0.04 * Math.sin(f * 0.05 + id), c.look[1], c.look[2]] as V3, fov: c.fov * (1 - ZOOM[id] * smooth(u)),
  };
};

/** shots on screen at frame f: each scene crossfades over the previous one for XFADE frames */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  const i = sceneOf(f);
  if (i > 0 && f < ST[i] + XFADE) return [{ id: i, alpha: 1 }, { id: i + 1, alpha: (f - ST[i] + 1) / (XFADE + 1) }];
  return [{ id: i + 1, alpha: 1 }];
};

/** thin-lens depth of field: background soft, Tito sharp */
export const dofAt = (id: number, _f: number): { cInf: number; focus?: V3 } => {
  if (id === 1) return { cInf: lerp(13, 2.5, smooth(((_f - ST[0]) / FPS - 3.4) / 1.8)), focus: [0, 1.2, 0] };
  if (id === 2) return { cInf: 13, focus: [0, 1.0, 0] };
  if (id === 4) return { cInf: 11, focus: [0, 1.1, 0] };
  if (id === 5) return { cInf: 14, focus: [0, 1.1, 0] };
  return { cInf: 14, focus: [-0.3, 1.3, 0] };
};
