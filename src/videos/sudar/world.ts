// The gym for "Sweating != Burning Fat": same dark gym / warm overhead spot / flat 2D Tito as "Volumen basura", with a hero treadmill
// (scrolling belt), a bathroom scale, a trash can and a trash bag. Scenes follow the narration (story.ts).
import * as THREE from "three";
import { bodyFront, Outfit, SKINS } from "../alejandro/toon";
import { titoFront, TitoExpr } from "../volumen/titoGym";
import { pigeon } from "./pigeon";
import { Pool, Actor, Fx, Stage, tier, light2D, blob, BODY } from "../alejandro/troop";
import { NOINK } from "../alejandro/ink";
import { LIGHTS, LOOK, LightPreset, WorldLook } from "../alejandro/lights";
import { TONE, CHAR, twoTone, untone } from "../alejandro/shade";
import { ctex, rep, brick } from "../alejandro/paint";
import { FPS, SHOTS, camAt, smooth, uOf, sceneStart, sceneEnd } from "./story";

const GL: LightPreset = { ...LIGHTS.day, el: 70, lit: [0.34, 0.28, 0.22], shade: [0.03, 0.045, 0.12], lift: [0.015, 0.035, 0.12], lambert: 0.45, sideK: 0.7, term: 0.12,
  charTint: [1.06, 0.93, 0.8], charShade: 0.6, charGrad: 0.1, bodyGrad: 0.3, sideTint: [0.62, 0.8, 1.2], fog: "#0b1226", sunCol: "#ffd9a0", sunI: 3.6,
  sky: "#16254a", ground: "#0b1226", hemiI: 0.05, actorShadow: false, bias: -0.0004, normalBias: 0.02 };
const GK: WorldLook = { ...LOOK.day, sky: { c: ["#101a36", "#0d1530", "#0a1126", "#080e20", "#060a18"], e: [0, 4, 10, 20, 40] }, sat: 1.0 };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lam = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

const BUDDY = (v: number): Outfit => ({
  jacket: ["#3f6fb5", "#5d9a5a", "#e8a22f", "#7b5ac9", "#2f8a8a"][v % 5], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[(v + 2) % 4],
  hat: v % 2 ? "cap" : "hair", cap: ["#e2453c", "#f4f1ea", "#2b3a55"][v % 3], hair: ["#5a3b2a", "#2a201a", "#c98f3e"][v % 3],
});
const BUDDIES = [{ x: -9.5, z: -5.5, v: 0 }, { x: 8.8, z: -6.2, v: 1 }, { x: -13.2, z: -3.5, v: 2 }, { x: 12.6, z: -4.2, v: 3 }, { x: 5.5, z: -7.6, v: 4 }, { x: -5.2, z: -7.8, v: 5 }];

