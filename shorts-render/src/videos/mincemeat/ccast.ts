// Cast of "Operation Mincemeat": Montagu, British officers/sailors, "Major Martin", the Spanish fisherman, German officers, Rommel.
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
const OFF = (v: number, o: Partial<Outfit> = {}): Outfit => ({ jacket: ["#1a2a4a", "#3a4a3a", "#2a3a5a"][v % 3], pants: "#1a2236", boots: "#1a1a20", hat: "cap", cap: ["#1a2a4a", "#3a4a3a", "#2a3a5a"][v % 3], belt: "#c8b070", buttons: "#e8c45a", skin: SKINS[v % 4], build: v % 3 === 1 ? "stout" : "adult", ...(v % 2 ? { moustache: "#4a3a2a" } : {}), ...o });
const MONT: Outfit = { jacket: "#1a2a4a", pants: "#1a2236", boots: "#1a1a20", hat: "cap", cap: "#1a2a4a", belt: "#e8c45a", buttons: "#e8c45a", sash: "#e8c45a", moustache: "#4a3a2a", skin: SKINS[1], build: "adult" };
const MARTIN: Outfit = { jacket: "#2a3f6a", pants: "#2a3050", boots: "#1a1a20", hat: "cap", cap: "#2a3f6a", belt: "#e8c45a", buttons: "#e8c45a", skin: SKINS[2], build: "adult" };
const SAIL = (v: number): Outfit => ({ jacket: "#1a2236", pants: "#1a2236", boots: "#1a1a20", hat: "cap", cap: "#1a2236", belt: "#2a2a30", buttons: "#c8b070", skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult", ...(v % 2 ? { moustache: "#3a2a1a" } : {}) });
const FISH: Outfit = { jacket: "#6a5a4a", pants: "#4a4a40", boots: "#2a2218", hat: "cap", cap: "#1a1a22", moustache: "#3a2a1a", skin: SKINS[3], build: "stout" };
const GER = (v: number): Outfit => ({ jacket: ["#6a7a6a", "#5a6a5a", "#7a8a7a"][v % 3], pants: "#3a4a3a", boots: "#1a1a20", hat: "cap", cap: ["#4a5a4a", "#3a4a3a"][v % 2], belt: "#c8b070", buttons: "#c8b070", sash: "#b02a30", skin: SKINS[v % 4], build: v % 2 ? "stout" : "adult" });
const ROM: Outfit = { jacket: "#8a8a6a", pants: "#6a6a4a", boots: "#2a2218", hat: "cap", cap: "#8a8a6a", belt: "#c8b070", buttons: "#c8b070", sash: "#c8352a", skin: SKINS[1], build: "adult" };
const AGENT: Outfit = { jacket: "#3a3a3a", pants: "#2a2a2a", boots: "#1a1a1a", hat: "cap", cap: "#2a2a2a", skin: SKINS[0], build: "adult", moustache: "#2a2a2a" };
const SOLD = (v: number): Outfit => ({ jacket: "#6a7a4a", pants: "#4a5a3a", boots: "#2a2218", hat: "cap", cap: "#5a6a3a", belt: "#3a3a2a", buttons: "#3a3a2a", rifle: v % 2 === 0, skin: SKINS[v % 4], build: "adult" });

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
const briefcaseC = (p: Pen) => { p.poly(rr(20, 50, 190, 140, 10), "#6a3a22", 8); p.poly(rr(70, 30, 140, 56, 8), null, 6); p.poly(rr(92, 80, 118, 100, 3), "#e8c45a", 3); for (let i = 0; i < 6; i++) p.ell(18 + i * 8, 142 + 4 * (i % 2), 6, 4, "#8a8e98", 3); };
const envelopeC = (p: Pen) => { p.poly(rr(10, 20, 150, 100, 6), "#f6efd8", 6); p.stroke([[10, 20], [80, 66], [150, 20]], 4, "#8a7a5a"); p.ell(80, 70, 10, 10, "#c92a2e", 3); };
const photoC = (p: Pen) => { p.poly(rr(10, 10, 130, 150, 6), "#f6f3ea", 7); p.poly(rr(24, 24, 116, 112, 4), "#8ac0e8", 5); p.ell(70, 62, 20, 22, "#f2c8a0", 4); p.poly([[40, 112], [100, 112], [90, 84], [50, 84]], "#c85a7a", 4); p.ell(70, 130, 8, 6, "#ff5a7a", 2); };
const ticketC = (p: Pen) => { p.poly(rr(10, 20, 150, 90, 6), "#e8c45a", 6); p.stroke([[100, 24], [100, 86]], 3, "#8a6a2a"); const g = p.g; font(g, 20); g.fillStyle = "#5a2a1a"; g.fillText("THEATRE", 55, 56); };
const overdraftC = (p: Pen) => { p.poly(rr(10, 10, 140, 170, 6), "#f6efd8", 7); for (let i = 0; i < 5; i++) p.stroke([[24, 36 + i * 18], [126, 36 + i * 18]], 3, "#8a8a8a"); const g = p.g; font(g, 30); g.fillStyle = "#c92a2e"; g.fillText("-£", 76, 150); };
const topSecret = (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 290, 110, 8), "#c92a2e", 9); font(g, 38); g.fillStyle = "#ffffff"; g.fillText("TOP SECRET", 150, 62); };
const ringC = (p: Pen) => { p.ell(60, 70, 24, 24, null, 10); p.ell(60, 70, 24, 24, null, 4); p.poly([[48, 34], [60, 22], [72, 34], [60, 46]], "#8ad8ff", 5); };
const medMap = (hi: number) => (p: Pen) => { const g = p.g; p.poly(rr(8, 8, 392, 292, 14), "#e8d8a8", 9); p.ell(70, 60, 60, 26, "#6ab4e8", 0); p.poly([[250, 150], [330, 130], [360, 180], [320, 230], [260, 220]], hi === 0 ? "#c8352a" : "#7aae5a", 6); p.poly([[40, 140], [90, 120], [110, 170], [70, 210], [38, 190]], hi === 1 ? "#c8352a" : "#7aae5a", 6); p.poly([[150, 200], [210, 190], [230, 240], [170, 250]], hi === 2 ? "#c8352a" : "#7aae5a", 6); font(g, 22); g.fillStyle = "#2a1a10"; g.fillText("SICILY", 190, 222); g.fillText("SARDINIA", 70, 168); g.fillText("GREECE", 300, 182); };
const arrowC = (p: Pen) => { p.poly([[10, 50], [110, 50], [110, 20], [180, 70], [110, 120], [110, 90], [10, 90]], "#c92a2e", 8); };
const boatC = (p: Pen) => { p.poly([[10, 70], [200, 70], [170, 120], [40, 120]], "#6a7a4a", 8); p.poly(rr(40, 40, 160, 72, 4), "#5a6a3a", 6); p.stroke([[100, 10], [100, 70]], 5, "#4a4a3a"); };
const stoneC = (p: Pen) => { const g = p.g; p.poly([[20, 280], [20, 110], [40, 60], [90, 30], [140, 30], [190, 60], [210, 110], [210, 280]], "#d8d8de", 9); p.stroke([[50, 110], [180, 110]], 4, "#8a8a98"); font(g, 22); g.fillStyle = "#4a4a58"; g.fillText("GLYNDWR", 115, 140); g.fillText("MICHAEL", 115, 168); font(g, 15); g.fillText("SERVED AS", 115, 202); g.fillText("MAJOR WILLIAM", 115, 222); g.fillText("MARTIN, R.M.", 115, 242); };
const lockC = (p: Pen) => { p.poly(rr(20, 70, 100, 130, 8), "#c8a040", 8); p.arc(60, 70, 28, 28, 180, 360, 9, "#8a8e98"); p.ell(60, 100, 7, 7, "#3a2a10", 3); };
const moonC = (p: Pen) => { p.ell(100, 100, 80, 80, "#fffbe8", 8); p.ell(78, 78, 14, 14, "#e8e4d0", 0); p.ell(120, 118, 18, 18, "#e8e4d0", 0); };
const bodyC = (p: Pen) => { p.poly(rr(10, 30, 180, 80, 20), "#2a3f6a", 8); p.ell(190, 56, 24, 24, "#f2c8a0", 7); p.poly([[196, 40], [220, 36], [220, 50]], "#2a3f6a", 4); p.dot(196, 52, 2.5, "#1a1a24"); p.stroke([[4, 60], [-16, 48]], 8, "#1a1a20"); };

