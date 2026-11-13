// DOMS short, micro-scenes 1-8. Each builder returns a Scn: a Group built once + update(ctx). See world.ts.
import * as THREE from "three";
import { Kit, DynText, Puffs, lam, basic, hot, hh, clamp01, smooth, easeOut, easeIn, easeIO, lerp, spring, spanCyl, boardsTex, barkTex, fiberTex, radialTex, labelTex, tileTex, BOX, CYL, SPH } from "./kit";
import { Builder, Env } from "./world";
import { NOINK } from "../alejandro/ink";
import { brick, ctex, rep, stone } from "../alejandro/paint";
import TL from "./timeline.json";

const S = TL.starts;                       // scene start times (s)
export const ENVS: Record<string, Env> = {
  gym: { lit: [1.25, 1.05, 0.84], shade: [0.78, 0.66, 0.6], lift: [0.06, 0.05, 0.05], bg: "#2a1c18", fog: ["#3a2a22", 14, 40], sun: [-4, 9, 6], sunCol: "#ffe2b8", tint: [1, 0.97, 0.92] },
  dungeon: { lit: [1.5, 1.05, 0.55], shade: [0.1, 0.13, 0.22], lift: [0.02, 0.03, 0.07], bg: "#0a0e1a", fog: ["#0a0e1a", 8, 26], sun: [-3, 8, 5], sunCol: "#FFB84D", sunI: 2.6, tint: [0.85, 0.85, 0.95], lamp: [-1.3, 0.8, -1.2] },
  night: { lit: [1.5, 1.05, 0.55], shade: [0.1, 0.13, 0.22], lift: [0.02, 0.03, 0.07], bg: "#0b1224", fog: ["#0b1224", 10, 30], sun: [3, 8, 6], sunCol: "#FFB84D", sunI: 2.6, tint: [0.85, 0.85, 0.95], lamp: [-1.2, 1.1, -1.4] },
  court: { lit: [1.5, 1.05, 0.55], shade: [0.1, 0.13, 0.22], lift: [0.02, 0.03, 0.07], bg: "#0d1222", fog: ["#0d1222", 12, 34], sun: [-3, 9, 6], sunCol: "#FFB84D", sunI: 2.6, tint: [0.88, 0.88, 0.96], lamp: [-1.4, 1.2, -1.4] },
  red: { lit: [1.5, 0.8, 0.45], shade: [0.2, 0.1, 0.2], lift: [0.03, 0.02, 0.06], bg: "#240810", fog: ["#2a0a14", 6, 30], sun: [2, 6, 5], sunCol: "#FFB84D", sunI: 2.6, tint: [0.95, 0.85, 0.9], lamp: [0.2, 1.0, -2.2] },
};

// ---------------------------------------------------------------- shared set dressing
const memo = new Map<string, THREE.Texture>();
const repM = (key: string, base: () => THREE.Texture, x: number, y: number) => { let t = memo.get(key); if (!t) { t = rep(base(), x, y); memo.set(key, t); } return t; };
const GYM_BOARDS = () => boardsTex("doms_boards", ["#d8a86c", "#cf9d62", "#dfb177", "#c99659"], "#6a4426");

/** the PumpParadox gym backdrop: wooden floor, brick wall with a red band, two power racks, plate stack, warm bulbs, neon sign */
export const gymSet = (k: Kit, sign: string | null = "PUMP GYM", wallZ = -6) => {
  k.floor(70, repM("gymfloor", GYM_BOARDS, 14, 14));
  k.plane(70, 11, 0, 5.5, wallZ, lam("#a88a6a", repM("gymwall", brick, 12, 2)));
  k.box(70, 0.5, 0.12, 0, 1.1, wallZ + 0.06, "#e2453c");
  for (const rx of [-4, 4]) { for (const dx of [-0.9, 0.9]) k.box(0.14, 2.6, 0.14, rx + dx, 1.3, wallZ + 1.8, "#d9373b"); k.box(2.0, 0.14, 0.14, rx, 2.6, wallZ + 1.8, "#d9373b"); }
  for (let i = 0; i < 9; i++) k.cyl(0.42, 0.12, 2.2, 0.06 + i * 0.125, wallZ + 1.4, i % 2 ? "#c0353a" : "#2f3340");
  for (let n = 0; n < 24; n++) k.gsph(0.04, -6 + n * 0.52, 3.9 - 0.5 * Math.sin((n / 23) * Math.PI), wallZ + 0.1, hot(["#ffd27a", "#ff7a6a", "#7ad0ff"][n % 3], 3));
  if (sign) k.label(sign, 2.6, 0.8, 0, 3.0, wallZ + 0.08, "#1c1f28", "#ffd23f");
};
const tintOf = (e: Env) => e.tint;

