// "Soreness != Muscle Growth (DOMS)" — PumpParadox Video 6 (id DomsShort). 16 micro-scenes, ~3 s each, HARD CUTS, camera Easing.inOut(Easing.cubic) in every shot.
// Characters: the official 2.5D TitoRig (src/components/TitoRig3D.tsx), also used for the yellow-hard-hat workers and the wigged judge. Voice-over lip-synced to Tito's mouth.
// Scene 16 is a real split screen: two WebGL canvases of 540 x 1920 (left red hospital, right green gym).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, Builder } from "./world";
import { S1, S2, S3, S4, S5, S6, S7, S8 } from "./sets1";
import { S9, S10, S11, S12, S13, S14, S15, S16L, S16R } from "./sets2";
import { InkPass, noInkFallback } from "../alejandro/ink";
import { LensBlur } from "../alejandro/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../alejandro/grade";
import { camAt, sceneOf, sceneStart, durOf, FPS, TOTAL } from "./story";
import WORDS from "./palabras.json";

const BUILDERS: Builder[] = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16L, S16R];
const SPLIT0 = 15;                                    // builder indices 15 / 16 = the split-screen panes
const FONT = "Arial Black, Impact, sans-serif";
const RED = "#EF4444", GREEN = "#22C55E";

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.75, luminanceThreshold: 0.95, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), look = new THREE.Vector3();

/** one canvas: a World with the given builders, the shared composer (ink, lens blur, bloom, tone map, grade) */
const Inner: React.FC<{ ids: number[]; pick: (f: number) => { i: number; ci: number; t0: number } }> = ({ ids, pick }) => {
  const f = useCurrentFrame();
  const { camera, scene, gl, size } = useThree();
  const world = useMemo(() => new World(BUILDERS, ids), []);          // eslint-disable-line react-hooks/exhaustive-deps
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera), lens: new LensBlur({ maxCoC: 14, nearScale: 1.1 }), bloom: makeBloom(),
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
  const { i, ci, t0 } = pick(f), t = (f - t0) / FPS, scn = world.scn[i]!;
  const c = camAt(ci, t, durOf(Math.min(ci, 15))), sh = scn.shake?.(t) ?? 0;
  cam.position.set(c.pos[0] + sh, c.pos[1] + sh * 0.6, c.pos[2]); look.set(...c.look); cam.fov = c.fov; cam.near = 0.05; cam.far = 400; cam.updateProjectionMatrix(); cam.lookAt(look); cam.updateMatrixWorld();
  world.update(i, { t, f, cam, D: 0 });
  scn.focus(fpt); world.aimSun(fpt, scn.env); world.halo.quaternion.copy(cam.quaternion);
  scene.background = new THREE.Color(scn.env.bg); scene.fog = scn.env.fog ? new THREE.Fog(scn.env.fog[0], scn.env.fog[1], scn.env.fog[2]) : null;
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd)); fx.lens.cInf = scn.cInf ?? 8;
  gradeFor(fx.grade, "day");
  return <primitive object={world.root} dispose={null} />;
};
const dprOverride = () => (getInputProps() as { dpr?: number }).dpr;
const Canvas3D: React.FC<{ w: number; ids: number[]; pick: (f: number) => { i: number; ci: number; t0: number } }> = ({ w, ids, pick }) => (
  <ThreeCanvas width={w} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.05, far: 400 }}>
    <Inner ids={ids} pick={pick} />
  </ThreeCanvas>
);
const MAIN_IDS = Array.from({ length: 15 }, (_, k) => k);
const pickMain = (f: number) => { const i = Math.min(14, sceneOf(f)); return { i, ci: i, t0: sceneStart(i) }; };
const pickL = (f: number) => ({ i: 15, ci: 15, t0: sceneStart(15) + 0 * f });
const pickR = (f: number) => ({ i: 16, ci: 16, t0: sceneStart(15) + 0 * f });

