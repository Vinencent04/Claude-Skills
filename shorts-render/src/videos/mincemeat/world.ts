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
import { camAt, lightAt, OX, BX, SX, HX, GX, LX, CX, clamp01, smooth } from "./story";

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

    // ground (grass) + the seven sets
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(760, 300), M.grass); gr.rotation.x = -Math.PI / 2; gr.position.set(-110, 0, -40); R.add(gr);
    // ---- O: the office (x = 0): wooden floor, back wall with a big map board, desk, cabinets, blackout curtains ----
    bx(M.wood, [OX - 14, 0.01, -9], [OX + 14, 0.09, 12], 5);
    bx(M.plasterW, [OX - 14, 0, -12], [OX + 14, 8, -10.2]);
    bx(M.dark, [OX - 3.4, 2.4, -10.15], [OX + 3.4, 6.6, -10.05]); bx(M.beam, [OX - 3.6, 2.3, -10.2], [OX + 3.6, 2.6, -9.9]);
    for (const x of [-9, 9]) { bx(M.cabinet, [OX + x - 1.2, 0, -10.0], [OX + x + 1.2, 3.4, -8.8]); }
    bx(M.wood, [OX - 3.0, 0, -3.0], [OX + 3.0, 1.5, -0.4], 1); bx(M.beam, [OX - 3.1, 1.5, -3.1], [OX + 3.1, 1.7, -0.3]);
    // ---- B: the workshop (x = -40): pale walls, long table ----
    bx(M.floorD, [BX - 14, 0.01, -9], [BX + 14, 0.09, 12], 3);
    bx(M.paleW, [BX - 14, 0, -12], [BX + 14, 8, -10.2]);
    bx(M.tableM, [BX - 4.2, 0, -2.6], [BX + 4.2, 1.15, 0.2]); bx(M.beam, [BX - 4.3, 1.15, -2.7], [BX + 4.3, 1.3, 0.3]);
    for (const x of [-9, 9]) bx(M.cabinet, [BX + x - 1.2, 0, -10.0], [BX + x + 1.2, 3.4, -8.8]);
    // ---- S: night sea + the submarine HMS Seraph (x = -80) ----
    bx(M.seaN, [SX - 30, 0.0, -30], [SX + 30, 0.07, 22]);
    bx(M.subH, [SX - 7.5, 0.0, -2.8], [SX + 7.5, 1.5, 1.8]); bx(M.subH, [SX - 8.4, 0.0, -1.6], [SX - 7.5, 1.1, 0.6]); bx(M.subH, [SX + 7.5, 0.0, -1.6], [SX + 8.6, 1.0, 0.6]);
    bx(M.subD, [SX - 7.0, 1.5, -2.4], [SX + 7.0, 1.62, 1.4]);
    bx(M.subH, [SX - 1.4, 1.62, -1.6], [SX + 1.4, 3.6, 0.2]); bx(M.subD, [SX - 1.6, 3.6, -1.8], [SX + 1.6, 3.8, 0.4]); put(cyl(0.06, 2.0, 6), M.subD, SX + 0.4, 4.7, -0.6);
    // ---- H: the Spanish beach (x = -120): sand strip, sea behind, a fishing boat ----
    bx(M.sea, [HX - 30, 0.0, -30], [HX + 30, 0.07, -3.0]); bx(M.sand, [HX - 30, 0.0, -3.4], [HX + 30, 0.09, 14], 4);
    bx(M.hullB, [HX + 5.0, 0.0, -5.4], [HX + 9.4, 1.2, -3.6]); bx(M.beam, [HX + 6.8, 1.2, -4.7], [HX + 7.0, 4.6, -4.4]);
    // ---- G: the German headquarters (x = -160): dark floor, grey wall, a huge map table ----
    bx(M.floorD, [GX - 14, 0.01, -9], [GX + 14, 0.09, 12], 3);
    bx(M.greyW, [GX - 14, 0, -12], [GX + 14, 8, -10.2]);
    bx(M.wood, [GX - 4.2, 0, -3.0], [GX + 4.2, 1.2, 0.0], 1); bx(M.mapM, [GX - 4.0, 1.2, -2.8], [GX + 4.0, 1.28, -0.2]);
    // ---- L: the Sicilian beach (x = -200) ----
    bx(M.sea, [LX - 30, 0.0, -30], [LX + 30, 0.07, -4.0]); bx(M.sand, [LX - 30, 0.0, -4.4], [LX + 30, 0.09, 14], 4);
    // ---- C: the cemetery in Spain (x = -240): grass, a low wall, cypress trees ----
    bx(M.grassC, [CX - 14, 0.0, -9], [CX + 14, 0.08, 12]);
    bx(M.marble, [CX - 14, 0, -10], [CX + 14, 1.4, -9.5]);
    for (const x of [-9, -5, 5, 9]) { put(cyl(0.16, 1.4, 6), M.beam, CX + x, 0.7, -6.5); put(cyl(0.9, 7, 8, 0.05), M.cypress, CX + x, 4.9, -6.5); }
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
