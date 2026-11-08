// Cast of "The Defenestration of Prague": American (blue) and British (red) soldiers, the farmer, the clerk, the admiral, a German emperor, and THE PIG (a drawn card).
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
const NOBLE = (v: number, o: Partial<Outfit> = {}): Outfit => ({ jacket: ["#2a2a3a", "#3a2a4a", "#1f3a3a", "#4a2a2a"][v % 4], pants: "#2a2a30", boots: "#1a1a20", hat: "feather", moustache: ["#2a1a10", "#6a4a2a", "#3a3a3a"][v % 3], sword: true, belt: "#e8c45a", buttons: "#e8c45a", skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult", ...o });
const OFFICIAL = (v: number): Outfit => ({ jacket: "#8a2a2a", pants: "#3a2a2a", boots: "#1a1a20", hat: "wig", hair: "#eee8f0", moustache: v % 2 ? "#d8d2c6" : undefined, sash: "#e8c45a", buttons: "#e8c45a", skin: SKINS[(v + 2) % 4], build: "stout" });
const SECRETARY: Outfit = { jacket: "#3a5a3a", pants: "#3a3a30", boots: "#1a1a20", hat: "cap", cap: "#2a3a2a", belt: "#c8b070", buttons: "#d9b04a", skin: SKINS[1], build: "kid" };
const KING: Outfit = { jacket: "#7a1a1a", pants: "#3a1a1a", boots: "#1a1a20", hat: "crown", sash: "#e8c45a", moustache: "#5a3a2a", buttons: "#e8c45a", sword: true, skin: SKINS[0], build: "stout" };
const CITIZEN = (v: number): Outfit => ({ jacket: ["#3a6aa8", "#8a6a3a", "#4a8a5a", "#a85a3a"][v % 4], pants: "#5a4a3a", boots: "#3a2a1a", hat: "cap", cap: ["#2a4a7a", "#5a4a2a", "#2a5a3a", "#7a3a2a"][v % 4], skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult", ...(v % 2 ? { moustache: "#5a4a3a" } : {}) });
const IMP = (v: number): Outfit => ({ jacket: "#d8b840", pants: "#f0ece0", boots: "#2a2220", hat: "shako", belt: "#f0ece0", buttons: "#c8352a", rifle: v % 2 === 0, sword: v % 2 === 1, skin: SKINS[v % 4], build: v % 3 === 1 ? "stout" : "adult" });
const PSOL = (v: number, col = "#3a7aa8"): Outfit => ({ jacket: col, pants: "#3a3a50", boots: "#222230", hat: "cap", cap: col, belt: "#e8d8a0", buttons: "#e8c45a", sword: true, rifle: v % 3 === 0, skin: SKINS[(v + 1) % 4], build: "adult" });
const SICK = (v: number): Outfit => ({ ...CITIZEN(v), skin: "#b8d8a0" });

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

// ---------------- helpers ----------------
const ar = (v: number) => Math.round(v * 2.5) / 2.5;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const glide = T.glide;
const PX = T.PILE[0], PZ = T.PILE[2];

/** one man's trip through the window: held at the sill, anticipation, ballistic fall with spin + stretch, squash on landing, spring up out of the manure */
type Fall = { x: number; y: number; z: number; rot: number; bn: Bn; arms: FrontOpts["arms"]; expr: Expr; phase: "sill" | "air" | "pile"; sit: number; mode: "stand" | "fall" };
const fallOf = (t: number, L: number, k: number): Fall => {
  const Lk = L + 0.32 * k, D = 1.5, x0 = [-0.6, 0.6, 0][k % 3], x1 = [-1.5, 1.6, 0.1][k % 3], dz = [0.3, 0.4, 1.0][k % 3], u = (t - Lk) / D;
  const sillY = T.WIN[1], sx = T.WIN[0] + x0, wob = Math.sin(t * 26 + k * 2);
  if (u < 0) {                                                                       // at the window: dragged and squirming, then crouch before the throw
    const ant = clamp01((t - (Lk - 0.3)) / 0.3);
    return { x: sx, y: sillY, z: T.WIN[2] + 0.2, rot: 0, bn: { dy: 0, sx: 1 + 0.06 * ant, sy: 1 - 0.14 * ant, lean: 0.12 * wob * (1 - ant) + 0.1 * ant }, arms: { l: [-0.55, ar(-0.8 + 0.25 * wob)], r: [0.55, ar(-0.8 - 0.25 * wob)] }, expr: "shock", phase: "sill", sit: 0, mode: "stand" };
  }
  if (u < 1) {                                                                       // flying
    const e = u * u, ey = 1 - (1 - u) * (1 - u);
    return { x: lerp(sx, PX + x1, u), y: lerp(sillY, 1.15, e), z: lerp(T.WIN[2] + 0.2, PZ + dz, ey), rot: (k % 2 ? -1 : 1) * Math.PI * 2 * 1.6 * u, bn: { dy: 0, sx: 1 - 0.16 * u, sy: 1 + 0.3 * u, lean: 0 }, arms: { l: [-0.6, ar(-0.9 + 0.3 * wob)], r: [0.6, ar(-0.9 - 0.3 * wob)] }, expr: "shock", phase: "air", sit: 0, mode: "fall" };
  }
  const a = t - (Lk + D);                                                            // landed: big squash, then spring up with arms raised
  const sq = a < 0.14 ? a / 0.14 : 0, rec = a < 0.14 ? 0 : spr(a - 0.14, 7, 18);
  return { x: PX + x1, y: 1.1, z: PZ + dz, rot: 0, bn: { dy: 0.5 * (a > 0.14 ? Math.max(0, Math.sin(Math.min(1, (a - 0.14) / 0.5) * Math.PI)) : 0), sx: 1 + 0.25 * (a < 0.14 ? sq : 1 - Math.min(1, rec)) * (a < 0.5 ? 1 : 0), sy: a < 0.14 ? 1 - 0.4 * sq : 0.6 + 0.4 * Math.min(1.25, rec), lean: 0 }, arms: { l: [-0.55, -0.9], r: [0.55, -0.9] }, expr: a > 1.0 ? "grin" : "dazed", phase: "pile", sit: a, mode: "stand" };
};

export const stage = (f: number, cam: CamInfo): Stage => {
  const t = f / FPS, s = new S(cam, "w", t);
  const pop = (age: number, k = 0.55) => 1 + k * (1 - Math.min(1, Math.max(0, age) / 0.14)) + (age > 0 ? 0.1 * Math.exp(-6 * age) * Math.sin(age * 22) : 0);
  const puffAt = (t0: number, x: number, z: number, w = 1.6, dur = 0.9, y = 0) => { if (t >= t0 && t < t0 + dur) { const u = (t - t0) / dur; s.fx("dust", 120, 120, dustC, x, y + 0.4 + 0.8 * u, z, w * (0.5 + u), w * (0.5 + u) * 0.8, { soft: true }); } };
  const burstAt = (t0: number, x: number, y: number, z: number, w: number, dur = 0.4, col = "#fff3b0") => s.burst(t0, x, y, z, w, dur, col);
  const flameAt = (x: number, y: number, z: number, w: number, k = 0) => { const sc = 1 + 0.18 * Math.sin(t * 17 + k * 2.1); s.fx("fl", 200, 220, flameC, x, y + 0.4 * w, z, w * sc, w * 1.1 * sc, { rot: 0.08 * Math.sin(t * 11 + k) }); s.fx("fglow", 200, 200, glowC("255,170,60"), x, y + 0.4 * w, z - 0.05, w * 2.2, w * 2.2, { soft: true }); };
  const confetti = (n: number, x0: number, z0: number, w: number) => { const cols = ["#ff5a7a", "#ffd84a", "#6ab4ff", "#7be07b"]; for (let k = 0; k < n; k++) { const u = (t * 0.5 + hh(k, 2)) % 1; s.fx(`cf${k % 4}`, 40, 40, confettiC(cols[k % 4]), x0 + w * (hh(k, 3) - 0.5) + 0.5 * Math.sin(t * 3 + k), 6 * (1 - u), z0 + 3 * (hh(k, 4) - 0.5), 0.22, 0.22, { rot: t * 4 + k }); } };
  const who = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, fo: Partial<FrontOpts> = {}, sc = 1, bn: Bn = NB, y = 0, shadow = true) => s.who(i, o, ok, x, y, z, { mode: "stand", expr, ...fo }, sc, shadow, bn);
  const stride = (i: number, o: Outfit, ok: string, x: number, z: number, expr: Expr, dirx: number, speed = 1.6, arms: FrontOpts["arms"] = { l: [-0.5, 0.2], r: [0.5, 0.2] }, sc = 1, y = 0) => s.who(i, o, ok, x, y, z, { mode: "stroll", phase: q(((t * speed * 0.7 + hh(i, 4)) % 1 + 1) % 1, 12), expr, arms }, sc, true, walk(t, i, speed, dirx));
  const shout = (i: number, o: Outfit, ok: string, x: number, z: number, amt = 1, sc = 1) => { const w = Math.sin(t * 10 + i * 1.7); who(i, o, ok, x, z, "stern", { arms: { l: [-0.55, ar(-0.9 + 0.25 * w * amt)], r: [0.55, ar(-0.9 - 0.25 * w * amt)] }, headTilt: ar(0.08 * w * amt) }, sc, { dy: 0, sx: 1, sy: 1, lean: 0.03 * w * amt }); };
  const cheer = (i: number, o: Outfit, ok: string, x: number, z: number, rate = 1.6, h = 0.14, sc = 1) => { const w = Math.sin(t * 9 + i); who(i, o, ok, x, z, i % 2 ? "laugh" : "grin", { arms: { l: [-0.55, ar(-0.9 + 0.2 * w)], r: [0.55, ar(-0.9 - 0.2 * w)] } }, sc, hop(t, i, rate, h)); };

  // ============ the window scene: used three times (hook 4.6, story 36.8, finale replay 68.3) ============
  const windowScene = (L: number, showNobles: boolean, tag: string, nobleFrom: number) => {
    if (showNobles && t >= nobleFrom && t < L + 1.2) for (let k = 0; k < 4; k++) {          // the nobles at the window: grab, strain, shove
      const x = T.WIN[0] + [-2.1, -1.2, 1.2, 2.1][k], push = clamp01((t - (L - 0.1)) / 0.2), pull = clamp01((t - (L - 0.45)) / 0.3) * (1 - push), w = Math.sin(t * 15 + k * 1.9);
      who(70 + k, NOBLE(k), `${tag}nb${k}`, x + 0.4 * push * (k < 2 ? 1 : -1), T.WIN[2] + 0.6, "stern", { arms: { l: [-0.5, ar(-0.6 + 0.3 * w)], r: [0.5, ar(-0.6 - 0.3 * w)] }, headTilt: ar(0.12 * w) }, 1.1, { dy: 0, sx: 1 + 0.08 * pull - 0.06 * push, sy: 1 - 0.1 * pull + 0.08 * push, lean: -0.16 * pull * (k < 2 ? 1 : -1) + 0.2 * push * (k < 2 ? 1 : -1) }, T.WIN[1]);
    }
    for (let k = 0; k < 3; k++) {
      const fl = fallOf(t, L, k); if (t < nobleFrom - 0.5 && fl.phase === "sill") continue;
      const o = k < 2 ? OFFICIAL(k) : SECRETARY;
      const fo: Partial<FrontOpts> = { mode: fl.mode, expr: fl.expr, arms: fl.mode === "fall" ? undefined : fl.arms };
      s.who(80 + k, o, `${tag}of${k}${fl.phase}${fl.mode}`, fl.x, fl.y, fl.z, { mode: fl.mode, expr: fl.expr, ...(fl.mode === "fall" ? {} : { arms: fl.arms }) }, k < 2 ? 1.05 : 0.95, fl.phase !== "sill", { ...fl.bn, lean: fl.bn.lean + fl.rot });
      void fo;
      const Lk = L + 0.32 * k;
      if (t >= Lk + 1.5 && t < Lk + 1.5 + 0.9) { const a = (t - Lk - 1.5) / 0.9; s.fx("spl", 300, 300, splat(q(a, 8)), PX + [-1.5, 1.6, 0.1][k], 1.1 + 0.2 * a, PZ + [0.3, 0.4, 1.0][k] + 0.5, 3.4, 2.6, { soft: true }); }
      if (t >= Lk + 1.5 && t < Lk + 2.4) for (let m = 0; m < 6; m++) { const a = (t - Lk - 1.5) / 0.9, ang = (m / 6) * 6.28 + k, r = 2.2 * a; s.fx("db", 80, 80, dungBlob, PX + [-1.5, 1.6, 0.1][k] + Math.cos(ang) * r, 1.3 + 2.4 * Math.sin(Math.PI * a) * (0.5 + 0.5 * hh(m, 3)) - 0.4 * a, PZ + 1.0 + Math.sin(ang) * r * 0.6, 0.35, 0.3, { rot: t * 6 + m }); }
    }
    if (t >= L && t < L + 1.9) s.fx("rl", 120, 600, rulerC, T.WIN[0] + 3.6, 7.2, T.WIN[2] + 1.2, 0.8, 4.0 * 3.0 / 3, { rot: 0 });
    if (t >= L + 1.5 && t < L + 2.5) s.fx(`splp${tag}`, 600, 240, plate("SPLAT!", "", "#6a4a2a", "#ffffff"), PX, 3.6, PZ + 2.2, 3.4 * pop(t - L - 1.5, 0.4), 1.36 * pop(t - L - 1.5, 0.4), { rot: -0.05 });
  };

  // ================= 0 - 12: the hook: the angry nobles, THE window, the fall, the pile =================
  if (t < 11.6) {
    if (t < 4.9) for (let k = 0; k < 9; k++) { const x = -5.2 + 1.3 * k + 0.3 * hh(k, 2), z = -3.8 + 0.9 * (k % 3) + 0.3 * hh(k, 4); shout(20 + k, NOBLE(k), `cn${k % 4}`, x, z, t > T.T_ANGRY ? 1.2 : 0.5, 1.15); }
    if (t >= T.T_ANGRY && t < 4.8) for (let k = 0; k < 3; k++) s.fx("bg", 120, 120, bang, -3 + 3 * k, 3.4 + 0.2 * Math.sin(t * 8 + k), -2, 0.9 * pop(t - T.T_ANGRY - 0.15 * k), 0.9 * pop(t - T.T_ANGRY - 0.15 * k));
    windowScene(T.T_LAUNCH, true, "h", 2.4);
    // after landing: they sit up in the manure, steam, flies, stink; "survived" cheers
    if (t >= 7.0) { for (let k = 0; k < 4; k++) s.fx("stk", 120, 160, stink, PX - 2 + 1.4 * k, 2.6 + 0.2 * Math.sin(t * 4 + k), PZ + 1.6, 0.9, 1.2, { rot: 0.1 * Math.sin(t * 3 + k) }); for (let k = 0; k < 6; k++) { const a = t * 3 + k * 1.9; s.fx("fly", 40, 40, fly, PX + 2.6 * Math.cos(a * 0.7 + k), 2.2 + 0.6 * Math.sin(a * 1.3), PZ + 0.8 + 1.4 * Math.sin(a * 0.9 + k), 0.3, 0.3); } }
    if (t >= T.T_SURV - 0.2) s.fx("hrt", 100, 100, heart, PX + 0.2, 4.4 + 0.2 * Math.sin(t * 5), PZ + 1.2, 1.1 * pop(t - T.T_SURV, 0.4), 1.1 * pop(t - T.T_SURV, 0.4));
    if (t >= T.T_MANURE - 0.2) for (let k = 0; k < 4; k++) { const u = (t * 0.5 + k / 4) % 1; s.fx("stm", 200, 200, steam, PX - 1.4 + 0.9 * k, 1.4 + 2.2 * u, PZ + 0.5, 1.4, 1.4, { soft: true }); }
    if (t >= T.T_MANURE) s.fx("mn", 600, 240, plate("MANURE!", "", "#6a4a2a", "#ffe9a0"), PX, 5.2, PZ + 1.4, 4.4 * pop(t - T.T_MANURE, 0.4), 1.76 * pop(t - T.T_MANURE, 0.4), { rot: -0.04 });
  }
  // the men in the pile keep celebrating (after landing) through the hook
  if (t >= 6.4 && t < 11.8) { /* their cards are drawn by windowScene (phase "pile") */ }

  // ================= 11.1 - 16.6: the fuse, the barrel, the war =================
  if (t >= 10.8 && t < 17.0) {
    const N = 20, x0 = PX + 3.0, z0 = PZ + 1.2, x1 = T.BARREL_X - 1.0, z1 = 0.6, u = clamp01((t - 11.6) / 1.5);
    for (let k = 0; k < N; k++) { if (k / N < u) continue; const a = k / (N - 1); s.fx("rp", 60, 60, rope, lerp(x0, x1, a), 0.25, lerp(z0, z1, a), 0.9, 0.9, {}); }
    if (u > 0 && u < 1 && t < T.T_BOOM) { const a = u; const px = lerp(x0, x1, a), pz = lerp(z0, z1, a); s.fx("spk", 60, 60, spark, px, 0.6 + 0.2 * Math.sin(t * 40), pz, 0.9, 0.9, { rot: t * 12 }); s.fx("spg", 200, 200, glowC("255,200,80"), px, 0.6, pz, 1.8, 1.8, { soft: true }); }
    if (t < T.T_BOOM + 0.1) { s.fx("brl", 120, 120, plate("WAR", "", "#2a1a10", "#ff6a4a"), T.BARREL_X, 2.8, 0.1, 1.9, 0.76, { rot: 0.05 }); }
    if (t >= T.T_BOOM) { burstAt(T.T_BOOM, T.BARREL_X, 1.6, 0.4, 9, 0.6, "#ffd27a"); burstAt(T.T_BOOM + 0.12, T.BARREL_X, 1.6, 0.6, 6, 0.5, "#ffffff"); for (let k = 0; k < 5; k++) puffAt(T.T_BOOM + 0.05 * k, T.BARREL_X - 1.5 + 0.8 * k, 0.5, 3.0, 1.4, 0.4); for (let k = 0; k < 4; k++) flameAt(T.BARREL_X - 1.5 + k, 0.5, 0.3, 1.2 + 0.2 * (k % 2), k); }
    if (t >= T.T_BOOM && t < T.T_DEADLIEST) s.fx("t30", 600, 240, plate("THIRTY YEARS'", "WAR", "#c92a2e", "#ffffff"), T.BARREL_X, 4.0, 0.8, 4.8 * pop(t - T.T_BOOM, 0.4), 1.92 * pop(t - T.T_BOOM, 0.4), { rot: -0.04 });
    if (t >= T.T_DEADLIEST - 0.2 && t < 16.8) { const e = pop(t - T.T_DEADLIEST, 0.3); s.fx("eur", 400, 300, europe(clamp01((t - T.T_DEADLIEST) / 1.6)), T.BARREL_X, 5.2, -0.4, 7.2 * e, 5.4 * e, { rot: 0.02 }); for (let k = 0; k < 3; k++) s.fx("sk", 120, 120, skull, T.BARREL_X - 2.4 + 2.4 * k, 8.6 + 0.2 * Math.sin(t * 4 + k), -0.2, 1.1, 1.1, { rot: 0.1 * Math.sin(t * 3 + k) }); }
  }

  // ================= 16.6 - 24.6: Bohemia: Protestants, a Catholic king, taken rights =================
  if (t >= 16.2 && t < 26.6) {
    const bx = T.BOH;
    for (let k = 0; k < 9; k++) { const x = bx - 5.6 + 1.3 * k + 0.3 * hh(k, 2), z = -1.2 + 0.9 * (k % 3), lead = k === 4, prot = t >= T.T_PROT - 0.2;
      const grab = lead && t >= T.T_RIGHTS, hit = grab ? spr(t - T.T_RIGHTS - 0.1, 8, 20) : 0;
      who(30 + k, CITIZEN(k), `bz${k % 4}${prot ? "p" : ""}`, x, z, grab ? "shock" : prot ? "smile" : "neutral", { arms: grab ? { l: [-0.55, -0.9], r: [0.55, -0.9] } : prot ? { l: [-0.35, 0.45], r: [0.35, 0.45] } : { l: [-0.4, 0.3], r: [0.4, 0.3] }, headTilt: grab ? 0.1 : 0 }, 1.1, grab ? { dy: 0.1 * pulse(t - T.T_RIGHTS - 0.1, 0.3), sx: 1 + 0.06 * hit, sy: 1 - 0.06 * hit, lean: -0.08 * hit } : idle(t, k, 1.5));
    }
    if (t >= T.T_BOH && t < T.T_KING + 1.6) { const e = pop(t - T.T_BOH, 0.35); s.fx("pb", 600, 240, plate("PROTESTANT BOHEMIA", "", "#2a3f8a", "#ffffff"), bx - 1, 5.6, 0.5, 6.0 * e, 1.4 * e, { rot: -0.03 }); }
    if (t >= T.T_KING - 0.3) {
      const u = clamp01((t - (T.T_KING - 0.3)) / 1.5), kx = lerp(bx + 13, bx + 1.7, glide(u));
      if (u < 1) stride(50, KING, "king", kx, 1.2, "stern", -1, 1.5, { l: [-0.5, 0.3], r: [0.5, 0.3] }, 1.35);
      else {
        const sn = clamp01((t - T.T_RIGHTS) / 0.9), lunge = pulse((t - T.T_RIGHTS) % 0.8, 0.5);
        who(50, KING, "king2", kx - 1.0 * Math.min(1, sn) * 0 - 0.9 * lunge, 1.2, "stern", { arms: { l: [-0.55, ar(-0.5 - 0.4 * lunge)], r: [0.55, ar(-0.5 - 0.4 * lunge)] } }, 1.35, t >= T.T_RIGHTS ? { dy: 0, sx: 1 + 0.06 * lunge, sy: 1 - 0.1 * lunge, lean: 0.14 * lunge } : idle(t, 50, 1.5));
      }
      for (let k = 0; k < 2; k++) { const gx = lerp(bx + 15 + 2.0 * k, bx + 4.2 + 2.0 * k, glide(u)); if (u < 1) stride(51 + k, IMP(k), `kg${k}`, gx, 1.8 + k, "stern", -1, 1.5, { l: [-0.5, 0.3], r: [0.5, -0.3] }, 1.1); else who(51 + k, IMP(k), `kg${k}s`, gx, 1.8 + k, "stern", { arms: { l: [-0.5, 0.3], r: [0.5, 0.3] } }, 1.1, idle(t, 51 + k, 1.5)); }
    }
    if (t >= T.T_KING && t < T.T_RIGHTS) s.fx("kp", 600, 240, plate("NEW KING: CATHOLIC", "", "#7a1a1a", "#ffe9a0"), bx + 4, 5.2, 0.5, 5.8 * pop(t - T.T_KING, 0.35), 1.4 * pop(t - T.T_KING, 0.35), { rot: 0.03 });
    if (t >= T.T_RIGHTS) for (let k = 0; k < 5; k++) { const a0 = T.T_RIGHTS + 0.35 * k, u = clamp01((t - a0) / 0.7); if (u <= 0 || u >= 1) continue; s.fx("sc", 300, 160, scroll("RIGHTS"), lerp(bx - 1.4, bx + 3.2, glide(u)), 1.5 + 2.2 * Math.sin(Math.PI * u), 1.0, 1.4, 0.75, { rot: 0.5 * Math.sin(u * 8) }); }
    if (t >= T.T_MAY - 0.2 && t < T.T_MAY + 1.8) s.fx("cal", 300, 260, calendar, bx, 4.0, 0.8, 2.6 * pop(t - T.T_MAY, 0.4), 2.25 * pop(t - T.T_MAY, 0.4), { rot: -0.04 });
  }

  // ================= 26.5 - 31: the furious crowd marches to the castle; the shouting =================
  if (t >= 26.2 && t < 36.9) {
    const u = clamp01((t - 26.6) / 2.5);
    for (let k = 0; k < 12; k++) {
      const tx = -5.5 + 1.0 * k + 0.3 * hh(k, 2), tz = -3.4 + 1.0 * (k % 4) + 0.3 * hh(k, 4), sx = T.BOH - 4 + 1.2 * (k % 6) + 3 * hh(k, 6), sz = 1.0 + 1.6 * (k % 3);
      const x = lerp(sx, tx, glide(clamp01((t - 26.6 - 0.04 * k) / 2.5))), z = lerp(sz, tz, glide(clamp01((t - 26.6 - 0.04 * k) / 2.5))), arrived = t >= 26.6 + 0.04 * k + 2.5;
      if (t < 26.6 + 0.04 * k + 2.5) stride(100 + k, NOBLE(k), `mc${k % 4}`, x, z, "stern", -1, 2.4, { l: [-0.55, -0.9], r: [0.55, -0.9] }, 1.1);
      else if (t < 36.0) shout(100 + k, NOBLE(k), `cn${k % 4}`, x, z, t > T.T_SHOUT ? 1.5 : 1.0, 1.15);
      else cheer(100 + k, NOBLE(k), `cn${k % 4}`, x, z, 1.5, 0.16, 1.15);
      void arrived;
    }
    if (t >= T.T_DEMAND - 0.1 && t < T.T_SHOUT + 2.2) for (let k = 0; k < 3; k++) s.fx("q", 120, 120, qmark, -3 + 3 * k, 3.6 + 0.2 * Math.sin(t * 6 + k), -2, 1.0 * pop(t - T.T_DEMAND - 0.12 * k), 1.0 * pop(t - T.T_DEMAND - 0.12 * k));
    if (t >= T.T_SHOUT && t < 36.8) for (let k = 0; k < 4; k++) { const e = (t * 1.8 + k / 4) % 1; s.fx("bg", 120, 120, bang, -4 + 2.7 * k, 3.2 + 1.5 * e, -2.4, 0.5 + 0.5 * e, 0.5 + 0.5 * e); }
    windowScene(T.T_HURL, true, "s", 32.8);
  }

  // ================= 38.1 - 44.4: angels (Catholics) vs horse dung (Protestants) =================
  if (t >= T.T_HURL + 1.2 && t < 44.8) {
    for (let k = 0; k < 4; k++) { const u = (t * 0.45 + k / 4) % 1; s.fx("stm", 200, 200, steam, PX - 1.5 + 1.0 * k, 1.5 + 2.0 * u, PZ + 0.5, 1.3, 1.3, { soft: true }); }
    for (let k = 0; k < 5; k++) { const a = t * 3 + k * 1.9; s.fx("fly", 40, 40, fly, PX + 2.8 * Math.cos(a * 0.7 + k), 2.4 + 0.6 * Math.sin(a * 1.3), PZ + 0.8 + 1.4 * Math.sin(a * 0.9 + k), 0.3, 0.3); }
    if (t >= T.T_CATH) for (let k = 0; k < 3; k++) { const e = pop(t - T.T_ANGELS - 0.1 * k, 0.4), hv = 0.25 * Math.sin(t * 4 + k * 2); s.fx("ang", 180, 200, angelC, PX - 2.4 + 2.4 * k, 4.8 + hv, PZ + 1.0, 1.6 * e, 1.8 * e, { rot: 0.1 * Math.sin(t * 3 + k) }); }
    if (t >= T.T_ANGELS) s.fx("angp", 600, 240, plate("ANGELS!", "", "#f4efe0", "#c8352a"), PX - 3.0, 6.0, PZ + 1.4, 3.4 * pop(t - T.T_ANGELS, 0.4), 1.36 * pop(t - T.T_ANGELS, 0.4), { rot: -0.05 });
    if (t >= T.T_DUNG - 0.5) s.fx("dnp", 600, 240, plate("HORSE DUNG!", "", "#6a4a2a", "#ffffff"), PX + 3.0, 6.0, PZ + 1.4, 4.4 * pop(t - (T.T_DUNG - 0.5), 0.4), 1.76 * pop(t - (T.T_DUNG - 0.5), 0.4), { rot: 0.05 });
    // the two camps react: Catholics (red hats) cheer left, Protestants (blue) laugh and point right
    for (let k = 0; k < 3; k++) { if (t >= T.T_CATH) cheer(120 + k, OFFICIAL(k + 2), `cath${k}`, -6 + 1.2 * k, 3 + 0.3 * k, 1.4, 0.12, 1.15); }
    for (let k = 0; k < 3; k++) { if (t >= T.T_PROTS) { const w = Math.sin(t * 9 + k); who(125 + k, CITIZEN(k), `prt${k}`, 4.2 + 1.2 * k, 3 + 0.3 * k, "laugh", { arms: { l: [-0.5, 0.3], r: [0.55, ar(-0.3 + 0.2 * w)] } }, 1.15, { dy: 0, sx: 1, sy: 1 + 0.02 * Math.abs(w), lean: 0.05 * w }); } }
  }
  // the three survivors remain in the pile (cards are drawn by the hook / story window scenes while their phase is "pile")
  if (t >= T.T_HURL + 1.5 && t < 44.8) for (let k = 0; k < 3; k++) { const fl = fallOf(t, T.T_HURL, k); s.who(80 + k, k < 2 ? OFFICIAL(k) : SECRETARY, `sv${k}`, fl.x, fl.y, fl.z, { mode: "stand", expr: t > T.T_PROTS ? "pained" : "grin", arms: { l: [-0.55, -0.9], r: [0.55, -0.9] } }, k < 2 ? 1.05 : 0.95, true, idle(t, 80 + k, 1.5)); }

  // ================= 44.4 - 53.6: Philipp von Hohenfall; the emperor is not amused =================
  if (t >= 44.0 && t < 53.9) {
    const hx = T.HALL, kn = t >= T.T_TITLE, tapU = t - T.T_TITLE;
    const mad = t >= T.T_EMP;
    let kb: Bn = idle(t, 60, 1.5), karms: FrontOpts["arms"] = { l: [-0.5, 0.4], r: [0.5, 0.4] };
    if (kn && !mad) { kb = { dy: 0, sx: 1 + 0.06 * pulse(tapU, 0.5), sy: 1 - 0.08 * pulse(tapU, 0.5), lean: -0.12 * pulse(tapU - 0.1, 0.5) }; karms = { l: [-0.5, 0.3], r: [0.55, ar(-0.9 + 0.7 * pulse(tapU, 0.5))] }; }
    if (mad) { const w = Math.sin(t * 14), a = t - T.T_EMP; kb = { dy: 0.05 * Math.abs(w) * clamp01(a * 3), sx: 1 + 0.05 * spr(a, 8, 20), sy: 1 - 0.05 * spr(a, 8, 20), lean: 0.06 * w * clamp01(a * 3) }; karms = { l: [-0.55, ar(-0.8 + 0.3 * w)], r: [0.55, ar(-0.8 - 0.3 * w)] }; }
    who(60, KING, "kinghall", hx, 0.6, mad ? "stern" : kn ? "smile" : "neutral", { arms: karms, headTilt: mad ? ar(0.14 * Math.sin(t * 16)) : 0 }, 1.45, kb);
    // the secretary kneels, then springs up when tapped with the sword
    const up = kn ? spr(tapU - 0.2, 8, 18) : 0;
    who(61, SECRETARY, "secH", hx - 1.3, 1.6, kn ? "grin" : "nervous", { arms: { l: [-0.4, 0.35], r: [0.4, 0.35] }, headTilt: kn ? 0.0 : 0.28 }, 1.0, kn ? { dy: 0.25 * pulse(tapU - 0.1, 0.6), sx: 1 - 0.05 * up, sy: 1 + 0.08 * Math.min(1.2, up), lean: 0 } : { dy: 0, sx: 1.04, sy: 0.88, lean: 0.12 });
    for (let k = 0; k < 4; k++) who(62 + k, k % 2 ? OFFICIAL(k) : IMP(k), `hall${k}`, hx - 6 + 4 * k + (k > 1 ? 4 : 0), 3.2 + 0.4 * (k % 2), mad ? "shock" : "smile", { arms: { l: [-0.5, 0.3], r: [0.5, 0.3] } }, 1.1, mad ? { dy: 0.1 * pulse(t - T.T_EMP - 0.05 * k, 0.4), sx: 1, sy: 1 + 0.06 * pulse(t - T.T_EMP - 0.05 * k, 0.3), lean: 0 } : idle(t, 62 + k, 1.5));
    if (kn && !mad) { burstAt(T.T_TITLE + 0.1, hx - 1.0, 2.4, 1.2, 3.6, 0.4, "#ffe9a0"); for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.28; if (tapU < 0.9) s.fx("sp", 60, 60, spark, hx - 1.3 + tapU * 2.6 * Math.cos(a), 2.6 + tapU * 2.4 * Math.sin(a), 1.6, 0.3, 0.3); } }
    if (t >= T.T_SECR && t < T.T_TITLE) s.fx("sc", 300, 160, scroll("NOBLE TITLE"), hx - 0.4, 4.0 + 0.1 * Math.sin(t * 4), 1.0, 2.2 * pop(t - T.T_SECR, 0.35), 1.2 * pop(t - T.T_SECR, 0.35), { rot: -0.04 });
    if (t >= T.T_HOHEN - 0.3 && t < T.T_EMP + 0.3) { const e = pop(t - T.T_HOHEN + 0.3, 0.35); s.fx("hoh", 600, 240, plate("PHILIPP", "VON HOHENFALL", "#2a1a10", "#ffd84a"), hx, 4.9, 1.0, 5.6 * e, 2.24 * e, { rot: -0.03 }); }
    if (t >= 50.0 && t < T.T_EMP + 0.3) { const e = pop(t - 50.0, 0.4); s.fx("shd", 200, 220, shield, hx + 3.0, 2.4, 1.2, 2.0 * e, 2.2 * e, { rot: 0.06 }); s.fx("hf", 600, 240, plate("= OF THE HIGH FALL", "", "#2a3f8a", "#ffffff"), hx, 2.6, 2.4, 5.2 * pop(t - 50.0, 0.4), 1.04 * pop(t - 50.0, 0.4), { rot: 0.03 }); }
    if (mad) for (let k = 0; k < 4; k++) { const u = (t * 1.2 + k / 4) % 1; s.fx("stm", 200, 200, steam, hx - 0.8 + 0.5 * k, 3.6 + 1.4 * u, 0.6, 0.9, 0.9, { soft: true }); }
    if (mad) s.fx("bg", 120, 120, bang, hx + 1.8, 4.2, 0.6, 1.4 * pop(t - T.T_EMP), 1.4 * pop(t - T.T_EMP));
  }

  // ================= 53.8 - 67: the war spreads across Europe =================
  if (t >= 53.4 && t < 67.4) {
    const wx = T.WAR;
    // armies march in from both sides and clash
    const nA = t < T.T_NEIGH ? 8 : 20;
    for (let n = 0; n < nA; n++) {
      const side = n % 2 ? 1 : -1, ent = T.T_ARMIES - 0.5 + 0.12 * Math.floor(n / 2) + (n >= 8 ? 1.6 : 0), u = clamp01((t - ent) / 1.9), col = ["#3a7aa8", "#d8b840", "#7a5aa8", "#4a8a5a", "#c8652a"][n % 5];
      const tx = wx + side * (1.6 + 0.9 * Math.floor(n / 4)), x = lerp(wx + side * 10, tx, glide(u)), z = -2.6 + 1.0 * (n % 5) + 0.2 * hh(n, 3), o = side < 0 ? IMP(n) : PSOL(n, col);
      if (t < ent) continue;
      if (u < 1) stride(200 + n, o, `ar${n % 5}${side}m`, x, z, "stern", -side, 2.4, { l: [-0.55, -0.85], r: [0.55, -0.85] }, 1.05);
      else { const sw = Math.sin(t * 12 + n * 1.3), ant = pulse((t * 2 + hh(n, 2)) % 1, 0.4); who(200 + n, o, `ar${n % 5}${side}f`, x, z, "stern", { arms: { l: [-0.55, -0.5], r: [0.55, ar(-0.9 + 0.8 * ant)] }, headTilt: ar(0.08 * sw) }, 1.05, { dy: 0.03 * ant, sx: 1 + 0.04 * ant, sy: 1 - 0.05 * ant, lean: 0.1 * ant * -side }); }
    }
    for (let k = 0; k < 4; k++) { const tf = 54.6 + 1.3 * k + 0.4 * (k % 2); for (let m = 0; m < 6; m++) { const ft = tf + 2.6 * m; if (t >= ft && t < ft + 0.5) { burstAt(ft, wx - 12 + 8 * k, 1.5, -4.6, 2.6, 0.4, "#ffd27a"); puffAt(ft + 0.05, wx - 12 + 8 * k + 0.6, -4.6, 1.8, 1.2, 0.6); } } }
    if (t >= T.T_NEIGH && t < T.T_WAR) for (let k = 0; k < 4; k++) { const e = pop(t - T.T_NEIGH - 0.3 * k, 0.4); s.fx("nf", 160, 120, flagUS, wx + (k % 2 ? 1 : -1) * (6 + 2.5 * k), 5.6 + 0.3 * Math.sin(t * 4 + k), -3.4, 1.6 * e, 1.2 * e, { rot: 0.1 * Math.sin(t * 4 + k) }); }
    // the map: red spreads from Prague over Europe (30 years)
    if (t >= T.T_WAR - 0.2 && t < 63.7) { const e = pop(t - T.T_WAR + 0.2, 0.3), u = clamp01((t - T.T_WAR) / 2.6); s.fx("eur2", 400, 300, europe(u), wx, 4.2, -1.2, 6.4 * e, 4.8 * e, { rot: 0.0 }); if (t >= 58.6) s.fx("y30", 600, 240, plate("30 YEARS", "", "#c92a2e", "#ffffff"), wx, 7.5, -1.0, 4.2 * pop(t - 58.6, 0.35), 1.68 * pop(t - 58.6, 0.35), { rot: -0.03 }); }
    // villages burn, villagers flee
    if (t >= T.T_VILL - 0.2 && t < T.T_FAMINE + 0.3) { for (let k = 0; k < 6; k++) { flameAt(wx - 15 + 6 * k, 3.6 + 0.4 * (k % 2), -7.5, 1.6 + 0.3 * (k % 3), k); s.fx("sm", 200, 200, smoke, wx - 15 + 6 * k, 6.2 + 1.2 * ((t * 0.6 + k * 0.3) % 1), -7.5, 2.6, 2.6, { soft: true }); } for (let k = 0; k < 6; k++) { const x = lerp(wx - 8 + 3 * k, wx - 20 + 3 * k, clamp01((t - T.T_VILL) / 2.4)); stride(220 + k, CITIZEN(k), `fv${k % 4}`, x, 2.2 + 0.7 * (k % 3), "shock", -1, 2.8, { l: [-0.55, -0.9], r: [0.55, -0.9] }); } }
    // famine and plague
    if (t >= T.T_FAMINE - 0.1 && t < T.T_MILL + 0.2) { const e = pop(t - T.T_FAMINE, 0.35); s.fx("fam", 600, 240, plate("FAMINE", "", "#6a4a2a", "#ffe9a0"), wx - 2.6, 4.4, 1.2, 3.2 * e, 1.28 * e, { rot: -0.04 }); s.fx("bwl", 160, 140, bowl, wx - 2.6, 1.0, 2.4, 1.6, 1.4); s.fx("plg", 600, 240, plate("PLAGUE", "", "#3a6a3a", "#e8ffd8"), wx + 2.6, 4.4, 1.2, 3.2 * pop(t - T.T_FAMINE - 0.4, 0.35), 1.28 * pop(t - T.T_FAMINE - 0.4, 0.35), { rot: 0.04 }); for (let k = 0; k < 2; k++) { const cough = Math.sin(t * 9 + k * 3); who(230 + k, SICK(k), `sk${k}`, wx + 1.6 + 1.5 * k, 2.4, "pained", { headTilt: 0.2, arms: { l: [-0.3, 0.5], r: [0.3, 0.5] } }, 1.15, { dy: 0, sx: 1 + 0.03 * cough, sy: 1 - 0.03 * cough, lean: 0.07 * cough }); s.fx("sck", 100, 100, sick, wx + 1.6 + 1.5 * k, 2.8, 2.6, 0.7, 0.7); } }
    // millions died: a field of graves
    if (t >= T.T_MILL - 0.1 && t < T.T_THIRD) { for (let k = 0; k < 18; k++) s.fx("gr", 90, 170, gravec, wx - 12 + 1.45 * k, 1.1, -1 + 1.4 * ((k * 7) % 3), 1.0 * pop(t - T.T_MILL - 0.05 * k, 0.4), 1.9 * pop(t - T.T_MILL - 0.05 * k, 0.4)); s.fx("mil", 600, 240, plate("MILLIONS", "", "#2a1a10", "#ff6a5a"), wx, 6.0, -1.6, 5.2 * pop(t - T.T_MILL, 0.4), 2.08 * pop(t - T.T_MILL, 0.4), { rot: -0.03 }); }
    // a third of the people in some regions
    if (t >= T.T_THIRD - 0.2) { const u = clamp01((t - T.T_THIRD) / 1.4), e = pop(t - T.T_THIRD + 0.2, 0.3); s.fx("pie", 300, 300, pie(u), wx, 5.3, 0.4, 3.4 * e, 3.4 * e); s.fx("th", 600, 240, plate("1/3 GONE", "", "#c92a2e", "#ffffff"), wx, 2.9, 0.6, 3.2 * pop(t - T.T_THIRD - 0.5, 0.35), 1.28 * pop(t - T.T_THIRD - 0.5, 0.35), { rot: 0.04 }); }
  }

  // ================= 67 - 78: "a short flight, a very soft place" (replay) and the pile that changed the world =================
  if (t >= 66.4) {
    windowScene(T.T_FLIGHT, false, "r", 66.8);
    if (t < T.T_FLIGHT + 0.4) for (let k = 0; k < 3; k++) { const x = T.WIN[0] + [-0.6, 0.6, 0][k]; if (t >= 66.8) who(76 + k, k < 2 ? OFFICIAL(k) : SECRETARY, `rp${k}`, x, T.WIN[2] + 0.2, "nervous", { arms: { l: [-0.5, 0.35], r: [0.5, 0.35] } }, k < 2 ? 1.05 : 0.95, idle(t, 76 + k, 1.5), T.WIN[1]); }
    if (t >= T.T_CTA - 0.2) {
      const glow = 1 + 0.08 * Math.sin(t * 3);
      s.fx("pg", 200, 200, glowC("255,214,120"), PX, 1.2, PZ + 1.2, 6.0 * glow, 6.0 * glow, { soft: true });
      s.fx("pc", 120, 100, crownC2, PX, 2.5 + 0.1 * Math.sin(t * 3), PZ + 1.4, 1.2, 1.0, { rot: 0.1 * Math.sin(t * 2) });
      for (let k = 0; k < 6; k++) { const u = (t * 0.4 + k / 6) % 1; s.fx("star", 70, 70, starC, PX - 2.4 + 4.8 * hh(k, 2), 1.4 + 2.6 * u, PZ + 1.6, 0.35, 0.35, { rot: t + k }); }
      for (let k = 0; k < 4; k++) { const u = (t * 0.5 + k / 4) % 1; s.fx("stm", 200, 200, steam, PX - 1.5 + 1.0 * k, 1.6 + 2.0 * u, PZ + 0.5, 1.2, 1.2, { soft: true }); }
      const crowd: Outfit[] = [NOBLE(0), OFFICIAL(0), CITIZEN(1), IMP(2), NOBLE(2), OFFICIAL(1), CITIZEN(3), PSOL(1)];
      for (let k = 0; k < 8; k++) { const a = Math.PI * (0.1 + 0.8 * k / 7), x = PX + 5.0 * Math.cos(a) * (k % 2 ? 1 : 1.15), z = PZ + 6.0 + 3.4 * Math.sin(a); const fol = t >= T.T_FOLLOW; if (fol) cheer(250 + k, crowd[k], `fn${k}`, x, z, 1.6, 0.15, 1.1); else { const w = Math.sin(t * 7 + k); who(250 + k, crowd[k], `fn${k}`, x, z, "smile", { arms: { l: [-0.5, 0.3], r: [0.55, ar(-0.6 + 0.3 * w * (t > T.T_PILE ? 1 : 0))] } }, 1.1, idle(t, 250 + k, 1.5)); } }
      if (t >= T.T_PILE - 0.2) { const e = pop(t - T.T_PILE + 0.2, 0.35); s.fx("gl", 200, 200, globe(q((t * 0.15) % 1, 20)), PX, 6.2, PZ + 1.2, 3.4 * e, 3.4 * e, { rot: 0.1 * Math.sin(t) }); }
      if (t >= T.T_FOLLOW - 0.2) { confetti(22, PX, 3, 12); for (let k = 0; k < 5; k++) { const u = (t * 0.7 + k / 5) % 1; s.fx("hrt", 100, 100, heart, PX - 2 + k, 1.6 + 4 * u, PZ + 1.6, 0.5, 0.5); } }
    }
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW; void smooth; void fxPuff; void smoke; void shotAt; void zzz; void coin; void crownC; void bolt; void clockFace; void cobweb; void cloud; void rainDrop; void bookC; void penC; void rays; void swords; void tomb; void flower; void tear; void sweat; void cake; void mug; void hbc; void think; void nope; void mapC; void stampC; void bangC; void pigC; void flagUKc; void idle; void hop; void add; void spr; void pulse; void rr;
export type { V3, SetName, Expr, FrontOpts };
