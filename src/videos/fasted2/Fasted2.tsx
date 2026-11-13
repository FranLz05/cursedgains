// "The Fasted Cardio Myth" — DYNAMIC cut (PumpParadox, Short 5 v2), directed like the Rick Clips reference: 14 micro-scenes, one literal set and action per
// sentence, HARD CUTS only between sets / radically different angles, a continuously gliding camera inside every shot (no tilt-only cuts, no white flashes,
// no crossfades). Same composer as every PumpParadox short (ink, lens blur, bloom, tone map, grade), same flat cel-shaded cards on the 3D floor, same floating
// technical labels (thin white leader + dark semi-transparent box) and big word-by-word subtitles (1-2 words, white with a thick ink stroke, key words red / green).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, getInputProps } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, RACE_X, SCALE_Z, BEAM, TANK_X, TANK_Z, jumpU } from "./world";
import { InkPass, noInkFallback } from "../alejandro/ink";
import { LensBlur } from "../alejandro/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../alejandro/grade";
import { camAt, smooth, clamp01, shotOf, shotStart, shotEnd, wordF, spring, TOTAL, FPS } from "./story";
import WORDS from "../fasted/palabras.json";

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.75, luminanceThreshold: 0.95, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();
const FONT = "Arial Black, Impact, sans-serif";
const MONO = "'Courier New', Consolas, monospace";
const RED = "#EF4444", GREEN = "#22C55E", BRIGHT_GREEN = "#3DFF7A", YELLOW = "#FFD23F";

const Inner: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const { camera, scene, gl, size } = useThree();
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 14, nearScale: 1.1 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const composer = useMemo(() => {
    const c = new EffectComposer(gl, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
    c.addPass(new RenderPass(scene, camera));
    c.addPass(fx.ink);
    c.addPass(new EffectPass(camera, fx.lens.pre));
    c.addPass(new EffectPass(camera, fx.lens.main));
    c.addPass(new EffectPass(camera, fx.bloom, fx.tone, fx.grade));
    return c;
  }, [gl, scene, camera, fx]);
  useEffect(() => { composer.setSize(size.width, size.height); }, [composer, size.width, size.height]);
  useFrame(() => { composer.render(); }, 1);
  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(i, f, cam, scene);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  // depth of field (CLAUDE.md): subject sharp, background SEMI-blurred (4-6 px at 1080 wide), never smeared
  fx.lens.cInf = i === 11 ? 5 : i === 3 || i === 6 ? 7 : 9;
  gradeFor(fx.grade, "day");
  return <primitive object={world.root} dispose={null} />;
};

const dprOverride = () => (getInputProps() as { dpr?: number }).dpr;
/** ONE canvas for the whole video (the World is built once); the shot index changes on every hard cut */
const ShotView: React.FC<{ i: number }> = ({ i }) => (
  <AbsoluteFill>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows
      gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.1, far: 1500 }}>
      <Inner i={i} />
    </ThreeCanvas>
  </AbsoluteFill>
);

/** floating technical label: thin white leader to an anchor, dark semi-transparent box, crisp monospaced text */
const Chip: React.FC<{ x: number; y: number; k: string; v?: string; col: string; ax: number; ay: number; op: number; size?: number }> = ({ x, y, k, v, col, ax, ay, op, size = 36 }) => {
  if (op <= 0.001) return null;
  const cw = size * 0.62, w = Math.max(k.length * (v ? 0.8 : 1), v ? v.length : 0) * cw + 48, h = v ? size * 2 + 40 : size + 44, top = ay < y, sy = top ? y - h / 2 : y + h / 2;
  const sc = 0.85 + 0.15 * clamp01(op * 1.4);
  return (
    <g opacity={op} transform={`translate(${x} ${y}) scale(${sc}) translate(${-x} ${-y})`}>
      <line x1={x} y1={sy} x2={ax} y2={ay} stroke="#ffffff" strokeWidth={3} opacity={0.9} />
      <circle cx={ax} cy={ay} r={11} fill="none" stroke="#ffffff" strokeWidth={3.5} /><circle cx={ax} cy={ay} r={3.5} fill="#ffffff" />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={8} fill="rgba(6,9,20,0.82)" stroke="rgba(255,255,255,0.92)" strokeWidth={2.5} />
      {v ? <>
        <text x={x - w / 2 + 24} y={y - size * 0.12} fontFamily={MONO} fontWeight={700} fontSize={size * 0.8} letterSpacing={0.5} fill="#ffffff">{k}</text>
        <text x={x - w / 2 + 24} y={y + size * 0.88} fontFamily={MONO} fontWeight={700} fontSize={size} letterSpacing={0.5} fill={col}>{v}</text>
      </> : <text x={x - w / 2 + 24} y={y + size * 0.34} fontFamily={MONO} fontWeight={700} fontSize={size} letterSpacing={0.5} fill={col}>{k}</text>}
    </g>
  );
};
const pcL = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 2000);
const project = (i: number, f: number, wx: number, wy: number, wz: number) => {
  const c = camAt(i, f);
  pcL.position.set(...c.pos); pcL.fov = c.fov; pcL.up.set(0, 1, 0); pcL.updateProjectionMatrix(); pcL.lookAt(...c.look); pcL.updateMatrixWorld();
  const q = new THREE.Vector3(wx, wy, wz).project(pcL); return [(q.x + 1) * 540, (1 - q.y) * 960] as const;
};
const on = (f: number, w: string, nth = 0, lead = 4) => smooth((f - wordF(w, nth) + lead) / 6);

