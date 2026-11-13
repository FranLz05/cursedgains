// 3D worlds for "The Spot Reduction Myth" (Short 4, rebuilt light). Everything is REUSED from the earlier PumpParadox shorts:
//  dark gym + treadmill (sudar/volumen), pool room with the yellow fat pool (soplete), official flat Tito cards (soplete/titoS.ts = ventana/titoV.ts, titoLying.ts),
//  the official pigeon variant (cards.ts pigeonSci). New: belly-interior set, laser gadget, fat bubbles. See CLAUDE.md.
// PERFORMANCE RULES: one shared unit box / cylinder geometry, materials cached by colour, built ONCE in the constructor; the per-frame update only
// moves objects and requests cached card canvases. Shadow map 1024, 1200 dust motes, no decorative props that the camera never sees.
import * as THREE from "three";
import { Pen } from "../alejandro/toon";
import { titoFront } from "../soplete/titoS";
import { titoCrunch, bellyOnCard } from "../soplete/titoLying";
import { fatBubble, pigeonSci } from "./cards";
import { Pool, Actor, Fx, Stage, tier, light2D, blob, BODY, WIDE, SU } from "../alejandro/troop";
import { NOINK } from "../alejandro/ink";
import { LIGHTS, LOOK, LightPreset, WorldLook } from "../alejandro/lights";
import { TONE, CHAR, twoTone, untone } from "../alejandro/shade";
import { ctex, rep, brick } from "../alejandro/paint";
import { FPS, SHOTS, camAt, smooth, sceneStart, sceneEnd, tsOf, clamp01, V3, crunchUp, T3_ON, T4_DRAIN } from "./story";

// ---------------- light presets: dark gym, belly (warm magenta), pool room (teal) ----------------
const GL: LightPreset = { ...LIGHTS.day, el: 70, lit: [0.34, 0.28, 0.22], shade: [0.03, 0.045, 0.12], lift: [0.015, 0.035, 0.12], lambert: 0.45, sideK: 0.7, term: 0.12,
  charTint: [1.06, 0.93, 0.8], charShade: 0.6, charGrad: 0.1, bodyGrad: 0.3, sideTint: [0.62, 0.8, 1.2], fog: "#0b1226", sunCol: "#ffd9a0", sunI: 3.6,
  sky: "#16254a", ground: "#0b1226", hemiI: 0.05, actorShadow: false, bias: -0.0004, normalBias: 0.02 };
const GP: LightPreset = { ...GL, el: 74, lit: [0.3, 0.3, 0.26], shade: [0.03, 0.05, 0.1], lift: [0.015, 0.045, 0.12], charTint: [1.0, 0.97, 0.88], fog: "#06141c", sunCol: "#e8f4ff", sunI: 3.0, sky: "#10303c", ground: "#06141c" };
const sky5 = (c: string[]): WorldLook => ({ ...LOOK.day, sky: { c, e: [0, 4, 10, 20, 40] }, sat: 1.0 });
const GK = sky5(["#101a36", "#0d1530", "#0a1126", "#080e20", "#060a18"]);
const GKP = sky5(["#0c2230", "#0a1a28", "#08141f", "#060e18", "#040a12"]);

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const qn = (n: number) => (x: number) => Math.round(x * n) / n;
const q2 = qn(2), q8 = qn(8), q10 = qn(10), q12 = qn(12), q24 = qn(24);

