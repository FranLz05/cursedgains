// DOMS short: the 3D world. Every micro-scene is a THREE.Group built ONCE in the constructor and shown only while its scene is active (hard cuts).
// Characters are the official TitoRig (2.5D flat illustration on a card in the 3D space, src/components/TitoRig3D.tsx): Tito himself and the yellow-hard-hat
// muscle workers share the same rig (outfit: helmet / wig / shirt colour). No human is modelled in 3D: only sets, props and effects are 3D.
import * as THREE from "three";
import { TitoRig, TitoState } from "../../components/TitoRig3D";
import { TONE } from "../alejandro/shade";
import { NOINK } from "../alejandro/ink";
import MOUTH from "./mouth.json";

export type Env = {
  lit: [number, number, number]; shade: [number, number, number]; lift?: [number, number, number];
  bg: string; fog?: [string, number, number];
  sun: [number, number, number]; sunI?: number; sunCol?: string; hemi?: number;
  /** multiplies the flat cards (the rig is unlit): darkens Tito in dark sets */
  tint?: [number, number, number];
  /** cinematic key light on the flat cards: lit colour, ambient (in shadow), rim colour; lamp = visible bulb + shaft, offset from the focus point */
  key?: [number, number, number]; amb?: [number, number, number]; rim?: [number, number, number]; lamp?: [number, number, number]; lampCol?: string;
};
export type Ctx = { t: number; f: number; cam: THREE.PerspectiveCamera; w: World; mouth: number; i: number; D: number };
export interface Scn {
  g: THREE.Group; env: Env;
  update(c: Ctx): void;
  /** the point the depth of field focuses on */
  focus(out: THREE.Vector3): THREE.Vector3;
  /** small low-frequency camera shake (metres), added to the camera position */
  shake?(t: number): number;
  /** blur of the background (LensBlur cInf) */
  cInf?: number;
}
export type Builder = (w: World) => Scn;

export const mouthAt = (f: number) => (MOUTH as number[])[Math.max(0, Math.min((MOUTH as number[]).length - 1, f))] ?? 0;

const cardLight = { uKey: { value: new THREE.Vector3(1, 1, 1) }, uAmb: { value: new THREE.Vector3(0.4, 0.4, 0.5) }, uRim: { value: new THREE.Vector3(0, 0, 0) }, uDir: { value: 1 } };
/** makes the flat 2D card react to the key light: half of the character falls into shadow, the lit edge gets a rim glow (Rick Clips style) */
const patchCard = (m: THREE.MeshBasicMaterial) => {
  if (m.userData.lit) return; m.userData.lit = true;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, cardLight);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uKey; uniform vec3 uAmb; uniform vec3 uRim; uniform float uDir;")
      .replace("#include <map_fragment>", `#include <map_fragment>
      { float side = smoothstep(-0.09, 0.09, (vMapUv.x - 0.5) * uDir);
        float low = smoothstep(0.0, 1.0, vMapUv.y * 1.15 + 0.1);
        vec3 lit = mix(uAmb, uKey, side) * mix(0.8, 1.0, low);
        float edge = diffuseColor.a * (1.0 - texture2D(map, vMapUv + vec2(uDir * 0.0075, 0.0)).a);
        float edge2 = diffuseColor.a * (1.0 - texture2D(map, vMapUv + vec2(uDir * 0.0035, 0.0035)).a);
        diffuseColor.rgb = diffuseColor.rgb * lit + uRim * clamp(edge + 0.6 * edge2, 0.0, 1.0) * 2.2; }`);
  };
  m.customProgramCacheKey = () => "cardlit1";
};
const HALO = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

