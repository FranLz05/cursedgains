// Worlds for "The Anabolic Window Myth": the dark gym (scene 1), the locker room (scenes 2 and 5) and the split locker-room / home set (scene 4).
// Same look as "Sweating != Burning Fat": dark gym, warm overhead spot, flat 2D cel-shaded Tito. Every character card keeps a FIXED yaw (0):
// it is planted on the 3D floor with a contact blob and never turns toward the camera (no billboard effect).
import * as THREE from "three";
import { bodyFront, Outfit, SKINS } from "../alejandro/toon";
import { titoFront } from "./titoV";
import { pigeonDr } from "./pigeonDr";
import { Pool, Actor, Fx, Stage, tier, light2D, blob, BODY } from "../alejandro/troop";
import { NOINK } from "../alejandro/ink";
import { LIGHTS, LOOK, LightPreset, WorldLook } from "../alejandro/lights";
import { TONE, CHAR, twoTone, untone } from "../alejandro/shade";
import { ctex, rep, brick } from "../alejandro/paint";
import { FPS, SHOTS, camAt, smooth, uOf, sceneStart } from "./story";

const GL: LightPreset = { ...LIGHTS.day, el: 70, lit: [0.34, 0.28, 0.22], shade: [0.03, 0.045, 0.12], lift: [0.015, 0.035, 0.12], lambert: 0.45, sideK: 0.7, term: 0.12,
  charTint: [1.06, 0.93, 0.8], charShade: 0.6, charGrad: 0.1, bodyGrad: 0.3, sideTint: [0.62, 0.8, 1.2], fog: "#0b1226", sunCol: "#ffd9a0", sunI: 3.6,
  sky: "#16254a", ground: "#0b1226", hemiI: 0.05, actorShadow: false, bias: -0.0004, normalBias: 0.02 };
const GK: WorldLook = { ...LOOK.day, sky: { c: ["#101a36", "#0d1530", "#0a1126", "#080e20", "#060a18"], e: [0, 4, 10, 20, 40] }, sat: 1.0 };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lam = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

// ---------------- builders ----------------
const mkBox = (P: THREE.Object3D) => (w: number, h: number, d: number, x: number, y: number, z: number, color: string, cast = true, map?: THREE.Texture) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(map ? { map, color } : { color }));
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; P.add(m); return m;
};
const mkCyl = (P: THREE.Object3D) => (r: number, h: number, x: number, y: number, z: number, color: string, rx = 0, rz = 0) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), lam({ color }));
  m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; m.receiveShadow = true; P.add(m); return m;
};
const LOCKER_COLS = ["#2f6fb5", "#2a5f9c", "#3a7fc5", "#c0353a", "#2f6fb5", "#2a5f9c", "#e8a22f"];
/** a metal locker: body, slightly proud door, three vent slots, handle, number plate */
const addLocker = (P: THREE.Object3D, x: number, z: number, i: number, w = 0.8, h = 2.3) => {
  const box = mkBox(P), col = LOCKER_COLS[Math.floor(hh(i, 5) * LOCKER_COLS.length)];
  box(w, h, 0.55, x, h / 2 + 0.1, z, "#2b303c");
  box(w - 0.06, h - 0.1, 0.05, x, h / 2 + 0.1, z + 0.29, col);
  for (let k = 0; k < 3; k++) box(w - 0.3, 0.035, 0.03, x, h - 0.38 - k * 0.1, z + 0.325, "#10131a", false);
  box(0.05, 0.22, 0.05, x + w * 0.3, h * 0.55, z + 0.33, "#d6dae2", false);
  box(0.22, 0.12, 0.02, x, h * 0.78, z + 0.325, "#e8ecf2", false);
  box(w, 0.12, 0.55, x, 0.06, z, "#1b1e27");
};

