// Worlds for "The Spot Reduction Myth" (Short 4): the medieval torture chamber (scenes 1 and 5) with a robotic arm holding a giant blowtorch,
// and the dark pool room with the BODY FAT POOL (scene 4). Scenes 2 and 3 are SVG diagrams (see Soplete.tsx).
// Same look as the other PumpParadox shorts: dark 3D set, dramatic warm light, flat 2D cel-shaded Tito. Every character card keeps a FIXED yaw (0):
// it is planted on the 3D floor with a contact blob and never turns toward the camera (no billboard effect).
import * as THREE from "three";
import { Pen } from "../alejandro/toon";
import { titoFront } from "./titoS";
import { titoCrunch, bellyOnCard } from "./titoLying";
import { pigeonSafety, NOZZLE } from "./pigeonSafety";
import { Pool, Actor, Fx, Stage, tier, light2D, blob, BODY, WIDE, SU } from "../alejandro/troop";
import { NOINK } from "../alejandro/ink";
import { LIGHTS, LOOK, LightPreset, WorldLook } from "../alejandro/lights";
import { TONE, CHAR, twoTone, untone } from "../alejandro/shade";
import { ctex, rep, brick, chainTex } from "../alejandro/paint";
import { FPS, SHOTS, camAt, smooth, uOf, sceneStart, tsOf, clamp01, V3 } from "./story";

const GL: LightPreset = { ...LIGHTS.day, el: 62, lit: [0.27, 0.2, 0.15], shade: [0.04, 0.035, 0.08], lift: [0.02, 0.03, 0.1], lambert: 0.45, sideK: 0.7, term: 0.12,
  charTint: [1.08, 0.92, 0.78], charShade: 0.6, charGrad: 0.1, bodyGrad: 0.3, sideTint: [0.62, 0.74, 1.15], fog: "#150b10", sunCol: "#ffc27a", sunI: 2.7,
  sky: "#2a1a2a", ground: "#150b10", hemiI: 0.06, actorShadow: false, bias: -0.0004, normalBias: 0.02 };
const GP: LightPreset = { ...GL, el: 74, lit: [0.3, 0.3, 0.26], shade: [0.03, 0.05, 0.1], lift: [0.015, 0.045, 0.12], charTint: [1.0, 0.97, 0.88], fog: "#06141c", sunCol: "#e8f4ff", sunI: 3.0, sky: "#10303c", ground: "#06141c" };
const GK: WorldLook = { ...LOOK.day, sky: { c: ["#1c1020", "#150b1a", "#10081a", "#0b0614", "#07040e"], e: [0, 4, 10, 20, 40] }, sat: 1.0 };
const GKP: WorldLook = { ...LOOK.day, sky: { c: ["#0c2230", "#0a1a28", "#08141f", "#060e18", "#040a12"], e: [0, 4, 10, 20, 40] }, sat: 1.0 };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lam = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const q2 = (x: number) => Math.round(x * 2) / 2, q8 = (x: number) => Math.round(x * 8) / 8, q10 = (x: number) => Math.round(x * 10) / 10, q12 = (x: number) => Math.round(x * 12) / 12, q20 = (x: number) => Math.round(x * 20) / 20;

// ---------------- timing shared with the overlays (seconds into each scene) ----------------
export const REP_FRAMES = 6;                    // one crunch every 6 frames = 5 reps per second: "supersonic"
/** scene 1: crunch phase 0..1 -> `up` (0 flat, 1 top of the rep) */
export const FIRE_T = 2.0;                      // seconds: the robotic arm bursts in, the fire starts, the crunches go frantic
export const crunchUp = (f: number) => (f < FIRE_T * FPS ? q12(0.5 - 0.5 * Math.cos((2 * Math.PI * f) / 40)) : q12(0.5 - 0.5 * Math.cos((2 * Math.PI * ((f - FIRE_T * FPS) % REP_FRAMES)) / REP_FRAMES)));
/** scene 1 counter: runs up to 9,999 by the time the narrator says "Smart move, right?" */
export const counterAt = (ts: number) => (ts < FIRE_T ? Math.floor(ts * 40) : Math.min(9999, 80 + Math.floor(9919 * Math.pow(clamp01((ts - FIRE_T) / 6.9), 1.6))));
export const T5_PIGEON = 4.7, T5_SPRAY = 6.35, T5_OUT = 7.05, T5_SIGN = 8.9;
/** the torch: tip (nozzle), flame direction (unit, screen plane) and flame length/intensity, per scene and frame */
export const BELLY5: V3 = [-1.35, 0.98, 0.1];
export const PIGEON_X = 0.95;
export const torchAt = (id: number, f: number) => {
  const ts = tsOf(id, f), t = f / FPS;
  if (id === 1) {
    const k = smooth((ts - FIRE_T) / 0.22), lunge = 0.1 * Math.sin(f * 0.37), tip: V3 = [0.72 + lunge + 2.2 * (1 - k), 0.86 + 0.05 * Math.sin(f * 0.61) + 3.2 * (1 - k), 0.34];
    const tx = -0.12, ty = 0.5, dx = tx - tip[0], dy = ty - tip[1], l = Math.hypot(dx, dy);
    return { tip, dir: [dx / l, dy / l] as [number, number], len: 1.0 + 0.08 * Math.sin(f * 1.7), on: ts >= FIRE_T + 0.12 ? 1 : 0 };
  }
  const out = 1 - smooth((ts - T5_OUT) / 0.7), droop = smooth((ts - T5_OUT - 0.3) / 1.2);
  const tip: V3 = [lerp(-0.05, 0.3, droop) + 0.05 * Math.sin(t * 3), lerp(1.9, 1.45, droop) + 0.04 * Math.sin(t * 4.1), 0.34];
  const dx = BELLY5[0] - tip[0], dy = BELLY5[1] - tip[1], l = Math.hypot(dx, dy);
  return { tip, dir: [dx / l, dy / l] as [number, number], len: (l * 0.97) * (1 + 0.05 * Math.sin(f * 1.9)), on: out };
};

