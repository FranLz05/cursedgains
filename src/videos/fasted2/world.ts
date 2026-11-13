// 3D sets for the DYNAMIC cut of "The Fasted Cardio Myth" (14 micro-scenes, Rick Clips direction): a night bedroom with the 04:59 alarm clock and an
// empty fridge, the gym (treadmills, bear, FAT / CARBS tanks, finish tape + two scales), Tito's dream (cloud, butter belly, blowtorches, the MYTH stamp),
// the brain control centre (desk, screens, COMPENSATION MODE lever) and the sunny living room (sofa + a giant balance).
// Same PumpParadox look as every short (CLAUDE.md): flat cel-shaded cards planted on the 3D floor with a FIXED yaw, contact blobs, ink pass + lens blur + bloom + grade.
// PERFORMANCE RULES: one shared unit box / cylinder / sphere geometry, materials cached by colour, everything built ONCE in the constructor.
import * as THREE from "three";
import { Pen } from "../alejandro/toon";
import { titoFront } from "../soplete/titoS";
import { titoCrunch } from "../soplete/titoLying";
import { banana, bananaFx, ringFx, dropFx, pigeonDoc } from "../fasted/cards";
import { bear, brainGuy, torchFx, butterBelly, butterDrop, insulinGauge, batteryFx, qmarkFx, cobwebFx, crackFx, burstFx, paleTint, webs, pigeonThrow } from "./props";
import { Pool, Actor, Fx, Stage, tier, light2D, blob, BODY, WIDE, SU } from "../alejandro/troop";
import { NOINK } from "../alejandro/ink";
import { LIGHTS, LOOK, LightPreset, WorldLook } from "../alejandro/lights";
import { TONE, CHAR, twoTone, untone } from "../alejandro/shade";
import { ctex, rep, brick } from "../alejandro/paint";
import { fxPuff, fxStars } from "../alejandro/toon";
import { FPS, SHOTS, camAt, smooth, shotStart, shotEnd, tsOf, clamp01, V3, wordTs, easeOut, easeIO, spring } from "./story";

// ---------------- light presets per set ----------------
const BASE: LightPreset = { ...LIGHTS.day, el: 62, lit: [0.8, 0.66, 0.52], shade: [0.1, 0.1, 0.2], lift: [0.04, 0.05, 0.13], lambert: 0.42, sideK: 0.75, term: 0.14,
  charTint: [1.04, 0.95, 0.86], charShade: 0.7, charGrad: 0.08, bodyGrad: 0.25, sideTint: [0.75, 0.85, 1.1], fog: "#152040", sunCol: "#ffe0b0", sunI: 3.4,
  sky: "#2a3a66", ground: "#1a1a2a", hemiI: 0.12, actorShadow: false, bias: -0.0004, normalBias: 0.02 };
const LP: Record<string, LightPreset> = {
  bed: { ...BASE, lit: [0.42, 0.48, 0.78], shade: [0.05, 0.06, 0.16], lift: [0.03, 0.04, 0.14], charTint: [0.92, 0.95, 1.12], charShade: 0.62, fog: "#0a1028", sunCol: "#b8c8ff", sky: "#1a2448" },
  fridge: { ...BASE, lit: [0.55, 0.62, 0.9], shade: [0.07, 0.08, 0.2], lift: [0.04, 0.05, 0.16], charTint: [1.02, 1.08, 1.2], charShade: 0.72, fog: "#0a1028", sunCol: "#dfe9ff" },
  gym: BASE,
  dream: { ...LIGHTS.day, el: 58, lit: [1.45, 1.25, 1.38], shade: [0.42, 0.3, 0.48], lift: [0.08, 0.06, 0.14], charTint: [1.04, 0.96, 1.0], charShade: 0.9, fog: "#f3c6e4", actorShadow: false, hemiI: 0.6, sky: "#ffe0f4", ground: "#e8c8ff" },
  brain: { ...BASE, lit: [0.42, 0.66, 0.72], shade: [0.04, 0.08, 0.12], lift: [0.03, 0.06, 0.1], charTint: [0.96, 1.04, 1.1], charShade: 0.66, fog: "#081a24", sunCol: "#a8f0ff", sky: "#0e2a36" },
  home: { ...LIGHTS.day, el: 52, lit: [1.32, 1.08, 0.82], shade: [0.3, 0.22, 0.28], lift: [0.07, 0.05, 0.1], charTint: [1.06, 0.97, 0.88], charShade: 0.84, fog: "#f1c79a", actorShadow: false, sunCol: "#ffd9a0", hemiI: 0.45, sky: "#ffe6c4", ground: "#c8a080" },
};
const sky5 = (c: string[]): WorldLook => ({ ...LOOK.day, sky: { c, e: [0, 4, 10, 20, 40] }, sat: 1.05 });
const SKY: Record<string, WorldLook> = {
  night: sky5(["#101a36", "#0d1530", "#0a1126", "#080e20", "#060a18"]),
  dream: sky5(["#ffd3ea", "#f7c4ec", "#d9b8f5", "#aebcf7", "#8fb2f2"]),
  home: sky5(["#ffd9a0", "#ffcf9a", "#f5c08e", "#e8b088", "#d8a080"]),
};

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const qn = (n: number) => (x: number) => Math.round(x * n) / n;
const q2 = qn(2), q4 = qn(4), q10 = qn(10), q20 = qn(20), q24 = qn(24);

// ---------------- shared geometry + material caches (built once) ----------------
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 20), SPH = new THREE.SphereGeometry(1, 16, 12);
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
type Adder = (w: number, h: number, d: number, x: number, y: number, z: number, color: string, cast?: boolean, map?: THREE.Texture) => THREE.Mesh;
const mkBox = (P: THREE.Object3D): Adder => (w, h, d, x, y, z, color, cast = true, map) => {
  const m = new THREE.Mesh(BOX, lam(color, map)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; P.add(m); return m;
};
const mkGlow = (P: THREE.Object3D) => (w: number, h: number, d: number, x: number, y: number, z: number, color: string, map?: THREE.Texture, extra: THREE.MeshBasicMaterialParameters = {}) => {
  const m = new THREE.Mesh(BOX, map ? new THREE.MeshBasicMaterial({ map, ...extra }) : basic(color, extra)); m.scale.set(w, h, d); m.position.set(x, y, z); m.layers.set(NOINK); P.add(m); return m;
};
const mkCyl = (P: THREE.Object3D) => (r: number, h: number, x: number, y: number, z: number, color: string, rz = 0, rx = 0) => {
  const m = new THREE.Mesh(CYL, lam(color)); m.scale.set(r, h, r); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; m.receiveShadow = true; P.add(m); return m;
};
const mkSph = (P: THREE.Object3D) => (rx: number, ry: number, rz: number, x: number, y: number, z: number, color: string) => {
  const m = new THREE.Mesh(SPH, lam(color)); m.scale.set(rx, ry, rz); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; P.add(m); return m;
};
const plane = (P: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry: number, mat: THREE.Material) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; P.add(m); return m;
};
const radial = (key: string, stops: [number, string][]) => ctex(key, 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** a lit LED panel: dark box + glowing digits (never inked) */
const ledTex = (key: string, text: string, col = "#ff3a3a", w = 512, h = 208, fs = 124) => ctex(key, w, h, (g) => {
  g.fillStyle = "#0b0d12"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8d949c"; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
  g.font = `bold ${fs}px 'Courier New', Consolas, monospace`; g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = col; g.shadowBlur = 26; g.fillStyle = col; g.fillText(text, w / 2, h / 2 + 4);
});
/** big bold label texture (Arial Black with ink outline) */
const labelTex = (key: string, text: string, bg: string, fg: string, w = 512, h = 192, fs = 120, border = "#111114") => ctex(key, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = border; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
  let f = fs; g.font = `900 ${f}px Arial Black, Impact, sans-serif`; while (g.measureText(text).width > w - 50 && f > 20) { f -= 4; g.font = `900 ${f}px Arial Black, Impact, sans-serif`; }
  g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = Math.max(6, f * 0.12); g.strokeStyle = "#111114"; g.fillStyle = fg; g.strokeText(text, w / 2, h / 2 + 4); g.fillText(text, w / 2, h / 2 + 4);
});
const boardsTex = (key: string, cols: string[], line: string) => ctex(key, 512, 512, (g, r) => {
  for (let i = 0; i < 8; i++) {
    g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(0, i * 64, 512, 64);
    g.strokeStyle = "rgba(110,66,30,.28)"; g.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const y = i * 64 + 7 + r() * 50; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(150, y + 3, 350, y - 3, 512, y + (r() - 0.5) * 3); g.stroke(); }
    g.fillStyle = line; g.fillRect(0, i * 64, 512, 3); g.fillRect(r() * 512, i * 64, 3, 64);
  }
});

// ---------------- timing / geometry shared with the overlays ----------------
export const runBob = (f: number, cyc = 4.5) => 0.04 * Math.abs(Math.sin(2 * Math.PI * ((f / FPS) * cyc % 1)));
export const CYC = 4.5;
export const RACE_X = 0.78;                        // the two treadmills of the race
export const SCALE_Z = 1.75;                       // the two floor scales
export const TANK_X = 1.15, TANK_Z = -0.85;
export const BEAM: V3 = [1.5, 2.45, -1.2];          // the balance pivot (living room)
export const LEVER: V3 = [0.45, 1.02, 0.36];        // the lever pivot (brain room)
/** race jump (shot 9): progress 0..1 from the treadmills to the scales */
export const jumpU = (f: number) => clamp01((f - 1150) / 22);

// ---------------- dust / motes in the light ----------------
const DUST = { n: 900, b: 20, h: 8 };
const DUST_VS = `
attribute vec4 aSeed; uniform float uT; uniform vec3 uCam; uniform float uPx; uniform vec3 uCol; varying float vA; varying float vTint;
void main() {
  float B = ${DUST.b.toFixed(1)}, H = ${DUST.h.toFixed(1)};
  vec3 p = position;
  p.y = mod(p.y + uT * (0.05 + 0.16 * aSeed.x), H);
  p.x += sin(uT * (0.25 + 0.4 * aSeed.y) + aSeed.z * 30.0) * 0.5 + uT * 0.06;
  p.z += cos(uT * (0.2 + 0.4 * aSeed.z) + aSeed.w * 30.0) * 0.5;
  p.xz = uCam.xz + mod(p.xz - uCam.xz + 0.5 * B, B) - 0.5 * B;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float big = step(0.93, aSeed.w);
  float sz = mix(0.012, 0.03, aSeed.y) + big * 0.06;
  gl_PointSize = clamp(sz * uPx / max(0.1, -mv.z), 1.5, 50.0);
  float life = p.y / H;
  vA = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.7, 1.0, life)) * (0.55 + 0.45 * sin(uT * (1.5 + 3.0 * aSeed.x) + aSeed.z * 50.0)) * mix(1.0, 0.4, big);
  vA *= smoothstep(0.5, 1.5, -mv.z);
  vTint = aSeed.x;
  gl_Position = projectionMatrix * mv;
}`;
const DUST_FS = `
uniform vec3 uCol; varying float vA; varying float vTint;
void main() {
  vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float core = exp(-r * r * 3.0);
  vec3 c = mix(uCol, vec3(0.55, 0.72, 1.0), step(0.7, vTint));
  gl_FragColor = vec4(c * core * vA * 0.8, 1.0);
}`;