// ---------------- dust in the light: tiny warm / cold motes drifting around the camera ----------------
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
  vec3 c = mix(vec3(1.0, 0.82, 0.55), vec3(0.55, 0.72, 1.0), step(0.6, vTint));
  gl_FragColor = vec4(c * core * vA * 0.8, 1.0);
}`;
const radial = (key: string, stops: [number, string][]) => ctex(key, 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});


const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** treadmill with a scrolling belt (each one owns its texture offset) */
class Treadmill {
  g = new THREE.Group(); private tex: THREE.Texture;
  constructor(parent: THREE.Object3D) {
    const add = (w: number, h: number, d: number, x: number, y: number, z: number, color: string, cast = true) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam({ color })); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; this.g.add(m); return m;
    };
    add(1.05, 0.2, 2.1, 0, 0.1, 0, "#2b2f3a");
    const beltT = ctex("sudarBelt", 128, 256, (g) => {
      g.fillStyle = "#2a2d36"; g.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#363a47" : "#242730"; g.fillRect(0, i * 16, 128, 16); }
      g.fillStyle = "#5b6072"; g.fillRect(60, 0, 8, 256);
    });
    this.tex = rep(beltT, 1, 7);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.04, 1.9), lam({ map: this.tex, color: "#ffffff" })); belt.position.y = 0.22; belt.receiveShadow = true; this.g.add(belt);
    add(0.06, 0.07, 2.0, -0.47, 0.22, 0, "#f0c64a", false); add(0.06, 0.07, 2.0, 0.47, 0.22, 0, "#f0c64a", false);
    add(0.07, 1.15, 0.07, -0.48, 0.8, -0.95, "#8d949c"); add(0.07, 1.15, 0.07, 0.48, 0.8, -0.95, "#8d949c");
    add(1.1, 0.42, 0.16, 0, 1.42, -1.0, "#1c1f28"); add(0.74, 0.22, 0.02, 0, 1.44, -0.915, "#5ad0ff", false); add(1.06, 0.06, 0.06, 0, 1.12, -0.95, "#8d949c");
    this.g.visible = false; parent.add(this.g);
  }
  place(x: number, z: number, vis = true) { this.g.position.set(x, 0, z); this.g.visible = vis; }
  run(t: number, speed: number) { this.tex.offset.y = (t * speed) % 1; }
}

/** bathroom scale with a small digital readout (canvas texture) */
class ScalePad {
  g = new THREE.Group(); private cv = document.createElement("canvas"); private tex: THREE.CanvasTexture; private last = "";
  constructor(parent: THREE.Object3D) {
    const add = (w: number, h: number, d: number, y: number, color: string) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam({ color })); m.position.y = y; m.castShadow = true; m.receiveShadow = true; this.g.add(m); };
    add(0.8, 0.07, 0.8, 0.035, "#1d2230"); add(0.72, 0.02, 0.72, 0.08, "#3a4258");
    this.cv.width = 256; this.cv.height = 96; this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace;
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.15).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.tex })); d.position.set(0, 0.093, -0.27); d.layers.set(NOINK); this.g.add(d);
    this.g.visible = false; parent.add(this.g); this.setText("0.0", "#7CFFB0");
  }
  place(x: number, z: number) { this.g.position.set(x, 0, z); this.g.visible = true; }
  hide() { this.g.visible = false; }
  setText(txt: string, color: string) {
    const key = txt + color; if (key === this.last) return; this.last = key;
    const g = this.cv.getContext("2d")!; g.fillStyle = "#06140c"; g.fillRect(0, 0, 256, 96); g.font = "bold 70px Arial"; g.textAlign = "center"; g.fillStyle = color; g.fillText(txt, 128, 70);
    this.tex.needsUpdate = true;
  }
}

// ---------------- world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private skyMat: THREE.ShaderMaterial; private sky: THREE.Mesh;
  private fog = new THREE.Fog("#cdbfae", 60, 400);
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private sph = new THREE.Sphere(); private v = new THREE.Vector3();
  private dust = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uPx: { value: 1000 } }; private pools: THREE.Mesh[] = []; private shafts: THREE.Mesh[] = [];
  private bag = new THREE.Group();
  private frontWall!: THREE.Mesh; private winWall = new THREE.Group(); private volc = new THREE.Group(); private roof!: THREE.Mesh;
  private lavaTex!: THREE.Texture; private lavaBubbles: THREE.Mesh[] = []; private smoke: THREE.Mesh[] = []; private embers = { uT: { value: 0 }, uPx: { value: 1000 } };
  private fireBack!: THREE.Mesh; private acUnit = new THREE.Group();
  private tm: Treadmill[] = []; private scl!: ScalePad; private can = new THREE.Group(); private tbag = new THREE.Group();

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
    R.add(this.hemi, this.sun, this.sun.target);

    const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string, cast = true, map?: THREE.Texture) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(map ? { map, color } : { color }));
      m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; R.add(m); return m;
    };
    const cyl = (r: number, h: number, x: number, y: number, z: number, color: string, rx = 0, rz = 0) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), lam({ color }));
      m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; m.receiveShadow = true; R.add(m); return m;
    };

    // floor: warm boards + a dark rubber lifting area
    const boards = ctex("gymBoards", 1024, 1024, (g, r) => {
      const cols = ["#d8a86c", "#cf9d62", "#dfb177", "#c99659", "#d4a468"];
      for (let i = 0; i < 8; i++) {
        g.fillStyle = cols[Math.floor(r() * 5)]; g.fillRect(0, i * 128, 1024, 128);
        g.strokeStyle = "rgba(110,66,30,.3)"; g.lineWidth = 2;
        for (let k = 0; k < 4; k++) { const y = i * 128 + 14 + r() * 100; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(300, y + 6, 700, y - 6, 1024, y + (r() - 0.5) * 6); g.stroke(); }
        g.fillStyle = "#6a4426"; g.fillRect(0, i * 128, 1024, 5);
        const cut = r() * 1024; g.fillRect(cut, i * 128, 5, 128);
      }
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 32).rotateX(-Math.PI / 2), lam({ map: rep(boards, 10, 8) }));
    floor.receiveShadow = true; R.add(floor);
    box(11, 0.04, 7, 0, 0.02, -0.6, "#6c7588", false).receiveShadow = true;
    box(11.4, 0.045, 0.14, 0, 0.022, 2.98, "#f0c64a", false); box(11.4, 0.045, 0.14, 0, 0.022, -4.18, "#f0c64a", false);

    // walls (never cast shadows: the sun would drown half the gym), brick with a painted band, windows, mirrors, banners
    const bk = brick();
    const wallM = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam({ map: rep(bk, w / 6, h / 4), color: "#9c8062", side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; R.add(m); return m;
    };
    wallM(40, 9, 0, 4.5, -10, 0); wallM(32, 9, -18, 4.5, 2, Math.PI / 2); wallM(32, 9, 18, 4.5, 2, -Math.PI / 2); this.frontWall = wallM(40, 9, 0, 4.5, 16, 0);
    box(40, 0.5, 0.12, 0, 1.1, -9.94, "#e2453c", false);
    const winT = ctex("gymWin", 256, 200, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, "#15264f"); gr.addColorStop(1, "#33518e"); g.fillStyle = gr; g.fillRect(0, 0, 256, 200);
      g.fillStyle = "#e8f0ff"; for (let s = 0; s < 14; s++) g.fillRect(14 + (s * 97) % 230, 12 + (s * 53) % 150, 3, 3);
      g.strokeStyle = "#8d949c"; g.lineWidth = 12; g.strokeRect(6, 6, 244, 188); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 200); g.moveTo(0, 100); g.lineTo(256, 100); g.stroke();
    });
    const mirT = ctex("gymMirror", 256, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 256, 128); gr.addColorStop(0, "#c8e6f8"); gr.addColorStop(1, "#8fc2e4"); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
      g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 10; for (const x of [50, 90, 190]) { g.beginPath(); g.moveTo(x + 40, 0); g.lineTo(x - 20, 128); g.stroke(); }
      g.strokeStyle = "#b9bec8"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 120);
    });
    const poster = (key: string, bg: string, fg: string) => ctex(key, 256, 384, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, 256, 384); g.fillStyle = fg;
      g.beginPath(); g.arc(128, 80, 34, 0, 7); g.fill(); g.fillRect(100, 114, 56, 70);
      g.fillRect(40, 232, 176, 16); g.fillRect(24, 204, 26, 72); g.fillRect(206, 204, 26, 72); g.fillRect(8, 216, 16, 48); g.fillRect(232, 216, 16, 48);
      g.fillRect(30, 318, 196, 14); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(10, 10, 236, 364);
    });
    for (const x of [-12, -6, 0, 6, 12]) box(3.2, 2.2, 0.1, x, 5.6, -9.9, "#ffffff", false, winT);
    for (const x of [-9, 9]) box(6, 3.0, 0.08, x, 2.9, -9.92, "#ffffff", false, mirT);
    box(1.7, 2.6, 0.06, -3, 3.1, -9.93, "#ffffff", false, poster("gymPosterA", "#e8c45a", "#2f3340"));
    box(1.7, 2.6, 0.06, 3, 3.1, -9.93, "#ffffff", false, poster("gymPosterB", "#3f6fb5", "#f4f1ea"));

    // power racks, benches, plate towers (10 vs 20 plates), dumbbells, kettlebells
    for (const rx of [-6.5, 6.8]) {
      for (const dx of [-1.0, 1.0]) for (const dz of [-0.7, 0.7]) box(0.14, 2.5, 0.14, rx + dx, 1.25, -7 + dz, "#d9373b");
      box(2.3, 0.14, 0.14, rx, 2.5, -7.7, "#d9373b"); box(2.3, 0.14, 0.14, rx, 2.5, -6.3, "#d9373b");
      cyl(0.04, 2.7, rx, 1.8, -7, "#c9ccd2", 0, Math.PI / 2);
    }
    for (const bx of [-9.5, 10.5]) { box(1.4, 0.18, 0.5, bx, 0.5, -3.2, "#2b3a55"); box(0.12, 0.45, 0.4, bx - 0.5, 0.22, -3.2, "#8d949c"); box(0.12, 0.45, 0.4, bx + 0.5, 0.22, -3.2, "#8d949c"); }
    const tower = (x: number, z: number, n: number) => { for (let i = 0; i < n; i++) cyl(0.46, 0.12, x, 0.06 + i * 0.125, z, i % 2 ? "#c0353a" : "#2f3340"); };
    tower(2.9, -3.2, 10); tower(4.6, -3.2, 20);
    for (let i = 0; i < 12; i++) { const x = -15 + i * 0.5; cyl(0.05, 0.3, x, 1.05, -9.3, "#8d949c", 0, Math.PI / 2); cyl(0.13, 0.08, x - 0.14, 1.05, -9.3, "#2f3340", 0, Math.PI / 2); cyl(0.13, 0.08, x + 0.14, 1.05, -9.3, "#2f3340", 0, Math.PI / 2); }
    box(6.4, 0.08, 0.5, -12, 0.95, -9.3, "#8d949c"); box(6.4, 0.08, 0.5, -12, 0.45, -9.3, "#8d949c");
    for (const [x, z] of [[-3.5, 2.2], [-2.8, 2.5], [3.5, 2.3]] as const) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), lam({ color: "#d9a441" })); k.position.set(x, 0.24, z); k.castShadow = true; R.add(k); }

    // roof trusses with warm lamps, treadmills, a swinging punching bag
    for (const z of [-4, 4]) { box(40, 0.3, 0.3, 0, 8.3, z, "#4a4f5c", false); for (const x of [-12, -6, 0, 6, 12]) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 20, 1, true), new THREE.MeshBasicMaterial({ color: "#fff1b8", side: THREE.DoubleSide })); l.position.set(x, 7.8, z); R.add(l); } }
    for (const tx of [-15, -12.5, 13, 15.5]) {
      box(1.0, 0.3, 2.1, tx, 0.15, -7.2, "#2b2f3a"); box(0.85, 0.06, 1.8, tx, 0.32, -7.2, "#555b69", false);
      box(0.08, 1.3, 0.08, tx - 0.4, 0.95, -8.2, "#8d949c"); box(0.08, 1.3, 0.08, tx + 0.4, 0.95, -8.2, "#8d949c"); box(0.9, 0.4, 0.14, tx, 1.65, -8.15, "#1c1f28");
    }
    this.bag = new THREE.Group(); this.bag.position.set(-1.9, 3.0, -8.0);
    const bagM = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.3, 24), lam({ color: "#c0353a" })); bagM.position.y = -1.0; bagM.castShadow = true; this.bag.add(bagM);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), lam({ color: "#8d949c" })); chain.position.y = -0.15; this.bag.add(chain);
    R.add(this.bag); box(0.14, 3.2, 0.14, -1.9, 1.6, -8.6, "#4a4f5c"); box(0.14, 0.14, 0.7, -1.9, 3.05, -8.3, "#4a4f5c");
    // warm pools of light on the floor + faint light shafts from above (additive, never inked)
    const poolT = radial("gymPool", [[0, "rgba(255,208,146,0.8)"], [0.5, "rgba(255,188,118,0.38)"], [1, "rgba(255,170,90,0)"]]);
    const shaftT = ctex("gymShaft", 64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,225,170,0.0)"); gr.addColorStop(0.5, "rgba(255,215,150,0.07)"); gr.addColorStop(1, "rgba(255,200,130,0.17)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); });
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



    // ---- the volcano: the whole gym is built inside its crater (zoom-out reveal in shot 1) ----
    R.add(this.volc); this.volc.visible = false;
    const prof = ([[0, -0.6], [62, -0.6], [70, 2], [88, 12], [108, 38], [120, 46], [150, 30], [220, -12], [430, -90]] as [number, number][]).map(([rr, yy]) => new THREE.Vector2(rr, yy));
    const terr = new THREE.LatheGeometry(prof, 140);
    {
      const pa = terr.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        let x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); const rr = Math.hypot(x, z);
        if (rr > 66) { const a = Math.atan2(z, x), k = Math.min(1, (rr - 66) / 60); y += k * (3 * Math.sin(a * 7 + rr * 0.05) + 2 * Math.sin(a * 13 + 1.3) + 1.5 * Math.sin(rr * 0.11)); const dr = k * 2.5 * Math.sin(a * 9); x += (x / rr) * dr; z += (z / rr) * dr; pa.setXYZ(i, x, y, z); }
      }
      terr.computeVertexNormals();
    }
    const rockT = ctex("volcRock", 512, 512, (g, rn) => {
      g.fillStyle = "#5a4a44"; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 700; i++) { const x = rn() * 512, y = rn() * 512, rr = 6 + rn() * 34; g.fillStyle = rn() < 0.5 ? "rgba(30,22,20,0.45)" : "rgba(120,98,86,0.3)"; g.beginPath(); g.ellipse(x, y, rr, rr * (0.5 + rn() * 0.6), rn() * 3, 0, 7); g.fill(); }
    });
    const terrain = new THREE.Mesh(terr, lam({ map: rep(rockT, 28, 8), color: "#8a7468", side: THREE.DoubleSide })); terrain.receiveShadow = true; this.volc.add(terrain);
    const lavaBase = ctex("lavaTex", 512, 512, (g, rn) => {
      g.fillStyle = "#ff6a12"; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 240; i++) { const x = rn() * 512, y = rn() * 512, rr = 16 + rn() * 40, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(255,225,90,0.9)"); gr.addColorStop(1, "rgba(255,106,18,0)"); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
      for (let i = 0; i < 80; i++) { const cx0 = rn() * 512, cy0 = rn() * 512, n = 6 + Math.floor(rn() * 3); g.beginPath(); for (let k = 0; k < n; k++) { const a = (k / n) * 6.28, rr = 16 + rn() * 38; const x = cx0 + Math.cos(a) * rr, y = cy0 + Math.sin(a) * rr * 0.8; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fillStyle = "#2a0f08"; g.fill(); g.strokeStyle = "#ff9a2a"; g.lineWidth = 3; g.stroke(); }
    });
    this.lavaTex = rep(lavaBase, 1, 1);
    const lava = new THREE.Mesh(new THREE.RingGeometry(26.5, 64, 96, 4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.lavaTex, color: new THREE.Color(1.5, 0.8, 0.35), side: THREE.DoubleSide }));
    lava.position.y = 0.04; lava.layers.set(NOINK); this.volc.add(lava);
    const glowT = radial("lavaGlow", [[0, "rgba(255,120,30,0.55)"], [0.55, "rgba(255,80,20,0.22)"], [1, "rgba(255,60,10,0)"]]);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(220, 220).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.y = 0.5; glow.layers.set(NOINK); glow.renderOrder = 0.3; this.volc.add(glow);
    for (let i = 0; i < 16; i++) {
      const bm = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.0, 0.35) }));
      const a = i * 0.39 + hh(i, 3) * 0.3, rr = 28 + hh(i, 4) * 30; bm.position.set(Math.cos(a) * rr, 0.3, Math.sin(a) * rr); bm.userData = { size: 0.6 + hh(i, 5) * 1.6, k: i }; bm.layers.set(NOINK);
      this.lavaBubbles.push(bm); this.volc.add(bm);
    }
    const smokeT = ctex("smokeTex", 256, 256, (g, rn) => {
      for (let i = 0; i < 26; i++) { const x = 70 + rn() * 116, y = 70 + rn() * 116, rr = 34 + rn() * 50, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
    });
    for (let i = 0; i < 12; i++) {
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: smokeT, transparent: true, depthWrite: false, color: new THREE.Color(0.2, 0.15, 0.14), opacity: 0.5, fog: false }));
      sm.userData = { x0: [-55, -40, -20, 0, 20, 40, 55, -30, 30, 10, -10, 0][i], z0: -78 + hh(i, 6) * 34, off: i / 12 }; sm.layers.set(NOINK); sm.renderOrder = 4; this.smoke.push(sm); this.volc.add(sm);
    }
    {
      const N = 500, pos = new Float32Array(N * 3), sd = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) { const a = hh(i, 70) * 6.28, rr = 28 + hh(i, 71) * 34; pos.set([Math.cos(a) * rr, hh(i, 72) * 60, Math.sin(a) * rr], i * 3); sd.set([hh(i, 73), hh(i, 74), hh(i, 75), hh(i, 76)], i * 4); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("aSeed", new THREE.BufferAttribute(sd, 4));
      const mat = new THREE.ShaderMaterial({ uniforms: this.embers, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute vec4 aSeed; uniform float uT; uniform float uPx; varying float vA;
          void main(){ vec3 p = position; p.y = mod(p.y + uT * (3.0 + 5.0 * aSeed.x), 70.0); p.x += sin(uT * 0.6 + aSeed.z * 20.0) * 3.0; p.z += cos(uT * 0.5 + aSeed.w * 20.0) * 3.0;
            vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = clamp(0.9 * uPx / max(1.0, -mv.z), 2.0, 14.0); vA = (1.0 - p.y / 70.0) * (0.5 + 0.5 * sin(uT * 3.0 + aSeed.y * 40.0)); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard; gl_FragColor = vec4(vec3(1.0, 0.45, 0.1) * exp(-r * r * 3.0) * vA * 1.6, 1.0); }` });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.layers.set(NOINK); pts.renderOrder = 5;
      pts.onBeforeRender = (rd, _s, c) => { const rt = rd.getRenderTarget(), h = rt ? rt.height : rd.domElement.height; this.embers.uPx.value = h / (2 * Math.tan(THREE.MathUtils.degToRad((c as THREE.PerspectiveCamera).fov) / 2)); };
      this.volc.add(pts);
    }
    this.roof = new THREE.Mesh(new THREE.BoxGeometry(38.4, 0.5, 27), lam({ color: "#4a4f5c" })); this.roof.position.set(0, 9.3, 3); this.roof.visible = false; R.add(this.roof);
    // front wall with a big window: the camera flies out through it
    const wsh = new THREE.Shape(); wsh.moveTo(-20, 0); wsh.lineTo(20, 0); wsh.lineTo(20, 9); wsh.lineTo(-20, 9); wsh.closePath();
    const hole = new THREE.Path(); hole.moveTo(-3.2, 1.0); hole.lineTo(3.2, 1.0); hole.lineTo(3.2, 5.8); hole.lineTo(-3.2, 5.8); hole.closePath(); wsh.holes.push(hole);
    const wm = new THREE.Mesh(new THREE.ShapeGeometry(wsh), lam({ map: rep(bk, 1 / 6, 1 / 4), color: "#9c8062", side: THREE.DoubleSide })); wm.position.set(0, 0, 16); wm.receiveShadow = true; this.winWall.add(wm);
    for (const [fw_, fh_, fx_, fy_] of [[6.8, 0.25, 0, 5.9], [6.8, 0.25, 0, 0.9], [0.25, 5.0, -3.3, 3.4], [0.25, 5.0, 3.3, 3.4]] as const) { const fm = new THREE.Mesh(new THREE.BoxGeometry(fw_, fh_, 0.35), lam({ color: "#c9ccd2" })); fm.position.set(fx_, fy_, 16); this.winWall.add(fm); }
    this.winWall.visible = false; R.add(this.winWall);
    // shot 4: the volcano side (magma backdrop) and the air-conditioned side (an AC unit)
    const fbT = ctex("fireBack", 256, 256, (g, rn) => {
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#2a0c08"); gr.addColorStop(0.55, "#a8300c"); gr.addColorStop(1, "#ff8a1a"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 18; i++) { const x = rn() * 256, h2 = 40 + rn() * 90; g.fillStyle = i % 2 ? "#ff7a1a" : "#ffd24a"; g.beginPath(); g.moveTo(x - 18, 256); g.quadraticCurveTo(x - 6, 256 - h2 * 0.5, x, 256 - h2); g.quadraticCurveTo(x + 6, 256 - h2 * 0.5, x + 18, 256); g.fill(); }
    });
    this.fireBack = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.7), new THREE.MeshBasicMaterial({ map: fbT, color: new THREE.Color(1.4, 0.9, 0.6) })); this.fireBack.layers.set(NOINK); this.fireBack.visible = false; R.add(this.fireBack);
    { const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.45), lam({ color: "#dfe7f2" })); body.castShadow = true; this.acUnit.add(body);
      for (let i = 0; i < 5; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.025, 0.05), new THREE.MeshBasicMaterial({ color: "#7fb8e6" })); v.position.set(0, -0.08 - i * 0.07, 0.24); this.acUnit.add(v); }
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ map: radial("coldMist", [[0, "rgba(160,220,255,0.35)"], [1, "rgba(160,220,255,0)"]]), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); mist.position.set(0, -0.8, 0.3); mist.layers.set(NOINK); this.acUnit.add(mist);
      this.acUnit.visible = false; R.add(this.acUnit); }

    // ---- hero treadmills, bathroom scale, trash can, the trash bag ----
    this.tm = [new Treadmill(R), new Treadmill(R)];
    this.scl = new ScalePad(R);
    const canWall = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.27, 0.78, 28, 1, true), lam({ color: "#6a7080", side: THREE.DoubleSide }));
    canWall.position.y = 0.39; canWall.castShadow = true; canWall.receiveShadow = true; this.can.add(canWall);
    const canRim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 8, 28).rotateX(Math.PI / 2), lam({ color: "#8d949c" })); canRim.position.y = 0.78; this.can.add(canRim);
    const canBot = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24).rotateX(-Math.PI / 2), lam({ color: "#1b1d24" })); canBot.position.y = 0.02; this.can.add(canBot);
    this.can.visible = false; R.add(this.can);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), lam({ color: "#17181e" })); bl.scale.set(1, 0.92, 0.86); bl.castShadow = true; this.tbag.add(bl);
    const kn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 8), lam({ color: "#17181e" })); kn.position.set(0.05, 0.2, 0); kn.rotation.z = -0.4; this.tbag.add(kn);
    this.tbag.visible = false; R.add(this.tbag);
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
    const L = GL, K = GK, t = f / FPS, u = uOf(id, f);
    const c = camAt(id, f);
    const ts1 = (f - sceneStart(0)) / FPS, rev = id === 1 ? smooth((ts1 - 3.4) / 2.0) : 0, shk = rev * 1.1;   // after the reveal the whole building trembles
    cam.position.set(c.pos[0] + shk * Math.sin(f * 2.3), c.pos[1] + shk * 0.6 * Math.cos(f * 1.9), c.pos[2]); cam.up.set(0, 1, 0); cam.lookAt(c.look[0], c.look[1], c.look[2]);
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
    const EMB = ["#7a2410", "#4a170f", "#1f101d", "#0d1026", "#070a18"];
    K.sky.c.forEach((h, i) => untone(new THREE.Color(h).lerp(new THREE.Color(EMB[i]), rev), su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(new THREE.Color(L.fog).lerp(new THREE.Color("#2a1410"), rev), this.fog.color);
    this.fog.near = lerp(SHOTS[id - 1].fog[0], 150, rev); this.fog.far = lerp(SHOTS[id - 1].fog[1], 1500, rev);
    scene.fog = this.fog; scene.background = null;
    this.bag.rotation.z = Math.sin(t * 2.3) * 0.11;
    this.volc.visible = id === 1; this.winWall.visible = id === 1; this.frontWall.visible = id !== 1;
    this.roof.visible = false; this.fireBack.visible = id === 4; this.acUnit.visible = id === 4;
    if (id === 1) {
      this.lavaTex.offset.set((t * 0.01) % 1, (t * 0.006) % 1); this.embers.uT.value = t;
      this.lavaBubbles.forEach((b) => { const ud = b.userData as { size: number; k: number }; b.scale.setScalar(Math.max(0.05, ud.size * (0.25 + 0.75 * Math.abs(Math.sin(t * 1.4 + ud.k * 1.7))))); });
      this.smoke.forEach((sm) => {
        const ud = sm.userData as { x0: number; z0: number; off: number }, ph = (t / 14 + ud.off) % 1;
        sm.position.set(ud.x0 + ph * 18, 8 + ph * 150, ud.z0); sm.scale.set(16 + ph * 76, 16 + ph * 76, 1); sm.quaternion.copy(cam.quaternion);
        (sm.material as THREE.MeshBasicMaterial).opacity = 0.55 * Math.sin(Math.PI * ph);
      });
    }
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
    const person = (who: string, o: Outfit, x: number, y: number, z: number, opts: Parameters<typeof bodyFront>[2], i: number, scale = 1) => {
      if (!visible(x, y + 1.1, z, 3.5)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 1.2, z)), [w, h, k] = tier(d), near = d < 16;
      const o2 = { ...opts, light, seed: (i * 5 + 3) % 7 + 1, blink: near ? lidAt(i) : 0 };
      if (!near) o2.expr = "neutral";
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale, draw: (p) => bodyFront(p, o, o2) });
      if (d < 60) blob(st, sunDir, x, y, z);
    };
    /** Tito: flat 2D gym character card standing at (x, y, z) (y = the surface he stands on) */
    const frontT = (who: string, x: number, y: number, z: number, opts: Omit<Parameters<typeof titoFront>[1], "light" | "blink">, i: number, scale = 1) => {
      if (!visible(x, y + 1.1, z, 3.5)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 1.2, z)), [w, h, k] = tier(d);
      const o2 = { ...opts, light, blink: d < 16 ? lidAt(i) : 0 } as Parameters<typeof titoFront>[1];
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale, yaw: 0, draw: (p) => titoFront(p, o2) });
      if (d < 60) blob(st, sunDir, x, y, z, 1.0);
    };
    const pigeonT = (x: number, y: number, z: number, scale: number) => {
      if (!visible(x, y + 0.8, z, 2.5)) return;
      const d = cam.position.distanceTo(this.v.set(x, y + 0.8, z)), [w, h, k] = tier(d), o2 = { light, blink: lidAt(77) };
      st.places.push({ key: `pigeon|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale, yaw: 0, draw: (p) => pigeon(p, o2) });
      if (d < 60) blob(st, sunDir, x, y, z, 0.8);
    };
    const q2 = (x: number) => Math.round(x * 2) / 2, q4 = (x: number) => Math.round(x * 4) / 4, q8 = (x: number) => Math.round(x * 8) / 8, q10 = (x: number) => Math.round(x * 10) / 10, q24 = (x: number) => Math.round(x * 24) / 24;
    const tm0 = this.tm[0], tm1 = this.tm[1];
    tm0.place(0, 0, false); tm1.place(0, 0, false); this.scl.hide(); this.can.visible = false; this.tbag.visible = false;
    let spots: [number, number, number, string?][] = [[0, 0, 3.4]];
    const drip = q8(t);

    if (id === 1) { // the sauna experiment: Tito runs in a trash bag, the sweat keeps coming
      tm0.place(0, 0); tm0.run(t, 0.9);
      const run = q24((t * 1.45) % 1), bob = 0.035 * Math.abs(Math.sin(2 * Math.PI * run));
      frontT("t", 0, 0.25 + bob, 0, { pose: "run", run, bag: 1, sweat: Math.min(1, 0.15 + ts1 * 0.3), drip, expr: ts1 < 1.2 ? "dots" : "effort", tilt: q2(1.6 * Math.sin(4 * Math.PI * run)) }, 1);
      spots = [[0, 0, 3.6]];
    } else if (id === 2) { // the scale illusion: -3.0 lbs, then the bag comes off and he flexes
      tm0.place(0, -2.5); tm0.run(t, 0); this.scl.place(0, 0.3);
      const a = smooth(u / 0.45), z = lerp(-1.9, 0.3, a);
      const y = lerp(0.25, 0, smooth((z + 1.55) / 0.4)) + 0.09 * smooth(z / 0.3);
      const val = -3 * smooth((u - 0.5) / 0.12);
      this.scl.setText(u < 0.5 ? "0.0" : val.toFixed(1), u < 0.5 ? "#9FB3C8" : "#7CFFB0");
      if (u < 0.58) frontT("t", 0, y, z, { pose: "hang", bag: 1, sweat: 1, drip, expr: "effort", tilt: u < 0.45 ? q2(3 * Math.sin(f * 0.5)) : 0 }, 1);
      else {
        const k = (u - 0.58) * (sceneEnd(1) - sceneStart(1));
        frontT("t", 0, y, z, { pose: "flex", expr: "grin", pump: q4(0.6 + 0.4 * (0.5 - 0.5 * Math.cos(f * 0.3))), tilt: q2(1.5 * Math.sin(f * 0.3)) }, 1, 1 + 0.08 * Math.exp(-k / 8) * Math.cos(k * 0.8));
        const h = smooth(k / 10);  // the bag drops to the floor
        this.tbag.visible = true; this.tbag.position.set(lerp(0.3, -1.0, h), lerp(1.2, 0.17, h) + 0.45 * Math.sin(Math.PI * h), lerp(0.3, 0.7, h));
      }
      spots = [[0, 0.3, 3.0], [0, -2.5, 2.6]];
    } else if (id === 4) { // performance paradox: sauna suit gives out, normal gear keeps going
      tm0.place(-1.15, 0); tm1.place(1.15, 0); this.fireBack.position.set(-1.15, 1.35, -2.7); this.acUnit.position.set(1.15, 3.2, -2.7);
      const fat = smooth((u - 0.28) / 0.45), s0 = sceneStart(3);
      let ph = 0; const n = Math.max(0, Math.floor(f - s0));
      for (let k = 0; k < n; k++) ph += (1.45 * (1 - 0.85 * smooth((uOf(4, s0 + k) - 0.28) / 0.45))) / FPS;
      tm0.run(t, 0.9 * (1 - 0.9 * fat)); tm1.run(t, 0.9);
      const runL = q24(ph % 1), runR = q24((t * 1.45) % 1), bobL = 0.035 * Math.abs(Math.sin(2 * Math.PI * runL)) * (1 - fat), bobR = 0.035 * Math.abs(Math.sin(2 * Math.PI * runR));
      if (fat < 0.82) frontT("tl", -1.15, 0.25 + bobL, 0, { pose: "run", run: runL, bag: 1, sweat: 1, drip, expr: fat < 0.35 ? "effort" : "dazed", tilt: q2(1.6 * Math.sin(4 * Math.PI * runL) + 7 * fat) }, 1);
      else frontT("tl", -1.15, 0.25, 0, { pose: "hang", bag: 1, sweat: 1, drip, expr: "dazed", tilt: q2(9 + 1.2 * Math.sin(f * 0.2)) }, 1, 0.97);
      frontT("tr", 1.15, 0.25 + bobR, 0, { pose: "run", run: runR, sweat: 0.34, expr: "grin", tilt: q2(1.4 * Math.sin(4 * Math.PI * runR)) }, 2);
      spots = [[-1.15, 0, 3.2, "#ff6a2a"], [1.15, 0, 3.2, "#7fd0ff"]];
    } else if (id === 5) { // the rebound: drink, step on the scale, +3.0 lbs
      tm0.place(0, -2.5); tm0.run(t, 0); this.scl.place(0, 0.3);
      const z = lerp(-0.35, 0.3, smooth((u - 0.5) / 0.12)), y = 0.09 * smooth((u - 0.58) / 0.06), jump = u >= 0.66, k = Math.max(0, (u - 0.66) * (sceneEnd(4) - sceneStart(4)));
      this.scl.setText(jump ? "+4.0" : "0.0", jump ? "#FF6B6B" : "#9FB3C8");
      if (u < 0.5) frontT("t", 0, 0, z, { pose: "drink", expr: "grin", bottle: q10(0.95 - 0.7 * smooth(u / 0.5)), tilt: q2(2 * Math.sin(f * 0.25)) }, 1);
      else frontT("t", 0, y, z, { pose: "hips", expr: jump ? "dazed" : "dots", sweat: jump ? 0.34 : 0, tilt: jump ? q2(5 * Math.exp(-k / 14) * Math.sin(k * 0.9)) : 0 }, 1, jump ? 1 + 0.05 * Math.exp(-k / 8) * Math.cos(k * 0.8) : 1);
      const pu = smooth((u - 0.7) / 0.07); if (pu > 0) pigeonT(lerp(2.2, 0.5, pu), 0.05 * Math.abs(Math.sin(f * 0.45)) * (pu >= 1 ? 1 : 0.4), 0.55, 0.82);
      spots = [[0, 0.1, 3.0]];
    } else if (id === 6) { // payoff: the bag goes in the trash, water bottle up, big smile
      this.can.position.set(-1.7, 0, 0.1); this.can.visible = true;
      const thr = smooth((u - 0.1) / 0.24), up = u >= 0.42, k = Math.max(0, (u - 0.42) * (sceneEnd(5) - sceneStart(5)));
      if (up) frontT("t", 0.5, 0, 0, { pose: "up", expr: "grin", bottle: 0.45 }, 1, 1 + 0.07 * Math.exp(-k / 9) * Math.cos(k * 0.8));
      else frontT("t", 0.5, 0, 0, { pose: u < 0.08 ? "hips" : "throw", expr: u < 0.1 ? "dots" : "grin", tilt: u < 0.08 ? 0 : q2(-3 * thr) }, 1);
      this.tbag.visible = true;
      if (u < 0.1) this.tbag.position.set(0.3, 0.95, 0.12);
      else if (thr < 1) this.tbag.position.set(lerp(-0.1, -1.7, thr), lerp(1.4, 0.8, thr) + 0.8 * Math.sin(Math.PI * thr), 0.1);
      else this.tbag.position.set(-1.7, 0.52, 0.1);
      spots = [[-1.7, 0.1, 2.4], [0.5, 0, 3.0]];
    }
    this.pools.forEach((pm, i) => { const s = spots[i]; pm.visible = !!s; this.shafts[i].visible = !!s; if (s) { (pm.material as THREE.MeshBasicMaterial).color.set(s[3] ?? "#ffffff"); pm.position.set(s[0], 0.06, s[1]); pm.scale.set(s[2] * 2, 1, s[2] * 2); this.shafts[i].position.set(s[0], 4.1, s[1]); this.shafts[i].scale.set(1, 1, 1); } });
    // background: gym buddies lifting, runners on the far treadmills
    [-15, -12.5, 13, 15.5].forEach((tx, k) => person(`run${k}`, BUDDY(k + 1), tx, 0.34, -7.2, { mode: "march", phase: Math.floor(((t * 2.1 + k * 0.3) % 1) * 8) / 8, lift: 36, expr: "neutral", facing: 0 }, 50 + k));
    for (const b of BUDDIES) {
      const rz = Math.round((0.5 - 0.5 * Math.cos(2 * Math.PI * (t * 0.9 / (1 + b.v * 0.15) + b.v * 0.31))) * 24) / 24;
      person(`b${b.v}`, BUDDY(b.v), b.x, 0, b.z, { mode: "lift", plates: 1 + (b.v % 2), raise: rz, expr: "neutral", facing: 0 }, 30 + b.v);
    }

    let ai = 0;
    for (const p of st.places) {
      const a = this.actor(ai++), [w, h, k] = p.size;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.geometry = BODY;
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      const sc2 = p.scale ?? 1; a.mesh.scale.set(sc2, sc2, sc2);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    for (const p of st.fx) {
      if (!visible(p.x, p.y, p.z, Math.max(p.w, p.h))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else e2.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      e2.mesh.scale.set(p.w, p.h, 1);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (let i = 0; i < fi; i++) this.fxs[i].bind();
    return focus;
  }
}
void FPS;

