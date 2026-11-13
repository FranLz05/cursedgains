// SLEEP ROBBERY, ACT 1 "El atraco" (micro-scenes 1-6): Tito's bedroom at night (the phone is the only light) and at dawn (warm window sun).
// Every human is a TitoRig3D card (Tito, 2 robbers with a black balaclava). Props / sets are 3D. See world.ts.
import * as THREE from "three";
import { Kit, Puffs, Halo, hot, hh, clamp01, smooth, easeOut, easeIO, lerp, lam, SPH } from "./kit";
import { Builder, Env, World } from "./world";
import { Phone, bedroom, makeSack, BED, ROOM } from "./props";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const ENVS: Record<string, Env> = {
  // penumbra #1A2238: the only light is the phone (real PointLight + cool key / rim on the flat cards)
  night: { lit: [0.3, 0.37, 0.68], shade: [0.11, 0.14, 0.28], lift: [0.02, 0.03, 0.07], bg: "#1A2238", fog: ["#1A2238", 12, 34], sun: [-1.5, 5, 4], sunCol: "#8fb4ff", sunI: 0.6, hemi: 0.02,
    tint: [0.78, 0.84, 1.0], key: [0.95, 1.1, 1.45], amb: [0.32, 0.38, 0.6], rim: [0.45, 0.85, 1.5] },
  // everyday dawn: warm natural window sun, no blue tints
  dawn: { lit: [1.25, 1.05, 0.84], shade: [0.78, 0.66, 0.6], lift: [0.06, 0.05, 0.05], bg: "#2a1c18", sun: [7, 6.5, -2], sunCol: "#ffe2b8", tint: [1, 0.97, 0.92] },
};
type XYZ = [number, number, number];
const lying = (o: Record<string, unknown> = {}) => ({ action: "fall" as const, t: 2.2, position: [BED.x, BED.y, BED.z] as XYZ, yaw: Math.PI / 2 - 0.5, ...o });
const LEGS = { L: { thighFwd: 0, knee: 0.08, thighOut: 0.05 }, R: { thighFwd: 0.05, knee: 0.5, thighOut: 0.08 } };
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

/** the phone held above Tito's face, screen half toward the lens and half down at the face; drives the real point light + the glow halo. */
const holdPhone = (ph: Phone, head: THREE.Vector3, camPos: THREE.Vector3, offs: XYZ, w: World, halo: Halo, cam: THREE.Camera, t: number, k = 1, center?: THREE.Vector3) => {
  const c = center ? tmp.copy(center) : tmp.set(head.x + offs[0], head.y + offs[1], head.z + offs[2]);
  const n = tmp2.set(camPos.x - c.x, camPos.y - c.y, camPos.z - c.z).normalize().multiplyScalar(0.55).add(V(0, -0.45, 0)).normalize();
  const ya = V(1, 0, 0).addScaledVector(n, -n.x).normalize(), xa = new THREE.Vector3().crossVectors(ya, n);
  ph.g.position.copy(c); ph.g.setRotationFromMatrix(new THREE.Matrix4().makeBasis(xa, ya, n)); ph.draw(t, 1);
  const lp = c.clone().addScaledVector(n, 0.3);
  w.pl[0].position.copy(lp); w.pl[0].color.set("#bfe0ff"); w.pl[0].intensity = 2.4 * k;
  halo.set(cam, lp.x, lp.y, lp.z, 1.5, 0.5 * k);
  return c;
};

/** shared body of scenes 1-3: Tito on his back in bed, dark circles, the phone in his hands */
const nightBed = (opts: { mouth?: (c: { t: number; mouth: number }) => number; expr?: "idle" | "exhausted" | "effort"; cInf: number; focus: XYZ; phoneOff: XYZ; bags?: number }): Builder => (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.night;
  const room = bedroom(g, k, { sky: "night", clock: "03:12" });
  const rig = w.rig("tito"), ph = new Phone(g), halo = new Halo(g, "#8fc8ff");
  const head = new THREE.Vector3(), cp = new THREE.Vector3(), hl = new THREE.Vector3(), hr = new THREE.Vector3(), mid = new THREE.Vector3();
  return {
    g, env, cInf: opts.cInf,
    focus: (o) => o.set(...opts.focus),
    update(c) {
      c.cam.getWorldPosition(cp);
      w.put(rig, g, lying({ expression: opts.expr ?? "exhausted", mouthOpen: opts.mouth ? opts.mouth(c) : 0, outfit: { eyeBags: opts.bags ?? 1 },
        over: { L: { ...LEGS.L, shFwd: 1.5, elbow: 1.0, shOut: 0.2 }, R: { ...LEGS.R, shFwd: 1.5, elbow: 1.0, shOut: 0.2 } } }) as never, c.cam, env.tint);
      w.wa(rig, "head", head);
      w.wa(rig, "handL", hl); w.wa(rig, "handR", hr); mid.addVectors(hl, hr).multiplyScalar(0.5).add(V(0.0, 0.12, 0.06));
      holdPhone(ph, head, cp, opts.phoneOff, w, halo, c.cam, c.t, 1, mid);
      if (room.clock) room.clock.set(c.t > 1.4 ? "03:13" : "03:12", "#ff4a3a", "#16181f", "#16181f", 14);
    },
  };
};

// ================================================================ 1 "You're in a perfect calorie deficit..." Tito on the bed, the phone lights his face. Wide, slow push-in.
export const S1: Builder = nightBed({ cInf: 8, focus: [-0.3, 1.2, -0.1], phoneOff: [0.45, 0.5, 0.35], expr: "idle" });
// ================================================================ 2 "but you sleep four hours" close on the face: heavy eye bags, a slow yawn
export const S2: Builder = nightBed({ cInf: 6, focus: [-1.0, 1.25, 0.2], phoneOff: [0.45, 0.5, 0.35], expr: "exhausted", mouth: (c) => 0.55 * Math.max(0, Math.sin(c.t * 2.6)) });
// ================================================================ 3 "playing on your phone?" the screen (falling blocks) and the lit face
export const S3: Builder = nightBed({ cInf: 6, focus: [-0.5, 1.5, 0.3], phoneOff: [0.45, 0.5, 0.35], expr: "exhausted" });

