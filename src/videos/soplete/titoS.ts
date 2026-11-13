// (Short 4 copy of ventana/titoV.ts with extra exports, pose "bucket" and a scorch option) Tito, version gym (Flat 2D cel-shaded, estilo v5), 100 % procedural y articulado por piezas con la clase Pen de la plantilla.
// Vestuario: camiseta de tirantes roja (tank top), short de deporte oscuro, calcetin blanco y zapatillas; pelo marrón con una cinta
// blanca (sweatband) en la frente; brazos y piernas de piel con contorno negro (cuando se hinchan los biceps o caen gotas se ve todo).
//  - titoFront: de pie (tarjeta 600 x 1000, suelas en y = 975): poses "hips", "flex" (doble biceps), "hang".
//  - titoBench: tumbado en el banco (tarjeta 1300 x 760, suelo en y = 740, superficie del banco en y = 476): piernas dobladas, pies en el
//    suelo, dos brazos articulados empujando la barra. La tarjeta se coloca con la orientacion FIJA del banco 3D (sin billboard).
// Expresiones: dots (ojos negros con brillo), effort (ceno + boca abierta + sudor), dazed (espirales), grin, shock, worried.
import { Pen, thickAngle, blobPts } from "../alejandro/toon";

export type P2 = [number, number];
export type TitoExpr = "dots" | "effort" | "dazed" | "grin" | "shock" | "worried" | "terror" | "cough" | "chill";
let WET = 0;   // wet hair after the shower (set per call in titoFront)
export const SKIN = "#F3C79E", SKIN_SH = "#D49E73", SKIN_FAR = "#E3B287";
export const HAIR = "#5A3B2A", HAIR_SH = "#3D281C";
export const RED = "#EF4444", RED_SH = "#B42A2A", RED_DK = "#8F1F1F";
export const SHORT = "#2C303B", SHORT_SH = "#1B1E27", WHITE = "#FFFFFF", WH_SH = "#CDD2E0", BLACK = "#111114";
export const MOUTH = "#4A141C", TONGUE = "#E86E78", SWEAT = "#8FD3FF";
export const rad = (d: number) => (d * Math.PI) / 180;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp2 = (a: P2, b: P2, t: number): P2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 56): P2[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });
export const rotAbout = (q: P2, a: number, c: P2): P2 => [c[0] + (q[0] - c[0]) * Math.cos(a) - (q[1] - c[1]) * Math.sin(a), c[1] + (q[0] - c[0]) * Math.sin(a) + (q[1] - c[1]) * Math.cos(a)];
export const drop = (p: Pen, x: number, y: number, s = 1) =>
  p.poly([[x, y - 22 * s], [x + 12 * s, y + 4 * s], [x, y + 18 * s], [x - 12 * s, y + 4 * s]], SWEAT, 4);

/** an arm as ONE smooth shape: deltoid blending into the shoulder, a bicep bulge on the top side, narrowing to the elbow */
export const limb = (p: Pen, S: P2, E: P2, w: number, bulge: number, delt: number, fill: string, shade: string, light: number, thick: number) => {
  const n = 16, L = Math.hypot(E[0] - S[0], E[1] - S[1]) || 1, ux = (E[0] - S[0]) / L, uy = (E[1] - S[1]) / L;
  let nx = uy, ny = -ux; if (ny > 0) { nx = -nx; ny = -ny; }
  const top: P2[] = [], bot: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, sn = Math.sin(Math.PI * t);
    const wTop = (w / 2) * (1 + bulge * Math.pow(sn, 1.15) + delt * Math.pow(1 - t, 2)), wBot = (w / 2) * (1 + 0.14 * sn + delt * 0.5 * Math.pow(1 - t, 2.5));
    const c: P2 = [S[0] + ux * L * t, S[1] + uy * L * t];
    top.push([c[0] + nx * wTop, c[1] + ny * wTop]); bot.push([c[0] - nx * wBot, c[1] - ny * wBot]);
  }
  const poly = [...top, ...bot.reverse()];
  p.gradFill(poly, fill, shade, light); p.inkRing(poly, 11, thick, 0.3);
};

/** head: ears, skin, messy brown hair, white sweatband, face (centred at cx, cy) */
export const head = (p: Pen, cx: number, cy: number, expr: TitoExpr, lid: number, light: number, thick: number) => {
  const rx = 90, ry = 100;
  for (const s of [-1, 1]) { const ep = ellPts(cx + s * (rx - 2), cy + 12, 17, 24, 24); p.shadedFill(ep, SKIN, SKIN_SH, light, 20); p.inkRing(ep, 9, thick, 0.3); }
  const hp = ellPts(cx, cy, rx, ry);
  p.shadedFill(hp, SKIN, SKIN_SH, light, rx); p.inkRing(hp, 11, thick, 0.3);
  // hair: a cap with a few untidy tufts and a wavy hairline
  const hair: P2[] = [];
  for (let a = 186; a <= 354; a += 6) { const r = 1.06 + 0.06 * Math.sin(a * 0.31) + (a % 24 === 6 ? 0.1 : 0); hair.push([cx + (rx + 4) * r * Math.cos(rad(a)), cy - 4 + (ry + 6) * r * Math.sin(rad(a))]); }
  for (let k = 0; k <= 10; k++) { const t = k / 10; hair.push([cx + rx * (0.94 - 1.88 * t), cy - ry * (0.5 - 0.08 * Math.sin(t * Math.PI * 2))]); }
  p.gradFill(hair, WET > 0.5 ? "#3A2A22" : HAIR, WET > 0.5 ? "#241913" : HAIR_SH, light); p.inkRing(hair, 11, thick, 0.3);
  // sweatband across the forehead
  const y = cy - ry * 0.42, band: P2[] = [[cx - rx * 0.97, y + 14], [cx - rx * 0.5, y + 3], [cx, y - 1], [cx + rx * 0.5, y + 3], [cx + rx * 0.97, y + 14]];
  p.line(band, WHITE, 26);
  p.stroke(band.map(([x, yy]) => [x, yy + 1] as P2), 7, RED);
  face(p, cx, cy + 6, expr, lid);
};

