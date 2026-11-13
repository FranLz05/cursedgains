// "The Fasted Cardio Myth" (PumpParadox, Short 5). Cloned from ventana/Ventana.tsx via spot/Spot3D.tsx: same dark gym + warm overhead spot, same composer (ink, lens blur,
// bloom, tone map, grade), same flat 2D cel-shaded Tito / pigeon cards planted on the 3D floor, same floating technical labels (thin white leader + dark semi-transparent
// box), same small word-by-word subtitles with red / green key words. Hard cuts only (no crossfades, no flat SVG scenes). Every floating label lives above y = 1380;
// the subtitles live at y ~ 1400-1620.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, getInputProps } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, runPt, runBob, BAR_POS, BAR_H, CALC_AT, S4_X } from "./world";
import { InkPass, noInkFallback } from "../alejandro/ink";
import { LensBlur } from "../alejandro/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../alejandro/grade";
import { layersAt, dofAt, camAt, smooth, clamp01, sceneStart, sceneEnd, sceneOf, wordF, allCuts, TOTAL, FPS } from "./story";
import WORDS from "./palabras.json";

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();
const FONT = "Arial Black, Impact, sans-serif";
const MONO = "'Courier New', Consolas, monospace";
const RED = "#EF4444", GREEN = "#22C55E", BRIGHT_GREEN = "#3DFF7A", YELLOW = "#FFD23F", BLUE = "#5AB8FF";
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene, gl, size } = useThree();
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
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
  const target = world.update(id, f, cam, scene);
  noInkFallback(world.root);
  const d = dofAt(id, f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, "day");
  return <primitive object={world.root} dispose={null} />;
};

const dprOverride = () => (getInputProps() as { dpr?: number }).dpr;
const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows
      gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

const strokeText = (sw: number): React.CSSProperties => ({ fontFamily: FONT, fontWeight: 900, WebkitTextStroke: `${sw}px #120c0c`, paintOrder: "stroke fill" } as React.CSSProperties);
const SvgDefs = () => (
  <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#000" floodOpacity="0.55" /></filter></defs>
);