// ================================================================ 4 "— Congratulations!" dawn: warm sun, Tito jolts awake, sitting bolt upright on the mattress
export const S4: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.dawn;
  bedroom(g, k, { sky: "dawn" });
  const rig = w.rig("tito");
  return {
    g, env, cInf: 8,
    focus: (o) => o.set(-0.4, 1.5, -0.1),
    update(c) {
      const u = clamp01(c.t / 0.22), hop = 0.22 * Math.sin(Math.PI * clamp01(c.t / 0.45)), arms = 2.6 * easeOut(u);
      w.put(rig, g, { action: "idle", t: c.t, position: [-0.45, 0.86, -0.1], yaw: Math.PI / 2 - 0.45, expression: "shocked", mouthOpen: 0.9, blink: 0,
        over: { lift: hop, L: { thighFwd: 1.45, knee: 0.04, shFwd: arms, shOut: 0.5, elbow: 0.25 }, R: { thighFwd: 1.45, knee: 0.04, shFwd: arms, shOut: 0.5, elbow: 0.25 }, lean: -0.04 } } as never, c.cam, env.tint);
    },
  };
};

// ================================================================ 5 "You just invited two armed robbers" two robbers (TitoRig3D + black balaclava) leap out of the window with a bicep-shaped sack
export const S5: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.dawn;
  bedroom(g, k, { sky: "dawn" });
  const R = ROOM;
  k.box(30, 0.2, 14, R.winX, -0.1, R.wallZ - 7.2, "#7aa25a");                                 // the garden outside (top at y = 0)
  const r1 = w.rig("thief1"), r2 = w.rig("thief2"), sack = makeSack(g), dust = new Puffs(g, 8, "#d8d0c4");
  const hA = new THREE.Vector3(), hB = new THREE.Vector3();
  const OUT = { shFwd: 1.2, elbow: 0.85, shOut: 0.3 };
  const TRUN = 0.9, TJ = 1.2;
  return {
    g, env, cInf: 8,
    focus: (o) => o.set(3.3, 1.8, -2.4),
    update(c) {
      const sc = 1.0;
      [r1, r2].forEach((r, i) => {
        const T = Math.max(0, c.t - (i ? 0.05 : 0)), dx = i ? 0.62 : -0.62;
        let x: number, y = 0, z: number, act: "run" | "jump" = "run", tt = T;
        if (T < TRUN) { const u = easeIO(T / TRUN); x = lerp(1.9, 3.6, u) + dx; z = lerp(-0.2, -2.55, u); }
        else { const u = clamp01((T - TRUN) / TJ); x = 3.6 + dx; z = lerp(-2.55, -5.6, u); act = "jump"; tt = 0.34 + 0.62 * Math.min(1, u * 1.1); y = u < 0.38 ? 2.0 * (1 - ((u - 0.38) / 0.38) ** 2) : 2.0 * (1 - ((u - 0.38) / 0.62) ** 2) * (1 - 0.12 * u); y = Math.max(0, y); }
        w.put(r, g, { action: act, t: tt, speed: 1.3, position: [x, y, z], yaw: 1.6 + (i ? 0.1 : -0.1), scale: sc, expression: "smug", mouthOpen: 0,
          outfit: { balaclava: true, shirt: "#2a2a33" }, over: { lift: 0, L: OUT, R: OUT } } as never, c.cam, env.tint);
      });
      w.wa(r1, "handR", hA); w.wa(r2, "handL", hB);
      sack.position.set((hA.x + hB.x) / 2, (hA.y + hB.y) / 2 - 0.12, (hA.z + hB.z) / 2); sack.scale.setScalar(0.7); sack.rotation.set(0, 0.15, 0.1 * Math.sin(c.t * 7));
      for (let j = 0; j < 8; j++) { const age = clamp01((c.t - 0.2) / 0.7 + j * 0.03); dust.set(j, 2.3 + 0.2 * j + Math.cos(j) * 0.2, 0.08 + 0.2 * age, -0.6 - 0.25 * j, 0.1 + 0.3 * age, c.t < 1.0 ? 0.5 * (1 - age) : 0); }
    },
  };
};

// ================================================================ 6 "into your bedroom." Tito looks down: a giant pink pool float around his waist (the fat that stayed)
export const S6: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.dawn;
  bedroom(g, k, { sky: "dawn" });
  const rig = w.rig("tito");
  return {
    g, env, cInf: 7,
    focus: (o) => o.set(0.1, 1.15, 0.4),
    update(c) {
      const sq = 0.05 * Math.max(0, Math.sin(c.t * 9)) * Math.exp(-c.t * 1.2), k2 = easeOut(c.t / 0.5);
      w.put(rig, g, { action: "idle", t: c.t, position: [0.1, 0, 0.4], yaw: 0, expression: "shocked", mouthOpen: 0.6 + 0.3 * Math.sin(c.t * 8), blink: 0,
        outfit: { floatRing: "#ff5fa2" },
        over: { headPitch: 0.5 * k2, squash: -sq, L: { shFwd: 0.45, shOut: 0.55, elbow: 0.9 }, R: { shFwd: 0.45, shOut: 0.55, elbow: 0.9 } } } as never, c.cam, env.tint);
    },
  };
};
void hh; void smooth; void hot; void lam; void SPH;
