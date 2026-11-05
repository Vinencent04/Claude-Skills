// Three painted sets in one scene (60 m apart): Strasbourg's square (cobbles, half-timbered houses, church), the guildhall (the stage that is built and torn down, disco ball), the hill shrine (stairs + chapel).
// update(f, camera, scene) poses everything for frame f: lights (shot 2 is a day-night time-lapse), stage growth, lanterns/torches flicker, disco ball, sunrise, and the cast cards from ccast.ts.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house } from "./build";
import { rep, cobbleHD, planksHD, grassHD } from "./paint";
import { plaster, staves, stoneBlocks } from "./bpaint";
import { PRESETS, BG } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, hh } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, shotAt, ORG, toW, SetName, lightOverride, T_STAGE, T_MUSIC, T_TEAR, clamp01, smooth } from "./story";

const cyl = (r: number, h: number, seg = 18, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
type Mats = Record<string, THREE.Material>;
const RADIUS: Record<SetName, number> = { street: 34, guild: 16, shrine: 24 };
export const NSTEPS = 34;
/** height of the shrine stairs at set-local z (stairs run from z=10 at y=0 up to z=-24) */
export const stairY = (z: number) => Math.max(0, Math.min(NSTEPS, 10 - z)) * 0.22;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#cfe0ef", 45, 160);
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private flames: THREE.Mesh[] = []; private flameMat!: THREE.MeshBasicMaterial; private stageM!: THREE.Mesh; private ball!: THREE.Group; private beams: THREE.Mesh[] = []; private sunDisc!: THREE.Mesh;

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.8);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(3072, 3072);
    R.add(this.hemi, this.sun, this.sun.target);

    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.planks = lam("planksHD", () => ({ map: planksHD() }));
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.plaster = lam("dPlaster", () => ({ map: plaster("d", "#e8d8b4") }));
    M.timber = lam("dTimber", () => ({ map: staves("dt", "#6a4426", 8) }));
    M.wood = lam("dWood", () => ({ map: staves("dw", "#9a6a3a", 5) }));
    M.beam = lam("dBeam", () => ({ map: staves("db", "#4a3022", 3) }));
    M.stone = lam("dStone", () => ({ map: rep(stoneBlocks("ds", "#9a9aa4"), 3, 2) }));
    M.stoneD = lam("dStoneD", () => ({ map: rep(stoneBlocks("dsd", "#6a6a78"), 3, 2) }));
    M.roof = lam("dRoof", () => ({ color: "#8a4a3a" }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#c8ccd4", shininess: 60 }), 0.15);
    M.dark = lam("dDark", () => ({ color: "#1f1c22" }));
    M.leaf = lam("dLeaf", () => ({ color: "#5a8a4a" }));
    M.hill = lam("dHill", () => ({ color: "#7a9a6a" }));
    M.mount = lam("dMount", () => ({ color: "#8a8aa4" }));
    M.red = lam("dRed", () => ({ color: "#a02a38" }));
    M.blue = lam("dBlue", () => ({ color: "#2a4a9a" }));
    M.gold = twoTone(new THREE.MeshPhongMaterial({ color: "#e8b83a", specular: "#fff1b0", shininess: 55 }), 0.2);
    this.flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 2.4, 1.0) });
    M.ballM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.6, 3.0) });

    const b = new Batch();
    const bx = (set: SetName, mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => {
      const o = ORG[set]; b.add(boxGeo(V(a[0] + o[0], a[1] + o[1], a[2] + o[2]), V(c[0] + o[0], c[1] + o[1], c[2] + o[2]), tile, bottom), mat);
    };
    const put = (set: SetName, g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => {
      const o = ORG[set], m = at(x + o[0], y + o[1], z + o[2]); b.add(g, mat, rot ? m.multiply(rot) : m);
    };
    const flame = (set: SetName, x: number, y: number, z: number, s = 0.16) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), this.flameMat); m.scale.y = 1.5; m.position.set(ORG[set][0] + x, y, ORG[set][2] + z); m.layers.set(NOINK); R.add(m); this.flames.push(m); };

    // =============== STREET: Strasbourg's square ===============
    bx("street", M.cobble, [-44, -0.2, -52], [44, 0, 26], 4);
    for (let i = 0; i < 5; i++) { house(b, ORG.street[0] - 14, ORG.street[2] - 26 + i * 8.2, Math.PI / 2, 7.4, 6.6, 7.4 + (i % 3) * 1.4, i, 0); house(b, ORG.street[0] + 14, ORG.street[2] - 26 + i * 8.2, -Math.PI / 2, 7.4, 6.6, 7.4 + ((i + 1) % 3) * 1.4, i + 5, 0); }
    for (let i = 0; i < 6; i++) house(b, ORG.street[0] - 20 + i * 8, ORG.street[2] - 32, 0, 7.4, 6.6, 8 + (i % 3) * 1.3, i + 2, 0);
    bx("street", M.stone, [-26, 0, -48], [-18, 22, -40], 3); put("street", new THREE.ConeGeometry(6.4, 8, 4), M.roof, -22, 26, -44, new THREE.Matrix4().makeRotationY(Math.PI / 4));   // church tower
    put("street", cyl(1.3, 1.0, 16), M.stone, -7, 0.5, -13); put("street", cyl(1.0, 0.2, 16), M.dark, -7, 1.05, -13);                                                  // well
    for (const [x, z] of [[-9, 2], [9, 2], [-10, -20], [10, -20]] as const) { put("street", cyl(0.07, 3.6, 8), M.iron, x, 1.8, z); flame("street", x, 3.8, z, 0.2); }
    for (const [x, z, s] of [[-30, -10, 1.3], [32, -16, 1.2], [-34, -26, 1.0]] as const) { put("street", cyl(0.3, 4.5 * s, 7), M.beam, x, 2.2 * s, z); put("street", new THREE.SphereGeometry(3 * s, 12, 10), M.leaf, x, 6 * s, z); }

    // =============== GUILD: the hall, the stage (animated), the disco ball ===============
    bx("guild", M.planks, [-11, -0.2, -19], [11, 0, 9], 3);
    bx("guild", M.timber, [-11, 0, -19.2], [11, 9, -19]); bx("guild", M.timber, [-11.2, 0, -19], [-11, 9, 9]); bx("guild", M.timber, [11, 0, -19], [11.2, 9, 9]);
    bx("guild", M.beam, [-11, 9, -19], [11, 9.3, 9], 2, true);
    for (let i = 0; i < 5; i++) bx("guild", M.beam, [-11, 7.6, -17 + i * 6], [11, 8.2, -16.4 + i * 6], 2);
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const bn = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4.2), i % 2 ? M.red : M.blue); bn.position.set(ORG.guild[0] + sx * 10.9, 5.2, ORG.guild[2] - 15 + i * 5); bn.rotation.y = -sx * Math.PI / 2; bn.layers.set(NOINK); R.add(bn); }
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { bx("guild", M.wood, [sx * 9 - 1, 0, -12 + i * 8], [sx * 9 + 1, 0.9, -10 + i * 8], 2); bx("guild", M.beam, [sx * 9 - 1.1, 0.9, -12.1 + i * 8], [sx * 9 + 1.1, 1.0, -9.9 + i * 8], 2); }
    for (const x of [-9.5, 9.5]) for (const z of [-14, -4, 4]) { put("guild", cyl(0.07, 2.4, 8), M.iron, x, 1.2, z); flame("guild", x, 2.6, z, 0.17); }
    this.stageM = new THREE.Mesh(new THREE.BoxGeometry(11, 1, 6), M.wood); this.stageM.position.set(ORG.guild[0], 0.5, ORG.guild[2] - 14); this.stageM.castShadow = true; R.add(this.stageM);
    this.ball = new THREE.Group(); this.ball.position.set(ORG.guild[0], 6.0, ORG.guild[2] - 7); this.ball.add(new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 14), M.ballM));
    for (let i = 0; i < 26; i++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.04), new THREE.MeshBasicMaterial({ color: new THREE.Color(...(i % 3 === 0 ? [3.5, 1.2, 2.4] : i % 3 === 1 ? [1.2, 3.0, 3.5] : [3.5, 3.2, 1.0])) })); const a = i * 2.4, e = Math.asin(((i % 13) / 6.5) - 1); q.position.set(Math.cos(a) * Math.cos(e) * 0.74, Math.sin(e) * 0.74, Math.sin(a) * Math.cos(e) * 0.74); q.lookAt(0, 0, 0); this.ball.add(q); }
    this.ball.visible = false; this.ball.traverse((o) => { o.layers.set(NOINK); }); R.add(this.ball);
    for (let i = 0; i < 3; i++) { const bm = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 20, 1, true), new THREE.MeshBasicMaterial({ color: [new THREE.Color(1.0, 0.3, 0.8), new THREE.Color(0.3, 0.9, 1.0), new THREE.Color(1.0, 0.9, 0.3)][i], transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); bm.geometry.translate(0, -4.5, 0); bm.position.set(ORG.guild[0] + (i - 1) * 3, 8.6, ORG.guild[2] - 6); bm.layers.set(NOINK); bm.frustumCulled = false; bm.visible = false; R.add(bm); this.beams.push(bm); }

    // =============== SHRINE: stairs up a hill, chapel on top ===============
    for (let i = 0; i < NSTEPS; i++) { const z = 10 - i; bx("shrine", M.stone, [-2.8, 0, z - 0.5], [2.8, 0.22 * (i + 1), z + 0.5], 2); bx("shrine", M.hill, [-40, -0.3, z - 0.5], [-2.8, 0.22 * (i + 1) - 0.04, z + 0.5], 6); bx("shrine", M.hill, [2.8, -0.3, z - 0.5], [40, 0.22 * (i + 1) - 0.04, z + 0.5], 6); }
    bx("shrine", M.hill, [-40, -0.3, 10.5], [40, 0, 40], 6); bx("shrine", M.hill, [-40, -0.3, -60], [40, 7.4, -24.5], 6);
    bx("shrine", M.plaster, [-4, 7.4, -32], [4, 12.5, -25.5]); put("shrine", new THREE.ConeGeometry(6.2, 4.4, 4), M.roof, 0, 14.7, -28.8, new THREE.Matrix4().makeRotationY(Math.PI / 4));
    bx("shrine", M.dark, [-1.0, 7.4, -25.55], [1.0, 10.2, -25.45]); bx("shrine", M.gold, [-0.15, 16.4, -29.0], [0.15, 18.4, -28.6]); bx("shrine", M.gold, [-0.9, 17.4, -29.0], [0.9, 17.7, -28.6]);
    for (let i = 0; i < 14; i++) { const x = (i % 2 ? 1 : -1) * (6 + 14 * hh(i, 1)), z = 8 - 32 * hh(i, 2); put("shrine", cyl(0.25, 2, 7), M.beam, x, stairY(z) + 1, z); put("shrine", new THREE.ConeGeometry(1.6, 4.6, 8), M.leaf, x, stairY(z) + 4, z); }
    for (let i = 0; i < 8; i++) put("shrine", new THREE.ConeGeometry(20 + 8 * hh(i, 3), 22 + 10 * hh(i, 4), 6), M.mount, -150 + i * 44, 10, -120);
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(4.5, 20, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 3.0, 1.6) })); this.sunDisc.layers.set(NOINK); this.sunDisc.visible = false; R.add(this.sunDisc);
    b.build(R);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const sh = shotAt(f), ln = lightOverride(f, sh.id, sh.a) ?? sh.light, L = PRESETS[ln], t = f / 30, id = sh.id;
    const c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 320; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const centre = V(...toW(sh.set, [0, 1.2, sh.set === "shrine" ? -12 : -6]));
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
    // the stage: built while "a wooden stage" is said, torn down at "tore down the stage"
    const grow = id === 10 ? smooth((t - T_STAGE) / 1.1) : id === 11 || id === 12 ? 1 : id === 13 ? 1 - smooth((t - T_TEAR) / 0.6) : id === 18 ? 1 : 0;
    this.stageM.visible = sh.set === "guild" && grow > 0.01; this.stageM.scale.y = Math.max(0.01, grow); this.stageM.position.y = 0.5 * grow;
    void T_MUSIC;
    this.ball.visible = id === 18; if (this.ball.visible) this.ball.rotation.y = t * 1.6;
    this.beams.forEach((m, i) => { m.visible = id === 18; m.rotation.z = 0.55 * Math.sin(t * 1.7 + i * 2.1); m.rotation.x = 0.4 * Math.cos(t * 1.3 + i); });
    const rise = id === 16 ? smooth((t - 38.4) / 2.2) : 0;
    this.sunDisc.visible = id === 16; this.sunDisc.position.set(ORG.shrine[0] - 6, 3 + 9 * rise, ORG.shrine[2] - 70);

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
