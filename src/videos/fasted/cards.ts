// Character / effect cards for "The Fasted Cardio Myth" that do not exist in the other shorts. Same flat cel-shaded Pen system as Tito (soplete/titoS.ts = ventana/titoV.ts)
// and the official pigeon (sudar/pigeon.ts, ventana/pigeonDr.ts): everything is drawn on a card and planted in the 3D world by world.ts.
import { Pen, thickAngle } from "../alejandro/toon";
import { P2 } from "../soplete/titoS";

const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 48): P2[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });
const GR = "#8E96A8", GR_SH = "#69708A", LT = "#D3D8E4", BEAK = "#F5A524", PINK = "#E88AA0", RED = "#EF4444", BLACK = "#111114";

// ---------------------------------------------------------------- zombie Tito: green-pale tint over the whole sprite + dark eye bags + cobwebs on both shoulders + ball and chain
/** call AFTER titoFront() on the same Pen (600 x 1000 card, soles at y = 975). `run` = running phase 0..1 (the shackled left foot) */
export const zombify = (p: Pen, o: { run?: number; webs?: boolean; chain?: boolean } = {}) => {
  const g = p.g, { run = 0, webs = true, chain = true } = o;
  g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(150,196,150,0.38)"; g.fillRect(-3000, -3000, 8000, 8000); g.restore();
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  for (const s of [-1, 1]) { g.fillStyle = "rgba(60,50,90,0.55)"; g.beginPath(); g.ellipse(300 + s * 40, 258, 34, 14, 0, 0, 7); g.fill(); }   // dark eye bags
  if (webs) for (const s of [-1, 1]) {
    const ax = 300 + s * 112, ay = 372;                                    // the cobweb hangs from each shoulder
    g.strokeStyle = "rgba(240,240,248,0.92)"; g.lineWidth = 3.5;
    const tips: P2[] = [[ax + s * 84, ay - 4], [ax + s * 74, ay + 62], [ax + s * 28, ay + 104], [ax - s * 22, ay + 96], [ax - s * 52, ay + 50]];
    g.beginPath(); for (const [x, y] of tips) { g.moveTo(ax, ay); g.lineTo(x, y); } g.stroke();
    for (const k of [0.4, 0.7, 1.0]) { g.beginPath(); tips.forEach(([x, y], i) => { const qx = ax + (x - ax) * k, qy = ay + (y - ay) * k; if (i) g.lineTo(qx, qy); else g.moveTo(qx, qy); }); g.stroke(); }
  }
  if (chain) {                                                             // ball and chain on the left ankle
    const lift = Math.max(0, Math.sin(2 * Math.PI * run)), ax = 244, ay = 890 - 118 * lift, bx = 96, by = 928 - 40 * lift;
    g.strokeStyle = "#120c0c"; g.fillStyle = "#8d949c"; g.lineWidth = 7;
    g.beginPath(); g.arc(ax, ay + 4, 22, 0, 7); g.stroke();                // shackle
    for (let i = 1; i <= 4; i++) { const t = i / 5, x = ax + (bx - ax) * t, y = ay + 10 + (by - ay - 10) * t + 26 * Math.sin(Math.PI * t); g.beginPath(); g.ellipse(x, y, 17, 10, 0.3, 0, 7); g.fill(); g.stroke(); }
    g.beginPath(); g.arc(bx - 30, by + 18, 58, 0, 7); g.fillStyle = "#2b2f3a"; g.fill(); g.lineWidth = 9; g.stroke();
    g.beginPath(); g.ellipse(bx - 46, by + 2, 18, 11, -0.6, 0, 7); g.fillStyle = "rgba(255,255,255,0.35)"; g.fill();
  }
  g.restore();
};

