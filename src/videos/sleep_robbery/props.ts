// Sleep Robbery: shared 3D props and sets (bedroom, phone, sack, window, nightcap furniture). Humans are NEVER built here: only TitoRig3D cards.
import * as THREE from "three";
import { Kit, Puffs, lam, basic, hot, hh, clamp01, smooth, lerp, boardsTex, tileTex, fiberTex, DynText, BOX, CYL, SPH } from "./kit";
import { NOINK } from "../alejandro/ink";
import { ctex, rep } from "../alejandro/paint";

export const memo = new Map<string, THREE.Texture>();
export const repM = (key: string, base: () => THREE.Texture, x: number, y: number) => { let t = memo.get(key); if (!t) { t = rep(base(), x, y); memo.set(key, t); } return t; };

// ---------------------------------------------------------------- the bedroom (scenes 1-6, 15, 16)
export const ROOM = { wallZ: -3.2, winX: 3.6, winY: 2.4, winW: 2.8, winH: 2.6 };
const skyTex = (night: boolean) => ctex(night ? "sleep_sky_night" : "sleep_sky_dawn", 512, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  if (night) { gr.addColorStop(0, "#0b1230"); gr.addColorStop(1, "#1d2c52"); } else { gr.addColorStop(0, "#8fc4ff"); gr.addColorStop(0.6, "#ffd9a0"); gr.addColorStop(1, "#ffb878"); }
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  if (night) { for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.35 + 0.6 * r()})`; const s = 1 + 2.2 * r(); g.fillRect(r() * 512, r() * 190, s, s); } }
  else { const sun = g.createRadialGradient(330, 215, 0, 330, 215, 90); sun.addColorStop(0, "rgba(255,250,220,1)"); sun.addColorStop(0.35, "rgba(255,230,160,.8)"); sun.addColorStop(1, "rgba(255,200,120,0)"); g.fillStyle = sun; g.fillRect(0, 0, 512, 256); }
  g.fillStyle = night ? "#0a1022" : "#d99a6a"; for (let i = 0; i < 14; i++) { const w = 22 + 30 * r(), h = 24 + 50 * r(); g.fillRect(i * 40 + 6 * r(), 256 - h, w, h); }          // far rooftops
});
export type Room = { clock: DynText | null; bedTopY: number };
export const bedroom = (g: THREE.Group, k: Kit, o: { sky: "night" | "dawn"; clock?: string }): Room => {
  const R = ROOM, wl = R.winX - R.winW / 2, wr = R.winX + R.winW / 2, wb = R.winY - R.winH / 2, wt = R.winY + R.winH / 2, zc = R.wallZ - 0.1;
  k.floor(60, repM("sleepFloor", () => boardsTex("sleep_floor", ["#a47a52", "#9a7048", "#b0865a"], "#5a3a20"), 12, 12));
  const wallCol = "#b9a58f";
  k.box(30 + wl, 12, 0.2, (-30 + wl) / 2, 6, zc, wallCol); k.box(30 - wr, 12, 0.2, (30 + wr) / 2, 6, zc, wallCol);
  k.box(wr - wl, wb, 0.2, R.winX, wb / 2, zc, wallCol); k.box(wr - wl, 12 - wt, 0.2, R.winX, wt + (12 - wt) / 2, zc, wallCol);
  k.box(60, 0.18, 0.12, 0, 0.09, R.wallZ + 0.04, "#efe6d8");
  for (let i = -10; i < 6; i++) if (i * 0.9 + 0.3 < wl - 0.3 || i * 0.9 > wr + 0.3) k.box(0.28, 10, 0.02, i * 0.9, 5.2, R.wallZ + 0.01, "#a99580");          // wallpaper stripes
  const art = (key: string, c1: string, c2: string, c3: string) => ctex(key, 128, 160, (gg) => { gg.fillStyle = c1; gg.fillRect(0, 0, 128, 160); gg.fillStyle = c2; gg.beginPath(); gg.moveTo(0, 160); gg.lineTo(50, 60); gg.lineTo(100, 160); gg.fill(); gg.fillStyle = c3; gg.beginPath(); gg.arc(92, 42, 18, 0, 7); gg.fill(); });
  for (const [x, y, w, h, key, a, b2, c] of [[-0.9, 3.2, 1.0, 1.3, "sleep_art1", "#7ab8e8", "#2f5a3a", "#ffd23f"], [0.8, 2.9, 0.75, 0.95, "sleep_art2", "#f0a8b8", "#6a3a7a", "#fff3c0"]] as [number, number, number, number, string, string, string, string][]) {
    k.box(w + 0.14, h + 0.14, 0.06, x, y, R.wallZ + 0.04, "#5a3a22"); const pm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: art(key, a, b2, c) })); pm.position.set(x, y, R.wallZ + 0.08); pm.layers.set(NOINK); g.add(pm); }
  k.box(1.7, 0.08, 0.4, -3.9, 2.7, R.wallZ + 0.25, "#6a4426"); ["#e2453c", "#3a7bd5", "#ffd23f", "#4ae0a0", "#c06aff", "#e2453c", "#ffffff"].forEach((cc, i) => k.box(0.16, 0.5 + 0.1 * (i % 3), 0.28, -4.5 + i * 0.22, 3.0 + 0.05 * (i % 3), R.wallZ + 0.25, cc));
  k.box(3.6, 0.012, 2.0, 0.3, 0.006, 0.9, "#8a3a4a", undefined, false); k.box(3.2, 0.014, 1.6, 0.3, 0.007, 0.9, "#c9707e", undefined, false);        // rug in front of the bed
  k.cyl(0.07, 0.35, -2.95, 1.35, -0.8, "#d9b86a"); k.cyl(0.24, 0.26, -2.95, 1.62, -0.8, "#f0e0b0");                                                 // bedside lamp                                                      // skirting board
  const fr = "#f1ebe0";                                                                                              // window frame + mullions + sill
  k.box(R.winW + 0.2, 0.1, 0.3, R.winX, wt + 0.05, R.wallZ - 0.02, fr); k.box(R.winW + 0.2, 0.1, 0.3, R.winX, wb - 0.0, R.wallZ - 0.02, fr);
  k.box(0.1, R.winH, 0.3, wl - 0.05, R.winY, R.wallZ - 0.02, fr); k.box(0.1, R.winH, 0.3, wr + 0.05, R.winY, R.wallZ - 0.02, fr);
  // OPEN window: two glass-less casement leaves hinged at the jambs and swung 100 degrees OUTSIDE (nothing closed to cross)
  for (const s of [-1, 1]) { const lf = new THREE.Group(), kk = new Kit(lf), hw = R.winW / 2 - 0.05; lf.position.set(R.winX + s * (R.winW / 2), R.winY, R.wallZ - 0.12); lf.rotation.y = -s * (Math.PI / 2 + 0.17);
    kk.box(hw, 0.08, 0.06, -s * hw / 2, R.winH / 2 - 0.05, 0, fr); kk.box(hw, 0.08, 0.06, -s * hw / 2, -R.winH / 2 + 0.05, 0, fr); kk.box(0.08, R.winH - 0.1, 0.06, 0, 0, 0, fr); kk.box(0.08, R.winH - 0.1, 0.06, -s * hw, 0, 0, fr); kk.box(hw, 0.05, 0.05, -s * hw / 2, 0, 0, fr); g.add(lf); }
  k.box(R.winW + 0.5, 0.1, 0.6, R.winX, wb - 0.04, R.wallZ + 0.22, "#efe6d8");
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(44, 22), new THREE.MeshBasicMaterial({ map: skyTex(o.sky === "night"), fog: false })); sky.position.set(R.winX, 5.5, -10); sky.layers.set(NOINK); g.add(sky);
  const cu = o.sky === "night" ? "#4a5a92" : "#e7a36a";                                                              // curtains
  k.box(0.55, R.winH + 0.5, 0.14, wl - 0.45, R.winY + 0.15, R.wallZ + 0.15, cu); k.box(0.55, R.winH + 0.5, 0.14, wr + 0.45, R.winY + 0.15, R.wallZ + 0.15, cu);
  // bed (every face stays BEHIND the card plane of Tito, z < -0.35): frame, mattress, headboard, pillow
  k.box(4.2, 0.5, 2.2, 0.3, 0.25, -1.3, "#7a5030"); k.box(4.0, 0.34, 2.1, 0.3, 0.67, -1.2, "#d9e0f4");
  k.box(0.25, 1.5, 2.4, -1.85, 0.95, -1.3, "#6a4426"); k.box(1.0, 0.22, 0.95, -1.2, 0.95, -1.3, "#ffffff");
  k.box(0.9, 1.0, 0.9, -2.95, 0.5, -0.8, "#8a5a38");                                                               // night stand
  let clock: DynText | null = null;
  if (o.clock) { k.box(0.5, 0.26, 0.2, -2.95, 1.13, -0.8, "#22252e"); clock = new DynText(0.42, 0.18, 256, 112, g); clock.mesh.position.set(-2.95, 1.13, -0.69); clock.set(o.clock, "#ff4a3a", "#16181f", "#16181f", 14); }
  return { clock, bedTopY: 0.84 };
};

/** where Tito's body rests on the bed (pelvis x, card y0, z) — tuned so the back lies ON the mattress and the head on the pillow */
export const BED = { x: -0.1, y: 0.88, z: -0.1 };

// ---------------------------------------------------------------- the phone: body + a glowing screen with a tiny falling-blocks game
export class Phone {
  g = new THREE.Group();
  private cv = document.createElement("canvas"); private cx: CanvasRenderingContext2D; private tex: THREE.CanvasTexture; screen: THREE.Mesh;
  constructor(parent: THREE.Object3D, public w = 0.3, public h = 0.56) {
    this.cv.width = 120; this.cv.height = 224; this.cx = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace;
    const body = new THREE.Mesh(BOX, lam("#15161c")); body.scale.set(w, h, 0.04); body.castShadow = true; this.g.add(body);
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.92), new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.6) }));
    this.screen.position.z = 0.0215; this.screen.layers.set(NOINK); this.g.add(this.screen); parent.add(this.g);
  }
  /** draw the screen for time t (falling coloured blocks); on = 0..1 brightness */
  draw(t: number, on = 1) {
    const c = this.cx; c.fillStyle = "#0e1f55"; c.fillRect(0, 0, 120, 224);
    const cols = ["#ff5a6a", "#ffd23f", "#4ae0a0", "#5ab0ff", "#c06aff"];
    for (let i = 0; i < 7; i++) { const x = (i % 5) * 24, y = ((t * 55 + i * 47) % 260) - 30; c.fillStyle = cols[(i * 3) % 5]; c.fillRect(x + 2, y, 20, 20); c.strokeStyle = "#0a0f2a"; c.lineWidth = 3; c.strokeRect(x + 2, y, 20, 20); }
    c.fillStyle = "#ffffff"; c.font = "bold 22px Arial"; c.fillText(String(1200 + Math.floor(t * 40) * 10), 8, 24);
    c.fillStyle = `rgba(0,0,0,${1 - on})`; c.fillRect(0, 0, 120, 224); this.tex.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- the stolen sack: a burlap bag shaped like a flexed bicep (upper arm + bulging peak + forearm + fist), tied with a rope at the shoulder end
export const makeSack = (parent: THREE.Object3D) => {
  const g = new THREE.Group(), k = new Kit(g), tex = fiberTex("sleep_burlap", "#c9a566", "#9a7a44", "#e0c58c");
  const b = "#ffffff";
  const upper = new THREE.Mesh(CYL, lam(b, tex)); upper.scale.set(0.2, 0.95, 0.2); upper.rotation.z = Math.PI / 2; upper.castShadow = true; g.add(upper);                       // upper arm along x
  const peak = new THREE.Mesh(SPH, lam(b, tex)); peak.scale.set(0.4, 0.34, 0.27); peak.position.set(0.0, 0.17, 0); peak.castShadow = true; g.add(peak);                      // bicep peak
  const elbow = new THREE.Mesh(SPH, lam(b, tex)); elbow.scale.set(0.23, 0.23, 0.22); elbow.position.set(0.5, -0.02, 0); g.add(elbow);
  const fore = new THREE.Mesh(CYL, lam(b, tex)); fore.scale.set(0.17, 0.66, 0.17); fore.position.set(0.66, 0.26, 0); fore.rotation.z = -0.55; fore.castShadow = true; g.add(fore);   // forearm up and out
  const fist = new THREE.Mesh(SPH, lam(b, tex)); fist.scale.set(0.24, 0.23, 0.21); fist.position.set(0.84, 0.64, 0); fist.castShadow = true; g.add(fist);
  const neck = new THREE.Mesh(CYL, lam(b, tex)); neck.scale.set(0.09, 0.22, 0.09); neck.position.set(-0.58, 0.02, 0); neck.rotation.z = Math.PI / 2; g.add(neck);                     // gathered neck
  k.cyl(0.115, 0.07, -0.64, 0.02, 0, "#6a4a22", { rz: Math.PI / 2 });                                                                                                                  // rope tie
  k.sph(0.09, 0.1, 0.09, -0.72, 0.02, 0, "#9a7a44");                                                                                                                                   // knot / bag mouth
  for (const [x, y] of [[-0.1, 0.38], [0.15, 0.36]]) k.sph(0.05, 0.03, 0.03, x, y, 0.2, "#7a5a2c");                                                                                    // patch stitches
  parent.add(g); return g;
};

// ---------------------------------------------------------------- misc props shared by several scenes
export const sparkTex = () => ctex("sleep_dot", 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
export const zzz = (parent: THREE.Object3D, n = 3) => {
  const out: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) { const m = new Kit(parent).label("Z", 0.5 + 0.1 * i, 0.5 + 0.1 * i, 0, 0, 0, null, "#cfe0ff"); out.push(m); }
  return out;
};
export { Kit, Puffs, lam, basic, hot, hh, clamp01, smooth, lerp, tileTex, DynText, BOX, CYL, SPH };