/** bike-lock-free little props that tie the locker room together */
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
  private gymG = new THREE.Group(); private lockG = new THREE.Group(); private splitG = new THREE.Group();

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
    R.add(this.hemi, this.sun, this.sun.target, this.gymG, this.lockG, this.splitG);

    // =============================================================== GYM (scene 1)
    {
      const G = this.gymG, box = mkBox(G), cyl = mkCyl(G);
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
      floor.receiveShadow = true; G.add(floor);
      box(11, 0.04, 7, 0, 0.02, -0.6, "#6c7588", false).receiveShadow = true;
      box(11.4, 0.045, 0.14, 0, 0.022, 2.98, "#f0c64a", false); box(11.4, 0.045, 0.14, 0, 0.022, -4.18, "#f0c64a", false);
      const bk = brick();
      const wallM = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam({ map: rep(bk, w / 6, h / 4), color: "#9c8062", side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; G.add(m); return m;
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
      for (const [x, z] of [[-3.5, 2.2], [-2.8, 2.5], [3.5, 2.3]] as const) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), lam({ color: "#d9a441" })); k.position.set(x, 0.24, z); k.castShadow = true; G.add(k); }
      for (const z of [-4, 4]) { box(40, 0.3, 0.3, 0, 8.3, z, "#4a4f5c", false); for (const x of [-12, -6, 0, 6, 12]) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 20, 1, true), new THREE.MeshBasicMaterial({ color: "#fff1b8", side: THREE.DoubleSide })); l.position.set(x, 7.8, z); G.add(l); } }
      for (const tx of [-15, -12.5, 13, 15.5]) {
        box(1.0, 0.3, 2.1, tx, 0.15, -7.2, "#2b2f3a"); box(0.85, 0.06, 1.8, tx, 0.32, -7.2, "#555b69", false);
        box(0.08, 1.3, 0.08, tx - 0.4, 0.95, -8.2, "#8d949c"); box(0.08, 1.3, 0.08, tx + 0.4, 0.95, -8.2, "#8d949c"); box(0.9, 0.4, 0.14, tx, 1.65, -8.15, "#1c1f28");
      }
      this.bag = new THREE.Group(); this.bag.position.set(-1.9, 3.0, -8.0);
      const bagM = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.3, 24), lam({ color: "#c0353a" })); bagM.position.y = -1.0; bagM.castShadow = true; this.bag.add(bagM);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), lam({ color: "#8d949c" })); chain.position.y = -0.15; this.bag.add(chain);
      G.add(this.bag); box(0.14, 3.2, 0.14, -1.9, 1.6, -8.6, "#4a4f5c"); box(0.14, 0.14, 0.7, -1.9, 3.05, -8.3, "#4a4f5c");
      // a dumbbell rack right behind Tito (scene 1 starts with the last curl)
      box(2.6, 0.08, 0.5, 1.9, 0.62, -2.2, "#3a3f4c"); box(2.6, 0.08, 0.5, 1.9, 1.05, -2.2, "#3a3f4c");
      for (const dx of [-1.2, 1.2]) box(0.08, 1.1, 0.5, 1.9 + dx, 0.55, -2.2, "#3a3f4c");
      for (let i = 0; i < 5; i++) for (const rr of [0.66, 1.09]) { cyl(0.025, 0.22, 0.9 + i * 0.5, rr + 0.1, -2.2, "#8d949c", 0, Math.PI / 2); cyl(0.1, 0.07, 0.9 + i * 0.5 - 0.1, rr + 0.1, -2.2, "#2f3340", 0, Math.PI / 2); cyl(0.1, 0.07, 0.9 + i * 0.5 + 0.1, rr + 0.1, -2.2, "#2f3340", 0, Math.PI / 2); }
    }

    // =============================================================== LOCKER ROOM (scenes 2 and 5)
    {
      const L = this.lockG, box = mkBox(L);
      const tiles = ctex("lockTiles", 512, 512, (g, r) => {
        g.fillStyle = "#2d3a4c"; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = ["#8ba3bd", "#97aec6", "#819bb5"][(i * 7 + j * 3 + Math.floor(r() * 3)) % 3]; g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58); g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(i * 64 + 6, j * 64 + 6, 20, 4); }
      });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 32).rotateX(-Math.PI / 2), lam({ map: rep(tiles, 14, 11), color: "#9aa7b8" }));
      floor.receiveShadow = true; L.add(floor);
      const wallT = ctex("lockWall", 512, 512, (g, r) => {
        g.fillStyle = "#6f8499"; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = ["#b9cadb", "#c4d3e2", "#aebfd0"][(i + j * 2 + Math.floor(r() * 2)) % 3]; g.fillRect(i * 128 + 4, j * 128 + 4, 120, 120); }
      });
      const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), lam({ map: rep(wallT, 12, 3), color: "#7f8da0", side: THREE.DoubleSide })); back.position.set(0, 4.5, -3.4); back.receiveShadow = true; L.add(back);
      for (const sx of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(30, 9), lam({ map: rep(wallT, 9, 3), color: "#7f8da0", side: THREE.DoubleSide })); sw.position.set(sx * 8.5, 4.5, 8); sw.rotation.y = Math.PI / 2; L.add(sw); }
      for (let i = 0; i < 17; i++) addLocker(L, -7.2 + i * 0.9, -2.9, i + 7);
      box(5.2, 0.1, 0.55, -2.4, 0.5, -1.75, "#a9733f"); for (const dx of [-2.4, 2.4]) box(0.1, 0.45, 0.45, -2.4 + dx, 0.24, -1.75, "#4a4f5c");
      const sports = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.62, 18).rotateZ(Math.PI / 2), lam({ color: "#c0353a" })); sports.position.set(-3.6, 0.72, -1.75); sports.castShadow = true; L.add(sports);
      box(0.5, 0.06, 0.34, -1.4, 0.58, -1.75, "#f4f6fa");
      box(0.5, 0.1, 5.6, 6.4, 0.5, 0.3, "#a9733f", true);
    }

    // =============================================================== SPLIT SET (scene 4): locker room on the left, home on the right
    {
      const S = this.splitG, box = mkBox(S), cyl = mkCyl(S);
      const tiles = ctex("lockTiles", 512, 512, () => undefined);   // same texture as the locker room (cached by key)
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 22).rotateX(-Math.PI / 2), lam({ map: rep(tiles, 5, 8), color: "#9aa7b8" })); fl.position.set(-7.0, 0.012, 4); fl.receiveShadow = true; S.add(fl);
      for (let i = 0; i < 4; i++) addLocker(S, -3.4 + i * 0.9, -2.5, i + 30);
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(14, 22).rotateX(-Math.PI / 2), lam({ color: "#6d4a3a" })); rug.position.set(7.0, 0.014, 4); rug.receiveShadow = true; S.add(rug);
      const wallH = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6), lam({ color: "#d9c6a3", side: THREE.DoubleSide })); wallH.position.set(3.15, 3, -2.8); wallH.receiveShadow = true; S.add(wallH);
      const winHome = ctex("homeWin", 256, 256, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#ffb86b"); gr.addColorStop(1, "#ff7a5a"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
        g.fillStyle = "#ffe1a8"; g.beginPath(); g.arc(170, 150, 38, 0, 7); g.fill();
        g.strokeStyle = "#f4efe6"; g.lineWidth = 14; g.strokeRect(7, 7, 242, 242); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
      });
      const wm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: winHome, color: new THREE.Color(1.15, 1.0, 0.9) })); wm.position.set(1.7, 2.2, -2.77); wm.layers.set(NOINK); S.add(wm);
      box(1.0, 0.28, 0.12, 3.9, 1.7, -2.72, "#a9733f", false);
      box(1.5, 0.45, 0.8, 2.3, 0.3, -1.9, "#2f7f86"); box(1.5, 0.75, 0.22, 2.3, 0.75, -2.3, "#2a6f76"); box(0.22, 0.6, 0.8, 1.6, 0.5, -1.9, "#2a6f76"); box(0.22, 0.6, 0.8, 3.0, 0.5, -1.9, "#2a6f76");
      cyl(0.16, 0.3, 3.6, 0.15, -1.2, "#8f5a3a"); const plant = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), lam({ color: "#3f9a5c" })); plant.position.set(3.6, 0.62, -1.2); plant.scale.set(1, 1.3, 1); plant.castShadow = true; S.add(plant);
      cyl(0.03, 1.6, 0.55, 0.8, -1.9, "#c9ccd2"); const sh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 18, 1, true), new THREE.MeshBasicMaterial({ color: "#ffd7a0", side: THREE.DoubleSide })); sh.position.set(0.55, 1.65, -1.9); S.add(sh);
    }

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

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const L = GL, K = GK, t = f / FPS, u = uOf(id, f), ts = (f - sceneStart(id - 1)) / FPS;
    const c = camAt(id, f);
    // scene 1: the dumbbell hits the floor -> a short camera thump
    const tL = DB_DROP + DB_FALL, shk = id === 1 && ts > tL ? 0.07 * Math.exp(-(ts - tL) * 9) * Math.sin(f * 2.9) : 0;
    cam.position.set(c.pos[0], c.pos[1] + shk, c.pos[2]); cam.up.set(0, 1, 0); cam.lookAt(c.look[0], c.look[1], c.look[2]);
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
    this.bag.rotation.z = Math.sin(t * 2.3) * 0.11;
    this.gymG.visible = id === 1; this.lockG.visible = id === 2 || id === 5; this.splitG.visible = id === 4;
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
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale, yaw: 0, draw: (p) => bodyFront(p, o, o2) });
      if (d < 60) blob(st, sunDir, x, y, z);
    };
    /** Tito: flat 2D card standing at (x, y, z) with a FIXED yaw (planted on the floor) */
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
      st.places.push({ key: `pigeonDr|${JSON.stringify(o2)}`, x, y, z, size: [w, h, k], scale, yaw: 0, draw: (p) => pigeonDr(p, o2) });
      if (d < 60) blob(st, sunDir, x, y, z, 0.8);
    };
    const q2 = (x: number) => Math.round(x * 2) / 2, q4 = (x: number) => Math.round(x * 4) / 4, q8 = (x: number) => Math.round(x * 8) / 8, q10 = (x: number) => Math.round(x * 10) / 10, q12 = (x: number) => Math.round(x * 12) / 12, q24 = (x: number) => Math.round(x * 24) / 24;
    let spots: [number, number, number, string?][] = [[0, 0, 3.4]];

    if (id === 1) { // the panic: last curl, the dumbbell drops, a bomb timer appears on his chest
      const curlK = ts < DB_DROP ? q10(smooth((ts + 0.25) / 1.0)) : 0;
      const tim = timerState(ts);
      const hop = ts > T_TIMER && ts < T_TIMER + 0.42 ? 0.12 * Math.sin(Math.PI * (ts - T_TIMER) / 0.42) : 0;
      let expr: "effort" | "shock" | "terror" = "effort"; if (ts >= DB_DROP) expr = "shock"; if (ts >= T_TIMER) expr = "terror";
      const trem = ts >= T_TIMER + 0.5 ? q2(2.6 * Math.sin(f * 1.1)) : 0;
      frontT("t", 0, hop, 0, {
        pose: ts < DB_DROP ? "curl" : ts < T_TIMER ? "hips" : "panic", hand: ts >= T_TIMER + 0.45 ? q2(4 * Math.sin(f * 1.3)) : 0, curl: curlK, db: ts < DB_DROP ? 1 : 0, dbFree: ts >= DB_DROP ? dumbbellFall(ts) : undefined, expr,
        timer: tim.text, timerPop: q12(tim.pop), timerFlash: tim.flash, sweat: ts < T_TIMER ? 0.34 : 0.67, tilt: trem,
      }, 1);
      spots = [[0, 0, 3.6]];
    } else if (id === 2) { // dry scoop in the locker room: sprint in, funnel + scoop, then the powder cough
      const run = ts < 1.05;
      if (run) {
        const x = lerp(-3.6, 0, smooth(ts / 1.0)), ph = q24((ts * 2.3) % 1);
        frontT("t", x, 0.05 * Math.abs(Math.sin(Math.PI * ph * 2)), 0, { pose: "run", run: ph, expr: "effort", sweat: 0.34, tilt: q2(1.6 * Math.sin(4 * Math.PI * ph)) }, 1);
      } else {
        const coughing = ts >= T_COUGH, kk = ts - T_COUGH;
        frontT("t", 0, 0, 0, {
          pose: "scoop", scoopPh: q8(((ts - 1.05) * 1.1) % 1), expr: coughing ? "cough" : "effort", headTilt: -9, sweat: 0.34,
          cloud: coughing ? q8((kk * 1.2) % 1) : 0, tilt: coughing ? q2(3.2 * Math.sin(f * 0.95)) : q2(0.8 * Math.sin(f * 0.4)),
        }, 1);
      }
      spots = [[0, 0, 3.2, "#9fc8ff"]];
    } else if (id === 4) { // split screen: locker room (shaker, 40 / 150 g) vs home (chicken and rice, 150 / 150 g)
      const bt = q10(0.85 - 0.04 * Math.sin(ts));
      frontT("tl", -1.15, 0, 0, { pose: "up", shaker: true, bottle: bt, expr: ts < 5 ? "worried" : "dazed", sweat: 0.34, tilt: q2(1.2 * Math.sin(f * 0.18)) }, 1);
      frontT("tr", 1.15, 0, 0, { pose: "eat", scoopPh: q8((ts * 0.5) % 1), expr: "chill", towel: 1, wet: 1, tilt: q2(0.8 * Math.sin(f * 0.1)) }, 2);
      spots = [[-1.15, 0, 3.2, "#9fc8ff"], [1.15, 0, 3.2, "#ffb066"]];
    } else if (id === 5) { // the punchline: Dr. Pigeon arrives with a prescription, Tito (still coughing) gives a trembling thumbs up
      const thumb = ts >= T_THUMB, kk = ts - 0.3;
      frontT("t", -0.55, 0, 0, {
        pose: thumb ? "thumb" : "hips", expr: "dazed", sweat: 0.34, hand: thumb ? q2(5 * Math.sin(f * 1.5)) : 0,
        cloud: q8(((kk > 0 ? kk : 0) * 0.95) % 1), tilt: q2(2.2 * Math.sin(f * 0.85)),
      }, 1);
      const pu = smooth((ts - 0.1) / 0.9), px = lerp(3.4, 0.8, pu);
      pigeonT(px, 0.05 * Math.abs(Math.sin(f * 0.45)) * (pu >= 1 ? 0.2 : 1), 0.55, 0.82);
      spots = [[-0.55, 0, 3.0, "#9fc8ff"], [0.8, 0.5, 2.2]];
    }
    this.pools.forEach((pm, i) => { const s = spots[i]; pm.visible = !!s; this.shafts[i].visible = !!s; if (s) { (pm.material as THREE.MeshBasicMaterial).color.set(s[3] ?? "#ffffff"); pm.position.set(s[0], 0.06, s[1]); pm.scale.set(s[2] * 2, 1, s[2] * 2); this.shafts[i].position.set(s[0], 4.1, s[1]); this.shafts[i].scale.set(1, 1, 1); } });
    // background: gym buddies lifting (scene 1 only)
    if (id === 1) for (const b of BUDDIES) {
      const rz = Math.round((0.5 - 0.5 * Math.cos(2 * Math.PI * (t * 0.9 / (1 + b.v * 0.15) + b.v * 0.31))) * 24) / 24;
      person(`b${b.v}`, BUDDY(b.v), b.x, 0, b.z, { mode: "lift", plates: 1 + (b.v % 2), raise: rz, expr: "neutral", facing: 0 }, 30 + b.v);
    }

    let ai = 0;
    for (const p of st.places) {
      const a = this.actor(ai++), [w, h, k] = p.size;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.geometry = BODY;
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
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else e2.mesh.rotation.set(0, 0, 0);
      e2.mesh.scale.set(p.w, p.h, 1);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (let i = 0; i < fi; i++) this.fxs[i].bind();
    return focus;
  }
}

