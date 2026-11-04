// Two painted sets in one scene (60 m apart): the outback wheat farm (road, fence, wheat rows, windmill, army truck) and the ministry office.
// update(f, camera, scene) poses everything for frame f: lights, wheat rows (trampled), windmill, truck, ammo crates, and the cast cards from ccast.ts.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house } from "./build";
import { planksHD, rep } from "./paint";
import { plaster, staves, textSign, dirtTex, roadTex, wheatTex, corrTex, khakiTex, ausFlagTex, ammoTex } from "./bpaint";
import { PRESETS, BG } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, hh } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, shotAt, ORG, toW, SetName, T_ROUNDS, clamp01, smooth, truckChaseX } from "./story";

const cyl = (r: number, h: number, seg = 20, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
type Mats = Record<string, THREE.Material>;
const RADIUS: Record<SetName, number> = { farm: 30, office: 11 };
export const NROWS = 30;
export const rowZ = (i: number) => -4 - 1.7 * i;

export type TruckPose = { x: number; z: number; yaw: number; visible: boolean; gun: boolean; bounce: number; wheel: number };
/** the army truck per shot (set-local); ccast puts the soldiers on it */
export const truckPose = (id: number, t: number): TruckPose => {
  const off: TruckPose = { x: 0, z: 0, yaw: 0, visible: false, gun: false, bounce: 0, wheel: 0 };
  if (id === 1) { const x = truckChaseX(t); return { x, z: -5.2, yaw: Math.PI, visible: true, gun: true, bounce: 0.06 * Math.sin(t * 26), wheel: -x * 1.8 }; }
  if (id === 2) return { x: 0, z: -6.0, yaw: 0, visible: true, gun: true, bounce: 0, wheel: 0 };
  if (id === 9) return { x: 0, z: -2.8, yaw: 0, visible: true, gun: t >= 29.7, bounce: 0, wheel: 0 };
  if (id === 10) { const x = -12 + 4.2 * (t - 31.4); return { x, z: -4.2, yaw: 0, visible: true, gun: true, bounce: 0.07 * Math.sin(t * 22), wheel: x * 1.8 }; }
  if (id === 11) { const z = 5 - 4.4 * (t - 34.4); return { x: 0, z, yaw: Math.PI / 2, visible: true, gun: true, bounce: 0.04 * Math.sin(t * 20), wheel: -z * 1.8 }; }
  return off;
};
/** one emu's run phase etc. live in ccast; the herd speeds are in story.ts */

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#cfe0ef", 45, 160);
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private rows: THREE.Mesh[] = []; private rotor!: THREE.Group; private truck!: THREE.Group; private wheels: THREE.Mesh[] = []; private gun!: THREE.Group; private crates!: THREE.Group;

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.8);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(3072, 3072);
    R.add(this.hemi, this.sun, this.sun.target);

    M.planks = lam("planksHD", () => ({ map: planksHD() }));
    M.dirt = lam("eDirt", () => ({ map: rep(dirtTex(), 46, 34) }));
    M.road = lam("eRoad", () => ({ map: roadTex() }));
    M.wheat = lam("eWheat", () => ({ map: rep(wheatTex(), 30, 1) }));
    M.wood = lam("eWood", () => ({ map: staves("ew", "#9a6a3a", 4) }));
    M.beam = lam("eBeam", () => ({ map: staves("eb", "#5a3a22", 3) }));
    M.wallW = lam("eWallW", () => ({ map: staves("eww", "#8a5a30", 10) }));
    M.plaster = lam("ePlaster", () => ({ map: plaster("e", "#e6d3a4") }));
    M.tank = lam("eTank", () => ({ map: corrTex("#9aa4a8") }));
    M.roofC = lam("eRoofC", () => ({ map: corrTex("#a85a3a") }));
    M.khaki = lam("eKhaki", () => ({ map: khakiTex() }));
    M.khakiD = lam("eKhakiD", () => ({ color: "#4a4a2a" }));
    M.ammo = lam("eAmmo", () => ({ map: ammoTex() }));
    M.dark = lam("eDark", () => ({ color: "#1f1c22" }));
    M.glass = new THREE.MeshBasicMaterial({ color: "#2a3f6a" });
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#c8ccd4", shininess: 60 }), 0.15);
    M.tyre = lam("eTyre", () => ({ color: "#26242a" }));
    M.towerM = lam("eTower", () => ({ color: "#b8a890" }));
    M.hill = lam("eHill", () => ({ color: "#b0603a" }));
    M.leaf = lam("eLeaf", () => ({ color: "#6e8a4a" }));
    M.red = lam("eRed", () => ({ color: "#8a2a30" }));
    M.paper = lam("ePaper", () => ({ color: "#f2ead2" }));
    M.aus = new THREE.MeshBasicMaterial({ map: ausFlagTex() });
    M.window = new THREE.MeshBasicMaterial({ color: "#7fb4e8" });
    M.glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.5, 1.4) });

    const b = new Batch();
    const bx = (set: SetName, mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => {
      const o = ORG[set]; b.add(boxGeo(V(a[0] + o[0], a[1] + o[1], a[2] + o[2]), V(c[0] + o[0], c[1] + o[1], c[2] + o[2]), tile, bottom), mat);
    };
    const put = (set: SetName, g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => {
      const o = ORG[set], m = at(x + o[0], y + o[1], z + o[2]); b.add(g, mat, rot ? m.multiply(rot) : m);
    };

    // =============== FARM ===============
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(420, 300), M.dirt); gr.rotation.x = -Math.PI / 2; gr.position.set(ORG.farm[0], 0, ORG.farm[2] - 100); gr.receiveShadow = true; R.add(gr);
    bx("farm", M.road, [-100, -0.02, 4], [100, 0.04, 11], 24);
    for (let x = -48; x <= 48; x += 3) bx("farm", M.wood, [x - 0.07, 0, 1.93], [x + 0.07, 1.3, 2.07]);      // fence posts and rails
    bx("farm", M.wood, [-48, 0.5, 1.96], [48, 0.56, 2.04]); bx("farm", M.wood, [-48, 1.0, 1.96], [48, 1.06, 2.04]);
    for (let i = 0; i < NROWS; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(90, 1, 0.8), M.wheat); m.position.set(ORG.farm[0], 0.4, ORG.farm[2] + rowZ(i)); m.castShadow = true; R.add(m); this.rows.push(m); }
    house(b, ORG.farm[0] + 24, ORG.farm[2] - 12, -Math.PI / 2, 8, 7, 4.6, 3, 0);                            // farmhouse
    put("farm", cyl(1.7, 3.4, 20), M.tank, 31, 1.7, -12); put("farm", new THREE.ConeGeometry(1.9, 0.9, 20), M.roofC, 31, 3.85, -12);   // water tank
    put("farm", cyl(0.25, 9, 8, 0.85), M.towerM, -20, 4.5, -14);                                                   // windmill tower
    for (const [x, z, s] of [[-34, -30, 1.2], [38, -40, 1.4], [-48, -14, 1.0], [46, -20, 1.1]] as const) { put("farm", cyl(0.25, 5 * s, 8), M.beam, x, 2.5 * s, z); put("farm", new THREE.SphereGeometry(2.4 * s, 12, 10), M.leaf, x, 5.6 * s, z); }
    for (let i = 0; i < 9; i++) put("farm", new THREE.ConeGeometry(26 + 10 * hh(i, 1), 9 + 5 * hh(i, 2), 6), M.hill, -150 + i * 38, 4, -150 - 14 * hh(i, 3));
    b.build(R);
    this.rotor = new THREE.Group(); this.rotor.position.set(ORG.farm[0] - 20, 9.2, ORG.farm[2] - 13.1);
    for (let i = 0; i < 8; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.1, 0.05), M.paper); bl.position.set(Math.cos((i / 8) * Math.PI * 2) * 1.3, Math.sin((i / 8) * Math.PI * 2) * 1.3, 0); bl.rotation.z = (i / 8) * Math.PI * 2 - Math.PI / 2; this.rotor.add(bl); }
    R.add(this.rotor);
    // army truck (group, +x is forward)
    this.truck = new THREE.Group();
    const tb = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; this.truck.add(o); return o; };
    tb(new THREE.BoxGeometry(4.6, 0.5, 2.0), M.khakiD, 0, 0.95, 0);
    tb(new THREE.BoxGeometry(1.7, 1.5, 2.0), M.khaki, 1.5, 1.95, 0); tb(new THREE.BoxGeometry(0.08, 0.7, 1.7), M.glass, 2.36, 2.3, 0);
    for (const sz of [-1, 1]) tb(new THREE.BoxGeometry(2.9, 0.55, 0.1), M.khaki, -0.9, 1.5, sz * 0.95);
    tb(new THREE.BoxGeometry(0.1, 0.55, 2.0), M.khaki, -2.3, 1.5, 0);
    for (const [wx, wz] of [[-1.4, 1.0], [-1.4, -1.0], [1.5, 1.0], [1.5, -1.0]] as const) { const w = tb(new THREE.CylinderGeometry(0.55, 0.55, 0.36, 18), M.tyre, wx, 0.55, wz * 1.06); w.rotation.x = Math.PI / 2; this.wheels.push(w); }
    this.gun = new THREE.Group(); this.gun.position.set(-0.9, 1.75, 0);
    const gm = (g: THREE.BufferGeometry, x: number, y: number, z: number, rz = 0, ry = 0) => { const o = new THREE.Mesh(g, M.iron); o.position.set(x, y, z); o.rotation.set(0, ry, rz); this.gun.add(o); };
    gm(cyl(0.05, 1.6, 8), 0, 0, 0, Math.PI / 2, 0); gm(cyl(0.22, 0.14, 14), -0.1, 0.22, 0); gm(cyl(0.03, 1.0, 6), -0.4, -0.45, 0.4); gm(cyl(0.03, 1.0, 6), -0.4, -0.45, -0.4);
    this.truck.add(this.gun); this.truck.visible = false; R.add(this.truck);
    this.crates = new THREE.Group();
    [[0, 0.4, 0], [0.9, 0.4, 0.2], [0.4, 1.2, 0.1], [-0.9, 0.4, -0.1]].forEach(([x, y, z], i) => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.8, 0.8), M.ammo); c.position.set(x, y, z); c.rotation.y = 0.2 * i; c.castShadow = true; this.crates.add(c); });
    this.crates.position.set(ORG.farm[0] + 8.6, 0, ORG.farm[2] + 6.2); this.crates.visible = false; R.add(this.crates);

    // =============== OFFICE ===============
    const b2 = new Batch();
    const ox = (mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => { const o = ORG.office; b2.add(boxGeo(V(a[0] + o[0], a[1], a[2] + o[2]), V(c[0] + o[0], c[1], c[2] + o[2]), tile, bottom), mat); };
    ox(M.planks, [-9, -0.2, -11], [9, 0, 5], 3);
    ox(M.wallW, [-9, 0, -11.2], [9, 7, -11]); ox(M.wallW, [-9.2, 0, -11], [-9, 7, 5]); ox(M.wallW, [9, 0, -11], [9.2, 7, 5]);
    ox(M.beam, [-9, 7, -11.2], [9, 7.3, 5.2], 2, true);
    ox(M.window, [-8.95, 1.8, -8], [-8.85, 5.6, -3.5]); ox(M.beam, [-8.9, 3.7, -8.05], [-8.8, 3.8, -3.45]); ox(M.beam, [-8.9, 1.8, -5.8], [-8.8, 5.6, -5.7]);
    ox(M.wood, [-3.4, 0, -6.4], [3.4, 1.05, -4.6], 2); ox(M.beam, [-3.5, 1.05, -6.5], [3.5, 1.14, -4.5], 2);   // the minister's desk
    ox(M.red, [-0.8, 0, -8.2], [0.8, 0.48, -7.0]); ox(M.beam, [-0.9, 0.48, -8.4], [0.9, 2.9, -8.25]);
    ox(M.paper, [-1.2, 1.14, -5.8], [0.2, 1.16, -5.0]);
    b2.add(new THREE.SphereGeometry(0.2, 12, 10), M.glow, new THREE.Matrix4().makeTranslation(ORG.office[0] - 2.2, 1.55, ORG.office[2] - 5.4));
    b2.build(R);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), M.aus); flag.position.set(ORG.office[0], 4.2, ORG.office[2] - 10.95); flag.layers.set(NOINK); R.add(flag);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.0), new THREE.MeshBasicMaterial({ map: textSign("minst", 1024, 256, ["MINISTRY OF DEFENCE"], "#2f3a34", "#f2ead2") })); sign.position.set(ORG.office[0], 5.9, ORG.office[2] - 10.94); sign.layers.set(NOINK); R.add(sign);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private rowHeight(id: number, t: number, i: number) {
    if (id <= 3) return 0.8;
    if (id === 4) { const front = NROWS - 1 - Math.max(0, (t - 12.9) * 7); return i >= front ? 0.22 : 0.8; }
    if (id === 13 || id === 14) return 0.2;
    return 0.42;
  }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const sh = shotAt(f), L = PRESETS[sh.light], t = f / 30, id = sh.id;
    const c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 300; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const centre = V(...toW(sh.set, sh.set === "farm" ? [c.look[0] - ORG.farm[0], 1.2, -4] : [0, 1.2, -4]));
    this.sun.position.copy(centre).addScaledVector(SUN, 40); this.sun.target.position.copy(centre);
    const Rr = RADIUS[sh.set], sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 4; sc.far = 110; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 6);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(0.05, 0.03, 0.0); TONE.uSat.value = 1.08;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const bg = BG[sh.light];
    if (bg.fog) { this.fog.color.set(bg.fog); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog; } else scene.fog = null;
    scene.background = new THREE.Color(bg.bg);

    this.rows.forEach((m, i) => { const h = this.rowHeight(id, t, i); m.scale.y = h; m.position.y = h / 2; m.visible = sh.set === "farm"; });
    this.rotor.rotation.z = -t * 1.1;
    const tp = truckPose(id, t);
    this.truck.visible = tp.visible && sh.set === "farm";
    if (this.truck.visible) {
      this.truck.position.set(ORG.farm[0] + tp.x, tp.bounce, ORG.farm[2] + tp.z); this.truck.rotation.y = tp.yaw;
      this.wheels.forEach((w) => { w.rotation.y = tp.wheel; }); this.gun.visible = tp.gun;
    }
    this.crates.visible = id === 7; const cp = smooth((t - T_ROUNDS) / 0.25); this.crates.scale.setScalar(Math.max(0.001, cp));

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
    return focus;
  }
}
