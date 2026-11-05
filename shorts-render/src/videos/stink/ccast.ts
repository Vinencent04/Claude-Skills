// Cast of the great-stink short: bean-heads play MPs, doctors, Londoners, Joseph Bazalgette and his workers; stink clouds, flies and signs are drawn cards.
// stage(f, cam) -> character cards + effect cards for the shot at frame f. All positions are set-local (toW converts).
import * as THREE from "three";
import { Pen, bodyFront, fxBurst, fxPuff, fxContact, fxShadow, SKINS, INK, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import * as T from "./story";
import { FPS, V3, SetName, toW, shotAt, mpX } from "./story";

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();

// ---------------- outfits ----------------
const COATS = ["#2a2a32", "#3a3a4a", "#4a3a32", "#2a3a3a", "#3a2a3a"];
const MP = (v: number): Outfit => ({ jacket: COATS[v % 5], pants: "#2a2a30", boots: "#1a1a20", hat: "tophat", moustache: v % 2 ? "#5a4a3a" : "#8a8a8a", buttons: "#9a9aa4", skin: SKINS[v % 3], build: v % 3 === 0 ? "stout" : "adult" });
const SPEAKER: Outfit = { jacket: "#1c1c22", pants: "#1c1c22", boots: "#1a1a20", hat: "wig", hair: "#f2efe8", buttons: "#e8c45a", skin: SKINS[2], build: "stout" };
const DOCTOR: Outfit = { jacket: "#22222a", pants: "#1a1a20", boots: "#1a1a20", hat: "tophat", moustache: "#5a4a3a", buttons: "#d9d4c4", belt: "#d9d4c4", skin: SKINS[0], build: "stout" };
const LONDONER = (v: number): Outfit => v % 3 === 0
  ? { jacket: "#e8d8b8", pants: "#4a4038", boots: "#3a2a20", hat: "bonnet", dress: ["#c0392b", "#2a7a8a", "#d9a441", "#7a5ac9"][v % 4], skin: SKINS[v % 4] }
  : { jacket: ["#8f6b4a", "#6e7f4a", "#4a6a8a", "#a05a46"][v % 4], pants: "#4a4038", boots: "#3a2a20", hat: v % 2 ? "cap" : "hair", cap: "#8a6a46", hair: ["#5a3b2a", "#2a2022"][v % 2], skin: SKINS[v % 4], build: v % 5 === 3 ? "stout" : "adult" };
const BAZALGETTE: Outfit = { jacket: "#6a4a2a", pants: "#3a3a40", boots: "#2a2a30", hat: "tophat", moustache: "#3a2a22", buttons: "#e8c45a", skin: SKINS[1], build: "stout" };
const WORKER = (v: number): Outfit => ({ jacket: ["#c8a878", "#8a8a9a", "#a08060"][v % 3], pants: "#5a4a3a", boots: "#3a2a20", hat: "cap", cap: ["#6a5a4a", "#4a4a5a"][v % 2], skin: SKINS[v % 4], build: v % 2 ? "stout" : "adult" });
const SERVANT: Outfit = { jacket: "#7a7a8a", pants: "#3a3a40", boots: "#2a2a30", hat: "cap", cap: "#5a5a6a", buttons: "#d9b04a", skin: SKINS[1], build: "adult" };
const MODERN: Outfit = { jacket: "#f08a2c", pants: "#3a4a6a", boots: "#2a2a30", hat: "cap", cap: "#f4d020", belt: "#d8d8d8", skin: SKINS[3], build: "adult" };

// ---------------- plumbing ----------------
const tier = (d: number): [number, number, number] => (d < 4.8 ? [1080, 1800, 1.8] : d < 13 ? [540, 900, 0.9] : [300, 500, 0.5]);
const light2D = (cam: CamInfo) => Math.round(Math.atan2(-SUN.y, SUN.dot(cam.right)) / (Math.PI / 4)) * (Math.PI / 4);
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 54 * hh(i * 31 + n, 13)); }
  return 0;
};
const CONTACT: [number, number, number] = [0.3, 0.3, 0.42], TAIL: [number, number, number] = [0.5, 0.5, 0.66];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");

