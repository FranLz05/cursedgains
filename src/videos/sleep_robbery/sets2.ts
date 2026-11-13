// SLEEP ROBBERY, ACT 2 "La sala de control" (micro-scenes 7-13): the industrial control room of Tito's brain. Ambient #1A2238, one huge furnace emitting a warm #FFB84D
// point light + bloom (orange rim lights on the cards, long dark cast shadows). Cortisol / workers = TitoRig3D with accessories only. No geometric light cones.
import * as THREE from "three";
import { Kit, Puffs, Soft, Halo, hot, hh, clamp01, smooth, easeOut, easeIO, lerp, lam, tileTex, CYL, SPH, BOX } from "./kit";
import { Builder, Env } from "./world";
import { repM } from "./props";
import { NOINK } from "../alejandro/ink";
import { ctex } from "../alejandro/paint";
import { wordF } from "./story";

export const ENVP: Env = {
  lit: [1.5, 1.05, 0.55], shade: [0.17, 0.21, 0.36], lift: [0.03, 0.04, 0.09], bg: "#1A2238", fog: ["#1A2238", 16, 44], sun: [9, 4, 2], sunCol: "#FFB84D", sunI: 2.6, hemi: 0.02,
  tint: [0.9, 0.9, 1.0], key: [1.5, 0.95, 0.5], amb: [0.22, 0.26, 0.42], rim: [1.5, 0.75, 0.2],
};
type XYZ = [number, number, number];
const MX = 3.9;                                                                                   // furnace mouth x
const WORK = { helmet: true, shirt: "#3a7bd5" };
const BOSS = (m: number, extra = {}) => ({ shades: true, megaphone: m, shirt: "#2b2f40", ...extra });

