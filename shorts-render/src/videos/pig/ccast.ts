// Cast of "The Pig War": American (blue) and British (red) soldiers, the farmer, the clerk, the admiral, a German emperor, and THE PIG (a drawn card).
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
const spr = (u: number, k = 7, w = 16) => (u <= 0 ? 0 : 1 - Math.exp(-k * u) * Math.cos(w * u));
const pulse = (u: number, d: number) => (u <= 0 || u >= d ? 0 : Math.sin((Math.PI * u) / d));
/** breathing + tiny weight shift */
const idle = (t: number, i: number, a = 1): Bn => ({ dy: 0, sx: 1 + 0.014 * a * Math.sin(t * 3.1 + i), sy: 1 - 0.016 * a * Math.sin(t * 3.1 + i), lean: 0.014 * a * Math.sin(t * 1.7 + i * 2) });
/** hops: stretch in the air, squash on landing, lean sway. rate = hops/s, h = height in m */
const hop = (t: number, i: number, rate: number, h: number, sway = 0.07): Bn => {
  const ph = (t * rate + hh(i, 3)) % 1, air = ph < 0.72 ? Math.sin((Math.PI * ph) / 0.72) : 0, land = ph >= 0.72 ? Math.sin((Math.PI * (ph - 0.72)) / 0.28) : 0, pre = ph > 0.62 && ph < 0.72 ? (ph - 0.62) / 0.1 : 0;
  return { dy: h * air, sx: 1 + 0.15 * land - 0.07 * air + 0.04 * pre, sy: 1 - 0.17 * land + 0.11 * air - 0.05 * pre, lean: sway * Math.sin(2 * Math.PI * (t * rate * 0.5 + hh(i, 5))) };
};
/** walking bounce: bob twice per stride, lean into the direction of travel (dirx = screen-space sign of motion) */
const walk = (t: number, i: number, speed: number, dirx: number, h = 0.07): Bn => {
  const ph = ((t * speed * 0.7 + hh(i, 4)) % 1 + 1) % 1, b = Math.abs(Math.sin(2 * Math.PI * ph));
  return { dy: h * b, sx: 1 - 0.03 * b, sy: 1 + 0.04 * b, lean: -0.1 * dirx + 0.03 * Math.sin(4 * Math.PI * ph) };
};
const add = (a: Bn, b: Bn): Bn => ({ dy: a.dy + b.dy, sx: a.sx * b.sx, sy: a.sy * b.sy, lean: a.lean + b.lean });