// ---------------- dust / embers in the light ----------------
const DUST = { n: 3200, b: 24, h: 9 };
const DUST_VS = `
attribute vec4 aSeed; uniform float uT; uniform vec3 uCam; uniform float uPx; varying float vA; varying float vTint;
void main() {
  float B = ${DUST.b.toFixed(1)}, H = ${DUST.h.toFixed(1)};
  vec3 p = position;
  p.y = mod(p.y + uT * (0.05 + 0.16 * aSeed.x), H);
  p.x += sin(uT * (0.25 + 0.4 * aSeed.y) + aSeed.z * 30.0) * 0.5 + uT * 0.06;
  p.z += cos(uT * (0.2 + 0.4 * aSeed.z) + aSeed.w * 30.0) * 0.5;
  p.xz = uCam.xz + mod(p.xz - uCam.xz + 0.5 * B, B) - 0.5 * B;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float big = step(0.93, aSeed.w);
  float sz = mix(0.012, 0.03, aSeed.y) + big * 0.07;
  gl_PointSize = clamp(sz * uPx / max(0.1, -mv.z), 1.5, 60.0);
  float life = p.y / H;
  vA = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.7, 1.0, life)) * (0.55 + 0.45 * sin(uT * (1.5 + 3.0 * aSeed.x) + aSeed.z * 50.0)) * mix(1.0, 0.4, big);
  vA *= smoothstep(0.5, 1.5, -mv.z);
  vTint = aSeed.x;
  gl_Position = projectionMatrix * mv;
}`;
const DUST_FS = `
varying float vA; varying float vTint;
void main() {
  vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float core = exp(-r * r * 3.0);
  vec3 c = mix(vec3(1.0, 0.62, 0.3), vec3(1.0, 0.82, 0.55), step(0.5, vTint));
  gl_FragColor = vec4(c * core * vA * 0.8, 1.0);
}`;
const radial = (key: string, stops: [number, string][]) => ctex(key, 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- builders ----------------
const mkBox = (P: THREE.Object3D) => (w: number, h: number, d: number, x: number, y: number, z: number, color: string, cast = true, map?: THREE.Texture) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(map ? { map, color } : { color }));
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; P.add(m); return m;
};
const mkCyl = (P: THREE.Object3D) => (r: number, h: number, x: number, y: number, z: number, color: string, rx = 0, rz = 0, r2?: number) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, h, 24), lam({ color }));
  m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; m.receiveShadow = true; P.add(m); return m;
};
/** place a unit-height cylinder between two points */
const between = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number) => {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length() || 1e-3;
  m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(r, L, r);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.divideScalar(L));
};

// ---------------- cartoon fire / foam / smoke cards ----------------
const INKC = "#0d0b12";
/** a flame lying along +x: root at the left (narrow nozzle), tip at the right (canvas 512 x 256), smooth licking tongues */
const tongue = (p: Pen, ph: number, L: number, Wm: number, off: number, col: string, ol: number, seed = 0) => {
  const cy = 128, n = 28, up: [number, number][] = [], dn: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, prof = u < 0.32 ? Math.sin((Math.PI / 2) * (u / 0.32)) ** 0.8 : Math.cos((Math.PI / 2) * ((u - 0.32) / 0.68)) ** 1.15;
    const w = Wm * prof * (1 + 0.14 * Math.sin(ph * 6.283 + u * 13 + seed)), c = off + 16 * u * Math.sin(ph * 6.283 + u * 8 + seed * 2);
    const x = 10 + u * L; up.push([x, cy + c - w]); dn.push([x, cy + c + w]);
  }
  p.poly([...up, ...dn.reverse()], col, ol);
};
const drawFlame = (p: Pen, ph: number, k: number) => {
  p.ol = 7; p.rot = null;
  tongue(p, ph + 0.5, 410 * k, 52, -52, "#FF5A1F", 6, 3);
  tongue(p, ph + 0.2, 380 * k, 48, 56, "#FF5A1F", 6, 5);
  tongue(p, ph, 500 * k, 98, 0, "#FF5A1F", 8, 0);
  tongue(p, ph + 0.1, 440 * k, 72, 0, "#FF9B1F", 0, 1);
  tongue(p, ph + 0.3, 360 * k, 46, 0, "#FFE066", 0, 2);
  tongue(p, ph + 0.6, 230 * k, 24, 0, "#FFF8DC", 0, 4);
  for (let i = 0; i < 6; i++) { const q = (ph + i / 6) % 1; p.dot(120 + 380 * q, 128 + 84 * Math.sin(i * 2.3 + ph * 5), 4 + (i % 2) * 3, i % 2 ? "#FFC93C" : "#FF7A1A"); }
};
/** a small upright torch flame (canvas 128 x 256), tip up */
const drawTorchFlame = (p: Pen, ph: number) => {
  p.ol = 5; p.rot = null;
  const w = 6 * Math.sin(ph * 6.28);
  p.poly([[64, 250], [22, 190], [30, 130 + w], [50, 96], [64 + w, 14], [80, 96], [100, 130 - w], [106, 190]], "#FF5A1F", 6);
  p.poly([[64, 240], [38, 196], [44, 150], [64 + w * 0.6, 62], [84, 150], [90, 196]], "#FF9B1F", 0);
  p.poly([[64, 232], [50, 200], [64 + w * 0.3, 130], [78, 200]], "#FFE066", 0);
};
/** fluffy puff (smoke or extinguisher foam) on a 256 x 256 card */
const drawPuff = (p: Pen, seed: number, foam: boolean) => {
  p.ol = 8; p.rot = null;
  const base = foam ? "#F4F8FF" : "#4A4A56", sh = foam ? "#C9D6EC" : "#2E2E38";
  const bl: [number, number, number][] = [[128, 140, 78], [76 + seed * 8, 150, 52], [180 - seed * 6, 152, 56], [112, 92, 52], [156, 98, 46]];
  bl.forEach(([x, y, r], i) => p.ell(x, y, r, r * 0.9, i ? base : sh, 8));
  bl.forEach(([x, y, r]) => p.ell(x - r * 0.1, y - r * 0.12, r * 0.78, r * 0.7, base, 0));
};