// ---------------------------------------------------------------- subtitles: 1-2 words, big, centred at ~68 % height, key words red / green
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
type SW = { text: string; col: string | null; f: number };
type SG = { start: number; end: number; words: SW[] };
const PHRASES: { w: string[]; col: string }[] = [
  { w: ["wheelchair"], col: RED }, { w: ["wrong"], col: RED }, { w: ["restraining"], col: RED }, { w: ["inflammation"], col: RED }, { w: ["hates"], col: RED }, { w: ["crippled"], col: RED }, { w: ["cry"], col: RED },
  { w: ["garbage"], col: RED }, { w: ["toilet"], col: RED }, { w: ["exploding"], col: RED }, { w: ["soreness"], col: RED }, { w: ["wrecks"], col: RED },
  { w: ["hypertrophy"], col: GREEN }, { w: ["mechanical", "tension"], col: GREEN }, { w: ["progressive", "overload"], col: GREEN }, { w: ["gains"], col: GREEN }, { w: ["growth"], col: GREEN }, { w: ["track"], col: GREEN }, { w: ["add", "weight"], col: GREEN },
];
const GROUPS: SG[] = (() => {
  const ws = WORDS.words as { w: string; t: number; e: number }[], nw = ws.map((x) => norm(x.w)), cols: (string | null)[] = ws.map(() => null);
  ws.forEach((_, k) => PHRASES.forEach((p) => { if (p.w.every((q, j) => nw[k + j] === q)) p.w.forEach((_q, j) => (cols[k + j] = p.col)); }));
  const out: SG[] = []; let cur: SW[] = [], prev = "";
  const flush = () => { if (cur.length) out.push({ start: cur[0].f - 1, end: 0, words: cur }); cur = []; };
  ws.forEach((x, k) => {
    const len = cur.reduce((n, q) => n + q.text.length, 0), txt = x.w.replace(/[,.;:?!—]+$/g, "").replace(/’/g, "'").toUpperCase();
    if (cur.length >= 2 || /[.,;:?!—]$/.test(prev) || len + txt.length > 11 || (cur.length && cols[k] !== cur[cur.length - 1].col)) flush();
    cur.push({ text: txt, col: cols[k], f: Math.max(0, Math.round(x.t * 30)) }); prev = x.w;
  });
  flush();
  out.forEach((g, k) => { g.end = k + 1 < out.length ? out[k + 1].start : Math.round(ws[ws.length - 1].e * 30) + 12; });
  out.forEach((g) => { const last = [...ws].reverse().find((x) => Math.round(x.t * 30) === g.words[g.words.length - 1].f); if (last) g.end = Math.min(g.end, Math.round(last.e * 30) + 10); });
  return out;
})();
const Subs: React.FC<{ f: number }> = ({ f }) => {
  const low = sceneOf(f) === 2;
  const g = GROUPS.find((q) => f >= q.start && f < q.end);
  if (!g) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: low ? 1560 : 1300 }}>
      <div style={{ display: "flex", columnGap: 30, flexWrap: "wrap", justifyContent: "center", maxWidth: 1000 }}>
        {g.words.map((w, k) => {
          const u = (f - w.f) / 5, shown = f >= w.f - 1, pop = shown ? 1 + 0.12 * Math.max(0, 1 - u) ** 2 : 1;
          return (
            <span key={k} style={{ fontFamily: FONT, fontWeight: 900, WebkitTextStroke: "14px #0d0b12", paintOrder: "stroke fill", fontSize: 112, lineHeight: 1.05, padding: "0 8px", color: w.col ?? "#ffffff", textShadow: "0 8px 0 rgba(0,0,0,0.45)", opacity: shown ? 1 : 0, transform: `scale(${pop})`, display: "inline-block", letterSpacing: 1 } as React.CSSProperties}>{w.text}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** split-screen furniture: the white divider, a red / green wash on each pane and the two big captions */
const SplitOverlay: React.FC<{ f: number }> = ({ f }) => {
  const u = Math.min(1, (f - sceneStart(15)) / 9), pop = 1 + 0.15 * Math.max(0, 1 - u * 1.4);
  const cap = (txt: string[], col: string, x: number) => (
    <div style={{ position: "absolute", left: x, top: 150, width: 540, textAlign: "center", transform: `scale(${pop})`, transformOrigin: "50% 0" }}>
      {txt.map((l, i) => <div key={i} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 96, lineHeight: 1.0, color: col, WebkitTextStroke: "14px #0d0b12", paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(0,0,0,.45)" } as React.CSSProperties}>{l}</div>)}
    </div>
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, top: 0, width: 540, height: 1920, background: "linear-gradient(180deg, rgba(239,68,68,.20), rgba(239,68,68,0) 40%, rgba(120,0,10,.35))" }} />
      <div style={{ position: "absolute", left: 540, top: 0, width: 540, height: 1920, background: "linear-gradient(180deg, rgba(34,197,94,.18), rgba(34,197,94,0) 40%, rgba(0,80,30,.30))" }} />
      <div style={{ position: "absolute", left: 534, top: 0, width: 12, height: 1920, background: "#ffffff", boxShadow: "0 0 24px rgba(255,255,255,.9), 0 0 0 4px #0d0b12" }} />
      {cap(["CHASING", "PAIN"], RED, 0)}
      {cap(["CHASING", "TENSION"], GREEN, 540)}
    </AbsoluteFill>
  );
};

export const DomsShort: React.FC = () => {
  const f = useCurrentFrame();
  const split = f >= sceneStart(15);
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      {!split && <AbsoluteFill><Canvas3D w={1080} ids={MAIN_IDS} pick={pickMain} /></AbsoluteFill>}
      {split && (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, width: 540, height: 1920, overflow: "hidden" }}><Canvas3D w={540} ids={[15]} pick={(ff) => ({ ...pickL(ff), t0: sceneStart(15) })} /></div>
          <div style={{ position: "absolute", left: 540, top: 0, width: 540, height: 1920, overflow: "hidden" }}><Canvas3D w={540} ids={[16]} pick={(ff) => ({ ...pickR(ff), t0: sceneStart(15) })} /></div>
          <SplitOverlay f={f} />
        </>
      )}
      <Subs f={f} />
      {!(getInputProps() as { mute?: boolean }).mute && <Audio src={staticFile("voz_doms/mezcla.wav")} />}
    </AbsoluteFill>
  );
};
export { TOTAL };
