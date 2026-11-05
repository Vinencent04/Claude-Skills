// Three painted sets in one scene: west (Parliament + the Thames embankment), chamber (House of Commons), tunnel (Bazalgette's brick sewer).
// update(f, camera, scene) poses everything for frame f: lights, river flow and sewage outlets, flame flicker, the sun (shot 5), curtains, the tunnel that is built ring by ring, and the cast cards from ccast.ts.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "./build";
import { rep, cobbleHD, planksHD } from "./paint";
import { plaster, staves, stoneBlocks, gothicTex, murkTex, brickTunnel, clothGreen } from "./bpaint";
import { PRESETS, BG } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, shotAt, ORG, toW, SetName, lightOverride, T_PIPES, T_BAZ, T_CURTAIN, clamp01, smooth } from "./story";

const cyl = (r: number, h: number, seg = 18, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
type Mats = Record<string, THREE.Material>;
const RADIUS: Record<SetName, number> = { west: 34, chamber: 16, tunnel: 22 };
export const NRINGS = 20;
export const RING_LEN = 4.5;

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
  private dirty!: THREE.Mesh; private clean!: THREE.Mesh; private dirtyTex!: THREE.Texture; private pours: THREE.Mesh[] = [];
  private sunDisc!: THREE.Mesh; private curtains!: THREE.Group; private rings: THREE.Mesh[] = []; private flow!: THREE.Mesh; private flowTex!: THREE.Texture; private bricks!: THREE.Group;

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.8);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(3072, 3072);
    R.add(this.hemi, this.sun, this.sun.target);

    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.planks = lam("planksHD", () => ({ map: planksHD() }));
    M.gothic = lam("sGothicM", () => ({ map: rep(gothicTex(), 3, 1) }));
    M.stone = lam("sStone", () => ({ map: rep(stoneBlocks("ss", "#a8a8a0"), 4, 2) }));
    M.stoneD = lam("sStoneD", () => ({ map: rep(stoneBlocks("ssd", "#6a6a68"), 4, 2) }));
    M.timber = lam("sTimber", () => ({ map: staves("st", "#6a4426", 8) }));
    M.wood = lam("sWood", () => ({ map: staves("sw", "#9a6a3a", 5) }));
    M.beam = lam("sBeam", () => ({ map: staves("sb", "#4a3022", 3) }));
    M.plaster = lam("sPlaster", () => ({ map: plaster("sp", "#d8c8a0") }));
    M.roof = lam("sRoof", () => ({ color: "#5a6a7a" }));
    M.green = lam("sGreen", () => ({ map: clothGreen() }));
    M.dark = lam("sDark", () => ({ color: "#1f1c22" }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#c8ccd4", shininess: 60 }), 0.15);
    M.gold = twoTone(new THREE.MeshPhongMaterial({ color: "#e8b83a", specular: "#fff1b0", shininess: 55 }), 0.2);
    M.brownPour = lam("sPour", () => ({ color: "#6a4a20" }));
    M.glass = new THREE.MeshBasicMaterial({ color: "#5a7ab0" });
    M.clock = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.3, 1.8) });
    M.brickIn = twoTone(new THREE.MeshLambertMaterial({ map: rep(brickTunnel(), 6, 1), side: THREE.BackSide }), 0.3);
    M.brick = lam("sBrick", () => ({ map: rep(brickTunnel(), 2, 1) }));
    this.flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 2.4, 1.0) });
    this.dirtyTex = rep(murkTex("d", "#5a5a30"), 14, 12); this.flowTex = rep(murkTex("f", "#6a5030"), 1, 12);
    M.dirty = twoTone(new THREE.MeshLambertMaterial({ map: this.dirtyTex }), 0.3);
    M.cleanW = twoTone(new THREE.MeshLambertMaterial({ map: rep(murkTex("c", "#3a78b0"), 14, 12) }), 0.3);
    M.flowM = twoTone(new THREE.MeshLambertMaterial({ map: this.flowTex }), 0.3);

    const b = new Batch();
    const bx = (set: SetName, mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => {
      const o = ORG[set]; b.add(boxGeo(V(a[0] + o[0], a[1] + o[1], a[2] + o[2]), V(c[0] + o[0], c[1] + o[1], c[2] + o[2]), tile, bottom), mat);
    };
    const put = (set: SetName, g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => {
      const o = ORG[set], m = at(x + o[0], y + o[1], z + o[2]); b.add(g, mat, rot ? m.multiply(rot) : m);
    };
    const flame = (set: SetName, x: number, y: number, z: number, s = 0.16) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), this.flameMat); m.scale.y = 1.5; m.position.set(ORG[set][0] + x, y, ORG[set][2] + z); m.layers.set(NOINK); R.add(m); this.flames.push(m); };

    // =============== WEST: Parliament and the embankment ===============
    bx("west", M.cobble, [-60, -0.2, -14], [60, 0, 8], 4);
    bx("west", M.stone, [-26, 0, -36], [26, 14, -14], 3); for (let r = 0; r < 2; r++) for (let i = 0; i < 13; i++) bx("west", M.glass, [-24.5 + i * 3.9 - 0.6, 3 + r * 5.2, -14.1], [-24.5 + i * 3.9 + 0.6, 6.4 + r * 5.2, -13.95]); bx("west", M.roof, [-26.5, 14, -36.5], [26.5, 15.2, -13.5]);
    for (const [x0, x1, h] of [[-31, -24, 28], [27, 34, 31]] as const) { bx("west", M.stone, [x0, 0, -26], [x1, h, -16], 3); put("west", new THREE.ConeGeometry((x1 - x0) * 0.78, 8, 4), M.roof, (x0 + x1) / 2, h + 4, -21, new THREE.Matrix4().makeRotationY(Math.PI / 4)); }
    const clock = new THREE.Mesh(new THREE.CircleGeometry(2.1, 24), M.clock); clock.position.set(ORG.west[0] - 27.5, 23, ORG.west[2] - 15.95); clock.layers.set(NOINK); R.add(clock);
    bx("west", M.dark, [-2.2, 0, -14.1], [2.2, 5, -13.9]); for (let i = 0; i < 3; i++) bx("west", M.stone, [-3.5 - i * 0.4, i * 0.2, -14 + 0.0], [3.5 + i * 0.4, i * 0.2 + 0.2, -13.2 + 0.0 + i * 0.5], 2);
    for (const x of [-18, -10, 10, 18]) { bx("west", M.glass, [x - 1.2, 3.0, -14.1], [x + 1.2, 7.6, -13.95]); }
    bx("west", M.stoneD, [-80, -3.2, 8], [80, 1.0, 8.6], 4);                                         // embankment wall
    for (const x of [-8, 0, 8]) { bx("west", M.dark, [x - 1.1, -2.8, 8.6], [x + 1.1, -0.8, 8.75]); bx("west", M.stone, [x - 1.5, -3.0, 8.5], [x + 1.5, -0.6, 8.7], 2, false); }
    for (let x = -50; x <= 50; x += 10) { put("west", cyl(0.07, 3.6, 8), M.iron, x, 1.8, 3.2); flame("west", x, 3.9, 3.2, 0.2); }
    put("west", cyl(0.3, 1.2, 12), M.iron, 6, 0.6, 2.0); put("west", cyl(0.06, 0.8, 8), M.iron, 6.4, 1.3, 2.0, new THREE.Matrix4().makeRotationZ(1.0));    // the pump
    bx("west", M.stone, [-90, 1.0, 60], [90, 2.0, 66], 4); for (let i = -7; i <= 7; i++) bx("west", M.stone, [i * 12 - 1.5, -3, 60], [i * 12 + 1.5, 1.0, 66], 2);   // Westminster bridge in the haze
    for (let i = 0; i < 16; i++) bx("west", M.plaster, [-100 + i * 13, 0, 118], [-90 + i * 13, 6 + (i * 37 % 9), 126], 2);
    b.build(R);
    this.dirty = new THREE.Mesh(new THREE.PlaneGeometry(260, 140), M.dirty); this.dirty.rotation.x = -Math.PI / 2; this.dirty.position.set(ORG.west[0], -3.0, ORG.west[2] + 78); R.add(this.dirty);
    this.clean = new THREE.Mesh(new THREE.PlaneGeometry(260, 140), M.cleanW); this.clean.rotation.x = -Math.PI / 2; this.clean.position.set(ORG.west[0], -3.0, ORG.west[2] + 78); this.clean.visible = false; R.add(this.clean);
    for (const x of [-8, 0, 8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 1), M.brownPour); p.position.set(ORG.west[0] + x, -1.7, ORG.west[2] + 9.2); p.visible = false; R.add(p); this.pours.push(p); }
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(7, 22, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 2.6, 1.0) })); this.sunDisc.layers.set(NOINK); this.sunDisc.position.set(ORG.west[0] - 14, 15, ORG.west[2] + 96); this.sunDisc.visible = false; R.add(this.sunDisc);

    // =============== CHAMBER: House of Commons ===============
    const b2 = new Batch();
    const cx = (mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => { const o = ORG.chamber; b2.add(boxGeo(V(a[0] + o[0], a[1], a[2] + o[2]), V(c[0] + o[0], c[1], c[2] + o[2]), tile, bottom), mat); };
    cx(M.planks, [-13, -0.2, -22], [13, 0, 10], 3);
    cx(M.timber, [-13, 0, -22.2], [13, 11, -22]); cx(M.timber, [-13.2, 0, -22], [-13, 11, 10]); cx(M.timber, [13, 0, -22], [13.2, 11, 10]);
    cx(M.beam, [-13, 11, -22.2], [13, 11.3, 10], 2, true);
    for (let i = 0; i < 4; i++) cx(M.beam, [-13, 9.6, -19 + i * 8], [13, 10.3, -18.3 + i * 8], 2);
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) cx(M.green, [sx > 0 ? 3 + k * 1.2 : -4.0 - k * 1.2, 0, -18], [sx > 0 ? 4.0 + k * 1.2 : -3.0 - k * 1.2, 0.5 + 0.45 * k, -2], 3);
    cx(M.wood, [-1.2, 0, -12], [1.2, 1.0, -10.4], 2); cx(M.wood, [-1.6, 0, -21.6], [1.6, 3.0, -19.6], 2); cx(M.gold, [-1.9, 3.0, -21.8], [1.9, 3.3, -19.4]);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { cx(M.glass, [sx * 12.9 - (sx > 0 ? 0.1 : -0.1) - 0.05, 3.2, -16 + i * 7.5 - 1.2], [sx * 12.9 + 0.05, 8.6, -16 + i * 7.5 + 1.2]); }
    for (const z of [-14, -6]) { put("chamber", cyl(0.03, 1.6, 6), M.iron, 0, 10.2, z); put("chamber", new THREE.SphereGeometry(0.25, 10, 8), M.clock, 0, 8.4, z); }
    b2.build(R);
    this.curtains = new THREE.Group();
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 6.4), M.green); c.position.set(ORG.chamber[0] + sx * 12.7, 5.6, ORG.chamber[2] - 16 + i * 7.5); c.rotation.y = -sx * Math.PI / 2; this.curtains.add(c); }
    this.curtains.visible = false; R.add(this.curtains);

    // =============== TUNNEL: Bazalgette's sewer ===============
    for (let i = 0; i < NRINGS; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, RING_LEN, 26, 1, true), M.brickIn); r.rotation.x = Math.PI / 2; r.position.set(ORG.tunnel[0], 3.0, ORG.tunnel[2] + 10 - RING_LEN * (i + 0.5)); r.visible = false; R.add(r); this.rings.push(r); }
    const b3 = new Batch();
    const tx = (mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0) => { const o = ORG.tunnel; b3.add(boxGeo(V(a[0] + o[0], a[1], a[2] + o[2]), V(c[0] + o[0], c[1], c[2] + o[2]), tile), mat); };
    tx(M.stoneD, [-3.4, -0.3, -95], [3.4, 0, 12], 4); tx(M.stone, [-3.1, 0, -95], [-1.2, 0.35, 12], 4); tx(M.stone, [1.2, 0, -95], [3.1, 0.35, 12], 4);
    for (let z = 6; z > -92; z -= 9) for (const sx of [-1, 1]) { b3.add(new THREE.SphereGeometry(0.2, 10, 8), M.clock, new THREE.Matrix4().makeTranslation(ORG.tunnel[0] + sx * 3.0, 2.4, ORG.tunnel[2] + z)); }
    b3.build(R);
    this.flow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 110), M.flowM); this.flow.rotation.x = -Math.PI / 2; this.flow.position.set(ORG.tunnel[0], 0.06, ORG.tunnel[2] - 42); R.add(this.flow);
    const endL = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 2.4, 3.2) })); endL.position.set(ORG.tunnel[0], 3, ORG.tunnel[2] - 92); endL.layers.set(NOINK); R.add(endL);
    this.bricks = new THREE.Group();
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7 + 0.25 * (i % 3), 0.8), M.brick); s.position.set(ORG.tunnel[0] + (i % 2 ? 2.6 : -2.6), 0.5 + 0.2 * (i % 3), ORG.tunnel[2] - 2 - 3 * (i >> 1)); s.castShadow = true; this.bricks.add(s); }
    this.bricks.visible = false; R.add(this.bricks);
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
    const centre = V(...toW(sh.set, [sh.set === "west" ? c.look[0] - ORG.west[0] : 0, 1.2, sh.set === "tunnel" ? c.look[2] - ORG.tunnel[2] : sh.set === "chamber" ? -8 : -4]));
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
    const cleanRiver = id === 12 || id === 14;
    this.dirty.visible = !cleanRiver && sh.set === "west"; this.clean.visible = cleanRiver && sh.set === "west";
    this.dirtyTex.offset.set(0.01 * t, 0.015 * t);
    const pour = id === 4 || id === 3 ? smooth((t - T_PIPES + 0.2) / 0.6) : id <= 2 ? 0.3 : id === 5 ? 1 : 0;
    this.pours.forEach((p, i) => { p.visible = sh.set === "west" && !cleanRiver && (id === 3 || id === 4 || id === 5) && pour > 0.01; p.scale.z = 1 + 4 * pour + 0.2 * Math.sin(t * 9 + i); p.position.z = ORG.west[2] + 8.7 + 0.5 * p.scale.z; });
    this.sunDisc.visible = id === 5 && sh.set === "west";
    this.curtains.visible = (id === 6 && t > T_CURTAIN - 0.5) || id === 8 || id === 9;
    const built = id === 10 ? 3 + Math.floor(smooth((t - T_BAZ) / 4.6) * (NRINGS - 3)) : id >= 11 ? NRINGS : 0;
    this.rings.forEach((r, i) => { r.visible = sh.set === "tunnel" && i < built; });
    this.flowTex.offset.set(0, -0.35 * t); this.flow.visible = sh.set === "tunnel" && id >= 10;
    this.bricks.visible = id === 10;

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