/** the face (skin ellipse centred at cx, cy): expressive black eyes with a shine, separate eyebrows, mouth */
export const face = (p: Pen, cx: number, cy: number, expr: TitoExpr, lid: number) => {
  const ex = 34, ey = cy - 2, eyeH = 15 * (1 - 0.92 * Math.min(1, lid));
  const eye = (x: number, y: number, rx: number, ry: number) => {
    p.ell(x, y, rx, Math.max(3, ry), BLACK, 0);
    if (lid < 0.5) { p.ell(x - rx * 0.32, y - ry * 0.38, rx * 0.34, rx * 0.34, WHITE, 0); }
  };
  const brow = (s: number, a: P2, b: P2) => p.stroke([[cx + s * a[0], ey + a[1]], [cx + s * b[0], ey + b[1]]], 12, BLACK);
  if (expr === "dots") {
    for (const s of [-1, 1]) { eye(cx + s * ex, ey, 10, eyeH); brow(s, [58, -30], [18, -32]); }
  } else if (expr === "effort") {                                   // frown, squinting eyes, open mouth
    for (const s of [-1, 1]) { eye(cx + s * ex, ey + 4, 14, 7); brow(s, [64, -38], [14, -12]); }
    p.ell(cx, cy + 54, 31, 23, MOUTH, 7);
    p.poly([[cx - 25, cy + 38], [cx + 25, cy + 38], [cx + 21, cy + 47], [cx - 21, cy + 47]], WHITE, 0);
    p.ell(cx, cy + 67, 17, 9, TONGUE, 0);
  } else if (expr === "dazed") {                                    // spiral eyes, slack mouth, tongue out
    for (const s of [-1, 1]) {
      const pts: P2[] = [];
      for (let t = 0; t <= Math.PI * 6.2; t += 0.25) { const r = 2 + t * 1.5, a = t * -s; pts.push([cx + s * ex + r * Math.cos(a), ey + r * Math.sin(a)]); }
      p.stroke(pts, 5.5, BLACK);
    }
    p.stroke([[cx - 62, ey - 30], [cx - 18, ey - 22]], 8, BLACK); p.stroke([[cx + 62, ey - 22], [cx + 18, ey - 30]], 8, BLACK);
    p.ell(cx + 4, cy + 56, 25, 21, MOUTH, 7);
    p.ell(cx + 14, cy + 78, 13, 17, TONGUE, 6);
  } else if (expr === "grin") {
    for (const s of [-1, 1]) { eye(cx + s * ex, ey, 11, 15); brow(s, [58, -36], [18, -44]); }
    p.ell(cx, cy + 36, 40, 34, MOUTH, 7, 12, 168);
    p.ell(cx, cy + 52, 22, 9, TONGUE, 0, 190, 350);
  } else if (expr === "terror") {                                   // absolute terror: huge white eyes, tiny pupils, screaming mouth
    for (const s of [-1, 1]) { p.ell(cx + s * ex, ey - 4, 22, 28, WHITE, 6); p.dot(cx + s * ex, ey - 2, 5, BLACK); brow(s, [64, -52], [10, -64]); }
    p.ell(cx, cy + 58, 30, 36, MOUTH, 8); p.poly([[cx - 22, cy + 30], [cx + 22, cy + 30], [cx + 18, cy + 42], [cx - 18, cy + 42]], WHITE, 0);
    p.ell(cx, cy + 78, 18, 11, TONGUE, 0);
    p.stroke([[cx + 112, cy - 40], [cx + 128, cy - 52]], 6, SWEAT); p.stroke([[cx - 112, cy - 40], [cx - 128, cy - 52]], 6, SWEAT);
  } else if (expr === "cough") {                                    // squeezed eyes, wide-open wavy mouth
    for (const s of [-1, 1]) { p.stroke([[cx + s * ex + s * 18, ey - 8], [cx + s * ex - s * 12, ey + 2], [cx + s * ex + s * 18, ey + 12]], 9, BLACK); brow(s, [60, -34], [16, -20]); }
    p.ell(cx, cy + 56, 34, 28, MOUTH, 7); p.ell(cx, cy + 70, 19, 11, TONGUE, 0);
  } else if (expr === "chill") {                                    // relaxed: closed happy eyes, soft smile
    for (const s of [-1, 1]) { p.arc(cx + s * ex, ey + 6, 14, 10, 200, 340, 8, BLACK); brow(s, [58, -30], [18, -34]); }
    p.arc(cx, cy + 32, 32, 22, 20, 160, 8, BLACK);
  } else if (expr === "shock") {
    for (const s of [-1, 1]) { p.ell(cx + s * ex, ey - 2, 17, 22, WHITE, 6); eye(cx + s * ex, ey, 7, 11); brow(s, [58, -46], [14, -52]); }
    p.ell(cx, cy + 56, 17, 25, MOUTH, 7);
  } else {                                                          // worried
    for (const s of [-1, 1]) { eye(cx + s * ex, ey, 10, eyeH); p.stroke([[cx + s * 58, ey - 24], [cx + s * 16, ey - 42]], 9, BLACK); }
    p.arc(cx, cy + 74, 24, 13, 200, 340, 6, BLACK);
  }
};

