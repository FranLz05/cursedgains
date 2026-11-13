// "Volumen basura" (35.8 s), timed to public/voz/voz.wav (palabras.json). Same camera grammar as the Alexander short:
// the camera never stops, moves are smootherstep glides, a change of place is a 6-frame crossfade.
import MAP from "./mapa_tiempos.json";
export const FPS = 30;
export const OLD_TOTAL = 1075;      // the authored timeline (frames); the narration re-times it through MAP
export const TOTAL: number = MAP.total;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const smoother = (x: number) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };

// words (frames): Entrenas 0 · doble 14 · creces 24 · Esa 45 · veinte 71 · series 78 · Mira 88 · Tito 96 · Cada 104 ·
// veinte 129 · series 138 · pecho 151 · sesión 180 · convencido 192 · mejor 218 · Y 228 · Las primeras 256 · series 270 ·
// encienden 277 · La tercera suma 308-320 · La sexta suma 329-340 · Pero cada serie extra 351 · anterior 390 ·
// Serie doce 402 · quince 419 · veinte 438 · Tito ya no empuja 456 · repeticiones 505 · Por suerte 525 · el músculo 540 ·
// Por desgracia 571 · tampoco crece 590 · doble 606 · Fíjate 619 · vaso 650 · Las primeras series lo llenan 659-682 ·
// Las siguientes solo derraman agua 692-720 · piso 731 · derrame 748 · fatiga 765 · La ciencia 776 · doce a veinte 796-806 ·
// por semana 820 · repartidas 836 · varios días 855-863 · Mismas series 870 · aprovechadas 902 · Tito 921 · repartió 931 ·
// entrenó menos horas 970-1000 · camiseta 1033 · quedó chica 1056-1065

