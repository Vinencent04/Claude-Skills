// Cast of "Pandora's jar": Pandora, Epimetheus, Prometheus, Zeus, Hephaestus, Athena, Aphrodite, Hermes, Hesiod, Erasmus.
// Everything bounces: squash/stretch hops, anticipation + spring overshoot, leaning into walks, breathing idles (applied as card transforms: sx, sy, lean, dy).
import * as THREE from "three";
import { Pen, bodyFront, fxBurst, fxPuff, fxContact, fxShadow, SKINS, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import * as T from "./story";
import { FPS, V3, SetName, toW, shotAt } from "./story";

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();

// ---------------- bounce engine ----------------
export type Bn = { dy: number; sx: number; sy: number; lean: number };
const NB: Bn = { dy: 0, sx: 1, sy: 1, lean: 0 };
/** damped spring 0->1 with overshoot (u in seconds since the event) */
const spr = (u: number, k = 6, w = 12) => (u <= 0 ? 0 : 1 - Math.exp(-k * u) * Math.cos(w * u));
const pulse = (u: number, d: number) => (u <= 0 || u >= d ? 0 : Math.sin((Math.PI * u) / d));
/** breathing + tiny weight shift */
const idle = (t: number, i: number, a = 1): Bn => ({ dy: 0, sx: 1 + 0.005 * a * Math.sin(t * 2.4 + i), sy: 1 - 0.006 * a * Math.sin(t * 2.4 + i), lean: 0.004 * a * Math.sin(t * 1.3 + i * 2) });
/** hops: stretch in the air, squash on landing, lean sway. rate = hops/s, h = height in m */
const hop = (t: number, i: number, rate: number, h: number, sway = 0.07): Bn => {
  const ph = (t * rate + hh(i, 3)) % 1, air = ph < 0.72 ? Math.sin((Math.PI * ph) / 0.72) : 0, land = ph >= 0.72 ? Math.sin((Math.PI * (ph - 0.72)) / 0.28) : 0, pre = ph > 0.62 && ph < 0.72 ? (ph - 0.62) / 0.1 : 0;
  return { dy: h * air, sx: 1 + 0.15 * land - 0.07 * air + 0.04 * pre, sy: 1 - 0.17 * land + 0.11 * air - 0.05 * pre, lean: sway * Math.sin(2 * Math.PI * (t * rate * 0.5 + hh(i, 5))) };
};
/** walking bounce: bob twice per stride, lean into the direction of travel (dirx = screen-space sign of motion) */
const walk = (t: number, i: number, speed: number, dirx: number, h = 0.045): Bn => {
  const ph = ((t * speed * 0.7 + hh(i, 4)) % 1 + 1) % 1, b = Math.abs(Math.sin(2 * Math.PI * ph));
  return { dy: h * b, sx: 1 - 0.02 * b, sy: 1 + 0.03 * b, lean: -0.07 * dirx + 0.02 * Math.sin(4 * Math.PI * ph) };
};
const add = (a: Bn, b: Bn): Bn => ({ dy: a.dy + b.dy, sx: a.sx * b.sx, sy: a.sy * b.sy, lean: a.lean + b.lean });

// ---------------- outfits ----------------
const TUN = (jacket: string, o: Partial<Outfit> = {}): Outfit => ({ jacket, pants: jacket, boots: "#8a5a2a", belt: "#e8c45a", buttons: "#e8c45a", skin: SKINS[1], build: "adult", ...o });
const PAND: Outfit = { jacket: "#f4e8d0", dress: "#f4e8d0", pants: "#f4e8d0", boots: "#8a5a2a", hat: "hair", hair: "#3a2418", skin: SKINS[1], build: "adult" };
const EPI: Outfit = TUN("#e8dcb0", { hat: "hair", hair: "#5a4a30", moustache: "#5a4a30", skin: SKINS[2], build: "stout" });
const PROM: Outfit = TUN("#c8703a", { hat: "hair", hair: "#2a1a10", moustache: "#2a1a10", skin: SKINS[3], build: "stout" });
const ZEUS: Outfit = TUN("#f4f0e8", { hat: "crown", moustache: "#f0f0f4", sash: "#6a8ad8", boots: "#c8a040", skin: SKINS[0], build: "stout" });
const HEPH: Outfit = { jacket: "#6a4a3a", apron: "#3a2a22", pants: "#4a3a30", boots: "#2a1a10", hat: null, moustache: "#2a1a10", skin: SKINS[3], build: "stout" };
const ATH: Outfit = { jacket: "#d8e0f0", dress: "#d8e0f0", pants: "#d8e0f0", boots: "#8a5a2a", hat: "cap", cap: "#c8a040", skin: SKINS[1], build: "adult" };
const APH: Outfit = { jacket: "#f0a8c0", dress: "#f0a8c0", pants: "#f0a8c0", boots: "#8a5a2a", hat: "hair", hair: "#e8c060", skin: SKINS[0], build: "adult" };
const HERM: Outfit = TUN("#e0b840", { hat: "cap", cap: "#e0b840", skin: SKINS[2] });
const HES: Outfit = TUN("#8a6a4a", { hat: "hair", hair: "#9a9a9a", moustache: "#9a9a9a", skin: SKINS[2], build: "stout" });
const ERAS: Outfit = { jacket: "#3a3a58", pants: "#2a2a40", boots: "#1a1a20", hat: "hair", hair: "#8a8a8a", skin: SKINS[2], build: "adult" };
const HUM = (v: number): Outfit => TUN(["#d8b890", "#a88a5a", "#8aa86a", "#c88a6a"][v % 4], { hat: v % 2 ? "hair" : null, hair: ["#3a2a1a", "#6a4a2a"][v % 2], skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult" });

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
  who(i: number, o: Outfit, ok: string, x: number, y: number, z: number, fo: FrontOpts, sc = 1, shadow = true, bn: Bn = NB) {
    const [X, Y, Z] = this.w(x, y, z), d = this.cam.pos.distanceTo(tmp.set(X, Y + 1, Z)) / sc, [w, h, k] = tier(d);
    const f2: FrontOpts = { blink: lidAt(this.t, i), ...fo, light: light2D(this.cam), seed: (i % 7) + 1 };
    this.out.places.push({ key: `F|${ok}|${fkey(f2)}`, x: X, y: Y + bn.dy, z: Z, scale: sc, sq: [bn.sx, bn.sy], lean: bn.lean, draw: (p) => bodyFront(p, o, f2), size: [w, h, k] });
    if (shadow && fo.mode !== "sit") this.blob(x, y, z, sc * 1.1 * (1 - 0.25 * clamp01(bn.dy / 1.2)));
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
const plate = (l1: string, l2: string, bg = "#2a1a10", fg = "#ffd84a") => (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 590, 230, 24), bg, 10); font(g, l2 ? Math.min(74, 540 / (Math.max(l1.length, l2.length) * 0.62)) : Math.min(110, 540 / (l1.length * 0.62))); g.fillStyle = fg; if (l2) { g.fillText(l1, 300, 80); g.fillText(l2, 300, 170); } else g.fillText(l1, 300, 120); };
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

const pigC = (ph: number, st: "run" | "eat" | "dead" | "ghost" | "happy", dir: 1 | -1, hd: number) => (p: Pen) => {
  const g = p.g; g.save(); if (dir < 0) { g.translate(300, 0); g.scale(-1, 1); }
  const ghost = st === "ghost", body = ghost ? "#f4f4ff" : "#2c2c38", snout = "#f2a0a8", dead = st === "dead";
  if (ghost) { g.globalAlpha = 0.9; p.poly([[120, 70], [60, 30], [40, 70], [90, 100]], "#ffffff", 5); p.poly([[150, 70], [210, 20], [240, 60], [190, 100]], "#ffffff", 5); }
  if (dead) { g.translate(150, 120); g.scale(1, -1); g.translate(-150, -120); }
  const sw = Math.sin(ph * Math.PI * 2), sw2 = Math.sin(ph * Math.PI * 2 + Math.PI);
  const run = st === "run", legs: [number, number][] = [[100, sw], [125, sw2], [180, sw2], [205, sw]];
  for (const [lx, s] of legs) { const lift = run ? Math.max(0, s) * 14 : 0, ang = run ? s * 10 : dead ? s * 0 : 0; p.stroke([[lx, 150], [lx + ang, 188 - lift]], 14, body); p.ell(lx + ang, 190 - lift, 9, 5, "#3a3a46", 3); }
  p.stroke([[78, 108], [66, 96], [72, 84], [62, 80]], 6, body);                                      // curly tail
  p.ell(150, 115, 78, 50, body, 8);                                                                    // body
  if (!ghost) p.ell(150, 138, 50, 18, "#3a3a48", 0);
  const hy = 104 + hd * 30, hx = 222;
  p.ell(hx, hy, 40, 35, body, 8);                                                                      // head
  p.poly([[hx - 16, hy - 24], [hx - 6, hy - 52], [hx + 6, hy - 26]], body, 6);                        // ear
  p.ell(hx + 34, hy + 8, 17, 14, snout, 6); p.dot(hx + 28, hy + 8, 3.2, "#7a3a44"); p.dot(hx + 40, hy + 8, 3.2, "#7a3a44");
  if (dead) { p.stroke([[hx + 6, hy - 16], [hx + 22, hy - 2]], 4, "#f4f4f4"); p.stroke([[hx + 22, hy - 16], [hx + 6, hy - 2]], 4, "#f4f4f4"); }
  else if (st === "happy" || ghost) { p.arc(hx + 14, hy - 8, 8, 6, 200, 340, 4, ghost ? "#3a3a46" : "#f4f4f4"); }
  else { p.ell(hx + 14, hy - 8, 6, 6.5, "#f6f3ea", 3); p.dot(hx + 16, hy - 8, 3); }
  if (ghost) { g.strokeStyle = "#ffd84a"; g.lineWidth = 8; g.beginPath(); g.ellipse(hx - 4, hy - 56, 30, 9, 0, 0, 7); g.stroke(); }
  g.restore();
};
const tomb = (p: Pen) => { p.poly([[20, 220], [20, 70], [34, 40], [60, 24], [90, 24], [116, 40], [130, 70], [130, 220]], "#b8b8c4", 9); p.stroke([[40, 100], [110, 100]], 4, "#8a8a98"); const g = p.g; font(g, 30); g.fillStyle = "#4a4a58"; g.fillText("R.I.P.", 75, 70); font(g, 30); g.fillText("PIG", 75, 128); font(g, 18); g.fillText("1859", 75, 162); };
const flower = (col: string) => (p: Pen) => { p.stroke([[30, 100], [30, 50]], 5, "#3a8a3a"); for (let i = 0; i < 5; i++) { const a = (i * 2 * Math.PI) / 5; p.ell(30 + 13 * Math.cos(a), 40 + 13 * Math.sin(a), 10, 10, col, 3); } p.ell(30, 40, 7, 7, "#ffd84a", 2); };
const tear = (p: Pen) => { p.poly([[10, 2], [18, 22], [10, 30], [2, 22]], "#7ab8ff", 3); };
const sweat = (p: Pen) => { p.poly([[10, 2], [20, 24], [10, 34], [0, 24]], "#bfe4ff", 3); };
const heart = (p: Pen) => { p.poly([[50, 90], [10, 50], [14, 22], [34, 14], [50, 34], [66, 14], [86, 22], [90, 50]], "#ff5a7a", 6); };
const cake = (p: Pen) => { p.poly(rr(10, 70, 190, 130, 10), "#f0c8d8", 8); p.poly(rr(30, 30, 170, 72, 10), "#ffe8f0", 8); for (const x of [60, 100, 140]) { p.poly(rr(x - 5, 6, x + 5, 30, 2), "#6ab4ff", 3); p.poly([[x, -6], [x - 5, 10], [x + 5, 10]], "#ffb040", 0); } };
const mug = (p: Pen) => { p.poly(rr(10, 20, 70, 100, 8), "#c8963a", 7); p.poly(rr(10, 14, 70, 36, 6), "#f6f3ea", 5); p.stroke([[70, 40], [90, 50], [70, 80]], 7, "#c8963a"); };
const hbc = (p: Pen) => { const g = p.g; p.poly(rr(8, 8, 392, 112, 16), "#e8d8a8", 8); font(g, 46); g.fillStyle = "#6a1a1a"; g.fillText("H.B. COMPANY", 200, 62); };
const think = (p: Pen) => { p.ell(100, 70, 90, 54, "#ffffff", 7); p.ell(30, 140, 10, 10, "#ffffff", 4); p.ell(50, 120, 15, 15, "#ffffff", 5); pigC(0.1, "happy", 1, 0)(p); };
const nope = (p: Pen) => { p.stroke([[20, 20], [180, 160]], 22, "#d2373a"); p.stroke([[180, 20], [20, 160]], 22, "#d2373a"); };
const mapC = (stamped: boolean) => (p: Pen) => { p.poly(rr(10, 10, 390, 290, 14), "#f0e2b8", 9); p.poly([[120, 110], [190, 80], [270, 100], [300, 170], [240, 230], [160, 220], [110, 170]], "#6aa84a", 7); p.ell(90, 70, 50, 24, "#6ab4e8", 0); p.ell(320, 240, 50, 24, "#6ab4e8", 0); if (stamped) { const g = p.g; g.save(); g.translate(200, 160); g.rotate(-0.2); g.strokeStyle = "#2a3f8a"; g.lineWidth = 12; g.strokeRect(-110, -40, 220, 80); font(g, 62); g.fillStyle = "#2a3f8a"; g.fillText("U.S.A.", 0, 4); g.restore(); } };
const stampC = (p: Pen) => { p.poly(rr(60, 150, 180, 250, 12), "#b45a3a", 8); p.poly(rr(100, 30, 140, 160, 12), "#6a3a22", 8); p.poly(rr(60, 150, 180, 190, 10), "#2a3f8a", 8); };
const bangC = (p: Pen) => { p.poly([[20, 100], [70, 20], [120, 90], [200, 10], [240, 90], [330, 40], [330, 140], [250, 190], [190, 150], [120, 200], [70, 150]], "#ffe066", 10); const g = p.g; font(g, 64); g.fillStyle = "#c92a2e"; g.fillText("BANG!", 180, 100); };
const flagUS = (p: Pen) => { for (let i = 0; i < 7; i++) p.poly([[10, 10 + i * 17], [150, 10 + i * 17], [150, 27 + i * 17], [10, 27 + i * 17]], i % 2 ? "#f6f3ea" : "#c8352a", 2); p.poly([[10, 10], [70, 10], [70, 70], [10, 70]], "#2a3f8a", 3); };
const flagUKc = (p: Pen) => { p.poly([[10, 10], [150, 10], [150, 110], [10, 110]], "#1f2f7a", 3); p.stroke([[10, 10], [150, 110]], 16, "#f6f3ea"); p.stroke([[150, 10], [10, 110]], 16, "#f6f3ea"); p.stroke([[80, 10], [80, 110]], 26, "#f6f3ea"); p.stroke([[10, 60], [150, 60]], 26, "#f6f3ea"); p.stroke([[80, 10], [80, 110]], 14, "#c8352a"); p.stroke([[10, 60], [150, 60]], 14, "#c8352a"); };
const confettiC = (col: string) => (p: Pen) => { p.poly([[2, 2], [22, 6], [18, 24], [0, 18]], col, 2); };


// ---------------- new drawings ----------------
const dungBlob = (p: Pen) => { p.ell(40, 40, 30, 24, "#6a4a2a", 5); p.ell(30, 30, 10, 7, "#8a6a3a", 0); };
const splat = (u: number) => (p: Pen) => { const g = p.g; for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28, r = 40 + 90 * u, x = 150 + Math.cos(a) * r * (0.8 + 0.2 * (i % 3)), y = 150 + Math.sin(a) * r * 0.6; p.ell(x, y, 18 * (1 - 0.5 * u) + 6, 14 * (1 - 0.5 * u) + 4, "#6a4a2a", 4); } p.ell(150, 150, 60 * (1 - 0.3 * u), 40 * (1 - 0.3 * u), "#5a3a1a", 6); };
const stink = (p: Pen) => { const g = p.g; g.strokeStyle = "rgba(120,200,90,.95)"; g.lineWidth = 9; g.lineCap = "round"; for (const x of [30, 60, 90]) { g.beginPath(); g.moveTo(x, 150); g.bezierCurveTo(x - 20, 115, x + 20, 85, x, 40); g.stroke(); } };
const steam = (p: Pen) => { const g = p.g; const gr = g.createRadialGradient(100, 100, 6, 100, 100, 80); gr.addColorStop(0, "rgba(235,240,220,.85)"); gr.addColorStop(1, "rgba(235,240,220,0)"); g.fillStyle = gr; g.beginPath(); g.arc(100, 100, 80, 0, 7); g.fill(); };
const fly = (p: Pen) => { p.ell(20, 20, 7, 5, "#222", 0); p.ell(14, 14, 7, 4, "rgba(200,220,255,.8)", 0); p.ell(26, 14, 7, 4, "rgba(200,220,255,.8)", 0); };
const angelC = (p: Pen) => { p.poly([[70, 80], [10, 30], [4, 78], [50, 100]], "#ffffff", 5); p.poly([[110, 80], [170, 30], [176, 78], [130, 100]], "#ffffff", 5); p.ell(90, 100, 26, 34, "#fffbe8", 6); p.ell(90, 60, 22, 22, "#ffe0c0", 5); p.dot(82, 58, 3); p.dot(98, 58, 3); p.arc(90, 66, 8, 6, 20, 160, 3); const g = p.g; g.strokeStyle = "#ffd84a"; g.lineWidth = 7; g.beginPath(); g.ellipse(90, 32, 22, 7, 0, 0, 7); g.stroke(); };
const rope = (p: Pen) => { p.ell(30, 30, 20, 8, "#c8a860", 4); p.stroke([[12, 30], [48, 30]], 5, "#7a5a2a"); };
const scroll = (txt: string) => (p: Pen) => { const g = p.g; p.poly(rr(10, 30, 290, 130, 10), "#f2e6c0", 7); p.ell(10, 80, 12, 52, "#d8c690", 6); p.ell(290, 80, 12, 52, "#d8c690", 6); font(g, 40); g.fillStyle = "#5a2a1a"; g.fillText(txt, 150, 82); };
const shield = (p: Pen) => { const g = p.g; p.poly([[20, 20], [180, 20], [180, 120], [100, 200], [20, 120]], "#f4efe0", 8); p.poly([[34, 34], [166, 34], [166, 116], [100, 184], [34, 116]], "#2a3f8a", 5); p.ell(100, 170, 36, 12, "#6a4a2a", 4); p.ell(100, 60, 12, 12, "#ffe0c0", 3); p.stroke([[100, 72], [100, 110]], 6, "#f4efe0"); p.stroke([[100, 80], [78, 62]], 5, "#f4efe0"); p.stroke([[100, 80], [122, 62]], 5, "#f4efe0"); p.stroke([[100, 110], [86, 138]], 5, "#f4efe0"); p.stroke([[100, 110], [116, 138]], 5, "#f4efe0"); void g; };
const calendar = (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 290, 250, 16), "#f6f3ea", 9); p.poly(rr(10, 10, 290, 80, 16), "#c8352a", 9); font(g, 44); g.fillStyle = "#fff"; g.fillText("MAY 1618", 150, 46); font(g, 120); g.fillStyle = "#2a1a10"; g.fillText("23", 150, 160); };
const crownC2 = (p: Pen) => { p.poly([[10, 90], [10, 30], [38, 60], [60, 14], [82, 60], [110, 30], [110, 90]], "#f1c232", 7); p.ell(60, 56, 7, 7, "#d2373a", 2); };
const globe = (rot: number) => (p: Pen) => { const g = p.g; p.ell(100, 100, 80, 80, "#2f7ac8", 9); g.save(); g.beginPath(); g.arc(100, 100, 78, 0, 7); g.clip(); for (let i = 0; i < 5; i++) { const x = ((rot * 200 + i * 66) % 260) - 30; p.ell(x, 70 + 28 * ((i * 7) % 3), 28, 20, "#5aa84a", 0); } g.restore(); p.ell(70, 70, 18, 10, "rgba(255,255,255,.35)", 0); };
const europe = (u: number) => (p: Pen) => { const g = p.g; p.poly(rr(8, 8, 392, 292, 14), "#e6d8a8", 9); p.poly([[70, 90], [150, 60], [250, 70], [330, 120], [350, 200], [280, 250], [170, 255], [90, 215], [60, 150]], "#7aae5a", 7); p.ell(60, 60, 40, 24, "#6ab4e8", 0); p.ell(340, 270, 44, 22, "#6ab4e8", 0); const r = 12 + 150 * u; g.save(); g.beginPath(); g.moveTo(70, 90); g.lineTo(150, 60); g.lineTo(250, 70); g.lineTo(330, 120); g.lineTo(350, 200); g.lineTo(280, 250); g.lineTo(170, 255); g.lineTo(90, 215); g.lineTo(60, 150); g.closePath(); g.clip(); g.fillStyle = "rgba(210,40,50,.78)"; g.beginPath(); g.arc(205, 150, r, 0, 7); g.fill(); g.restore(); p.ell(205, 150, 9, 9, "#fff", 4); };
const pie = (u: number) => (p: Pen) => { const g = p.g; p.ell(150, 150, 120, 120, "#f6f3ea", 10); g.fillStyle = "#d2373a"; g.beginPath(); g.moveTo(150, 150); g.arc(150, 150, 114, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 / 3) * u); g.closePath(); g.fill(); g.strokeStyle = "#1a1a24"; g.lineWidth = 8; g.beginPath(); g.arc(150, 150, 118, 0, 7); g.stroke(); };
const gravec = (p: Pen) => { p.stroke([[40, 150], [40, 40]], 12, "#c8c8d0"); p.stroke([[10, 80], [70, 80]], 12, "#c8c8d0"); p.ell(40, 156, 30, 10, "#4a3a2a", 0); };
const skull = (p: Pen) => { p.ell(60, 56, 40, 40, "#f4f4ee", 6); p.poly(rr(40, 82, 80, 112, 6), "#f4f4ee", 6); p.ell(44, 56, 10, 12, "#1a1a24", 0); p.ell(76, 56, 10, 12, "#1a1a24", 0); p.poly([[60, 70], [54, 82], [66, 82]], "#1a1a24", 0); };
const bowl = (p: Pen) => { p.ell(80, 90, 60, 18, "#d8d2c0", 7); p.poly([[24, 90], [136, 90], [116, 130], [44, 130]], "#c8c0a8", 7); p.stroke([[150, 40], [150, 130]], 7, "#8a8a98"); };
const rulerC = (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 110, 590, 10), "#f2e6c0", 8); for (let i = 0; i <= 15; i++) p.stroke([[10, 50 + i * 36], [i % 5 === 0 ? 70 : 46, 50 + i * 36]], 4, "#5a2a1a"); font(g, 40); g.fillStyle = "#c92a2e"; g.fillText("15 m", 64, 570); };
const sick = (p: Pen) => { p.dot(30, 30, 9, "#4a8a3a"); p.dot(60, 50, 7, "#4a8a3a"); p.dot(80, 22, 8, "#4a8a3a"); };
// ---------------- new drawings ----------------
const earC = (p: Pen) => { p.ell(70, 90, 46, 64, "#f2b3a0", 8); p.ell(70, 90, 26, 42, "#e8907c", 4); p.stroke([[60, 60], [76, 74], [62, 98], [72, 120]], 5, "#c8685a"); p.ell(88, 146, 14, 18, "#f2b3a0", 5); };
const jarC = (p: Pen) => { p.poly(rr(30, 40, 150, 200, 22), "rgba(210,235,245,.75)", 8); p.poly(rr(38, 18, 142, 46, 8), "#7a5a2a", 7); p.ell(90, 112, 24, 34, "#f2b3a0", 5); p.ell(90, 112, 12, 20, "#e8907c", 3); p.poly(rr(46, 150, 134, 186, 6), "#f4e8c0", 4); const g = p.g; font(g, 22); g.fillStyle = "#5a2a1a"; g.fillText("EAR", 90, 169); };
const slashC = (p: Pen) => { const g = p.g; g.lineCap = "round"; for (const [w, c] of [[26, "#1a1a24"], [16, "#ffffff"]] as const) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(20, 20); g.quadraticCurveTo(100, 40, 180, 190); g.stroke(); } };
const chestC = (p: Pen) => { p.poly(rr(10, 70, 190, 150, 8), "#8a5a2a", 8); p.poly([[10, 70], [20, 30], [180, 30], [190, 70]], "#a8703a", 8); p.stroke([[100, 30], [100, 150]], 10, "#d9b04a"); p.ell(100, 92, 11, 11, "#d9b04a", 4); };
const shipC = (flag: string, hullc = "#6a4224") => (p: Pen) => { p.poly([[10, 200], [290, 200], [250, 260], [50, 260]], hullc, 9); p.stroke([[150, 20], [150, 200]], 8, "#4a3022"); p.stroke([[80, 70], [220, 70]], 7, "#4a3022"); for (const [x0, x1, y0, y1] of [[84, 216, 76, 130], [70, 230, 134, 192]] as const) p.poly([[x0, y0], [x1, y0], [x1 + 6, y1], [x0 - 6, y1]], "#f6efd8", 7); p.poly([[150, 14], [210, 30], [150, 46]], flag, 4); };
const oneC = (kind: "eye" | "arm" | "leg") => (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 190, 190, 22), "#2a1a10", 9);
  if (kind === "eye") { p.ell(100, 84, 54, 34, "#fffbe8", 6); p.ell(100, 84, 17, 17, "#3a2a1a", 3); p.dot(94, 78, 5, "#fff"); }
  else if (kind === "arm") { p.poly([[50, 130], [60, 82], [100, 56], [138, 70], [146, 100], [118, 96], [96, 112], [88, 132]], "#f2b98c", 7); p.ell(132, 82, 18, 18, "#f2b98c", 6); }
  else { p.stroke([[100, 40], [100, 112]], 22, "#f2b98c"); p.stroke([[100, 112], [100, 160]], 14, "#8a5a2a"); p.stroke([[84, 70], [116, 70]], 5, "#5a3a1a"); p.ell(100, 164, 11, 8, "#3a2a1a", 3); }
  font(g, 62); g.fillStyle = "#ffd84a"; g.lineWidth = 8; g.strokeStyle = "#1a1a24"; g.strokeText("1", 160, 168); g.fillText("1", 160, 168); };
