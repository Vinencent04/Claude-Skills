// Cast of "The War of Jenkins' Ear": Captain Jenkins, Spanish officer + sailors, lords, Walpole, Vernon, Blas de Lezo, the London crowd.
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
const JEN: Outfit = { jacket: "#2a4a8a", pants: "#e8e4d8", boots: "#2a1a10", hat: "cap", cap: "#1a2a5a", belt: "#c8b070", buttons: "#e8c45a", moustache: "#5a3a22", skin: SKINS[1], build: "adult" };
const SOFF: Outfit = { jacket: "#e8e0c8", pants: "#3a3a50", boots: "#1a1a20", hat: "bicorne", moustache: "#1a1a1a", sash: "#c8352a", sword: true, buttons: "#e8c45a", skin: SKINS[2], build: "stout" };
const SSAIL = (v: number): Outfit => ({ jacket: ["#e0d8b8", "#d8c890", "#e8e0d0"][v % 3], pants: "#3a3a50", boots: "#1a1a20", hat: "cap", cap: "#c8352a", belt: "#2a2a30", buttons: "#e8c45a", sword: v % 2 === 0, skin: SKINS[(v + 2) % 4], build: v % 3 === 0 ? "stout" : "adult", ...(v % 2 ? { moustache: "#2a1a10" } : {}) });
const BSAIL = (v: number): Outfit => ({ jacket: "#2a4a8a", pants: "#e8e4d8", boots: "#2a1a10", hat: "cap", cap: "#1a2a5a", belt: "#c8b070", buttons: "#e8c45a", skin: SKINS[v % 4], build: v % 3 === 1 ? "stout" : "adult", ...(v % 2 ? { moustache: "#6a4a2a" } : {}) });
const LORD = (v: number): Outfit => ({ jacket: ["#6a1a2a", "#2a3a6a", "#3a5a3a", "#5a2a5a"][v % 4], pants: "#2a2a30", boots: "#1a1a20", hat: "wig", hair: "#eee8f0", sash: "#e8c45a", buttons: "#e8c45a", skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult", ...(v % 2 ? { moustache: "#d8d2c6" } : {}) });
const WALP: Outfit = { jacket: "#3a2a4a", pants: "#2a2a30", boots: "#1a1a20", hat: "wig", hair: "#eee8f0", sash: "#e8c45a", buttons: "#e8c45a", skin: SKINS[0], build: "stout" };
const VERN: Outfit = { jacket: "#2a3f8a", pants: "#e8e4d8", boots: "#1a1a20", hat: "bicorne", sash: "#e8c45a", buttons: "#e8c45a", sword: true, moustache: "#8a8a92", skin: SKINS[1], build: "stout" };
const BLAS: Outfit = { jacket: "#a83a2a", pants: "#3a3a50", boots: "#1a1a20", hat: "bicorne", sash: "#e8c45a", buttons: "#e8c45a", sword: true, moustache: "#2a2a2a", skin: SKINS[3], build: "stout" };
const CITIZEN = (v: number): Outfit => ({ jacket: ["#3a6aa8", "#8a6a3a", "#4a8a5a", "#a85a3a"][v % 4], pants: "#5a4a3a", boots: "#3a2a1a", hat: "cap", cap: ["#2a4a7a", "#5a4a2a", "#2a5a3a", "#7a3a2a"][v % 4], skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult", ...(v % 2 ? { moustache: "#5a4a3a" } : {}) });
const SICK = (v: number): Outfit => ({ ...BSAIL(v), skin: "#b8d8a0" });

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

// ---------------- helpers ----------------
const ar = (v: number) => Math.round(v * 8) / 8;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const DY = T.DY;
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

  // ====================================================== THE SHIP SET (x = 0): 0-26.9 and 83-end ======================================================
  const shipT = t < 26.9 || t >= 82.8;
  if (shipT) {
    const D = DY, jx = -1.0;
    const late = t >= 82.8, cutT = t < 14.4 ? T.T_SLICE : T.T_CUT;
    // ---- Jenkins ----
    let jex: Expr = "neutral", jarms: FrontOpts["arms"] = { l: [-0.45, 0.3], r: [0.45, 0.3] }, jbn: Bn = idle(t, 1, 1.5), jtilt = 0;
    const hurt = (t0: number) => { const a = t - t0, k = Math.min(1, spr(a, 6, 12)); jex = a < 1.2 ? "shock" : "pained"; jarms = { l: [-0.3, -0.9], r: [0.55, ar(-0.7 + 0.2 * Math.sin(t * 5))] }; jbn = { dy: 0.05 * pulse(a, 0.6), sx: 1 + 0.06 * (1 - k), sy: 1 - 0.06 * (1 - k), lean: -0.15 * k + 0.02 * Math.sin(t * 6) }; jtilt = 0.2; };
    if (!late) {
      if (t < T.T_SLICE) { jex = "nervous"; jarms = { l: [-0.4, 0.35], r: [0.4, 0.35] }; }
      else if (t < 7.2) hurt(T.T_SLICE);
      else if (t < T.T_TIED) { jex = "neutral"; }
      else if (t < T.T_CUT) { jex = "shock"; jarms = { l: [-0.15, 0.55], r: [0.15, 0.55] }; jbn = { dy: 0, sx: 1.02, sy: 0.98, lean: 0.03 * Math.sin(t * 9) }; }
      else if (t < T.T_KEEP) hurt(T.T_CUT);
      else { jex = "pained"; jarms = { l: [-0.3, -0.9], r: [0.4, ar(-0.2 + 0.1 * Math.sin(t * 3))] }; jbn = { ...idle(t, 1, 1.5), lean: -0.05 }; }
    } else { const a = t - T.T_EXC; jex = a > 0 ? "smile" : "neutral"; jarms = { l: [-0.45, 0.3], r: [0.5, ar(-0.6 + 0.1 * Math.sin(t * 4))] }; jbn = idle(t, 1, 1.5); }
    if (t >= T.T_CTA - 0.2) { who(1, JEN, "jen", 0, 0.4, "laugh", { arms: { l: [-0.55, ar(-0.9 + 0.15 * Math.sin(t * 5))], r: [0.55, ar(-0.9 - 0.15 * Math.sin(t * 5))] } }, 1.25, hop(t, 1, t >= T.T_FOLLOW ? 1.6 : 0.9, 0.12), D); }
    else who(1, JEN, "jen", jx, 0.3, jex, { arms: jarms, headTilt: jtilt }, 1.2, jbn, D);
    if (!late && ((t >= T.T_SLICE && t < 14.4) || (t >= T.T_CUT)) && t < T.T_JAR - 0.2) s.fx("bandage", 60, 60, (p) => { p.poly([[4, 30], [30, 4], [56, 30], [30, 56]], "#f2f0e8", 4); p.stroke([[14, 30], [46, 30]], 4, "#c8352a"); }, jx - 0.5, D + 2.25, 0.9, 0.38, 0.38, { rot: 0.2 });
    // tied up (15.3 - 17)
    if (!late && t >= T.T_TIED && t < T.T_CUT + 0.1) for (let k = 0; k < 2; k++) s.fx("rope", 60, 60, rope, jx, D + 1.1 + 0.55 * k, 0.9, 1.5, 1.5, { rot: 0.05 * Math.sin(t * 8 + k) });

    // ---- the Spanish officer ----
    let oex: Expr = "stern", oarms: FrontOpts["arms"] = { l: [-0.5, 0.35], r: [0.5, 0.35] }, obn: Bn = idle(t, 2, 1.5), ox = 1.1;
    const slice = (t0: number) => { const a = t - t0, pre = clamp01((a + 0.45) / 0.45), hit = a >= 0 && a < 0.35 ? Math.sin(Math.PI * a / 0.35) : 0, rec = a > 0 ? Math.min(1, a / 0.8) : 0; if (a < -0.45 || a > 0.8) return; ox = 1.1 - 0.45 * hit; oarms = { l: [-0.5, 0.4], r: [ar(0.7 - 1.0 * hit - 0.4 * pre * (1 - hit)), ar(-0.5 - 0.8 * pre * (1 - rec) + 0.35 * hit)] }; obn = { dy: 0, sx: 1 + 0.07 * hit - 0.05 * pre, sy: 1 - 0.05 * hit + 0.04 * pre, lean: 0.2 * hit - 0.1 * pre * (1 - hit) }; oex = a > 0 ? "laugh" : "stern"; };
    if (!late) {
      if (t < 7.2) { slice(T.T_SLICE); if (t > T.T_SLICE + 0.9) { oex = "laugh"; const w = Math.sin(t * 6); obn = { dy: 0.03 * Math.abs(w), sx: 1, sy: 1 + 0.02 * w, lean: 0.03 * w }; oarms = { l: [-0.5, ar(-0.3 + 0.2 * w)], r: [0.5, ar(-0.9 + 0.1 * w)] }; } }
      else if (t < T.T_CUBA + 0.2) ox = 99;
      else if (t < 14.4) { const u = clamp01((t - T.T_CUBA - 0.2) / 1.5); if (u < 1) { ox = lerp(10, 1.9, glide(u)); stride(2, SOFF, "soff", ox, 0.4, "stern", -1, 1.5, { l: [-0.45, 0.2], r: [0.45, 0.2] }, 1.25, D); ox = 99; } else { ox = 1.9; if (t >= T.T_SEARCH) { const w = Math.sin(t * 3.4); oarms = { l: [-0.5, ar(0.3 + 0.15 * w)], r: [0.5, 0.35] }; obn = { dy: 0, sx: 1, sy: 1 + 0.01 * w, lean: 0.04 * w }; } } }
      else if (t < 22.8) {
        oex = t < T.T_DRAW ? "stern" : "grin";
        if (t < T.T_DRAW) { const w = Math.sin(t * 7); oarms = { l: [-0.55, ar(-0.7 + 0.2 * w)], r: [0.55, ar(-0.7 - 0.2 * w)] }; obn = { dy: 0.03 * Math.abs(w), sx: 1, sy: 1, lean: 0.04 * w }; }
        else if (t < T.T_CUT - 0.5) { const a = clamp01((t - T.T_DRAW) / 0.4); oarms = { l: [-0.5, 0.4], r: [0.55, ar(-0.2 - 0.8 * a)] }; }
        else slice(T.T_CUT);
        if (t >= 18.5) { const w = Math.sin(t * 3); oex = "grin"; oarms = { l: [-0.5, 0.4], r: [0.5, ar(-0.2 + 0.3 * w)] }; obn = idle(t, 2, 1.5); ox = 1.0; }
      }
      else ox = 2.4;
    } else ox = 99;
    if (t >= T.T_CTA - 0.2) ox = 99;
    if (ox < 50 && !late) who(2, SOFF, "soff", ox, 0.4, oex, { arms: oarms }, 1.25, obn, D);
    for (const t0 of [T.T_SLICE, T.T_CUT]) {
      if (late) break;
      if (t >= t0 - 0.02 && t < t0 + 0.32) s.fx("slash", 200, 200, slashC, 0.2, D + 2.7, 1.1, 1.5, 1.5, { rot: -0.2 });
      const a = t - (t0 + 0.12), u = a / 1.7;
      if (u > 0 && u < 1.0) { const e = 1 - (1 - u) * (1 - u); s.fx("ear", 140, 180, earC, lerp(-0.7, -3.4, u), D + 2.2 + 3.4 * Math.sin(Math.PI * Math.min(1, u * 1.05)) * (1 - 0.2 * u), 1.0 + 0.4 * e, 0.72, 0.9, { rot: u * 9 }); }
      if (u >= 1.0 && t0 === T.T_SLICE && t < 7.2) s.fx("ear2", 140, 180, earC, -3.4, D + 0.35, 1.4, 0.72, 0.9, { rot: 0.7 });
      if (t >= t0 + 0.1 && t < t0 + 1.4) { const e = pop(t - t0 - 0.1, 0.5); s.fx("ouch", 600, 240, plate("OUCH!", "", "#c92a2e", "#ffffff"), jx - 0.1, D + 3.2, 1.6, 2.2 * e, 0.88 * e, { rot: -0.06 }); }
    }
    if (!late) {
      // labels: this is Jenkins' own account
      plateAt("y1731", "1731", "", "#2a1a10", "#ffd84a", 0.2, 2.3, 0.2, D + 3.2, 1.5, 2.4, -0.03);
      plateAt("acc", "ACCORDING TO", "JENKINS...", "#6a1a1a", "#ffe9a0", 2.35, 3.75, 0.0, D + 3.2, 1.6, 2.8, -0.03);
      if (t >= T.T_WARC - 0.2 && t < 7.4) { const e = pop(t - T.T_WARC + 0.2, 0.45); s.fx("wr", 600, 240, plate("A WAR!", "", "#c92a2e", "#ffffff"), 0, D + 3.2, 1.6, 3.2 * e, 1.28 * e, { rot: -0.04 }); for (let k = 0; k < 2; k++) s.fx("swd", 200, 180, swords, -3.2 + 6.4 * k, D + 4.0, 1.4, 1.3 * e, 1.2 * e, { rot: 0.1 * Math.sin(t * 5 + k) }); }
      for (let k = 0; k < 2; k++) { if (t >= 22.8 || (t >= 7.2 && t < T.T_CUT + 2)) who(10 + k, BSAIL(k), `bs${k}`, -3.5 + 1.3 * k, -1.4, t < T.T_SLICE ? "nervous" : "shock", { arms: { l: [-0.4, 0.4], r: [0.4, 0.4] } }, 1.1, idle(t, 10 + k, 1.5), D); else if (t < 7.2) who(10 + k, BSAIL(k), `bs${k}`, -3.5 + 1.3 * k, -1.4, t < T.T_SLICE ? "nervous" : "shock", { arms: { l: [-0.4, 0.4], r: [0.4, 0.4] } }, 1.1, idle(t, 10 + k, 1.5), D); }
      if (t < T.T_SLICE) for (let k = 0; k < 3; k++) idleW(20 + k, SSAIL(k), `ss${k}`, 2.8 + 1.1 * k, -1.2 - 0.4 * (k % 2), "stern", 1.1, D, { l: [-0.5, 0.3], r: [0.5, -0.3] });
      if (t >= T.T_SLICE && t < 7.2) for (let k = 0; k < 3; k++) { const w = Math.sin(t * 5 + k * 1.3); who(20 + k, SSAIL(k), `ss${k}`, 2.8 + 1.1 * k, -1.2 - 0.4 * (k % 2), "laugh", { arms: { l: [-0.5, ar(-0.5 + 0.2 * w)], r: [0.5, ar(-0.6 - 0.2 * w)] } }, 1.1, hop(t, 20 + k, 1.2, 0.08), D); }
      // coast guard boarding and searching (11.3 - 14.4)
      if (t >= T.T_CUBA + 0.2 && t < 14.4) for (let k = 0; k < 3; k++) {
        const u = clamp01((t - T.T_CUBA - 0.2 - 0.12 * k) / 1.5), tx = 3.0 + 1.1 * k, x = lerp(11 + k, tx, glide(u));
        if (u < 1) stride(20 + k, SSAIL(k), `ss${k}`, x, -0.8 - 0.4 * (k % 2), "stern", -1, 1.6, { l: [-0.45, 0.2], r: [0.45, -0.3] }, 1.1, D);
        else if (t < T.T_SEARCH) idleW(20 + k, SSAIL(k), `ss${k}`, tx, -0.8 - 0.4 * (k % 2), "stern", 1.1, D, { l: [-0.5, 0.3], r: [0.5, -0.3] });
        else { const a = pulse((t * 1.4 + hh(k, 2)) % 1, 0.7), w = Math.sin(t * 4 + k); who(20 + k, SSAIL(k), `ss${k}`, lerp(tx, 1.2 + 1.2 * k, 0.5), 0.0 + 0.5 * (k % 2), "stern", { arms: { l: [-0.5, ar(0.0 + 0.3 * w)], r: [0.5, ar(0.2 - 0.3 * a)] }, headTilt: ar(0.06 * w) }, 1.1, { dy: 0, sx: 1, sy: 1 - 0.07 * a, lean: 0.12 * a * (k % 2 ? 1 : -1) }, D); }
      }
      if (t >= T.T_SEARCH && t < 14.4) { s.fx("chest", 200, 180, chestC, 2.0, D + 0.9, 1.6, 1.8, 1.6); if (t >= T.T_SMUG) qm(3.4, D + 3.4, 1.4, T.T_SMUG, 0, 1.0); }
      if (t >= T.T_CUBA - 0.1 && t < 13.0) { const e = pop(t - T.T_CUBA + 0.1, 0.4); s.fx("cuba", 600, 240, plate("CUBA", "", "#2a1a10", "#ffd84a"), 5, D + 3.4, -1.0, 3.2 * e, 1.28 * e, { rot: 0.03 }); }
      plateAt("capt", "ROBERT", "JENKINS", "#2a3f8a", "#ffffff", T.T_CAPT, 9.8, jx, D + 3.2, 1.2, 2.7, -0.03);
      plateAt("reb", "THE", "REBECCA", "#2a3f8a", "#ffffff", 9.8, 11.2, jx + 0.3, D + 3.2, 1.2, 2.5, 0.03);
      plateAt("smug", "SMUGGLERS?", "", "#6a1a1a", "#ffffff", T.T_SMUG, 14.4, 1.8, D + 3.2, 1.6, 3.0, 0.04);
      // Jenkins' version labels
      plateAt("ver", "JENKINS'", "VERSION", "#6a1a1a", "#ffe9a0", T.T_SAID, T.T_DRAW, 0.0, D + 3.2, 1.6, 2.6, -0.03);
      plateAt("tie", "TIED UP!", "", "#2a1a10", "#ffffff", T.T_TIED + 0.0, T.T_DRAW, jx - 0.5, D + 3.2, 1.6, 2.3, 0.03);
      if (t >= T.T_TOLD && t < 22.8) { plateAt("gt", "GO TELL", "YOUR KING:", "#7a1a1a", "#ffe9a0", T.T_GOTELL, T.T_SAME, 1.0, D + 3.2, 1.6, 2.6, 0.03); plateAt("hn", "I'LL DO THE", "SAME TO HIM!", "#c92a2e", "#ffffff", T.T_SAME, 22.8, 1.0, D + 3.2, 1.6, 2.7, -0.03); plateAt("claim", "(HIS CLAIM)", "", "#2a1a10", "#ffd84a", T.T_TOLD, T.T_GOTELL, 1.0, D + 3.2, 1.6, 2.6, 0.02); }
      if (t >= T.T_SAID && t < T.T_CUT) for (let k = 0; k < 2; k++) s.fx("bg", 120, 120, bang, 0.2 + 2.0 * k, D + 3.0 + 0.15 * Math.sin(t * 5 + k), 1.4, 0.7 * pop(t - T.T_SAID - 0.3 * k), 0.7 * pop(t - T.T_SAID - 0.3 * k));
      // legend: the jar (22.9 - 26.9)
      if (t >= T.T_LEGEND && t < T.T_JAR - 0.3) { plateAt("lg", "LEGEND SAYS...", "", "#3a2a6a", "#ffffff", T.T_LEGEND, T.T_JAR - 0.3, jx + 0.3, D + 3.2, 1.4, 3.2, 0.03); qm(jx + 1.8, D + 3.0, 1.2, T.T_LEGEND + 0.3, 0, 1.0); }
      if (t >= T.T_JAR - 0.4 && t < 26.9) { const a = t - T.T_JAR, e = pop(a, 0.4), glow = 1 + 0.06 * Math.sin(t * 4); s.fx("jarg", 200, 200, glowC("255,230,150"), jx + 1.0, D + 2.4, 1.0, 2.2 * glow, 2.2 * glow, { soft: true }); s.fx("jar", 180, 220, jarC, jx + 1.0, D + 2.4 + 0.08 * Math.sin(t * 3), 1.2, 1.2 * e, 1.45 * e, { rot: -0.05 + 0.04 * Math.sin(t * 2.4) }); }
    }
    // ----- 83 - 88: "the ear was just an excuse; the real fight was about trade" -----
    if (late && t < T.T_CTA - 0.2) {
      const g = 1 + 0.05 * Math.sin(t * 3);
      s.fx("eg", 200, 200, glowC("255,214,120"), -2.2, D + 2.6, 0.6, 3.0 * g, 3.0 * g, { soft: true });
      s.fx("bigear", 140, 180, earC, -2.2, D + 2.6 + 0.1 * Math.sin(t * 3), 1.0, 1.2, 1.5, { rot: 0.1 * Math.sin(t * 2) });
      who(2, SOFF, "soff", 1.9, 0.4, "smile", { arms: { l: [-0.5, 0.35], r: [0.5, 0.35] } }, 1.25, idle(t, 2, 1.5), D);
      plateAt("exc", "JUST AN", "EXCUSE!", "#c92a2e", "#ffffff", T.T_EXC, T.T_TRADE - 0.2, -0.3, 4.4, 1.4, 2.6, -0.03);
      if (t >= T.T_TRADE - 0.2) {
        plateAt("trd", "THE REAL FIGHT:", "TRADE!", "#2a3f8a", "#ffd84a", T.T_TRADE, T.T_CTA - 0.2, 0, D + 4.8, 1.4, 3.6, 0.03);
        for (let k = 0; k < 3; k++) s.fx("chest", 200, 180, chestC, -3 + 3 * k, D + 0.9, -1.8, 1.5, 1.3);
        for (let k = 0; k < 10; k++) { const u = (t * 0.45 + hh(k, 2)) % 1; s.fx("coin", 120, 120, coin, -3.5 + 7 * hh(k, 3), D + 6.4 * (1 - u), 0.2, 0.55, 0.55, { rot: t * 4 + k }); }
        for (let k = 0; k < 2; k++) s.fx(`shp${k}`, 300, 300, shipC(k ? "#f1c232" : "#c8352a"), -5.6 + 11.2 * k, D + 1.1 + 0.15 * Math.sin(t * 1.7 + k), -3.5, 2.6, 2.6, {});
      }
    }
    // ----- finale (CTA) -----
    if (t >= T.T_CTA - 0.2) {
      const g = 1 + 0.08 * Math.sin(t * 3), fol = t >= T.T_FOLLOW;
      s.fx("pg", 200, 200, glowC("255,214,120"), 0, D + 5.4, -1.0, 7.0 * g, 7.0 * g, { soft: true });
      s.fx("pear", 140, 180, earC, 0, D + 5.4 + 0.1 * Math.sin(t * 2.4), -0.8, 2.6 * pop(t - T.T_CTA + 0.2, 0.4), 3.3 * pop(t - T.T_CTA + 0.2, 0.4), { rot: 0.08 * Math.sin(t * 1.8) });
      s.fx("pcr", 120, 100, crownC2, 0.1, D + 7.2 + 0.1 * Math.sin(t * 2.4), -0.8, 1.3, 1.1, { rot: 0.1 * Math.sin(t * 2) });
      for (let k = 0; k < 6; k++) { const u = (t * 0.35 + k / 6) % 1; s.fx("star", 70, 70, starC, -3 + 6 * hh(k, 2), D + 2 + 4 * u, 0.6, 0.35, 0.35, { rot: t + k }); }
      const crew: [Outfit, string][] = [[SOFF, "soff"], [SSAIL(0), "ss0"], [BSAIL(0), "bs0"], [BSAIL(1), "bs1"], [SSAIL(1), "ss1"], [LORD(0), "lord0"]];
      for (let k = 0; k < 6; k++) { const x = (k < 3 ? -1 : 1) * (1.2 + 1.1 * (k % 3)) + (k < 3 ? -0.4 : 0.4), z = -0.8 + 0.8 * (k % 2); if (fol) cheer(30 + k, crew[k][0], crew[k][1] + "c", x, z, 1.4, 0.14, 1.1, D); else idleW(30 + k, crew[k][0], crew[k][1] + "c", x, z, "smile", 1.1, D, { l: [-0.5, 0.3], r: [0.55, ar(-0.6 + 0.3 * Math.sin(t * 4 + k))] }); }
      confetti(fol ? 24 : 10, 0, 0, 12, 9); if (fol) for (let k = 0; k < 5; k++) { const u = (t * 0.6 + k / 5) % 1; s.fx("hrt", 100, 100, heart, -2 + k, D + 2 + 4 * u, 1.6, 0.5, 0.5); }
    }
  }

  // ====================================================== LONDON STREET (x = -40) ======================================================
  if ((t >= 25.8 && t < 27.9) || (t >= 34.6 && t < 38.6) || (t >= 45.4 && t < 52.4)) {
    const lx = T.LX;
    if (t < 27.9) { const u = clamp01((t - 26.0) / 1.6), x = lerp(lx + 6, lx - 5, glide(u)); stride(40, JEN, "jenL", x, 1.0, "pained", -1, 1.6, { l: [-0.3, -0.9], r: [0.4, 0.3] }, 1.25, 0); s.fx("jarL", 180, 220, jarC, x + 0.9, 2.5, 1.2, 1.0, 1.2, { rot: 0.05 * Math.sin(t * 6) }); plateAt("lon", "ENGLAND", "", "#2a1a10", "#ffd84a", T.T_ENG, 27.9, lx - 1.0, 6.0, 1.2, 3.0, -0.03); }
    else if (t < 38.6) {
      for (let k = 0; k < 12; k++) { const x = lx - 5.4 + 0.95 * k + 0.25 * hh(k, 2), z = -0.6 + 0.9 * (k % 3) + 0.25 * hh(k, 4); shout(50 + k, CITIZEN(k), `lc${k % 4}`, x, z, 1.2, 1.15, 0, k % 4 === 0 ? "fork" : null); }
      for (let k = 0; k < 4; k++) flame(lx - 4.2 + 2.6 * k, 4.0 + 0.1 * Math.sin(t * 5 + k), -1.2, 0.9, k);
      for (let k = 0; k < 3; k++) s.fx("news", 160, 120, (p) => { p.poly(rr(10, 10, 150, 110, 6), "#f4efe0", 6); for (let i = 0; i < 5; i++) p.stroke([[24, 30 + i * 16], [136, 30 + i * 16]], 4, "#5a5a60"); const g = p.g; font(g, 20); g.fillStyle = "#c92a2e"; g.fillText("REVENGE!", 80, 24); }, lx - 3 + 3 * k, 4.6 + 0.2 * Math.sin(t * 3 + k), -1.6, 1.3 * pop(t - T.T_PRESS - 0.15 * k), 1.0 * pop(t - T.T_PRESS - 0.15 * k), { rot: 0.1 * Math.sin(t * 3 + k) });
      plateAt("rev", "REVENGE!", "", "#c92a2e", "#ffffff", T.T_REV - 0.4, 38.6, lx, 6.4, 1.2, 3.6, -0.03);
    } else {
      // 1858: the writer Thomas Carlyle names the war
      const CARL: Outfit = { jacket: "#4a3a2a", pants: "#3a3a30", boots: "#1a1a20", hat: null, moustache: "#8a8a8a", skin: SKINS[0], build: "adult" };
      const w = Math.sin(t * 3);
      who(130, CARL, "carl", lx, 1.2, t >= T.T_NAMED ? "grin" : "neutral", { arms: { l: [-0.5, 0.3], r: [0.5, ar(-0.3 + 0.3 * w)] }, ...(t >= T.T_CARL ? { held: "scroll" as const } : {}) }, 1.3, idle(t, 130, 1.5), 0);
      plateAt("y58", "1858", "", "#2a1a10", "#ffd84a", T.T_1858, T.T_CARL, lx, 4.8, 1.2, 2.6, -0.03);
      plateAt("car", "THOMAS", "CARLYLE", "#2a3f8a", "#ffffff", T.T_CARL, T.T_NAMED, lx, 4.7, 1.4, 2.8, 0.03);
      if (t >= T.T_NAMED - 0.2) {
        const g = 1 + 0.05 * Math.sin(t * 4);
        s.fx("eg3", 200, 200, glowC("255,214,120"), lx, 3.0, 1.0, 4.6 * g, 4.6 * g, { soft: true });
        s.fx("ear4", 140, 180, earC, lx + 1.8, 2.8 + 0.12 * Math.sin(t * 2.4), 1.4, 1.5 * pop(t - T.T_NAMED, 0.45), 1.9 * pop(t - T.T_NAMED, 0.45), { rot: 0.1 * Math.sin(t * 2) });
        plateAt("woj", "WAR OF", "JENKINS' EAR", "#c92a2e", "#ffffff", T.T_NAMED, 52.4, lx, 5.0, 1.6, 3.4, -0.03);
      }
    }
  }

  // ====================================================== PARLIAMENT (x = -80) ======================================================
  const inPar = (t >= 27.4 && t < 35.0) || (t >= 38.0 && t < 45.6);
  if (inPar) {
    const px = T.PX, doubt = t >= T.T_DOUBT && t < 35.0, decl = t >= T.T_DECL;
    for (let k = 0; k < 6; k++) {
      const sg = k < 3 ? -1 : 1, x = px + sg * (2.3 + 1.2 * (k % 3)) + 0.2 * hh(k, 2), z = -2.6 - 0.4 * (k % 2), rt = t - T.T_HOLD - 0.06 * k;
      if (decl) cheer(60 + k, LORD(k), `lord${k % 4}`, x, z, 1.3, 0.12, 1.1, 0);
      else if (doubt) { const w = Math.sin(t * 6 + k); who(60 + k, LORD(k), `lord${k % 4}`, x, z, "stern", { arms: { l: [-0.5, 0.35], r: [0.5, 0.35] }, headTilt: ar(0.22 * w) }, 1.1, idle(t, 60 + k, 1.5), 0); }
      else if (t >= T.T_HOLD && t < T.T_DOUBT) who(60 + k, LORD(k), `lord${k % 4}`, x, z, "shock", { arms: { l: [-0.55, -0.6], r: [0.55, -0.6] } }, 1.1, { dy: 0.06 * pulse(rt, 0.5), sx: 1 + 0.04 * pulse(rt, 0.5), sy: 1 - 0.03 * pulse(rt, 0.5), lean: sg * 0.03 * pulse(rt, 0.6) }, 0);
      else idleW(60 + k, LORD(k), `lord${k % 4}`, x, z, t >= 38.0 ? "stern" : "neutral", 1.1, 0);
    }
    who(70, LORD(3), "speaker", px, -8.0, "stern", { arms: { l: [-0.5, 0.35], r: [0.5, 0.35] } }, 1.15, idle(t, 70, 1.5), 1.35, false);
    if (t < 35.0) {
      const u = clamp01((t - 28.4) / 1.3), z = lerp(8.0, 1.4, glide(u)), up = clamp01((t - T.T_HOLD + 0.2) / 0.5);
      if (u < 1) stride(41, JEN, "jenP", px, z, "stern", 0, 1.4, { l: [-0.4, 0.3], r: [0.5, 0.0] }, 1.25, 0);
      else who(41, JEN, "jenP", px, 1.4, doubt ? "nervous" : "stern", { arms: { l: [-0.45, 0.35], r: [0.55, ar(0.0 - 0.95 * up)] } }, 1.25, { dy: 0.04 * pulse(t - T.T_HOLD + 0.2, 0.5), sx: 1, sy: 1 + 0.03 * up, lean: -0.03 * up }, 0);
      if (t >= T.T_HOLD - 0.3) { const e = pop(t - T.T_HOLD + 0.3, 0.4), g = 1 + 0.06 * Math.sin(t * 4); s.fx("jgl", 200, 200, glowC("255,230,150"), px + 1.0, 4.5, 1.4, 2.8 * g, 2.8 * g, { soft: true }); s.fx("jarP", 180, 220, jarC, px + 1.0, 4.4 + 0.06 * Math.sin(t * 3), 1.6, 1.5 * e, 1.8 * e, { rot: -0.06 + 0.04 * Math.sin(t * 2.6) }); }
      plateAt("y38", "1738", "", "#2a1a10", "#ffd84a", T.T_1738, T.T_QUEST, px, 7.0, 0.5, 3.0, -0.03);
      plateAt("qs", "QUESTIONED BY", "PARLIAMENT", "#2a3f8a", "#ffffff", T.T_QUEST, T.T_LEG2, px, 6.6, 0.5, 3.4, 0.03);
      plateAt("lgd", "LEGEND:", "HE SHOWED THE EAR!", "#3a2a6a", "#ffffff", T.T_LEG2, T.T_DOUBT, px, 6.8, 0.5, 3.8, -0.03);
      plateAt("hd", "HISTORIANS", "DOUBT IT!", "#6a1a1a", "#ffffff", T.T_DOUBT, 34.6, px, 6.8, 0.5, 3.4, 0.03);
      if (doubt) for (let k = 0; k < 3; k++) qm(px - 2.6 + 2.6 * k, 4.4, -1.6, T.T_DOUBT + 0.1, k, 1.0);
    }
    if (t >= 38.0) {
      const sh = t >= T.T_NOWAR && t < 41.6 ? Math.sin(t * 7) : 0, sad = t >= T.T_DECL;
      who(71, WALP, "walp", px - 0.8, 0.6, t < T.T_NOWAR ? "neutral" : sad ? "pained" : "stern", { arms: { l: [-0.5, 0.35], r: [0.5, 0.35] }, headTilt: ar(0.22 * sh) }, 1.3, { dy: 0, sx: 1, sy: sad ? 0.96 : 1, lean: 0.03 * sh }, 0);
      plateAt("pm", "PRIME MINISTER", "WALPOLE", "#2a3f8a", "#ffffff", T.T_WALP + 0.2, T.T_NOWAR, px - 0.8, 4.7, 1.4, 2.7, -0.03);
      plateAt("nw", "NO WAR!", "", "#6a1a1a", "#ffffff", T.T_NOWAR, 41.9, px - 0.6, 5.0, 1.4, 2.7, 0.03);
      plateAt("y39", "1739", "", "#2a1a10", "#ffd84a", T.T_1739, T.T_DECL, px, 6.3, 1.0, 2.4, -0.03);
      if (t >= T.T_DECL && t < 45.6) { const e = pop(t - T.T_DECL, 0.45); s.fx("scr", 300, 160, scroll("WAR ON SPAIN"), px + 0.4, 3.6 + 0.08 * Math.sin(t * 3), 1.8, 2.3 * e, 1.23 * e, { rot: -0.03 }); plateAt("dec", "WAR!", "", "#c92a2e", "#ffffff", T.T_DECL + 0.5, 45.6, px, 6.0, 1.4, 2.6, 0.03); }
    }
  }

  // ====================================================== CARTAGENA (x = -120) ======================================================
  if (t >= 52.0 && t < 83.4) {
    const wx = T.WX, fx0 = T.FORT_X;
    const ships = (n: number, t0: number, flag: string, hullc: string, zs: number[], xs: number[], sink = 1e9, k0 = 0) => { for (let k = 0; k < n; k++) { const u = clamp01((t - t0 - 0.11 * k) / 3.2); if (t < t0) continue; const x = lerp(xs[k] + 22, xs[k], glide(u)), zz = zs[k], bobY = 0.12 * Math.sin(t * 1.7 + k * 1.3), sk = clamp01((t - sink - 0.18 * k) / 2.0), y = 2.0 - 3.4 * sk * sk + bobY; if (y < -1.5) continue; s.fx(`sh${flag}${k0 + (k % 3)}`, 300, 300, shipC(flag, hullc), x, y, zz, 4.2, 4.2, { rot: 0.05 * Math.sin(t * 1.4 + k) + 0.5 * sk }); if (u > 0 && u < 1) s.fx("wv", 160, 80, wavesC, x - 2.0, 0.25, zz + 0.9, 1.6, 0.8, {}); } };
    const VX = wx + 10.0;
    if (t < 55.6) { const pt = 0.2 * Math.sin(t * 3); plateAt("y41", "1741", "", "#2a1a10", "#ffd84a", T.T_1741, 54.0, VX, 5.0, 1.8, 2.6, 0.03); who(80, VERN, "vern", VX, 1.0, "grin", { arms: { l: [-0.5, 0.35], r: [ar(0.9), ar(-0.5 + 0.1 * Math.sin(t * 3))] } }, 1.3, add(idle(t, 80, 1.5), { dy: 0, sx: 1, sy: 1, lean: 0.03 * pt }), 0); plateAt("vern", "ADMIRAL", "VERNON", "#2a3f8a", "#ffffff", T.T_VERN - 0.3, 55.6, VX, 4.8, 1.8, 2.6, -0.03); ships(3, 52.8, "#c8352a", "#4a3022", [-5, -7, -9], [wx + 2, wx - 2, wx - 6], 1e9, 0); }
    if (t >= 54.0 && t < 68.0) {
      plateAt("cart", "CARTAGENA", "", "#c92a2e", "#ffffff", T.T_CART, 57.3, wx - 4, 9.0, -6, 5.6, 0.03);
      const n = t < 57.0 ? 6 : 14, zs = [-5, -7, -9, -6, -8, -10, -12, -11, -13, -5.5, -9.5, -12.5, -7.5, -10.5], xs = [-2, -6, -10, -14, -18, -22, -4, -8, -12, 0, -16, -20, 2, -24].map((x) => wx - 4 + (x + 10) * 0.45);
      ships(n, 54.0, "#c8352a", "#4a3022", zs, xs, 68.2, 0);
      if (t >= T.T_180 - 0.2 && t < 58.8) { const e = pop(t - T.T_180, 0.4); s.fx("p200", 600, 240, plate("ABOUT", "180 SHIPS", "#c92a2e", "#ffffff"), wx - 4, 8.2, -4, 5.0 * e, 2.0 * e, { rot: -0.03 }); }
    }
    // Spain: Blas de Lezo at the fort (58.8 - 68)
    if (t >= 58.5 && t < 68.4) {
      const blasX = fx0, by = 3.2, w = Math.sin(t * 3);
      const pose = t >= T.T_WON ? "laugh" : t >= T.T_EYE ? "grin" : "stern";
      who(90, BLAS, "blas", blasX, -7.2, pose, { arms: { l: [-0.5, ar(0.3 + 0.1 * w)], r: [0.55, ar(-0.6 + 0.3 * w)] } }, 1.4, add(idle(t, 90, 1.5), { dy: 0, sx: 1, sy: 1, lean: 0.02 * w }), by, false);
      plateAt("blas", "BLAS", "DE LEZO", "#a83a2a", "#ffe9a0", T.T_BLAS - 0.8, T.T_SIX, blasX, 6.6, -5.6, 2.8, -0.03);
      if (t >= T.T_SIX - 0.1 && t < T.T_EYE - 0.3) {   // only six Spanish ships, about 3000 men
        for (let k = 0; k < 6; k++) s.fx(`spsh${k % 3}`, 300, 300, shipC("#f1c232", "#6a3a22"), -139 + 2.6 * (k - 2.5) + 0.0, 1.4 + 0.1 * Math.sin(t * 1.8 + k), -2.0 - 1.3 * (k % 2), 2.4, 2.4, {});
        plateAt("six", "ONLY 6 SHIPS", "", "#a83a2a", "#ffe9a0", T.T_SIX, T.T_3000, -133, 8.0, -4.0, 5.2, -0.03);
        plateAt("k3", "~3,000 MEN", "", "#a83a2a", "#ffe9a0", T.T_3000, T.T_EYE - 0.3, -133, 8.0, -4.0, 5.2, 0.03);
      }
      for (const [k, tt, kind] of [[0, T.T_EYE, "eye"], [1, T.T_ARM, "arm"], [2, T.T_LEG, "leg"]] as const) if (t >= tt - 0.1 && t < 68.4) { const e = pop(t - tt, 0.5); s.fx("one" + kind, 200, 200, oneC(kind), blasX - 1.8 + 1.8 * k, 7.4 + 0.12 * Math.sin(t * 3 + k), -6.0, 1.4 * e, 1.4 * e, { rot: 0.06 * Math.sin(t * 2 + k) }); }
      if (t >= T.T_WON) { for (let k = 0; k < 6; k++) { const x = blasX - 4.2 + 1.5 * k, z = -7.4; who(100 + k, SSAIL(k), `ssw${k}`, x, z, k % 2 ? "laugh" : "grin", { arms: { l: [-0.55, ar(-0.9 + 0.15 * Math.sin(t * 5 + k))], r: [0.55, ar(-0.9 - 0.15 * Math.sin(t * 5 + k))] } }, 1.1, hop(t, 100 + k, 1.4, 0.1), by, false); } }
    }
    if (t >= T.T_WON - 0.3 && t < 69.6) {   // Spain won: the English fleet breaks up
      const e = pop(t - T.T_WON, 0.4); s.fx("won", 600, 240, plate("SPAIN WON!", "", "#a83a2a", "#ffe9a0"), wx - 6, 8.6, -4, 4.2 * e, 1.7 * e, { rot: -0.03 });
      for (let k = 0; k < 8; k++) { const tf = T.T_WON + 0.25 * k, xb = wx - 14 + 3.2 * (k % 6) + 0.8 * hh(k, 2); burstAt(tf, xb, 2.0 + 0.6 * (k % 3), -7.0 - 0.8 * (k % 3), 2.8, 0.4, "#ffd27a"); puffAt(tf + 0.05, xb + 0.4, 2.6, -7.2, 2.0, 1.1); }
    }
    // Vernon's medals (legend) 73.2 - 78.2
    if (t >= 73.0 && t < 78.4) {
      const vx = -110.5, w = Math.sin(t * 3);
      who(81, VERN, "vern2", vx, 1.0, "grin", { arms: { l: [-0.5, 0.35], r: [ar(0.9), ar(-0.6 + 0.2 * w)] } }, 1.3, idle(t, 81, 1.5), 0);
      plateAt("lgm", "LEGEND:", "VICTORY MEDALS!", "#3a2a6a", "#ffffff", T.T_MED, T.T_BEFORE, vx, 4.4, 1.8, 2.8, -0.03);
      plateAt("bef", "BEFORE", "WINNING?", "#6a1a1a", "#ffffff", T.T_BEFORE, 78.4, vx, 4.4, 1.8, 3.0, 0.03);
      for (let k = 0; k < 5; k++) { const u = (t * 0.35 + k / 5) % 1; s.fx("med", 120, 120, coin, vx - 2.4 + 1.2 * k, 5.0 * (1 - u) + 0.6, 0.4, 0.7, 0.7, { rot: t * 3 + k }); }
      qm(vx + 1.8, 4.0, 1.0, T.T_BEFORE, 0, 1.0);
    }
  }
  // sailors die of disease (69.4 - 73): on the shore
  if (t >= 69.2 && t < 73.2) {
    const dx = -112;
    for (let k = 0; k < 6; k++) s.fx("gr", 90, 170, gravec, dx - 3.6 + 1.4 * k, 1.1, -2.4 - 0.6 * (k % 2), 0.9 * pop(t - T.T_DIED - 0.12 * k, 0.4), 1.7 * pop(t - T.T_DIED - 0.12 * k, 0.4));
    for (let k = 0; k < 3; k++) { const c = Math.sin(t * 5 + k * 2.3); who(110 + k, SICK(k), `sk${k}`, dx - 1.1 + 1.1 * k, 1.2, "pained", { headTilt: 0.2, arms: { l: [-0.3, 0.5], r: [0.3, 0.5] } }, 1.1, { dy: 0, sx: 1 + 0.015 * c, sy: 1 - 0.015 * c, lean: 0.05 * c }, 0); s.fx("sck", 100, 100, sick, dx - 1.1 + 1.1 * k, 3.4, 1.4, 0.7, 0.7); }
    plateAt("thou", "THOUSANDS", "", "#2a1a10", "#ff6a5a", T.T_DIED, T.T_DIS, dx, 4.2, 0.6, 2.3, -0.03);
    plateAt("dis", "DISEASE", "", "#3a6a3a", "#e8ffd8", T.T_DIS, 73.3, dx, 4.2, 0.6, 2.3, 0.03);
    for (let k = 0; k < 2; k++) s.fx("sk", 120, 120, skull, dx - 1.4 + 2.8 * k, 4.2 + 0.15 * Math.sin(t * 3 + k), 0.2, 0.8, 0.8, { rot: 0.1 * Math.sin(t * 3 + k) });
  }
  // the war merges into the bigger War of the Austrian Succession (78.3 - 83.2): Europe turns red
  if (t >= 78.1 && t < 83.4) {
    const mx = -116, e = pop(t - 78.3, 0.3), u = clamp01((t - 78.7) / 3.2);
    s.fx("eur", 400, 300, europe(u), mx, 5.0, -1.0, 5.4 * e, 4.05 * e, { rot: 0.0 });
    plateAt("y48", "UNTIL 1748", "", "#c92a2e", "#ffffff", T.T_1748, 83.4, mx, 1.6, 1.0, 4.0, -0.03);
    for (let k = 0; k < 3; k++) s.fx("skm", 120, 120, skull, mx - 1.8 + 1.8 * k, 8.1 + 0.15 * Math.sin(t * 3 + k), -0.6, 0.9, 0.9, { rot: 0.1 * Math.sin(t * 3 + k) });
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW; void smooth; void fxPuff; void smoke; void shotAt; void zzz; void coin; void crownC; void bolt; void clockFace; void cobweb; void cloud; void rainDrop; void bookC; void penC; void rays; void tomb; void flower; void tear; void sweat; void cake; void mug; void hbc; void think; void nope; void mapC; void stampC; void bangC; void pigC; void flagUKc; void hop; void pulse; void rr; void lerp; void bob; void calendar; void shield; void rope; void spark; void steam; void splat; void stink; void fly; void angelC; void dungBlob; void globe; void pie; void bowl; void rulerC; void cobweb; void flagUS; void sick; void gravec; void starC; void swords; void crownC2;
export type { V3, SetName, Expr, FrontOpts };