// ---------------------------------------------------------------- labels (few, only where the brief asks for them)
const Labels: React.FC<{ f: number; i: number }> = ({ f, i }) => {
  const s0 = shotStart(i), ts = (f - s0) / FPS, out = 1 - smooth((f - (shotEnd(i) - 4)) / 4);
  let chips: React.ReactNode = null;
  if (i === 1) {
    const [ax, ay] = project(1, f, 2.4, 1.0, 0.8);
    chips = <Chip x={540} y={330} k="CALORIES TODAY:" v="0" col={RED} ax={ax} ay={ay} op={smooth((ts - 0.25) / 0.3)} />;
  } else if (i === 5) {
    const [ha, hb] = project(5, f, 0, 2.25, 0), [fa, fb] = project(5, f, -TANK_X, 1.2, TANK_Z + 0.45), [ca, cb] = project(5, f, TANK_X, 1.9, TANK_Z + 0.45);
    chips = (<>
      <Chip x={540} y={200} k="DURING WORKOUT" col="#ffffff" ax={ha} ay={hb} op={smooth(ts / 0.3)} />
      <Chip x={250} y={1120} k="FAT BURN" v="HIGHER %" col={YELLOW} ax={fa} ay={fb} op={smooth((ts - 1.0) / 0.3)} />
      <Chip x={830} y={1120} k="CARB BURN" v="LOWER %" col="#5AB8FF" ax={ca} ay={cb} op={smooth((ts - 1.4) / 0.3)} />
    </>);
  } else if (i === 6) {
    const [ga, gb] = project(6, f, 0.12, 1.3, 0.02);
    chips = <Chip x={760} y={330} k="INSULIN:" v="LOW" col={BRIGHT_GREEN} ax={ga} ay={gb} op={on(f, "insulin", 0, 2)} />;
  } else if (i === 8) {
    const [ba, bb] = project(8, f, BEAM[0], BEAM[1] + 0.15, BEAM[2]);
    chips = <Chip x={540} y={260} k="BUDGET:" v="BALANCED" col={BRIGHT_GREEN} ax={ba} ay={bb} op={on(f, "budget", 0, 6)} />;
  } else if (i === 9) {
    const ju = jumpU(f), z = ju > 0 ? SCALE_Z * ju : 0, [la, lb] = project(9, f, -RACE_X, 2.25, z), [ra, rb] = project(9, f, RACE_X, 2.25, z);
    chips = (<>
      <Chip x={280} y={260} k="FASTED TITO" col={RED} ax={la} ay={lb} op={smooth(ts / 0.3)} />
      <Chip x={800} y={260} k="FED TITO" col={BRIGHT_GREEN} ax={ra} ay={rb} op={smooth((ts - 0.15) / 0.3)} />
    </>);
  } else if (i === 10) {
    const [sa, sb] = project(10, f, 0, 0.55, SCALE_Z + 0.5);
    chips = <Chip x={540} y={240} k="FAT LOSS:" v="IDENTICAL" col={YELLOW} ax={sa} ay={sb} op={on(f, "same", 0, 2)} />;
  }
  if (!chips) return null;
  return <AbsoluteFill><svg width={1080} height={1920}><g opacity={out}>{chips}</g></svg></AbsoluteFill>;
};

