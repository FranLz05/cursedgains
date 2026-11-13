// TitoRig3D — the PumpParadox Tito, STANDARD CHARACTER for every new short (see CLAUDE.md). HYBRID 2.5D, the Rick Clips technique:
// full 3D sets, but the character is a FLAT 2D vector illustration (thick uniform black outline, flat cel shading, noodle limbs, round hands)
// drawn on a Canvas2D card that stands in the 3D world, turns smoothly toward the camera (partial billboard), casts a shadow and has a contact blob.
// The drawing is driven by an INVISIBLE Forward-Kinematics skeleton (Spine / After Effects style cut-out):
//   root -> body (squash & stretch, pivot on the floor) -> pelvis -> spine -> chest -> neck -> head (delayed bounce = secondary motion)
//   chest -> shoulder L/R -> elbow -> hand ; pelvis -> hip L/R -> knee -> ankle
// every frame the joints are projected on the card for the current view (front .. 3/4 .. profile) and the parts are drawn as layers sorted by depth.
// Every pose is a PURE FUNCTION of (action, t): deterministic for Remotion. Gait = phase-shifted sinusoids (torso lean + counter-twist, arms in arcs
// opposite the legs, knees folding on the swing phase, REAL hip height solved so the lowest sole touches the floor + flight phase).
// Official design: public/refs/tito_frente.webp (front / 3-4) + public/refs/tito_espaldas.webp (back). White organic head, asymmetric brown spikes,
// white sweatband with a red stripe, loose red tank top (white armhole trim, open round neck), thin ink limbs, black round hands, white sneakers with a red sole.
// ZERO perfect circles: every shape is an organic Bezier path; warm dark-brown ink (#2A1A14) with variable weight; flat soft cel shading.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { NOINK } from "../videos/alejandro/ink";

export type TitoAction = "idle" | "walk" | "run" | "curl" | "jump" | "hit" | "fall" | "cheer";
export type TitoExpression = "idle" | "effort" | "shocked" | "exhausted" | "smug";
/** optional costume layers drawn on the SAME 2D rig (all off by default = the official Tito; used by the muscle workers and gags of the DOMS short) */
export type TitoOutfit = {
  /** yellow construction hard hat */
  helmet?: boolean;
  /** white curly judge wig (drawn under the helmet) */
  wig?: boolean;
  /** tank-top colour override (hex) */
  shirt?: string;
  /** 0..1 plaster cast on arms + legs and a head bandage */
  cast?: number;
  /** 0..1 right fist with the thumb up */
  thumbs?: number;
  /** hide the noodle legs and the sneakers (scene 1: the legs are wooden logs) */
  noLegs?: boolean;
  /** hide the little dumbbells that the `curl` action draws */
  noBells?: boolean;
  /** black balaclava (robbers): covers hair + face except the eye slit */
  balaclava?: boolean;
  /** black sunglasses (boss) */
  shades?: boolean;
  /** classic striped nightcap with a pom-pom (hangs to one side) */
  nightcap?: boolean;
  /** 0..1 dark eye bags (sleep deprivation) */
  eyeBags?: number;
  /** pink swimming-pool float around the waist (hex colour) */
  floatRing?: string;
  /** 0..1 red megaphone held in the right hand, mouthpiece at the hand, bell pointing away from the head */
  megaphone?: number;
};
/** joint overrides applied on top of the action (Sleep Robbery): carrying a sack, thumbs up, shouting, sitting... */
export type TitoOver = { L?: Partial<Side>; R?: Partial<Side>; lean?: number; lift?: number; squash?: number; headPitch?: number; headRoll?: number; headYaw?: number; chestSide?: number; chestTwist?: number };
export type TitoState = {
  action: TitoAction;
  outfit?: TitoOutfit;
  /** optional joint overrides on top of the action */
  over?: TitoOver;
  /** seconds since the action started (cycles loop by themselves; jump / hit / fall are one-shots) */
  t: number;
  /** cycle speed multiplier (walk / run / curl) */
  speed?: number;
  expression?: TitoExpression;
  /** 0..1 how open the mouth is (drive it from the voice with mouthFromAudio) */
  mouthOpen?: number;
  /** 0..1 eyelids; omit for automatic blinking */
  blink?: number;
  /** 0..1 sweat drops on the face */
  sweat?: number;
  /** 0..1 zombie / exhausted pale-green skin */
  pale?: number;
  /** world placement */
  position?: [number, number, number];
  yaw?: number;
  scale?: number;
  /** move forward while walking / running (metres travelled are returned by update) */
  travel?: boolean;
};

// ---------------------------------------------------------------- palette (same as soplete/titoS.ts)
const SKIN = "#F8EDE2", HAIR = "#5A3B2A", RED = "#E8413F", SHORT = "#2C303B", WHITE = "#FFFFFF", SOLE = "#C0353A", INKC = "#111114", LIMB = "#1E1D24";
const MOUTH = "#4A141C", TONGUE = "#E86E78", SWEAT = "#8FD3FF";

