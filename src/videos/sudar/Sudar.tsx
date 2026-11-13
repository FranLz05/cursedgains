// "Sweating != Burning Fat" (PumpParadox, Short 2): same look as "volumen_basura_gym" (dark gym, warm overhead spot, flat 2D Tito
// in a red tank top, small word-by-word subtitles with red / green key words, red arrow), new scenes and overlays.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, getInputProps } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
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
const RED = "#EF4444", GREEN = "#22C55E";

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
    <linearGradient id="gFat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFE27A" /><stop offset="1" stopColor="#F59E0B" /></linearGradient>
    <linearGradient id="gDrop" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stopColor="#9BDCFF" /><stop offset="1" stopColor="#2E8FE0" /></linearGradient>
    <linearGradient id="gLung" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFA8BC" /><stop offset="1" stopColor="#E0647F" /></linearGradient>
    <linearGradient id="gBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0E1830" /><stop offset="1" stopColor="#04060D" /></linearGradient>
  </defs>
);
const Label: React.FC<{ x: number; y: number; text: string; size: number; fill: string; op?: number; sw?: number }> = ({ x, y, text, size, fill, op = 1, sw = 12 }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONT} fontSize={size} fill={fill} stroke="#120c0c" strokeWidth={sw} strokeLinejoin="round" paintOrder="stroke" opacity={op} filter="url(#sh)">{text}</text>
);