export const sneaker = (p: Pen, ax: number, topY: number, dir: number, light: number, thick: number) => {
  // ax = ankle x, topY = top of the shoe, dir = +1 toe to the right / -1 to the left, soles at y = 978 (standing) -> pass topY accordingly
  const rel: P2[] = [[-38, 0], [40, 0], [40, 40], [76, 48], [80, 82], [-40, 82]];
  const pts = rel.map(([x, y]) => [ax + dir * x, topY + y] as P2);
  p.gradFill(pts, WHITE, WH_SH, light); p.inkRing(pts, 11, thick, 0.3);
  p.poly([[ax - dir * 40, topY + 68], [ax + dir * 80, topY + 68], [ax + dir * 80, topY + 82], [ax - dir * 40, topY + 82]].map(([x, y]) => [x, y] as P2), RED, 0);   // red sole stripe
  p.stroke([[ax + dir * 4, topY + 12], [ax + dir * 24, topY + 22]], 4, BLACK); p.stroke([[ax + dir * 4, topY + 26], [ax + dir * 24, topY + 36]], 4, BLACK);   // laces
};

/** a big water bottle held by the hand H (local frame: the bottle axis along -y, grip at the origin); deg rotates it about the hand */
const bottleDraw = (p: Pen, H: P2, deg: number, level: number, light: number, thick: number, shaker = false) => {
  const a = rad(deg), R = (pts: P2[]) => pts.map(([x, y]) => rotAbout([H[0] + x, H[1] + y], a, H));
  const body = R([[-38, 46], [38, 46], [42, -76], [34, -116], [18, -138], [-18, -138], [-34, -116], [-42, -76]]);
  p.gradFill(body, shaker ? "#E9E2D6" : "#D6F1FF", shaker ? "#B8AE9C" : "#8FC8EE", light); p.inkRing(body, 9, thick, 0.3);
  const top = Math.max(-132, 46 - (46 + 132) * Math.max(0.04, Math.min(1, level)));
  p.clip(body, () => { p.poly(R([[-50, 52], [50, 52], [50, top], [-50, top]]), shaker ? "#8A5A3A" : "#46B0EA", 0); });
  p.poly(R([[-19, -138], [19, -138], [19, -158], [-19, -158]]), shaker ? RED : WHITE, 8);          // cap
  p.stroke(R([[-40, -30], [40, -30]]), 18, shaker ? RED : "#2F6FD9");                              // label band
  p.stroke(R([[-24, 30], [-26, -90]]), 6, "rgba(255,255,255,0.7)");                // shine
};