const wavesC = (p: Pen) => { for (let i = 0; i < 4; i++) p.stroke([[10 + i * 6, 60 - i * 12], [60, 40 - i * 12], [110, 60 - i * 12], [160, 40 - i * 12]], 6, "#e8f4ff"); };

// ---------------- new drawings ----------------
const pithosC = (p: Pen) => { p.poly([[70, 30], [150, 30], [160, 62], [196, 120], [190, 200], [160, 250], [60, 250], [30, 200], [24, 120], [60, 62]], "#b8663a", 9); p.stroke([[34, 118], [186, 118]], 6, "#4a2a1a"); for (let i = 0; i < 9; i++) p.stroke([[40 + i * 18, 150], [49 + i * 18, 134], [58 + i * 18, 150]], 4, "#4a2a1a"); p.stroke([[40, 196], [180, 196]], 5, "#4a2a1a"); p.poly(rr(58, 14, 162, 42, 8), "#9a5028", 8); };
const lidC = (p: Pen) => { p.ell(60, 24, 52, 14, "#9a5028", 7); p.ell(60, 20, 38, 8, "#b8663a", 3); };
const spiritC = (k: number) => (p: Pen) => { const g = p.g; p.poly([[60, 20], [92, 40], [100, 84], [84, 130], [96, 170], [60, 150], [24, 170], [36, 130], [20, 84], [28, 40]], ["#3a2a4a", "#4a2a3a", "#2a3a4a"][k % 3], 7); p.dot(46, 62, 7, "#ff3a3a"); p.dot(74, 62, 7, "#ff3a3a"); p.poly([[40, 88], [60, 100], [80, 88], [60, 110]], "#1a1a24", 3); void g; };
const hopeC = (p: Pen) => { p.poly([[30, 70], [70, 40], [120, 70], [70, 110]], "#ffe066", 6); p.poly([[60, 60], [80, 14], [100, 70]], "#fff3b0", 5); p.poly([[60, 74], [38, 120], [84, 98]], "#fff3b0", 5); p.ell(112, 58, 16, 14, "#ffe066", 5); p.poly([[124, 56], [144, 62], [124, 68]], "#e8a030", 3); p.dot(116, 54, 3.2, "#1a1a24"); };
const torchC = (p: Pen) => { p.stroke([[40, 200], [40, 90]], 10, "#6a4a2a"); p.poly([[40, 8], [66, 56], [72, 92], [40, 108], [12, 92], [20, 56]], "#ff7a1c", 6); p.poly([[40, 44], [54, 74], [40, 96], [26, 74]], "#ffc83a", 0); };
const hammerC = (p: Pen) => { p.stroke([[30, 150], [90, 50]], 10, "#6a4a2a"); p.poly([[60, 40], [120, 30], [128, 62], [68, 74]], "#8a8e98", 7); };
const spoolC = (p: Pen) => { p.poly(rr(30, 20, 130, 40, 6), "#8a5a2a", 6); p.poly(rr(30, 120, 130, 140, 6), "#8a5a2a", 6); p.poly(rr(46, 40, 114, 120, 4), "#c8703a", 5); for (let i = 0; i < 4; i++) p.stroke([[46, 56 + i * 16], [114, 52 + i * 16]], 3, "#a8501a"); };
const earthC = (p: Pen) => { p.ell(60, 60, 44, 34, "#8a6a3a", 7); p.ell(46, 48, 16, 10, "#a88a5a", 0); };
const dropC = (p: Pen) => { p.poly([[40, 2], [64, 52], [40, 72], [16, 52]], "#7ab8ff", 5); };
const statueC = (p: Pen) => { p.ell(60, 28, 22, 24, "#c8a888", 6); p.poly([[34, 52], [86, 52], [96, 150], [24, 150]], "#c8a888", 6); p.stroke([[34, 62], [10, 110]], 10, "#c8a888"); p.stroke([[86, 62], [110, 110]], 10, "#c8a888"); };
const wingsC = (p: Pen) => { p.poly([[40, 40], [4, 10], [10, 46], [30, 56]], "#ffffff", 4); p.poly([[60, 40], [96, 10], [90, 46], [70, 56]], "#ffffff", 4); };
const sparkleC = (p: Pen) => { p.poly([[30, 2], [36, 24], [58, 30], [36, 36], [30, 58], [24, 36], [2, 30], [24, 24]], "#fff3a0", 0); };
const thoughtC = (p: Pen) => { p.ell(100, 70, 90, 54, "#ffffff", 7); p.ell(30, 140, 10, 10, "#ffffff", 4); p.ell(50, 120, 15, 15, "#ffffff", 5); };

