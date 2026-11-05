// Three painted sets in one scene (60 m apart): the church (nave, dais, throne), the night set (graveyard + the Tiber embankment), the prison cell.
// update(f, camera, scene) poses everything for frame f: lights, candle/torch flicker, the carried throne (hook), the dying cell lamp, and the cast cards from ccast.ts.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "./build";
import { rep } from "./paint";
import { plaster, staves, carpet, floorTile, harborTex, nightGround, stoneBlocks, stainedTex, strawTex } from "./bpaint";
import { PRESETS, BG } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, hh } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, shotAt, ORG, toW, SetName, T_ALIVE, throneX, clamp01, smooth } from "./story";

const cyl = (r: number, h: number, seg = 18, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
type Mats = Record<string, THREE.Material>;
const RADIUS: Record<SetName, number> = { church: 18, night: 22, cell: 8 };
export const THRONE_Z = -16.4;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#cfe0ef", 45, 160);
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private flames: THREE.Mesh[] = []; private flameMat!: THREE.MeshBasicMaterial; private cellLamp!: THREE.MeshBasicMaterial; private carried!: THREE.Group;

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.8);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(3072, 3072);
    R.add(this.hemi, this.sun, this.sun.target);

    M.tile = lam("cTile", () => ({ map: rep(floorTile(), 8, 10) }));
    M.carpet = lam("cCarpet", () => ({ map: rep(carpet(), 1, 5) }));
    M.plaster = lam("cPlaster", () => ({ map: plaster("c", "#e0c8a8") }));
    M.stone = lam("cStoneW", () => ({ map: rep(stoneBlocks("a", "#8a8a96"), 3, 2) }));
    M.stoneD = lam("cStoneD", () => ({ map: rep(stoneBlocks("d", "#5a5a68"), 4, 2) }));
    M.col = lam("cCol", () => ({ map: rep(stoneBlocks("c", "#b8b0a0"), 1, 4) }));
    M.wood = lam("cWood", () => ({ map: staves("cw", "#7a4c2a", 6) }));
    M.beam = lam("cBeam", () => ({ map: staves("cb", "#4a3022", 3) }));
    M.gold = twoTone(new THREE.MeshPhongMaterial({ color: "#e8b83a", specular: "#fff1b0", shininess: 55 }), 0.2);
    M.red = lam("cRed", () => ({ color: "#8a2a30" }));
    M.dark = lam("cDark", () => ({ color: "#1f1c22" }));
    M.void = new THREE.MeshBasicMaterial({ color: "#07060a" });
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#c8ccd4", shininess: 60 }), 0.15);
    M.ground = lam("cGround", () => ({ map: rep(nightGround(), 40, 30) }));
    M.soil = lam("cSoil", () => ({ color: "#4a3a30" }));
    M.water = twoTone(new THREE.MeshLambertMaterial({ map: rep(harborTex(), 20, 14) }), 0.3);
    M.straw = lam("cStrawM", () => ({ map: strawTex() }));
    this.flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 2.4, 1.0) });
    this.cellLamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.4, 1.2) });
    M.moon = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 4.2, 3.8) });
    const glass = (k: string, a: string, bb: string) => new THREE.MeshBasicMaterial({ map: stainedTex(k, a, bb) });
    const glassM = [glass("b", "#2a4aa0", "#8ab4ff"), glass("r", "#a02a38", "#ff9a8a"), glass("g", "#c89a2a", "#fff0a0")];

    const b = new Batch();
    const bx = (set: SetName, mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => {
      const o = ORG[set]; b.add(boxGeo(V(a[0] + o[0], a[1] + o[1], a[2] + o[2]), V(c[0] + o[0], c[1] + o[1], c[2] + o[2]), tile, bottom), mat);
    };
    const put = (set: SetName, g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => {
      const o = ORG[set], m = at(x + o[0], y + o[1], z + o[2]); b.add(g, mat, rot ? m.multiply(rot) : m);
    };
    const flame = (set: SetName, x: number, y: number, z: number, s = 0.16) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), this.flameMat); m.scale.y = 1.5; m.position.set(ORG[set][0] + x, y, ORG[set][2] + z); m.layers.set(NOINK); R.add(m); this.flames.push(m); };

    // =============== CHURCH ===============
    bx("church", M.tile, [-12, -0.2, -28], [12, 0, 12], 4);
    bx("church", M.carpet, [-1.8, 0, -20], [1.8, 0.03, 12], 4);
    bx("church", M.plaster, [-12, 0, -28.2], [12, 16, -28]); bx("church", M.plaster, [-12.2, 0, -28], [-12, 16, 12]); bx("church", M.plaster, [12, 0, -28], [12.2, 16, 12]);
    bx("church", M.beam, [-12, 16, -28], [12, 16.3, 12], 2, true);
    for (let i = 0; i < 6; i++) { bx("church", M.beam, [-12, 14.2, -26 + i * 6.4], [12, 15, -25.4 + i * 6.4], 2); }
    for (const x of [-7, 7]) for (let i = 0; i < 7; i++) put("church", cyl(0.7, 13, 20), M.col, x, 6.5, -24 + i * 5.6);
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {                                           // stained glass windows on both side walls
      const z = -21 + i * 6.2, gm = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 7.2), glassM[(i + (sx > 0 ? 1 : 0)) % 3]);
      gm.position.set(ORG.church[0] + sx * 11.95, 8.2, ORG.church[2] + z); gm.rotation.y = -sx * Math.PI / 2; gm.layers.set(NOINK); R.add(gm);
      bx("church", M.beam, [sx > 0 ? 11.88 : -12.02, 4.4, z - 1.5], [sx > 0 ? 12.02 : -11.88, 4.7, z + 1.5]);
    }
    bx("church", M.stone, [-4.4, 0, -21], [4.4, 0.3, -13.2], 3); bx("church", M.stone, [-3.4, 0.3, -20], [3.4, 0.6, -14.0], 3); bx("church", M.stone, [-2.6, 0.6, -19], [2.6, 0.95, -14.6], 3);   // dais steps
    bx("church", M.red, [-0.85, 0.95, -17.2], [0.85, 1.3, -15.7]); bx("church", M.gold, [-1.0, 1.3, -17.5], [1.0, 4.4, -17.3]); bx("church", M.red, [-0.8, 1.3, -17.3], [0.8, 4.2, -17.2]);
    bx("church", M.gold, [-1.15, 0.95, -17.2], [-0.9, 2.0, -15.7]); bx("church", M.gold, [0.9, 0.95, -17.2], [1.15, 2.0, -15.7]);                                   // throne arms
    bx("church", M.wood, [-3, 0, -27.2], [3, 1.3, -25.8], 2); bx("church", M.gold, [-0.12, 1.3, -26.6], [0.12, 4.3, -26.4]); bx("church", M.gold, [-1.0, 3.2, -26.6], [1.0, 3.45, -26.4]);   // altar + cross
    bx("church", M.wood, [-4.6, 0, -13.0], [-3.2, 1.25, -11.6], 2); bx("church", M.beam, [-4.7, 1.25, -13.1], [-3.1, 1.4, -11.5], 2);                                         // lectern
    for (const x of [-4.2, 4.2]) for (const z of [-11, -6, -1]) { put("church", cyl(0.07, 2.4, 8), M.iron, x, 1.2, z); put("church", cyl(0.2, 0.3, 10), M.gold, x, 2.45, z); flame("church", x, 2.8, z, 0.13); }
    for (const x of [-2.6, 2.6]) { put("church", cyl(0.07, 2.8, 8), M.iron, x, 1.4, -26.4); flame("church", x, 3.0, -26.4, 0.14); }

    // =============== NIGHT: graveyard + the Tiber ===============
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(260, 140), M.ground); gr.rotation.x = -Math.PI / 2; gr.position.set(ORG.night[0], 0, ORG.night[2] - 6); gr.receiveShadow = true; R.add(gr);
    for (let i = 0; i < 18; i++) {
      const x = -16 + 32 * hh(i, 1), z = -11 + 14 * hh(i, 2), h = 0.9 + 0.8 * hh(i, 3);
      if (Math.abs(x) < 3.4 && z < -2.2 && z > -7.5) continue;
      put("night", new THREE.BoxGeometry(0.9, h, 0.28), M.stoneD, x, h / 2, z, new THREE.Matrix4().makeRotationZ((hh(i, 4) - 0.5) * 0.25));
      if (i % 3 === 0) put("night", new THREE.BoxGeometry(0.7, 0.14, 0.24), M.stoneD, x, h * 0.72, z);
    }
    bx("night", M.void, [-1.2, -0.04, -6.4], [1.2, 0.01, -3.2]);                                  // the open grave
    bx("night", M.soil, [1.2, 0, -6.2], [2.7, 0.5, -3.4]); bx("night", M.soil, [-2.7, 0, -6.2], [-1.2, 0.34, -3.6]);
    for (const [x, z, s] of [[-12, -8, 1.2], [12, -7, 1.3], [15, 1, 1.0], [-16, 0, 1.1]] as const) { put("night", cyl(0.2, 5 * s, 7), M.beam, x, 2.5 * s, z); for (let k = 0; k < 4; k++) put("night", cyl(0.06, 2.4 * s, 5), M.beam, x + (k - 1.5) * 0.7 * s, 5 * s + 0.6, z, new THREE.Matrix4().makeRotationZ((k - 1.5) * 0.5)); }
    for (const [x, z] of [[-4.5, -1.5], [4.5, -1.8], [-3, -9], [3.5, -9.5]] as const) { put("night", cyl(0.06, 2.4, 6), M.iron, x, 1.2, z); flame("night", x, 2.55, z, 0.16); }
    bx("night", M.stone, [-60, -4, -15.2], [60, 0.95, -14.7], 4);                                 // embankment parapet
    bx("night", M.stone, [-60, -4, -14.7], [60, -0.05, -14.2], 4);
    const wt = new THREE.Mesh(new THREE.PlaneGeometry(260, 110), M.water); wt.rotation.x = -Math.PI / 2; wt.position.set(ORG.night[0], -3.0, ORG.night[2] - 70); R.add(wt);
    for (let i = -5; i <= 5; i++) bx("night", M.stone, [i * 11 - 1.2, -3, -47], [i * 11 + 1.2, 2.2, -43]);
    bx("night", M.stone, [-70, 2.2, -47.4], [70, 3.0, -42.6]);
    bx("night", M.stoneD, [6.6, 0, -5.8], [9.4, 0.95, -4.4], 3); bx("night", M.stone, [6.4, 0.95, -5.9], [9.6, 1.12, -4.3], 3); bx("night", M.stoneD, [7.8, 1.12, -5.3], [8.2, 2.3, -5.0]); bx("night", M.stoneD, [7.3, 1.75, -5.3], [8.7, 2.0, -5.0]);   // the tomb with a cross
    const moon = new THREE.Mesh(new THREE.SphereGeometry(4.2, 20, 16), M.moon); moon.position.set(ORG.night[0] - 18, 34, ORG.night[2] - 80); moon.layers.set(NOINK); R.add(moon);

    // =============== CELL ===============
    bx("cell", M.stoneD, [-4.5, -0.2, -9], [4.5, 0, 2.2], 4); bx("cell", M.straw, [-3.6, 0, -7.8], [-0.6, 0.18, -4.4], 2);
    bx("cell", M.stone, [-4.5, 0, -9.2], [4.5, 5, -9]); bx("cell", M.stone, [-4.7, 0, -9], [-4.5, 5, 2.2]); bx("cell", M.stone, [4.5, 0, -9], [4.7, 5, 2.2]);
    bx("cell", M.stoneD, [-4.5, 5, -9.2], [4.5, 5.3, 2.4], 2, true);
    for (let i = 0; i < 21; i++) bx("cell", M.iron, [-4.5 + i * 0.45 - 0.05, 0, 1.15], [-4.5 + i * 0.45 + 0.05, 4.8, 1.25]);
    bx("cell", M.iron, [-4.5, 1.2, 1.12], [4.5, 1.32, 1.28]); bx("cell", M.iron, [-4.5, 3.4, 1.12], [4.5, 3.52, 1.28]);
    bx("cell", M.void, [1.2, 2.8, -9.0], [3.2, 4.4, -8.9]);
    put("cell", new THREE.SphereGeometry(0.22, 12, 10), this.cellLamp, -3.4, 3.4, -8.6);
    b.build(R);

    // the carried throne (hook A)
    this.carried = new THREE.Group();
    const cm = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; this.carried.add(o); };
    cm(new THREE.BoxGeometry(1.5, 0.35, 1.3), M.red, 0, 0.9, 0); cm(new THREE.BoxGeometry(1.7, 2.1, 0.2), M.gold, 0, 2.0, -0.55); cm(new THREE.BoxGeometry(1.4, 1.8, 0.1), M.red, 0, 1.95, -0.43);
    cm(new THREE.BoxGeometry(3.4, 0.1, 0.1), M.wood, 0, 0.55, 0.5); cm(new THREE.BoxGeometry(3.4, 0.1, 0.1), M.wood, 0, 0.55, -0.5);
    this.carried.visible = false; R.add(this.carried);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const sh = shotAt(f), L = PRESETS[sh.light], t = f / 30, id = sh.id;
    const c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 300; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const centre = V(...toW(sh.set, [sh.set === "night" ? c.look[0] - ORG.night[0] : 0, 1.2, sh.set === "church" ? -12 : -4]));
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

    const fk = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.3);
    this.flameMat.color.setRGB(3.6 * fk, 2.4 * fk, 1.0 * fk);
    this.flames.forEach((m, i) => { m.scale.set(1, 1.4 + 0.35 * Math.sin(t * 19 + i * 2.3), 1); });
    const fade = id === 16 ? 1 - smooth((t - (T_ALIVE - 0.4)) / 0.5) : 1;
    this.cellLamp.color.setRGB(3.4 * fade * fk, 2.4 * fade * fk, 1.2 * fade * fk);
    this.carried.visible = id === 1 && t >= 0.95;
    if (this.carried.visible) { const x = throneX(t); this.carried.position.set(ORG.night[0] + x, 0.1 + 0.05 * Math.sin(t * 9), ORG.night[2] - 4.8 + 1.4 * clamp01(t - 1.0)); }

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