class S {
  out: Stage = { places: [], fx: [] };
  constructor(public cam: CamInfo, public set: SetName, public t: number) {}
  w(x: number, y: number, z: number): V3 { return toW(this.set, [x, y, z]); }
  blob(x: number, y: number, z: number, sc = 1) {
    const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz), [X, Y, Z] = this.w(x, y, z);
    const len = 1.1 * sc, h = len + 0.55 * sc, c = 0.3 * h, tc = hexOf(TAIL, 1), cc = hexOf(CONTACT, 1);
    this.out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: X + ox * c, y: Y + 0.018, z: Z + oz * c, w: 0.72 * sc, h, flat: true, rot });
    this.out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: X + ox * 0.03 * sc, y: Y + 0.022, z: Z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
  }
  /** a character card at set-local (x, y, z) */
  who(i: number, o: Outfit, ok: string, x: number, y: number, z: number, fo: FrontOpts, sc = 1, shadow = true) {
    const [X, Y, Z] = this.w(x, y, z), d = this.cam.pos.distanceTo(tmp.set(X, Y + 1, Z)) / sc, [w, h, k] = tier(d);
    const f2: FrontOpts = { blink: lidAt(this.t, i), ...fo, light: light2D(this.cam), seed: (i % 7) + 1 };
    this.out.places.push({ key: `F|${ok}|${fkey(f2)}`, x: X, y: Y, z: Z, scale: sc, draw: (p) => bodyFront(p, o, f2), size: [w, h, k] });
    if (shadow && fo.mode !== "sit") this.blob(x, y, z, sc * 1.1);
  }
  fx(key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) {
    const [X, Y, Z] = this.w(x, y, z);
    this.out.fx.push({ key, cw, ch, draw, x: X, y: Y, z: Z, w, h, ...extra });
  }
  burst(t0: number, x: number, y: number, z: number, w = 1.2, dur = 0.4, col = "#fff3b0") {
    if (this.t >= t0 && this.t < t0 + dur) { const u = q((this.t - t0) / dur, 30); this.fx(`burst${u}${col}`, 500, 500, (p) => fxBurst(p, u, col), x, y, z, w, w); }
  }
  puff(t0: number, x: number, y: number, z: number, w = 1.2, dur = 0.8) {
    if (this.t >= t0 && this.t < t0 + dur) { const u = q((this.t - t0) / dur, 10); this.fx(`puff${u}`, 300, 300, (p) => fxPuff(p, u), x, y + 0.4 * u, z, w, w, { soft: true }); }
  }
}

