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
import { camAt, lightAt, HX, OX, FX, LX, clamp01, smooth } from "./story";

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

    // ground (grass) + the four sets
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(620, 300), M.grass); gr.rotation.x = -Math.PI / 2; gr.position.set(-60, 0, -40); R.add(gr);
    // ---- H: Epimetheus' yard: white house with columns, olive trees, low wall ----
    bx(M.cobble, [HX - 14, 0.01, -9], [HX + 14, 0.07, 12], 4);
    bx(M.marble, [HX - 9, 0, -12.2], [HX + 9, 5.4, -10.2]); bx(M.roofT, [HX - 9.6, 5.4, -12.8], [HX + 9.6, 6.2, -9.4]);
    bx(M.doorB, [HX - 1.1, 0, -10.15], [HX + 1.1, 3.4, -10.05]);
    bx(M.marble, [HX - 9.6, 0, -9.8], [HX + 9.6, 0.4, -8.6]);
    for (const x of [-7, -4, 4, 7]) put(cyl(0.38, 5.4, 14), M.marble, HX + x, 2.7, -9.2);
    bx(M.marble, [HX - 9.6, 5.2, -9.8], [HX + 9.6, 5.5, -8.6]);
    for (const x of [-12, 12]) { put(cyl(0.2, 2.6, 6), M.beam, HX + x, 1.3, -4); put(cyl(1.7, 3.6, 8, 0.2), M.olive, HX + x, 4.2, -4); }
    bx(M.marble, [HX - 14, 0, 3.4], [HX - 9, 0.7, 3.9]); bx(M.marble, [HX + 9, 0, 3.4], [HX + 14, 0.7, 3.9]);
    // ---- O: Olympus: marble terrace in the clouds, columns, Zeus' throne, a fire bowl ----
    bx(M.cloud, [OX - 16, 0.0, -10], [OX + 16, 0.07, 10]);
    for (let k = 0; k < 14; k++) { const x = OX - 17 + k * 2.6, z = 10.5 - 20.5 * (k % 2); const m = new THREE.Mesh(new THREE.SphereGeometry(1.6 + 0.3 * (k % 3), 12, 10), M.cloud); m.scale.set(1.5, 0.7, 1); m.position.set(x, 0.1, z); R.add(m); }
    bx(M.marble, [OX - 3, 0.07, -4.4], [OX + 3, 0.9, -1.6]); bx(M.gold, [OX - 2.6, 0.9, -4.0], [OX + 2.6, 1.15, -2.0]); bx(M.marble, [OX - 1.0, 1.15, -4.3], [OX + 1.0, 4.4, -3.9]); bx(M.gold, [OX - 1.2, 4.4, -4.4], [OX + 1.2, 4.7, -3.8]);
    for (const x of [-11, -7, 7, 11]) { put(cyl(0.55, 9, 14), M.marble, OX + x, 4.5, -9.0); bx(M.gold, [OX + x - 0.8, 9, -9.8], [OX + x + 0.8, 9.4, -8.2]); }
    bx(M.gold, [OX - 12, 9.2, -9.9], [OX + 12, 10.0, -8.1]);
    put(cyl(0.9, 0.9, 12, 0.5), M.gold, OX - 7, 0.5, 2.5);
    // ---- F: Hephaestus' forge: dark stone floor, back wall with furnace, anvil, table ----
    bx(M.floorD, [FX - 13, 0.01, -9], [FX + 13, 0.08, 12], 3);
    bx(M.stoneD, [FX - 13, 0, -12], [FX + 13, 7, -10]); bx(M.dark, [FX - 3.4, 0, -10.05], [FX + 3.4, 3.8, -9.9]); bx(M.furn, [FX - 2.6, 0.2, -10.0], [FX + 2.6, 2.8, -9.85]);
    bx(M.beam, [FX - 13, 6.8, -10.4], [FX + 13, 7.2, -9.4]);
    bx(M.iron, [FX - 1.1, 0, -1.0], [FX + 1.1, 1.0, 0.5]); bx(M.iron, [FX - 1.6, 1.0, -1.2], [FX + 1.6, 1.4, 0.7]);
    bx(M.wood, [FX + 3.2, 0, -1.2], [FX + 6.2, 1.1, 0.8], 1);
    put(cyl(0.5, 0.9, 12), M.iron, FX - 6, 0.45, 1.0); put(cyl(0.12, 6, 8), M.iron, FX - 8, 3, -8);
    // ---- L: Erasmus' study: wooden floor, bookshelves, window, desk ----
    bx(M.wood, [LX - 13, 0.01, -9], [LX + 13, 0.09, 12], 5);
    bx(M.plasterW, [LX - 13, 0, -12], [LX + 13, 8, -10.2]);
    for (const x of [-9, -5.5, 5.5, 9]) { bx(M.shelf, [LX + x - 1.4, 0, -10.2], [LX + x + 1.4, 6.6, -9.5]); for (let r = 0; r < 4; r++) bx(M.books, [LX + x - 1.25, 0.5 + r * 1.55, -9.5], [LX + x + 1.25, 1.5 + r * 1.55, -9.3]); }
    bx(M.dark, [LX - 1.9, 2.4, -10.15], [LX + 1.9, 6.4, -10.05]); bx(M.beam, [LX - 2.1, 2.3, -10.2], [LX + 2.1, 2.6, -9.9]);
    bx(M.wood, [LX - 2.6, 0, -2.4], [LX + 2.6, 1.7, -0.6], 1); bx(M.beam, [LX - 2.7, 1.7, -2.5], [LX + 2.7, 1.9, -0.5]);
    [[-90, -80, 40, 24], [-30, -90, 46, 30], [-150, -75, 36, 22], [30, -92, 44, 28], [-185, -60, 30, 18]].forEach(([x, z, r, h], i) => put(cyl(r, h, 8, 2), i % 2 ? M.hill : M.hillF, x, h / 2 - 0.2, z));
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
