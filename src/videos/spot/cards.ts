// Character / effect cards for "Spot Reduction Myth" that do not exist in the other shorts. Same flat cel-shaded Pen system as Tito (titoS.ts) and
// the pigeons (sudar/pigeon.ts, soplete/pigeonSafety.ts): everything is drawn on a card and planted in the 3D world by world.ts.
import { Pen, thickAngle } from "../alejandro/toon";
import { P2, TitoExpr, head, SKIN, SKIN_SH, RED, WHITE } from "../soplete/titoS";

const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 48): P2[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });
const GR = "#8E96A8", GR_SH = "#69708A", LT = "#D3D8E4", BEAK = "#F5A524", PINK = "#E88AA0", BLACK = "#111114";

// ---------------------------------------------------------------- scene 2: the abdominal muscle with Tito's face, shouting into a walkie-talkie (BODY card 600 x 1000, floor y = 975)
export const muscleFace = (p: Pen, o: { light: number; expr: TitoExpr; shake: number; blink?: number }) => {
  const { light, expr, shake, blink = 0 } = o, g = p.g, thick = thickAngle(light);
  g.save(); g.translate(shake, 0);
  p.ol = 11; p.rot = null;
  // the raised arm (muscle red) holding the walkie-talkie next to the mouth
  p.line([[120, 975], [96, 860], [150, 760]], "#E5484D", 78);
  p.poly([[150, 560], [212, 560], [212, 780], [150, 780]], "#1b1f2c", 9);                    // walkie body
  p.line([[168, 560], [168, 470]], BLACK, 10);                                                // antenna
  p.dot(168, 462, 13, RED);
  p.poly([[162, 600], [200, 600], [200, 650], [162, 650]], "#7CE8FF", 5);
  for (let i = 0; i < 3; i++) p.stroke([[160, 690 + i * 22], [204, 690 + i * 22]], 6, "#555b6e");
  p.ell(150, 796, 36, 34, SKIN, 9);                                                           // the fist around the radio
  // Tito's head growing out of the muscle (frontal face, big)
  g.save(); g.translate(330, 800); g.scale(1.32, 1.32); g.translate(-330, -800);
  head(p, 330, 800, expr, blink, light, thick);
  g.restore();
  g.restore();
};

// ---------------------------------------------------------------- scene 2: one fat cell in a beach hammock with sunglasses and headphones (WIDE card 2000 x 1400, floor y = 1375)
export const fatCell = (p: Pen, o: { light: number; sway: number; bob: number; hue: number }) => {
  const { light, sway, bob, hue } = o, g = p.g, thick = thickAngle(light);
  p.ol = 10; p.rot = null;
  const cx = 1000, topY = 560, sag = 250 + 22 * sway;
  // posts + the hammock cloth
  for (const s of [-1, 1]) p.line([[cx + s * 470, topY - 40], [cx + s * 478, topY + 470]], "#8A5A3C", 30);
  const cloth: P2[] = Array.from({ length: 17 }, (_, i) => { const t = i / 16; return [cx - 470 + 940 * t, topY + sag * 4 * t * (1 - t) + 14 * Math.sin(t * Math.PI)] as P2; });
  p.line(cloth, ["#FF8A9A", "#7CE8FF", "#FFD23F"][hue % 3], 46);
  p.stroke(cloth.filter((_, i) => i % 2 === 0).map(([x, y]) => [x, y - 6] as P2), 5, "#ffffff");
  // the cell (a yellow blob lying in the hammock)
  const cy = topY + sag * 0.78 - 62 + 5 * bob, rx = 252, ry = 196;
  const body = ellPts(cx, cy, rx, ry);
  p.shadedFill(body, "#FFD84A", "#E0A800", light, rx); p.inkRing(body, 11, thick, 0.3);
  p.ell(cx - 100, cy - 110, 64, 28, "#FFF3A8", 0, 0, 360, -20);
  for (const [dx, dy, r] of [[150, 30, 22], [170, -30, 14], [-170, 60, 18]] as [number, number, number][]) p.ell(cx + dx, cy + dy, r, r * 0.8, "#F2B900", 0);
  // headphones: band over the top, big ear cups
  const band: P2[] = Array.from({ length: 21 }, (_, i) => { const a = Math.PI + (i / 20) * Math.PI; return [cx + (rx - 6) * Math.cos(a), cy + 20 + (ry + 12) * Math.sin(a)] as P2; });
  p.line(band, "#161a24", 26);
  for (const s of [-1, 1]) { p.ell(cx + s * (rx - 10), cy + 28, 40, 66, "#2b2f40", 9); p.ell(cx + s * (rx - 10), cy + 28, 20, 40, "#ff4d6a", 0); }
  // sunglasses and a smug smile
  p.poly([[cx - 168, cy - 40], [cx - 24, cy - 40], [cx - 34, cy + 40], [cx - 140, cy + 52]], BLACK, 9);
  p.poly([[cx + 24, cy - 40], [cx + 168, cy - 40], [cx + 140, cy + 52], [cx + 34, cy + 40]], BLACK, 9);
  p.stroke([[cx - 24, cy - 28], [cx + 24, cy - 28]], 14, BLACK);
  p.stroke([[cx - 138, cy - 22], [cx - 92, cy - 22]], 6, "#6f7894"); p.stroke([[cx + 56, cy - 22], [cx + 102, cy - 22]], 6, "#6f7894");
  p.arc(cx, cy + 72, 64, 40, 10, 170, 9, "#7a5200");
  g.save(); g.restore();
};