// ================================================================ 1 (0:00-0:03) the log legs
export const S1: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.gym;
  gymSet(k);
  const wood = boardsTex("doms_stairs", ["#b98a58", "#a97b4c", "#c4955f"], "#6a4426");
  [0.24, 0.48, 0.72].forEach((h, i) => k.box(0.62, h, 2.2, 0.85 + i * 0.62, h / 2, 0, "#ffffff", wood));
  k.box(0.1, 0.5, 2.2, 0.55, 0.12, 0, "#e2453c").visible = false;
  const rig = w.rig("tito"), bark = barkTex();
  const logs = [0, 1].map(() => { const m = new THREE.Mesh(CYL, lam("#ffffff", bark)); m.castShadow = true; g.add(m); const c = new THREE.Mesh(CYL, lam("#d9ab6b")); g.add(c); return { m, c, c0: new THREE.Mesh(CYL, lam("#d9ab6b")) }; });
  logs.forEach((l) => g.add(l.c0));
  const smoke = new Puffs(g, 40, "#8c8c96"), ember = new Puffs(g, 18, hot("#ff9a3a", 3), true);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), cp = new THREE.Vector3();
  return {
    g, env, cInf: 7,
    focus: (o) => o.set(0.1, 0.5, 0),
    update(c) {
      const st = { action: "walk" as const, t: c.t, speed: 0.6, expression: "effort" as const, sweat: 1, mouthOpen: c.mouth, position: [-0.5, 0, 0] as [number, number, number], yaw: Math.PI / 2 - 0.15, outfit: { noLegs: true } };
      w.put(rig, g, st, c.cam, tintOf(env));
      c.cam.getWorldPosition(cp);
      (["hipL", "hipR"] as const).forEach((n, i) => {
        w.wa(rig, n, a); w.wa(rig, i ? "ankleR" : "ankleL", b);
        a.y -= 0.05; b.y -= 0.1; const off = new THREE.Vector3(cp.x - a.x, 0, cp.z - a.z).normalize().multiplyScalar(i ? 0.1 : 0.16); a.add(off); b.add(off);
        const l = logs[i]; spanCyl(l.m, a, b, 0.105);
        d.subVectors(b, a).normalize();
        spanCyl(l.c, b.clone().addScaledVector(d, -0.012), b.clone().addScaledVector(d, 0.012), 0.11);
        spanCyl(l.c0, a.clone().addScaledVector(d, -0.012), a.clone().addScaledVector(d, 0.012), 0.11);
        for (let j = 0; j < 10; j++) {
          const ph = j / 10, hgt = (c.t * 0.8 + ph + i * 0.37) % 1, s = hh(j, i);
          const px = lerp(a.x, b.x, s) + (hh(j, 3 + i) - 0.5) * 0.12 + 0.12 * hgt, py = lerp(a.y, b.y, s) + hgt * 1.1, pz = lerp(a.z, b.z, s) + (hh(j, 5 + i) - 0.5) * 0.1;
          smoke.set(i * 10 + j, px, py, pz, 0.06 + 0.2 * hgt, 0.6 * (1 - hgt) * smooth(hgt * 8));
        }
        for (let j = 0; j < 9; j++) {
          const age = (c.t * 1.6 + j / 9 + i * 0.3) % 1, s = hh(j, 11 + i);
          ember.set(i * 9 + j, lerp(a.x, b.x, s) + (hh(j, 13) - 0.5) * 0.3 * age, lerp(a.y, b.y, s) + age * 0.7, lerp(a.z, b.z, s) + 0.05, 0.02 + 0.018 * (1 - age), 1 - age);
        }
      });
    },
  };
};

// ================================================================ 2 (0:03-0:05) tumble down the stairs
const STEP_TOPS = [1.8, 1.5, 1.2, 0.9, 0.6, 0.3];
const stairTop = (x: number) => (x < -2.875 ? 2.1 : x > 0.425 ? 0 : STEP_TOPS[Math.min(5, Math.floor((x + 2.875) / 0.55))]);
export const S2: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.gym;
  gymSet(k);
  const wood = boardsTex("doms_stairs", ["#b98a58", "#a97b4c", "#c4955f"], "#6a4426");
  k.box(3.2, 2.1, 2.4, -4.5, 1.05, 0, "#ffffff", wood);
  STEP_TOPS.forEach((h, i) => { k.box(0.55, h, 2.4, -2.6 + i * 0.55, h / 2, 0, "#ffffff", wood); k.box(0.56, 0.05, 2.42, -2.6 + i * 0.55, h + 0.01, 0, i % 2 ? "#e2453c" : "#f2d27a"); });
  for (const z of [-1.1, 1.1]) { for (const x of [-3.0, -1.4, 0.2]) k.cyl(0.04, 0.9, x, stairTop(x) + 0.45, z, "#aab0b8"); k.cyl(0.035, 4.2, -1.4, 1.75, z, "#aab0b8", { rz: Math.atan2(-1.5, 3.0) + Math.PI / 2 }).position.y = 2.5; }
  const rig = w.rig("tito"), piv = new THREE.Group(); g.add(piv);
  const dust = new Puffs(g, 16, "#d8d0c4"), stars = new Puffs(g, 6, hot("#ffe14a", 2.6), true);
  const T0 = 0.15, T1 = 1.15, P = new THREE.Vector3();
  return {
    g, env, cInf: 9,
    focus: (o) => o.set(1.1, 0.9, 0),
    update(c) {
      const u = clamp01((c.t - T0) / (T1 - T0)), landed = c.t >= T1;
      const x = lerp(-1.4, 3.4, Math.pow(u, 0.92)), base = stairTop(x), bounce = u > 0 && u < 1 ? 0.3 * Math.abs(Math.sin(u * Math.PI * 6)) * (1 - 0.5 * u) : 0;
      const y = base + bounce, roll = -u * Math.PI * 4;
      const th = smooth((c.t - 1.4) / 0.25), trem = th > 0 ? Math.sin(c.t * 80) * 0.008 * th : 0;
      P.set(x, y + 0.9, 0); piv.position.copy(P); piv.rotation.z = roll; piv.userData.off = [-P.x, -P.y, -P.z];
      const fallT = Math.max(0, c.t - T0) * 0.95;
      const st = { action: "fall" as const, t: c.t < T0 ? 0 : fallT, expression: landed && th > 0.3 ? ("smug" as const) : ("exhausted" as const), mouthOpen: c.mouth, sweat: 1, position: [x + trem, y, 0] as [number, number, number], yaw: Math.PI / 2, outfit: { thumbs: th } };
      if (c.t < T0) { st.action = "fall"; st.t = 0; }
      w.put(rig, piv, st, c.cam, tintOf(env));
      for (let j = 0; j < 8; j++) { const age = clamp01((c.t - T1) / 0.7); dust.set(j, 3.4 + Math.cos(j * 0.8) * (0.2 + 1.4 * age), 0.1 + 0.25 * age, Math.sin(j * 0.8) * 0.6 * age, 0.12 + 0.35 * age, (1 - age) * (c.t > T1 ? 0.8 : 0)); }
      for (let j = 0; j < 4; j++) { const a = c.t * 5 + j * 1.57; stars.set(j, 2.5 + 0.55 * Math.cos(a), 1.5 + 0.12 * Math.sin(a * 2), 0.5 * Math.sin(a), 0.075, c.t > T1 + 0.1 ? 1 : 0); }
    },
  };
};