const rope = (p: Pen) => { p.ell(30, 30, 20, 8, "#c8a860", 4); p.stroke([[12, 30], [48, 30]], 5, "#7a5a2a"); };
const sparkleC = (p: Pen) => { p.poly([[30, 2], [36, 24], [58, 30], [36, 36], [30, 58], [24, 36], [2, 30], [24, 24]], "#fff3a0", 0); };
const gravec = (p: Pen) => { p.stroke([[40, 150], [40, 40]], 12, "#c8c8d0"); p.stroke([[10, 80], [70, 80]], 12, "#c8c8d0"); p.ell(40, 156, 30, 10, "#4a3a2a", 0); };

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

  const OXc = T.OX, BXc = T.BX, SXc = T.SX, HXc = T.HX, GXc = T.GX, LXc = T.LX, CXc = T.CX;
  const sm = (u: number) => glide(clamp01(u));
  /** smooth walk from x0 to x1 (t0 -> t1) at depth z; stands (idle) before and after */
  const walker = (i: number, o: Outfit, ok: string, x0: number, x1: number, t0: number, t1: number, z: number, exStand: Expr, exWalk: Expr = exStand, sc = 1.2, y = 0, arms: FrontOpts["arms"] = { l: [-0.4, 0.3], r: [0.4, 0.3] }) => {
    const u = clamp01((t - t0) / (t1 - t0)), x = lerp(x0, x1, glide(u));
    if (u > 0 && u < 1) stride(i, o, ok + "w", x, z, exWalk, Math.sign(x1 - x0), 1.5, arms, sc, y); else idleW(i, o, ok, x, z, exStand, sc, y, arms);
  };
  const nodTalk = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, amt = 1, sc = 1.2, y = 0) => { const w = Math.sin(t * 2.2 + i * 1.9); who(i, o, ok, x, z, expr, { arms: { l: [-0.45, ar(0.3 - 0.04 * w * amt)], r: [0.45, ar(0.05 + 0.3 * w * amt)] }, headTilt: ar(0.04 * w * amt) }, sc, add(idle(t, i, 1.5), { dy: 0, sx: 1, sy: 1, lean: 0.012 * w * amt }), y); };
  const laugh = (i: number, o: Outfit, ok: string, x: number, z: number, sc = 1.2, y = 0) => { const w = Math.sin(t * 4 + i); who(i, o, ok, x, z, "laugh", { arms: { l: [-0.5, ar(-0.55 + 0.1 * w)], r: [0.5, ar(-0.55 - 0.1 * w)] } }, sc, hop(t, i, 1.1, 0.07), y); };
  const pose = (from: [number, number], to: [number, number], u: number): [number, number] => [lerp(from[0], to[0], sm(u)), lerp(from[1], to[1], sm(u))];

  // ====================================================== H: THE SPANISH BEACH (x = -120): hook + the find ======================================================
  const inH = t < 7.6 || (t >= 48.4 && t < 53.3);
  if (inH) {
    const hx = HXc, hook = t < 7.6;
    // the body drifts in on the waves, then lies in the surf
    const drift = hook ? sm((t - 0.4) / 4.0) : 1, bx = lerp(hx + 3.6, hx - 0.6, drift), bobY = 0.05 * Math.sin(t * 1.8) * (1 - 0.6 * drift);
    s.fx("body", 240, 110, bodyC, bx, 0.55 + bobY, 0.3, 2.6, 1.1, { rot: 0.04 * Math.sin(t * 1.5) });
    if (!hook || t >= 2.0) for (let k = 0; k < 3; k++) { const u = (t * 0.6 + k / 3) % 1; s.fx("foam", 120, 120, dustC, hx - 2.4 + 2.2 * k, 0.25, 0.9 - 0.2 * u, 1.6, 0.7, { soft: true }); }
    if (hook) {
      // two British spies grin in the background (they staged it)
      for (let k = 0; k < 2; k++) nodTalk(10 + k, AGENT, `ag${k}`, hx - 3.4 + 1.2 * k, -0.6, t >= T.T_FAKE ? "grin" : "smile", 0.6, 1.15, 0);
      // the fisherman runs in (4.4 - 6.4), startled
      walker(12, FISH, "fish", hx + 5.0, hx + 2.4, T.T_WASH, T.T_WASH + 1.4, 1.0, "shock", "stern", 1.25, 0, { l: [-0.5, 0.2], r: [0.5, 0.2] });
      plateAt("y43", "1943", "", "#2a1a10", "#ffd84a", 0.2, 1.4, hx, 4.4, 1.2, 2.4, -0.03);
      plateAt("spy", "BRITISH SPIES", "", "#2a3f8a", "#ffffff", 1.5, 3.1, hx, 4.4, 1.2, 3.4, 0.03);
      plateAt("fkO", "A FAKE OFFICER!", "", "#c92a2e", "#ffffff", T.T_FAKE, T.T_WASH + 0.4, hx, 4.4, 1.2, 3.3, -0.03);
      plateAt("wsh", "WASHED UP IN SPAIN", "", "#3a6aa8", "#ffffff", T.T_WASH + 0.4, T.T_FOOLED, hx, 4.4, 1.2, 3.2, 0.03);
      plateAt("fol", "IT FOOLED HITLER!", "", "#c92a2e", "#ffffff", T.T_FOOLED, 7.6, hx, 4.4, 1.2, 3.3, -0.03);
    } else {
      const u = clamp01((t - T.T_FISH) / 1.4), fx = lerp(hx + 4.6, hx + 1.8, glide(u));
      if (t < T.T_FISH + 1.4) stride(12, FISH, "fishw", fx, 1.0, "stern", -1, 1.5, { l: [-0.5, 0.2], r: [0.5, 0.2] }, 1.25, 0); else { const w = Math.sin(t * 3); who(12, FISH, "fish", fx, 1.0, "shock", { arms: { l: [-0.5, ar(-0.6 + 0.1 * w)], r: [0.5, ar(-0.5)] } }, 1.25, idle(t, 12, 1.5), 0); }
      plateAt("sfi", "A SPANISH", "FISHERMAN", "#c8703a", "#ffffff", T.T_FISH, T.T_PAPERS, hx + 0.6, 4.6, 1.2, 3.0, -0.03);
      if (t >= T.T_PAPERS - 0.2) { const pu = clamp01((t - T.T_PAPERS) / 1.4); s.fx("pcase", 220, 160, briefcaseC, lerp(hx - 0.6, hx + 3.0, glide(pu)), lerp(0.9, 2.3, Math.sin(Math.PI * pu * 0.5)), 1.4, 1.3, 0.9, { rot: -0.1 * Math.sin(t * 3) }); }
      plateAt("sp", "SECRET PAPERS", "", "#6a1a1a", "#ffffff", T.T_PAPERS, T.T_GERM, hx, 4.6, 1.2, 3.4, 0.03);
      walker(13, GER(0), "gerA", hx + 7.4, hx + 3.9, 50.8, 52.1, 0.8, "smile", "stern", 1.25, 0);
      if (t >= T.T_GERM) { const pu = clamp01((t - T.T_GERM) / 0.5); s.fx("env", 160, 110, envelopeC, lerp(hx + 3.0, hx + 3.9, glide(pu)), lerp(1.6, 2.4, pu), 1.2, 0.9, 0.6, {}); }
      plateAt("gh", "GERMAN HANDS!", "", "#4a5a4a", "#ffffff", T.T_GERM, 53.3, hx, 4.6, 1.2, 3.4, -0.03);
    }
  }

  // ====================================================== O: THE OFFICE (x = 0): the plan, and the finale ======================================================
  const inO = (t >= 7.2 && t < 20.4) || t >= 76.8;
  if (inO) {
    const ox = OXc;
    const fin = t >= T.T_CTA - 0.3, fol = t >= T.T_FOLLOW;
    if (!fin) {
      // map board with the three islands; Sicily red first (the obvious target), later Greece / Sardinia
      const hiNow = t < T.T_ELSE ? 0 : t < T.T_ELSE + 0.7 ? 1 : 2;
      const me = pop(t - 7.4, 0.3);
      s.fx("mm", 400, 300, medMap(hiNow), ox, 4.8, -2.4, 3.8 * me, 2.85 * me, { rot: 0 });
      // three officers around the desk; they talk quietly
      nodTalk(20, OFF(0), "of0", ox - 2.2, 0.6, "neutral", 1, 1.25, 0);
      nodTalk(21, OFF(1), "of1", ox + 2.2, 0.6, "neutral", 1, 1.25, 0);
      if (t < 14.5) nodTalk(22, OFF(2), "of2", ox, -0.2, t >= T.T_TRICK ? "grin" : "stern", 1, 1.25, 0);
      plateAt("inv", "INVADE SICILY!", "", "#2a3f8a", "#ffffff", T.T_ALLIES, T.T_EXPECT, ox, 7.4, 0.5, 3.6, -0.03);
      plateAt("obv", "TOO OBVIOUS!", "", "#c92a2e", "#ffffff", T.T_EXPECT, T.T_TRICK, ox, 7.4, 0.5, 3.4, 0.03);
      plateAt("tri", "NEED A TRICK!", "", "#6a3a8a", "#ffffff", T.T_TRICK, T.T_ELSE, ox, 7.4, 0.5, 3.4, -0.03);
      plateAt("els", "LOOK ELSEWHERE!", "", "#c8a040", "#ffffff", T.T_ELSE, 14.6, ox, 7.4, 0.5, 3.3, 0.03);
      if (t >= T.T_EXPECT && t < T.T_TRICK) for (let k = 0; k < 3; k++) qm(ox - 2.6 + 2.6 * k, 3.4, 1.0, T.T_EXPECT + 0.1 * k, k, 0.9);
      if (t >= T.T_TRICK && t < T.T_ELSE) { const e = pop(t - T.T_TRICK, 0.4); s.fx("bolt", 80, 180, bolt, ox + 3.0, 3.4, 1.0, 0.8 * e, 1.8 * e, { rot: 0.1 * Math.sin(t * 5) }); }
      if (t >= T.T_ELSE) for (let k = 0; k < 2; k++) { const e = pop(t - T.T_ELSE - 0.5 * k, 0.4); s.fx("arr", 200, 140, arrowC, k ? ox - 3.0 : ox + 3.2, 2.6, 1.0, 1.5 * e, 1.0 * e, { rot: k ? 3.14 + 0.2 : 0.3 }); }
      // Montagu steps up (14.5 - 20.4)
      if (t >= 14.2) { const mx = lerp(ox - 4.5, ox, sm((t - 14.3) / 1.0)); const w = Math.sin(t * 2.2); if (t < 15.4) stride(23, MONT, "montw", mx, 1.6, "smile", 1, 1.5, { l: [-0.4, 0.3], r: [0.4, 0.3] }, 1.35, 0); else who(23, MONT, "mont", ox, 1.6, t >= T.T_OP ? "grin" : "smile", { arms: { l: [-0.45, 0.3], r: [0.5, ar(-0.4 + 0.3 * w)] }, headTilt: ar(0.04 * w) }, 1.35, add(idle(t, 23, 1.5), { dy: 0, sx: 1, sy: 1, lean: 0.01 * w }), 0); }
      plateAt("mt", "INTELLIGENCE OFFICER", "EWEN MONTAGU", "#1a2a4a", "#ffffff", T.T_MONT, T.T_PLAN, ox, 5.0, 1.2, 3.2, -0.03);
      plateAt("wp", "A WILD PLAN!", "", "#c8a040", "#ffffff", T.T_PLAN, T.T_OP, ox, 5.0, 1.2, 3.2, 0.03);
      plateAt("opm", "OPERATION", "MINCEMEAT", "#c92a2e", "#ffffff", T.T_OP, 20.4, ox, 5.0, 1.2, 3.4, -0.03);
    } else {
      const g = 1 + 0.08 * Math.sin(t * 3);
      s.fx("pg", 200, 200, glowC("255,214,120"), ox, 5.4, -1.0, 7.0 * g, 7.0 * g, { soft: true });
      s.fx("mm", 400, 300, medMap(0), ox, 5.2, -2.4, 4.0 * pop(t - T.T_CTA + 0.3, 0.3), 3.0 * pop(t - T.T_CTA + 0.3, 0.3), {});
      plateAt("fin", "OPERATION", "MINCEMEAT", "#c92a2e", "#ffffff", T.T_CTA - 0.2, T.T_CTA + 3.0, ox, 7.2, 1.0, 3.2, -0.03);
      const crew: [Outfit, string][] = [[MONT, "mont"], [OFF(0), "of0"], [OFF(1), "of1"], [OFF(2), "of2"], [AGENT, "ag"], [SAIL(1), "sl"]];
      for (let k = 0; k < 6; k++) { const x = (k < 3 ? -1 : 1) * (1.2 + 1.1 * (k % 3)) + (k < 3 ? -0.3 : 0.5), z = -0.4 + 0.8 * (k % 2); if (fol) cheer(30 + k, crew[k][0], crew[k][1] + "c", x, z, 1.2, 0.12, 1.15, 0); else nodTalk(30 + k, crew[k][0], crew[k][1] + "c", x, z, "smile", 0.8, 1.15, 0); }
      confetti(fol ? 24 : 10, ox, 0, 12, 9); if (fol) for (let k = 0; k < 5; k++) { const u = (t * 0.6 + k / 5) % 1; s.fx("hrt", 100, 100, heart, ox - 2 + k, 2 + 4 * u, 1.6, 0.5, 0.5); }
    }
  }

  // ====================================================== B: THE WORKSHOP (x = -40): the body and the fake identity ======================================================
  if (t >= 20.0 && t < 42.4) {
    const bx0 = BXc;
    s.fx("martin", 240, 110, bodyC, bx0, 1.85, -1.2, 3.0, 1.3, {});
    nodTalk(40, MONT, "mont", bx0 - 2.5, 1.0, t >= 25.8 ? "smile" : "neutral", 0.8, 1.3, 0);
    nodTalk(41, AGENT, "ag", bx0 + 2.5, 1.0, "neutral", 0.8, 1.3, 0);
    plateAt("bdy", "FIRST: A BODY", "", "#2a1a10", "#ffd84a", T.T_BODY, T.T_WELSH, bx0, 5.0, 0.5, 3.4, -0.03);
    plateAt("wel", "A HOMELESS", "WELSHMAN", "#6a1a1a", "#ffffff", T.T_WELSH, T.T_POISON, bx0, 5.0, 0.5, 3.0, 0.03);
    plateAt("rp", "DIED OF", "RAT POISON", "#3a6a3a", "#ffffff", T.T_POISON, T.T_IDENT, bx0, 5.0, 0.5, 3.0, -0.03);
    plateAt("mwm", "MAJOR WILLIAM", "MARTIN", "#2a3f6a", "#ffffff", T.T_IDENT, T.T_MARINES, bx0, 5.0, 0.5, 2.8, 0.03);
    plateAt("rmr", "ROYAL MARINES", "", "#2a3f6a", "#ffffff", T.T_MARINES, T.T_FIANCEE, bx0, 5.0, 0.5, 3.0, -0.03);
    const items: [number, number, (p: Pen) => void, number, number, string, string, number][] = [
      [T.T_FIANCEE, T.T_LETTERS, photoC, 1.0, 1.2, "FIANCÉE", "#c85a7a", -3.0], [T.T_LETTERS, T.T_TICKETS, envelopeC, 1.5, 1.0, "LOVE LETTERS", "#c85a7a", -1.0],
      [T.T_TICKETS, T.T_OVERDR, ticketC, 1.5, 1.0, "THEATRE TICKETS", "#6a3a8a", 1.0], [T.T_OVERDR, T.T_CASE, overdraftC, 1.1, 1.3, "BANK OVERDRAFT", "#6a1a1a", 3.0]];
    for (const [t0, t1, fn, w, h, label, bg, ix] of items) {
      if (t < t0) continue;
      const e = pop(t - t0, 0.5), fl = 0.1 * Math.sin(t * 2 + ix);
      s.fx("it" + ix, 160, 160, fn, bx0 + ix, 3.6 + fl, 0.3, w * 1.2 * e, h * 1.2 * e, { rot: 0.05 * Math.sin(t * 2 + ix) });
      plateAt("itl" + ix, label, "", bg, "#ffffff", t0, t1, bx0, 5.6, 0.5, 3.0, 0.03 * Math.sin(ix));
    }
    if (t >= T.T_CASE) {
      const e = pop(t - T.T_CASE, 0.4);
      s.fx("case", 220, 160, briefcaseC, bx0 + 1.8, 1.7, -0.6, 1.6 * e, 1.15 * e, {});
      for (let k = 0; k < 5; k++) s.fx("chn", 60, 60, rope, bx0 + 0.2 + 0.3 * k, 1.6 + 0.05 * Math.sin(t * 2 + k), -0.5, 0.5, 0.5, {});
      plateAt("ch", "CHAINED TO", "HIS WRIST", "#4a4a52", "#ffffff", T.T_CHAIN, T.T_FAKEL, bx0, 5.0, 0.5, 3.2, -0.03);
      if (t >= T.T_FAKEL) { const se = pop(t - T.T_FAKEL, 0.5); s.fx("ts", 300, 130, topSecret, bx0, 4.6, 0.5, 3.0 * se, 1.3 * se, { rot: -0.05 }); for (let k = 0; k < 3; k++) { const u = (t * 0.5 + k / 3) % 1; s.fx("lt", 160, 110, envelopeC, bx0 - 1.2 + 1.2 * k, 2.2 + 1.2 * u, 0.4, 0.9, 0.6, { rot: 0.2 * Math.sin(t * 3 + k) }); } }
      if (t >= T.T_GREECE - 0.2) { s.fx("mmB", 400, 300, medMap(t < T.T_SARD ? 1 : 2), bx0, 8.4, -1.0, 3.2, 2.4, {}); plateAt("gre", "GREECE", "", "#2a3f8a", "#ffffff", T.T_GREECE, T.T_SARD, bx0 - 2.6, 3.6, 0.5, 2.4, -0.03); plateAt("sar", "SARDINIA", "", "#2a3f8a", "#ffffff", T.T_SARD, 42.4, bx0 + 2.6, 3.6, 0.5, 2.8, 0.03); }
    }
  }

  // ====================================================== S: THE SUBMARINE (x = -80), night ======================================================
  if (t >= 41.6 && t < 49.2) {
    const sx = SXc, dk = 1.62;
    s.fx("moon", 200, 200, moonC, sx + 8, 12.5, -22, 6, 6, {}); s.fx("moong", 200, 200, glowC("200,220,255"), sx + 8, 12.5, -22.2, 14, 14, { soft: true });
    for (let k = 0; k < 8; k++) s.fx("stl", 70, 70, sparkleC, sx - 12 + 3.2 * k, 9 + 2.2 * Math.sin(k * 2.1) + 0.2 * Math.sin(t * 2 + k), -20, 0.5, 0.5, { rot: t * 0.5 + k });
    const slide = clamp01((t - T.T_SLID) / 1.7);
    for (let k = 0; k < 4; k++) { const x = sx - 3.4 + 1.5 * k, w = Math.sin(t * 2 + k); who(50 + k, SAIL(k), `sl${k}`, x, -0.4, t >= 45.7 ? "stern" : "neutral", { arms: t >= T.T_SLID - 0.4 && k > 1 ? { l: [-0.4, ar(0.1)], r: [0.4, ar(0.1)] } : { l: [-0.4, 0.3], r: [0.4, 0.3] }, headTilt: ar(0.03 * w) }, 1.15, idle(t, 50 + k, 1.5), dk, false); }
    if (t < T.T_SLID - 0.6) s.fx("bcarry", 240, 110, bodyC, sx + 2.4, dk + 0.5, 0.3, 2.2, 0.95, { rot: 0.0 });
    else { const u = sm(slide); s.fx("bsl", 240, 110, bodyC, lerp(sx + 2.4, sx + 5.6, u), lerp(dk + 0.5, 0.35, u * u), lerp(0.3, 0.9, u), 2.2, 0.95, { rot: lerp(0.0, 1.0, u) }); if (u > 0.9) puffAt(t, sx + 5.6, 0.4, 0.9, 2.0, 0.7); }
    plateAt("apr", "30 APRIL", "", "#2a1a10", "#ffd84a", T.T_APRIL, T.T_SUB, sx, 5.8, 0.5, 3.0, -0.03);
    plateAt("sea", "HMS SERAPH", "", "#3a4048", "#ffffff", T.T_SUB, 46.0, sx, 5.8, 0.5, 3.4, 0.03);
    plateAt("spn", "COAST OF SPAIN", "", "#c8a040", "#2a1a10", 46.0, T.T_SLID, sx, 5.8, 0.5, 3.2, -0.03);
    plateAt("sli", "INTO THE SEA...", "", "#1f3a78", "#ffffff", T.T_SLID, 49.2, sx, 5.8, 0.5, 3.2, 0.03);
  }

  // ====================================================== G: GERMAN HEADQUARTERS (x = -160) ======================================================
  if (t >= 52.8 && t < 59.9) {
    const gx = GXc, hi = t < T.T_GRS ? 0 : t < T.T_GRS + 0.8 ? 1 : 2;
    s.fx("mmG", 400, 300, medMap(hi === 0 ? 3 : hi), gx, 4.8, -2.6, 3.8, 2.85, {});
    const gens: [Outfit, string][] = [[GER(0), "g0"], [GER(1), "g1"], [ROM, "rom"], [GER(2), "g2"]];
    for (let k = 0; k < 4; k++) { const x = gx - 3.0 + 2.0 * k, w = Math.sin(t * 2 + k), nod = t >= T.T_BELIEVED ? 0.06 * Math.sin(t * 3 + k) : 0; if (k === 2 && t >= T.T_ROMMEL) who(60 + k, gens[k][0], gens[k][1], x, 0.4, "stern", { arms: { l: [-0.45, 0.3], r: [0.5, ar(-0.7 + 0.1 * w)] } }, 1.3, add(idle(t, 60 + k, 1.5), { dy: 0.02 * pulse(t - T.T_ROMMEL, 0.6), sx: 1, sy: 1, lean: 0 }), 0); else who(60 + k, gens[k][0], gens[k][1], x, 0.4, t >= T.T_BELIEVED ? "smile" : "neutral", { arms: { l: [-0.45, 0.3], r: [0.45, ar(0.2 + 0.1 * w)] }, headTilt: ar(nod) }, 1.3, idle(t, 60 + k, 1.5), 0); }
    plateAt("bel", "BELIEVED", "EVERY WORD!", "#4a5a4a", "#ffffff", T.T_BELIEVED, T.T_HITLER, gx, 7.6, 0.5, 3.4, -0.03);
    plateAt("hit", "HITLER ORDERS", "MORE TROOPS", "#6a1a1a", "#ffffff", T.T_HITLER, T.T_ROMMEL, gx, 7.6, 0.5, 3.4, 0.03);
    plateAt("rom", "EVEN ROMMEL!", "", "#8a8a6a", "#ffffff", T.T_ROMMEL, T.T_GRS, gx, 7.6, 0.5, 3.4, -0.03);
    if (t >= T.T_GRS) { plateAt("gr2", "GREECE", "", "#2a3f8a", "#ffffff", T.T_GRS, T.T_GRS + 0.8, gx, 7.6, 0.5, 2.6, 0.03); plateAt("sd2", "SARDINIA!", "", "#2a3f8a", "#ffffff", T.T_GRS + 0.8, 59.9, gx, 7.6, 0.5, 3.0, -0.03); for (let k = 0; k < 2; k++) { const e = pop(t - T.T_GRS - 0.5 * k, 0.4); s.fx("arr", 200, 140, arrowC, gx - 3.0 + 6.0 * k, 3.4, 1.0, 1.4 * e, 0.95 * e, { rot: k ? 3.14 : 0 }); } }
  }

  // ====================================================== L: SICILY (x = -200): the real invasion ======================================================
  if (t >= 59.6 && t < 65.2) {
    const lx = LXc;
    for (let k = 0; k < 3; k++) { const u = clamp01((t - T.T_JULY - 0.3 * k) / 1.8), bxp = lx - 5 + 5 * k, z = lerp(-9, -3.2, glide(u)); s.fx("bt", 220, 140, boatC, bxp, 0.8 + 0.08 * Math.sin(t * 2 + k), z, 3.0, 1.9, { rot: 0.04 * Math.sin(t * 1.7 + k) }); }
    for (let k = 0; k < 6; k++) { const t0 = T.T_LAND + 0.12 * k, x0 = lx - 5 + 2.0 * (k % 3), z = lerp(-3.6, 1.8, glide(clamp01((t - t0) / 1.6))); if (t < t0) continue; const run = clamp01((t - t0) / 1.6) < 1; if (run) stride(70 + k, SOLD(k), `sd${k}w`, x0 + 0.4 * (k % 2), z, "stern", 1, 2.0, { l: [-0.4, 0.2], r: [0.5, -0.3] }, 1.1, 0); else idleW(70 + k, SOLD(k), `sd${k}`, x0 + 0.4 * (k % 2), z, "grin", 1.1, 0, { l: [-0.5, 0.3], r: [0.55, -0.7] }); }
    if (t >= T.T_SURP - 0.2) for (let k = 0; k < 2; k++) { const w = Math.sin(t * 3 + k); who(80 + k, GER(k), `gs${k}`, lx + 4.0 + 1.6 * k, 1.6, "shock", { arms: { l: [-0.5, ar(-0.6 + 0.1 * w)], r: [0.5, ar(-0.6 - 0.1 * w)] } }, 1.15, { dy: 0.06 * pulse(t - T.T_SURP - 0.15 * k, 0.5), sx: 1 + 0.04 * pulse(t - T.T_SURP - 0.15 * k, 0.4), sy: 1 - 0.03 * pulse(t - T.T_SURP - 0.15 * k, 0.4), lean: 0 }, 0); for (let k = 0; k < 2; k++) s.fx("bg", 120, 120, bang, lx + 4.0 + 1.6 * k, 3.9, 1.8, 0.8 * pop(t - T.T_SURP - 0.15 * k), 0.8 * pop(t - T.T_SURP - 0.15 * k)); }
    plateAt("jl", "JULY 10", "", "#2a1a10", "#ffd84a", T.T_JULY, T.T_LAND + 0.4, lx, 6.4, 0.5, 3.0, -0.03);
    plateAt("sic", "ALLIES LAND", "IN SICILY!", "#2a3f8a", "#ffffff", T.T_LAND + 0.4, T.T_SURP, lx, 6.4, 0.5, 3.2, 0.03);
    plateAt("sur", "GERMANS CAUGHT", "BY SURPRISE!", "#c92a2e", "#ffffff", T.T_SURP, 65.2, lx, 6.4, 0.5, 3.0, -0.03);
  }

  // ====================================================== C: THE CEMETERY IN SPAIN (x = -240) ======================================================
  if (t >= 64.6 && t < 77.6) {
    const cx = CXc, late = t >= T.T_STONE;
    for (let k = 0; k < 4; k++) s.fx("gr", 90, 170, gravec, cx - 7.0 + 4.6 * k - (k > 1 ? -4 : 0), 1.1, -4.0, 0.9, 1.7, {});
    const e = pop(t - 64.8, 0.3), glow = late ? 1 + 0.06 * Math.sin(t * 3) : 0;
    if (late) s.fx("sg", 200, 200, glowC("255,230,150"), cx, 2.8, -0.3, 6.0 * glow, 6.0 * glow, { soft: true });
    s.fx("stone", 230, 300, stoneC2(late ? 1 : 0), cx, 2.0, 0.0, 2.7 * e, 3.4 * e, { rot: 0.0 });
    if (t >= T.T_BURIED - 0.5) for (let k = 0; k < 3; k++) s.fx("flw", 60, 110, flower(["#ff5a7a", "#ffd84a", "#7ab8ff"][k]), cx - 1.4 + 1.4 * k, 0.5, 1.4, 0.9, 1.4, {});
    nodTalk(90, AGENT, "mourn", cx - 3.6, 0.8, "neutral", 0.5, 1.2, 0);
    plateAt("bur", "BURIED IN SPAIN", "AS WILLIAM MARTIN", "#4a4a58", "#ffffff", T.T_BURIED, T.T_SECRET, cx, 6.0, 0.5, 3.3, -0.03);
    if (t >= T.T_SECRET - 0.2 && t < T.T_STONE) { const le = pop(t - T.T_SECRET, 0.4); s.fx("lock", 120, 140, lockC, cx + 2.8, 2.4, 1.0, 1.1 * le, 1.3 * le, {}); }
    plateAt("sec", "SECRET FOR", "50+ YEARS", "#6a1a1a", "#ffffff", T.T_SECRET, T.T_1996, cx, 6.0, 0.5, 3.4, 0.03);
    plateAt("y96", "1996", "", "#2a1a10", "#ffd84a", T.T_1996, T.T_STONE, cx, 6.0, 0.5, 2.6, -0.03);
    if (late) { plateAt("tru", "THE TRUTH", "AT LAST", "#c8a040", "#ffffff", T.T_STONE, 77.6, cx, 6.0, 0.5, 3.0, 0.03); for (let k = 0; k < 6; k++) { const u = (t * 0.4 + k / 6) % 1; s.fx("spk", 70, 70, sparkleC, cx - 3 + 6 * hh(k, 2), 1 + 4 * u, 0.6, 0.35, 0.35, { rot: t + k }); } }
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW; void smooth; void fxPuff; void shotAt; void hop; void pulse; void rr; void lerp; void bob; void add; void spr; void stoneC; void lockC;
export type { V3, SetName, Expr, FrontOpts };
