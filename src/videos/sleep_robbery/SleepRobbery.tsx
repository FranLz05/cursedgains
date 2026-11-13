// "Why 5 hours of sleep destroys muscle (nutrient partitioning)" — PumpParadox Video 7 (id SleepRobbery). 16 micro-scenes, ~2-4 s each, HARD CUTS, camera Easing.inOut(Easing.cubic) in every shot.
// Same architecture as the official standard (doms/Doms.tsx): 2.5D TitoRig3D cards in full 3D sets, InkPass + LensBlur + bloom + tone map + grade, 1-2 word subtitles, voice mix.
// Scene 14 adds a screen-space "60% MORE MUSCLE LOSS" title in PumpParadox type with a tremble.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, Builder } from "./world";
import { S1, S2, S3, S4, S5, S6 } from "./sets1";
import { S7, S8, S9, S10, S11, S12, S13 } from "./sets2";
import { S14, S15, S16 } from "./sets3";
import { InkPass, noInkFallback } from "../alejandro/ink";
import { LensBlur } from "../alejandro/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../alejandro/grade";
import { camAt, sceneOf, sceneStart, durOf, FPS, TOTAL } from "./story";
import WORDS from "./palabras.json";

const BUILDERS: Builder[] = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16];
const FONT = "Arial Black, Impact, sans-serif";
const RED = "#EF4444", GREEN = "#22C55E";

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.75, luminanceThreshold: 0.95, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), look = new THREE.Vector3();

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene, gl, size } = useThree();
  const world = useMemo(() => new World(BUILDERS, BUILDERS.map((_, k) => k)), []);          // eslint-disable-line react-hooks/exhaustive-deps
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera), lens: new LensBlur({ maxCoC: 7, nearScale: 0.8 }), bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const composer = useMemo(() => {
    const c = new EffectComposer(gl, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
    c.addPass(new RenderPass(scene, camera)); c.addPass(fx.ink); c.addPass(new EffectPass(camera, fx.lens.pre)); c.addPass(new EffectPass(camera, fx.lens.main)); c.addPass(new EffectPass(camera, fx.bloom, fx.tone, fx.grade));
    return c;
  }, [gl, scene, camera, fx]);
  useEffect(() => { composer.setSize(size.width, size.height); }, [composer, size.width, size.height]);
  useFrame(() => { composer.render(); }, 1);
  const cam = camera as THREE.PerspectiveCamera;
  const i = sceneOf(f), t = (f - sceneStart(i)) / FPS, scn = world.scn[i]!;
  const c = camAt(i, t, durOf(i)), sh = scn.shake?.(t) ?? 0;
  cam.position.set(c.pos[0] + sh, c.pos[1] + sh * 0.6, c.pos[2]); look.set(...c.look); cam.fov = c.fov; cam.near = 0.05; cam.far = 400; cam.updateProjectionMatrix(); cam.lookAt(look); cam.updateMatrixWorld();
  world.update(i, { t, f, cam, D: 0 });
  scn.focus(fpt); world.aimSun(fpt, scn.env); world.halo.quaternion.copy(cam.quaternion);
  scene.background = new THREE.Color(scn.env.bg); scene.fog = scn.env.fog ? new THREE.Fog(scn.env.fog[0], scn.env.fog[1], scn.env.fog[2]) : null;
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd)); fx.lens.cInf = (scn.cInf ?? 8) * 0.3;
  gradeFor(fx.grade, "day");
  return <primitive object={world.root} dispose={null} />;
};
const dprOverride = () => (getInputProps() as { dpr?: number }).dpr;

