// "The Fasted Cardio Myth" (PumpParadox, Short 5). Cloned from spot/story.ts (itself the ventana/story.ts camera system + hard-cut shot lists).
// Scene boundaries come from the narration (escenas.json / palabras.json from volumen-basura/audio/generar_voz_fasted.py). Scene changes are HARD CUTS.
//  1 dark gym: zombie Tito sprinting (04:59 AM) · 2 gym: two giant energy bars DURING WORKOUT · 3 living room 03:00 PM: the calculator balances the day
//  4 split screen: fasted vs fed Tito, identical scales · 5 gym: Tito flat behind the treadmill + the doctor pigeon with the sign
import ES from "./escenas.json";
import WD from "./palabras.json";
import SH from "./shots.json";
export const FPS = 30;
export const TOTAL: number = ES.total;
export type V3 = [number, number, number];
const ST = ES.scenes as number[];
export const sceneStart = (i: number) => ST[i];                  // i = 0..4
export const sceneEnd = (i: number) => (i < ST.length - 1 ? ST[i + 1] : TOTAL);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const smoother = (x: number) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };
export const sceneOf = (f: number) => { let i = 0; for (let k = 0; k < ST.length; k++) if (f >= ST[k]) i = k; return i; };
/** seconds into shot `id` (1..5) at frame f */
export const tsOf = (id: number, f: number) => (f - ST[id - 1]) / FPS;
/** progress 0..1 of shot `id` (1..5) at frame f */
export const uOf = (id: number, f: number) => clamp01((f - ST[id - 1]) / Math.max(1, sceneEnd(id - 1) - ST[id - 1]));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
export const wordF = (w: string, nth = 0): number => {
  const hits = (WD.words as { w: string; f: number }[]).filter((x) => norm(x.w) === norm(w));
  if (!hits[nth]) throw new Error("word not found: " + w + " #" + nth);
  return hits[nth].f;
};
/** absolute frame of the nth spoken occurrence of a word, plus how many seconds into scene `id` (1..5) it lands */
export const wordTs = (id: number, w: string, nth = 0) => (wordF(w, nth) - ST[id - 1]) / FPS;

// Hard-cut shot lists live in shots.json (shared with the audio script: a whoosh + hit lands on every cut).
type Shot = { t: number; pos: V3; look: V3; fov: number; roll?: number };
export type ShotDef = { id: number; shots: Shot[]; fog: [number, number] };
const FOG: [number, number] = [16, 95];
export const SHOTS: ShotDef[] = [
  { id: 1, fog: FOG, shots: SH.s1 as Shot[] },
  { id: 2, fog: FOG, shots: SH.s2 as Shot[] },
  { id: 3, fog: FOG, shots: SH.s3 as Shot[] },
  { id: 4, fog: FOG, shots: SH.s4 as Shot[] },
  { id: 5, fog: FOG, shots: SH.s5 as Shot[] },
];
/** absolute frames of every hard cut inside scene `id` (the scene start itself is a cut too) */
export const cutFrames = (id: number): number[] => SHOTS[id - 1].shots.map((q) => ST[id - 1] + Math.round(q.t * FPS));
export const allCuts = (): number[] => [1, 2, 3, 4, 5].flatMap((id) => cutFrames(id));
export const BPM = 128;
/** beat phase 0..1 (a kick every beat, from frame 0) */
export const beatPhase = (f: number) => ((f / FPS) * (BPM / 60)) % 1;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** the camera never stands still: inside every shot a slow eased dolly-in (10 %) + a tiny drift, and the fov "punches" on every kick */
export const camAt = (id: number, f: number) => {
  const sh = SHOTS[id - 1].shots, ts = tsOf(id, f);
  let i = 0; for (let k = 0; k < sh.length; k++) if (ts >= sh[k].t) i = k;
  const c = sh[i], end = i + 1 < sh.length ? sh[i + 1].t : (sceneEnd(id - 1) - ST[id - 1]) / FPS + 0.5, u = smoother((ts - c.t) / Math.max(0.3, end - c.t));
  const k = 0.1 * u, bp = beatPhase(f), punch = 0.028 * Math.exp(-bp * 6);
  return {
    pos: [lerp(c.pos[0], c.look[0], k) + 0.04 * Math.sin(f * 0.043 + id), lerp(c.pos[1], c.look[1], k) + 0.03 * Math.sin(f * 0.031 + 2 * id), lerp(c.pos[2], c.look[2], k) + 0.04 * Math.sin(f * 0.027 + id)] as V3,
    look: [c.look[0] + 0.03 * Math.sin(f * 0.05 + id), c.look[1], c.look[2]] as V3, fov: c.fov * (1 - punch), roll: ((c.roll ?? 0) * Math.PI) / 180,
  };
};

/** one shot on screen at any frame: hard cuts only, no crossfades */
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: sceneOf(f) + 1, alpha: 1 }];

/** thin-lens depth of field: background soft, subject sharp */
export const dofAt = (id: number, f: number): { cInf: number; focus?: V3 } => ({ cInf: id === 4 ? 10 : 13, focus: camAt(id, f).look });
