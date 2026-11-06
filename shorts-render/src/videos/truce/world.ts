// Two painted sets in one scene: front (the British and German trenches with no man's land between them, snow, barbed wire, Christmas trees) and hq (the general's map room).
// update(f, camera, scene) poses everything for frame f: lights, candle flicker, the trees that light up, ladders, crosses, goals, and the cast cards from ccast.ts.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "./build";
import { rep, planksHD } from "./paint";
import { plaster, staves, snowTex, sandbagTex, mudTex } from "./bpaint";
import { PRESETS, BG } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, hh } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, shotAt, ORG, toW, SetName, lightOverride, T_TREES, clamp01, smooth } from "./story";

const cyl = (r: number, h: number, seg = 14, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
type Mats = Record<string, THREE.Material>;
const RADIUS: Record<SetName, number> = { front: 30, hq: 12 };
export const BRIT_Z = 10.2, GER_Z = -10.2;      // trench parapets (z of the sandbag wall centre)
export const TREE_X = [-9, -4.5, 0, 4.5, 9];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#cfe0ef", 45, 160);
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private flames: THREE.Mesh[] = []; private flameMat!: THREE.MeshBasicMaterial; private trees!: THREE.Group; private candles: THREE.Mesh[] = [];
  private ladders!: THREE.Group; private crosses!: THREE.Group; private goals!: THREE.Group; private moon!: THREE.Mesh;

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.8);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(3072, 3072);
    R.add(this.hemi, this.sun, this.sun.target);

    M.snow = lam("tSnowM", () => ({ map: rep(snowTex(), 26, 18) }));
    M.sand = lam("tSandM", () => ({ map: rep(sandbagTex(), 22, 1) }));
    M.mud = lam("tMudM", () => ({ map: rep(mudTex(), 30, 3) }));
    M.planks = lam("planksHD", () => ({ map: planksHD() }));
    M.wood = lam("tWood", () => ({ map: staves("tw", "#8a5a30", 4) }));
    M.beam = lam("tBeam", () => ({ map: staves("tb", "#4a3022", 3) }));
    M.panel = lam("tPanel", () => ({ map: staves("tp", "#7a4c2a", 10) }));
    M.plaster = lam("tPlaster", () => ({ map: plaster("tp", "#d8c8a0") }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#c8ccd4", shininess: 60 }), 0.15);
    M.dark = lam("tDark", () => ({ color: "#1f1c22" }));
    M.crater = lam("tCrater", () => ({ color: "#4a4050" }));
    M.green = lam("tGreen", () => ({ color: "#2f7a3a" }));
    M.map = lam("tMap", () => ({ color: "#d8c8a0" }));
    M.glass = new THREE.MeshBasicMaterial({ color: "#2a3a7a" });
    this.flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 2.4, 1.0) });
    M.moonM = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 4.2, 3.8) });

    const b = new Batch();
    const bx = (set: SetName, mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => {
      const o = ORG[set]; b.add(boxGeo(V(a[0] + o[0], a[1] + o[1], a[2] + o[2]), V(c[0] + o[0], c[1] + o[1], c[2] + o[2]), tile, bottom), mat);
    };
    const put = (set: SetName, g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => {
      const o = ORG[set], m = at(x + o[0], y + o[1], z + o[2]); b.add(g, mat, rot ? m.multiply(rot) : m);
    };
    const flame = (set: SetName, x: number, y: number, z: number, s = 0.12) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), this.flameMat); m.scale.y = 1.5; m.position.set(ORG[set][0] + x, y, ORG[set][2] + z); m.layers.set(NOINK); R.add(m); this.flames.push(m); return m; };

    // =============== FRONT ===============
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(220, 150), M.snow); gr.rotation.x = -Math.PI / 2; gr.position.set(ORG.front[0], 0, ORG.front[2]); gr.receiveShadow = true; R.add(gr);
    for (const z of [BRIT_Z, GER_Z]) {
      const s = Math.sign(z);
      bx("front", M.sand, [-70, 0, z - 0.9], [70, z === GER_Z ? 1.4 : 1.2, z + 0.9], 2);
      bx("front", M.mud, [-70, -0.05, z + s * 0.9], [70, 0.04, z + s * 4.5], 3);
      bx("front", M.planks, [-70, 0.02, z - s * 1.8], [70, 0.08, z - s * 0.9], 2);
    }
    for (const z of [-5, 5]) { for (let x = -48; x <= 48; x += 4) put("front", cyl(0.05, 1.3, 6), M.iron, x, 0.65, z); for (const h of [0.45, 0.95]) bx("front", M.iron, [-48, h, z - 0.015], [48, h + 0.03, z + 0.015]); }
    for (const [x, z, r] of [[-12, -1, 2.0], [7, 2, 2.4], [14, -3, 1.6], [-5, 3.5, 1.4], [20, 1, 2.0]] as const) { put("front", cyl(r + 0.5, 0.04, 20), M.mud, x, 0.02, z); put("front", cyl(r, 0.06, 20), M.crater, x, 0.04, z); }
    for (const [x, z, s] of [[-26, 0, 1.3], [24, -4, 1.1], [-34, 5, 1.0], [32, 4, 1.2]] as const) { put("front", cyl(0.25, 4.2 * s, 7), M.beam, x, 2.1 * s, z); for (let k = 0; k < 4; k++) put("front", cyl(0.06, 2.0 * s, 5), M.beam, x + (k - 1.5) * 0.5 * s, 3.4 * s + 0.4, z, new THREE.Matrix4().makeRotationZ((k - 1.5) * 0.55)); }
    b.build(R);
    this.trees = new THREE.Group();
    TREE_X.forEach((x, i) => { const tr = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 8), M.green); tr.position.set(ORG.front[0] + x, 1.4 + 0.6, ORG.front[2] + GER_Z + 0.35); tr.castShadow = true; this.trees.add(tr); for (let k = 0; k < 4; k++) { const c = flame("front", x + (k - 1.5) * 0.18, 1.7 + 0.2 * (k % 2) + 0.3 * (k % 3) / 2 + 0.2, GER_Z + 0.65, 0.07); c.visible = false; this.candles.push(c); } });
    this.trees.visible = false; R.add(this.trees);
    this.ladders = new THREE.Group();
    for (const z of [BRIT_Z, GER_Z]) for (const x of [-4, 3]) { const sgn = Math.sign(z); for (const dx of [-0.3, 0.3]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.4, 0.07), M.wood); r.position.set(ORG.front[0] + x + dx, 1.1, ORG.front[2] + z - sgn * 1.1); r.rotation.x = -sgn * 0.4; this.ladders.add(r); } for (let k = 0; k < 5; k++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.06), M.wood); rung.position.set(ORG.front[0] + x, 0.3 + 0.45 * k, ORG.front[2] + z - sgn * (0.9 + 0.2 * k)); this.ladders.add(rung); } }
    this.ladders.visible = false; R.add(this.ladders);
    this.crosses = new THREE.Group();
    for (let i = 0; i < 7; i++) { const x = -6 + 2 * i, z = -0.5 + 0.4 * ((i * 5) % 3); const mound = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 1.8), M.mud); mound.position.set(ORG.front[0] + x, 0.09, ORG.front[2] + z); this.crosses.add(mound); const v = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), M.wood); v.position.set(ORG.front[0] + x, 0.78, ORG.front[2] + z - 0.9); const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), M.wood); h.position.set(ORG.front[0] + x, 1.0, ORG.front[2] + z - 0.9); this.crosses.add(v, h); }
    this.crosses.visible = false; R.add(this.crosses);
    this.goals = new THREE.Group();
    for (const x of [-9, 9]) for (const dz of [-1.4, 1.4]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), M.wood); p.position.set(ORG.front[0] + x, 0.75, ORG.front[2] + dz); this.goals.add(p); }
    this.goals.visible = false; R.add(this.goals);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(4.2, 20, 16), M.moonM); this.moon.position.set(ORG.front[0] - 20, 36, ORG.front[2] - 78); this.moon.layers.set(NOINK); R.add(this.moon);

    // =============== HQ: the general's map room ===============
    const b2 = new Batch();
    const hx = (mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => { const o = ORG.hq; b2.add(boxGeo(V(a[0] + o[0], a[1], a[2] + o[2]), V(c[0] + o[0], c[1], c[2] + o[2]), tile, bottom), mat); };
    hx(M.planks, [-9, -0.2, -11], [9, 0, 5], 3);
    hx(M.panel, [-9, 0, -11.2], [9, 7, -11]); hx(M.panel, [-9.2, 0, -11], [-9, 7, 5]); hx(M.panel, [9, 0, -11], [9.2, 7, 5]);
    hx(M.beam, [-9, 7, -11.2], [9, 7.3, 5.2], 2, true);
    hx(M.glass, [-2.5, 2.4, -10.95], [2.5, 5.8, -10.9]); hx(M.beam, [-0.05, 2.4, -10.96], [0.05, 5.8, -10.88]); hx(M.beam, [-2.5, 4.1, -10.96], [2.5, 4.2, -10.88]);
    hx(M.wood, [-3.0, 0, -6.6], [3.0, 1.0, -4.0], 2); hx(M.map, [-2.8, 1.0, -6.4], [2.8, 1.04, -4.2]);
    hx(M.beam, [-3.2, 0, -7.6], [3.2, 2.0, -7.3]);
    for (const x of [-6, 6]) { put("hq", cyl(0.06, 2.6, 8), M.iron, x, 1.3, -8); flame("hq", x, 2.8, -8, 0.16); }
    b2.build(R);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const sh = shotAt(f), ln = lightOverride(f, sh.id, sh.a) ?? sh.light, L = PRESETS[ln], t = f / 30, id = sh.id;
    const c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 340; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const centre = V(...toW(sh.set, [sh.set === "front" ? c.look[0] - ORG.front[0] : 0, 1.0, sh.set === "front" ? c.look[2] : -5]));
    this.sun.position.copy(centre).addScaledVector(SUN, 40); this.sun.target.position.copy(centre);
    const Rr = RADIUS[sh.set], sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 4; sc.far = 120; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 6);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(0.05, 0.03, 0.0); TONE.uSat.value = 1.08;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const bg = BG[ln];
    if (bg.fog) { this.fog.color.set(bg.fog); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog; } else scene.fog = null;
    scene.background = new THREE.Color(bg.bg);

    const fk = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.3);
    this.flameMat.color.setRGB(3.6 * fk, 2.4 * fk, 1.0 * fk);
    this.flames.forEach((m, i) => { m.scale.set(1, 1.4 + 0.35 * Math.sin(t * 19 + i * 2.3), 1); });
    const treesOn = id >= 3 && id <= 5 || id === 14 && false;
    this.trees.visible = sh.set === "front" && (id >= 3 && id <= 9 || id === 14);
    this.candles.forEach((cm, i) => { cm.visible = sh.set === "front" && (id >= 3 && id <= 9 || id === 14) && (id > 3 || t > T_TREES + 0.12 * i); });
    void treesOn;
    this.ladders.visible = id === 6; this.crosses.visible = id === 8; this.goals.visible = id === 9;
    this.moon.visible = sh.set === "front" && (ln === "night");

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
      a.mesh.castShadow = L.actorShadow;
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
    void hh; void clamp01; void smooth;
    return focus;
  }
}
