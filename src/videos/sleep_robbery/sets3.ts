// SLEEP ROBBERY, ACT 3 "Conclusión" (micro-scenes 14-16): 2.5D bar graph under the screen-space "60% MORE MUSCLE LOSS" title, Tito flings the phone out of the window, Tito sleeps in a nightcap.
import * as THREE from "three";
import { Kit, Puffs, Halo, hot, clamp01, easeOut, easeIO, lerp, lam, tileTex } from "./kit";
import { Builder, Env } from "./world";
import { Phone, bedroom, BED, repM, zzz } from "./props";
import { ENVS } from "./sets1";

const ENVG: Env = { lit: [0.55, 0.6, 0.85], shade: [0.1, 0.13, 0.24], lift: [0.02, 0.03, 0.07], bg: "#1A2238", fog: ["#1A2238", 14, 40], sun: [-3, 8, 6], sunCol: "#b8ccff", sunI: 1.2, hemi: 0.02, tint: [0.9, 0.92, 1.0], key: [1.1, 1.1, 1.3], amb: [0.25, 0.3, 0.5], rim: [0.6, 0.9, 1.4] };
type XYZ = [number, number, number];

// ================================================================ 14 "Science shows sleep deprivation can increase muscle loss by sixty percent..." 2.5D graph: 8H bar (green) vs 4H bar (red, taller, trembling)
export const S14: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVG;
  k.floor(70, repM("graphFloor", () => tileTex("sleep_graph", "#2a3250", "#222a44", "#171c30"), 14, 14));
  k.plane(70, 14, 0, 7, -4, lam("#1c2440"));
  const a = k.box(1.3, 1, 1.0, -1.1, 0.5, -0.6, "#22c55e"), b = k.box(1.3, 1, 1.0, 1.1, 0.5, -0.6, "#ef4444");
  const la = k.label("8H SLEEP", 1.5, 0.4, -1.1, 0.4, 0.0, "#101420", "#22c55e"), lb = k.label("4H SLEEP", 1.5, 0.4, 1.1, 0.4, 0.0, "#101420", "#ef4444");
  const hl = new Halo(g, "#ff4040");
  return {
    g, env, cInf: 9,
    focus: (o) => o.set(0, 1.4, 0),
    update(c) {
      const ga = easeOut(c.t / 0.8), gb = easeOut((c.t - 0.5) / 1.1), ha = 1.2 * ga + 0.01, hb = (1.2 + 1.2 * 0.6 * 1.3) * gb + 0.01, tr = c.t > 1.6 ? 0.025 * Math.sin(c.t * 70) : 0;
      a.scale.set(1.3, ha, 1.0); a.position.y = ha / 2; b.scale.set(1.3, hb, 1.0); b.position.set(1.1 + tr, hb / 2, -0.6);
      la.position.y = ha + 0.35; lb.position.set(1.1 + tr, hb + 0.35, 0.0);
      w.pl[0].position.set(1.1, hb + 0.6, 0.9); w.pl[0].color.set("#ff4a4a"); w.pl[0].intensity = 1.6 * clamp01(gb);
      hl.set(c.cam, 1.1, hb * 0.6, 0.2, 3.2, 0.3 * clamp01(gb));
    },
  };
};