// ---------------------------------------------------------------- props
const withRot = (p: Pen, fn: (g: CanvasRenderingContext2D) => void) => {
  const g = p.g; g.save();
  if (p.rot) { const r = p.rot; g.translate(r[1] + (r.length > 3 ? r[3] : 0), r[2] + (r.length > 4 ? r[4] : 0)); g.rotate(r[0]); g.translate(-r[1], -r[2]); }
  fn(g); g.restore();
};
/** dumbbell centred at (x, y), rotated by deg */
const dumbbell = (p: Pen, x: number, y: number, deg: number, light: number, thick: number) => {
  const a = rad(deg), R = (pts: P2[]) => pts.map(([dx, dy]) => rotAbout([x + dx, y + dy], a, [x, y]));
  p.poly(R([[-64, -9], [64, -9], [64, 9], [-64, 9]]), "#9AA0AE", 8);
  for (const s of [-1, 1]) {
    const w = R([[s * 62, -52], [s * 100, -52], [s * 100, 52], [s * 62, 52]]);
    p.gradFill(w, "#3A3F4E", "#1C1F28", light); p.inkRing(w, 9, thick, 0.3);
    p.stroke(R([[s * 70, -40], [s * 70, 40]]), 8, RED);
  }
};
const proteinTub = (p: Pen, x: number, y: number, light: number, thick: number) => {
  const body: P2[] = [[x - 74, y - 96], [x + 74, y - 96], [x + 70, y + 92], [x - 70, y + 92]];
  p.gradFill(body, RED, RED_SH, light); p.inkRing(body, 10, thick, 0.3);
  p.poly([[x - 80, y - 118], [x + 80, y - 118], [x + 78, y - 94], [x - 78, y - 94]], WHITE, 9);
  p.poly([[x - 56, y - 40], [x + 56, y - 40], [x + 56, y + 40], [x - 56, y + 40]], WHITE, 6);
  withRot(p, (g) => { g.font = "900 26px Arial Black, Impact, sans-serif"; g.textAlign = "center"; g.fillStyle = RED_DK; g.fillText("PRO", x, y - 4); g.fillText("TEIN", x, y + 26); });
};
/** big funnel sticking out of the mouth to the right; powder keeps pouring in */
const funnel = (p: Pen, cx: number, light: number, thick: number, ph: number) => {
  const A: P2 = [cx + 6, 296], B: P2 = [cx + 176, 262], d = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(d[0], d[1]), ux = d[0] / L, uy = d[1] / L, nx = -uy, ny = ux;
  const at = (t: number, r: number): P2 => [A[0] + ux * t + nx * r, A[1] + uy * t + ny * r];
  const tube = [at(0, -10), at(64, -10), at(64, 10), at(0, 10)];
  const cone = [at(60, -11), at(L, -54), at(L, 54), at(60, 11)];
  p.poly(tube, "#F4C430", 8); p.gradFill(cone, "#FFD84A", "#D49A12", light); p.inkRing(cone, 9, thick, 0.3);
  p.ell(B[0], B[1], 17, 54, "#7A5A10", 8);
  for (let i = 0; i < 9; i++) { const q = (ph * 2.2 + i / 9) % 1; p.dot(B[0] - 6 + 10 * Math.sin(i * 2.3), 150 + q * 110, 6 + (i % 3) * 2, "#F6EBD0"); }
  p.ell(B[0], B[1] - 30, 12, 30, "#F6EBD0", 5);
};
const scoop = (p: Pen, H: P2, ph: number) => {
  const a = rad(-70 + 24 * Math.sin(ph * Math.PI * 2)), bowl: P2 = [H[0] - 56, H[1] - 22];
  const R = (pts: P2[]) => pts.map(([x, y]) => rotAbout([bowl[0] + x, bowl[1] + y], a, bowl));
  p.line([H, bowl], "#C9CCD2", 14);
  p.poly(R([[-30, -6], [30, -6], [26, 22], [0, 32], [-26, 22]]), "#E8EAF0", 8);
  p.ell(bowl[0], bowl[1] - 4, 30, 14, "#F6EBD0", 5);
};
const plate = (p: Pen, x: number, y: number, light: number, thick: number) => {
  p.ell(x, y, 112, 28, "#F4F6FA", 9);
  const rice = ellPts(x - 34, y - 14, 48, 28, 24); p.shadedFill(rice, "#FFFFFF", "#D3D8E4", light, 48); p.inkRing(rice, 7, thick, 0.3);
  for (let i = 0; i < 10; i++) p.stroke([[x - 70 + (i * 13) % 70, y - 20 + (i * 7) % 20], [x - 62 + (i * 13) % 70, y - 17 + (i * 7) % 20]], 3, "#A9AFC0");
  const ch = ellPts(x + 38, y - 16, 40, 26, 24); p.shadedFill(ch, "#C8843E", "#8F5A26", light, 40); p.inkRing(ch, 7, thick, 0.3);
  p.stroke([[x + 18, y - 28], [x + 30, y - 8]], 4, "#6B3F18"); p.stroke([[x + 40, y - 32], [x + 52, y - 10]], 4, "#6B3F18");
  p.line([[x + 72, y - 24], [x + 100, y - 40]], "#F2EAD8", 12); p.dot(x + 104, y - 44, 9, "#F2EAD8");
};
const fork = (p: Pen, H: P2, M: P2) => {
  p.line([H, M], "#C9CCD2", 10);
  p.ell(M[0] - 2, M[1] + 2, 26, 20, "#C8843E", 6);
};
/** the bomb-style timer strapped to the chest: red dynamite sticks, black box, red LCD */
const bombTimer = (p: Pen, cx: number, y0: number, txt: string, pop: number, flash: number) => {
  const sc = Math.max(0.05, pop), X = (x: number) => cx + (x - cx) * sc, Y = (y: number) => y0 + (y - y0) * sc;
  const pt = (x: number, y: number): P2 => [X(x), Y(y)];
  const rect = (x0: number, y0_: number, x1: number, y1: number): P2[] => [pt(x0, y0_), pt(x1, y0_), pt(x1, y1), pt(x0, y1)];
  p.stroke([pt(cx - 96, y0 - 40), pt(cx - 70, 346)], 14 * sc, BLACK); p.stroke([pt(cx + 96, y0 - 40), pt(cx + 70, 346)], 14 * sc, BLACK);
  for (const dx of [-92, 0, 92]) {
    p.poly(rect(cx + dx - 25, y0 - 104, cx + dx + 25, y0 - 30), "#D9373B", 8);
    p.poly(rect(cx + dx - 25, y0 - 78, cx + dx + 25, y0 - 54), "#F2D9A8", 5);
    p.stroke([pt(cx + dx, y0 - 104), pt(cx + dx + 8, y0 - 126), pt(cx + dx - 4, y0 - 142)], 5 * sc, "#6B4A2A");
    if (flash > 0.5 && dx === 0) p.dot(X(cx + dx - 4), Y(y0 - 146), 9 * sc, "#FFB23A");
  }
  p.poly(rect(cx - 134, y0 - 38, cx + 134, y0 + 86), "#242836", 10);
  p.poly(rect(cx - 110, y0 - 22, cx + 110, y0 + 50), "#05070C", 6);
  withRot(p, (g) => {
    g.font = `bold ${Math.round(58 * sc)}px 'Courier New', Consolas, monospace`; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.shadowColor = "#FF2A2A"; g.shadowBlur = 14 * sc; g.fillStyle = flash > 0.5 ? "#FF6A5A" : "#FF3434"; g.fillText(txt, X(cx), Y(y0 + 36));
  });
  p.dot(X(cx - 100), Y(y0 + 68), 7 * sc, flash > 0.5 ? "#FF3B3B" : "#4A1010"); p.dot(X(cx + 100), Y(y0 + 68), 7 * sc, "#3DDC84");
  p.stroke([pt(cx - 60, y0 + 70), pt(cx + 60, y0 + 70)], 6 * sc, "#6B7287");
};
/** cough: a burst of beige powder puffs fanning out from the mouth */
const powderCloud = (p: Pen, mx: number, my: number, k: number) => {
  const g = p.g, a = Math.max(0, 1 - k * k * k);
  g.save(); g.globalAlpha = a;
  for (let i = 0; i < 9; i++) {
    const ang = rad([-12, 12, 38, 64, 90, 116, 142, 168, 192][i] + 8 * Math.sin(i * 2.7)), r = (56 + 150 * k) * (0.7 + 0.3 * ((i * 37) % 10) / 10), rr = 22 + 34 * k * (0.7 + 0.3 * ((i * 53) % 10) / 10);
    p.ell(mx + Math.cos(ang) * r, my + Math.sin(ang) * r * 0.9 - 20 * k, rr, rr * 0.9, i % 2 ? "#EFE3C6" : "#F8F0DC", 6);
  }
  g.restore();
};