// ---------------- treadmill with a scrolling belt ----------------
class Treadmill {
  g = new THREE.Group(); private tex: THREE.Texture;
  constructor(parent: THREE.Object3D, key: string) {
    const add = mkBox(this.g);
    add(1.05, 0.2, 2.1, 0, 0.1, 0, "#2b2f3a");
    this.tex = rep(ctex("dynBelt" + key, 128, 256, (g) => {
      g.fillStyle = "#2a2d36"; g.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#363a47" : "#242730"; g.fillRect(0, i * 16, 128, 16); }
      g.fillStyle = "#5b6072"; g.fillRect(60, 0, 8, 256);
    }), 1, 7);
    const belt = new THREE.Mesh(BOX, lam("#ffffff", this.tex)); belt.scale.set(0.84, 0.04, 1.9); belt.position.y = 0.22; belt.receiveShadow = true; this.g.add(belt);
    add(0.06, 0.07, 2.0, -0.47, 0.22, 0, "#f0c64a", false); add(0.06, 0.07, 2.0, 0.47, 0.22, 0, "#f0c64a", false);
    add(0.07, 1.15, 0.07, -0.48, 0.8, -0.95, "#8d949c"); add(0.07, 1.15, 0.07, 0.48, 0.8, -0.95, "#8d949c");
    add(1.1, 0.42, 0.16, 0, 1.42, -1.0, "#1c1f28"); mkGlow(this.g)(0.74, 0.22, 0.02, 0, 1.44, -0.915, "#5ad0ff"); add(1.06, 0.06, 0.06, 0, 1.12, -0.95, "#8d949c");
    this.g.visible = false; parent.add(this.g);
  }
  place(x: number, z: number, vis: boolean) { this.g.position.set(x, 0, z); this.g.visible = vis; }
  run(t: number, speed: number) { (this.tex as THREE.Texture).offset.y = (t * speed) % 1; }
}

/** a transparent tank of liquid energy: glass cylinder, coloured liquid, rising bubbles, a label plate */
class Tank {
  g = new THREE.Group(); private liq: THREE.Mesh; private top: THREE.Mesh; private bub: THREE.Mesh[] = [];
  constructor(parent: THREE.Object3D, color: string, glow: string, label: THREE.Texture, private H = 2.3, private R = 0.42) {
    const ni = <T extends THREE.Object3D>(m: T) => { m.layers.set(NOINK); this.g.add(m); return m; };
    const cyl = mkCyl(this.g);
    cyl(R + 0.06, 0.16, 0, 0.08, 0, "#5b6270"); cyl(R + 0.06, 0.12, 0, H + 0.2, 0, "#5b6270");
    const glass = ni(new THREE.Mesh(CYL, basic("#d6ecff", { transparent: true, opacity: 0.16, depthWrite: false }))); glass.scale.set(R, H, R); glass.position.y = 0.16 + H / 2; glass.renderOrder = 6;
    this.liq = ni(new THREE.Mesh(CYL, basic(color, { transparent: true, opacity: 0.86 }))); this.liq.renderOrder = 5;
    this.top = ni(new THREE.Mesh(CYL, basic(glow)));
    for (let i = 0; i < 12; i++) { const b = ni(new THREE.Mesh(SPH, basic("#ffffff", { transparent: true, opacity: 0.7, depthWrite: false }))); b.renderOrder = 7; this.bub.push(b); }
    const pl = ni(new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.32), new THREE.MeshBasicMaterial({ map: label }))); pl.position.set(0, H + 0.5, 0.02);
    mkBox(this.g)(0.06, 0.3, 0.06, 0, H + 0.3, 0, "#5b6270");
    this.g.visible = false; parent.add(this.g);
  }
  set(level: number, t: number) {
    const L = clamp01(level) * this.H * 0.96 + 0.02, r = this.R * 0.9;
    this.liq.scale.set(r, L, r); this.liq.position.y = 0.16 + L / 2;
    this.top.scale.set(r, 0.03, r); this.top.position.y = 0.16 + L + 0.015;
    this.bub.forEach((b, i) => {
      const sp = 0.35 + 0.4 * hh(i, 4), y = ((t * sp + hh(i, 2)) % 1) * L, a = hh(i, 5) * 6.28 + t * 0.8, rr = r * 0.7 * hh(i, 6), s = 0.025 + 0.03 * hh(i, 7);
      b.position.set(Math.cos(a) * rr, 0.16 + y, Math.sin(a) * rr + 0.05); b.scale.setScalar(s); b.visible = y < L - 0.04;
    });
  }
  place(x: number, z: number, vis: boolean) { this.g.position.set(x, 0, z); this.g.visible = vis; }
}

