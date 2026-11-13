// "The Anabolic Window Myth" (PumpParadox, Short 3): same look as "Sweating != Burning Fat" / "volumen_basura_gym" (dark gym, warm overhead spot,
// flat 2D Tito in a red tank top with a sweatband, small word-by-word subtitles with red / green key words, technical floating labels).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, getInputProps } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, T_TIMER, T_COUGH, timerState } from "./world";
import { InkPass, noInkFallback } from "../alejandro/ink";
import { LensBlur } from "../alejandro/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../alejandro/grade";
import { layersAt, dofAt, camAt, smooth, clamp01, uOf, sceneStart, sceneEnd, SENT, FPS } from "./story";
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
    {id === 3 ? <Diagram /> : (
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
    <filter id="glow" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="14" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    <linearGradient id="gAmino" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF08A" /><stop offset="1" stopColor="#F5B400" /></linearGradient>
    <linearGradient id="gTime" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7CFFA6" /><stop offset="1" stopColor="#12B84A" /></linearGradient>
    <linearGradient id="gMuscle" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F8B7A3" /><stop offset="1" stopColor="#D9786A" /></linearGradient>
    <linearGradient id="gBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0E1830" /><stop offset="1" stopColor="#04060D" /></linearGradient>
  </defs>
);
const Label: React.FC<{ x: number; y: number; text: string; size: number; fill: string; op?: number; sw?: number }> = ({ x, y, text, size, fill, op = 1, sw = 12 }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONT} fontSize={size} fill={fill} stroke="#120c0c" strokeWidth={sw} strokeLinejoin="round" paintOrder="stroke" opacity={op} filter="url(#sh)">{text}</text>
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
  pcL.position.set(...c.pos); pcL.fov = c.fov; pcL.updateProjectionMatrix(); pcL.lookAt(...c.look); pcL.updateMatrixWorld();
  const q = new THREE.Vector3(wx, wy, wz).project(pcL); return [(q.x + 1) * 540, (1 - q.y) * 960] as const;
};
const SU = 0.00216;                                           // metres per card unit (card 600 x 1000, feet at y = 975)
const cardWorld = (cx0: number, cy0: number, x: number, z: number, cardX: number, cardY: number, scale = 1, y0 = 0): [number, number, number] =>
  [x + (cardX - cx0) * SU * scale, y0 + (975 - cardY) * SU * scale, z];

// ---------------------------------------------------------------- scene 1: labels on the bomb timer and on Tito + a red panic vignette
const PanicLabels: React.FC<{ f: number }> = ({ f }) => {
  const s0 = sceneStart(0), end = sceneEnd(0);
  if (f >= end + 8) return null;
  const ts = (f - s0) / FPS, out = 1 - smooth((f - (end - 4)) / 10);
  if (ts < T_TIMER) return null;
  const tm = timerState(ts), hop = ts < T_TIMER + 0.42 ? 0.12 * Math.sin(Math.PI * (ts - T_TIMER) / 0.42) : 0;
  const tp = cardWorld(300, 548, 0, 0, 180, 548, 1, hop), hd = cardWorld(300, 232, 0, 0, 380, 190, 1, hop);
  const [ax, ay] = project(1, f, tp[0], tp[1], tp[2]), [bx, by] = project(1, f, hd[0], hd[1], hd[2]);
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.55), vg = smooth((ts - T_TIMER) / 0.6) * (0.16 + 0.12 * pulse) * out;
  void tm;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 55%, rgba(255,0,0,0) 38%, rgba(220,20,20,0.9) 100%)", opacity: vg }} />
      <svg width={1080} height={1920}>
        <Chip x={270} y={1010} k="ANABOLIC WINDOW:" v="CLOSING FAST" col={RED} ax={ax} ay={ay} op={smooth((ts - T_TIMER - 0.35) / 0.4) * out} size={34} />
        <Chip x={800} y={300} k="STATUS:" v="PANIC MODE" col={RED} ax={bx} ay={by} op={smooth((ts - T_TIMER - 1.9) / 0.4) * out} size={34} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 2: hydration label on the mouth
