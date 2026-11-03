// Four painted sets in one scene (60 m apart): the royal hall, a Paris street with a bakery, the Bastille, the execution square.
// update(f, camera, scene) poses everything for frame f: lights (fixed window/afternoon sun), animated props (blade, flags, net),
// and the cast cards from ccast.ts. Same two-tone lighting, ink layers and card shading as the bridge/kitchen worlds.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house } from "./build";
import { rep } from "./paint";
import { cobbleHD, stoneHD, planksHD, grassHD } from "./paint";
import { marble, plaster, carpet, netTex, doorTex, wicker, tricolor, awning, breadSign, outside, woodTex } from "./kpaint";
import { LIGHTS } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, shotAt, ORG, toW, bladeAt, FPS, SetName } from "./story";

const cyl = (r: number, h: number, seg = 20, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
type Mats = Record<string, THREE.Material>;
const RADIUS: Record<SetName, number> = { hall: 10, street: 15, bast: 24, square: 17 };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#cfe0ef", 45, 160);
  private blade: THREE.Mesh; private net: THREE.Group; private shafts: THREE.Mesh[] = [];
  private flags: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.8);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(3072, 3072);
    R.add(this.hemi, this.sun, this.sun.target);

    M.marble = lam("rMarble", () => ({ map: marble() }));
    M.wallH = lam("rWallH", () => ({ map: plaster("h", "#f1dfb4") }));
    M.ceilH = lam("rCeilH", () => ({ map: plaster("hc", "#f8f0dc") }));
    M.carpet = lam("rCarpet", () => ({ map: carpet() }));
    M.gold = twoTone(new THREE.MeshPhongMaterial({ color: "#e8b83a", specular: "#fff1b0", shininess: 55 }), 0.2);
    M.red = lam("rRed", () => ({ color: "#b02a30" }));
    M.white = twoTone(new THREE.MeshLambertMaterial({ color: "#f6f1e6", side: THREE.DoubleSide }));
    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.stone = lam("rStone", () => ({ map: stoneHD("rStone", ["#cfc3b0", "#c3b7a3", "#d6cab6", "#b9ad99"], "#8f8372") }));
    M.stoneD = lam("rStoneD", () => ({ map: stoneHD("rStoneD", ["#a59d92", "#988f84", "#aea69b", "#8e867b"], "#6f675d") }));
    M.wood = lam("rWood", () => ({ map: woodTex("r", "#b27a45") }));
    M.planks = lam("planksHD", () => ({ map: planksHD() }));
    M.door = lam("rDoor", () => ({ map: doorTex() }));
    M.wicker = lam("rWicker", () => ({ map: wicker() }));
    M.dark = lam("rDark", () => ({ color: "#2b2830" }));
    M.water = lam("rWater", () => ({ color: "#3d8a9e" }));
    M.awn = lam("rAwn", () => ({ map: awning(), side: THREE.DoubleSide }));
    M.sign = lam("rSign", () => ({ map: breadSign() }));
    M.steel = twoTone(new THREE.MeshPhongMaterial({ color: "#c3c8d0", specular: "#ffffff", shininess: 60 }), 0.15);
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 40 }), 0.15);
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.tri = twoTone(new THREE.MeshLambertMaterial({ map: tricolor(), side: THREE.DoubleSide }));
    const bulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.8, 1.8) });

    const b = new Batch();
    const bx = (set: SetName, mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => {
      const o = ORG[set]; b.add(boxGeo(V(a[0] + o[0], a[1] + o[1], a[2] + o[2]), V(c[0] + o[0], c[1] + o[1], c[2] + o[2]), tile, bottom), mat);
    };
    const put = (set: SetName, g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => {
      const o = ORG[set], m = at(x + o[0], y + o[1], z + o[2]); b.add(g, mat, rot ? m.multiply(rot) : m);
    };

    // =============== HALL ===============
    bx("hall", M.marble, [-8, -0.2, -10], [8, 0, 8], 4);
    bx("hall", M.ceilH, [-8, 7, -10], [8, 7.2, 8], 2, true);
    bx("hall", M.wallH, [-8, 0, -10.2], [8, 7, -10], 3);
    bx("hall", M.wallH, [-8, 0, 8], [8, 7, 8.2], 3);
    bx("hall", M.wallH, [8, 0, -10], [8.2, 7, 8], 3);
    bx("hall", M.wallH, [-8.2, 0, -10], [-8, 1.8, 8], 3);
    bx("hall", M.wallH, [-8.2, 5.5, -10], [-8, 7, 8], 3);
    for (const [z0, z1] of [[-10, -7], [-2.5, 0.5], [5, 8]]) bx("hall", M.wallH, [-8.2, 1.8, z0], [-8, 5.5, z1], 3);
    for (const [z0, z1] of [[-7, -2.5], [0.5, 5]]) {   // window frames
      bx("hall", M.white, [-8.3, 1.7, z0 - 0.1], [-7.9, 1.8, z1 + 0.1]); bx("hall", M.white, [-8.3, 5.5, z0 - 0.1], [-7.9, 5.6, z1 + 0.1]);
      bx("hall", M.white, [-8.3, 1.8, z0 - 0.1], [-7.9, 5.5, z0]); bx("hall", M.white, [-8.3, 1.8, z1], [-7.9, 5.5, z1 + 0.1]);
      bx("hall", M.white, [-8.2, 1.8, (z0 + z1) / 2 - 0.05], [-8.0, 5.5, (z0 + z1) / 2 + 0.05]); bx("hall", M.white, [-8.2, 3.6, z0], [-8.0, 3.7, z1]);
    }
    for (const x of [-5.5, 5.5]) for (const z of [-8, -4, 0, 4]) {   // columns
      put("hall", cyl(0.5, 7, 22), M.marble, x, 3.5, z);
      put("hall", cyl(0.7, 0.4, 22), M.gold, x, 0.2, z); put("hall", cyl(0.7, 0.4, 22), M.gold, x, 6.8, z);
    }
    bx("hall", M.carpet, [-1.3, 0, -8], [1.3, 0.03, 8], 4);
    bx("hall", M.red, [-3.4, 0, -10], [3.4, 0.45, -7.0]);                       // dais
    bx("hall", M.gold, [-3.4, 0.45, -7.02], [3.4, 0.5, -7.0]);
    bx("hall", M.red, [-0.7, 0.45, -9.1], [0.7, 1.0, -8.0]);                    // throne: seat, back, arms
    bx("hall", M.gold, [-0.75, 0.95, -9.2], [0.75, 3.4, -8.95]);
    bx("hall", M.red, [-0.6, 1.0, -9.12], [0.6, 3.25, -9.0]);
    bx("hall", M.gold, [-0.85, 0.45, -9.1], [-0.65, 1.5, -8.0]); bx("hall", M.gold, [0.65, 0.45, -9.1], [0.85, 1.5, -8.0]);
    for (const x of [-4.6, 4.6]) bx("hall", M.red, [x - 0.8, 0.5, -10.0], [x + 0.8, 6.0, -9.9]);   // banners
    for (const z of [-6, 0, 5]) {                                                // chandeliers
      put("hall", cyl(0.02, 1.4, 6), M.dark, 0, 6.3, z); put("hall", cyl(0.9, 0.12, 24), M.gold, 0, 5.55, z);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; put("hall", new THREE.SphereGeometry(0.11, 10, 8), bulb, Math.cos(a) * 0.85, 5.8, z + Math.sin(a) * 0.85); }
    }
    // tennis net (shot 10 only)
    this.net = new THREE.Group();
    const netM = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.5), new THREE.MeshBasicMaterial({ map: rep(netTex(), 48, 6), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, color: new THREE.Color(0.8, 0.8, 0.78) }));
    netM.position.set(0, 0.95, -1.9); this.net.add(netM);
    for (const x of [-6, 6]) { const p = new THREE.Mesh(cyl(0.07, 1.7, 8), M.wood); p.position.set(x, 0.85, -1.9); p.castShadow = true; this.net.add(p); }
    this.net.visible = false; R.add(this.net);

    // =============== STREET ===============
    bx("street", M.cobble, [-24, -0.2, -34], [24, 0, 16], 4);
    for (const [x, yaw, zs] of [[-9, Math.PI / 2, [-8, -1.5, 5, 11]], [9, -Math.PI / 2, [-10, -3.5, 3, 9.5]]] as const)
      zs.forEach((z, i) => house(b, ORG.street[0] + x, ORG.street[2] + z, yaw, 7 + (i % 2), 6.5, 7.5 + (i % 3) * 1.2, i + (x > 0 ? 2 : 0), 0));
    for (const z of [-25, -19]) house(b, ORG.street[0] - 9, ORG.street[2] + z, Math.PI / 2, 7, 6.5, 8.4, z > -20 ? 1 : 3, 0);
    for (const z of [-26, -20]) house(b, ORG.street[0] + 9, ORG.street[2] + z, -Math.PI / 2, 7, 6.5, 8.4, z > -22 ? 4 : 5, 0);
    bx("street", M.stone, [-7, 0, -18], [7, 10, -17]);                          // hall front with big doors
    bx("street", M.stone, [-8, 10, -18.2], [8, 10.6, -16.8]);
    bx("street", M.door, [-2.3, 0, -16.95], [2.3, 4.4, -16.85]);
    bx("street", M.stoneD, [-3.5, 0, -16.9], [3.5, 0.25, -15.6]); bx("street", M.stoneD, [-3.0, 0.25, -16.9], [3.0, 0.5, -16.3]);
    for (const x of [-3.4, 3.4]) put("street", cyl(0.3, 5.2, 14), M.stone, x, 2.6, -16.7);
    // bakery stall (counter, awning, sign, empty baskets)
    bx("street", M.wood, [-2.4, 0, -5.8], [2.4, 1.0, -4.5]); bx("street", M.planks, [-2.5, 1.0, -5.9], [2.5, 1.07, -4.4], 2);
    for (const x of [-2.2, 2.2]) bx("street", M.wood, [x - 0.07, 1.0, -5.8], [x + 0.07, 3.3, -5.7]);
    b.add(boxGeo(V(ORG.street[0] - 2.8, 3.3, ORG.street[2] - 5.9), V(ORG.street[0] + 2.8, 3.38, ORG.street[2] - 4.0)), M.awn);
    bx("street", M.sign, [-1.6, 3.5, -5.75], [1.6, 4.9, -5.65]);
    for (const [x, z] of [[-1.5, -5.2], [0.2, -5.2], [1.6, -5.0]] as const) put("street", cyl(0.42, 0.22, 16, 0.34), M.wicker, x, 1.18, z);
    bx("street", M.wood, [-2.5, 0, -7.0], [2.5, 3.2, -6.9]);                    // back wall of the stall

    // =============== BASTILLE ===============
    bx("bast", M.cobble, [-40, -0.2, -8.4], [40, 0, 24], 4);
    bx("bast", M.grass, [-40, -0.25, -40], [40, -0.05, -14], 12);
    bx("bast", M.stone, [-10, 0, -24], [10, 13, -14], 3);
    bx("bast", M.stone, [-10.4, 13, -24.4], [10.4, 13.6, -13.6], 3);
    for (let i = 0; i < 9; i++) bx("bast", M.stone, [-10 + i * 2.35, 13.6, -14.2], [-9.1 + i * 2.35, 14.6, -13.7], 1);
    for (const [x, z] of [[-10, -14], [10, -14], [-10, -24], [10, -24]] as const) {
      put("bast", cyl(3.4, 16, 28), M.stoneD, x, 8, z); put("bast", cyl(3.7, 0.7, 28), M.stone, x, 16.3, z);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; put("bast", new THREE.BoxGeometry(0.9, 1.0, 0.7), M.stone, x + Math.cos(a) * 3.4, 17.1, z + Math.sin(a) * 3.4, new THREE.Matrix4().makeRotationY(-a)); }
    }
    bx("bast", M.dark, [-1.9, 0, -14.1], [1.9, 4.6, -13.9]);                   // gate
    bx("bast", M.iron, [-2.0, 4.6, -14.15], [2.0, 4.9, -13.85]);
    for (let i = 0; i < 4; i++) bx("bast", M.iron, [-1.5 + i * 1.0, 0.0, -14.0], [-1.4 + i * 1.0, 4.4, -13.9]); // portcullis bars
    bx("bast", M.water, [-22, -0.45, -14], [22, -0.02, -8.2]);                 // moat
    bx("bast", M.planks, [-1.7, 0.0, -14.0], [1.7, 0.25, -8.2], 2);            // lowered drawbridge
    for (const x of [-1.8, 1.8]) bx("bast", M.iron, [x - 0.04, 0.2, -14.0], [x + 0.04, 4.6, -13.95]);
    for (let i = 0; i < 4; i++) { const w = 1.6 + i * 2.6; bx("bast", M.dark, [-9 + i * 5.3 - w * 0 - 0.4, 6.5, -14.02], [-9 + i * 5.3 + 0.4, 8.2, -13.99]); }
    put("bast", cyl(0.32, 2.2, 14), M.iron, -5.2, 0.9, 0.2, new THREE.Matrix4().makeRotationX(Math.PI / 2 - 0.15)); // cannon barrel
    put("bast", cyl(0.55, 0.12, 16), M.wood, -5.9, 0.55, 0.2, new THREE.Matrix4().makeRotationZ(Math.PI / 2)); put("bast", cyl(0.55, 0.12, 16), M.wood, -4.5, 0.55, 0.2, new THREE.Matrix4().makeRotationZ(Math.PI / 2));

    // =============== SQUARE ===============
    bx("square", M.cobble, [-40, -0.2, -34], [40, 0, 24], 4);
    for (let i = 0; i < 7; i++) house(b, ORG.square[0] - 21 + i * 7, ORG.square[2] - 21, 0, 6.6, 6.5, 8 + (i % 3) * 1.3, i, 0);
    for (const [x, yaw] of [[-23, Math.PI / 2], [23, -Math.PI / 2]] as const) for (let i = 0; i < 5; i++) house(b, ORG.square[0] + x, ORG.square[2] - 12 + i * 7, yaw, 6.6, 6.5, 8 + (i % 3), i + 2, 0);
    bx("square", M.planks, [-3.4, 0, -11], [3.4, 1.2, -5], 2);                  // scaffold
    bx("square", M.wood, [-3.5, 1.2, -5.05], [3.5, 1.28, -4.9]);
    bx("square", M.planks, [-1.3, 0, -5.05], [1.3, 0.6, -3.9], 2); bx("square", M.planks, [-1.3, 0, -3.9], [1.3, 0.3, -3.1], 2);
    for (const x of [-0.75, 0.75]) bx("square", M.wood, [x - 0.14, 1.2, -8.14], [x + 0.14, 5.3, -7.86]);   // posts
    bx("square", M.wood, [-0.95, 5.0, -8.14], [0.95, 5.4, -7.86]);
    bx("square", M.wood, [-0.75, 1.2, -8.14], [0.75, 1.75, -7.86]);              // lower board
    bx("square", M.wood, [-0.75, 2.05, -8.14], [0.75, 2.3, -7.86]);              // lunette bar
    put("square", cyl(0.5, 0.6, 20, 0.42), M.wicker, 0, 1.5, -7.2); bx("square", M.wood, [-0.8, 0, -3.5], [0.8, 0.8, -2.4]);              // basket
    for (const [x, z] of [[-6, 2], [6, 2], [-10, -12], [10, -12]] as const) { put("square", cyl(0.07, 6, 8), M.wood, x, 3, z); }
    // blade (animated) + flags
    const bladeShape = new THREE.Shape(); bladeShape.moveTo(-0.5, 0.35); bladeShape.lineTo(0.5, 0.35); bladeShape.lineTo(0.5, -0.1); bladeShape.lineTo(-0.5, -0.42); bladeShape.closePath();
    this.blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.06, bevelEnabled: false }), M.steel);
    this.blade.castShadow = true; R.add(this.blade);
    for (const [set, x, y, z] of [["square", -6, 6, 2], ["square", 6, 6, 2], ["square", -10, 6, -12], ["square", 10, 6, -12], ["bast", -12, 17, -14.5], ["bast", 12, 17, -14.5]] as const) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.3, 14, 1), M.tri);
      const o = ORG[set]; f.position.set(o[0] + x + 1.0, o[1] + y - 0.55, o[2] + z); f.userData.base = [o[0] + x + 1.0, o[1] + y - 0.55, o[2] + z]; f.castShadow = true; f.frustumCulled = false;
      this.flags.push(f); R.add(f);
      if (set === "bast") put("bast", cyl(0.07, 4, 8), M.wood, x, 18.2, z);
    }
    b.build(R);

    // window light (hall) + outside card
    const out = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), new THREE.MeshBasicMaterial({ map: outside(), color: new THREE.Color(1.15, 1.15, 1.1) }));
    out.rotation.y = Math.PI / 2; out.position.set(-14, 4.2, -1); out.layers.set(NOINK); R.add(out);
    const L = SUN.clone().negate();
    for (const [z0, z1] of [[-7, -2.5], [0.5, 5]]) {
      const corner = (z: number, y: number) => V(-8, y, z), hit = (p: THREE.Vector3) => p.clone().addScaledVector(L, p.y / -L.y);
      const c = [corner(z0, 1.8), corner(z1, 1.8), corner(z1, 5.5), corner(z0, 5.5)], f = c.map(hit), pos: number[] = [];
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; pos.push(...c[i].toArray(), ...c[j].toArray(), ...f[j].toArray(), ...c[i].toArray(), ...f[j].toArray(), ...f[i].toArray()); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.82, 0.5), transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.layers.set(NOINK); m.frustumCulled = false; m.renderOrder = 4; this.shafts.push(m); R.add(m);
    }
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const L = LIGHTS.day, sh = shotAt(f), t = f / FPS;
    const c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 250; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const centre = V(...toW(sh.set, [0, 1.2, sh.set === "hall" ? -1 : -4]));
    this.sun.position.copy(centre).addScaledVector(SUN, 40); this.sun.target.position.copy(centre);
    const Rr = RADIUS[sh.set], sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 4; sc.far = 100; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 6);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(0.05, 0.03, 0.0); TONE.uSat.value = 1.08;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    if (sh.set === "hall") { scene.fog = null; scene.background = new THREE.Color("#f1dcb4"); }
    else { scene.fog = this.fog; scene.background = new THREE.Color("#bcd8f2"); }
    // animated props
    this.net.visible = sh.id === 10;
    for (const s of this.shafts) s.visible = sh.set === "hall";
    const bo = ORG.square, drop = bladeAt(t, sh.id);
    this.blade.position.set(bo[0], bo[1] + 4.45 - 2.45 * drop, bo[2] - 8.0);
    for (const fl of this.flags) {
      const p = fl.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const u = (i % 15) / 14, y = i < 15 ? 0.65 : -0.65;
        p.setXYZ(i, -1.0 + u * 2.0, y + 0.05 * u * Math.sin(t * 4 - u * 3), 0.3 * u * Math.sin(t * 5.5 - u * 5 + fl.position.x));
      }
      p.needsUpdate = true;
    }
    // cast + effects
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