/** tiny plastic beach bucket hanging from the hand H by its handle (the whole point of the joke: it is TINY) */
export const beachBucket = (p: Pen, H: P2, ph: number, light: number, thick: number) => {
  const a = rad(-8 + 34 * Math.sin(ph * Math.PI * 2)), R = (pts: P2[]) => pts.map(([x, y]) => rotAbout([H[0] + x, H[1] + y], a, H));
  p.stroke(R([[-40, 62], [-34, 6], [0, -10], [34, 6], [40, 62]]), 9, "#8D949C");                          // handle (from the fist)
  const body = R([[-52, 60], [52, 60], [40, 140], [-40, 140]]);
  p.gradFill(body, "#EF4444", "#B42A2A", light); p.inkRing(body, 9, thick, 0.3);
  p.clip(body, () => { p.poly(R([[-60, 90], [60, 90], [60, 112], [-60, 112]]), "#FFD23F", 0); });
  p.poly(R([[-56, 52], [56, 52], [56, 68], [-56, 68]]), "#FFD23F", 7);                                      // rim
  p.ell(H[0], H[1] + 56, 40, 9, "#E8B100", 0, 0, 360, (a * 180) / Math.PI);                                // yellow fat in the bucket
};
/** burnt patches on the tank top + rising smoke puffs */
export const scorchMarks = (p: Pen, tank: P2[], cx: number, k: number, ph: number) => {
  p.clip(tank, () => {
    const blobs: [number, number, number, number][] = [[cx + 8, 560, 70, 52], [cx - 52, 520, 36, 30], [cx + 66, 506, 34, 26], [cx + 4, 478, 26, 20], [cx - 12, 600, 40, 26]];
    blobs.forEach(([x, y, rx, ry], i) => {
      const s = Math.min(1, Math.max(0, k * 1.4 - i * 0.12)); if (s <= 0) return;
      const pts: P2[] = Array.from({ length: 22 }, (_, j) => { const a = (j / 22) * Math.PI * 2, r = 1 + (j % 2 ? 0.22 : -0.1) + 0.08 * Math.sin(j * 1.7 + i); return [x + rx * s * r * Math.cos(a), y + ry * s * r * Math.sin(a)] as P2; });
      p.poly(pts, i === 0 ? "#120A08" : "#2A1710", 0);
      const rim: P2[] = pts.map(([px, py]) => [x + (px - x) * 1.14, y + (py - y) * 1.14] as P2);
      p.stroke([...rim, rim[0]], 4, "#7A2A12");
    });
    if (k > 0.5) p.ell(cx + 8, 566, 28 * k, 20 * k, "#F3C79E", 0);                                        // a hole: skin shows through
    for (let i = 0; i < 6; i++) p.dot(cx - 60 + i * 24, 540 + ((i * 37) % 90), 3.2, i % 2 ? "#FFB23A" : "#FF6A2A");   // embers
  });
  for (let i = 0; i < 4; i++) {
    const q = (ph + i / 4) % 1, x = cx - 20 + 40 * i + 14 * Math.sin(q * 6 + i), y = 520 - q * 300, r = (16 + 30 * q) * k;
    if (r > 1) { p.g.save(); p.g.globalAlpha = 0.7 * (1 - q); p.ell(x, y, r, r * 0.9, i % 2 ? "#3A3A44" : "#555563", 5); p.g.restore(); }
  }
};

// ============================================================ standing
export type FrontOpts = {
  pose: "hips" | "flex" | "hang" | "run" | "drink" | "up" | "throw" | "curl" | "scoop" | "eat" | "thumb" | "panic" | "bucket"; expr: TitoExpr; light: number;
  curl?: number;    // 0..1 forearm raise (pose "curl")
  db?: number;      // 1 = dumbbell in the right hand (pose "curl")
  dbFree?: [number, number, number];   // a dumbbell lying / falling on the floor: card x, y (centre), rotation in degrees
  timer?: string;   // text of the bomb timer strapped to the chest ("" = none)
  timerPop?: number; timerFlash?: number;
  cloud?: number;   // 0..1 powder cloud puffing out of the mouth
  scoopPh?: number; // 0..1 scoop pouring phase (pose "scoop")
  towel?: number; wet?: number; shaker?: boolean; hand?: number;   // hand: tremble offset of the raised hand (pose "thumb")
  bag?: number;     // 1 = trash bag worn over the tank top (sauna suit)
  run?: number;     // running cycle 0..1 (pose "run")
  drip?: number;    // seconds, animates sweat streaming down (when sweat >= 1)
  bottle?: number;  // water level 0..1 of the bottle (poses "drink" / "up")
  pump?: number;    // 0..1 biceps bulge while flexing
  big?: number;     // 0..1 the tank top gets tight: wider chest and arms, muscle shows through
  sweat?: number; blink?: number; tilt?: number; headTilt?: number;
  scorch?: number;  // 0..1 burnt patches + smoke on the tank top
  smokePh?: number; // 0..1 phase of the smoke puffs
  hat?: boolean;
};