/** the control room: steel floor, back wall with pipes + gauges, console with Tito's brain, wall clock 3:00 AM, ugly FAT barrels (left), the furnace (right) */
const room = (g: THREE.Group, k: Kit) => {
  k.floor(70, repM("plantFloor", () => tileTex("sleep_steel", "#4a5062", "#3d4252", "#20232c"), 16, 16));
  k.plane(70, 12, 0, 6, -5, lam("#454c68"));
  for (const x of [-6, -2, 2, 6]) k.cyl(0.28, 10, x, 5, -4.7, "#5a6278");
  k.cyl(0.22, 70, 0, 4.4, -4.6, "#6a7288", { rz: Math.PI / 2 }); k.cyl(0.18, 70, 0, 3.2, -4.6, "#5a6278", { rz: Math.PI / 2 });
  // brain on a console
  k.box(2.0, 1.0, 1.1, -4.6, 0.5, -3.6, "#2a2f3c"); k.box(1.6, 0.06, 0.8, -4.6, 1.03, -3.6, "#3f4660");
  for (const [x, y, z, r] of [[-4.9, 1.55, -3.6, 0.42], [-4.3, 1.6, -3.6, 0.42], [-4.6, 1.95, -3.6, 0.38], [-4.6, 1.45, -3.35, 0.4], [-4.6, 1.5, -3.85, 0.4]]) k.sph(r, r * 0.9, r, x, y, z, "#ff8fb0");
  k.glow(0.05, 0.05, 0.05, -1.4, 3.0, -3.0, "#ffffff").visible = false;
  const scope = ctex("sleep_scope", 128, 96, (gg) => { gg.fillStyle = "#03140c"; gg.fillRect(0, 0, 128, 96); gg.strokeStyle = "#2aff8a"; gg.lineWidth = 3; gg.beginPath(); for (let x = 0; x < 128; x += 4) gg.lineTo(x, 48 + 26 * Math.sin(x * 0.18) * Math.sin(x * 0.03)); gg.stroke(); });
  const gauge = ctex("sleep_gauge", 128, 128, (gg) => { gg.fillStyle = "#e8e4d8"; gg.beginPath(); gg.arc(64, 64, 60, 0, 7); gg.fill(); gg.strokeStyle = "#16181f"; gg.lineWidth = 6; gg.stroke(); gg.strokeStyle = "#e0342a"; gg.lineWidth = 5; gg.beginPath(); gg.moveTo(64, 64); gg.lineTo(100, 40); gg.stroke(); for (let a = 0; a < 9; a++) { gg.strokeStyle = "#16181f"; gg.lineWidth = 3; gg.beginPath(); gg.moveTo(64 + 46 * Math.cos(2.4 + a * 0.5), 64 + 46 * Math.sin(2.4 + a * 0.5)); gg.lineTo(64 + 56 * Math.cos(2.4 + a * 0.5), 64 + 56 * Math.sin(2.4 + a * 0.5)); gg.stroke(); } });
  const decal = (map: THREE.Texture, w: number, h: number, x: number, y: number, z: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, toneMapped: true })); m.position.set(x, y, z); m.layers.set(NOINK); g.add(m); return m; };
  [-2.2, 0.4, 2.6].forEach((x, i) => { k.box(1.5, 1.1, 0.1, x, 2.3, -4.9, "#15171e"); decal(scope, 1.35, 0.95, x, 2.3, -4.83); k.box(0.9, 0.35, 0.1, x, 1.2 + 0.0 * i, -4.9, "#2a2f3c"); });
  [-1.0, 1.4, 3.6].forEach((x) => decal(gauge, 0.7, 0.7, x, 3.9, -4.88));
  { const hz = ctex("sleep_hazard", 256, 64, (gg) => { gg.fillStyle = "#e8c020"; gg.fillRect(0, 0, 256, 64); gg.fillStyle = "#16181f"; for (let i = -2; i < 10; i++) { gg.beginPath(); gg.moveTo(i * 32, 64); gg.lineTo(i * 32 + 16, 64); gg.lineTo(i * 32 + 48, 0); gg.lineTo(i * 32 + 32, 0); gg.fill(); } });
    const hm = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: hz })); hm.position.set(0.5, 0.012, -2.4); hm.layers.set(NOINK); g.add(hm); }
  k.box(1.0, 1.0, 1.0, 6.4, 0.5, -3.0, "#7a5a32"); k.box(0.9, 0.9, 0.9, 6.5, 1.45, -3.1, "#8a6a3a"); k.box(1.0, 1.0, 1.0, -6.4, 0.5, -3.2, "#7a5a32");
  k.box(2.4, 1.1, 0.12, -4.6, 3.5, -4.9, "#16181f"); k.label("03:00 AM", 2.2, 0.9, -4.6, 3.5, -4.82, "#16181f", "#ff4a3a");
  // FAT barrels: dented olive drums, tilted, sloppy yellow label
  const barrel = (x: number, y: number, z: number, tilt: number, lab: boolean) => { const m = k.cyl(0.42, 0.9, x, y, z, "#5d6b3a", { rz: tilt }); k.cyl(0.435, 0.08, x, y + 0.3, z, "#3f4a26", { rz: tilt }); k.cyl(0.435, 0.08, x, y - 0.3, z, "#3f4a26", { rz: tilt }); if (lab) k.label("FAT", 0.62, 0.34, x, y, z + 0.44, "#e8c33a", "#2a1a0a").rotation.z = tilt; return m; };
  [[-3.95, 0.45, -0.9, 0.05], [-3.1, 0.45, -0.95, -0.04], [-2.25, 0.45, -0.9, 0.06]].forEach(([x, y, z, t]) => barrel(x, y, z, t, true));
  [[-3.5, 1.35, -0.95, -0.06], [-2.65, 1.35, -0.95, 0.05]].forEach(([x, y, z, t]) => barrel(x, y, z, t, true));
  barrel(-3.05, 2.25, -1.0, 0.1, true);
  // the furnace: iron body, chimney, arched mouth with a bright interior + a door slab
  k.box(3.4, 3.8, 2.2, MX, 1.9, -1.4, "#2c2f3a"); k.cyl(0.4, 3.2, MX + 0.6, 5.4, -1.8, "#2a2d36");
  k.box(1.9, 1.7, 0.2, MX, 1.0, -0.33, "#16181f"); k.box(1.7, 1.5, 0.1, MX, 0.95, -0.22, "#16181f").visible = false;
  const inner = k.glow(1.55, 1.3, 0.06, MX, 0.95, -0.27, hot("#ff9a30", 2.6));
  k.box(0.14, 1.6, 0.14, MX - 1.05, 1.0, -0.2, "#4a4f5e"); k.box(0.14, 1.6, 0.14, MX + 1.05, 1.0, -0.2, "#4a4f5e"); k.box(2.3, 0.14, 0.14, MX, 1.9, -0.2, "#4a4f5e");
  for (const x of [-1.2, -0.4, 0.4, 1.2]) k.box(0.1, 3.4, 0.08, MX + x, 1.9, -0.28, "#3a3e4c").position.y = 2.6;
  return { inner };
};
/** a luxurious tufted leather sofa labelled MUSCLE / GAINS; origin at its centre, front faces +z */
const makeSofa = (parent: THREE.Object3D) => {
  const g = new THREE.Group(), k = new Kit(g), L = "#6a3419", L2 = "#8a4a26";
  k.box(1.9, 0.42, 0.85, 0, 0, 0, L); k.box(0.9, 0.2, 0.7, -0.45, 0.3, 0.06, L2); k.box(0.9, 0.2, 0.7, 0.45, 0.3, 0.06, L2);
  k.box(1.9, 0.72, 0.22, 0, 0.5, -0.32, L); for (const s of [-1, 1]) k.box(0.2, 0.55, 0.85, s * 0.97, 0.2, 0, L2);
  for (let i = 0; i < 6; i++) k.sph(0.035, 0.035, 0.03, -0.75 + i * 0.3, 0.62, -0.2, "#e6c34a");
  for (const x of [-0.8, 0.8]) for (const z of [-0.3, 0.3]) k.cyl(0.04, 0.2, x, -0.3, z, "#e6c34a");
  k.label("MUSCLE", 1.5, 0.34, 0, 0.5, -0.2, "#e6c34a", "#3a1a0a"); k.label("GAINS", 0.9, 0.24, 0, 0.0, 0.44, "#e6c34a", "#3a1a0a");
  parent.add(g); return g;
};
const fireSet = (g: THREE.Group) => ({ fire: new Soft(g, 16, "#ff8a20"), sparks: new Soft(g, 10, "#ffd27a") });
const burn = (fire: Soft, sparks: Soft, cam: THREE.Camera, t: number, fl: number) => {
  fire.face(cam); sparks.face(cam);
  for (let j = 0; j < 16; j++) { const age = (t * 1.3 + j / 16) % 1, s = hh(j, 3); fire.set(j, MX + (s - 0.5) * 1.1, 0.35 + age * 1.0 * fl, -0.3 + 0.05 * s, (0.9 + 0.7 * (1 - age)) * (0.7 + 0.3 * fl), 0.35 * (1 - age)); }
  for (let j = 0; j < 10; j++) { const age = (t * 0.9 + j / 10) % 1, s = hh(j, 9); sparks.set(j, MX + (s - 0.5) * 1.4 + 0.3 * age, 0.7 + age * 1.8 * fl, -0.2, 0.16, 0.8 * (1 - age)); }
};
/** furnace light: real PointLight #FFB84D in front of the mouth + bloom halo; flickers, flares with `fl` */
const furnaceLight = (w: import("./world").World, halo: Halo, cam: THREE.Camera, t: number, fl = 1) => {
  const f = 0.9 + 0.1 * Math.sin(t * 17) + 0.06 * Math.sin(t * 29);
  w.pl[0].position.set(MX - 0.3, 1.2, 1.0); w.pl[0].color.set("#FFB84D"); w.pl[0].intensity = 3.4 * f * fl;
  halo.set(cam, MX, 1.0, -0.1, 4.2 * (0.9 + 0.1 * fl), 0.5 * f * Math.min(1.6, fl));
};
type Base = { cInf?: number; focus: XYZ };
const stage = (b: Base, run: (c: import("./world").Ctx, p: ReturnType<typeof ctxParts>) => void, extra?: (g: THREE.Group, k: Kit, p: ReturnType<typeof ctxParts>) => void): Builder => (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVP;
  room(g, k); const halo = new Halo(g, "#ffb04d"), { fire, sparks } = fireSet(g);
  const steam = new Soft(g, 8, "#9aa4c0");
  const p = { w, g, k, env, halo, fire, sparks, steam, boss: w.rig("cortisol"), w1: w.rig("w1"), w2: w.rig("w2"), v: new THREE.Vector3(), v2: new THREE.Vector3() };
  extra?.(g, k, p);
  return { g, env, cInf: b.cInf ?? 8, focus: (o) => o.set(...b.focus), update(c) { furnaceLight(w, halo, c.cam, c.t, 1); burn(fire, sparks, c.cam, c.t, 1); steam.face(c.cam); for (let j = 0; j < 8; j++) { const age = (c.t * 0.5 + j / 8) % 1; steam.set(j, -5 + 0.4 * Math.sin(j * 2.1) + 0.5 * age, 3.4 + 1.6 * age, -4.2, 0.5 + 0.7 * age, 0.12 * Math.sin(Math.PI * age)); } run(c, p); } };
};
declare const ctxParts: () => { w: import("./world").World; g: THREE.Group; k: Kit; env: Env; halo: Halo; fire: Soft; sparks: Soft; boss: import("./world").TitoRig; w1: import("./world").TitoRig; w2: import("./world").TitoRig; v: THREE.Vector3; v2: THREE.Vector3 };
const T3 = ENVP.tint;