// ================================================================ 3 (0:05-0:08) the dream: quads exploding like nuclear bombs
const bubbleTex = () => ctex("doms_bubble", 512, 420, (g) => {
  g.clearRect(0, 0, 512, 420);
  const cloud = () => { g.beginPath(); [[90, 250, 80], [150, 130, 90], [270, 80, 100], [390, 130, 90], [440, 250, 80], [360, 335, 85], [220, 350, 90]].forEach(([x, y, r]) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, 7); }); };
  g.lineJoin = "round"; cloud(); g.lineWidth = 16; g.strokeStyle = "#2A1A14"; g.stroke(); cloud(); g.fillStyle = "#fbf6ee"; g.fill();
  g.fillStyle = "#fbf6ee"; g.fillRect(140, 130, 240, 210);
  // two thighs (quads) at the bottom: skin-coloured tapered shapes with the quad-sweep lines
  for (const cx of [165, 345]) {
    g.beginPath(); g.moveTo(cx - 52, 325); g.bezierCurveTo(cx - 70, 270, cx - 40, 235, cx - 22, 205); g.lineTo(cx + 22, 205); g.bezierCurveTo(cx + 44, 240, cx + 66, 275, cx + 50, 325); g.closePath();
    g.fillStyle = "#f2b59a"; g.fill(); g.lineWidth = 8; g.strokeStyle = "#2A1A14"; g.stroke();
    g.lineWidth = 5; g.strokeStyle = "#c9785f"; for (const o of [-22, 0, 22]) { g.beginPath(); g.moveTo(cx + o * 0.6, 215); g.quadraticCurveTo(cx + o * 1.3, 265, cx + o, 316); g.stroke(); }
  }
});
const puffTex = () => ctex("doms_puff", 128, 128, (g) => { g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fillStyle = "#fbf6ee"; g.fill(); g.lineWidth = 10; g.strokeStyle = "#2A1A14"; g.stroke(); });
export const S3: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.night;
  k.floor(60, repM("rug", () => boardsTex("doms_nightfloor", ["#5b4a6e", "#54446a", "#614f77"], "#2c2240"), 14, 14));
  k.plane(60, 12, 0, 6, -4, lam("#27325c", repM("nightwall", () => ctex("doms_nightwall", 256, 256, (c) => { c.fillStyle = "#2a3664"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#34427a"; for (let i = 0; i < 8; i++) c.fillRect(i * 32, 0, 14, 256); }), 24, 4)));
  k.gsph(1.0, -2.6, 4.2, -3.9, hot("#fff4c8", 1.6)); k.gsph(0.86, -2.45, 4.3, -3.88, new THREE.Color("#0c1128")).visible = false;
  for (let i = 0; i < 26; i++) k.gsph(0.035 + 0.03 * hh(i, 1), -8 + 16 * hh(i, 2), 2.2 + 5 * hh(i, 3), -3.85, hot("#d8e4ff", 2.4));
  const zs = [0, 1, 2].map((i) => k.label("Z", 0.3 + 0.08 * i, 0.3 + 0.08 * i, 0, 0, 0, null, "#e8f0ff"));
  const rig = w.rig("tito"), bub = new THREE.Group(); g.add(bub);
  bub.add(new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.39), new THREE.MeshBasicMaterial({ map: bubbleTex(), transparent: true, depthWrite: false })));
  (bub.children[0] as THREE.Mesh).layers.set(NOINK); (bub.children[0] as THREE.Mesh).renderOrder = 5;
  const trail = [0.18, 0.12, 0.08].map((s, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s * 2, s * 2), new THREE.MeshBasicMaterial({ map: puffTex(), transparent: true, depthWrite: false })); m.layers.set(NOINK); m.renderOrder = 5; g.add(m); return m; });
  // two cartoon starburst explosions + puffy smoke, inside the bubble
  const starTex = ctex("doms_star", 256, 256, (g) => { const spike = (R: number, r: number, n: number, rot: number) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * Math.PI * 2, q = i % 2 ? r : R; g.lineTo(128 + q * Math.cos(a), 128 + q * Math.sin(a)); } g.closePath(); }; g.lineJoin = "round"; spike(124, 70, 11, 0.2); g.fillStyle = "#e8431c"; g.fill(); g.lineWidth = 9; g.strokeStyle = "#2A1A14"; g.stroke(); spike(92, 52, 11, 0.45); g.fillStyle = "#ff9a2a"; g.fill(); spike(58, 34, 9, 0.1); g.fillStyle = "#fff06a"; g.fill(); });
  const nukes = [-0.38, 0.4].map((nx, n) => {
    const grp = new THREE.Group(); grp.position.set(nx * 0.9, 0.0, 0.08); bub.add(grp);
    const star = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: starTex, transparent: true, depthWrite: false })); star.layers.set(NOINK); star.renderOrder = 6; grp.add(star);
    const smoke = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(SPH, basic("#d8d0c8", { transparent: true, opacity: 0.9, depthWrite: false })); m.layers.set(NOINK); m.renderOrder = 5; grp.add(m); return { m, a: (i / 6) * 6.283 + n }; });
    return { grp, star, smoke, t0: 1.15 + n * 0.45 };
  });
  const hp = new THREE.Vector3(), cp = new THREE.Vector3();
  return {
    g, env, cInf: 7,
    focus: (o) => o.set(0.1, 1.9, 0),
    update(c) {
      w.put(rig, g, { action: "idle", t: c.t, expression: "smug", blink: 1, mouthOpen: c.mouth * 0.55, position: [-0.25, 0, 0], yaw: 0.2 }, c.cam, tintOf(env));
      w.wa(rig, "head", hp); c.cam.getWorldPosition(cp);
      bub.scale.setScalar(0.78); bub.position.set(hp.x + 0.62, hp.y + 1.0, hp.z + 0.1); bub.rotation.y = Math.atan2(cp.x - bub.position.x, cp.z - bub.position.z);
      trail.forEach((m, i) => { m.position.set(hp.x + 0.12 + 0.14 * (i + 1), hp.y + 0.38 + 0.14 * i + 0.08 * i * i, hp.z + 0.1); m.rotation.y = bub.rotation.y; m.scale.setScalar(1 + 0.06 * Math.sin(c.t * 4 + i)); });
      zs.forEach((z, i) => { const ph = (c.t * 0.45 + i / 3) % 1; z.position.set(hp.x - 0.45 - 0.2 * ph, hp.y + 0.5 + 1.2 * ph, hp.z + 0.1); z.scale.setScalar(0.5 + ph); (z.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * ph); z.rotation.z = 0.2 * Math.sin(ph * 6); });
      nukes.forEach(({ grp, star, smoke, t0 }) => {
        const ts = c.t - t0, u = easeOut(ts / 0.45), pul = 1 + 0.06 * Math.sin(ts * 16);
        grp.visible = ts > 0; if (!grp.visible) return;
        star.scale.setScalar(0.62 * u * pul); star.rotation.z = 0.25 * Math.sin(ts * 6) + ts * 0.4;
        smoke.forEach(({ m, a }, i) => { const r = 0.26 * u; m.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.8 + 0.04 * i, -0.01); m.scale.setScalar(0.1 * u * (0.8 + 0.4 * Math.sin(ts * 7 + i))); });
      });
    },
  };
};

