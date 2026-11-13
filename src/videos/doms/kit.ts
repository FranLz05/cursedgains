// Shared building blocks for the DOMS short (Video 6): one unit box / cylinder / sphere geometry, materials cached by colour, text planes,
// dynamic (per-frame) text panels, soft puffs. Same PumpParadox look as every short: two-tone cel lighting (twoTone), thick ink pass on the default layer,
// emissive / text / transparent things on the NOINK layer so they glow and are never outlined.
import * as THREE from "three";
import { NOINK } from "../alejandro/ink";
import { twoTone } from "../alejandro/shade";
import { ctex } from "../alejandro/paint";

export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 28);
export const SPH = new THREE.SphereGeometry(1, 22, 16);
const MATS = new Map<string, THREE.Material>();

export const lam = (color: string, map?: THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => {
  const k = color + (map ? map.uuid : "") + JSON.stringify(extra);
  let m = MATS.get(k);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color, ...(map ? { map } : {}), ...extra })); MATS.set(k, m); }
  return m as THREE.MeshLambertMaterial;
};
export const basic = (color: string | THREE.Color, extra: THREE.MeshBasicMaterialParameters = {}) => {
  const k = "b" + (typeof color === "string" ? color : color.getHexString()) + JSON.stringify(extra);
  let m = MATS.get(k);
  if (!m) { m = new THREE.MeshBasicMaterial({ color, ...extra }); MATS.set(k, m); }
  return m as THREE.MeshBasicMaterial;
};
/** colour multiplied > 1 so the bloom picks it up */
export const hot = (hex: string, k = 2.4) => new THREE.Color(hex).multiplyScalar(k);

export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeIn = (x: number) => { const u = clamp01(x); return u * u * u; };
export const easeIO = (x: number) => { const u = clamp01(x); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const spring = (x: number, k = 9) => (x <= 0 ? 0 : 1 - Math.exp(-k * x * 0.6) * Math.cos(k * x));

export class Kit {
  constructor(public g: THREE.Object3D) {}
  box(w: number, h: number, d: number, x: number, y: number, z: number, color: string, map?: THREE.Texture, cast = true) {
    const m = new THREE.Mesh(BOX, lam(color, map)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; this.g.add(m); return m;
  }
  cyl(r: number, h: number, x: number, y: number, z: number, color: string, o: { rx?: number; ry?: number; rz?: number; map?: THREE.Texture; sy?: number; side?: THREE.Side } = {}) {
    const m = new THREE.Mesh(CYL, lam(color, o.map, o.side ? { side: o.side } : {})); m.scale.set(r, h, r * (o.sy ?? 1)); m.position.set(x, y, z); m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    m.castShadow = true; m.receiveShadow = true; this.g.add(m); return m;
  }
  sph(rx: number, ry: number, rz: number, x: number, y: number, z: number, color: string, map?: THREE.Texture) {
    const m = new THREE.Mesh(SPH, lam(color, map)); m.scale.set(rx, ry, rz); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; this.g.add(m); return m;
  }
  /** emissive box (never inked, blooms) */
  glow(w: number, h: number, d: number, x: number, y: number, z: number, color: string | THREE.Color, extra: THREE.MeshBasicMaterialParameters = {}) {
    const m = new THREE.Mesh(BOX, basic(color, extra)); m.scale.set(w, h, d); m.position.set(x, y, z); m.layers.set(NOINK); this.g.add(m); return m;
  }
  gsph(r: number, x: number, y: number, z: number, color: string | THREE.Color, extra: THREE.MeshBasicMaterialParameters = {}) {
    const m = new THREE.Mesh(SPH, basic(color, extra)); m.scale.setScalar(r); m.position.set(x, y, z); m.layers.set(NOINK); this.g.add(m); return m;
  }
  plane(w: number, h: number, x: number, y: number, z: number, mat: THREE.Material, ry = 0, rx = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; this.g.add(m); return m;
  }
  /** a lit text plane (Arial Black with ink outline), never inked */
  label(text: string, w: number, h: number, x: number, y: number, z: number, bg: string | null, fg: string, ry = 0, border = "#111114") {
    const px = 512, py = Math.max(64, Math.round((px * h) / w));
    const t = labelTex(`lbl_${text}_${bg}_${fg}_${px}x${py}`, text, bg, fg, px, py, border);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: !bg, toneMapped: true, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = ry; m.layers.set(NOINK); m.renderOrder = 3; this.g.add(m); return m;
  }
  /** a ground plane with a repeating texture */
  floor(size: number, tex: THREE.Texture, color = "#ffffff", y = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), lam(color, tex)); m.position.y = y; m.receiveShadow = true; this.g.add(m); return m;
  }
}

export const labelTex = (key: string, text: string, bg: string | null, fg: string, w: number, h: number, border = "#111114") => ctex(key, w, h, (g) => {
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = border; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); }
  const lines = text.split("\n");
  let f = Math.floor(h / (lines.length * 1.05)); const fit = () => { g.font = `900 ${f}px Arial Black, Impact, sans-serif`; return Math.max(...lines.map((l) => g.measureText(l).width)); };
  while (fit() > w - 40 && f > 16) f -= 4;
  g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = Math.max(6, f * 0.14); g.strokeStyle = "#111114"; g.fillStyle = fg;
  lines.forEach((l, i) => { const y = h / 2 + (i - (lines.length - 1) / 2) * f * 1.03 + 3; g.strokeText(l, w / 2, y); g.fillText(l, w / 2, y); });
});

