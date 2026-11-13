// "The Spot Reduction Myth" (PumpParadox, Short 4). Cloned from ventana/Ventana.tsx: same dark gym + warm overhead spot, same composer (ink, lens blur,
// bloom, tone map, grade), same flat 2D cel-shaded Tito / pigeon cards planted on the 3D floor, same floating technical labels (thin white leader +
// dark semi-transparent box), same small word-by-word subtitles with red / green key words. Scene 2 is a navy SVG diagram (like Ventana's scene 3).
// Scene changes are HARD CUTS (no crossfades). Every floating label lives above y = 1380; the subtitles live at y ~ 1400-1620.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, getInputProps } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, bellyWorld, runPt, runBob } from "./world";
import { InkPass, noInkFallback } from "../alejandro/ink";
import { LensBlur } from "../alejandro/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../alejandro/grade";
import { layersAt, dofAt, camAt, smooth, clamp01, sceneStart, sceneEnd, sceneOf, wordF, counterAt, T4_TINY, T4_DRAIN, T3_ON, DIAGRAM_VIEWS, allCuts, beatPhase, TOTAL, FPS } from "./story";
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
const RED = "#EF4444", GREEN = "#22C55E", BRIGHT_GREEN = "#3DFF7A";

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
    {id === 2 ? <Diagram /> : (
      <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.2, far: 1500 }}>
        <Inner id={id} />
      </ThreeCanvas>
    )}
  </AbsoluteFill>
);

