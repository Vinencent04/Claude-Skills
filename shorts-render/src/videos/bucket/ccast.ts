// Cast of "The War of the Bucket": Bologna (red) vs Modena (blue) soldiers, mayors, thieves, a poet; drawn cards (flames, coins, crown, clock, cobweb, titles).
// stage(f, cam) -> character cards + effect cards at frame f (world coordinates). bucketAt(t) poses the 3D bucket.
import * as THREE from "three";
import { Pen, bodyFront, fxBurst, fxPuff, fxContact, fxShadow, SKINS, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import * as T from "./story";
import { FPS, V3, SetName, toW, shotAt } from "./story";

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();

// ---------------- outfits ----------------
const BOLO = (v: number, o: Partial<Outfit> = {}): Outfit => ({ jacket: "#b03a3a", pants: "#5a4a4a", boots: "#2a2220", hat: "cap", cap: "#b03a3a", belt: "#e8d8a0", buttons: "#e8c45a", sword: true, skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult", ...o });
const MODE = (v: number, o: Partial<Outfit> = {}): Outfit => ({ jacket: "#3a5aa8", pants: "#3a3a50", boots: "#222230", hat: "cap", cap: "#3a5aa8", belt: "#e8d8a0", buttons: "#e8c45a", sword: true, skin: SKINS[(v + 1) % 4], build: v % 3 === 1 ? "stout" : "adult", ...o });
const THIEF = (v: number): Outfit => ({ jacket: "#262c48", pants: "#1e2236", boots: "#16161e", hat: "cap", cap: "#1a1f36", skin: SKINS[v % 4], build: "adult" });
const MAYOR_B: Outfit = BOLO(0, { hat: "feather", sword: false, moustache: "#5a4a3a", build: "stout", sash: "#e8c45a" });
const MAYOR_M: Outfit = MODE(1, { hat: "feather", sword: false, moustache: "#d8d2c6", build: "stout", sash: "#e8c45a" });
const POET: Outfit = { jacket: "#6a3a8a", pants: "#3a2a4a", boots: "#2a2030", hat: "feather", moustache: "#3a2a1a", skin: SKINS[1], build: "adult", buttons: "#e8c45a" };

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
const font = (g: CanvasRenderingContext2D, px: number) => { g.font = `900 ${px}px Georgia, 'Times New Roman', serif`; g.textAlign = "center"; g.textBaseline = "middle"; };
const rr = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): [number, number][] => {
  const pts: [number, number][] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(((a + (90 * i) / n) * Math.PI) / 180), cy + r * Math.sin(((a + (90 * i) / n) * Math.PI) / 180)]);
  return pts;
};
const glowC = (rgb: string) => (p: Pen) => { const g = p.g; const gr = g.createRadialGradient(100, 100, 4, 100, 100, 96); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.4, `rgba(${rgb},0.55)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.beginPath(); g.arc(100, 100, 96, 0, 7); g.fill(); };
const glowGold = glowC("255,214,120"), glowWhite = glowC("255,255,235");
const flameC = (p: Pen) => { p.poly([[100, 6], [150, 80], [172, 150], [140, 196], [100, 210], [60, 196], [28, 150], [50, 80], [74, 100]], "#ff7a1c", 8); p.poly([[100, 70], [132, 130], [140, 170], [100, 196], [60, 170], [70, 130]], "#ffc83a", 0); };
const spark = (p: Pen) => { p.poly([[30, 2], [36, 24], [58, 30], [36, 36], [30, 58], [24, 36], [2, 30], [24, 24]], "#fff3a0", 0); };
const smoke = (p: Pen) => { const g = p.g; for (let i = 0; i < 6; i++) { const x = 100 + 40 * Math.cos(i * 1.9), y = 100 + 30 * Math.sin(i * 1.4), r = 52; const gr = g.createRadialGradient(x, y, 4, x, y, r); gr.addColorStop(0, "rgba(120,100,80,0.7)"); gr.addColorStop(1, "rgba(120,100,80,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } };
const starC = (p: Pen) => { p.poly([[30, 4], [38, 24], [58, 26], [42, 38], [48, 58], [30, 46], [12, 58], [18, 38], [2, 26], [22, 24]], "#fff3b0", 2); };
const plate = (l1: string, l2: string, bg = "#2a1a10", fg = "#ffd84a") => (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 590, 230, 24), bg, 10); font(g, l2 ? 74 : 110); g.fillStyle = fg; if (l2) { g.fillText(l1, 300, 80); g.fillText(l2, 300, 170); } else g.fillText(l1, 300, 120); };
const qmark = (p: Pen) => { const g = p.g; font(g, 150); g.lineWidth = 14; g.strokeStyle = "#1a1a24"; g.strokeText("?", 60, 70); g.fillStyle = "#ffe066"; g.fillText("?", 60, 70); };
const bang = (p: Pen) => { const g = p.g; font(g, 150); g.lineWidth = 14; g.strokeStyle = "#1a1a24"; g.strokeText("!", 60, 70); g.fillStyle = "#ff5a4a"; g.fillText("!", 60, 70); };
const zzz = (p: Pen) => { const g = p.g; font(g, 70); g.lineWidth = 8; g.strokeStyle = "#1a1a24"; g.strokeText("Z z z", 100, 50); g.fillStyle = "#e8f0ff"; g.fillText("Z z z", 100, 50); };
const coin = (p: Pen) => { p.ell(60, 60, 40, 40, "#f1c232", 8); p.ell(60, 60, 26, 26, null, 3); p.stroke([[16, 104], [104, 16]], 12, "#d2373a"); };
const crownC = (p: Pen) => { p.poly([[14, 100], [14, 40], [42, 70], [60, 24], [78, 70], [106, 40], [106, 100]], "#f1c232", 8); p.stroke([[10, 104], [110, 12]], 12, "#d2373a"); };
const bolt = (p: Pen) => { p.poly([[70, 4], [24, 90], [56, 90], [36, 176], [100, 70], [66, 70]], "#ffe066", 7); };
const clockFace = (u: number) => (p: Pen) => { p.ell(150, 150, 130, 130, "#f6efd8", 10); for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; p.stroke([[150 + 104 * Math.sin(a), 150 - 104 * Math.cos(a)], [150 + 120 * Math.sin(a), 150 - 120 * Math.cos(a)]], 7); } const m = u * Math.PI * 2, h = m / 12; p.stroke([[150, 150], [150 + 100 * Math.sin(m), 150 - 100 * Math.cos(m)]], 8); p.stroke([[150, 150], [150 + 66 * Math.sin(h), 150 - 66 * Math.cos(h)]], 12); p.dot(150, 150, 12); };
const cobweb = (p: Pen) => { const g = p.g; g.strokeStyle = "rgba(245,245,250,.95)"; g.lineWidth = 3; for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 5; g.beginPath(); g.moveTo(10, 10); g.lineTo(10 + 150 * Math.cos(a / 1.2), 10 + 150 * Math.sin(a / 1.2)); g.stroke(); } for (const r of [40, 80, 120]) { g.beginPath(); g.arc(10, 10, r, 0, Math.PI / 2); g.stroke(); } };
const cloud = (p: Pen) => { p.ell(100, 90, 70, 40, "#8a92a6", 6); p.ell(60, 100, 40, 30, "#98a0b4", 0); p.ell(140, 100, 44, 30, "#98a0b4", 0); };
const rainDrop = (p: Pen) => { p.poly([[10, 2], [16, 22], [10, 28], [4, 22]], "#7ab8ff", 2); };
const bookC = (p: Pen) => { p.poly(rr(10, 30, 200, 150, 8), "#7a2a2a", 8); p.stroke([[105, 32], [105, 148]], 5); for (let i = 0; i < 3; i++) { p.stroke([[24, 60 + i * 26], [92, 60 + i * 26]], 4, "#e8d8a0"); p.stroke([[118, 60 + i * 26], [186, 60 + i * 26]], 4, "#e8d8a0"); } };
const penC = (p: Pen) => { p.stroke([[10, 60], [50, 10]], 8, "#3a2a1a"); p.poly([[44, 14], [60, 4], [56, 20]], "#f6f3ea", 3); };
const rays = (p: Pen) => { const g = p.g; for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.2; g.fillStyle = "rgba(255,236,170,.30)"; g.beginPath(); g.moveTo(150, 290); g.lineTo(150 + 300 * Math.sin(a) - 12, 290 - 290 * Math.cos(a)); g.lineTo(150 + 300 * Math.sin(a) + 12, 290 - 290 * Math.cos(a)); g.fill(); } };
const dustC = (p: Pen) => { p.ell(60, 60, 44, 32, "#d8c8a0", 0); p.ell(40, 70, 28, 22, "#e8dab4", 0); };
const swords = (p: Pen) => { p.stroke([[20, 20], [180, 160]], 14, "#c8ccd4"); p.stroke([[180, 20], [20, 160]], 14, "#c8ccd4"); p.stroke([[10, 150], [50, 120]], 10, "#8a5a2a"); p.stroke([[190, 150], [150, 120]], 10, "#8a5a2a"); };

// ---------------- helpers ----------------
const ar = (v: number) => Math.round(v * 2.5) / 2.5;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const BOL = T.BOL, MOD = T.MOD, WZ = T.WELL[2];
const stands = (t: number, x: number) => ({ x, t });
/** thieves: sneak in through the gate, one takes the bucket and runs east */
const thief = (k: number, t: number): { x: number; z: number; run: boolean; vis: boolean } => {
  const sx = [BOL - 1.2, BOL + 0.4, BOL + 1.6][k], ex = [BOL + 0.9, BOL - 1.0, BOL + 0.2][k], ez = [-1.2, -0.9, 0.5][k];
  const u = clamp01((t - 13.6 - 0.25 * k) / 2.7);
  if (t < 17.2 + 0.2 * k) return { x: lerp(sx, ex, u), z: lerp(-9.3, ez, u), run: u > 0 && u < 1, vis: t > 13.5 };
  const r = (t - 17.2 - 0.2 * k) / 3.2;
  return { x: ex + (-19.4 - ex + 0.9 * k) * T.glide(r), z: lerp(ez, 1.2 - 0.9 * k, smooth(r * 1.6)), run: true, vis: t < 21.0 };
};
export const bucketAt = (t: number): { visible: boolean; pos: V3; scale: number; rot: V3 } => {
  if (t < 8.0) { const sh = t > T.T_NEVER - 0.2 && t < T.T_NEVER + 1 ? 0.12 * Math.sin((t - T.T_NEVER) * 40) * (1 - (t - T.T_NEVER)) : 0; return { visible: true, pos: [0, 0.7 + 0.03 * Math.sin(t * 3), 0], scale: 1.5, rot: [0, t * 0.5, sh] }; }
  if (t < 13.0) return { visible: false, pos: [0, 0, 0], scale: 1, rot: [0, 0, 0] };
  if (t < 16.4) return { visible: true, pos: [BOL, 1.25, WZ], scale: 1.1, rot: [0, 0, 0.06 * Math.sin(t * 2)] };
  const th = thief(0, t);
  if (t < 17.2) { const u = smooth((t - 16.4) / 0.8); return { visible: true, pos: [lerp(BOL, th.x + 0.1, u), lerp(1.25, 1.0, u), lerp(WZ, th.z + 0.4, u)], scale: 1.1, rot: [0, 0, 0] }; }
  if (t < 20.9) return { visible: true, pos: [th.x + 0.2, 1.0 + 0.06 * Math.abs(Math.sin(t * 9)), th.z + 0.45], scale: 1.1, rot: [0, 0, 0.1 * Math.sin(t * 9)] };
  if (t < 24.1) return { visible: true, pos: [1.0, 0.95, 0.5], scale: 1.0, rot: [0, 0, 0] };
  return { visible: true, pos: [T.PLINTH[0], 0.7, T.PLINTH[2]], scale: 1.25, rot: [0, 0.3 * Math.sin(t), 0] };
};

export const stage = (f: number, cam: CamInfo): Stage => {
  const t = f / FPS, s = new S(cam, "w", t);
  const pop = (age: number, k = 0.55) => 1 + k * (1 - Math.min(1, Math.max(0, age) / 0.14));
  const flameAt = (x: number, y: number, z: number, w: number, k = 0) => { const sc = 1 + 0.18 * Math.sin(t * 17 + k * 2.1); s.fx("fl", 200, 220, flameC, x, y + 0.4 * w, z, w * sc, w * 1.1 * sc); };
  const puffAt = (t0: number, x: number, z: number, w = 1.6, dur = 0.9) => { if (t >= t0 && t < t0 + dur) { const u = (t - t0) / dur; s.fx("dust", 120, 120, dustC, x, 0.4 + 0.8 * u, z, w * (0.5 + u), w * (0.5 + u) * 0.8, { soft: true }); } };
  const burstAt = (t0: number, x: number, y: number, z: number, w: number, dur = 0.4, col = "#fff3b0") => s.burst(t0, x, y, z, w, dur, col);
  const stars = (n = 30) => { const nn = T.nightness(t); if (nn < 0.4) return; for (let k = 0; k < n; k++) s.fx("star", 70, 70, starC, -70 + 140 * hh(k, 5), 18 + 34 * hh(k, 6), -80, 1.6 * nn, 1.6 * nn, { rot: 0.4 * Math.sin(t + k) }); };
  const grunt = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, fo: Partial<FrontOpts> = {}, sc = 1, y = 0) => s.who(i, o, ok, x, y, z, { mode: "stand", expr, ...fo }, sc, true);
  const run = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, speed = 1.6, arms: FrontOpts["arms"] = { l: [-0.5, -0.5], r: [0.5, -0.5] }, sc = 1) => s.who(i, o, ok, x, 0, z, { mode: "stroll", phase: q(((t * speed * 0.7 + hh(i, 4)) % 1 + 1) % 1, 12), expr, arms }, sc, true);
  stars();

  // ---------- 0-13: the hook: two armies, the bucket between them; then the rival mayors ----------
  if (t < 13.5) {
    for (let k = 0; k < 5; k++) for (const side of [-1, 1] as const) {
      const i = 10 + k * 2 + (side > 0 ? 1 : 0), x = side * (3.0 + 0.3 * (k % 2)), z = -4.2 + 2.1 * k, fall = t >= T.T_DIE + 0.12 * k + (side > 0 ? 0.1 : 0) && (k % 2 === (side > 0 ? 0 : 1)), o = side < 0 ? BOLO(k) : MODE(k);
      const war = t >= T.T_WAR, sw = Math.sin(t * 9 + k * 1.7);
      if (fall) { s.who(i, o, `h${side}${k % 3}f`, x - side * 0.8, 0, z, { mode: "fall", expr: "dazed" }, 1, false); continue; }
      grunt(i, o, `h${side}${k % 3}${war ? "w" : "s"}`, x, z, war ? "stern" : "neutral", { arms: war ? { l: [-0.55, ar(-0.8 + 0.2 * sw)], r: [0.55, ar(-0.8 - 0.2 * sw)] } : { l: [-0.4, 0.3], r: [0.45, 0.3] }, headTilt: war ? ar(0.06 * sw) : 0 });
    }
    if (t < 8.2) { s.fx("gl", 200, 200, glowGold, 0, 1.4, 0.2, 3.6 + 0.4 * Math.sin(t * 4), 3.6 + 0.4 * Math.sin(t * 4), { soft: true }); }
    if (t < 3.0) s.fx("y1325", 600, 240, plate("1325", "", "#2a1a10", "#ffd84a"), 0, 3.4, 0.2, 2.8 * pop(t - 0.1, 0.3), 1.1 * pop(t - 0.1, 0.3));
    burstAt(T.T_WAR, 0, 2.2, 0.3, 7, 0.5, "#ffe9a0");
    if (t >= T.T_WAR && t < T.T_WAR + 1.2) s.fx("sw", 200, 200, swords, 0, 2.6 + 0.4 * Math.sin(t * 20), 0.4, 2.2 * pop(t - T.T_WAR), 2.2 * pop(t - T.T_WAR), { rot: 0.1 * Math.sin(t * 25) });
    for (let k = 0; k < 4; k++) puffAt(T.T_DIE + 0.2 + 0.3 * k, (k % 2 ? 4.6 : -4.6), -3 + 2 * k, 1.8);
    if (t >= T.T_DIE && t < T.T_NEVER + 0.6) s.fx("k2", 600, 240, plate("2,000", "", "#2a1a10", "#ff6a5a"), 0, 5.2, -0.5, 4.6 * pop(t - T.T_DIE, 0.3), 1.84 * pop(t - T.T_DIE, 0.3), { rot: -0.03 });
    if (t >= 8.0) {                                      // the mayors: two rival cities, face to face
      const hate = clamp01((t - T.T_HATE) / 0.4), sh = Math.sin(t * 14);
      grunt(30, MAYOR_B, "mayB", -2.3, 3, "stern", { headTilt: ar(0.12 * sh * hate), arms: { l: [-0.5, ar(0.4 + 0.2 * sh * hate)], r: [0.55, -0.9] } }, 1.2);
      grunt(31, MAYOR_M, "mayM", 2.3, 3, "stern", { headTilt: ar(-0.12 * sh * hate), arms: { l: [-0.55, -0.9], r: [0.5, ar(0.4 - 0.2 * sh * hate)] } }, 1.2);
      s.fx("bolt", 200, 200, bolt, 0, 2.2 + 0.1 * sh, 3.0, 1.2 * (0.8 + 0.2 * Math.abs(sh)), 1.2 * (0.8 + 0.2 * Math.abs(sh)), { rot: 0.2 * sh });
      for (let n = 0; n < 3; n++) { const u = (t * 0.8 + n / 3) % 1; s.fx("sm", 200, 200, smoke, -2.3 + 0.3 * n, 3.0 + 1.0 * u, 3, 0.9, 0.9, { soft: true }); s.fx("sm", 200, 200, smoke, 2.3 - 0.3 * n, 3.0 + 1.0 * u, 3, 0.9, 0.9, { soft: true }); }
    }
  }

  // ---------- 13-21: night in Bologna: the theft ----------
  if (t >= 12.6 && t < 21.4) {
    grunt(43, BOLO(2), "guard", BOL + 2.1, -8.6, "relief", { mode: "sit" as never } as Partial<FrontOpts>, 1.05);
    s.fx("zz", 240, 120, zzz, BOL + 2.9, 2.2 + 0.2 * Math.sin(t * 2), -8.4, 1.0, 0.5, { rot: 0.2 });
    for (const x of [BOL - 2.6, BOL + 2.6]) flameAt(x, 2.8, -9.0, 0.5, x);
    for (let k = 0; k < 3; k++) { const th = thief(k, t); if (!th.vis) continue; const grab = k === 0 && t > T.T_STEAL && t < 17.4; s.who(40 + k, THIEF(k), `th${k}${th.run ? "r" : "s"}`, th.x, 0, th.z, th.run ? { mode: "stroll", phase: q(((t * (t > 17.2 ? 2.2 : 0.9) + 0.3 * k) % 1), 12), expr: t > 17.2 ? "grin" : "nervous", arms: t > 17.2 ? { l: [-0.4, 0.5], r: [0.4, 0.5] } : { l: [-0.4, 0.3], r: [0.4, 0.3] } } : { mode: "stand", expr: grab ? "grin" : "nervous", arms: grab ? { l: [-0.3, 0.6], r: [0.3, 0.6] } : { l: [-0.4, 0.3], r: [0.4, 0.3] } }, 1, true); }
    if (t >= T.T_NOGOLD && t < 20.4) s.fx("ng", 140, 140, coin, -23.0, 2.7 + 0.15 * Math.sin(t * 5), 1.2, 1.3 * pop(t - T.T_NOGOLD), 1.3 * pop(t - T.T_NOGOLD));
    if (t >= T.T_NOCROWN && t < 20.4) s.fx("nc", 140, 140, crownC, -21.4, 2.7 + 0.15 * Math.sin(t * 5), 1.2, 1.3 * pop(t - T.T_NOCROWN), 1.3 * pop(t - T.T_NOCROWN));
    if (t >= T.T_BUCKET && t < 20.9) { const th = thief(0, t); s.fx("gl", 200, 200, glowGold, th.x + 0.2, 1.2, th.z + 0.4, 2.6, 2.6, { soft: true }); burstAt(T.T_BUCKET, th.x + 0.2, 1.3, th.z + 0.8, 3.0, 0.4); }
  }

  // ---------- 20.9-24: the quarrel: Bologna demands, Modena says no ----------
  if (t >= 20.5 && t < 24.6) {
    const no = t >= T.T_NO, sh = Math.sin(t * 12);
    grunt(50, MAYOR_B, "mayB", -1.5, 0, "stern", { headTilt: ar(0.1 * sh), arms: { l: [-0.5, 0.4], r: [0.55, ar(-0.9 + 0.15 * sh)] } }, 1.3);
    grunt(51, MAYOR_M, "mayM", 1.5, 0, no ? "grin" : "neutral", { headTilt: no ? ar(0.25 * Math.sin(t * 16)) : 0, arms: { l: [-0.4, 0.5], r: [0.4, 0.5] } }, 1.3);
    if (t < T.T_NO) s.fx("bg", 120, 120, bang, -1.5, 3.6, 0, 1.2 * pop(t - T.T_DEMAND), 1.2 * pop(t - T.T_DEMAND));
    if (no) s.fx("no", 600, 240, plate("NO!", "", "#c92a2e", "#ffffff"), 1.5, 3.9, 0, 2.6 * pop(t - T.T_NO, 0.4), 1.04 * pop(t - T.T_NO, 0.4), { rot: 0.05 });
  }

  // ---------- 24-38: the army, the charge, the rout ----------
  if (t >= 23.9 && t < 38.2) {
    const front = -30 + (t - T.T_ARMY) * 2.9;
    for (let n = 0; n < 60; n++) {
      const c = n % 12, r = Math.floor(n / 12);
      let x = front - c * 1.5, z = -4 + 2 * r + 0.3 * hh(n, 3);
      const fallT = T.T_COLLAPSE + 0.05 * (n % 17) + 0.03 * r, runT = T.T_RAN + 0.04 * (n % 9);
      if (t < T.T_ARMY - 0.2 || x < BOL - 4) { if (t < fallT) continue; }
      if (t >= T.T_COLLAPSE) x = Math.min(front - c * 1.5, -7.5 - c * 1.5 + 12 * 0);       // army stops where it met the knights
      const o = BOLO(n);
      if (t >= runT) { const rx = x - (t - runT) * (6.2 + 0.4 * hh(n, 7)); if (rx < BOL - 6) continue; run(100 + n, o, `ar${n % 4}f`, rx, z, "shock", 3.0, { l: [-0.55, -0.9], r: [0.55, -0.9] }); continue; }
      if (t >= fallT && t < fallT + 0.9) { s.who(100 + n, o, `ar${n % 4}fl`, x, 0, z, { mode: "fall", expr: "dazed" }, 1, false); continue; }
      if (t >= fallT + 0.9) { grunt(100 + n, o, `ar${n % 4}d`, x, z, "shock", { arms: { l: [-0.55, -0.9], r: [0.55, -0.9] } }); continue; }
      run(100 + n, o, `ar${n % 4}m`, x, z, t > T.T_ARMY + 1.5 ? "grin" : "stern", 1.1, { l: [-0.4, 0.3], r: [0.5, -0.4] });
    }
    // Modena's knights wait, then charge, then chase
    for (let k = 0; k < 10; k++) {
      const z = -3.6 + 0.8 * k + 0.2 * hh(k, 5), x0 = 19 + 1.2 * (k % 3), o = MODE(k, { hat: "cap", cap: "#27407a" });
      if (t < T.T_CHARGE) { grunt(200 + k, o, `kn${k % 3}w`, x0, z, "stern", { arms: { l: [-0.5, 0.3], r: [0.55, ar(-0.5 + 0.1 * Math.sin(t * 5 + k))] } }); continue; }
      const u = clamp01((t - T.T_CHARGE) / 1.5), xc = lerp(x0, -4 - 0.5 * (k % 3), T.glide(u));
      const x = t < T.T_RAN ? xc : xc - (t - T.T_RAN) * 6.4;
      if (x < BOL - 7) continue;
      run(200 + k, o, `kn${k % 3}c`, x, z, "grin", 3.2, { l: [-0.55, -0.9], r: [0.55, -0.9] });
      if (t < T.T_COLLAPSE + 1.5 && u > 0 && u < 1) s.fx("dust", 120, 120, dustC, x + 1.0, 0.5, z, 1.2, 1.0, { soft: true });
    }
    for (let k = 0; k < 5; k++) puffAt(T.T_COLLAPSE + 0.15 * k, -9 + 2.4 * k, -3 + 1.6 * k, 2.4, 1.0);
    burstAt(T.T_COLLAPSE, -6, 1.8, 0, 5, 0.4, "#ffffff"); burstAt(T.T_COLLAPSE + 0.2, -3, 1.8, 2, 4, 0.4, "#ffe9a0");
    if (t >= T.T_CHARGE && t < T.T_CHARGE + 1.5) for (let k = 0; k < 4; k++) puffAt(T.T_CHARGE + 0.1 * k, lerp(19, -3, T.glide((t - T.T_CHARGE) / 1.5)) + 1, -2 + 1.6 * k, 1.8, 0.8);
  }

  // ---------- 37-41: Bologna lost the battle, and the bucket ----------
  if (t >= T.T_GATES && t < 42.5) {
    const a0 = t - T.T_GATES;
    for (let k = 0; k < 4; k++) grunt(220 + k, BOLO(k + 1), `gl${k % 4}`, BOL - 2.2 + 1.5 * k, 3 + 0.5 * (k % 2), "pained", { headTilt: 0.3, arms: { l: [-0.3, 0.6], r: [0.3, 0.6] } }, 1.1);
    s.fx("cl", 200, 200, cloud, BOL, 4.6, 3, 4.4 * pop(a0, 0.2), 3.2 * pop(a0, 0.2));
    for (let n = 0; n < 12; n++) { const u = (t * 1.3 + n / 12) % 1; s.fx("rd", 40, 40, rainDrop, BOL - 2.4 + 4.8 * hh(n, 3), 4.2 - 4.0 * u, 3 + 0.2 * hh(n, 4), 0.14, 0.2); }
    if (t >= T.T_LOST + 1.6) s.fx("q", 120, 120, qmark, BOL + 0.4, 2.9, -1.2, 1.3, 1.3);
  }

  // ---------- 41-54: the bucket in Modena; Bologna still waiting; the poet; the finale ----------
  if (t >= 40.5) {
    const px = T.PLINTH[0], pz = T.PLINTH[2], gl = 1 + 0.08 * Math.sin(t * 3);
    s.fx("gl", 200, 200, glowGold, px, 1.4, pz + 0.3, 3.4 * gl, 3.4 * gl, { soft: true });
    s.fx("rays", 300, 300, rays, px, 3.0, pz - 0.4, 5.0, 5.0, { soft: true });
    for (let k = 0; k < 6; k++) { const u = (t * 0.4 + k / 6) % 1; s.fx("star", 70, 70, starC, px - 1.4 + 2.8 * hh(k, 2), 1.0 + 2.0 * u, pz + 0.6, 0.35, 0.35, { rot: t + k }); }
    for (const sx of [-1, 1]) grunt(230 + (sx > 0 ? 1 : 0), MODE(sx + 3), `pg${sx}`, px + sx * 1.9, pz, "smile", { arms: { l: [-0.3, 0.45], r: [0.3, 0.45] } }, 1.1);
    // Bologna waits (tapping his foot, cobweb on his shoulder, watch)
    const wx = px - 5.0, wz = 1.4, tapp = Math.sin(t * 6);
    grunt(232, BOLO(0, { hat: "cap", moustache: "#5a4a3a" }), "wait", wx, wz, t < T.T_WAIT ? "neutral" : "stern", { headTilt: ar(0.05 * tapp), arms: { l: [-0.3, 0.45], r: [0.3, 0.45] } }, 1.25);
    if (t >= T.T_WAIT - 0.2) { const u = clamp01((t - T.T_WAIT) / 0.5); s.fx("web", 200, 200, cobweb, wx - 0.35, 2.55, wz + 0.2, 0.9 * u, 0.9 * u); s.fx("wch", 300, 300, clockFace(q((t * 1.5) % 1, 60)), wx + 1.0, 2.7, wz, 1.0 * pop(t - T.T_WAIT, 0.4), 1.0 * pop(t - T.T_WAIT, 0.4)); }
    // the poet
    if (t >= T.T_POET - 0.4) {
      const wr = Math.sin(t * 8);
      grunt(233, POET, "poet", px + 1.5, 3.0, "smile", { headTilt: ar(0.08 * Math.sin(t * 2)), arms: { l: [-0.5, 0.4], r: [0.5, ar(0.5 + 0.15 * wr)] } }, 1.25);
      s.fx("bk", 220, 180, bookC, px + 0.6, 1.5, 3.2, 0.9, 0.75, { rot: -0.1 });
      s.fx("pen", 100, 100, penC, px + 2.1, 1.7, 3.1, 0.4, 0.4, { rot: 0.4 * wr });
    }
    if (t >= T.T_TITLE) s.fx("ttl", 600, 240, plate("THE STOLEN", "BUCKET"), px + 1.5, 5.4, 2.0, 5.2 * pop(t - T.T_TITLE, 0.3), 2.08 * pop(t - T.T_TITLE, 0.3), { rot: -0.03 });
    // CTA: the whole of Modena cheers around the bucket
    if (t >= T.T_CTA) for (let k = 0; k < 8; k++) { const a = Math.PI * (0.15 + 0.7 * k / 7), x = px + 4.2 * Math.cos(a) * (k % 2 ? 1 : 1.2), z = pz + 4.0 * Math.sin(a) + 1.2, w = Math.sin(t * 7 + k * 1.3); grunt(240 + k, MODE(k), `cr${k % 4}`, x, z, k % 2 ? "laugh" : "grin", { arms: { l: [-0.55, ar(-0.9 + 0.2 * w)], r: [0.55, ar(-0.9 - 0.2 * w)] } }); }
  }
  void stands;
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW; void smooth; void fxPuff; void smoke; void shotAt; void glowWhite;
export type { V3, SetName, Expr, FrontOpts };