// ---------------------------------------------------------------- the banana (held, thrown): a yellow crescent
export const banana = (p: Pen, x: number, y: number, rot = 0, sc = 1) => {
  const g = p.g;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.lineJoin = "round"; g.lineCap = "round";
  g.beginPath(); g.moveTo(-70, -10); g.bezierCurveTo(-60, 48, 40, 64, 78, -34); g.bezierCurveTo(52, 8, -20, 24, -48, -34); g.closePath();
  g.fillStyle = "#FFE135"; g.fill(); g.strokeStyle = "#120c0c"; g.lineWidth = 9; g.stroke();
  g.beginPath(); g.moveTo(-60, -14); g.quadraticCurveTo(-20, 30, 50, 4); g.strokeStyle = "rgba(190,140,0,0.55)"; g.lineWidth = 6; g.stroke();
  g.fillStyle = "#6a4a1a"; g.beginPath(); g.rect(72, -48, 18, 22); g.fill(); g.lineWidth = 6; g.stroke();
  g.restore();
};
/** thrown banana as an fx card (128 x 128) */
export const bananaFx = (p: Pen) => { p.ol = 8; banana(p, 64, 64, -0.5, 0.78); };
/** an expanding shock-wave ring (256 x 256), `a` = opacity level 0..1 */
export const ringFx = (p: Pen, a: number) => { const g = p.g; g.save(); g.lineCap = "round"; g.strokeStyle = `rgba(255,235,200,${a})`; g.lineWidth = 7; g.beginPath(); g.ellipse(128, 128, 112, 112, 0, 0, 7); g.stroke(); g.strokeStyle = `rgba(255,120,60,${a * 0.7})`; g.lineWidth = 3; g.beginPath(); g.ellipse(128, 128, 96, 96, 0, 0, 7); g.stroke(); g.restore(); };
/** a tiny sweat / energy drop (128 x 128) */
export const dropFx = (p: Pen) => { p.ol = 6; p.ell(64, 70, 34, 44, "#9BE3FF", 6); p.ell(52, 56, 8, 12, "#ffffff", 0); };

