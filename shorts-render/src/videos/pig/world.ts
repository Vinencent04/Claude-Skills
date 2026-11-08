// One island world for the whole short: grass island in the sea, farm + potato garden, American camp with cannons, British camp, dinner table, the Kaiser's stage,
// the pig's tombstone and five warships (3D, sailing in). The camera (story.ts) flies through it; characters/effects come from ccast.ts.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house } from "./build";
import { rep } from "./paint";
import { plaster, staves, grassTex, seaTex, sandTex, dirtRows, flagTexUS, flagTexUK } from "./bpaint";
import { PRESETS, BG, blend } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, hh } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, lightAt, FARM, USC, DIN, BRC, KZ, TOMB, T_SHIPS, T_FACED, glide, clamp01, smooth } from "./story";

const cyl = (r: number, h: number, seg = 14, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
type Mats = Record<string, THREE.Material>;
const SHIPX = [-10, -1, 8, 17, 26];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#cfe0ef", 45, 160);
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private flames: THREE.Mesh[] = []; private flameMat!: THREE.MeshBasicMaterial;
  private ships: THREE.Group[] = []; private flags: THREE.Mesh[] = [];

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.6);
    this.sun.castShadow = false;
    R.add(this.hemi, this.sun, this.sun.target);
    M.grass = lam("pGrassM", () => ({ map: rep(grassTex(), 16, 6) }));
    M.sand = lam("pSandM", () => ({ map: rep(sandTex(), 24, 2) }));
    M.sea = new THREE.MeshLambertMaterial({ map: rep(seaTex(), 60, 40) });
    M.dirt = lam("pDirtM", () => ({ map: rep(dirtRows(), 4, 3) }));
    M.wood = lam("pWood", () => ({ map: staves("pw", "#9a6a3a", 6) }));
    M.beam = lam("pBeam", () => ({ map: staves("pb", "#4a3022", 3) }));
    M.plaster = lam("pPlaster", () => ({ map: plaster("pp", "#e8dcb8") }));
    M.stone = lam("pStone", () => ({ color: "#b0aca0" }));
    M.dark = lam("pDark", () => ({ color: "#1f1c22" }));
    M.green = lam("pGreen", () => ({ color: "#3f8a3f" }));
    M.leaf = lam("pLeaf", () => ({ color: "#4fa04a" }));
    M.hill = lam("pHill", () => ({ color: "#6fa05a" }));
    M.hillF = lam("pHillF", () => ({ color: "#8ab070" }));
    M.tentUS = lam("pTentUS", () => ({ color: "#e8e2d0" }));
    M.tentUK = lam("pTentUK", () => ({ color: "#c8453a" }));
    M.cloth = lam("pCloth", () => ({ color: "#f4efe6" }));
    M.carpet = lam("pCarpet", () => ({ color: "#b02a30" }));
    M.hull = lam("pHull", () => ({ color: "#3a2a22" }));
    M.hullB = lam("pHullB", () => ({ color: "#e8dcc0" }));
    M.sail = lam("pSail", () => ({ color: "#f6f2e6" }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#c8ccd4", shininess: 60 }), 0.15);
    M.flagUS = new THREE.MeshLambertMaterial({ map: flagTexUS(), side: THREE.DoubleSide }); M.flagUK = new THREE.MeshLambertMaterial({ map: flagTexUK(), side: THREE.DoubleSide });
    this.flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 2.4, 1.0) });
    const b = new Batch();
    const bx = (mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => b.add(boxGeo(V(...a), V(...c), tile, bottom), mat);
    const put = (g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => { const m = at(x, y, z); b.add(g, mat, rot ? m.multiply(rot) : m); };
    const flame = (x: number, y: number, z: number, s = 0.14) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), this.flameMat); m.scale.y = 1.5; m.position.set(x, y, z); m.layers.set(NOINK); R.add(m); this.flames.push(m); };
    const flag = (x: number, z: number, mat: THREE.Material, h = 5) => { put(cyl(0.06, h, 6), M.beam, x, h / 2, z); const f = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), mat); f.position.set(x + 0.8, h - 0.6, z); R.add(f); this.flags.push(f); };

    // sea + island + beach
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 500), M.sea); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.25, -150); R.add(sea);
    bx(M.grass, [-85, -0.35, -13], [85, 0, 20], 0); bx(M.sand, [-85, -0.35, -18], [85, -0.02, -13], 0);
    for (let k = 0; k < 4; k++) bx(M.grass, [-85, -0.35, 20 + k * 14], [85, -0.1 - k * 0.1, 34 + k * 14]);
    // hills (south + far islands)
    [[-60, 40, 36, 20], [-10, 55, 44, 28], [50, 45, 40, 22], [100, 20, 30, 16], [-100, 20, 30, 16], [-30, -110, 40, 18], [40, -120, 50, 24], [110, -100, 34, 16]].forEach(([x, z, r, h], i) => put(cyl(r, h, 8, 2), i % 2 ? M.hill : M.hillF, x, h / 2 - 0.2, z));
    // farm: cabin, fence, potato garden
    house(b, FARM - 9, -8, 0, 6.5, 5, 4.2, 4);
    for (let r = 0; r < 5; r++) { bx(M.dirt, [FARM - 6, 0, -2 + r * 1.5 - 0.35], [FARM + 3, 0.2, -2 + r * 1.5 + 0.35]); for (let k = 0; k < 8; k++) put(cyl(0.2, 0.3, 5, 0.03), M.leaf, FARM - 5.4 + k * 1.1, 0.3, -2 + r * 1.5); }
    for (let k = 0; k <= 12; k++) { put(cyl(0.07, 1.0, 6), M.beam, FARM - 7 + k * 1.1, 0.5, 6.4); }
    bx(M.beam, [FARM - 7, 0.55, 6.35], [FARM + 6.2, 0.62, 6.45]); bx(M.beam, [FARM - 7, 0.85, 6.35], [FARM + 6.2, 0.92, 6.45]);
    for (const z of [-3.2, 6.4]) for (const x of [FARM - 7, FARM + 6.2]) put(cyl(0.09, 1.2, 6), M.beam, x, 0.6, z);
    // American camp: tents, cannons, flag
    for (let k = 0; k < 6; k++) put(cyl(2.0, 2.4, 4, 0.1), M.tentUS, USC - 10 + k * 4.4, 1.2, -1 + (k % 2) * 4, new THREE.Matrix4().makeRotationY(0.78));
    for (let k = 0; k < 6; k++) { const cx = USC - 9 + k * 3.6; put(cyl(0.26, 2.4, 10, 0.34), M.iron, cx, 0.95, -10.6, new THREE.Matrix4().makeRotationX(Math.PI / 2 - 0.08)); for (const dx of [-0.55, 0.55]) put(cyl(0.55, 0.14, 14), M.beam, cx + dx, 0.55, -10.0, new THREE.Matrix4().makeRotationZ(Math.PI / 2)); bx(M.beam, [cx - 0.4, 0.45, -10.9], [cx + 0.4, 0.95, -9.4]); }
    flag(USC - 11, -2, M.flagUS);
    // British camp
    for (let k = 0; k < 5; k++) put(cyl(2.0, 2.4, 4, 0.1), M.tentUK, BRC - 8 + k * 4.4, 1.2, -1 + (k % 2) * 4, new THREE.Matrix4().makeRotationY(0.78));
    flag(BRC + 12, -2, M.flagUK);
    // dinner table, benches, lanterns
    bx(M.cloth, [DIN - 4.2, 0.9, 0.9], [DIN + 4.2, 1.0, 2.3]); for (const x of [-3.6, 3.6]) bx(M.wood, [DIN + x - 0.12, 0, 1.0], [DIN + x + 0.12, 0.9, 2.2]);
    bx(M.wood, [DIN - 4.2, 0.4, -0.3], [DIN + 4.2, 0.5, 0.4]); bx(M.wood, [DIN - 4.2, 0.4, 2.8], [DIN + 4.2, 0.5, 3.5]);
    for (const x of [-5.2, 5.2]) { put(cyl(0.06, 2.6, 6), M.beam, DIN + x, 1.3, 1.6); flame(DIN + x, 2.8, 1.6, 0.2); }
    // Kaiser's stage: red carpet, podium, columns, backdrop
    bx(M.carpet, [KZ - 6, 0.02, -4], [KZ + 6, 0.08, 7]); bx(M.stone, [KZ - 1.2, 0, -3.6], [KZ + 1.2, 0.9, -2.4]); bx(M.plaster, [KZ - 9, 0, -9.2], [KZ + 9, 7, -8.8]);
    for (const x of [-7, -3.5, 3.5, 7]) { put(cyl(0.55, 6.4, 14), M.stone, KZ + x, 3.2, -8.0); bx(M.stone, [KZ + x - 0.8, 6.4, -8.8], [KZ + x + 0.8, 6.8, -7.2]); }
    for (const x of [-6, 6]) { put(cyl(0.06, 2.6, 8), M.iron, KZ + x, 1.3, 2); flame(KZ + x, 2.8, 2, 0.18); }
    // tombstone + a few trees
    bx(M.stone, [TOMB[0] - 1.3, 0, TOMB[2] - 0.5], [TOMB[0] + 1.3, 0.25, TOMB[2] + 0.5]);
    [[-70, -10], [-44, -11], [-20, -11], [0, -11], [30, -11], [52, -11], [-48, 15], [-12, 15], [24, 15], [60, 14], [-70, 14]].forEach(([x, z]) => { put(cyl(0.2, 1.4, 6), M.beam, x, 0.7, z); put(cyl(1.7, 4.4, 8, 0.1), M.green, x, 3.5, z); });
    b.build(R);
    // five warships (hull, masts, sails, flag): animated in update()
    for (let k = 0; k < 5; k++) {
      const s = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 18), M.hull); hull.position.y = 0.5; s.add(hull);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.04, 0.5, 17), M.hullB); stripe.position.y = 0.9; s.add(stripe);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5, 4), M.hull); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(0, 0.5, 11); s.add(bow);
      for (const z of [-5, 0, 5]) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 14, 6), M.beam); mast.position.set(0, 8.5, z); s.add(mast); for (const [y, w] of [[12, 4.2], [8.6, 5.2], [5.4, 5.6]] as const) { const sail = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, 0.12), M.sail); sail.position.set(0, y, z + 0.1); s.add(sail); } }
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), M.flagUK); fl.position.set(0.9, 15.8, 0); s.add(fl);
      s.position.set(SHIPX[k], 0, -90); s.rotation.y = Math.PI / 2 * 0 + (k % 2 ? 0.12 : -0.1); R.add(s); this.ships.push(s);
    }
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / 30, lt = lightAt(t);
    const L = blend(PRESETS[lt.a], PRESETS[lt.b], lt.k), bgA = BG[lt.a], bgB = BG[lt.b];
    const c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 520; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
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
    this.fog.color.copy(fogC); this.fog.near = L.fogNear * 1.6; this.fog.far = L.fogFar * 1.8; scene.fog = this.fog;
    scene.background = new THREE.Color(bgA.bg).lerp(new THREE.Color(bgB.bg), lt.k);

    const fk = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.3);
    this.flameMat.color.setRGB(3.6 * fk, 2.4 * fk, 1.0 * fk);
    this.flames.forEach((m, i) => { m.scale.set(1, 1.4 + 0.35 * Math.sin(t * 19 + i * 2.3), 1); });
    this.flags.forEach((fl, i) => { fl.rotation.y = 0.18 * Math.sin(t * 3 + i); fl.scale.x = 1 + 0.05 * Math.sin(t * 5 + i); });
    // warships sail in (T_SHIPS -> T_FACED), then bob on the swell
    this.ships.forEach((s, k) => { const u = glide(clamp01((t - T_SHIPS - 0.25 * k) / 3.6)); s.position.z = -90 + (-40 - 3 * (k % 2) + 90) * u; s.position.y = 0.05 * Math.sin(t * 1.6 + k) - 0.1; s.rotation.z = 0.025 * Math.sin(t * 1.3 + k * 2); s.rotation.x = 0.015 * Math.sin(t * 1.1 + k); s.visible = t > T_SHIPS - 0.2; });

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
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.lean ?? 0);
      const sq = p.sq ?? [1, 1];
      a.mesh.scale.set(sc2 * sq[0] * (p.mirror ? -1 : 1), sc2 * sq[1], sc2);
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
    void hh; void smooth; void T_FACED;
    return focus;
  }
}
