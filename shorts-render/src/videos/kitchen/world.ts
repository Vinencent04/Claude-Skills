// The kitchen as one three.js scene: painted tile floor, butter-yellow walls, sage-teal cabinets, a stove with hood, a fridge,
// a window with a warm sun shaft, a round gingham table, a pendant lamp, and the cast on top. update(f, camera, scene) poses
// everything for frame f (pure function of f). Same lighting model, ink layers and card shading as the bridge world.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "./build";
import { ctex } from "./paint";
import { floorTile, plaster, subway, cabinet, countertop, woodTex, outside } from "./kpaint";
import { Pen } from "./toon";
import { LIGHTS } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, FPS } from "./story";

const gingham = () => ctex("kGingham", 256, 256, (g) => {
  g.fillStyle = "#f6efe2"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(208,72,60,.55)";
  for (let i = 0; i < 8; i++) { g.fillRect(i * 32, 0, 16, 256); g.fillRect(0, i * 32, 256, 16); }
});
const cerealBox = () => ctex("kCereal", 128, 192, (g) => {
  g.fillStyle = "#e0453a"; g.fillRect(0, 0, 128, 192);
  g.fillStyle = "#f6d35a"; g.beginPath(); g.arc(64, 90, 38, 0, 7); g.fill();
  g.fillStyle = "#2a1a22"; g.beginPath(); g.arc(52, 82, 5, 0, 7); g.arc(76, 82, 5, 0, 7); g.fill();
  g.lineWidth = 5; g.strokeStyle = "#2a1a22"; g.beginPath(); g.arc(64, 94, 18, 0.2, 2.9); g.stroke();
  g.fillStyle = "#3f9aa0"; g.fillRect(0, 150, 128, 42);
});

