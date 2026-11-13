// "The Spot Reduction Myth" (PumpParadox, Short 4). Same camera system as ventana/story.ts: one smooth shot per scene (keys are fractions u of the scene),
// always close to frontal so the fixed-yaw cards read as planted on the 3D floor. Scene boundaries come from the narration (escenas.json / palabras.json
// from volumen-basura/audio/generar_voz_spot.py). Scene changes are HARD CUTS (no crossfades).
//  1 3D gym: crunches + robotic laser arm · 2 SVG diagram of the abdomen (no 3D) · 3 gym treadmill · 4 3D fat pool · 5 gym floor: Tito + the pigeon
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
/** event times in seconds into their scene */
export const T4_TINY = () => (wordF("tiny") - 3 - ST[3]) / FPS;
export const T4_DRAIN = () => (wordF("deficit", 1) - 4 - ST[3]) / FPS;
export const T3_ON = () => (wordF("deficit", 0) - 6 - ST[2]) / FPS;

// Hard-cut shot lists live in shots.json (shared with the audio script: a whoosh + hit lands on every cut).
type Shot = { t: number; pos: V3; look: V3; fov: number; roll?: number };
export type ShotDef = { id: number; shots: Shot[]; fog: [number, number] };
const FOG: [number, number] = [16, 95];
export const SHOTS: ShotDef[] = [
  { id: 1, fog: FOG, shots: SH.s1 as Shot[] },
  { id: 2, fog: FOG, shots: SH.s2 as Shot[] },
  { id: 3, fog: FOG, shots: SH.s3 as Shot[] },
  { id: 4, fog: [18, 90], shots: SH.s4 as Shot[] },
  { id: 5, fog: FOG, shots: SH.s5 as Shot[] },
];
export const DIAGRAM_VIEWS = SH.diagram as { t: number; s: number; cy: number }[];
/** absolute frames of every hard cut inside scene `id` (the scene start itself is a cut too) */
export const cutFrames = (id: number): number[] => SHOTS[id - 1].shots.map((q) => ST[id - 1] + Math.round(q.t * FPS));
export const allCuts = (): number[] => [1, 2, 3, 4, 5].flatMap((id) => (id === 2 ? DIAGRAM_VIEWS.map((v) => ST[1] + Math.round(v.t * FPS)) : cutFrames(id)));
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

// ---------------------------------------------------------------- shared constants
export const REP_FRAMES = 6;     // one crunch every 6 frames = 5 reps per second
export const crunchUp = (f: number) => { const q = (v: number) => Math.round(v * 12) / 12; return q(0.5 - 0.5 * Math.cos((2 * Math.PI * (f % REP_FRAMES)) / REP_FRAMES)); };
/** crunch counter: reaches 9,999 when the narrator says "move" */
export const counterAt = (f: number) => {
  const u = clamp01((f - 8) / Math.max(1, wordF("move") - 8)); return Math.min(9999, Math.round(9999 * Math.pow(u, 1.7)));
};
