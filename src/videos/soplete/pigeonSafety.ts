// SAFETY INSPECTOR PIGEON (Short 4): the same grumpy pigeon as Dr. Pigeon, now with a yellow hard hat, a hi-vis vest, a giant fire extinguisher
// and a technical sign. WIDE card 2000 x 1400 (floor y = 1375, card centre x = 1000) so the sign can be big. Flat cel-shaded like Tito.
import { Pen, thickAngle } from "../alejandro/toon";

type P2 = [number, number];
const GR = "#8E96A8", GR_SH = "#69708A", LT = "#D3D8E4", BEAK = "#F5A524", PINK = "#E88AA0", BLACK = "#111114";
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 48): P2[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });

export type SafetyOpts = {
  light: number; blink?: number;
  sign?: number;    // 0..1 the sign rises into view
  spray?: number;   // 0..1 recoil of the extinguisher (puff at the nozzle is drawn by world.ts)
  bob?: number;
};
/** nozzle position on the card (design units), shared with world.ts so the foam starts at the nozzle */
export const NOZZLE: P2 = [566, 852];

export const pigeonSafety = (p: Pen, o: SafetyOpts) => {
  const { light, blink = 0, sign = 0, spray = 0 } = o;
  const g = p.g;
  g.save(); g.translate(700, 400);                       // pigeon drawn on the 600 x 1000 grid, centred in the wide card
  p.ol = 10;
  const thick = thickAngle(light), cx = 300, lid = Math.min(1, blink);
  for (const s of [-1, 1]) {
    p.line([[cx + s * 38, 912], [cx + s * 42, 966]], PINK, 13);
    p.line([[cx + s * 42 - 22, 970], [cx + s * 42 + 28, 970]], PINK, 11);
  }
  p.poly([[cx - 40, 880], [cx - 20, 990], [cx + 20, 990], [cx + 40, 880]], GR_SH, 9);
  const body = ellPts(cx, 790, 128, 158); p.shadedFill(body, GR, GR_SH, light, 128); p.inkRing(body, 10, thick, 0.3);
  const belly = ellPts(cx + 6, 830, 84, 112); p.shadedFill(belly, LT, GR, light, 84);
  p.ell(cx - 112, 806, 38, 104, GR_SH, 9, 0, 360, 10);
  p.ell(cx, 678, 84, 34, "#6FCB9F", 8); p.ell(cx, 690, 70, 22, "#9B6AD0", 0);
  // hi-vis vest (orange with two reflective stripes)
  const vest: P2[] = [[cx - 84, 706], [cx - 16, 744], [cx - 40, 900], [cx - 110, 880], [cx - 112, 770]];
  const vest2: P2[] = [[cx + 84, 706], [cx + 16, 744], [cx + 40, 900], [cx + 110, 880], [cx + 112, 770]];
  for (const v of [vest, vest2]) { p.poly(v, "#FF7A1A", 9); p.clip(v, () => { p.stroke([[cx - 130, 800], [cx + 130, 800]], 14, "#F2F4F8"); p.stroke([[cx - 130, 842], [cx + 130, 842]], 14, "#F2F4F8"); }); }
  const head = ellPts(cx, 616, 82, 78); p.shadedFill(head, GR, GR_SH, light, 82); p.inkRing(head, 10, thick, 0.3);
  for (const s of [-1, 1]) {
    p.ell(cx + s * 34, 604, 17, Math.max(3, 19 * (1 - 0.85 * lid)), "#FFE9A3", 6);
    p.ell(cx + s * 31, 606, 7, Math.max(2, 9 * (1 - 0.85 * lid)), BLACK, 0);
    p.stroke([[cx + s * 58, 566], [cx + s * 16, 584]], 9, BLACK);
  }
  p.poly([[cx - 20, 628], [cx + 20, 628], [cx, 676]], BEAK, 8);
  p.stroke([[cx - 12, 640], [cx + 12, 640]], 4, "#B46A00");
  // yellow hard hat with a ridge and a brim
  const hat: P2[] = [[cx - 92, 566], [cx - 84, 520], [cx - 40, 484], [cx, 476], [cx + 40, 484], [cx + 84, 520], [cx + 92, 566]];
  p.gradFill(hat, "#FFD23F", "#D9A400", light); p.inkRing(hat, 10, thick, 0.3);
  p.poly([[cx - 124, 566], [cx + 124, 566], [cx + 112, 584], [cx - 112, 584]], "#F2B900", 9);
  p.poly([[cx - 16, 480], [cx + 16, 480], [cx + 12, 548], [cx - 12, 548]], "#E8A800", 6);
  p.stroke([[cx - 60, 540], [cx - 26, 506]], 6, "#FFF2B0");

  p.ell(cx + 118, 800, 38, 104, GR, 9, 0, 360, -10);
  p.ell(cx - 140, 790, 38, 104, GR, 9, 0, 360, 10);
  // ---- right wing holds the sign, sign rises with `sign`
  if (sign > 0.01) {
    const k = sign * sign * (3 - 2 * sign), y0 = 905 - 150 * k - 40 * (1 - k) * 0, bw = 700, bh = 250, bx = cx + 200, by = y0 + (1 - k) * 360;
    g.save();
    p.stroke([[bx - bw * 0.26, by + bh / 2], [bx - bw * 0.26, 990]], 16, "#8B5A2B");
    p.stroke([[bx + bw * 0.26, by + bh / 2], [bx + bw * 0.26, 990]], 16, "#8B5A2B");
    p.poly([[bx - bw / 2, by - bh / 2], [bx + bw / 2, by - bh / 2], [bx + bw / 2, by + bh / 2], [bx - bw / 2, by + bh / 2]], "#F4F6FA", 11);
    p.poly([[bx - bw / 2, by - bh / 2], [bx + bw / 2, by - bh / 2], [bx + bw / 2, by - bh / 2 + 82], [bx - bw / 2, by - bh / 2 + 82]], "#FFD23F", 9);
    for (let i = 0; i < 9; i++) p.poly([[bx - bw / 2 + 12 + i * 88, by - bh / 2 + 82], [bx - bw / 2 + 52 + i * 88, by - bh / 2 + 82], [bx - bw / 2 + 12 + i * 88 + 60, by - bh / 2], [bx - bw / 2 + 12 + i * 88 + 20, by - bh / 2]].map(([x, y]) => [Math.min(bx + bw / 2 - 4, Math.max(bx - bw / 2 + 4, x)), y] as P2), "#1A1D26", 0);
    g.font = "900 56px Arial Black, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.lineJoin = "round"; g.lineWidth = 9; g.strokeStyle = "#FFD23F"; g.strokeText("SAFETY INSPECTOR:", bx, by - bh / 2 + 62); g.fillStyle = "#111114"; g.fillText("SAFETY INSPECTOR:", bx, by - bh / 2 + 62);
    g.font = "900 62px Arial Black, Impact, sans-serif"; g.fillStyle = "#12803F"; g.fillText("JUST EAT IN A", bx, by + 34); g.fillText("DEFICIT", bx, by + 104);
    g.restore();
  }
  // ---- giant fire extinguisher held by the left wing (nozzle pointing left / up-left)
  const ex = cx - 250, rec = -14 * spray;
  const tank: P2[] = [[ex - 78 + rec, 560], [ex + 78 + rec, 560], [ex + 82 + rec, 968], [ex - 82 + rec, 968]];
  p.gradFill(tank, "#E5322D", "#A81F1C", light); p.inkRing(tank, 10, thick, 0.3);
  p.ell(ex + rec, 560, 78, 28, "#E5322D", 9);
  p.poly([[ex - 82 + rec, 840], [ex + 82 + rec, 840], [ex + 82 + rec, 940], [ex - 82 + rec, 940]], "#F2F4F8", 7);
  g.font = "900 40px Arial Black, Impact, sans-serif"; g.textAlign = "center"; g.fillStyle = "#C21F1F"; g.fillText("FIRE", ex + rec, 886); g.fillText("OUT", ex + rec, 926);
  p.poly([[ex - 40 + rec, 520], [ex + 40 + rec, 520], [ex + 36 + rec, 560], [ex - 36 + rec, 560]], "#2F3340", 8);     // valve
  p.poly([[ex - 70 + rec, 486], [ex + 30 + rec, 486], [ex + 30 + rec, 504], [ex - 70 + rec, 504]], "#2F3340", 7);     // lever
  p.stroke([[ex - 30 + rec, 530], [ex - 96 + rec, 560], [ex - 128 + rec, 520], [ex - 142 + rec, 450]], 14, "#15171E");  // hose
  p.poly([[ex - 126 + rec, 456], [ex - 170 + rec, 436], [ex - 184 + rec, 468], [ex - 140 + rec, 486]], "#2F3340", 8);  // nozzle
                                                                      // wing tip on the tank
  g.restore();
};