// ---------------- little drawings (effect cards) ----------------
const rr = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): [number, number][] => {
  const pts: [number, number][] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(((a + (90 * i) / n) * Math.PI) / 180), cy + r * Math.sin(((a + (90 * i) / n) * Math.PI) / 180)]);
  return pts;
};
const font = (g: CanvasRenderingContext2D, px: number) => { g.font = `900 ${px}px Georgia, 'Times New Roman', serif`; g.textAlign = "center"; g.textBaseline = "middle"; };
const cloud = (seed: number) => (p: Pen) => { const g = p.g; for (let i = 0; i < 9; i++) { const x = 90 + 70 * ((i * 7 + seed * 3) % 5) - 20 * (i % 3), y = 100 + 30 * ((i * 5 + seed) % 4) - 20 * (i % 2), r = 50 + 12 * ((i + seed) % 4); const gr = g.createRadialGradient(x, y, 4, x, y, r); gr.addColorStop(0, "rgba(120,170,40,0.55)"); gr.addColorStop(1, "rgba(120,170,40,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } };
const hanky = (p: Pen) => { p.poly([[16, 30], [120, 16], [136, 110], [30, 124]], "#ffffff", 8); p.stroke([[30, 52], [112, 40]], 4, "#8ab4ff"); p.poly([[112, 16], [136, 110], [120, 100]], "#e8eef8", 0); };
const fly = (wing: number) => (p: Pen) => { p.ell(60, 60, 10, 7, INK, 0); p.ell(52, 48 - wing * 6, 12, 7, "#cfd8e8", 3); p.ell(70, 48 - wing * 6, 12, 7, "#cfd8e8", 3); };
const fish = (p: Pen) => { p.poly([[20, 60], [90, 20], [150, 60], [90, 100]], "#9aa8a0", 8); p.poly([[150, 60], [190, 30], [190, 90]], "#8a9890", 7); p.ell(50, 56, 7, 7, "#ffffff", 3); p.stroke([[44, 50], [56, 62]], 4); p.stroke([[56, 50], [44, 62]], 4); };
const bubble = (p: Pen) => { p.ell(60, 60, 40, 40, null, 7); p.arc(46, 46, 12, 8, 180, 270, 4, "#d8e8a8"); };
const thermo = (level: number) => (p: Pen) => { const g = p.g; p.poly(rr(70, 10, 150, 330, 40), "#ffffff", 10); p.ell(110, 330, 60, 60, "#ffffff", 10); p.poly(rr(94, 330 - 300 * level, 126, 330, 14), "#d2373a", 0); p.ell(110, 330, 42, 42, "#d2373a", 0); font(g, 30); g.fillStyle = "#241726"; g.fillText("HOTTEST EVER", 110, 392); };
const skullSign = (crossed: boolean) => (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 390, 290, 26), "#f2ead2", 12); p.ell(200, 110, 70, 64, "#ffffff", 9); p.ell(172, 104, 18, 22, INK, 0); p.ell(228, 104, 18, 22, INK, 0); p.poly([[200, 124], [190, 146], [210, 146]], INK, 0); for (let i = 0; i < 5; i++) p.stroke([[170 + i * 15, 160], [170 + i * 15, 172]], 5); p.poly(rr(130, 164, 270, 186, 6), "#ffffff", 7); font(g, 52); g.fillStyle = "#c92a2e"; g.fillText("CHOLERA", 200, 236); if (crossed) { g.strokeStyle = "#2a9a4a"; g.lineWidth = 26; g.beginPath(); g.moveTo(30, 30); g.lineTo(370, 270); g.moveTo(370, 30); g.lineTo(30, 270); g.stroke(); } };
const board = (crossed: boolean) => (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 590, 250, 22), "#2f3a34", 14); font(g, 52); g.fillStyle = "#f2ead2"; g.fillText("SMELL = CHOLERA", 300, 120); if (crossed) { g.strokeStyle = "#e84a4a"; g.lineWidth = 22; g.beginPath(); g.moveTo(40, 40); g.lineTo(560, 220); g.moveTo(560, 40); g.lineTo(40, 220); g.stroke(); } };
const pin = (p: Pen) => { p.poly(rr(10, 20, 70, 60, 8), "#d9a441", 8); p.stroke([[20, 40], [60, 40]], 4, "#8a5a22"); };
const dripCurtain = (p: Pen) => { p.poly([[20, 10], [180, 10], [170, 280], [100, 250], [30, 290]], "#2a6a3a", 9); for (let i = 0; i < 4; i++) p.stroke([[40 + i * 40, 20], [36 + i * 40, 270]], 5, "#1f5a2c"); p.ell(100, 300, 12, 16, "#9aff8a", 5); };
const bottle = (p: Pen) => { p.poly(rr(50, 50, 110, 160, 14), "#9aff8a", 8); p.poly(rr(70, 20, 90, 54, 4), "#f2ead2", 7); };
const pageN = (n: number) => (p: Pen) => { const g = p.g; p.poly(rr(14, 14, 186, 226, 10), "#f6f1e0", 9); p.poly(rr(14, 14, 186, 62, 10), "#c92a2e", 8); font(g, 100); g.fillStyle = "#241726"; g.fillText(String(n), 100, 148); };
const scrollC = (l1: string, l2: string, col = "#241726") => (p: Pen) => { const g = p.g; p.poly(rr(14, 30, 586, 250, 20), "#f2e8c8", 9); p.poly(rr(6, 20, 40, 260, 14), "#d8c890", 8); p.poly(rr(560, 20, 594, 260, 14), "#d8c890", 8); font(g, 64); g.fillStyle = col; g.fillText(l1, 300, 100); g.fillText(l2, 300, 176); };
const inkStamp = (word: string, col = "#c92a2e") => (p: Pen) => { const g = p.g; g.save(); g.translate(300, 120); g.rotate(-0.06); g.strokeStyle = col; g.lineWidth = 16; g.strokeRect(-270, -92, 540, 184); g.fillStyle = col; font(g, 100); g.fillText(word, 0, 8); g.restore(); };
const gavel = (p: Pen) => { p.stroke([[60, 230], [170, 120]], 18, "#6a3a22"); p.poly(rr(120, 50, 230, 130, 14), "#8a5a32", 9); };
const slate = (text: string, sz = 90) => (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 590, 230, 22), "#2f3a34", 14); p.poly(rr(24, 24, 576, 216, 14), "#3f524a", 0); g.fillStyle = "#f2ead2"; font(g, sz); g.fillText(text, 300, 124); };
const plans = (p: Pen) => { p.poly(rr(10, 30, 290, 190, 8), "#4a78c8", 9); for (let i = 0; i < 4; i++) p.stroke([[30, 60 + i * 30], [270, 60 + i * 30]], 3, "#cfe0ff"); p.stroke([[60, 40], [60, 180]], 3, "#cfe0ff"); p.stroke([[160, 40], [160, 180]], 3, "#cfe0ff"); };
const brickC = (p: Pen) => { p.poly(rr(10, 30, 110, 90, 6), "#b45a3a", 8); p.stroke([[30, 50], [60, 50]], 4, "#d89a7a"); };
const bucket = (p: Pen) => { p.poly([[30, 40], [130, 40], [112, 140], [48, 140]], "#8a6a3a", 9); p.arc(80, 40, 50, 30, 180, 360, 5, INK); };
const cup = (p: Pen) => { p.poly(rr(30, 40, 100, 110, 12), "#d8d2c0", 8); p.arc(106, 76, 16, 20, -90, 90, 6, INK); };
const boat = (p: Pen) => { p.poly([[10, 90], [250, 90], [210, 160], [50, 160]], "#6a4a2a", 10); p.stroke([[130, 90], [130, 20]], 8); };
const lantern = (p: Pen) => { p.ell(40, 40, 26, 30, "#ffd060", 8); };
const starC = (p: Pen) => { p.poly([[30, 4], [38, 24], [58, 26], [42, 38], [48, 58], [30, 46], [12, 58], [18, 38], [2, 26], [22, 24]], "#fff3b0", 2); };
const confetti = (p: Pen) => { const cols = ["#e84a4a", "#ffd84a", "#4a9ae8", "#6ac85a", "#d84ae8"]; for (let i = 0; i < 20; i++) p.poly([[40 + (i * 61) % 520, 20 + (i * 37) % 200], [58 + (i * 61) % 520, 28 + (i * 37) % 200], [46 + (i * 61) % 520, 48 + (i * 37) % 200]], cols[i % 5], 2); };
const ladder = (p: Pen) => { p.stroke([[30, 10], [30, 300]], 10, "#8a6a3a"); p.stroke([[110, 10], [110, 300]], 10, "#8a6a3a"); for (let i = 0; i < 7; i++) p.stroke([[30, 30 + i * 40], [110, 30 + i * 40]], 8, "#8a6a3a"); };