type WPlace = Stage["places"][number] & { wide?: boolean; pitch?: number; sx?: number; sy?: number };

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
  private dust = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uPx: { value: 1000 }, uCol: { value: new THREE.Color(1.0, 0.82, 0.55) } };
  private pools: THREE.Mesh[] = []; private shafts: THREE.Mesh[] = [];
  private sets: Record<string, THREE.Group> = { bed: new THREE.Group(), gym: new THREE.Group(), dream: new THREE.Group(), brain: new THREE.Group(), home: new THREE.Group() };
  // bedroom
  private clockG = new THREE.Group(); private fridgeDoor = new THREE.Group();
  // gym
  private tmA!: Treadmill; private tmB!: Treadmill; private bag = new THREE.Group();
  private tankFat!: Tank; private tankCarb!: Tank;
  private scaleG = new THREE.Group(); private scaleScr: THREE.Mesh[] = []; private scrOn!: THREE.Texture; private scrOff!: THREE.Texture;
  private finishG = new THREE.Group(); private tapeL = new THREE.Group(); private tapeR = new THREE.Group();
  // dream
  private neon = new THREE.Group(); private stamp = new THREE.Group();
  // brain
  private lever = new THREE.Group(); private midScreen!: THREE.Mesh; private scrBudget!: THREE.Texture; private scrAlarm!: THREE.Texture; private beacon!: THREE.Mesh;
  // home
  private beam = new THREE.Group(); private pans: THREE.Group[] = []; private carbCubes: THREE.Mesh[] = [];

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
    R.add(this.sky, this.hemi, this.sun, this.sun.target, ...Object.values(this.sets));
    this.buildBedroom(); this.buildGym(); this.buildDream(); this.buildBrain(); this.buildHome(); this.dress();

    // pools of light on the floor + faint light shafts (additive, never inked)
    const poolT = radial("dynPool", [[0, "rgba(255,255,255,0.8)"], [0.5, "rgba(255,255,255,0.36)"], [1, "rgba(255,255,255,0)"]]);
    const shaftT = ctex("dynShaft", 32, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,255,255,0.0)"); gr.addColorStop(0.5, "rgba(255,255,255,0.07)"); gr.addColorStop(1, "rgba(255,255,255,0.17)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 128); });
    const poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), shaftGeo = new THREE.CylinderGeometry(0.35, 1.25, 8.2, 16, 1, true);
    for (let i = 0; i < 3; i++) {
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

  // =============================================================== BEDROOM (night) + the fridge
  private buildBedroom() {
    const G = this.sets.bed, box = mkBox(G), glow = mkGlow(G), cyl = mkCyl(G);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10).rotateX(-Math.PI / 2), lam("#ffffff", rep(boardsTex("dynBedBoards", ["#9a6a44", "#8f6140", "#a3714a"], "#4a2e1a"), 3, 3)));
    floor.receiveShadow = true; G.add(floor);
    const paper = ctex("dynBedPaper", 256, 256, (g) => { g.fillStyle = "#33447a"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#3a4d88" : "#2d3d6e"; g.fillRect(i * 32, 0, 32, 256); } for (let i = 0; i < 20; i++) { g.fillStyle = "rgba(255,230,160,0.25)"; g.beginPath(); g.arc((i * 53) % 256, (i * 97) % 256, 4, 0, 7); g.fill(); } });
    const wall = (w: number, h: number, x: number, y: number, z: number, ry: number) => plane(G, w, h, x, y, z, ry, lam("#ffffff", rep(paper, w / 2.5, h / 2.5), { side: THREE.DoubleSide }));
    wall(12, 5, 0, 2.5, -2.4, 0); wall(10, 5, -4.5, 2.5, 2.5, Math.PI / 2); wall(10, 5, 4.5, 2.5, 2.5, -Math.PI / 2); wall(12, 5, 0, 2.5, 5, Math.PI);
    box(12, 0.18, 0.06, 0, 0.09, -2.36, "#e8dccb", false);
    // window with the moon
    const winT = ctex("dynMoonWin", 256, 220, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 220); gr.addColorStop(0, "#0b1430"); gr.addColorStop(1, "#24366e"); g.fillStyle = gr; g.fillRect(0, 0, 256, 220);
      for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect((i * 67) % 256, (i * 41) % 200, 2, 2); }
      g.fillStyle = "#fff6d0"; g.shadowColor = "#fff6d0"; g.shadowBlur = 30; g.beginPath(); g.arc(180, 60, 30, 0, 7); g.fill(); g.shadowBlur = 0;
      g.strokeStyle = "#e8dccb"; g.lineWidth = 12; g.strokeRect(6, 6, 244, 208); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 220); g.moveTo(0, 110); g.lineTo(256, 110); g.stroke();
    });
    glow(1.5, 1.3, 0.05, -1.3, 2.4, -2.37, "#ffffff", winT);
    box(1.8, 0.12, 0.2, -1.3, 1.68, -2.3, "#e8dccb");
    // poster
    glow(0.9, 1.2, 0.03, 1.6, 2.3, -2.37, "#fff", labelTex("dynPoster", "NO PAIN NO GAIN", "#ffd23f", "#ef4444", 300, 400, 90));
    // the bed
    box(2.6, 0.35, 1.4, -1.4, 0.2, -0.25, "#7a4a2a"); box(2.5, 0.2, 1.3, -1.4, 0.45, -0.25, "#dfe6f5"); box(0.14, 1.2, 1.44, -2.72, 0.6, -0.25, "#6a3e22");
    box(0.5, 0.16, 0.8, -2.32, 0.62, -0.25, "#ffffff");
    box(1.0, 0.56, 1.38, -0.68, 0.8, -0.25, "#4f6fc0");
    box(1.02, 0.08, 1.4, -0.68, 1.04, -0.25, "#e8c45a", false);
    // nightstand, lamp, the alarm clock
    box(0.6, 0.6, 0.5, 0.12, 0.3, -0.1, "#6a4426"); box(0.5, 0.04, 0.02, 0.12, 0.42, 0.16, "#d9a441", false);
    const C = this.clockG, cb = mkBox(C), cs = mkSph(C);
    cb(0.42, 0.22, 0.16, 0, 0.13, 0, "#d02a2a"); cb(0.04, 0.06, 0.04, -0.15, 0.01, 0, "#2b2f3a"); cb(0.04, 0.06, 0.04, 0.15, 0.01, 0, "#2b2f3a");
    cs(0.07, 0.07, 0.04, -0.12, 0.28, 0, "#c9ccd2"); cs(0.07, 0.07, 0.04, 0.12, 0.28, 0, "#c9ccd2"); cb(0.02, 0.1, 0.02, 0, 0.29, 0, "#2b2f3a");
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.15), new THREE.MeshBasicMaterial({ map: ledTex("dynAlarm", "04:59 AM", "#ff3a3a", 512, 208, 92) })); scr.position.set(0, 0.13, 0.081); scr.layers.set(NOINK); C.add(scr);
    C.position.set(0.12, 0.6, 0.0); G.add(C);
    // the fridge (open, empty, its light on)
    const F = new THREE.Group(); F.position.set(2.4, 0, -1.2); G.add(F);
    const fb = mkGlow(F), inside = "#eaf5ff";
    fb(1.0, 1.9, 0.06, 0, 1.0, -0.4, inside); fb(0.06, 1.9, 0.8, -0.5, 1.0, 0, inside); fb(0.06, 1.9, 0.8, 0.5, 1.0, 0, inside); fb(1.0, 0.06, 0.8, 0, 1.95, 0, inside); fb(1.0, 0.1, 0.8, 0, 0.05, 0, "#cfdbe8");
    for (const y of [0.55, 1.0, 1.48]) { const s = fb(0.94, 0.025, 0.7, 0, y, 0, "#9ccff0", undefined, { transparent: true, opacity: 0.75 }); s.renderOrder = 6; mkBox(F)(0.94, 0.035, 0.03, 0, y, 0.34, "#7aa8c8", false); }
    fb(0.3, 0.05, 0.05, 0, 1.9, 0.0, "#fffbe0");
    const D = this.fridgeDoor; D.position.set(0.5, 0, 0.4); F.add(D);
    mkBox(D)(0.08, 1.9, 1.0, 0.04, 1.0, 0.5, "#f4f6fa"); mkBox(D)(0.04, 0.5, 0.06, -0.03, 1.2, 0.9, "#8d949c");
    D.rotation.y = 0.15;
    mkBox(F)(1.04, 1.94, 0.04, 0, 1.0, -0.45, "#f4f6fa");
  }

  // =============================================================== GYM (5 AM, warm overhead lamps)
  private buildGym() {
    const G = this.sets.gym, box = mkBox(G), cyl = mkCyl(G), glow = mkGlow(G);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 32).rotateX(-Math.PI / 2), lam("#ffffff", rep(boardsTex("dynGymBoards", ["#d8a86c", "#cf9d62", "#dfb177", "#c99659"], "#6a4426"), 10, 8)));
    floor.receiveShadow = true; G.add(floor);
    box(11, 0.04, 7, 0, 0.02, -0.6, "#6c7588", false);
    box(11.4, 0.045, 0.14, 0, 0.022, 2.98, "#f0c64a", false); box(11.4, 0.045, 0.14, 0, 0.022, -4.18, "#f0c64a", false);
    const bk = brick();
    const wallM = (w: number, h: number, x: number, y: number, z: number, ry: number) => plane(G, w, h, x, y, z, ry, lam("#a88a6a", rep(bk, w / 6, h / 4), { side: THREE.DoubleSide }));
    wallM(40, 9, 0, 4.5, -10, 0); wallM(32, 9, -18, 4.5, 2, Math.PI / 2); wallM(32, 9, 18, 4.5, 2, -Math.PI / 2); wallM(40, 9, 0, 4.5, 16, 0);
    box(40, 0.5, 0.12, 0, 1.1, -9.94, "#e2453c", false);
    const winT = ctex("dynGymWin", 128, 100, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, "#26407a"); gr.addColorStop(1, "#f0a070"); g.fillStyle = gr; g.fillRect(0, 0, 128, 100);
      g.strokeStyle = "#8d949c"; g.lineWidth = 6; g.strokeRect(3, 3, 122, 94); g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 100); g.moveTo(0, 50); g.lineTo(128, 50); g.stroke();
    });
    for (const x of [-12, -6, 0, 6, 12]) glow(3.2, 2.2, 0.1, x, 5.6, -9.9, "#fff", winT);
    glow(3.0, 1.0, 0.06, 0, 3.4, -9.9, "#fff", labelTex("dynGymSign", "PUMP GYM 24/7", "#1c1f28", "#ffd23f", 512, 170, 110, "#ffd23f"));
    for (const rx of [-6.5, 6.8]) {
      for (const dx of [-1.0, 1.0]) for (const dz of [-0.7, 0.7]) box(0.14, 2.5, 0.14, rx + dx, 1.25, -7 + dz, "#d9373b");
      box(2.3, 0.14, 0.14, rx, 2.5, -7.7, "#d9373b"); box(2.3, 0.14, 0.14, rx, 2.5, -6.3, "#d9373b");
      cyl(0.04, 2.7, rx, 1.8, -7, "#c9ccd2", Math.PI / 2);
    }
    for (const [x, n] of [[3.4, 8], [5.0, 14]] as const) for (let i = 0; i < n; i++) cyl(0.46, 0.12, x, 0.06 + i * 0.125, -3.6, i % 2 ? "#c0353a" : "#2f3340");
    for (let i = 0; i < 8; i++) { const x = -15 + i * 0.7; cyl(0.05, 0.3, x, 1.05, -9.3, "#8d949c", Math.PI / 2); cyl(0.13, 0.08, x - 0.14, 1.05, -9.3, "#2f3340", Math.PI / 2); cyl(0.13, 0.08, x + 0.14, 1.05, -9.3, "#2f3340", Math.PI / 2); }
    const lampM = new THREE.ConeGeometry(0.55, 0.5, 12, 1, true);
    for (const z of [-4, 4]) { box(40, 0.3, 0.3, 0, 8.3, z, "#4a4f5c", false); for (const x of [-12, -6, 0, 6, 12]) { const l = new THREE.Mesh(lampM, basic("#fff1b8", { side: THREE.DoubleSide })); l.position.set(x, 7.8, z); l.layers.set(NOINK); G.add(l); } }
    this.bag.position.set(-3.4, 3.0, -8.0);
    const bagM = new THREE.Mesh(CYL, lam("#c0353a")); bagM.scale.set(0.3, 1.3, 0.3); bagM.position.y = -1.0; this.bag.add(bagM);
    G.add(this.bag); box(0.14, 3.2, 0.14, -3.4, 1.6, -8.6, "#4a4f5c"); box(0.14, 0.14, 0.7, -3.4, 3.05, -8.3, "#4a4f5c");
    this.tmA = new Treadmill(G, "A"); this.tmB = new Treadmill(G, "B");
    this.tankFat = new Tank(G, "#FFD23F", "#FFF3A8", labelTex("dynTankFat", "FAT", "#FFD23F", "#ffffff", 384, 144, 110));
    this.tankCarb = new Tank(G, "#3AA0FF", "#BDE0FF", labelTex("dynTankCarb", "CARBS", "#3AA0FF", "#ffffff", 384, 144, 110));
    // two floor scales: platform + a low display facing the camera
    this.scrOff = ledTex("dynScaleOff", "--.- LB", "#5a6270", 256, 128, 50); this.scrOn = ledTex("dynScaleOn", "-1.0 LB", "#3DFF7A", 256, 128, 50);
    for (const sx of [-1, 1]) {
      const sb = mkBox(this.scaleG), x = sx * RACE_X;
      sb(0.9, 0.08, 0.66, x, 0.04, SCALE_Z, "#c9ccd2"); sb(0.86, 0.02, 0.6, x, 0.085, SCALE_Z, "#2b2f3a", false);
      sb(0.12, 0.42, 0.1, x, 0.21, SCALE_Z + 0.48, "#8d949c"); sb(0.7, 0.36, 0.1, x, 0.5, SCALE_Z + 0.5, "#23262f");
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3), new THREE.MeshBasicMaterial({ map: this.scrOff })); sc.position.set(x, 0.5, SCALE_Z + 0.556); sc.layers.set(NOINK); this.scaleG.add(sc); this.scaleScr.push(sc);
    }
    this.scaleG.visible = false; G.add(this.scaleG);
    // finish line: two posts, a FINISH banner, the tape in two halves (each swings down from its post when broken)
    const fb = mkBox(this.finishG), fz = 1.2;
    for (const s of [-1, 1]) { fb(0.1, 2.75, 0.1, s * 1.85, 1.375, fz, "#f4f6fa"); fb(0.24, 0.06, 0.24, s * 1.85, 0.03, fz, "#2b2f3a"); }
    const flag = ctex("dynFinish", 512, 96, (g) => { for (let i = 0; i < 32; i++) for (let j = 0; j < 6; j++) { g.fillStyle = (i + j) % 2 ? "#111114" : "#ffffff"; g.fillRect(i * 16, j * 16, 16, 16); } g.fillStyle = "#ef4444"; g.fillRect(150, 10, 212, 76); g.font = "900 60px Arial Black, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText("FINISH", 256, 50); });
    mkGlow(this.finishG)(3.7, 0.42, 0.04, 0, 2.62, fz, "#fff", flag);
    for (const [grp, s] of [[this.tapeL, -1], [this.tapeR, 1]] as const) { grp.position.set(s * 1.85, 1.05, fz); mkBox(grp)(1.85, 0.07, 0.02, -s * 0.925, 0, 0, "#ef4444", false); this.finishG.add(grp); }
    this.finishG.visible = false; G.add(this.finishG);
  }

  // =============================================================== TITO'S DREAM (pastel sky, cloud island, rainbow, neon sign, the giant stamp)
  private buildDream() {
    const G = this.sets.dream, sph = mkSph(G);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = 1.2 + 1.3 * hh(i, 1); sph(0.9 + 0.5 * hh(i, 2), 0.35 + 0.15 * hh(i, 3), 0.8 + 0.4 * hh(i, 4), Math.cos(a) * r, 0.05, Math.sin(a) * r * 0.8, "#ffffff"); }
    sph(2.2, 0.36, 1.8, 0, 0.0, 0, "#ffffff");
    for (let i = 0; i < 14; i++) { const x = (hh(i, 5) - 0.5) * 30, z = -8 - hh(i, 6) * 14, y = -1 + hh(i, 7) * 6; for (let k = 0; k < 4; k++) sph(1.2 + hh(i * 4 + k, 8), 0.6 + 0.4 * hh(i * 4 + k, 9), 0.9, x + (k - 1.5) * 1.1, y + 0.3 * hh(k, 3), z, "#fff4fb"); }
    const cols = ["#ff5a5a", "#ffa23a", "#ffe14a", "#5ad66a", "#4aa8ff", "#a070ff"];
    cols.forEach((c, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(6.5 - i * 0.28, 0.14, 8, 48, Math.PI), basic(c)); t.position.set(0, -0.6, -9); t.layers.set(NOINK); G.add(t); });
    // the neon "2X FAT MELT" sign above Tito
    const nT = ctex("dynNeon", 768, 256, (g) => {
      g.fillStyle = "#1b0f2e"; g.fillRect(0, 0, 768, 256); g.strokeStyle = "#ff5ad0"; g.shadowColor = "#ff5ad0"; g.shadowBlur = 24; g.lineWidth = 12; g.strokeRect(14, 14, 740, 228);
      let fz = 140; g.font = `900 ${fz}px Arial Black, Impact, sans-serif`; while (g.measureText("2X FAT MELT").width > 700) { fz -= 4; g.font = `900 ${fz}px Arial Black, Impact, sans-serif`; } g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "#ffe14a"; g.shadowBlur = 30; g.fillStyle = "#fff6a8"; g.fillText("2X FAT MELT", 384, 136);
    });
    const nm = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ map: nT })); nm.scale.set(1.34, 0.45, 0.08); nm.layers.set(NOINK); this.neon.add(nm);
    mkBox(this.neon)(0.04, 0.8, 0.04, -0.55, 0.62, -0.05, "#8d949c", false); mkBox(this.neon)(0.04, 0.8, 0.04, 0.55, 0.62, -0.05, "#8d949c", false);
    this.neon.position.set(0, 2.55, -0.35); G.add(this.neon);
    // the giant rubber stamp: a varnished wooden block, red rubber, a handle with a knob
    const S = this.stamp, sb = mkBox(S);
    sb(2.2, 1.1, 1.3, 0, 0.62, 0, "#9a6232"); sb(2.24, 0.12, 1.34, 0, 0.06, 0, "#c81e1e"); sb(2.26, 0.08, 1.36, 0, 1.2, 0, "#7a4a22");
    mkCyl(S)(0.17, 1.0, 0, 1.7, 0, "#7a4a22"); mkSph(S)(0.32, 0.26, 0.32, 0, 2.3, 0, "#c81e1e");
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ map: labelTex("dynStampFace", "MYTH", "#9a6232", "#ff3030", 512, 160, 120, "#9a6232") })); face.position.set(0, 0.64, 0.66); face.layers.set(NOINK); S.add(face);
    S.visible = false; G.add(S);
  }

  // =============================================================== BRAIN CONTROL CENTRE
  private buildBrain() {
    const G = this.sets.brain, box = mkBox(G), glow = mkGlow(G);
    const tiles = ctex("dynBrainTiles", 256, 256, (g) => { g.fillStyle = "#1c2433"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#2c3a50"; g.lineWidth = 4; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); } });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12).rotateX(-Math.PI / 2), lam("#ffffff", rep(tiles, 7, 6))); floor.receiveShadow = true; G.add(floor);
    const panel = ctex("dynBrainWall", 256, 256, (g) => { g.fillStyle = "#16384a"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#0e2633"; g.lineWidth = 6; g.strokeRect(8, 8, 240, 240); g.fillStyle = "#3df0ff"; for (let i = 0; i < 6; i++) g.fillRect(20 + i * 36, 230, 14, 6); });
    const wall = (w: number, h: number, x: number, y: number, z: number, ry: number) => plane(G, w, h, x, y, z, ry, lam("#ffffff", rep(panel, w / 1.6, h / 1.6), { side: THREE.DoubleSide }));
    wall(14, 5, 0, 2.5, -1.9, 0); wall(12, 5, -4, 2.5, 3, Math.PI / 2); wall(12, 5, 4, 2.5, 3, -Math.PI / 2); wall(14, 5, 0, 2.5, 8, Math.PI);
    // three screens
    const graph = ctex("dynScrGraph", 384, 256, (g) => { g.fillStyle = "#06121c"; g.fillRect(0, 0, 384, 256); g.strokeStyle = "#1f4a5a"; g.lineWidth = 2; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, i * 42); g.lineTo(384, i * 42); g.stroke(); } g.strokeStyle = "#ffd23f"; g.lineWidth = 8; g.beginPath(); g.moveTo(20, 60); g.lineTo(120, 90); g.lineTo(200, 150); g.lineTo(290, 180); g.lineTo(364, 220); g.stroke(); g.font = "bold 34px 'Courier New', monospace"; g.fillStyle = "#ffd23f"; g.fillText("FAT STORES", 30, 40); });
    const fuel = ctex("dynScrFuel", 384, 256, (g) => { g.fillStyle = "#06121c"; g.fillRect(0, 0, 384, 256); g.font = "bold 34px 'Courier New', monospace"; g.fillStyle = "#3df0ff"; g.fillText("FUEL MIX", 30, 44); g.fillStyle = "#ffd23f"; g.fillRect(30, 70, 250, 50); g.fillStyle = "#3aa0ff"; g.fillRect(30, 150, 90, 50); g.fillStyle = "#fff"; g.font = "bold 28px 'Courier New', monospace"; g.fillText("FAT", 290, 106); g.fillText("CARBS", 130, 186); });
    this.scrBudget = ctex("dynScrBudget", 512, 320, (g) => { g.fillStyle = "#06121c"; g.fillRect(0, 0, 512, 320); g.font = "bold 46px 'Courier New', monospace"; g.textAlign = "center"; g.fillStyle = "#3dff7a"; g.fillText("ENERGY BUDGET", 256, 80); g.fillText("24 H", 256, 150); g.strokeStyle = "#3dff7a"; g.lineWidth = 6; g.strokeRect(60, 190, 392, 70); g.fillStyle = "#3dff7a"; g.fillRect(70, 200, 260, 50); });
    this.scrAlarm = ctex("dynScrAlarm", 512, 320, (g) => { g.fillStyle = "#3a0608"; g.fillRect(0, 0, 512, 320); g.font = "900 64px Arial Black, Impact, sans-serif"; g.textAlign = "center"; g.fillStyle = "#ff4040"; g.shadowColor = "#ff4040"; g.shadowBlur = 20; g.fillText("COMPENSATION", 256, 130); g.fillText("MODE: ON", 256, 220); });
    glow(1.2, 0.8, 0.06, -1.55, 2.0, -1.86, "#fff", graph); glow(1.2, 0.8, 0.06, 1.55, 2.0, -1.86, "#fff", fuel);
    this.midScreen = glow(1.6, 1.0, 0.06, 0, 2.2, -1.86, "#fff", this.scrBudget);
    box(4.6, 0.12, 0.2, 0, 2.85, -1.8, "#0e2633");
    this.beacon = glow(0.22, 0.2, 0.22, 0, 3.05, -1.75, "#ff3030"); box(0.3, 0.08, 0.3, 0, 2.92, -1.75, "#2b2f3a");
    // the desk with a button panel and the COMPENSATION MODE plate
    box(2.5, 0.95, 0.7, 0, 0.475, 0.55, "#3a4660");
    const btn = ctex("dynBtns", 512, 128, (g) => { g.fillStyle = "#2a3448"; g.fillRect(0, 0, 512, 128); const c = ["#ef4444", "#ffd23f", "#3dff7a", "#3aa0ff"]; for (let i = 0; i < 14; i++) { g.fillStyle = c[i % 4]; g.beginPath(); g.arc(24 + i * 34, 40 + 44 * (i % 2), 13, 0, 7); g.fill(); } });
    const top = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ map: btn })); top.scale.set(2.4, 0.04, 0.6); top.position.set(-0.2, 0.97, 0.55); top.layers.set(NOINK); G.add(top);
    glow(0.95, 0.26, 0.02, 0.2, 0.74, 0.91, "#fff", labelTex("dynLeverPlate", "COMPENSATION MODE", "#ffd23f", "#111114", 768, 210, 92));
    box(0.34, 0.1, 0.34, LEVER[0], 1.0, LEVER[2], "#5b6270");
    const L = this.lever; L.position.set(...LEVER); mkCyl(L)(0.035, 0.5, 0, 0.25, 0, "#c9ccd2"); mkSph(L)(0.08, 0.08, 0.08, 0, 0.52, 0, "#ef4444"); G.add(L);
  }

  // =============================================================== LIVING ROOM 03:00 PM (sunny)
  private buildHome() {
    const H = this.sets.home, box = mkBox(H), cyl = mkCyl(H), glow = mkGlow(H);
    const carpet = ctex("dynCarpet", 256, 256, (g, r) => { g.fillStyle = "#c79a6a"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 2, 5); } });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12).rotateX(-Math.PI / 2), lam("#ffffff", rep(carpet, 4, 4))); floor.receiveShadow = true; H.add(floor);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32).rotateX(-Math.PI / 2), lam("#2f7f86")); rug.position.set(0.2, 0.01, 0.2); rug.receiveShadow = true; H.add(rug);
    const paper = ctex("dynHomePaper", 256, 256, (g) => { g.fillStyle = "#e8b26a"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#efbd7a" : "#e0a862"; g.fillRect(i * 32, 0, 32, 256); } });
    const wall = (w: number, h: number, x: number, y: number, z: number, ry: number) => plane(H, w, h, x, y, z, ry, lam("#ffffff", rep(paper, w / 3, h / 3), { side: THREE.DoubleSide }));
    wall(14, 5, 0, 2.5, -2.5, 0); wall(12, 5, -4.5, 2.5, 3, Math.PI / 2); wall(12, 5, 4.5, 2.5, 3, -Math.PI / 2); wall(14, 5, 0, 2.5, 8, Math.PI);
    box(14, 0.2, 0.06, 0, 0.1, -2.46, "#f4f1ea", false);
    const winT = ctex("dynSunWin", 256, 200, (g) => { const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, "#8fd0ff"); gr.addColorStop(1, "#ffe2a8"); g.fillStyle = gr; g.fillRect(0, 0, 256, 200); g.fillStyle = "#fff6c0"; g.shadowColor = "#fff2a0"; g.shadowBlur = 30; g.beginPath(); g.arc(70, 70, 34, 0, 7); g.fill(); g.shadowBlur = 0; g.fillStyle = "#6fcb6f"; g.fillRect(0, 160, 256, 40); g.strokeStyle = "#f4f1ea"; g.lineWidth = 12; g.strokeRect(6, 6, 244, 188); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 200); g.stroke(); });
    glow(1.6, 1.3, 0.05, -2.75, 2.45, -2.47, "#fff", winT);
    glow(0.95, 0.4, 0.12, -1.0, 2.15, -2.42, "#fff", ledTex("dynClockPm", "03:00 PM", "#ff3a3a", 512, 208, 92));
    // sofa
    box(2.5, 0.45, 0.95, -1.4, 0.225, -1.85, "#5b4a8a"); box(2.5, 0.85, 0.28, -1.4, 0.85, -2.28, "#4d3e78"); box(0.3, 0.75, 0.95, -2.75, 0.375, -1.85, "#4d3e78"); box(0.3, 0.75, 0.95, -0.05, 0.375, -1.85, "#4d3e78");
    box(0.55, 0.45, 0.16, -2.2, 0.68, -2.08, "#e8a22f");
    // coffee table with empty plates and a pizza box tower, plants
    box(1.1, 0.06, 0.6, -1.3, 0.38, -0.6, "#7a4a2a"); for (const dx of [-0.48, 0.48]) for (const dz of [-0.24, 0.24]) box(0.05, 0.36, 0.05, -1.3 + dx, 0.18, -0.6 + dz, "#5a3a20");
    for (let i = 0; i < 3; i++) cyl(0.17, 0.02, -1.6 + i * 0.3, 0.42, -0.6 + 0.08 * (i % 2), "#f4f6fa");
    for (let i = 0; i < 4; i++) box(0.7, 0.07, 0.7, -3.4 + 0.03 * Math.sin(i * 2), 0.035 + i * 0.075, -1.6, i % 2 ? "#d9a441" : "#c0353a");
    for (let i = 0; i < 6; i++) { const a = hh(i, 3) * Math.PI * 2, rr = 0.6 + 0.6 * hh(i, 4); cyl(0.2, 0.02, -1.4 + Math.cos(a) * rr * 1.3, 0.012, -0.3 + Math.sin(a) * rr * 0.5, i % 3 ? "#f4f6fa" : "#e8c45a"); }
    cyl(0.22, 0.4, 3.4, 0.2, -1.9, "#c0603a"); mkSph(H)(0.45, 0.6, 0.45, 3.4, 0.85, -1.9, "#3f9a4a");
    // the giant balance of justice
    cyl(0.5, 0.14, BEAM[0], 0.07, BEAM[2], "#d9a441"); cyl(0.07, BEAM[1] - 0.1, BEAM[0], (BEAM[1] - 0.1) / 2 + 0.1, BEAM[2], "#e8c45a"); mkSph(H)(0.13, 0.13, 0.13, BEAM[0], BEAM[1] + 0.14, BEAM[2], "#e8c45a");
    const B = this.beam; B.position.set(...BEAM); mkBox(B)(1.62, 0.08, 0.08, 0, 0, 0, "#e8c45a"); H.add(B);
    const fatT = labelTex("dynCubeFat", "FAT", "#FFD23F", "#ffffff", 192, 192, 70), carbT = labelTex("dynCubeCarb", "CARBS", "#3AA0FF", "#ffffff", 192, 192, 52);
    for (let s = 0; s < 2; s++) {
      const P = new THREE.Group(); mkBox(P)(0.02, 0.78, 0.02, 0, -0.39, 0, "#8d949c", false); mkCyl(P)(0.34, 0.05, 0, -0.8, 0, "#e8c45a"); H.add(P); this.pans.push(P);
      const T = s === 0 ? fatT : carbT;
      const spots: V3[] = [[-0.13, -0.66, 0.02], [0.13, -0.66, -0.02], [0, -0.44, 0]];
      spots.forEach((q, k) => { const c = new THREE.Mesh(BOX, lam("#ffffff", T)); c.scale.setScalar(0.22); c.position.set(...q); c.castShadow = true; P.add(c); if (s === 1) this.carbCubes[k] = c; });
    }
  }

  // =============================================================== SET DRESSING (Rick Clips density): props everywhere, warm glowing bulbs that bloom, depth layers
  private dress() {
    const HOT = new Map<string, THREE.MeshBasicMaterial>();
    const hot = (hex: string, k = 3) => { const key = hex + k; let m = HOT.get(key); if (!m) { const c = new THREE.Color(hex).multiplyScalar(k); m = new THREE.MeshBasicMaterial({ color: c, toneMapped: true }); HOT.set(key, m); } return m; };
    const bulb = (P: THREE.Object3D, x: number, y: number, z: number, r: number, hex: string, k = 3) => { const m = new THREE.Mesh(SPH, hot(hex, k)); m.scale.setScalar(r); m.position.set(x, y, z); m.layers.set(NOINK); P.add(m); return m; };
    const lights = (P: THREE.Object3D, x0: number, x1: number, y: number, z: number, sag: number, n: number, cols: string[]) => {
      for (let k = 0; k <= n; k++) { const u = k / n, x = lerp(x0, x1, u), yy = y - sag * 4 * u * (1 - u); bulb(P, x, yy, z, 0.035, cols[k % cols.length], 3.2); if (k < n) { const u2 = (k + 0.5) / n; const w = mkBox(P)(Math.abs(x1 - x0) / n, 0.008, 0.008, lerp(x0, x1, u2), y - sag * 4 * u2 * (1 - u2) + 0.02, z, "#222", false); w.castShadow = false; } }
    };
    const books = (P: THREE.Object3D, x: number, y: number, z: number, w: number) => { const b = mkBox(P); let xx = x - w / 2; let i = 0; const cs = ["#c0353a", "#2f7f86", "#e8a22f", "#5b4a8a", "#3f9a4a", "#d9d2c0"]; while (xx < x + w / 2 - 0.05) { const bw = 0.05 + 0.04 * hh(i, 21), bh = 0.22 + 0.1 * hh(i, 22); b(bw, bh, 0.18, xx + bw / 2, y + bh / 2, z, cs[i % cs.length]); xx += bw + 0.008; i++; } };
    const shelf = (P: THREE.Object3D, x: number, z: number, w: number, levels: number[], col = "#7a4a2a") => { const b = mkBox(P); for (const y of levels) { b(w, 0.04, 0.26, x, y, z, col); books(P, x - 0.05, y + 0.02, z, w * 0.75); } b(0.04, levels[levels.length - 1] + 0.1, 0.26, x - w / 2, (levels[levels.length - 1] + 0.1) / 2, z, col); b(0.04, levels[levels.length - 1] + 0.1, 0.26, x + w / 2, (levels[levels.length - 1] + 0.1) / 2, z, col); };
    const plant = (P: THREE.Object3D, x: number, z: number, s = 1) => { mkCyl(P)(0.16 * s, 0.3 * s, x, 0.15 * s, z, "#c0603a"); for (let k = 0; k < 5; k++) mkSph(P)(0.16 * s, 0.32 * s, 0.1 * s, x + 0.12 * s * Math.cos(k * 1.3), 0.5 * s + 0.08 * s * k % 0.3, z + 0.08 * s * Math.sin(k * 1.3), k % 2 ? "#3f9a4a" : "#2f7f3a"); };
    const frame = (P: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, art: THREE.Texture) => { mkBox(P)(w + 0.08, h + 0.08, 0.04, x, y, z, "#e8c45a", false); mkGlow(P)(w, h, 0.02, x, y, z + 0.025, "#fff", art); };
    const artTex = (key: string, bg: string, fg: string, shape: number) => ctex(key, 128, 160, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 128, 160); g.fillStyle = fg; if (shape === 0) { g.beginPath(); g.arc(64, 70, 34, 0, 7); g.fill(); g.fillRect(0, 120, 128, 40); } else if (shape === 1) { g.beginPath(); g.moveTo(10, 140); g.lineTo(64, 40); g.lineTo(118, 140); g.fill(); } else { for (let k = 0; k < 4; k++) g.fillRect(14 + k * 28, 120 - k * 24, 20, 24 + k * 24); } });

    // ---- bedroom: fairy lights, a bookshelf, frames, rug, sneakers, a dumbbell, a plant, a glowing bedside bulb
    { const G = this.sets.bed;
      lights(G, -3.6, 3.8, 3.2, -2.3, 0.35, 26, ["#ffd27a", "#ff9a6a", "#fff0b0"]);
      shelf(G, 1.55, -2.22, 1.3, [0.9, 1.3]);
      frame(G, -2.9, 2.35, -2.36, 0.5, 0.65, artTex("dynArt1", "#f2c46a", "#c0353a", 0)); frame(G, 0.55, 2.55, -2.36, 0.45, 0.55, artTex("dynArt2", "#9ad0ff", "#2f5f9a", 1));
      const rug = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32).rotateX(-Math.PI / 2), lam("#c0603a")); rug.position.set(-0.6, 0.012, 1.0); rug.receiveShadow = true; G.add(rug);
      const b = mkBox(G); b(0.26, 0.1, 0.12, -0.2, 0.05, 0.9, "#f4f6fa"); b(0.26, 0.1, 0.12, 0.05, 0.05, 1.05, "#f4f6fa"); b(0.26, 0.03, 0.12, -0.2, 0.01, 0.9, "#c0353a", false);
      mkCyl(G)(0.035, 0.36, 0.55, 0.09, 0.6, "#8d949c", Math.PI / 2); mkCyl(G)(0.09, 0.07, 0.38, 0.09, 0.6, "#2f3340", Math.PI / 2); mkCyl(G)(0.09, 0.07, 0.72, 0.09, 0.6, "#2f3340", Math.PI / 2);
      plant(G, 3.7, -1.9, 1.2); plant(G, -3.9, -1.9, 1.0);
      bulb(G, -0.12, 0.95, -0.22, 0.06, "#ffcf8a", 2.2); mkCyl(G)(0.03, 0.3, -0.12, 0.75, -0.22, "#8d949c");
      b(0.9, 1.9, 0.5, -3.9, 0.95, 0.8, "#6a4426"); b(0.04, 1.7, 0.02, -3.65, 0.95, 1.06, "#4a2e1a", false); }
    // ---- gym: dumbbell rack, benches, kettlebells, back row of treadmills, banners, water cooler, plants, glowing lamp bulbs
    { const G = this.sets.gym, b = mkBox(G), c = mkCyl(G), glow = mkGlow(G);
      b(3.2, 0.08, 0.5, -2.6, 0.75, -3.4, "#2b2f3a"); b(3.2, 0.08, 0.5, -2.6, 0.35, -3.4, "#2b2f3a"); for (const x of [-4.1, -1.1]) b(0.08, 0.8, 0.5, x, 0.4, -3.4, "#8d949c");
      for (let k = 0; k < 9; k++) for (const [y, r] of [[0.84, 0.07 + 0.01 * k], [0.44, 0.09 + 0.012 * k]] as const) { const x = -3.95 + k * 0.33; c(0.025, 0.24, x, y, -3.4, "#8d949c", 0, Math.PI / 2); c(r, 0.06, x, y, -3.52, "#1c1f28", 0, Math.PI / 2); c(r, 0.06, x, y, -3.28, "#1c1f28", 0, Math.PI / 2); }
      for (const [x, z] of [[2.6, -2.6], [-2.7, 2.0]] as const) { b(1.3, 0.12, 0.38, x, 0.48, z, "#c0353a"); b(0.08, 0.42, 0.3, x - 0.5, 0.21, z, "#8d949c"); b(0.08, 0.42, 0.3, x + 0.5, 0.21, z, "#8d949c"); }
      for (let k = 0; k < 5; k++) { const x = 1.2 + k * 0.42; mkSph(G)(0.13, 0.13, 0.13, x, 0.13, -3.0, k % 2 ? "#2f3340" : "#e8a22f"); c(0.05, 0.08, x, 0.29, -3.0, "#2f3340"); }
      for (const x of [-4.2, -2.4, 2.4, 4.2]) { const t = new Treadmill(G, "bk" + x); t.place(x, -5.6, true); }
      glow(1.6, 0.8, 0.05, -6.0, 4.6, -9.88, "#fff", labelTex("dynBan1", "NO EXCUSES", "#c0353a", "#ffffff", 512, 256, 110)); glow(1.6, 0.8, 0.05, 6.0, 4.6, -9.88, "#fff", labelTex("dynBan2", "BEAST MODE", "#1c1f28", "#ffd23f", 512, 256, 110, "#ffd23f"));
      b(0.4, 1.1, 0.4, 5.2, 0.55, -4.2, "#f4f6fa"); c(0.16, 0.42, 5.2, 1.32, -4.2, "#8fd0ff");
      plant(G, -5.4, -4.0, 1.5); plant(G, 5.9, -2.8, 1.4);
      for (const z of [-4, 4]) for (const x of [-12, -6, 0, 6, 12]) bulb(G, x, 7.62, z, 0.2, "#fff1c8", 2.6);
      lights(G, -9, 9, 6.4, -9.85, 0.6, 30, ["#ff5a5a", "#ffd23f", "#5ad0ff", "#7aff8a"]);
      for (let k = 0; k < 6; k++) b(0.5, 0.06, 0.06, -8.6 + k * 0.9, 1.9, -9.9, "#8d949c"); }
    // ---- dream: floating balloons + sparkles that bloom, a sun glow
    { const G = this.sets.dream;
      const cols = ["#ff5a8a", "#ffd23f", "#5ad0ff", "#a070ff", "#7aff8a"];
      for (let k = 0; k < 9; k++) { const x = (k % 2 ? 1 : -1) * (1.6 + 1.4 * hh(k, 31)), y = 1.4 + 2.2 * hh(k, 32), z = -1.5 - 3 * hh(k, 33); mkSph(G)(0.22, 0.27, 0.22, x, y, z, cols[k % 5]); mkBox(G)(0.008, 0.9, 0.008, x, y - 0.7, z, "#ffffff", false); }
      for (let k = 0; k < 40; k++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(1), hot(k % 2 ? "#fff3a8" : "#ffd0f0", 3)); m.scale.setScalar(0.03 + 0.03 * hh(k, 41)); m.position.set((hh(k, 42) - 0.5) * 9, 0.5 + 4 * hh(k, 43), -0.5 - 6 * hh(k, 44)); m.layers.set(NOINK); G.add(m); }
      bulb(G, 4.5, 6.5, -14, 1.6, "#fff6c8", 2.4); }
    // ---- brain room: server racks with blinking LEDs, cables, small monitors on the desk
    { const G = this.sets.brain, b = mkBox(G);
      for (const x of [-2.6, 2.6]) { b(0.9, 2.4, 0.7, x, 1.2, -1.4, "#1c2433"); for (let r = 0; r < 10; r++) for (let q = 0; q < 4; q++) bulb(G, x - 0.3 + q * 0.2, 0.4 + r * 0.2, -1.04, 0.022, ["#3dff7a", "#5ad0ff", "#ffd23f", "#ff4d4d"][(r + q) % 4], 2.6); }
      for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(CYL, lam(["#ef4444", "#3aa0ff", "#ffd23f", "#3dff7a", "#a070ff"][k])); c.scale.set(0.025, 3.0, 0.025); c.rotation.set(Math.PI / 2, 0, 0.3 * (k - 2)); c.position.set(-0.9 + k * 0.45, 0.03, -0.2); G.add(c); }
      for (const x of [-0.9, -0.35]) { b(0.42, 0.3, 0.04, x, 1.18, 0.4, "#111"); mkGlow(G)(0.36, 0.24, 0.01, x, 1.18, 0.425, "#3df0ff"); b(0.05, 0.12, 0.05, x, 1.02, 0.4, "#5b6270"); } }
    // ---- living room: bookshelf, TV glow, curtains, floor lamp, frames, cushions, plants
    { const H = this.sets.home, b = mkBox(H);
      shelf(H, 3.6, -2.35, 1.2, [0.5, 0.95, 1.4, 1.85], "#8a5a32");
      b(0.9, 0.5, 0.06, 0.35, 1.45, -2.44, "#111"); mkGlow(H)(0.82, 0.42, 0.01, 0.35, 1.45, -2.4, "#7ad0ff"); b(1.1, 0.5, 0.4, 0.35, 0.25, -2.25, "#6a4426");
      for (const s of [-1, 1]) b(0.35, 2.0, 0.06, -2.75 + s * 1.0, 2.3, -2.42, "#c0353a");
      mkCyl(H)(0.02, 1.6, 2.7, 0.8, -2.0, "#2b2f3a"); bulb(H, 2.7, 1.68, -2.0, 0.14, "#ffd9a0", 2.2);
      frame(H, -0.2, 2.75, -2.44, 0.4, 0.5, artTex("dynArt3", "#ffe2a8", "#3f9a4a", 1)); frame(H, 2.3, 2.6, -2.44, 0.55, 0.42, artTex("dynArt4", "#2f3f6a", "#ffd23f", 2));
      for (const [x, cl] of [[-0.6, "#2f7f86"], [-1.6, "#e8c45a"]] as const) b(0.5, 0.42, 0.15, x, 0.68, -2.1, cl);
      plant(H, -3.9, -1.0, 1.3); }
  }

  private shotSun(i: number, el: number) {
    let v = this.sunCache.get(i);
    if (v) return v;
    let fx = 0, fz = 0;
    const a = shotStart(i), b = shotEnd(i);
    for (let k = 0; k <= 10; k++) { const c = camAt(i, a + ((b - a) * k) / 10), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(150), e2 = THREE.MathUtils.degToRad(el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(e2), Math.sin(e2), hz * Math.cos(e2)).normalize();
    this.sunCache.set(i, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(i: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const sh = SHOTS[i], setName = sh.set === "fridge" ? "bed" : sh.set, L = LP[sh.set], t = f / FPS, ts = tsOf(i, f);
    const K = sh.set === "dream" ? SKY.dream : sh.set === "home" ? SKY.home : SKY.night;
    const c = camAt(i, f);
    // camera shake: the bear's roar, the stamp, the splat
    let shk = 0;
    if (i === 2) shk = 0.012 * Math.sin(f * 1.6) * Math.exp(-Math.max(0, ts - wordTs(2, "bear")) * 2.5) * (ts > wordTs(2, "bear") - 0.05 ? 1 : 0);
    if (i === 4) { const d = ts - wordTs(4, "doesnt"); if (d > 0) shk = 0.035 * Math.sin(f * 1.5) * Math.exp(-d * 5); }
    if (i === 11) { const d = ts - wordTs(11, "suffering"); if (d > 0) shk = 0.03 * Math.sin(f * 1.5) * Math.exp(-d * 5); }
    cam.position.set(c.pos[0] + shk, c.pos[1] + shk * 0.7, c.pos[2]); cam.up.set(0, 1, 0); cam.lookAt(c.look[0], c.look[1], c.look[2]);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = this.focusV.set(c.look[0], c.look[1], c.look[2]), dist = cam.position.distanceTo(focus), sunDir = this.shotSun(i, L.el);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 0.9 + 4, 9, 28);
    this.sun.position.copy(focus).addScaledVector(sunDir, 80); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 10; sc.far = 300; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    // the brain room turns red when COMPENSATION MODE is on
    const alarm = i === 7 ? smooth((ts - wordTs(7, "stupid") - 0.05) / 0.2) * (0.6 + 0.4 * Math.sin(f * 0.8)) : 0;
    const lit = L.lit.map((v, k) => v * (1 - 0.35 * alarm) + (k === 0 ? 0.9 : 0.05) * alarm) as [number, number, number];
    TONE.uLitCol.value.set(...lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce);
    TONE.uSat.value = 1.0;
    const ct = L.charTint.map((v, k) => v * (1 - 0.2 * alarm) + (k === 0 ? 0.3 : 0) * alarm) as [number, number, number];
    CHAR.uCharTint.value.set(...ct); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, k) => untone(this.col.set(h), su["c" + k].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(this.col.set(L.fog), this.fog.color);
    this.fog.near = sh.set === "dream" ? 14 : 16; this.fog.far = sh.set === "dream" ? 60 : 95;
    scene.fog = this.fog; scene.background = null;
    for (const [k, g] of Object.entries(this.sets)) g.visible = k === setName;
    this.bag.rotation.z = Math.sin(t * 2.3) * 0.11;
    this.dust.uT.value = t; this.dust.uCam.value.copy(cam.position);
    this.dust.uCol.value.set(...((sh.set === "dream" ? [1.0, 0.85, 0.95] : sh.set === "bed" || sh.set === "fridge" ? [0.7, 0.8, 1.0] : [1.0, 0.82, 0.55]) as [number, number, number]));
    this.tmA.place(0, 0, false); this.tmB.place(0, 0, false); this.tankFat.place(0, 0, false); this.tankCarb.place(0, 0, false);
    this.scaleG.visible = false; this.finishG.visible = false; this.stamp.visible = false;

    // ---- cast ----
    const right = this.right.setFromMatrixColumn(cam.matrixWorld, 0);
    const light = light2D(sunDir, right);
    const st: Stage = { places: [], fx: [] };
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const lidAt = (k: number) => {
      let s = Math.round(-60 * hh(k, 9)); const fi = Math.floor(f);
      for (let n = 0; s <= fi && n < 80; n++) { const d = fi - s; if (d >= 0 && d < 4) return [0.5, 1, 1, 0.5][d]; s += Math.round(15 + 54 * hh(k * 31 + n, 13)); }
      return 0;
    };
    const visible = (x: number, y: number, z: number, r: number) => this.frustum.intersectsSphere(this.sph.set(this.v.set(x, y, z), r));
    const tierC = (d: number): [number, number, number] => (d < 7 ? [2000, 1400, 1.0] : d < 16 ? [1000, 700, 0.5] : [500, 350, 0.25]);
    type FO = Parameters<typeof titoFront>[1];
    /** Tito: flat 2D card standing at (x, y, z) with a FIXED yaw; `post` paints extra things on the same card; ex = flat / squash */
    const frontT = (who: string, x: number, y: number, z: number, opts: Omit<FO, "light" | "blink">, k: number, post?: (p: Pen) => void, ex: Partial<WPlace> = {}, postKey = "") => {
      if (!visible(x, y + 1.1, z, 3.5)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 1.2, z)), [w, h, kk] = tier(d);
      const o2 = { ...opts, light, blink: d < 16 ? lidAt(k) : 0 } as FO;
      st.places.push({ key: `${who}|${JSON.stringify(o2)}|${postKey}`, x, y, z, size: [w, h, kk], scale: 1, yaw: 0, draw: (p) => { titoFront(p, o2); if (post) post(p); }, ...ex } as WPlace);
      if (d < 60 && !ex.pitch) blob(st, sunDir, x, y, z, 1.0);
    };
    const wideP = (who: string, x: number, y: number, z: number, draw: (p: Pen) => void, o2: object, scale = 1) => {
      if (!visible(x, y + 1.0 * scale, z, 3.4 * scale)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 0.8, z)) / scale, [w, h, k] = tierC(d);
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale, yaw: 0, draw, wide: true } as WPlace);
    };
    const fxCard = (key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, rot = 0, soft = false, flat = false) =>
      st.fx.push({ key, cw, ch, draw, x, y, z, w, h, rot, soft, flat });
    let spots: [number, number, number, string][] = [];
    const runCyc = (cyc = CYC) => q24((t * cyc) % 1);

    if (i === 0) {
      // ---- 04:59 AM: the alarm clock rings and shakes, whip pan to Tito rising from bed like a zombie ----
      const ring = ts < 2.5 ? 1 : 0;
      this.clockG.position.set(0.12 + ring * 0.012 * Math.sin(f * 2.6), 0.6 + ring * 0.008 * Math.abs(Math.sin(f * 3.1)), 0);
      this.clockG.rotation.z = ring * 0.07 * Math.sin(f * 2.2);
      if (ring) for (let k = 0; k < 2; k++) { const s = k ? 1 : -1; fxCard(`zz${k}`, 300, 300, (p) => { p.ol = 0; p.stroke([[100, 150], [150, 120], [200, 150]], 14, "#ffffff"); p.stroke([[80, 200], [150, 160], [220, 200]], 12, "#ffffff"); }, 0.12 + s * 0.3, 0.98, 0.0, 0.22, 0.22, s * 0.6 + 0.2 * Math.sin(f * 1.7)); }
      const up = q20(0.82 * easeOut((ts - 2.75) / 0.9));
      const o2 = { up, expr: (up > 0.4 ? "dots" : "dazed") as "dots", sweat: 0, scorch: 0, smokePh: 0, speed: 0, shake: 0, blink: up > 0.4 ? 0.5 : 0 };
      wideP("bedT", -1.3, 0.55, -0.25, (p) => { titoCrunch(p, { ...o2, light }); const g = p.g; g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(150,196,150,0.4)"; g.fillRect(-3000, -3000, 8000, 8000); g.restore(); }, o2);
      fxCard("web", 256, 256, cobwebFx, -2.62, 1.12, 0.3, 0.55, 0.55, 0.3);
      fxCard("web", 256, 256, cobwebFx, -0.06, 1.25, -0.1, 0.35, 0.35, 1.1);
      spots = [[-1.3, -0.25, 2.2, "#7f9cff"], [0.12, 0.1, 0.9, "#ff4040"]];
    } else if (i === 1) {
      // ---- POV from inside the fridge: empty shelves, a cobweb, the zombie stares in ----
      const o: Omit<FO, "light" | "blink"> = { pose: "hang", expr: ts < 0.5 ? "dots" : "worried", sweat: 0, headTilt: q2(4 * Math.sin(ts * 2)) };
      frontT("fridgeT", 2.4, 0, 0.8, o, 1, (p) => { paleTint(p, 1); webs(p); }, {}, "pale");
      fxCard("web", 256, 256, cobwebFx, 2.62, 1.72, -1.0, 0.42, 0.42, 0.4);
      fxCard("web", 256, 256, cobwebFx, 2.16, 0.78, -1.15, 0.3, 0.3, 2.0);
      this.fridgeDoor.rotation.y = 0.75;
      spots = [[2.4, 0.4, 1.4, "#cfe8ff"]];
    } else if (i === 2) {
      // ---- the gym: lateral travelling, Tito sprints at full speed, a giant bear charges in behind the treadmill and roars ----
      this.tmA.place(0, 0, true); this.tmA.run(t, 3.2);
      const tB = wordTs(2, "bear"), run = runCyc(), bob = runBob(f);
      frontT("bearT", 0, 0.25 + bob, 0, { pose: "run", run, sweat: 1, drip: q4(t), expr: ts > wordTs(2, "running") ? "terror" : "effort", tilt: q2(2.4 * Math.sin(4 * Math.PI * run)) }, 2, (p) => paleTint(p, 0.7, 1), {}, "pale");
      this.bearCast(st, wideP, f, ts, tB, light, 0);
      for (let k = 0; k < 6; k++) { const age = (f * 0.9 + k * 11) % 36, u = age / 36, side = k % 2 ? 1 : -1; fxCard("drop", 128, 128, dropFx, side * (0.35 + 0.5 * u), 2.0 - 0.2 * u + 0.3 * hh(k, 1), 0.2, 0.12, 0.14); }
      spots = [[0, 0, 3.0, "#ffd9a0"], [0, -1.9, 2.6, "#ff9a7a"]];
    } else if (i === 3) {
      // ---- "Why?": extreme close-up of Tito's sweaty face, question marks pop around his head, the bear still roars behind ----
      this.tmA.place(0, 0, true); this.tmA.run(t, 3.2);
      const run = runCyc(), bob = runBob(f);
      frontT("whyT", 0, 0.25 + bob, 0, { pose: "run", run, sweat: 1, drip: q4(t), expr: "shock", tilt: q2(1.2 * Math.sin(4 * Math.PI * run)) }, 3, (p) => paleTint(p, 0.7, 1), {}, "pale");
      this.bearCast(st, wideP, f, ts + 99, 0, light, 1);
      const tw = wordTs(3, "why");
      for (let k = 0; k < 3; k++) { const s = spring((ts - tw - k * 0.12) / 0.5), a = [-0.19, 0.2, 0.0][k], y = [2.15, 2.17, 2.2][k]; if (s > 0.01 && k < 2) fxCard("q", 160, 200, qmarkFx, a, y + bob + 0.012 * Math.sin(f * 0.3 + k), 0.4, 0.1 * s, 0.125 * s, [-0.3, 0.3, 0.05][k]); }
      spots = [[0, 0, 3.0, "#ffd9a0"]];
    } else if (i === 4) {
      // ---- Tito's dream: a butter belly melting under two blowtorches, "2X FAT MELT" neon... then the MYTH stamp squashes it all ----
      const tD = wordTs(4, "double"), tN = wordTs(4, "doesnt"), land = ts - tN, melt = q10(clamp01((ts - 0.3) / 4.0));
      const squash = land > 0 ? 1 : 0, ph = q4((t * 2.5) % 1);
      const o: Omit<FO, "light" | "blink"> = squash ? { pose: "panic", expr: "dazed", hand: 0 } : { pose: "flex", pump: 1, expr: ts > 1.0 ? "grin" : "chill", sweat: 0 };
      frontT("dreamT", 0, 0.34, 0, o, 4, (p) => butterBelly(p, squash ? 1 : melt, squash ? 0 : ph), squash ? { sx: 1.35, sy: 0.42 } : {}, `b${squash ? 1 : melt}|${ph}`);
      if (!squash) for (const s of [-1, 1]) fxCard(`torch${s}|${q4((t * 4 + (s > 0 ? 0.5 : 0)) % 1)}`, 512, 256, (p) => torchFx(p, (t * 4 + (s > 0 ? 0.5 : 0)) % 1, -s), s * 0.78, 1.36 + 0.02 * Math.sin(f * 0.4), 0.18, 0.92, 0.46);
      if (!squash) for (let k = 0; k < 6; k++) { const age = (f * 0.8 + k * 9) % 30, u = age / 30; if (melt > 0.15) fxCard("bdrop", 128, 128, butterDrop, -0.22 + k * 0.09, 0.95 - u * 0.65, 0.12, 0.08, 0.1); }
      const pop = Math.min(1.06, spring((ts - tD + 0.1) / 0.6)), nk = squash ? 0 : pop;
      this.neon.visible = nk > 0.01; this.neon.scale.setScalar(Math.max(0.001, nk)); this.neon.rotation.z = 0.04 * Math.sin(f * 0.2);
      // the stamp: drops from the sky (0.25 s), lands on "doesn't", holds, lifts away
      if (land > -0.3 && land < 1.2) {
        const y = land < 0 ? lerp(5.5, 0, easeIO((land + 0.3) / 0.3)) : land < 0.4 ? 0 : lerp(0, 6.5, easeIO((land - 0.4) / 0.7));
        this.stamp.visible = true; this.stamp.position.set(0, y, 1.55); this.stamp.rotation.set(0, 0, land < 0 ? -0.08 : 0);
      }
      if (land > 0 && land < 0.6) fxCard(`puff|${q10(land / 0.6)}`, 300, 300, (p) => fxPuff(p, land / 0.6), 0, 0.3, 2.3, 3.2, 3.2);
      spots = [[0, 0, 2.4, "#ffd0f0"]];
    } else if (i === 5) {
      // ---- high-angle orbit: two transparent tanks bubble, the yellow FAT tank drains faster than the blue CARBS tank ----
      this.tmA.place(0, 0, true); this.tmA.run(t, 3.0);
      const u = clamp01(ts / 4.9), run = runCyc(), bob = runBob(f);
      frontT("tankT", 0, 0.25 + bob, 0, { pose: "run", run, sweat: 1, drip: q4(t), expr: "effort", tilt: q2(2 * Math.sin(4 * Math.PI * run)) }, 5, (p) => paleTint(p, 0.8, 1), {}, "pale");
      this.tankFat.place(-TANK_X, TANK_Z, true); this.tankCarb.place(TANK_X, TANK_Z, true);
      this.tankFat.set(0.93 - 0.6 * easeOut(u * 1.05), t); this.tankCarb.set(0.93 - 0.18 * u, t);
      for (let k = 0; k < 4; k++) { const age = (f * 0.7 + k * 9) % 36, u2 = age / 36; fxCard("drop", 128, 128, dropFx, (k - 1.5) * 0.25, 2.0 + 0.6 * u2, 0.2, 0.1, 0.12); }
      spots = [[0, 0, 3.0, "#ffd9a0"], [-TANK_X, TANK_Z, 1.2, "#ffe680"], [TANK_X, TANK_Z, 1.2, "#80c0ff"]];
    } else if (i === 6) {
      // ---- close-up: the insulin gauge on his chest drops to LOW; "Sounds amazing" -> thumbs up, huge eye bags ----
      this.tmA.place(0, 0, true);
      const tL = wordTs(6, "low"), tS = wordTs(6, "sounds"), lvl = q20(lerp(0.85, 0.06, clamp01(spring((ts - tL + 0.5) / 0.7, 7)))), happy = ts > tS;
      const hand = happy ? q2(3 * Math.sin(f * 0.9)) : 0;
      frontT("insT", 0, 0.25, 0, { pose: happy ? "thumb" : "hips", hand, expr: happy ? "grin" : "dots", sweat: 0.4 }, 6, (p) => { paleTint(p, 0.55, 1); insulinGauge(p, lvl); }, {}, `g${lvl}`);
      if (happy) { const u = clamp01((ts - tS) / 0.45); if (u < 1) fxCard(`burst|${q10(u)}`, 500, 500, (p) => burstFx(p, u), 0.42, 2.05, 0.3, 0.6, 0.6); }
      spots = [[0, 0, 2.6, "#ffd9a0"]];
    } else if (i === 7) {
      // ---- the brain control centre: the accountant brain shakes its head and pulls the COMPENSATION MODE lever ----
      const tS = wordTs(7, "stupid"), tI = wordTs(7, "isnt"), pull = easeIO((ts - tS + 0.32) / 0.42);
      const th = lerp(-0.5, 0.95, pull); this.lever.rotation.set(th, 0, 0);
      const kx = LEVER[0], ky = LEVER[1] + 0.52 * Math.cos(th), kz = LEVER[2] + 0.52 * Math.sin(th);
      const shake = ts > tI - 0.5 && ts < tS + 0.1 ? q4(Math.sin((ts - tI) * 16)) : 0;
      const hand: [number, number] = [300 + kx / SU - 6, 975 - ky / SU + 52];
      const o2 = { shake, pull: q20(pull), mood: ts > tI - 0.3 ? 1 : 0, blink: lidAt(9), hx: Math.round(hand[0]), hy: Math.round(hand[1]) };
      if (visible(0, 1.2, 0.3, 2)) { const d = cam.position.distanceTo(this.v.set(0, 1.4, 0.3)), [w, h, k] = tier(d); st.places.push({ key: `brain|${JSON.stringify(o2)}`, x: 0, y: 0, z: 0.3, size: [w, h, k], scale: 1, yaw: 0, draw: (p) => brainGuy(p, { ...o2, light, hand }) } as WPlace); }
      (this.midScreen.material as THREE.MeshBasicMaterial).map = alarm > 0.05 ? this.scrAlarm : this.scrBudget;
      (this.beacon.material as THREE.MeshBasicMaterial).color.set(alarm > 0.05 && Math.sin(f * 0.8) > 0 ? "#ff2020" : "#401010");
      spots = [[0, 0.3, 2.2, "#7ff0ff"], ...(alarm > 0.05 ? [[0, -1.0, 3.2, Math.sin(f * 0.8) > 0 ? "#ff3030" : "#601010"] as [number, number, number, string]] : [])];
    } else if (i === 8) {
      // ---- living room 03:00 PM: Tito melted into the sofa; the giant balance gets two CARBS blocks and levels out ----
      const o2 = { up: 0.3, expr: "dots" as "dots", sweat: 0, scorch: 0, smokePh: 0, speed: 0, shake: 0, blink: 0.55 + 0.45 * lidAt(8) };
      wideP("sofaT", -1.4, 0.45, -1.72, (p) => titoCrunch(p, { ...o2, light }), o2);
      const tC = wordTs(8, "carbs"), tB = wordTs(8, "balance"), drops = [tC - 0.05, tC + 0.3];
      const nC = 1 + drops.filter((d) => ts > d + 0.22).length;
      const target = nC === 1 ? 0.24 : nC === 2 ? 0.12 : 0, settle = ts > tB - 0.3 ? 0 : target;
      const th = settle + 0.05 * Math.sin(f * 0.5) * Math.exp(-Math.max(0, ts - drops[0]) * 1.5) * (ts > drops[0] ? 1 : 0) + (ts > tB - 0.3 ? 0.06 * Math.sin((ts - tB + 0.3) * 10) * Math.exp(-(ts - tB + 0.3) * 3) : 0);
      this.beam.rotation.z = th;
      this.pans.forEach((P, s) => { const sx = s === 0 ? -0.75 : 0.75; P.position.set(BEAM[0] + sx * Math.cos(th), BEAM[1] + sx * Math.sin(th), BEAM[2]); });
      this.carbCubes.forEach((cu, k) => {
        if (k === 0) { cu.visible = true; cu.position.set(-0.13, -0.66, 0.02); return; }
        const d = drops[k - 1], u = (ts - d) / 0.22; cu.visible = u > -0.01; cu.position.set(k === 1 ? 0.13 : 0, (k === 1 ? -0.66 : -0.44) + (u < 1 ? 1.6 * (1 - easeIO(u)) : 0), k === 1 ? -0.02 : 0);
      });
      spots = [[-1.4, -1.6, 2.2, "#ffd9a0"], [BEAM[0], BEAM[2], 1.6, "#fff0c0"]];
    } else if (i === 9) {
      // ---- the race: FASTED (pale, dragging) vs FED (fresh) Tito, they break the finish tape together and jump onto two scales ----
      this.tmA.place(-RACE_X, 0, true); this.tmB.place(RACE_X, 0, true); this.tmA.run(t, 3.0); this.tmB.run(t, 3.0); this.scaleG.visible = true; this.finishG.visible = true;
      this.scaleScr.forEach((m) => ((m.material as THREE.MeshBasicMaterial).map = this.scrOff));
      const ju = jumpU(f), z = lerp(0, SCALE_Z, easeIO(ju)), y = ju <= 0 ? 0.25 : lerp(0.25, 0.09, ju) + 0.75 * Math.sin(Math.PI * ju), air = ju > 0 && ju < 1;
      const runL = runCyc(4.0), runR = runCyc(4.0), bobL = air ? 0 : runBob(f, 4.0), bobR = air ? 0 : runBob(f, 4.0) * 1.3;
      frontT("raceL", -RACE_X, y + bobL, z, { pose: air ? "panic" : "run", run: runL, sweat: 1, drip: q4(t), expr: air ? "terror" : "dots", tilt: air ? 0 : q2(3 * Math.sin(4 * Math.PI * runL)) }, 10, (p) => { paleTint(p, 1); webs(p); }, {}, "pale");
      frontT("raceR", RACE_X, y + bobR, z, { pose: air ? "up" : "run", run: runR, sweat: 0, expr: "grin", tilt: air ? 0 : q2(1.2 * Math.sin(4 * Math.PI * runR)) }, 11);
      const brk = ju > 0.35 ? easeOut((ju - 0.35) / 0.5) : 0; this.tapeL.rotation.z = -1.35 * brk; this.tapeR.rotation.z = 1.35 * brk;
      spots = [[-RACE_X, 0.6, 2.0, "#ffd9a0"], [RACE_X, 0.6, 2.0, "#fff0c0"]];
    } else if (i === 10) {
      // ---- low angle on the two identical scales: both light up green -1.0 LB, tilt up to the two faces ----
      this.scaleG.visible = true; this.finishG.visible = true; this.tapeL.rotation.z = -1.35; this.tapeR.rotation.z = 1.35;
      this.tmA.place(-RACE_X, 0, true); this.tmB.place(RACE_X, 0, true);
      const tS = wordTs(10, "same"), on = ts > tS - 0.15 && (ts > tS + 0.2 || Math.floor(f / 3) % 2 === 0);
      this.scaleScr.forEach((m) => ((m.material as THREE.MeshBasicMaterial).map = on ? this.scrOn : this.scrOff));
      const bounce = 0.04 * Math.exp(-ts * 5) * Math.abs(Math.sin(ts * 18));
      frontT("scaleL", -RACE_X, 0.09 + bounce, SCALE_Z, { pose: "hips", expr: on ? "shock" : "dots", sweat: 1, drip: q4(t) }, 12, (p) => { paleTint(p, 1); webs(p); }, {}, "pale");
      frontT("scaleR", RACE_X, 0.09 + bounce, SCALE_Z, { pose: on ? "thumb" : "hips", expr: on ? "grin" : "dots", sweat: 0 }, 13);
      spots = [[-RACE_X, SCALE_Z + 0.5, 0.7, on ? "#60c080" : "#ffd9a0"], [RACE_X, SCALE_Z + 0.5, 0.7, on ? "#60c080" : "#ffd9a0"]];
    } else if (i === 11) {
      // ---- top-down: Tito is launched off the treadmill, spins through the air and splats flat on the gym floor (spiral eyes, stars, a crack) ----
      this.tmA.place(0, -1.6, true); this.tmA.run(t, 3.5);
      const tl = wordTs(11, "suffering"), u = clamp01(ts / tl), landed = ts >= tl;
      const yaw = landed ? 0.35 : 0.35 + 2 * Math.PI * 1.25 * (1 - easeOut(u)), fx0 = 0.15, fz0 = -0.6, fx1 = -0.05, fz1 = 1.55;
      const x = lerp(fx0, fx1, easeOut(u)), zz = lerp(fz0, fz1, easeOut(u)), y = landed ? 0.07 : 0.07 + 1.6 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1)) * (1 - u * 0.3);
      const sq = landed ? 1 + 0.25 * Math.sin((ts - tl) * 30) * Math.exp(-(ts - tl) * 8) : 1;
      frontT("flyT", x, y, zz, { pose: "panic", hand: 0, expr: landed ? "dazed" : "terror", sweat: landed ? 0 : 1, drip: q4(t) }, 14, (p) => paleTint(p, 0.8, 1), { pitch: -Math.PI / 2, yaw, sx: 1 + (sq - 1) * 0.6, sy: 1 / sq }, "pale");
      if (landed) {
        const hx = x - Math.sin(yaw) * 1.6, hz = zz - Math.cos(yaw) * 1.6, cx = x - Math.sin(yaw) * 1.0, cz = zz - Math.cos(yaw) * 1.0;
        fxCard("crack", 512, 512, crackFx, cx, 0.05, cz, 2.4, 2.4, 0.4, false, true);
        const sp = q24(((ts - tl) * 1.4) % 1);
        fxCard(`stars|${sp}`, 420, 210, (p) => fxStars(p, sp), hx, 0.12, hz, 1.1, 0.55, yaw, false, true);
        const bu = clamp01((ts - tl) / 0.35); if (bu < 1) fxCard(`burst|${q10(bu)}`, 500, 500, (p) => burstFx(p, bu), cx, 0.06, cz, 3.0, 3.0, 0, false, true);
        const pu = clamp01((ts - tl) / 0.8); if (pu < 1) fxCard(`ring|${q10(1 - pu)}`, 256, 256, (p) => ringFx(p, q10(1 - pu)), cx, 0.055, cz, 1.5 + 3 * pu, 1.5 + 3 * pu, 0, true, true);
      }
      spots = [[0, 0.5, 1.8, "#a08060"]];
    } else if (i === 12) {
      // ---- Dr. Pigeon hops in and throws a banana, Tito catches it and recharges: colour back, battery 100% ----
      const tBn = wordTs(12, "banana"), catchT = tBn + 0.5, walk = easeOut(ts / 0.4), px = lerp(2.9, 1.25, walk), hop = walk < 1 ? 0.08 * Math.abs(Math.sin(f * 0.7)) : 0;
      const wing = ts < tBn - 0.2 ? 0 : ts < tBn ? easeOut((ts - tBn + 0.2) / 0.2) : 1 - easeOut((ts - tBn) / 0.4);
      const o3 = { wing: q10(wing), blink: lidAt(77) };
      wideP("thrower", px, hop, 0.4, (p) => pigeonThrow(p, { ...o3, light }), o3);
      blob(st, sunDir, px, 0, 0.4, 0.9);
      const caught = ts >= catchT, heal = clamp01((ts - catchT) / 0.35), pale = q10(1 - heal);
      const H = [300 + 104 + 60, 242] as const;
      frontT("catchT", -0.6, 0, 0, { pose: caught ? "thumb" : "hips", expr: caught ? "grin" : "dots", sweat: 0 }, 15, (p) => { paleTint(p, pale, pale); if (caught) banana(p, H[0] + 6, H[1] - 50, -0.5, 0.75); }, {}, `p${pale}|${caught}`);
      if (ts > tBn && !caught) {
        const u = (ts - tBn) / (catchT - tBn), x0 = px - 0.62, y0 = 1.25, x1 = -0.6 + (H[0] - 300) * SU, y1 = (975 - H[1]) * SU;
        fxCard("ban", 128, 128, bananaFx, lerp(x0, x1, u), lerp(y0, y1, u) + 0.7 * Math.sin(Math.PI * u), 0.3, 0.38, 0.38, u * 14);
      }
      if (caught) { const b = q20(easeOut(clamp01((ts - catchT) / 0.55))); fxCard(`batt|${b}`, 320, 180, (p) => batteryFx(p, b), -0.6, 2.55, 0.1, 0.62, 0.35); }
      spots = [[-0.6, 0, 2.0, "#ffd9a0"], [1.25, 0.4, 1.4, "#fff0c0"]];
    } else {
      // ---- final: Dr. Pigeon up front with the sign CALORIE DEFICIT > FASTED SUFFERING, Tito healthy behind with his banana ----
      const sign = q10(clamp01(easeOut(ts / 0.45))), o3 = { sign, blink: lidAt(78) }, S = 1.35;
      wideP("docF", 0.45, 0, 1.5, (p) => pigeonDoc(p, { ...o3, light }), o3, S);
      blob(st, sunDir, 0.45, 0, 1.5, 1.2);
      const H = [300 + 104 + 60, 242] as const, wob = q10(0.15 * Math.sin(f * 0.25));
      frontT("finT", 1.15, 0, -0.5, { pose: "thumb", expr: "grin", sweat: 0 }, 16, (p) => banana(p, H[0] + 6, H[1] - 50, -0.5 + wob, 0.75), {}, `w${wob}`);
      fxCard("batt|1", 320, 180, (p) => batteryFx(p, 1), 1.15, 2.5, -0.4, 0.5, 0.28);
      spots = [[0.45, 1.5, 1.8, "#fff0c0"], [1.15, -0.5, 1.6, "#ffd9a0"]];
    }
    this.pools.forEach((pm, k) => { const s = spots[k]; pm.visible = !!s; this.shafts[k].visible = !!s && sh.set !== "dream"; if (s) { (pm.material as THREE.MeshBasicMaterial).color.set(s[3]); pm.position.set(s[0], 0.03, s[1]); pm.scale.set(s[2] * 2, 1, s[2] * 2); this.shafts[k].position.set(s[0], 4.1, s[1]); (this.shafts[k].material as THREE.MeshBasicMaterial).color.set(s[3]); } });

    let ai = 0;
    for (const p of st.places as WPlace[]) {
      const a = this.actor(ai++), [w, h, k] = p.size;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.geometry = p.wide ? WIDE : BODY;
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(p.pitch ?? 0, p.yaw ?? 0, 0);          // fixed orientation: the card never turns toward the camera
      const sc2 = p.scale ?? 1; a.mesh.scale.set(sc2 * (p.sx ?? 1), sc2 * (p.sy ?? 1), sc2);
    }
    for (let k = ai; k < this.actors.length; k++) this.actors[k].mesh.visible = false;
    let fi = 0;
    for (const p of st.fx) {
      if (!visible(p.x, p.y, p.z, Math.max(p.w, p.h))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0); else e2.mesh.rotation.set(0, 0, p.rot ?? 0);
      e2.mesh.scale.set(p.w, p.h, 1);
    }
    for (let k = fi; k < this.fxs.length; k++) this.fxs[k].mesh.visible = false;
    this.pool.flush();
    for (let k = 0; k < ai; k++) this.actors[k].bind();
    for (let k = 0; k < fi; k++) this.fxs[k].bind();
    return focus;
  }

  /** the bear behind the treadmill: a dark silhouette far back, charges in, lights up and roars on "bear" (mode 1 = already there, roaring) */
  private bearCast(st: Stage, wideP: (who: string, x: number, y: number, z: number, draw: (p: Pen) => void, o2: object, scale?: number) => void, f: number, ts: number, tB: number, light: number, mode: number) {
    const charge = mode ? 1 : easeOut((ts - (tB - 0.9)) / 0.8), z = lerp(-4.6, -1.85, charge), lit = mode ? 1 : smooth((ts - (tB - 0.35)) / 0.35);
    const roar = mode ? q4(0.75 + 0.25 * Math.sin(f * 0.5)) : q4(clamp01(spring((ts - tB + 0.05) / 0.5, 8)));
    const bob = 0.06 * Math.abs(Math.sin(f * 0.45)), sil = q4(1 - lit);
    const o2 = { roar, arms: q4(0.4 + 0.6 * roar), sil };
    wideP("bear", 0, bob, z, (p) => { bear(p, { light, roar, arms: o2.arms }); if (sil > 0.01) { const g = p.g; g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(10,8,20,${(0.9 * sil).toFixed(3)})`; g.fillRect(-3000, -3000, 8000, 8000); g.restore(); } }, o2, 1.25);
    if (roar > 0.4) for (let k = 0; k < 3; k++) {
      const age = (f - k * 7) % 21, r = 0.3 + age * 0.05, a = q4(0.75 * (1 - age / 21));
      if (a > 0) st.fx.push({ key: `ring|${a}`, cw: 256, ch: 256, draw: (p) => ringFx(p, a), x: 0, y: bob + (1375 - 600) * SU * 1.25, z: z + 0.15, w: r * 2, h: r * 2, soft: true });
    }
  }
}