/** the red rubber-stamp imprint that stays on screen after the stamp slams down on "doesn't" */
const MythStamp: React.FC<{ f: number }> = ({ f }) => {
  const f0 = wordF("doesnt") + 13, u = (f - f0) / FPS;
  if (u < 0 || f >= shotEnd(4)) return null;
  const s = 1 + 0.6 * Math.max(0, 1 - spring(u / 0.35, 10));
  return (
    <AbsoluteFill><svg width={1080} height={1920}>
      <defs><filter id="grit"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.4" /><feComposite in="SourceGraphic" operator="in" /></filter></defs>
      <g transform={`translate(540 700) rotate(-12) scale(${s})`} filter="url(#grit)" opacity={0.93}>
        <rect x={-380} y={-150} width={760} height={300} rx={22} fill="none" stroke="#E01B1B" strokeWidth={26} />
        <rect x={-338} y={-110} width={676} height={220} rx={12} fill="none" stroke="#E01B1B" strokeWidth={8} />
        <text x={0} y={70} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={200} letterSpacing={16} fill="#E01B1B">MYTH</text>
      </g>
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- subtitles: 1-2 words at a time, big, centred at ~70 % height (Rick Clips), key words red / green
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
type SW = { text: string; col: string | null; f: number };
type SG = { start: number; end: number; words: SW[] };
const PHRASES: { w: string[]; col: string }[] = [
  { w: ["bear"], col: RED }, { w: ["spoiler"], col: RED }, { w: ["stupid"], col: RED }, { w: ["suffering"], col: RED }, { w: ["nothing"], col: RED }, { w: ["doesnt"], col: RED },
  { w: ["compensates"], col: GREEN }, { w: ["exact", "same"], col: GREEN }, { w: ["fat", "loss"], col: GREEN }, { w: ["banana"], col: GREEN }, { w: ["calorie", "deficit"], col: GREEN },
];
const GROUPS: SG[] = (() => {
  const ws = WORDS.words as { w: string; t: number; e: number }[], nw = ws.map((x) => norm(x.w)), cols: (string | null)[] = ws.map(() => null);
  ws.forEach((_, k) => PHRASES.forEach((p) => { if (p.w.every((q, j) => nw[k + j] === q)) p.w.forEach((_q, j) => (cols[k + j] = p.col)); }));
  const out: SG[] = []; let cur: SW[] = [], prev = "";
  const flush = () => { if (cur.length) out.push({ start: cur[0].f - 1, end: 0, words: cur }); cur = []; };
  ws.forEach((x, k) => {
    if (x.w === "AM.") { cur[cur.length - 1].text += " AM"; prev = x.w; return; }
    const len = cur.reduce((n, q) => n + q.text.length, 0), txt = x.w.replace(/[,.;:?!—]+$/g, "").replace(/’/g, "'").toUpperCase();
    if (cur.length >= 2 || /[.,;:?!—]$/.test(prev) || len + txt.length > 11 || (cur.length && cols[k] !== cur[cur.length - 1].col)) flush();
    cur.push({ text: txt, col: cols[k], f: Math.max(0, Math.round(x.t * 30)) });
    prev = x.w;
  });
  flush();
  out.forEach((g, k) => { g.end = k + 1 < out.length ? out[k + 1].start : Math.round(ws[ws.length - 1].e * 30) + 12; });
  out.forEach((g) => { const last = [...ws].reverse().find((x) => Math.round(x.t * 30) === g.words[g.words.length - 1].f); if (last) g.end = Math.min(g.end, Math.round(last.e * 30) + 10); });
  return out;
})();
const Subs: React.FC<{ f: number }> = ({ f }) => {
  const g = GROUPS.find((q) => f >= q.start && f < q.end);
  if (!g) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 1300 }}>
      <div style={{ display: "flex", columnGap: 30, flexWrap: "wrap", justifyContent: "center", maxWidth: 1000 }}>
        {g.words.map((w, k) => {
          const u = (f - w.f) / 5, shown = f >= w.f - 1, pop = shown ? 1 + 0.12 * Math.max(0, 1 - u) ** 2 : 1;
          return (
            <span key={k} style={{
              fontFamily: FONT, fontWeight: 900, WebkitTextStroke: "14px #0d0b12", paintOrder: "stroke fill", fontSize: 112, lineHeight: 1.05, padding: "0 8px", color: w.col ?? "#ffffff",
              textShadow: "0 8px 0 rgba(0,0,0,0.45)", opacity: shown ? 1 : 0, transform: `scale(${pop})`, display: "inline-block", letterSpacing: 1,
            } as React.CSSProperties}>{w.text}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const FastedDynamic3D: React.FC = () => {
  const f = useCurrentFrame();
  const i = shotOf(f);
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <ShotView i={i} />
      <Labels f={f} i={i} />
      <MythStamp f={f} />
      <Subs f={f} />
      {!(getInputProps() as { mute?: boolean }).mute && <Audio src={staticFile("voz_fasted/mezcla_dyn.wav")} />}
    </AbsoluteFill>
  );
};
export { TOTAL };
