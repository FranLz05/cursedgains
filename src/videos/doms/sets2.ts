// DOMS short, micro-scenes 9-16 (16 = the split screen: builder 15 = left pane, builder 16 = right pane). See world.ts / sets1.ts.
import * as THREE from "three";
import { Kit, DynText, Puffs, lam, basic, hot, hh, clamp01, smooth, easeOut, easeIn, easeIO, lerp, spring, boardsTex, tileTex, radialTex, webTex, fiberTex, labelTex, BOX, CYL, SPH } from "./kit";
import { Builder, Env } from "./world";
import { NOINK } from "../alejandro/ink";
import { ctex, rep, brick } from "../alejandro/paint";
import { ENVS, gymSet } from "./sets1";
import { wordF, sceneStart, FPS } from "./story";
import TL from "./timeline.json";

const memo = new Map<string, THREE.Texture>();
const repM = (key: string, base: () => THREE.Texture, x: number, y: number) => { let t = memo.get(key); if (!t) { t = rep(base(), x, y); memo.set(key, t); } return t; };
export const ENVS2: Record<string, Env> = {
  heaven: { lit: [1.5, 1.1, 0.6], shade: [0.1, 0.13, 0.22], lift: [0.02, 0.03, 0.07], bg: "#0a0f1e", fog: ["#0a0f1e", 10, 40], sun: [0, 12, 3], sunCol: "#FFB84D", sunI: 3.0, tint: [0.9, 0.9, 0.98], lamp: [0, 1.2, -1.2] },
  bed: { lit: [1.5, 1.05, 0.55], shade: [0.1, 0.13, 0.22], lift: [0.02, 0.03, 0.07], bg: "#0f1428", fog: ["#0f1428", 14, 40], sun: [4, 8, 6], sunCol: "#FFB84D", sunI: 2.6, tint: [0.9, 0.9, 0.98], lamp: [-1.5, 1.2, -1.6] },
  bath: { lit: [1.3, 1.18, 1.02], shade: [0.8, 0.76, 0.72], lift: [0.06, 0.06, 0.06], bg: "#c8d6d6", sun: [-3, 10, 6], sunCol: "#ffe6c4" },
  pain: { lit: [1.3, 0.62, 0.56], shade: [0.34, 0.1, 0.16], lift: [0.06, 0.02, 0.05], bg: "#4a0c14", fog: ["#4a0c14", 10, 40], sun: [-3, 9, 6], sunCol: "#ffc0b0", tint: [1.05, 0.85, 0.85] },
  win: { lit: [0.82, 1.3, 0.82], shade: [0.2, 0.34, 0.26], lift: [0.03, 0.07, 0.04], bg: "#0e3a1c", fog: ["#0e3a1c", 10, 40], sun: [-3, 9, 6], sunCol: "#e8ffd0", tint: [0.92, 1.05, 0.92] },
  meterRed: { lit: [1.2, 0.72, 0.62], shade: [0.3, 0.14, 0.18], lift: [0.05, 0.02, 0.05], bg: "#2a0a10", fog: ["#2a0a10", 8, 30], sun: [-3, 9, 6], sunCol: "#ffd0c0" },
  meterBlue: { lit: [0.72, 0.9, 1.25], shade: [0.14, 0.2, 0.36], lift: [0.03, 0.05, 0.12], bg: "#0a1226", fog: ["#0a1226", 8, 30], sun: [-3, 9, 6], sunCol: "#c0d8ff", tint: [0.85, 0.92, 1.05] },
};
const T = (e: Env) => e.tint;
const dumbbell = (k: Kit, r: number, len: number, col = "#16161c") => { k.cyl(0.045, len, 0, 0, 0, "#9aa0aa", { rz: Math.PI / 2 }); for (const s of [-1, 1]) { k.cyl(r, 0.2, s * len * 0.38, 0, 0, col, { rz: Math.PI / 2 }); k.cyl(r * 0.78, 0.14, s * len * 0.38 + s * 0.17, 0, 0, "#2a2a34", { rz: Math.PI / 2 }); k.cyl(r * 0.5, 0.06, s * len * 0.38 + s * 0.27, 0, 0, "#6a6f7a", { rz: Math.PI / 2 }); } };

