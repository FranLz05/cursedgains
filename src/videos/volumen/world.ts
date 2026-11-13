// The gym for "Volumen basura": painted floor and brick, power racks, plate towers (10 vs 20), a giant glass of water,
// five day-mats, flat lit cartoon cards for Tito and his gym buddies. Built from the Alejandro template's pieces
// (two-tone world materials, lit character cards with contact blobs, world ink).
import * as THREE from "three";
import { bodyFront, Outfit, Expr, SKINS } from "../alejandro/toon";
import { BENCH_W, BENCH_H, BENCH_FLOOR } from "./bench";
import { BenchSet } from "./tito";
import { titoFront, titoBench, TitoExpr } from "./titoGym";
import { Pool, Actor, Fx, Stage, tier, light2D, blob, BODY, SU } from "../alejandro/troop";
import { NOINK } from "../alejandro/ink";
import { LIGHTS, LOOK, LightPreset, WorldLook } from "../alejandro/lights";
import { TONE, CHAR, twoTone, untone } from "../alejandro/shade";
import { ctex, rep, brick } from "../alejandro/paint";
import { FPS, SHOTS, camAt, smooth, worldF, TITO_LIFT, glassLevel, puddleR, glassOver } from "./story";

const GL: LightPreset = { ...LIGHTS.day, el: 70, lit: [0.34, 0.28, 0.22], shade: [0.03, 0.045, 0.12], lift: [0.015, 0.035, 0.12], lambert: 0.45, sideK: 0.7, term: 0.12,
  charTint: [1.06, 0.93, 0.8], charShade: 0.6, charGrad: 0.1, bodyGrad: 0.3, sideTint: [0.62, 0.8, 1.2], fog: "#0b1226", sunCol: "#ffd9a0", sunI: 3.6,
  sky: "#16254a", ground: "#0b1226", hemiI: 0.05, actorShadow: false, bias: -0.0004, normalBias: 0.02 };