// ---------------- scene timings (seconds into each scene) shared with the overlays ----------------
export const DB_DROP = 1.35, DB_FALL = 0.3, T_TIMER = 1.7, T_COUGH = 3.9, T_THUMB = 3.5;
/** the dropped dumbbell in card coordinates: from the raised hand (432, 393) to the floor (centre y 923), one small bounce */
const dumbbellFall = (ts: number): [number, number, number] => {
  const k = ts - DB_DROP, a = Math.min(1, k / DB_FALL), y0 = 393, yF = 923;
  let y = y0 + (yF - y0) * a * a, rot = -16 * a;
  if (k > DB_FALL) { const kk = k - DB_FALL; y = yF - 30 * Math.abs(Math.sin((kk * Math.PI) / 0.2)) * Math.exp(-kk * 9); rot = -16 + 10 * smooth(kk / 0.25); }
  return [432 + 70 * Math.min(1, k / DB_FALL), y, rot];
};
/** the countdown shown on the bomb timer (29:59 and ticking down fast) */
export const timerState = (ts: number) => {
  if (ts < T_TIMER) return { text: "", pop: 0, flash: 0 };
  const u = Math.min(1, (ts - T_TIMER) / 0.38), c1 = 1.70158, c3 = c1 + 1, pop = 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  const left = Math.max(0, 1799 - Math.floor((ts - T_TIMER) * 3)), mm = Math.floor(left / 60), ss = left % 60;
  return { text: `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`, pop, flash: Math.floor(ts * 3) % 2 };
};
void FPS;
