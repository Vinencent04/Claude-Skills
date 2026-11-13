// Cast of "Tulip mania": Dutch merchants, a scholar, an Ottoman trader, an auctioneer, a historian, a sailor.
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
const DUTCH = (v: number, o: Partial<Outfit> = {}): Outfit => ({ jacket: ["#2a2a30", "#3a2a3a", "#2a3a3a", "#4a3a2a"][v % 4], pants: "#2a2a30", boots: "#1a1a20", hat: v % 3 === 2 ? "cap" : "tophat", cap: "#2a2a30", belt: "#c8b070", buttons: "#e8c45a", skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult", ...(v % 2 ? { moustache: "#4a3a2a" } : {}), ...o });
const LADY = (v: number): Outfit => ({ jacket: ["#d8b0b0", "#b0c8d8", "#c8d8b0"][v % 3], dress: ["#d8b0b0", "#b0c8d8", "#c8d8b0"][v % 3], pants: "#d8b0b0", boots: "#5a3a2a", hat: "bonnet", skin: SKINS[v % 4], build: "adult" });
const OTT: Outfit = { jacket: "#8a2a4a", pants: "#c8a040", boots: "#5a3a2a", hat: "cap", cap: "#c8352a", belt: "#e8c45a", buttons: "#e8c45a", moustache: "#2a1a10", skin: SKINS[3], build: "stout" };
const SCHOLAR: Outfit = { jacket: "#4a3a2a", pants: "#3a3a30", boots: "#1a1a20", hat: "hair", hair: "#9a9a9a", moustache: "#9a9a9a", skin: SKINS[2], build: "stout" };
const AUCT: Outfit = { jacket: "#6a1a2a", pants: "#2a2a30", boots: "#1a1a20", hat: "tophat", belt: "#e8c45a", buttons: "#e8c45a", skin: SKINS[1], build: "stout", moustache: "#3a2a1a" };
const HIST: Outfit = { jacket: "#3a5a3a", pants: "#2a3a30", boots: "#1a1a20", hat: "hair", hair: "#6a6a6a", skin: SKINS[1], build: "adult" };
const SAILOR: Outfit = { jacket: "#2a4a8a", pants: "#e8e4d8", boots: "#2a1a10", hat: "cap", cap: "#1a2a5a", belt: "#c8b070", buttons: "#e8c45a", moustache: "#5a3a22", skin: SKINS[2], build: "stout" };
const JUDGE: Outfit = { jacket: "#2a2a2a", pants: "#2a2a2a", boots: "#1a1a1a", hat: "wig", hair: "#eee8f0", sash: "#c8352a", skin: SKINS[0], build: "stout" };

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
const tulipC = (c1: string, c2: string, striped: boolean) => (p: Pen) => { const g = p.g; p.stroke([[60, 230], [60, 120]], 9, "#3a8a3a"); p.poly([[60, 190], [20, 150], [30, 120], [60, 170]], "#4aa84a", 5); p.poly([[60, 200], [104, 160], [94, 130], [60, 180]], "#4aa84a", 5); p.poly([[24, 40], [60, 14], [96, 40], [90, 100], [60, 124], [30, 100]], c1, 8); if (striped) { p.poly([[60, 14], [74, 50], [60, 118], [46, 50]], c2, 0); p.poly([[40, 44], [50, 82], [38, 98]], c2, 0); p.poly([[80, 44], [70, 82], [82, 98]], c2, 0); } void g; };
const bulbC = (p: Pen) => { p.poly([[60, 14], [80, 40], [100, 80], [92, 124], [60, 140], [28, 124], [20, 80], [40, 40]], "#e8d8a8", 8); p.stroke([[60, 14], [60, 2]], 6, "#8a6a3a"); p.stroke([[30, 130], [20, 150]], 3, "#8a6a3a"); p.stroke([[60, 140], [60, 160]], 3, "#8a6a3a"); p.stroke([[90, 130], [100, 150]], 3, "#8a6a3a"); };
const houseC = (p: Pen) => { p.poly([[20, 220], [20, 90], [100, 20], [180, 90], [180, 220]], "#c8643a", 9); p.poly(rr(70, 130, 130, 220, 4), "#3a6aa8", 6); p.poly(rr(34, 100, 66, 140, 3), "#8ac0e8", 5); p.poly(rr(134, 100, 166, 140, 3), "#8ac0e8", 5); };
const scaleC = (tilt: number) => (p: Pen) => { p.stroke([[150, 250], [150, 60]], 10, "#6a4a2a"); p.poly(rr(100, 244, 200, 262, 6), "#6a4a2a", 7); const dy = 40 * tilt; p.stroke([[40, 60 - dy], [260, 60 + dy]], 9, "#6a4a2a"); p.stroke([[40, 60 - dy], [40, 120 - dy]], 4, "#3a2a1a"); p.stroke([[260, 60 + dy], [260, 120 + dy]], 4, "#3a2a1a"); p.poly([[10, 120 - dy], [70, 120 - dy], [60, 134 - dy], [20, 134 - dy]], "#c8a040", 6); p.poly([[230, 120 + dy], [290, 120 + dy], [280, 134 + dy], [240, 134 + dy]], "#c8a040", 6); };
const virusC = (p: Pen) => { p.ell(60, 60, 28, 28, "#5ac84a", 6); for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28; p.stroke([[60 + 28 * Math.cos(a), 60 + 28 * Math.sin(a)], [60 + 42 * Math.cos(a), 60 + 42 * Math.sin(a)]], 4, "#3a8a3a"); p.dot(60 + 44 * Math.cos(a), 60 + 44 * Math.sin(a), 5, "#8ae870"); } p.dot(52, 54, 3.5, "#1a1a24"); p.dot(68, 54, 3.5, "#1a1a24"); };
const coinStack = (n: number) => (p: Pen) => { for (let i = 0; i < n; i++) p.ell(60, 140 - i * 16, 40, 12, "#f1c232", 5); };
const sackC = (p: Pen) => { p.poly([[30, 70], [90, 70], [110, 120], [100, 170], [20, 170], [10, 120]], "#c8a870", 7); p.stroke([[34, 70], [86, 70]], 6, "#6a4a2a"); const g = p.g; font(g, 36); g.fillStyle = "#6a3a1a"; g.fillText("fl.", 60, 126); };
const contractC = (p: Pen) => { p.poly(rr(10, 10, 140, 170, 6), "#f6efd8", 7); for (let i = 0; i < 5; i++) p.stroke([[24, 36 + i * 18], [126, 36 + i * 18]], 3, "#8a7a5a"); p.stroke([[24, 150], [70, 144], [100, 154]], 3, "#2a2a6a"); p.ell(116, 148, 10, 10, "#c92a2e", 3); };
const upC = (p: Pen) => { p.poly([[50, 130], [50, 60], [20, 60], [80, 8], [140, 60], [110, 60], [110, 130]], "#3ac84a", 8); };
const downC = (p: Pen) => { p.poly([[50, 10], [50, 80], [20, 80], [80, 132], [140, 80], [110, 80], [110, 10]], "#c92a2e", 8); };
const gavelC = (p: Pen) => { p.stroke([[30, 120], [100, 50]], 10, "#6a4a2a"); p.poly([[70, 28], [118, 18], [128, 50], [80, 60]], "#8a5a2a", 7); };
const magnifier = (p: Pen) => { p.stroke([[80, 120], [130, 170]], 12, "#6a4a2a"); p.ell(60, 60, 44, 44, "rgba(200,230,255,.45)", 8); };
const onionC = (p: Pen) => { p.poly([[50, 10], [70, 40], [90, 80], [80, 120], [50, 134], [20, 120], [10, 80], [30, 40]], "#d8c050", 7); p.stroke([[50, 10], [50, 134]], 3, "#a89030"); };
const pieSmall = (p: Pen) => { const g = p.g; p.ell(150, 150, 120, 120, "#f6efd8", 10); g.fillStyle = "#c92a2e"; g.beginPath(); g.moveTo(150, 150); g.arc(150, 150, 114, -Math.PI / 2, -Math.PI / 2 + 0.22 * 2); g.closePath(); g.fill(); g.strokeStyle = "#1a1a24"; g.lineWidth = 8; g.beginPath(); g.arc(150, 150, 118, 0, 7); g.stroke(); };
const bookBig = (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 190, 230, 8), "#7a2a2a", 9); p.poly(rr(26, 26, 174, 214, 4), "#f0dca8", 5); font(g, 40); g.fillStyle = "#5a2a1a"; g.fillText("1841", 100, 110); font(g, 20); g.fillText("A BOOK", 100, 160); };
const windmillC = (p: Pen) => { p.poly([[60, 240], [70, 100], [130, 100], [140, 240]], "#e8dcc0", 8); p.poly([[50, 100], [100, 40], [150, 100]], "#8a5a3a", 7); for (const [dx, dy] of [[-70, -70], [70, -70], [-70, 70], [70, 70]]) p.stroke([[100, 90], [100 + dx, 90 + dy]], 7, "#6a4a2a"); p.dot(100, 90, 8, "#4a3a2a"); };
const virusLabel = virusC;
// ---------------- helpers ----------------
const ar = (v: number) => Math.round(v * 16) / 16;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const glide = T.glide;
const bob = (t: number, i: number, a = 1) => Math.sin(t * 1.6 + i * 1.7) * a;