// ================================================================ 4 (0:08-0:11) medieval torture wheel, PAIN = GAINZ
const neonTex = () => ctex("doms_neon", 1024, 320, (g) => {
  g.clearRect(0, 0, 1024, 320); g.font = "900 140px Arial Black, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  for (const [w, col, blur] of [[34, "#ff2a8a", 40], [22, "#ff2a8a", 18], [8, "#ffe6f2", 6]] as const) { g.shadowColor = col; g.shadowBlur = blur; g.lineWidth = w; g.strokeStyle = col; g.strokeText("PAIN = GAINZ", 512, 165); }
  g.shadowBlur = 0; g.fillStyle = "#ffd6ea"; g.fillText("PAIN = GAINZ", 512, 165);
});
const flameTex = () => ctex("doms_flame", 256, 384, (g) => {
  g.clearRect(0, 0, 256, 384);
  const tongue = (cx: number, w: number, h: number, c0: string, c1: string, lean: number) => {
    g.beginPath(); g.moveTo(cx - w, 384); g.bezierCurveTo(cx - w * 1.25, 384 - h * 0.45, cx - w * 0.4 + lean * 0.5, 384 - h * 0.72, cx + lean, 384 - h);
    g.bezierCurveTo(cx + w * 0.5 + lean * 0.5, 384 - h * 0.7, cx + w * 1.25, 384 - h * 0.42, cx + w, 384); g.closePath();
    const gr = g.createLinearGradient(0, 384, 0, 384 - h); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fill();
  };
  tongue(128, 96, 340, "#c8160a", "#ff4a12", 0); tongue(66, 56, 250, "#e8300c", "#ff7a1a", -34); tongue(192, 56, 280, "#e8300c", "#ff7a1a", 30);
  tongue(120, 66, 250, "#ff7a14", "#ffc23a", 12); tongue(150, 40, 190, "#ff9a1a", "#ffd84a", -16); tongue(128, 34, 140, "#ffd23a", "#fff4b8", 4);
});
/** organic fire: several camera-facing tongue planes that sway and stretch out of phase (yellow / orange / red) */
export const mkFlame = (k: Kit, x: number, z: number, s: number, y = 0) => {
  const tex = flameTex();
  const pl = [0, 1, 2, 3].map((i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: hot("#ffffff", 1.25 - 0.08 * i), side: THREE.DoubleSide })); m.layers.set(NOINK); m.renderOrder = 4 + i; k.g.add(m); return m; });
  return (t: number, cam?: THREE.Vector3) => pl.forEach((m, i) => {
    const q = 1 + 0.16 * Math.sin(t * (11 + 3 * i) + i * 1.9 + x) + 0.08 * Math.sin(t * 23 + i * 3);
    const w = s * (1.0 - 0.14 * i) * (i % 2 ? -1 : 1), h = s * (1.0 - 0.1 * i) * q;
    m.scale.set(w, h, 1); m.position.set(x + 0.1 * s * Math.sin(t * 7 + i * 2 + x) + (i - 1.5) * 0.12 * s, y + 0.75 * h, z + 0.01 * i);
    m.rotation.set(0, cam ? Math.atan2(cam.x - m.position.x, cam.z - m.position.z) : 0, 0.1 * Math.sin(t * 9 + i * 2 + x));
  });
};
export const mkTorch = (k: Kit, x: number, y: number, z: number) => {
  k.cyl(0.05, 0.5, x, y, z, "#3a2a20", { rz: 0.0 }); k.box(0.2, 0.06, 0.2, x, y - 0.25, z, "#2a2a30");
  return mkFlame(k, x, z, 0.5, y + 0.22);
};
export const S4: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.dungeon;
  k.floor(60, repM("dgfloor", () => stone("doms_dgstone", ["#4b4650", "#443f4a", "#524d58", "#3d3943"]), 12, 12));
  k.plane(60, 12, 0, 6, -4, lam("#6a5a58", repM("dgwall", brick, 10, 3)));
  k.plane(14, 12, -6, 6, 0, lam("#5a4a4a", repM("dgwall2", brick, 4, 3)), Math.PI / 2); k.plane(14, 12, 6, 6, 0, lam("#5a4a4a", repM("dgwall2", brick, 4, 3)), -Math.PI / 2);
  const flames = [mkTorch(k, -3.4, 2.7, -3.85), mkTorch(k, 3.4, 2.7, -3.85), mkTorch(k, -3.2, 1.4, 1.2), mkTorch(k, 3.4, 1.4, 1.0)];
  for (const x of [-2.2, 2.4]) { k.cyl(0.02, 2.2, x, 4.4, -3.8, "#6a6a72"); for (let i = 0; i < 6; i++) k.sph(0.06, 0.1, 0.03, x, 3.3 - i * 0.2, -3.8, "#8a8a92"); }
  for (const [bx, bz] of [[-3.2, -2.8], [3.5, -2.6], [2.6, -3.3]]) { k.cyl(0.5, 0.95, bx, 0.48, bz, "#6a4426"); k.cyl(0.505, 0.06, bx, 0.28, bz, "#2a2a30"); k.cyl(0.505, 0.06, bx, 0.7, bz, "#2a2a30"); }
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(3.06, 0.956), new THREE.MeshBasicMaterial({ map: neonTex(), transparent: true, depthWrite: false })); neon.position.set(0, 4.6, -3.7); neon.layers.set(NOINK); neon.renderOrder = 3; g.add(neon);
  // the wheel (3D prop): iron-banded wooden rim, hub, spokes, pegs, ropes
  const wheel = new THREE.Group(); wheel.position.set(0, 1.7, -0.75); wheel.scale.setScalar(1.25); g.add(wheel);
  const wk = new Kit(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.1, 14, 56), lam("#6e4a2c")); rim.castShadow = true; wheel.add(rim);
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.108, 8, 56), lam("#2a2a30")); rim2.scale.z = 0.5; wheel.add(rim2);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const sp = wk.box(0.14, 1.4, 0.1, Math.cos(a + Math.PI / 2) * 0.7, Math.sin(a + Math.PI / 2) * 0.7, -0.05, "#7a5232"); sp.rotation.z = a; wk.cyl(0.07, 0.3, Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0.0, "#2a2a30", { rx: Math.PI / 2 }); }
  wk.cyl(0.2, 0.3, 0, 0, -0.05, "#2a2a30", { rx: Math.PI / 2 });
  const rig = w.rig("tito"), piv = new THREE.Group(); g.add(piv);
  
  const dust = new Puffs(g, 14, hot("#ffd6a0", 1.4), true);
  const P = new THREE.Vector3(0, 1.7, 0.2), cpw = new THREE.Vector3();
  const cuffs = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 18), lam("#d6b27a")); m.castShadow = true; g.add(m); return m; });
  return {
    g, env, cInf: 8,
    focus: (o) => o.set(0, 2.0, 0),
    update(c) {
      const spin = c.t < 0 ? 0 : 9.5 * (c.t - 0.22 * (1 - Math.exp(-c.t / 0.22))), ang = -spin;
      wheel.rotation.z = ang; piv.position.copy(P); piv.rotation.z = ang; piv.userData.off = [-P.x, -P.y, -P.z];
      w.put(rig, piv, { action: "cheer", t: c.t, speed: 1, expression: "effort", sweat: 1, mouthOpen: Math.max(0.55, c.mouth), position: [0, 0.23, 0.2], yaw: 0, scale: 1.25 }, c.cam, tintOf(env));
      (["handL", "handR", "ankleL", "ankleR"] as const).forEach((n, i) => { const q = w.wa(rig, n, new THREE.Vector3()); cuffs[i].position.set(q.x, q.y, q.z + 0.06); cuffs[i].rotation.z = ang; });
      neon.position.x = (-3.7 / c.cam.position.z) * c.cam.position.x; c.cam.getWorldPosition(cpw); flames.forEach((f) => f(c.t, cpw));
      const fl = 0.75 + 0.35 * Math.sin(c.t * 22) * Math.sin(c.t * 9.3) + 0.12 * Math.sin(c.t * 61); (neon.material as THREE.MeshBasicMaterial).color.setScalar(1.5 * fl);
      for (let j = 0; j < 8; j++) { const age = (c.t * 1.4 + j / 8) % 1, a = j * 2.2 + ang * 0.5; dust.set(j, 1.55 * Math.cos(a), 1.7 + 1.55 * Math.sin(a), 0.1, 0.05 * (1 - age), 0.9 * (1 - age)); }
    },
  };
};