/** a text panel redrawn on demand (counters, meters): update with set() — only repaints when the text / colour changed */
export class DynText {
  cv = document.createElement("canvas"); g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; mesh: THREE.Mesh; last = "";
  constructor(public w: number, public h: number, public pw = 512, public ph = 192, parent?: THREE.Object3D) {
    this.cv.width = pw; this.cv.height = ph; this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, side: THREE.DoubleSide }));
    this.mesh.layers.set(NOINK); this.mesh.renderOrder = 4; parent?.add(this.mesh);
  }
  set(text: string, fg: string, bg: string | null = "#0b0d12", border = "#8d949c", glow = 22, mono = true) {
    const key = text + fg + bg + glow; if (key === this.last) return; this.last = key;
    const g = this.g, { pw: w, ph: h } = this; g.clearRect(0, 0, w, h);
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = border; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12); }
    let f = Math.floor(h * 0.62); const fam = mono ? "'Courier New', Consolas, monospace" : "Arial Black, Impact, sans-serif";
    g.font = `bold ${f}px ${fam}`; while (g.measureText(text).width > w - 50 && f > 16) { f -= 4; g.font = `bold ${f}px ${fam}`; }
    g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = fg; g.shadowBlur = glow; g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 4);
    g.shadowBlur = 0; this.tex.needsUpdate = true;
  }
}

/** a pool of soft spheres (smoke, foam, sparks, tears...) with a private material each so the opacity can fade; never inked */
export class Puffs {
  m: THREE.Mesh[] = [];
  constructor(parent: THREE.Object3D, n: number, color: string | THREE.Color, additive = false) {
    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, ...(additive ? { blending: THREE.AdditiveBlending } : {}) });
      const m = new THREE.Mesh(SPH, mat); m.layers.set(NOINK); m.visible = false; m.renderOrder = 2; parent.add(m); this.m.push(m);
    }
  }
  set(i: number, x: number, y: number, z: number, s: number, op: number) {
    const m = this.m[i]; if (op <= 0.01 || s <= 0.001) { m.visible = false; return; }
    m.visible = true; m.position.set(x, y, z); m.scale.setScalar(s); (m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, op);
  }
  hideAll() { this.m.forEach((m) => (m.visible = false)); }
}

/** orient a unit cylinder (along +Y) so it spans a -> b */
export const spanCyl = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number) => {
  const d = new THREE.Vector3().subVectors(b, a), L = Math.max(0.001, d.length());
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.scale.set(r, L, r);
};

// ---------------------------------------------------------------- textures
export const boardsTex = (key: string, cols: string[], line: string) => ctex(key, 512, 512, (g, r) => {
  for (let i = 0; i < 8; i++) {
    g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(0, i * 64, 512, 64);
    g.strokeStyle = "rgba(110,66,30,.28)"; g.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const y = i * 64 + 7 + r() * 50; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(150, y + 3, 350, y - 3, 512, y + (r() - 0.5) * 3); g.stroke(); }
    g.fillStyle = line; g.fillRect(0, i * 64, 512, 3); g.fillRect(r() * 512, i * 64, 3, 64);
  }
});
export const tileTex = (key: string, a: string, b: string, grout: string) => ctex(key, 512, 512, (g) => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * 128, j * 128, 128, 128); }
  g.strokeStyle = grout; g.lineWidth = 6; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
});
export const barkTex = () => ctex("doms_bark", 256, 512, (g, r) => {
  g.fillStyle = "#7a4a26"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 46; i++) { const x = r() * 256, w = 2 + r() * 5; g.fillStyle = r() > 0.5 ? "#5a3318" : "#946034"; g.fillRect(x, 0, w, 512); }
  g.strokeStyle = "rgba(30,15,8,.7)"; g.lineWidth = 3; for (let i = 0; i < 26; i++) { const x = r() * 256, y = r() * 480; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 8, y + 40, x - 8, y + 80, x + 3, y + 130); g.stroke(); }
});
export const fiberTex = (key: string, base: string, dark: string, light: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { const x = r() * 512, w = 3 + r() * 11; g.fillStyle = r() > 0.5 ? dark : light; g.globalAlpha = 0.5; g.fillRect(x, 0, w, 512); }
  g.globalAlpha = 1; g.strokeStyle = dark; g.lineWidth = 3; for (let i = 0; i < 22; i++) { const x = r() * 512; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 14, 160, x - 14, 340, x + 4, 512); g.stroke(); }
});
export const webTex = () => ctex("doms_web", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512); g.strokeStyle = "rgba(225,228,236,.95)"; g.lineWidth = 3.5; g.lineCap = "round";
  const n = 9; g.beginPath(); for (let i = 0; i < n; i++) { const a = (i / (n - 1)) * (Math.PI / 2); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 560, Math.sin(a) * 560); } g.stroke();
  for (let k = 1; k <= 9; k++) { const R = k * 56; g.beginPath(); for (let i = 0; i < n; i++) { const a = (i / (n - 1)) * (Math.PI / 2), x = Math.cos(a) * R * (1 - 0.06 * Math.sin(i * 3 + k)), y = Math.sin(a) * R * (1 - 0.06 * Math.sin(i * 3 + k)); const mx = (i && 1) ? 1 : 0; void mx; if (i) g.quadraticCurveTo(Math.cos(a - 0.1) * R * 0.92, Math.sin(a - 0.1) * R * 0.92, x, y); else g.moveTo(x, y); } g.stroke(); }
});
export const radialTex = (key: string, stops: [number, string][]) => ctex(key, 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