const stoneC2 = (mode: number) => (p: Pen) => { const g = p.g; p.poly([[20, 280], [20, 110], [40, 60], [90, 30], [140, 30], [190, 60], [210, 110], [210, 280]], "#d8d8de", 9); p.stroke([[50, 110], [180, 110]], 4, "#8a8a98"); g.fillStyle = "#4a4a58"; if (mode === 0) { font(g, 24); g.fillText("MAJOR", 115, 150); g.fillText("WILLIAM", 115, 182); g.fillText("MARTIN", 115, 214); } else { font(g, 22); g.fillText("GLYNDWR", 115, 140); g.fillText("MICHAEL", 115, 168); font(g, 15); g.fillText("SERVED AS", 115, 202); g.fillText("MAJOR WILLIAM", 115, 222); g.fillText("MARTIN, R.M.", 115, 242); } };
export const stage = (f: number, cam: CamInfo): Stage => {
  const t = f / FPS, s = new S(cam, "w", t);
  const pop = (age: number, k = 0.5) => 1 + k * (1 - Math.min(1, Math.max(0, age) / 0.16)) + (age > 0 ? 0.08 * Math.exp(-5 * age) * Math.sin(age * 18) : 0);
  const puffAt = (t0: number, x: number, y: number, z: number, w = 1.6, dur = 0.9) => { if (t >= t0 && t < t0 + dur) { const u = (t - t0) / dur; s.fx("dust", 120, 120, dustC, x, y + 0.4 * u, z, w * (0.5 + u), w * (0.5 + u) * 0.8, { soft: true }); } };
  const burstAt = (t0: number, x: number, y: number, z: number, w: number, dur = 0.4, col = "#fff3b0") => s.burst(t0, x, y, z, w, dur, col);
  const who = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, fo: Partial<FrontOpts> = {}, sc = 1, bn: Bn = NB, y = 0, shadow = true) => s.who(i, o, ok, x, y, z, { mode: "stand", expr, ...fo }, sc, shadow, bn);
  const stride = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, dirx: number, speed = 1.5, arms: FrontOpts["arms"] = { l: [-0.45, 0.2], r: [0.45, 0.2] }, sc = 1, y = 0) => s.who(i, o, ok, x, y, z, { mode: "stroll", phase: q(((t * speed * 0.7 + hh(i, 4)) % 1 + 1) % 1, 32), expr, arms }, sc, true, walk(t, i, speed, dirx));
  const shout = (i: number, o: Outfit, ok: string, x: number, z: number, amt = 1, sc = 1, y = 0, held: FrontOpts["held"] = null) => { const w = Math.sin(t * 6.5 + i * 1.7), w2 = Math.sin(t * 6.5 + i * 1.7 - 0.9); who(i, o, ok, x, z, "stern", { arms: { l: [-0.55, ar(-0.95 + 0.2 * w * amt)], r: [0.55, ar(-0.95 + 0.2 * w2 * amt)] }, headTilt: ar(0.07 * w * amt), ...(held ? { held } : {}) }, sc, { dy: 0.03 * amt * Math.abs(w), sx: 1, sy: 1 + 0.015 * amt * w, lean: 0.025 * w * amt }, y); };
  const cheer = (i: number, o: Outfit, ok: string, x: number, z: number, rate = 1.3, h = 0.12, sc = 1, y = 0) => { const w = Math.sin(t * 6 + i); who(i, o, ok, x, z, i % 2 ? "laugh" : "grin", { arms: { l: [-0.55, ar(-0.9 + 0.15 * w)], r: [0.55, ar(-0.9 - 0.15 * w)] } }, sc, hop(t, i, rate, h), y); };
  const idleW = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, sc = 1, y = 0, arms: FrontOpts["arms"] = { l: [-0.4, 0.3], r: [0.4, 0.3] }) => who(i, o, ok, x, z, expr, { arms }, sc, idle(t, i, 1.5), y);
  const flame = (x: number, y: number, z: number, w: number, k = 0) => { const sc = 1 + 0.12 * Math.sin(t * 9 + k * 2.1); s.fx("fl", 200, 220, flameC, x, y + 0.4 * w, z, w * sc, w * 1.1 * sc, { rot: 0.06 * Math.sin(t * 6 + k) }); };
  const confetti = (n: number, x0: number, z0: number, w: number, ymax = 7) => { const cols = ["#ff5a7a", "#ffd84a", "#6ab4ff", "#7be07b"]; for (let k = 0; k < n; k++) { const u = (t * 0.4 + hh(k, 2)) % 1; s.fx(`cf${k % 4}`, 40, 40, confettiC(cols[k % 4]), x0 + w * (hh(k, 3) - 0.5) + 0.4 * Math.sin(t * 2 + k), ymax * (1 - u), z0 + 3 * (hh(k, 4) - 0.5), 0.22, 0.22, { rot: t * 3 + k }); } };
  const plateAt = (key: string, l1: string, l2: string, bg: string, fg: string, t0: number, t1: number, x: number, y: number, z: number, w: number, rot = 0) => { if (t >= t0 && t < t1) { const e = pop(t - t0, 0.4), h = w * 0.4; s.fx(key, 600, 240, plate(l1, l2, bg, fg), x, y + 0.06 * Math.sin(t * 2.4), z, w * e, h * e, { rot }); } };
  const qm = (x: number, y: number, z: number, t0: number, k = 0, w = 0.9) => { if (t >= t0) s.fx("qm", 120, 120, qmark, x, y + 0.12 * Math.sin(t * 4 + k), z, w * pop(t - t0 - 0.1 * k), w * pop(t - t0 - 0.1 * k), { rot: 0.1 * Math.sin(t * 3 + k) }); };

  const AXc = T.AX, BXc = T.BX, DXc = T.DX, EXc = T.EX, FXc = T.FX, GXc = T.GX;
  const sm = (u: number) => glide(clamp01(u));
  /** smooth walk from x0 to x1 (t0 -> t1) at depth z; stands (idle) before and after */
  const walker = (i: number, o: Outfit, ok: string, x0: number, x1: number, t0: number, t1: number, z: number, exStand: Expr, exWalk: Expr = exStand, sc = 1.2, y = 0, arms: FrontOpts["arms"] = { l: [-0.4, 0.3], r: [0.4, 0.3] }) => {
    const u = clamp01((t - t0) / (t1 - t0)), x = lerp(x0, x1, glide(u));
    if (u > 0 && u < 1) stride(i, o, ok + "w", x, z, exWalk, Math.sign(x1 - x0), 1.5, arms, sc, y); else idleW(i, o, ok, x, z, exStand, sc, y, arms);
  };
  const nodTalk = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, amt = 1, sc = 1.2, y = 0) => { const w = Math.sin(t * 2.2 + i * 1.9); who(i, o, ok, x, z, expr, { arms: { l: [-0.45, ar(0.3 - 0.04 * w * amt)], r: [0.45, ar(0.05 + 0.3 * w * amt)] }, headTilt: ar(0.04 * w * amt) }, sc, add(idle(t, i, 1.5), { dy: 0, sx: 1, sy: 1, lean: 0.012 * w * amt }), y); };
  const laugh = (i: number, o: Outfit, ok: string, x: number, z: number, sc = 1.2, y = 0) => { const w = Math.sin(t * 4 + i); who(i, o, ok, x, z, "laugh", { arms: { l: [-0.5, ar(-0.55 + 0.1 * w)], r: [0.5, ar(-0.55 - 0.1 * w)] } }, sc, hop(t, i, 1.1, 0.07), y); };
  const pose = (from: [number, number], to: [number, number], u: number): [number, number] => [lerp(from[0], to[0], sm(u)), lerp(from[1], to[1], sm(u))];

  const tul = (i: number) => tulipC(["#d8344a", "#f0c030", "#f08ab8", "#e86a20", "#8a4ac8"][i % 5], ["#ffffff", "#ffffff", "#fff0a0", "#ffe0a0", "#ffffff"][i % 5], i % 2 === 0);
  const sad = (i: number, o: Outfit, ok: string, x: number, z: number, sc = 1.2) => { const w = Math.sin(t * 2.4 + i); who(i, o, ok, x, z, "pained", { arms: { l: [-0.3, 0.45], r: [0.3, 0.45] }, headTilt: ar(0.12 + 0.03 * w) }, sc, { dy: 0, sx: 1 + 0.01 * w, sy: 1 - 0.01 * w, lean: 0.02 * w }, 0); };
  const PY = 5.6;

  // ====================================================== A: THE DUTCH STREET (x = 0) ======================================================
  const inA = t < 8.4 || (t >= 45.7 && t < 51.2) || t >= 67.2 && t < 71.4 || t >= 75.7;
  if (inA) {
    const ax = AXc, fin = t >= T.T_CTA - 0.3, fol = t >= T.T_FOLLOW;
    if (t < 8.4) {
      // the hook: a bulb that costs more than a house
      nodTalk(10, DUTCH(0), "d0", ax - 2.3, 0.8, t >= T.T_HOUSE ? "shock" : "smile", 0.8, 1.25, 0);
      nodTalk(11, LADY(0), "l0", ax + 2.3, 0.8, t >= T.T_HOUSE ? "shock" : "smile", 0.8, 1.25, 0);
      const be = pop(t - T.T_BULB, 0.4);
      if (t >= T.T_BULB - 0.1) { s.fx("hb", 130, 170, bulbC, ax - 1.1, 2.6 + 0.1 * Math.sin(t * 2), 1.0, 0.9 * be, 1.15 * be, { rot: 0.05 * Math.sin(t * 2) }); s.fx("ht", 130, 240, tul(0), ax - 1.1, 4.1 + 0.1 * Math.sin(t * 2 + 1), 0.9, 1.1 * be, 1.9 * be, {}); }
      if (t >= T.T_HOUSE - 0.1) { const he = pop(t - T.T_HOUSE, 0.4); s.fx("hh", 200, 230, houseC, ax + 1.3, 2.5, 0.8, 1.8 * he, 2.0 * he, { rot: 0.02 * Math.sin(t * 2) }); }
      plateAt("y37", "1637", "", "#2a1a10", "#ffd84a", T.T_Y, 1.9, ax, PY, 1.2, 2.4, -0.03);
      plateAt("obu", "ONE TULIP BULB", "", "#c92a2e", "#ffffff", T.T_BULB, T.T_HOUSE, ax, PY, 1.2, 3.4, 0.03);
      plateAt("mth", "COSTS MORE THAN", "A HOUSE!", "#2a3f8a", "#ffffff", T.T_HOUSE, T.T_MYTH, ax, PY, 1.2, 3.4, -0.03);
      plateAt("sty", "BUT THE STORY", "YOU HEARD?", "#6a3a8a", "#ffffff", T.T_MYTH, T.T_WRONG, ax, PY, 1.2, 3.2, 0.03);
      if (t >= T.T_WRONG) { const e = pop(t - T.T_WRONG, 0.5); s.fx("wr", 600, 240, plate("MOSTLY WRONG!", "", "#c92a2e", "#ffffff"), ax, PY, 1.2, 3.6 * e, 1.44 * e, { rot: -0.04 }); }
    } else if (t < 51.2) {
      // "legend says the whole country was ruined"
      sad(20, DUTCH(1), "d1", ax - 2.6, 0.8); sad(21, LADY(1), "l1", ax - 0.9, 1.0); sad(22, DUTCH(2), "d2", ax + 0.9, 0.8, 1.2); sad(23, LADY(2), "l2", ax + 2.6, 1.0);
      for (let k = 0; k < 4; k++) { const u = (t * 0.5 + k / 4) % 1; s.fx("tr", 60, 80, tear, ax - 2.6 + 1.75 * k, 3.4 - 1.3 * u, 1.6, 0.4, 0.55, {}); }
      plateAt("lg", "LEGEND:", "THE COUNTRY WAS RUINED", "#3a2a6a", "#ffffff", T.T_LEG, T.T_RUINED, ax, PY, 1.2, 3.6, -0.03);
      plateAt("fam", "BANKRUPT", "FAMILIES?", "#6a1a1a", "#ffffff", T.T_RUINED, 51.2, ax, PY, 1.2, 3.0, 0.03);
      if (t >= T.T_RUINED) for (let k = 0; k < 2; k++) qm(ax - 2.4 + 4.8 * k, 4.6, 1.2, T.T_RUINED + 0.2, k, 0.9);
    } else if (t < 71.4) {
      // the myth was probably much smaller
      nodTalk(30, DUTCH(3), "d3", ax - 2.2, 0.8, "smile", 1, 1.25, 0); laugh(31, LADY(0), "l0", ax + 2.2, 0.8, 1.25, 0);
      const sh = clamp01((t - T.T_SMALL) / 1.6), sc = lerp(1.0, 0.45, glide(sh));
      s.fx("mythp", 600, 240, plate("TULIP MANIA", "", "#c92a2e", "#ffffff"), ax, 4.6 - 0.8 * glide(sh), 1.2, 3.6 * sc, 1.44 * sc, { rot: -0.03 });
      plateAt("pms", "PROBABLY MUCH", "SMALLER THAN THE MYTH!", "#2a3f8a", "#ffffff", T.T_SMALL, 71.4, ax, PY + 0.4, 1.2, 3.8, 0.03);
    } else if (!fin) {
      // the Netherlands is still famous for tulips
      s.fx("wm", 200, 260, windmillC, ax + 3.0, 3.4, -3.0, 2.4, 3.1, { rot: 0 });
      for (let k = 0; k < 9; k++) s.fx("tf" + k, 130, 240, tul(k), ax - 3.2 + 0.8 * k, 1.0, 1.4 - 0.5 * (k % 2), 0.8, 1.4, { rot: 0.05 * Math.sin(t * 1.5 + k) });
      nodTalk(40, DUTCH(0), "d0", ax - 1.4, 0.4, "grin", 0.8, 1.2, 0); nodTalk(41, LADY(1), "l1", ax + 1.4, 0.4, "grin", 0.8, 1.2, 0);
      plateAt("tdy", "STILL FAMOUS", "FOR TULIPS!", "#d8344a", "#ffffff", T.T_TODAY, 78.9, ax, PY, 1.2, 3.4, -0.03);
    } else {
      const g = 1 + 0.08 * Math.sin(t * 3);
      s.fx("pg", 200, 200, glowC("255,214,120"), ax, 5.0, -1.0, 7.0 * g, 7.0 * g, { soft: true });
      plateAt("fnl", "BIGGER STORY,", "SMALLER TRUTH", "#d8344a", "#ffffff", T.T_CTA - 0.2, T.T_CTA + 3.0, ax, 6.6, 1.0, 3.4, -0.03);
      for (let k = 0; k < 7; k++) s.fx("tf" + k, 130, 240, tul(k), ax - 3.3 + 1.1 * k, 0.9, -0.8, 0.8, 1.4, { rot: 0.05 * Math.sin(t * 1.5 + k) });
      const crew: [Outfit, string][] = [[DUTCH(0), "d0"], [LADY(0), "l0"], [DUTCH(1), "d1"], [LADY(1), "l1"], [DUTCH(2), "d2"], [LADY(2), "l2"]];
      for (let k = 0; k < 6; k++) { const x = (k < 3 ? -1 : 1) * (0.9 + 0.8 * (k % 3)), z = 0.0 + 0.8 * (k % 2); if (fol) cheer(50 + k, crew[k][0], crew[k][1] + "c", x, z, 1.2, 0.12, 1.15, 0); else nodTalk(50 + k, crew[k][0], crew[k][1] + "c", x, z, "smile", 0.8, 1.15, 0); }
      confetti(fol ? 24 : 10, ax, 0, 12, 9); if (fol) for (let k = 0; k < 5; k++) { const u = (t * 0.6 + k / 5) % 1; s.fx("hrt", 100, 100, heart, ax - 2 + k, 2 + 4 * u, 1.6, 0.5, 0.5); }
    }
  }

  // ====================================================== B: THE OTTOMAN GARDEN (x = -40) ======================================================
  if (t >= 7.8 && t < 28.8) {
    const bx0 = BXc;
    for (let k = 0; k < 4; k++) s.fx("bt" + k, 130, 240, tul(k + 1), bx0 - 3.4 + 2.3 * k, 0.9, -2.2, 0.8, 1.4, { rot: 0.04 * Math.sin(t * 1.4 + k) });
    if (t < 15.4) {
      nodTalk(60, OTT, "ott", bx0 - 2.2, 0.8, "smile", 1, 1.3, 0);
      nodTalk(61, SCHOLAR, "sch", bx0 + 1.4, 0.8, t >= T.T_NETH ? "grin" : "neutral", 1, 1.3, 0);
      const fu = clamp01((t - 10.0) / 1.4); if (t >= 9.8 && fu < 1) s.fx("flyt", 130, 240, tul(0), lerp(bx0 - 2.2, bx0 + 1.4, glide(fu)), 2.8 + 1.6 * Math.sin(Math.PI * fu), 1.2, 0.8, 1.4, { rot: 0.6 * (1 - fu) });
      plateAt("ott", "THE OTTOMAN", "EMPIRE", "#8a2a4a", "#ffffff", T.T_OTT, T.T_NETH, bx0 - 1.0, PY, 1.2, 3.2, -0.03);
      plateAt("nl", "THE NETHERLANDS", "", "#d8641c", "#ffffff", T.T_NETH, T.T_1590, bx0, PY, 1.2, 3.4, 0.03);
      plateAt("y59", "1590s", "", "#2a1a10", "#ffd84a", T.T_1590, T.T_CRAZY, bx0, PY, 1.2, 2.6, -0.03);
      if (t >= T.T_CRAZY) { for (let k = 0; k < 4; k++) cheer(62 + k, [DUTCH(k), LADY(k), DUTCH(k + 1), LADY(k + 1)][k], `cz${k}`, bx0 - 3.0 + 2.0 * k, 2.0 + 0.3 * (k % 2), 1.4, 0.14, 1.2, 0); plateAt("crz", "TULIP", "CRAZE!", "#d8344a", "#ffffff", T.T_CRAZY, 15.4, bx0, PY, 1.2, 2.8, 0.03); }
    } else if (t < 22.3) {
      const e = pop(t - 15.5, 0.3);
      s.fx("big", 130, 240, tulipC("#d8344a", "#ffffff", true), bx0, 3.4 + 0.1 * Math.sin(t * 1.7), 0.8, 1.9 * e, 3.4 * e, { rot: 0.03 * Math.sin(t * 1.3) });
      nodTalk(64, DUTCH(0), "d0", bx0 - 2.4, 0.8, t >= T.T_WHY ? "nervous" : "smile", 1, 1.25, 0); nodTalk(65, LADY(1), "l1", bx0 + 2.4, 0.8, t >= T.T_WHY ? "nervous" : "smile", 1, 1.25, 0);
      plateAt("fl", "FLAME-LIKE", "STRIPES", "#d8344a", "#ffffff", T.T_FLAME, T.T_WHY, bx0, 6.4, 1.2, 3.2, -0.03);
      plateAt("wy", "NOBODY KNEW WHY...", "", "#3a2a6a", "#ffffff", T.T_WHY, T.T_VIRUS, bx0, 6.4, 1.2, 3.6, 0.03);
      if (t >= T.T_WHY && t < T.T_VIRUS) for (let k = 0; k < 3; k++) qm(bx0 - 2.4 + 2.4 * k, 4.8, 1.4, T.T_WHY + 0.1 * k, k, 1.0);
      if (t >= T.T_VIRUS) { const ve = pop(t - T.T_VIRUS, 0.5); s.fx("vir", 120, 120, virusC, bx0 - 2.4, 4.6 + 0.2 * Math.sin(t * 3), 1.6, 1.7 * ve, 1.7 * ve, { rot: 0.2 * Math.sin(t * 2) }); plateAt("vr", "A VIRUS!", "", "#3a8a3a", "#ffffff", T.T_VIRUS, 22.3, bx0, 6.4, 1.2, 3.0, -0.03); }
    } else {
      const e = pop(t - 22.3, 0.3);
      s.fx("sem", 130, 240, tulipC("#d8344a", "#ffffff", true), bx0 - 1.5, 3.0, 0.8, 1.4 * e, 2.5 * e, { rot: 0.03 * Math.sin(t * 1.3) });
      if (t >= T.T_SAID) { const n = t < 26.4 ? 2 : t < 27.2 ? 4 : 6; for (let k = 0; k < 3; k++) s.fx("cs" + k, 130, 170, coinStack(Math.min(6, n - k)), bx0 + 0.4 + 0.9 * k, 1.1, 1.0 - 0.2 * k, 0.9, 1.3, {}); s.fx("sack", 120, 180, sackC, bx0 + 2.9, 1.2, 1.2, 1.0, 1.3, {}); }
      if (t >= T.T_BULB2) { const be = pop(t - T.T_BULB2, 0.4); s.fx("bl2", 130, 170, bulbC, bx0 - 2.7, 2.0, 1.2, 0.9 * be, 1.15 * be, {}); }
      nodTalk(66, DUTCH(2), "d2", bx0 + 1.8, 2.4, "shock", 0.8, 1.2, 0);
      plateAt("sa", "SEMPER AUGUSTUS", "", "#d8344a", "#ffffff", T.T_SEMPER, T.T_SAID, bx0, 6.4, 1.2, 3.6, -0.03);
      plateAt("sd", "SAID TO COST", "", "#3a2a6a", "#ffffff", T.T_SAID, 26.4, bx0, 6.4, 1.2, 3.2, 0.03);
      plateAt("th", "THOUSANDS OF", "GUILDERS!", "#c8a040", "#ffffff", 26.4, T.T_BULB2, bx0, 6.4, 1.2, 3.2, -0.03);
      plateAt("fo", "FOR ONE BULB!", "", "#c92a2e", "#ffffff", T.T_BULB2, 28.8, bx0, 6.4, 1.2, 3.4, 0.03);
    }
  }

  // ====================================================== D: THE TAVERN (x = -120): contracts, price rise, and the onion sailor ======================================================
  const inD = (t >= 28.0 && t < 40.4) || (t >= 53.5 && t < 61.5);
  if (inD) {
    const dx = DXc;
    const trad: [Outfit, string, number][] = [[DUTCH(0), "d0", -2.7], [DUTCH(1), "d1", -0.9], [DUTCH(2), "d2", 0.9], [LADY(0), "l0", 2.7]];
    if (t < 40.4) {
      for (let k = 0; k < 4; k++) { const w = Math.sin(t * 2.4 + k * 1.3); const up = t >= T.T_UP ? 0.3 : 0; who(70 + k, trad[k][0], "tv" + trad[k][1], dx + trad[k][2], 1.0, t >= T.T_UP ? "grin" : "smile", { arms: { l: [-0.45, ar(0.2 + 0.1 * w)], r: [0.45, ar(-0.1 + 0.3 * w + (t >= T.T_UP ? -0.5 : 0))] } }, 1.25, add(idle(t, 70 + k, 1.5), { dy: 0, sx: 1, sy: 1, lean: 0.012 * w }), 0); void up; }
      for (let k = 0; k < 4; k++) s.fx("mug" + k, 100, 110, mug, dx - 2.7 + 1.8 * k, 1.55, -0.8, 0.5, 0.55, {});
      if (t < T.T_EARLY) {
        if (t >= T.T_UNDER) for (let k = 0; k < 4; k++) { const e = pop(t - T.T_UNDER - 0.1 * k, 0.4); s.fx("ub" + k, 130, 170, bulbC, dx - 2.7 + 1.8 * k, 0.5, 2.2, 0.7 * e, 0.9 * e, { rot: 0.1 }); }
        if (t >= T.T_UNDER) s.fx("soil", 300, 60, (p) => { p.poly(rr(2, 10, 298, 50, 8), "#6a4a2a", 6); }, dx, 0.15, 2.4, 9.0, 0.7, {});
        if (t >= T.T_PAPER) for (let k = 0; k < 3; k++) { const u = (t * 0.7 + k / 3) % 1; s.fx("ct" + k, 160, 180, contractC, lerp(dx - 2.4, dx + 2.4, u), 3.0 + 0.8 * Math.sin(Math.PI * u), 0.4, 0.9, 1.0, { rot: 0.4 * Math.sin(u * 6) }); }
        plateAt("ugr", "BULBS STILL", "UNDERGROUND!", "#6a4a2a", "#ffffff", T.T_UNDER, T.T_PAPER, dx, PY, 1.2, 3.4, -0.03);
        plateAt("pap", "PAPER CONTRACTS", "", "#2a3f8a", "#ffffff", T.T_PAPER, T.T_TAV, dx, PY, 1.2, 3.6, 0.03);
        plateAt("tav", "SIGNED IN TAVERNS", "", "#8a5a2a", "#ffffff", T.T_TAV, T.T_EARLY, dx, PY, 1.2, 3.8, -0.03);
      } else {
        plateAt("ear", "EARLY 1637", "", "#2a1a10", "#ffd84a", T.T_EARLY, T.T_UP, dx, PY, 1.2, 3.0, -0.03);
        if (t >= T.T_UP) { const e = pop(t - T.T_UP, 0.4); s.fx("up", 160, 140, upC, dx - 3.0, 4.0, 0.8, 1.3 * e, 1.5 * e, {}); s.fx("up2", 160, 140, upC, dx + 3.0, 4.0, 0.8, 1.3 * e, 1.5 * e, {}); plateAt("pup", "PRICES SHOOT UP!", "", "#3a8a3a", "#ffffff", T.T_UP, T.T_HANDS, dx, PY, 1.2, 3.6, 0.03); }
        if (t >= T.T_HANDS) { const per = 0.55, ph = ((t - T.T_HANDS) / per), k0 = Math.floor(ph) % 4, k1 = (k0 + 1) % 4, u = ph - Math.floor(ph); const x0 = dx + trad[k0][2], x1 = dx + trad[k1][2]; s.fx("hb", 130, 170, bulbC, lerp(x0, x1, glide(u)), 3.2 + 1.2 * Math.sin(Math.PI * u), 0.6, 0.8, 1.0, { rot: 0.3 * Math.sin(t * 8) }); plateAt("mny", "MANY TIMES", "IN A FEW DAYS!", "#c8a040", "#ffffff", T.T_HANDS, 40.4, dx, PY, 1.2, 3.4, -0.03); }
      }
    } else {
      // the onion sailor (legend)
      const ch = Math.sin(t * 7);
      who(80, SAILOR, "sail", dx - 1.0, 1.0, t >= T.T_ANEC ? "neutral" : "grin", { arms: { l: [-0.45, 0.3], r: [0.45, ar(-0.9 + 0.1 * Math.max(0, ch))] } }, 1.35, add(idle(t, 80, 1.5), { dy: 0, sx: 1, sy: 1 + 0.015 * ch, lean: 0 }), 0);
      nodTalk(81, DUTCH(1), "d1", dx + 2.1, 1.0, "shock", 1, 1.25, 0);
      if (t >= T.T_SAILOR) s.fx("bite", 100, 140, onionC, dx - 0.2, 3.1 + 0.1 * Math.max(0, ch), 1.6, 0.8, 1.1, {});
      plateAt("lg2", "LEGEND:", "THE ONION SAILOR", "#3a2a6a", "#ffffff", T.T_LEG2, T.T_SAILOR + 1.0, dx, PY, 1.2, 3.4, -0.03);
      plateAt("on", "HE ATE A BULB,", "THINKING IT'S AN ONION!", "#d8b020", "#2a1a10", T.T_SAILOR + 1.0, T.T_ANEC, dx, PY, 1.2, 3.8, 0.03);
      plateAt("an", "ONLY ONE", "ANECDOTE...", "#6a1a1a", "#ffffff", T.T_ANEC, T.T_TRUE, dx, PY, 1.2, 3.2, -0.03);
      plateAt("mb", "MAYBE NOT TRUE?", "", "#4a4a58", "#ffffff", T.T_TRUE, 61.5, dx, PY, 1.2, 3.4, 0.03);
      if (t >= T.T_TRUE - 0.5) for (let k = 0; k < 2; k++) qm(dx - 2.4 + 4.8 * k, 4.8, 1.4, T.T_TRUE, k, 1.0);
    }
  }

  // ====================================================== E: THE HAARLEM AUCTION (x = -160) ======================================================
  if (t >= 39.7 && t < 46.4) {
    const ex = EXc, bang0 = Math.max(0, Math.sin(t * 5));
    who(90, AUCT, "auc", ex, -3.6, t >= T.T_NOBODY ? "nervous" : "grin", { arms: { l: [-0.5, 0.3], r: [0.5, ar(-0.9 + 0.8 * (t >= T.T_AUC && t < T.T_NOBODY ? bang0 : 0))] } }, 1.35, idle(t, 90, 1.5), 1.2, false);
    if (t >= T.T_AUC) s.fx("gav", 130, 140, gavelC, ex + 1.1, 3.8, -3.2, 0.9, 0.9, { rot: -0.6 * bang0 });
    for (let k = 0; k < 5; k++) { const x = ex - 3.2 + 1.6 * k, shrug = t >= T.T_NOBODY; who(91 + k, k % 2 ? LADY(k) : DUTCH(k), `ac${k}`, x, 1.0 + 0.3 * (k % 2), shrug ? "neutral" : "grin", { arms: shrug ? { l: [-0.5, ar(-0.2)], r: [0.5, ar(-0.2)] } : { l: [-0.45, 0.3], r: [0.5, ar(-0.8 + 0.2 * Math.sin(t * 3 + k))] } }, 1.2, idle(t, 91 + k, 1.5), 0); }
    if (t >= T.T_NOBODY) for (let k = 0; k < 3; k++) qm(ex - 3.2 + 3.2 * k, 4.2, 1.2, T.T_NOBODY + 0.1 * k, k, 0.9);
    if (t >= T.T_CRASH) { const e = pop(t - T.T_CRASH, 0.4); s.fx("dn", 160, 140, downC, ex - 3.0, 4.6, 0.8, 1.4 * e, 1.6 * e, {}); s.fx("dn2", 160, 140, downC, ex + 3.0, 4.6, 0.8, 1.4 * e, 1.6 * e, {}); }
    plateAt("feb", "FEBRUARY", "", "#2a3f8a", "#ffffff", T.T_FEB, T.T_AUC, ex, PY, 1.2, 3.0, -0.03);
    plateAt("auc", "AN AUCTION", "IN HAARLEM", "#e8721c", "#ffffff", T.T_AUC, T.T_NOBODY, ex, PY, 1.2, 3.2, 0.03);
    plateAt("nob", "NOBODY WANTS", "TO BUY!", "#4a4a58", "#ffffff", T.T_NOBODY, T.T_CRASH, ex, PY, 1.2, 3.2, -0.03);
    plateAt("crs", "THE PRICES CRASH!", "", "#c92a2e", "#ffffff", T.T_CRASH, 46.4, ex, PY, 1.2, 3.6, 0.03);
  }

  // ====================================================== F: THE TOWN HALL (x = -200): contracts cancelled for a small fraction ======================================================
  if (t >= 60.8 && t < 68.0) {
    const fx0 = FXc;
    who(100, JUDGE, "jud", fx0, -5.2, "stern", { arms: { l: [-0.5, 0.3], r: [0.5, ar(-0.2 + 0.2 * Math.sin(t * 2))] } }, 1.35, idle(t, 100, 1.5), 0, false);
    nodTalk(101, DUTCH(1), "d1", fx0 - 2.4, 1.0, t >= T.T_CANCEL ? "smile" : "nervous", 1, 1.25, 0); nodTalk(102, LADY(0), "l0", fx0 + 2.4, 1.0, t >= T.T_CANCEL ? "smile" : "nervous", 1, 1.25, 0);
    if (t < T.T_CANCEL) s.fx("ctf", 160, 180, contractC, fx0, 2.6, 0.2, 1.4, 1.6, {});
    else { const sp = clamp01((t - T.T_CANCEL) / 0.6); s.fx("ctl", 160, 180, contractC, fx0 - 0.5 - 1.0 * sp, 2.6 - 0.3 * sp, 0.2, 1.2, 1.5, { rot: -0.3 * sp }); s.fx("ctr", 160, 180, contractC, fx0 + 0.5 + 1.0 * sp, 2.6 - 0.3 * sp, 0.2, 1.2, 1.5, { rot: 0.3 * sp }); }
    if (t >= T.T_FRAC - 0.2) { const pe = pop(t - T.T_FRAC, 0.4); s.fx("pie", 300, 300, pieSmall, fx0 + 0.2, 4.6, -1.0, 2.8 * pe, 2.8 * pe, {}); }
    plateAt("twn", "TOWNS LET BUYERS", "CANCEL CONTRACTS", "#2a3f8a", "#ffffff", T.T_TOWN, T.T_FRAC, fx0, 6.4, 0.5, 3.6, -0.03);
    plateAt("frc", "PAY JUST A", "SMALL FRACTION", "#c8a040", "#ffffff", T.T_FRAC, T.T_35, fx0, 6.4, 0.5, 3.4, 0.03);
    plateAt("p35", "AROUND 3.5%", "", "#c92a2e", "#ffffff", T.T_35, 68.0, fx0, 6.4, 0.5, 3.4, -0.03);
  }

  // ====================================================== G: THE LIBRARY (x = -240): historians and the book of 1841 ======================================================
  if ((t >= 50.5 && t < 54.2) || (t >= 70.6 && t < 76.4)) {
    const gx = GXc;
    nodTalk(110, HIST, "hist", gx - 1.0, 1.2, t < 54.2 && t >= T.T_NOPROOF ? "stern" : "neutral", 1, 1.3, 0);
    if (t < 54.2) {
      s.fx("mag", 140, 180, magnifier, gx + 0.8, 3.0 + 0.1 * Math.sin(t * 3), 1.6, 1.3, 1.7, { rot: 0.2 * Math.sin(t * 2) });
      for (let k = 0; k < 3; k++) s.fx("pp" + k, 160, 180, contractC, gx - 2.8 + 0.8 * k, 2.1 + 0.1 * k, -0.8, 0.8, 0.9, { rot: 0.1 * (k - 1) });
      plateAt("hs", "HISTORIANS", "TODAY", "#3a5a3a", "#ffffff", T.T_HIST, T.T_NOPROOF, gx, 6.0, 0.5, 3.0, -0.03);
      plateAt("np", "ALMOST", "NO PROOF!", "#c92a2e", "#ffffff", T.T_NOPROOF, 54.2, gx, 6.0, 0.5, 3.0, 0.03);
    } else {
      const be = pop(t - T.T_BOOK, 0.4), g = 1 + 0.05 * Math.sin(t * 3);
      s.fx("bkg", 200, 200, glowC("255,230,150"), gx + 1.5, 3.6, 0.4, 5.0 * g, 5.0 * g, { soft: true });
      s.fx("book", 200, 240, bookBig, gx + 1.5, 3.4 + 0.1 * Math.sin(t * 2), 1.0, 1.9 * be, 2.3 * be, { rot: -0.04 });
      plateAt("bk", "A BOOK, 200 YEARS", "LATER...", "#7a2a2a", "#ffffff", T.T_BOOK, T.T_1841, gx, 6.2, 0.5, 3.8, -0.03);
      plateAt("y41", "1841", "", "#2a1a10", "#ffd84a", T.T_1841, 76.4, gx, 6.2, 0.5, 2.6, 0.03);
    }
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW; void smooth; void fxPuff; void shotAt; void hop; void pulse; void rr; void lerp; void bob; void add; void spr; void virusLabel; void bookC;
export type { V3, SetName, Expr, FrontOpts };