export class World {
  root = new THREE.Group();
  sun = new THREE.DirectionalLight("#fff1d6", 3);
  hemi = new THREE.HemisphereLight("#e8f0ff", "#b49a78", 0.2);
  scn: (Scn | null)[] = [];
  private rigs = new Map<string, TitoRig>();
  private used = new Set<TitoRig>();
  halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: HALO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  constructor(builders: Builder[], only?: number[]) {
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 70; this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02;
    this.root.add(this.hemi, this.sun, this.sun.target);
    for (const m of [this.halo, this.core]) { m.layers.set(NOINK); m.renderOrder = 9; this.root.add(m); }
    builders.forEach((b, i) => {
      if (only && !only.includes(i)) { this.scn.push(null); return; }
      const s = b(this); s.g.visible = false; this.root.add(s.g); this.scn.push(s);
    });
  }
  /** a rig by name (Tito A / B, workers 0..3): created on first use */
  rig(name: string) { let r = this.rigs.get(name); if (!r) { r = new TitoRig(); this.rigs.set(name, r); } return r; }
  /** world position of a rig joint even when the rig sits inside a rotated / scaled parent */
  wa(rig: TitoRig, name: Parameters<TitoRig["anchor"]>[0], out = new THREE.Vector3()) {
    rig.object.updateWorldMatrix(true, false);
    return rig.object.localToWorld(rig.anchor(name, out));
  }
  /** pose a rig in the active scene: re-parents it, tints the flat card for the set's light, then redraws it */
  put(rig: TitoRig, parent: THREE.Object3D, st: TitoState, cam: THREE.Camera, tint?: [number, number, number]) {
    if (rig.object.parent !== parent) parent.add(rig.object);
    const off = (parent.userData.off as [number, number, number] | undefined) ?? [0, 0, 0]; rig.object.position.set(off[0], off[1], off[2]);
    const m = rig.card.material as THREE.MeshBasicMaterial; const t = tint ?? [1, 1, 1]; m.color.setRGB(t[0], t[1], t[2]); patchCard(m);
    this.used.add(rig);
    return rig.update(st, cam);
  }
  mouth(f: number) { return mouthAt(f); }
  /** show scene `i`, apply its light, update it */
  update(i: number, c: Omit<Ctx, "w" | "mouth" | "i">) {
    this.scn.forEach((s, k) => { if (s) s.g.visible = k === i; });
    const s = this.scn[i]!, e = s.env;
    TONE.uLitCol.value.set(e.lit[0] * 0.78, e.lit[1] * 0.78, e.lit[2] * 0.78); TONE.uShadeCol.value.set(e.shade[0] * 0.45, e.shade[1] * 0.45, e.shade[2] * 0.5); TONE.uShadeLift.value.set(...(e.lift ?? [0.04, 0.05, 0.12]));
    TONE.uLambert.value = 0.4; TONE.uSideK.value = 0.8; TONE.uTerm.value = 0.16;
    this.sun.color.set(e.sunCol ?? "#fff1d6"); this.sun.intensity = e.sunI ?? 3; this.hemi.intensity = e.hemi ?? 0.03;
    const k = e.key ?? [e.lit[0] * 1.05, e.lit[1] * 1.0, e.lit[2] * 0.95], a = e.amb ?? [e.shade[0] * 0.8 + 0.1, e.shade[1] * 0.8 + 0.1, e.shade[2] * 0.9 + 0.16], r = e.rim ?? [e.lit[0] * 0.55, e.lit[1] * 0.45, e.lit[2] * 0.4];
    cardLight.uKey.value.set(...k); cardLight.uAmb.value.set(...a); cardLight.uRim.value.set(...r);
    c.cam.updateMatrixWorld(); const rt = new THREE.Vector3().setFromMatrixColumn(c.cam.matrixWorld, 0); cardLight.uDir.value = e.sun[0] * rt.x + e.sun[2] * rt.z >= 0 ? 1 : -1;
    s.update({ ...c, w: this, mouth: mouthAt(c.f), i });
    return s;
  }
  /** sun follows the focus point so the shadow map always covers the subject */
  aimSun(p: THREE.Vector3, e: Env) {
    this.sun.position.set(p.x + e.sun[0] * 1.2, p.y + e.sun[1] * 0.6, p.z + e.sun[2]);
    const lo = e.lamp ?? [-1.6, 1.0, -1.4], lc = new THREE.Color(e.lampCol ?? "#FFB84D"); this.halo.visible = this.core.visible = !!e.lamp;
    this.core.position.set(p.x + lo[0], p.y + lo[1], p.z + lo[2]); (this.core.material as THREE.MeshBasicMaterial).color.copy(lc).multiplyScalar(3);
    this.halo.position.copy(this.core.position); this.halo.scale.setScalar(5.5); (this.halo.material as THREE.MeshBasicMaterial).color.copy(lc).multiplyScalar(0.3); this.halo.lookAt(p.x, p.y, p.z + 30); this.sun.target.position.copy(p); this.sun.target.updateMatrixWorld();
  }
}
export { NOINK };