const LOCKER_UNUSED = 0; void LOCKER_UNUSED;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private skyMat: THREE.ShaderMaterial; private sky: THREE.Mesh;
  private fog = new THREE.Fog("#150b10", 60, 400);
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private sph = new THREE.Sphere(); private v = new THREE.Vector3();
  private dust = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uPx: { value: 1000 } }; private pools: THREE.Mesh[] = []; private shafts: THREE.Mesh[] = [];
  private chamber = new THREE.Group(); private poolG = new THREE.Group();
  // robotic arm
  private arm = new THREE.Group(); private armParts: { upper: THREE.Mesh; fore: THREE.Mesh; j1: THREE.Mesh; j2: THREE.Mesh; j3: THREE.Mesh; tank: THREE.Mesh; nozzle: THREE.Mesh; ring: THREE.Mesh };
  private glows: THREE.Mesh[] = [];
  // pool
  private liquid!: THREE.Mesh; private liquidTop!: THREE.Mesh; private swirl!: THREE.Mesh; private floatRing!: THREE.Mesh; private liquidTex!: THREE.Texture; private swirlTex!: THREE.Texture;

  constructor() {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#e8f0ff", "#b49a78", 1.0);
    this.sun = new THREE.DirectionalLight("#fff1d6", 3.0);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target, this.chamber, this.poolG, this.arm);

    // =============================================================== TORTURE CHAMBER (scenes 1 and 5)
    {
      const C = this.chamber, box = mkBox(C), cyl = mkCyl(C);
      const flags = ctex("dungFlags", 1024, 1024, (g, r) => {
        g.fillStyle = "#0f0b10"; g.fillRect(0, 0, 1024, 1024);
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
          const v = 52 + Math.floor(r() * 30); g.fillStyle = `rgb(${v + 6},${v},${v + 14})`; g.fillRect(i * 128 + 4, j * 128 + 4, 120, 120);
          g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(i * 128 + 8, j * 128 + 8, 70, 6);
          g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 3; g.beginPath(); const x = i * 128 + 20 + r() * 80, y = j * 128 + 20 + r() * 80; g.moveTo(x, y); g.lineTo(x + 30 * (r() - 0.5), y + 40 * (r() - 0.3)); g.stroke();
        }
        g.fillStyle = "rgba(120,10,16,.35)"; for (let s = 0; s < 5; s++) { g.beginPath(); g.ellipse(120 + r() * 800, 120 + r() * 800, 30 + r() * 50, 14 + r() * 30, r() * 3, 0, 7); g.fill(); }   // old stains
      });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 34).rotateX(-Math.PI / 2), lam({ map: rep(flags, 10, 8.5) }));
      floor.receiveShadow = true; C.add(floor);
      const bk = brick();
      const wallM = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam({ map: rep(bk, w / 5, h / 3.5), color: "#5e4a48", side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; C.add(m); return m;
      };
      wallM(40, 8, 0, 4, -5.2, 0); wallM(34, 8, -9, 4, 8, Math.PI / 2); wallM(34, 8, 9, 4, 8, -Math.PI / 2); wallM(40, 8, 0, 4, 25, 0);
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 34).rotateX(Math.PI / 2), lam({ color: "#1a1216", side: THREE.DoubleSide })); ceil.position.set(0, 7.0, 8); C.add(ceil);
      // stone arches on the back wall with iron bars (cells)
      const archT = ctex("dungArch", 256, 384, (g) => {
        g.fillStyle = "#07050a"; g.beginPath(); g.moveTo(10, 384); g.lineTo(10, 140); g.arc(128, 140, 118, Math.PI, 0); g.lineTo(246, 384); g.closePath(); g.fill();
        g.strokeStyle = "#5b6070"; g.lineWidth = 9; for (let x = 40; x < 240; x += 36) { g.beginPath(); g.moveTo(x, 384); g.lineTo(x, 60 + Math.abs(128 - x) * 0.5); g.stroke(); }
        g.beginPath(); g.moveTo(10, 220); g.lineTo(246, 220); g.stroke(); g.beginPath(); g.moveTo(10, 320); g.lineTo(246, 320); g.stroke();
        g.strokeStyle = "#2a2230"; g.lineWidth = 16; g.beginPath(); g.moveTo(10, 384); g.lineTo(10, 140); g.arc(128, 140, 118, Math.PI, 0); g.lineTo(246, 384); g.stroke();
      });
      for (const x of [-6.2, 0, 6.2]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.9), new THREE.MeshBasicMaterial({ map: archT, transparent: true, alphaTest: 0.4 })); m.position.set(x, 1.95, -5.12); m.layers.set(NOINK); C.add(m); }
      // wall torches (animated flame cards are drawn in update)
      for (const [x, z, ry] of [[-3.1, -5.1, 0], [3.1, -5.1, 0], [-8.9, 0.5, Math.PI / 2], [8.9, 0.5, -Math.PI / 2], [-8.9, 7, Math.PI / 2], [8.9, 7, -Math.PI / 2]] as const) {
        const grp = new THREE.Group(); grp.position.set(x, 2.5, z); grp.rotation.y = ry;
        const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), lam({ color: "#2b2530" })); b1.rotation.x = Math.PI / 2.6; b1.position.set(0, -0.05, 0.22); grp.add(b1);
        const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.07, 0.5, 12), lam({ color: "#5a3b2a" })); b2.position.set(0, 0.2, 0.42); b2.castShadow = true; grp.add(b2);
        C.add(grp);
      }
      // iron maiden (left), the rack (right), barrel, skulls, chains, shackles
      box(1.15, 2.4, 0.95, -4.3, 1.2, -3.8, "#3a3e4a"); box(0.85, 1.8, 0.1, -4.3, 1.35, -3.3, "#4a4f5e", true);
      const eyeM = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), lam({ color: "#0c0a10" })); eyeM.position.set(-4.43, 1.95, -3.22); C.add(eyeM);
      const eyeM2 = eyeM.clone(); eyeM2.position.x = -4.17; C.add(eyeM2);
      for (let i = 0; i < 9; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.34, 8), lam({ color: "#aeb4c2" })); sp.rotation.x = Math.PI / 2; sp.position.set(-4.62 + (i % 3) * 0.32, 0.9 + Math.floor(i / 3) * 0.4, -3.15); C.add(sp); }
      for (const dx of [-1.15, 1.15]) for (const dz of [-0.55, 0.55]) box(0.16, 0.7, 0.16, 4.8 + dx, 0.35, -3.6 + dz, "#5a3b2a");
      box(2.7, 0.14, 1.4, 4.8, 0.75, -3.6, "#6b4a32"); cyl(0.16, 1.5, 3.55, 0.92, -3.6, "#4a3426", Math.PI / 2, 0); cyl(0.16, 1.5, 6.05, 0.92, -3.6, "#4a3426", Math.PI / 2, 0);
      cyl(0.5, 0.1, 3.55, 0.92, -2.78, "#3a3e4a", Math.PI / 2, 0);
      cyl(0.45, 0.95, -6.1, 0.48, -2.6, "#6b4a32"); for (const y of [0.2, 0.75]) cyl(0.47, 0.06, -6.1, y, -2.6, "#2f3340");
      for (let i = 0; i < 6; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), lam({ color: "#d9d2bd" })); k.position.set(6.4 + hh(i, 3) * 0.7, 0.17 + (i > 3 ? 0.26 : 0), -1.0 + hh(i, 4) * 0.9); k.castShadow = true; C.add(k); }
      const ch = chainTex();
      for (const [x, z, len] of [[-2.6, -3.9, 4.6], [2.4, -4.2, 5.2], [-7, -3.6, 3.8], [7.3, -1.4, 4.2], [-0.4, -4.6, 5.8]] as const) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, len, 0.09), lam({ map: rep(ch, 1, len * 2.2), color: "#8a8f9c" })); m.position.set(x, 7 - len / 2, z); C.add(m);
      }
      for (const x of [-1.1, 1.1]) { cyl(0.16, 0.06, x, 3.0, -5.1, "#6b7080", Math.PI / 2, 0); cyl(0.2, 0.08, x, 3.0, -5.14, "#3a3e4a", Math.PI / 2, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.05), lam({ map: rep(ch, 1, 2.4), color: "#8a8f9c" })); m.position.set(x, 2.35, -5.0); C.add(m); }
      box(0.9, 0.5, 0.9, 5.4, 0.25, 1.6, "#3a2c22"); const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), lam({ color: "#e4dcc4" })); skull.position.set(5.4, 0.7, 1.6); skull.castShadow = true; C.add(skull);
      void cyl;
    }

    // =============================================================== ROBOTIC ARM (ceiling gantry) with the giant blowtorch
    {
      const A = this.arm, steel = lam({ color: "#b9c0cf" }), yellow = lam({ color: "#F2B900" }), dark = lam({ color: "#23262f" });
      const mkC = (mat: THREE.Material, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, seg), mat); m.castShadow = true; A.add(m); return m; };
      const mkS = (r: number, mat: THREE.Material) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat); m.castShadow = true; A.add(m); return m; };
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.9, 20), steel); col.position.set(3.0, 6.05, -1.2); A.add(col);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.45), dark); rail.position.set(0, 6.85, -1.2); A.add(rail);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 24), yellow); plate.position.set(3.0, 5.1, -1.2); A.add(plate);
      this.armParts = { upper: mkC(steel), fore: mkC(steel), j1: mkS(0.34, yellow), j2: mkS(0.28, yellow), j3: mkS(0.22, dark), tank: mkC(new THREE.MeshLambertMaterial({ color: "#c0353a" })), nozzle: mkC(dark), ring: mkC(yellow) };
      this.armParts.j1.position.set(3.0, 4.95, -1.2);
    }

    // =============================================================== POOL ROOM (scene 4)
    {
      const P = this.poolG, box = mkBox(P);
      const tiles = ctex("poolTiles", 512, 512, (g, r) => {
        g.fillStyle = "#04121a"; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = ["#1f5a6a", "#1a4f5e", "#246a7a"][(i * 5 + j * 3 + Math.floor(r() * 3)) % 3]; g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58); g.fillStyle = "rgba(255,255,255,0.1)"; g.fillRect(i * 64 + 6, j * 64 + 6, 22, 4); }
      });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 34).rotateX(-Math.PI / 2), lam({ map: rep(tiles, 14, 12), color: "#7fa8b4" }));
      floor.receiveShadow = true; P.add(floor);
      const wallT = ctex("poolWall", 512, 512, (g, r) => {
        g.fillStyle = "#0d2f3a"; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = ["#d9eef0", "#cbe5e8", "#e3f3f4"][(i + j * 2 + Math.floor(r() * 2)) % 3]; g.fillRect(i * 128 + 4, j * 128 + 4, 120, 120); }
      });
      const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), lam({ map: rep(wallT, 10, 2.3), color: "#5b7f88", side: THREE.DoubleSide })); back.position.set(0, 4.5, -6.2); back.receiveShadow = true; P.add(back);
      for (const sx of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(34, 9), lam({ map: rep(wallT, 8, 2.3), color: "#5b7f88", side: THREE.DoubleSide })); sw.position.set(sx * 11, 4.5, 8); sw.rotation.y = Math.PI / 2; P.add(sw); }
      // basin walls (open at the front like a cutaway aquarium) + a back wall with measuring ticks
      const WALL = 1.8, X0 = 2.4, Z0 = -3.0, Z1 = 1.2;
      box(0.3, WALL, Z1 - Z0 + 0.3, -X0 - 0.15, WALL / 2, (Z0 + Z1) / 2, "#d9eef0"); box(0.3, WALL, Z1 - Z0 + 0.3, X0 + 0.15, WALL / 2, (Z0 + Z1) / 2, "#d9eef0");
      box(2 * X0 + 0.6, WALL, 0.3, 0, WALL / 2, Z0 - 0.15, "#cfe7ea");
      box(2 * X0 + 0.6, 0.12, 0.34, 0, 0.06, Z1 + 0.1, "#9bc2c9", false);                      // low front lip
      const gauge = ctex("poolGauge", 64, 512, (g) => {
        g.fillStyle = "#f4f6fa"; g.fillRect(0, 0, 64, 512);
        for (let i = 0; i < 17; i++) { g.fillStyle = i % 4 === 0 ? "#111114" : "#EF4444"; g.fillRect(0, i * 30, i % 4 === 0 ? 64 : 36, 6); }
      });
      const gm = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1.55), new THREE.MeshBasicMaterial({ map: gauge })); gm.position.set(X0 - 0.2, 0.84, Z0 + 0.04); gm.layers.set(NOINK); P.add(gm);
      // the liquid: translucent yellow volume (front face + top), scrolling bubble texture
      this.liquidTex = ctex("fatLiquid", 512, 512, (g, r) => {
        g.fillStyle = "#F2C200"; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,${230 + Math.floor(r() * 25)},120,${0.2 + r() * 0.3})`; g.beginPath(); g.arc(r() * 512, r() * 512, 4 + r() * 16, 0, 7); g.fill(); }
        g.strokeStyle = "rgba(160,100,0,.35)"; g.lineWidth = 3; for (let i = 0; i < 10; i++) { g.beginPath(); const y = r() * 512; g.moveTo(0, y); g.bezierCurveTo(150, y + 20, 350, y - 20, 512, y + 6); g.stroke(); }
      });
      this.liquidTex.wrapS = this.liquidTex.wrapT = THREE.RepeatWrapping;
      const lmat = new THREE.MeshBasicMaterial({ map: this.liquidTex, color: "#ffd84a", transparent: true, opacity: 0.55, depthWrite: false });
      this.liquid = new THREE.Mesh(new THREE.BoxGeometry(2 * X0 - 0.02, 1, Z1 - Z0 - 0.1), lmat);
      this.liquid.renderOrder = 3; this.liquid.layers.set(NOINK); P.add(this.liquid);
      this.liquidTop = new THREE.Mesh(new THREE.PlaneGeometry(2 * X0 - 0.02, Z1 - Z0 - 0.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.liquidTex, color: "#fff2a8", transparent: true, opacity: 0.92, depthWrite: false }));
      this.liquidTop.renderOrder = 4; this.liquidTop.layers.set(NOINK); P.add(this.liquidTop);
      // drain: dark ring + swirl disc on the basin floor
      this.swirlTex = ctex("drainSwirl", 256, 256, (g) => {
        g.fillStyle = "#06090e"; g.beginPath(); g.arc(128, 128, 128, 0, 7); g.fill();
        g.strokeStyle = "#8d949c"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.stroke();
        g.strokeStyle = "#5b6070"; g.lineWidth = 7; for (let k = 0; k < 4; k++) { g.beginPath(); for (let t = 0; t < 4.5; t += 0.1) { const r = 12 + t * 22, a = t + k * Math.PI / 2; g.lineTo(128 + r * Math.cos(a), 128 + r * Math.sin(a)); } g.stroke(); }
        g.strokeStyle = "#cfe7ea"; g.lineWidth = 5; for (let k = 0; k < 3; k++) { g.beginPath(); for (let t = 0; t < 3.6; t += 0.1) { const r = 10 + t * 28, a = -t * 1.1 + k * 2.1; g.lineTo(128 + r * Math.cos(a), 128 + r * Math.sin(a)); } g.stroke(); }
      });
      this.swirl = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.swirlTex })); this.swirl.position.set(-0.4, 0.03, -1.0); this.swirl.layers.set(NOINK); P.add(this.swirl);
      // props: inflatable ring floating, ladder on the right wall, a lifeguard chair outside
      this.floatRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 14, 28).rotateX(Math.PI / 2), lam({ color: "#EF4444" })); this.floatRing.castShadow = true; P.add(this.floatRing);
      for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 10), lam({ color: "#c9ccd2" })); rail.position.set(-X0 + 0.5 + s * 0.28, 1.35, Z1 - 1.0); P.add(rail); }
      for (let i = 0; i < 4; i++) box(0.56, 0.05, 0.06, -X0 + 0.5, 0.55 + i * 0.48, Z1 - 1.0, "#c9ccd2", false);
      box(1.0, 0.1, 1.0, -5.2, 1.5, 3.0, "#d9373b"); for (const dx of [-0.4, 0.4]) for (const dz of [-0.4, 0.4]) box(0.08, 1.5, 0.08, -5.2 + dx, 0.75, 3.0 + dz, "#c9ccd2");
      box(1.0, 1.1, 0.1, -5.2, 2.1, 2.6, "#d9373b");
      for (let i = 0; i < 4; i++) box(0.5, 0.5, 0.5, 4.5 + (i % 2) * 0.55, 0.25 + Math.floor(i / 2) * 0.5, 2.8, ["#e8a22f", "#2f7f86"][i % 2]);
    }

    // glows: warm radial billboards (additive) near the torch and over Tito, never inked
    const glowT = radial("sopGlow", [[0, "rgba(255,190,110,0.85)"], [0.4, "rgba(255,120,40,0.35)"], [1, "rgba(255,80,20,0)"]]);
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      g.layers.set(NOINK); g.renderOrder = 6; g.visible = false; this.glows.push(g); R.add(g);
    }
    // warm pools of light on the floor + faint light shafts from above (additive, never inked)
    const poolT = radial("sopPool", [[0, "rgba(255,196,130,0.8)"], [0.5, "rgba(255,150,80,0.36)"], [1, "rgba(255,120,60,0)"]]);
    const shaftT = ctex("sopShaft", 64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,225,170,0.0)"); gr.addColorStop(0.5, "rgba(255,200,140,0.07)"); gr.addColorStop(1, "rgba(255,170,100,0.17)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); });
    for (let i = 0; i < 5; i++) {
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      pm.layers.set(NOINK); pm.renderOrder = 0.4; pm.visible = false; this.pools.push(pm); R.add(pm);
      const sm = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.25, 8.2, 28, 1, true), new THREE.MeshBasicMaterial({ map: shaftT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      sm.layers.set(NOINK); sm.renderOrder = 0.5; sm.visible = false; sm.position.y = 4.1; this.shafts.push(sm); R.add(sm);
    }
    {
      const N = DUST.n, pos = new Float32Array(N * 3), sd = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) { pos.set([hh(i, 90) * DUST.b, hh(i, 91) * DUST.h, hh(i, 92) * DUST.b], i * 3); sd.set([hh(i, 93), hh(i, 94), hh(i, 95), hh(i, 96)], i * 4); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("aSeed", new THREE.BufferAttribute(sd, 4));
      const mat = new THREE.ShaderMaterial({ uniforms: this.dust, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: DUST_VS, fragmentShader: DUST_FS });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.layers.set(NOINK); pts.renderOrder = 5;
      const u = this.dust.uPx;
      pts.onBeforeRender = (r, _s, c) => { const rt = r.getRenderTarget(), h = rt ? rt.height : r.domElement.height; u.value = h / (2 * Math.tan(THREE.MathUtils.degToRad((c as THREE.PerspectiveCamera).fov) / 2)); };
      R.add(pts);
    }
  }

  private shotSun(id: number) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let k = 0; k <= 10; k++) { const c = camAt(id, sceneStart(id - 1) + k * 20), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(150), el = THREE.MathUtils.degToRad(GL.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** pose the robot so its torch nozzle sits at `tip` pointing along `dir` (screen plane) */
  private poseArm(tip: V3, dir: [number, number], on: boolean) {
    const B = V(3.0, 4.95, -1.2), L1 = 3.0, L2 = 2.9, pa = this.armParts;
    const dN = V(dir[0], dir[1], -0.12).normalize(), T = V(...tip);
    const W = T.clone().addScaledVector(dN, -0.95);
    const d = W.clone().sub(B), L = Math.min(L1 + L2 - 0.02, Math.max(Math.abs(L1 - L2) + 0.05, d.length())), dh = d.clone().normalize();
    const a = (L1 * L1 - L2 * L2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const pole = V(0.6, 1, 0.5); pole.addScaledVector(dh, -pole.dot(dh)).normalize();
    const E = B.clone().addScaledVector(dh, a).addScaledVector(pole, h);
    between(pa.upper, B, E, 0.14); between(pa.fore, E, W, 0.11);
    pa.j1.position.copy(B); pa.j2.position.copy(E); pa.j3.position.copy(W);
    const tankC = W.clone().addScaledVector(dN, 0.42); between(pa.tank, W.clone().addScaledVector(dN, 0.05), W.clone().addScaledVector(dN, 0.8), 0.24);
    between(pa.nozzle, W.clone().addScaledVector(dN, 0.8), T, 0.07); pa.nozzle.scale.x = 0.1; pa.nozzle.scale.z = 0.1;
    between(pa.ring, tankC.clone().addScaledVector(dN, 0.12), tankC.clone().addScaledVector(dN, 0.2), 0.27);
    void on;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const pool = id === 4, L = pool ? GP : GL, K = pool ? GKP : GK, t = f / FPS, ts = tsOf(id, f);
    const c = camAt(id, f);
    // violent camera shake while the torch roars (scene 1) and a thump when the extinguisher fires (scene 5)
    const shk = id === 1 && ts >= FIRE_T ? 0.025 * Math.sin(f * 3.1) : id === 5 && ts > T5_SPRAY && ts < T5_OUT + 0.6 ? 0.02 * Math.sin(f * 2.7) : 0;
    cam.position.set(c.pos[0] + shk, c.pos[1] + shk * 0.7, c.pos[2]); cam.up.set(0, 1, 0); cam.lookAt(c.look[0], c.look[1], c.look[2]);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus), sunDir = this.shotSun(id);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 0.9 + 4, 9, 28);
    this.sun.position.copy(focus).addScaledVector(sunDir, 80); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 10; sc.far = 300; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce);
    TONE.uSat.value = 1.0;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(new THREE.Color(h), su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(new THREE.Color(L.fog), this.fog.color);
    this.fog.near = SHOTS[id - 1].fog[0]; this.fog.far = SHOTS[id - 1].fog[1];
    scene.fog = this.fog; scene.background = null;
    this.chamber.visible = id === 1 || id === 5; this.poolG.visible = id === 4; this.arm.visible = id === 5 || (id === 1 && ts >= FIRE_T);
    this.dust.uT.value = t; this.dust.uCam.value.copy(cam.position);

    // ---- cast ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const light = light2D(sunDir, right);
    const st: Stage = { places: [], fx: [] };
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const lidAt = (i: number) => {
      let s = Math.round(-60 * hh(i, 9)); const fi = Math.floor(f);
      for (let n = 0; s <= fi && n < 80; n++) { const k = fi - s; if (k >= 0 && k < 4) return [0.5, 1, 1, 0.5][k]; s += Math.round(15 + 54 * hh(i * 31 + n, 13)); }
      return 0;
    };
    const visible = (x: number, y: number, z: number, r: number) => this.frustum.intersectsSphere(this.sph.set(this.v.set(x, y, z), r));
    const tierC = (d: number): [number, number, number] => (d < 7 ? [2400, 1680, 1.2] : d < 16 ? [1200, 840, 0.6] : [600, 420, 0.3]);
    type WPlace = (typeof st.places)[number] & { wide?: boolean };
    const frontT = (who: string, x: number, y: number, z: number, opts: Omit<Parameters<typeof titoFront>[1], "light" | "blink">, i: number, scale = 1) => {
      if (!visible(x, y + 1.1, z, 3.5)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 1.2, z)), [w, h, k] = tier(d);
      const o2 = { ...opts, light, blink: d < 16 ? lidAt(i) : 0 } as Parameters<typeof titoFront>[1];
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale, yaw: 0, draw: (p) => titoFront(p, o2) });
      if (d < 60) blob(st, sunDir, x, y, z, 1.0);
    };
    const wideP = (who: string, x: number, y: number, z: number, draw: (p: Pen) => void, o2: object) => {
      if (!visible(x, y + 1.0, z, 3.4)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 0.8, z)), [w, h, k] = tierC(d);
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale: 1, yaw: 0, draw, wide: true } as WPlace);
    };
    const fxCard = (key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, rot = 0) =>
      st.fx.push({ key, cw, ch, draw, x, y, z, w, h, rot });
    let spots: [number, number, number, string?][] = [];
    let glowA: { p: V3; s: number; a: number } | null = null, glowB: { p: V3; s: number; a: number } | null = null;

    if (id === 1 || id === 5) {
      const T = torchAt(id, f);
      this.poseArm(T.tip, T.dir, T.on > 0.02);
      // ---- Tito ----
      if (id === 1) {
        const up = crunchUp(f), fire = ts >= FIRE_T, scorch = fire ? 0.1 + 0.9 * smooth((ts - FIRE_T) / 7) : 0, terror = ts > 9.0;
        const o2 = { up, expr: terror ? "terror" : "effort", sweat: fire ? 1 : 0.34, scorch: q20(scorch), smokePh: q8((t * 0.9) % 1), speed: fire ? 0.9 : 0, shake: fire ? q2(6 * Math.sin(f * 2.3)) : 0, blink: 0 };
        wideP("crunch", 0, 0, 0, (p) => titoCrunch(p, { ...o2, expr: o2.expr as "terror" | "effort", light }), o2);
        blob(st, sunDir, -0.1, 0, 0, 1.6);
        spots = [[-0.1, 0, 2.4, ts >= FIRE_T ? "#7a3d1a" : "#4a3a30"]];
      } else {
        const bend = smooth(ts / 0.5), o2 = { pose: "hips" as const, expr: "dazed" as const, sweat: 1, tilt: q2(30 * bend + 1.5 * Math.sin(f * 0.8)), headTilt: q2(-78 * bend), scorch: 1, smokePh: q8((t * 0.8) % 1), hand: 0, drip: q10(ts) };
        frontT("t", -1.35, 0, 0, o2, 1);
        spots = [[-1.35, 0, 2.2, "#7a3d1a"], [PIGEON_X, 0.4, 1.8, "#5a7aa8"]];
      }
      // ---- the flame ----
      if (T.on > 0.02) {
        const len = T.len * T.on, ph = q8((f * 0.17) % 1), wk = Math.round((f % 4) / 1);
        const cx = T.tip[0] + T.dir[0] * len * 0.5, cy = T.tip[1] + T.dir[1] * len * 0.5;
        fxCard(`flame|${wk}|${q20(T.on)}`, 512, 256, (p) => drawFlame(p, ph, 1), cx, cy, 0.36, len, len * 0.5, Math.atan2(T.dir[1], T.dir[0]));
        glowA = { p: [T.tip[0] + T.dir[0] * len * 0.35, T.tip[1] + T.dir[1] * len * 0.35, 0.5], s: 1.7 * T.on, a: 1 };
      } else if (id === 5) {
        for (let i = 0; i < 4; i++) {            // smoke curling up from the dead torch
          const q = ((ts - T5_OUT) * 0.45 + i / 4) % 1;
          fxCard(`smoke|${i % 2}`, 256, 256, (p) => drawPuff(p, i % 2, false), T.tip[0] + 0.14 * Math.sin(q * 6 + i) + 0.2, T.tip[1] + 0.2 + q * 1.4, 0.38, 0.3 + 0.5 * q, 0.3 + 0.5 * q);
        }
      }
      // ---- scene 5 cast: Dr. Pigeon, the safety inspector, with the giant extinguisher ----
      if (id === 5) {
        const walk = smooth((ts - T5_PIGEON) / 1.2), px = lerp(4.9, PIGEON_X, walk);
        if (ts > T5_PIGEON - 0.2) {
          const hop = walk < 1 ? 0.09 * Math.abs(Math.sin(f * 0.6)) : 0, sign = smooth((ts - T5_SIGN) / 0.6), spraying = ts > T5_SPRAY && ts < T5_OUT + 0.9;
          const o3 = { sign: q20(sign), spray: spraying ? Math.round(Math.abs(Math.sin(f * 1.3)) * 4) / 4 : 0, blink: lidAt(77) };
          wideP("pigeonS", px, hop, 0.85, (p) => pigeonSafety(p, { ...o3, light }), o3);
          blob(st, sunDir, px, 0, 0.85, 0.9);
          // foam stream: nozzle -> torch tip, a chain of fluffy puffs
          if (spraying) {
            const nz: V3 = [px + (NOZZLE[0] - 1000) * SU, hop + (1375 - NOZZLE[1]) * SU, 0.95];
            const tgt: V3 = [T.tip[0], T.tip[1] - 0.05, 0.4], fade = 1 - smooth((ts - T5_OUT - 0.2) / 0.7);
            for (let i = 0; i < 12; i++) {
              const q = ((ts - T5_SPRAY) * 2.4 + i / 12) % 1, a = (q * 1.0), x = lerp(nz[0], tgt[0], a) + 0.1 * Math.sin(i * 3 + f * 0.4), y = lerp(nz[1], tgt[1], a) + 0.25 * Math.sin(Math.PI * a) + 0.05 * Math.sin(i * 5);
              fxCard(`foam|${i % 3}`, 256, 256, (p) => drawPuff(p, i % 3, true), x, y, lerp(nz[2], tgt[2], a), (0.16 + 0.34 * a) * fade, (0.16 + 0.34 * a) * fade);
            }
          }
        }
      }
    } else if (id === 4) {
      // ---- the BODY FAT POOL: the level drops evenly (general drain) while Tito scoops with a tiny bucket ----
      const d0 = sceneStart(3), lvl = lerp(1.25, 0.16, smooth((f - d0 - 20) / (sceneStart(4) - d0 - 20)));
      this.liquid.scale.y = Math.max(0.02, lvl); this.liquid.position.set(0, lvl / 2, -0.9); this.liquidTop.position.set(0, lvl + 0.006, -0.9);
      this.liquidTex.offset.set(0.02 * t, 0.015 * t);
      this.swirlTex.center.set(0.5, 0.5); this.swirlTex.rotation = -t * 3.2;
      this.floatRing.position.set(-1.3 + 0.1 * Math.sin(t), lvl + 0.03, -1.9 + 0.1 * Math.cos(t * 0.8)); this.floatRing.rotation.z = 0.05 * Math.sin(t * 1.3);
      const o2 = { pose: "bucket" as const, expr: "effort" as const, sweat: 0.67, scoopPh: q12((t * 3) % 1), tilt: q2(2.4 * Math.sin(f * 0.5)) };
      frontT("tb", 1.5, 0.03, -0.4, o2, 1);
      // a rubber duck riding the surface
      fxCard("duck", 256, 256, (p) => {
        p.ol = 8; p.ell(128, 160, 78, 54, "#FFD23F", 8); p.ell(176, 100, 40, 40, "#FFD23F", 8); p.poly([[208, 100], [250, 108], [208, 122]], "#FF8A1F", 6); p.dot(184, 92, 6, "#111114"); p.ell(110, 158, 36, 24, "#F2B900", 5, 200, 340);
      }, 0.6 + 0.1 * Math.sin(t * 1.1), lvl + 0.16, -1.8, 0.5, 0.5);
      spots = [[1.5, -0.4, 2.4, "#fff0c0"], [-0.4, -1.0, 2.0, "#ffe08a"]];
    }
    this.pools.forEach((pm, i) => { const s = spots[i]; pm.visible = !!s; this.shafts[i].visible = !!s; if (s) { (pm.material as THREE.MeshBasicMaterial).color.set(s[3] ?? "#ffffff"); pm.position.set(s[0], 0.06, s[1]); pm.scale.set(s[2] * 2, 1, s[2] * 2); this.shafts[i].position.set(s[0], 4.1, s[1]); this.shafts[i].scale.set(1, 1, 1); } });
    // torches on the walls: tiny animated flame cards (cheap: 2 variants)
    if (id === 1 || id === 5) {
      const tp: [number, number, number][] = [[-3.1, 3.05, -4.88], [3.1, 3.05, -4.88], [-8.65, 3.05, 0.5], [8.65, 3.05, 0.5]];
      tp.forEach(([x, y, z], i) => { if (!visible(x, y, z, 1)) return; const ph = Math.floor((f + i * 3) / 3) % 3; fxCard(`torch|${ph}`, 128, 256, (p) => drawTorchFlame(p, ph / 3), x, y + 0.08, z, 0.34, 0.68); });
    }
    [glowA, glowB].forEach((gl, i) => { const m = this.glows[i]; m.visible = !!gl; if (gl) { m.position.set(...gl.p); m.scale.set(gl.s * (1 + 0.06 * Math.sin(f * 1.7 + i)), gl.s * (1 + 0.06 * Math.sin(f * 1.7 + i)), 1); } });

    let ai = 0;
    for (const p of st.places) {
      const a = this.actor(ai++), [w, h, k] = p.size;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.geometry = (p as WPlace).wide ? WIDE : BODY;
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? 0, 0);          // fixed orientation: the card never turns toward the camera
      const sc2 = p.scale ?? 1; a.mesh.scale.set(sc2, sc2, sc2);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    for (const p of st.fx) {
      if (!visible(p.x, p.y, p.z, Math.max(p.w, p.h))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0); else e2.mesh.rotation.set(0, 0, p.rot ?? 0);
      e2.mesh.scale.set(p.w, p.h, 1);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (let i = 0; i < fi; i++) this.fxs[i].bind();
    return focus;
  }
}
void uOf; void clamp01; void bellyOnCard;
