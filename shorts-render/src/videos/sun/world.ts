// Six painted sets in one scene: space (sun + earth), office (telegraph room), obs (Carrington's observatory), town (night + aurora),
// camp (miners in the Rockies), grid (modern city). update(f, camera, scene) poses lights, fire, aurora, blackout and the cast cards.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house } from "./build";
import { rep } from "./paint";
import { plaster, staves, snowTex, mudTex, auroraTex, earthTex, winTex, canvasTex, nightGround, floorBoards } from "./bpaint";
import { PRESETS, BG } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, hh } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, shotAt, ORG, SetName, lightOverride, T_BURN, T_BATT, T_REPLY, T_RED, T_OUT, T_SPARK, T_PAPER, clamp01, smooth } from "./story";

const cyl = (r: number, h: number, seg = 14, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
type Mats = Record<string, THREE.Material>;
const RADIUS: Record<SetName, number> = { space: 30, office: 12, obs: 12, town: 32, camp: 32, grid: 34 };
const DESKS = [-5, 0, 5];

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
  private auroras: { m: THREE.MeshBasicMaterial; kind: "g" | "r" }[] = [];
  private cablesOn!: THREE.Group; private cablesOff!: THREE.Group;
  private bwin: THREE.MeshLambertMaterial[] = []; private lit!: THREE.Texture; private dark!: THREE.Texture;
  private sunBall!: THREE.Mesh;

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.8);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(3072, 3072);
    R.add(this.hemi, this.sun, this.sun.target);

    M.snow = lam("sSnow", () => ({ map: rep(snowTex(), 10, 8) }));
    M.mud = lam("sMud", () => ({ map: rep(mudTex(), 30, 3) }));
    M.night = lam("sNightG", () => ({ map: rep(nightGround(), 8, 8) }));
    M.planks = lam("sFloorM", () => ({ map: floorBoards() }));
    M.wood = lam("sWood", () => ({ map: staves("sw", "#8a5a30", 4) }));
    M.beam = lam("sBeam", () => ({ map: staves("sb", "#4a3022", 3) }));
    M.panel = lam("sPanel", () => ({ map: staves("sp", "#7a4c2a", 10) }));
    M.plaster = lam("sPlaster", () => ({ map: plaster("sp", "#d8c8a0") }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#c8ccd4", shininess: 60 }), 0.15);
    M.brass = twoTone(new THREE.MeshPhongMaterial({ color: "#c8963a", specular: "#fff0b0", shininess: 70 }), 0.15);
    M.dark = lam("sDark", () => ({ color: "#1f1c22" }));
    M.white = lam("sWhite", () => ({ color: "#f4efe6" }));
    M.green = lam("sGreen", () => ({ color: "#2f7a3a" }));
    M.batt = lam("sBatt", () => ({ color: "#3a9a52" }));
    M.copper = lam("sCopper", () => ({ color: "#c8703a" }));
    M.rock = lam("sRock", () => ({ color: "#8e8ca4" }));
    M.rockSnow = lam("sRockSnow", () => ({ color: "#e8eaf6" }));
    M.road = lam("sRoad", () => ({ color: "#4a4658" }));
    M.pylon = lam("sPylon", () => ({ color: "#9aa0b4" }));
    M.earth = lam("sEarthM", () => ({ map: earthTex() }));
    M.tentA = lam("sTentA", () => ({ map: canvasTex("a", "#d8c8a0", "#b8a070") }));
    M.tentB = lam("sTentB", () => ({ map: canvasTex("b", "#c8553a", "#8a3a28") }));
    M.glass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.2, 0.3) });
    this.flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 2.4, 1.0) });
    this.lit = winTex("lit", true); this.dark = winTex("dark", false);
    for (const k of [0, 1, 2]) { const m = new THREE.MeshBasicMaterial({ map: this.lit }) as unknown as THREE.MeshLambertMaterial; this.bwin.push(m); }

    const b = new Batch();
    const bx = (set: SetName, mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => {
      const o = ORG[set]; b.add(boxGeo(V(a[0] + o[0], a[1] + o[1], a[2] + o[2]), V(c[0] + o[0], c[1] + o[1], c[2] + o[2]), tile, bottom), mat);
    };
    const put = (set: SetName, g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => {
      const o = ORG[set], m = at(x + o[0], y + o[1], z + o[2]); b.add(g, mat, rot ? m.multiply(rot) : m);
    };
    const flame = (set: SetName, x: number, y: number, z: number, s = 0.12) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), this.flameMat); m.scale.y = 1.5; m.position.set(ORG[set][0] + x, y, ORG[set][2] + z); m.layers.set(NOINK); R.add(m); this.flames.push(m); return m; };
    const room = (set: SetName, floor: THREE.Material) => {
      bx(set, floor, [-9, -0.2, -11], [9, 0, 5], 4.5);
      bx(set, M.panel, [-9, 0, -11.2], [9, 7, -11]); bx(set, M.panel, [-9.2, 0, -11], [-9, 7, 5]); bx(set, M.panel, [9, 0, -11], [9.2, 7, 5]);
      bx(set, M.beam, [-9, 7, -11.2], [9, 7.3, 5.2], 2, true);
    };
    const aurora = (set: SetName, z0: number) => {
      const mk = (key: string, rgb: string, kind: "g" | "r", dx: number, z: number, y: number, w: number, h: number, ry: number) => {
        const m = new THREE.MeshBasicMaterial({ map: auroraTex(key, rgb), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, opacity: 0 });
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(ORG[set][0] + dx, y, ORG[set][2] + z); p.rotation.y = ry; p.layers.set(NOINK); R.add(p); this.auroras.push({ m, kind });
      };
      mk("g1", "90,255,170", "g", -10, z0, 26, 120, 52, 0.25); mk("g2", "70,230,200", "g", 25, z0 - 15, 30, 110, 50, -0.3);
      mk("r1", "255,60,90", "r", 5, z0 - 6, 28, 130, 54, 0.1); mk("r2", "255,110,60", "r", -30, z0 - 20, 32, 110, 56, 0.35);
    };

    // =============== SPACE ===============
    this.sunBall = new THREE.Mesh(new THREE.SphereGeometry(26, 40, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.6, 2.6, 0.7) }));
    this.sunBall.position.set(-26, 6, -70); this.sunBall.layers.set(NOINK); R.add(this.sunBall);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(3, 40, 28), M.earth); earth.position.set(4, 0, -8); earth.rotation.set(0.3, 0.8, 0.1); R.add(earth);

    // =============== OFFICE: the telegraph room ===============
    room("office", M.planks);
    for (const x of DESKS) {
      bx("office", M.wood, [x - 1.6, 0, -6.5], [x + 1.6, 0.95, -4.8], 2);
      bx("office", M.iron, [x - 0.5, 0.95, -6.0], [x + 0.5, 1.25, -5.4]);          // the telegraph machine
      bx("office", M.brass, [x - 0.12, 1.25, -5.9], [x + 0.12, 1.34, -5.6]);       // the key
      bx("office", M.batt, [x + 1.1, 0.95, -5.9], [x + 1.45, 1.4, -5.55]); bx("office", M.copper, [x + 1.18, 1.4, -5.82], [x + 1.38, 1.5, -5.62]);
      bx("office", M.white, [x - 1.2, 0.95, -5.7], [x - 0.7, 0.97, -5.2]);         // a message paper
    }
    for (const x of [-7, 7]) { put("office", cyl(0.06, 2.6, 8), M.iron, x, 1.3, -8); flame("office", x, 2.8, -8, 0.16); }
    this.cablesOn = new THREE.Group(); this.cablesOff = new THREE.Group();
    for (const x of DESKS) {
      const on = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.04), M.dark); on.position.set(ORG.office[0] + x + 0.8, 1.3, -5.7); this.cablesOn.add(on);
      const off = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.04), M.dark); off.position.set(ORG.office[0] + x + 1.6, 0.98, -5.2); off.rotation.y = 0.5; this.cablesOff.add(off);
    }
    R.add(this.cablesOn, this.cablesOff);
    // =============== OBS: Carrington's observatory ===============
    room("obs", M.planks);
    bx("obs", M.white, [-4.5, 1.1, -8.1], [4.5, 7.0, -7.95]);                    // projection board
    bx("obs", M.beam, [-4.6, 1.0, -8.12], [4.6, 1.1, -7.93]); bx("obs", M.beam, [-4.6, 7.0, -8.12], [4.6, 7.1, -7.93]);
    bx("obs", M.wood, [-3.4, 0, -4.4], [-0.2, 0.95, -3.0], 2); bx("obs", M.white, [-2.7, 0.95, -4.1], [-1.2, 0.97, -3.4]); // table + paper
    put("obs", cyl(0.14, 3.6, 10), M.brass, 5.4, 2.4, -5, new THREE.Matrix4().makeRotationZ(0.55));
    put("obs", cyl(0.06, 1.6, 6), M.beam, 4.5, 0.8, -5); put("obs", cyl(0.06, 1.6, 6), M.beam, 6.0, 0.8, -5.4);
    bx("obs", M.iron, [4.6, 0.75, -5.4], [5.6, 0.95, -4.6]);
    for (const x of [-7.5, 7.5]) { put("obs", cyl(0.06, 2.6, 8), M.iron, x, 1.3, -9); flame("obs", x, 2.8, -9, 0.16); }

    // =============== TOWN ===============
    const gt = new THREE.Mesh(new THREE.PlaneGeometry(96, 200), M.night); gt.rotation.x = -Math.PI / 2; gt.position.set(ORG.town[0], 0, ORG.town[2] - 40); gt.receiveShadow = true; R.add(gt);
    bx("town", M.road, [-4.2, 0.01, -90], [4.2, 0.05, 30]);
    [[-11, -6, 0], [-11, -18, 1], [-11, -30, 2], [-11, 4, 3], [11, -10, 4], [11, -22, 5], [11, 2, 0], [-19, -12, 1], [19, -16, 2], [-18, -26, 3], [18, -30, 4]].forEach(([x, z, si]) => house(b, ORG.town[0] + x, ORG.town[2] + z, x < 0 ? Math.PI / 2 : -Math.PI / 2, 7, 6, 4.2, si));
    bx("town", M.plaster, [-1.6, 0, -37.6], [1.6, 11, -34.4], 3); bx("town", M.beam, [-2, 11, -38], [2, 11.6, -34]);   // clock tower
    for (const z of [-4, -14, -24]) for (const x of [-5.4, 5.4]) { put("town", cyl(0.07, 3.4, 6), M.iron, x, 1.7, z); flame("town", x, 3.5, z, 0.13); }
    aurora("town", -80);

    // =============== CAMP: miners in the Rockies ===============
    const gc = new THREE.Mesh(new THREE.PlaneGeometry(96, 200), M.snow); gc.rotation.x = -Math.PI / 2; gc.position.set(ORG.camp[0], 0, ORG.camp[2] - 30); gc.receiveShadow = true; R.add(gc);
    [[-10, -85, 36, 32], [30, -75, 32, 28], [60, -90, 28, 24], [0, -62, 20, 16], [-24, -72, 22, 20]].forEach(([x, z, r, h]) => { put("camp", cyl(r, h, 6, 0.5), M.rock, x, h / 2, z); put("camp", cyl(r * 0.36, h * 0.38, 6, 0.4), M.rockSnow, x, h * 0.82, z); });
    [[-7, 0, 0], [6.5, -1.5, 1], [2.5, 4, 0], [-4, 6.5, 1]].forEach(([x, z, k]) => put("camp", cyl(2.2, 2.6, 4, 0.1), k ? M.tentB : M.tentA, x, 1.3, z, new THREE.Matrix4().makeRotationY(0.8)));
    [[-14, -5], [14, -8], [-12, 8], [16, 6], [-18, -14], [20, -16]].forEach(([x, z]) => { put("camp", cyl(0.25, 1.2, 6), M.beam, x, 0.6, z); put("camp", cyl(1.8, 5, 8, 0.1), M.green, x, 3.4, z); });
    for (let i = 0; i < 4; i++) put("camp", cyl(0.14, 1.4, 6), M.beam, -0.4 + 0.25 * i, 0.15, -2.3, new THREE.Matrix4().makeRotationZ(1.4 - i * 0.2));
    flame("camp", 0, 0.7, -2.3, 0.35); flame("camp", 0.2, 0.9, -2.2, 0.22);
    aurora("camp", -90);

    // =============== GRID: a modern city ===============
    const gg = new THREE.Mesh(new THREE.PlaneGeometry(96, 200), M.night); gg.rotation.x = -Math.PI / 2; gg.position.set(ORG.grid[0], 0, ORG.grid[2] - 40); gg.receiveShadow = true; R.add(gg);
    bx("grid", M.road, [-5, 0.01, -90], [5, 0.05, 30]);
    let bi = 0;
    for (let k = 0; k < 11; k++) for (const sx of [-1, 1]) {
      const h = 7 + 12 * hh(k * 2 + (sx > 0 ? 1 : 0), 5), w = 5 + 3 * hh(k, 7), x0 = sx * (8 + 2 * hh(k, 9)), z0 = -k * 8.5 - 2;
      bx("grid", this.bwin[bi++ % 3], [x0 - w / 2, 0, z0 - 3.4], [x0 + w / 2, h, z0 + 3.4], 6);
    }
    for (let k = 0; k < 8; k++) { const z = -4 - 11 * k; for (const sx of [-1, 1]) { put("grid", cyl(0.12, 9, 6), M.pylon, sx * 5.8, 4.5, z); bx("grid", M.pylon, [sx * 5.8 - 1.4, 8.2, z - 0.06], [sx * 5.8 + 1.4, 8.4, z + 0.06]); } }
    for (const sx of [-4.4, 4.4]) bx("grid", M.dark, [sx - 0.02, 8.2, -92], [sx + 0.02, 8.26, 20]);
    b.build(R);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const sh = shotAt(f), ln = lightOverride(f, sh.id, sh.a) ?? sh.light, L = PRESETS[ln], t = f / 30, id = sh.id;
    const c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 340; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const SC: Record<SetName, [number, number]> = { space: [0, -8], office: [0, -3], obs: [0, -3], town: [0, -12], camp: [0, -4], grid: [0, -25] };
    const centre = V(ORG[sh.set][0] + SC[sh.set][0], 1.0, ORG[sh.set][2] + SC[sh.set][1]);   // fixed per set: no shadow swimming while the camera moves
    this.sun.position.copy(centre).addScaledVector(SUN, 40); this.sun.target.position.copy(centre);
    const Rr = RADIUS[sh.set], sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 4; sc.far = 120; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 6);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(0.05, 0.03, 0.0); TONE.uSat.value = 1.08;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const bg = BG[ln];
    if (bg.fog) { this.fog.color.set(bg.fog); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog; } else scene.fog = null;
    scene.background = new THREE.Color(bg.bg);

    const fk = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.3);
    this.flameMat.color.setRGB(3.6 * fk, 2.4 * fk, 1.0 * fk);
    this.flames.forEach((m, i) => { m.scale.set(1, 1.4 + 0.35 * Math.sin(t * 19 + i * 2.3), 1); });
    // aurora curtains: appear with the Sun's reply, turn blood red, ripple
    const green = smooth((t - T_REPLY) / 0.9), red = smooth((t - T_RED + 0.3) / 1.0);
    this.auroras.forEach((a, i) => { a.m.opacity = (a.kind === "g" ? green * (1 - 0.55 * red) : red) * (0.8 + 0.2 * Math.sin(t * 1.7 + i * 1.9)); });
    this.cablesOn.visible = sh.set === "office" && t < T_BATT; this.cablesOff.visible = sh.set === "office" && t >= T_BATT;
    // blackout: the lit windows go dark
    const tex = t >= T_OUT ? this.dark : this.lit;
    this.bwin.forEach((m) => { if (m.map !== tex) { m.map = tex; m.needsUpdate = true; } });
    this.sunBall.scale.setScalar(1 + 0.02 * Math.sin(t * 5));

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
    void hh; void clamp01; void smooth; void T_BURN; void T_SPARK; void T_PAPER;
    return focus;
  }
}