// ---------------------------------------------------------------- subtitles: 1-2 words, big, centred at ~68 % height (y = 1300), key words red / green
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
type SW = { text: string; col: string | null; f: number };
type SG = { start: number; end: number; words: SW[]; scene: number };
const PHRASES: { w: string[]; col: string }[] = [
  { w: ["robbers"], col: RED }, { w: ["armed"], col: RED }, { w: ["cortisol"], col: RED }, { w: ["emergency"], col: RED }, { w: ["furnace"], col: RED }, { w: ["loss"], col: RED }, { w: ["sixty", "percent"], col: RED },
  { w: ["tax"], col: RED }, { w: ["fat"], col: RED }, { w: ["sleep", "deprivation"], col: RED }, { w: ["phone"], col: RED },
  { w: ["muscle"], col: GREEN }, { w: ["gains"], col: GREEN }, { w: ["calorie", "deficit"], col: GREEN },
];
const GROUPS: SG[] = (() => {
  const ws = WORDS.words as { w: string; t: number; e: number; scene: number }[], nw = ws.map((x) => norm(x.w)), cols: (string | null)[] = ws.map(() => null);
  ws.forEach((_, k) => PHRASES.forEach((p) => { if (p.w.every((q, j) => nw[k + j] === q)) p.w.forEach((_q, j) => (cols[k + j] = p.col)); }));
  const out: SG[] = []; let cur: SW[] = [], prev = "", curScene = 0;
  const flush = () => { if (cur.length) out.push({ start: cur[0].f - 1, end: 0, words: cur, scene: curScene }); cur = []; };
  ws.forEach((x, k) => {
    const len = cur.reduce((n, q) => n + q.text.length, 0), txt = x.w.replace(/[,.;:?!—]+$/g, "").replace(/’/g, "'").toUpperCase();
    if (cur.length >= 2 || /[.,;:?!—]$/.test(prev) || len + txt.length > 11 || (cur.length && cols[k] !== cur[cur.length - 1].col)) flush();
    cur.push({ text: txt, col: cols[k], f: Math.max(0, Math.round(x.t * 30)) }); prev = x.w; curScene = x.scene;
  });
  flush();
  out.forEach((g, k) => { g.end = k + 1 < out.length ? out[k + 1].start : Math.round(ws[ws.length - 1].e * 30) + 12; });
  out.forEach((g) => { const last = [...ws].reverse().find((x) => Math.round(x.t * 30) === g.words[g.words.length - 1].f); if (last) g.end = Math.min(g.end, Math.round(last.e * 30) + 10); });
  return out;
})();
/** scenes where the subtitle sits lower (y ~ 1560) so it never covers the subject's face */
const LOW_SUBS = new Set([1, 2, 5, 13]);
const Subs: React.FC<{ f: number }> = ({ f }) => {
  const low = LOW_SUBS.has(sceneOf(f));
  const g = GROUPS.find((q) => f >= q.start && f < q.end);
  if (!g) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: sceneOf(f) === 13 ? 1610 : low ? 1560 : 1300 }}>
      <div style={{ display: "flex", columnGap: 44, flexWrap: "wrap", justifyContent: "center", maxWidth: 960 }}>
        {g.words.map((w, k) => {
          const u = (f - w.f) / 5, shown = f >= w.f - 1, pop = shown ? 1 + 0.12 * Math.max(0, 1 - u) ** 2 : 1;
          return (
            <span key={k} style={{ fontFamily: FONT, fontWeight: 900, WebkitTextStroke: "14px #0d0b12", paintOrder: "stroke fill", fontSize: Math.min(112, Math.floor(940 / (Math.max(5, g.words.reduce((n, q) => n + q.text.length, 0) + 1.5 * (g.words.length - 1)) * 0.82))), lineHeight: 1.05, padding: "0 8px", color: w.col ?? "#ffffff", textShadow: "0 8px 0 rgba(0,0,0,0.45)", opacity: shown ? 1 : 0, transform: `scale(${pop})`, display: "inline-block", letterSpacing: 1 } as React.CSSProperties}>{w.text}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** scene 14: "60% MORE MUSCLE LOSS" in PumpParadox type (Arial Black, thick ink stroke), pops in on "sixty percent" and trembles; inside the safe margins (>= 60 px sides, >= 150 px top) */
const LossTitle: React.FC<{ f: number }> = ({ f }) => {
  const s0 = sceneStart(13), pw = WORDS.words.find((x) => norm(x.w) === "sixty"), f0 = pw ? Math.round(pw.t * 30) : s0 + 70;
  const shown = f >= f0 - 2, u = (f - (f0 - 2)) / 8, pop = shown ? 1 + 0.35 * Math.max(0, 1 - u) ** 2 : 0.01;
  const trem = f >= f0 ? 1 : 0.3, jx = Math.sin(f * 2.9) * 7 * trem + Math.sin(f * 7.1) * 3 * trem, jy = Math.cos(f * 3.7) * 6 * trem + Math.sin(f * 6.3) * 3 * trem, jr = Math.sin(f * 2.3) * 1.6 * trem;
  const line = (txt: string, size: number, col: string) => <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 0.98, color: col, WebkitTextStroke: "18px #0d0b12", paintOrder: "stroke fill", textShadow: "0 10px 0 rgba(0,0,0,.5)", letterSpacing: 2 } as React.CSSProperties}>{txt}</div>;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 200 }}>
      <div style={{ opacity: shown ? 1 : 0, transform: `translate(${jx}px, ${jy}px) rotate(${jr}deg) scale(${pop})`, textAlign: "center", width: 940 }}>
        {line("60%", 300, RED)}
        {line("MORE MUSCLE", 118, "#ffffff")}
        {line("LOSS", 210, RED)}
      </div>
    </AbsoluteFill>
  );
};

export const SleepRobbery: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <AbsoluteFill><ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.05, far: 400 }}><Inner /></ThreeCanvas></AbsoluteFill>
      {sceneOf(f) === 13 && <LossTitle f={f} />}
      <Subs f={f} />
      {!(getInputProps() as { mute?: boolean }).mute && <Audio src={staticFile("voz_sleep/mezcla.wav")} />}
    </AbsoluteFill>
  );
};
export { TOTAL };
