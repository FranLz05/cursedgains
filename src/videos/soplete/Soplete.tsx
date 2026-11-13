// "The Spot Reduction Myth" (PumpParadox, Short 4): frantic cut-by-cut edit. Same look as the other PumpParadox shorts: dark 3D sets with dramatic light,
// flat 2D Tito (red tank top, headband, no billboard), small word-by-word subtitles with red / green key words, technical floating labels.
// Layout rule: every floating label lives above y = 1380; the subtitles live at y ~ 1400-1620, so they can never overlap.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, getInputProps } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, crunchUp, counterAt, torchAt, FIRE_T } from "./world";
import { bellyOnCard } from "./titoLying";
import { InkPass, noInkFallback } from "../alejandro/ink";
import { LensBlur } from "../alejandro/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../alejandro/grade";
import { layersAt, dofAt, camAt, smooth, clamp01, sceneStart, sceneEnd, cutFrames, wordF, FPS, TOTAL } from "./story";
import WORDS from "./palabras.json";

const SU = 0.00216;
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.55, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();
const FONT = "Arial Black, Impact, sans-serif";
const MONO = "'Courier New', Consolas, monospace";
const RED = "#EF4444", GREEN = "#22C55E", BRIGHT_GREEN = "#3DFF7A", YELLOW = "#FFD23F", CYAN = "#7CE8FF";
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
    {id === 2 ? <XRay /> : id === 3 ? <Systemic /> : (
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
    <linearGradient id="gBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0E1830" /><stop offset="1" stopColor="#04060D" /></linearGradient>
    <linearGradient id="gXr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#06303c" /><stop offset="1" stopColor="#020c14" /></linearGradient>
    <linearGradient id="gBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#12B84A" /><stop offset="1" stopColor="#7CFFA6" /></linearGradient>
    <linearGradient id="gFat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE066" /><stop offset="1" stopColor="#E8A800" /></linearGradient>
    <linearGradient id="gMus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F26B7A" /><stop offset="1" stopColor="#B83048" /></linearGradient>
  </defs>
);
const Label: React.FC<{ x: number; y: number; text: string; size: number; fill: string; op?: number; sw?: number; rot?: number }> = ({ x, y, text, size, fill, op = 1, sw = 12, rot = 0 }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONT} fontSize={size} fill={fill} stroke="#120c0c" strokeWidth={sw} strokeLinejoin="round" paintOrder="stroke" opacity={op} filter="url(#sh)" transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}>{text}</text>
);

