// "The Anabolic Window Myth" (PumpParadox, Short 3). Scene boundaries come from the narration (escenas.json, written by
// volumen-basura/audio/generar_voz_ventana.py). Camera keys are fractions u (0..1) of each scene.
//  1 panic: last rep + bomb timer (gym) · 2 dry scoop (locker room) · 3 science diagram (SVG, no 3D) · 4 daily protein split · 5 Dr. Pigeon
import ES from "./escenas.json";
export const FPS = 30;
export const TOTAL: number = ES.total;
export type V3 = [number, number, number];
const ST = ES.scenes as number[];
export const SENT = ES.sentences as number[];                   // first frame of each of the 12 sentences
export const sceneStart = (i: number) => ST[i];                  // i = 0..4
export const sceneEnd = (i: number) => (i < ST.length - 1 ? ST[i + 1] : TOTAL);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const smoother = (x: number) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };
export const sceneOf = (f: number) => { let i = 0; for (let k = 0; k < ST.length; k++) if (f >= ST[k]) i = k; return i; };
/** progress 0..1 of shot `id` (1..5) at frame f */
export const uOf = (id: number, f: number) => clamp01((f - ST[id - 1]) / Math.max(1, sceneEnd(id - 1) - ST[id - 1]));

type Key = { u: number; pos: V3; look: V3; fov: number; glide?: boolean };
export type ShotDef = { id: number; keys: Key[]; fog: [number, number] };
const FOG: [number, number] = [16, 95];
// Cameras stay close to frontal (small azimuth) so the fixed-yaw cards read as planted on the 3D floor.
export const SHOTS: ShotDef[] = [
  { id: 1, fog: FOG, keys: [
    { u: 0, pos: [1.5, 1.55, 6.6], look: [0, 1.1, 0], fov: 44 },
    { u: 0.4, pos: [0.5, 1.45, 4.7], look: [0, 1.2, 0], fov: 38, glide: true },
    { u: 1, pos: [0.15, 1.42, 4.5], look: [0, 1.3, 0], fov: 37, glide: true },
  ] },
  { id: 2, fog: FOG, keys: [
    { u: 0, pos: [-1.6, 1.4, 5.8], look: [-0.3, 1.1, 0], fov: 46 },
    { u: 0.5, pos: [0.5, 1.4, 4.6], look: [0, 1.2, 0], fov: 40, glide: true },
    { u: 1, pos: [0.15, 1.45, 4.4], look: [0, 1.3, 0], fov: 37, glide: true },
  ] },
  { id: 3, fog: FOG, keys: [{ u: 0, pos: [0, 1.5, 6], look: [0, 1, 0], fov: 40 }, { u: 1, pos: [0, 1.5, 6], look: [0, 1, 0], fov: 40 }] },   // diagram: no 3D camera
  { id: 4, fog: FOG, keys: [
    { u: 0, pos: [0, 1.7, 7.9], look: [0, 1.1, 0], fov: 46 },
    { u: 1, pos: [0, 1.6, 6.9], look: [0, 1.12, 0], fov: 44, glide: true },
  ] },
  { id: 5, fog: FOG, keys: [
    { u: 0, pos: [0, 1.4, 7.4], look: [0.1, 1.1, 0], fov: 43 },
    { u: 0.55, pos: [0.12, 1.4, 6.6], look: [0.12, 1.12, 0], fov: 41, glide: true },
    { u: 1, pos: [0.14, 1.4, 6.0], look: [0.14, 1.14, 0], fov: 40, glide: true },
  ] },
];
export const XFADE = 8;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ZOOM = [0, 0.04, 0.04, 0, 0.03, 0.04];
const camAt0 = (id: number, f: number) => {
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
    pos: [c.pos[0] + 0.05 * Math.sin(f * 0.043 + id), c.pos[1] + 0.03 * Math.sin(f * 0.031 + 2 * id), c.pos[2] + 0.04 * Math.sin(f * 0.027 + id)] as V3,
    look: [c.look[0] + 0.03 * Math.sin(f * 0.05 + id), c.look[1], c.look[2]] as V3, fov: c.fov * (1 - ZOOM[id] * smooth(u)),
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
  if (id === 4) return { cInf: 10, focus: [0, 1.1, 0] };
  if (id === 5) return { cInf: 13, focus: [0.1, 1.1, 0] };
  return { cInf: 13, focus: [0, 1.2, 0] };
};