type Key = { f: number; pos: V3; look: V3; fov: number; glide?: boolean };
export type ShotDef = { id: number; a: number; b: number; keys: Key[]; fog: [number, number] };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 96, fog: [16, 95], keys: [ // hook: Tito face on with the bar, then past him to the two plate towers (10 vs 20)
    { f: 0, pos: [-0.3, 1.0, 3.4], look: [-0.35, 0.95, 0], fov: 42 },
    { f: 44, pos: [-0.2, 1.0, 3.1], look: [-0.35, 0.95, 0], fov: 42 },
    { f: 96, pos: [-4.2, 1.9, 2.6], look: [2.4, 1.4, -4], fov: 48, glide: true },
  ] },
  { id: 2, a: 88, b: 226, fog: [16, 95], keys: [ // the gym, Monday, twenty sets in one session
    { f: 88, pos: [-8, 3.4, 9.5], look: [0.5, 1.0, -2], fov: 52 },
    { f: 150, pos: [-6, 2.8, 8], look: [0.3, 1.0, -1], fov: 50, glide: true },
    { f: 226, pos: [-3.2, 1.8, 5.8], look: [0, 0.9, 0], fov: 46, glide: true },
  ] },
  { id: 3, a: 218, b: 404, fog: [16, 95], keys: [ // an orbit while every set still counts
    { f: 218, pos: [3.8, 1.2, 5.2], look: [0, 0.95, 0], fov: 46 },
    { f: 300, pos: [-0.5, 1.2, 5.4], look: [0, 0.95, 0], fov: 46, glide: true },
    { f: 404, pos: [-3.8, 1.1, 4.0], look: [0.1, 0.95, 0], fov: 44, glide: true },
  ] },
  { id: 4, a: 396, b: 524, fog: [16, 95], keys: [ // low and close: set 12, 15, 20, the bar slows down
    { f: 396, pos: [-0.1, 0.7, 3.4], look: [-0.45, 0.9, 0], fov: 42 },
    { f: 440, pos: [-0.55, 0.8, 2.5], look: [-0.6, 0.86, 0], fov: 36, glide: true },
    { f: 524, pos: [-1.0, 0.95, 1.55], look: [-0.6, 0.82, 0], fov: 30, glide: true },
  ] },
  { id: 5, a: 516, b: 620, fog: [16, 95], keys: [ // "luckily the muscle stays, unluckily it does not double" - then the camera slides to the glass
    { f: 516, pos: [2.2, 1.4, 5.0], look: [0, 1.7, 0], fov: 40 },
    { f: 566, pos: [0.4, 1.5, 4.4], look: [0, 1.7, 0], fov: 38, glide: true },
    { f: 620, pos: [1.8, 1.4, 6.6], look: [2.6, 1.4, -0.6], fov: 46, glide: true },
  ] },
  { id: 6, a: 612, b: 772, fog: [16, 95], keys: [ // the glass: it fills, then everything else spills on the floor (the pan never stops)
    { f: 612, pos: [1.7, 1.4, 6.6], look: [2.5, 1.4, -0.6], fov: 46 },
    { f: 700, pos: [3.4, 1.2, 7.6], look: [3.9, 1.4, -0.8], fov: 46, glide: true },
    { f: 772, pos: [6.2, 0.9, 6.0], look: [4.7, 0.9, -0.3], fov: 44, glide: true },
  ] },
  { id: 7, a: 766, b: 920, fog: [16, 95], keys: [ // the same sets split over five days
    { f: 766, pos: [-9.5, 1.6, 5.5], look: [-4.5, 1.5, 0], fov: 42 },
    { f: 840, pos: [0, 1.6, 6.2], look: [0, 1.5, 0], fov: 42, glide: true },
    { f: 920, pos: [9.5, 1.6, 5.5], look: [4.5, 1.5, 0], fov: 42, glide: true },
  ] },
  { id: 8, a: 912, b: OLD_TOTAL, fog: [16, 95], keys: [ // payoff: Tito, and the shirt gets small
    { f: 912, pos: [0.3, 1.2, 7.0], look: [0, 1.0, 0], fov: 40 },
    { f: 1000, pos: [0.15, 1.3, 4.6], look: [0, 1.2, 0], fov: 40, glide: true },
    { f: OLD_TOTAL, pos: [0.1, 1.7, 3.7], look: [0, 1.75, 0], fov: 36, glide: true },
  ] },
];
export const XFADE = 6;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ZOOM = [0, 0.05, 0.08, 0.09, 0.07, 0.06, 0, 0.05, 0.04];
const zoomK = (id: number, f: number) => { const S = SHOTS[id - 1]; return 1 - ZOOM[id] * smooth((f - S.a) / (S.b - S.a)); };
const drift = (c: { pos: V3; look: V3; fov: number }, id: number, f: number) => ({ // the camera never stands still
  pos: [c.pos[0] + 0.06 * Math.sin(f * 0.043 + id), c.pos[1] + 0.03 * Math.sin(f * 0.031 + 2 * id), c.pos[2] + 0.04 * Math.sin(f * 0.027 + id)] as V3,
  look: [c.look[0] + 0.04 * Math.sin(f * 0.05 + id), c.look[1], c.look[2]] as V3, fov: c.fov * zoomK(id, f) });
export const camAt = (id: number, f: number) => drift(camAt0(id, f), id, f);
const camAt0 = (id: number, f: number) => {
  const k = SHOTS[id - 1].keys;
  if (f <= k[0].f) return { pos: k[0].pos, look: k[0].look, fov: k[0].fov };
  for (let i = 1; i < k.length; i++) if (f <= k[i].f) {
    const u = (f - k[i - 1].f) / (k[i].f - k[i - 1].f), t = k[i].glide ? smoother(u) : u;
    return { pos: lerp3(k[i - 1].pos, k[i].pos, t), look: lerp3(k[i - 1].look, k[i].look, t), fov: lerp(k[i - 1].fov, k[i].fov, t) };
  }
  const l = k[k.length - 1];
  return { pos: l.pos, look: l.look, fov: l.fov };
};

export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (let i = SHOTS.length - 1; i > 0; i--) {
    const a = SHOTS[i].a;
    if (f >= a + XFADE) return [{ id: i + 1, alpha: 1 }];
    if (f >= a) return [{ id: i, alpha: 1 }, { id: i + 1, alpha: (f - a + 1) / (XFADE + 1) }];
  }
  return [{ id: 1, alpha: 1 }];
};

