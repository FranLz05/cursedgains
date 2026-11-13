// Tito lying on the dungeon floor doing crunches (Short 4). WIDE card 2000 x 1400 design units, floor line at y = 1375, card centre x = 1000.
// Side view: head to the left, knees up to the right. `up` 0..1 is the crunch (0 = flat on the floor, 1 = top of the rep).
// Same flat cel-shaded Tito as titoS.ts (red tank top, sweatband, white sneakers); the face is the frontal head rotated along the body axis.
import { Pen, thickAngle } from "../alejandro/toon";
import { P2, TitoExpr, head, limb, sneaker, rad, lerp, SKIN, SKIN_SH, SKIN_FAR, RED, RED_SH, RED_DK, SHORT, SHORT_SH, WHITE, drop } from "./titoS";

const stadium = (a: P2, b: P2, wa: number, wb: number): P2[] => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, pts: P2[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, w = lerp(wa, wb, t); pts.push([a[0] + dx * t + nx * w, a[1] + dy * t + ny * w]); }
  for (let i = 1; i < 10; i++) { const q = (i / 10) * Math.PI; pts.push([b[0] + nx * wb * Math.cos(q) + ux * wb * Math.sin(q), b[1] + ny * wb * Math.cos(q) + uy * wb * Math.sin(q)]); }
  for (let i = 10; i >= 0; i--) { const t = i / 10, w = lerp(wa, wb, t); pts.push([a[0] + dx * t - nx * w, a[1] + dy * t - ny * w]); }
  for (let i = 1; i < 10; i++) { const q = (i / 10) * Math.PI; pts.push([a[0] - nx * wa * Math.cos(q) - ux * wa * Math.sin(q), a[1] - ny * wa * Math.cos(q) - uy * wa * Math.sin(q)]); }
  return pts;
};

export type CrunchOpts = {
  up: number; expr: TitoExpr; light: number; sweat?: number; blink?: number;
  scorch?: number;   // 0..1 burnt tank top
  smokePh?: number;  // 0..1 smoke puff phase
  speed?: number;    // 0..1 speed arcs (supersonic crunches)
  shake?: number;    // px jitter of the whole body
};

/** torso angle (degrees above the floor) and the belly point on the card, shared with world.ts so the flame aims at the stomach */
export const crunchAngle = (up: number) => 2 + 58 * up;
export const bellyOnCard = (up: number): P2 => {
  const th = rad(crunchAngle(up)), hip: P2 = [1100, 1272], d: P2 = [-Math.cos(th), -Math.sin(th)], nF: P2 = [Math.sin(th), -Math.cos(th)];
  return [hip[0] + d[0] * 150 + nF[0] * 80, hip[1] + d[1] * 150 + nF[1] * 80];
};