export const titoFront = (p: Pen, o: FrontOpts) => {
  const { pose, expr, light, pump = 0, big = 0, sweat = 0, blink = 0, tilt = 0, headTilt = 0, bag = 0, run = 0, drip = 0, bottle = 0.7, curl = 0, db = 0, timer = "", timerPop = 1, timerFlash = 0, cloud = 0, scoopPh = 0, towel = 0, wet = 0, shaker = false, hand = 0, scorch = 0, smokePh = 0 } = o;
  WET = wet;
  p.ol = 11;
  const thick = thickAngle(light), cx = 300, topY = 352, hemY = 655 - 14 * big;
  const aT = 112 * (1 + 0.34 * big), aS = aT * 0.93;
  // ---- legs: skin, dark shorts, white socks, sneakers (never tilted) ----
  p.rot = null;
  for (const s of [-1, 1]) {
    const lx = cx + s * 54, lift = pose === "run" ? Math.max(0, Math.sin(2 * Math.PI * (run + (s > 0 ? 0.5 : 0)))) : 0;
    const ay = 890 - 118 * lift, kx = lx + s * (4 + 26 * lift), ky = 780 - 60 * lift;
    p.line([[lx, 660], [kx, ky], [lx + s * 2, ay]], SKIN, 50);
    p.stroke([[lx + s * 2, ay - 22], [lx + s * 2, ay + 6]], 52, WHITE);
    sneaker(p, lx + s * 2 - s * 6, ay + 2, s, light, thick);
    p.line([[lx, 645], [lx + s * (2 + 10 * lift), 772 - 55 * lift]], SHORT, 80);
  }
  // ---- upper body: tilts about the hips ----
  p.rot = tilt ? [rad(tilt), cx, 650] : null;
  const ts = blobPts(cx, 470, { a: aT * 0.98, b: 122, nTop: 2.2, nBot: 2.6, egg: 0.08, asym: 0, rot: 0, noise: 0.004, seed: 5 });
  p.gradFill(ts, SKIN, SKIN_SH, light); p.inkRing(ts, 11, thick, 0.3);              // bare shoulders and chest
  const arm = (s: number) => {                                                     // [shoulder, elbow, hand]
    const S: P2 = [cx + s * (aS - 8), topY + 46];
    let E: P2, H: P2;
    if (pose === "flex") { E = [cx + s * (aS + 96), topY + 26]; H = [cx + s * (aS + 84), topY - 112]; }
    else if (pose === "run") { const sw = Math.sin(2 * Math.PI * (run + (s > 0 ? 0 : 0.5))), up = Math.max(0, sw), dn = Math.max(0, -sw); E = [cx + s * (aS + 46 + 10 * up), 505 - 28 * up]; H = [cx + s * (aS + 6 - 6 * up), 548 - 92 * up + 30 * dn]; }
    else if (pose === "panic") { E = [cx + s * (aS + 96 + hand * s), 396]; H = [cx + s * (aS + 118 + hand * 1.4 * s), 258 - 0.6 * hand]; }
    else if (pose === "curl") {
      if (s > 0) { const a = 2.8 * curl, E0: P2 = [cx + aS + 44, 520]; E = E0; H = [E0[0] - 0.35 * Math.sin(a) * 135, E0[1] + Math.cos(a) * 135]; }
      else { E = [cx - (aS + 36), 522]; H = [cx - (aS + 30), 640]; }
    }
    else if (pose === "scoop") {
      if (s > 0) { E = [cx + aS + 86, 372]; H = [cx + aS + 108, 222 + 10 * Math.sin(scoopPh * Math.PI * 2)]; }
      else { E = [cx - aS - 56, 484]; H = [cx - 138, 566]; }
    }
    else if (pose === "eat") {
      if (s > 0) { E = [cx + aS + 74, 456]; H = [cx + 74, 338 + 6 * Math.sin(scoopPh * Math.PI * 2)]; }
      else { E = [cx - aS - 58, 474]; H = [cx - 112, 536]; }
    }
    else if (pose === "thumb") {
      if (s > 0) { E = [cx + aS + 74 + hand, 404]; H = [cx + aS + 62 + hand * 1.6, 246 + hand * 0.6]; }
      else { E = [cx - (aS + 60), 482]; H = [cx - (aS - 12), 552]; }
    }
    else if (pose === "drink" && s > 0) { E = [cx + aS + 74, 456]; H = [cx + 70, 330]; }
    else if (pose === "up" && s > 0) { E = [cx + aS + 74, 404]; H = [cx + aS + 60, 242]; }
    else if (pose === "throw" && s < 0) { E = [cx - aS - 78, 408]; H = [cx - aS - 172, 326]; }
    else if (pose === "drink" || pose === "up" || pose === "throw") { E = [cx + s * (aS + 60), 482]; H = [cx + s * (aS - 12), 552]; }
    else if (pose === "bucket") {
      if (s > 0) { E = [cx + aS + 84, 468]; H = [cx + aS + 130 + 36 * Math.sin(scoopPh * Math.PI * 2), 500 + 80 * Math.sin(scoopPh * Math.PI * 2)]; }
      else { E = [cx - (aS + 60), 482]; H = [cx - (aS - 12), 552]; }
    }
    else if (pose === "hips") { E = [cx + s * (aS + 60), 482]; H = [cx + s * (aS - 12), 552]; }
    else { E = [cx + s * (aS + 36), 522]; H = [cx + s * (aS + 30), 640]; }
    return { S, E, H };
  };
  const w = 56 * (1 + 0.18 * big + 0.12 * pump);
  const bulgeK = pose === "flex" ? 0.3 + 0.5 * pump + 0.16 * big : 0.1 + 0.2 * big, deltK = pose === "flex" ? 0.42 : 0.12 + 0.3 * big;
  for (const s of [-1, 1]) { const { S, E } = arm(s); limb(p, S, E, w, pose === "curl" && s > 0 ? 0.16 + 0.62 * curl : bulgeK, pose === "curl" && s > 0 ? 0.3 + 0.2 * curl : deltK, SKIN, SKIN_SH, light, thick); }   // upper arms, behind the tank top
  // tank top (red) with armholes and a deep neckline
  const sw = aT;
  const tank: P2[] = [[cx - 62, 346], [cx - 30, 346], [cx - 36, 414], [cx, 458], [cx + 36, 414], [cx + 30, 346], [cx + 62, 346],
    [cx + sw * 0.8, 402], [cx + sw * 0.88, 470], [cx + sw * 0.96, 560], [cx + sw * 0.9, hemY + 8], [cx - sw * 0.9, hemY + 8], [cx - sw * 0.96, 560], [cx - sw * 0.88, 470], [cx - sw * 0.8, 402]];
  p.gradFill(tank, RED, RED_SH, light); p.inkRing(tank, 11, thick, 0.3);
  p.clip(tank, () => {
    p.stroke([[cx - sw, hemY - 34], [cx + sw, hemY - 34]], 8, WHITE); p.stroke([[cx - sw, hemY - 16], [cx + sw, hemY - 16]], 5, WHITE);
    if (big > 0.05) for (const s of [-1, 1]) {                                     // muscle shows through the tight fabric
      p.arc(cx + s * 56, 492, 62, 38, s > 0 ? 8 : 20, s > 0 ? 160 : 172, 5, RED_DK);
      for (let k = 0; k < 2; k++) p.stroke([[cx + s * (sw * 0.8), 430 + k * 22], [cx + s * (sw * 0.62), 438 + k * 22]], 3.5, RED_DK);
    }
  });
  if (scorch > 0.01) scorchMarks(p, tank, cx, scorch, smokePh);
  // shorts waistband over the hem
  const wb: P2[] = [[cx - sw * 0.9, hemY - 6], [cx + sw * 0.9, hemY - 6], [cx + sw * 0.86, hemY + 50], [cx - sw * 0.86, hemY + 50]];
  p.gradFill(wb, SHORT, SHORT_SH, light); p.inkRing(wb, 10, thick, 0.3);
  p.stroke([[cx - sw * 0.88, hemY + 6], [cx + sw * 0.88, hemY + 6]], 6, WH_SH);
  if (bag > 0.01) {                                                                 // black trash bag = the "sauna suit"
    const bw = aT * 1.06, hy = hemY + 56;
    const bg: P2[] = [[cx - 64, 340], [cx - 28, 340], [cx - 28, 378], [cx, 394], [cx + 28, 378], [cx + 28, 340], [cx + 64, 340], [cx + bw * 0.78, 396], [cx + bw * 1.02, 470], [cx + bw * 1.1, 570], [cx + bw * 1.0, hy - 10],
      [cx + bw * 0.62, hy + 16], [cx + bw * 0.2, hy - 4], [cx - bw * 0.2, hy + 14], [cx - bw * 0.62, hy - 6], [cx - bw * 1.0, hy + 10], [cx - bw * 1.1, 570], [cx - bw * 1.02, 470], [cx - bw * 0.78, 396]];
    p.gradFill(bg, "#2A2D38", "#0F1015", light); p.inkRing(bg, 11, thick, 0.3);
    p.clip(bg, () => {
      p.stroke([[cx - bw * 0.8, 430], [cx - bw * 0.45, 560]], 6, "#6B7287"); p.stroke([[cx + bw * 0.3, 410], [cx + bw * 0.62, 520]], 5, "#6B7287");   // glossy highlights
      for (let k = 0; k < 5; k++) p.stroke([[cx - bw + k * bw * 0.5, 470 + 18 * (k % 2)], [cx - bw * 0.7 + k * bw * 0.5, 520 + 18 * (k % 2)]], 3, "#07080B");   // crinkles
    });
    p.stroke([[cx - bw * 0.98, hemY + 2], [cx + bw * 0.98, hemY + 2]], 10, "#8D949C");   // cinched at the waist
    p.poly([[cx + 40, hemY - 6], [cx + 78, hemY - 36], [cx + 88, hemY + 4]], "#1A1C24", 7);
  }
  if (towel > 0.01) {                                                               // white towel hanging over both shoulders
    const tw = (s: number): P2[] => [[cx + s * 20, 338], [cx + s * 78, 338], [cx + s * 74, 560], [cx + s * 22, 570]];
    for (const s of [-1, 1]) { p.gradFill(tw(s), WHITE, WH_SH, light); p.inkRing(tw(s), 10, thick, 0.3); p.stroke([[cx + s * 30, 520], [cx + s * 68, 516]], 5, RED); }
    p.stroke([[cx - 78, 346], [cx + 78, 346]], 26, WHITE);
  }
  if (timer) bombTimer(p, cx, 548, timer, timerPop, timerFlash);
  // forearms and hands (in front of the tank): skin fists with finger lines, no gloves
  for (const s of [-1, 1]) {
    const { E, H } = arm(s);
    p.line([E, H], SKIN, w * 0.9);
    p.dot(E[0], E[1], w * 0.42, SKIN);
    if (s > 0 && (pose === "drink" || pose === "up")) bottleDraw(p, H, pose === "drink" ? -64 : -4, bottle, light, thick, shaker);
    if (s > 0 && pose === "curl" && db > 0) dumbbell(p, H[0], H[1], 0, light, thick);
    if (s < 0 && pose === "scoop") proteinTub(p, cx - 210, 596, light, thick);
    if (s < 0 && pose === "eat") plate(p, cx - 130, 520, light, thick);
    if (s > 0 && pose === "eat") fork(p, H, [cx + 14, 300]);
    if (s > 0 && pose === "scoop") scoop(p, H, scoopPh);
    if (s > 0 && pose === "bucket") beachBucket(p, H, scoopPh, light, thick);
    const fp = ellPts(H[0], H[1], 34, 38);
    p.shadedFill(fp, SKIN, SKIN_SH, light, 36); p.inkRing(fp, 10, thick, 0.3);
    for (const dy of [-10, 2, 14]) p.stroke([[H[0] - 18, H[1] + dy], [H[0] + 8, H[1] + dy]], 4, BLACK);
    if (s > 0 && pose === "thumb") { const tp = ellPts(H[0] + 2, H[1] - 46, 14, 30, 24); p.shadedFill(tp, SKIN, SKIN_SH, light, 30); p.inkRing(tp, 9, thick, 0.3); }
  }
  // ---- neck + head (the head tilts a little more) ----
  const nk = ellPts(cx, topY + 4, 36, 30, 28); p.shadedFill(nk, SKIN, SKIN_SH, light, 36); p.inkRing(nk, 9, thick, 0.3);
  if (headTilt) { const c = rotAbout([cx, 330], rad(tilt), [cx, 650]); p.rot = [rad(tilt + headTilt), cx, 330, c[0] - cx, c[1] - 330]; }
  head(p, cx, 232, expr, blink, light, thick);
  if (pose === "scoop") funnel(p, cx, light, thick, scoopPh);
  if (cloud > 0.01) powderCloud(p, cx, 300, cloud);
  const nd = Math.ceil(Math.max(0, Math.min(1, sweat)) * 3);
  if (nd >= 1) drop(p, cx - 128, 210); if (nd >= 2) drop(p, cx + 134, 258, 1.1); if (nd >= 3) drop(p, cx + 100, 130, 0.9);
  if (sweat >= 0.99) for (let i = 0; i < 7; i++) { const ph = (drip * 0.9 + i * 0.143) % 1; drop(p, cx + [-150, -118, 150, 124, -70, 70, 0][i], 200 + ph * 470, 0.9); }   // drenched
  p.rot = null;
  if (o.dbFree) dumbbell(p, o.dbFree[0], o.dbFree[1], o.dbFree[2], light, thick);
};