// ---------------------------------------------------------------- scene 3: a yellow fat bubble (fx card 128 x 128)
export const fatBubble = (p: Pen) => {
  p.ol = 8; p.rot = null;
  p.ell(64, 66, 50, 50, "#FFD84A", 8);
  p.ell(44, 46, 13, 11, "#FFFBD0", 0); p.ell(78, 88, 8, 6, "#F2B900", 0);
};

// ---------------------------------------------------------------- scene 5: the pigeon scientist (red tie, safety goggles) holding a big clipboard. WIDE card, floor y = 1375, card centre x = 1000
export type SciOpts = { light: number; blink?: number; sign?: number };
export const pigeonSci = (p: Pen, o: SciOpts) => {
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
  p.ell(cx, 678, 84, 34, "#6FCB9F", 8); p.ell(cx, 690, 70, 22, "#9B6AD0", 0);
  const head2 = ellPts(cx, 616, 82, 78); p.shadedFill(head2, GR, GR_SH, light, 82); p.inkRing(head2, 10, thick, 0.3);
  for (const s of [-1, 1]) {
    p.ell(cx + s * 34, 604, 17, Math.max(3, 19 * (1 - 0.85 * lid)), "#FFE9A3", 6);
    p.ell(cx + s * 31, 606, 7, Math.max(2, 9 * (1 - 0.85 * lid)), BLACK, 0);
  }
  // safety goggles: strap + two clear lenses with a dark rim
  p.stroke([[cx - 84, 604], [cx + 84, 604]], 12, "#1e2a3a");
  for (const s of [-1, 1]) { p.ell(cx + s * 36, 604, 36, 31, "#C8F0FF", 9); p.ell(cx + s * 26, 594, 11, 8, "#ffffff", 0); }
  p.stroke([[cx - 8, 604], [cx + 8, 604]], 9, "#1e2a3a");
  p.stroke([[cx + 20 - 40, 572], [cx + 58, 586]], 0, BLACK);
  p.poly([[cx - 20, 628], [cx + 20, 628], [cx, 676]], BEAK, 8);
  p.stroke([[cx - 12, 640], [cx + 12, 640]], 4, "#B46A00");
  // tie
  p.poly([[cx - 20, 716], [cx + 20, 716], [cx + 14, 736], [cx - 14, 736]], RED, 8);
  p.poly([[cx - 14, 736], [cx + 14, 736], [cx + 30, 826], [cx, 864], [cx - 30, 826]], RED, 9);
  // left wing reaching out to hold the clipboard, which rises into view with `sign`
  const k = sign * sign * (3 - 2 * sign), bw = 520, bh = 640, bx = cx - 215, by = 540 + (1 - k) * 520;
  if (sign > 0.01) {
    g.save(); g.translate(bx, by); g.scale(0.6, 0.6); g.translate(-bx, -by);
    p.line([[cx - 100, 790], [bx + bw / 2 - 40, by + bh * 0.2], [bx + bw / 2 + 10, by + bh * 0.34]], GR, 50);
    p.poly([[bx - bw / 2, by - bh / 2], [bx + bw / 2, by - bh / 2], [bx + bw / 2, by + bh / 2], [bx - bw / 2, by + bh / 2]], "#A9794A", 11);
    p.poly([[bx - bw / 2 + 28, by - bh / 2 + 52], [bx + bw / 2 - 28, by - bh / 2 + 52], [bx + bw / 2 - 28, by + bh / 2 - 28], [bx - bw / 2 + 28, by + bh / 2 - 28]], "#F8F8F2", 6);
    p.poly([[bx - 70, by - bh / 2 - 24], [bx + 70, by - bh / 2 - 24], [bx + 70, by - bh / 2 + 36], [bx - 70, by - bh / 2 + 36]], "#2F3340", 8);
    g.font = "900 88px Arial Black, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
    g.lineWidth = 12; g.strokeStyle = "#111114"; g.fillStyle = "#12803F";
    g.strokeText("DEFICIT", bx, by - 70); g.fillText("DEFICIT", bx, by - 70);
    g.font = "900 210px Arial Black, Impact, sans-serif"; g.fillStyle = "#111114"; g.fillText(">", bx, by + 92);
    g.font = "900 88px Arial Black, Impact, sans-serif"; g.fillStyle = "#C21F1F"; g.strokeText("LASERS", bx, by + 210); g.fillText("LASERS", bx, by + 210);
    p.ell(bx + bw / 2 - 20, by + bh * 0.34, 34, 28, GR, 9);                    // the wing tip over the board
    g.restore();
  }
  g.restore();
};

export { SKIN_SH, WHITE };
