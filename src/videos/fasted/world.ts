// 3D worlds for "The Fasted Cardio Myth" (Short 5). Everything is REUSED from the earlier PumpParadox shorts (see CLAUDE.md):
//  the dark gym + treadmill with a scrolling belt (sudar/volumen/spot), the official flat Tito cards (soplete/titoS.ts = ventana/titoV.ts, titoLying.ts),
//  the official pigeon (cards.ts pigeonDoc). New here: the 04:59 AM clock, two giant 3D energy bars, a living room (03:00 PM) with a calculator accountant,
//  two treadmills + two identical scales for the split screen, the zombie / banana / shock-wave cards.
// PERFORMANCE RULES (spot/world.ts): one shared unit box / cylinder / sphere geometry, materials cached by colour, everything built ONCE in the constructor;
// the per-frame update only moves objects and requests cached card canvases. Shadow map 1024, 1200 dust motes.
// Every character card keeps a FIXED yaw (0): planted on the 3D floor with a contact blob, never a billboard.
import * as THREE from "three";
import { Pen } from "../alejandro/toon";
import { titoFront } from "../soplete/titoS";
import { titoCrunch } from "../soplete/titoLying";
import { zombify, banana, bananaFx, ringFx, dropFx, pigeonDoc } from "./cards";
import { Pool, Actor, Fx, Stage, tier, light2D, blob, BODY, WIDE } from "../alejandro/troop";
import { NOINK } from "../alejandro/ink";
import { LIGHTS, LOOK, LightPreset, WorldLook } from "../alejandro/lights";
import { TONE, CHAR, twoTone, untone } from "../alejandro/shade";
import { ctex, rep, brick } from "../alejandro/paint";
import { FPS, SHOTS, camAt, smooth, sceneStart, sceneEnd, tsOf, clamp01, V3, wordTs } from "./story";

// ---------------- light presets: dark gym (from sudar/spot), warm living room ----------------
const GL: LightPreset = { ...LIGHTS.day, el: 70, lit: [0.34, 0.28, 0.22], shade: [0.03, 0.045, 0.12], lift: [0.015, 0.035, 0.12], lambert: 0.45, sideK: 0.7, term: 0.12,
  charTint: [1.06, 0.93, 0.8], charShade: 0.6, charGrad: 0.1, bodyGrad: 0.3, sideTint: [0.62, 0.8, 1.2], fog: "#0b1226", sunCol: "#ffd9a0", sunI: 3.6,
  sky: "#16254a", ground: "#0b1226", hemiI: 0.05, actorShadow: false, bias: -0.0004, normalBias: 0.02 };
const GH: LightPreset = { ...GL, el: 66, lit: [0.55, 0.42, 0.32], shade: [0.14, 0.08, 0.14], lift: [0.07, 0.045, 0.1], charTint: [1.08, 0.94, 0.86], fog: "#1a1020", sunCol: "#ffcf9a", sunI: 3.4, sky: "#2a1a30", ground: "#1a1020", hemiI: 0.08 };
const sky5 = (c: string[]): WorldLook => ({ ...LOOK.day, sky: { c, e: [0, 4, 10, 20, 40] }, sat: 1.0 });
const GK = sky5(["#101a36", "#0d1530", "#0a1126", "#080e20", "#060a18"]);
const GKH = sky5(["#2a1a30", "#22142a", "#1a1022", "#120a1a", "#0c0612"]);

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const qn = (n: number) => (x: number) => Math.round(x * n) / n;
const q2 = qn(2), q4 = qn(4), q8 = qn(8), q12 = qn(12), q24 = qn(24);

// ---------------- shared geometry + material caches (built once) ----------------
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 16), SPH = new THREE.SphereGeometry(1, 14, 10);
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
/** a lit LED clock panel (04:59 AM / 03:00 PM): dark box + glowing red digits, never inked */
const clockTex = (key: string, text: string) => ctex(key, 512, 208, (g) => {
  g.fillStyle = "#0b0d12"; g.fillRect(0, 0, 512, 208); g.strokeStyle = "#8d949c"; g.lineWidth = 12; g.strokeRect(6, 6, 500, 196);
  g.font = "bold 124px 'Courier New', Consolas, monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "#ff2a2a"; g.shadowBlur = 26; g.fillStyle = "#ff3a3a"; g.fillText(text, 256, 108);
});

