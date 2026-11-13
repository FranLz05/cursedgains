// "Alejandro Magno" test short (6.8 s) in the flat-characters-in-a-3D-toon-world style, with the template's post
// chain: InkPass -> lens blur pre + main -> bloom -> NEUTRAL tone map -> grade, MSAA 4. Shot changes crossfade by
// stacking a second canvas. Captions and voice are added afterwards with ffmpeg (one word at a time).
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
import { layersAt, dofAt, MARKS, smooth, toOld, camAt } from "./story";
import WORDS from "./palabras.json";

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = toOld(useCurrentFrame()); // the whole animation plays through the narration's time map
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
  // the R3F <EffectComposer> (3.2.x) rendered blank under Remotion here: drive postprocessing's composer by hand
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

// ---- the number at the top of the frame: big, bouncy, hard outline and drop shadow (no boxes) ----
const Marks: React.FC<{ f: number }> = ({ f }) => {
  const live = MARKS.filter((m) => f >= m.a && f <= m.b);
  if (!live.length) return null;
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920}>
        <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#000" floodOpacity="0.55" /></filter></defs>
        {live.map((m) => {
          const u = smooth((f - m.a) / 8), over = 1 + 0.18 * Math.sin(Math.min(1, (f - m.a) / 12) * Math.PI), out = 1 - smooth((f - (m.b - 5)) / 5);
          const rot = -3 * (1 - u) + 1.5 * Math.sin(f * 0.15);
          return (
            <g key={m.label + m.a} opacity={u * out} filter="url(#sh)">
              <g transform={`translate(540,330) rotate(${rot}) scale(${(0.6 + 0.4 * u) * over})`}>
                <text textAnchor="middle" y={0} fontFamily="Arial Black, Impact, sans-serif" fontSize={m.label.length > 3 ? 171 : 207} fill={m.col} stroke="#1a1010" strokeWidth={16} strokeLinejoin="round" paintOrder="stroke">{m.label}</text>
                {m.sub ? <text textAnchor="middle" y={82} fontFamily="Arial Black, Impact, sans-serif" fontSize={58} fill="#fff" stroke="#1a1010" strokeWidth={12} strokeLinejoin="round" paintOrder="stroke">{m.sub}</text> : null}
              </g>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// ---- word-by-word subtitles (bottom-middle): thick sans, white, key words in yellow ----
type SW = { text: string; key: boolean; col: string; f: number };
type SG = { start: number; end: number; words: SW[] };
const KEYS = new Set(["trap", "less", "fatigue", "spill", "gains"]);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z']/g, "");
const GROUPS: SG[] = (() => {
  const ws = (WORDS.words as { w: string; t: number; e: number }[]), out: SG[] = [];
  const flags = ws.map((x) => KEYS.has(norm(x.w).replace(/^twentyset$/, "")) || /(^|-)trap$/.test(norm(x.w)));
  ws.forEach((x, i) => { if (norm(x.w) === "hard" && i >= 2 && norm(ws[i - 2].w) === "twice") { flags[i] = flags[i - 1] = flags[i - 2] = true; } }); // "TWICE AS HARD"
  let cur: SW[] = [], prevEnd = "";
  const flush = () => { if (cur.length) out.push({ start: cur[0].f - 1, end: 0, words: cur }); cur = []; };
  ws.forEach((x, i) => {
    if (cur.length >= 3 || /[.,;:?!—]$/.test(prevEnd) || cur.reduce((n, q) => n + q.text.length, 0) > 15 || (cur.length && flags[i] && !cur[cur.length - 1].key)) flush();
    cur.push({ text: x.w.replace(/[.,;:¿?¡!—]/g, "").toUpperCase(), key: flags[i], col: norm(x.w) === "gains" ? "#22C55E" : "#EF4444", f: Math.max(0, Math.round(x.t * 30)) });
    prevEnd = x.w;
  });
  flush();
  out.forEach((g, i) => { g.end = i + 1 < out.length ? out[i + 1].start : Math.round(ws[ws.length - 1].e * 30) + 8; });
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
          const u = (f - w.f) / 7, shown = f >= w.f - 1;
          const pop = shown ? 1 + 0.05 * Math.max(0, 1 - u) ** 2 : 0.85;
          return (
            <span key={i} style={{
              fontFamily: "Arial Black, Impact, sans-serif", fontWeight: 900, fontSize: w.key ? 99 : 88, lineHeight: 1.05, padding: "0 10px",
              color: w.key ? w.col : "#ffffff", WebkitTextStroke: "11px #120c0c", paintOrder: "stroke fill",
              textShadow: "0 7px 0 rgba(0,0,0,0.5)", opacity: shown ? 1 : 0, transform: `scale(${pop}) translateY(${shown ? Math.max(0, 1 - u) * 12 : 18}px)`, display: "inline-block",
            }}>{w.text}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---- an arrow that points at Tito in the wide shots (projected from the real camera) ----
const ARROWS = [{ a: 88, b: 206 }, { a: 232, b: 336 }, { a: 912, b: 1000 }];            // authored frames
const pcA = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 200);
const Arrow: React.FC<{ f: number }> = ({ f }) => {
  const seg = ARROWS.find((q) => f >= q.a && f <= q.b);
  if (!seg) return null;
  const lay = layersAt(f), id = lay[lay.length - 1].id, c = camAt(id, f);
  pcA.position.set(...c.pos); pcA.fov = c.fov; pcA.updateProjectionMatrix(); pcA.lookAt(...c.look); pcA.updateMatrixWorld();
  const q = new THREE.Vector3(0, 1.5, 0).project(pcA), x = (q.x + 1) * 540, y = (1 - q.y) * 960;
  if (x < 120 || x > 960 || y < 380 || y > 1400) return null;
  const u = smooth((f - seg.a) / 8), out = 1 - smooth((f - (seg.b - 6)) / 6), bob = Math.sin(f * 0.28) * 16;
  const d = "M0 0 L-74 -90 L-30 -90 L-30 -220 L30 -220 L30 -90 L74 -90 Z";
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920}>
        <defs><filter id="ash" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="6" floodColor="#000" floodOpacity="0.55" /></filter></defs>
        <g transform={`translate(${x},${y - 24 + bob}) scale(${0.6 + 0.4 * u})`} opacity={u * out} filter="url(#ash)">
          <path d={d} fill="none" stroke="#140a0a" strokeWidth={30} strokeLinejoin="round" />
          <path d={d} fill="#ff3b3b" stroke="#ffffff" strokeWidth={9} strokeLinejoin="round" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export const VolumenShort: React.FC = () => {
  const fn = useCurrentFrame(), f = toOld(fn);
  return (
    <AbsoluteFill style={{ background: "#cdbfae" }}>
      {layersAt(f).map((l) => <ShotView key={`shot${l.id}`} id={l.id} alpha={l.alpha} />)}
      <Marks f={f} />
      <Arrow f={f} />
      <Subs f={fn} />
      {!(getInputProps() as { mute?: boolean }).mute && <Audio src={staticFile("voz/voz.wav")} />}
    </AbsoluteFill>
  );
};