// ---------------- helpers ----------------
const sway = (t: number, i: number): FrontOpts["arms"] => ({ l: [-0.55 + 0.08 * Math.sin(t * 2.3 + i), 0.3 + 0.06 * Math.sin(t * 3.1 + i)], r: [0.55 - 0.08 * Math.sin(t * 2.7 + i), 0.3 + 0.06 * Math.sin(t * 2.9 + i * 2)] });
const cheer = (t: number, i: number): FrontOpts["arms"] => ({ l: [-0.6 - 0.1 * Math.round(Math.sin(t * 9 + i)), -0.95], r: [0.6, -0.95 + 0.08 * Math.round(Math.sin(t * 9 + i * 2))] });
const stroll = (t: number, i: number, speed = 1.0) => ((t * 0.7 * speed + hh(i, 4)) % 1 + 1) % 1;

export const stage = (f: number, cam: CamInfo): Stage => {
  const sh = shotAt(f), t = f / FPS, s = new S(cam, sh.set, t), id = sh.id, a = t - sh.a / FPS;
  const pop = (age: number, k = 0.55) => 1 + k * (1 - Math.min(1, Math.max(0, age) / 0.14));
  const clouds = (n: number, y: number, z: number, sp: number, big = 9) => { for (let k = 0; k < n; k++) { const u = ((t * sp / 60 + k / n) % 1); s.fx(`cl${k % 3}`, 400, 300, cloud(k % 3), -45 + 100 * u, y + 2 * Math.sin(t * 0.7 + k), z - 3 * (k % 3), big, big * 0.72, { soft: true }); } };
  const flies = (x: number, y: number, z: number, n = 3) => { for (let k = 0; k < n; k++) { const fa = t * (3 + k) + k * 2; s.fx("fly", 120, 120, fly(Math.sin(t * 40 + k)), x + 0.6 * Math.cos(fa), y + 0.35 * Math.sin(fa * 1.7), z + 0.3 * Math.sin(fa), 0.28, 0.28); } };
  const ar = (v: number) => Math.round(v * 2.5) / 2.5;
  switch (id) {
    case 1: {                                            // the stink rolls in; MPs burst out of Parliament
      clouds(7, 6, -9, 90, 11);
      for (let k = 0; k < 16; k++) { const t0 = T.T_FLEE + 0.14 * k; if (t < t0) continue; const x = -1 + 7.0 * (t - t0) + 0.0, z = -9.5 - 1.0 * (k % 3); s.who(10 + k, MP(k), `mp${k % 5}${k % 3}`, x, 0, z, { mode: "stroll", phase: q(((t * 2.6 + 0.13 * k) % 1), 24), expr: k % 2 ? "shock" : "pained", arms: { l: [-0.55, -0.9], r: [0.55, -0.9] } }); }
      if (t >= T.T_FLEE - 0.1 && t < T.T_FLEE + 0.4) s.burst(T.T_FLEE - 0.1, 0, 2.5, -13.2, 4.0, 0.3, "#ffffff");
      break;
    }
    case 2: {                                            // handkerchiefs over their faces
      for (let k = 0; k < 12; k++) { const x = 6 + 7.2 * (t - 4.14) + 1.1 * (k % 6) - 3.0, z = -4.8 - 0.9 * (k % 3) + 0.5 * (k >> 3); const hk = t >= T.T_HANK - 0.6; s.who(30 + k, MP(k + 2), `mq${k % 5}${k % 3}`, x, 0, z, { mode: "stroll", phase: q(((t * 2.8 + 0.11 * k) % 1), 24), expr: "pained", arms: hk ? { l: [-0.2, -0.75], r: [0.4, -0.2] } : { l: [-0.55, -0.4], r: [0.55, -0.4] } }); if (hk) s.fx("hky", 160, 160, hanky, x - 0.05, 1.55, z + 0.25, 0.45, 0.45, { rot: 0.2 * Math.sin(t * 8 + k) }); }
      clouds(5, 5, -8, 90, 10);
      break;
    }
    case 3: {                                            // the river right outside their windows
      for (let k = 0; k < 6; k++) { const u = (t * 0.06 + hh(k, 2)) % 1; s.fx("fish", 200, 120, fish, -10 + 20 * hh(k, 3) + 1.5 * Math.sin(t + k), -2.85, 14 + 20 * u, 1.3, 0.8, { flat: true, rot: 0.3 * k }); }
      for (let k = 0; k < 10; k++) { const u = (t * 0.5 + k / 10) % 1; s.fx("bbl", 120, 120, bubble, -8 + 16 * hh(k, 4), -2.7 + 0.2 * Math.sin(t * 4 + k), 10 + 24 * hh(k, 5), 0.6 * (0.5 + u), 0.6 * (0.5 + u), { flat: true }); }
      s.fx("boat", 260, 180, boat, -3, -2.2, 20, 3.4, 2.4, { rot: 0.04 * Math.sin(t * 2) });
      s.who(1, LONDONER(1), "row", -2.6, -2.2, 20.4, { mode: "sit", expr: "pained", arms: { l: [-0.4, 0.5 + 0.2 * Math.sin(t * 3)], r: [0.4, 0.5 - 0.2 * Math.sin(t * 3)] } }, 1, false);
      flies(0, 1.6, 12, 5); clouds(4, 4, 14, 60, 10);
      break;
    }
    case 4: {                                            // sewage pours in, Londoners drink the water
      for (let k = 0; k < 6; k++) { const x = -9 + 3.6 * k, drink = t >= T.T_DRINK - 0.3; s.who(40 + k, LONDONER(k + 4), `lo${k % 4}`, x, 0, 6.9, { mode: "stand", expr: drink ? (k % 2 ? "pained" : "smile") : "neutral", arms: drink ? { l: [-0.4, 0.2], r: [0.1, -0.45 + 0.1 * Math.sin(t * 5 + k)] } : { l: [-0.5, 0.3], r: [0.5, 0.3] } }); const u = (t * 0.5 + k * 0.17) % 1, y = 1.2 - 4.0 * (u < 0.5 ? u * 2 : (1 - u) * 2); s.fx("bkt", 160, 160, bucket, x + 0.55, y, 9.0, 0.5, 0.5); if (drink) s.fx("cup", 140, 140, cup, x + 0.05, 1.55, 7.15, 0.35, 0.35); }
      for (let k = 0; k < 3; k++) { const u = (t * 0.8 + k / 3) % 1; s.fx("bbl", 120, 120, bubble, -8 + 8 * k + 0.3 * Math.sin(t * 3), -2.7 + 0.15 * Math.sin(t * 5), 13 + 5 * u, 0.7, 0.7, { flat: true }); }
      flies(0, 1.8, 14, 4);
      break;
    }
    case 5: {                                            // the hottest summer; the river cooks
      const lv = clamp01((t - T.T_HOT + 0.6) / 1.2);
      s.fx(`th${Math.round(lv * 8)}`, 240, 420, thermo(Math.round(lv * 8) / 8), 2.2, 3.4, 10, 1.4, 2.35, { rot: 0.03 * Math.sin(t * 3) });
      for (let k = 0; k < 14; k++) { const u = (t * 0.7 + k / 14) % 1; s.fx("bbl", 120, 120, bubble, -9 + 18 * hh(k, 6), -2.6 + 0.3 * u, 12 + 26 * hh(k, 7), 0.9 * (0.6 + u), 0.9 * (0.6 + u), { flat: true }); }
      for (let k = 0; k < 8; k++) { const u = (t * 0.45 + k / 8) % 1; s.fx("steam", 400, 300, cloud(k % 3), -10 + 20 * hh(k, 8), -1.5 + 6 * u, 20 + 14 * hh(k, 9), 7, 5, { soft: true }); }
      flies(0, 2.2, 10, 4);
      break;
    }
    case 6: {                                            // curtains soaked in chemicals; MPs hold their noses
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) { const n = (sx > 0 ? 0 : 12) + k * 4 + j, x = sx * (3.6 + 1.2 * k), y = 0.5 + 0.45 * k, z = -15.5 + 2.6 * j; s.who(100 + n, MP(n), `mb${n % 5}`, x, y, z, { mode: "sit", expr: "pained", arms: { l: [-0.3, 0.6], r: [0.3, -0.1 + 0.1 * Math.sin(t * 2 + n)] } }, 0.95, false); if (t >= T.T_CURTAIN - 0.4 && (n % 2 === 0)) s.fx("pin", 100, 80, pin, x, y + 1.55, z + 0.2, 0.3, 0.2); }
      s.who(1, SPEAKER, "spk", 0, 0.6, -20.6, { mode: "sit", expr: "pained", arms: { l: [-0.4, 0.6], r: [0.4, 0.6] } }, 1, false);
      for (let k = 0; k < 4; k++) { const sx = k % 2 ? 1 : -1, z = -14 + 7 * (k >> 1); s.fx("lad", 140, 320, ladder, sx * 11.4, 3.2, z, 1.0, 2.2); s.who(120 + k, SERVANT, "sv", sx * 11.0, 2.4 + 0.2 * Math.sin(t * 5 + k), z, { mode: "stand", expr: "strain" as Expr, arms: { l: [-0.5, -0.95], r: [0.5, -0.95] } } as never, 0.9, false); }
      if (t >= T.T_CURTAIN) for (let k = 0; k < 6; k++) { const u = (t * 0.8 + k / 6) % 1; s.fx("drip", 100, 100, bottle, (k % 2 ? 1 : -1) * 10.6, 6 - 5 * u, -15 + 5 * (k >> 1), 0.4, 0.4, { rot: 6 * u }); }
      flies(0, 3, -8, 3);
      break;
    }
    case 7: {                                            // doctors panic: disease comes from smells
      for (let k = 0; k < 3; k++) s.who(60 + k, DOCTOR, `dr${k}`, -1.9 + 1.9 * k, 0, -4.6 - 0.5 * (k % 2), { mode: "stand", expr: t >= T.T_CHOL ? "shock" : "nervous", headTilt: 0.1 * Math.sin(t * 4 + k), arms: t >= T.T_CHOL ? { l: [-0.6, -0.95], r: [0.6, -0.95] } : { l: [-0.4, 0.1], r: [0.45, -0.3 + 0.1 * Math.sin(t * 6 + k)] } });
      if (t >= T.T_CHOL - 0.1) s.fx("skull", 400, 300, skullSign(false), 0.0, 3.5, -3.8, 2.4 * pop(t - T.T_CHOL), 1.8 * pop(t - T.T_CHOL), { rot: -0.05 });
      clouds(6, 3.5, -3, 80, 9); flies(0, 2.5, -4.6, 3);
      break;
    }
    case 8: {                                            // wrong about the smell; but the panic worked
      const up = t >= T.T_PANIC;
      s.fx("board", 600, 260, board(t >= T.T_WRONG), 0, 4.0, -10, 2.7, 1.17, { rot: 0.03 * Math.sin(t * 2) });
      for (let k = 0; k < 14; k++) { const x = (k % 7 - 3) * 1.5 + 0.3 * hh(k, 2), z = -7 - 1.6 * (k >> 3); const jump = up ? 0.35 * Math.abs(Math.sin(t * 9 + k)) : 0; s.who(100 + k, MP(k), `mb${k % 5}`, x, jump, z, { mode: "stand", expr: up ? "shock" : "pained", arms: up ? cheer(t, k) : sway(t, k) }); }
      break;
    }
    case 9: {                                            // eighteen days: the sewers law
      const d = Math.min(18, Math.max(1, Math.floor(1 + (t - T.T_DAYS) / 0.14)));
      s.who(1, SPEAKER, "spk", 0, 0.6, -20.6, { mode: "sit", expr: t >= T.T_LAW ? "grin" : "stern", arms: { l: [-0.5, 0.3], r: [0.5, t >= T.T_LAW ? -0.8 : 0.3] } }, 1, false);
      for (let k = 0; k < 14; k++) { const sx = k % 2 ? 1 : -1, row = (k >> 1) % 3, x = sx * (3.6 + 1.2 * row), y = 0.5 + 0.45 * row, z = -15.5 + 2.6 * (k >> 2); s.who(100 + k, MP(k), `mb${k % 5}`, x, y, z, { mode: "sit", expr: t >= T.T_LAW ? "laugh" : "neutral", arms: t >= T.T_LAW ? cheer(t, k) : sway(t, k) }, 0.95, false); }
      if (t >= T.T_DAYS && t < T.T_LAW + 0.2) s.fx(`pg${d}`, 200, 240, pageN(d), -2.0, 3.6, -9.5, 1.3, 1.56, { rot: 0.05 * Math.sin(t * 6) });
      if (t >= T.T_LAW) { s.fx("act", 600, 290, scrollC("SEWERS", "ACT"), 2.2, 3.4, -9.5, 2.4 * pop(t - T.T_LAW), 1.16 * pop(t - T.T_LAW), { rot: -0.04 }); s.fx("passed", 600, 240, inkStamp("PASSED"), 2.2, 2.2, -9.4, 1.9 * pop(t - T.T_LAW), 0.76 * pop(t - T.T_LAW), { rot: -0.08 }); s.burst(T.T_LAW, 2.2, 2.2, -9.3, 3.0, 0.3, "#ffd27a"); }
      s.fx("gav", 240, 240, gavel, 0.8, 1.5 + (t >= T.T_LAW ? 0 : 0.8), -11.2, 0.9, 0.9, { rot: t >= T.T_LAW ? -0.3 : 0.8 });
      break;
    }
    case 10: {                                           // Bazalgette builds the sewers
      s.who(1, BAZALGETTE, "bz", 0.0, 0.35, -9.0, { mode: "stand", expr: "grin", arms: { l: [-0.5, 0.2], r: [0.6, -0.5 + 0.1 * Math.sin(t * 4)] } }, 1.05);
      s.fx("plans", 300, 220, plans, -1.6, 1.6, -8.8, 1.2, 0.9, { rot: -0.1 });
      for (let k = 0; k < 10; k++) { const sx = k % 2 ? 1 : -1, z = -13 - 2.8 * (k >> 1), ph = Math.sin(t * 8 + k * 1.3); s.who(120 + k, WORKER(k), `wk${k % 3}`, sx * 2.2, 0.35, z, { mode: "stand", expr: "grin", arms: { l: [-0.5, ar(0.2 + 0.4 * ph)], r: [0.5, ar(-0.2 - 0.4 * ph)] } }); if (k % 2 === 0) { const u = (t * 1.4 + k * 0.13) % 1; s.fx("brk", 120, 120, brickC, sx * (2.2 - 2.0 * u), 0.9 + 1.2 * Math.sin(Math.PI * u), z + 0.1, 0.5, 0.4, { rot: 4 * u }); } }
      if (t >= T.T_BAZ + 1.0 && t < T.T_BRICKS - 0.2) s.fx("miles", 600, 240, slate("1,100 MILES"), 0, 4.2, -13, 3.2 * pop(t - T.T_BAZ - 1.0), 1.28 * pop(t - T.T_BAZ - 1.0));
      if (t >= T.T_BRICKS - 0.2) { const n = Math.round(300 * clamp01((t - T.T_BRICKS + 0.2) / 1.0)); s.fx(`bk${n}`, 600, 240, slate(`${n},000,000 BRICKS`, 62), 0, 4.2, -13, 3.6, 1.44); }
      break;
    }
    case 11: {                                           // the sewage flows far out; cholera ends
      for (let k = 0; k < 8; k++) { const sx = k % 2 ? 1 : -1, z = -16 - 6.5 * (k >> 1); s.who(120 + k, WORKER(k), `wk${k % 3}`, sx * 2.3, 0.35, z, { mode: "stand", expr: "laugh", arms: cheer(t, k) }); }
      s.fx("skull", 400, 300, skullSign(t >= T.T_ENDED), 0, 3.2, -64, 3.6, 2.7, { rot: 0.0 });
      for (let k = 0; k < 8; k++) { const u = (t * 0.3 + k / 8) % 1; s.fx("bbl", 120, 120, bubble, 0.5 * Math.sin(t * 2 + k), 0.18, -12 - 60 * u, 0.6, 0.6, { flat: true }); }
      break;
    }
    case 12: {                                           // millions of lives saved: Londoners celebrate by the clean river
      for (let k = 0; k < 24; k++) { const x = -10 + 0.9 * k + 0.3 * hh(k, 2), z = -3.5 - 1.2 * (k % 4), jump = 0.2 * Math.abs(Math.sin(t * 8 + k)); s.who(40 + k, LONDONER(k), `lo${k % 4}`, x, jump, z, { mode: "stand", expr: "laugh", arms: cheer(t, k) }, 1, k < 12); if (k % 3 === 0) { const u = (t * 0.6 + k * 0.1) % 1; s.fx("hky", 160, 160, hanky, x, 2.4 + 2.5 * u, z, 0.45, 0.45, { rot: 5 * u }); } }
      for (let n = 0; n < 6; n++) { const u = (t * 0.5 + n / 6) % 1; s.fx("conf", 600, 300, confetti, -8 + 3.2 * n, 9 - 8 * u, -4, 3.4, 1.7, { rot: 0.4 * Math.sin(t + n) }); }
      break;
    }
    case 13: {                                           // the sewers still work today
      s.who(1, MODERN, "mod", -1.5, 0.35, -32, { mode: "stand", expr: "grin", arms: { l: [-0.5, 0.2], r: [0.6, -0.9 + 0.1 * Math.sin(t * 5)] } }, 1.05);
      s.who(2, WORKER(1), "wk1", 1.6, 0.35, -34, { mode: "stand", expr: "smile", arms: { l: [-0.5, 0.2], r: [0.6, -0.8] } });
      s.fx("today", 600, 240, slate("STILL WORKING", 70), 0, 4.2, -38, 3.4, 1.36);
      for (let k = 0; k < 6; k++) { const u = (t * 0.3 + k / 6) % 1; s.fx("bbl", 120, 120, bubble, 0.5 * Math.sin(t * 2 + k), 0.18, -26 - 50 * u, 0.6, 0.6, { flat: true }); }
      break;
    }
    case 14: {                                           // CTA: a handkerchief on the lamp post, stars, a boat light on the clean Thames
      s.fx("hky", 160, 160, hanky, 0.5, 3.4 + 0.05 * Math.sin(t * 3), 3.4, 0.9, 0.9, { rot: 0.3 * Math.sin(t * 2.5) });
      for (let k = 0; k < 12; k++) s.fx("star", 70, 70, starC, -22 + 44 * hh(k, 2), 18 + 14 * hh(k, 3), -30, 1.1, 1.1, { rot: 0.4 * Math.sin(t + k) });
      const u = (t * 0.05) % 1; s.fx("lan", 90, 90, lantern, -20 + 40 * u, -2.2, 40, 1.4, 1.4); s.fx("boat", 260, 180, boat, -20 + 40 * u, -2.6, 40.2, 3.0, 2.1);
      for (let k = 0; k < 5; k++) { const v = (t * 0.2 + k / 5) % 1; s.fx("mote", 60, 60, (p: Pen) => { p.ell(30, 30, 9, 9, "#fff3b0", 0); }, -4 + 8 * hh(k, 4) + 0.5 * Math.sin(t + k), 0.5 + 3 * v, 1.5 + 4 * hh(k, 5), 0.12, 0.12, { soft: true }); }
      break;
    }
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW; void smooth; void stroll; void mpX; void fxPuff;
export type { V3, SetName, Expr, FrontOpts };