const ScoopLabels: React.FC<{ f: number }> = ({ f }) => {
  if (f < sceneStart(1) || f > sceneEnd(1) + 8) return null;
  const ts = (f - sceneStart(1)) / FPS, out = 1 - smooth((f - (sceneEnd(1) - 4)) / 10);
  const m = cardWorld(300, 300, 0, 0, 300, 290), [ax, ay] = project(2, f, m[0], m[1], m[2]);
  return <AbsoluteFill><svg width={1080} height={1920}><Chip x={265} y={620} k="HYDRATION LEVEL:" v="-100%" col={RED} ax={ax} ay={ay} op={smooth((ts - T_COUGH - 0.4) / 0.4) * out} size={34} /></svg></AbsoluteFill>;
};

// ---------------------------------------------------------------- scene 4: split screen with the two daily-protein batteries
const Split: React.FC<{ f: number }> = ({ f }) => {
  if (f < sceneStart(3) || f > sceneEnd(3) + 8) return null;
  const u = uOf(4, f), ts = (f - sceneStart(3)) / FPS, op = smooth((f - sceneStart(3)) / 10) * (1 - smooth((f - (sceneEnd(3) - 4)) / 8));
  const lowK = 40 / 150, blink = lowK + 0.012 * Math.sin(f * 0.5);
  const rise = smooth((ts - 1.4) / 3.2);                                    // the right battery fills as the meal goes in
  const battery = (x: number, fillK: number, color: string) => (
    <g>
      <rect x={x - 190} y={436} width={380} height={86} rx={22} fill="#0b0f1a" stroke="#f4f6fb" strokeWidth={8} />
      <rect x={x - 180} y={446} width={Math.max(8, 360 * fillK)} height={66} rx={14} fill={color} />
      <rect x={x + 190} y={464} width={16} height={30} rx={6} fill="#f4f6fb" />
    </g>
  );
  return (
    <AbsoluteFill><svg width={1080} height={1920}><SvgDefs />
      <g opacity={op} filter="url(#sh)">
        <line x1={540} x2={540} y1={150} y2={1290} stroke="#ffffff" strokeWidth={5} strokeDasharray="22 14" opacity={0.7} />
        {battery(290, blink, RED)}
        {battery(790, lerp0(0.1, 1, rise), GREEN)}
      </g>
      <Chip x={290} y={290} k="DAILY PROTEIN:" v="40 / 150G" col={RED} ax={290} ay={436} op={smooth((ts - 0.5) / 0.4) * op} size={34} />
      <Chip x={790} y={290} k="DAILY PROTEIN:" v={`${Math.round(lerp0(15, 150, rise))} / 150G`} col={GREEN} ax={790} ay={436} op={smooth((ts - 0.9) / 0.4) * op} size={34} />
    </svg></AbsoluteFill>
  );
};
const lerp0 = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------- scene 5: Dr. Pigeon + the prescription
const PigeonLabels: React.FC<{ f: number }> = ({ f }) => {
  if (f < sceneStart(4)) return null;
  const ts = (f - sceneStart(4)) / FPS, pu = smooth((ts - 0.1) / 0.9), px = lerp0(3.4, 0.8, pu);
  const head = cardWorld(300, 616, px, 0.55, 300, 590, 0.82, 0.05), clip = cardWorld(300, 812, px, 0.55, 420, 790, 0.82, 0.05);
  const [hx, hy] = project(5, f, head[0], head[1], head[2]), [cx, cy] = project(5, f, clip[0], clip[1], clip[2]);
  return (
    <AbsoluteFill><svg width={1080} height={1920}>
      <Chip x={850} y={790} k="DR. PIGEON" col="#7CC8FF" ax={hx} ay={hy} op={smooth((ts - 1.0) / 0.4)} size={36} />
      <Chip x={600} y={1010} k="PRESCRIPTION:" v="JUST EAT NORMAL FOOD" col={GREEN} ax={cx} ay={cy} op={smooth((ts - 2.8) / 0.4)} size={32} />
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 3: the diagram (30-min myth explodes, 48 h timeline, muscle sponge soaks up amino acids)
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const MYTH_F = (() => { const w = (WORDS.words as { w: string; t: number }[]).find((x) => norm(x.w) === "myth"); return w ? Math.round(w.t * 30) : sceneStart(2) + 90; })();
const BLOCKS = 13;
const Diagram: React.FC = () => {
  const f = useCurrentFrame();
  const F0 = sceneStart(2), END = sceneEnd(2), S7 = SENT[7];
  const ds = (f - F0) / FPS, boom = (f - MYTH_F) / FPS;
  const tlIn = smooth((f - (S7 - 6)) / 26), tlProg = clamp01((f - (S7 - 6)) / (END - S7 + 6));
  const armIn = smooth((boom - 0.35) / 0.4);
  // --- amino-acid blocks drift slowly and steadily from the timeline into the bicep
  const B0 = S7 + 24, GAP = (END - 10 - B0) / BLOCKS, TRAVEL = 66;
  const blocks = Array.from({ length: BLOCKS }, (_, i) => {
    const s = B0 + i * GAP, p = (f - s) / TRAVEL; if (p < 0 || p > 1) return null;
    const x0 = 150 + hh(i, 1) * 780, y0 = 782, tx = 440 + (hh(i, 2) - 0.5) * 150, ty = 1150 + (hh(i, 3) - 0.5) * 80;
    const e = smooth(p), x = x0 + (tx - x0) * e + Math.sin(p * 5 + i) * 18 * (1 - e), y = y0 + (ty - y0) * (p * p * (3 - 2 * p));
    return { i, x, y, sz: 52 * (1 - 0.7 * smooth((p - 0.7) / 0.3)), o: clamp01(p * 8) * (1 - smooth((p - 0.88) / 0.12)), p, rot: (hh(i, 4) - 0.5) * 50 + p * 40 };
  });
  const absorbed = Math.min(BLOCKS, Math.max(0, Math.floor((f - B0 - TRAVEL) / GAP) + 1));
  const soak = clamp01(absorbed / BLOCKS), last = f - (B0 + (absorbed - 1) * GAP + TRAVEL), gulp = absorbed > 0 && last >= 0 ? Math.exp(-last / 6) * Math.sin(last * 0.9) : 0;
  const sc = (1 + 0.1 * soak) * (1 + 0.035 * gulp);
  const shown = blocks.filter(Boolean) as NonNullable<(typeof blocks)[number]>[];
  const lead = shown.filter((b) => b.p > 0.35 && b.p < 0.85).sort((a, b) => b.p - a.p)[0] ?? null;
  // --- exploding mini timer
  const timerOn = boom < 0.02, bf = clamp01(boom / 0.7);
  const mmss = timerOn ? `30:${((ds * 6) | 0) % 2 ? "00" : "00"}` : "";
  const pore = (px: number, py: number, rx: number, k: number) => {
    const fill = k < soak * 1.2 ? "#FFD23F" : "#B5524A";
    return <ellipse key={`${px}${py}`} cx={px} cy={py} rx={rx} ry={rx * 0.78} fill={fill} stroke="#7e3a35" strokeWidth={3} opacity={0.95} />;
  };
  const pores: [number, number, number][] = [[-170, -4, 15], [-120, -50, 11], [-90, 24, 17], [-40, -26, 13], [-10, 38, 12], [-150, 52, 11], [-60, 68, 10], [20, -4, 14], [-110, 4, 9], [-190, 40, 9], [-30, -64, 9], [30, 40, 9]];
  return (
    <AbsoluteFill style={{ background: "#04060d" }}><svg width={1080} height={1920}><SvgDefs />
      <rect width={1080} height={1920} fill="url(#gBg)" />
      {Array.from({ length: 70 }, (_, i) => <circle key={i} cx={(i * 197) % 1080} cy={(i * 331 + Math.sin(f * 0.07 + i) * 18) % 1920} r={2 + (i % 3)} fill="#6f86c8" opacity={0.18} />)}

      {/* the small "30 MIN MYTH" timer, then boom */}
      {ds > 0.1 && boom < 0.75 && (
        <g filter="url(#sh)">
          {timerOn && <g opacity={smooth(ds / 0.3)} transform={`translate(540 340) scale(${1 + 0.03 * Math.sin(f * 0.8)}) translate(-540 -340)`}>
            <rect x={380} y={262} width={320} height={156} rx={22} fill="#1b1f2c" stroke="#f4f6fb" strokeWidth={7} />
            <rect x={402} y={284} width={276} height={112} rx={12} fill="#05070c" />
            <text x={540} y={364} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={92} fill="#FF3434" style={{ filter: "drop-shadow(0 0 10px #ff2a2a)" }}>{mmss}</text>
            <Label x={540} y={220} text="30 MIN MYTH" size={50} fill={RED} />
          </g>}
          {!timerOn && <g>
            <circle cx={540} cy={340} r={60 + 380 * bf} fill="#fff6d6" opacity={Math.max(0, 0.95 - bf * 1.6)} />
            <circle cx={540} cy={340} r={30 + 440 * bf} fill="none" stroke="#FFB23A" strokeWidth={26 * (1 - bf)} opacity={1 - bf} />
            {Array.from({ length: 18 }, (_, i) => {
              const a = (i / 18) * Math.PI * 2 + hh(i, 7), sp = 300 + hh(i, 8) * 700, d = sp * (1 - Math.pow(1 - bf, 2)) * 0.9;
              return <rect key={i} x={540 + Math.cos(a) * d - 14} y={340 + Math.sin(a) * d - 9 + 140 * bf * bf} width={28} height={18} rx={3} fill={i % 3 ? "#1b1f2c" : RED} stroke="#f4f6fb" strokeWidth={3} opacity={1 - smooth((bf - 0.6) / 0.4)} transform={`rotate(${bf * 600 * (hh(i, 9) - 0.5)} ${540 + Math.cos(a) * d} ${340 + Math.sin(a) * d})`} />;
            })}
            {Array.from({ length: 6 }, (_, i) => <circle key={`s${i}`} cx={540 + (hh(i, 11) - 0.5) * 220 * bf} cy={340 - 120 * bf * (0.4 + hh(i, 12))} r={30 + 50 * bf} fill="#3a3f52" opacity={0.6 * (1 - bf)} />)}
          </g>}
        </g>
      )}

      {/* the giant 48-hour timeline */}
      {tlIn > 0.01 && (
        <g opacity={tlIn} filter="url(#sh)">
          <Label x={540} y={500} text="REALITY:" size={52} fill="#ffffff" />
          <Label x={540} y={584} text="48 HOUR WINDOW" size={82} fill={BRIGHT_GREEN} />
          <g filter="url(#glow)"><rect x={70} y={668} width={940 * smooth(tlIn * 1.3)} height={96} rx={48} fill="url(#gTime)" stroke="#0a2a14" strokeWidth={9} /></g>
          {[0, 12, 24, 36, 48].map((h, i) => <g key={h}><line x1={110 + i * 215} x2={110 + i * 215} y1={768} y2={792} stroke="#ffffff" strokeWidth={5} opacity={0.85} /><text x={110 + i * 215} y={834} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={36} fill="#ffffff" opacity={0.9}>{h === 0 ? "0H" : `${h}H`}</text></g>)}
          <g transform={`translate(${110 + 860 * tlProg} 716)`}><circle r={24} fill="#ffffff" stroke="#0a2a14" strokeWidth={7} /><circle r={9} fill={RED} /></g>
        </g>
      )}

      {/* the muscle sponge: a flexed arm whose bicep soaks up amino-acid blocks, slowly and steadily */}
      {armIn > 0.01 && (
        <g opacity={armIn} transform={`translate(540 ${1110 + 30 * (1 - armIn)})`} filter="url(#sh)">
          <g>
            <line x1={-250} y1={90} x2={20} y2={110} stroke="#120c0c" strokeWidth={146} strokeLinecap="round" /><line x1={-250} y1={90} x2={20} y2={110} stroke="#F3C79E" strokeWidth={122} strokeLinecap="round" />
            <line x1={20} y1={110} x2={150} y2={-120} stroke="#120c0c" strokeWidth={122} strokeLinecap="round" /><line x1={20} y1={110} x2={150} y2={-120} stroke="#F3C79E" strokeWidth={98} strokeLinecap="round" />
            <circle cx={160} cy={-165} r={74} fill="#F3C79E" stroke="#120c0c" strokeWidth={12} />
            {[-30, -4, 22].map((dy, i) => <line key={i} x1={118} x2={170} y1={-170 + dy} y2={-170 + dy} stroke="#120c0c" strokeWidth={5} strokeLinecap="round" opacity={0.7} />)}
          </g>
          <g transform={`translate(-110 18) scale(${sc}) rotate(-12)`}>
            <ellipse cx={0} cy={0} rx={140} ry={104} fill="url(#gMuscle)" stroke="#120c0c" strokeWidth={12} />
            {pores.map(([px, py, r], i) => pore(px + 100, py, r * 1.15, i / pores.length))}
            <ellipse cx={-26} cy={-62} rx={60} ry={14} fill="#fff" opacity={0.35} transform="rotate(-8 -26 -62)" />
          </g>
        </g>
      )}
      {armIn > 0.4 && <Chip x={846} y={1236} k="MUSCLE SPONGE" col={BRIGHT_GREEN} ax={500} ay={1140} op={smooth((f - (S7 + 70)) / 14)} size={32} />}

      {/* amino-acid blocks */}
      {shown.map((b) => (
        <g key={b.i} opacity={b.o} transform={`translate(${b.x} ${b.y}) rotate(${b.rot})`} filter="url(#sh)">
          <rect x={-b.sz / 2} y={-b.sz / 2} width={b.sz} height={b.sz} rx={9} fill="url(#gAmino)" stroke="#5a3b00" strokeWidth={6} />
          <rect x={-b.sz / 2 + 7} y={-b.sz / 2 + 6} width={b.sz * 0.4} height={b.sz * 0.16} rx={4} fill="#fff" opacity={0.6} />
        </g>
      ))}
      {lead && armIn > 0.4 && <Chip x={215} y={960} k="AMINO ACIDS" col="#FFD23F" ax={lead.x} ay={lead.y} op={smooth((f - (B0 + 2)) / 12)} size={32} />}
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- subtitles: small, spaced, key words in red / green
type SW = { text: string; col: string | null; f: number };
type SG = { start: number; end: number; words: SW[] };
const PHRASES: { w: string[]; col: string }[] = [
  { w: ["evaporate"], col: RED }, { w: ["myth"], col: RED }, { w: ["disintegrate"], col: RED }, { w: ["time", "bomb"], col: RED }, { w: ["undereat"], col: RED },
  { w: ["fortyeight", "hours"], col: GREEN }, { w: ["sponge"], col: GREEN }, { w: ["daily", "protein", "goal"], col: GREEN }, { w: ["normal", "meal"], col: GREEN },
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

export const VentanaShort: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      {layersAt(f).map((l) => <ShotView key={`shot${l.id}`} id={l.id} alpha={l.alpha} />)}
      <PanicLabels f={f} />
      <ScoopLabels f={f} />
      <Split f={f} />
      <PigeonLabels f={f} />
      <Subs f={f} />
      {!(getInputProps() as { mute?: boolean }).mute && <Audio src={staticFile("voz_ventana/voz.wav")} />}
    </AbsoluteFill>
  );
};