// ================================================================ 9 (0:22-0:25) balancing on a giant blue yoga ball with a toaster on the head
const ballTex = () => ctex("doms_ball", 512, 256, (g) => { g.fillStyle = "#2f6fe0"; g.fillRect(0, 0, 512, 256); g.fillStyle = "#4a88f2"; for (let i = 0; i < 8; i++) g.fillRect(i * 64 + 10, 0, 14, 256); g.fillStyle = "#1c4fb0"; for (let i = 0; i < 8; i++) g.fillRect(i * 64 + 40, 0, 6, 256); g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.ellipse(120, 70, 50, 26, -0.5, 0, 7); g.fill(); });
export const S9: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.gym;
  gymSet(k);
  const ball = new THREE.Mesh(SPH, lam("#ffffff", ballTex())); ball.scale.setScalar(0.8); ball.castShadow = true; ball.receiveShadow = true; g.add(ball);
  const rig = w.rig("tito"), piv = new THREE.Group(); g.add(piv);
  const toast = new THREE.Group(); g.add(toast); const tk = new Kit(toast);
  tk.box(0.66, 0.32, 0.4, 0, 0, 0, "#c9d0d8"); tk.box(0.7, 0.05, 0.44, 0, -0.17, 0, "#2a2d36"); tk.box(0.1, 0.12, 0.3, 0.38, 0.0, 0, "#2a2d36"); tk.box(0.62, 0.03, 0.36, 0, 0.165, 0, "#e8edf2");
  for (const sx of [-1, 1]) { tk.box(0.2, 0.02, 0.06, sx * 0.16, 0.185, 0, "#15161c"); tk.sph(0.02, 0.05, 0.02, sx * 0.34, -0.02, 0.2, "#e8edf2"); }
  const slices = [-0.16, 0.16].map((x) => tk.box(0.17, 0.2, 0.04, x, 0.17, 0, "#d6a45c"));
  const smoke = new Puffs(g, 10, "#707078");
  const bells = [0, 1].map(() => { const grp = new THREE.Group(); g.add(grp); const bk = new Kit(grp); bk.sph(0.19, 0.17, 0.19, 0, -0.1, 0, "#1a1a20"); const h = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16, Math.PI), lam("#1a1a20")); h.position.y = 0.04; grp.add(h); return grp; });
  const hl = new THREE.Vector3();
  const hp = new THREE.Vector3(), P = new THREE.Vector3();
  return {
    g, env, cInf: 8,
    focus: (o) => o.set(0, 2.4, 0),
    update(c) {
      const sway = 0.2 * Math.sin(c.t * 4.6) + 0.12 * Math.sin(c.t * 9.7 + 1) + 0.06 * Math.sin(c.t * 17), bx = 0.45 * Math.sin(c.t * 2.3);
      ball.position.set(bx, 0.8, 0); ball.rotation.z = -bx / 0.8; ball.rotation.y = c.t * 0.5;
      P.set(bx, 1.6, 0); piv.position.copy(P); piv.rotation.z = sway; piv.userData.off = [-P.x, -P.y, -P.z];
      w.put(rig, piv, { action: "idle", t: c.t * 1.8, expression: "shocked", mouthOpen: 0.4 + 0.6 * c.mouth, sweat: 1, position: [bx, 1.6, 0], yaw: 0.15 }, c.cam, tintOf(env));
      w.wa(rig, "head", hp);
      (["handL", "handR"] as const).forEach((n, i) => { w.wa(rig, n, hl); bells[i].position.set(hl.x, hl.y - 0.02, hl.z + 0.05); bells[i].rotation.z = sway * 0.5; });
      toast.position.set(hp.x - Math.sin(sway) * 0.0, hp.y + 0.6, hp.z + 0.02); toast.rotation.z = sway * 0.9 + 0.05 * Math.sin(c.t * 7);
      const u = (c.t % 0.95) / 0.95, h = u < 0.1 ? easeOut(u / 0.1) : u < 0.55 ? 1 : 1 - easeIO((u - 0.55) / 0.4);
      slices.forEach((s, i) => { s.position.y = 0.17 + 0.2 * h * (i ? 1 : 0.85); s.rotation.z = 0.12 * (i ? -1 : 1) * h * Math.sin(c.t * 9); });
      for (let j = 0; j < 5; j++) { const age = (c.t * 0.9 + j / 5) % 1; smoke.set(j, toast.position.x + (hh(j, 1) - 0.5) * 0.3, toast.position.y + 0.3 + 0.8 * age, toast.position.z, 0.05 + 0.14 * age, 0.5 * (1 - age) * (h > 0.1 ? 1 : 0.3)); }
    },
  };
};
function tintOf(e: Env) { return e.tint; }