const strokeText = (sw: number): React.CSSProperties => ({ fontFamily: FONT, fontWeight: 900, WebkitTextStroke: `${sw}px #120c0c`, paintOrder: "stroke fill" } as React.CSSProperties);
const SvgDefs = () => (
  <defs>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#000" floodOpacity="0.55" /></filter>
    <linearGradient id="gBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0E1830" /><stop offset="1" stopColor="#04060D" /></linearGradient>
    <clipPath id="torsoClip"><path d="M170 130 Q600 40 1030 130 L960 1340 L240 1340 Z" /></clipPath>
    <clipPath id="muscleClip"><rect x={290} y={780} width={620} height={470} rx={60} /></clipPath>
  </defs>
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

// ---------------------------------------------------------------- scenes 1, 3, 4: labels on the 3D shots
const Labels: React.FC<{ f: number; id: number }> = ({ f, id }) => {
  const s0 = sceneStart(id - 1), ts = (f - s0) / FPS, out = labelsOut(id, f);
  let chips: React.ReactNode = null;
  if (id === 1) {
    const bw = bellyWorld(f), [bx, by] = project(1, f, bw[0], bw[1], bw[2]), [hx, hy] = project(1, f, -0.55, 0.62, 0.1);
    const n = counterAt(f), fin = n >= 9999, cnt = fin ? (Math.floor(f / 3) % 2 ? "9,998" : "9,999") : n.toLocaleString("en-US");
    chips = (<>
      <Chip x={290} y={270} k="CRUNCHES:" v={cnt} col={fin ? RED : BRIGHT_GREEN} ax={hx} ay={hy} op={smooth(ts / 0.25)} />
      <Chip x={790} y={450} k="TARGET:" v="BELLY FAT" col={RED} ax={bx} ay={by} op={smooth((f - wordF("aimed") + 4) / 6)} />
    </>);
  } else if (id === 3) {
    const [ax, ay] = project(3, f, ...runPt(300, 480, runBob(f)));
    chips = <Chip x={290} y={300} k="CALORIE DEFICIT:" v="ACTIVE" col={BRIGHT_GREEN} ax={ax} ay={ay} op={smooth((f - wordF("deficit", 0) + 6) / 6)} />;
  } else if (id === 4) {
    const tinyF = s0 + T4_TINY() * FPS, drainF = s0 + T4_DRAIN() * FPS;
    const [ba, bb] = project(4, f, 2.05, 0.82, -0.2), [da, db] = project(4, f, -0.4, 0.05, -1.0);
    chips = (<>
      <Chip x={290} y={300} k="TINY BUCKET" col={RED} ax={ba} ay={bb} op={smooth((f - tinyF) / 6) * (f < drainF ? 1 : 0)} />
      <Chip x={540} y={300} k="SYSTEMIC DRAIN" col={BRIGHT_GREEN} ax={da} ay={db} op={smooth((f - drainF) / 6)} />
    </>);
  }
  if (!chips) return null;
  return <AbsoluteFill><svg width={1080} height={1920}><SvgDefs /><g opacity={out}>{chips}</g></svg></AbsoluteFill>;
};

// ---------------------------------------------------------------- scene 2: the diagram (translucent torso: red muscle shouting into a walkie-talkie, fat cells with headphones ignoring it)
const Diagram: React.FC = () => {
  const f = useCurrentFrame();
  const ts = (f - sceneStart(1)) / FPS, inn = smooth(ts / 0.35), out = labelsOut(2, f), shout = Math.floor(f / 4) % 2, bob = f * 0.09;
  const K = 0.84, TX = 36, TY = 230;                                          // 1200 x 1400 torso design -> screen
  const sx = (x: number) => TX + x * K, sy = (y: number) => TY + y * K;
  const vi = (() => { let i = 0; DIAGRAM_VIEWS.forEach((v, k) => { if (ts >= v.t) i = k; }); return i; })();
  const v0 = DIAGRAM_VIEWS[vi], vEnd = DIAGRAM_VIEWS[vi + 1]?.t ?? ts + 1, vu = smooth((ts - v0.t) / Math.max(0.3, vEnd - v0.t));
  const vs = v0.s * (1 + 0.07 * vu) * (1 + 0.02 * Math.exp(-beatPhase(f) * 6)), vcy = v0.cy;      // hard-cut camera views over the diagram
  const my = 780, fy = my + 120, ck = (i: number) => ({ cx: 330 + i * 270, cy: 380 + 10 * Math.sin(bob * 2 + i * 2.1) - (i === 1 ? 20 : 0) });
  const waves = [0, 1, 2].map((k) => { const p = ((f * 0.035 + k / 3) % 1), r = 90 + p * 250, a1 = Math.PI * 1.22, a2 = Math.PI * 1.78; return { k, p, r, a1, a2 }; });
  const OUT = "#120c0c";
  return (
    <AbsoluteFill style={{ background: "#04060d" }}><svg width={1080} height={1920}><SvgDefs />
      <rect width={1080} height={1920} fill="url(#gBg)" />
      {Array.from({ length: 70 }, (_, i) => <circle key={i} cx={(i * 197) % 1080} cy={(i * 331 + Math.sin(f * 0.07 + i) * 18) % 1920} r={2 + (i % 3)} fill="#6f86c8" opacity={0.18} />)}
      <g opacity={inn * out} transform={`translate(540 960) scale(${vs}) translate(-540 ${-vcy}) translate(${TX} ${TY}) scale(${K})`} filter="url(#sh)" strokeLinejoin="round" strokeLinecap="round">
        <path d="M170 130 Q600 40 1030 130 L960 1340 L240 1340 Z" fill="rgba(110,190,255,0.13)" />
        <g clipPath="url(#torsoClip)"><rect x={0} y={150} width={1200} height={520} fill="rgba(255,210,70,0.10)" /><rect x={0} y={700} width={1200} height={700} fill="rgba(229,72,77,0.10)" /></g>
        <path d="M170 130 Q600 40 1030 130 L960 1340 L240 1340 Z" fill="none" stroke="rgba(170,225,255,0.95)" strokeWidth={9} />
        <line x1={215} y1={680} x2={985} y2={680} stroke="rgba(255,255,255,0.55)" strokeWidth={5} strokeDasharray="26 18" />
        {/* the abdominal muscle */}
        <rect x={290} y={my} width={620} height={470} rx={60} fill="#E5484D" />
        <g clipPath="url(#muscleClip)" opacity={0.9}>
          {Array.from({ length: 14 }, (_, i) => <line key={i} x1={320 + i * 44} y1={my} x2={330 + i * 44} y2={my + 470} stroke="rgba(120,16,38,0.4)" strokeWidth={6} />)}
          {[my + 175, my + 330].map((y) => <line key={y} x1={290} y1={y} x2={910} y2={y} stroke="#8a1c2a" strokeWidth={10} />)}
        </g>
        <rect x={290} y={my} width={620} height={470} rx={60} fill="none" stroke={OUT} strokeWidth={11} />
        {[-1, 1].map((s) => <g key={s}>
          <ellipse cx={600 + s * 110} cy={fy} rx={44} ry={48} fill="#fff" stroke={OUT} strokeWidth={8} /><circle cx={600 + s * 110} cy={fy + 4} r={15} fill="#111114" />
          <line x1={600 + s * 170} y1={fy - 70} x2={600 + s * 50} y2={fy - 40} stroke={OUT} strokeWidth={14} />
        </g>)}
        <ellipse cx={600} cy={fy + 150} rx={66} ry={40 + 34 * shout} fill="#3a0710" stroke={OUT} strokeWidth={9} />
        <ellipse cx={600} cy={fy + 164 + 14 * shout} rx={36} ry={14 + 10 * shout} fill="#ff7a8a" />
        {/* fist + walkie-talkie pointing up at the fat layer (antenna + speaker + signal light) */}
        <circle cx={600} cy={my - 8} r={46} fill="#E5484D" stroke={OUT} strokeWidth={9} />
        <rect x={548} y={my - 250} width={104} height={220} rx={18} fill="#23262f" stroke={OUT} strokeWidth={9} />
        <rect x={566} y={my - 232} width={68} height={62} rx={8} fill="#7CE8FF" stroke={OUT} strokeWidth={5} />
        {[0, 1, 2].map((i) => <line key={i} x1={566} y1={my - 142 + i * 26} x2={634} y2={my - 142 + i * 26} stroke="#555b6e" strokeWidth={8} />)}
        <line x1={632} y1={my - 250} x2={632} y2={my - 340} stroke={OUT} strokeWidth={12} /><circle cx={632} cy={my - 346} r={14} fill={shout ? RED : "#7a1f1f"} stroke={OUT} strokeWidth={5} />
        {/* sound waves climbing to the (deaf) cells */}
        {waves.map((w) => <path key={w.k} d={`M ${600 + w.r * Math.cos(w.a1)} ${my - 270 + w.r * Math.sin(w.a1)} A ${w.r} ${w.r} 0 0 1 ${600 + w.r * Math.cos(w.a2)} ${my - 270 + w.r * Math.sin(w.a2)}`}
          fill="none" stroke="#ffffff" strokeWidth={15} opacity={(1 - w.p) * 0.9} />)}
        {/* fat cells with sunglasses + headphones */}
        {[0, 1, 2].map((i) => { const { cx, cy } = ck(i), r = 112; return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="#FFD84A" stroke={OUT} strokeWidth={9} />
            <ellipse cx={cx - 40} cy={cy - 60} rx={30} ry={14} fill="#FFF3A8" transform={`rotate(-20 ${cx - 40} ${cy - 60})`} />
            <path d={`M ${cx - r - 6} ${cy + 10} A ${r + 6} ${r + 6} 0 0 1 ${cx + r + 6} ${cy + 10}`} fill="none" stroke="#161a24" strokeWidth={16} />
            {[-1, 1].map((s) => <g key={s}><ellipse cx={cx + s * (r + 4)} cy={cy + 18} rx={20} ry={38} fill="#2b2f40" stroke={OUT} strokeWidth={6} /><ellipse cx={cx + s * (r + 4)} cy={cy + 18} rx={9} ry={22} fill="#ff4d6a" /></g>)}
            <rect x={cx - 82} y={cy - 22} width={72} height={44} rx={14} fill="#111114" /><rect x={cx + 10} y={cy - 22} width={72} height={44} rx={14} fill="#111114" /><rect x={cx - 12} y={cy - 12} width={24} height={10} fill="#111114" />
            <path d={`M ${cx - 32} ${cy + 36} Q ${cx} ${cy + 66} ${cx + 32} ${cy + 36}`} fill="none" stroke="#7a5200" strokeWidth={6} />
          </g>); })}
      </g>
      <Chip x={540} y={150} k="STATUS:" v="IGNORED" col={RED} ax={540} ay={Math.min(1330, Math.max(60, 960 + (sy(ck(1).cy) - vcy) * vs))} op={(Math.floor(f / 6) % 2 === 0 ? 1 : 0.18) * smooth((ts - 0.3) / 0.3) * out * (960 + (sy(ck(1).cy) - vcy) * vs > 300 ? 1 : 0)} />
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- frenzy: a 3-frame white flash on every hard cut + speed lines on the crunch and sprint scenes
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
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------------------------------------------------------- subtitles: small, spaced, key words in red / green
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
type SW = { text: string; col: string | null; f: number };
type SG = { start: number; end: number; words: SW[] };
const PHRASES: { w: string[]; col: string }[] = [
  { w: ["myth"], col: RED }, { w: ["ignored"], col: RED }, { w: ["tiny", "bucket"], col: RED }, { w: ["spine"], col: RED },
  { w: ["calorie", "deficit"], col: GREEN }, { w: ["systemically"], col: GREEN }, { w: ["core"], col: GREEN },
];
const GROUPS: SG[] = (() => {
  const ws = WORDS.words as { w: string; t: number; e: number }[], nw = ws.map((x) => norm(x.w)), cols: (string | null)[] = ws.map(() => null);
  ws.forEach((_, i) => PHRASES.forEach((p) => { if (p.w.every((q, k) => nw[i + k] === q)) p.w.forEach((_q, k) => (cols[i + k] = p.col)); }));
  const out: SG[] = []; let cur: SW[] = [], prev = "";
  const flush = () => { if (cur.length) out.push({ start: cur[0].f - 1, end: 0, words: cur }); cur = []; };
  ws.forEach((x, i) => {
    if (cur.length >= 3 || /[.,;:?!—]$/.test(prev) || cur.reduce((n, q) => n + q.text.length, 0) > 15 || (cur.length && cols[i] && cols[i] !== cur[cur.length - 1].col)) flush();
    cur.push({ text: x.w.replace(/[.,;:¿?¡!—’']/g, (m) => (m === "’" || m === "'" ? "'" : "")).toUpperCase(), col: cols[i], f: Math.max(0, Math.round(x.t * 30)) });
    prev = x.w;
  });
  flush();
  out.forEach((g, i) => { g.end = i + 1 < out.length ? out[i + 1].start : Math.round(ws[ws.length - 1].e * 30) + 10; });
  return out;
})();
const Subs: React.FC<{ f: number }> = ({ f }) => {
  const g = GROUPS.find((q) => f >= q.start && f < q.end);
  if (!g) return null;
  const pad = 300;   // the subtitles sit at y ~ 1400-1620: every diagram label stays above y = 1380
  const fadeOut = 1 - smooth((f - (g.end - 3)) / 3);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: pad }}>
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

export const SpotShort3D: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      {layersAt(f).map((l) => <ShotView key={`shot${l.id}`} id={l.id} alpha={l.alpha} />)}
      {(sceneOf(f) === 0 || sceneOf(f) === 2) && <SpeedLines f={f} k={sceneOf(f) === 0 ? 0.9 : 0.7} />}
      {layersAt(f).map((l) => <Labels key={`lab${l.id}`} f={f} id={l.id} />)}
      <Flash f={f} />
      <Subs f={f} />
      {!(getInputProps() as { mute?: boolean }).mute && <Audio src={staticFile("voz_spot/mezcla.wav")} />}
    </AbsoluteFill>
  );
};
export { TOTAL, T3_ON };