// ---------------- shared geometry + material caches (built once) ----------------
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 14), SPH = new THREE.SphereGeometry(1, 14, 10);
const MATS = new Map<string, THREE.Material>();
const lam = (color: string, map?: THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => {
  const k = color + (map ? map.uuid : "") + JSON.stringify(extra);
  let m = MATS.get(k);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color, ...(map ? { map } : {}), ...extra })); MATS.set(k, m); }
  return m;
};
const basic = (color: string, extra: THREE.MeshBasicMaterialParameters = {}) => {
  const k = "b" + color + JSON.stringify(extra);
  let m = MATS.get(k);
  if (!m) { m = new THREE.MeshBasicMaterial({ color, ...extra }); MATS.set(k, m); }
  return m;
};
const mkBox = (P: THREE.Object3D) => (w: number, h: number, d: number, x: number, y: number, z: number, color: string, cast = true, map?: THREE.Texture) => {
  const m = new THREE.Mesh(BOX, lam(color, map)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; P.add(m); return m;
};
const mkCyl = (P: THREE.Object3D) => (r: number, h: number, x: number, y: number, z: number, color: string, rz = 0) => {
  const m = new THREE.Mesh(CYL, lam(color)); m.scale.set(r, h, r); m.position.set(x, y, z); m.rotation.z = rz; m.castShadow = true; m.receiveShadow = true; P.add(m); return m;
};
const radial = (key: string, stops: [number, string][]) => ctex(key, 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

// ---------------- timing shared with the overlays ----------------
/** card point of Tito's belly while lying on the gym floor, in world coordinates */
export const bellyWorld = (f: number): V3 => { const [bx, by] = bellyOnCard(crunchUp(f)); return [(bx - 1000) * SU, (1375 - by) * SU, 0.2]; };
/** the robotic laser arm stands on the gym floor next to Tito: its own base, NOT attached to his waist */
export const ARM_S: V3 = [0.4, 0.38, 0.9];
export const runPt = (cx: number, cy: number, bob: number): V3 => [(cx - 300) * SU, 0.25 + bob + (975 - cy) * SU, 0.05];
export const runBob = (f: number) => 0.035 * Math.abs(Math.sin(2 * Math.PI * ((f * 1.45) / FPS % 1)));
export const PIGEON_X = 2.0;

// ---------------- dust / motes in the light ----------------
const DUST = { n: 1200, b: 24, h: 9 };
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
  vec3 c = mix(vec3(1.0, 0.82, 0.55), vec3(0.55, 0.72, 1.0), step(0.6, vTint));
  gl_FragColor = vec4(c * core * vA * 0.8, 1.0);
}`;

// ---------------- small effect cards ----------------
const drawPuff = (p: Pen, seed: number) => {
  p.ol = 8; p.rot = null;
  const base = "#4A4A56", sh = "#2E2E38";
  const bl: [number, number, number][] = [[128, 140, 78], [76 + seed * 8, 150, 52], [180 - seed * 6, 152, 56], [112, 92, 52], [156, 98, 46]];
  bl.forEach(([x, y, r], i) => p.ell(x, y, r, r * 0.9, i ? base : sh, 8));
  bl.forEach(([x, y, r]) => p.ell(x - r * 0.1, y - r * 0.12, r * 0.78, r * 0.7, base, 0));
};
const drawBeam = (p: Pen) => {
  const g = p.g; g.save(); g.lineCap = "round";
  for (const [c, w] of [["rgba(255,40,40,0.28)", 58], ["#ff2a2a", 26], ["#ffe2e2", 9]] as [string, number][]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(20, 32); g.lineTo(492, 32); g.stroke(); }
  g.restore();
};
const drawSpark = (p: Pen) => { p.ol = 0; p.ell(64, 64, 56, 56, "#ffcf40", 0); p.ell(64, 64, 32, 32, "#fff3c2", 0); };
const drawArc = (p: Pen) => { p.g.save(); p.g.lineCap = "round"; p.g.strokeStyle = "#ffffff"; p.g.lineWidth = 16; p.g.beginPath(); p.g.arc(128, 220, 150, Math.PI * 1.2, Math.PI * 1.8); p.g.stroke(); p.g.restore(); };
const drawDuck = (p: Pen) => { p.ol = 8; p.ell(128, 160, 78, 54, "#FFD23F", 8); p.ell(176, 100, 40, 40, "#FFD23F", 8); p.poly([[208, 100], [250, 108], [208, 122]], "#FF8A1F", 6); p.dot(184, 92, 6, "#111114"); };

/** place a unit-height cylinder between two points */
const _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const between = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number) => {
  _d.subVectors(b, a); const L = _d.length() || 1e-3;
  m.position.copy(a).addScaledVector(_d, 0.5); m.scale.set(r, L, r); m.quaternion.setFromUnitVectors(_up, _d.divideScalar(L));
};

/** treadmill with a scrolling belt */
class Treadmill {
  g = new THREE.Group(); private tex: THREE.Texture;
  constructor(parent: THREE.Object3D) {
    const add = mkBox(this.g);
    add(1.05, 0.2, 2.1, 0, 0.1, 0, "#2b2f3a");
    this.tex = rep(ctex("spotBelt", 128, 256, (g) => {
      g.fillStyle = "#2a2d36"; g.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#363a47" : "#242730"; g.fillRect(0, i * 16, 128, 16); }
      g.fillStyle = "#5b6072"; g.fillRect(60, 0, 8, 256);
    }), 1, 7);
    const belt = new THREE.Mesh(BOX, lam("#ffffff", this.tex)); belt.scale.set(0.84, 0.04, 1.9); belt.position.y = 0.22; belt.receiveShadow = true; this.g.add(belt);
    add(0.06, 0.07, 2.0, -0.47, 0.22, 0, "#f0c64a", false); add(0.06, 0.07, 2.0, 0.47, 0.22, 0, "#f0c64a", false);
    add(0.07, 1.15, 0.07, -0.48, 0.8, -0.95, "#8d949c"); add(0.07, 1.15, 0.07, 0.48, 0.8, -0.95, "#8d949c");
    add(1.1, 0.42, 0.16, 0, 1.42, -1.0, "#1c1f28"); add(0.74, 0.22, 0.02, 0, 1.44, -0.915, "#5ad0ff", false); add(1.06, 0.06, 0.06, 0, 1.12, -0.95, "#8d949c");
    this.g.visible = false; parent.add(this.g);
  }
  place(vis: boolean) { this.g.visible = vis; }
  run(t: number, speed: number) { this.tex.offset.y = (t * speed) % 1; }
}

// ---------------- world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool(); private actors: Actor[] = []; private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private skyMat: THREE.ShaderMaterial; private sky: THREE.Mesh;
  private fog = new THREE.Fog("#0b1226", 60, 400);
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private sph = new THREE.Sphere(); private v = new THREE.Vector3();
  private right = new THREE.Vector3(); private focusV = new THREE.Vector3(); private col = new THREE.Color();
  private dust = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uPx: { value: 1000 } };
  private pools: THREE.Mesh[] = []; private shafts: THREE.Mesh[] = [];
  private gymG = new THREE.Group(); private poolG = new THREE.Group();
  private tm!: Treadmill; private bag = new THREE.Group();
  private arm = new THREE.Group(); private armSeg1!: THREE.Mesh; private armSeg2!: THREE.Mesh; private armHead!: THREE.Mesh; private armJ!: THREE.Mesh[];
  private armLens!: THREE.Mesh; private armLed!: THREE.Mesh; private va = new THREE.Vector3(); private vb = new THREE.Vector3();
  private armTip: [number, number] = [1, 1];
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
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    this.hemi = new THREE.HemisphereLight("#e8f0ff", "#b49a78", 1.0);
    this.sun = new THREE.DirectionalLight("#fff1d6", 3.0);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(1024, 1024);
    R.add(this.sky, this.hemi, this.sun, this.sun.target, this.gymG, this.poolG);

    // =============================================================== DARK GYM (scenes 1, 3, 5)
    {
      const G = this.gymG, box = mkBox(G), cyl = mkCyl(G);
      const boards = ctex("spotBoards", 512, 512, (g, r) => {
        const cols = ["#d8a86c", "#cf9d62", "#dfb177", "#c99659", "#d4a468"];
        for (let i = 0; i < 8; i++) {
          g.fillStyle = cols[Math.floor(r() * 5)]; g.fillRect(0, i * 64, 512, 64);
          g.strokeStyle = "rgba(110,66,30,.3)"; g.lineWidth = 1.5;
          for (let k = 0; k < 3; k++) { const y = i * 64 + 7 + r() * 50; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(150, y + 3, 350, y - 3, 512, y + (r() - 0.5) * 3); g.stroke(); }
          g.fillStyle = "#6a4426"; g.fillRect(0, i * 64, 512, 3); g.fillRect(r() * 512, i * 64, 3, 64);
        }
      });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 32).rotateX(-Math.PI / 2), lam("#ffffff", rep(boards, 10, 8)));
      floor.receiveShadow = true; G.add(floor);
      box(11, 0.04, 7, 0, 0.02, -0.6, "#6c7588", false);
      box(11.4, 0.045, 0.14, 0, 0.022, 2.98, "#f0c64a", false); box(11.4, 0.045, 0.14, 0, 0.022, -4.18, "#f0c64a", false);
      const bk = brick();
      const wallM = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam("#9c8062", rep(bk, w / 6, h / 4), { side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; G.add(m);
      };
      wallM(40, 9, 0, 4.5, -10, 0); wallM(32, 9, -18, 4.5, 2, Math.PI / 2); wallM(32, 9, 18, 4.5, 2, -Math.PI / 2); wallM(40, 9, 0, 4.5, 16, 0);
      box(40, 0.5, 0.12, 0, 1.1, -9.94, "#e2453c", false);
      const winT = ctex("spotWin", 128, 100, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, "#15264f"); gr.addColorStop(1, "#33518e"); g.fillStyle = gr; g.fillRect(0, 0, 128, 100);
        g.strokeStyle = "#8d949c"; g.lineWidth = 6; g.strokeRect(3, 3, 122, 94); g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 100); g.moveTo(0, 50); g.lineTo(128, 50); g.stroke();
      });
      const mirT = ctex("spotMirror", 128, 64, (g) => {
        const gr = g.createLinearGradient(0, 0, 128, 64); gr.addColorStop(0, "#c8e6f8"); gr.addColorStop(1, "#8fc2e4"); g.fillStyle = gr; g.fillRect(0, 0, 128, 64);
        g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 5; for (const x of [25, 45, 95]) { g.beginPath(); g.moveTo(x + 20, 0); g.lineTo(x - 10, 64); g.stroke(); }
      });
      for (const x of [-12, -6, 0, 6, 12]) box(3.2, 2.2, 0.1, x, 5.6, -9.9, "#ffffff", false, winT);
      for (const x of [-9, 9]) box(6, 3.0, 0.08, x, 2.9, -9.92, "#ffffff", false, mirT);
      for (const rx of [-6.5, 6.8]) {                                   // two power racks
        for (const dx of [-1.0, 1.0]) for (const dz of [-0.7, 0.7]) box(0.14, 2.5, 0.14, rx + dx, 1.25, -7 + dz, "#d9373b");
        box(2.3, 0.14, 0.14, rx, 2.5, -7.7, "#d9373b"); box(2.3, 0.14, 0.14, rx, 2.5, -6.3, "#d9373b");
        cyl(0.04, 2.7, rx, 1.8, -7, "#c9ccd2", Math.PI / 2);
      }
      for (const bx of [-9.5, 10.5]) { box(1.4, 0.18, 0.5, bx, 0.5, -3.2, "#2b3a55"); box(0.12, 0.45, 0.4, bx - 0.5, 0.22, -3.2, "#8d949c"); box(0.12, 0.45, 0.4, bx + 0.5, 0.22, -3.2, "#8d949c"); }
      for (const [x, n] of [[2.9, 8], [4.6, 14]] as const) for (let i = 0; i < n; i++) cyl(0.46, 0.12, x, 0.06 + i * 0.125, -3.2, i % 2 ? "#c0353a" : "#2f3340");
      for (let i = 0; i < 8; i++) { const x = -15 + i * 0.7; cyl(0.05, 0.3, x, 1.05, -9.3, "#8d949c", Math.PI / 2); cyl(0.13, 0.08, x - 0.14, 1.05, -9.3, "#2f3340", Math.PI / 2); cyl(0.13, 0.08, x + 0.14, 1.05, -9.3, "#2f3340", Math.PI / 2); }
      box(6.4, 0.08, 0.5, -12, 0.95, -9.3, "#8d949c");
      const lampM = new THREE.ConeGeometry(0.55, 0.5, 12, 1, true);
      for (const z of [-4, 4]) { box(40, 0.3, 0.3, 0, 8.3, z, "#4a4f5c", false); for (const x of [-12, -6, 0, 6, 12]) { const l = new THREE.Mesh(lampM, basic("#fff1b8", { side: THREE.DoubleSide })); l.position.set(x, 7.8, z); G.add(l); } }
      this.bag.position.set(-1.9, 3.0, -8.0);
      const bagM = new THREE.Mesh(CYL, lam("#c0353a")); bagM.scale.set(0.3, 1.3, 0.3); bagM.position.y = -1.0; this.bag.add(bagM);
      G.add(this.bag); box(0.14, 3.2, 0.14, -1.9, 1.6, -8.6, "#4a4f5c"); box(0.14, 0.14, 0.7, -1.9, 3.05, -8.3, "#4a4f5c");
      this.tm = new Treadmill(G);
    }

    // =============================================================== ROBOTIC LASER ARM (scenes 1, 5): free-standing, floor-mounted, 2 segments + joints + laser head
    {
      const A = this.arm, steel = lam("#aab2c4"), dark = lam("#23262f"), warn = lam("#f0c64a");
      const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, ink = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; if (!ink) m.layers.set(NOINK); A.add(m); return m; };
      const base = mk(BOX, dark); base.scale.set(0.7, 0.1, 0.7); base.position.set(ARM_S[0], 0.05, ARM_S[2]);
      const ring = mk(BOX, warn); ring.scale.set(0.74, 0.03, 0.74); ring.position.set(ARM_S[0], 0.115, ARM_S[2]);
      const pil = mk(CYL, steel); pil.scale.set(0.14, 0.34, 0.14); pil.position.set(ARM_S[0], 0.28, ARM_S[2]);
      this.armSeg1 = mk(CYL, steel); this.armSeg2 = mk(CYL, steel);
      this.armJ = [0, 1, 2].map((i) => { const j = mk(SPH, i === 1 ? warn : dark); j.scale.setScalar(i === 1 ? 0.12 : 0.1); return j; });
      this.armHead = mk(BOX, dark); this.armLens = mk(SPH, basic("#7CE8FF"), false); this.armLed = mk(SPH, basic("#ff3b3b"), false);
      this.armLens.scale.setScalar(0.06); this.armLed.scale.setScalar(0.035);
      A.visible = false; R.add(A);
    }

    // =============================================================== POOL ROOM (scene 4)
    {
      const P = this.poolG, box = mkBox(P);
      const tiles = ctex("spotTiles", 256, 256, (g, r) => {
        g.fillStyle = "#04121a"; g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = ["#1f5a6a", "#1a4f5e", "#246a7a"][(i * 5 + j * 3 + Math.floor(r() * 3)) % 3]; g.fillRect(i * 32 + 2, j * 32 + 2, 28, 28); }
      });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 34).rotateX(-Math.PI / 2), lam("#7fa8b4", rep(tiles, 14, 12))); floor.receiveShadow = true; P.add(floor);
      const wallT = ctex("spotPoolWall", 256, 256, (g, r) => {
        g.fillStyle = "#0d2f3a"; g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = ["#d9eef0", "#cbe5e8", "#e3f3f4"][(i + j * 2 + Math.floor(r() * 2)) % 3]; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
      });
      const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), lam("#5b7f88", rep(wallT, 10, 2.3), { side: THREE.DoubleSide })); back.position.set(0, 4.5, -6.2); P.add(back);
      for (const sx of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(34, 9), lam("#5b7f88", rep(wallT, 8, 2.3), { side: THREE.DoubleSide })); sw.position.set(sx * 11, 4.5, 8); sw.rotation.y = Math.PI / 2; P.add(sw); }
      const WALL = 1.8, X0 = 2.4, Z0 = -3.0, Z1 = 1.2;
      box(0.3, WALL, Z1 - Z0 + 0.3, -X0 - 0.15, WALL / 2, (Z0 + Z1) / 2, "#d9eef0"); box(0.3, WALL, Z1 - Z0 + 0.3, X0 + 0.15, WALL / 2, (Z0 + Z1) / 2, "#d9eef0");
      box(2 * X0 + 0.6, WALL, 0.3, 0, WALL / 2, Z0 - 0.15, "#cfe7ea"); box(2 * X0 + 0.6, 0.12, 0.34, 0, 0.06, Z1 + 0.1, "#9bc2c9", false);
      const gauge = ctex("spotGauge", 32, 256, (g) => {
        g.fillStyle = "#f4f6fa"; g.fillRect(0, 0, 32, 256);
        for (let i = 0; i < 17; i++) { g.fillStyle = i % 4 === 0 ? "#111114" : "#EF4444"; g.fillRect(0, i * 15, i % 4 === 0 ? 32 : 18, 3); }
      });
      const gm = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1.55), new THREE.MeshBasicMaterial({ map: gauge })); gm.position.set(X0 - 0.2, 0.84, Z0 + 0.04); gm.layers.set(NOINK); P.add(gm);
      this.liquidTex = ctex("spotLiquid", 256, 256, (g, r) => {
        g.fillStyle = "#F2C200"; g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 36; i++) { g.fillStyle = `rgba(255,${230 + Math.floor(r() * 25)},120,${0.2 + r() * 0.3})`; g.beginPath(); g.arc(r() * 256, r() * 256, 3 + r() * 9, 0, 7); g.fill(); }
      });
      this.liquidTex.wrapS = this.liquidTex.wrapT = THREE.RepeatWrapping;
      this.liquid = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ map: this.liquidTex, color: "#ffd84a", transparent: true, opacity: 0.55, depthWrite: false }));
      this.liquid.renderOrder = 3; this.liquid.layers.set(NOINK); P.add(this.liquid);
      this.liquid.userData.w = 2 * X0 - 0.02; this.liquid.userData.d = Z1 - Z0 - 0.1;
      this.liquidTop = new THREE.Mesh(new THREE.PlaneGeometry(2 * X0 - 0.02, Z1 - Z0 - 0.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.liquidTex, color: "#fff2a8", transparent: true, opacity: 0.92, depthWrite: false }));
      this.liquidTop.renderOrder = 4; this.liquidTop.layers.set(NOINK); P.add(this.liquidTop);
      this.swirlTex = ctex("spotSwirl", 128, 128, (g) => {
        g.fillStyle = "#06090e"; g.beginPath(); g.arc(64, 64, 64, 0, 7); g.fill();
        g.strokeStyle = "#8d949c"; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.stroke();
        g.strokeStyle = "#cfe7ea"; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); for (let t = 0; t < 3.6; t += 0.1) { const r = 5 + t * 14, a = -t * 1.1 + k * 2.1; g.lineTo(64 + r * Math.cos(a), 64 + r * Math.sin(a)); } g.stroke(); }
      });
      this.swirl = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.swirlTex })); this.swirl.position.set(-0.4, 0.03, -1.0); this.swirl.layers.set(NOINK); P.add(this.swirl);
      this.floatRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 10, 20).rotateX(Math.PI / 2), lam("#EF4444")); P.add(this.floatRing);
      box(1.0, 0.1, 1.0, -5.2, 1.5, 3.0, "#d9373b"); for (const dx of [-0.4, 0.4]) for (const dz of [-0.4, 0.4]) box(0.08, 1.5, 0.08, -5.2 + dx, 0.75, 3.0 + dz, "#c9ccd2");
      for (let i = 0; i < 4; i++) box(0.5, 0.5, 0.5, 4.5 + (i % 2) * 0.55, 0.25 + Math.floor(i / 2) * 0.5, 2.8, ["#e8a22f", "#2f7f86"][i % 2]);
    }

    // warm pools of light on the floor + faint light shafts (additive, never inked): 2 are enough (spots[] has at most 2 entries)
    const poolT = radial("spotPool", [[0, "rgba(255,208,146,0.8)"], [0.5, "rgba(255,188,118,0.38)"], [1, "rgba(255,170,90,0)"]]);
    const shaftT = ctex("spotShaft", 32, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,225,170,0.0)"); gr.addColorStop(0.5, "rgba(255,215,150,0.07)"); gr.addColorStop(1, "rgba(255,200,130,0.17)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 128); });
    const poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), shaftGeo = new THREE.CylinderGeometry(0.35, 1.25, 8.2, 16, 1, true);
    for (let i = 0; i < 2; i++) {
      const pm = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: poolT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      pm.layers.set(NOINK); pm.renderOrder = 0.4; pm.visible = false; this.pools.push(pm); R.add(pm);
      const sm = new THREE.Mesh(shaftGeo, new THREE.MeshBasicMaterial({ map: shaftT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
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
    const a = sceneStart(id - 1), b = sceneEnd(id - 1);
    for (let k = 0; k <= 10; k++) { const c = camAt(id, a + ((b - a) * k) / 10), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(150), el = THREE.MathUtils.degToRad(GL.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const pool = id === 4, L = pool ? GP : GL, K = pool ? GKP : GK, t = f / FPS, ts = tsOf(id, f);
    const c = camAt(id, f);
    const shk = id === 1 ? 0.02 * Math.sin(f * 3.1) : id === 2 && ts > 1.5 ? 0.012 * Math.sin(f * 2.7) : 0;
    cam.position.set(c.pos[0] + shk, c.pos[1] + shk * 0.7, c.pos[2]); cam.up.set(Math.sin(c.roll), Math.cos(c.roll), 0); cam.lookAt(c.look[0], c.look[1], c.look[2]);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = this.focusV.set(c.look[0], c.look[1], c.look[2]), dist = cam.position.distanceTo(focus), sunDir = this.shotSun(id);
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
    K.sky.c.forEach((h, i) => untone(this.col.set(h), su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(this.col.set(L.fog), this.fog.color);
    this.fog.near = SHOTS[id - 1].fog[0]; this.fog.far = SHOTS[id - 1].fog[1];
    scene.fog = this.fog; scene.background = null;
    this.gymG.visible = id === 1 || id === 3 || id === 5; this.poolG.visible = pool;
    this.bag.rotation.z = Math.sin(t * 2.3) * 0.11;
    this.dust.uT.value = t; this.dust.uCam.value.copy(cam.position);
    this.tm.place(id === 3); this.arm.visible = false;

    // ---- cast ----
    const right = this.right.setFromMatrixColumn(cam.matrixWorld, 0);
    const light = light2D(sunDir, right);
    const st: Stage = { places: [], fx: [] };
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const lidAt = (i: number) => {
      let s = Math.round(-60 * hh(i, 9)); const fi = Math.floor(f);
      for (let n = 0; s <= fi && n < 80; n++) { const k = fi - s; if (k >= 0 && k < 4) return [0.5, 1, 1, 0.5][k]; s += Math.round(15 + 54 * hh(i * 31 + n, 13)); }
      return 0;
    };
    const visible = (x: number, y: number, z: number, r: number) => this.frustum.intersectsSphere(this.sph.set(this.v.set(x, y, z), r));
    const tierC = (d: number): [number, number, number] => (d < 7 ? [2000, 1400, 1.0] : d < 16 ? [1000, 700, 0.5] : [500, 350, 0.25]);
    type WPlace = (typeof st.places)[number] & { wide?: boolean };
    const frontT = (who: string, x: number, y: number, z: number, opts: Omit<Parameters<typeof titoFront>[1], "light" | "blink">, i: number, scale = 1) => {
      if (!visible(x, y + 1.1, z, 3.5)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 1.2, z)), [w, h, k] = tier(d);
      const o2 = { ...opts, light, blink: d < 16 ? lidAt(i) : 0 } as Parameters<typeof titoFront>[1];
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale, yaw: 0, draw: (p) => titoFront(p, o2) });
      if (d < 60) blob(st, sunDir, x, y, z, 1.0 * scale);
    };
    const bodyP = (who: string, x: number, y: number, z: number, draw: (p: Pen) => void, o2: object, scale = 1) => {
      if (!visible(x, y + 1.0, z, 3.4 * scale)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 0.8, z)), [w, h, k] = tier(d);
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale, yaw: 0, draw });
    };
    const wideP = (who: string, x: number, y: number, z: number, draw: (p: Pen) => void, o2: object, scale = 1) => {
      if (!visible(x, y + 1.0, z, 3.4 * scale)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 0.8, z)), [w, h, k] = tierC(d);
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale, yaw: 0, draw, wide: true } as WPlace);
    };
    const fxCard = (key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, rot = 0, soft = false) =>
      st.fx.push({ key, cw, ch, draw, x, y, z, w, h, rot, soft });
    let spots: [number, number, number, string?][] = [];

    /** pose the robotic arm (2-bone IK in the x/y plane) so its head hovers at H and looks at the target T */
    const armOn = (Hx: number, Hy: number, T: V3) => {
      const ux = Hx - T[0], uy = Hy - T[1], ul = Math.hypot(ux, uy) || 1, nx = ux / ul, ny = uy / ul;
      const Wx = Hx + 0.3 * nx, Wy = Hy + 0.3 * ny, Sx = ARM_S[0], Sy = ARM_S[1] + 0.1, z = ARM_S[2], Lb = 0.82;
      let dx = Wx - Sx, dy = Wy - Sy; const d = Math.hypot(dx, dy) || 1, dc = Math.min(d, 2 * Lb - 0.02);
      dx /= d; dy /= d;
      const hgt = Math.sqrt(Math.max(0, Lb * Lb - (dc / 2) * (dc / 2)));
      let px = -dy, py = dx; if (py < 0) { px = -px; py = -py; }
      const ex = Sx + dx * dc / 2 + px * hgt, ey = Sy + dy * dc / 2 + py * hgt, wx = Sx + dx * dc, wy = Sy + dy * dc;
      between(this.armSeg1, this.va.set(Sx, Sy, z), this.vb.set(ex, ey, z), 0.06);
      between(this.armSeg2, this.va.set(ex, ey, z), this.vb.set(wx, wy, z), 0.05);
      this.armJ[0].position.set(Sx, Sy, z); this.armJ[1].position.set(ex, ey, z); this.armJ[2].position.set(wx, wy, z);
      const hx = (wx + Hx) / 2, hy = (wy + Hy) / 2;
      this.armHead.position.set(hx, hy, z); this.armHead.scale.set(Math.hypot(Hx - wx, Hy - wy) + 0.02, 0.16, 0.16); this.armHead.rotation.z = Math.atan2(Hy - wy, Hx - wx);
      this.armLens.position.set(Hx - nx * 0.01, Hy - ny * 0.01, z); this.armLed.position.set(hx, hy + 0.11, z);
      this.arm.visible = true; this.armTip = [Hx, Hy];
    };

    if (id === 1) {
      // ---- the crunch frenzy: lying Tito card + the red laser beam from the belt gadget to his belly ----
      const up = crunchUp(f), o2 = { up, expr: "effort" as const, sweat: 1, scorch: 0, smokePh: 0, speed: 0.9, shake: q2(6 * Math.sin(f * 2.3)), blink: 0 };
      wideP("crunch", 0, 0, 0, (p) => titoCrunch(p, { ...o2, light }), o2);
      blob(st, sunDir, -0.1, 0, 0, 1.6);
      const bw = bellyWorld(f), Hx = 0.12 + 0.05 * Math.sin(f * 0.15), Hy = 1.45 + 0.04 * Math.sin(f * 0.11);
      armOn(Hx, Hy, bw);
      const dx = bw[0] - Hx, dy = bw[1] - Hy, len = Math.hypot(dx, dy);
      fxCard("beam", 512, 64, drawBeam, Hx + dx / 2, Hy + dy / 2, 0.5, len, len * 0.125, Math.atan2(dy, dx));
      fxCard(`spark|${f % 2}`, 128, 128, drawSpark, bw[0], bw[1], 0.36, 0.2 + 0.1 * hh(f, 3), 0.2 + 0.1 * hh(f, 3));
      spots = [[-0.1, 0, 2.4, "#7a4a3a"]];
    } else if (id === 3) {
      // ---- treadmill: Tito sprints, yellow fat bubbles leave face, arms, legs and belly ----
      this.tm.run(t, 1.0);
      const run = q24((t * 1.45) % 1), bob = runBob(f);
      frontT("t", 0, 0.25 + bob, 0, { pose: "run", run, sweat: 0.5, expr: "grin", tilt: q2(1.6 * Math.sin(4 * Math.PI * run)) }, 1);
      if (ts >= T3_ON()) {                       // micro energy droplets rising from the whole body (tiny: never cover the face)
        const LIFE = 36;
        for (let age = 0; age < LIFE; age += 3) for (let src = 0; src < 3; src++) {
          const fs = f - age - src; if (fs < sceneStart(2) + T3_ON() * FPS) continue;
          const kk = hh(fs, src * 7 + 1), k2 = hh(fs, src * 5 + 3), b0 = runBob(fs);
          const base = runPt(300 + 150 * (kk - 0.5) * (src === 1 ? 2.6 : 1), src === 0 ? 220 : src === 1 ? 560 : 800, b0);
          const u = age / LIFE, r = (0.016 + 0.022 * k2) * Math.pow(Math.sin(Math.PI * Math.min(0.97, 0.03 + u * 0.94)), 0.5);
          fxCard("bub", 128, 128, fatBubble, base[0] + (kk - 0.5) * 0.7 * u, base[1] + 0.2 + 1.0 * u * (0.6 + 0.6 * k2), 0.18 + 0.2 * hh(fs, 5), r * 2, r * 2);
        }
      }
      spots = [[0, 0, 3.4, "#ffe08a"]];
    } else if (id === 4) {
      // ---- the BODY FAT POOL: Tito scoops with the tiny bucket; the drain opens and the level falls fast ----
      const tD = sceneStart(3) + T4_DRAIN() * FPS, nD = clamp01((f - tD) / (sceneEnd(3) - tD - 6));
      const lvl = f < tD ? 1.25 + 0.01 * Math.sin(f * 0.3) : lerp(1.25, 0.1, Math.pow(smooth(nD), 0.8) * 0.55 + nD * nD * 0.45);
      const lw = this.liquid.userData.w as number, ld = this.liquid.userData.d as number;
      this.liquid.scale.set(lw, Math.max(0.02, lvl), ld); this.liquid.position.set(0, lvl / 2, -0.9); this.liquidTop.position.set(0, lvl + 0.006, -0.9);
      this.liquidTex.offset.set(0.02 * t, 0.015 * t);
      const open = smooth((f - tD) / 8); this.swirl.scale.setScalar(Math.max(0.001, open)); this.swirl.visible = open > 0.01;
      this.swirlTex.center.set(0.5, 0.5); this.swirlTex.rotation = -t * 3.2;
      this.floatRing.position.set(-1.3 + 0.1 * Math.sin(t), lvl + 0.03, -1.9 + 0.1 * Math.cos(t * 0.8));
      frontT("tb", 1.5, 0.03, -0.4, { pose: "bucket", expr: "effort", sweat: 0.67, scoopPh: q12((t * 3) % 1), tilt: q2(2.4 * Math.sin(f * 0.5)) } as never, 1);
      fxCard("duck", 256, 256, drawDuck, 0.6 + 0.1 * Math.sin(t * 1.1), lvl + 0.16, -1.8, 0.5, 0.5);
      spots = [[1.5, -0.4, 2.4, "#fff0c0"], [-0.4, -1.0, 2.0, "#ffe08a"]];
    } else {
      // ---- scene 5: Tito flat on the gym floor, the smoking laser, the pigeon with the DEFICIT > LASERS sign ----
      const o2 = { up: 0, expr: "dazed" as const, sweat: 1, scorch: 0.9, smokePh: q8((t * 0.8) % 1), speed: 0, shake: q2(1.5 * Math.sin(f * 0.8)), blink: lidAt(5) };
      wideP("crunch5", 0, 0, 0, (p) => titoCrunch(p, { ...o2, light }), o2);
      blob(st, sunDir, -0.1, 0, 0, 1.6);
      armOn(0.05, 0.95, bellyWorld(f));
      for (let i = 0; i < 4; i++) { const q = (ts * 0.45 + i / 4) % 1; fxCard(`smoke|${i % 2}`, 256, 256, (p) => drawPuff(p, i % 2), this.armTip[0] + 0.12 * Math.sin(q * 6 + i), this.armTip[1] + 0.1 + q * 1.2, 0.36, 0.3 + 0.5 * q, 0.3 + 0.5 * q); }
      const walk = smooth(ts / 0.9), px = lerp(4.0, PIGEON_X, walk), hop = walk < 1 ? 0.09 * Math.abs(Math.sin(f * 0.6)) : 0.03 * Math.abs(Math.sin(f * 0.2)), sign = smooth((ts - 0.5) / 0.6);
      const o3 = { sign: q10(sign * 10) / 10, blink: lidAt(77) };
      wideP("pigeonSci", px, hop, 0.85, (p) => pigeonSci(p, { ...o3, light }), o3);
      blob(st, sunDir, px, 0, 0.85, 0.9);
      spots = [[0, 0, 2.6, "#ffb070"], [PIGEON_X, 0.4, 1.8, "#aac0ff"]];
    }
    this.pools.forEach((pm, i) => { const s = spots[i]; pm.visible = !!s; this.shafts[i].visible = !!s; if (s) { (pm.material as THREE.MeshBasicMaterial).color.set(s[3] ?? "#ffffff"); pm.position.set(s[0], 0.06, s[1]); pm.scale.set(s[2] * 2, 1, s[2] * 2); this.shafts[i].position.set(s[0], 4.1, s[1]); } });

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