/** floating technical label: thin white leader to an anchor, dark semi-transparent box, crisp monospaced text (value in colour; v omitted = one line) */
const Chip: React.FC<{ x: number; y: number; k: string; v?: string; col: string; ax: number; ay: number; op: number; size?: number; kcol?: string }> = ({ x, y, k, v, col, ax, ay, op, size = 34, kcol = "#ffffff" }) => {
  if (op <= 0.001) return null;
  const cw = size * 0.62, w = Math.max(k.length * (v ? 0.8 : 1), v ? v.length : 0) * cw + 48, h = v ? size * 2 + 40 : size + 44, top = ay < y;
  const sy = top ? y - h / 2 : y + h / 2, ayc = Math.min(1330, Math.max(40, ay)), axc = Math.min(1050, Math.max(30, ax));
  const sc = 0.85 + 0.15 * clamp01(op * 1.4);
  return (
    <g opacity={op} transform={`translate(${x} ${y}) scale(${sc}) translate(${-x} ${-y})`}>
      <line x1={x} y1={sy} x2={axc} y2={ayc} stroke="#ffffff" strokeWidth={3} opacity={0.9} />
      <circle cx={axc} cy={ayc} r={11} fill="none" stroke="#ffffff" strokeWidth={3.5} /><circle cx={axc} cy={ayc} r={3.5} fill="#ffffff" />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={8} fill="rgba(6,9,20,0.86)" stroke="rgba(255,255,255,0.92)" strokeWidth={2.5} />
      {v ? <>
        <text x={x - w / 2 + 24} y={y - size * 0.12} fontFamily={MONO} fontWeight={700} fontSize={size * 0.8} letterSpacing={0.5} fill={kcol}>{k}</text>
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

// ---------------------------------------------------------------- scene 1: 10,000 crunches under the robotic blowtorch
const CrunchLabels: React.FC<{ f: number }> = ({ f }) => {
  const s0 = sceneStart(0), end = sceneEnd(0);
  if (f >= end + 8) return null;
  const ts = (f - s0) / FPS, out = 1 - smooth((f - (end - 4)) / 8), up = crunchUp(f);
  const [bx, by] = bellyOnCard(up), belly = [(bx - 1000) * SU, (1375 - by) * SU] as const;
  const [ax, ay] = project(1, f, belly[0], belly[1], 0.2);
  const [hx, hy] = project(1, f, -0.6, 0.55, 0.1), [sx, sy] = project(1, f, 0.25, 0.15, 0.1);
  const n = counterAt(ts), fin = ts >= 8.9;
  const cnt = fin ? (Math.floor(f / 4) % 2 ? "9,998... 9,999..." : "9,999... 9,999...") : n.toLocaleString("en-US");
  const hot = ts >= FIRE_T, pulse = 0.5 + 0.5 * Math.sin(f * 0.9), vg = hot ? (0.08 + 0.1 * pulse) * out : 0;
  const T = torchAt(1, f);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 60%, rgba(255,60,0,0) 55%, rgba(255,40,10,0.9) 100%)", opacity: vg }} />
      <svg width={1080} height={1920}><SvgDefs />
        {/* speed lines: a new random set every frame */}
        <g opacity={hot ? 0.2 * out : 0} stroke="#ffffff" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => { const y = 120 + hh(f * 7 + i, 1) * 1180, x0 = hh(f * 5 + i, 2) * 1080, len = 160 + hh(f + i, 3) * 380; return <line key={i} x1={x0} x2={x0 + len} y1={y} y2={y} strokeWidth={2 + hh(i, f) * 5} />; })}
        </g>
        <g opacity={out}><Label x={540} y={150} text="10,000 CRUNCHES" size={78} fill={YELLOW} op={smooth(ts / 0.25)} sw={14} rot={-2 + 3 * Math.sin(f * 0.8)} /></g>
        <g opacity={out}>
          <Chip x={290} y={290} k="ABS TEMPERATURE:" v="900°F" col={RED} ax={ax} ay={ay} op={smooth((ts - FIRE_T - 0.2) / 0.2)} size={34} />
          <Chip x={790} y={470} k="SPINE STATUS:" v="FILED FOR DIVORCE" col={RED} ax={sx} ay={sy} op={smooth((ts - FIRE_T - 1.6) / 0.2)} size={34} />
          <Chip x={290} y={650} k="COUNTER:" v={cnt} col={fin ? RED : BRIGHT_GREEN} ax={hx} ay={hy} op={smooth((ts - 0.5) / 0.2)} size={34} />
        </g>
        <circle cx={ax} cy={ay} r={0} fill="none" /><circle cx={0} cy={0} r={0} fill={String(T.on)} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 2: X-ray, the muscle shouts at the deaf fat
const XRay: React.FC = () => {
  const f = useCurrentFrame();
  const ts = (f - sceneStart(1)) / FPS, A = 1 - smooth((ts - 0.5) / 0.55), B = smooth((ts - 0.62) / 0.5), zoom = 1 + 2.6 * smooth(ts / 0.95) ** 1.6;
  const shout = ts > 1.4 && ts < 12.2, beat = 0.5 + 0.5 * Math.sin(ts * 14), wave = (k: number) => (ts * 1.7 + k / 4) % 1;
  const ignored = smooth((ts - 6.2) / 0.25), cellsOn = smooth((ts - 10.2) / 0.25), faint = smooth((ts - 12.2) / 0.5);
  const bob = 6 * Math.sin(ts * 7.5), mus = 1 + (shout ? 0.035 * beat : 0) - 0.04 * faint;
  const shake = shout ? 3 * Math.sin(f * 2.2) : 0;
  const ribs = Array.from({ length: 6 }, (_, i) => i);
  return (
    <AbsoluteFill style={{ background: "#020c14" }}>
      <svg width={1080} height={1920}><SvgDefs />
        <rect width={1080} height={1920} fill="url(#gXr)" />
        {Array.from({ length: 48 }, (_, i) => <line key={i} x1={0} x2={1080} y1={i * 40 + ((f * 2) % 40)} y2={i * 40 + ((f * 2) % 40)} stroke="#7CE8FF" strokeWidth={1.5} opacity={0.07} />)}
        {/* ---- phase A: whole-torso X-ray, then a very fast zoom into the belly */}
        {A > 0.01 && (
          <g opacity={A} transform={`translate(540 1000) scale(${zoom}) translate(-540 -1000)`} fill="none" stroke={CYAN} strokeLinecap="round">
            <path d="M 300 330 C 250 420 240 600 280 760 C 300 880 330 1000 350 1140 L 730 1140 C 750 1000 780 880 800 760 C 840 600 830 420 780 330 Z" strokeWidth={8} opacity={0.8} />
            <g strokeWidth={12} opacity={0.75}>{ribs.map((i) => <path key={i} d={`M 540 ${400 + i * 46} C 430 ${380 + i * 46} 350 ${420 + i * 46} 330 ${470 + i * 50} M 540 ${400 + i * 46} C 650 ${380 + i * 46} 730 ${420 + i * 46} 750 ${470 + i * 50}`} />)}</g>
            <g strokeWidth={10} opacity={0.85}>{Array.from({ length: 14 }, (_, i) => <rect key={i} x={518} y={380 + i * 56} width={44} height={34} rx={12} />)}</g>
            <path d="M 400 1140 C 380 1060 420 990 540 1000 C 660 990 700 1060 680 1140" strokeWidth={9} opacity={0.7} />
            <rect x={380} y={820} width={320} height={190} rx={30} stroke="#FFD23F" strokeWidth={8} strokeDasharray="22 14" opacity={0.95} />
            <Label x={540} y={290} text="" size={10} fill="#fff" />
          </g>
        )}
        {/* ---- phase B: the cross-section (fat layer on top, rectus abdominis below) */}
        {B > 0.01 && (
          <g opacity={B} transform={`translate(540 760) scale(${0.55 + 0.45 * B}) translate(-540 -760) translate(${shake} 0)`}>
            <path d="M 40 520 C 60 430 200 410 300 440 S 480 420 540 432 S 760 410 860 440 S 1020 430 1040 520 L 1040 726 C 900 750 700 716 540 744 S 200 724 40 726 Z" fill="url(#gFat)" stroke="#BFF6FF" strokeWidth={9} strokeLinejoin="round" />
            <path d="M 46 504 C 70 410 210 386 300 414 S 480 394 540 406 S 760 386 860 414 S 1010 410 1034 504" fill="none" stroke="#F3C79E" strokeWidth={22} strokeLinecap="round" />
            {Array.from({ length: 26 }, (_, i) => <circle key={i} cx={90 + hh(i, 3) * 900} cy={470 + hh(i, 4) * 240} r={14 + hh(i, 5) * 16} fill="#FFF3A8" opacity={0.5} stroke="#E8A800" strokeWidth={3} />)}
            {/* the fat character: bored face + noise-cancelling headphones */}
            <g transform={`translate(0 ${bob * 0.4})`}>
              <ellipse cx={540} cy={580} rx={150} ry={118} fill="#FFE98A" stroke="#7a5200" strokeWidth={8} />
              {[-1, 1].map((s) => <g key={s}><ellipse cx={540 + s * 56} cy={566} rx={30} ry={ts > 12.4 ? 4 : 22} fill="#fff" stroke="#111114" strokeWidth={6} /><circle cx={540 + s * 56} cy={574} r={9} fill="#111114" /><path d={`M ${540 + s * 26} ${536} L ${540 + s * 86} ${548}`} stroke="#111114" strokeWidth={9} strokeLinecap="round" /></g>)}
              <path d="M 500 636 L 580 636" stroke="#111114" strokeWidth={9} strokeLinecap="round" />
              <path d="M 392 560 C 392 420 688 420 688 560" fill="none" stroke="#161a24" strokeWidth={26} strokeLinecap="round" />
              {[-1, 1].map((s) => <g key={s}><rect x={540 + s * 150 - 36} y={512} width={72} height={116} rx={26} fill="#0d1018" stroke="#BFF6FF" strokeWidth={5} /><circle cx={540 + s * 150} cy={570} r={8} fill={beat > 0.5 ? "#FF3B3B" : "#7a1f1f"} /></g>)}
              {[0, 1, 2].map((i) => { const q = (ts * 0.9 + i / 3) % 1; return <text key={i} x={400 - q * 70 + i * 6} y={510 - q * 140} fontSize={54} fill="#BFF6FF" opacity={(1 - q) * 0.9} fontFamily={FONT}>♪</text>; })}
            </g>
            {/* sound waves: climb from the megaphone, ricochet off the headphones */}
            {shout && [0, 1, 2, 3].map((k) => { const q = wave(k), y = 770 - q * 190, w = 40 + 150 * q;
              return <path key={k} d={`M ${540 - w} ${y + 22} Q 540 ${y - 28} ${540 + w} ${y + 22}`} fill="none" stroke="#ffffff" strokeWidth={13 - 7 * q} strokeLinecap="round" opacity={1 - q * 0.6} />; })}
            {shout && [0, 1, 2].map((k) => { const q = (ts * 1.7 + 0.8 + k / 3) % 1; return <g key={k} opacity={1 - q} stroke="#ffffff" strokeWidth={6} strokeLinecap="round">
              <line x1={400 - q * 80} y1={560 - q * 70} x2={400 - q * 80 - 26} y2={560 - q * 70 - 18} /><line x1={680 + q * 80} y1={560 - q * 70} x2={680 + q * 80 + 26} y2={560 - q * 70 - 18} /></g>; })}
            {/* rectus abdominis with a face and a megaphone */}
            <g transform={`translate(540 940) scale(${mus}) translate(-540 -940)`}>
              <rect x={70} y={772} width={940} height={344} rx={60} fill="url(#gMus)" stroke="#BFF6FF" strokeWidth={9} />
              {[0, 1, 2].map((i) => <g key={i}><line x1={100} x2={300} y1={852 + i * 82} y2={852 + i * 82} stroke="#7a1030" strokeWidth={8} strokeLinecap="round" /><line x1={780} x2={980} y1={852 + i * 82} y2={852 + i * 82} stroke="#7a1030" strokeWidth={8} strokeLinecap="round" /></g>)}
              <line x1={540} x2={540} y1={1060} y2={1110} stroke="#7a1030" strokeWidth={8} />
              <ellipse cx={540} cy={950} rx={170} ry={128} fill="#F57F8F" stroke="#4a0818" strokeWidth={8} />
              {faint > 0.5
                ? [-1, 1].map((s) => <g key={s} stroke="#111114" strokeWidth={9} strokeLinecap="round"><line x1={540 + s * 60 - 18} y1={900 - 18} x2={540 + s * 60 + 18} y2={900 + 18} /><line x1={540 + s * 60 + 18} y1={900 - 18} x2={540 + s * 60 - 18} y2={900 + 18} /></g>)
                : [-1, 1].map((s) => <g key={s}><ellipse cx={540 + s * 60} cy={900} rx={26} ry={24} fill="#fff" stroke="#111114" strokeWidth={6} /><circle cx={540 + s * 60 + s * 3} cy={904} r={10} fill="#111114" /><line x1={540 + s * 98} y1={850 - 4 * beat} x2={540 + s * 24} y2={870} stroke="#111114" strokeWidth={12} strokeLinecap="round" /></g>)}
              <ellipse cx={540} cy={1000} rx={shout ? 46 : 22} ry={shout ? 38 + 8 * beat : 8} fill="#4a0818" stroke="#111114" strokeWidth={6} />
              {faint > 0.5 && <ellipse cx={560} cy={1032} rx={20} ry={30} fill="#E86E78" stroke="#111114" strokeWidth={5} />}
              {/* megaphone */}
              {shout && <g transform="translate(540 928) rotate(-8)"><path d="M -24 -10 L 24 -10 L 96 -176 L -96 -176 Z" fill="#FF8A1F" stroke="#4a2a00" strokeWidth={8} strokeLinejoin="round" /><rect x={-104} y={-196} width={208} height={30} rx={12} fill="#FFE9C0" stroke="#4a2a00" strokeWidth={7} /><path d="M -50 -60 L 50 -60 M -70 -110 L 70 -110" stroke="#FFFFFF" strokeWidth={9} /></g>}
            </g>
            {/* ribs and spine below, faint X-ray */}
            <g fill="none" stroke={CYAN} strokeLinecap="round" opacity={0.55}>
              {ribs.map((i) => <path key={i} d={`M 540 ${1140 + i * 36} C 400 ${1120 + i * 36} 260 ${1160 + i * 36} 200 ${1210 + i * 36} M 540 ${1140 + i * 36} C 680 ${1120 + i * 36} 820 ${1160 + i * 36} 880 ${1210 + i * 36}`} strokeWidth={10} />)}
              {Array.from({ length: 6 }, (_, i) => <rect key={i} x={518} y={1134 + i * 40} width={44} height={30} rx={11} strokeWidth={8} />)}
            </g>
            <g opacity={ignored} transform="translate(770 752) rotate(-12)"><rect x={-130} y={-48} width={260} height={96} rx={10} fill="rgba(60,0,0,0.78)" stroke={RED} strokeWidth={9} /><text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontSize={72} fill={RED}>IGNORED</text></g>
          </g>
        )}
        <Label x={540} y={170} text="X-RAY: ABDOMEN" size={56} fill={CYAN} op={smooth(ts / 0.3)} />
        <Chip x={800} y={310} k="BELLY FAT" col={YELLOW} ax={860} ay={470} op={smooth((ts - 1.5) / 0.25) * B} size={34} />
        <Chip x={290} y={310} k="FAT CELLS:" v="ZERO SIGNAL" col={RED} ax={150} ay={600} op={cellsOn * B} size={34} />
        <Chip x={300} y={1250} k="RECTUS ABDOMINIS" col="#FF9AA8" ax={150} ay={1020} op={smooth((ts - 1.0) / 0.25) * B} size={34} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 3: calorie deficit -> fat leaves from everywhere at once
const DEP: { id: string; x: number; y: number; rx: number; ry: number; rot: number; tag: string; tx: number; ty: number; word: string }[] = [
  { id: "cL", x: 468, y: 458, rx: 30, ry: 24, rot: 0, tag: "FACE", tx: 140, ty: 380, word: "face" }, { id: "cR", x: 612, y: 458, rx: 30, ry: 24, rot: 0, tag: "FACE", tx: 140, ty: 380, word: "face" },
  { id: "aL", x: 398, y: 660, rx: 32, ry: 58, rot: 18, tag: "ARMS", tx: 140, ty: 590, word: "arms" }, { id: "aR", x: 682, y: 660, rx: 32, ry: 58, rot: -18, tag: "ARMS", tx: 140, ty: 590, word: "arms" },
  { id: "tL", x: 480, y: 1050, rx: 38, ry: 78, rot: 0, tag: "LEGS", tx: 140, ty: 1060, word: "legs" }, { id: "tR", x: 600, y: 1050, rx: 38, ry: 78, rot: 0, tag: "LEGS", tx: 140, ty: 1060, word: "legs" },
  { id: "bl", x: 540, y: 760, rx: 90, ry: 66, rot: 0, tag: "BELLY", tx: 920, ty: 800, word: "belly" },
];
const Systemic: React.FC = () => {
  const f = useCurrentFrame();
  const s0 = sceneStart(2), barF = wordF("deficit", 0), allF = wordF("all", 0) - 3;
  const ts = (f - s0) / FPS, barK = smooth((f - barF + 2) / 8), arrowsK = smooth((f - allF) / 10), shrink = smooth((f - barF + 2) / 130);
  const tagK = (w: string) => smooth((f - wordF(w, 0) + 3) / 7);
  const bellyF = wordF("belly", 0);
  const flow = f * 5;
  const target = (x: number, y: number): [number, number] => [540 + (x < 540 ? -10 : 10), y];
  return (
    <AbsoluteFill style={{ background: "#04060d" }}>
      <svg width={1080} height={1920}><SvgDefs />
        <rect width={1080} height={1920} fill="url(#gBg)" />
        {Array.from({ length: 28 }, (_, i) => <line key={`h${i}`} x1={0} x2={1080} y1={80 + i * 48} y2={80 + i * 48} stroke="#7CE8FF" strokeWidth={1} opacity={0.07} />)}
        {Array.from({ length: 23 }, (_, i) => <line key={`v${i}`} y1={80} y2={1400} x1={i * 48} x2={i * 48} stroke="#7CE8FF" strokeWidth={1} opacity={0.07} />)}
        {/* top bar: STANDBY (grey) -> ACTIVE (green) */}
        <g filter="url(#sh)" transform={`translate(0 ${-14 * (1 - smooth(ts / 0.4))})`}>
          <rect x={90} y={150} width={900} height={104} rx={52} fill="#1b2030" stroke="#f4f6fb" strokeWidth={6} />
          <rect x={102} y={162} width={876 * barK} height={80} rx={40} fill="url(#gBar)" />
          <text x={540} y={218} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={48} letterSpacing={1} fill={barK > 0.5 ? "#06240f" : "#9aa3bd"}>{barK > 0.5 ? "CALORIE DEFICIT: ACTIVE" : "CALORIE DEFICIT: STANDBY"}</text>
        </g>
        {/* Tito, blueprint style */}
        <g stroke="#f4f6fb" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round">
          {[-1, 1].map((s) => <g key={s}><line x1={540 + s * 60} y1={940} x2={540 + s * 70} y2={1300} stroke="#120c0c" strokeWidth={84} /><line x1={540 + s * 60} y1={940} x2={540 + s * 70} y2={1300} stroke="#F3C79E" strokeWidth={70} />
            <rect x={540 + s * 70 - 48} y={1290} width={96} height={44} rx={14} fill="#fff" /><line x1={540 + s * 70 - 40} y1={1326} x2={540 + s * 70 + 40} y2={1326} stroke={RED} strokeWidth={10} /></g>)}
          <rect x={432} y={850} width={216} height={110} rx={18} fill="#2C303B" />
          {[-1, 1].map((s) => <g key={s}><line x1={540 + s * 130} y1={570} x2={540 + s * 188} y2={720} stroke="#120c0c" strokeWidth={70} /><line x1={540 + s * 130} y1={570} x2={540 + s * 188} y2={720} stroke="#F3C79E" strokeWidth={56} /><line x1={540 + s * 188} y1={720} x2={540 + s * 196} y2={850} stroke="#120c0c" strokeWidth={62} /><line x1={540 + s * 188} y1={720} x2={540 + s * 196} y2={850} stroke="#F3C79E" strokeWidth={48} /></g>)}
          <path d="M 420 540 L 660 540 L 650 870 L 430 870 Z" fill="#EF4444" />
          <path d="M 500 540 L 540 600 L 580 540" fill="#F3C79E" />
          <circle cx={540} cy={430} r={90} fill="#F3C79E" />
          <path d="M 452 400 Q 540 330 628 400 L 628 384 Q 540 316 452 384 Z" fill="#5A3B2A" />
          <rect x={452} y={392} width={176} height={20} rx={8} fill="#fff" /><rect x={452} y={398} width={176} height={5} fill={RED} stroke="none" />
          {[-1, 1].map((s) => <circle key={s} cx={540 + s * 34} cy={442} r={9} fill="#111114" stroke="none" />)}
          <path d="M 510 486 Q 540 504 570 486" fill="none" stroke="#111114" strokeWidth={7} />
        </g>
        {/* bloodstream */}
        <g>
          <line x1={540} y1={524} x2={540} y2={1290} stroke="#7a1030" strokeWidth={18} strokeLinecap="round" opacity={0.95} />
          <line x1={540} y1={524} x2={540} y2={1290} stroke="#FF4D6A" strokeWidth={8} strokeLinecap="round" opacity={0.9} />
          {Array.from({ length: 14 }, (_, i) => { const y = 524 + ((flow + i * 56) % 766); return <circle key={i} cx={540 + 3 * Math.sin(i)} cy={y} r={arrowsK > 0.2 && i % 2 ? 9 : 5} fill={arrowsK > 0.2 && i % 2 ? YELLOW : "#FFB3C0"} />; })}
        </g>
        {/* fat deposits: all of them shrink together */}
        {DEP.map((d) => { const [ex, ey] = target(d.x, d.y); return <g key={d.id} transform={`translate(${d.x + (ex - d.x) * 0.35 * shrink} ${d.y + (ey - d.y) * 0.35 * shrink}) scale(${1 - 0.78 * shrink}) rotate(${d.rot})`}><ellipse cx={0} cy={0} rx={d.rx} ry={d.ry} fill="url(#gFat)" stroke="#7a5200" strokeWidth={5 / Math.max(0.3, 1 - 0.78 * shrink)} /></g>; })}
        {/* green arrows: every deposit at the same time, flowing into the bloodstream */}
        {arrowsK > 0.01 && DEP.map((d, i) => {
          const [ex, ey] = target(d.x, d.y), sx = d.x + (d.x < 540 ? d.rx * 0.9 : -d.rx * 0.9), dx = ex - sx, dy = ey - d.y, L = Math.hypot(dx, dy) || 1, ang = (Math.atan2(dy, dx) * 180) / Math.PI;
          const sh = 18 + 16 * Math.sin(f * 0.3 + i);
          return (
            <g key={d.id} opacity={arrowsK}>
              <line x1={sx} y1={d.y} x2={ex - (dx / L) * 18} y2={ey - (dy / L) * 18} stroke="#06240f" strokeWidth={22} strokeLinecap="round" />
              <line x1={sx} y1={d.y} x2={ex - (dx / L) * 18} y2={ey - (dy / L) * 18} stroke={BRIGHT_GREEN} strokeWidth={12} strokeLinecap="round" strokeDasharray="26 14" strokeDashoffset={-f * 4} />
              <g transform={`translate(${ex} ${ey}) rotate(${ang})`}><path d="M 4 0 L -34 -22 L -34 22 Z" fill={BRIGHT_GREEN} stroke="#06240f" strokeWidth={6} strokeLinejoin="round" /></g>
              <circle cx={sx + (dx / L) * sh} cy={d.y + (dy / L) * sh} r={6} fill="#fff" opacity={0.8} />
            </g>
          );
        })}
        {/* tags that pop with the words */}
        {(["face", "arms", "legs", "belly"] as const).map((w) => { const d = DEP.find((q) => q.word === w)!; const a = DEP.filter((q) => q.word === w)[0];
          return <Chip key={w} x={d.tx} y={d.ty} k={d.tag} col="#ffffff" ax={a.x} ay={a.y} op={tagK(w)} size={34} />; })}
        <Chip x={850} y={1250} k="SYSTEMIC FAT LOSS" col={BRIGHT_GREEN} ax={546} ay={1180} op={smooth((f - bellyF + 6) / 10)} size={34} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 4: the pool
const PoolLabels: React.FC<{ f: number }> = ({ f }) => {
  const s0 = sceneStart(3), end = sceneEnd(3);
  if (f < s0 || f >= end + 8) return null;
  const ts = (f - s0) / FPS, out = 1 - smooth((f - (end - 4)) / 8);
  const lvl = lerp(1.25, 0.16, smooth((f - s0 - 20) / (sceneStart(4) - s0 - 20)));
  const [pa, pb] = project(4, f, -1.2, lvl, 0), [ca, cb] = project(4, f, 2.4, 0.7, -0.4), [ba, bb] = project(4, f, 2.05, 0.82, -0.2), [da, db] = project(4, f, -0.4, 0.05, -1.0);
  const tinyT = (wordF("tiny") - s0) / FPS, hide = 1 - (smooth((ts - 5.15) / 0.12) - smooth((ts - 6.45) / 0.12));
  return (
    <AbsoluteFill><svg width={1080} height={1920}><SvgDefs />
      <g opacity={out}>
        <Chip x={800} y={260} k="BODY FAT POOL" col={YELLOW} ax={pa} ay={pb} op={smooth((ts - 0.15) / 0.2) * hide} size={34} />
        <Chip x={800} y={590} k="BELLY END" col={YELLOW} ax={ca} ay={cb} op={smooth((ts - 1.45) / 0.2) * hide} size={34} />
        <Chip x={290} y={650} k="TINY BUCKET" col={RED} ax={ba} ay={bb} op={smooth((ts - tinyT + 0.35) / 0.2)} size={34} />
        <Chip x={540} y={420} k="CALORIE DEFICIT DRAIN" col={BRIGHT_GREEN} ax={da} ay={db} op={smooth((ts - 3.3) / 0.2) * hide} size={34} />
        <Chip x={290} y={850} k="FAT LEVEL:" v={`${Math.round((lvl / 1.25) * 100)}%`} col={BRIGHT_GREEN} ax={pa} ay={pb} op={smooth((ts - 3.6) / 0.2) * hide} size={34} />
      </g>
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- hard cuts: a 2-frame white flash on every cut + every scene change
const CUTS = [1, 4, 5].flatMap((id) => cutFrames(id)).concat([1, 2, 3, 4].map((i) => sceneStart(i)));
const Flash: React.FC<{ f: number }> = ({ f }) => {
  const k = CUTS.reduce((m, c) => (f >= c && f < c + 3 ? Math.max(m, [0.5, 0.26, 0.1][f - c]) : m), 0);
  return k > 0 ? <AbsoluteFill style={{ background: "#fff", opacity: k }} /> : null;
};

// ---------------------------------------------------------------- subtitles: small, spaced, key words in red / green
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
type SW = { text: string; col: string | null; f: number };
type SG = { start: number; end: number; words: SW[] };
const PHRASES: { w: string[]; col: string }[] = [
  { w: ["impossible"], col: RED }, { w: ["zero", "signal"], col: RED }, { w: ["tiny", "bucket"], col: RED }, { w: ["spine"], col: RED },
  { w: ["calorie", "deficit"], col: GREEN }, { w: ["all", "over"], col: GREEN }, { w: ["core", "muscle"], col: GREEN },
];
const GROUPS: SG[] = (() => {
  const ws = WORDS.words as { w: string; t: number; e: number }[], nw = ws.map((x) => norm(x.w)), cols: (string | null)[] = ws.map(() => null);
  ws.forEach((_, i) => PHRASES.forEach((p) => { if (p.w.every((q, k) => nw[i + k] === q)) p.w.forEach((_q, k) => (cols[i + k] = p.col)); }));
  const out: SG[] = []; let cur: SW[] = [], prev = "";
  const flush = () => { if (cur.length) out.push({ start: cur[0].f - 1, end: 0, words: cur }); cur = []; };
  ws.forEach((x, i) => {
    if (cur.length >= 3 || /[.,;:?!—]$/.test(prev) || cur.reduce((n, q) => n + q.text.length, 0) > 15 || (cur.length && cols[i] !== cur[cur.length - 1].col)) flush();
    cur.push({ text: x.w.replace(/[.,;:¿?¡!—’']/g, (m) => (m === "’" || m === "'" ? "'" : "")).toUpperCase(), col: cols[i], f: Math.max(0, Math.round(x.t * 30)) });
    prev = x.w;
  });
  flush();
  out.forEach((g, i) => { g.end = i + 1 < out.length ? out[i + 1].start : Math.round(ws[ws.length - 1].e * 30) + 12; });
  // a group never stays on screen through a long pause: it leaves 6 frames after its last word is spoken
  out.forEach((g) => { const last = ws.find((x) => Math.round(x.t * 30) === g.words[g.words.length - 1].f); if (last) g.end = Math.min(g.end, Math.round(last.e * 30) + 8); });
  return out;
})();
const Subs: React.FC<{ f: number }> = ({ f }) => {
  const g = GROUPS.find((q) => f >= q.start && f < q.end);
  if (!g) return null;
  const pad = 300;
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

export const SopleteShort: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      {layersAt(f).map((l) => <ShotView key={`shot${l.id}`} id={l.id} alpha={l.alpha} />)}
      <CrunchLabels f={f} />
      <PoolLabels f={f} />
      <Flash f={f} />
      <Subs f={f} />
      {!(getInputProps() as { mute?: boolean }).mute && <Audio src={staticFile("voz_soplete/voz.wav")} />}
    </AbsoluteFill>
  );
};
export { TOTAL };