// ================================================================ 5 (0:11-0:14) the judge (2.5D worker with a white wig) slams a giant wooden gavel
export const S5: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.court;
  const mah = boardsTex("doms_mahogany", ["#6a3a24", "#613320", "#733f28"], "#2e170d");
  k.floor(60, repM("crtfloor", () => boardsTex("doms_crtfloor", ["#9a6a3c", "#8d5f34", "#a4743f"], "#4a2c14"), 12, 12));
  k.plane(60, 12, 0, 6, -4.4, lam("#ffffff", repM("crtwall", () => mah, 12, 3)));
  for (const x of [-4.2, 4.2]) { k.box(0.9, 8, 0.7, x, 4, -4.0, "#8a5a38"); k.box(1.1, 0.3, 0.9, x, 0.15, -4.0, "#6a4228"); k.box(1.1, 0.3, 0.9, x, 7.9, -4.0, "#6a4228"); }
  k.box(7, 1.1, 3.2, 0, 0.55, -1.8, "#ffffff", mah);               // dais
  for (const x of [-2.4, 0, 2.4]) k.box(1.7, 2.6, 0.12, x, 4.6, -4.3, "#4a2a18");
  k.box(5.0, 1.5, 0.4, 0, 0.75, -0.2, "#ffffff", mah);
  k.box(5.2, 0.1, 1.2, 0, 1.5, -0.8, "#7a4a2c");                  // desk top
  k.box(0.6, 0.05, 0.4, -1.5, 1.58, -0.7, "#f4f0e6"); k.box(0.5, 0.04, 0.35, 1.7, 1.58, -0.8, "#f4f0e6");   // papers
  k.cyl(0.3, 0.1, 1.0, 1.6, -0.95, "#3a2418");                    // sound block
  const handle = new THREE.Mesh(CYL, lam("#8a5a32")); handle.castShadow = true; g.add(handle);
  const gav = new THREE.Group(); g.add(gav);
  const gk = new Kit(gav); gk.cyl(0.12, 0.42, 0, 0, 0, "#a9703c", { rz: Math.PI / 2 }); gk.cyl(0.13, 0.04, -0.19, 0, 0, "#d9a441", { rz: Math.PI / 2 }); gk.cyl(0.13, 0.04, 0.19, 0, 0, "#d9a441", { rz: Math.PI / 2 });
  g.children.forEach((o) => { if (o.position.y > 4.4 && o.position.z < -3.5) (o as THREE.Mesh).castShadow = false; });
  const judge = w.rig("w0");
  const dust = new Puffs(g, 14, hot("#fff0d0", 1.2), true), ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 40), new THREE.MeshBasicMaterial({ color: hot("#fff6dd", 1.5), transparent: true, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.layers.set(NOINK); g.add(ring);
  const hr = new THREE.Vector3(), el = new THREE.Vector3(), dir = new THREE.Vector3();
  const strikes = [0.55, 1.75, 2.95];
  return {
    g, env, cInf: 8,
    shake: (t) => strikes.reduce((s, ts) => s + (t > ts && t < ts + 0.35 ? 0.03 * Math.exp(-(t - ts) * 9) * Math.sin((t - ts) * 40) : 0), 0),
    focus: (o) => o.set(0, 2.9, -1.3),
    update(c) {
      w.put(judge, g, { action: "curl", t: c.t + 0.65, speed: 1.5, expression: c.t > 0.35 && c.t < 1.0 ? "effort" : "smug", mouthOpen: c.mouth, position: [0, 1.1, -1.55], yaw: 0, outfit: { helmet: true, wig: true, shirt: "#26262e", noBells: true } }, c.cam, tintOf(env));
      w.wa(judge, "handR", hr); w.wa(judge, "kneeR", el);
      // the gavel follows the (curling) right hand: handle along the forearm direction, head ahead of the fist
      w.wa(judge, "handR", hr);
      const raise = clamp01((hr.y - 1.5) / 0.9), dd = new THREE.Vector3(0.9, -0.4 + 0.9 * raise, 0.2).normalize(); const tip = hr.clone().addScaledVector(dd, 0.62);
      tip.y = Math.max(tip.y, 1.72); spanCyl(handle, hr.clone().addScaledVector(dd, -0.18), tip, 0.075); gav.position.copy(tip).add(new THREE.Vector3(0.05, -0.02, 0.12)); gav.rotation.set(0, 0, 0);
      const ts = strikes.map((s) => c.t - s).find((d) => d > -0.05 && d < 0.8) ?? -1;
      for (let j = 0; j < 8; j++) { const age = clamp01(ts / 0.5), a = j * 0.8; dust.set(j, 1.0 + Math.cos(a) * 0.9 * age, 1.65 + 0.2 * age, -0.8 + Math.sin(a) * 0.4 * age, 0.1 + 0.2 * age, ts > 0 ? (1 - age) * 0.8 : 0); }
      ring.position.set(1.0, 1.66, -0.8); const ra = clamp01(ts / 0.45); ring.scale.setScalar(0.2 + 2.4 * ra); (ring.material as THREE.MeshBasicMaterial).opacity = ts > 0 ? (1 - ra) * 0.8 : 0;
      void el; void dir;
    },
  };
};

// ================================================================ 6 (0:14-0:17) the RESTRAINING ORDER hits Tito in the face
const paperTex = () => ctex("doms_paper", 512, 680, (g) => {
  g.fillStyle = "#f7f3e8"; g.fillRect(0, 0, 512, 680); g.strokeStyle = "#2a2a30"; g.lineWidth = 6; g.strokeRect(14, 14, 484, 652);
  g.fillStyle = "#1b2a52"; g.font = "900 38px Arial Black, Impact, sans-serif"; g.textAlign = "center"; g.fillText("SUPERIOR COURT", 256, 84);
  g.beginPath(); g.arc(256, 150, 34, 0, 7); g.lineWidth = 6; g.strokeStyle = "#1b2a52"; g.stroke(); g.font = "900 30px Arial Black"; g.fillText("§", 256, 162);
  g.fillStyle = "#9aa0aa"; for (let i = 0; i < 9; i++) g.fillRect(52, 220 + i * 28, 408 - (i % 3) * 36, 9);
  g.save(); g.translate(256, 470); g.rotate(-0.14); g.strokeStyle = "#d4121c"; g.lineWidth = 12; g.strokeRect(-215, -85, 430, 170); g.lineWidth = 4; g.strokeRect(-200, -70, 400, 140);
  g.fillStyle = "#d4121c"; g.font = "900 50px Arial Black, Impact, sans-serif"; g.fillText("RESTRAINING", 0, -8); g.fillText("ORDER", 0, 56); g.restore();
  g.strokeStyle = "#1b2a52"; g.lineWidth = 4; g.beginPath(); g.moveTo(70, 630); g.bezierCurveTo(110, 600, 130, 650, 170, 620); g.bezierCurveTo(200, 600, 210, 640, 240, 625); g.stroke();
});
export const S6: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.gym;
  gymSet(k, "PUMP GYM");
  const rig = w.rig("tito");
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.035), new THREE.MeshBasicMaterial({ map: paperTex(), side: THREE.DoubleSide, transparent: true })); paper.layers.set(NOINK); paper.renderOrder = 6; g.add(paper);
  const wind = new Puffs(g, 10, hot("#ffffff", 1), true);
  const hp = new THREE.Vector3(), cp = new THREE.Vector3(), chest = new THREE.Vector3(), qy = new THREE.Quaternion();
  void qy;
  return {
    g, env, cInf: 7,
    focus: (o) => o.set(0, 1.55, 0),
    update(c) {
      
      w.put(rig, g, { action: "idle", t: c.t, expression: "shocked", mouthOpen: 0.3 + 0.7 * c.mouth, position: [0, 0, 0], yaw: 0 }, c.cam, tintOf(env));
      w.wa(rig, "head", hp); w.wa(rig, "chest", chest); c.cam.getWorldPosition(cp);
      const toCam = new THREE.Vector3(cp.x - hp.x, 0, cp.z - hp.z).normalize();
      const face = new THREE.Vector3(hp.x, hp.y + 0.1, hp.z).addScaledVector(toCam, 0.6), rightV = new THREE.Vector3(toCam.z, 0, -toCam.x), pocket = new THREE.Vector3(chest.x, chest.y - 0.05, chest.z).addScaledVector(toCam, 0.5).addScaledVector(rightV, 0.55);
      const uIn = easeIn(clamp01(c.t / 0.5)), uOut = easeIO(clamp01((c.t - 0.85) / 0.6));
      const start = new THREE.Vector3(hp.x + 3.2, hp.y + 1.4, hp.z + 3.4);
      const pos = c.t < 0.5 ? start.clone().lerp(face, uIn) : face.clone().lerp(pocket, uOut);
      paper.position.copy(pos);
      paper.lookAt(cp.x, pos.y, cp.z);
      const flutter = c.t < 0.5 ? (1 - uIn) * 1.4 : 0, drop = c.t > 0.85 ? Math.sin(Math.min(1, (c.t - 0.85) / 0.6) * Math.PI) : 0;
      paper.rotateZ(flutter * Math.sin(c.t * 24) * 0.8 + 0.12 * drop * Math.sin(c.t * 14)); paper.rotateX(-0.2 * drop);
      const sc = c.t < 0.5 ? lerp(0.5, 0.95, uIn) : lerp(0.95, 0.55, uOut); paper.scale.setScalar(sc * 0.78);
      const wv = c.t < 0.6 ? 1 : 0;
      for (let j = 0; j < 8; j++) { const age = (c.t * 3 + j / 8) % 1; wind.set(j, pos.x + 0.5 + 0.8 * age, pos.y + (hh(j, 1) - 0.5) * 0.6, pos.z + 0.3, 0.025, (1 - age) * 0.6 * wv); }
    },
  };
};

