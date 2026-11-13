// New flat cel-shaded cards for the DYNAMIC cut of "The Fasted Cardio Myth" (same Pen system + thick ink as Tito / the pigeon).
//  bear (WIDE), the brain accountant (BODY), blowtorch, butter belly, insulin gauge, battery, question mark, cobweb, floor crack, pale tint.
import { Pen, thickAngle } from "../alejandro/toon";
import { P2 } from "../soplete/titoS";
import { pigeonDoc, DocOpts } from "../fasted/cards";

const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 48, wob = 0, seed = 0): P2[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, k = 1 + wob * Math.sin(a * 7 + seed) + wob * 0.6 * Math.sin(a * 11 + 2 * seed); return [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)] as P2; });
const BLACK = "#111114", WHITE = "#ffffff";

// ---------------------------------------------------------------- zombie pale tint with a strength k (0 = healthy Tito, 1 = zombie): card 600 x 1000
export const paleTint = (p: Pen, k: number, bags = k) => {
  if (k <= 0.01 && bags <= 0.01) return;
  const g = p.g;
  g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(150,196,150,${(0.4 * k).toFixed(3)})`; g.fillRect(-3000, -3000, 8000, 8000); g.restore();
  g.save();
  for (const s of [-1, 1]) {                                          // giant dark eye bags
    g.fillStyle = `rgba(70,45,95,${(0.6 * bags).toFixed(3)})`; g.beginPath(); g.ellipse(300 + s * 36, 262, 36, 16, 0, 0, 7); g.fill();
    g.strokeStyle = `rgba(50,30,70,${(0.7 * bags).toFixed(3)})`; g.lineWidth = 4; g.beginPath(); g.ellipse(300 + s * 36, 266, 30, 12, 0, 0.2, Math.PI - 0.2); g.stroke();
  }
  g.restore();
};
/** cobwebs on the shoulders + head (card 600 x 1000) */
export const webs = (p: Pen) => {
  const g = p.g; g.save(); g.lineCap = "round"; g.strokeStyle = "rgba(240,240,248,0.95)"; g.lineWidth = 3.5;
  for (const [ax, ay, s] of [[188, 372, -1], [412, 372, 1], [222, 150, -1]] as const) {
    const tips: P2[] = [[ax + s * 84, ay - 4], [ax + s * 74, ay + 62], [ax + s * 28, ay + 104], [ax - s * 22, ay + 96], [ax - s * 52, ay + 50]];
    g.beginPath(); for (const [x, y] of tips) { g.moveTo(ax, ay); g.lineTo(x, y); } g.stroke();
    for (const k of [0.4, 0.7, 1.0]) { g.beginPath(); tips.forEach(([x, y], i) => { const qx = ax + (x - ax) * k, qy = ay + (y - ay) * k; if (i) g.lineTo(qx, qy); else g.moveTo(qx, qy); }); g.stroke(); }
  }
  g.restore();
};

// ---------------------------------------------------------------- the BEAR (WIDE card 2000 x 1400, floor y = 1375, centre x = 1000)
export const bear = (p: Pen, o: { light: number; roar: number; arms: number }) => {
  const { light, roar, arms } = o, th = thickAngle(light), cx = 1000;
  const FUR = "#8B5A2B", FUR_SH = "#5E3A1A", MUZ = "#E0B07A";
  p.ol = 14;
  // arms (behind the body): shoulders -> raised paws with claws
  for (const s of [-1, 1]) {
    const S: P2 = [cx + s * 270, 700], E: P2 = [cx + s * (430 + 40 * arms), 600 - 120 * arms], H: P2 = [cx + s * (500 + 30 * arms), 430 - 170 * arms];
    p.line([S, E, H], FUR, 130);
    const paw = ellPts(H[0], H[1], 78, 70); p.shadedFill(paw, FUR, FUR_SH, light, 78); p.inkRing(paw, 13, th, 0.3);
    for (let k = -1; k <= 1; k++) p.poly([[H[0] + k * 34 - 10, H[1] - 58], [H[0] + k * 40, H[1] - 120], [H[0] + k * 34 + 10, H[1] - 58]], "#F4F1EA", 7);
    p.ell(H[0], H[1] + 10, 34, 26, "#3A2414", 0);
  }
  // body + legs
  for (const s of [-1, 1]) p.line([[cx + s * 160, 1060], [cx + s * 190, 1340]], FUR, 170);
  const body = ellPts(cx, 900, 340, 400, 64, 0.012, 3); p.shadedFill(body, FUR, FUR_SH, light, 360); p.inkRing(body, 14, th, 0.3);
  const belly = ellPts(cx, 960, 210, 280); p.shadedFill(belly, "#B07840", FUR_SH, light, 220);
  // head
  for (const s of [-1, 1]) { const e = ellPts(cx + s * 190, 250, 80, 76); p.shadedFill(e, FUR, FUR_SH, light, 80); p.inkRing(e, 13, th, 0.3); p.ell(cx + s * 190, 256, 40, 38, "#C98A5A", 0); }
  const hd = ellPts(cx, 440, 260, 230, 64, 0.015, 7); p.shadedFill(hd, FUR, FUR_SH, light, 260); p.inkRing(hd, 14, th, 0.3);
  // angry eyes + brows
  for (const s of [-1, 1]) {
    p.ell(cx + s * 100, 380, 36, 30, "#FFF4C2", 8); p.dot(cx + s * 96, 386, 15, BLACK);
    p.stroke([[cx + s * 160, 318], [cx + s * 46, 352]], 22, BLACK);
  }
  // muzzle + roaring mouth
  const m = ellPts(cx, 520, 150, 120); p.shadedFill(m, MUZ, "#B98450", light, 150); p.inkRing(m, 12, th, 0.3);
  p.ell(cx, 462, 52, 34, BLACK, 0);
  const open = 30 + 120 * roar;
  p.ell(cx, 560 + open * 0.3, 92, open * 0.55 + 10, "#5A1018", 10);
  if (roar > 0.15) {
    p.ell(cx, 572 + open * 0.55, 46, open * 0.18 + 4, "#E86E78", 0);
    for (let k = -2; k <= 2; k++) {
      const x = cx + k * 34, yt = 560 + open * 0.3 - (open * 0.55 + 10) + 6, yb = 560 + open * 0.3 + (open * 0.55 + 10) - 6;
      p.poly([[x - 13, yt], [x + 13, yt], [x, yt + 30]], WHITE, 5); p.poly([[x - 13, yb], [x + 13, yb], [x, yb - 28]], WHITE, 5);
    }
  }
  // drool
  if (roar > 0.5) { p.stroke([[cx - 60, 600 + open * 0.5], [cx - 64, 680 + open * 0.6]], 9, "#cfe8ff"); p.dot(cx - 64, 690 + open * 0.6, 10, "#cfe8ff"); }
};

// ---------------------------------------------------------------- the BRAIN accountant (BODY card 600 x 1000, soles at y = 975)
/** shake = head turn -1..1 (shaking "no"), pull = 0..1 the right hand pulls the lever (hand from [508, 330] down to [508, 492]), mood: 0 calm / 1 stern */
export const brainGuy = (p: Pen, o: { light: number; shake: number; pull: number; mood: number; blink?: number; hand?: [number, number] }) => {
  const { light, shake, pull, mood, blink = 0 } = o, th = thickAngle(light), cx = 300 + 14 * shake, hy = 300;
  const PK = "#F29BB4", PK_SH = "#C9668A", SUIT = "#2F3A56", SUIT_SH = "#1E2638";
  p.ol = 11;
  // stick legs + shoes (mostly hidden by the desk) and the suit body
  for (const s of [-1, 1]) { p.line([[300 + s * 40, 700], [300 + s * 46, 950]], "#1E2638", 34); p.ell(300 + s * 60, 958, 44, 20, BLACK, 0); }
  const torso: P2[] = [[220, 520], [380, 520], [400, 720], [200, 720]];
  p.gradFill(torso, SUIT, SUIT_SH, light); p.inkRing(torso, 11, th, 0.3);
  p.poly([[300, 520], [275, 560], [300, 690], [325, 560]], WHITE, 7); p.poly([[292, 548], [308, 548], [312, 640], [300, 662], [288, 640]], "#EF4444", 6);
  // left arm resting on the desk, right arm reaching up to the lever
  p.line([[225, 548], [150, 620], [190, 690]], SUIT, 38); p.ell(196, 694, 26, 22, "#F3C79E", 8);
  const H: P2 = o.hand ?? [508, 330 + 162 * pull], E: P2 = [Math.min(575, H[0] + 50), Math.max(H[1] + 90, 480)];
  // the brain head: lumpy pink, folds
  const B = ellPts(cx, hy, 205, 170, 72, 0.035, 2); p.shadedFill(B, PK, PK_SH, light, 205); p.inkRing(B, 12, th, 0.3);
  const g = p.g; g.save(); p.clip(B, () => {
    g.strokeStyle = PK_SH; g.lineWidth = 8; g.lineCap = "round";
    g.beginPath(); g.moveTo(cx, hy - 170); g.bezierCurveTo(cx - 20, hy - 100, cx + 20, hy - 60, cx, hy - 10); g.stroke();
    for (const [x, y, r, a] of [[-120, -80, 50, 0.3], [-60, -120, 40, 1.8], [90, -100, 55, 2.6], [140, -20, 40, 0.8], [-150, 10, 36, 2.2], [60, -40, 30, 4]] as const) {
      g.beginPath(); g.arc(cx + x, hy + y, r, a, a + 3.6); g.stroke();
    }
  }); g.restore();
  // face: round accountant glasses, green visor, eyes, mouth
  const ey = hy + 40;
  for (const s of [-1, 1]) {
    p.ell(cx + s * 62, ey, 44, 44, "#EAF6FF", 9);
    const eh = Math.max(3, 16 * (1 - 0.9 * blink));
    p.ell(cx + s * 62 + 6 * shake, ey + 4, 13, eh, BLACK, 0); p.dot(cx + s * 62 + 6 * shake - 5, ey - 4, 4, WHITE);
    p.stroke([[cx + s * 100, ey - 54 + 10 * mood], [cx + s * 28, ey - 58 - 14 * mood]], 10, BLACK);
  }
  p.stroke([[cx - 18, ey], [cx + 18, ey]], 7, BLACK);
  p.poly([[cx - 190, hy - 60], [cx + 190, hy - 60], [cx + 230, hy - 110], [cx - 230, hy - 110]], "#2F9E5A", 9);
  p.stroke([[cx - 200, hy - 66], [cx + 200, hy - 66]], 6, "#0E3B20");
  if (mood > 0.5) p.stroke([[cx - 40, ey + 92], [cx, ey + 82], [cx + 40, ey + 92]], 9, BLACK);
  else p.arc(cx, ey + 74, 34, 18, 20, 160, 8, BLACK);
  // the right arm reaching the lever, drawn over the head
  p.line([[375, 548], E, H], SUIT, 38);
  const hp = ellPts(H[0], H[1], 36, 32); p.shadedFill(hp, "#F3C79E", "#D49E73", light, 36); p.inkRing(hp, 10, th, 0.3);
  for (const dy of [-10, 2, 14]) p.stroke([[H[0] - 20, H[1] + dy], [H[0] + 8, H[1] + dy]], 4, BLACK);
};

// ---------------------------------------------------------------- blowtorch (fx 512 x 256, nozzle on the right, `s` = -1 mirrors it), flickering flame
export const torchFx = (p: Pen, ph: number, s: number) => {
  const g = p.g; g.save(); if (s < 0) { g.translate(512, 0); g.scale(-1, 1); }
  p.ol = 7;
  p.poly([[20, 104], [150, 104], [150, 172], [20, 172]], "#E53935", 7);                  // gas tank
  p.ell(20, 138, 18, 34, "#B71C1C", 7);
  p.poly([[150, 124], [250, 120], [250, 150], [150, 152]], "#9AA3AE", 6);                  // body
  p.poly([[250, 126], [300, 128], [300, 144], [250, 146]], "#5B6270", 6);                  // nozzle
  p.poly([[176, 104], [196, 80], [212, 104]], "#2F3340", 5);
  const L = 150 + 40 * Math.sin(ph * 6.283), w = 34 + 8 * Math.sin(ph * 12.6 + 1);
  const fl = (len: number, wd: number, col: string) => { g.beginPath(); g.moveTo(300, 136 - wd); g.quadraticCurveTo(300 + len * 0.6, 136 - wd * 1.3, 300 + len, 136 + 6 * Math.sin(ph * 20)); g.quadraticCurveTo(300 + len * 0.6, 136 + wd * 1.3, 300, 136 + wd); g.closePath(); g.fillStyle = col; g.fill(); };
  fl(L * 1.05, w, "rgba(255,120,30,0.95)"); fl(L * 0.75, w * 0.66, "#FFD24A"); fl(L * 0.4, w * 0.36, "#FFFFFF");
  g.restore();
};
/** the giant butter block on Tito's belly (card 600 x 1000), melt 0..1 = drips + softening */
export const butterBelly = (p: Pen, melt: number, ph: number) => {
  const g = p.g, top = 448 + 20 * melt, sag = 26 * melt;
  const blk: P2[] = [[178, top], [422, top], [430, 640 + sag], [300, 650 + sag * 1.4], [170, 640 + sag]];
  p.poly(blk, "#FFE27A", 10);
  p.poly([[178, top], [422, top], [404, top + 34], [196, top + 34]], "#FFF1AE", 0);
  g.save(); g.globalAlpha = 0.5; p.stroke([[210, top + 60], [230, 600]], 10, "#ffffff"); g.restore();
  for (let i = 0; i < 6; i++) {                                                            // drips
    const x = 190 + i * 44, len = (30 + 80 * ((i * 37) % 5) / 5) * melt + 10 * melt * Math.sin(ph * 6.28 + i);
    if (len > 4) { p.line([[x, 640 + sag], [x, 640 + sag + len]], "#FFD84A", 20); p.dot(x, 650 + sag + len, 14, "#FFD84A"); }
  }
};
/** a falling butter drop (fx 128 x 128) */
export const butterDrop = (p: Pen) => { p.ol = 6; p.ell(64, 72, 30, 40, "#FFD84A", 6); p.ell(54, 58, 7, 11, "#ffffff", 0); };

// ---------------------------------------------------------------- the car-style INSULIN gauge on Tito's chest (card 600 x 1000), level 0 (LOW) .. 1 (HIGH)
export const insulinGauge = (p: Pen, level: number) => {
  const g = p.g, cx = 300, cy = 560, R = 118;
  p.ell(cx, cy, R + 14, R + 14, "#1B1F2A", 10);
  const seg = (a0: number, a1: number, col: string) => { g.beginPath(); g.arc(cx, cy, R - 18, a0, a1); g.strokeStyle = col; g.lineWidth = 26; g.lineCap = "butt"; g.stroke(); };
  seg(Math.PI, Math.PI * 1.36, "#3DFF7A"); seg(Math.PI * 1.36, Math.PI * 1.68, "#FFD23F"); seg(Math.PI * 1.68, Math.PI * 2, "#FF4D4D");
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; p.stroke([[cx + (R - 44) * Math.cos(a), cy + (R - 44) * Math.sin(a)], [cx + (R - 58) * Math.cos(a), cy + (R - 58) * Math.sin(a)]], 5, WHITE); }
  g.font = "bold 30px 'Courier New', Consolas, monospace"; g.textAlign = "center"; g.fillStyle = WHITE; g.fillText("INSULIN", cx, cy + 50);
  g.font = "bold 22px 'Courier New', Consolas, monospace"; g.fillStyle = "#3DFF7A"; g.fillText("LOW", cx - 80, cy + 18); g.fillStyle = "#FF4D4D"; g.fillText("HIGH", cx + 80, cy + 18);
  const a = Math.PI + Math.PI * Math.max(0.03, Math.min(0.97, level));
  p.line([[cx, cy], [cx + (R - 30) * Math.cos(a), cy + (R - 30) * Math.sin(a)]], "#FF3B3B", 10);
  p.dot(cx, cy, 16, "#2F3340");
};

// ---------------------------------------------------------------- small fx
/** battery charging (fx 320 x 180), k = 0..1 */
export const batteryFx = (p: Pen, k: number) => {
  const g = p.g, col = k > 0.66 ? "#3DFF7A" : k > 0.33 ? "#FFD23F" : "#FF4D4D";
  p.poly([[20, 30], [270, 30], [270, 150], [20, 150]], "#1B1F2A", 12); p.poly([[270, 66], [298, 66], [298, 114], [270, 114]], "#1B1F2A", 10);
  if (k > 0.01) { g.fillStyle = col; g.fillRect(40, 50, 210 * Math.min(1, k), 80); }
  g.font = "900 64px Arial Black, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 10; g.strokeStyle = BLACK; g.fillStyle = WHITE;
  const t = `${Math.round(k * 100)}%`; g.strokeText(t, 145, 94); g.fillText(t, 145, 94);
};
/** a bold "?" (fx 160 x 200) */
export const qmarkFx = (p: Pen) => { const g = p.g; g.font = "900 190px Arial Black, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 16; g.strokeStyle = BLACK; g.fillStyle = "#FFD23F"; g.strokeText("?", 80, 104); g.fillText("?", 80, 104); };
/** a corner cobweb (fx 256 x 256) */
export const cobwebFx = (p: Pen) => {
  const g = p.g; g.strokeStyle = "rgba(245,245,250,0.95)"; g.lineWidth = 3; g.lineCap = "round";
  const ax = 128, ay = 128, R = 120;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + R * Math.cos(a), ay + R * Math.sin(a)); g.stroke(); }
  for (const k of [0.25, 0.45, 0.65, 0.85]) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2, r = R * k * (i % 2 ? 0.92 : 1); if (i) g.lineTo(ax + r * Math.cos(a), ay + r * Math.sin(a)); else g.moveTo(ax + r * Math.cos(a), ay + r * Math.sin(a)); } g.stroke(); }
  p.dot(ax + 10, ay + 30, 9, BLACK); p.stroke([[ax + 10, ay + 21], [ax + 10, ay]], 2, BLACK);   // the little spider
};
/** a floor crack under the splat (flat fx 512 x 512) */
export const crackFx = (p: Pen) => {
  const g = p.g; g.strokeStyle = "#3A2414"; g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3 * Math.sin(i * 3), segs = 4; let x = 256, y = 256;
    g.lineWidth = 9; g.beginPath(); g.moveTo(x, y);
    for (let k = 1; k <= segs; k++) { const r = 55 * k, j = 0.25 * Math.sin(i * 7 + k * 3); x = 256 + r * Math.cos(a + j); y = 256 + r * Math.sin(a + j); g.lineTo(x, y); g.lineWidth = 9 - k * 1.6; }
    g.stroke();
  }
};
/** an impact burst (fx 500 x 500), t 0..1 */
export const burstFx = (p: Pen, t: number) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.12 * (i % 2), r0 = 60, r1 = r0 + 170 * e * (0.7 + 0.3 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.16), c + r0 * 0.5 * Math.sin(a + 0.16)], [c + r1 * Math.cos(a), c + r1 * Math.sin(a)], [c + r0 * 0.5 * Math.cos(a - 0.16), c + r0 * 0.5 * Math.sin(a - 0.16)]], "#FFF3B0", Math.max(3, 8 * (1 - t)));
  }
};

// ---------------------------------------------------------------- Dr. Pigeon throwing (WIDE card): the doctor pigeon + a wing swinging up on the left (towards Tito)
export const pigeonThrow = (p: Pen, o: DocOpts & { wing: number }) => {
  pigeonDoc(p, { ...o, sign: 0 });
  const g = p.g; g.save(); g.translate(700, 400);
  const w = o.wing, S: P2 = [300 - 110, 770], E: P2 = [300 - 190 - 30 * w, 760 - 120 * w], H: P2 = [300 - 210 - 50 * w, 720 - 260 * w];
  p.ol = 10; p.line([S, E, H], "#8E96A8", 54); p.ell(H[0], H[1], 34, 26, "#8E96A8", 9);
  g.restore();
};