type Mats = Record<string, THREE.Material>;
const cyl = (r: number, h: number, seg = 20) => new THREE.CylinderGeometry(r, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(3072, 3072);
    R.add(this.hemi, this.sun, this.sun.target);

    // ---- materials ----
    M.floor = lam("kFloor", () => ({ map: floorTile() }));
    M.wall = lam("kWallY", () => ({ map: plaster("y", "#f2d58c") }));
    M.ceil = lam("kCeil", () => ({ map: plaster("c", "#fbf3df") }));
    M.tile = lam("kTile", () => ({ map: subway() }));
    M.cab = lam("kCabTeal", () => ({ map: cabinet("t", "#5ba79b") }));
    M.cabU = lam("kCabCream", () => ({ map: cabinet("c", "#efe3c4") }));
    M.top = lam("kTop", () => ({ map: countertop() }));
    M.wood = lam("kWoodD", () => ({ map: woodTex("d", "#b9824a") }));
    M.white = twoTone(new THREE.MeshLambertMaterial({ color: "#f6f1e6", side: THREE.DoubleSide }));
    M.cloth = lam("kGingham", () => ({ map: gingham() }));
    M.woodD = twoTone(new THREE.MeshLambertMaterial({ color: "#b9824a", side: THREE.DoubleSide }));
    M.fridge = lam("kFridge", () => ({ color: "#bfe0cf" }));
    M.stove = lam("kStove", () => ({ color: "#e6dfcb" }));
    M.dark = lam("kDark", () => ({ color: "#34353d" }));
    M.glass = lam("kOvenGlass", () => ({ color: "#3a4150" }));
    M.red = lam("kRed", () => ({ color: "#d4503f" }));
    M.green = lam("kGreen", () => ({ color: "#4c9a45" }));
    M.cereal = lam("kCerealBox", () => ({ map: cerealBox() }));
    M.milk = lam("kMilk", () => ({ color: "#f3f0e6" }));
    M.shade = lam("kShade", () => ({ color: "#3f9aa0" }));
    M.steel = twoTone(new THREE.MeshPhongMaterial({ color: "#aeb3bb", specular: "#ffffff", shininess: 50 }), 0.15);
    M.jar1 = lam("kJar1", () => ({ color: "#d9a64a" }));
    M.jar2 = lam("kJar2", () => ({ color: "#78b36a" }));
    M.jar3 = lam("kJar3", () => ({ color: "#e0715a" }));
    M.pot = lam("kPot", () => ({ color: "#c46a43" }));
    const bulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.8, 1.8) });

    const b = new Batch();
    // ---- shell: floor, ceiling, four walls (left one has the window hole) ----
    b.add(boxGeo(V(-3.6, -0.2, -3.2), V(3.6, 0, 2.8), 2.4), M.floor);
    b.add(boxGeo(V(-3.6, 2.9, -3.2), V(3.6, 3.1, 2.8), 2, true), M.ceil);
    b.add(boxGeo(V(-3.6, 0, -3.2), V(3.6, 2.9, -3.0), 2.4), M.wall);
    b.add(boxGeo(V(-3.6, 0, 2.6), V(3.6, 2.9, 2.8), 2.4), M.wall);
    b.add(boxGeo(V(3.4, 0, -3.0), V(3.6, 2.9, 2.6), 2.4), M.wall);
    const WZ0 = -1.6, WZ1 = 0.0, WY0 = 1.15, WY1 = 2.35;
    b.add(boxGeo(V(-3.6, 0, -3.0), V(-3.4, WY0, 2.6), 2.4), M.wall);
    b.add(boxGeo(V(-3.6, WY1, -3.0), V(-3.4, 2.9, 2.6), 2.4), M.wall);
    b.add(boxGeo(V(-3.6, WY0, -3.0), V(-3.4, WY1, WZ0), 2.4), M.wall);
    b.add(boxGeo(V(-3.6, WY0, WZ1), V(-3.4, WY1, 2.6), 2.4), M.wall);
    // window frame, muntins, sill
    const fr = 0.06;
    b.add(boxGeo(V(-3.5, WY0 - 0.02, WZ0 - fr), V(-3.3, WY0 + fr, WZ1 + fr)), M.white);
    b.add(boxGeo(V(-3.5, WY1 - fr, WZ0 - fr), V(-3.38, WY1 + 0.02, WZ1 + fr)), M.white);
    b.add(boxGeo(V(-3.5, WY0, WZ0 - fr), V(-3.38, WY1, WZ0)), M.white);
    b.add(boxGeo(V(-3.5, WY0, WZ1), V(-3.38, WY1, WZ1 + fr)), M.white);
    b.add(boxGeo(V(-3.47, WY0, (WZ0 + WZ1) / 2 - 0.025), V(-3.41, WY1, (WZ0 + WZ1) / 2 + 0.025)), M.white);
    b.add(boxGeo(V(-3.47, (WY0 + WY1) / 2 - 0.025, WZ0), V(-3.41, (WY0 + WY1) / 2 + 0.025, WZ1)), M.white);
    b.add(boxGeo(V(-3.4, WY0 - 0.02, WZ0 - 0.1), V(-3.0, WY0 + 0.03, WZ1 + 0.1)), M.white);
    // plant on the sill
    b.add(cyl(0.07, 0.12, 14), M.pot, at(-3.15, WY0 + 0.09, -0.8));
    b.add(new THREE.SphereGeometry(0.13, 14, 10), M.green, at(-3.15, WY0 + 0.26, -0.8));
    b.add(new THREE.SphereGeometry(0.09, 12, 8), M.green, at(-3.08, WY0 + 0.34, -0.72));

    // ---- back counter run, stove, hood, backsplash, uppers ----
    for (let i = 0; i < 5; i++) b.add(boxGeo(V(-3.4 + 0.55 * i, 0, -3.0), V(-3.4 + 0.55 * (i + 1) - 0.01, 0.9, -2.35)), M.cab);
    for (let i = 0; i < 3; i++) b.add(boxGeo(V(0.55 + 0.5167 * i, 0, -3.0), V(0.55 + 0.5167 * (i + 1) - 0.01, 0.9, -2.35)), M.cab);
    b.add(boxGeo(V(-3.45, 0.9, -3.0), V(-0.65, 0.95, -2.3), 1), M.top);
    b.add(boxGeo(V(0.55, 0.9, -3.0), V(2.1, 0.95, -2.3), 1), M.top);
    // left run along the window wall
    for (let i = 0; i < 4; i++) b.add(boxGeo(V(-3.4, 0, -2.35 + 0.5 * i), V(-2.75, 0.9, -2.35 + 0.5 * (i + 1) - 0.01)), M.cab);
    b.add(boxGeo(V(-3.4, 0.9, -2.35), V(-2.7, 0.95, -0.35), 1), M.top);
    // stove
    b.add(boxGeo(V(-0.65, 0, -3.0), V(0.55, 0.9, -2.35)), M.stove);
    b.add(boxGeo(V(-0.65, 0.9, -3.0), V(0.55, 0.96, -2.3)), M.dark);
    b.add(boxGeo(V(-0.52, 0.14, -2.36), V(0.42, 0.7, -2.33)), M.glass);
    b.add(boxGeo(V(-0.45, 0.76, -2.36), V(0.35, 0.8, -2.3)), M.steel);
    for (const [bx, bz] of [[-0.33, -2.56], [0.23, -2.56], [-0.33, -2.8], [0.23, -2.8]] as const) {
      b.add(cyl(0.12, 0.03, 18), M.steel, at(bx, 0.975, bz));
      b.add(cyl(0.06, 0.04, 14), M.dark, at(bx, 0.99, bz));
    }
    for (const kx of [-0.45, -0.2, 0.05, 0.3]) b.add(cyl(0.035, 0.05, 10), M.red, at(kx, 0.84, -2.31).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
    // kettle on the front-right burner (spout toward the cook)
    b.add(cyl(0.11, 0.17, 18), M.red, at(0.23, 1.07, -2.56));
    b.add(cyl(0.03, 0.05, 10), M.dark, at(0.23, 1.18, -2.56));
    b.add(new THREE.CylinderGeometry(0.018, 0.03, 0.13, 8), M.red, at(0.34, 1.14, -2.56).multiply(new THREE.Matrix4().makeRotationZ(-0.7)));
    // hood + chimney
    b.add(boxGeo(V(-0.75, 1.7, -3.0), V(0.65, 1.98, -2.5)), M.steel);
    b.add(boxGeo(V(-0.25, 1.98, -3.0), V(0.15, 2.9, -2.8)), M.steel);
    // backsplash + uppers
    b.add(boxGeo(V(-3.4, 0.95, -3.0), V(3.4, 1.55, -2.97), 1.0), M.tile);
    for (let i = 0; i < 4; i++) b.add(boxGeo(V(-3.4 + 0.6 * i, 1.55, -3.0), V(-3.4 + 0.6 * (i + 1) - 0.01, 2.45, -2.65)), M.cabU);
    for (let i = 0; i < 2; i++) b.add(boxGeo(V(0.95 + 0.6 * i, 1.55, -3.0), V(0.95 + 0.6 * (i + 1) - 0.01, 2.45, -2.65)), M.cabU);
    // fridge
    b.add(boxGeo(V(2.25, 0, -3.0), V(3.2, 1.95, -2.25)), M.fridge);
    b.add(boxGeo(V(2.25, 1.28, -2.255), V(3.2, 1.31, -2.24)), M.dark);
    b.add(boxGeo(V(2.36, 1.38, -2.25), V(2.42, 1.85, -2.18)), M.steel);
    b.add(boxGeo(V(2.36, 0.55, -2.25), V(2.42, 1.1, -2.18)), M.steel);
    // counter things: jars, fruit bowl with apples
    b.add(cyl(0.09, 0.25, 16), M.jar1, at(-1.75, 1.075, -2.8));
    b.add(cyl(0.085, 0.3, 16), M.jar2, at(-1.5, 1.1, -2.8));
    b.add(cyl(0.09, 0.2, 16), M.jar3, at(-1.25, 1.05, -2.78));
    const bowl = new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    b.add(bowl, M.woodD, at(-2.7, 1.14, -2.65));
    for (const [ax, az] of [[-2.75, -2.62], [-2.65, -2.68], [-2.68, -2.58]] as const) b.add(new THREE.SphereGeometry(0.065, 12, 10), M.red, at(ax, 1.08, az));

    // ---- table, chairs, bowl, cereal box ----
    b.add(cyl(0.84, 0.06, 40), M.cloth, at(1.9, 0.75, 0.1));
    b.add(cyl(0.07, 0.72, 12), M.wood, at(1.9, 0.36, 0.1));
    b.add(cyl(0.3, 0.04, 20), M.wood, at(1.9, 0.02, 0.1));
    const chair = (cx: number, cz: number, face: number) => {
      const m = new THREE.Matrix4().makeRotationY(face);
      const put = (g: THREE.BufferGeometry, x: number, y: number, z: number) => b.add(g, M.wood, at(cx, 0, cz).multiply(m).multiply(at(x, y, z)));
      put(new THREE.BoxGeometry(0.46, 0.05, 0.46), 0, 0.46, 0);
      put(new THREE.BoxGeometry(0.46, 0.5, 0.05), 0, 0.74, -0.2);
      for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] as const) put(new THREE.BoxGeometry(0.05, 0.46, 0.05), lx, 0.23, lz);
    };
    chair(0.75, 0.2, Math.PI / 2); chair(3.05, 0.25, -Math.PI / 2); chair(1.9, -0.95, 0);
    b.add(bowl, M.white, at(1.9, 0.86, -0.4).multiply(new THREE.Matrix4().makeScale(0.8, 0.8, 0.8)));
    b.add(cyl(0.135, 0.01, 18), M.milk, at(1.9, 0.935, -0.4));
    b.add(boxGeo(V(2.4, 0.78, -0.4), V(2.62, 1.1, -0.28), 0), M.cereal);
    b.add(cyl(0.06, 0.1, 14), M.jar1, at(1.35, 0.83, 0.5)); // honey pot
    // pendant lamp
    b.add(cyl(0.012, 0.55, 6), M.dark, at(0.9, 2.62, -0.2));
    b.add(new THREE.CylinderGeometry(0.1, 0.3, 0.2, 24, 1, true), M.shade, at(0.9, 2.28, -0.2));
    b.build(R);
    const bulbM = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), bulb); bulbM.position.set(0.9, 2.2, -0.2); R.add(bulbM);

    // ---- window outside (unlit card) + warm light shaft ----
    const out = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4), new THREE.MeshBasicMaterial({ map: outside(), color: new THREE.Color(1.15, 1.15, 1.1) }));
    out.rotation.y = Math.PI / 2; out.position.set(-5.2, 2.6, -0.8); out.layers.set(NOINK); R.add(out);
    this.shaft(R);
  }

  /** soft additive sun shaft from the window to the floor along the sun rays */
  private shaft(R: THREE.Object3D) {
    const L = SUN.clone().negate(), z0 = -1.6, z1 = 0.0, y0 = 1.15, y1 = 2.35, x = -3.4;
    const corner = (z: number, y: number) => V(x, y, z);
    const hit = (p: THREE.Vector3) => p.clone().addScaledVector(L, p.y / -L.y);
    const c = [corner(z0, y0), corner(z1, y0), corner(z1, y1), corner(z0, y1)];
    const f = c.map(hit);
    const pos: number[] = [];
    const quadP = (a: THREE.Vector3, b2: THREE.Vector3, c2: THREE.Vector3, d: THREE.Vector3) => pos.push(...a.toArray(), ...b2.toArray(), ...c2.toArray(), ...a.toArray(), ...c2.toArray(), ...d.toArray());
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quadP(c[i], c[j], f[j], f[i]); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.82, 0.5), transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.layers.set(NOINK); m.frustumCulled = false; m.renderOrder = 4;
    R.add(m);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const L = LIGHTS.day;
    const c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 60; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    // fixed window sun, shadow fitted to the room
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const centre = V(0, 1.2, -0.2);
    this.sun.position.copy(centre).addScaledVector(SUN, 18); this.sun.target.position.copy(centre);
    const sc = this.sun.shadow.camera;
    sc.left = -5.2; sc.right = 5.2; sc.top = 5.2; sc.bottom = -5.2; sc.near = 4; sc.far = 40; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(0.05, 0.03, 0.0); TONE.uSat.value = 1.08;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    scene.fog = null; scene.background = new THREE.Color("#f1dcb4");
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(f, { pos: cam.position, right, sun: SUN });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.0, p.z), 1.8))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      a.mesh.scale.set(1, 1, 1);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
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
    void FPS; void Pen;
    return focus;
  }
}