// ================================================================ 7 (0:17-0:19) macro zoom into the thigh, then the red ridged tunnel full of sirens
export const mkSiren = (parent: THREE.Object3D, pos: THREE.Vector3, inward: THREE.Vector3, col: string, ph: number) => {
  const grp = new THREE.Group(); grp.position.copy(pos); grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), inward); parent.add(grp);
  const base = new THREE.Mesh(CYL, lam("#2a2a32")); base.scale.set(0.2, 0.1, 0.2); base.position.y = 0.05; grp.add(base);
  const dome = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: hot(col, 1.2) })); dome.scale.set(0.16, 0.17, 0.16); dome.position.y = 0.17; dome.layers.set(NOINK); grp.add(dome);
  const beams = [0, Math.PI / 2].map((a) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: radialTex("doms_beam", [[0, "rgba(255,255,255,.9)"], [0.5, "rgba(255,255,255,.35)"], [1, "rgba(255,255,255,0)"]]), color: hot(col, 1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.position.y = 0.17; m.rotation.y = a; m.layers.set(NOINK); m.renderOrder = 3; grp.add(m); return m; });
  return (t: number) => { const a = t * 7 + ph; beams.forEach((m, i) => { m.rotation.y = a + (i * Math.PI) / 2; }); (dome.material as THREE.MeshBasicMaterial).color.copy(hot(col, 0.8 + 1.2 * Math.max(0, Math.sin(a * 2)))); };
};
export const tunnelWall = (k: Kit, radius: number, len: number, z0: number, y: number) => {
  const tex = repM("tunTex", () => fiberTex("doms_fiber", "#b8262c", "#7a1219", "#d9484a"), 3, 10);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 40, 1, true), lam("#ffffff", tex, { side: THREE.BackSide })); m.rotation.x = Math.PI / 2; m.position.set(0, y, z0 - len / 2); m.receiveShadow = true; k.g.add(m);
  for (let z = z0 - 1; z > z0 - len; z -= 1.7) { const r = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.02, 0.1, 8, 40), lam("#8a141c")); r.position.set(0, y, z); k.g.add(r); }
};
export const S7: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.gym;
  const stage = new THREE.Group(); g.add(stage); const sk = new Kit(stage); gymSet(sk);
  const tun = new THREE.Group(); g.add(tun); const tk = new Kit(tun);
  tunnelWall(tk, 1.7, 90, 12, 1.3);
  const sirens: ((t: number) => void)[] = [];
  for (let i = 0; i < 18; i++) { const phi = (i * 2.4) % (Math.PI * 2), r = 1.66, z = 9 - i * 2.1, pos = new THREE.Vector3(r * Math.cos(phi), 1.3 + r * Math.sin(phi), z); sirens.push(mkSiren(tun, pos, new THREE.Vector3(-Math.cos(phi), -Math.sin(phi), 0), i % 2 ? "#ff2a2a" : "#2a6aff", i)); }
  const rig = w.rig("tito");
  const spot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radialTex("doms_inflam", [[0, "rgba(255,40,40,1)"], [0.55, "rgba(230,30,40,.9)"], [0.8, "rgba(255,120,90,.5)"], [1, "rgba(255,120,90,0)"]]), transparent: true, depthWrite: false })); spot.layers.set(NOINK); spot.renderOrder = 6; stage.add(spot);
  const skin = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: "#b8262c", side: THREE.DoubleSide })); skin.layers.set(NOINK); skin.renderOrder = 7; stage.add(skin);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), cp = new THREE.Vector3(), mid = new THREE.Vector3();
  const SW = 0.5;
  return {
    g, env, cInf: 7,
    focus: (o) => (stage.visible ? o.copy(mid) : o.set(0, 1.3, -6 - 0)),
    update(c) {
      const inTun = c.t >= SW;
      stage.visible = !inTun; tun.visible = inTun;
      if (inTun) { sirens.forEach((s) => s(c.t)); return; }
      w.put(rig, stage, { action: "idle", t: c.t + 0.6, expression: "effort", sweat: 0.6, mouthOpen: c.mouth, position: [0, 0, 0], yaw: 0.0 }, c.cam, tintOf(env));
      w.wa(rig, "hipR", a); w.wa(rig, "kneeR", b); mid.lerpVectors(a, b, 0.5); c.cam.getWorldPosition(cp);
      const toCam = new THREE.Vector3(cp.x - mid.x, 0, cp.z - mid.z).normalize();
      const pulse = 1 + 0.08 * Math.sin(c.t * 22); spot.position.copy(mid).addScaledVector(toCam, 0.07); spot.lookAt(cp.x, mid.y, cp.z); spot.scale.setScalar(0.3 * pulse);
      // when the camera is practically inside the inflamed spot, a red plane fills the lens (the cut into the tunnel is hidden inside it)
      skin.position.copy(mid).addScaledVector(toCam, 0.09); skin.lookAt(cp.x, mid.y, cp.z); skin.visible = false;
    },
  };
};