// ---------------- helpers ----------------
const ar = (v: number) => Math.round(v * 8) / 8;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const glide = T.glide;
const bob = (t: number, i: number, a = 1) => Math.sin(t * 1.6 + i * 1.7) * a;

export const stage = (f: number, cam: CamInfo): Stage => {
  const t = f / FPS, s = new S(cam, "w", t);
  const pop = (age: number, k = 0.5) => 1 + k * (1 - Math.min(1, Math.max(0, age) / 0.16)) + (age > 0 ? 0.08 * Math.exp(-5 * age) * Math.sin(age * 18) : 0);
  const puffAt = (t0: number, x: number, y: number, z: number, w = 1.6, dur = 0.9) => { if (t >= t0 && t < t0 + dur) { const u = (t - t0) / dur; s.fx("dust", 120, 120, dustC, x, y + 0.4 * u, z, w * (0.5 + u), w * (0.5 + u) * 0.8, { soft: true }); } };
  const burstAt = (t0: number, x: number, y: number, z: number, w: number, dur = 0.4, col = "#fff3b0") => s.burst(t0, x, y, z, w, dur, col);
  const who = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, fo: Partial<FrontOpts> = {}, sc = 1, bn: Bn = NB, y = 0, shadow = true) => s.who(i, o, ok, x, y, z, { mode: "stand", expr, ...fo }, sc, shadow, bn);
  const stride = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, dirx: number, speed = 1.5, arms: FrontOpts["arms"] = { l: [-0.45, 0.2], r: [0.45, 0.2] }, sc = 1, y = 0) => s.who(i, o, ok, x, y, z, { mode: "stroll", phase: q(((t * speed * 0.7 + hh(i, 4)) % 1 + 1) % 1, 20), expr, arms }, sc, true, walk(t, i, speed, dirx));
  const shout = (i: number, o: Outfit, ok: string, x: number, z: number, amt = 1, sc = 1, y = 0, held: FrontOpts["held"] = null) => { const w = Math.sin(t * 6.5 + i * 1.7), w2 = Math.sin(t * 6.5 + i * 1.7 - 0.9); who(i, o, ok, x, z, "stern", { arms: { l: [-0.55, ar(-0.95 + 0.2 * w * amt)], r: [0.55, ar(-0.95 + 0.2 * w2 * amt)] }, headTilt: ar(0.07 * w * amt), ...(held ? { held } : {}) }, sc, { dy: 0.03 * amt * Math.abs(w), sx: 1, sy: 1 + 0.015 * amt * w, lean: 0.025 * w * amt }, y); };
  const cheer = (i: number, o: Outfit, ok: string, x: number, z: number, rate = 1.3, h = 0.12, sc = 1, y = 0) => { const w = Math.sin(t * 6 + i); who(i, o, ok, x, z, i % 2 ? "laugh" : "grin", { arms: { l: [-0.55, ar(-0.9 + 0.15 * w)], r: [0.55, ar(-0.9 - 0.15 * w)] } }, sc, hop(t, i, rate, h), y); };
  const idleW = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, sc = 1, y = 0, arms: FrontOpts["arms"] = { l: [-0.4, 0.3], r: [0.4, 0.3] }) => who(i, o, ok, x, z, expr, { arms }, sc, idle(t, i, 1.5), y);
  const flame = (x: number, y: number, z: number, w: number, k = 0) => { const sc = 1 + 0.12 * Math.sin(t * 9 + k * 2.1); s.fx("fl", 200, 220, flameC, x, y + 0.4 * w, z, w * sc, w * 1.1 * sc, { rot: 0.06 * Math.sin(t * 6 + k) }); };
  const confetti = (n: number, x0: number, z0: number, w: number, ymax = 7) => { const cols = ["#ff5a7a", "#ffd84a", "#6ab4ff", "#7be07b"]; for (let k = 0; k < n; k++) { const u = (t * 0.4 + hh(k, 2)) % 1; s.fx(`cf${k % 4}`, 40, 40, confettiC(cols[k % 4]), x0 + w * (hh(k, 3) - 0.5) + 0.4 * Math.sin(t * 2 + k), ymax * (1 - u), z0 + 3 * (hh(k, 4) - 0.5), 0.22, 0.22, { rot: t * 3 + k }); } };
  const plateAt = (key: string, l1: string, l2: string, bg: string, fg: string, t0: number, t1: number, x: number, y: number, z: number, w: number, rot = 0) => { if (t >= t0 && t < t1) { const e = pop(t - t0, 0.4), h = w * 0.4; s.fx(key, 600, 240, plate(l1, l2, bg, fg), x, y + 0.06 * Math.sin(t * 2.4), z, w * e, h * e, { rot }); } };
  const qm = (x: number, y: number, z: number, t0: number, k = 0, w = 0.9) => { if (t >= t0) s.fx("qm", 120, 120, qmark, x, y + 0.12 * Math.sin(t * 4 + k), z, w * pop(t - t0 - 0.1 * k), w * pop(t - t0 - 0.1 * k), { rot: 0.1 * Math.sin(t * 3 + k) }); };

  const HXc = T.HX, OXc = T.OX, FXc = T.FX, LXc = T.LX;
  const flameAtG = (x: number, y: number, z: number, w: number, k = 0) => flame(x, y, z, w, k);
  const jarShow = (x: number, y: number, z: number, w = 1.7, glow = 0, open = false) => {
    if (glow > 0) { const g = 1 + 0.06 * Math.sin(t * 4); s.fx("jglow", 200, 200, glowC("255,214,120"), x, y + 0.3, z - 0.05, 3.4 * glow * g, 3.4 * glow * g, { soft: true }); }
    s.fx("pithos", 220, 260, pithosC, x, y, z, w, w * 1.18, {});
    void open;
  };

  // ====================================================== H: EPIMETHEUS' YARD (x = 0) ======================================================
  const inH = t < 8.2 || (t >= 36.8 && t < 73.9) || t >= 86.8;
  if (inH) {
    const jx = -0.8, jy = 1.15, pz = 0.6;
    const lidOff = t >= T.T_LIFT && t < T.T_SLAM, lidT = clamp01((t - T.T_LIFT) / 1.1);
    // ---------- Pandora ----------
    let pex: Expr = "smile", parms: FrontOpts["arms"] = { l: [-0.45, 0.3], r: [0.45, 0.3] }, pbn: Bn = idle(t, 3, 1.5), px = 1.0, ptilt = 0;
    const w2 = Math.sin(t * 3);
    if (t < 8.2) {
      px = 1.0 + 0.5 * Math.sin(t * 0.9); parms = { l: [-0.45, ar(0.25 + 0.1 * w2)], r: [0.5, ar(-0.1 + 0.4 * w2)] }; ptilt = 0.06 * w2;
      if (t >= T.T_NOBOX) { pex = "laugh"; parms = { l: [-0.5, ar(-0.9 + 0.1 * w2)], r: [0.5, ar(-0.9 - 0.1 * w2)] }; pbn = hop(t, 3, 1.4, 0.1); }
    } else if (t < 37.5) { px = 99; }
    else if (t < 38.9) { const u = clamp01((t - T.T_SENT) / 1.4); px = lerp(7, 1.0, glide(u)); if (u < 1) { stride(3, PAND, "pand", px, pz, "smile", -1, 1.4, { l: [-0.45, 0.25], r: [0.45, 0.25] }, 1.2, 0); px = 99; } }
    else if (t < T.T_WARN) { pex = "smile"; parms = { l: [-0.45, 0.35], r: [0.45, 0.3] }; }
    else if (t < T.T_HOUSE) { pex = "nervous"; parms = { l: [-0.4, 0.4], r: [0.4, 0.4] }; }
    else if (t < T.T_LIFT - 0.4) { pex = "neutral"; px = 1.0; ptilt = 0.12; parms = { l: [-0.45, 0.35], r: [0.45, 0.3] }; }
    else if (t < T.T_SLAM) { const a = t - T.T_LIFT; px = 0.3; pex = t < T.T_FLEW ? "shock" : "pained"; parms = { l: [-0.5, ar(-0.95 + 0.0 * a)], r: [0.5, ar(-0.95)] }; pbn = { dy: 0.03 * pulse(a, 0.5), sx: 1, sy: 1 + 0.03 * Math.min(1, a), lean: -0.04 }; }
    else if (t < 73.9) { const a = t - T.T_SLAM; px = 0.9; pex = a < 1.2 ? "shock" : "nervous"; parms = { l: [-0.5, ar(-0.5 + 0.3 * Math.min(1, a))], r: [0.5, ar(0.0)] }; pbn = { dy: 0, sx: 1 + 0.05 * pulse(a, 0.3), sy: 1 - 0.05 * pulse(a, 0.3), lean: 0.03 * Math.sin(t * 5) * clamp01(1 - a / 1.5) }; }
    else { px = 1.0; }
    const fol = t >= T.T_FOLLOW;
    if (t >= T.T_CTA - 0.2) { who(3, PAND, "pand", 0.9, pz, "laugh", { arms: { l: [-0.55, ar(-0.9 + 0.15 * Math.sin(t * 5))], r: [0.55, ar(-0.9 - 0.15 * Math.sin(t * 5))] } }, 1.25, hop(t, 3, fol ? 1.6 : 0.9, 0.12), 0); }
    else if (px < 50) who(3, PAND, "pand", px, pz, pex, { arms: parms, headTilt: ptilt }, 1.2, pbn, 0);

    // ---------- Epimetheus (37 - 74) ----------
    if (t >= 37.4 && t < 73.9) { const e = Math.sin(t * 3.2); who(4, EPI, "epi", -2.6, 0.5, t >= T.T_WARN ? "shock" : "smile", { arms: { l: [-0.5, 0.35], r: [0.5, ar(-0.2 + 0.2 * e)] } }, 1.2, idle(t, 4, 1.5), 0); }
    if (t >= T.T_EPI && t < T.T_WARN) { const e = pop(t - T.T_EPI, 0.4); s.fx("epiP", 600, 240, plate("EPIMETHEUS", "", "#2a3f8a", "#ffffff"), -2.4, 4.4, 1.0, 3.4 * e, 1.36 * e, { rot: -0.03 }); }
    if (t >= T.T_SENT && t < T.T_EPI) { const e = pop(t - T.T_SENT, 0.4); s.fx("zg", 600, 240, plate("A GIFT FROM ZEUS", "", "#6a8ad8", "#ffffff"), 0.6, 4.6, 1.0, 3.8 * e, 1.52 * e, { rot: 0.03 }); }
    // Prometheus warns him
    if (t >= T.T_WARN && t < 45.8) { const k = Math.sin(t * 6); who(5, PROM, "prom", 3.4, 0.3, "stern", { arms: { l: [-0.55, ar(-0.9 + 0.2 * k)], r: [0.55, ar(-0.9 - 0.2 * k)] } }, 1.3, { dy: 0.03 * Math.abs(k), sx: 1, sy: 1 + 0.015 * k, lean: 0.025 * k }, 0); for (let i = 0; i < 2; i++) s.fx("bg", 120, 120, bang, 1.2 + 2.6 * i, 3.9 + 0.15 * Math.sin(t * 5 + i), 1.4, 0.8 * pop(t - T.T_WARN - 0.2 * i), 0.8 * pop(t - T.T_WARN - 0.2 * i)); }
    plateAt("nvr", "NEVER ACCEPT", "A GIFT FROM ZEUS!", "#c92a2e", "#ffffff", T.T_NEVER, 45.8, 1.0, 4.8, 1.4, 3.6, -0.03);

    // ---------- the jar ----------
    const showJar = t < 8.2 || (t >= T.T_HOUSE - 0.3 && t < 73.9) || t >= 87.0;
    if (showJar) {
      const glow = (t >= 6.9 && t < 8.2) || (t >= T.T_HOPE && t < 73.9) || t >= T.T_CTA - 0.3 ? 1 : 0;
      jarShow(jx, jy, 0.2, 1.7, glow);
      if (!lidOff) s.fx("lid", 120, 50, lidC, jx, jy + 1.24, 0.25, 1.25, 0.52, { rot: 0.0 });
      else { const lu = t < T.T_LIFT + 1.1 ? lidT : 1; const lx = lerp(jx, jx + 1.0, glide(lu)), ly = lerp(jy + 1.24, jy + 2.9 + 0.1 * Math.sin(t * 4), glide(lu)); s.fx("lid", 120, 50, lidC, lx, ly, 0.25, 1.25, 0.52, { rot: 0.4 * glide(lu) }); }
      // the slam
      if (t >= T.T_SLAM - 0.25 && t < T.T_SLAM) { const u = (t - (T.T_SLAM - 0.25)) / 0.25; s.fx("lid", 120, 50, lidC, lerp(jx + 1.0, jx, u), lerp(jy + 2.9, jy + 1.24, u * u), 0.25, 1.25, 0.52, { rot: 0.4 * (1 - u) }); }
      if (t >= T.T_SLAM && t < T.T_SLAM + 0.5) burstAt(T.T_SLAM, jx, jy + 1.3, 0.8, 2.4, 0.4, "#ffffff");
    }
    // sealed jar labels, the evils inside
    plateAt("pb", "PANDORA'S BOX", "", "#2a1a10", "#ffd84a", T.T_PBOX, T.T_NOBOX, 0.0, 4.2, 1.2, 3.6, -0.03);
    if (t >= T.T_NOBOX && t < 6.9) { const e = pop(t - T.T_NOBOX, 0.5); s.fx("pbx", 600, 240, plate("PANDORA'S BOX", "", "#2a1a10", "#ffd84a"), 0.0, 4.2, 1.2, 3.6, 1.44, { rot: -0.03 }); s.fx("nx", 200, 200, nope, 0.0, 4.2, 1.3, 3.8 * e, 1.7 * e, {}); plateAt("nb", "NO BOX!", "", "#c92a2e", "#ffffff", T.T_NOBOX, 6.9, 0.0, 2.9, 1.4, 2.8, 0.03); }
    plateAt("jr0", "A JAR!", "", "#3a6aa8", "#ffffff", T.T_JAR0, 8.2, 0.0, 4.2, 1.2, 3.0, -0.03);
    plateAt("sj", "A SEALED JAR", "", "#6a3a1a", "#ffe9a0", T.T_JAR, T.T_EVILS, -0.8, 3.9, 1.2, 3.0, 0.03);
    plateAt("ev", "ALL THE EVILS", "OF THE WORLD", "#4a1a3a", "#ffffff", T.T_EVILS, T.T_SICK, -0.8, 3.9, 1.2, 3.0, -0.03);
    if (t >= T.T_SICK && t < T.T_LIFT) {
      const ic: [number, number, string, string][] = [[T.T_SICK, 0, "SICKNESS", "#3a6a3a"], [T.T_WORK, 1, "HARD WORK", "#6a4a2a"], [T.T_GRIEF, 2, "GRIEF", "#2a3f8a"]];
      for (const [tt, k, label, bg] of ic) if (t >= tt) { const e = pop(t - tt, 0.5); s.fx("evi" + k, 120, 120, k === 0 ? sick : k === 1 ? sweat : tear, -2.4 + 1.6 * k, 3.2 + 0.1 * Math.sin(t * 3 + k), 1.0, 0.9 * e, 0.9 * e, {}); }
      for (const [tt, k, label, bg] of ic) plateAt("evl" + k, label, "", bg, "#ffffff", tt, tt + 0.9, -0.8, 4.5, 1.2, 3.0, 0.03 * (k - 1));
    }
    // she lifts the lid ... the mystery why
    if (t >= T.T_LIFT && t < T.T_FLEW) { plateAt("lft", "SHE LIFTS", "THE LID!", "#c92a2e", "#ffffff", T.T_LIFT, T.T_WHY, 0.0, 3.9, 1.2, 2.8, 0.03); }
    if (t >= T.T_WHY && t < T.T_FLEW) {
      plateAt("why", "WHY?", "HESIOD NEVER SAYS", "#3a2a6a", "#ffffff", T.T_WHY, T.T_CUR, 0.0, 3.9, 1.2, 3.2, -0.03);
      for (let k = 0; k < 3; k++) qm(-1.6 + 1.6 * k, 3.4, 1.0, T.T_WHY + 0.2, k, 1.0);
      if (t >= T.T_CUR) plateAt("cur", "CURIOSITY:", "ADDED LATER", "#6a1a1a", "#ffffff", T.T_CUR, T.T_FLEW, 0.0, 3.9, 1.2, 3.0, 0.03);
    }
    // the evils fly out and spread across the world
    if (t >= T.T_FLEW - 0.1 && t < 66.0) {
      for (let k = 0; k < 12; k++) {
        const u = (t - T.T_FLEW - 0.1 * k) / 2.4; if (u <= 0 || u >= 1) continue;
        const ang = (k / 12) * Math.PI * 1.1 + 0.2 + 0.2 * Math.sin(k * 2), r = 7.5 * glide(u), x = jx + 0.9 + Math.cos(ang) * r * 1.1, y = jy + 1.5 + Math.sin(ang) * r * 1.3 + 0.4 * Math.sin(t * 6 + k);
        s.fx(`spi${k % 3}`, 120, 180, spiritC(k), x, y, 0.6, 0.9 + 0.5 * u, 1.35 + 0.7 * u, { rot: 0.2 * Math.sin(t * 5 + k) });
      }
      plateAt("fl", "OUT FLEW", "THE EVILS!", "#4a1a3a", "#ffffff", T.T_FLEW, T.T_SPREAD, 0.0, 5.0, 1.0, 3.4, -0.03);
      if (t >= T.T_SPREAD) { const e = pop(t - T.T_SPREAD, 0.4); s.fx("gl", 200, 200, globe(q((t * 0.2) % 1, 20)), 0.0, 6.2, -0.5, 3.0 * e, 3.0 * e, {}); }
    }
    // Hope stays inside
    if (t >= T.T_HOPE - 0.4 && t < 73.9) {
      const e = pop(t - T.T_HOPE + 0.4, 0.5), g = 1 + 0.08 * Math.sin(t * 4);
      s.fx("hg", 200, 200, glowC("255,230,150"), jx, jy + 1.0, 0.5, 1.8 * g, 1.8 * g, { soft: true });
      s.fx("hope", 160, 140, hopeC, jx, jy + 1.05 + 0.05 * Math.sin(t * 3), 0.55, 0.8 * e, 0.7 * e, {});
      plateAt("hp", "HOPE", "", "#c8a040", "#ffffff", T.T_HOPE, T.T_DEBATE, 0.0, 3.9, 1.2, 2.4, 0.03);
    }
    if (t >= T.T_DEBATE && t < 73.9) {
      plateAt("deb", "STILL DEBATED!", "", "#3a2a6a", "#ffffff", T.T_DEBATE, T.T_COMF, 0.0, 3.9, 1.2, 3.2, -0.03);
      plateAt("cmf", "A COMFORT?", "", "#3a6a3a", "#ffffff", T.T_COMF, T.T_TRICK, 0.0, 3.9, 1.2, 3.0, -0.03);
      plateAt("trk", "OR A TRICK?", "", "#6a1a1a", "#ffffff", T.T_TRICK, 73.9, 0.0, 3.9, 1.2, 3.0, 0.03);
      for (let k = 0; k < 2; k++) qm(-1.8 + 3.6 * k, 3.3, 1.0, T.T_DEBATE + 0.2, k, 1.0);
    }
    // ----- finale -----
    if (t >= T.T_CTA - 0.2) {
      const g = 1 + 0.08 * Math.sin(t * 3);
      s.fx("pgl", 200, 200, glowC("255,214,120"), 0, 5.4, -1.0, 7.0 * g, 7.0 * g, { soft: true });
      s.fx("hope2", 160, 140, hopeC, 0.0, 5.4 + 0.2 * Math.sin(t * 3), -0.6, 2.2 * pop(t - T.T_CTA + 0.2, 0.4), 1.9 * pop(t - T.T_CTA + 0.2, 0.4), { rot: 0.1 * Math.sin(t * 2) });
      plateAt("jfin", "IT WAS A JAR!", "", "#c8a040", "#ffffff", T.T_CTA, T.T_CTA + 2.6, 0.0, 6.6, 1.0, 3.6, -0.03);
      for (let k = 0; k < 6; k++) { const u = (t * 0.35 + k / 6) % 1; s.fx("star", 70, 70, starC, -3 + 6 * hh(k, 2), 2 + 4 * u, 0.6, 0.35, 0.35, { rot: t + k }); }
      const crew: [Outfit, string][] = [[EPI, "epi"], [PROM, "prom"], [ZEUS, "zeus"], [ATH, "ath"], [HERM, "herm"], [HEPH, "heph"]];
      for (let k = 0; k < 6; k++) { const x = (k < 3 ? -1 : 1) * (1.4 + 1.1 * (k % 3)) + (k < 3 ? -0.4 : 0.8), z = -0.8 + 0.8 * (k % 2); if (fol) cheer(30 + k, crew[k][0], crew[k][1] + "c", x, z, 1.4, 0.14, 1.1, 0); else idleW(30 + k, crew[k][0], crew[k][1] + "c", x, z, "smile", 1.1, 0, { l: [-0.5, 0.3], r: [0.55, ar(-0.6 + 0.3 * Math.sin(t * 4 + k))] }); }
      confetti(fol ? 24 : 10, 0, 0, 12, 9); if (fol) for (let k = 0; k < 5; k++) { const u = (t * 0.6 + k / 5) % 1; s.fx("hrt", 100, 100, heart, -2 + k, 2 + 4 * u, 1.6, 0.5, 0.5); }
    }
  }

  // ====================================================== O: OLYMPUS (x = -40) ======================================================
  const inO = (t >= 11.7 && t < 24.0) || (t >= 28.6 && t < 37.8);
  if (inO) {
    const ox = OXc;
    // Zeus on the throne (always, 18 - 24 angry; 29 - 37 judge)
    const zangry = t >= T.T_ZEUS && t < 24.0, kk = Math.sin(t * 7);
    who(60, ZEUS, "zeus", ox, -2.4, t >= T.T_ZEUS ? (zangry ? "stern" : "neutral") : "neutral", { arms: zangry ? { l: [-0.55, ar(-0.9 + 0.2 * kk)], r: [0.55, ar(-0.9 - 0.2 * kk)] } : { l: [-0.5, 0.35], r: [0.5, 0.35] } }, 1.5, zangry ? { dy: 0.04 * Math.abs(kk), sx: 1, sy: 1 + 0.015 * kk, lean: 0.03 * kk } : idle(t, 60, 1.5), 0.9, false);
    if (t >= 11.7 && t < 17.9) {   // the theft
      s.fx("bowl", 120, 120, flameC, ox - 7, 1.7, 2.5, 1.2, 1.4, {}); s.fx("bowlg", 200, 200, glowC("255,170,60"), ox - 7, 1.9, 2.4, 3.2, 3.2, { soft: true });
      const u = clamp01((t - T.T_PROM) / 1.6), px = lerp(ox - 3, ox - 9, glide(u)), run = t >= T.T_FIRE;
      const pxx = run ? lerp(ox - 7.5, ox - 1, glide(clamp01((t - T.T_FIRE) / 1.6))) : px;
      if (t < T.T_PROM) who(61, PROM, "prom", ox + 3.5, 2.8, "stern", { arms: { l: [-0.4, 0.3], r: [0.4, 0.3] } }, 1.4, idle(t, 61, 1.5), 0);
      else if (!run) stride(61, PROM, "promS", px, 2.8, "stern", -1, 1.5, { l: [-0.4, 0.3], r: [0.5, 0.3] }, 1.4, 0);
      else { stride(61, PROM, "promR", pxx, 3.0, "grin", 1, 2.2, { l: [-0.4, 0.3], r: [0.55, -0.9] }, 1.4, 0); s.fx("tor", 80, 220, torchC, pxx + 0.6, 2.7, 3.1, 0.7, 1.9, { rot: 0.1 * Math.sin(t * 8) }); s.fx("torg", 200, 200, glowC("255,170,60"), pxx + 0.6, 3.4, 3.0, 2.0, 2.0, { soft: true }); }
      plateAt("thf", "THEFT!", "", "#c92a2e", "#ffffff", T.T_THEFT, T.T_PROM, ox, 4.8, 3.0, 2.8, -0.03);
      plateAt("prm", "TITAN", "PROMETHEUS", "#c8703a", "#ffffff", T.T_PROM, T.T_FIRE, ox - 1, 4.8, 3.0, 3.0, 0.03);
      plateAt("fir", "FIRE!", "", "#c8703a", "#ffffff", T.T_FIRE, T.T_HUM, ox - 2, 4.8, 3.0, 2.4, -0.03);
      if (t >= T.T_HUM) for (let k = 0; k < 3; k++) { const w = Math.sin(t * 6 + k); who(70 + k, HUM(k), `hum${k}`, ox - 8 + 1.4 * k, 4.0, "smile", { arms: { l: [-0.55, ar(-0.9 + 0.15 * w)], r: [0.55, ar(-0.9 - 0.15 * w)] } }, 1.1, hop(t, 70 + k, 1.2, 0.1), 0); }
      plateAt("hmn", "TO HUMANS!", "", "#3a6a3a", "#ffffff", T.T_HUM, 17.9, ox - 6, 4.8, 3.0, 3.0, 0.03);
    }
    if (t >= T.T_ZEUS && t < 24.0) {
      for (let k = 0; k < 4; k++) { const e = pop(t - T.T_FURY - 0.1 * k, 0.4); if (t >= T.T_FURY) s.fx("bolt", 80, 180, bolt, ox - 4 + 2.6 * k, 4.4 + 0.2 * Math.sin(t * 9 + k), -3.2, 0.8 * e, 1.9 * e, { rot: 0.2 * Math.sin(t * 6 + k) }); }
      plateAt("zf", "ZEUS", "IS FURIOUS!", "#6a8ad8", "#ffffff", T.T_ZEUS, T.T_ORD, ox, 7.0, -2.8, 3.2, -0.03);
      if (t >= T.T_ORD) { plateAt("ord", "PUNISHMENT:", "THE FIRST WOMAN", "#2a1a10", "#ffd84a", T.T_ORD, T.T_PAND, ox, 7.0, -2.8, 3.8, 0.03); }
      plateAt("pdn", "PANDORA!", "", "#c8a040", "#ffffff", T.T_PAND, 24.0, ox, 7.0, -2.8, 3.2, -0.03);
      for (let k = 0; k < 4; k++) { const gx = ox - 6.5 + 4.4 * k, w = Math.sin(t * 4 + k); if (t >= T.T_ORD) idleW(80 + k, [ATH, HERM, APH, HEPH][k], `gd${k}`, gx, 1.5, "neutral", 1.2, 0, { l: [-0.45, 0.3], r: [0.5, ar(-0.3 + 0.2 * w)] }); }
    }
    // the gifts (29 - 37.8): the gods stand around Pandora
    if (t >= 28.6) {
      const px = ox;
      const born = t >= T.T_ATH - 0.6, gl = 1 + 0.06 * Math.sin(t * 4);
      who(90, PAND, "pandG", px, 1.5, t >= T.T_NAME ? "laugh" : "smile", { arms: { l: [-0.45, 0.3], r: [0.5, ar(-0.2 + 0.3 * Math.sin(t * 3))] } }, 1.2, t >= T.T_NAME ? hop(t, 90, 1.2, 0.1) : idle(t, 90, 1.5), 0);
      const gs: [Outfit, string, number, number, number][] = [[ATH, "ath", -2.0, T.T_ATH, 0], [APH, "aph", -1.0, T.T_APH, 1], [HERM, "herm", 1.2, T.T_HERM, 2], [HEPH, "heph", 3.6, T.T_HEPH, 3]];
      for (const [o, ok, gx, tt, k] of gs) { if (k === 3) continue; const a = t - tt, w = Math.sin(t * 4 + k); who(91 + k, o, ok + "G", px + gx, 0.9 + 0.2 * (k % 2), a >= 0 ? "grin" : "smile", { arms: { l: [-0.5, 0.3], r: [0.55, a >= 0 ? ar(-0.8 + 0.3 * w) : 0.3] } }, 1.2, a >= 0 && a < 0.6 ? { dy: 0.1 * pulse(a, 0.5), sx: 1 + 0.04 * pulse(a, 0.5), sy: 1 - 0.04 * pulse(a, 0.5), lean: 0 } : idle(t, 91 + k, 1.5), 0); }
      if (t >= T.T_HERM) s.fx("wing", 100, 70, wingsC, px + 1.2, 3.5, 0.9, 0.9, 0.6, { rot: 0.15 * Math.sin(t * 8) });
      plateAt("at", "ATHENA:", "WEAVING", "#d8e0f0", "#2a1a10", T.T_ATH, T.T_APH, px, 4.9, 1.0, 2.8, -0.03);
      plateAt("ap", "APHRODITE:", "BEAUTY", "#f0a8c0", "#2a1a10", T.T_APH, T.T_HERM, px, 4.9, 1.0, 3.0, 0.03);
      plateAt("hm", "HERMES:", "A SLY MIND", "#e0b840", "#2a1a10", T.T_HERM, T.T_NAME, px, 4.9, 1.0, 3.0, -0.03);
      if (t >= T.T_ATH && t < T.T_APH) s.fx("spool", 120, 160, spoolC, px - 2.0, 3.6, 1.0, 0.8, 1.0, { rot: 0.2 * Math.sin(t * 5) });
      if (t >= T.T_APH && t < T.T_HERM) for (let k = 0; k < 3; k++) { const u = (t * 0.7 + k / 3) % 1; s.fx("hrt", 100, 100, heart, px - 1.0 + 0.3 * k, 3.4 + 2 * u, 1.0, 0.5, 0.5); }
      if (t >= T.T_NAME) { const e = pop(t - T.T_NAME, 0.4); s.fx("allg", 600, 240, plate("PANDORA =", "ALL GIFTS!", "#c8a040", "#ffffff"), px, 5.6, 1.0, 3.6 * e, 1.44 * e, { rot: 0.03 }); for (let k = 0; k < 6; k++) { const u = (t * 0.5 + k / 6) % 1; s.fx("spk", 70, 70, sparkleC, px - 3 + 6 * hh(k, 2), 1 + 4 * u, 0.6, 0.35, 0.35, { rot: t + k }); } }
      void born; void gl;
    }
  }

  // ====================================================== F: HEPHAESTUS' FORGE (x = -80) and Hesiod ======================================================
  const inF = (t >= 8.2 && t < 12.3) || (t >= 23.8 && t < 29.4);
  if (inF) {
    const fx0 = FXc;
    if (t < 12.3) {   // Hesiod, the poet, with his scroll
      const w = Math.sin(t * 3);
      who(100, HES, "hes", fx0, 0.8, "smile", { arms: { l: [-0.5, 0.3], r: [0.55, ar(-0.3 + 0.2 * w)] }, held: "scroll" as const }, 1.35, idle(t, 100, 1.5), 0);
      plateAt("hes", "THE POET", "HESIOD", "#2a3f8a", "#ffffff", T.T_HESIOD, T.T_700, fx0, 4.5, 1.4, 2.8, -0.03);
      plateAt("y7", "~700 BC", "", "#2a1a10", "#ffd84a", T.T_700, 12.3, fx0, 4.5, 1.4, 3.0, 0.03);
      s.fx("pen", 80, 80, penC, fx0 + 1.4, 3.0, 1.2, 0.8, 0.8, { rot: 0.4 });
    } else {          // Hephaestus shapes Pandora
      flame(fx0 - 1.6, 1.0, -9.6, 1.6, 0); flame(fx0 + 0.2, 1.0, -9.6, 1.9, 1); flame(fx0 + 1.8, 1.0, -9.6, 1.5, 2);
      const h = Math.sin(t * 6), hit = Math.max(0, h);
      who(110, HEPH, "heph", fx0 - 0.2, 1.4, t >= T.T_SHAPED ? "grin" : "stern", { arms: { l: [-0.5, 0.35], r: [0.55, ar(-0.9 + 1.0 * hit)] } }, 1.4, { dy: 0.02 * hit, sx: 1 + 0.04 * hit, sy: 1 - 0.05 * hit, lean: -0.06 * hit }, 0);
      s.fx("ham", 100, 180, hammerC, fx0 + 0.9, 2.5 + 0.4 * hit, 1.5, 0.9, 1.2, { rot: -0.5 + 0.8 * (1 - hit) });
      if (t >= T.T_HEPH + 0.3 && hit > 0.9) burstAt(t, fx0 + 0.2, 1.8, 1.2, 1.2, 0.2, "#ffe9a0");
      const stat = t >= T.T_SHAPED ? 1 : 0.5 + 0.5 * clamp01((t - T.T_HEPH) / 2.0);
      s.fx("stat", 120, 160, statueC, fx0 + 4.7, 1.2 + 0.4 * stat, 0.5, 1.0 * stat + 0.3, 1.5 * stat + 0.3, {});
      if (t >= T.T_EARTH) for (let k = 0; k < 2; k++) { const u = clamp01((t - T.T_EARTH - 0.3 * k) / 0.8); s.fx("earth", 120, 120, earthC, fx0 + 4.0 + k * 1.5, 4.6 - 2.4 * u * u, 1.0, 0.9, 0.9, {}); }
      if (t >= T.T_EARTH + 0.5) for (let k = 0; k < 3; k++) { const u = clamp01((t - T.T_EARTH - 0.5 - 0.2 * k) / 0.7); s.fx("drop", 80, 100, dropC, fx0 + 4.6 + 0.4 * k, 4.4 - 2.2 * u * u, 1.0, 0.45, 0.6, {}); }
      plateAt("hef", "HEPHAESTUS", "GOD OF THE FORGE", "#6a4a3a", "#ffffff", T.T_HEPH, T.T_SHAPED, fx0, 3.9, 1.4, 3.4, -0.03);
      plateAt("eaw", "EARTH + WATER", "", "#3a6aa8", "#ffffff", T.T_SHAPED, 29.4, fx0 + 1, 4.0, 1.4, 3.4, 0.03);
    }
  }

  // ====================================================== L: ERASMUS' STUDY (x = -120) ======================================================
  if (t >= 73.5 && t < 87.8) {
    const lx = LXc, w = Math.sin(t * 3);
    who(120, ERAS, "eras", lx - 0.4, 0.2, t >= T.T_MIST ? "laugh" : "neutral", { arms: { l: [-0.5, 0.3], r: [0.55, ar(-0.4 + 0.3 * w)] } }, 1.3, idle(t, 120, 1.5), 0);
    s.fx("book", 200, 160, bookC, lx - 2.0, 1.8, -1.4, 1.4, 1.0, {});
    if (t < T.T_PITH) s.fx("scr", 80, 80, penC, lx + 1.0, 2.2, 0.0, 0.8, 0.8, { rot: 0.3 });
    plateAt("y15", "1508", "", "#2a1a10", "#ffd84a", T.T_1508, T.T_SCHOL, lx, 4.7, 1.0, 2.6, -0.03);
    plateAt("era", "SCHOLAR", "ERASMUS", "#2a3f8a", "#ffffff", T.T_SCHOL, T.T_PITH, lx, 4.7, 1.0, 3.0, 0.03);
    if (t >= T.T_PITH - 0.1 && t < T.T_LATIN) { const e = pop(t - T.T_PITH, 0.4); s.fx("pj", 220, 260, pithosC, lx + 2.2, 2.0, 0.6, 1.4 * e, 1.65 * e, { rot: 0.05 * Math.sin(t * 3) }); plateAt("pit", "PITHOS =", "BIG JAR", "#b8663a", "#ffffff", T.T_PITH, T.T_LATIN, lx - 0.4, 4.7, 1.0, 3.2, -0.03); }
    if (t >= T.T_LATIN - 0.1 && t < T.T_MIST) { const e = pop(t - T.T_LATIN, 0.4); s.fx("pc", 200, 180, chestC, lx + 2.2, 1.8, 0.6, 1.8 * e, 1.6 * e, { rot: 0.05 * Math.sin(t * 3) }); plateAt("lat", "LATIN:", "BOX!", "#6a1a1a", "#ffffff", T.T_LATIN, T.T_MIST, lx - 0.4, 4.7, 1.0, 2.8, 0.03); }
    if (t >= T.T_MIST) {
      plateAt("mis", "MISTAKE!", "", "#c92a2e", "#ffffff", T.T_MIST, T.T_500, lx, 4.9, 1.0, 3.0, -0.03);
      plateAt("y50", "500 YEARS", "OF BOXES!", "#2a1a10", "#ffd84a", T.T_500, 87.8, lx, 4.9, 1.0, 3.2, 0.03);
      for (let k = 0; k < 7; k++) { const u = (t * 0.45 + hh(k, 2)) % 1; s.fx("cb", 200, 180, chestC, lx - 4 + 8 * hh(k, 3), 7.5 * (1 - u), 0.8, 0.9, 0.8, { rot: t * 2 + k }); }
    }
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW; void smooth; void fxPuff; void smoke; void shotAt; void zzz; void coin; void crownC; void bolt; void clockFace; void cobweb; void cloud; void rainDrop; void bookC; void penC; void rays; void tomb; void flower; void tear; void sweat; void cake; void mug; void hbc; void think; void nope; void mapC; void stampC; void bangC; void pigC; void flagUKc; void hop; void pulse; void rr; void lerp; void bob; void calendar; void shield; void rope; void spark; void steam; void splat; void stink; void fly; void angelC; void dungBlob; void globe; void pie; void bowl; void rulerC; void cobweb; void flagUS; void sick; void gravec; void starC; void swords; void crownC2;
export type { V3, SetName, Expr, FrontOpts };