// ================================================================ 10 (0:25-0:27) the CIRCUS EXERCISES anvil
export const S10: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.gym;
  gymSet(k);
  const anvil = new THREE.Group(); g.add(anvil); const ak = new Kit(anvil);
  ak.box(1.7, 0.4, 1.0, 0, 0.2, 0, "#1b1b22"); ak.box(0.9, 0.5, 0.7, 0, 0.62, 0, "#22222a"); ak.box(2.0, 0.5, 1.0, 0, 1.12, 0, "#2a2a34"); ak.box(2.04, 0.08, 1.04, 0, 1.39, 0, "#4a4b5a");
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 4), lam("#2a2a34")); horn.rotation.z = Math.PI / 2; horn.position.set(-1.55, 1.15, 0); horn.scale.set(1, 1, 1.8); anvil.add(horn);
  ak.box(0.3, 0.2, 0.9, 1.05, 1.1, 0, "#2a2a34");
  const lab = ak.label("CIRCUS\nEXERCISES", 1.9, 0.62, 0, 1.12, 0.54, null, "#ffd23f");
  const rig = w.rig("tito"), piv = new THREE.Group(); g.add(piv);
  const dust = new Puffs(g, 16, hot("#fff0d8", 1.2), true), stars = new Puffs(g, 5, hot("#ffe14a", 2.6), true), ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.92, 40), new THREE.MeshBasicMaterial({ color: hot("#fff6dd", 1.4), transparent: true, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.layers.set(NOINK); g.add(ring);
  const T1 = Math.max(0.9, (wordF("circus") - sceneStart(9)) / FPS + 0.2), END = 0.8;
  return {
    g, env, cInf: 8,
    shake: (t) => (t > T1 && t < T1 + 0.5 ? 0.035 * Math.exp(-(t - T1) * 7) * Math.sin((t - T1) * 38) : 0),
    focus: (o) => o.set(0, 1.4, 0),
    update(c) {
      const dt = c.t - T1, fall = clamp01((c.t - 0.3) / (T1 - 0.3));
      const ay = c.t < T1 - 0.55 ? 14 : c.t < T1 ? END + 13 * (1 - fall * fall) : END + 0.12 * Math.exp(-dt * 6) * Math.abs(Math.cos(dt * 26));
      anvil.position.set(0.0, ay, 0.0); anvil.rotation.z = c.t < T1 ? 0.04 * Math.sin(c.t * 9) : 0.05 * Math.exp(-dt * 5) * Math.sin(dt * 30);
      const sy = c.t < T1 ? 1 : 0.46 + 0.16 * Math.exp(-dt * 7) * Math.cos(dt * 24), sx = c.t < T1 ? 1 : 1.0 + 0.5 * (1 - sy) / 0.54;
      piv.scale.set(sx, sy, 1);
      w.put(rig, piv, { action: "idle", t: c.t, expression: c.t < T1 ? "shocked" : "exhausted", mouthOpen: c.t < T1 ? 0.8 : 0.4 + 0.6 * c.mouth, sweat: 1, position: [0, 0, 0.1], yaw: 0 }, c.cam, tintOf(env));
      anvil.visible = true; lab.visible = true;
      const a = clamp01(dt / 0.55);
      for (let j = 0; j < 10; j++) { const an = j * 0.63; dust.set(j, Math.cos(an) * (0.9 + 1.6 * a), 0.1 + 0.2 * a, 0.2 + Math.sin(an) * 0.7 * a, 0.14 + 0.32 * a, dt > 0 ? (1 - a) * 0.85 : 0); }
      ring.position.set(0, 0.06, 0.2); ring.scale.set(0.3 + 3.2 * a, 0.3 + 3.2 * a, 1); (ring.material as THREE.MeshBasicMaterial).opacity = dt > 0 ? (1 - a) * 0.8 : 0;
      for (let j = 0; j < 5; j++) { const an = c.t * 6 + j * 1.256; stars.set(j, 1.5 * Math.cos(an), 1.8 + 0.12 * Math.sin(an * 2), 0.6 * Math.sin(an) + 0.4, 0.08, dt > 0.15 ? 1 : 0); }
    },
  };
};

// ================================================================ meters (11: SORENESS, 12: MUSCLE GROWTH)
const mkMeter = (parent: THREE.Object3D, o: { liquid: string; label: string; labelBg: string; labelFg: string }) => {
  const grp = new THREE.Group(); parent.add(grp); const k = new Kit(grp);
  k.box(2.2, 0.75, 1.2, 0, 0.375, 0, "#2a2d38"); k.box(2.3, 0.1, 1.3, 0, 0.78, 0, "#4a4f5c");
  const lab = k.label(o.label, 2.0, o.label.includes("\n") ? 0.66 : 0.5, 0, 0.38, 0.62, o.labelBg, o.labelFg);
  k.cyl(0.62, 0.14, 0, 0.88, 0, "#4a4f5c");
  const liquid = new THREE.Mesh(CYL, basic(hot(o.liquid, 1.5))); liquid.layers.set(NOINK); grp.add(liquid);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 3.1, 28, 1, true), new THREE.MeshLambertMaterial({ color: "#bfe6ff", transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })); glass.position.y = 2.5; glass.layers.set(NOINK); grp.add(glass);
  const cap = k.cyl(0.62, 0.14, 0, 4.12, 0, "#4a4f5c");
  for (let i = 0; i <= 10; i++) k.box(i % 5 === 0 ? 0.34 : 0.2, 0.04, 0.05, 0.78 + (i % 5 === 0 ? 0.08 : 0), 0.95 + i * 0.3, 0.35, "#e8edf2");
  const disp = new DynText(2.0, 0.78, 512, 200, grp); disp.mesh.position.set(0, 4.88, 0.2); disp.mesh.visible = !o.label.includes("GROWTH");
  k.box(2.2, 1.0, 0.3, 0, 4.88, -0.12, "#1a1c24");
  return { grp, k, liquid, glass, cap, lab, disp, setFill: (v: number) => { const h = Math.max(0.001, 3.0 * clamp01(v)); liquid.scale.set(0.46, h, 0.46); liquid.position.y = 1.0 + h / 2; liquid.visible = v > 0.002; } };
};
export const S11: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.gym;
  gymSet(k, null);
  const m = mkMeter(g, { liquid: "#ff2a2a", label: "SORENESS", labelBg: "#3a0a10", labelFg: "#ff4a4a" });
  const sparks = new Puffs(g, 46, hot("#ffd24a", 3), true), smoke = new Puffs(g, 14, "#2a2428"), drops = new Puffs(g, 16, hot("#ff2a2a", 1.5));
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radialTex("doms_flash2", [[0, "rgba(255,255,255,1)"], [0.4, "rgba(255,230,140,.8)"], [1, "rgba(255,140,40,0)"]]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); flash.layers.set(NOINK); flash.renderOrder = 8; flash.position.set(0, 3.0, 0.9); g.add(flash);
  const shards = Array.from({ length: 14 }, (_, i) => { const s = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: "#bfe6ff", transparent: true, opacity: 0.55 })); s.scale.set(0.12 + 0.16 * hh(i, 1), 0.2 + 0.3 * hh(i, 2), 0.02); s.layers.set(NOINK); g.add(s); return s; });
  const TE = 1.15;
  return {
    g, env, cInf: 8,
    shake: (t) => (t > TE && t < TE + 0.45 ? 0.04 * Math.exp(-(t - TE) * 6) * Math.sin((t - TE) * 40) : 0),
    focus: (o) => o.set(0, 2.6, 0),
    update(c) {
      const u = clamp01(c.t / TE), boom = c.t >= TE, dt = c.t - TE;
      const v = boom ? 1 : Math.pow(u, 2.2) * 1.0;
      const num = boom ? "999%" : `${Math.min(998, Math.floor(999 * Math.pow(u, 3)))}%`;
      m.setFill(boom ? 0 : v); m.glass.visible = !boom; m.cap.visible = !boom;
      m.disp.set(num, boom ? (Math.floor(c.t * 14) % 2 ? "#ffffff" : "#ff3a3a") : u > 0.7 ? "#ff3a3a" : "#ffd24a");
      const sh = boom ? 0 : 0.012 * u * u * 8 * Math.sin(c.t * 70); m.grp.position.x = sh; m.grp.rotation.z = boom ? 0.05 * Math.exp(-dt * 4) * Math.sin(dt * 30) : sh * 0.4;
      flash.visible = boom && dt < 0.35; flash.scale.setScalar(1.5 + 9 * clamp01(dt * 5)); (flash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - dt * 3.2);
      for (let j = 0; j < 46; j++) { const an = hh(j, 1) * 6.283, el = (hh(j, 2) - 0.3) * 2.2, sp = 2 + 5 * hh(j, 3), a = dt; sparks.set(j, 0 + Math.cos(an) * sp * a * 0.7, 3.2 + Math.sin(el) * sp * a - 5 * a * a, Math.sin(an) * sp * a * 0.6 + 0.4, 0.045 * (1 - clamp01(a / 1.0)) + 0.01, boom && a < 1 ? 1 - a : 0); }
      for (let j = 0; j < 14; j++) { const an = hh(j, 4) * 6.283, a = dt, sp = 1.5 + 2.5 * hh(j, 5); smoke.set(j, Math.cos(an) * sp * a * 0.5, 3.4 + 1.2 * a + (hh(j, 6) - 0.5), 0.5 + Math.sin(an) * 0.5 * a, 0.2 + 0.7 * a, boom ? 0.7 * (1 - clamp01(a / 1.6)) : 0); }
      for (let j = 0; j < 16; j++) { const an = hh(j, 7) * 6.283, a = dt, sp = 1 + 3 * hh(j, 8); drops.set(j, Math.cos(an) * sp * a * 0.6, 3 + sp * a * 0.9 - 5.5 * a * a, 0.5 + Math.sin(an) * 0.4 * a, 0.07, boom && a < 1.0 ? 1 : 0); }
      shards.forEach((s, i) => { const an = hh(i, 9) * 6.283, a = dt, sp = 2 + 3 * hh(i, 10); s.visible = boom && a < 1.1; s.position.set(Math.cos(an) * 0.5 + Math.cos(an) * sp * a * 0.6, 2.5 + (hh(i, 11) - 0.5) * 2 + sp * a * 0.5 - 4.5 * a * a, 0.5 + Math.sin(an) * sp * 0.4 * a); s.rotation.set(a * 5 * hh(i, 12), a * 4, a * 6); });
    },
  };
};
export const S12: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.gym;
  gymSet(k, null);
  const m = mkMeter(g, { liquid: "#2a8aff", label: "MUSCLE\nGROWTH", labelBg: "#0a1c3a", labelFg: "#5ab8ff" });
  m.setFill(0); m.disp.set("0.0%", "#5ab8ff");
  const webM = new THREE.MeshBasicMaterial({ map: webTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const webs: THREE.Mesh[] = [];
  const addWeb = (x: number, y: number, z: number, s: number, fx: number, fy: number) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), webM); p.position.set(x, y, z); p.scale.set(fx, fy, 1); p.layers.set(NOINK); p.renderOrder = 4; g.add(p); webs.push(p); };
  addWeb(-1.1, 5.3, 0.4, 1.0, 1, -1); addWeb(1.1, 5.3, 0.4, 1.0, -1, -1); addWeb(-1.15, 0.8, 0.66, 1.0, 1, 1); addWeb(1.15, 0.8, 0.66, 1.0, -1, 1);
  const big = new DynText(1.5, 0.9, 512, 300, g); big.mesh.position.set(0, 2.5, 0.75); big.set("0.0%", "#7ad0ff", "rgba(8,16,34,.72)", "#5ab8ff", 30);
  const spider = new THREE.Group(); g.add(spider); const sk = new Kit(spider);
  sk.sph(0.14, 0.12, 0.14, 0, 0, 0, "#1a1a20"); sk.sph(0.09, 0.08, 0.09, 0, 0.1, 0.1, "#2a2a30");
  for (let i = 0; i < 8; i++) { const s = i < 4 ? -1 : 1, q = i % 4; sk.cyl(0.012, 0.34, s * 0.2, 0.04 * (q - 1.5), 0.0, "#1a1a20", { rz: s * (0.9 + 0.1 * q), rx: 0.2 * (q - 1.5) }); }
  const thread = new THREE.Mesh(CYL, basic("#e8e8f0")); thread.layers.set(NOINK); g.add(thread);
  const dust = new Puffs(g, 14, "#cfd4e0");
  return {
    g, env, cInf: 8,
    focus: (o) => o.set(0, 2.7, 0),
    update(c) {
      const sy = 4.7 - 1.0 * (0.5 + 0.5 * Math.sin(c.t * 1.9)) - 0.5 * easeOut(c.t / 0.8) * 0; spider.position.set(0.55 + 0.04 * Math.sin(c.t * 3), sy, 0.9); spider.rotation.z = 0.12 * Math.sin(c.t * 2.2);
      thread.scale.set(0.007, 5.4 - sy, 0.007); thread.position.set(spider.position.x, (5.4 + sy) / 2, 0.9);
      m.disp.set("0.0%", "#5ab8ff");
      webs.forEach((p, i) => { p.rotation.z = 0.02 * Math.sin(c.t * 1.6 + i); });
      for (let j = 0; j < 14; j++) { const age = (c.t * 0.12 + j / 14) % 1; dust.set(j, (hh(j, 1) - 0.5) * 6, 0.4 + 5 * age, (hh(j, 2) - 0.3) * 3, 0.025, 0.5 * Math.sin(Math.PI * age)); }
    },
  };
};