// ================================================================ 15 "So put the phone down," Tito winds up and hurls the phone out of the window; the room (and the glow) goes dark
export const S15: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.night;
  bedroom(g, k, { sky: "night", clock: "03:14" });
  const rig = w.rig("tito"), ph = new Phone(g), halo = new Halo(g, "#8fc8ff");
  const hp = new THREE.Vector3(), P = new THREE.Vector3(), cp = new THREE.Vector3();
  const T0 = 0.95, REL = new THREE.Vector3(2.0, 1.55, 0.2), WIN = new THREE.Vector3(3.6, 2.3, -3.1), FAR = new THREE.Vector3(3.9, 1.0, -8.5);
  return {
    g, env, cInf: 8,
    focus: (o) => o.set(2.0, 1.6, -0.6),
    update(c) {
      const th = clamp01((c.t - 0.35) / (T0 - 0.35)), thrown = c.t > T0;
      const ang = thrown ? 2.3 : lerp(-0.5, 2.3, easeIO(th));
      w.put(rig, g, { action: "idle", t: c.t, position: [1.2, 0, 0.2], yaw: Math.PI / 2 - 0.3, expression: thrown ? "smug" : "effort", mouthOpen: 0, outfit: { eyeBags: 1 },
        over: { R: { shFwd: ang, elbow: thrown ? 0.2 : lerp(1.6, 0.3, th), shOut: 0.2 }, L: { shFwd: 0.3, shOut: 0.3, elbow: 0.5 }, lean: thrown ? -0.1 : 0.12 * th } } as never, c.cam, env.tint);
      c.cam.getWorldPosition(cp);
      if (!thrown) w.wa(rig, "handR", P).y += 0.12;
      else { const u = clamp01((c.t - T0) / 0.55), u2 = clamp01((c.t - T0 - 0.55) / 0.6); if (u < 1) P.lerpVectors(REL, WIN, easeOut(u)).y += 0.5 * 4 * u * (1 - u); else P.lerpVectors(WIN, FAR, u2 * u2); }
      ph.g.position.copy(P); ph.g.lookAt(cp.x, cp.y, cp.z); ph.g.rotateZ(c.t * 9); ph.draw(c.t, 1);
      const lp = P.clone().addScaledVector(new THREE.Vector3().subVectors(cp, P).normalize(), 0.3);
      w.pl[0].position.copy(lp); w.pl[0].color.set("#bfe0ff"); w.pl[0].intensity = 2.4;
      halo.set(c.cam, lp.x, lp.y, lp.z, thrown ? 1.5 : 1.3, 0.5);
      void hp;
    },
  };
};

// ================================================================ 16 "or keep paying the sleep tax with your gains." Tito sleeps on his back in a classic nightcap; moonlight, floating Z's, slow pull-back
export const S16: Builder = (w) => {
  const g = new THREE.Group(), k = new Kit(g), env = ENVS.night;
  bedroom(g, k, { sky: "night", clock: "07:00" });
  const rig = w.rig("tito"), halo = new Halo(g, "#9fc4ff"), head = new THREE.Vector3();
  const zs = zzz(g, 3);
  return {
    g, env, cInf: 8,
    focus: (o) => o.set(-0.4, 1.2, -0.2),
    update(c) {
      const br = 0.012 * Math.sin(c.t * 2.2);
      w.put(rig, g, { action: "fall", t: 2.2, position: [BED.x, BED.y, BED.z], yaw: Math.PI / 2 - 0.5, expression: "idle", blink: 1, mouthOpen: 0, outfit: { nightcap: true },
        over: { squash: br, L: { thighFwd: 0, knee: 0.08, thighOut: 0.05, shFwd: 0.25, elbow: 0.5, shOut: 0.15 }, R: { thighFwd: 0.03, knee: 0.12, thighOut: 0.06, shFwd: 0.25, elbow: 0.5, shOut: 0.15 } } } as never, c.cam, env.tint);
      w.wa(rig, "head", head);
      w.pl[0].position.set(3.2, 2.9, -2.3); w.pl[0].color.set("#9fc4ff"); w.pl[0].intensity = 1.6;
      halo.set(c.cam, 3.6, 2.4, -3.0, 3.6, 0.22);
      zs.forEach((m, i) => { const age = (c.t * 0.45 + i / 3) % 1; m.position.set(head.x - 0.1 + 0.35 * age + 0.1 * i, head.y + 0.5 + 1.4 * age, head.z + 0.2); m.scale.setScalar(0.5 + 0.8 * age); (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * age); });
    },
  };
};
void hot; void Puffs; void lerp as unknown as XYZ;