/** floating technical label: thin white leader to an anchor, dark semi-transparent box, crisp monospaced text (value in colour; v omitted = one line) */
const Chip: React.FC<{ x: number; y: number; k: string; v?: string; col: string; ax: number; ay: number; op: number; size?: number }> = ({ x, y, k, v, col, ax, ay, op, size = 34 }) => {
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
const project = (id: number, f: number, wx: number, wy: number, wz: number) => {
  const c = camAt(id, f);
  pcL.position.set(...c.pos); pcL.fov = c.fov; pcL.up.set(Math.sin(c.roll), Math.cos(c.roll), 0); pcL.updateProjectionMatrix(); pcL.lookAt(...c.look); pcL.updateMatrixWorld();
  const q = new THREE.Vector3(wx, wy, wz).project(pcL); return [(q.x + 1) * 540, (1 - q.y) * 960] as const;
};
const labelsOut = (id: number, f: number) => 1 - smooth((f - (sceneEnd(id - 1) - 4)) / 8);
const on = (f: number, w: string, nth = 0, lead = 4) => smooth((f - wordF(w, nth) + lead) / 6);

// ---------------------------------------------------------------- labels (each scene shows only what the brief asks for)
const Labels: React.FC<{ f: number; id: number }> = ({ f, id }) => {
  const s0 = sceneStart(id - 1), ts = (f - s0) / FPS, out = labelsOut(id, f);
  let chips: React.ReactNode = null;
  let divider = false;
  if (id === 1) {
    const bob = runBob(f), [bx, by] = project(1, f, ...runPt(300, 560, bob)), [cx, cy] = project(1, f, 0, 1.45, -1.0);
    chips = (<>
      <Chip x={290} y={300} k="STOMACH:" v="EMPTY" col={RED} ax={bx} ay={by} op={on(f, "calorie", 0, 12)} />
      <Chip x={790} y={450} k="TREADMILL SPEED:" v="MACH 3" col={BRIGHT_GREEN} ax={cx} ay={cy} op={on(f, "sprinting", 0, 10)} />
    </>);
  } else if (id === 2) {
    const [ta, tb] = project(2, f, BAR_POS[2][0][0], BAR_H - 0.1, BAR_POS[2][0][1] + 0.3), [fa, fb] = project(2, f, BAR_POS[2][0][0], 1.2, BAR_POS[2][0][1] + 0.3), [ca, cb] = project(2, f, BAR_POS[2][1][0], 0.8, BAR_POS[2][1][1] + 0.3);
    const [ha, hb] = project(2, f, ...runPt(300, 232, runBob(f)));
    const early = 1 - smooth((ts - 3.2) / 0.5);
    chips = (<>
      <Chip x={540} y={170} k="DURING WORKOUT" col="#ffffff" ax={ta} ay={tb} op={smooth(ts / 0.3) * early} />
      <Chip x={290} y={360} k="FAT BURNED" col={YELLOW} ax={fa} ay={fb} op={smooth((ts - 0.6) / 0.4)} />
      <Chip x={790} y={520} k="CARBS BURNED" col={BLUE} ax={ca} ay={cb} op={smooth((ts - 1.3) / 0.4)} />
      <Chip x={790} y={270} k="INSULIN:" v="LOW" col={BRIGHT_GREEN} ax={ha} ay={hb} op={on(f, "insulin", 0, 10)} />
    </>);
  } else if (id === 3) {
    const [ba, bb] = project(3, f, BAR_POS[3][0][0] + 0.45, BAR_H - 0.2, BAR_POS[3][0][1]), [ka, kb] = project(3, f, CALC_AT[0], 1.9, CALC_AT[2] + 0.2);
    chips = (<>
      <Chip x={290} y={250} k="24-HOUR COMPENSATION" col={YELLOW} ax={ba} ay={bb} op={on(f, "later", 0, 8)} />
      <Chip x={760} y={440} k="METABOLISM:" v="BALANCING BUDGET" col={BRIGHT_GREEN} ax={ka} ay={kb} op={on(f, "balance", 0, 10)} />
    </>);
  } else if (id === 4) {
    const [la, lb] = project(4, f, ...runPt(300, 232, runBob(f), -S4_X)), [ra, rb] = project(4, f, ...runPt(300, 232, runBob(f, 3.2) * 1.6, S4_X)), [sa, sb] = project(4, f, 0, 0.75, 1.2);
    divider = true;
    chips = (<>
      <Chip x={290} y={250} k="FASTED TITO" col={RED} ax={la} ay={lb} op={smooth(ts / 0.3)} />
      <Chip x={790} y={250} k="FED TITO" col={BRIGHT_GREEN} ax={ra} ay={rb} op={smooth((ts - 0.15) / 0.3)} />
      <Chip x={540} y={1290} k="FAT LOSS:" v="IDENTICAL" col={YELLOW} ax={sa} ay={sb} op={on(f, "exact", 0, 8)} />
    </>);
  }
  if (!chips) return null;
  return (
    <AbsoluteFill><svg width={1080} height={1920}><SvgDefs />
      {divider && <line x1={540} y1={90} x2={540} y2={1340} stroke="#ffffff" strokeWidth={6} opacity={0.9 * out} />}
      <g opacity={out}>{chips}</g>
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- frenzy: a 3-frame white flash on every hard cut + speed lines on the sprint scenes
const CUTS = allCuts();
const Flash: React.FC<{ f: number }> = ({ f }) => {
  const k = CUTS.reduce((m, c) => (f >= c && f < c + 3 ? Math.max(m, [0.42, 0.2, 0.08][f - c]) : m), 0);
  return k > 0 ? <AbsoluteFill style={{ background: "#fff", opacity: k }} /> : null;
};
const SpeedLines: React.FC<{ f: number; k: number }> = ({ f, k }) => {
  const seed = Math.floor(f / 2), lines = Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2 + hh(seed + i, 1) * 0.2, r0 = 560 + hh(seed * 3 + i, 2) * 260, r1 = r0 + 260 + hh(seed + i * 5, 3) * 520;
    return <line key={i} x1={540 + Math.cos(a) * r0} y1={900 + Math.sin(a) * r0 * 1.2} x2={540 + Math.cos(a) * r1} y2={900 + Math.sin(a) * r1 * 1.2} stroke="#ffffff" strokeWidth={4 + hh(seed + i, 4) * 8} strokeLinecap="round" opacity={(0.1 + 0.1 * hh(seed + i, 5)) * k} />;
  });
  return <AbsoluteFill><svg width={1080} height={1920}>{lines}</svg></AbsoluteFill>;
};

// ---------------------------------------------------------------- subtitles: small, spaced, key words in red / green
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
type SW = { text: string; col: string | null; f: number };
type SG = { start: number; end: number; words: SW[] };
const PHRASES: { w: string[]; col: string }[] = [
  { w: ["bear"], col: RED }, { w: ["spoiler"], col: RED }, { w: ["stupid"], col: RED }, { w: ["suffering"], col: RED }, { w: ["nothing"], col: RED },
  { w: ["compensates"], col: GREEN }, { w: ["exact", "same", "fat", "loss"], col: GREEN }, { w: ["banana"], col: GREEN }, { w: ["calorie", "deficit"], col: GREEN },
];
const GROUPS: SG[] = (() => {
  const ws = WORDS.words as { w: string; t: number; e: number }[], nw = ws.map((x) => norm(x.w)), cols: (string | null)[] = ws.map(() => null);
  ws.forEach((_, i) => PHRASES.forEach((p) => { if (p.w.every((q, k) => nw[i + k] === q)) p.w.forEach((_q, k) => (cols[i + k] = p.col)); }));
  const out: SG[] = []; let cur: SW[] = [], prev = "";
  const flush = () => { if (cur.length) out.push({ start: cur[0].f - 1, end: 0, words: cur }); cur = []; };
  ws.forEach((x, i) => {
    if (cur.length >= 3 || /[.,;:?!—]$/.test(prev) || cur.reduce((n, q) => n + q.text.length, 0) > 15 || (cur.length && cols[i] && cols[i] !== cur[cur.length - 1].col)) flush();
    cur.push({ text: x.w.replace(/[,.;:?!—]+$/g, "").replace(/’/g, "'").toUpperCase(), col: cols[i], f: Math.max(0, Math.round(x.t * 30)) });
    prev = x.w;
  });
  flush();
  out.forEach((g, i) => { g.end = i + 1 < out.length ? out[i + 1].start : Math.round(ws[ws.length - 1].e * 30) + 12; });
  out.forEach((g) => { const last = ws.find((x) => Math.round(x.t * 30) === g.words[g.words.length - 1].f); if (last) g.end = Math.min(g.end, Math.round(last.e * 30) + 8); });
  return out;
})();
const Subs: React.FC<{ f: number }> = ({ f }) => {
  const g = GROUPS.find((q) => f >= q.start && f < q.end);
  if (!g) return null;
  const fadeOut = 1 - smooth((f - (g.end - 3)) / 3);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 300 }}>
      <div style={{ display: "flex", columnGap: 54, rowGap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 900, opacity: fadeOut }}>
        {g.words.map((w, i) => {
          const u = (f - w.f) / 7, shown = f >= w.f - 1, pop = shown ? 1 + 0.05 * Math.max(0, 1 - u) ** 2 : 0.85;
          return (
            <span key={i} style={{
              ...strokeText(11), fontSize: w.col ? 99 : 88, lineHeight: 1.05, padding: "0 10px", color: w.col ?? "#ffffff",
              textShadow: "0 7px 0 rgba(0,0,0,0.5)", opacity: shown ? 1 : 0, transform: `scale(${pop}) translateY(${shown ? Math.max(0, 1 - u) * 12 : 18}px)`, display: "inline-block",
            }}>{w.text}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const FastedShort3D: React.FC = () => {
  const f = useCurrentFrame();
  const sc = sceneOf(f);
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      {layersAt(f).map((l) => <ShotView key={`shot${l.id}`} id={l.id} alpha={l.alpha} />)}
      {(sc === 0 || sc === 1) && <SpeedLines f={f} k={sc === 0 ? 0.9 : 0.6} />}
      {layersAt(f).map((l) => <Labels key={`lab${l.id}`} f={f} id={l.id} />)}
      <Flash f={f} />
      <Subs f={f} />
      {!(getInputProps() as { mute?: boolean }).mute && <Audio src={staticFile("voz_fasted/mezcla.wav")} />}
    </AbsoluteFill>
  );
};
export { TOTAL };