// ---- slow motion on "serie veinte" (world clock at 30 %) ----
const SLOW = { in0: 436, in1: 444, out0: 470, out1: 482, rate: 0.3 };
const rateAt = (f: number) => 1 - (1 - SLOW.rate) * (smooth((f - SLOW.in0) / (SLOW.in1 - SLOW.in0)) - smooth((f - SLOW.out0) / (SLOW.out1 - SLOW.out0)));
const WF = (() => { const a = [0]; for (let f = 1; f <= OLD_TOTAL + 2; f++) a.push(a[f - 1] + rateAt(f - 0.5)); return a; })();
export const worldF = (f: number) => { const i = Math.max(0, Math.min(OLD_TOTAL + 1, Math.floor(f))); return WF[i] + (WF[i + 1] - WF[i]) * (f - i); };

// ---- Tito's reps: steady until set 12, then slower, shorter, shakier ----
const fatigue = (fw: number) => smooth((fw - 400) / 110);
const period = (fw: number) => 36 + 46 * fatigue(fw);
const PH = (() => { const a = [0]; for (let f = 1; f <= OLD_TOTAL + 2; f++) a.push(a[f - 1] + 1 / period(f - 0.5)); return a; })();
const phase = (fw: number) => { const i = Math.max(0, Math.min(OLD_TOTAL + 1, Math.floor(fw))); return PH[i] + (PH[i + 1] - PH[i]) * (fw - i); };
export const TITO_LIFT = (fw: number) => {
  const u = fatigue(fw), amp = 1 - 0.75 * u, cyc = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase(fw));
  return {
    raise: Math.round((amp * cyc + (1 - amp) * 0.06) * 24) / 24,
    tilt: Math.round(u * 7 * Math.sin(fw * 0.85)) / 2,
    sweat: Math.round(u * 3) / 3,
    expr: (fw < 402 ? "dots" : fw < 438 ? "effort" : "dazed") as "dots" | "effort" | "dazed", // sets 1-11: two dots; 12-15: frown, open mouth; 20: spiral eyes
  };
};

/** discreet number at the top of the frame (never a box, never over the character) */
export const MARKS = [
  { a: 12, b: 52, label: "×2", sub: "", col: "#EF4444" },
  { a: 122, b: 206, label: "20", sub: "SETS", col: "#EF4444" },
  { a: 402, b: 418, label: "12", sub: "", col: "#22C55E" },
  { a: 419, b: 437, label: "15", sub: "", col: "#EF4444" },
  { a: 438, b: 500, label: "20", sub: "", col: "#EF4444" },
  { a: 796, b: 872, label: "10–20", sub: "SETS / WEEK", col: "#22C55E" },
];

/** thin-lens depth of field: cInf = blur at infinity (px at 1080p) */
export const dofAt = (id: number, f: number): { cInf: number; focus?: V3 } => {
  if (id === 1) return { cInf: f < 50 ? 17 : lerp(17, 12, smooth((f - 50) / 40)), focus: [-0.4, 0.95, 0] };
  if (id === 2) return { cInf: 14, focus: [0, 0.95, 0] };
  if (id === 3) return { cInf: 17, focus: [0, 0.95, 0] };
  if (id === 4) return { cInf: 20, focus: [-0.6, 0.82, 0] };
  if (id === 5) return { cInf: 15, focus: [lerp(0, 4.2, smooth((f - 566) / 54)), 1.5, lerp(0, -1.0, smooth((f - 566) / 54))] };
  if (id === 6) return { cInf: 14, focus: [4.2, 1.4, -1.0] };
  if (id === 7) return { cInf: 11 };
  return { cInf: lerp(15, 20, smooth((f - 912) / 120)), focus: [0, lerp(1.0, 1.75, smooth((f - 1020) / 40)), 0] };
};

/** glass level 0..1 and puddle radius (shot 6) */
export const glassLevel = (f: number) => smooth((f - 622) / 66);
export const puddleR = (f: number) => (f < 700 ? 0 : 1.25 + 2.7 * smooth((f - 700) / 95));

// ---- time map: output frame (narration) -> authored frame ----
const AN = MAP.anchors as [number, number][];
export const toOld = (fn: number) => {
  if (fn <= AN[0][1]) return AN[0][0] + (fn - AN[0][1]);
  for (let i = 1; i < AN.length; i++) if (fn <= AN[i][1]) return lerp(AN[i - 1][0], AN[i][0], (fn - AN[i - 1][1]) / (AN[i][1] - AN[i - 1][1]));
  return OLD_TOTAL;
};
/** water pouring over the rim ("the rest just spill water on the floor") */
export const glassOver = (f: number) => smooth((f - 698) / 18);