// ================================================================ 8 (0:19-0:22) panic: hard-hat workers with fire extinguishers
const extinguisher = (parent: THREE.Object3D) => {
  const grp = new THREE.Group(); parent.add(grp); const gk = new Kit(grp);
  gk.cyl(0.095, 0.38, 0, -0.1, 0, "#d9262c"); gk.cyl(0.1, 0.06, 0, 0.12, 0, "#2a2a30"); gk.box(0.05, 0.05, 0.2, 0, 0.19, 0.03, "#2a2a30"); gk.cyl(0.02, 0.38, 0, 0.0, 0.14, "#2a2a30", { rx: Math.PI / 2 }); gk.cyl(0.05, 0.12, 0, 0.0, 0.34, "#2a2a30", { rx: Math.PI / 2 });
  gk.cyl(0.02, 0.5, 0, -0.1, 0.1, "#1a1a20", { rz: 0.0 }).visible = false;
  return grp;
};
export const S8: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.red;
  k.floor(70, repM("fireFloor", () => fiberTex("doms_fiber2", "#9c2a30", "#6a161c", "#c04a4c"), 10, 10), "#ffffff");
  const cave = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 80, 40, 1, true), lam("#ffffff", repM("tunTex2", () => fiberTex("doms_fiber", "#b8262c", "#7a1219", "#d9484a"), 6, 6), { side: THREE.BackSide })); cave.rotation.x = Math.PI / 2; cave.position.set(0, 3, -6); g.add(cave);
  const flames = [[-3.6, -3.6, 2.1], [-1.2, -4.2, 2.6], [1.8, -3.9, 2.3], [4.2, -3.4, 1.9], [-5.2, -2.5, 1.5]].map(([x, z, s]) => mkFlame(k, x, z, s));
  const sirens = [0, 1, 2, 3].map((i) => mkSiren(g, new THREE.Vector3(-5 + 3.3 * i, 6.5, -6.2), new THREE.Vector3(0, -1, 0.3).normalize(), i % 2 ? "#ff2a2a" : "#2a6aff", i));
  const ws = [
    { rig: w.rig("w0"), x: -5.6, z: 0.4, yaw: Math.PI / 2, sp: 0.5 }, { rig: w.rig("w1"), x: 5.6, z: -1.0, yaw: -Math.PI / 2, sp: 0.5 }, { rig: w.rig("w2"), x: -4.0, z: 1.8, yaw: Math.PI / 2, sp: 0.62 },
  ].map((o, i) => ({ ...o, ext: extinguisher(g), foam: new Puffs(g, 26, "#ffffff"), i }));
  const hr = new THREE.Vector3(), nz = new THREE.Vector3(), cpw8 = new THREE.Vector3();
  return {
    g, env, cInf: 8,
    focus: (o) => o.set(0, 1.2, 0.3),
    update(c) {
      c.cam.getWorldPosition(cpw8); flames.forEach((f) => f(c.t, cpw8)); sirens.forEach((s) => s(c.t));
      ws.forEach((q) => {
        w.put(q.rig, g, { action: "run", t: c.t + q.i * 0.2, speed: q.sp, expression: "shocked", mouthOpen: 0.5 + 0.5 * Math.abs(Math.sin(c.t * 9 + q.i)), sweat: 1, travel: true, position: [q.x, 0, q.z], yaw: q.yaw, outfit: { helmet: true, shirt: ["#f28a1e", "#e8523a", "#f2c21e"][q.i] } }, c.cam, tintOf(env));
        w.wa(q.rig, "handR", hr); const sx = Math.sign(Math.sin(q.yaw));
        q.ext.position.copy(hr).add(new THREE.Vector3(sx * 0.1, 0.0, 0.0)); q.ext.rotation.y = sx > 0 ? 0 : Math.PI;
        nz.copy(hr).add(new THREE.Vector3(sx * 0.42, 0.0, 0.0));
        for (let j = 0; j < 26; j++) { const age = (c.t * 1.6 + j / 26) % 0.8, seed = Math.floor(c.t * 1.6 + j / 26) * 31 + j; const vx = sx * (2.2 + 1.2 * hh(seed, 1)), vy = 0.6 + 0.8 * hh(seed, 2), vz = -(1.2 + 1.2 * hh(seed, 3)) + (hh(seed, 4) - 0.5) * 0.8;
          q.foam.set(j, nz.x + vx * age, nz.y + vy * age - 4.2 * age * age, nz.z + vz * age, 0.035 + 0.2 * age, 1 - age / 0.8); }
      });
    },
  };
};
void labelTex; void tileTex; void easeIn; void spring; void S;
