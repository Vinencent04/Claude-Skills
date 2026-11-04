// Five painted sets in one scene (60 m apart): the lane in St Giles, the owner's office, the brewery yard, the brewery hall with the vat, the inquest room.
// update(f, camera, scene) poses everything for frame f: lights, the beer wave, the vat that bursts, the wall, the flood, stamps and coins, and the cast cards from ccast.ts.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house } from "./build";
import { cobbleHD, stoneHD, planksHD, brick, rep } from "./paint";
import { plaster, staves, carpet, floorTile, textSign, hoopIron, beerTex } from "./bpaint";
import { PRESETS, BG } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, shotAt, ORG, toW, FPS, SetName, T_BURST, T_WALL, T_COINS, T_NOTICE, T_GOD, clamp01, smooth } from "./story";

const cyl = (r: number, h: number, seg = 24, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
type Mats = Record<string, THREE.Material>;
const RADIUS: Record<SetName, number> = { lane: 22, office: 10, yard: 28, brew: 20, court: 12 };
export const LANE_X = 3.25;               // half width of the lane between the facades
export const WALL_Z = -16;                // brewery back wall that the wave smashes
export const waveFront = (t: number) => -3.5 + 5.1 * t;                       // hook: the wave races down the lane (shot 1)
export const waveFront8 = (t: number) => WALL_Z + 6.5 * Math.max(0, t - T_WALL);  // shot 8: from the broken wall
export const VAT_R = 4.2, VAT_H = 6.7;
export const HOOPS = [0.55, 1.55, 2.55, 3.55, 4.55, 5.55, 6.35];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#cfe0ef", 45, 160);
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // animated things
  private waveL: THREE.Group; private waveB: THREE.Group; private flood: THREE.Mesh; private wallPlate: THREE.Mesh;
  private vat: THREE.Mesh; private hoops: THREE.Mesh[] = []; private slip!: THREE.Mesh; private flyStaves: THREE.Mesh[] = [];
  private sideVats: THREE.Mesh[] = []; private coins: THREE.Mesh[] = []; private beam: THREE.Mesh; private lamp: THREE.MeshBasicMaterial;
  private debris: THREE.Mesh[] = []; private after!: THREE.Group; private shed: THREE.Mesh[] = [];

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.8);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(3072, 3072);
    R.add(this.hemi, this.sun, this.sun.target);

    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.planks = lam("planksHD", () => ({ map: planksHD() }));
    M.brick = lam("bBrick", () => ({ map: rep(brick(), 4, 2) }));
    M.stone = lam("bStone", () => ({ map: stoneHD("bStone", ["#cfc3b0", "#c3b7a3", "#d6cab6", "#b9ad99"], "#8f8372") }));
    M.stoneD = lam("bStoneD", () => ({ map: stoneHD("bStoneD", ["#a59d92", "#988f84", "#aea69b", "#8e867b"], "#6f675d") }));
    M.wallO = lam("bWallO", () => ({ map: staves("wo", "#8a5a34", 10) }));
    M.plasterB = lam("bPlasterB", () => ({ map: plaster("b", "#e8d4a8") }));
    M.plasterC = lam("bPlasterC", () => ({ map: plaster("c", "#d8d4cc") }));
    M.vatWood = lam("bVat", () => ({ map: staves("vat", "#a8693a", 16) }));
    M.wood = lam("bWood", () => ({ map: staves("w", "#9a6a3a", 4) }));
    M.beam = lam("bBeam", () => ({ map: staves("beam", "#5a3a22", 3) }));
    M.carpet = lam("bCarpet", () => ({ map: carpet() }));
    M.tile = lam("bTile", () => ({ map: rep(floorTile(), 6, 4) }));
    M.dark = lam("bDark", () => ({ color: "#1f1c22" }));
    M.red = lam("bRed", () => ({ color: "#8a2a30" }));
    M.gold = twoTone(new THREE.MeshPhongMaterial({ color: "#e8b83a", specular: "#fff1b0", shininess: 55 }), 0.2);
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#c8ccd4", shininess: 60 }), 0.15);
    M.ironMap = lam("bIronMap", () => ({ map: rep(hoopIron(), 8, 1) }));
    M.paper = lam("bPaper", () => ({ color: "#f2ead2" }));
    M.beer = twoTone(new THREE.MeshLambertMaterial({ map: beerTex(), color: "#ffffff" }), 0.3);
    M.foam = twoTone(new THREE.MeshLambertMaterial({ color: "#fff3d2" }), 0.4);
    M.floodM = twoTone(new THREE.MeshLambertMaterial({ map: rep(beerTex(), 6, 14), color: "#c89868" }), 0.3);
    M.void = new THREE.MeshBasicMaterial({ color: "#1a1018" });
    M.sky = new THREE.MeshBasicMaterial({ color: "#16204a" });
    this.lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.8, 1.8) });
    M.signBrew = new THREE.MeshBasicMaterial({ map: textSign("brew", 1024, 256, ["MEUX & CO.", "HORSE SHOE BREWERY"], "#3a2a1c", "#f2d48a") });

    const b = new Batch();
    const bx = (set: SetName, mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => {
      const o = ORG[set]; b.add(boxGeo(V(a[0] + o[0], a[1] + o[1], a[2] + o[2]), V(c[0] + o[0], c[1] + o[1], c[2] + o[2]), tile, bottom), mat);
    };
    const put = (set: SetName, g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => {
      const o = ORG[set], m = at(x + o[0], y + o[1], z + o[2]); b.add(g, mat, rot ? m.multiply(rot) : m);
    };
    const rotZ = (a: number) => new THREE.Matrix4().makeRotationZ(a);
    const rotY = (a: number) => new THREE.Matrix4().makeRotationY(a);

    // =============== LANE (St Giles): narrow lane, brewery wall at the far end ===============
    bx("lane", M.cobble, [-24, -0.2, -40], [24, 0, 60], 4);
    for (const [x, yaw] of [[-LANE_X - 3.25, Math.PI / 2], [LANE_X + 3.25, -Math.PI / 2]] as const)
      for (let i = 0; i < 8; i++) house(b, ORG.lane[0] + x, ORG.lane[2] - 11 + i * 7.1, yaw, 7 + (i % 2), 6.5, 7.6 + ((i + (x > 0 ? 2 : 0)) % 3) * 1.3, i + (x > 0 ? 3 : 0), 0);
    bx("lane", M.brick, [-14, 0, -34], [14, 10, WALL_Z - 0.3], 3);                    // the brewery's back wall (solid block)
    bx("lane", M.void, [-3.0, 0, WALL_Z - 0.4], [3.0, 4.6, WALL_Z - 0.28]);            // the opening behind the loose wall plate
    this.wallPlate = new THREE.Mesh(new THREE.BoxGeometry(6.2, 4.7, 0.5), M.brick); this.wallPlate.position.set(ORG.lane[0], 2.35, WALL_Z + 0.05); this.wallPlate.castShadow = true; R.add(this.wallPlate);
    put("lane", cyl(1.3, 22, 20), M.brick, -8, 11, -26);                                   // brewery chimney
    for (const z of [-8, 6, 20, 34]) {                                                      // street lamps and barrels
      for (const s of [-1, 1]) {
        put("lane", cyl(0.07, 3.6, 8), M.iron, s * 2.9, 1.8, z + (s > 0 ? 3 : 0));
        put("lane", new THREE.SphereGeometry(0.22, 12, 10), this.lamp, s * 2.9, 3.7, z + (s > 0 ? 3 : 0));
      }
      put("lane", cyl(0.45, 0.9, 16), M.wood, -2.6, 0.45, z + 2); put("lane", cyl(0.45, 0.9, 16), M.wood, 2.7, 0.45, z - 1.2);
    }
    put("lane", cyl(0.45, 0.9, 16), M.wood, 0.6, 0.45, 0.5);                                // the barrel with the mug (shot 12)
    // aftermath props (visible from shot 8 on): collapsed house, crate stack the survivors stand on
    this.after = new THREE.Group();
    const am = (g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rz = 0, ry = 0) => { const m = new THREE.Mesh(g, mat); m.position.set(ORG.lane[0] + x, y, ORG.lane[2] + z); m.rotation.set(0, ry, rz); m.castShadow = true; this.after.add(m); };
    am(new THREE.BoxGeometry(3.4, 3.4, 4.2), M.brick, 2.2, 1.2, -6.2, -0.42, 0.2);
    am(new THREE.BoxGeometry(3.0, 0.3, 1.6), M.planks, 2.3, 3.0, -6.0, 0.55);
    am(new THREE.BoxGeometry(2.2, 3.1, 2.4), M.wood, -2.0, 1.55, -1.2);
    am(new THREE.BoxGeometry(2.2, 0.25, 2.4), M.planks, -2.0, 3.2, -1.2);
    this.after.visible = false; R.add(this.after);
    // the wave (lane): body + curled crest + foam
    const wave = () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M.beer); body.name = "body"; g.add(body);
      const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 24), M.beer); crest.rotation.z = Math.PI / 2; crest.name = "crest"; g.add(crest);
      for (let i = 0; i < 14; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), M.foam); f.name = "foam" + i; g.add(f); }
      g.traverse((o) => { o.castShadow = true; }); g.visible = false; R.add(g); return g;
    };
    this.waveL = wave(); this.waveB = wave();
    this.flood = new THREE.Mesh(new THREE.BoxGeometry(2 * LANE_X + 0.4, 1.0, 62), M.floodM); this.flood.position.set(ORG.lane[0], -0.3, 14); this.flood.visible = false; R.add(this.flood);

    // =============== OFFICE: the owner's desk, lamp, coins ===============
    bx("office", M.planks, [-8, -0.2, -10], [8, 0, 4], 3);
    bx("office", M.wallO, [-8, 0, -10.2], [8, 7, -10], 3); bx("office", M.wallO, [-8.2, 0, -10], [-8, 7, 4], 3); bx("office", M.wallO, [8, 0, -10], [8.2, 7, 4], 3);
    bx("office", M.beam, [-8, 7, -10.2], [8, 7.3, 4.2], 2, true);
    bx("office", M.sky, [-2.8, 2.2, -9.97], [2.8, 5.8, -9.9]);                                   // night window
    for (const x of [-2.9, 0, 2.9]) bx("office", M.beam, [x - 0.07, 2.2, -9.95], [x + 0.07, 5.8, -9.88]);
    bx("office", M.beam, [-2.9, 4.0, -9.95], [2.9, 4.1, -9.88]);
    bx("office", M.beam, [-7.9, 0, -9.9], [-5.4, 6.2, -9.2]);                                    // bookcase
    for (let i = 0; i < 5; i++) bx("office", M.red, [-7.7, 0.5 + i * 1.2, -9.3], [-5.6, 0.62 + i * 1.2, -9.25]);
    bx("office", M.wood, [-2.6, 0, -5.8], [2.6, 1.0, -3.9], 2); bx("office", M.beam, [-2.7, 1.0, -5.9], [2.7, 1.1, -3.8], 2);   // desk
    bx("office", M.red, [-0.7, 0, -7.4], [0.7, 0.45, -6.4]);                                      // chair seat block
    bx("office", M.beam, [-0.8, 0.45, -7.5], [0.8, 2.3, -7.35]);                                  // chair back
    put("office", new THREE.SphereGeometry(0.2, 12, 10), this.lamp, -1.9, 1.5, -4.9); put("office", cyl(0.05, 0.4, 8), M.iron, -1.9, 1.3, -4.9);
    bx("office", M.paper, [-0.6, 1.1, -5.0], [0.9, 1.115, -4.1]);                                 // the refund sheet
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(cyl(0.11, 1, 18), M.gold); m.position.set(ORG.office[0] - 2.0 + i * 0.3, 1.1, ORG.office[2] - 4.5 + (i % 2) * 0.2); m.castShadow = true; R.add(m); this.coins.push(m); }

    // =============== YARD: St Giles rooftops, the brewery front, gate ===============
    bx("yard", M.cobble, [-50, -0.2, -40], [50, 0, 50], 4);
    bx("yard", M.brick, [-10, 0, -26], [10, 11, -12], 3);
    bx("yard", M.stoneD, [-10.4, 11, -26.4], [10.4, 11.6, -11.6], 3);
    bx("yard", M.dark, [-2.2, 0, -12.1], [2.2, 4.6, -11.9]); bx("yard", M.stoneD, [-2.8, 4.6, -12.2], [2.8, 5.1, -11.8]);
    for (const x of [-3.0, 3.0]) put("yard", cyl(0.35, 4.8, 14), M.stone, x, 2.4, -11.9);
    put("yard", cyl(1.5, 24, 22), M.brick, -6.5, 12, -21); put("yard", cyl(1.8, 0.7, 22), M.stoneD, -6.5, 24.2, -21);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), M.signBrew); sign.position.set(ORG.yard[0], 8.0, ORG.yard[2] - 11.88); sign.layers.set(NOINK); R.add(sign);
    for (let i = 0; i < 10; i++) house(b, ORG.yard[0] - 32 + (i % 5) * 6.5, ORG.yard[2] - 3 + Math.floor(i / 5) * 9 + (i % 3), Math.PI / 2 * (i % 2 ? 1 : -1) * 0, 6.8, 6.5, 6.5 + (i % 4) * 1.2, i, 0);
    for (let i = 0; i < 10; i++) house(b, ORG.yard[0] + 12 + (i % 5) * 7, ORG.yard[2] - 3 + Math.floor(i / 5) * 9 + (i % 3), 0, 6.8, 6.5, 6.8 + (i % 3) * 1.3, i + 4, 0);
    for (let i = 0; i < 6; i++) house(b, ORG.yard[0] - 18 + i * 7.4, ORG.yard[2] + 22, 0, 6.8, 6.5, 7 + (i % 3), i + 2, 0);

    // =============== BREW: the hall with the giant vat ===============
    bx("brew", M.planks, [-18, -0.2, -16], [18, 0, 18], 3);
    bx("brew", M.plasterB, [-18, 0, -16.2], [18, 13, -16]); bx("brew", M.plasterB, [-18.2, 0, -16], [-18, 13, 18]); bx("brew", M.plasterB, [18, 0, -16], [18.2, 13, 18]);
    bx("brew", M.beam, [-18, 13, -16], [18, 13.3, 18], 2, true);
    for (let i = -3; i <= 3; i++) bx("brew", M.beam, [i * 5.5 - 0.3, 11.4, -16], [i * 5.5 + 0.3, 12.0, 18], 2);
    for (const x of [-12, 12]) for (const z of [-12, -3, 8, 15]) bx("brew", M.beam, [x - 0.4, 0, z - 0.4], [x + 0.4, 12, z + 0.4], 2);
    for (let i = 0; i < 6; i++) { put("brew", cyl(0.5, 0.9, 16), M.wood, -14 + i * 1.15, 0.45, -14); put("brew", cyl(0.5, 0.9, 16), M.wood, 14 - i * 1.15, 0.45, -14); }
    this.vat = new THREE.Mesh(cyl(VAT_R, VAT_H, 40), M.vatWood); this.vat.position.set(ORG.brew[0], VAT_H / 2, ORG.brew[2]); this.vat.castShadow = true; R.add(this.vat);
    HOOPS.forEach((y, i) => {
      const h = new THREE.Mesh(cyl(VAT_R + 0.07, 0.24, 40), M.ironMap); h.position.set(ORG.brew[0], y, ORG.brew[2]); h.castShadow = true; R.add(h);
      if (i === 2) this.slip = h; else this.hoops.push(h);
    });
    for (const sx of [-1, 1]) { const sv = new THREE.Mesh(cyl(3.1, 5.4, 32), M.vatWood); sv.position.set(ORG.brew[0] + sx * 10.5, 2.7, ORG.brew[2] - 3); sv.castShadow = true; R.add(sv); this.sideVats.push(sv); }
    for (let i = 0; i < 22; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.62, VAT_H, 0.1), M.vatWood); s.visible = false; s.castShadow = true; s.userData.a = (i / 22) * Math.PI * 2; R.add(s); this.flyStaves.push(s); }

    // =============== COURT: the inquest ===============
    bx("court", M.tile, [-10, -0.2, -12], [10, 0, 6], 4);
    bx("court", M.plasterC, [-10, 0, -12.2], [10, 9, -12]); bx("court", M.plasterC, [-10.2, 0, -12], [-10, 9, 6]); bx("court", M.plasterC, [10, 0, -12], [10.2, 9, 6]);
    bx("court", M.beam, [-10, 9, -12], [10, 9.3, 6], 2, true);
    for (const x of [-7.6, -3.8, 3.8, 7.6]) bx("court", M.stone, [x - 0.35, 0, -11.9], [x + 0.35, 8.6, -11.4]);                       // pilasters
    bx("court", M.wood, [-2.6, 0, -9.0], [2.6, 0.55, -6.2], 2);                                                                     // platform
    bx("court", M.beam, [-2.5, 0.55, -6.9], [2.5, 1.6, -6.7], 2); bx("court", M.wood, [-2.6, 1.6, -6.95], [2.6, 1.72, -6.45], 2);       // coroner's desk
    bx("court", M.red, [-0.6, 0.55, -8.6], [0.6, 1.0, -7.8]); bx("court", M.beam, [-0.7, 1.0, -8.8], [0.7, 3.4, -8.65]);                  // chair
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) bx("court", M.wood, [sx * 2.4 - 0.8, 0, -5.8 + i * 2.8], [sx * 2.4 + 0.8, 0.45, -3.9 + i * 2.8], 2);  // jury benches
    
    b.build(R);
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 2.3, 8, 28, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.9, 0.62), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.beam.position.set(ORG.court[0], 5.4, ORG.court[2] - 7.6); this.beam.layers.set(NOINK); this.beam.frustumCulled = false; this.beam.renderOrder = 4; R.add(this.beam);
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(i % 2 ? cyl(0.4, 0.9, 12) : new THREE.BoxGeometry(0.7, 0.4, 0.4), i % 2 ? M.wood : M.brick); m.castShadow = true; m.visible = false; R.add(m); this.debris.push(m); }
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** pose a wave group: spans zBack..zFront (set-local), height H, width W; foam bubbles cap the crest */
  private poseWave(g: THREE.Group, set: SetName, x: number, zBack: number, zFront: number, H: number, W: number, t: number) {
    const o = ORG[set], len = Math.max(0.2, zFront - zBack), cz = o[2] + zBack + len / 2;
    g.visible = H > 0.05;
    const body = g.getObjectByName("body")!, crest = g.getObjectByName("crest")!;
    body.scale.set(W, H, Math.max(0.1, len - H * 0.5)); body.position.set(o[0] + x, o[1] + H / 2, cz - H * 0.25);
    crest.scale.set(H, W, H); crest.position.set(o[0] + x, o[1] + H / 2, o[2] + zFront - H * 0.5);
    for (let i = 0; i < 14; i++) {
      const f = g.getObjectByName("foam" + i)!, u = (i + 0.5) / 14, k = 0.45 + 0.35 * Math.abs(Math.sin(i * 7.1));
      f.scale.setScalar(k * (0.55 + 0.06 * Math.sin(t * 6 + i * 1.7)) * Math.max(0.5, H * 0.3));
      f.position.set(o[0] + x + (u - 0.5) * (W - 0.4), o[1] + H * (0.94 + 0.05 * Math.sin(i * 2.3 + t * 5)), o[2] + zFront - H * 0.5 - (i % 3) * H * 0.18);
    }
  }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const sh = shotAt(f), L = PRESETS[sh.light], t = f / FPS, id = sh.id;
    const c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 250; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const centre = V(...toW(sh.set, [0, 1.2, sh.set === "lane" ? -4 : sh.set === "brew" ? 2 : -4]));
    this.sun.position.copy(centre).addScaledVector(SUN, 40); this.sun.target.position.copy(centre);
    const Rr = RADIUS[sh.set], sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 4; sc.far = 100; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 6);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(0.05, 0.03, 0.0); TONE.uSat.value = 1.08;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const bg = BG[sh.light];
    if (bg.fog) { this.fog.color.set(bg.fog); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog; } else scene.fog = null;
    scene.background = new THREE.Color(bg.bg);
    // lamp flicker (last shot)
    const flick = id === 12 ? 0.55 + 0.45 * (Math.sin(t * 31) * Math.sin(t * 17.3) > -0.25 ? 1 : 0.15) : 1;
    this.lamp.color.setRGB(3.4 * flick, 2.8 * flick, 1.8 * flick);

    // ---- lane: wave (shot 1 and 8), wall, flood ----
    const tl = id === 1 ? t : 0;
    this.poseWave(this.waveL, "lane", 0, WALL_Z, 0, 0, 2 * LANE_X, t);
    if (id === 1) this.poseWave(this.waveL, "lane", 0, WALL_Z, waveFront(tl), 3.3, 2 * LANE_X - 0.1, t);
    else if (id === 8 && t >= T_WALL) {
      const front = waveFront8(t), H = 3.6 * (1 - 0.55 * smooth((t - T_WALL) / 4.2)) * smooth((t - T_WALL) / 0.35);
      this.poseWave(this.waveL, "lane", 0, WALL_Z, Math.min(front, 40), H, 2 * LANE_X - 0.1, t);
    }
    this.wallPlate.visible = !(id === 8 && t >= T_WALL) && id !== 9 && id !== 12 && id !== 1;
    if (id === 1) this.wallPlate.visible = false;
    const fl = id === 9 ? 0.65 : id === 8 ? 0.65 * smooth((t - (T_WALL + 2.2)) / 2.5) : 0;
    this.flood.visible = id === 8 || id === 9;
    this.flood.position.y = -0.4 + fl; this.flood.position.z = (id === 8 ? 12 : 14);
    this.debris.forEach((d, i) => {
      d.visible = id === 9 || (id === 8 && t > T_WALL + 2);
      d.position.set(ORG.lane[0] - 1.6 + i * 0.7, fl + 0.12 + 0.06 * Math.sin(t * 2 + i), ORG.lane[2] + 2 - i * 3.4);
      d.rotation.set(0.3 * Math.sin(t + i), t * 0.2 + i, 0.2 * Math.cos(t * 1.3 + i));
    });

    this.after.visible = sh.set === "lane" && id >= 9;
    // ---- brew: slipped hoop, burst, flying staves, wave, side vats ----
    const burst = t - T_BURST;
    const sag = id === 5 ? smooth((t - T_NOTICE + 1.2) / 1.2) : id === 6 ? 1 : 0;
    this.slip.position.set(ORG.brew[0], HOOPS[2] - 0.42 * sag - (id === 6 ? 0.05 * (t - 23.1) : 0), ORG.brew[2] + 0.03 * sag);
    this.slip.rotation.set(0.0, 0.0, 0.1 * sag + (id === 6 ? 0.012 * (t - 23.1) : 0));
    const jit = id === 7 && burst < 0 && burst > -0.7 ? 0.05 * Math.sin(f * 7.3) : 0;
    this.vat.position.x = ORG.brew[0] + jit;
    const intact = !(id === 7 && burst >= 0);
    this.vat.visible = intact; this.slip.visible = intact; this.hoops.forEach((h) => { h.visible = intact; });
    this.flyStaves.forEach((s) => {
      const on = id === 7 && burst >= 0; s.visible = on; if (!on) return;
      const a = s.userData.a as number, k = burst, r = VAT_R + 7 * k + 7 * k * k, ys = VAT_H / 2 + 1.5 * k - 5 * k * k;
      s.position.set(ORG.brew[0] + Math.sin(a) * r * 0.9, Math.max(0.3, ys), ORG.brew[2] + Math.cos(a) * r);
      s.rotation.set(2.2 * k * Math.cos(a * 3), a + 4 * k, 2.8 * k * Math.sin(a * 2));
    });
    const bz = 4.2 + 11 * burst, bH = 3.4 * smooth(burst / 0.3) * (1 - 0.3 * clamp01(burst / 1.4));
    this.poseWave(this.waveB, "brew", 0, -1.0, id === 7 && burst >= 0 ? bz : 0, id === 7 && burst >= 0 ? bH : 0, 11, t);
    this.sideVats.forEach((sv, i) => {
      const tip = id === 7 && burst > 0.2 ? Math.min(1.3, 1.7 * (burst - 0.2)) * (i ? -1 : 1) * -1 : 0;
      sv.rotation.z = tip; sv.position.y = 2.7 - 0.5 * Math.abs(tip);
    });

    // ---- office: coins stack up ----
    this.coins.forEach((m, i) => { const n = id === 2 ? Math.max(0, Math.min(1, (t - T_COINS - i * 0.09) / 0.3)) : 1; const h = 0.05 + n * (0.14 + 0.09 * (i % 3)); m.scale.y = h; m.position.y = 1.1 + h / 2; });
    // ---- court: the light of God ----
    (this.beam.material as THREE.MeshBasicMaterial).opacity = id === 10 ? 0.16 * smooth((t - T_GOD) / 0.4) : 0;

    // ---- cast + effects ----
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
      a.mesh.scale.set(sc2, sc2, sc2);
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
    return focus;
  }
}