export const titoCrunch = (p: Pen, o: CrunchOpts) => {
  const { up, expr, light, sweat = 0, blink = 0, scorch = 0, smokePh = 0, speed = 0, shake = 0 } = o;
  const g = p.g;
  g.save(); g.translate(shake, 0);
  p.ol = 11; p.rot = null;
  const thick = thickAngle(light);
  const th = rad(crunchAngle(up)), hip: P2 = [1100, 1272];
  const d: P2 = [-Math.cos(th), -Math.sin(th)], nF: P2 = [Math.sin(th), -Math.cos(th)];     // torso axis (towards the head) and the belly-side normal
  const S: P2 = [hip[0] + d[0] * 300, hip[1] + d[1] * 300];
  const phi = th + rad(36 * up), dh: P2 = [-Math.cos(phi), -Math.sin(phi)], nh: P2 = [Math.sin(phi), -Math.cos(phi)];
  const H: P2 = [S[0] + dh[0] * 150, S[1] + dh[1] * 150];

  // speed arcs: the swept area of the torso, drawn behind everything
  if (speed > 0.02) {
    g.save(); g.globalAlpha = 0.55 * speed;
    for (let i = 0; i < 4; i++) p.arc(hip[0], hip[1], 330 + i * 46, 330 + i * 46, -178, -176 + 62 - i * 5, 9 - i, i % 2 ? "#FFE9A3" : "#FFFFFF");
    g.restore();
  }
  // legs: knees up, sneakers flat on the floor (far leg first, a bit darker)
  const leg = (dx: number, dy: number, skin: string) => {
    const h: P2 = [1112 + dx, 1262 + dy], k: P2 = [1262 + dx, 1146 + dy], a: P2 = [1176 + dx * 0.55, 1290];
    p.line([h, k, a], skin, 52);
    p.stroke([[a[0], a[1] - 22], [a[0], a[1] + 6]], 52, WHITE);
    sneaker(p, a[0] - 4, 1293, 1, light, thick);
    p.line([h, [lerp(h[0], k[0], 0.6), lerp(h[1], k[1], 0.6)]], SHORT, 86);
  };
  leg(40, -6, SKIN_FAR);
  // torso (red tank top) + shorts at the hips
  const body = stadium(hip, S, 94, 106);
  p.gradFill(body, RED, RED_SH, light); p.inkRing(body, 11, thick, 0.3);
  p.clip(body, () => {
    p.stroke([[hip[0] + d[0] * 60 + nF[0] * 120, hip[1] + d[1] * 60 + nF[1] * 120], [hip[0] + d[0] * 60 - nF[0] * 120, hip[1] + d[1] * 60 - nF[1] * 120]], 8, WHITE);
    p.stroke([[hip[0] + d[0] * 80 + nF[0] * 120, hip[1] + d[1] * 80 + nF[1] * 120], [hip[0] + d[0] * 80 - nF[0] * 120, hip[1] + d[1] * 80 - nF[1] * 120]], 5, WHITE);
    if (scorch > 0.01) {
      const blobs: [number, number, number, number][] = [[0.5, 0.55, 74, 56], [0.36, 0.5, 40, 32], [0.64, 0.46, 38, 30], [0.5, 0.15, 30, 22], [0.28, 0.2, 26, 20]];
      blobs.forEach(([u, v, rx, ry], i) => {
        const s = Math.min(1, Math.max(0, scorch * 1.4 - i * 0.1)); if (s <= 0) return;
        const cx = hip[0] + d[0] * 300 * u + nF[0] * 100 * v, cy = hip[1] + d[1] * 300 * u + nF[1] * 100 * v;
        const pts: P2[] = Array.from({ length: 22 }, (_, j) => { const a = (j / 22) * Math.PI * 2, r = 1 + (j % 2 ? 0.22 : -0.1) + 0.08 * Math.sin(j * 1.7 + i); return [cx + rx * s * r * Math.cos(a), cy + ry * s * r * Math.sin(a)] as P2; });
        p.poly(pts, i === 0 ? "#120A08" : "#2A1710", 0);
        p.stroke([...pts.map(([px, py]) => [cx + (px - cx) * 1.14, cy + (py - cy) * 1.14] as P2), [cx + (pts[0][0] - cx) * 1.14, cy + (pts[0][1] - cy) * 1.14]], 4, "#7A2A12");
      });
      for (let i = 0; i < 7; i++) p.dot(hip[0] + d[0] * (110 + i * 26) + nF[0] * (60 + (i % 3) * 14), hip[1] + d[1] * (110 + i * 26) + nF[1] * (60 + (i % 3) * 14), 3.4, i % 2 ? "#FFB23A" : "#FF6A2A");
    }
  });
  const sh = stadium([hip[0] - d[0] * 4, hip[1] - d[1] * 4], [hip[0] + d[0] * 58, hip[1] + d[1] * 58], 98, 98);
  p.gradFill(sh, SHORT, SHORT_SH, light); p.inkRing(sh, 10, thick, 0.3);
  // neck and bare shoulder where the tank top ends
  const nk = stadium([S[0] - d[0] * 6, S[1] - d[1] * 6], [S[0] + d[0] * 40, S[1] + d[1] * 40], 62, 40);
  p.gradFill(nk, SKIN, SKIN_SH, light); p.inkRing(nk, 9, thick, 0.3);
  // smoke puffs rising from the belly
  if (scorch > 0.3) for (let i = 0; i < 5; i++) {
    const q = (smokePh + i / 5) % 1, bx = hip[0] + d[0] * 150 + nF[0] * 100, by = hip[1] + d[1] * 150 + nF[1] * 100;
    const x = bx + 26 * Math.sin(q * 7 + i * 2) + 18 * i - 36, y = by - 40 - q * 380, r = (22 + 52 * q) * Math.min(1, scorch * 1.6);
    g.save(); g.globalAlpha = 0.78 * (1 - q); p.ell(x, y, r, r * 0.88, i % 2 ? "#3A3A44" : "#5A5A68", 6); g.restore();
  }
  // hands behind the head: upper arm up and out, forearm back to the head, fist hidden by the head
  const Sh: P2 = [S[0] + nF[0] * 16, S[1] + nF[1] * 16], E: P2 = [S[0] + dh[0] * 28 + nh[0] * 122, S[1] + dh[1] * 28 + nh[1] * 122], Hd: P2 = [H[0] + nh[0] * 36 - dh[0] * 6, H[1] + nh[1] * 36 - dh[1] * 6];
  limb(p, Sh, E, 58, 0.14, 0.3, SKIN, SKIN_SH, light, thick);
  p.line([E, Hd], SKIN, 48);
  // head (frontal face rotated to lie along the body axis)
  p.rot = [phi - Math.PI / 2, H[0], H[1]];
  head(p, H[0], H[1], expr, blink, light, thick);
  p.rot = null;
  // near leg in front of the shorts
  leg(0, 0, SKIN);
  const nd = Math.ceil(Math.max(0, Math.min(1, sweat)) * 3);
  if (nd >= 1) drop(p, H[0] - 60, H[1] - 150, 1.1); if (nd >= 2) drop(p, H[0] + 90, H[1] - 170, 1.2); if (nd >= 3) drop(p, S[0] + 40, S[1] - 190, 1.0);
  void RED_DK;
  g.restore();
};
