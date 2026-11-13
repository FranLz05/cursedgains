// The press bench as real 3D boxes (cushion, legs, feet rails): they cast and receive real shadows and get the world's ink
// outline. Tito himself is a procedural card (titoHoodie.ts) lying on it; BENCH_SURFACE in titoHoodie.ts is its top (0.57 m).
import * as THREE from "three";
import { twoTone } from "../alejandro/shade";

export const CUSHION_TOP = 0.57;
const lam = (color: string) => twoTone(new THREE.MeshLambertMaterial({ color }));

export class BenchSet {
  readonly g = new THREE.Group();
  constructor(parent: THREE.Object3D) {
    const part = (w: number, h: number, d: number, x: number, y: number, z: number, c: string) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; this.g.add(m);
    };
    part(1.5, 0.12, 0.6, 0, CUSHION_TOP - 0.06, 0, "#2b3a55");
    for (const x of [-0.6, 0.6]) for (const z of [-0.2, 0.2]) part(0.06, CUSHION_TOP - 0.12, 0.06, x, (CUSHION_TOP - 0.12) / 2, z, "#8d949c");
    part(0.08, 0.05, 0.6, -0.6, 0.2, 0, "#8d949c"); part(0.08, 0.05, 0.6, 0.6, 0.2, 0, "#8d949c");
    this.g.visible = false;
    parent.add(this.g);
  }
  place(x: number, z: number) { this.g.position.set(x, 0, z); this.g.visible = true; }
  hide() { this.g.visible = false; }
}
