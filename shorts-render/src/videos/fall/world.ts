// One world for the whole short: Prague Castle courtyard (a 16 m tower wall with THE window, the manure pile below), a gunpowder barrel, the Bohemian square,
// the emperor's hall, the burning war zone. The camera (story.ts) flies between them; characters/effects come from ccast.ts.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house } from "./build";
import { rep } from "./paint";
import { plaster, staves, grassTex, stoneBlocks } from "./bpaint";
import { PRESETS, BG, blend } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, hh } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, lightAt, PILE, BARREL_X, BOH, HALL, WAR, T_BOOM, clamp01, smooth } from "./story";

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
  private flames: THREE.Mesh[] = []; private flameMat!: THREE.MeshBasicMaterial; private barrel!: THREE.Group; private warFlames: THREE.Mesh[] = [];

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.6);
    this.sun.castShadow = false;
    R.add(this.hemi, this.sun, this.sun.target);
    M.grass = lam("fGrassM", () => ({ map: rep(grassTex(), 20, 8) }));
    M.cobble = lam("fCobble", () => ({ map: rep(stoneBlocks("fc", "#a8a49a"), 10, 6) }));
    M.stone = lam("fStone", () => ({ map: rep(stoneBlocks("fs", "#b8b0a0"), 6, 6) }));
    M.stoneD = lam("fStoneD", () => ({ color: "#8a8478" }));
    M.wood = lam("fWood", () => ({ map: staves("fw", "#8a5a30", 5) }));
    M.beam = lam("fBeam", () => ({ map: staves("fb", "#4a3022", 3) }));
    M.plaster = lam("fPlaster", () => ({ map: plaster("fp", "#e8dcb8") }));
    M.dark = lam("fDark", () => ({ color: "#18151c" }));
    M.dung = lam("fDung", () => ({ color: "#6a4a2a" }));
    M.dungD = lam("fDungD", () => ({ color: "#4a301a" }));
    M.green = lam("fGreen", () => ({ color: "#3f8a3f" }));
    M.roof = lam("fRoof", () => ({ color: "#a8402c" }));
    M.roofB = lam("fRoofB", () => ({ color: "#3a5a8a" }));
    M.carpet = lam("fCarpet", () => ({ color: "#b02a30" }));
    M.gold = twoTone(new THREE.MeshPhongMaterial({ color: "#d9b04a", specular: "#fff0b0", shininess: 70 }), 0.15);
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#c8ccd4", shininess: 60 }), 0.15);
    M.burnt = lam("fBurnt", () => ({ color: "#3a3230" }));
    M.hill = lam("fHill", () => ({ color: "#6fa05a" }));
    M.hillF = lam("fHillF", () => ({ color: "#8ab070" }));
    M.banR = lam("fBanR", () => ({ color: "#c8352a" }));
    M.banW = lam("fBanW", () => ({ color: "#f4efe6" }));
    this.flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 2.4, 1.0) });
    const b = new Batch();
    const bx = (mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => b.add(boxGeo(V(...a), V(...c), tile, bottom), mat);
    const put = (g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => { const m = at(x, y, z); b.add(g, mat, rot ? m.multiply(rot) : m); };
    const flame = (x: number, y: number, z: number, s = 0.14, war = false) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), this.flameMat); m.scale.y = 1.5; m.position.set(x, y, z); m.layers.set(NOINK); R.add(m); (war ? this.warFlames : this.flames).push(m); return m; };

    // ground (one big plane) + cobbled courtyard + the square + the hall floor + burnt war ground
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(520, 300), M.grass); gr.rotation.x = -Math.PI / 2; gr.position.set(-10, 0, -40); R.add(gr);
    bx(M.cobble, [-16, 0.01, -9], [16, 0.07, 14], 4); bx(M.cobble, [BOH - 16, 0.01, -8], [BOH + 16, 0.07, 14], 4);
    bx(M.carpet, [HALL - 6, 0.03, -2], [HALL + 6, 0.09, 8]); bx(M.stoneD, [HALL - 12, 0.01, -10], [HALL + 12, 0.05, 12]);
    bx(M.burnt, [WAR - 24, 0.01, -14], [WAR + 24, 0.06, 14]);
    // ---- Prague Castle tower wall with the window at 13-16 m ----
    bx(M.stone, [-9, 0, -10.2], [9, 18, -9], 6);
    bx(M.stoneD, [-9.3, 17.4, -10.4], [9.3, 18.4, -8.8]);                                     // parapet
    for (let k = -4; k <= 4; k++) bx(M.stoneD, [k * 2 - 0.5, 18.4, -10.2], [k * 2 + 0.5, 19.2, -9.2]);   // battlements
    bx(M.dark, [-1.4, 13.0, -9.02], [1.4, 16.4, -8.98]);                                      // the window opening
    bx(M.beam, [-1.7, 12.7, -9.4], [1.7, 13.0, -8.0]);                                        // sill / ledge
    bx(M.beam, [-1.7, 16.4, -9.2], [1.7, 16.7, -8.9]); bx(M.beam, [-1.7, 13.0, -9.2], [-1.4, 16.4, -8.9]); bx(M.beam, [1.4, 13.0, -9.2], [1.7, 16.4, -8.9]);
    bx(M.beam, [-0.05, 13.0, -9.0], [0.05, 16.4, -8.9]); bx(M.beam, [-1.4, 14.8, -9.0], [1.4, 14.9, -8.9]);
    for (const sx of [-1, 1]) { put(cyl(2.0, 24, 14), M.stone, sx * 10.2, 12, -9.6); put(cyl(2.8, 5, 14, 0.2), M.roofB, sx * 10.2, 26.5, -9.6); }   // flanking towers
    // Bohemian banners (red/white) beside the window
    for (const sx of [-1, 1]) { bx(M.banR, [sx * 3.6 - 0.5, 8, -8.95], [sx * 3.6 + 0.5, 11.5, -8.9]); bx(M.banW, [sx * 3.6 - 0.5, 6.2, -8.95], [sx * 3.6 + 0.5, 8, -8.9]); }
    // ---- THE PILE: a heap of manure at the foot of the wall ----
    const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), M.dung); heap.scale.set(3.3, 1.2, 2.5); heap.position.set(PILE[0], 0.0, PILE[2]); R.add(heap);
    for (const [dx, dz, s] of [[-2.4, 1.2, 0.8], [2.2, 1.5, 0.7], [0.8, 2.3, 0.6], [-1.2, 2.3, 0.5], [3.0, 0.2, 0.55], [-3.0, 0.3, 0.6]] as const) { const l = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), M.dungD); l.scale.set(s * 1.3, s * 0.7, s); l.position.set(PILE[0] + dx, 0.1, PILE[2] + dz); R.add(l); }
    // torches by the wall + a few trees and houses
    for (const x of [-6, 6]) { put(cyl(0.07, 2.6, 8), M.iron, x, 1.3, -8.2); flame(x, 2.8, -8.2, 0.16); }
    // ---- powder barrel (the fuse leads here) ----
    this.barrel = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.8, 16), M.wood); bar.position.y = 0.9; this.barrel.add(bar);
    for (const y of [0.35, 1.45]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 0.94, 0.12, 16), M.iron); h.position.y = y; this.barrel.add(h); }
    this.barrel.position.set(BARREL_X, 0, 0); R.add(this.barrel);
    // ---- Bohemian square: church + houses + banners ----
    [[-9, -9, 4], [9, -10, 5], [-14, -8, 0], [15, -6, 2]].forEach(([dx, z, si]) => house(b, BOH + dx, z, 0, 7, 5.5, 4.4, si));
    bx(M.plaster, [BOH - 3.5, 0, -14], [BOH + 3.5, 9, -9.5], 4); put(new THREE.ConeGeometry(4.6, 6, 4), M.roofB, BOH, 12, -11.75, new THREE.Matrix4().makeRotationY(Math.PI / 4));
    bx(M.gold, [BOH - 0.12, 15.0, -11.9], [BOH + 0.12, 17.2, -11.7]); bx(M.gold, [BOH - 0.7, 16.2, -11.9], [BOH + 0.7, 16.5, -11.7]);
    // ---- emperor's hall: columns, backdrop, throne ----
    bx(M.plaster, [HALL - 10, 0, -9.2], [HALL + 10, 8, -8.8]);
    for (const x of [-8, -4, 4, 8]) { put(cyl(0.55, 7.2, 14), M.stone, HALL + x, 3.6, -8.0); bx(M.stoneD, [HALL + x - 0.8, 7.2, -8.8], [HALL + x + 0.8, 7.6, -7.2]); }
    bx(M.stoneD, [HALL - 1.6, 0, -6.6], [HALL + 1.6, 0.7, -4.2]); bx(M.carpet, [HALL - 1.2, 0.7, -6.4], [HALL + 1.2, 2.8, -6.2]); bx(M.gold, [HALL - 1.3, 2.8, -6.5], [HALL + 1.3, 3.1, -6.1]);
    for (const x of [-6, 6]) { put(cyl(0.06, 2.6, 8), M.iron, HALL + x, 1.3, 1); flame(HALL + x, 2.8, 1, 0.18); }
    // ---- war zone: burning houses, dead trees, cannons ----
    [[-15, -8, 0], [-6, -10, 1], [6, -9, 2], [15, -7, 3], [-20, 2, 4], [20, 3, 5]].forEach(([dx, z, si]) => { house(b, WAR + dx, z, 0, 6.5, 5, 4.2, si); flame(WAR + dx, 5.5, z, 0.6, true); flame(WAR + dx + 1.4, 4.8, z + 0.5, 0.45, true); });
    [[-10, 6], [8, 7], [-18, 8], [18, 9], [0, -12]].forEach(([dx, z]) => { put(cyl(0.2, 3.0, 6), M.dark, WAR + dx, 1.5, z); put(cyl(0.05, 1.6, 5), M.dark, WAR + dx + 0.5, 3.0, z, new THREE.Matrix4().makeRotationZ(0.7)); });
    for (const dx of [-12, -4, 4, 12]) { put(cyl(0.22, 1.8, 10, 0.3), M.iron, WAR + dx, 0.9, -4, new THREE.Matrix4().makeRotationX(Math.PI / 2 - 0.1)); for (const dz of [-0.45, 0.45]) put(cyl(0.5, 0.12, 14), M.beam, WAR + dx + dz, 0.5, -3.2, new THREE.Matrix4().makeRotationZ(Math.PI / 2)); }
    // hills + trees elsewhere
    [[-110, -80, 40, 24], [-50, -90, 46, 30], [10, -95, 44, 28], [70, -90, 40, 24], [120, -70, 34, 20], [-130, -60, 30, 18]].forEach(([x, z, r, h], i) => put(cyl(r, h, 8, 2), i % 2 ? M.hill : M.hillF, x, h / 2 - 0.2, z));
    [[24, -10], [30, 14], [56, 14], [-14, 15], [-46, 12], [-90, 12], [-52, -12], [28, -12]].forEach(([x, z]) => { put(cyl(0.2, 1.4, 6), M.beam, x, 0.7, z); put(cyl(1.7, 4.4, 8, 0.1), M.green, x, 3.5, z); });
    b.build(R);
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
    this.warFlames.forEach((m, i) => { m.visible = t > 53.0; m.scale.set(1, 1.4 + 0.5 * Math.sin(t * 15 + i * 2.3), 1); });
    this.barrel.visible = t < T_BOOM + 0.02 && t > 0;

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
    void hh; void smooth; void clamp01;
    return focus;
  }
}