// ---------------------------------------------------------------- skeleton dimensions (metres) — total height ~2.05 m like the card Tito
export const RIG = { HIP: 0.8, SPINE: 0.04, CHEST: 0.34, NECK: 0.02, HEAD_Y: 0.06, HEAD_R: 0.3, SHOULDER_X: 0.165, UPPER: 0.27, FORE: 0.25, HIP_X: 0.075, THIGH: 0.36, SHIN: 0.33, LIMB_R: 0.027 };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const easeIO = (x: number) => { const u = clamp01(x); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** damped oscillation after an event at time t0 (0 before it): the "spring" used for secondary motion and impacts */
const ring = (t: number, t0: number, k = 7, w = 18) => (t < t0 ? 0 : Math.exp(-(t - t0) * k) * Math.cos((t - t0) * w));
const pos = (x: number) => Math.max(0, x);

// ---------------------------------------------------------------- a full pose (all joint angles, radians). Sign conventions:
//  thigh/shoulder "fwd" swings the limb forward; knee bends backward; elbow bends forward; "out" = abduction away from the body.
type Side = { thighFwd: number; thighOut: number; knee: number; ankle: number; shFwd: number; shOut: number; elbow: number; handRot: number };
type Pose = {
  L: Side; R: Side;
  pelvisTwist: number; pelvisTilt: number; lean: number; chestTwist: number; chestSide: number; breath: number;
  neck: number; headPitch: number; headYaw: number; headRoll: number;
  lift: number; ground: boolean; squash: number; travel: number; rootPitch: number; rootLift: number; dumbbells: boolean;
};
const side = (o: Partial<Side> = {}): Side => ({ thighFwd: 0, thighOut: 0.03, knee: 0.05, ankle: 0, shFwd: 0, shOut: 0.12, elbow: 0.15, handRot: 0, ...o });
const base = (): Pose => ({ L: side(), R: side(), pelvisTwist: 0, pelvisTilt: 0, lean: 0, chestTwist: 0, chestSide: 0, breath: 0, neck: 0, headPitch: 0, headYaw: 0, headRoll: 0,
  lift: 0, ground: true, squash: 0, travel: 0, rootPitch: 0, rootLift: 0, dumbbells: false });

/** gait (walk = k 0, run = k 1): phase-offset sinusoids, the right leg leads by half a cycle, each arm opposes its leg */
const gait = (t: number, speed: number, k: number): Pose => {
  const p = base(), f = lerp(0.95, 2.1, k) * speed, ph = 2 * Math.PI * f * t;
  const A = lerp(0.42, 0.85, k), off = lerp(0.02, 0.18, k);
  for (const [s, o] of [["L", 0], ["R", Math.PI]] as const) {
    const q = ph + o, swing = Math.cos(q);                                  // > 0: the leg is swinging forward (recovery phase)
    const S = p[s];
    S.thighFwd = A * Math.sin(q) + off;
    S.knee = lerp(0.12, 0.25, k) + lerp(0.75, 1.55, k) * Math.pow(pos(swing), lerp(1.6, 1.15, k)) + 0.12 * pos(-Math.sin(q));
    S.ankle = -0.25 * Math.sin(q) * lerp(0.6, 1, k) + 0.2 * pos(swing);
    S.shFwd = -lerp(0.38, 0.95, k) * Math.sin(q) + lerp(0.0, 0.1, k);       // arcs opposite to the same-side leg
    S.shOut = lerp(0.1, 0.22, k);
    S.elbow = lerp(0.35, 1.45, k) + lerp(0.15, 0.35, k) * Math.sin(q);     // the forward arm folds more
  }
  p.pelvisTwist = lerp(0.1, 0.16, k) * Math.sin(ph);
  p.pelvisTilt = lerp(0.05, 0.07, k) * Math.sin(ph);
  p.chestTwist = -lerp(0.14, 0.28, k) * Math.sin(ph);                       // counter-twist of the shoulders
  p.lean = lerp(0.05, 0.3, k) + 0.035 * Math.cos(2 * ph);
  p.lift = k * 0.09 * pos(Math.sin(2 * ph - 0.4));                            // flight phase only when running
  // secondary motion: the head lags the hip bounce (two bounces per cycle, ~60 degrees late) and compensates the lean
  p.neck = -p.lean * 0.55; p.headPitch = lerp(0.04, 0.09, k) * Math.cos(2 * ph - 1.1); p.headRoll = 0.04 * Math.sin(ph - 0.7); p.headYaw = -0.5 * p.chestTwist;
  p.squash = -lerp(0.01, 0.035, k) * pos(-Math.cos(2 * ph));
  p.travel = lerp(1.1, 4.2, k) * speed * t;
  return p;
};

const idle = (t: number): Pose => {
  const p = base(), b = Math.sin(t * 2.1), sw = Math.sin(t * 0.7);
  p.breath = 0.018 * b; p.lean = 0.02 * b; p.pelvisTilt = 0.03 * sw; p.chestSide = -0.025 * sw;
  p.L = side({ thighOut: 0.06 + 0.02 * sw, knee: 0.06 + 0.06 * pos(sw), shOut: 0.13, shFwd: 0.04 * Math.sin(t * 2.1 - 0.8), elbow: 0.2 + 0.04 * b });
  p.R = side({ thighOut: 0.06 - 0.02 * sw, knee: 0.06 + 0.06 * pos(-sw), shOut: 0.13, shFwd: 0.04 * Math.sin(t * 2.1 - 1.2), elbow: 0.22 + 0.04 * b });
  p.headPitch = 0.03 * Math.sin(t * 2.1 - 1.0); p.headRoll = 0.04 * Math.sin(t * 0.7 - 0.6); p.headYaw = 0.12 * Math.sin(t * 0.45);
  return p;
};

/** biceps curls with two dumbbells: the right arm lifts (ease in-out), the torso cheats back a little at the top, the head follows late */
const curl = (t: number, speed: number): Pose => {
  const p = idle(t * 0.6), T = 1.8 / speed, u = (t % T) / T;
  const c = u < 0.45 ? easeIO(u / 0.45) : u < 0.55 ? 1 : 1 - easeIO((u - 0.55) / 0.45);
  p.R = side({ thighOut: 0.08, knee: 0.1, shFwd: 0.12 + 0.22 * c, shOut: 0.16, elbow: 0.15 + 2.15 * c, handRot: 0 });
  p.L = side({ thighOut: 0.08, knee: 0.1, shFwd: 0.04, shOut: 0.16, elbow: 0.15 + 0.12 * c });
  p.lean = -0.09 * c + 0.03; p.chestTwist = -0.08 * c; p.headPitch = 0.08 * Math.sin(2 * Math.PI * (u - 0.12)) * 0.5 - 0.05 * c;
  p.squash = -0.02 * c; p.dumbbells = true;
  return p;
};

/** one-shot jump: anticipation crouch, stretch on take-off, tuck in the air, squash on landing, recover */
const JUMP = { crouch: 0.28, take: 0.36, land: 0.96, end: 1.5, H: 0.85 };
const jump = (t: number): Pose => {
  const p = base(), J = JUMP;
  let crouch = 0, air = 0, h = 0, s = 0, arms = 0;
  if (t < J.crouch) { crouch = easeIO(t / J.crouch); s = -0.12 * crouch; arms = -0.6 * crouch; }
  else if (t < J.take) { const u = (t - J.crouch) / (J.take - J.crouch); crouch = 1 - easeOut(u); s = lerp(-0.12, 0.16, easeOut(u)); arms = lerp(-0.6, 2.6, easeOut(u)); }
  else if (t < J.land) { const u = (t - J.take) / (J.land - J.take); air = Math.sin(Math.PI * u); h = J.H * 4 * u * (1 - u); s = 0.16 * (1 - smooth(u * 2)) + 0.04 * smooth(u * 2) * (1 - u); arms = lerp(2.6, 1.2, u); }
  else { const u = (t - J.land) / (J.end - J.land); crouch = Math.max(0, 0.8 * (1 - easeOut(u * 1.3))); s = -0.2 * ring(t, J.land, 6, 20); arms = lerp(1.2, 0, easeOut(u)); }
  for (const S of [p.L, p.R]) { S.thighFwd = 0.75 * crouch + 0.85 * air; S.knee = 1.35 * crouch + 1.4 * air; S.ankle = -0.4 * crouch; S.shFwd = arms; S.shOut = 0.2 + 0.15 * air; S.elbow = 0.3 + 0.4 * air; }
  p.R.thighFwd += 0.15 * air; p.L.knee -= 0.2 * air;
  p.lean = 0.32 * crouch - 0.08 * air; p.neck = -0.25 * crouch; p.headPitch = 0.12 * ring(t, J.land, 5, 14) - 0.1 * ring(t, J.take, 5, 12);
  p.lift = h; p.ground = true; p.squash = s;
  return p;
};

/** one-shot hit: knocked back, the torso whips back and springs, the head snaps late, arms flail, a stumble step */
const hit = (t: number): Pose => {
  const p = base(), r = ring(t, 0, 4.5, 11), e = Math.exp(-t * 3.2);
  p.lean = -0.55 * r; p.neck = -0.35 * ring(t, 0.05, 4, 12); p.headPitch = -0.3 * ring(t, 0.08, 4, 14); p.headRoll = 0.18 * ring(t, 0.06, 4, 9);
  p.L = side({ thighFwd: 0.45 * e, knee: 0.5 * e, shFwd: 1.6 * e, shOut: 0.2 + 1.1 * e, elbow: 0.6 });
  p.R = side({ thighFwd: -0.15 * e, knee: 0.1, shFwd: 2.2 * e, shOut: 0.2 + 0.9 * e, elbow: 0.4 });
  p.squash = -0.16 * ring(t, 0, 6, 22); p.travel = -0.35 * easeOut(t / 0.5);
  return p;
};

/** one-shot fall backwards: wobble, topple (gravity ease-in), bounce + squash on the floor, ends lying face up */
const FALL = { wobble: 0.35, topple: 0.85 };
const fall = (t: number): Pose => {
  const p = base(), w = clamp01(t / FALL.wobble), u = clamp01((t - FALL.wobble) / (FALL.topple - FALL.wobble));
  const ang = u * u * (Math.PI / 2) - 0.1 * ring(t, FALL.topple, 6, 16);
  p.rootPitch = -Math.max(0, ang) - 0.06 * Math.sin(w * Math.PI * 2) * (1 - u);
  p.rootLift = 0.3 * Math.sin(Math.max(0, ang));
  for (const S of [p.L, p.R]) { S.shFwd = lerp(0.3, 2.7, easeOut(t / 0.6)); S.shOut = 0.3 + 0.4 * u; S.elbow = 0.4; S.knee = 0.2 + 0.5 * u; S.thighFwd = 0.3 * u; }
  p.L.thighFwd += 0.4 * u; p.lean = 0.12 * Math.sin(w * Math.PI) - 0.1 * u;
  p.headPitch = 0.4 * ring(t, FALL.topple, 6, 18) - 0.2 * u; p.squash = -0.18 * ring(t, FALL.topple, 7, 24);
  p.ground = false;
  return p;
};

const cheer = (t: number): Pose => {
  const p = idle(t), ph = 2 * Math.PI * 1.6 * t, pump = pos(Math.sin(ph));
  for (const [S, o] of [[p.L, 0], [p.R, 0.4]] as const) { S.shFwd = 2.75 + 0.15 * Math.sin(ph + o); S.shOut = 0.45; S.elbow = 0.2 + 0.9 * pos(Math.sin(ph + o)); }
  p.lift = 0.1 * pump; p.squash = 0.05 * pump - 0.06 * pos(-Math.sin(ph)); p.lean = -0.08; p.headPitch = -0.1 + 0.06 * Math.sin(ph - 1);
  return p;
};

export const poseOf = (st: TitoState): Pose => {
  const t = Math.max(0, st.t), sp = st.speed ?? 1;
  switch (st.action) {
    case "walk": return gait(t, sp, 0);
    case "run": return gait(t, sp, 1);
    case "curl": return curl(t, sp);
    case "jump": return t < JUMP.end ? jump(t) : idle(t);
    case "hit": return hit(t);
    case "fall": return fall(t);
    case "cheer": return cheer(t);
    default: return idle(t);
  }
};


// ================================================================ 2.5D DRAWING (the Rick Clips technique) — official design: public/refs/tito_frente.webp + tito_espaldas.webp
// The bones above are INVISIBLE: every frame their joints are projected onto a flat card and Tito is DRAWN on a Canvas2D like a hand-inked illustration.
// RULE: zero perfect circles / perfect symmetry. Every shape (head, hair, band, shirt, hands, shoes, eyes) is an organic Bezier path with a little
// deterministic asymmetry; the ink is warm dark brown with VARIABLE weight (heavy silhouette, thin interior details); flat soft cel shading, no gradients.
const PX = 620;                                    // canvas pixels per metre
const CARD_W = 3.4, CARD_H = 3.0, CARD_Y0 = 0.12;   // card size (m), centred on the pelvis every frame: lying poses fit with full margin
const CW = Math.round(CARD_W * PX), CH = Math.round(CARD_H * PX);
const INK = "#2A1A14";                             // warm dark-brown ink
const W_OUT = 12, W_MID = 8, W_IN = 5;             // ink weights: silhouette / secondary edges / interior details (px on the card)
const HEAD = "#FFFFFF", HEAD_SH = "#E6DDD8", HAIR2 = "#6E4226", HAIR2_SH = "#55311B", BAND_RED = "#E03C31";
const SHIRT = "#E2453A", SHIRT_SH = "#B9332B", SHOE = "#FFFFFF", SHOE_SH = "#E4DDDA", TONGUE2 = "#F08A9A", MOUTH2 = "#3B1612";
type P2 = [number, number];
const BILLBOARD = 0.8;                             // 1 = the card always faces the camera, 0 = it keeps the character's yaw

// ---------------------------------------------------------------- organic drawing toolkit (Bezier only)
const rnd = (i: number, s: number) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
/** closed smooth path through points (Catmull-Rom converted to cubic Beziers) */
const smoothClosed = (g: CanvasRenderingContext2D, pts: P2[]) => {
  const n = pts.length; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  g.closePath();
};
/** open smooth path through points */
const smoothOpen = (g: CanvasRenderingContext2D, pts: P2[]) => {
  const n = pts.length; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
};
/** organic blob: an ellipse whose radius wobbles a little per control point (+ an optional shape function) — never a perfect circle */
const blobPts = (cx: number, cy: number, rx: number, ry: number, seed: number, wob = 0.035, n = 10, shape?: (a: number) => number, rot = 0): P2[] =>
  Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * Math.PI * 2, k = (1 + wob * (rnd(i, seed) * 2 - 1)) * (shape ? shape(a) : 1); return [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)] as P2; });