const GK: WorldLook = { ...LOOK.day, sky: { c: ["#101a36", "#0d1530", "#0a1126", "#080e20", "#060a18"], e: [0, 4, 10, 20, 40] }, sat: 1.0 };
const BENCH = (() => { const g = new THREE.PlaneGeometry(BENCH_W * SU, BENCH_H * SU); g.translate(0, (BENCH_FLOOR - BENCH_H / 2) * SU, 0); return g; })();
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lam = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- cast ----------------
const TITO: Outfit = { jacket: "#e2453c", pants: "#2b3a55", boots: "#f4f1ea", skin: SKINS[1], hat: "hair", hair: "#3a2a1c", build: "adult" };
const TITO_BIG: Outfit = { ...TITO, build: "stout" };
const BUDDY = (v: number): Outfit => ({
  jacket: ["#3f6fb5", "#5d9a5a", "#e8a22f", "#7b5ac9", "#2f8a8a"][v % 5], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[(v + 2) % 4],
  hat: v % 2 ? "cap" : "hair", cap: ["#e2453c", "#f4f1ea", "#2b3a55"][v % 3], hair: ["#5a3b2a", "#2a201a", "#c98f3e"][v % 3],
});
const BUDDIES = [{ x: -9.5, z: -5.5, v: 0 }, { x: 8.8, z: -6.2, v: 1 }, { x: -13.2, z: -3.5, v: 2 }, { x: 12.6, z: -4.2, v: 3 }, { x: 5.5, z: -7.6, v: 4 }, { x: -5.2, z: -7.8, v: 5 }];
const STATIONS = [{ x: -8, c: "#e2453c" }, { x: -4, c: "#e8a22f" }, { x: 0, c: "#3f9a5a" }, { x: 4, c: "#3f6fb5" }, { x: 8, c: "#7b5ac9" }];

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
  private dome!: THREE.Mesh; private lip!: THREE.Mesh; private crown!: THREE.Mesh; private streams: THREE.Mesh[] = []; private splash: THREE.Mesh[] = [];
  private bag = new THREE.Group(); private ripple: THREE.Mesh; private sheet: THREE.Mesh; private drops: THREE.Mesh[] = []; private glass = new THREE.Group(); private water: THREE.Mesh; private puddle: THREE.Mesh; private mats = new THREE.Group();

  private benches: BenchSet[] = [];
  constructor() {
    const R = this.root;
    this.benches = Array.from({ length: 5 }, () => new BenchSet(R));
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
      m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; R.add(m);
    };
    wallM(40, 9, 0, 4.5, -10, 0); wallM(32, 9, -18, 4.5, 2, Math.PI / 2); wallM(32, 9, 18, 4.5, 2, -Math.PI / 2); wallM(40, 9, 0, 4.5, 16, 0);
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

    // ---- the giant glass of water (shot 6) ----
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.15, 3.0, 40, 1, true),
      new THREE.MeshBasicMaterial({ color: "#d4ecff", transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    shell.position.y = 1.5; shell.renderOrder = 3;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 8, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#f2fbff" }));
    rim.position.y = 3.0;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.2, 40), new THREE.MeshBasicMaterial({ color: "#cfe6f5", transparent: true, opacity: 0.7 }));
    base.position.y = 0.1;
    this.water = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.1, 1, 40), new THREE.MeshBasicMaterial({ color: "#46b0ea" }));
    this.puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 56).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#4aaee8", transparent: true, opacity: 0.8, depthWrite: false }));
    this.puddle.position.set(4.2, 0.07, -1.0); this.puddle.renderOrder = 1; this.puddle.layers.set(NOINK);
    this.glass.add(shell, rim, base, this.water); this.glass.position.set(4.2, 0, -1.0);
    R.add(this.glass, this.puddle);

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
    // water: a rippling surface ring, a sheet of water running down the glass, falling drops
    this.ripple = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.18, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#d6f1ff", transparent: true, opacity: 0.7, depthWrite: false }));
    this.sheet = new THREE.Mesh(new THREE.CylinderGeometry(1.33, 1.2, 1, 20, 1, true, -0.7, 1.4), new THREE.MeshBasicMaterial({ color: "#46b0ea", transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    this.glass.add(this.ripple, this.sheet);
    const waterM = () => new THREE.MeshBasicMaterial({ color: "#46b0ea" });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), waterM());
    this.lip = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.1, 10, 40).rotateX(Math.PI / 2), waterM());
    this.glass.add(this.dome, this.lip);
    for (let k = 0; k < 5; k++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 1, 8), waterM()); this.streams.push(st); this.glass.add(st); }
    this.crown = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#bfe9ff", transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    this.crown.position.y = 0.09; this.crown.layers.set(NOINK); this.glass.add(this.crown);
    for (let k = 0; k < 16; k++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), waterM()); sp.layers.set(NOINK); this.splash.push(sp); this.glass.add(sp); }
    for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: "#46b0ea" })); d.layers.set(NOINK); this.drops.push(d); this.glass.add(d); }

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

    // five day-mats for shot 7
    for (const s of STATIONS) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 2.3), lam({ color: s.c })); m.position.set(s.x, 0.03, 0); m.receiveShadow = true; this.mats.add(m); }
    R.add(this.mats);
  }

  private shotSun(id: number) {
    let v = this.sunCache.get(id);
    if (v) return v;
    const s = SHOTS[id - 1];
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
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
    const fw = worldF(f), L = GL, K = GK;
    const c = camAt(id, f);
    // a short shake when the shirt gives up (shot 8, on "camiseta")
    const sh = id === 8 && f >= 1027 && f < 1035 ? 0.035 * (1 - (f - 1027) / 8) * (f % 2 ? 1 : -1) : 0;
    cam.position.set(c.pos[0], c.pos[1] + sh, c.pos[2]); cam.up.set(0, 1, 0); cam.lookAt(c.look[0], c.look[1] + sh, c.look[2]);
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
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    this.fog.near = SHOTS[id - 1].fog[0]; this.fog.far = SHOTS[id - 1].fog[1];
    scene.fog = this.fog; scene.background = null;

    // set dressing per shot
    this.glass.visible = id === 5 || id === 6; this.puddle.visible = id === 6 && f >= 700; this.mats.visible = id === 7;
    const lvl = glassLevel(f), wob = 0.012 * Math.sin(f * 0.35);
    this.water.scale.set(1, Math.max(0.001, lvl * 2.75 + wob), 1); this.water.position.y = 0.2 + (lvl * 2.75) / 2;
    const top = 0.2 + lvl * 2.75;
    this.ripple.visible = lvl > 0.02; this.ripple.position.y = top + 0.01; const rs = 0.85 + 0.12 * Math.sin(f * 0.5); this.ripple.scale.set(rs, 1, rs);
    const ov = glassOver(f), rimY = 3.0;
    this.dome.visible = ov > 0 && id === 6; this.dome.position.y = top; this.dome.scale.set(1, Math.max(0.01, 0.34 * ov + 0.03 * Math.sin(f * 0.6) * ov), 1);
    this.lip.visible = ov > 0.25 && id === 6; this.lip.position.y = rimY; this.lip.scale.setScalar(0.9 + 0.1 * ov);
    this.streams.forEach((st, k) => {
      const th = -0.9 + k * 0.45, prog = smooth(ov * 2.4 - k * 0.12) * smooth((f - 698 - k) / 14 + 0.2), len = Math.max(0.001, rimY * prog);
      st.visible = ov > 0 && id === 6; st.scale.set(1 + 0.25 * Math.sin(f * 0.4 + k), len, 1); st.position.set(1.37 * Math.sin(th), rimY - len / 2, 1.37 * Math.cos(th));
    });
    const hit = smooth((ov * 2.4 - 0.9) * 1.4);      // the streams reach the floor
    this.crown.visible = hit > 0 && id === 6; const cs = 1.3 + 1.8 * ((f * 0.045) % 1); this.crown.scale.set(cs, 1, cs); (this.crown.material as THREE.MeshBasicMaterial).opacity = 0.85 * hit * (1 - ((f * 0.045) % 1));
    this.splash.forEach((sp, k) => { const ph = ((f - 700) / 16 + k / 16) % 1, a = k * 2.4 + 0.6; sp.visible = hit > 0.2 && id === 6; sp.position.set((1.45 + 1.6 * ph) * Math.cos(a), 0.1 + 2.4 * ph * (1 - ph) * (0.7 + 0.5 * hh(k, 3)), (1.45 + 1.6 * ph) * Math.sin(a)); sp.scale.setScalar(1 - 0.5 * ph); });
    const su2 = smooth((f - 705) / 50); this.sheet.visible = su2 > 0; this.sheet.scale.set(1, Math.max(0.001, 2.8 * su2), 1); this.sheet.position.y = 3.0 - 1.4 * su2;
    this.drops.forEach((d, i) => { const tau = ((f - 700) / 34 + i * 0.37) % 1, a = -0.55 + 0.22 * i; d.visible = f >= 706 && f < 790; d.position.set(1.4 * Math.sin(a) * (1 + 0.5 * tau), 3.0 - 3.3 * tau * tau, 1.4 * Math.cos(a)); });
    this.bag.rotation.z = Math.sin(fw * 0.07) * 0.11;
    const spots: [number, number, number][] = id === 6 ? [[0, 0, 3.2], [4.2, -1.0, 3.6]] : id === 7 ? STATIONS.map((s) => [s.x, 0, 2.6] as [number, number, number]) : id === 5 ? [[0, 0, 3.2], [4.2, -1.0, 3.0]] : [[0, 0, 3.4]];
    this.pools.forEach((pm, i) => { const s = spots[i]; pm.visible = !!s; this.shafts[i].visible = !!s; if (s) { pm.position.set(s[0], 0.06, s[1]); pm.scale.set(s[2] * 2, 1, s[2] * 2); this.shafts[i].position.set(s[0], 4.1, s[1]); this.shafts[i].scale.set(1, 1, 1); } });
    this.dust.uT.value = fw / FPS; this.dust.uCam.value.copy(cam.position);
    const pr = puddleR(f); this.puddle.scale.set(Math.max(0.01, pr), 1, Math.max(0.01, pr));

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

    /** Tito lying on the bench: a wide card glued to the 3D bench with the bench's own fixed orientation (yaw 0): it never turns toward the camera */
    const benchT = (who: string, x: number, z: number, opts: { raise: number; expr: TitoExpr; sweat?: number; shake?: number }, i: number) => {
      if (!visible(x, 0.8, z, 3)) return;
      const d = cam.position.distanceTo(this.v.set(x, 0.8, z)), k = Math.min(tier(d)[2], 2.2), w = Math.round(BENCH_W * k), h = Math.round(BENCH_H * k);
      const o2 = { ...opts, light, blink: d < 16 ? lidAt(i) : 0 };
      st.places.push({ key: `${who}|bench|${JSON.stringify(o2)}`, x, y: 0, z, size: [w, h, k], wide: true, scale: 1, yaw: 0, draw: (p) => titoBench(p, o2) });
      if (d < 60) { blob(st, sunDir, x - 0.2, 0, z, 1.1); blob(st, sunDir, x + 0.95, 0, z, 0.8); }
    };
    /** Tito standing (hips / flex / hang): billboarded card, articulated, with a changing face */
    const frontT = (who: string, x: number, z: number, opts: { pose: "hips" | "flex" | "hang"; expr: TitoExpr; pump?: number; big?: number; sweat?: number; tilt?: number; headTilt?: number }, i: number, scale = 1) => {
      if (!visible(x, 1.1, z, 3.5)) return;
      const d = cam.position.distanceTo(this.v.set(x, 1.2, z)), [w, h, k] = tier(d);
      const o2 = { ...opts, light, blink: d < 16 ? lidAt(i) : 0 };
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y: 0, z, size: [w, h, k], scale, draw: (p) => titoFront(p, o2) });
      if (d < 60) blob(st, sunDir, x, 0, z, 1.0);
    };
    // Tito: gym version (2D flat cel-shaded cards). Lying: card fixed to the bench; standing: billboard
    const tl = TITO_LIFT(fw);
    this.benches.forEach((bn) => bn.hide());
    const lieRaise = (k: number) => Math.round((0.5 - 0.5 * Math.cos(2 * Math.PI * (fw / 38 + k * 0.23))) * 24) / 24;
    const q4 = (x: number) => Math.round(x * 4) / 4, q2 = (x: number) => Math.round(x * 2) / 2;
    if (id <= 4) {
      this.benches[0].place(0, 0);
      benchT("tito", 0, 0, { raise: tl.raise, expr: tl.expr, sweat: tl.sweat, shake: id === 4 ? q2(tl.tilt * 3) : 0 }, 1);
    } else if (id === 5) { // "luckily..." flexing with pride; "unfortunately..." the pump sags and he gets worried
      const pump = 0.5 - 0.5 * Math.cos(f * 0.35), droop = smooth((f - 571) / 24);
      frontT("tito", 0, 0, { pose: "flex", expr: droop > 0.5 ? "worried" : "grin", pump: q4((1 - droop * 0.8) * (0.55 + 0.45 * pump)), sweat: droop > 0.5 ? 0.34 : 0, tilt: q2(1.5 * Math.sin(f * 0.2)) }, 1);
    } else if (id === 6) {
      const k = Math.max(0, f - 698), shock = f >= 698;
      frontT("tito", 0, 0, { pose: "hips", expr: shock ? "shock" : "dots", tilt: shock ? q2(4 * Math.sin(k * 0.7) * Math.exp(-k / 40)) : 0 }, 1, shock ? 1 + 0.04 * Math.exp(-k / 14) * Math.cos(k * 0.9) : 1);
    } else if (id === 7) {
      STATIONS.forEach((s, k) => { this.benches[k].place(s.x, 0); benchT(`day${k}`, s.x, 0, { raise: lieRaise(k), expr: "grin" }, 10 + k); });
    } else if (f >= 1027) { // the tank top gets tight: wider chest and arms, muscle shows through; squash and stretch
      const u2 = Math.min(1, (f - 1027) / 12), pop = Math.exp(-4 * u2) * Math.cos(u2 * 14), bigK = Math.round(smooth((f - 1027) / 10) * 8) / 8;
      frontT("tito", 0, 0, { pose: "flex", expr: "grin", big: bigK, pump: q4(0.6 + 0.4 * (0.5 - 0.5 * Math.cos(f * 0.3))), tilt: q2(1.2 * Math.sin(f * 0.3)) }, 1, 1 + 0.1 * pop);
    } else {
      this.benches[0].place(0, 0);
      benchT("tito", 0, 0, { raise: lieRaise(0), expr: "grin" }, 1);
    }
    // runners on the treadmills, facing us
    if (id !== 6 && id !== 7) [-15, -12.5, 13, 15.5].forEach((tx, k) => person(`run${k}`, BUDDY(k + 1), tx, 0.34, -7.2, { mode: "march", phase: Math.floor(((fw / 14 + k * 0.3) % 1) * 8) / 8, lift: 36, expr: "neutral", facing: 0 }, 50 + k));
    // gym buddies, lifting at their own pace in the background
    if (id !== 6 && id !== 7) for (const b of BUDDIES) {
      const rz = Math.round((0.5 - 0.5 * Math.cos(2 * Math.PI * (fw / (34 + b.v * 5) + b.v * 0.31))) * 24) / 24;
      person(`b${b.v}`, BUDDY(b.v), b.x, 0, b.z, { mode: "lift", plates: 1 + (b.v % 2), raise: rz, expr: "neutral", facing: 0 }, 30 + b.v);
    }

    let ai = 0;
    for (const p of st.places) {
      const a = this.actor(ai++), [w, h, k] = p.size;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.geometry = p.wide ? BENCH : BODY;
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);   // yaw given = fixed orientation (Tito on the bench), otherwise billboard
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
void smooth; void FPS;
