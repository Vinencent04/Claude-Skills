// Cast of the Carrington short: telegraph operators, Carrington and a witness, townsfolk in nightgowns, gold miners, scientists, plus drawn cards
// (flames, sparks, the Sun, satellites, clock, title). stage(f, cam) -> character cards + effect cards for the shot at frame f (set-local coordinates).
import * as THREE from "three";
import { Pen, bodyFront, fxBurst, fxPuff, fxContact, fxShadow, SKINS, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import * as T from "./story";
import { FPS, V3, SetName, toW, shotAt } from "./story";

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();

// ---------------- outfits ----------------
const OPER = (v: number): Outfit => ({ jacket: ["#5a4a6a", "#4a5a4a", "#6a4a3a"][v % 3], pants: "#3a3a44", boots: "#2a2a30", hat: "hair", hair: ["#3a2a1a", "#6a4a2a", "#2a2a2a"][v % 3], buttons: "#d9b04a", belt: "#2a2a30", skin: SKINS[v % 4], build: v % 2 ? "stout" : "adult", ...(v % 2 ? { moustache: "#3a2a1a" } : {}) });
const CARR: Outfit = { jacket: "#2a2a3a", pants: "#3a3a44", boots: "#1a1a20", hat: "tophat", moustache: "#8a6a3a", skin: SKINS[1], buttons: "#d9b04a", build: "adult" };
const WITNESS: Outfit = { jacket: "#6a4a3a", pants: "#4a4a44", boots: "#2a2a20", hat: "cap", cap: "#4a3a2a", moustache: "#2a2a2a", skin: SKINS[2], build: "stout" };
const MINER = (v: number): Outfit => ({ jacket: ["#8a5a3a", "#6a6a8a", "#8a7a4a", "#7a4a4a"][v % 4], pants: "#4a4a5a", boots: "#2a2a20", hat: "cap", cap: "#5a3a22", moustache: "#4a3220", skin: SKINS[v % 4], build: "stout" });
const SCI = (v: number): Outfit => ({ jacket: "#f2f2f2", pants: "#3a3a50", boots: "#2a2a30", hat: "hair", hair: "#d8d8d8", buttons: "#c0c0c8", skin: SKINS[(v + 1) % 4], build: v % 2 ? "stout" : "adult" });
const NIGHT = (v: number): Outfit => ({ jacket: "#e8e4f4", pants: "#e8e4f4", boots: "#7a5a4a", hat: "cap", cap: "#f0ecf8", skin: SKINS[v % 4], build: v % 2 ? "stout" : "adult", ...(v % 2 ? { moustache: "#6a5a4a" } : { dress: "#e8e4f4" }) });

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
const glowOrange = glowC("255,170,60"), glowWhite = glowC("255,255,235"), glowGreen = glowC("90,255,170"), glowRed = glowC("255,70,90");
const flameC = (p: Pen) => { p.poly([[100, 6], [150, 80], [172, 150], [140, 196], [100, 210], [60, 196], [28, 150], [50, 80], [74, 100]], "#ff7a1c", 8); p.poly([[100, 70], [132, 130], [140, 170], [100, 196], [60, 170], [70, 130]], "#ffc83a", 0); p.poly([[100, 120], [118, 160], [100, 188], [82, 160]], "#fff2a0", 0); };
const spark = (p: Pen) => { p.poly([[30, 2], [36, 24], [58, 30], [36, 36], [30, 58], [24, 36], [2, 30], [24, 24]], "#fff3a0", 0); };
const smoke = (p: Pen) => { const g = p.g; for (let i = 0; i < 6; i++) { const x = 100 + 40 * Math.cos(i * 1.9), y = 100 + 30 * Math.sin(i * 1.4), r = 52; const gr = g.createRadialGradient(x, y, 4, x, y, r); gr.addColorStop(0, "rgba(40,36,44,0.7)"); gr.addColorStop(1, "rgba(40,36,44,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } };
const starC = (p: Pen) => { p.poly([[30, 4], [38, 24], [58, 26], [42, 38], [48, 58], [30, 46], [12, 58], [18, 38], [2, 26], [22, 24]], "#fff3b0", 2); };
const morse = (k: number) => (p: Pen) => { const g = p.g; g.fillStyle = "#ffe066"; g.strokeStyle = "#2a1a10"; g.lineWidth = 5; const seq = k ? [1, 0, 1, 1, 0] : [0, 1, 0, 0, 1]; let x = 12; for (const s of seq) { const w = s ? 38 : 12; g.beginPath(); g.roundRect(x, 18, w, 12, 6); g.fill(); g.stroke(); x += w + 10; } };
const sunImage = (p: Pen) => { const g = p.g; const gr = g.createRadialGradient(150, 150, 20, 150, 150, 140); gr.addColorStop(0, "#fff0b0"); gr.addColorStop(0.7, "#ffb03a"); gr.addColorStop(1, "#e87a1c"); p.ell(150, 150, 130, 130, "#ffb03a", 10); g.fillStyle = gr; g.beginPath(); g.arc(150, 150, 124, 0, 7); g.fill(); for (const [x, y, r] of [[110, 120, 14], [170, 100, 9], [190, 170, 16], [130, 190, 10], [95, 160, 7]]) { p.ell(x, y, r, r, "#5a2a10", 3); } };
const sunBig = (p: Pen) => { const g = p.g; const gr = g.createRadialGradient(150, 150, 10, 150, 150, 140); gr.addColorStop(0, "rgba(255,255,240,1)"); gr.addColorStop(0.45, "rgba(255,230,140,0.9)"); gr.addColorStop(1, "rgba(255,200,90,0)"); g.fillStyle = gr; g.beginPath(); g.arc(150, 150, 140, 0, 7); g.fill(); };
const clockFace = (u: number) => (p: Pen) => { const g = p.g; p.ell(150, 150, 130, 130, "#f6efd8", 10); for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; p.stroke([[150 + 104 * Math.sin(a), 150 - 104 * Math.cos(a)], [150 + 120 * Math.sin(a), 150 - 120 * Math.cos(a)]], 7); } const m = u * Math.PI * 2, h = m / 12; p.stroke([[150, 150], [150 + 100 * Math.sin(m), 150 - 100 * Math.cos(m)]], 8); p.stroke([[150, 150], [150 + 66 * Math.sin(h), 150 - 66 * Math.cos(h)]], 12); p.dot(150, 150, 12); };
const midnight = (p: Pen) => { clockFace(0)(p); };
const satC = (p: Pen) => { p.poly(rr(70, 60, 130, 120, 6), "#c8ccd4", 7); p.poly(rr(4, 76, 66, 104, 3), "#2a4a9a", 6); p.poly(rr(134, 76, 196, 104, 3), "#2a4a9a", 6); p.stroke([[100, 60], [100, 36]], 4); p.dot(100, 32, 7, "#ff5a5a"); };
const paperC = (p: Pen) => { p.poly([[10, 10], [110, 6], [114, 130], [8, 134]], "#f6efd8", 6); p.stroke([[24, 40], [96, 38]], 4, "#8a7a5a"); p.stroke([[24, 66], [92, 64]], 4, "#8a7a5a"); p.stroke([[24, 92], [80, 90]], 4, "#8a7a5a"); };
const plate = (l1: string, l2: string, bg = "#2a1a10", fg = "#ffd84a") => (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 590, 230, 24), bg, 10); font(g, l2 ? 74 : 110); g.fillStyle = fg; if (l2) { g.fillText(l1, 300, 80); g.fillText(l2, 300, 170); } else g.fillText(l1, 300, 120); };
const qmark = (p: Pen) => { const g = p.g; font(g, 150); g.lineWidth = 14; g.strokeStyle = "#1a1a24"; g.strokeText("?", 60, 70); g.fillStyle = "#ffe066"; g.fillText("?", 60, 70); };
const signC = (txt: string) => (p: Pen) => { const g = p.g; p.poly(rr(8, 8, 392, 112, 16), "#d9c9a0", 8); font(g, 62); g.fillStyle = "#2a1a10"; g.fillText(txt, 200, 62); };
const penC = (p: Pen) => { p.stroke([[10, 60], [50, 10]], 8, "#3a2a1a"); };

// ---------------- helpers ----------------
const ar = (v: number) => Math.round(v * 2.5) / 2.5;
const stroll = (t: number, i: number, speed = 1.0) => ((t * 0.7 * speed + hh(i, 4)) % 1 + 1) % 1;
const DK = [-5, 0, 5];

export const stage = (f: number, cam: CamInfo): Stage => {
  const sh = shotAt(f), t = f / FPS, s = new S(cam, sh.set, t), id = sh.id, a = t - sh.a / FPS;
  const pop = (age: number, k = 0.55) => 1 + k * (1 - Math.min(1, Math.max(0, age) / 0.14));
  const stars = (n = 16, z = -90) => { for (let k = 0; k < n; k++) s.fx("star", 70, 70, starC, -70 + 140 * hh(k, 5), 4 + 40 * hh(k, 6), z, 1.2, 1.2, { rot: 0.4 * Math.sin(t + k) }); };
  const flameAt = (x: number, y: number, z: number, w: number, k = 0) => { const sc = 1 + 0.18 * Math.sin(t * 17 + k * 2.1); s.fx("fl", 200, 220, flameC, x, y + 0.4 * w, z, w * sc, w * 1.1 * sc, { rot: 0.08 * Math.sin(t * 11 + k) }); s.fx("fglow", 200, 200, glowOrange, x, y + 0.4 * w, z - 0.05, w * 2.2, w * 2.2, { soft: true }); };
  const smokeAt = (x: number, y: number, z: number, w: number, k = 0) => { const u = (t * 0.7 + k * 0.37) % 1; s.fx("sm", 200, 200, smoke, x, y + 1.6 * u, z, w * (0.6 + u), w * (0.6 + u), { soft: true }); };
  const sparksAt = (x: number, y: number, z: number, n: number, spread = 1.2, k0 = 0) => { for (let k = 0; k < n; k++) { const ph = (t * 3 + hh(k + k0, 2)) % 1, ang = hh(k + k0, 3) * 6.28 + Math.floor(t * 3 + hh(k + k0, 2)) * 1.7; s.fx("sp", 60, 60, spark, x + Math.cos(ang) * spread * ph, y + Math.abs(Math.sin(ang)) * spread * ph - 0.5 * ph * ph, z + 0.3, 0.3 * (1 - ph) + 0.08, 0.3 * (1 - ph) + 0.08); } };
  const work = (i: number, o: Outfit, x: number, z: number, expr: Expr, rate = 9, y = 0, sc = 1.3) => { const ph = Math.sin(t * rate + i * 1.7); s.who(i, o, `op${i}${o.jacket}${expr}`, x, y, z, { mode: "stand", expr, headTilt: ar(0.05 * Math.sin(t * 2 + i)), arms: { l: [-0.5, ar(0.5 + 0.1 * ph)], r: [0.5, ar(0.5 - 0.1 * ph)] } }, sc, true); };
  const plasma = (n: number, from: V3, to: V3, w0: number) => { for (let k = 0; k < n; k++) { const u = (t * 0.55 + k / n) % 1; s.fx("pl", 200, 200, glowOrange, from[0] + (to[0] - from[0]) * u + 0.8 * Math.sin(t * 3 + k), from[1] + (to[1] - from[1]) * u + 0.8 * Math.cos(t * 2 + k), from[2] + (to[2] - from[2]) * u, w0 * (0.5 + u), w0 * (0.5 + u), { soft: true }); } };
  const morseUp = (x0: number, x1: number, y: number, z: number, n = 4) => { for (let k = 0; k < n; k++) { const u = (t * 0.6 + k / n) % 1; s.fx(`mo${k % 2}`, 240, 48, morse(k % 2), x0 + (x1 - x0) * u, y + 0.4 * Math.sin(u * 6.28), z, 1.0, 0.2); } };
  switch (id) {
    case 1: {                                            // hook: the Sun fires a storm at Earth
      stars(26, -100);
      { const ph = (t / 1.1) % 1; s.burst(Math.floor(t / 1.1) * 1.1, -12, 4, -46, 22, 0.8, "#ffe9a0"); void ph; }
      s.fx("sunhalo", 300, 300, sunBig, -26, 6, -60, 50, 50, { soft: true });
      plasma(9, [-12, 4, -46], [4, 0, -6], 5);
      s.fx("eg", 200, 200, glowGreen, 4, 0, -5, 7 + 3 * smooth((t - T.T_HIT) / 0.5), 7 + 3 * smooth((t - T.T_HIT) / 0.5), { soft: true });
      s.burst(T.T_HIT, 4, 0, -4.5, 10, 0.7, "#fff3b0");
      break;
    }
    case 2: {                                            // telegraph machines burst into flames
      DK.forEach((x, k) => {
        const burn = t >= T.T_BURN + 0.1 * k;
        work(10 + k, OPER(k), x, -7.2, burn ? "shock" : "smile", 9);
        if (burn) { flameAt(x, 1.2, -5.6, 1.1 + 0.2 * k, k); smokeAt(x, 2.2, -5.6, 1.4, k); sparksAt(x, 1.8, -5.5, 5, 1.0, k * 5); s.burst(T.T_BURN + 0.1 * k, x, 1.5, -5.4, 3.0, 0.4, "#ffd27a"); }
        else sparksAt(x, 1.4, -5.5, 2, 0.5, k * 3);
      });
      break;
    }
    case 3: {                                            // batteries unplugged: they keep sending
      work(10, OPER(0), -5, -7.2, "grin", 10); work(11, OPER(1), 0, -7.2, "dazed", 10); work(12, OPER(2), 5, -7.2, "smile", 10);
      morseUp(-5.4, -2.2, 3.0, -5.4, 4); morseUp(-0.4, 2.6, 3.2, -5.4, 4);
      if (t > T.T_BATT) { s.fx("nb", 240, 240, glowGreen, -3.9, 1.2, -5.2, 1.4, 1.4, { soft: true }); }
      sparksAt(-5, 1.4, -5.5, 2, 0.6, 1);
      break;
    }
    case 4: {                                            // Carrington sketches sunspots
      s.fx("sunimg", 300, 300, sunImage, 1.3, 4.0, -7.7, 3.6, 3.6);
      const ph = Math.sin(t * 7);
      s.who(10, CARR, "carr", -2.0, 0, -5.6, { mode: "stand", expr: "neutral", headTilt: ar(0.06 * Math.sin(t * 1.5)), arms: { l: [-0.4, 0.4], r: [0.45, ar(0.55 + 0.1 * ph)] } }, 1.7);
      s.fx("pen", 100, 100, penC, -1.4, 1.7, -4.8, 0.3, 0.3, { rot: 0.4 * ph });
      for (let k = 0; k < 5; k++) { const u = (t * 0.3 + k / 5) % 1; s.fx("sp", 60, 60, spark, -2 + 4 * hh(k, 3), 2 + 4 * u, -7.5, 0.12, 0.12); }
      break;
    }
    case 5: {                                            // the flash; he runs for a witness; it is gone
      const age = t - T.T_FLASH, run = clamp01((t - T.T_RUN + 0.6) / 1.2), back = clamp01((t - T.T_RUN - 0.5) / 1.4);
      const flashOn = t >= T.T_FLASH && t < T.T_GONE - 0.2;
      s.fx("sunimg", 300, 300, sunImage, 1.3, 4.0, -7.7, 3.6, 3.6);
      if (flashOn) { const g = 1 + 0.1 * Math.sin(t * 30); s.fx("fl1", 300, 300, sunBig, 1.3, 4.0, -7.5, (5.5 - 2 * smooth(age / 2)) * pop(age, 0.6) * g, (6.5 - 2.5 * smooth(age / 2)) * pop(age, 0.6) * g, { soft: true }); s.burst(T.T_FLASH, 1.3, 4.0, -7.4, 6, 0.3, "#ffffff"); }
      const shock = t >= T.T_FLASH, cx = t < T.T_RUN - 0.6 ? -2.0 : -2.0 - 3.4 * smooth(run) + 3.4 * smooth(back) * 0.8;
      const jump = shock && age < 0.4 ? 0.5 * Math.sin((age / 0.4) * Math.PI) : 0;
      const moving = t >= T.T_RUN - 0.6 && (run < 1 || (back > 0 && back < 1));
      s.who(10, CARR, "carr", cx, jump, -5.6, { mode: moving ? "stroll" : "stand", phase: q(stroll(t, 3, 1.6), 24), expr: t >= T.T_GONE ? "dazed" : shock ? "shock" : "neutral", arms: shock && !moving ? { l: [-0.55, -0.9], r: [0.55, -0.9] } : { l: [-0.4, 0.4], r: [0.45, 0.5] } }, 1.05);
      if (t >= T.T_RUN + 0.8) { const bk = clamp01((t - T.T_RUN - 0.6) / 1.4); s.who(11, WITNESS, "wit", -6.0 + 3.4 * smooth(bk), 0, -5.2, { mode: bk > 0 && bk < 1 ? "stroll" : "stand", phase: q(stroll(t, 5, 1.6), 24), expr: t >= T.T_GONE ? "dazed" : "nervous", arms: { l: [-0.4, 0.3], r: [0.4, 0.3] } }, 1.6); }
      if (t >= T.T_GONE) { s.fx("q", 120, 120, qmark, -1.0, 5.0, -5.0, 1.3 * pop(t - T.T_GONE), 1.3 * pop(t - T.T_GONE)); }
      break;
    }
    case 6: {                                            // seventeen hours later: the clock spins, the Sun replies
      const spin = t < T.T_REPLY ? (t - 21.2) * 1.6 : (23.6 - 21.2) * 1.6;
      s.fx("clk", 300, 300, clockFace(q(spin % 1, 60)), 0, 8.7, -33.9, 3.2, 3.2);
      stars(18, -85);
      if (t >= T.T_REPLY) { s.burst(T.T_REPLY, 0, 18, -60, 40, 0.6, "#ffffff"); s.fx("rg", 200, 200, glowGreen, 0, 14, -60, 60 * smooth((t - T.T_REPLY) / 0.6), 40 * smooth((t - T.T_REPLY) / 0.6), { soft: true }); }
      break;
    }
    case 7: {                                            // the whole sky glows; the town stares up
      stars(14, -85);
      for (let k = 0; k < 7; k++) { const x = -5 + 1.7 * k + 0.3 * hh(k, 2), z = 6 + 1.5 * (k % 3); s.who(10 + k, NIGHT(k), `nt${k % 4}`, x, 0, z, { mode: "stand", expr: k % 2 ? "shock" : "relief_open", headTilt: -0.18, look: 0, arms: k % 2 ? { l: [-0.5, -0.9], r: [0.5, -0.9] } : { l: [-0.4, 0.3], r: [0.55, -0.95] } }, 1.25, true); }
      break;
    }
    case 8: {                                            // gold miners cook breakfast at midnight
      stars(10, -85);
      flameAt(0, 0.7, -2.3, 1.4, 3); smokeAt(0, 1.6, -2.3, 1.6, 1);
      s.fx("fire", 200, 200, glowOrange, 0, 1.0, -2.2, 5, 5, { soft: true });
      const toss = Math.sin(t * 3);
      s.who(10, MINER(0), "mn0", -2.2, 0, 0.2, { mode: "stand", expr: "smile", pan: { tilt: ar(14 * toss), cake: 1 }, arms: { l: [-0.5, 0.4] } }, 1.05);
      s.who(11, MINER(1), "mn1", 2.4, 0, 0.4, { mode: "stand", expr: "relief_open", arms: { l: [-0.55, -0.9], r: [0.55, -0.9] } }, 1.0);
      s.who(12, MINER(2), "mn2", -0.2, 0, 2.6, { mode: "stand", expr: "grin", arms: { l: [-0.5, 0.3], r: [0.5, ar(0.2 + 0.2 * Math.sin(t * 4))] } }, 1.0);
      if (t >= 29.8) s.fx("mid", 300, 300, midnight, 4.2, 3.4, -0.5, 1.7 * pop(t - 29.8), 1.7 * pop(t - 29.8));
      break;
    }
    case 9: {                                            // the telegraph networks go mad
      DK.forEach((x, k) => {
        const thrown = t >= T.T_SPARK + 0.2 * k, ut = clamp01((t - T.T_SPARK - 0.2 * k) / 0.9);
        const y = thrown ? 1.3 * Math.sin(ut * Math.PI) : 0, zz = -7.2 - 1.2 * smooth(ut), xx = x + (k - 1) * 1.6 * smooth(ut);
        s.who(10 + k, OPER(k), `opf${k}`, xx, y, zz, { mode: thrown && ut < 1 ? "fall" : "stand", expr: "shock", arms: thrown ? undefined : { l: [-0.55, -0.9 + 0.2 * Math.sin(t * 20 + k)], r: [0.55, -0.9 - 0.2 * Math.sin(t * 20 + k)] } }, 1, true);
        sparksAt(x, 1.5, -5.5, 8, 1.5, k * 7);
        if (t >= T.T_SPARK) { s.burst(T.T_SPARK + 0.2 * k, x, 1.6, -5.4, 3.6, 0.4, "#fff3a0"); flameAt(x + 0.8, 1.2, -5.6, 0.8, k); }
      });
      break;
    }
    case 10: {                                           // paper bursts into flames
      const x = 0; 
      for (let k = 0; k < 6; k++) { const u = (t * 0.8 + k / 6) % 1; s.fx("pp", 140, 150, paperC, x - 1.4 + 0.5 * k, 1.3 + 1.8 * u, -5.2 - 0.3 * Math.sin(k), 0.6, 0.65, { rot: 1.2 * u + k }); flameAt(x - 1.4 + 0.5 * k, 1.3 + 1.8 * u, -5.1, 0.55, k); }
      flameAt(0, 1.2, -5.6, 1.8, 2); flameAt(-1.2, 1.1, -5.5, 1.3, 5); smokeAt(0, 2.4, -5.6, 2.0, 0); smokeAt(0.8, 2.4, -5.6, 1.6, 2);
      s.who(10, OPER(1), "op1pa", 0, 0, -7.4, { mode: "stand", expr: "shock", headTilt: ar(0.1 * Math.sin(t * 20)), arms: { l: [-0.55, -0.9], r: [0.55, -0.9] } }, 1.1, true);
      s.burst(T.T_PAPER, 0, 1.8, -5.3, 4, 0.35, "#ffe9a0");
      break;
    }
    case 11: {                                           // Boston
      s.fx("sgnB", 400, 120, signC("BOSTON"), -5, 3.4, -8.6, 1.9, 0.57);
      s.who(10, OPER(0), "bos", -5, 0, -7.2, { mode: "stand", expr: "smile", headTilt: ar(0.08 * Math.sin(t * 2)), arms: { l: [-0.5, ar(0.5 + 0.1 * Math.sin(t * 9))], r: [0.5, ar(0.5 - 0.1 * Math.sin(t * 9))] } }, 1.1, true);
      s.fx("aur", 200, 200, glowRed, -5, 3.2, -9.8, 6, 5, { soft: true });
      morseUp(-4.4, -1.4, 2.6, -5.6, 3);
      break;
    }
    case 12: {                                           // Portland
      s.fx("sgnP", 400, 120, signC("PORTLAND"), 5, 3.4, -8.6, 2.4, 0.72);
      s.who(10, OPER(1), "por", 5, 0, -7.2, { mode: "stand", expr: "grin", headTilt: ar(0.08 * Math.sin(t * 2)), arms: { l: [-0.5, ar(0.5 + 0.1 * Math.sin(t * 9))], r: [0.5, ar(0.5 - 0.1 * Math.sin(t * 9))] } }, 1.1, true);
      s.fx("aur", 200, 200, glowGreen, 5, 3.2, -9.8, 6, 5, { soft: true });
      morseUp(1.4, 4.4, 2.6, -5.6, 3);
      break;
    }
    case 13: {                                           // chatting for two hours
      s.fx("sgnB", 400, 120, signC("BOSTON"), -5, 3.5, -8.6, 2.2, 0.66); s.fx("sgnP", 400, 120, signC("PORTLAND"), 5, 3.5, -8.6, 2.6, 0.78);
      const lg = Math.sin(t * 6) > 0;
      s.who(10, OPER(0), "bos", -5, 0, -7.2, { mode: "stand", expr: lg ? "laugh" : "grin", arms: { l: [-0.5, ar(0.5 + 0.1 * Math.sin(t * 9))], r: [0.5, 0.5] } }, 1.1, true);
      s.who(11, OPER(1), "por", 5, 0, -7.2, { mode: "stand", expr: lg ? "grin" : "laugh", arms: { l: [-0.5, 0.5], r: [0.5, ar(0.5 + 0.1 * Math.sin(t * 9 + 1))] } }, 1.1, true);
      morseUp(-4, 4, 3.2, -6.2, 6); morseUp(4, -4, 2.4, -6.2, 6);
      s.fx("aur", 200, 200, glowGreen, 0, 3.8, -9.8, 10, 5, { soft: true });
      if (t >= T.T_CHAT + 0.9) s.fx("2h", 300, 300, midnight, 0, 5.4, -8.2, 1.7 * pop(t - T.T_CHAT - 0.9), 1.7 * pop(t - T.T_CHAT - 0.9));
      break;
    }
    case 14: {                                           // the Carrington Event: the strongest storm in history
      stars(26, -100);
      s.fx("sunhalo", 300, 300, sunBig, -26, 6, -60, 50, 50, { soft: true });
      plasma(9, [-12, 4, -46], [4, 0, -6], 5);
      const hit = 1 + 0.12 * Math.sin(t * 8);
      s.fx("eg", 200, 200, glowGreen, 4, 0, -5, 9 * hit, 9 * hit, { soft: true }); s.fx("er", 200, 200, glowRed, 4, 0, -5.2, 6 * hit, 6 * hit, { soft: true });
      s.fx("ttl", 600, 240, plate("CARRINGTON", "EVENT"), 2.2, 5.2, -3, 5.4 * pop(t - T.T_TITLE, 0.3), 2.16 * pop(t - T.T_TITLE, 0.3), { rot: -0.03 });
      s.fx("yr", 600, 240, plate("1859", "", "#c92a2e", "#ffffff"), 2.2, 2.7, -3, 2.6 * pop(t - T.T_TITLE - 0.5, 0.3), 1.04 * pop(t - T.T_TITLE - 0.5, 0.3), { rot: 0.03 });
      break;
    }
    case 15: {                                           // today: satellites and power grids
      stars(16, -90);
      for (let k = 0; k < 4; k++) { const x = -9 + 6 * k, y = 13 + 2 * Math.sin(k * 2), dead = t >= T.T_OUT + 0.2 * k; s.fx("sat", 200, 200, satC, x, y, -22 - 4 * k, 6, 6, { rot: 0.2 * Math.sin(t + k) + (dead ? 0.15 * t : 0) }); if (dead) { sparksAt(x, y, -29.5 - 6 * k, 6, 1.6, k * 4); s.burst(T.T_OUT + 0.2 * k, x, y, -29 - 6 * k, 6, 0.5, "#fff3a0"); } }
      if (t >= T.T_OUT) for (let k = 0; k < 6; k++) { const z = -4 - 11 * k; s.burst(T.T_OUT + 0.08 * k, k % 2 ? 5.8 : -5.8, 8.3, z, 4, 0.4, "#9fe0ff"); sparksAt(k % 2 ? 5.8 : -5.8, 8.3, z, 3, 1.1, k * 6); }
      break;
    }
    case 16: {                                           // scientists: not a question of if, but when
      const sw = clamp01((t - 54.0) / 1.4);
      s.fx("sunimg", 300, 300, sunImage, 0, 4.0, -7.7, 4.2, 4.2);
      s.fx("fl1", 300, 300, sunBig, 0, 4.0, -7.5, 5 + 4 * sw + 0.4 * Math.sin(t * 6), 5 + 4 * sw + 0.4 * Math.sin(t * 6), { soft: true });
      [-3.2, 0, 3.2].forEach((x, k) => s.who(10 + k, SCI(k), `sc${k}`, x, 0, -4.6 + 0.4 * (k % 2), { mode: "stand", expr: t > T.T_WHEN - 0.6 ? "shock" : "nervous", headTilt: ar(0.08 * Math.sin(t * 2 + k)), arms: k === 1 ? { l: [-0.55, 0.3], r: [0.55, -0.9] } : { l: [-0.4, 0.4], r: [0.45, 0.4] } }, 1.05));
      s.fx("ifw", 600, 240, plate("NOT IF…", "BUT WHEN", "#c92a2e", "#ffffff"), 0, 6.2, -7.4, 5.0 * pop(t - 54.4, 0.3), 2.0 * pop(t - 54.4, 0.3), { rot: -0.03 });
      break;
    }
    case 17: {                                           // CTA: the operator waves at the aurora
      stars(18, -85);
      const wv = ar(-0.9 + 0.3 * Math.sin(t * 8));
      s.who(10, OPER(0), "bos", 0, 0, 2.0, { mode: "stand", expr: "grin", headTilt: ar(0.08 * Math.sin(t * 2)), arms: { l: [-0.5, 0.5], r: [0.65, wv] } }, 1.3, true);
      morseUp(-3, 3, 3.8, 2.0, 4);
      break;
    }
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW; void smooth; void fxPuff; void smoke;
export type { V3, SetName, Expr, FrontOpts };