const blob = (g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, seed: number, wob = 0.035, n = 10, shape?: (a: number) => number) => smoothClosed(g, blobPts(cx, cy, rx, ry, seed, wob, n, shape));
/** hand-inked outline: a main stroke + a thinner offset pass that thickens the edge away from the light (variable weight, like a brush) */
const ink = (g: CanvasRenderingContext2D, path: () => void, w: number) => {
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = INK;
  path(); g.lineWidth = w; g.stroke();
  g.save(); g.translate(w * 0.2, w * 0.28); path(); g.lineWidth = w * 0.62; g.stroke(); g.restore();
};
/** flat fill + a soft cel shadow crescent on the side away from the key light (upper-left), then the ink */
const cel = (g: CanvasRenderingContext2D, path: () => void, base: string, shade: string, off: number, w = W_OUT) => {
  g.save(); path(); g.fillStyle = shade; g.fill(); g.clip(); g.translate(-off, -off * 1.15); path(); g.fillStyle = base; g.fill(); g.restore();
  ink(g, path, w);
};
/** a limb: one fluid ink noodle through the middle joint (cubic Bezier, slightly tapered toward the hand / foot) */
const noodle = (g: CanvasRenderingContext2D, a: number[], b: number[], c: number[], w: number) => {
  const m1: P2 = [a[0] + (b[0] - a[0]) * 0.66, a[1] + (b[1] - a[1]) * 0.66], m2: P2 = [c[0] + (b[0] - c[0]) * 0.66, c[1] + (b[1] - c[1]) * 0.66];
  g.lineCap = "round"; g.strokeStyle = INK;
  g.beginPath(); g.moveTo(a[0], a[1]); g.bezierCurveTo(m1[0], m1[1], m2[0], m2[1], c[0], c[1]); g.lineWidth = w; g.stroke();
  g.beginPath(); g.moveTo(a[0], a[1]); g.bezierCurveTo(m1[0], m1[1], b[0], b[1], (b[0] + c[0]) / 2, (b[1] + c[1]) / 2); g.lineWidth = w * 1.12; g.stroke();   // a bit thicker near the body
};

/** plaster cast over a limb: thick white sleeve with inked wrap lines (k = how much of the limb is covered, 0..1 from the shoulder / hip) */
const plaster = (g: CanvasRenderingContext2D, a: number[], b: number[], c: number[], w: number, k: number) => {
  const m1: P2 = [a[0] + (b[0] - a[0]) * 0.66, a[1] + (b[1] - a[1]) * 0.66], m2: P2 = [c[0] + (b[0] - c[0]) * 0.66, c[1] + (b[1] - c[1]) * 0.66];
  const bz = (t: number): P2 => { const u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * m1[0] + 3 * u * t * t * m2[0] + t * t * t * c[0], u * u * u * a[1] + 3 * u * u * t * m1[1] + 3 * u * t * t * m2[1] + t * t * t * c[1]]; };
  const pts: P2[] = Array.from({ length: 9 }, (_, i) => bz(0.08 + 0.84 * k * (i / 8)));
  g.lineCap = "round"; g.lineJoin = "round";
  smoothOpen(g, pts); g.lineWidth = w * 3.5; g.strokeStyle = INK; g.stroke();
  smoothOpen(g, pts); g.lineWidth = w * 2.7; g.strokeStyle = "#F4F1EA"; g.stroke();
  smoothOpen(g, pts.map((q, i) => [q[0] + w * 0.35, q[1] + w * 0.4 * (i % 2 ? 1 : 0.6)] as P2)); g.lineWidth = w * 0.55; g.strokeStyle = "#D9D3CA"; g.stroke();
  for (let i = 1; i < pts.length - 1; i += 2) { const q = pts[i], r = pts[i + 1], dx = r[0] - q[0], dy = r[1] - q[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; smoothOpen(g, [[q[0] + nx * w * 1.3, q[1] + ny * w * 1.3], [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2 + 2], [q[0] - nx * w * 1.3, q[1] - ny * w * 1.3]]); g.lineWidth = 3.2; g.strokeStyle = INK; g.stroke(); }
};

/** the face (head units, R = head radius px; turn -1..1 = looking sideways). Slightly asymmetric oval eyes, curved expressive brows, open dark mouth + pink tongue */
const drawFace2D = (g: CanvasRenderingContext2D, R: number, ex: TitoExpression, m: number, blink: number, sweat: number, turn: number) => {
  g.lineCap = "round"; g.lineJoin = "round";
  const k = R / 100, lid = clamp01(blink), fx = turn * R * 0.42, ey = -R * 0.02, my = R * 0.36;
  const X = (s: number, d = 27) => fx + s * d * k * (1 - 0.32 * Math.abs(turn)) * (s * turn > 0 ? 0.82 : 1);
  const narrow = (s: number) => 1 - 0.45 * Math.max(0, s * turn);
  const stroke = (pts: P2[], w: number, col = INK) => { smoothOpen(g, pts); g.lineWidth = w; g.strokeStyle = col; g.stroke(); };
  const eye = (s: number, ry = 15, top = 0, look = 0) => {
    const x = X(s) + look * k, rx = (9.5 + (s < 0 ? -0.6 : 0.4)) * k * narrow(s), h = (ry + (s < 0 ? -0.8 : 0.6)) * k, y = ey + (s < 0 ? 1.2 * k : 0), cut = Math.max(top, lid);
    g.save(); g.beginPath(); g.rect(x - 30 * k, y - h + 2 * h * cut, 60 * k, 60 * k); g.clip();
    blob(g, x, y, rx, h, 40 + s, 0.05, 8); g.fillStyle = INK; g.fill();
    if (cut < 0.5) { blob(g, x - rx * 0.32, y - h * 0.4, 2.8 * k, 3.2 * k, 50 + s, 0.05, 6); g.fillStyle = "#FFFFFF"; g.fill(); }
    g.restore();
    if (cut > 0.05) stroke([[x - rx - 4 * k, y - h + 2 * h * cut + 1], [x, y - h + 2 * h * cut - 1.5 * k], [x + rx + 4 * k, y - h + 2 * h * cut + 1]], W_IN * k * 1.1);
  };
  /** curved brow: outer -> top -> inner, `arch` lifts the middle */
  const brow = (s: number, outer: number, inner: number, arch = 4) => stroke([[X(s, 43), ey - 29 * k + outer * k], [X(s, 28), ey - 35 * k - arch * k + (outer + inner) * 0.5 * k], [X(s, 13), ey - 31 * k + inner * k]], 7 * k);
  const mouth = (w: number, h: number, dx = 0, tongue = true, smile = 0.35) => {
    const cx = fx + dx * k, top = my - h * k * 0.35, bot = my + h * k;
    const path = () => { g.beginPath(); g.moveTo(cx - w * k, top - smile * 6 * k); g.bezierCurveTo(cx - w * k * 0.4, top + 2 * k, cx + w * k * 0.4, top + 2 * k, cx + w * k, top - smile * 9 * k); g.bezierCurveTo(cx + w * k * 0.85, bot, cx - w * k * 0.7, bot + 1.5 * k, cx - w * k, top - smile * 6 * k); g.closePath(); };
    path(); g.fillStyle = MOUTH2; g.fill();
    if (tongue && h > 7) { g.save(); path(); g.clip(); blob(g, cx + 3 * k, bot - 1 * k, w * k * 0.62, h * k * 0.45, 61, 0.06, 8); g.fillStyle = TONGUE2; g.fill(); stroke([[cx + 3 * k, bot - h * k * 0.32], [cx + 3 * k, bot - h * k * 0.08]], 2.4 * k, "#C55A6A"); g.restore(); }
    path(); g.lineWidth = 5 * k; g.strokeStyle = INK; g.stroke();
  };
  if (ex === "idle") {
    for (const s of [-1, 1]) { eye(s); brow(s, 2, 0, 4); }
    if (m < 0.08) stroke([[fx - 15 * k, my - 3 * k], [fx, my + 6 * k], [fx + 16 * k, my - 4 * k]], 5 * k); else mouth(15 + 3 * m, 6 + 16 * m);
  } else if (ex === "effort") {
    for (const s of [-1, 1]) { const x = X(s); stroke([[x + s * 10 * k, ey - 8 * k], [x - s * 6 * k, ey], [x + s * 10 * k, ey + 8 * k]], 6 * k); stroke([[X(s, 44), ey - 34 * k], [X(s, 29), ey - 28 * k], [X(s, 13), ey - 19 * k]], 7.5 * k); }
    const h = (9 + 14 * m) * k, w = 19 * k, tp = () => { smoothClosed(g, [[fx - w, my - h * 0.5], [fx, my - h * 0.62], [fx + w, my - h * 0.48], [fx + w * 0.92, my + h * 0.5], [fx, my + h * 0.6], [fx - w * 0.95, my + h * 0.48]]); };
    tp(); g.fillStyle = "#FFFFFF"; g.fill(); stroke([[fx - w * 0.9, my], [fx, my + 1.5 * k], [fx + w * 0.9, my]], 2.5 * k); tp(); g.lineWidth = 4.5 * k; g.strokeStyle = INK; g.stroke();
  } else if (ex === "shocked") {
    for (const s of [-1, 1]) { const x = X(s); blob(g, x, ey - 2 * k, 14 * k * narrow(s), 19 * k * (1 - 0.9 * lid), 80 + s, 0.05, 9); g.fillStyle = "#FFFFFF"; g.fill(); g.lineWidth = 4 * k; g.strokeStyle = INK; g.stroke(); if (lid < 0.6) { blob(g, x, ey, 4.5 * k, 5 * k, 90 + s, 0.05, 6); g.fillStyle = INK; g.fill(); } brow(s, -12, -16, 8); }
    const mm = 0.5 + 0.5 * m; blob(g, fx, my + 4 * k, (7 + 4 * mm) * k, (9 + 9 * mm) * k, 95, 0.06, 9); g.fillStyle = MOUTH2; g.fill(); g.lineWidth = 4.5 * k; g.strokeStyle = INK; g.stroke();
  } else if (ex === "exhausted") {
    for (const s of [-1, 1]) { const x = X(s); eye(s, 14, 0.5); stroke([[X(s, 42), ey - 18 * k], [X(s, 28), ey - 26 * k], [X(s, 13), ey - 31 * k]], 6 * k); }
    mouth(12 + 3 * m, 7 + 9 * m, 2, false, -0.4); blob(g, fx + 9 * k, my + (11 + 5 * m) * k, 6 * k, 9 * k, 97, 0.06, 8); g.fillStyle = TONGUE2; g.fill(); g.lineWidth = 3.5 * k; g.strokeStyle = INK; g.stroke();
  } else {                                                                                   // smug / confident: one brow arched high, heavy lids, cheeky open grin
    for (const s of [-1, 1]) eye(s, 14, 0.35, 3);
    brow(-1, 4, 2, 2); brow(1, -12, -4, 10);
    if (m < 0.1) stroke([[fx - 14 * k, my + 1 * k], [fx + 2 * k, my + 7 * k], [fx + 18 * k, my - 8 * k]], 5 * k); else mouth(15 + 3 * m, 5 + 14 * m, 4, true, 0.8);
  }
  const nd = Math.ceil(clamp01(sweat) * 3);
  const drop = (x: number, y: number, s = 1) => { s *= k; g.beginPath(); g.moveTo(x, y - 12 * s); g.bezierCurveTo(x + 9 * s, y - 2 * s, x + 6 * s, y + 8 * s, x, y + 7.5 * s); g.bezierCurveTo(x - 6 * s, y + 8 * s, x - 9 * s, y - 2 * s, x, y - 12 * s); g.fillStyle = SWEAT; g.fill(); g.lineWidth = 3 * k; g.strokeStyle = INK; g.stroke(); };
  if (nd >= 1) drop(R * 0.95, -R * 0.25, 1.3); if (nd >= 2) drop(-R * 1.0, R * 0.05, 1.4); if (nd >= 3) drop(R * 0.9, R * 0.45, 1.1);
};