// ================================================================ 7 "Welcome to your brain's control room at 3 AM." establishing: brain console, 3:00 AM clock, furnace glow, boss + crew
export const S7: Builder = stage({ focus: [0.6, 1.6, -0.8], cInf: 9 }, (c, p) => {
  p.w.put(p.boss, p.g, { action: "idle", t: c.t, position: [-0.3, 0, 0], yaw: 0.3, expression: "smug", outfit: BOSS(0), over: { R: { shFwd: 0.2, elbow: 1.3 } } } as never, c.cam, T3);
  p.w.put(p.w1, p.g, { action: "idle", t: c.t + 0.4, position: [1.3, 0, 0.2], yaw: -0.4, expression: "idle", outfit: WORK } as never, c.cam, T3);
  p.w.put(p.w2, p.g, { action: "idle", t: c.t + 1.1, position: [2.1, 0, 0.1], yaw: -0.5, expression: "idle", outfit: WORK } as never, c.cam, T3);
});
// ================================================================ 8 "Cortisol takes the megaphone" he raises the red megaphone to his mouth
export const S8: Builder = stage({ focus: [-0.9, 1.5, 0], cInf: 6 }, (c, p) => {
  const u = easeIO(clamp01((c.t - 0.2) / 0.7));
  p.w.put(p.boss, p.g, { action: "idle", t: c.t, position: [-0.9, 0, 0], yaw: 0.45, expression: "smug", mouthOpen: 0, outfit: BOSS(clamp01(u * 1.4)), over: { R: { shFwd: lerp(0.15, 1.25, u), elbow: lerp(0.3, 2.1, u), shOut: 0.2 }, L: { shFwd: 0.1, shOut: 0.35, elbow: 0.9 }, lean: -0.05 } } as never, c.cam, T3);
});
// ================================================================ 9 "and declares a state of emergency!" shouting, one arm up, red beacon, the crew flinch
export const S9: Builder = stage({ focus: [-0.6, 1.6, 0], cInf: 6 }, (c, p) => {
  const sh = c.t > 0.1 ? 1 : 0;
  p.w.put(p.boss, p.g, { action: "idle", t: c.t, position: [-0.9, 0, 0], yaw: 0.45, expression: "effort", mouthOpen: c.mouth, outfit: BOSS(1), over: { R: { shFwd: 1.25, elbow: 2.1, shOut: 0.2 }, L: { shFwd: 2.8, shOut: 0.4, elbow: 0.2 }, lean: -0.14 + 0.02 * Math.sin(c.t * 30) * sh } } as never, c.cam, T3);
  const ear = { shFwd: 2.3, elbow: 2.4, shOut: 0.35 };
  p.w.put(p.w1, p.g, { action: "idle", t: c.t, position: [0.9, 0, 0.1], yaw: -0.5, expression: "shocked", mouthOpen: 0.3, outfit: WORK, over: { L: ear, R: ear, squash: -0.04 * Math.abs(Math.sin(c.t * 9)) } } as never, c.cam, T3);
  p.w.put(p.w2, p.g, { action: "idle", t: c.t, position: [1.7, 0, 0], yaw: -0.5, expression: "shocked", mouthOpen: 0.3, outfit: WORK, over: { L: ear, R: ear, squash: -0.04 * Math.abs(Math.sin(c.t * 9 + 1)) } } as never, c.cam, T3);
  // emergency beacon (a lamp that flashes red; it only lights things, no cone)
  p.w.pl[1].position.set(-0.9, 3.6, 1.2); p.w.pl[1].color.set("#ff2a2a"); p.w.pl[1].intensity = 3.5 * (0.5 + 0.5 * Math.sin(c.t * 14));
  p.halo.mesh.visible = p.halo.mesh.visible;
}, (g, k) => { k.cyl(0.18, 0.3, -0.9, 3.6, -0.6, "#a01818"); k.gsph(0.2, -0.9, 3.8, -0.6, hot("#ff3a3a", 2.4)); k.box(0.1, 1.2, 0.1, -0.9, 4.3, -0.65, "#4a4f5e"); });
// ================================================================ 10 "To survive the night," Cortisol paces, hands behind his back; the crew salute
export const S10: Builder = stage({ focus: [0.4, 1.4, 0], cInf: 7 }, (c, p) => {
  const x = lerp(-1.6, 0.2, easeIO(clamp01(c.t / 1.8)));
  p.w.put(p.boss, p.g, { action: "walk", t: c.t, speed: 0.8, position: [x, 0, 0], yaw: Math.PI / 2 - 0.2, expression: "smug", outfit: BOSS(0, { megaphone: 0 }), over: { L: { shFwd: -0.35, elbow: 0.2, shOut: 0.1 }, R: { shFwd: -0.35, elbow: 0.2, shOut: 0.1 } } } as never, c.cam, T3);
  const sal = { shFwd: 2.1, elbow: 2.5, shOut: 0.2 };
  p.w.put(p.w1, p.g, { action: "idle", t: c.t, position: [1.5, 0, 0.1], yaw: -0.5, expression: "effort", outfit: WORK, over: { R: sal } } as never, c.cam, T3);
  p.w.put(p.w2, p.g, { action: "idle", t: c.t + 0.3, position: [2.3, 0, 0], yaw: -0.5, expression: "effort", outfit: WORK, over: { R: sal } } as never, c.cam, T3);
});
// ================================================================ 11 "he ignores the cheap fat barrels..." Cortisol strolls away from the FAT pile, flicking a bored hand
export const S11: Builder = stage({ focus: [-2.6, 1.3, -0.5], cInf: 7 }, (c, p) => {
  const x = lerp(-2.1, 0.0, easeIO(clamp01(c.t / 2.4)));
  p.w.put(p.boss, p.g, { action: "walk", t: c.t, speed: 0.7, position: [x, 0, 0.4], yaw: Math.PI / 2 - 0.15, expression: "smug", outfit: BOSS(0), over: { R: { shFwd: -0.9 + 0.5 * Math.sin(c.t * 5), elbow: 0.3, shOut: 0.25 } } } as never, c.cam, T3);
});
// ================================================================ 12 "and orders the crew to throw your expensive muscle furniture" two sweating workers haul the MUSCLE / GAINS leather sofa
export const S12: Builder = stage({ focus: [0.4, 1.2, 0], cInf: 7 }, (c, p) => {
  const x = lerp(-1.7, 0.8, easeIO(clamp01(c.t / 3.2))), arm = { shFwd: 1.15, elbow: 0.7, shOut: 0.25 };
  p.w.put(p.boss, p.g, { action: "idle", t: c.t, position: [-2.7, 0, 0.5], yaw: 0.3, expression: "smug", outfit: BOSS(1), over: { R: { shFwd: 1.9, shOut: 0.7, elbow: 0.1 }, L: { shFwd: 0.1, shOut: 0.35, elbow: 0.9 } } } as never, c.cam, T3);
  p.w.put(p.w1, p.g, { action: "walk", t: c.t, speed: 0.7, position: [x, 0, 0], yaw: Math.PI / 2, expression: "effort", sweat: 1, outfit: WORK, over: { L: arm, R: arm, lean: 0.12 } } as never, c.cam, T3);
  p.w.put(p.w2, p.g, { action: "walk", t: c.t + 0.3, speed: 0.7, position: [x + 2.4, 0, 0], yaw: Math.PI / 2, expression: "effort", sweat: 1, outfit: WORK, over: { L: arm, R: arm, lean: 0.12 } } as never, c.cam, T3);
  p.w.wa(p.w1, "handR", p.v); p.w.wa(p.w2, "handL", p.v2);
  const s = (p as unknown as { sofa: THREE.Group }).sofa; s.visible = true; s.scale.setScalar(0.78); s.position.set((p.v.x + p.v2.x) / 2, (p.v.y + p.v2.y) / 2 - 0.1, -0.5); s.rotation.set(0, 0, 0.03 * Math.sin(c.t * 8));
}, (g, k, p) => { (p as unknown as { sofa: THREE.Group }).sofa = makeSofa(g); });
// ================================================================ 13 "straight into the furnace!" heave -> the sofa flies into the flames, fire flares, Cortisol robotic thumbs-up
export const S13: Builder = stage({ focus: [1.9, 1.3, 0], cInf: 8 }, (c, p) => {
  const T0 = 0.85, T1 = 1.5, thrown = c.t > T0, u = clamp01((c.t - T0) / (T1 - T0)), fl = c.t > T1 ? 1 + 2.4 * Math.exp(-(c.t - T1) * 2.2) : 1;
  const hold = { shFwd: 1.15, elbow: 0.7, shOut: 0.25 }, up = { shFwd: 2.7, elbow: 0.3, shOut: 0.45 }, a = thrown ? up : hold;
  const lunge = thrown ? 0.2 * Math.exp(-(c.t - T0) * 4) : 0.05 * Math.sin(c.t * 7);
  p.w.put(p.w1, p.g, { action: "idle", t: c.t, position: [1.3, 0, 0], yaw: Math.PI / 2, expression: "effort", sweat: 1, outfit: WORK, over: { L: a, R: a, lean: 0.12 + lunge, lift: thrown ? 0.1 * Math.sin(Math.PI * clamp01((c.t - T0) / 0.6)) : 0 } } as never, c.cam, T3);
  p.w.put(p.w2, p.g, { action: "idle", t: c.t + 0.3, position: [3.3, 0, 0], yaw: Math.PI / 2, expression: "effort", sweat: 1, outfit: WORK, over: { L: a, R: a, lean: 0.12 + lunge, lift: thrown ? 0.1 * Math.sin(Math.PI * clamp01((c.t - T0 + 0.05) / 0.6)) : 0 } } as never, c.cam, T3);
  const q = Math.floor(c.t * 5) / 5, rob = c.t > T1 ? easeIO(clamp01((Math.floor(c.t * 6) / 6 - T1) / 0.5)) : 0;       // stepped = robotic
  p.w.put(p.boss, p.g, { action: "idle", t: c.t, position: [0.0, 0, 0.6], yaw: 0.35, expression: "smug", outfit: BOSS(0, { thumbs: rob }), over: { R: { shFwd: lerp(0.2, 0.95, rob), elbow: lerp(0.4, 1.5, rob), shOut: 0.3 } } } as never, c.cam, T3);
  void q;
  const s = (p as unknown as { sofa: THREE.Group }).sofa;
  if (!thrown) { p.w.wa(p.w1, "handR", p.v); p.w.wa(p.w2, "handL", p.v2); s.visible = true; s.position.set((p.v.x + p.v2.x) / 2, (p.v.y + p.v2.y) / 2 - 0.1, -0.5); s.rotation.set(0, 0, 0); s.scale.setScalar(0.78); }
  else if (u < 1) { const e = easeOut(u), sx = 1.8, sy = 1.0; s.visible = true; s.position.set(lerp(sx, MX, e), lerp(sy, 1.0, e) + 1.4 * 4 * u * (1 - u), lerp(-0.5, -0.2, e)); s.rotation.set(0, 0, -6 * u); s.scale.setScalar(0.78 * (1 - 0.35 * u)); }
  else s.visible = false;
  burn(p.fire, p.sparks, c.cam, c.t, fl); furnaceLight(p.w, p.halo, c.cam, c.t, fl);
}, (g, k, p) => { (p as unknown as { sofa: THREE.Group }).sofa = makeSofa(g); });
void hh; void smooth; void CYL; void SPH; void BOX; void NOINK; void wordF;