/** floating technical label: thin white leader to an anchor, dark semi-transparent box, crisp monospaced text (value in colour) */
const MONO = "'Courier New', Consolas, monospace";
const Chip: React.FC<{ x: number; y: number; k: string; v: string; col: string; ax: number; ay: number; op: number; size?: number }> = ({ x, y, k, v, col, ax, ay, op, size = 34 }) => {
  const cw = size * 0.62, w = Math.max(k.length, v.length) * cw + 48, h = size * 2 + 40, top = ay < y, sy = top ? y - h / 2 : y + h / 2;
  const sc = 0.85 + 0.15 * clamp01(op * 1.4);
  return (
    <g opacity={op} transform={`translate(${x} ${y}) scale(${sc}) translate(${-x} ${-y})`}>
      <line x1={x} y1={sy} x2={ax} y2={ay} stroke="#ffffff" strokeWidth={3} opacity={0.9} />
      <circle cx={ax} cy={ay} r={11} fill="none" stroke="#ffffff" strokeWidth={3.5} /><circle cx={ax} cy={ay} r={3.5} fill="#ffffff" />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={8} fill="rgba(6,9,20,0.82)" stroke="rgba(255,255,255,0.92)" strokeWidth={2.5} />
      <text x={x - w / 2 + 24} y={y - size * 0.12} fontFamily={MONO} fontWeight={700} fontSize={size * 0.8} letterSpacing={0.5} fill="#ffffff">{k}</text>
      <text x={x - w / 2 + 24} y={y + size * 0.88} fontFamily={MONO} fontWeight={700} fontSize={size} letterSpacing={0.5} fill={col}>{v}</text>
    </g>
  );
};
const pcL = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 2000);
const project = (id: number, f: number, wx: number, wy: number, wz: number) => {
  const c = camAt(id, f);
  pcL.position.set(...c.pos); pcL.fov = c.fov; pcL.updateProjectionMatrix(); pcL.lookAt(...c.look); pcL.updateMatrixWorld();
  const q = new THREE.Vector3(wx, wy, wz).project(pcL); return [(q.x + 1) * 540, (1 - q.y) * 960] as const;
};
// scene 1, after the zoom-out reveal: three labels pointing at the volcano, the gym and Tito
const RevealLabels: React.FC<{ f: number }> = ({ f }) => {
  const ts = (f - sceneStart(0)) / FPS, end = sceneEnd(0);
  if (ts < 5.6 || f > end + 8) return null;
  const out = 1 - smooth((f - (end - 4)) / 10);
  const [vx, vy] = project(1, f, 0, 38, -110), [gx, gy] = project(1, f, -17, 9, 16), [tx, ty] = project(1, f, 0, 2.2, 0);
  return (
    <AbsoluteFill><svg width={1080} height={1920}>
      <Chip x={540} y={250} k="VOLCANO STATUS:" v="ERUPTING IN 3 MIN" col={RED} ax={vx} ay={vy} op={smooth((ts - 5.8) / 0.5) * out} />
      <Chip x={330} y={1300} k="GYM LOCATION:" v="LITERAL MAGMA CHAMBER" col={RED} ax={gx} ay={gy} op={smooth((ts - 6.6) / 0.5) * out} size={30} />
      <Chip x={800} y={1150} k="BRAIN:" v="NEAR BOILING POINT" col={RED} ax={tx} ay={ty} op={smooth((ts - 7.4) / 0.5) * out} size={30} />
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 1: thermometer
const Thermometer: React.FC<{ f: number }> = ({ f }) => {
  const ts = (f - sceneStart(0)) / FPS, u = clamp01(ts / 4.2);
  if (ts > 5.0) return null;
  const temp = 98.6 + 5.4 * smooth((u - 0.08) / 0.85), hot = clamp01((temp - 98.6) / 5.4);
  const col = hot < 0.45 ? GREEN : hot < 0.75 ? "#FF9F1C" : RED;
  const op = smooth(f / 12) * (1 - smooth((ts - 3.6) / 1.2));
  const H = 700, fill = 90 + (H - 90) * hot, blink = temp > 102.5 ? 0.6 + 0.4 * Math.sin(f * 0.6) : 0;
  return (
    <AbsoluteFill><svg width={1080} height={1920}><SvgDefs />
      <g opacity={op} filter="url(#sh)">
        <rect x={82} y={600} width={78} height={H} rx={39} fill="#0b0f1a" stroke="#f4f6fb" strokeWidth={8} />
        <rect x={94} y={600 + H - fill - 6} width={54} height={fill} rx={27} fill={col} />
        <circle cx={121} cy={600 + H + 36} r={58} fill={col} stroke="#f4f6fb" strokeWidth={8} />
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={170} x2={i % 2 ? 190 : 205} y1={640 + i * 140} y2={640 + i * 140} stroke="#f4f6fb" strokeWidth={5} />)}
        <Label x={152} y={560} text={`${Math.round(temp)}°F`} size={84} fill="#ffffff" />
        <Label x={262} y={470} text="OVERHEATING" size={46} fill={RED} op={blink} />
      </g>
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scenes 2 and 5: the scale readout
const ScaleReadout: React.FC<{ f: number }> = ({ f }) => {
  const u2 = uOf(2, f), u5 = uOf(5, f), s2 = f >= sceneStart(1) && f < sceneEnd(1) + 8, s5 = f >= sceneStart(4) && f < sceneEnd(4) + 8;
  let txt = "", col = "#fff", pop = 0, sh = 0;
  if (s2 && u2 >= 0.46) { const v = -3 * smooth((u2 - 0.5) / 0.12); txt = u2 < 0.62 ? `${v.toFixed(1)}` : "-3.0 LBS!"; col = u2 < 0.5 ? "#fff" : GREEN; pop = clamp01((u2 - 0.62) / 0.05); }
  if (s5 && u5 >= 0.66) { txt = "+4.0 LBS"; col = RED; pop = clamp01((u5 - 0.66) / 0.05); sh = Math.exp(-(u5 - 0.66) * 22) * Math.sin(f * 1.7) * 14; }
  if (!txt) return null;
  const sc = 0.7 + 0.3 * smooth(pop) + 0.18 * Math.sin(Math.min(1, pop) * Math.PI);
  return (
    <AbsoluteFill><svg width={1080} height={1920}><SvgDefs />
      <g transform={`translate(${540 + sh},250) scale(${sc})`}><Label x={0} y={0} text={txt} size={txt.length > 5 ? 140 : 170} fill={col} sw={16} /></g>
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 4: split screen, energy bars
const Bars: React.FC<{ f: number }> = ({ f }) => {
  if (f < sceneStart(3) || f > sceneEnd(3) + 8) return null;
  const u = uOf(4, f), fat = smooth((u - 0.28) / 0.45), op = smooth((f - sceneStart(3)) / 10) * (1 - smooth((f - (sceneEnd(3) - 4)) / 8));
  const battery = (x: number, fillK: number, color: string) => (
    <g>
      <rect x={x - 190} y={1090} width={380} height={86} rx={22} fill="#0b0f1a" stroke="#f4f6fb" strokeWidth={8} />
      <rect x={x - 180} y={1100} width={Math.max(8, 360 * fillK)} height={66} rx={14} fill={color} />
      <rect x={x + 190} y={1118} width={16} height={30} rx={6} fill="#f4f6fb" />
    </g>
  );
  return (
    <AbsoluteFill><svg width={1080} height={1920}><SvgDefs />
      <g opacity={op} filter="url(#sh)">
        <line x1={540} x2={540} y1={160} y2={1000} stroke="#ffffff" strokeWidth={5} strokeDasharray="22 14" opacity={0.7} />
        {battery(290, 1 - 0.86 * fat, RED)}
        {battery(790, 0.9 + 0.04 * Math.sin(f * 0.2), GREEN)}
      </g>
      <Chip x={290} y={290} k="VOLCANO GYM:" v="250 KCAL" col={RED} ax={290} ay={760} op={smooth((u - 0.12) / 0.08) * op} size={34} />
      <Chip x={790} y={290} k="AC GYM 68°F:" v="550 KCAL" col={GREEN} ax={790} ay={760} op={smooth((u - 0.2) / 0.08) * op} size={34} />
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 5: the gym manager pigeon and its fee
const ManagerLabel: React.FC<{ f: number }> = ({ f }) => {
  if (f < sceneStart(4) || f > sceneEnd(4) + 8) return null;
  const u = uOf(5, f);
  if (u < 0.77) return null;
  const [px, py] = project(5, f, 0.5, 0.7, 0.55), op = smooth((u - 0.77) / 0.05) * (1 - smooth((f - (sceneEnd(4) - 3)) / 8));
  return <AbsoluteFill><svg width={1080} height={1920}><Chip x={770} y={980} k="GYM MANAGER:" v="$400 LAVA & FLOODING FEE" col={RED} ax={px} ay={py} op={op} size={32} /></svg></AbsoluteFill>;
};

// ---------------------------------------------------------------- scene 1: arrow pointing at Tito
const pcA = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 200);
const Arrow: React.FC<{ f: number }> = ({ f }) => {
  const a = sceneStart(0) + 14, b = sceneStart(0) + Math.round(3.6 * FPS);
  if (f < a || f > b) return null;
  const c = camAt(1, f);
  pcA.position.set(...c.pos); pcA.fov = c.fov; pcA.updateProjectionMatrix(); pcA.lookAt(...c.look); pcA.updateMatrixWorld();
  const q = new THREE.Vector3(0, 2.3, 0).project(pcA), x = (q.x + 1) * 540, y = (1 - q.y) * 960;
  if (x < 120 || x > 960 || y < 300 || y > 1500) return null;
  const u = smooth((f - a) / 8), out = 1 - smooth((f - (b - 6)) / 6), bob = Math.sin(f * 0.28) * 16;
  const d = "M0 0 L-74 -90 L-30 -90 L-30 -220 L30 -220 L30 -90 L74 -90 Z";
  return (
    <AbsoluteFill><svg width={1080} height={1920}>
      <defs><filter id="ash" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="6" floodColor="#000" floodOpacity="0.55" /></filter></defs>
      <g transform={`translate(${x},${y - 24 + bob}) scale(${0.6 + 0.4 * u})`} opacity={u * out} filter="url(#ash)">
        <path d={d} fill="none" stroke="#140a0a" strokeWidth={30} strokeLinejoin="round" />
        <path d={d} fill="#ff3b3b" stroke="#ffffff" strokeWidth={9} strokeLinejoin="round" />
      </g>
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 3: the diagram (sweat vs fat)
const wobble = (f: number, k: number, a: number) => Math.sin(f * 0.07 + k) * a;
const Diagram: React.FC = () => {
  const f = useCurrentFrame();
  const A0 = SENT[5], A1 = SENT[6], B0 = SENT[7], END = sceneEnd(2);
  const g1 = smooth((f - (A0 + 10)) / (A1 + (B0 - A1) * 0.55 - A0 - 10));            // the sweat drop grows
  const dropOut = 1 - smooth((f - (B0 + 6)) / 26), inB = smooth((f - (B0 + 4)) / 24);   // sweat fades, lungs appear
  const shrink = 1 - 0.46 * smooth((f - (B0 + 14)) / Math.max(10, END - B0 - 50));
  const cellIn = smooth((f - (A0 + 26)) / 20), barK = smooth((f - (B0 + 16)) / Math.max(10, END - B0 - 44));
  const R = 140 * g1, cy = 1070;
  const lobe = (s: number) => `M ${540 + s * 6} 470 C ${540 + s * 92} 450 ${540 + s * 190} 520 ${540 + s * 205} 650 C ${540 + s * 218} 760 ${540 + s * 190} 842 ${540 + s * 118} 850 C ${540 + s * 52} 858 ${540 + s * 16} 800 ${540 + s * 6} 730 Z`;
  const bubbles = Array.from({ length: 9 }, (_, i) => {
    const ph = Math.max(0, ((f - (B0 + 10)) / 70 + i / 9) % 1), vis = f > B0 + 10 ? Math.sin(Math.PI * ph) : 0;
    return { x: 540 + Math.sin(ph * 9 + i * 2.1) * (36 + 60 * ph) * (i % 2 ? 1 : -1), y: cy - 130 * shrink - ph * (cy - 130 * shrink - 880), r: 12 + 16 * (i % 3) * (0.4 + ph), o: vis, label: i % 3 === 0 };
  });
  const ions = [["Na⁺", -150, 0.0], ["K⁺", 140, 0.33], ["Cl⁻", -70, 0.66], ["H₂O", 90, 0.9]] as const;
  return (
    <AbsoluteFill style={{ background: "#04060d" }}><svg width={1080} height={1920}><SvgDefs />
      <rect width={1080} height={1920} fill="url(#gBg)" />
      {Array.from({ length: 70 }, (_, i) => <circle key={i} cx={(i * 197) % 1080} cy={(i * 331 + wobble(f, i, 6) * 3) % 1920} r={2 + (i % 3)} fill="#6f86c8" opacity={0.18} />)}
      {/* skin + sweat drop (phase A) */}
      <g opacity={dropOut} filter="url(#sh)">
        <path d="M0 230 C140 190 300 260 440 232 L440 232 C470 232 490 262 540 262 C590 262 610 232 640 232 C780 260 940 190 1080 230 L1080 340 L0 340 Z" fill="#F3C79E" stroke="#120c0c" strokeWidth={10} />
        <ellipse cx={540} cy={262} rx={46} ry={20} fill="#3a1d14" />
        {g1 > 0.02 && <g transform={`translate(540, ${290 + R * 1.15})`}>
          <path d={`M0 ${-R * 1.5} C ${R * 0.2} ${-R * 1.0} ${R * 1.05} ${-R * 0.2} ${R * 1.0} ${R * 0.38} C ${R * 0.95} ${R * 1.0} ${R * 0.5} ${R * 1.3} 0 ${R * 1.3} C ${-R * 0.5} ${R * 1.3} ${-R * 0.95} ${R * 1.0} ${-R * 1.0} ${R * 0.38} C ${-R * 1.05} ${-R * 0.2} ${-R * 0.2} ${-R * 1.0} 0 ${-R * 1.5} Z`} fill="url(#gDrop)" stroke="#0a2a4a" strokeWidth={10} />
          <ellipse cx={-R * 0.35} cy={-R * 0.1} rx={R * 0.16} ry={R * 0.34} fill="#fff" opacity={0.55} />
        </g>}
        {ions.map(([t, dx, ph], i) => g1 > 0.55 && <text key={i} x={540 + dx} y={410 + ((f * 1.3 + ph * 300) % 210)} textAnchor="middle" fontFamily={FONT} fontSize={40} fill="#cfe9ff" stroke="#0a2a4a" strokeWidth={8} paintOrder="stroke" opacity={0.85}>{t}</text>)}
        <Label x={540} y={290 + R * 2.5 + 70} text="WATER +" size={64} fill="#7CC8FF" op={smooth((g1 - 0.4) / 0.2)} />
        <Label x={540} y={290 + R * 2.5 + 140} text="ELECTROLYTES" size={64} fill="#7CC8FF" op={smooth((g1 - 0.45) / 0.2)} />
      </g>
      {/* lungs (phase B) */}
      <g opacity={inB} filter="url(#sh)">
        <line x1={540} y1={380} x2={540} y2={520} stroke="#120c0c" strokeWidth={46} strokeLinecap="round" />
        <line x1={540} y1={380} x2={540} y2={520} stroke="#F5B0BF" strokeWidth={26} strokeLinecap="round" />
        <path d={lobe(-1)} fill="url(#gLung)" stroke="#3a1220" strokeWidth={10} strokeLinejoin="round" />
        <path d={lobe(1)} fill="url(#gLung)" stroke="#3a1220" strokeWidth={10} strokeLinejoin="round" />
        {[-1, 1].map((s) => [0, 1, 2].map((k) => <path key={`${s}${k}`} d={`M ${540 + s * 12} ${520 + k * 6} Q ${540 + s * (70 + 30 * k)} ${590 + 55 * k} ${540 + s * (110 + 24 * k)} ${650 + 62 * k}`} stroke="#B84560" strokeWidth={7} fill="none" strokeLinecap="round" />))}
        <Label x={540} y={310} text="84% BREATHED OUT" size={60} fill={GREEN} op={smooth((f - (B0 + 24)) / 16)} />
        <Label x={540} y={382 - 0} text="(CO₂)" size={52} fill="#ffffff" op={smooth((f - (B0 + 30)) / 16)} />
      </g>
      {/* bubbles from the fat cell up to the lungs */}
      {bubbles.map((b, i) => <g key={i} opacity={b.o * inB}>
        <circle cx={b.x} cy={b.y} r={b.r} fill="#cfe0ff" fillOpacity={0.35} stroke="#e9f1ff" strokeWidth={5} />
        {b.label && b.r > 20 && <text x={b.x} y={b.y + 8} textAnchor="middle" fontFamily={FONT} fontSize={18} fill="#fff">CO₂</text>}
      </g>)}
      {/* the fat cell: intact while we sweat, then it shrinks */}
      <g opacity={cellIn} transform={`translate(540 ${cy}) scale(${shrink * (1 + 0.012 * Math.sin(f * 0.15))})`} filter="url(#sh)">
        <circle r={170} fill="url(#gFat)" stroke="#3a2205" strokeWidth={12} />
        <circle cx={-52} cy={-46} r={56} fill="#FFF1B3" opacity={0.65} />
        <circle cx={60} cy={44} r={34} fill="#FFF1B3" opacity={0.4} />
        <ellipse cx={92} cy={-60} rx={26} ry={18} fill="#A16207" stroke="#3a2205" strokeWidth={6} />
        <ellipse cx={-60} cy={-70} rx={34} ry={18} fill="#fff" opacity={0.5} transform="rotate(-30 -60 -70)" />
      </g>
      <Label x={540} y={cy + 245} text="BODY FAT" size={64} fill="#FFC83D" op={cellIn} />
      <Label x={540} y={cy + 312} text="STAYS INTACT" size={40} fill="#ffffff" op={cellIn * dropOut} sw={9} />
      {/* calorie deficit bar */}
      <g opacity={smooth((f - (B0 + 8)) / 14)} filter="url(#sh)">
        <rect x={110} y={1800} width={860} height={70} rx={35} fill="#0b0f1a" stroke="#f4f6fb" strokeWidth={8} />
        <rect x={122} y={1811} width={Math.max(10, 836 * barK)} height={48} rx={24} fill={GREEN} />
        <Label x={540} y={1782} text="CALORIE DEFICIT" size={46} fill={GREEN} sw={10} />
      </g>
    </svg></AbsoluteFill>
  );
};

// ---------------------------------------------------------------- subtitles: small, spaced, key words in red / green
type SW = { text: string; col: string | null; f: number };
type SG = { start: number; end: number; words: SW[] };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const PHRASES: { w: string[]; col: string }[] = [
  { w: ["trash", "bag"], col: RED }, { w: ["volcano"], col: RED }, { w: ["sweat"], col: RED }, { w: ["overheating"], col: RED }, { w: ["sauna", "suit"], col: RED },
  { w: ["melts", "fat"], col: GREEN }, { w: ["carbon", "dioxide"], col: GREEN }, { w: ["calorie", "deficit"], col: GREEN },
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
  const pad = 300;   // the diagram's calorie bar sits lower now (y 1800), so the subtitles never touch it
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

export const SudarShort: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      {layersAt(f).map((l) => <ShotView key={`shot${l.id}`} id={l.id} alpha={l.alpha} />)}
      <Thermometer f={f} />
      <RevealLabels f={f} />
      <ManagerLabel f={f} />
      <Arrow f={f} />
      <ScaleReadout f={f} />
      <Bars f={f} />
      <Subs f={f} />
      {!(getInputProps() as { mute?: boolean }).mute && <Audio src={staticFile("voz_sudar/voz.wav")} />}
    </AbsoluteFill>
  );
};