/** organic head silhouette: a touch wider at the temples / cheeks, slightly narrower chin, a hint of asymmetry */
const headShape = (a: number) => 1 + 0.045 * Math.cos(2 * a) * (Math.sin(a) < 0 ? 0.6 : 1) - 0.035 * Math.max(0, Math.sin(a)) * Math.abs(Math.cos(a * 0.5)) + 0.012 * Math.sin(3 * a + 0.7);

let BLOB: THREE.Texture | null = null;
const blobTex = () => BLOB ??= (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(30,18,14,0.5)"); gr.addColorStop(0.6, "rgba(30,18,14,0.22)"); gr.addColorStop(1, "rgba(30,18,14,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

// ---------------------------------------------------------------- the rig
export class TitoRig {
  /** add THIS to the scene: the 2D card + its contact blob (the bones below are invisible helpers) */
  object = new THREE.Group();
  root = new THREE.Group(); body = new THREE.Group();
  pelvis = new THREE.Group(); spine = new THREE.Group(); chest = new THREE.Group(); neck = new THREE.Group(); head = new THREE.Group();
  sh: Record<"L" | "R", THREE.Group> = { L: new THREE.Group(), R: new THREE.Group() };
  elbow: Record<"L" | "R", THREE.Group> = { L: new THREE.Group(), R: new THREE.Group() };
  hand: Record<"L" | "R", THREE.Group> = { L: new THREE.Group(), R: new THREE.Group() };
  hip: Record<"L" | "R", THREE.Group> = { L: new THREE.Group(), R: new THREE.Group() };
  knee: Record<"L" | "R", THREE.Group> = { L: new THREE.Group(), R: new THREE.Group() };
  ankle: Record<"L" | "R", THREE.Group> = { L: new THREE.Group(), R: new THREE.Group() };
  card: THREE.Mesh; private blob: THREE.Mesh;
  private soles: THREE.Object3D[] = []; private toes: Record<"L" | "R", THREE.Object3D> = { L: new THREE.Object3D(), R: new THREE.Object3D() };
  private cv: HTMLCanvasElement; private g: CanvasRenderingContext2D; private tex: THREE.CanvasTexture; private mat: THREE.MeshBasicMaterial;
  private v = new THREE.Vector3(); private w = new THREE.Vector3(); private view = 0; private ox = 0;

  constructor() {
    const R = RIG;
    this.root.add(this.body); this.body.add(this.pelvis); this.pelvis.add(this.spine); this.spine.add(this.chest); this.chest.add(this.neck); this.neck.add(this.head);
    this.spine.position.y = R.SPINE; this.chest.position.y = R.CHEST; this.neck.position.y = R.NECK; this.head.position.y = R.HEAD_Y;
    for (const s of ["L", "R"] as const) {
      const sx = s === "R" ? 1 : -1;
      this.sh[s].position.set(sx * R.SHOULDER_X, -0.05, 0); this.chest.add(this.sh[s]); this.sh[s].add(this.elbow[s]); this.elbow[s].add(this.hand[s]);
      this.elbow[s].position.y = -R.UPPER; this.hand[s].position.y = -R.FORE;
      this.hip[s].position.set(sx * R.HIP_X, -0.06, 0); this.pelvis.add(this.hip[s]); this.hip[s].add(this.knee[s]); this.knee[s].add(this.ankle[s]);
      this.knee[s].position.y = -R.THIGH; this.ankle[s].position.y = -R.SHIN;
      for (const z of [-0.05, 0.14]) { const o = new THREE.Object3D(); o.position.set(0, -0.071, z); this.ankle[s].add(o); this.soles.push(o); }
      this.toes[s].position.set(0, -0.04, 0.15); this.ankle[s].add(this.toes[s]);
    }
    this.cv = document.createElement("canvas"); this.cv.width = CW; this.cv.height = CH; this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(CARD_W, CARD_H); geo.translate(0, CARD_H / 2 - CARD_Y0, 0);
    this.card = new THREE.Mesh(geo, this.mat); this.card.layers.set(NOINK); this.card.castShadow = true; this.card.renderOrder = 1;
    this.card.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false }));
    this.blob.layers.set(NOINK); this.blob.renderOrder = 0.5;
    this.object.add(this.card, this.blob);
  }

  /** pose the invisible skeleton, then redraw Tito on the card. Call it AFTER the camera of the frame is placed (partial billboard). */
  update(st: TitoState, camera?: THREE.Camera) {
    const p = poseOf(st), R = RIG;
    if (st.outfit?.noBells) p.dumbbells = false;
    if (st.over) { const o = st.over; if (o.L) Object.assign(p.L, o.L); if (o.R) Object.assign(p.R, o.R);
      for (const k of ["lean", "lift", "squash", "headPitch", "headRoll", "headYaw", "chestSide", "chestTwist"] as const) if (o[k] !== undefined) p[k] = o[k]!; }
    const [x0, y0, z0] = st.position ?? [0, 0, 0], yaw = st.yaw ?? 0, sc = st.scale ?? 1;
    const tr = st.travel ? p.travel : (st.action === "hit" ? p.travel : 0);
    const px = x0 + Math.sin(yaw) * tr * sc, pz = z0 + Math.cos(yaw) * tr * sc;
    this.root.position.set(0, p.rootLift, 0); this.root.rotation.set(0, 0, 0); this.root.scale.setScalar(1);
    this.body.rotation.set(p.rootPitch, 0, 0);
    const s = Math.max(-0.4, p.squash), kq = 1 / Math.sqrt(1 + s);
    this.body.scale.set(kq, 1 + s, kq);
    this.pelvis.rotation.set(0, p.pelvisTwist, p.pelvisTilt);
    this.spine.rotation.set(p.lean, p.chestTwist * 0.4, p.chestSide);
    this.chest.rotation.set(p.lean * 0.35, p.chestTwist * 0.6, p.chestSide * 0.5);
    this.neck.rotation.set(p.neck, p.headYaw * 0.3, 0);
    this.head.rotation.set(p.headPitch, p.headYaw * 0.7, p.headRoll);
    for (const sd of ["L", "R"] as const) {
      const S = p[sd], sx = sd === "R" ? 1 : -1;
      this.sh[sd].rotation.set(-S.shFwd, 0, sx * S.shOut); this.elbow[sd].rotation.set(-S.elbow, 0, 0); this.hand[sd].rotation.set(0, S.handRot, 0);
      this.hip[sd].rotation.set(-S.thighFwd, 0, sx * S.thighOut); this.knee[sd].rotation.set(S.knee, 0, 0); this.ankle[sd].rotation.set(S.ankle, 0, 0);
    }
    this.pelvis.position.set(0, R.HIP, 0);
    if (p.ground) {
      this.root.updateMatrixWorld(true);
      let yMin = Infinity; for (const o of this.soles) yMin = Math.min(yMin, o.getWorldPosition(this.v).y);
      this.pelvis.position.y += (p.rootLift - yMin) / (1 + s) + p.lift;
    }
    this.root.updateMatrixWorld(true);
    // partial billboard: the card turns toward the camera; the drawing shows front / 3-4 / profile / BACK depending on how the character faces it
    let camAz = yaw;
    if (camera) { camera.getWorldPosition(this.w); camAz = Math.atan2(this.w.x - px, this.w.z - pz); }
    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    const rel = wrap(yaw - camAz), lean = Math.abs(rel) <= Math.PI / 2 ? rel : wrap(rel - Math.PI);
    const cardYaw = camAz + (1 - BILLBOARD) * Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lean));
    const view = wrap(yaw - cardYaw);
    this.pelvis.getWorldPosition(this.v); this.ox = this.v.x * Math.cos(view) + this.v.z * Math.sin(view);
    this.card.position.set(px + Math.cos(cardYaw) * this.ox * sc, y0, pz - Math.sin(cardYaw) * this.ox * sc); this.card.rotation.set(0, cardYaw, 0); this.card.scale.setScalar(sc);
    const air = Math.max(0, this.pelvis.position.y - R.HIP) + p.rootLift * 0.2;
    this.blob.position.set(px, y0 + 0.012, pz); this.blob.scale.set(0.95 * sc * (1 - 0.4 * clamp01(air)), 1, 0.55 * sc * (1 - 0.4 * clamp01(air)));
    (this.blob.material as THREE.MeshBasicMaterial).opacity = 1 - 0.6 * clamp01(air * 1.5);
    this.view = view; this.draw(st, p, view, s);
    return p;
  }

  /** joint -> card pixel (+ depth toward the camera, metres) for a view angle */
  private pt(o: THREE.Object3D, view: number, off?: [number, number, number]): [number, number, number] {
    const q = off ? o.localToWorld(this.v.set(...off)) : o.getWorldPosition(this.v);
    const c = Math.cos(view), sn = Math.sin(view);
    const X = q.x * c + q.z * sn, D = -q.x * sn + q.z * c;
    return [CW / 2 + (X - this.ox) * PX, CH - (q.y + CARD_Y0) * PX, D];
  }

  private draw(st: TitoState, p: Pose, view: number, sq: number) {
    const g = this.g, pt = (o: THREE.Object3D, off?: [number, number, number]) => this.pt(o, view, off);
    g.clearRect(0, 0, CW, CH); g.lineCap = "round"; g.lineJoin = "round";
    const pale = clamp01(st.pale ?? 0), head = pale > 0.01 ? "#" + new THREE.Color(HEAD).lerp(new THREE.Color("#D2E8C4"), 0.7 * pale).getHexString() : HEAD;
    const back = Math.cos(view) < -0.15, side = Math.abs(Math.sin(view));
    const OF = st.outfit ?? {}, shirtC = OF.shirt ?? SHIRT, shirtS = OF.shirt ? "#" + new THREE.Color(OF.shirt).multiplyScalar(0.78).getHexString() : SHIRT_SH, castK = clamp01(OF.cast ?? 0);
    type Item = { d: number; f: () => void }; const items: Item[] = [];
    // ---- legs: ink noodles hip -> knee -> ankle, hand-drawn sneakers (white, red sole, side stripes, tongue, laces)
    for (const sd of OF.noLegs ? [] : (["L", "R"] as const)) {
      const a = pt(this.hip[sd], [0, -0.03, 0]), b = pt(this.knee[sd]), c = pt(this.ankle[sd]), toe = pt(this.toes[sd]);
      items.push({ d: (b[2] + c[2]) / 2 - 0.12, f: () => { noodle(g, a, b, c, 0.034 * PX); if (castK > 0) plaster(g, a, b, c, 0.034 * PX, castK); this.shoe(c, toe, sd === "L" ? 1 : 2); } });
    }
    // ---- torso: a loose red tank top (drapes a little wider at the hem, soft folds, white armhole trim, open round neck), no stripes
    const P = pt(this.pelvis, [0, -0.06, 0]), C = pt(this.chest, [0, 0.06, 0]);
    items.push({ d: 0, f: () => {
      const ang = Math.atan2(C[0] - P[0], -(C[1] - P[1])), len = Math.hypot(C[0] - P[0], C[1] - P[1]), wT = (0.33 - 0.09 * side) * PX;
      g.save(); g.translate(P[0], P[1]); g.rotate(ang);
      const hw = wT * 0.52, aw = wT * 0.45, sw = wT * 0.3, st2 = wT * 0.11, top = -len, armY = -len * 0.6, neckD = (back ? 0.045 : 0.085) * PX;
      // the white chest / neck seen through the neck opening
      blob(g, 0, top + neckD * 0.4, sw * 0.9, neckD * 1.1, 7, 0.04, 8); g.fillStyle = head; g.fill();
      const shirt = () => smoothClosed(g, [
        [-hw, 0.02 * PX], [-hw * 0.97, -len * 0.25], [-aw, armY], [-sw - st2 * 0.9, top + 0.02 * PX], [-sw + st2 * 0.6, top - 0.005 * PX],
        [-sw * 0.45, top + neckD * 0.75], [0, top + neckD], [sw * 0.5, top + neckD * 0.72], [sw - st2 * 0.6, top - 0.008 * PX], [sw + st2 * 0.9, top + 0.02 * PX],
        [aw * 1.02, armY], [hw * 0.98, -len * 0.24], [hw * 1.02, 0.025 * PX], [hw * 0.35, 0.04 * PX], [-hw * 0.3, 0.032 * PX]]);
      cel(g, shirt, shirtC, shirtS, wT * 0.09);
      // white armhole trim (front only) + neck rim + soft folds
      if (!back) for (const s of [-1, 1]) { smoothOpen(g, [[s * (sw + st2 * 0.85), top + 0.025 * PX], [s * (sw + st2 * 1.6), top + 0.06 * PX], [s * aw * 1.0, top + 0.12 * PX]]); g.lineWidth = 0.02 * PX; g.strokeStyle = "#FFFFFF"; g.stroke(); g.lineWidth = W_IN; g.strokeStyle = INK; g.stroke(); }
      smoothOpen(g, [[-sw + st2 * 0.5, top], [-sw * 0.4, top + neckD * 0.78], [0, top + neckD * 1.02], [sw * 0.45, top + neckD * 0.75], [sw - st2 * 0.5, top]]); g.lineWidth = W_MID; g.strokeStyle = INK; g.stroke();
      for (const [x0, y0, x1, y1] of [[-0.3, -0.05, -0.25, -0.22], [0.22, -0.04, 0.18, -0.17], [-0.05, -0.03, -0.02, -0.12]] as const) { smoothOpen(g, [[x0 * wT, y0 * PX], [(x0 + x1) / 2 * wT + 3, (y0 + y1) / 2 * PX], [x1 * wT, y1 * PX]]); g.lineWidth = W_IN; g.strokeStyle = shirtS; g.stroke(); }
      g.restore();
    } });
    // ---- swimming-pool float ring around the waist (Sleep Robbery): fat pink donut with a hole that shows the torso, white highlight streaks, ink outline
    if (OF.floatRing) items.push({ d: 0.01, f: () => {
      const ang = Math.atan2(C[0] - P[0], -(C[1] - P[1])), len = Math.hypot(C[0] - P[0], C[1] - P[1]);
      const col = OF.floatRing!, colS = "#" + new THREE.Color(col).multiplyScalar(0.72).getHexString(), sx = 1 - 0.25 * side;
      g.save(); g.translate(P[0], P[1]); g.rotate(ang);
      const cy = -len * 0.2, ro = 0.48 * PX * sx, ri = 0.27 * PX * sx, hy = 0.17 * PX;
      const add = (pts: P2[]) => { const n = pts.length; g.moveTo(pts[0][0], pts[0][1]); for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); } g.closePath(); };
      const ringP = () => { g.beginPath(); add(blobPts(0, cy, ro, hy, 61, 0.03, 12)); add(blobPts(0, cy - 0.015 * PX, ri, hy * 0.5, 62, 0.03, 12)); };
      g.save(); ringP(); g.fillStyle = colS; g.fill("evenodd"); g.clip("evenodd"); g.translate(-0.028 * PX, -0.03 * PX); ringP(); g.fillStyle = col; g.fill("evenodd"); g.restore();
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = INK; ringP(); g.lineWidth = W_OUT; g.stroke();
      for (const [a0, a1] of [[3.5, 4.3], [5.1, 5.6]] as const) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * (i / 8), x = Math.cos(a) * (ro + ri) * 0.5, y = cy + Math.sin(a) * (hy + hy * 0.5) * 0.52; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineWidth = 0.026 * PX; g.strokeStyle = "rgba(255,255,255,.85)"; g.stroke(); }
      g.restore();
    } });
    // ---- arms: ink noodles shoulder -> elbow -> hand, small organic black hands (+ dumbbells)
    for (const sd of ["L", "R"] as const) {
      const a = pt(this.sh[sd]), b = pt(this.elbow[sd]), c = pt(this.hand[sd], [0, -0.02, 0]);
      items.push({ d: (b[2] + c[2]) / 2 + 0.02 + (back ? -0.05 : 0), f: () => {
        noodle(g, a, b, c, 0.03 * PX); if (castK > 0) plaster(g, a, b, c, 0.03 * PX, castK);
        if (p.dumbbells) { const dd = pt(this.hand[sd], [0.12, -0.03, 0]), de = pt(this.hand[sd], [-0.12, -0.03, 0]); g.lineWidth = 0.022 * PX; g.strokeStyle = "#8d949c"; g.beginPath(); g.moveTo(dd[0], dd[1]); g.lineTo(de[0], de[1]); g.stroke(); for (const q of [dd, de]) { const pl = () => blob(g, q[0], q[1], 0.03 * PX, 0.065 * PX, 33, 0.05, 8); pl(); g.fillStyle = "#3a3f4c"; g.fill(); ink(g, pl, W_MID); } }
        if (sd === "R" && (OF.megaphone ?? 0) > 0.02) {
          const hc = pt(this.head, [0, RIG.HEAD_R * 0.4, 0]); let dx = c[0] - hc[0], dy = c[1] - hc[1] - 0.04 * PX; const L0 = Math.hypot(dx, dy) || 1; dx /= L0; dy /= L0;
          if (Math.abs(dx) < 0.45) { dx = dx < 0 ? -0.45 : 0.45; const n = Math.hypot(dx, dy); dx /= n; dy /= n; }
          const m = clamp01(OF.megaphone ?? 0), len = 0.34 * PX * m, w0 = 0.035 * PX, w1 = 0.17 * PX * m;
          g.save(); g.translate(c[0], c[1]); g.rotate(Math.atan2(dy, dx));
          const cone = () => smoothClosed(g, [[-0.03 * PX, -w0], [len * 0.5, -(w0 + w1) * 0.35], [len, -w1], [len * 1.04, 0], [len, w1], [len * 0.5, (w0 + w1) * 0.35], [-0.03 * PX, w0], [-0.05 * PX, 0]]);
          cel(g, cone, "#E02828", "#A01818", 0.02 * PX, W_OUT * 0.9);
          g.save(); cone(); g.clip(); smoothClosed(g, [[len * 0.42, -w1 * 1.2], [len * 0.56, -w1 * 1.2], [len * 0.56, w1 * 1.2], [len * 0.42, w1 * 1.2]]); g.fillStyle = "#FFFFFF"; g.fill(); g.restore();
          ink(g, cone, W_MID);
          const rimP = () => blob(g, len * 1.02, 0, w1 * 0.22, w1 * 0.96, 71, 0.04, 8); rimP(); g.fillStyle = "#2A0A0A"; g.fill(); ink(g, rimP, W_MID);
          const grip = () => smoothClosed(g, [[len * 0.18, w0 * 0.8], [len * 0.3, w0 * 1.6], [len * 0.3 + 0.03 * PX, w0 * 3.2], [len * 0.12, w0 * 2.4]]); grip(); g.fillStyle = "#1c1c22"; g.fill(); ink(g, grip, W_IN);
          g.restore();
        }
        const hand = () => blob(g, c[0], c[1], 0.042 * PX, 0.038 * PX, sd === "L" ? 11 : 12, 0.07, 8);
        hand(); g.fillStyle = INK; g.fill();
        if (sd === "R" && (OF.thumbs ?? 0) > 0.02) {
          const th = clamp01(OF.thumbs ?? 0), tl = 0.12 * PX * th, tw = 0.026 * PX;
          const thumb = () => smoothClosed(g, [[c[0] - tw * 0.2, c[1] - 0.02 * PX], [c[0] - tw, c[1] - tl * 0.55], [c[0] - tw * 0.3, c[1] - tl - 0.012 * PX], [c[0] + tw * 0.7, c[1] - tl * 0.7], [c[0] + tw * 0.9, c[1] - 0.01 * PX]]);
          thumb(); g.fillStyle = INK; g.fill(); g.lineWidth = 3; g.strokeStyle = "#5a3a2c"; g.stroke();
        }
      } });
    }
    // ---- head
    const H = pt(this.head, [0, RIG.HEAD_R * 0.9, 0]), HT = pt(this.head, [0, RIG.HEAD_R * 1.9, 0]);
    const floorY = CH - (CARD_Y0 + RIG.HEAD_R * 1.25) * PX; if (H[1] > floorY) { const d = H[1] - floorY; H[1] -= d; HT[1] -= d; }   // a lying head rests ON the floor, crown included
    items.push({ d: 1, f: () => this.headDraw(st, p, H, HT, view, back, sq, head) });
    items.sort((a, b) => a.d - b.d).forEach((it) => it.f());
    this.tex.needsUpdate = true;
  }

  /** a hand-drawn sneaker at the ankle pointing toward the toe: white upper, red sole, red side stripes, tongue + laces */
  private shoe(c: number[], toe: number[], seed: number) {
    const g = this.g, dx = toe[0] - c[0], dy = toe[1] - c[1], Lp = Math.hypot(dx, dy), flip = dx < 0 ? -1 : 1;
    const L = Math.max(0.15, Math.min(0.24, (Lp / PX) * 1.2 + 0.08)) * PX, Hh = 0.092 * PX, tilt = Lp > 10 ? Math.atan2(dy, Math.abs(dx)) * 0.7 : 0;
    g.save(); g.translate(c[0], c[1] + 0.055 * PX); g.scale(flip, 1); g.rotate(tilt);
    const j = (i: number) => (rnd(i, seed) - 0.5) * 0.01 * PX;
    const upper = () => smoothClosed(g, [[-0.32 * L, 0.02 * Hh], [0.1 * L + j(1), 0.06 * Hh], [0.62 * L, 0.0], [0.7 * L + j(2), -0.38 * Hh], [0.42 * L, -0.62 * Hh], [0.08 * L, -0.9 * Hh + j(3)], [-0.2 * L, -1.0 * Hh], [-0.36 * L, -0.62 * Hh]]);
    // tongue sticking out of the collar
    const tongue = () => smoothClosed(g, [[-0.16 * L, -0.92 * Hh], [-0.1 * L, -1.32 * Hh], [0.04 * L, -1.3 * Hh], [0.08 * L, -0.88 * Hh]]);
    cel(g, tongue, SHOE, SHOE_SH, 3, W_MID);
    cel(g, upper, SHOE, SHOE_SH, 0.05 * Hh, W_OUT * 0.9);
    // red sole
    g.save(); upper(); g.clip(); smoothClosed(g, [[-0.5 * L, -0.12 * Hh], [0.2 * L, -0.08 * Hh], [0.8 * L, -0.2 * Hh], [0.8 * L, 0.3 * Hh], [-0.5 * L, 0.3 * Hh]]); g.fillStyle = BAND_RED; g.fill(); g.restore();
    smoothOpen(g, [[-0.33 * L, -0.12 * Hh], [0.2 * L, -0.08 * Hh], [0.66 * L, -0.2 * Hh]]); g.lineWidth = W_IN; g.strokeStyle = INK; g.stroke();
    // side stripes + laces
    for (const o of [0, 0.13]) { smoothOpen(g, [[(-0.12 + o) * L, -0.28 * Hh], [(-0.02 + o) * L, -0.5 * Hh], [(0.06 + o) * L, -0.74 * Hh]]); g.lineWidth = 0.018 * PX; g.strokeStyle = BAND_RED; g.stroke(); }
    for (let i = 0; i < 3; i++) { const x = (0.14 + i * 0.12) * L, y = (-0.78 + i * 0.13) * Hh; smoothOpen(g, [[x - 0.06 * L, y - 0.05 * Hh], [x, y + 0.02 * Hh], [x + 0.06 * L, y + 0.06 * Hh]]); g.lineWidth = W_IN * 0.8; g.strokeStyle = INK; g.stroke(); }
    ink(g, upper, W_OUT * 0.9);
    g.restore();
  }

  /** the head: organic white head with warm cel shadow, asymmetric brown spikes, the curved white sweatband with a red stripe; face (front) or the hair-covered nape (back) */
  private headDraw(st: TitoState, p: Pose, H: number[], HT: number[], view: number, back: boolean, sq: number, head: string) {
    const g = this.g, Rp = RIG.HEAD_R * PX, roll = Math.atan2(HT[0] - H[0], -(HT[1] - H[1])), turn = back ? -Math.sin(view) : Math.sin(view + p.headYaw * 0.7);
    const syq = 1 + sq * 0.6, sxq = 1 / Math.sqrt(1 + sq * 0.6);
    g.save(); g.translate(H[0], H[1]); g.rotate(roll); g.scale(sxq * (back ? -1 : 1), syq * 1.02);
    const headP = () => smoothClosed(g, blobPts(0, 0, Rp * 0.99, Rp * 0.96, 5, 0.012, 14, headShape, -Math.PI / 2));
    const bandY = -Rp * 0.42;
    // 1) the head
    cel(g, headP, head, HEAD_SH, Rp * 0.1, W_OUT);
    // 2) the hair: ONE compact messy mass hugging the skull, made of tousled locks with DEFINED, asymmetric pointed tips (curved sides, sharp ends),
    //    locks leaning outward on the sides and to one side on top, a pair of side locks poking out just above the band. Back view: the same locks
    //    cover the back of the head and the nape ends in pointed irregular locks hugging the white outline.
    const sweep = 0.22 * (back ? -1 : 1) - turn * 0.12;
    const P = (a: number, r: number): P2 => [Math.cos(a) * r, Math.sin(a) * r];
    /** traces the locks along the skull from a0 to a1 (canvas angles, -PI/2 = top): root -> curved side -> pointed tip -> curved side -> next root */
    const locks = (a0: number, a1: number, n: number, seed: number, start: boolean) => {
      let a = a0; const span = a1 - a0;
      const ws = Array.from({ length: n }, (_, i) => 0.6 + 0.8 * rnd(i, seed)), ws0 = ws.reduce((x, y) => x + y, 0);
      if (start) { const q = P(a, Rp * 0.99); g.moveTo(q[0], q[1]); }
      for (let i = 0; i < n; i++) {
        const w = (span * ws[i]) / ws0, end = a + w, mid = a + w / 2;
        const sideLock = i === 0 || i === n - 1, lean = 0.55 * w * Math.cos(mid) + sweep * w + (sideLock ? (i === 0 ? -0.5 : 0.5) * w : 0);
        const len = sideLock ? 0.15 : 0.06 + 0.1 * rnd(i, seed + 3) + (rnd(i, seed + 5) > 0.72 ? 0.05 : 0);   // a few longer, sharper locks
        const tipA = mid + lean, tip = P(tipA, Rp * (1 + len)), r0 = Rp * (0.985 + 0.01 * rnd(i, seed + 1)), r1 = Rp * (0.985 + 0.01 * rnd(i + 1, seed + 1));
        const c1 = P(a + w * 0.3 + lean * 0.5, Rp * (1 + len * 0.62)), c2 = P(end - w * 0.15 + lean * 0.3, Rp * (1 + len * 0.18));
        void r0;
        g.quadraticCurveTo(c1[0], c1[1], tip[0], tip[1]);
        const nx = P(end, r1); g.quadraticCurveTo(c2[0], c2[1], nx[0], nx[1]);
        a = end;
      }
    };
    const aL = Math.PI + Math.asin(0.3), aR = 2 * Math.PI - Math.asin(0.3);          // where the hair meets the band (front)
    const hairFront = () => { g.beginPath(); locks(aL, aR, 10, 21, true); g.lineTo(Math.cos(aR) * Rp * 0.8, bandY + Rp * 0.06); g.lineTo(Math.cos(aL) * Rp * 0.8, bandY + Rp * 0.06); g.closePath(); };
    const napeY = Rp * 0.24;
    const hairBack = () => {
      g.beginPath(); locks(Math.PI - Math.asin(napeY / Rp), 2 * Math.PI + Math.asin(napeY / Rp), 14, 37, true);
      // the nape: pointed irregular locks hanging just below, hugging the white outline (right -> left), each leaning a little outward
      const xs = [0.95, 0.7, 0.47, 0.2, -0.05, -0.32, -0.58, -0.8, -0.95];
      for (let i = 0; i < xs.length - 1; i++) {
        const x0 = xs[i] * Rp, x1 = xs[i + 1] * Rp, y0 = napeY - Rp * 0.12 * xs[i] * xs[i], y1 = napeY - Rp * 0.12 * xs[i + 1] * xs[i + 1];
        const len = Rp * (0.06 + 0.09 * rnd(i, 52)), lean = Rp * 0.05 * Math.sign((x0 + x1) / 2 || 1) + Rp * 0.03 * (rnd(i, 53) - 0.5);
        const tx = (x0 + x1) / 2 + lean, ty = Math.max(y0, y1) + len;
        g.quadraticCurveTo(x0 - Rp * 0.02, (y0 + ty) / 2 + Rp * 0.02, tx, ty);
        g.quadraticCurveTo(x1 + Rp * 0.04, (y1 + ty) / 2 - Rp * 0.01, x1, y1);
      }
      g.closePath();
    };
    const hair = back ? hairBack : hairFront;
    g.save(); hair(); g.fillStyle = HAIR2_SH; g.fill(); g.clip(); g.translate(-Rp * 0.05, -Rp * 0.06); hair(); g.fillStyle = HAIR2; g.fill(); g.restore();
    // soft volume / strand lines inside the mass
    const strands: [P2, P2, P2][] = back
      ? [[[-0.5, -0.7], [-0.42, -0.35], [-0.5, 0.05]], [[-0.1, -0.85], [-0.02, -0.4], [-0.1, 0.12]], [[0.3, -0.78], [0.4, -0.35], [0.32, 0.08]], [[0.62, -0.5], [0.7, -0.2], [0.6, 0.06]]]
      : [[[-0.55, -0.62], [-0.3, -0.78], [-0.05, -0.66]], [[0.1, -0.74], [0.32, -0.86], [0.5, -0.66]], [[-0.62, -0.5], [-0.15, -0.58], [0.6, -0.52]]];
    strands.forEach((q) => { smoothOpen(g, q.map(([x, y]) => [x * Rp, y * Rp] as P2)); g.lineWidth = W_IN; g.strokeStyle = HAIR2_SH; g.stroke(); });
    ink(g, hair, W_MID);
    // 4) the sweatband: follows the forehead curve, slightly irregular edges, bulges a little past the silhouette, red stripe in the middle
    const bw = Math.sqrt(Math.max(0, Rp * Rp - bandY * bandY)) * 1.06, curve = back ? -Rp * 0.04 : Rp * 0.07;
    const band = () => smoothClosed(g, [[-bw, bandY - Rp * 0.13], [-bw * 0.5, bandY - Rp * 0.135 - curve * 0.8 + 1], [0, bandY - Rp * 0.145 - curve], [bw * 0.5, bandY - Rp * 0.13 - curve * 0.8], [bw, bandY - Rp * 0.12],
      [bw * 1.01, bandY + Rp * 0.12], [bw * 0.5, bandY + Rp * 0.135 - curve * 0.8], [0, bandY + Rp * 0.125 - curve], [-bw * 0.5, bandY + Rp * 0.135 - curve * 0.8 - 1], [-bw * 1.01, bandY + Rp * 0.13]]);
    if (!st.outfit?.helmet) { cel(g, band, "#FFFFFF", HEAD_SH, Rp * 0.025, W_MID);
    smoothOpen(g, [[-bw * 0.99, bandY], [-bw * 0.5, bandY - curve * 0.8], [0, bandY - curve - Rp * 0.005], [bw * 0.5, bandY - curve * 0.8 + 1], [bw * 0.99, bandY + Rp * 0.005]]); g.lineWidth = Rp * 0.095; g.strokeStyle = BAND_RED; g.stroke();
    ink(g, band, W_MID); }
    if (st.outfit?.balaclava) {                                               // black knit balaclava: covers hair + face, leaves an eye slit
      const mask = () => smoothClosed(g, blobPts(0, 0.02 * Rp, Rp * 1.035, Rp * 1.0, 9, 0.012, 14, headShape, -Math.PI / 2));
      cel(g, mask, "#25252e", "#121217", Rp * 0.1, W_OUT);
      g.lineWidth = W_IN * 0.8; g.strokeStyle = "#3b3b47";
      for (let i = 0; i < 5; i++) { smoothOpen(g, [[(-0.8 + i * 0.4) * Rp, -0.95 * Rp * (1 - 0.15 * Math.abs(i - 2))], [(-0.76 + i * 0.4) * Rp, -0.55 * Rp], [(-0.8 + i * 0.4) * Rp, -0.2 * Rp]]); g.stroke(); }
      if (!back) {
        const tx = turn * Rp * 0.4;
        const slit = () => smoothClosed(g, [[tx - 0.8 * Rp, -0.2 * Rp], [tx - 0.42 * Rp, -0.42 * Rp], [tx + 0.42 * Rp, -0.42 * Rp], [tx + 0.8 * Rp, -0.2 * Rp], [tx + 0.76 * Rp, 0.15 * Rp], [tx + 0.3 * Rp, 0.22 * Rp], [tx - 0.3 * Rp, 0.22 * Rp], [tx - 0.76 * Rp, 0.15 * Rp]]);
        slit(); g.fillStyle = head; g.fill(); ink(g, slit, W_MID);
        g.save(); slit(); g.clip(); drawFace2D(g, Rp, st.expression ?? "idle", clamp01(st.mouthOpen ?? 0), st.blink ?? autoBlink(st.t), 0, turn); g.restore();
      }
    }
    const OF = st.outfit ?? {}, castH = clamp01(OF.cast ?? 0);
    // 4b) costume: judge wig (white curls on both sides + the nape), then the yellow hard hat, then the plaster head bandage
    if (OF.wig) {
      const curl = (cx: number, cy: number, r: number, sd: number) => { const bp = () => blob(g, cx * Rp, cy * Rp, r * Rp, r * Rp * 1.08, sd, 0.07, 9); bp(); g.fillStyle = "#F3F1EC"; g.fill(); ink(g, bp, W_MID); smoothOpen(g, [[(cx - r * 0.4) * Rp, (cy - r * 0.1) * Rp], [(cx + r * 0.1) * Rp, (cy - r * 0.35) * Rp], [(cx + r * 0.4) * Rp, (cy + r * 0.05) * Rp]]); g.lineWidth = W_IN; g.strokeStyle = "#B9B4AC"; g.stroke(); };
      for (const s2 of [-1, 1]) [[1.02, -0.12, 0.26], [1.08, 0.18, 0.28], [1.04, 0.46, 0.26], [0.98, 0.7, 0.22], [0.92, 0.9, 0.17]].forEach(([x, y, r], i) => curl(s2 * x, y, r, 140 + i + (s2 > 0 ? 7 : 0)));
      if (back) for (let i = 0; i < 6; i++) curl(-0.75 + i * 0.3, 0.5 + 0.12 * (i % 2), 0.26, 170 + i);
    }
    if (OF.helmet) {
      const dome = () => smoothClosed(g, [[-1.1 * Rp, -0.5 * Rp], [-1.04 * Rp, -0.8 * Rp], [-0.8 * Rp, -1.12 * Rp], [-0.38 * Rp, -1.34 * Rp], [0.08 * Rp, -1.4 * Rp], [0.5 * Rp, -1.3 * Rp], [0.86 * Rp, -1.05 * Rp], [1.06 * Rp, -0.76 * Rp], [1.1 * Rp, -0.5 * Rp], [0.5 * Rp, -0.46 * Rp], [-0.5 * Rp, -0.47 * Rp]]);
      const brim = () => smoothClosed(g, [[-1.22 * Rp, -0.53 * Rp], [-0.7 * Rp, -0.6 * Rp], [0, -0.64 * Rp], [0.7 * Rp, -0.6 * Rp], [1.22 * Rp, -0.52 * Rp], [1.16 * Rp, -0.4 * Rp], [0.6 * Rp, -0.44 * Rp], [0, -0.4 * Rp], [-0.6 * Rp, -0.44 * Rp], [-1.15 * Rp, -0.4 * Rp]]);
      cel(g, dome, "#FFD21F", "#E3A400", Rp * 0.09, W_OUT * 0.9);
      const ridge = () => smoothClosed(g, [[-0.16 * Rp, -0.5 * Rp], [-0.12 * Rp, -1.0 * Rp], [-0.03 * Rp, -1.38 * Rp], [0.2 * Rp, -1.37 * Rp], [0.24 * Rp, -1.0 * Rp], [0.22 * Rp, -0.5 * Rp]]);
      cel(g, ridge, "#FFE066", "#F0B800", Rp * 0.04, W_MID);
      cel(g, brim, "#F2B800", "#C98F00", Rp * 0.03, W_MID);
    }
    if (OF.nightcap) {                                                          // classic striped nightcap: cone that droops to one side + fluffy cuff + pom-pom
      const dir = back ? -1 : 1;
      const cone = () => smoothClosed(g, [[-1.04 * Rp, -0.5 * Rp], [-0.98 * Rp, -0.9 * Rp], [-0.5 * Rp, -1.3 * Rp], [0.2 * Rp, -1.5 * Rp], [0.9 * Rp * dir, -1.45 * Rp], [1.55 * Rp * dir, -1.05 * Rp], [1.9 * Rp * dir, -0.55 * Rp], [1.7 * Rp * dir, -0.5 * Rp], [1.25 * Rp * dir, -0.85 * Rp], [0.95 * Rp, -0.95 * Rp], [1.06 * Rp, -0.5 * Rp], [0.0, -0.44 * Rp]]);
      cel(g, cone, "#D8343C", "#9E2229", Rp * 0.09, W_OUT * 0.9);
      g.save(); cone(); g.clip(); g.lineCap = "butt";
      for (let i = 0; i < 6; i++) { smoothOpen(g, [[(-1.1 + i * 0.5) * Rp, -0.4 * Rp], [(-0.8 + i * 0.5) * Rp * 1.0, -1.0 * Rp], [(-0.2 + i * 0.5) * Rp, -1.6 * Rp]]); g.lineWidth = 0.15 * Rp; g.strokeStyle = "#FFFFFF"; g.stroke(); }
      g.restore(); ink(g, cone, W_MID);
      const cuff = () => smoothClosed(g, [[-1.12 * Rp, -0.4 * Rp], [-1.1 * Rp, -0.62 * Rp], [-0.5 * Rp, -0.7 * Rp], [0.1 * Rp, -0.73 * Rp], [0.7 * Rp, -0.69 * Rp], [1.12 * Rp, -0.6 * Rp], [1.14 * Rp, -0.38 * Rp], [0.6 * Rp, -0.36 * Rp], [0.0 * Rp, -0.32 * Rp], [-0.6 * Rp, -0.35 * Rp]]);
      cel(g, cuff, "#FFFFFF", HEAD_SH, Rp * 0.03, W_MID);
      const pom = () => blob(g, 1.86 * Rp * dir, -0.4 * Rp, 0.2 * Rp, 0.19 * Rp, 77, 0.09, 10); cel(g, pom, "#FFFFFF", HEAD_SH, Rp * 0.04, W_MID);
    }
    if (castH > 0 && !back) {
      const wrap = () => smoothClosed(g, [[-1.0 * Rp, -0.7 * Rp], [-0.4 * Rp, -0.98 * Rp], [0.5 * Rp, -1.02 * Rp], [1.02 * Rp, -0.62 * Rp], [0.95 * Rp, -0.52 * Rp], [0.3 * Rp, -0.6 * Rp], [-0.5 * Rp, -0.56 * Rp], [-1.0 * Rp, -0.5 * Rp]]);
      cel(g, wrap, "#F4F1EA", "#D9D3CA", Rp * 0.05, W_MID);
      smoothOpen(g, [[-0.7 * Rp, -0.55 * Rp], [-0.1 * Rp, -0.75 * Rp], [0.6 * Rp, -0.7 * Rp]]); g.lineWidth = W_IN; g.strokeStyle = INK; g.stroke();
    }
    // 5) the face (front / 3-4 / profile only)
    if (!back && !OF.balaclava) drawFace2D(g, Rp, st.expression ?? "idle", clamp01(st.mouthOpen ?? 0), st.blink ?? autoBlink(st.t), st.sweat ?? 0, turn);
    if (!back && !OF.balaclava && (OF.eyeBags ?? 0) > 0.02) {                // dark eye bags under both eyes
      const k = Rp / 100, fx = turn * Rp * 0.42, bag = clamp01(OF.eyeBags ?? 0);
      for (const sg of [-1, 1]) { const x = fx + sg * 27 * k * (1 - 0.32 * Math.abs(turn)) * (sg * turn > 0 ? 0.82 : 1), w = 13 * k * (1 - 0.45 * Math.max(0, sg * turn)), y = -0.02 * Rp + 17 * k;
        smoothOpen(g, [[x - w, y - 2 * k], [x, y + 5 * k], [x + w, y - 2 * k]]); g.lineWidth = 9 * k; g.strokeStyle = `rgba(104,78,138,${0.9 * bag})`; g.stroke();
        smoothOpen(g, [[x - w * 0.9, y + 3 * k], [x, y + 10 * k], [x + w * 0.9, y + 2 * k]]); g.lineWidth = 2.6 * k; g.strokeStyle = INK; g.stroke(); }
    }
    if (OF.shades && !back) {                                                   // black sunglasses
      const k = Rp / 100, fx = turn * Rp * 0.42, ey = -0.02 * Rp;
      const X = (sg: number) => fx + sg * 27 * k * (1 - 0.32 * Math.abs(turn)) * (sg * turn > 0 ? 0.82 : 1), nar = (sg: number) => 1 - 0.45 * Math.max(0, sg * turn);
      smoothOpen(g, [[X(-1) + 6 * k, ey - 2 * k], [fx, ey - 4 * k], [X(1) - 6 * k, ey - 2 * k]]); g.lineWidth = 6 * k; g.strokeStyle = "#101014"; g.stroke();
      for (const sg of [-1, 1]) {
        const lens = () => smoothClosed(g, [[X(sg) - 19 * k * nar(sg), ey - 8 * k], [X(sg), ey - 12 * k], [X(sg) + 19 * k * nar(sg), ey - 8 * k], [X(sg) + 17 * k * nar(sg), ey + 12 * k], [X(sg), ey + 17 * k], [X(sg) - 17 * k * nar(sg), ey + 11 * k]]);
        lens(); g.fillStyle = "#101014"; g.fill(); ink(g, lens, 5 * k);
        smoothOpen(g, [[X(sg) - 11 * k * nar(sg), ey - 5 * k], [X(sg) - 5 * k * nar(sg), ey - 7 * k]]); g.lineWidth = 3 * k; g.strokeStyle = "rgba(255,255,255,.75)"; g.stroke();
        smoothOpen(g, [[X(sg) + sg * 19 * k * nar(sg), ey - 6 * k], [fx + sg * Rp * 0.93 * (1 - 0.3 * Math.abs(turn)), ey - 4 * k]]); g.lineWidth = 4.5 * k; g.strokeStyle = "#101014"; g.stroke();
      }
    }
    g.restore();
  }

  /** world position of a joint (for labels / fx / camera tracking) */
  anchor(name: "head" | "chest" | "handR" | "handL" | "pelvis" | "hipL" | "hipR" | "kneeL" | "kneeR" | "ankleL" | "ankleR", out = new THREE.Vector3()) {
    const o = name === "head" ? this.head : name === "chest" ? this.chest : name === "handR" ? this.hand.R : name === "handL" ? this.hand.L
      : name === "hipL" ? this.hip.L : name === "hipR" ? this.hip.R : name === "kneeL" ? this.knee.L : name === "kneeR" ? this.knee.R : name === "ankleL" ? this.ankle.L : name === "ankleR" ? this.ankle.R : this.pelvis;
    const q = o.getWorldPosition(out), X = q.x * Math.cos(this.view) + q.z * Math.sin(this.view) - this.ox, Y = q.y, a = this.card.rotation.y, sc = this.card.scale.x;
    return out.set(this.card.position.x + Math.cos(a) * X * sc, this.card.position.y + Y * sc, this.card.position.z - Math.sin(a) * X * sc);
  }
}

/** deterministic blinks: a 4-frame blink roughly every 2-4 s */
const autoBlink = (t: number) => { const f = Math.floor(t * 30); let s = 17; for (let n = 0; n < 60 && s <= f; n++) { const d = f - s; if (d < 4) return [0.5, 1, 1, 0.5][d]; s += 60 + ((n * 37) % 50); } return 0; };

/** mouth opening 0..1 from the voice track (use with @remotion/media-utils useAudioData + visualizeAudio) */
export const mouthFromSpectrum = (spectrum: number[]) => { let e = 0; const n = Math.min(spectrum.length, 24); for (let i = 2; i < n; i++) e += spectrum[i]; return clamp01((e / (n - 2)) * 9 - 0.05); };

// ---------------------------------------------------------------- React wrapper for @remotion/three scenes
export type TitoRigProps = TitoState;
export const TitoRig3D: React.FC<TitoRigProps> = (props) => {
  const rig = useMemo(() => new TitoRig(), []);
  const { camera } = useThree();
  rig.update(props, camera);
  return <primitive object={rig.object} dispose={null} />;
};
