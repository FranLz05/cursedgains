// The gym manager: a pigeon in a red tie holding a clipboard with the $400 lava & flooding fee. Flat 2D cel-shaded like Tito
// (Pen on a 600 x 1000 card, feet at y = 975, the bird fills the lower part of the card).
import { Pen, thickAngle } from "../alejandro/toon";

type P2 = [number, number];
const GR = "#8E96A8", GR_SH = "#69708A", LT = "#D3D8E4", BEAK = "#F5A524", PINK = "#E88AA0", RED = "#EF4444", BLACK = "#111114";
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 48): P2[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });

export type PigeonOpts = { light: number; blink?: number; bob?: number };

export const pigeon = (p: Pen, o: PigeonOpts) => {
  const { light, blink = 0 } = o;
  p.ol = 10;
  const thick = thickAngle(light), cx = 300;
  // legs and feet
  for (const s of [-1, 1]) {
    p.line([[cx + s * 38, 912], [cx + s * 42, 966]], PINK, 13);
    p.line([[cx + s * 42 - 22, 970], [cx + s * 42 + 28, 970]], PINK, 11);
  }
  // tail behind the body
  p.poly([[cx - 40, 880], [cx - 20, 990], [cx + 20, 990], [cx + 40, 880]], GR_SH, 9);
  // body, lighter belly, far wing
  const body = ellPts(cx, 790, 128, 158); p.shadedFill(body, GR, GR_SH, light, 128); p.inkRing(body, 10, thick, 0.3);
  const belly = ellPts(cx + 6, 830, 84, 112); p.shadedFill(belly, LT, GR, light, 84);
  p.ell(cx - 112, 806, 38, 104, GR_SH, 9, 0, 360, 10);
  // neck patch (the iridescent pigeon collar)
  p.ell(cx, 678, 84, 34, "#6FCB9F", 8); p.ell(cx, 690, 70, 22, "#9B6AD0", 0);
  // head
  const head = ellPts(cx, 616, 82, 78); p.shadedFill(head, GR, GR_SH, light, 82); p.inkRing(head, 10, thick, 0.3);
  const lid = Math.min(1, blink);
  for (const s of [-1, 1]) {
    p.ell(cx + s * 34, 604, 17, Math.max(3, 19 * (1 - 0.85 * lid)), "#FFE9A3", 6);
    p.ell(cx + s * 31, 606, 7, Math.max(2, 9 * (1 - 0.85 * lid)), BLACK, 0);
    p.stroke([[cx + s * 58, 570], [cx + s * 16, 586]], 9, BLACK);               // grumpy manager brows
  }
  p.poly([[cx - 20, 628], [cx + 20, 628], [cx, 676]], BEAK, 8);                  // beak
  p.stroke([[cx - 12, 640], [cx + 12, 640]], 4, "#B46A00");
  // tie
  p.poly([[cx - 20, 716], [cx + 20, 716], [cx + 14, 736], [cx - 14, 736]], RED, 8);
  p.poly([[cx - 14, 736], [cx + 14, 736], [cx + 30, 826], [cx, 864], [cx - 30, 826]], RED, 9);
  // near wing holding the clipboard
  p.ell(cx + 118, 790, 38, 104, GR, 9, 0, 360, -10);
  const g = p.g;
  g.save(); g.translate(cx + 78, 812); g.rotate(-0.1);
  p.poly([[-12, -92], [108, -92], [108, 92], [-12, 92]], "#A9794A", 9);          // board
  p.poly([[0, -76], [96, -76], [96, 80], [0, 80]], "#F8F8F2", 5);                // paper
  p.poly([[26, -102], [70, -102], [70, -80], [26, -80]], "#2F3340", 6);           // clip
  for (let k = 0; k < 4; k++) p.stroke([[12, -52 + k * 22], [84 - (k % 2) * 16, -52 + k * 22]], 3, "#9AA0AE");
  g.font = "bold 42px Arial Black, Impact, sans-serif"; g.fillStyle = "#C0262C"; g.textAlign = "center"; g.fillText("$400", 48, 66);
  g.restore();
  p.ell(cx + 70, 880, 30, 24, GR, 8, 0, 360, 0);                                 // the wing tip in front of the board
};