// ============================================================ on the bench
export type BenchOpts = { raise: number; expr: TitoExpr; light: number; sweat?: number; shake?: number; blink?: number };
export const BENCH_SURFACE = 476;

export const titoBench = (p: Pen, o: BenchOpts) => {
  const { raise, expr, light, sweat = 0, shake = 0, blink = 0 } = o;
  p.ol = 11;
  const thick = thickAngle(light);
  // legs: knees up on the bench edge, sneakers flat on the floor (far leg a touch behind)
  const leg = (dx: number, dy: number, skin: string, skinSh: string) => {
    const hip: P2 = [790 + dx, 436 + dy], knee: P2 = [930 + dx, 338 + dy], ankle: P2 = [1052 + dx, 676];
    p.line([hip, knee, ankle], skin, 52);
    p.stroke([[ankle[0] - 2, 666], [ankle[0], 690]], 54, WHITE);
    sneaker(p, ankle[0] + 4, 660, 1, light, thick);
    p.line([hip, lerp2(hip, knee, 0.58)], SHORT, 84);                         // shorts leg
    void skinSh;
  };
  leg(36, -8, SKIN_FAR, SKIN_SH);
  leg(0, 0, SKIN, SKIN_SH);
  // torso lying on its back: bare shoulder + red tank top + dark shorts at the hips
  const sh = ellPts(472, 408, 46, 62, 30); p.shadedFill(sh, SKIN, SKIN_SH, light, 50); p.inkRing(sh, 10, thick, 0.3);
  const tp = blobPts(646, 410, { a: 160, b: 66, nTop: 2.4, nBot: 2.6, egg: 0, asym: 0, rot: 0, noise: 0.004, seed: 7 });
  p.gradFill(tp, RED, RED_SH, light); p.inkRing(tp, 11, thick, 0.3);
  p.clip(tp, () => { p.stroke([[700, 360], [700, 470]], 7, WHITE); p.stroke([[724, 360], [724, 470]], 5, WHITE); });
  const sp = blobPts(806, 424, { a: 66, b: 64, nTop: 2.4, nBot: 2.4, egg: 0, asym: 0, rot: 0, noise: 0.004, seed: 9 });
  p.gradFill(sp, SHORT, SHORT_SH, light); p.inkRing(sp, 11, thick, 0.3);
  head(p, 360, 380, expr, blink, light, thick);
  // both arms push the bar (bare skin): the near arm in front, the far one behind and a bit darker
  const hy = lerp(338, 96, raise), hx = 536 + shake;
  const arm = (dx: number, skin: string, skinSh: string) => {
    const S: P2 = [516 + dx, 374], H: P2 = [hx + dx, hy];
    const E: P2 = [H[0] - 54 * (1 - raise) - 14, (S[1] + hy) / 2 + 28 * (1 - raise)];
    p.line([E, H], skin, 50);
    limb(p, S, E, 58, 0.22 + 0.3 * raise, 0.35, skin, skinSh, light, thick);
    return H;
  };
  arm(22, SKIN_FAR, SKIN_SH);
  const H = arm(0, SKIN, SKIN_SH);
  const R = 100;
  p.ell(H[0] + 14, H[1] - 4, R, R, "#1C1F28", 8);
  p.ell(H[0], H[1], R, R, "#2F3340", 9);
  p.ell(H[0], H[1], R * 0.66, R * 0.66, RED, 6);
  p.ell(H[0], H[1], R * 0.17, R * 0.17, "#C9CCD2", 4);
  const fp = ellPts(H[0] - 60, H[1] + 38, 32, 32, 24); p.shadedFill(fp, SKIN, SKIN_SH, light, 32); p.inkRing(fp, 9, thick, 0.3);   // fist on the grip
  const nd = Math.ceil(Math.max(0, Math.min(1, sweat)) * 3);
  if (nd >= 1) drop(p, 226, 322); if (nd >= 2) drop(p, 500, 296, 1.1); if (nd >= 3) drop(p, 236, 236, 0.9);
};
