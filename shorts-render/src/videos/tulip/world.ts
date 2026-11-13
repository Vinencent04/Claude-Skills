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
import { camAt, lightAt, AX, BX, DX, EX, FX, GX, clamp01, smooth } from "./story";

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
    M.canal = lam("tCanal", () => ({ color: "#4a8ac0" })); M.stallR = lam("tStall", () => ({ color: "#c8352a" })); M.lawn = lam("tLawn", () => ({ color: "#7ab85a" })); M.domeT = lam("tDome", () => ({ color: "#3a8aa8" }));
    M.beds = lam("tBeds", () => ({ color: "#6a4a2a" })); M.tavW = lam("tTav", () => ({ map: plaster("ttw", "#8a6a4a") })); M.barrel = lam("tBarrel", () => ({ map: staves("tbr", "#7a4a2a", 3) }));
    M.hallW = lam("tHall", () => ({ map: plaster("thw", "#e8d8b0") })); M.banO = lam("tBanO", () => ({ color: "#e8721c" })); M.hallW2 = lam("tHall2", () => ({ map: plaster("thw2", "#ddd8cc") }));
    M.cabinet = lam("mCab", () => ({ color: "#5a6a58" })); M.paleW = lam("mPale", () => ({ map: plaster("mpw", "#cfe0d4") })); M.greyW = lam("mGrey", () => ({ map: plaster("mgw", "#8a8f96") })); M.tableM = lam("mTable", () => ({ color: "#d8d8d0" }));
    M.seaN = lam("mSeaN", () => ({ color: "#1f3a78" })); M.subH = lam("mSubH", () => ({ color: "#3a4048" })); M.subD = lam("mSubD", () => ({ color: "#22262c" })); M.hullB = lam("mHullB", () => ({ map: staves("mhb", "#7a4a2a", 4) }));
    M.mapM = lam("mMap", () => ({ color: "#e8d8a8" })); M.grassC = lam("mGrassC", () => ({ color: "#5a9a4a" })); M.cypress = lam("mCyp", () => ({ color: "#2a5a3a" }));
    M.marble = lam("pMarble", () => ({ color: "#f2ece0" })); M.roofT = lam("pRoofT", () => ({ color: "#c0603a" })); M.doorB = lam("pDoor", () => ({ color: "#3a6aa8" })); M.olive = lam("pOlive", () => ({ color: "#7a9a5a" }));
    M.cloud = lam("pCloud", () => ({ color: "#fbfbff" })); M.floorD = lam("pFloorD", () => ({ map: stoneBlocks("pfd", "#6a625c") })); M.furn = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.7, 0.5) });
    M.plasterW = lam("pPlasterW", () => ({ map: plaster("pp", "#e6d8b4") })); M.shelf = lam("pShelf", () => ({ color: "#5a3a22" })); M.books = lam("pBooks", () => ({ color: "#a8483a" }));
    M.sea = lam("jSea", () => ({ color: "#3f86c8" })); M.seaD = lam("jSeaD", () => ({ color: "#2f6aa8" })); M.sand = lam("jSand", () => ({ color: "#d8c690" }));
    M.hull = lam("jHull", () => ({ map: staves("jh", "#6a4224", 4) })); M.hullD = lam("jHullD", () => ({ color: "#3a2416" }));
    M.sail = lam("jSail", () => ({ color: "#f2ecdc" })); M.floor = lam("jFloor", () => ({ map: stoneBlocks("jf", "#c8b89a") })); M.benchW = lam("jBench", () => ({ color: "#5a3a22" }));
    M.hill = lam("fHill", () => ({ color: "#6fa05a" }));
    M.hillF = lam("fHillF", () => ({ color: "#8ab070" }));
    M.banR = lam("fBanR", () => ({ color: "#c8352a" }));
    M.banW = lam("fBanW", () => ({ color: "#f4efe6" }));
    
    const b = new Batch();
    const bx = (mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => b.add(boxGeo(V(...a), V(...c), tile, bottom), mat);
    const put = (g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => { const m = at(x, y, z); b.add(g, mat, rot ? m.multiply(rot) : m); };

    // ground (grass) + the six sets
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(760, 300), M.grass); gr.rotation.x = -Math.PI / 2; gr.position.set(-110, 0, -40); R.add(gr);
    // ---- A: the Dutch street (x = 0): cobbles, a canal, tall gabled houses, tulip beds ----
    bx(M.cobble, [AX - 15, 0.01, -4.6], [AX + 15, 0.07, 12], 4);
    bx(M.canal, [AX - 15, 0.0, -9.4], [AX + 15, 0.06, -4.7]);
    [[-11, -12, 4], [-4.2, -12, 0], [3.0, -12, 5], [10.2, -12, 2]].forEach(([dx, z, si]) => house(b, AX + dx, z, 0, 6.4, 5.5, 6.4, si));
    bx(M.wood, [AX + 9.4, 0, 1.6], [AX + 12.6, 1.4, 3.4], 1); bx(M.stallR, [AX + 9.2, 1.4, 1.5], [AX + 12.8, 1.6, 3.6]);
    for (const x of [-12, 12]) { put(cyl(0.2, 2.4, 6), M.beam, AX + x, 1.2, -2); put(cyl(1.5, 3.4, 8, 0.1), M.green, AX + x, 3.8, -2); }
    // ---- B: the Ottoman garden (x = -40): lawn, stone terrace, a dome pavilion, flower beds ----
    bx(M.lawn, [BX - 15, 0.01, -9], [BX + 15, 0.08, 12]);
    bx(M.marble, [BX - 8, 0.08, -9.6], [BX + 8, 1.0, -6.4]); put(cyl(3.0, 5.2, 16), M.marble, BX, 3.6, -8.2); put(new THREE.SphereGeometry(3.2, 16, 12), M.domeT, BX, 6.2, -8.2);
    for (const x of [-6.5, 6.5]) { put(cyl(0.7, 7.5, 14), M.marble, BX + x, 3.8, -8.4); put(new THREE.ConeGeometry(0.9, 1.6, 12), M.domeT, BX + x, 8.3, -8.4); }
    for (const [x, c] of [[-9, "#d8344a"], [-4.5, "#f0c030"], [4.5, "#f0a0c0"], [9, "#e86a20"]] as const) bx(M.beds, [BX + x - 1.6, 0.08, -3.0], [BX + x + 1.6, 0.22, -1.6]);
    // ---- D: the tavern (x = -120): dark planks, back wall, barrels, a long table ----
    bx(M.wood, [DX - 15, 0.01, -9], [DX + 15, 0.09, 12], 5);
    bx(M.tavW, [DX - 15, 0, -12], [DX + 15, 8, -10.2]);
    for (const x of [-10, -6, 6, 10]) put(cyl(0.9, 1.7, 12), M.barrel, DX + x, 0.85, -9.0);
    bx(M.dark, [DX - 2.0, 0, -10.15], [DX + 2.0, 3.4, -10.05]);
    bx(M.wood, [DX - 4.4, 0, -2.2], [DX + 4.4, 1.2, 0.2], 1); bx(M.beam, [DX - 4.5, 1.2, -2.3], [DX + 4.5, 1.35, 0.3]);
    // ---- E: the Haarlem auction hall (x = -160): wooden floor, a podium, banners ----
    bx(M.floorD, [EX - 15, 0.01, -9], [EX + 15, 0.09, 12], 3);
    bx(M.hallW, [EX - 15, 0, -12], [EX + 15, 9, -10.2]);
    bx(M.wood, [EX - 2.4, 0.09, -5.0], [EX + 2.4, 1.0, -2.4], 1); bx(M.wood, [EX - 2.0, 1.0, -4.8], [EX + 2.0, 1.2, -4.0], 1);
    for (const x of [-9, -5, 5, 9]) bx(M.banO, [EX + x - 0.7, 3.4, -10.1], [EX + x + 0.7, 7.4, -10.0]);
    // ---- F: the town hall (x = -200): marble floor, a long official desk ----
    bx(M.marble, [FX - 15, 0.01, -9], [FX + 15, 0.09, 12]);
    bx(M.hallW2, [FX - 15, 0, -12], [FX + 15, 9, -10.2]);
    bx(M.wood, [FX - 4.6, 0, -4.6], [FX + 4.6, 1.4, -2.2], 1); bx(M.beam, [FX - 4.7, 1.4, -4.7], [FX + 4.7, 1.55, -2.1]);
    for (const x of [-9, 9]) { put(cyl(0.5, 8.4, 14), M.marble, FX + x, 4.2, -9.2); }
    // ---- G: the library (x = -240) ----
    bx(M.wood, [GX - 15, 0.01, -9], [GX + 15, 0.09, 12], 5);
    bx(M.plasterW, [GX - 15, 0, -12], [GX + 15, 8, -10.2]);
    for (const x of [-9.5, -5.5, 5.5, 9.5]) { bx(M.shelf, [GX + x - 1.4, 0, -10.2], [GX + x + 1.4, 6.6, -9.5]); for (let r = 0; r < 4; r++) bx(M.books, [GX + x - 1.25, 0.5 + r * 1.55, -9.5], [GX + x + 1.25, 1.5 + r * 1.55, -9.3]); }
    bx(M.dark, [GX - 1.9, 2.4, -10.15], [GX + 1.9, 6.4, -10.05]);
    bx(M.wood, [GX - 2.6, 0, -2.4], [GX + 2.6, 1.7, -0.6], 1); bx(M.beam, [GX - 2.7, 1.7, -2.5], [GX + 2.7, 1.9, -0.5]);
    [[-90, -80, 40, 24], [-30, -90, 46, 30], [-150, -75, 36, 22], [30, -92, 44, 28], [-185, -60, 30, 18], [-260, -80, 40, 22]].forEach(([x, z, r, h], i) => put(cyl(r, h, 8, 2), i % 2 ? M.hill : M.hillF, x, h / 2 - 0.2, z));
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