// ---------------------------------------------------------------- Dr. Pigeon: white doctor coat + head mirror + a medium technical sign (WIDE card, floor y = 1375, card centre x = 1000)
export type DocOpts = { light: number; blink?: number; sign?: number };
const fitText = (g: CanvasRenderingContext2D, t: string, maxW: number, fs: number) => { g.font = `900 ${fs}px Arial Black, Impact, sans-serif`; while (g.measureText(t).width > maxW && fs > 20) { fs -= 2; g.font = `900 ${fs}px Arial Black, Impact, sans-serif`; } return fs; };
export const pigeonDoc = (p: Pen, o: DocOpts) => {
  const { light, blink = 0, sign = 0 } = o, g = p.g;
  g.save(); g.translate(700, 400);                       // pigeon on the 600 x 1000 grid, centred in the wide card
  p.ol = 10;
  const thick = thickAngle(light), cx = 300, lid = Math.min(1, blink);
  for (const s of [-1, 1]) {
    p.line([[cx + s * 38, 912], [cx + s * 42, 966]], PINK, 13);
    p.line([[cx + s * 42 - 22, 970], [cx + s * 42 + 28, 970]], PINK, 11);
  }
  p.poly([[cx - 40, 880], [cx - 20, 990], [cx + 20, 990], [cx + 40, 880]], GR_SH, 9);
  const body = ellPts(cx, 790, 128, 158); p.shadedFill(body, GR, GR_SH, light, 128); p.inkRing(body, 10, thick, 0.3);
  const belly = ellPts(cx + 6, 830, 84, 112); p.shadedFill(belly, LT, GR, light, 84);
  p.ell(cx + 112, 806, 38, 104, GR_SH, 9, 0, 360, -10);
  // the white doctor coat: open front, lapels, a red tie underneath
  p.poly([[cx - 112, 716], [cx - 16, 700], [cx - 8, 940], [cx - 128, 930], [cx - 138, 800]], "#F4F6FA", 9);
  p.poly([[cx + 16, 700], [cx + 112, 716], [cx + 138, 800], [cx + 128, 930], [cx + 8, 940]], "#F4F6FA", 9);
  p.poly([[cx - 16, 700], [cx - 52, 760], [cx - 20, 770]], "#DCE1EA", 7); p.poly([[cx + 16, 700], [cx + 52, 760], [cx + 20, 770]], "#DCE1EA", 7);
  p.poly([[cx - 14, 726], [cx + 14, 726], [cx + 10, 748], [cx - 10, 748]], RED, 7);
  p.poly([[cx - 10, 748], [cx + 10, 748], [cx + 20, 840], [cx, 872], [cx - 20, 840]], RED, 8);
  p.ell(cx, 678, 84, 34, "#6FCB9F", 8); p.ell(cx, 690, 70, 22, "#9B6AD0", 0);
  const head2 = ellPts(cx, 616, 82, 78); p.shadedFill(head2, GR, GR_SH, light, 82); p.inkRing(head2, 10, thick, 0.3);
  for (const s of [-1, 1]) {
    p.ell(cx + s * 34, 604, 17, Math.max(3, 19 * (1 - 0.85 * lid)), "#FFE9A3", 6);
    p.ell(cx + s * 31, 606, 7, Math.max(2, 9 * (1 - 0.85 * lid)), BLACK, 0);
  }
  p.stroke([[cx - 52, 574], [cx - 14, 588]], 9, BLACK); p.stroke([[cx + 52, 574], [cx + 14, 588]], 9, BLACK);   // the permanent frown
  p.poly([[cx - 20, 628], [cx + 20, 628], [cx, 676]], BEAK, 8);
  p.stroke([[cx - 12, 640], [cx + 12, 640]], 4, "#B46A00");
  // head mirror (the doctor look)
  p.stroke([[cx - 78, 590], [cx + 78, 590]], 9, "#1e2a3a"); p.ell(cx, 552, 34, 34, "#C9CED8", 8); p.ell(cx, 552, 11, 11, "#2b2f3a", 0);
  // wing reaching out to hold the sign, which rises into view with `sign` (scaled 0.62 about its own centre: a medium board)
  const k = sign * sign * (3 - 2 * sign), bw = 640, bh = 640, bx = cx - 250, by = 560 + (1 - k) * 520, SC = 0.62;
  if (sign > 0.01) {
    p.line([[cx - 100, 790], [bx + SC * (bw / 2 - 40), by + SC * bh * 0.2], [bx + SC * (bw / 2 + 10), by + SC * bh * 0.34]], GR, 50);
    g.save(); g.translate(bx, by); g.scale(SC, SC); g.translate(-bx, -by);
    p.poly([[bx - bw / 2, by - bh / 2], [bx + bw / 2, by - bh / 2], [bx + bw / 2, by + bh / 2], [bx - bw / 2, by + bh / 2]], "#A9794A", 11);
    p.poly([[bx - bw / 2 + 28, by - bh / 2 + 52], [bx + bw / 2 - 28, by - bh / 2 + 52], [bx + bw / 2 - 28, by + bh / 2 - 28], [bx - bw / 2 + 28, by + bh / 2 - 28]], "#F8F8F2", 6);
    p.poly([[bx - 70, by - bh / 2 - 24], [bx + 70, by - bh / 2 - 24], [bx + 70, by - bh / 2 + 36], [bx - 70, by - bh / 2 + 36]], "#2F3340", 8);
    g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
    const line = (t: string, y: number, col: string, fs: number) => { const f2 = fitText(g, t, bw - 96, fs); g.font = `900 ${f2}px Arial Black, Impact, sans-serif`; g.lineWidth = 12; g.strokeStyle = "#111114"; g.fillStyle = col; g.strokeText(t, bx, y); g.fillText(t, bx, y); };
    line("CALORIE DEFICIT", by - 110, "#12803F", 92);
    g.font = "900 190px Arial Black, Impact, sans-serif"; g.fillStyle = "#111114"; g.fillText(">", bx, by + 52);
    line("FASTED", by + 150, "#C21F1F", 92); line("SUFFERING", by + 236, "#C21F1F", 92);
    p.ell(bx + bw / 2 - 20, by + bh * 0.34, 34, 28, GR, 9);
    g.restore();
  }
  g.restore();
};