// ================================================================ 13 (0:32-0:35) the golden barbell under a heavenly spotlight; the plates climb to 85 KG
export const S13: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS2.heaven;
  k.floor(70, repM("heavFloor", () => boardsTex("doms_heav", ["#17192a", "#1b1e32", "#14162a"], "#0a0b16"), 12, 12));
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: radialTex("doms_pool", [[0, "rgba(255,236,170,.9)"], [0.6, "rgba(255,220,140,.35)"], [1, "rgba(255,220,140,0)"]]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pool.position.set(0, 0.03, -0.5); pool.layers.set(NOINK); g.add(pool);
  const bar = new THREE.Group(); g.add(bar); const bk = new Kit(bar);
  const GOLD = "#e8b83c", GOLD2 = "#fff0a0";
  bk.cyl(0.04, 2.6, 0, 0, 0, GOLD2, { rz: Math.PI / 2 });
  for (const s of [-1, 1]) { bk.cyl(0.06, 0.5, s * 1.1, 0, 0, GOLD, { rz: Math.PI / 2 }); bk.cyl(0.075, 0.06, s * 0.88, 0, 0, "#c9922a", { rz: Math.PI / 2 }); bk.cyl(0.075, 0.06, s * 1.34, 0, 0, "#c9922a", { rz: Math.PI / 2 }); }
  const PL = [{ r: 0.52, t: 0.5, kg: 20 }, { r: 0.46, t: 0.9, kg: 45 }, { r: 0.4, t: 1.3, kg: 65 }, { r: 0.34, t: 1.7, kg: 75 }, { r: 0.28, t: 2.1, kg: 85 }];
  const plates = PL.flatMap((p, i) => [-1, 1].map((s) => { const grp = new THREE.Group(); bar.add(grp); const gk = new Kit(grp); gk.cyl(p.r, 0.1, 0, 0, 0, i % 2 ? GOLD : "#f5c94a", { rz: Math.PI / 2 }); gk.cyl(p.r * 0.45, 0.115, 0, 0, 0, "#8a6418", { rz: Math.PI / 2 }); return { grp, s, i, x: s * (0.62 + 0.115 * i), t0: p.t }; }));
  const counter = new DynText(2.2, 0.86, 512, 200, g); counter.mesh.position.set(0, 1.0, 0.8);
  const sparks = new Puffs(g, 30, hot("#fff0a0", 3), true), clouds = new Puffs(g, 16, hot("#8890b8", 1));
  return {
    g, env, cInf: 8,
    focus: (o) => o.set(0, 2.6, 0),
    update(c) {
      bar.position.set(0, 2.7 + 0.1 * Math.sin(c.t * 1.8), 0); bar.rotation.y = 0; bar.rotation.z = 0.0;
      let kg = 0;
      plates.forEach((p) => { const u = easeOut((c.t - p.t0) / 0.28); p.grp.visible = c.t >= p.t0 - 0.001; p.grp.position.x = p.x + p.s * (1 - u) * 2.6; if (c.t >= p.t0 + 0.2) kg = Math.max(kg, PL[p.i].kg); });
      const tn = c.t, shown = kg ? kg : 0;
      counter.set(`${shown || 20} KG`.replace(/^/, ""), "#ffe066", "rgba(10,10,20,.78)", "#ffe066", 26, false);
      const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(c.cam.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(c.cam.quaternion);
      counter.mesh.position.copy(c.cam.position).addScaledVector(fw, 5.5).addScaledVector(up, -1.45); counter.mesh.quaternion.copy(c.cam.quaternion); counter.mesh.scale.setScalar(0.62 * (1 + 0.12 * Math.max(0, 1 - ((tn - 0.5) % 0.4) / 0.2) * (shown ? 1 : 0)));
      for (let j = 0; j < 30; j++) { const age = (c.t * 0.35 + hh(j, 1)) % 1; sparks.set(j, (hh(j, 2) - 0.5) * 4.6, 0.3 + 5 * age, (hh(j, 3) - 0.5) * 2.4 - 0.4, 0.03 + 0.03 * hh(j, 4), Math.sin(Math.PI * age)); }
      for (let j = 0; j < 16; j++) { const a = j * 0.8 + c.t * 0.1; clouds.set(j, Math.cos(a) * (2.8 + 0.6 * hh(j, 1)), 0.2 + 0.1 * hh(j, 2), Math.sin(a) * 2.2 - 0.5, 0.7 + 0.5 * hh(j, 3), 0.35); }
    },
  };
};

// ================================================================ 14 (0:35-0:38) crying in pyjamas while five red alarm clocks ring
const faceTex = () => ctex("doms_clockface", 128, 128, (g) => { g.fillStyle = "#fff"; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = "#111114"; g.stroke(); g.lineWidth = 4; for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; g.beginPath(); g.moveTo(64 + 46 * Math.cos(a), 64 + 46 * Math.sin(a)); g.lineTo(64 + 54 * Math.cos(a), 64 + 54 * Math.sin(a)); g.stroke(); } g.lineWidth = 7; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 28); g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(88, 74); g.stroke(); });
const mkClock = (parent: THREE.Object3D) => {
  const grp = new THREE.Group(); parent.add(grp); const k = new Kit(grp);
  k.sph(0.34, 0.34, 0.2, 0, 0, 0, "#d9262c"); k.sph(0.24, 0.24, 0.05, 0, 0, 0.17, "#f4f0e6");
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.235, 24), new THREE.MeshBasicMaterial({ map: faceTex() })); face.position.z = 0.226; face.layers.set(NOINK); grp.add(face);
  for (const s of [-1, 1]) { k.sph(0.12, 0.1, 0.06, s * 0.22, 0.31, 0, "#e8c34a"); k.cyl(0.015, 0.12, s * 0.12, 0.34, 0, "#555a66", { rz: -s * 0.5 }); k.cyl(0.03, 0.1, s * 0.2, -0.34, 0, "#2a2a30"); }
  k.cyl(0.015, 0.26, 0, 0.42, 0, "#2a2a30"); k.sph(0.05, 0.05, 0.04, 0, 0.52, 0, "#e8c34a");
  const waves = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.93, 0.955, 32), new THREE.MeshBasicMaterial({ color: hot("#ffd2a0", 1.1), transparent: true, depthWrite: false, side: THREE.DoubleSide })); m.layers.set(NOINK); grp.add(m); return m; });
  return { grp, waves };
};
export const S14: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS2.bed;
  k.floor(60, repM("bedFloor", () => boardsTex("doms_bedfloor", ["#a47a52", "#9a7048", "#b0865a"], "#5a3a20"), 12, 12));
  k.plane(60, 12, 0, 6, -3.2, lam("#8a6ea8", repM("bedwall", () => ctex("doms_bedwall", 256, 256, (c) => { c.fillStyle = "#8a6ea8"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#9a7eb8"; for (let i = 0; i < 8; i++) c.fillRect(i * 32, 0, 14, 256); }), 24, 4)));
  k.glow(1.9, 2.4, 0.1, 3.4, 3.2, -3.1, hot("#ffb060", 1.5)); k.box(2.1, 0.12, 0.2, 3.4, 4.45, -3.05, "#e8e0d0"); k.box(0.1, 2.5, 0.2, 3.4, 3.2, -3.05, "#e8e0d0"); k.box(2.1, 0.12, 0.2, 3.4, 1.95, -3.05, "#e8e0d0");
  k.box(4.2, 0.5, 2.3, 0.3, 0.25, -1.45, "#7a5030"); k.box(4.0, 0.34, 2.1, 0.3, 0.67, -1.45, "#e8e4f4");
  k.box(0.25, 1.5, 2.4, -1.85, 0.95, -1.45, "#6a4426"); k.box(1.0, 0.24, 0.95, -1.15, 0.96, -1.05, "#ffffff");
  k.box(0.9, 1.0, 0.9, -2.95, 0.5, -0.8, "#8a5a38");
  const clocks = [[-2.95, 1.55, -0.7, 1.0], [-1.85, 2.0, -0.5, 0.9], [3.0, 1.55, -1.0, 1.0], [-0.4, 0.58, 0.9, 0.8], [2.3, 1.45, 0.2, 0.85]].map(([x, y, z, s]) => ({ ...mkClock(g), x, y, z, s }));
  const rig = w.rig("tito");
  const tears = new Puffs(g, 30, hot("#9ad8ff", 1.4));
  const hp = new THREE.Vector3();
  return {
    g, env, cInf: 8,
    focus: (o) => o.set(0, 1.4, 0),
    update(c) {
      const sob = Math.sin(c.t * 24) * 0.012 + Math.sin(c.t * 11) * 0.01;
      w.put(rig, g, { action: "fall", t: 2.2, expression: "exhausted", mouthOpen: 0.7 + 0.3 * Math.sin(c.t * 15), sweat: 1, position: [-0.1, 0.9 + sob, -0.1], yaw: Math.PI / 2, outfit: { shirt: "#7fa6ff" } }, c.cam, tintOf(env));
      w.wa(rig, "head", hp);
      clocks.forEach((cl, i) => {
        cl.grp.position.set(cl.x + 0.012 * Math.sin(c.t * 70 + i), cl.y + 0.012 * Math.sin(c.t * 83 + i), cl.z); cl.grp.scale.setScalar(cl.s * 1.25); cl.grp.rotation.z = 0.1 * Math.sin(c.t * 64 + i * 2);
        cl.waves.forEach((wv, j) => { const age = (c.t * 2.2 + j / 3 + i * 0.17) % 1; wv.scale.setScalar(0.5 + 1.0 * age); wv.position.z = 0.1; (wv.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - age); wv.rotation.z = j; });
      });
      for (let j = 0; j < 30; j++) { const s = j % 2 ? 1 : -1, age = (c.t * 2.4 + j / 15) % 1, seed = Math.floor(c.t * 2.4 + j / 15) * 17 + j;
        tears.set(j, hp.x + 0.12 + s * 0.12 + s * (0.5 + hh(seed, 1)) * age * 0.9, hp.y + 0.22 - 0.0 * age + 1.0 * age - 3.8 * age * age + 0.3 * age, hp.z + 0.3 + (hh(seed, 2) - 0.5) * 0.2, 0.05 + 0.02 * hh(seed, 3), 1 - age * age); }
    },
  };
};

// ================================================================ 15 (0:38-0:41) the toilet is a bottomless abyss; the RECOVERY battery drains
export const S15: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS2.bath;
  // tiled floor with a round hole under the bowl: the rings below it fake an infinite depth
  const shape = new THREE.Shape(); shape.moveTo(-30, -30); shape.lineTo(30, -30); shape.lineTo(30, 30); shape.lineTo(-30, 30); shape.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.4, 0, Math.PI * 2, true); shape.holes.push(hole);
  const tile = repM("bathTile", () => tileTex("doms_tile", "#e8f2f2", "#cfe3e6", "#8fb0b6"), 8, 8); tile.repeat.set(0.35, 0.35); tile.needsUpdate = true;
  const fl = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), lam("#ffffff", tile)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  k.plane(60, 12, 0, 6, -2.2, lam("#ffffff", repM("bathWall", () => tileTex("doms_tile", "#e8f2f2", "#cfe3e6", "#8fb0b6"), 14, 6)));
  const ringsMat = (i: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color("#2a4458").multiplyScalar(Math.max(0.01, 0.6 * Math.pow(0.85, i))) });
  for (let i = 0; i < 40; i++) { const d = 0.3 * i * (1 + 0.12 * i), r = 0.38 * Math.pow(0.93, i); const m = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.004, r), Math.max(0.004, 0.012 * (1 - i / 50)), 6, 28), ringsMat(i)); m.rotation.x = Math.PI / 2; m.position.y = -0.1 - d; m.layers.set(NOINK); g.add(m); }
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.405, 90, 28, 1, true), new THREE.MeshBasicMaterial({ color: "#000000", side: THREE.BackSide })); pit.position.y = -45; pit.layers.set(NOINK); g.add(pit);
  const decal = new THREE.Mesh(new THREE.CircleGeometry(0.38, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ctex("doms_abyss", 256, 256, (c) => { c.fillStyle = "#000"; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 14; i++) { const r = 120 * Math.pow(0.8, i); c.beginPath(); c.arc(128, 128, r, 0, 7); c.lineWidth = 3 + 5 * Math.pow(0.8, i); c.strokeStyle = `rgba(40,70,90,${0.35 * Math.pow(0.8, i)})`; c.stroke(); } }) })); decal.position.y = 0.32; decal.layers.set(NOINK); g.add(decal);
  // bowl: porcelain wall + rim (the interior is the hole), tank, lid, seat
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.4, 0.46, 32, 1, true), lam("#f4f8f8", undefined, { side: THREE.DoubleSide })); bowl.position.y = 0.23; bowl.castShadow = true; g.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.075, 12, 40), lam("#ffffff")); rim.rotation.x = Math.PI / 2; rim.position.y = 0.47; rim.castShadow = true; g.add(rim);
  const seat = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.05, 10, 40), lam("#d9b890")); seat.rotation.x = Math.PI / 2; seat.position.y = 0.53; g.add(seat);
  k.box(0.9, 0.95, 0.32, 0, 0.78, -0.5, "#f4f8f8"); k.box(0.96, 0.08, 0.36, 0, 1.28, -0.5, "#ffffff"); k.box(0.56, 0.3, 0.3, 0, 0.5, -0.36, "#f4f8f8"); k.cyl(0.05, 0.1, -0.3, 1.36, -0.5, "#c9d0d8"); 
  
  const roll = k.cyl(0.14, 0.2, 1.1, 0.45, -1.5, "#ffffff"); void roll;
  const rig = w.rig("tito"), piv = new THREE.Group(); g.add(piv);
  // the RECOVERY battery
  const bat = new THREE.Group(); g.add(bat); const bk = new Kit(bat);
  bk.box(1.1, 1.9, 0.26, 0, 0, 0, "#20232c"); bk.box(0.4, 0.16, 0.2, 0, 1.03, 0, "#20232c");
  const fill = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: "#2fe06a" })); fill.layers.set(NOINK); bat.add(fill);
  const pct = new DynText(1.0, 0.42, 384, 160, bat); pct.mesh.position.set(0, -0.12, 0.15);
  const lab = bk.label("RECOVERY", 1.8, 0.38, 0, 1.38, 0.0, "#1c1f28", "#ffd23f");
  const gloom = new Puffs(g, 8, "#6a6e78");
  const cp = new THREE.Vector3(), bp = new THREE.Vector3(0.75, 2.0, 0.2);
  return {
    g, env, cInf: 8,
    focus: (o) => o.set(0.2, 0.9, 0.2),
    update(c) {
      piv.position.set(-0.85, 0, 0.3); piv.rotation.z = -0.3 - 0.03 * Math.sin(c.t * 2); piv.userData.off = [0.85, 0, -0.3];
      w.put(rig, piv, { action: "idle", t: c.t, expression: "shocked", mouthOpen: 0.3 + 0.3 * c.mouth, position: [-0.85, 0, 0.3], yaw: Math.PI / 2 - 0.2 }, c.cam, tintOf(env));
      c.cam.getWorldPosition(cp);
      bat.position.set(bp.x, bp.y + 0.07 * Math.sin(c.t * 1.6), bp.z); bat.rotation.y = Math.atan2(cp.x - bat.position.x, cp.z - bat.position.z); bat.scale.setScalar(0.5);
      const lv = 1 - easeIO(clamp01((c.t - 0.4) / 2.0)), h = Math.max(0.001, 1.6 * lv);
      fill.scale.set(0.85, h, 0.16); fill.position.set(0, -0.8 + h / 2, 0.08); fill.visible = lv > 0.005;
      const col = lv > 0.5 ? new THREE.Color("#2fe06a").lerp(new THREE.Color("#ffd23f"), 1 - (lv - 0.5) * 2) : new THREE.Color("#ffd23f").lerp(new THREE.Color("#ff3a2a"), 1 - lv * 2);
      (fill.material as THREE.MeshBasicMaterial).color.copy(lv < 0.03 ? new THREE.Color("#6a6e78") : col);
      pct.set(`${Math.round(lv * 100)}%`, lv < 0.03 ? "#8a8e98" : lv < 0.25 ? "#ff5a4a" : "#ffffff", "#0b0d12");
      (lab.material as THREE.MeshBasicMaterial).color.setScalar(lv < 0.03 ? 0.55 : 1);
      for (let j = 0; j < 8; j++) { const age = (c.t * 0.6 + j / 8) % 1; gloom.set(j, 0.15 * Math.cos(j * 2), 0.6 + 1.6 * age, 0.2 * Math.sin(j * 2) + 0.2, 0.08 + 0.18 * age, lv < 0.1 ? 0.45 * (1 - age) : 0); }
    },
  };
};

