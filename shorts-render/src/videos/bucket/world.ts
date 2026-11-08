// One world for the whole short: grass field, the road between Bologna (x=-28) and Modena (x=+28), the hero plinth, walls + gates, leaning towers,
// the Bologna well, Modena's tower and plinth. The camera (story.ts) flies through it. The bucket is a 3D object posed by ccast.bucketAt().
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house } from "./build";
import { rep } from "./paint";
import { plaster, staves, grassTex, roadTex } from "./bpaint";
import { PRESETS, BG, blend } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, hh } from "./cards";
import { stage, SUN, bucketAt } from "./ccast";
import { camAt, ORG, SetName, lightAt, nightness, BOL, MOD, PLINTH, WELL, clamp01, smooth } from "./story";

const cyl = (r: number, h: number, seg = 14, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
type Mats = Record<string, THREE.Material>;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#cfe0ef", 45, 160);
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private flames: THREE.Mesh[] = []; private flameMat!: THREE.MeshBasicMaterial; private moon!: THREE.Mesh;
  private bucket = new THREE.Group();

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.6);
    this.sun.castShadow = false;                       // static look, no shadow swimming while the camera flies
    R.add(this.hemi, this.sun, this.sun.target);
    M.grass = lam("bGrassM", () => ({ map: rep(grassTex(), 14, 10) }));
    M.road = lam("bRoadM", () => ({ map: rep(roadTex(), 30, 1.2) }));
    M.wood = lam("bWood", () => ({ map: staves("bw2", "#9a6a3a", 6) }));
    M.beam = lam("bBeam", () => ({ map: staves("bb2", "#4a3022", 3) }));
    M.plaster = lam("bPlaster", () => ({ map: plaster("bp", "#e0d0a8") }));
    M.stone = lam("bStone", () => ({ color: "#b0aca0" }));
    M.brick = lam("bBrick", () => ({ color: "#c0603c" }));
    M.brickB = lam("bBrickB", () => ({ color: "#d07a4c" }));
    M.dark = lam("bDark", () => ({ color: "#1f1c22" }));
    M.roofR = lam("bRoofR", () => ({ color: "#a8402c" }));
    M.green = lam("bGreen", () => ({ color: "#3f8a3f" }));
    M.hill = lam("bHill", () => ({ color: "#6fa05a" }));
    M.hillF = lam("bHillF", () => ({ color: "#8ab070" }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#c8ccd4", shininess: 60 }), 0.15);
    M.rope = lam("bRope", () => ({ color: "#8a6a3a" }));
    this.flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 2.4, 1.0) });
    const b = new Batch();
    const bx = (mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => b.add(boxGeo(V(...a), V(...c), tile, bottom), mat);
    const put = (g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => { const m = at(x, y, z); b.add(g, mat, rot ? m.multiply(rot) : m); };
    const flame = (x: number, y: number, z: number, s = 0.14) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), this.flameMat); m.scale.y = 1.5; m.position.set(x, y, z); m.layers.set(NOINK); R.add(m); this.flames.push(m); };

    // ground + road
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(420, 320), M.grass); gr.rotation.x = -Math.PI / 2; gr.position.set(0, 0, -70); R.add(gr);
    bx(M.road, [-70, 0.01, -3], [70, 0.05, 3]);
    // hero plinth (the field between the cities) and Modena's plinth
    for (const [px, pz] of [[0, 0], [PLINTH[0], PLINTH[2]]]) { bx(M.stone, [px - 1.1, 0, pz - 1.1], [px + 1.1, 0.35, pz + 1.1]); bx(M.stone, [px - 0.85, 0.35, pz - 0.85], [px + 0.85, 0.7, pz + 0.85]); }
    // cities: wall with a gate gap, towers, houses, torches
    const city = (cx: number, brick: THREE.Material, towers: "lean" | "modena") => {
      for (const [x0, x1] of [[cx - 16, cx - 2], [cx + 2, cx + 16]]) { bx(brick, [x0, 0, -10.6], [x1, 5.2, -9.4], 3); bx(M.stone, [x0, 5.2, -10.8], [x1, 5.6, -9.2]); }
      bx(brick, [cx - 2, 3.6, -10.6], [cx + 2, 5.2, -9.4], 3);                       // gate lintel
      bx(M.dark, [cx - 2, 0, -10.2], [cx + 2, 3.6, -9.9]);                          // dark gate opening
      for (const x of [cx - 2.6, cx + 2.6]) { put(cyl(0.07, 2.6, 8), M.iron, x, 1.3, -9.0); flame(x, 2.8, -9.0, 0.16); }
      [[-12, -22, 0], [-6, -24, 1], [6, -24, 2], [12, -22, 3], [-14, -34, 4], [0, -36, 5], [14, -34, 0], [-4, -16, 1], [5, -17, 2]].forEach(([dx, z, si]) => house(b, cx + dx, z, 0, 6.5, 5, 4.2, si));
      if (towers === "lean") {
        const rot = new THREE.Matrix4().makeRotationZ(0.045); const g1 = new THREE.BoxGeometry(3.2, 24, 3.2); g1.translate(0, 12, 0); put(g1, M.brick, cx - 12, 0, -16, rot);
        const g2 = new THREE.BoxGeometry(3.4, 14, 3.4); g2.translate(0, 7, 0); put(g2, M.brickB, cx - 7, 0, -15, new THREE.Matrix4().makeRotationZ(-0.04));
        put(new THREE.ConeGeometry(2.6, 3.4, 4), M.roofR, cx - 12 - 1.1, 25.5, -16, new THREE.Matrix4().makeRotationY(Math.PI / 4));
      } else {
        const g = new THREE.BoxGeometry(4, 22, 4); g.translate(0, 11, 0); put(g, M.plaster, cx + 8, 0, -16);
        bx(M.stone, [cx + 8 - 2.3, 22, -16 - 2.3], [cx + 8 + 2.3, 22.6, -16 + 2.3]);
        put(new THREE.ConeGeometry(3.2, 7, 8), M.roofR, cx + 8, 26.1, -16);
        bx(M.dark, [cx + 8 - 0.7, 14, -14], [cx + 8 + 0.7, 16.5, -13.9]);          // belfry window
      }
    };
    city(BOL, M.brick, "lean"); city(MOD, M.plaster, "modena");
    // Bologna's well: stone ring, two posts, beam + little roof, rope
    put(cyl(0.95, 1.0, 18), M.stone, WELL[0], 0.5, WELL[2]);
    bx(M.beam, [WELL[0] - 1.2, 0, WELL[2] - 0.1], [WELL[0] - 1.05, 2.5, WELL[2] + 0.1]); bx(M.beam, [WELL[0] + 1.05, 0, WELL[2] - 0.1], [WELL[0] + 1.2, 2.5, WELL[2] + 0.1]);
    bx(M.beam, [WELL[0] - 1.35, 2.5, WELL[2] - 0.18], [WELL[0] + 1.35, 2.7, WELL[2] + 0.18]); bx(M.rope, [WELL[0] - 0.02, 1.2, WELL[2] - 0.02], [WELL[0] + 0.02, 2.5, WELL[2] + 0.02]);
    // hills, trees
    [[-70, -90, 40, 26], [-20, -110, 50, 36], [40, -100, 44, 30], [90, -90, 36, 24], [0, -80, 30, 18], [-110, -70, 34, 22], [120, -70, 32, 20]].forEach(([x, z, r, h], i) => put(cyl(r, h, 8, 2), i % 2 ? M.hill : M.hillF, x, h / 2, z));
    [[8, -7], [-8, -6], [0, -9], [-52, -12], [56, -14], [-18, -7], [16, -6], [20, -12], [-44, -7], [44, -7]].forEach(([x, z]) => { put(cyl(0.2, 1.4, 6), M.beam, x, 0.7, z); put(cyl(1.6, 4.2, 8, 0.1), M.green, x, 3.3, z); });
    b.build(R);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(4.5, 20, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 4.2, 3.8) })); this.moon.position.set(-10, 42, -85); this.moon.layers.set(NOINK); R.add(this.moon);
    // the bucket: tapered staves, two iron hoops, handle
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.27, 0.5, 18), lam("bBucket", () => ({ map: staves("bk", "#a8743a", 9) }))); body.position.y = 0.25;
    this.bucket.add(body);
    for (const [y, r] of [[0.1, 0.29], [0.4, 0.33]] as const) { const h = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.045, 18), M.iron); h.position.y = y; this.bucket.add(h); }
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.018, 6, 20, Math.PI), M.iron); handle.position.y = 0.5; this.bucket.add(handle);
    R.add(this.bucket);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / 30, lt = lightAt(t);
    const L = blend(PRESETS[lt.a], PRESETS[lt.b], lt.k), bgA = BG[lt.a], bgB = BG[lt.b];
    const c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 420; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const centre = V(c.look[0], 1.0, c.look[2]);
    this.sun.position.copy(centre).addScaledVector(SUN, 40); this.sun.target.position.copy(centre);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(0.05, 0.03, 0.0); TONE.uSat.value = 1.08;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const fogC = new THREE.Color(bgA.fog ?? "#fff").lerp(new THREE.Color(bgB.fog ?? "#fff"), lt.k);
    this.fog.color.copy(fogC); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog;
    scene.background = new THREE.Color(bgA.bg).lerp(new THREE.Color(bgB.bg), lt.k);

    const fk = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.3);
    this.flameMat.color.setRGB(3.6 * fk, 2.4 * fk, 1.0 * fk);
    this.flames.forEach((m, i) => { m.scale.set(1, 1.4 + 0.35 * Math.sin(t * 19 + i * 2.3), 1); });
    this.moon.visible = nightness(t) > 0.3; this.moon.position.set(c.look[0] * 0.3 - 10, 42, -85);
    const bk = bucketAt(t);
    this.bucket.visible = bk.visible; this.bucket.position.set(...bk.pos); this.bucket.scale.setScalar(bk.scale); this.bucket.rotation.set(bk.rot[0], bk.rot[1], bk.rot[2]);

    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(f, { pos: cam.position, right, sun: SUN });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0; const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.0 * sc2, p.z), 1.8 * sc2))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      a.mesh.scale.set(sc2 * (p.mirror ? -1 : 1), sc2, sc2);
      a.mesh.castShadow = false;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0; const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    void hh; void clamp01; void smooth; void ORG; void (0 as unknown as SetName);
    return focus;
  }
}