// ---------------- timing / geometry shared with the overlays ----------------
/** running Tito (card point -> world), card centred at x0 */
export const runPt = (cx: number, cy: number, bob: number, x0 = 0): V3 => [x0 + (cx - 300) * 0.00216, 0.25 + bob + (975 - cy) * 0.00216, 0.05];
export const runBob = (f: number, cyc = 4.5) => 0.04 * Math.abs(Math.sin(2 * Math.PI * ((f / FPS) * cyc % 1)));
export const S4_X = 1.6;                              // split screen: treadmills at -S4_X and +S4_X
export const BAR_H = 3.0;
export const PIGEON_X = 2.0;
export const BAR_POS: Record<number, [[number, number], [number, number]]> = { 2: [[-1.4, -0.3], [1.4, -0.3]], 3: [[-0.95, -1.5], [0.05, -1.5]] };   // [fat (x, z), carbs (x, z)] per scene
export const CALC_AT: V3 = [1.55, 0, -1.0];
export const TM5: [number, number] = [0.15, 0.8];     // scene 5: the treadmill Tito fell behind

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

// ---------------- treadmill with a scrolling belt ----------------
class Treadmill {
  g = new THREE.Group(); private tex: THREE.Texture;
  constructor(parent: THREE.Object3D) {
    const add = mkBox(this.g);
    add(1.05, 0.2, 2.1, 0, 0.1, 0, "#2b2f3a");
    this.tex = rep(ctex("fastBelt", 128, 256, (g) => {
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
  place(x: number, z: number, vis: boolean) { this.g.position.set(x, 0, z); this.g.visible = vis; }
  run(t: number, speed: number) { this.tex.offset.y = (t * speed) % 1; }
}

/** a giant 3D energy bar: glass tube + coloured liquid + tick marks (+ a frost cube for the "frozen" fat bar); unlit and never inked */
class EnergyBar {
  g = new THREE.Group(); private fill: THREE.Mesh; private ice: THREE.Mesh; private cap: THREE.Mesh;
  constructor(parent: THREE.Object3D, color: string, glow: string, private w = 0.56, private h = BAR_H) {
    const ni = (m: THREE.Object3D) => { m.layers.set(NOINK); this.g.add(m); return m; };
    const glass = ni(new THREE.Mesh(BOX, basic("#cfe8ff", { transparent: true, opacity: 0.14, depthWrite: false }))) as THREE.Mesh; glass.scale.set(w, h, w); glass.position.y = h / 2; glass.renderOrder = 6;
    const edges = ni(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, w)), new THREE.LineBasicMaterial({ color: "#ffffff" }))); edges.position.y = h / 2;
    for (let i = 1; i < 5; i++) { const t = ni(new THREE.Mesh(BOX, basic("#ffffff"))) as THREE.Mesh; t.scale.set(w * 0.4, 0.03, 0.02); t.position.set(-w * 0.3, (h * i) / 5, w / 2 + 0.01); }
    this.fill = ni(new THREE.Mesh(BOX, basic(color))) as THREE.Mesh;
    this.cap = ni(new THREE.Mesh(BOX, basic(glow))) as THREE.Mesh;
    this.ice = ni(new THREE.Mesh(BOX, basic("#bfe9ff", { transparent: true, opacity: 0.62, depthWrite: false }))) as THREE.Mesh; this.ice.renderOrder = 7; this.ice.visible = false;
    this.g.visible = false; parent.add(this.g);
  }
  set(level: number, ice = 0) {
    const L = clamp01(level) * this.h * 0.97 + 0.02, w = this.w * 0.82;
    this.fill.scale.set(w, L, w); this.fill.position.y = L / 2 + 0.02;
    this.cap.scale.set(w, 0.05, w); this.cap.position.y = L + 0.03;
    this.ice.visible = ice > 0.01; this.ice.scale.set(this.w * 1.08, this.h * (0.04 + 0.96 * ice), this.w * 1.08); this.ice.position.y = this.ice.scale.y / 2;
  }
  place(x: number, z: number, vis: boolean) { this.g.position.set(x, 0, z); this.g.visible = vis; }
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
  private gymG = new THREE.Group(); private homeG = new THREE.Group();
  private tm!: Treadmill; private tm2!: Treadmill; private bag = new THREE.Group();
  private clockG = new THREE.Group(); private clockMesh!: THREE.Mesh; private clockOn!: THREE.Texture; private clockOff!: THREE.Texture;
  private homeClock!: THREE.Mesh;
  private barFat!: EnergyBar; private barCarb!: EnergyBar;
  private calc = new THREE.Group(); private calcDisp!: THREE.Mesh; private calcCv!: HTMLCanvasElement; private calcTex!: THREE.CanvasTexture; private calcStage = -1;
  private scaleG = new THREE.Group();

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
    R.add(this.sky, this.hemi, this.sun, this.sun.target, this.gymG, this.homeG);

    // =============================================================== DARK GYM (scenes 1, 2, 4, 5) -- same set as sudar / spot
    {
      const G = this.gymG, box = mkBox(G), cyl = mkCyl(G);
      const boards = ctex("fastBoards", 512, 512, (g, r) => {
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
      const winT = ctex("fastWin", 128, 100, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, "#15264f"); gr.addColorStop(1, "#33518e"); g.fillStyle = gr; g.fillRect(0, 0, 128, 100);
        g.strokeStyle = "#8d949c"; g.lineWidth = 6; g.strokeRect(3, 3, 122, 94); g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 100); g.moveTo(0, 50); g.lineTo(128, 50); g.stroke();
      });
      const mirT = ctex("fastMirror", 128, 64, (g) => {
        const gr = g.createLinearGradient(0, 0, 128, 64); gr.addColorStop(0, "#c8e6f8"); gr.addColorStop(1, "#8fc2e4"); g.fillStyle = gr; g.fillRect(0, 0, 128, 64);
        g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 5; for (const x of [25, 45, 95]) { g.beginPath(); g.moveTo(x + 20, 0); g.lineTo(x - 10, 64); g.stroke(); }
      });
      for (const x of [-12, -6, 0, 6, 12]) box(3.2, 2.2, 0.1, x, 5.6, -9.9, "#ffffff", false, winT);
      for (const x of [-9, 9]) box(6, 3.0, 0.08, x, 2.9, -9.92, "#ffffff", false, mirT);
      for (const rx of [-6.5, 6.8]) {
        for (const dx of [-1.0, 1.0]) for (const dz of [-0.7, 0.7]) box(0.14, 2.5, 0.14, rx + dx, 1.25, -7 + dz, "#d9373b");
        box(2.3, 0.14, 0.14, rx, 2.5, -7.7, "#d9373b"); box(2.3, 0.14, 0.14, rx, 2.5, -6.3, "#d9373b");
        cyl(0.04, 2.7, rx, 1.8, -7, "#c9ccd2", Math.PI / 2);
      }
      for (const bx of [-9.5, 10.5]) { box(1.4, 0.18, 0.5, bx, 0.5, -3.2, "#2b3a55"); box(0.12, 0.45, 0.4, bx - 0.5, 0.22, -3.2, "#8d949c"); box(0.12, 0.45, 0.4, bx + 0.5, 0.22, -3.2, "#8d949c"); }
      for (const [x, n] of [[3.4, 8], [5.0, 14]] as const) for (let i = 0; i < n; i++) cyl(0.46, 0.12, x, 0.06 + i * 0.125, -3.2, i % 2 ? "#c0353a" : "#2f3340");
      for (let i = 0; i < 8; i++) { const x = -15 + i * 0.7; cyl(0.05, 0.3, x, 1.05, -9.3, "#8d949c", Math.PI / 2); cyl(0.13, 0.08, x - 0.14, 1.05, -9.3, "#2f3340", Math.PI / 2); cyl(0.13, 0.08, x + 0.14, 1.05, -9.3, "#2f3340", Math.PI / 2); }
      box(6.4, 0.08, 0.5, -12, 0.95, -9.3, "#8d949c");
      const lampM = new THREE.ConeGeometry(0.55, 0.5, 12, 1, true);
      for (const z of [-4, 4]) { box(40, 0.3, 0.3, 0, 8.3, z, "#4a4f5c", false); for (const x of [-12, -6, 0, 6, 12]) { const l = new THREE.Mesh(lampM, basic("#fff1b8", { side: THREE.DoubleSide })); l.position.set(x, 7.8, z); G.add(l); } }
      this.bag.position.set(-3.4, 3.0, -8.0);
      const bagM = new THREE.Mesh(CYL, lam("#c0353a")); bagM.scale.set(0.3, 1.3, 0.3); bagM.position.y = -1.0; this.bag.add(bagM);
      G.add(this.bag); box(0.14, 3.2, 0.14, -3.4, 1.6, -8.6, "#4a4f5c"); box(0.14, 0.14, 0.7, -3.4, 3.05, -8.3, "#4a4f5c");
      this.tm = new Treadmill(G); this.tm2 = new Treadmill(G);
      // the giant digital wall clock (04:59 AM), the colon blinks
      this.clockOn = clockTex("fastClockOn", "04:59 AM"); this.clockOff = clockTex("fastClockOff", "04 59 AM");
      this.clockMesh = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ map: this.clockOn })); this.clockMesh.scale.set(2.8, 1.15, 0.2); this.clockMesh.layers.set(NOINK);
      this.clockG.add(this.clockMesh); this.clockG.position.set(0, 3.55, -4.5); this.clockG.visible = false; G.add(this.clockG);
      const brk = mkBox(this.clockG); brk(0.1, 1.2, 0.1, -1.4, 1.1, -0.1, "#4a4f5c", false); brk(0.1, 1.2, 0.1, 1.4, 1.1, -0.1, "#4a4f5c", false);
      // shared "NO INK" energy bars + the two identical scales of the split screen
      this.barFat = new EnergyBar(R, "#FFD23F", "#FFF3A8"); this.barCarb = new EnergyBar(R, "#3AA0FF", "#BDE0FF");
      const scaleScreen = ctex("fastScale", 256, 128, (g) => {
        g.fillStyle = "#0b0d12"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#8d949c"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 120);
        g.font = "bold 50px 'Courier New', Consolas, monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "#3DFF7A"; g.shadowBlur = 14; g.fillStyle = "#3DFF7A"; g.fillText("-1.0 LB", 128, 68);
      });
      for (const sx of [-1, 1]) {
        const sb = mkBox(this.scaleG); const bx = sx * 1.3; sb(0.95, 0.1, 0.7, bx, 0.05, 1.3, "#c9ccd2"); sb(0.1, 0.5, 0.1, bx, 0.35, 1.1, "#8d949c"); sb(0.8, 0.42, 0.1, bx, 0.75, 1.1, "#23262f");
        const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.36), new THREE.MeshBasicMaterial({ map: scaleScreen })); sc.position.set(bx, 0.75, 1.165); sc.layers.set(NOINK); this.scaleG.add(sc);
      }
      this.scaleG.visible = false; G.add(this.scaleG);
    }

    // =============================================================== LIVING ROOM (scene 3): carpet, wallpaper, sofa, plates, the 03:00 PM clock, the calculator accountant
    {
      const H = this.homeG, box = mkBox(H), cyl = mkCyl(H);
      const carpet = ctex("fastCarpet", 256, 256, (g, r) => { g.fillStyle = "#8a72b0"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 2, 5); } });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 32).rotateX(-Math.PI / 2), lam("#ffffff", rep(carpet, 10, 8))); floor.receiveShadow = true; H.add(floor);
      const paper = ctex("fastPaper", 256, 256, (g) => { g.fillStyle = "#b07a8a"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#be8898" : "#a26e80"; g.fillRect(i * 32, 0, 32, 256); } g.fillStyle = "rgba(255,255,255,0.08)"; for (let i = 0; i < 16; i++) g.fillRect(8 + i * 16, 0, 2, 256); });
      const wall = (w: number, h: number, x: number, y: number, z: number, ry: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam("#ffffff", rep(paper, w / 4, h / 4), { side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; H.add(m); };
      wall(40, 12, 0, 6, -4.2, 0); wall(32, 12, -9, 6, 4, Math.PI / 2); wall(32, 12, 9, 6, 4, -Math.PI / 2);
      box(40, 0.3, 0.1, 0, 0.15, -4.12, "#e8dccb", false);
      // sofa (behind Tito) + cushions, a coffee table with a pizza box tower, a window with the afternoon sun
      box(3.4, 0.5, 1.1, -0.2, 0.25, -3.5, "#5b4a8a"); box(3.4, 0.9, 0.3, -0.2, 0.95, -4.0, "#4d3e78"); box(0.35, 0.8, 1.1, -2.1, 0.5, -3.5, "#4d3e78"); box(0.35, 0.8, 1.1, 1.7, 0.5, -3.5, "#4d3e78");
      for (const [x, c] of [[-1.0, "#e8a22f"], [0.6, "#2f7f86"]] as const) box(0.6, 0.5, 0.18, x, 0.75, -3.35, c);
      for (let i = 0; i < 5; i++) box(0.9, 0.08, 0.9, -3.3 + 0.04 * Math.sin(i * 2), 0.04 + i * 0.085, -2.6, i % 2 ? "#d9a441" : "#c0353a");
      const winT = ctex("fastHomeWin", 128, 100, (g) => { const gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, "#ffd9a0"); gr.addColorStop(1, "#ff9a5a"); g.fillStyle = gr; g.fillRect(0, 0, 128, 100); g.strokeStyle = "#f4f1ea"; g.lineWidth = 8; g.strokeRect(4, 4, 120, 92); g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 100); g.stroke(); });
      box(2.6, 2.0, 0.1, -3.6, 4.0, -4.1, "#ffffff", false, winT);
      // the empty plates and forks scattered around the sofa (flat cylinders, shared material)
      for (let i = 0; i < 9; i++) { const a = hh(i, 3) * Math.PI * 2, rr = 1.2 + 1.6 * hh(i, 4); cyl(0.26, 0.03, Math.cos(a) * rr * 1.25 - 0.1, 0.02, Math.sin(a) * rr * 0.7 + 0.5, i % 3 ? "#f4f6fa" : "#e8c45a"); }
      this.homeClock = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ map: clockTex("fastClockPm", "03:00 PM") })); this.homeClock.scale.set(2.5, 1.05, 0.2); this.homeClock.position.set(1.0, 3.9, -4.1); this.homeClock.layers.set(NOINK); H.add(this.homeClock);
      // the calculator accountant: a giant calculator with googly eyes, a green accountant's visor and a live display
      const C = this.calc, face = ctex("fastCalcFace", 260, 380, (g) => {
        g.fillStyle = "#2d3348"; g.fillRect(0, 0, 260, 380); g.strokeStyle = "#8d949c"; g.lineWidth = 8; g.strokeRect(4, 4, 252, 372);
        g.fillStyle = "#fff"; for (const x of [88, 172]) { g.beginPath(); g.arc(x, 62, 34, 0, 7); g.fill(); g.strokeStyle = "#111"; g.lineWidth = 6; g.stroke(); g.fillStyle = "#111"; g.beginPath(); g.arc(x + 4, 68, 13, 0, 7); g.fill(); g.fillStyle = "#fff"; }
        g.fillStyle = "#2f9e5a"; g.beginPath(); g.moveTo(20, 40); g.lineTo(240, 40); g.lineTo(256, 8); g.lineTo(4, 8); g.closePath(); g.fill(); g.strokeStyle = "#0e3b20"; g.lineWidth = 6; g.stroke();
        g.fillStyle = "#0b0d12"; g.fillRect(24, 112, 212, 70);
        const cols = ["#ef4444", "#e8a22f", "#3AA0FF", "#3DFF7A"];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = cols[(r + c) % 4]; g.beginPath(); g.roundRect(24 + c * 54, 204 + r * 42, 46, 34, 8); g.fill(); g.strokeStyle = "#111"; g.lineWidth = 4; g.stroke(); }
      });
      const body = new THREE.Mesh(BOX, lam("#ffffff", face)); body.scale.set(1.3, 1.9, 0.25); body.position.y = 0.95; body.castShadow = true; C.add(body);
      this.calcCv = document.createElement("canvas"); this.calcCv.width = 256; this.calcCv.height = 96; this.calcTex = new THREE.CanvasTexture(this.calcCv); this.calcTex.colorSpace = THREE.SRGBColorSpace;
      this.calcDisp = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.38), new THREE.MeshBasicMaterial({ map: this.calcTex })); this.calcDisp.position.set(0, 0.95 + 1.9 * (0.5 - 147 / 380), 0.13); this.calcDisp.layers.set(NOINK); C.add(this.calcDisp);
      C.visible = false; H.add(C);
    }

    // warm pools of light on the floor + faint light shafts (additive, never inked)
    const poolT = radial("fastPool", [[0, "rgba(255,208,146,0.8)"], [0.5, "rgba(255,188,118,0.38)"], [1, "rgba(255,170,90,0)"]]);
    const shaftT = ctex("fastShaft", 32, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,225,170,0.0)"); gr.addColorStop(0.5, "rgba(255,215,150,0.07)"); gr.addColorStop(1, "rgba(255,200,130,0.17)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 128); });
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
  private setCalc(stage: number) {
    if (stage === this.calcStage) return; this.calcStage = stage;
    const g = this.calcCv.getContext("2d")!, txt = ["BUDGET", "FAT: FROZEN", "CARBS +", "BALANCED"][stage], col = ["#ffd23f", "#9be3ff", "#3aa0ff", "#3DFF7A"][stage];
    g.fillStyle = "#0b0d12"; g.fillRect(0, 0, 256, 96); g.font = "bold 40px 'Courier New', Consolas, monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = col; g.shadowBlur = 12; g.fillStyle = col; g.fillText(txt, 128, 50);
    this.calcTex.needsUpdate = true;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const home = id === 3, L = home ? GH : GL, K = home ? GKH : GK, t = f / FPS, ts = tsOf(id, f), dur = (sceneEnd(id - 1) - sceneStart(id - 1)) / FPS;
    const c = camAt(id, f);
    const shk = id === 1 ? 0.025 * Math.sin(f * 3.1) : id === 5 && ts > wordTs(5, "banana") ? 0.03 * Math.sin(f * 2.9) * Math.exp(-(ts - wordTs(5, "banana") - 0.3) * 2) : 0;
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
    this.gymG.visible = !home; this.homeG.visible = home;
    this.bag.rotation.z = Math.sin(t * 2.3) * 0.11;
    this.dust.uT.value = t; this.dust.uCam.value.copy(cam.position);
    this.tm.place(0, 0, false); this.tm2.place(0, 0, false); this.barFat.place(0, 0, false); this.barCarb.place(0, 0, false);
    this.clockG.visible = id === 1; this.scaleG.visible = id === 4; this.calc.visible = home;
    (this.clockMesh.material as THREE.MeshBasicMaterial).map = Math.floor(f / 15) % 2 ? this.clockOff : this.clockOn;

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
    type FO = Parameters<typeof titoFront>[1];
    /** Tito: flat 2D card standing at (x, y, z) with a FIXED yaw; `post` paints extra things (zombie tint, banana...) on the same card */
    const frontT = (who: string, x: number, y: number, z: number, opts: Omit<FO, "light" | "blink">, i: number, post?: (p: Pen) => void) => {
      if (!visible(x, y + 1.1, z, 3.5)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 1.2, z)), [w, h, k] = tier(d);
      const o2 = { ...opts, light, blink: d < 16 ? lidAt(i) : 0 } as FO;
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale: 1, yaw: 0, draw: (p) => { titoFront(p, o2); if (post) post(p); } });
      if (d < 60) blob(st, sunDir, x, y, z, 1.0);
    };
    const wideP = (who: string, x: number, y: number, z: number, draw: (p: Pen) => void, o2: object, scale = 1) => {
      if (!visible(x, y + 1.0, z, 3.4 * scale)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 0.8, z)), [w, h, k] = tierC(d);
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale, yaw: 0, draw, wide: true } as WPlace);
    };
    const fxCard = (key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, rot = 0, soft = false) =>
      st.fx.push({ key, cw, ch, draw, x, y, z, w, h, rot, soft });
    let spots: [number, number, number, string?][] = [];
    const lyingTito = (who: string, x: number, z: number, o2: { up: number; expr: "dazed"; sweat: number; scorch: number; smokePh: number; speed: number; shake: number; blink: number }) => {
      wideP(who, x, 0, z, (p) => titoCrunch(p, { ...o2, light }), o2);
      blob(st, sunDir, x - 0.1, 0, z, 1.6);
    };
    /** sprint cycles per second of the zombie / fed Tito */
    const CYC = 4.5;

    if (id === 1) {
      // ---- the hook: zombie Tito sprints at MACH 3 on the treadmill under the 04:59 AM clock; his empty stomach roars shock waves ----
      this.tm.place(0, 0, true); this.tm.run(t, 3.0);
      const run = q24((t * CYC) % 1), bob = runBob(f, CYC);
      frontT("z1", 0, 0.25 + bob, 0, { pose: "run", run, sweat: 1, expr: "dots", tilt: q2(2.4 * Math.sin(4 * Math.PI * run)) }, 1, (p) => zombify(p, { run }));
      const bellyPt = runPt(300, 560, bob);
      if (ts > wordTs(1, "calorie") - 0.3) for (let k = 0; k < 3; k++) {        // the roar: a new ring every 7 frames
        const age = (f - k * 7) % 21, ph = Math.floor((f - k * 7) / 21), r = 0.3 + age * 0.04, a = q4(0.8 * (1 - age / 21));
        if (ph >= 0 && a > 0) fxCard(`ring|${a}`, 256, 256, (p) => ringFx(p, a), bellyPt[0], bellyPt[1], 0.3, r * 2, r * 2);
      }
      for (let i = 0; i < 6; i++) { const age = (f * 0.9 + i * 11) % 36, u = age / 36, side = i % 2 ? 1 : -1; fxCard("drop", 128, 128, dropFx, side * (0.35 + 0.5 * u), 1.9 - 0.2 * u + 0.3 * hh(i, 1), 0.2, 0.12, 0.14); }
      spots = [[0, 0, 3.4, "#ffd9a0"]];
    } else if (id === 2) {
      // ---- DURING WORKOUT: two giant energy bars; the yellow FAT bar fills much faster than the blue CARBS bar; Tito cheers while he keeps running ----
      this.tm.place(0, 0, true); this.tm.run(t, 3.0);
      const u = clamp01(ts / dur), fat = 0.97 * Math.pow(u, 0.7), carb = 0.4 * Math.pow(u, 1.1) + 0.02;
      this.barFat.place(BAR_POS[2][0][0], BAR_POS[2][0][1], true); this.barCarb.place(BAR_POS[2][1][0], BAR_POS[2][1][1], true);
      this.barFat.set(fat + 0.01 * Math.sin(f * 0.6)); this.barCarb.set(carb);
      const cel = Math.floor(f / 10) % 2 === 0, run = q24((t * CYC) % 1), bob = runBob(f, CYC);
      frontT("z2", 0, 0.25 + bob + (cel ? 0.07 : 0), 0, { pose: cel ? "flex" : "run", run, pump: 0.6, sweat: 1, expr: "dazed", tilt: q2(2 * Math.sin(4 * Math.PI * run)) }, 2, (p) => zombify(p, { run, chain: false }));
      for (let i = 0; i < 5; i++) { const age = (f * 0.7 + i * 9) % 40, u2 = age / 40; fxCard("drop", 128, 128, dropFx, (i - 2) * 0.22 + 0.1 * Math.sin(u2 * 6), 1.8 + 0.9 * u2, 0.2, 0.1, 0.12); }
      spots = [[0, 0, 3.4, "#ffd9a0"]];
    } else if (id === 3) {
      // ---- 03:00 PM: Tito lies on the living-room floor among empty plates; the calculator accountant balances the 24-hour bars ----
      const tLater = wordTs(3, "later"), tCarbs = wordTs(3, "carbs"), tBal = wordTs(3, "balance"), tBud = wordTs(3, "budget");
      const iceK = smooth((ts - tLater) / 0.6), carb = lerp(0.4, 0.97, smooth((ts - tCarbs) / Math.max(0.5, tBud - tCarbs)));
      this.barFat.place(BAR_POS[3][0][0], BAR_POS[3][0][1], true); this.barCarb.place(BAR_POS[3][1][0], BAR_POS[3][1][1], true);
      this.barFat.set(0.97, iceK); this.barCarb.set(carb);
      this.calc.position.set(CALC_AT[0], Math.abs(Math.sin(t * 5)) * 0.06, CALC_AT[2]); this.calc.rotation.z = 0.05 * Math.sin(t * 3); this.calc.rotation.y = -0.25;
      this.setCalc(ts < tLater ? 0 : ts < tCarbs ? 1 : ts < tBud ? 2 : 3);
      lyingTito("sofa", 0, 0, { up: 0, expr: "dazed", sweat: 0, scorch: 0, smokePh: 0, speed: 0, shake: q2(1.5 * Math.sin(f * 0.5)), blink: lidAt(5) });
      spots = [[0, 0, 3.4, "#ffb070"], [CALC_AT[0], CALC_AT[2], 2.2, "#aac0ff"]];
    } else if (id === 4) {
      // ---- split screen: FASTED zombie Tito (left) vs FED Tito with a banana (right), two identical scales in front ----
      this.tm.place(-S4_X, 0, true); this.tm2.place(S4_X, 0, true); this.tm.run(t, 3.0);
      const runL = q24((t * CYC) % 1), runR = q24((t * 3.2) % 1), bobL = runBob(f, CYC), bobR = runBob(f, 3.2) * 1.6;
      frontT("zL", -S4_X, 0.25 + bobL, 0, { pose: "run", run: runL, sweat: 1, expr: "dots", tilt: q2(2.4 * Math.sin(4 * Math.PI * runL)) }, 3, (p) => zombify(p, { run: runL }));
      const up = Math.max(0, Math.sin(2 * Math.PI * runR)), dn = Math.max(0, -Math.sin(2 * Math.PI * runR));
      frontT("fR", S4_X, 0.25 + bobR, 0, { pose: "run", run: runR, sweat: 0, expr: "grin", tilt: q2(1.2 * Math.sin(4 * Math.PI * runR)) }, 4, (p) => banana(p, 300 + 104 + 6 - 6 * up + 6, 548 - 92 * up + 30 * dn - 34, -0.4 + 0.5 * up, 0.8));
      for (let i = 0; i < 5; i++) { const age = (f * 0.8 + i * 8) % 36, u = age / 36; fxCard("drop", 128, 128, dropFx, -S4_X + (i - 2) * 0.2, 1.8 + 0.8 * u, 0.2, 0.1, 0.12); }
      spots = [[-S4_X, 0, 3.0, "#ffd9a0"], [S4_X, 0, 3.0, "#fff0c0"]];
    } else {
      // ---- scene 5: Tito flat on his face behind the treadmill, the doctor pigeon walks in, holds the sign, throws a banana at his head ----
      this.tm.place(TM5[0], TM5[1], true);
      const tB = wordTs(5, "banana"), hit = tB + 0.4, fall = clamp01(ts / 0.3);
      const hop = ts < 0.5 ? 0.18 * Math.exp(-ts * 7) * Math.abs(Math.sin(ts * 22)) : 0, bonk = ts > hit && ts < hit + 0.5 ? 0.06 * Math.sin((ts - hit) * 40) * Math.exp(-(ts - hit) * 6) : 0;
      wideP("tito5", 0, hop, 0, (p) => titoCrunch(p, { up: 0, expr: "dazed", sweat: 1, scorch: 0, smokePh: 0, speed: 0, shake: q2(1.5 * Math.sin(f * 0.8)), blink: lidAt(5), light } as never), { fall: q4(fall), bonk: q8(bonk * 8), q: q2(1.5 * Math.sin(f * 0.8)) });
      blob(st, sunDir, -0.1, 0, 0, 1.6);
      const walk = smooth(ts / 0.9), px = lerp(4.2, PIGEON_X, walk), hopP = walk < 1 ? 0.09 * Math.abs(Math.sin(f * 0.6)) : 0.03 * Math.abs(Math.sin(f * 0.2)), sign = smooth((ts - 0.5) / 0.6);
      const o3 = { sign: Math.round(sign * 10) / 10, blink: lidAt(77) };
      wideP("doc", px, hopP, 0.85, (p) => pigeonDoc(p, { ...o3, light }), o3);
      blob(st, sunDir, px, 0, 0.85, 0.9);
      if (ts > tB - 0.1 && ts < hit) {                                              // the thrown banana: a spinning arc from the pigeon to Tito's head
        const u = (ts - (tB - 0.1)) / (hit - tB + 0.1), x0 = px - 0.3, y0 = 1.3, x1 = -1.15, y1 = 0.45;
        fxCard("ban", 128, 128, bananaFx, lerp(x0, x1, u), lerp(y0, y1, u) + 1.0 * Math.sin(Math.PI * u), 0.5, 0.42, 0.42, u * 12);
      } else if (ts >= hit) fxCard("ban", 128, 128, bananaFx, -1.15, 0.52, 0.12, 0.42, 0.42, 0.8);
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
void q12;