// ================================================================ 16L (0:41-0:48, left pane, red) Tito in a full plaster cast on a hospital stretcher: CHASING PAIN
export const S16L: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS2.pain;
  k.floor(60, repM("hospFloor", () => tileTex("doms_hosp", "#d9d2d2", "#cbc2c2", "#8a7a7a"), 8, 8), "#ffffff");
  k.plane(60, 12, 0, 6, -3.4, lam("#d6a8a8", repM("hospWall", () => ctex("doms_hospwall", 128, 128, (c) => { c.fillStyle = "#d6a8a8"; c.fillRect(0, 0, 128, 128); c.fillStyle = "#c89090"; c.fillRect(0, 100, 128, 28); }), 30, 6)));
  k.box(1.6, 0.14, 0.14, 0, 3.6, -3.3, "#c9d0d8");
  // stretcher: tilted backrest, mattress, rails, wheels
  k.box(1.1, 0.12, 1.2, 0, 0.6, -1.0, "#c9d0d8"); k.box(1.0, 0.18, 1.2, 0, 0.75, -1.0, "#e8f0f4");
  const back = k.box(1.0, 0.16, 1.6, 0, 1.2, -1.3, "#e8f0f4"); back.rotation.x = 1.1; back.position.set(0, 1.45, -1.05);
  for (const s of [-1, 1]) { k.cyl(0.03, 1.2, s * 0.56, 0.98, -1.0, "#9aa0aa", { rx: Math.PI / 2 }); k.cyl(0.03, 0.3, s * 0.56, 0.84, -0.4, "#9aa0aa"); k.cyl(0.03, 0.3, s * 0.56, 0.84, -1.6, "#9aa0aa"); for (const z of [-0.4, -1.6]) { k.cyl(0.13, 0.08, s * 0.4, 0.14, z, "#2a2a30", { rz: Math.PI / 2 }); k.cyl(0.03, 0.46, s * 0.4, 0.37, z, "#9aa0aa"); } }
  
  // IV stand + monitor
  k.cyl(0.03, 3.2, 1.25, 1.6, -0.6, "#c9d0d8"); k.box(0.5, 0.04, 0.04, 1.25, 3.2, -0.6, "#c9d0d8"); k.box(0.3, 0.45, 0.06, 1.25, 2.85, -0.6, "#bfe6ff").castShadow = false;
  const drip = new Puffs(g, 3, hot("#bfe6ff", 1.2));
  k.box(0.8, 0.7, 0.4, -1.5, 1.7, -1.0, "#2a2d38"); k.cyl(0.03, 1.4, -1.5, 0.7, -1.0, "#9aa0aa");
  const mon = new DynText(0.7, 0.52, 256, 192, g); mon.mesh.position.set(-1.5, 1.72, -0.79);
  const rig = w.rig("tito");
  return {
    g, env, cInf: 6,
    focus: (o) => o.set(0, 1.5, 0),
    update(c) {
      w.put(rig, g, { action: "idle", t: c.t, expression: "exhausted", mouthOpen: 0.5 + 0.4 * Math.sin(c.t * 9), sweat: 1, position: [0, 0.85, -0.3], yaw: 0, outfit: { cast: 1, shirt: "#e8e0d8" } }, c.cam, tintOf(env));
      const bl = Math.floor(c.t * 1.2) % 2;
      mon.set(bl ? "BEEEEP" : "━━━━━━", "#3dff7a", "#0b0d12", "#8d949c", 16);
      for (let j = 0; j < 3; j++) { const age = (c.t * 0.8 + j / 3) % 1; drip.set(j, 1.25 - 0.15, 2.7 - 1.4 * age * age, -0.6, 0.03, age < 0.95 ? 1 : 0); }
    },
  };
};
// ================================================================ 16R (right pane, green) fresh smug Tito lifts a giant black dumbbell alone: CHASING TENSION
export const S16R: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS2.win;
  gymSet(k, null);
  const db = new THREE.Group(); g.add(db); dumbbell(new Kit(db), 0.4, 1.5);
  const rig = w.rig("tito");
  const spark = new Puffs(g, 14, hot("#c8ff90", 2.4), true);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), hp = new THREE.Vector3();
  return {
    g, env, cInf: 6,
    focus: (o) => o.set(0, 1.9, 0),
    update(c) {
      w.put(rig, g, { action: "cheer", t: c.t, speed: 0.8, expression: "smug", mouthOpen: 0.2 + 0.5 * c.mouth, position: [0, 0, 0], yaw: 0 }, c.cam, tintOf(env));
      w.wa(rig, "handL", a); w.wa(rig, "handR", b); w.wa(rig, "head", hp);
      db.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.2, (a.z + b.z) / 2 + 0.08); db.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) * 0.6;
      for (let j = 0; j < 14; j++) { const age = (c.t * 0.7 + j / 14) % 1, an = j * 1.3; spark.set(j, db.position.x + Math.cos(an) * (0.6 + 0.8 * age), db.position.y + 0.2 + 1.0 * age, 0.4, 0.03, 1 - age); }
    },
  };
};
void easeIn; void spring; void labelTex; void fiberTex; void brick; void TL; void smooth; void lerp; void CYL; void NOINK; void DynText;
