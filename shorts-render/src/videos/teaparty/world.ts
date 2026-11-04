// Three painted sets in one scene (60 m apart): the meeting hall + governor's office (hall), the tea shop (shop), the wharf with three ships (dock).
// update(f, camera, scene) poses everything for frame f: lights, tea chests (thrown, floating, tipped), the water, the sign, and the cast cards from ccast.ts.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house } from "./build";
import { planksHD, rep } from "./paint";
import { plaster, staves, hoopIron, textSign, harborTex, chestTex, sailTex, unionTex, mapTex } from "./bpaint";
import { PRESETS, BG } from "./lights";
import { TONE, CHAR, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, hh } from "./cards";
import { stage, SUN } from "./ccast";
import { camAt, shotAt, ORG, toW, FPS, SetName, T_OPEN, T_TIP, T_JOIN, T_CLOSE, clamp01, smooth } from "./story";

const cyl = (r: number, h: number, seg = 20, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
type Mats = Record<string, THREE.Material>;
const RADIUS: Record<SetName, number> = { hall: 14, shop: 10, dock: 34 };
export const DECK_Y = 2.0, RAIL_Z = -3.5, WATER_Y = -1.4;
export const SHIP_X = [-15, 0, 15];
export const NCH = 36;                         // pooled tea chests
const SHIP_CZ = -6.2;

/** chest launch schedule for the hook shot: chest k leaves the deck at LAUNCH(k) and lands 0.9 s later */
export const launchT = (k: number) => 0.12 + 0.27 * k;
export const launchX = (k: number) => -7.5 + 0.9 * k;
/** deck-tipping schedule (shot 9): man i opens at OPEN_T(i) and tips at TIP_T(i) */
export const openT = (i: number) => T_OPEN + 0.34 * i;
export const tipT = (i: number) => T_TIP + 0.34 * i;
export const deckX = (i: number) => -4.2 + 1.7 * i;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#cfe0ef", 45, 160);
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private chests: { g: THREE.Group; lid: THREE.Group }[] = [];
  private slick!: THREE.Mesh; private waterTex!: THREE.Texture; private closedSign!: THREE.Mesh; private mapMat!: THREE.MeshBasicMaterial;
  private mapStep = -1;

  constructor() {
    const R = this.root, M: Mats = {};
    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#a8805c", 0.5);
    this.sun = new THREE.DirectionalLight("#ffe2b4", 2.8);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(3072, 3072);
    R.add(this.hemi, this.sun, this.sun.target);

    M.planks = lam("planksHD", () => ({ map: planksHD() }));
    M.deck = lam("tDeck", () => ({ map: rep(planksHD(), 3, 1) }));
    M.plasterH = lam("tPlasterH", () => ({ map: plaster("th", "#d8c9a6") }));
    M.plasterS = lam("tPlasterS", () => ({ map: plaster("ts", "#e6d3a4") }));
    M.wallW = lam("tWallW", () => ({ map: staves("tw", "#7a4c2a", 10) }));
    M.wood = lam("tWood", () => ({ map: staves("tk", "#9a6a3a", 4) }));
    M.beam = lam("tBeam", () => ({ map: staves("tb", "#5a3a22", 3) }));
    M.hull = lam("tHull", () => ({ map: staves("thull", "#4a3224", 22) }));
    M.hullD = lam("tHullD", () => ({ map: staves("thulld", "#2a2024", 22) }));
    M.stripe = lam("tStripe", () => ({ color: "#d9b04a" }));
    M.stripeR = lam("tStripeR", () => ({ color: "#b02a30" }));
    M.dark = lam("tDark", () => ({ color: "#1f1c22" }));
    M.red = lam("tRed", () => ({ color: "#8a2a30" }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#c8ccd4", shininess: 60 }), 0.15);
    M.rope = lam("tRope", () => ({ color: "#6a5a40" }));
    M.sail = lam("tSail", () => ({ map: sailTex(), side: THREE.DoubleSide }));
    M.chest = lam("tChest", () => ({ map: chestTex() }));
    M.ironMap = lam("tIronMap", () => ({ map: rep(hoopIron(), 8, 1) }));
    M.union = new THREE.MeshBasicMaterial({ map: unionTex() });
    M.paper = lam("tPaper", () => ({ color: "#f2ead2" }));
    M.window = new THREE.MeshBasicMaterial({ color: "#2a3f86" });
    this.waterTex = rep(harborTex(), 12, 8);
    M.water = twoTone(new THREE.MeshLambertMaterial({ map: this.waterTex }), 0.3);
    M.slick = new THREE.MeshBasicMaterial({ color: "#7a3f12", transparent: true, opacity: 0.6, depthWrite: false });
    M.glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.5, 1.4) });
    const tinCols = ["#c0392b", "#2a7a8a", "#d9a441", "#6a8f3a", "#7a5ac9", "#e07a3a"];
    tinCols.forEach((c, i) => { M["tin" + i] = lam("tTin" + i, () => ({ color: c })); });

    const b = new Batch();
    const bx = (set: SetName, mat: THREE.Material, a: [number, number, number], c: [number, number, number], tile = 0, bottom = false) => {
      const o = ORG[set]; b.add(boxGeo(V(a[0] + o[0], a[1] + o[1], a[2] + o[2]), V(c[0] + o[0], c[1] + o[1], c[2] + o[2]), tile, bottom), mat);
    };
    const put = (set: SetName, g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rot?: THREE.Matrix4) => {
      const o = ORG[set], m = at(x + o[0], y + o[1], z + o[2]); b.add(g, mat, rot ? m.multiply(rot) : m);
    };

    // =============== HALL: meeting house (x -9..9) + governor's office (x 12..26) ===============
    bx("hall", M.planks, [-10, -0.2, -13], [28, 0, 7], 4);
    bx("hall", M.plasterH, [-10, 0, -13.2], [10, 9, -13]); bx("hall", M.plasterH, [-10.2, 0, -13], [-10, 9, 7]); bx("hall", M.plasterH, [10, 0, -13], [10.2, 9, 7]);
    bx("hall", M.beam, [-10, 9, -13], [10, 9.3, 7], 2, true);
    for (const x of [-9.95, 9.75]) for (const z of [-9, -4, 1]) { bx("hall", M.window, [x, 2.2, z - 1.0], [x + 0.2, 6.8, z + 1.0]); bx("hall", M.beam, [x - 0.03, 2.2, z - 0.06], [x + 0.23, 6.8, z + 0.06]); bx("hall", M.beam, [x - 0.03, 4.4, z - 1.0], [x + 0.23, 4.5, z + 1.0]); }
    bx("hall", M.wood, [-2.5, 0, -12.8], [2.5, 1.2, -11.2], 2); bx("hall", M.beam, [-2.6, 1.2, -12.9], [2.6, 1.35, -11.1], 2);          // pulpit
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) bx("hall", M.wood, [sx * 6.2 - 1.2, 0, -8 + i * 3.6], [sx * 6.2 + 1.2, 0.5, -7.3 + i * 3.6], 2);   // side pews
    // governor's office
    bx("hall", M.wallW, [12, 0, -9.2], [26, 7, -9]); bx("hall", M.wallW, [11.8, 0, -9], [12, 7, 7]); bx("hall", M.wallW, [26, 0, -9], [26.2, 7, 7]);
    bx("hall", M.beam, [12, 7, -9.2], [26, 7.3, 7], 2, true);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), M.union); flag.position.set(ORG.hall[0] + 19, 3.9, ORG.hall[2] - 8.95); flag.layers.set(NOINK); R.add(flag);
    bx("hall", M.window, [25.9, 1.6, -6], [26.0, 5.4, -2]); bx("hall", M.beam, [25.85, 3.4, -6.05], [26.05, 3.5, -1.95]); bx("hall", M.beam, [25.85, 1.6, -4.05], [26.05, 5.4, -3.95]);
    bx("hall", M.wood, [16, 0, -6.2], [22, 1.05, -4.7], 2); bx("hall", M.beam, [15.9, 1.05, -6.3], [22.1, 1.14, -4.6], 2);              // desk
    bx("hall", M.red, [17.6, 0, -8.2], [20.4, 0.48, -7.0]); bx("hall", M.beam, [17.5, 0.48, -8.4], [20.5, 2.9, -8.25]);                     // chair
    bx("hall", M.paper, [18.0, 1.14, -5.7], [19.2, 1.16, -5.0]);
    put("hall", new THREE.SphereGeometry(0.2, 12, 10), M.glow, 17.0, 1.55, -5.4); put("hall", cyl(0.05, 0.4, 8), M.iron, 17.0, 1.35, -5.4);
    // map board on the meeting house back wall (texture swapped per frame)
    this.mapMat = new THREE.MeshBasicMaterial({ map: mapTex(0) });
    const map = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 7.0), this.mapMat); map.position.set(ORG.hall[0], 4.4, ORG.hall[2] - 12.9); map.layers.set(NOINK); R.add(map);
    bx("hall", M.beam, [-3.0, 0.9, -12.95], [3.0, 1.0, -12.85]);

    // =============== SHOP ===============
    bx("shop", M.planks, [-9, -0.2, -11], [9, 0, 5], 3);
    bx("shop", M.wallW, [-9, 0, -11.2], [9, 7, -11]); bx("shop", M.wallW, [-9.2, 0, -11], [-9, 7, 5]); bx("shop", M.wallW, [9, 0, -11], [9.2, 7, 5]);
    bx("shop", M.beam, [-9, 7, -11.2], [9, 7.3, 5.2], 2, true);
    for (let r = 0; r < 4; r++) {                                                                  // shelves of tea tins
      bx("shop", M.beam, [-8, 1.0 + r * 1.35, -10.9], [8, 1.12 + r * 1.35, -10.1]);
      for (let k = 0; k < 18; k++) put("shop", new THREE.BoxGeometry(0.62, 0.9, 0.55), M["tin" + ((k + r * 2) % 6)], -7.6 + k * 0.89, 1.12 + r * 1.35 + 0.45, -10.5);
    }
    bx("shop", M.wood, [-3.4, 0, -5.8], [3.4, 1.1, -4.2], 2); bx("shop", M.planks, [-3.5, 1.1, -5.9], [3.5, 1.18, -4.1], 2);   // counter
    bx("shop", M.window, [-8.95, 1.8, -7], [-8.85, 5.6, -2.5]); bx("shop", M.beam, [-8.9, 3.7, -7.05], [-8.8, 3.8, -2.45]); bx("shop", M.beam, [-8.9, 1.8, -4.8], [-8.8, 5.6, -4.7]);
    put("shop", new THREE.SphereGeometry(0.24, 12, 10), M.glow, -2.4, 3.6, -5.0); put("shop", cyl(0.03, 3.4, 6), M.iron, -2.4, 5.3, -5.0);
    put("shop", new THREE.SphereGeometry(0.24, 12, 10), M.glow, 2.6, 3.6, -5.0); put("shop", cyl(0.03, 3.4, 6), M.iron, 2.6, 5.3, -5.0);
    // the chest on the counter (stamped in shot 4)
    const cc = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.95, 0.9), M.chest); cc.position.set(ORG.shop[0] + 0.9, 1.18 + 0.475, ORG.shop[2] - 5.0); cc.castShadow = true; R.add(cc);
    put("shop", cyl(0.14, 0.18, 14), M.paper, -1.6, 1.27, -4.9);                                    // a teacup stand-in on the counter (card drawn in ccast)

    // =============== DOCK ===============
    const D: SetName = "dock";
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(220, 120), M.water); sea.rotation.x = -Math.PI / 2; sea.position.set(ORG.dock[0], WATER_Y, ORG.dock[2] - 59); sea.receiveShadow = true; R.add(sea);
    this.slick = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), M.slick); this.slick.rotation.x = -Math.PI / 2; this.slick.position.set(ORG.dock[0], WATER_Y + 0.02, ORG.dock[2] - 5); R.add(this.slick);
    bx(D, M.planks, [-40, -1.4, 1.8], [40, 0, 20], 4);                                              // pier
    bx(D, M.beam, [-40, -1.4, 1.55], [40, 0.05, 1.8]);
    for (let x = -36; x <= 36; x += 6) { put(D, cyl(0.22, 0.5, 10), M.iron, x, 0.25, 2.3); }          // bollards
    for (let x = -33; x <= 33; x += 11) { put(D, cyl(0.08, 3.4, 8), M.iron, x, 1.7, 3.2); put(D, new THREE.SphereGeometry(0.22, 12, 10), M.glow, x, 3.5, 3.2); }
    put(D, cyl(0.45, 0.9, 14), M.wood, 0.6, 0.45, 3.0);
    for (let i = 0; i < 14; i++) { put(D, cyl(0.45, 0.9, 14), M.wood, -30 + i * 4.6 + 1.2 * hh(i, 3), 0.45, 6 + 7 * hh(i, 4)); }
    for (let i = 0; i < 9; i++) bx(D, M.chest, [-28 + i * 6.8, 0, 9 + 2 * hh(i, 6)], [-27 + i * 6.8, 0.9, 9.9 + 2 * hh(i, 6)], 0);
    for (let i = 0; i < 10; i++) house(b, ORG.dock[0] - 36 + i * 8, ORG.dock[2] + 27, Math.PI, 7, 6.5, 7.5 + (i % 3) * 1.3, i + 1, 0);
    // ships (hull prism + deck + rails + masts + sails + rigging)
    const line = (a: V3, c: V3, r: number, mat: THREE.Material) => {
      const oo = ORG.dock, A = new THREE.Vector3(a[0] + oo[0], a[1], a[2] + oo[2]), C = new THREE.Vector3(c[0] + oo[0], c[1], c[2] + oo[2]), d = C.clone().sub(A), len = d.length();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      b.add(cyl(r, len, 5), mat, new THREE.Matrix4().compose(A.clone().add(C).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    };
    type V3 = [number, number, number];
    const ship = (cx: number, cz: number, k: number, hullMat: THREE.Material, stripeMat: THREE.Material, masts = 3) => {
      const o = ORG.dock, L = 13, Wd = 5.6, H = 3.9;
      const sh = new THREE.Shape(); sh.moveTo(-L / 2, -Wd / 2); sh.lineTo(L / 2 - 3.2, -Wd / 2); sh.lineTo(L / 2 + 1.2, 0); sh.lineTo(L / 2 - 3.2, Wd / 2); sh.lineTo(-L / 2, Wd / 2); sh.closePath();
      const hg = new THREE.ExtrudeGeometry(sh, { depth: H, bevelEnabled: false }); hg.rotateX(-Math.PI / 2);
      const M0 = new THREE.Matrix4().makeTranslation(o[0] + cx, 0, o[2] + cz).multiply(new THREE.Matrix4().makeScale(k, k, k));
      const L4 = (x: number, y: number, z: number) => M0.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
      b.add(hg, hullMat, L4(0, -1.9, 0));
      b.add(new THREE.BoxGeometry(L - 3, 0.35, Wd + 0.12), stripeMat, L4(-1.6, 1.0, 0));                  // stripe band
      b.add(new THREE.BoxGeometry(L - 1.4, 0.08, Wd - 0.5), M.deck, L4(-0.9, 2.02, 0));                  // deck
      for (const sz of [-1, 1]) { b.add(new THREE.BoxGeometry(L - 1.6, 0.8, 0.14), M.hullD, L4(-1.0, 2.4, sz * (Wd / 2 - 0.12))); }
      b.add(new THREE.BoxGeometry(0.14, 0.8, Wd - 0.2), M.hullD, L4(-L / 2 + 0.1, 2.4, 0));
      for (let m = 0; m < masts; m++) {
        const mx = -3.6 + m * 4.4, mh = [13, 15, 12][m % 3];
        b.add(cyl(0.2, mh, 10), M.beam, L4(mx, 2 + mh / 2, 0));
        for (const [yy, ww] of [[2 + mh * 0.62, 6.2], [2 + mh * 0.9, 4.2]] as const) b.add(new THREE.BoxGeometry(0.18, 0.18, ww), M.beam, L4(mx, yy, 0));
        b.add(new THREE.BoxGeometry(0.1, mh * 0.26, 5.6), M.sail, L4(mx + 0.25, 2 + mh * 0.62 - mh * 0.14, 0));
        b.add(new THREE.BoxGeometry(0.1, mh * 0.2, 3.8), M.sail, L4(mx + 0.25, 2 + mh * 0.9 - mh * 0.12, 0));
        b.add(new THREE.SphereGeometry(0.2, 10, 8), M.glow, L4(mx + 0.4, 2 + mh * 0.45, 0.6));
        for (const sz of [-1, 1]) line([cx + mx * k, 2 + mh * k, cz + sz * 0.1], [cx + (mx + (sz > 0 ? -1 : 1) * 1.8) * k, 2.4 * k, cz + sz * (Wd / 2) * k], 0.04, M.rope);
      }
      for (let i = 0; i < 3; i++) b.add(new THREE.BoxGeometry(0.95, 0.8, 0.8), M.chest, L4(-5 + i * 1.05, 2.45, 1.0 - 0.7 * (i % 2)));   // deck cargo
    };
    // place via set-local helpers: ships live at z = SHIP_CZ
    ship(SHIP_X[0], SHIP_CZ, 1, M.hull, M.stripe); ship(SHIP_X[1], SHIP_CZ, 1, M.hull, M.stripe); ship(SHIP_X[2], SHIP_CZ, 1, M.hull, M.stripe);
    ship(-6, -34, 2.1, M.hullD, M.stripeR, 3);                                                     // the blockading warship (visible far away)
    b.build(R);

    // sign (shot 11) and chest pool
    this.closedSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), new THREE.MeshBasicMaterial({ map: textSign("closed2", 800, 500, ["HARBOR", "CLOSED"], "#b02a30", "#f6f1e0", "#2a160a") }));
    this.closedSign.position.set(ORG.dock[0] + 0.6, 2.4, ORG.dock[2] + 3.5); this.closedSign.layers.set(NOINK); R.add(this.closedSign);
    const cg = new THREE.BoxGeometry(0.95, 0.8, 0.8), lg = new THREE.BoxGeometry(0.97, 0.12, 0.82);
    for (let i = 0; i < NCH; i++) {
      const g = new THREE.Group(), body = new THREE.Mesh(cg, M.chest); body.castShadow = true; g.add(body);
      const lid = new THREE.Group(), lm = new THREE.Mesh(lg, M.wood); lm.position.set(0, 0.06, 0.41); lid.add(lm); lid.position.set(0, 0.4, -0.41); g.add(lid);
      g.visible = false; R.add(g); this.chests.push({ g, lid });
    }
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** tea chests per shot (dock set only) */
  private poseChests(id: number, t: number) {
    const o = ORG.dock;
    const set = (i: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, lid = 0) => {
      const c = this.chests[i]; c.g.visible = true; c.g.scale.setScalar(id === 1 || id === 9 ? 1.9 : 1.3); c.g.position.set(o[0] + x, o[1] + y, o[2] + z); c.g.rotation.set(rx, ry, rz); c.lid.rotation.x = -lid * 1.9;
    };
    const floatAt = (i: number, tt: number, k = 1) => set(i, -11 + 22 * hh(i, 1) + 0.15 * Math.sin(tt * 0.7 + i), WATER_Y + 0.28 + 0.05 * Math.sin(tt * 1.3 + i * 2.1), 1.2 - 4.4 * hh(i, 2), 0.1 * Math.sin(tt + i), i, 0.12 * Math.cos(tt * 0.9 + i) * k);
    this.chests.forEach((c) => { c.g.visible = false; });
    if (id === 1) {
      for (let k = 0; k < 17; k++) {
        const tl = t - launchT(k); if (tl < 0) continue;
        const u = clamp01(tl / 0.9), x0 = launchX(k), x1 = x0 + 1.1;
        if (u < 1) set(k, x0 + (x1 - x0) * u, 2.9 * (1 - u) + (WATER_Y + 0.3) * u + 2.5 * Math.sin(Math.PI * u), -4.3 + 2.0 * u, 3 * u * (k % 2 ? 1 : -1), 0.6 * k, 2.2 * u * (k % 3 - 1));
        else set(k, x1 + 0.2 * (tl - 0.9), WATER_Y + 0.3 + 0.05 * Math.sin(tl * 3 + k), -2.3, 0.2, 0.6 * k, 0.3 * Math.sin(tl * 1.5 + k));
      }
    } else if (id === 9) {
      for (let i = 0; i < 6; i++) {
        const to = t - openT(i), tt = t - tipT(i);
        if (tt < 0) { set(i, deckX(i), DECK_Y + 0.45, -4.4, 0, 0, 0, smooth(to / 0.2)); continue; }
        const u1 = clamp01(tt / 0.5), u2 = clamp01((tt - 0.5) / 0.6);
        if (u2 < 1) set(i, deckX(i), 2.45 + 0.5 * Math.sin(u1 * 1.6) - 4.2 * u2 * u2, -4.4 + 0.9 * u1 + 0.9 * u2, 1.7 * u1 + 1.2 * u2, 0, 0, 1);
        else set(i, deckX(i) + 0.15 * (tt - 1.1), WATER_Y + 0.3 + 0.05 * Math.sin(tt * 3 + i), -2.6, 0.5, 0, 0.3, 1);
      }
      for (let i = 6; i < 20; i++) floatAt(i, t);
    } else if (id === 10 || id === 11 || id === 14 || id === 8) {
      const n = id === 10 ? NCH : id === 14 ? 10 : id === 11 ? 20 : 0;
      const grow = id === 10 ? smooth((t - 28) / 1.5) : 1;
      for (let i = 0; i < n; i++) if (hh(i, 7) < grow) floatAt(i, t);
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
    const centre = V(...toW(sh.set, sh.set === "dock" ? [0, 1.2, -2] : sh.set === "hall" ? [id === 6 ? 19 : 0, 1.2, -4] : [0, 1.2, -4]));
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

    // water drift, tea slick, sign, map
    this.waterTex.offset.set(0.012 * t, 0.006 * t);
    const slickK = id === 1 ? smooth(t / 3) : id === 9 ? 0.5 + 0.5 * smooth((t - 24) / 4) : id >= 10 && id <= 11 ? 1 : id === 14 ? 1 : id === 5 || id === 8 ? 0 : 0;
    this.slick.visible = slickK > 0.02; this.slick.scale.set(6 + 30 * slickK, 3 + 6 * slickK, 1); this.slick.position.z = ORG.dock[2] - 2.2 - 1.2 * slickK;
    this.closedSign.visible = id === 11 && t >= T_CLOSE - 0.1;
    const step = id === 12 ? Math.max(0, Math.min(13, Math.floor((t - (T_JOIN - 0.3)) / 0.18))) : 0;
    if (step !== this.mapStep) { this.mapStep = step; this.mapMat.map = mapTex(step); this.mapMat.needsUpdate = true; }
    if (sh.set === "dock") this.poseChests(id, t); else this.chests.forEach((c) => { c.g.visible = false; });
    void FPS; void T_CLOSE;

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