// ---------------- outfits ----------------
const USA = (v: number, o: Partial<Outfit> = {}): Outfit => ({ jacket: "#2a3f8a", pants: "#6a7aa8", boots: "#2a2220", hat: "cap", cap: "#2a3f8a", belt: "#e8d8a0", buttons: "#e8c45a", rifle: v % 2 === 0, skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult", ...o });
const BRIT = (v: number, o: Partial<Outfit> = {}): Outfit => ({ jacket: "#c0352a", pants: "#f0ece0", boots: "#2a2220", hat: "shako", belt: "#f0ece0", buttons: "#e8c45a", rifle: v % 2 === 1, skin: SKINS[(v + 1) % 4], build: v % 3 === 1 ? "stout" : "adult", ...o });
const FARMER: Outfit = { jacket: "#6a7a4a", pants: "#5a4a3a", boots: "#3a2a1a", hat: "cap", cap: "#d8b860", moustache: "#6a4a2a", skin: SKINS[1], rifle: true, build: "stout" };
const CLERK: Outfit = { jacket: "#3a2a2a", pants: "#2a2a30", boots: "#1a1a1e", hat: "tophat", moustache: "#2a2a2a", skin: SKINS[2], build: "adult", buttons: "#e8c45a" };
const PICKETT: Outfit = USA(0, { hat: "bicorne", sword: true, rifle: false, sash: "#e8c45a", moustache: "#5a4a3a", build: "adult" });
const ADMIRAL: Outfit = { jacket: "#1f2a5a", pants: "#f0ece0", boots: "#1a1a1e", hat: "bicorne", sash: "#e8c45a", sword: true, moustache: "#e6e2d8", skin: SKINS[0], build: "stout", buttons: "#e8c45a" };
const KAISER: Outfit = { jacket: "#3a3e4a", pants: "#d8d8e0", boots: "#1a1a1e", hat: "bicorne", sash: "#c0353a", sword: true, moustache: "#f0f0f0", skin: SKINS[0], build: "stout", buttons: "#e8c45a" };

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
const confettiC = (col: string) => (p: Pen) => { p.poly([[2, 2], [22, 6], [18, 24], [0, 18]], col, 2); };

// ---------------- the stage ----------------
const glide = T.glide;
const ar = (v: number) => Math.round(v * 2.5) / 2.5;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const HX = 60;
const FARMX = T.FARM, USC = T.USC, BRC = T.BRC, DIN = T.DIN, KZ = T.KZ, TOMB = T.TOMB;
/** the pig's story: hero in the hook, trots into the garden, gets shot, lies dead, ghost at the end */
type PigS = { x: number; y: number; z: number; rot: number; st: "run" | "eat" | "dead" | "ghost" | "happy"; dir: 1 | -1; hd: number; ph: number; sc: number; vis: boolean; bn: Bn };
const pigAt = (t: number): PigS => {
  const o: PigS = { x: 0, y: 0, z: 0, rot: 0, st: "happy", dir: 1, hd: 0, ph: 0, sc: 1, vis: false, bn: NB };
  if (t < 7.2) {                                                         // hook hero: a big, bouncy, smug pig on the field
    const hp = hop(t, 5, 1.6, 0.35, 0.1), flop = spr(t - T.T_PIGDEAD, 6, 14);
    o.vis = true; o.x = 0; o.z = 0.2; o.sc = 1.2; o.dir = 1; o.st = t < T.T_PIGDEAD ? "happy" : "dead"; o.rot = t < T.T_PIGDEAD ? 0 : -0.25 * flop;
    o.bn = t < T.T_PIGDEAD ? hp : { dy: 0, sx: 1 + 0.2 * pulse(t - T.T_PIGDEAD, 0.4), sy: 1 - 0.3 * pulse(t - T.T_PIGDEAD, 0.4), lean: 0 };
    o.y = t < T.T_PIGDEAD ? 0 : 0.1 * (1 - flop);
    if (t > 5.2 && t < T.T_PIGDEAD) { o.rot = 0.12 * Math.sin(t * 30) * (t - 5.2); }   // shivering before it keels over
    return o;
  }
  if (t >= T.T_FOUND - 0.6 && t < T.T_SHOT) {                           // trots in from the east, then munches potatoes
    const u = clamp01((t - (T.T_FOUND - 0.6)) / 1.5), ph = (t * 2.6) % 1;
    o.vis = true; o.x = lerp(FARMX + 8, FARMX - 0.5, glide(u)); o.z = 1.0; o.dir = -1; o.sc = 0.8;
    if (u < 1) { o.st = "run"; o.ph = ph; o.bn = { dy: 0.1 * Math.abs(Math.sin(ph * 6.28)), sx: 1, sy: 1 + 0.05 * Math.abs(Math.sin(ph * 6.28)), lean: 0.06 }; }
    else { o.st = "eat"; o.hd = 0.5 + 0.5 * Math.abs(Math.sin(t * 9)); o.bn = { dy: 0, sx: 1 + 0.03 * Math.sin(t * 9), sy: 1 - 0.03 * Math.sin(t * 9), lean: 0.03 * Math.sin(t * 4.5) }; }
    return o;
  }
  if (t >= T.T_SHOT && t < T.T_SHOT + 1.1) {                            // hit: launched, spinning, lands belly-up
    const u = (t - T.T_SHOT) / 1.1, arc = 3.0 * Math.sin(Math.PI * Math.min(1, u * 1.15)), land = spr(u - 0.87, 9, 22);
    o.vis = true; o.x = FARMX - 0.5 + 1.6 * u; o.z = 1.0; o.y = Math.max(0, arc); o.rot = -6.4 * u; o.dir = -1; o.sc = 0.8; o.st = u < 0.85 ? "run" : "dead"; o.ph = (t * 8) % 1;
    o.bn = u < 0.1 ? { dy: 0, sx: 1.2, sy: 0.8, lean: 0 } : { dy: 0, sx: 1 - 0.1 * pulse(u - 0.85, 0.2), sy: 1 + 0.1 * pulse(u - 0.85, 0.2), lean: 0 }; void land;
    return o;
  }
  if (t >= T.T_SHOT + 1.1 && t < 32) { o.vis = t < T.T_DEADPIG - 0.4 || t >= T.T_DEADPIG - 0.4; o.x = t < 29.6 ? FARMX + 1.1 : 3; o.z = t < 29.6 ? 1.0 : -1.2; o.y = 0; o.dir = -1; o.sc = t < 29.6 ? 0.8 : 1.5; o.st = "dead"; o.vis = (t < 24 || t >= 29.6); return o; }
  if (t >= T.T_CASUALTY - 0.2) {                                        // the ghost pig rises from the tombstone, wings flapping
    const u = clamp01((t - (T.T_CASUALTY - 0.2)) / 1.6), flap = Math.sin(t * 14);
    o.vis = true; o.x = TOMB[0] + 0.5 + 1.2 * Math.sin(t * 1.5) * u; o.z = TOMB[2] + 0.6; o.y = 0.4 + 2.6 * glide(u) + 0.15 * Math.sin(t * 5); o.st = "ghost"; o.sc = 1.2; o.dir = 1; o.ph = 0;
    o.bn = { dy: 0, sx: 1 + 0.05 * flap, sy: 1 - 0.05 * flap, lean: 0.06 * Math.sin(t * 3) }; return o;
  }
  return o;
};

export const stage = (f: number, cam: CamInfo): Stage => {
  const t = f / FPS, s = new S(cam, "w", t);
  const pop = (age: number, k = 0.55) => 1 + k * (1 - Math.min(1, Math.max(0, age) / 0.14)) + (age > 0 ? 0.1 * Math.exp(-6 * age) * Math.sin(age * 22) : 0);
  const puffAt = (t0: number, x: number, z: number, w = 1.6, dur = 0.9, y = 0) => { if (t >= t0 && t < t0 + dur) { const u = (t - t0) / dur; s.fx("dust", 120, 120, dustC, x, y + 0.4 + 0.8 * u, z, w * (0.5 + u), w * (0.5 + u) * 0.8, { soft: true }); } };
  const burstAt = (t0: number, x: number, y: number, z: number, w: number, dur = 0.4, col = "#fff3b0") => s.burst(t0, x, y, z, w, dur, col);
  const confetti = (n: number, x0: number, z0: number, w: number) => { const cols = ["#ff5a7a", "#ffd84a", "#6ab4ff", "#7be07b"]; for (let k = 0; k < n; k++) { const u = (t * 0.5 + hh(k, 2)) % 1; s.fx(`cf${k % 4}`, 40, 40, confettiC(cols[k % 4]), x0 + w * (hh(k, 3) - 0.5) + 0.5 * Math.sin(t * 3 + k), 6 * (1 - u), z0 + 3 * (hh(k, 4) - 0.5), 0.22, 0.22, { rot: t * 4 + k }); } };
  const who = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, fo: Partial<FrontOpts> = {}, sc = 1, bn: Bn = NB, y = 0, shadow = true) => s.who(i, o, ok, x, y, z, { mode: "stand", expr, ...fo }, sc, shadow, bn);
  const stride = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, dirx: number, speed = 1.6, arms: FrontOpts["arms"] = { l: [-0.5, 0.2], r: [0.5, 0.2] }, sc = 1) => s.who(i, o, ok, x, 0, z, { mode: "stroll", phase: q(((t * speed * 0.7 + hh(i, 4)) % 1 + 1) % 1, 12), expr, arms }, sc, true, walk(t, i, speed, dirx));
  const cheer = (i: number, o: Outfit, ok: string, x: number, z: number, rate = 2.0, h = 0.3, sc = 1) => { const w = Math.sin(t * 9 + i); who(i, o, ok, x, z, i % 2 ? "laugh" : "grin", { arms: { l: [-0.55, ar(-0.9 + 0.2 * w)], r: [0.55, ar(-0.9 - 0.2 * w)] } }, sc, hop(t, i, rate, h)); };

  // ================= 0 - 7.4: the hook =================
  if (t < 7.6) {
    const war = t >= T.T_WAR, shock = t >= T.T_PIGDEAD;
    for (let k = 0; k < 5; k++) for (const side of [-1, 1] as const) {
      const i = 10 + k * 2 + (side > 0 ? 1 : 0), x = HX + side * (3.4 + 0.3 * (k % 2)), z = -3.6 + 1.9 * k, o = side < 0 ? USA(k) : BRIT(k);
      const big = war && !shock ? hop(t, i, 2.2, 0.22, 0.1) : shock ? { dy: 0, sx: 1 + 0.08 * pulse(t - T.T_PIGDEAD - 0.05 * k, 0.4), sy: 1 - 0.1 * pulse(t - T.T_PIGDEAD - 0.05 * k, 0.4), lean: 0.05 * Math.sin(t * 20 + k) * Math.exp(-3 * (t - T.T_PIGDEAD)) } : idle(t, i, 1.4);
      const sw = Math.sin(t * 11 + k * 1.7);
      who(i, o, `h${side}${k % 3}${war ? "w" : "s"}`, x, z, shock ? "shock" : war ? "stern" : t > T.T_AMERICA ? "stern" : "neutral", { arms: war && !shock ? { l: [-0.55, ar(-0.85 + 0.2 * sw)], r: [0.55, ar(-0.85 - 0.2 * sw)] } : { l: [-0.4, 0.3], r: [0.45, 0.3] }, headTilt: war && !shock ? ar(0.07 * sw) : 0 }, 1.05, big);
    }
    s.fx("fUS", 160, 120, flagUS, HX - 4.8, 3.2, -5, 1.6, 1.2, { rot: 0.1 * Math.sin(t * 4) }); s.fx("fUK", 160, 120, flagUS, HX + 4.8, 3.2, -5, 1.6, 1.2, { rot: -0.1 * Math.sin(t * 4) });
    burstAt(T.T_WAR, HX, 2.4, 0.3, 7, 0.5, "#ffe9a0");
    if (t >= T.T_PIG - 0.1 && t < T.T_DIED) s.fx("hrt", 100, 100, heart, HX + 1.6, 3.6 + 0.3 * Math.sin(t * 6), 0.4, 0.9 * pop(t - T.T_PIG, 0.4), 0.9 * pop(t - T.T_PIG, 0.4));
    for (let k = 0; k < 3; k++) puffAt(T.T_PIGDEAD + 0.1 * k, HX - 1 + k, 0.8, 2.0, 0.8);
    if (t >= T.T_PIGDEAD) s.fx("dedx", 100, 100, bang, HX + 1.8, 3.6, 0.4, 1.4 * pop(t - T.T_PIGDEAD), 1.4 * pop(t - T.T_PIGDEAD));
    const pg = pigAt(t);
    if (pg.vis) s.fx(`pig${pg.st}${pg.dir}${q(pg.ph, 6)}${q(pg.hd, 3)}`, 300, 220, pigC(q(pg.ph, 6), pg.st, pg.dir, q(pg.hd, 3)), pg.x + HX, pg.y + 0.1 + pg.bn.dy, pg.z, 3.0 * pg.sc * pg.bn.sx, 2.2 * pg.sc * pg.bn.sy, { rot: pg.rot + pg.bn.lean });
  }

  // ================= 7.4 - 12: San Juan Island (aerial): both flags, the claim =================
  if (t >= 7.0 && t < 12.2) {
    s.fx("sj", 600, 240, plate("SAN JUAN", "ISLAND", "#2a1a10", "#ffd84a"), 12, 9.5, 0, 9 * pop(t - T.T_SAN, 0.35), 3.6 * pop(t - T.T_SAN, 0.35), { rot: -0.03 });
    if (t >= T.T_CLAIM - 0.6) { const e = pop(t - T.T_CLAIM + 0.6, 0.3); s.fx("cUS", 160, 120, flagUS, -2, 6, -4, 3.2 * e, 2.4 * e, { rot: 0.1 * Math.sin(t * 4) }); s.fx("cUK", 160, 120, flagUS, 26, 6, -4, 3.2 * e, 2.4 * e, { rot: -0.1 * Math.sin(t * 4) }); }
  }

  // ================= 11.2 - 22.8: the farm =================
  if (t >= 10.8 && t < 23.4) {
    const cx = FARMX - 3.0, cz = 1.6;
    const arrive = spr(t - T.T_FARMER, 7, 18), shocked = t >= T.T_FOUND, angry = t >= T.T_EAT, gun = t >= T.T_GUN, shot = t >= T.T_SHOT;
    let bn: Bn = idle(t, 1, 1.5), arms: FrontOpts["arms"] = { l: [-0.5, 0.35], r: [0.5, 0.35] }, expr: Expr = "smile";
    if (t >= T.T_FARMER && t < T.T_FOUND) { bn = hop(t, 1, 1.4, 0.18); arms = { l: [-0.55, 0.3], r: [0.55, ar(-0.8 + 0.2 * Math.sin(t * 9))] }; expr = "grin"; }
    if (shocked && !angry) { const u = t - T.T_FOUND; bn = { dy: 0.5 * pulse(u, 0.5), sx: 1 - 0.1 * pulse(u, 0.5), sy: 1 + 0.18 * pulse(u, 0.5), lean: -0.06 * spr(u) }; arms = { l: [-0.55, -0.9], r: [0.55, -0.9] }; expr = "shock"; }
    if (angry && !gun) { bn = add(hop(t, 1, 3.2, 0.12, 0.15), { dy: 0, sx: 1, sy: 1, lean: 0.04 * Math.sin(t * 30) }); arms = { l: [-0.55, ar(-0.5 + 0.2 * Math.sin(t * 18))], r: [0.55, ar(-0.5 - 0.2 * Math.sin(t * 18))] }; expr = "stern"; }
    if (gun && !shot) { const u = t - T.T_GUN; const crouch = u < 0.5 ? smooth(u / 0.5) : 1; bn = { dy: 0, sx: 1 + 0.08 * crouch, sy: 1 - 0.12 * crouch, lean: 0.12 * crouch }; arms = { l: [-0.4, -0.5], r: [0.4, -0.85] }; expr = "stern"; }
    if (shot) { const u = t - T.T_SHOT; bn = { dy: 0.15 * pulse(u, 0.3), sx: 1 - 0.1 * pulse(u, 0.25) + 0.05 * spr(u - 0.2), sy: 1 + 0.12 * pulse(u, 0.25), lean: -0.2 * Math.exp(-5 * u) * Math.cos(16 * u) - 0.04 }; arms = { l: [-0.45, -0.7], r: [0.45, -0.7] }; expr = u < 1.4 ? "shock" : "dazed"; }
    who(60, FARMER, "farm", cx, cz, expr, { arms, headTilt: ar(0.05 * Math.sin(t * 2)) }, 1.25, add(bn, { dy: 0, sx: 1 + 0.0 * arrive, sy: 1, lean: 0 }));
    if (t >= T.T_SHOT && t < T.T_SHOT + 0.5) { burstAt(T.T_SHOT, cx + 1.3, 1.5, cz + 0.3, 3.2, 0.3, "#fff3a0"); }
    if (t >= T.T_SHOT && t < T.T_SHOT + 1.2) s.fx("bng", 360, 220, bangC, cx + 1.4, 3.4, cz + 0.4, 2.6 * pop(t - T.T_SHOT, 0.6), 1.6 * pop(t - T.T_SHOT, 0.6), { rot: -0.1 });
    for (let k = 0; k < 4; k++) puffAt(T.T_SHOT + 0.04 * k, cx + 1.6 + 0.5 * k, cz + 0.4, 1.4, 1.0, 1.0);
    if (angry && !shot) for (let k = 0; k < 3; k++) { const u = (t * 1.6 + k / 3) % 1; s.fx("swt", 40, 40, sweat, cx - 0.4 + 0.5 * k, 3.1 - 0.2 * u + 0.4 * u * u, cz + 0.2, 0.25, 0.3); }
    // crumbs while the pig munches
    if (t >= T.T_EAT - 0.4 && t < T.T_SHOT) for (let k = 0; k < 4; k++) { const u = (t * 2 + k / 4) % 1; s.fx("crm", 60, 60, spark, FARMX - 1.1 - 0.1 * k, 0.4 + 0.5 * u, 1.6, 0.2, 0.2, { rot: t * 6 + k }); }
    // the pig
    const pg = pigAt(t);
    if (pg.vis && t >= 10) s.fx(`pig${pg.st}${pg.dir}${q(pg.ph, 6)}${q(pg.hd, 3)}`, 300, 220, pigC(q(pg.ph, 6), pg.st, pg.dir, q(pg.hd, 3)), pg.x, pg.y + 0.1 + pg.bn.dy, pg.z, 3.0 * pg.sc * pg.bn.sx, 2.2 * pg.sc * pg.bn.sy, { rot: pg.rot + pg.bn.lean });
    // the British company arrives: a clerk with a sign, two redcoats; Cutlar panics
    if (t >= T.T_BRITCO - 0.3) {
      const u = clamp01((t - (T.T_BRITCO - 0.3)) / 2.0), cxk = lerp(FARMX + 8, FARMX - 0.5, glide(u));
      stride(61, CLERK, "clerk", cxk, 2.4, t >= T.T_ARREST ? "stern" : "smile", -1, 1.8, { l: [-0.5, 0.3], r: [0.55, t >= T.T_ARREST ? ar(-0.9 + 0.2 * Math.sin(t * 12)) : 0.3] }, 1.25);
      s.fx("hbc", 400, 120, hbc, cxk + 0.3, 3.7 + 0.1 * Math.sin(t * 5), 2.6, 2.0 * pop(t - T.T_BRITCO, 0.3), 0.6 * pop(t - T.T_BRITCO, 0.3), { rot: 0.04 * Math.sin(t * 3) });
      if (t >= T.T_ARREST - 0.2) for (let k = 0; k < 2; k++) stride(62 + k, BRIT(k), `rc${k}`, lerp(FARMX + 10, FARMX + 1.2 + 1.0 * k, glide(clamp01((t - (T.T_ARREST - 0.2)) / 1.2))), 0.4 + 2.6 * k, "stern", -1, 2.0, { l: [-0.5, -0.4], r: [0.5, -0.4] }, 1.2);
      if (t >= T.T_ARREST) { s.fx("bg", 120, 120, bang, FARMX - 3.6, 3.6, 1.6, 1.2 * pop(t - T.T_ARREST), 1.2 * pop(t - T.T_ARREST)); }
    }
  }

  // ================= 22.7 - 31.8: soldiers, warships, cannons =================
  if (t >= 22.4 && t < 32.4) {
    const nUS = t < T.T_HUNDREDS ? 12 : 60;
    for (let n = 0; n < nUS; n++) {
      const c = n % 10, r = Math.floor(n / 10), tx = USC - 9 + c * 1.9 + 0.3 * hh(n, 2), tz = -3.4 - r * 1.25 + 0.2 * hh(n, 3), t0 = T.T_SOLD + (n < 12 ? 0.07 * n : 1.2 + 0.05 * (n % 20) + (t >= T.T_HUNDREDS ? 0 : 0));
      if (n >= 12 && t < T.T_HUNDREDS + 0.04 * (n - 12)) continue;
      const u = clamp01((t - t0) / 2.3), x = lerp(FARMX - 3, tx, glide(u)), z = lerp(2, tz, glide(u));
      const arrived = u >= 1, o = USA(n);
      if (!arrived) stride(100 + n, o, `us${n % 4}m`, x, z, "grin", 1, 2.0, { l: [-0.5, 0.2], r: [0.5, -0.4] });
      else who(100 + n, o, `us${n % 4}${t > T.T_FACED ? "a" : "s"}`, x, z, t > T.T_HUNDREDS ? "stern" : "grin", { arms: { l: [-0.5, 0.3], r: [0.5, ar(-0.5 + 0.1 * Math.sin(t * 6 + n))] } }, 1, t > T.T_FACED ? idle(t, n, 2) : hop(t, n, 1.8, 0.15, 0.06));
    }
    if (t >= T.T_SOLD) who(99, PICKETT, "pick", USC + 2, 0.6, t > T.T_FACED ? "stern" : "grin", { arms: { l: [-0.5, 0.3], r: [0.55, ar(-0.85 + 0.15 * Math.sin(t * 7))] } }, 1.3, hop(t, 99, 1.4, 0.18));
    if (t >= T.T_HUNDREDS && t < T.T_FACED + 1) for (let k = 0; k < 3; k++) s.fx("cnn", 120, 120, spark, USC - 7 + 7 * k, 1.9, -9.6, 0.5, 0.5, { rot: t * 8 });
    // the redcoats line up on the British side
    if (t >= T.T_SHIPS) for (let n = 0; n < 12; n++) { const c = n % 6, r = Math.floor(n / 6), u = clamp01((t - (T.T_SHIPS + 0.05 * n)) / 2.0); const x = lerp(BRC + 22, BRC - 4 + c * 1.8, glide(u)), z = -3.2 - r * 1.4; if (u < 1) stride(150 + n, BRIT(n), `bk${n % 4}m`, x, z, "stern", -1, 2.0, { l: [-0.5, 0.2], r: [0.5, 0.2] }); else who(150 + n, BRIT(n), `bk${n % 4}s`, x, z, "stern", { arms: { l: [-0.5, 0.3], r: [0.5, 0.3] } }, 1, idle(t, n, 2)); }
    // "over one dead pig"
    if (t >= T.T_DEADPIG - 0.5 && t < T.T_ADMIRAL) { const pg = pigAt(t); if (pg.vis) s.fx(`pigd${q(pg.sc, 2)}`, 300, 220, pigC(0, "dead", -1, 0), pg.x, 0.2 + 0.45 * pulse(t - T.T_DEADPIG + 0.5, 0.5), pg.z, 3.0 * pg.sc, 2.2 * pg.sc); }
    if (t >= T.T_DEADPIG && t < T.T_ADMIRAL) for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.1; s.fx("fly", 40, 40, spark, 0.3 * Math.cos(a), 1.4 + 0.2 * Math.sin(a * 1.7), -1.5 + 0.3 * Math.sin(a), 0.14, 0.14); }
    if (t >= T.T_FACED) { const e = pop(t - T.T_FACED, 0.35); s.fx("v5", 600, 240, plate("5 WARSHIPS", "", "#c92a2e", "#ffffff"), -3, 8.5, -26, 11 * e, 4.4 * e, { rot: 0.02 }); }
  }

  // ================= 31.6 - 37.5: the admiral refuses =================
  if (t >= 31.2 && t < 38.0) {
    const refuse = t >= T.T_REFUSE, said = t >= T.T_SAID;
    let bn: Bn = idle(t, 7, 1.5), arms: FrontOpts["arms"] = { l: [-0.5, 0.4], r: [0.5, 0.4] }, expr: Expr = "stern";
    if (refuse) { const u = t - T.T_REFUSE; bn = { dy: 0.1 * pulse(u, 0.25), sx: 1 + 0.1 * pulse(u, 0.2) - 0.05 * spr(u - 0.25), sy: 1 - 0.12 * pulse(u, 0.2) + 0.05 * spr(u - 0.25), lean: 0.1 * Math.sin(u * 14) * Math.exp(-2.5 * u) }; arms = { l: [-0.4, 0.5], r: [0.4, 0.5] }; expr = "stern"; }
    if (said) { const w = Math.sin(t * 6); bn = add(hop(t, 7, 1.3, 0.1, 0.1), { dy: 0, sx: 1, sy: 1, lean: 0.03 * w }); arms = { l: [-0.5, ar(0.3 + 0.2 * w)], r: [0.55, ar(-0.6 - 0.25 * w)] }; expr = t > 36.0 ? "smile" : "neutral"; }
    who(70, ADMIRAL, "adm", BRC, 0.2, expr, { arms, headTilt: refuse ? ar(0.25 * Math.sin(t * 15) * Math.exp(-1.8 * (t - T.T_REFUSE)) * (said ? 0 : 1)) : 0 }, 1.45, bn);
    for (let k = 0; k < 2; k++) who(71 + k, BRIT(k, { hat: "bicorne", sword: true, rifle: false, sash: "#f0ece0" }), `off${k}`, BRC + (k ? 3.2 : -3.0), 1.0, refuse ? "shock" : "stern", { arms: { l: [-0.4, 0.3], r: [0.4, 0.3] } }, 1.2, refuse ? hop(t, 71 + k, 2.4, 0.16) : idle(t, 71 + k, 1.5));
    if (refuse && t < T.T_SAID) s.fx("nope", 200, 200, nope, BRC + 1.8, 3.6, 0.3, 1.5 * pop(t - T.T_REFUSE, 0.5), 1.5 * pop(t - T.T_REFUSE, 0.5), { rot: 0.1 });
    if (said) { const e = pop(t - T.T_SAID, 0.3); s.fx("thk", 200, 200, think, BRC - 1.6, 4.3, 0.4, 3.0 * e, 3.0 * e); if (t >= 36.8) s.fx("nope", 200, 200, nope, BRC - 1.6, 4.4, 0.45, 1.5 * pop(t - 36.8, 0.5), 1.5 * pop(t - 36.8, 0.5), { rot: 0.1 }); }
    for (let n = 0; n < 10; n++) { const c = n % 5, r = Math.floor(n / 5); who(160 + n, BRIT(n + 3), `bk${n % 4}s`, BRC - 5 + c * 2.4, -3 - r * 1.4, refuse ? "shock" : "stern", { arms: { l: [-0.5, 0.3], r: [0.5, 0.3] } }, 1, refuse ? hop(t, n, 1.6, 0.1) : idle(t, n, 2)); }
  }

  // ================= 37.8 - 42.4: twelve years of shared dinner parties =================
  if (t >= 37.4 && t < 43.2) {
    const yr = 1859 + Math.min(13, Math.floor(13 * clamp01((t - T.T_YEARS) / 3.6)));
    s.fx(`yr${yr}`, 600, 240, plate(String(yr), "", "#2a1a10", "#ffd84a"), DIN, 5.2, 0.6, 3.6 * pop(t - T.T_YEARS, 0.3), 1.44 * pop(t - T.T_YEARS, 0.3), { rot: -0.02 });
    s.fx("cake", 200, 140, cake, DIN, 1.6, 1.6, 1.1, 0.8);
    for (let k = 0; k < 3; k++) s.fx("mug", 100, 110, mug, DIN - 3 + 3 * k, 1.35, 1.6, 0.36, 0.4);
    for (let n = 0; n < 8; n++) { const x = DIN - 3.8 + n * 1.1, us = n % 2 === 0, toast = Math.sin(t * 5 + n * 1.3); who(170 + n, us ? USA(n, { rifle: false }) : BRIT(n, { rifle: false }), `ds${us ? "u" : "b"}${n % 4}`, x, 0.2, "laugh", { mode: "sit", arms: { l: [-0.5, ar(-0.5 + 0.3 * toast)], r: [0.5, ar(-0.5 - 0.3 * toast)] } }, 1, add(idle(t, n, 2), { dy: 0, sx: 1, sy: 1 + 0.03 * Math.abs(toast), lean: 0.04 * toast }), 0.35); }
    for (let k = 0; k < 2; k++) { const dx = DIN - 2.2 + 4.4 * k, a = Math.sin(t * 6 + k * 3); who(180 + k * 2, USA(k, { rifle: false }), "dnU", dx - 0.7, 4.4, "grin", { arms: { l: [-0.55, ar(-0.3 + 0.4 * a)], r: [0.5, ar(-0.2 - 0.3 * a)] } }, 1.1, hop(t, 180 + k, 2.6, 0.32, 0.12)); who(181 + k * 2, BRIT(k, { rifle: false }), "dnB", dx + 0.7, 4.4, "laugh", { arms: { l: [-0.5, ar(-0.2 + 0.3 * a)], r: [0.55, ar(-0.3 - 0.4 * a)] } }, 1.1, hop(t, 181 + k, 2.6, 0.32, 0.12)); }
    confetti(14, DIN, 2, 10);
    if (t >= T.T_PARTY) for (let k = 0; k < 4; k++) s.fx("hrt", 100, 100, heart, DIN - 3 + 2 * k, 3.2 + 0.4 * Math.sin(t * 3 + k), 2.0, 0.5, 0.5, { rot: 0.2 * Math.sin(t * 2 + k) });
  }

  // ================= 42.4 - 47: the German emperor =================
  if (t >= 42.4 && t < 47.6) {
    const gave = t >= T.T_GAVE, em = t >= T.T_EMP, stampU = t - T.T_GAVE;
    let bn: Bn = idle(t, 80, 1.5), arms: FrontOpts["arms"] = { l: [-0.5, 0.4], r: [0.5, 0.4] };
    if (em) { bn = hop(t, 80, 1.2, 0.12, 0.08); arms = { l: [-0.5, 0.45], r: [0.5, 0.45] }; }
    if (gave) { bn = { dy: 0.2 * pulse(stampU, 0.35), sx: 1 + 0.12 * pulse(stampU - 0.12, 0.25) - 0.06 * spr(stampU - 0.35), sy: 1 - 0.14 * pulse(stampU - 0.12, 0.25) + 0.06 * spr(stampU - 0.35), lean: 0.02 * Math.sin(t * 8) }; arms = { l: [-0.5, -0.9], r: [0.55, -0.9] }; }
    who(80, KAISER, "kai", KZ, 0.4, gave ? "laugh" : "stern", { arms, headTilt: ar(0.05 * Math.sin(t * 2)) }, 1.55, bn);
    for (const sx of [-1, 1]) who(81 + (sx > 0 ? 1 : 0), BRIT(sx + 4, { hat: "cap", cap: "#3a3e4a", jacket: "#3a3e4a", rifle: false, sword: true }), `ai${sx}`, KZ + sx * 3.4, 1.0, gave ? "grin" : "neutral", { arms: { l: [-0.5, 0.3], r: [0.5, 0.3] } }, 1.15, gave ? hop(t, 81 + sx, 2.4, 0.2) : add(idle(t, 81 + sx, 2), { dy: 0, sx: 1, sy: 1, lean: 0.06 * Math.sin(t * 2 + sx) }));
    s.fx(`map${gave ? 1 : 0}`, 400, 300, mapC(gave), KZ + 0.2, 2.6, -1.6, 2.6 * pop(t - 42.6, 0.3), 1.95 * pop(t - 42.6, 0.3));
    if (em && !gave) s.fx("stp", 240, 280, stampC, KZ + 1.8, 3.9 + 0.3 * Math.sin(t * 4), -1.2, 0.8, 0.95);
    if (gave && stampU < 0.5) s.fx("stp", 240, 280, stampC, KZ + 1.8, lerp(3.6, 2.0, smooth(1 - Math.abs(stampU / 0.5 - 0.3) / 0.7)), -1.2, 0.8, 0.95);
    if (gave) { burstAt(T.T_GAVE + 0.1, KZ + 1.8, 2.2, -1.1, 4.5, 0.4, "#ffe9a0"); for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28; if (t < T.T_GAVE + 0.8) s.fx("sp", 60, 60, spark, KZ + 1.8 + (t - T.T_GAVE) * 3 * Math.cos(a), 2.2 + (t - T.T_GAVE) * 3 * Math.sin(a), -1, 0.3, 0.3); } }
    if (t >= T.T_1872 && t < T.T_EMP + 1.6) s.fx("y72", 600, 240, plate("1872", "", "#2a1a10", "#ffd84a"), KZ, 5.6, 0.5, 3.4 * pop(t - T.T_1872, 0.3), 1.36 * pop(t - T.T_1872, 0.3), { rot: 0.03 });
    confetti(10, KZ, 2, 8);
  }

  // ================= 47 - 55.6: zero battles, one casualty, the tombstone =================
  if (t >= 46.8) {
    s.fx("tomb", 160, 240, tomb, TOMB[0], 1.1, TOMB[2], 1.9, 2.2);
    for (let k = 0; k < 5; k++) s.fx(`fl${k % 3}`, 60, 110, flower(["#ff5a7a", "#ffd84a", "#6ab4ff"][k % 3]), TOMB[0] - 1.2 + 0.6 * k, 0.5, TOMB[2] + 0.9 + 0.1 * (k % 2), 0.45, 0.8);
    const cta = t >= T.T_CTA;
    for (let k = 0; k < 8; k++) {
      const a = Math.PI * (0.12 + 0.76 * k / 7), x = TOMB[0] + 4.1 * Math.cos(a) * (k % 2 ? 1 : 1.15), z = TOMB[2] + 3.4 * Math.sin(a) + 1.0, us = k % 2 === 0, o = us ? USA(k, { rifle: false }) : BRIT(k, { rifle: false });
      if (cta) { cheer(190 + k, o, `mo${us ? "u" : "b"}${k % 4}`, x, z, 2.1, 0.34, 1.1); continue; }
      const sob = Math.sin(t * 13 + k);
      who(190 + k, o, `mo${us ? "u" : "b"}${k % 4}`, x, z, "pained", { headTilt: 0.28, arms: { l: [-0.3, 0.55], r: [0.3, 0.55] } }, 1.1, { dy: 0.02 * Math.abs(sob), sx: 1 + 0.02 * sob, sy: 1 - 0.02 * sob, lean: 0.03 * Math.sin(t * 2 + k) });
      if (k % 2 === 0) for (let m = 0; m < 2; m++) { const u = (t * 1.2 + m / 2 + hh(k, 2)) % 1; s.fx("tr", 30, 40, tear, x - 0.28 + 0.56 * m, 2.5 - 1.4 * u * u, z + 0.1, 0.18, 0.24); }
    }
    if (t >= T.T_ZERO && t < T.T_CASUALTY) s.fx("z0", 600, 240, plate("BATTLES: 0", "", "#2a3f8a", "#ffffff"), TOMB[0], 5.8, -1, 4.4 * pop(t - T.T_ZERO, 0.35), 1.76 * pop(t - T.T_ZERO, 0.35), { rot: -0.03 });
    if (t >= T.T_CASUALTY) s.fx("z1", 600, 240, plate("CASUALTIES: 1", "", "#c92a2e", "#ffffff"), TOMB[0], 5.8, -1, 5.6 * pop(t - T.T_CASUALTY, 0.35), 2.24 * pop(t - T.T_CASUALTY, 0.35), { rot: 0.03 });
    const pg = pigAt(t);
    if (pg.vis && t >= T.T_CASUALTY - 0.2) { s.fx(`pig${pg.st}${q(pg.ph, 6)}`, 300, 220, pigC(0, "ghost", 1, 0), pg.x, pg.y + pg.bn.dy, pg.z, 3.0 * pg.sc * pg.bn.sx, 2.2 * pg.sc * pg.bn.sy, { rot: pg.bn.lean }); s.fx("gh", 200, 200, glowWhite, pg.x, pg.y + 0.9, pg.z - 0.1, 3.4, 3.4, { soft: true }); }
    if (cta) { confetti(22, TOMB[0], 2, 12); for (let k = 0; k < 5; k++) { const u = (t * 0.7 + k / 5) % 1; s.fx("hrt", 100, 100, heart, TOMB[0] - 2 + k, 1.5 + 4 * u, TOMB[2] + 0.4, 0.5, 0.5); } }
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW; void smooth; void fxPuff; void smoke; void shotAt; void glowGold; void qmark; void zzz; void coin; void crownC; void bolt; void clockFace; void cobweb; void cloud; void rainDrop; void bookC; void penC; void rays; void swords; void starC; void flameC;
export type { V3, SetName, Expr, FrontOpts };
