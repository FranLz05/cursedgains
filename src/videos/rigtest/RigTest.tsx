// TitoRigTest: turntable / showcase of the TitoRig3D standard character (src/components/TitoRig3D.tsx) in a small gym set,
// with the same composer as every PumpParadox short (ink, lens blur, bloom, tone map, grade) and the mandatory camera physics:
// moving on 100 % of the frames, Easing.inOut(cubic), background semi-blurred.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { TitoRig, TitoAction, TitoExpression, TitoState } from "../../components/TitoRig3D";
import { InkPass, noInkFallback, NOINK } from "../alejandro/ink";
import { LensBlur } from "../alejandro/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../alejandro/grade";
import { TONE, CHAR, twoTone } from "../alejandro/shade";
import { ctex, rep, brick } from "../alejandro/paint";

const FPS = 30;
type Seg = { a: TitoAction; ex: TitoExpression; dur: number; label: string; talk?: boolean; sweat?: number; speed?: number; yaw?: number };
export const SEGS: Seg[] = [
  { a: "idle", ex: "idle", dur: 2.6, label: "IDLE + LIP-SYNC", talk: true },
  { a: "walk", ex: "smug", dur: 3.2, label: "WALK" },
  { a: "run", ex: "effort", dur: 3.2, label: "RUN", sweat: 1 },
  { a: "curl", ex: "effort", dur: 3.6, label: "CURL", sweat: 0.6 },
  { a: "jump", ex: "shocked", dur: 1.8, label: "JUMP: SQUASH & STRETCH" },
  { a: "hit", ex: "shocked", dur: 1.6, label: "HIT" },
  { a: "fall", ex: "exhausted", dur: 2.0, label: "FALL", sweat: 1 },
  { a: "cheer", ex: "smug", dur: 2.4, label: "CHEER", talk: true },
  { a: "idle", ex: "idle", dur: 2.0, label: "BACK VIEW", yaw: Math.PI + 0.35 },
];
const STARTS = SEGS.reduce<number[]>((a, s, i) => (a.push(i ? a[i - 1] + Math.round(SEGS[i - 1].dur * FPS) : 0), a), []);
export const RIG_TOTAL = STARTS[STARTS.length - 1] + Math.round(SEGS[SEGS.length - 1].dur * FPS);
const segOf = (f: number) => { let i = 0; STARTS.forEach((s, k) => { if (f >= s) i = k; }); return i; };
const easeIO = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };

