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
import { camAt, lightAt, LX, PX, WX, DY, FORT_X, clamp01, smooth } from "./story";

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

    // ground (grass) + sea slabs (ship deck, Cartagena bay) + cobbled London + hall floor
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(620, 300), M.grass); gr.rotation.x = -Math.PI / 2; gr.position.set(-60, 0, -40); R.add(gr);
    bx(M.sea, [-26, 0.0, -30], [26, 0.07, 22]);                                              // the sea around the ship
    bx(M.seaD, [-26, 0.07, -30], [26, 0.075, -14]);
    bx(M.cobble, [LX - 16, 0.01, -9], [LX + 16, 0.07, 14], 4);
    bx(M.floor, [PX - 14, 0.01, -9], [PX + 14, 0.09, 14], 3); bx(M.carpet, [PX - 1.6, 0.09, -8], [PX + 1.6, 0.12, 14]);
    bx(M.sea, [WX - 34, 0.0, -30], [WX + 4, 0.07, 22]); bx(M.sand, [WX - 36, 0.0, -30], [WX - 20, 0.1, 12]);
    // ---- the brig: hull, deck, far rail, mast + sail, crates ----
    bx(M.hull, [-8, 0.0, -5.2], [8, DY, 3.8]); bx(M.hullD, [-8.3, DY - 0.35, -5.4], [8.3, DY - 0.05, 4.0]);
    bx(M.wood, [-7.6, DY, -4.8], [7.6, DY + 0.05, 3.4], 5);
    bx(M.beam, [-8, DY, -5.2], [8, DY + 1.1, -5.0]); for (let k = -3; k <= 3; k++) bx(M.beam, [k * 2.3 - 0.07, DY, -5.2], [k * 2.3 + 0.07, DY + 1.1, -5.0]);
    put(cyl(0.22, 12, 10), M.beam, -7.4, DY + 6, -2.6); bx(M.beam, [-10.5, DY + 7.2, -2.7], [-4.2, DY + 7.45, -2.5]);
    bx(M.sail, [-10.2, DY + 3.2, -2.75], [-4.5, DY + 7.1, -2.65]);
    bx(M.hull, [-8, DY, -5.2], [-6.2, DY + 1.9, -1.2]); bx(M.beam, [-8, DY + 1.9, -5.3], [-6.1, DY + 2.05, -1.1]);
    bx(M.hullD, [6.3, DY, -5.0], [8.0, DY + 1.3, 3.5]);
    for (const [x, z] of [[4.6, -4.2], [5.2, -3.4]] as const) bx(M.wood, [x - 0.5, DY, z - 0.5], [x + 0.5, DY + 0.9, z + 0.5], 1);
    // ---- London street: houses, lamp posts ----
    [[-12, -9, 4], [-3, -10, 5], [6, -9.5, 0], [14, -9, 2], [-8, 12, 3]].forEach(([dx, z, si]) => house(b, LX + dx, z, 0, 7, 5.5, 4.6, si));
    for (const x of [-9, 0, 9]) { put(cyl(0.07, 3.2, 8), M.iron, LX + x, 1.6, -3.4); bx(M.gold, [LX + x - 0.25, 3.2, -3.65], [LX + x + 0.25, 3.7, -3.15]); }
    // ---- Parliament: back wall with arched windows, columns, tiered benches, the Speaker's chair ----
    bx(M.plaster, [PX - 14, 0, -10.2], [PX + 14, 9, -9.6]);
    for (const x of [-10.5, -5.5, 5.5, 10.5]) { bx(M.dark, [PX + x - 1.0, 2.2, -9.55], [PX + x + 1.0, 6.4, -9.5]); bx(M.beam, [PX + x - 1.15, 6.4, -9.6], [PX + x + 1.15, 6.7, -9.4]); }
    for (const x of [-12, -8, 8, 12]) { put(cyl(0.5, 8.4, 14), M.stone, PX + x, 4.2, -8.6); bx(M.stoneD, [PX + x - 0.75, 8.4, -9.4], [PX + x + 0.75, 8.8, -7.8]); }
    for (const sg of [-1, 1]) for (let r = 0; r < 3; r++) bx(M.benchW, [PX + Math.min(sg * 4.4, sg * 12.5), 0.09, -8.6 + r * 1.3], [PX + Math.max(sg * 4.4, sg * 12.5), 0.45 + (2 - r) * 0.45, -7.9 + r * 1.3]);
    bx(M.carpet, [PX - 1.3, 0.09, -9.2], [PX + 1.3, 1.3, -8.0]); bx(M.gold, [PX - 1.4, 1.3, -9.3], [PX + 1.4, 1.5, -7.9]); bx(M.carpet, [PX - 1.0, 1.5, -9.3], [PX + 1.0, 3.9, -9.1]);
    // ---- Cartagena: the fort wall with battlements, towers, cannon, hills behind ----
    bx(M.stone, [FORT_X - 9, 0, -12.6], [FORT_X + 9, 3.2, -5.6], 6);
    for (let k = -8; k <= 8; k++) bx(M.stoneD, [FORT_X + k * 1.0 - 0.28, 3.2, -5.9], [FORT_X + k * 1.0 + 0.28, 3.75, -5.6]);
    for (const sx of [-1, 1]) { put(cyl(1.7, 5.4, 12), M.stone, FORT_X + sx * 9.6, 2.7, -10.2); put(cyl(2.1, 1.1, 12, 1.9), M.stoneD, FORT_X + sx * 9.6, 5.7, -10.2); }
    for (const x of [-6, -2.4, 2.4, 6]) { put(cyl(0.22, 1.7, 10, 0.3), M.iron, FORT_X + x, 3.8, -6.9, new THREE.Matrix4().makeRotationX(Math.PI / 2 - 0.05)); }
    [[-90, -80, 40, 24], [-30, -90, 46, 30], [-150, -75, 36, 22], [30, -92, 44, 28], [-185, -60, 30, 18]].forEach(([x, z, r, h], i) => put(cyl(r, h, 8, 2), i % 2 ? M.hill : M.hillF, x, h / 2 - 0.2, z));
    [[LX + 18, -2], [LX - 18, 4], [PX - 22, 6], [WX + 12, 6], [WX + 18, -6], [22, -12]].forEach(([x, z]) => { put(cyl(0.2, 1.4, 6), M.beam, x, 0.7, z); put(cyl(1.7, 4.4, 8, 0.1), M.green, x, 3.5, z); });
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