class Set3D {
  root = new THREE.Group(); sun = new THREE.DirectionalLight("#fff1d6", 3); rig = new TitoRig();
  constructor() {
    const lam = (c: string, map?: THREE.Texture) => twoTone(new THREE.MeshLambertMaterial({ color: c, ...(map ? { map } : {}) }));
    const boards = ctex("rigBoards", 512, 512, (g, r) => { const cs = ["#d8a86c", "#cf9d62", "#dfb177", "#c99659"]; for (let i = 0; i < 8; i++) { g.fillStyle = cs[Math.floor(r() * 4)]; g.fillRect(0, i * 64, 512, 64); g.fillStyle = "#6a4426"; g.fillRect(0, i * 64, 512, 3); g.fillRect(r() * 512, i * 64, 3, 64); } });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), lam("#ffffff", rep(boards, 10, 10))); floor.receiveShadow = true; this.root.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), lam("#a88a6a", rep(brick(), 40 / 6, 9 / 4))); wall.position.set(0, 4.5, -6); wall.receiveShadow = true; this.root.add(wall);
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: string) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; this.root.add(m); return m; };
    box(40, 0.5, 0.12, 0, 1.1, -5.94, "#e2453c");
    for (const rx of [-4, 4]) { for (const dx of [-0.9, 0.9]) box(0.14, 2.4, 0.14, rx + dx, 1.2, -4.2, "#d9373b"); box(2.0, 0.14, 0.14, rx, 2.4, -4.2, "#d9373b"); }
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20), lam(i % 2 ? "#c0353a" : "#2f3340")); m.position.set(2.2, 0.06 + i * 0.125, -4.6); m.castShadow = true; this.root.add(m); }
    for (let k = 0; k < 24; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(["#ffd27a", "#ff7a6a", "#7ad0ff"][k % 3]).multiplyScalar(3) })); b.position.set(-6 + k * 0.52, 3.6 - 0.5 * Math.sin((k / 23) * Math.PI), -5.9); b.layers.set(NOINK); this.root.add(b); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), new THREE.MeshBasicMaterial({ map: ctex("rigSign", 512, 160, (g) => { g.fillStyle = "#1c1f28"; g.fillRect(0, 0, 512, 160); g.strokeStyle = "#ffd23f"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 150); g.font = "900 96px Arial Black, Impact"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffd23f"; g.fillText("PUMP GYM", 256, 84); }) }));
    sign.position.set(0, 2.9, -5.93); sign.layers.set(NOINK); this.root.add(sign);
    const hemi = new THREE.HemisphereLight("#e8f0ff", "#b49a78", 0.2);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048); const sc = this.sun.shadow.camera; sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 1; sc.far = 60; this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02;
    this.root.add(hemi, this.sun, this.sun.target, this.rig.object);
    TONE.uLitCol.value.set(1.05, 0.9, 0.74); TONE.uShadeCol.value.set(0.3, 0.27, 0.42); TONE.uShadeLift.value.set(0.04, 0.05, 0.12); TONE.uLambert.value = 0.4; TONE.uSideK.value = 0.8; TONE.uTerm.value = 0.16;
    CHAR.uCharTint.value.set(1.04, 0.95, 0.86);
  }
  update(f: number, cam: THREE.PerspectiveCamera) {
    const i = segOf(f), s = SEGS[i], t = (f - STARTS[i]) / FPS, D = s.dur;
    const talk = s.talk ? Math.max(0, Math.sin(t * 17) * 0.5 + Math.sin(t * 7.3) * 0.5) : 0;
    const mouth = s.ex === "effort" && s.a === "curl" ? 0.2 + 0.5 * Math.max(0, Math.sin(t * Math.PI / 0.9)) : s.ex === "shocked" ? 0.6 : talk;
    const travel = s.a === "walk" || s.a === "run";
    const st = { action: s.a, t, expression: s.ex, mouthOpen: mouth, sweat: s.sweat ?? 0, travel, position: travel ? [-(s.a === "run" ? 6.7 : 1.75), 0, 0] : [0, 0, 0], yaw: s.yaw ?? (travel ? Math.PI / 2 - 0.45 : s.a === "fall" ? Math.PI / 2 : 0.25) } as TitoState;
    this.rig.update(st, cam);
    // camera: continuous, in-out cubic over a padded window (never still), tracks the pelvis, semi-close framing
    const P = 0.3 * D, u = (easeIO((t + P) / (D + 2 * P)) - easeIO(P / (D + 2 * P))) / (easeIO((D + P) / (D + 2 * P)) - easeIO(P / (D + 2 * P)));
    const tgt = this.rig.anchor("pelvis"); const ty = s.a === "fall" ? 0.5 : s.a === "idle" && !s.yaw ? 1.75 : 1.15;
    const ang = (i % 2 ? -1 : 1) * (0.35 - 0.5 * u) + 0.15, dist = s.a === "idle" && !s.yaw ? 2.3 - 0.3 * u : s.a === "curl" ? 3.4 - 0.4 * u : 4.6 - 0.5 * u;
    cam.position.set(tgt.x + Math.sin(ang) * dist, (s.a === "idle" && !s.yaw ? 1.85 : 1.35) + 0.15 * u, tgt.z + Math.cos(ang) * dist);
    cam.lookAt(tgt.x, ty, tgt.z); cam.fov = 40; cam.near = 0.1; cam.far = 200; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
    this.rig.update(st, cam);   // again with the final camera: partial billboard
    this.sun.position.set(tgt.x - 4, 9, 6); this.sun.target.position.set(tgt.x, 0, 0);
    return { tgt, label: s.label, i };
  }
}

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene, gl, size } = useThree();
  const set = useMemo(() => new Set3D(), []);
  const fx = useMemo(() => {
    const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.75, luminanceThreshold: 0.95, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
    return { ink: new InkPass(scene, camera as THREE.PerspectiveCamera), lens: new LensBlur({ maxCoC: 14, nearScale: 1.1 }), bloom: b, tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day) };
  }, [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const composer = useMemo(() => {
    const c = new EffectComposer(gl, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
    c.addPass(new RenderPass(scene, camera)); c.addPass(fx.ink); c.addPass(new EffectPass(camera, fx.lens.pre)); c.addPass(new EffectPass(camera, fx.lens.main)); c.addPass(new EffectPass(camera, fx.bloom, fx.tone, fx.grade));
    return c;
  }, [gl, scene, camera, fx]);
  useEffect(() => { composer.setSize(size.width, size.height); }, [composer, size.width, size.height]);
  useFrame(() => { composer.render(); }, 1);
  const cam = camera as THREE.PerspectiveCamera;
  const r = set.update(f, cam);
  scene.background = new THREE.Color("#2a1c18"); scene.fog = new THREE.Fog("#3a2a22", 14, 40);
  noInkFallback(set.root);
  const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.5, r.tgt.clone().sub(cam.position).dot(fwd)); fx.lens.cInf = 9;
  gradeFor(fx.grade, "day");
  return <primitive object={set.root} dispose={null} />;
};

export const TitoRigTest: React.FC = () => {
  const f = useCurrentFrame(), i = segOf(f);
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.1, far: 200 }}>
        <Inner />
      </ThreeCanvas>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 140 }}>
        <div style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 44, color: "#fff", background: "rgba(6,9,20,0.82)", border: "2.5px solid rgba(255,255,255,0.92)", borderRadius: 8, padding: "14px 28px" }}>
          {SEGS[i].label} · {SEGS[i].ex.toUpperCase()}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
