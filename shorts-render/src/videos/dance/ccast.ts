// Cast of the dancing-plague short: bean-heads dance (stroll legs in place + swinging arms), doctors, council, musicians, a priest.
// stage(f, cam) -> character cards + effect cards for the shot at frame f. All positions are set-local (toW converts).
import * as THREE from "three";
import { Pen, bodyFront, fxBurst, fxPuff, fxNote, fxContact, fxShadow, SKINS, INK, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import * as T from "./story";
import { FPS, V3, SetName, toW, shotAt } from "./story";
import { stairY } from "./world";

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();

// ---------------- outfits ----------------
const DRESS = ["#c0392b", "#2a7a8a", "#d9a441", "#7a5ac9", "#3f8f5a", "#c25a7a"];
const COATS = ["#8f6b4a", "#6e7f4a", "#9a7a52", "#4a6a8a", "#a05a46", "#7a6a8c"];
const DANCER = (v: number): Outfit => v % 3 === 0
  ? { jacket: "#e8d8b8", pants: "#4a4038", boots: "#3a2a20", hat: "bonnet", dress: DRESS[v % 6], skin: SKINS[v % 4] }
  : { jacket: COATS[v % 6], pants: ["#4a4038", "#3b3f52", "#5a4a3a"][v % 3], boots: "#3a2a20", hat: v % 2 ? "cap" : "hair", cap: ["#8a6a46", "#6a5a4a", "#a4824f"][v % 3], hair: ["#5a3b2a", "#2a2022", "#8a6a3a"][v % 3], skin: SKINS[v % 4], build: v % 5 === 3 ? "stout" : "adult" };
const TROFFEA: Outfit = { jacket: "#f2e8d0", pants: "#4a4038", boots: "#3a2a20", hat: "bonnet", dress: "#c0392b", skin: SKINS[1] };
const DOCTOR: Outfit = { jacket: "#22222a", pants: "#1a1a20", boots: "#2a2a30", hat: "tophat", moustache: "#5a4a3a", buttons: "#9a9aa4", skin: SKINS[0], build: "stout" };
const COUNCIL: Outfit = { jacket: "#6b2d5c", pants: "#2a2a30", boots: "#2a2a30", hat: "tophat", sash: "#d9b04a", buttons: "#e8c45a", moustache: "#3a2a22", skin: SKINS[2], build: "stout" };
const MUSICIAN = (v: number): Outfit => ({ jacket: ["#2a8a8a", "#d9a441", "#c0503a", "#5a7ac9"][v % 4], pants: "#3b3f52", boots: "#3a2a20", hat: "feather", belt: "#c0392b", skin: SKINS[v % 4], build: "adult" });
const PRIEST: Outfit = { jacket: "#6a4a2a", pants: "#4a3220", boots: "#3a2a20", hat: "hair", hair: "#d8d2c6", belt: "#c8b070", skin: SKINS[0], build: "stout" };
const CARP = (v: number): Outfit => ({ jacket: "#c8a878", pants: "#5a4a3a", boots: "#3a2a20", hat: "cap", cap: "#6a5a4a", skin: SKINS[v % 4], build: "adult" });
const SCHOLAR: Outfit = { jacket: "#4a5a7a", pants: "#2a2a30", boots: "#2a2a30", hat: "hair", hair: "#8a8a8a", skin: SKINS[1], build: "adult" };

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
const noteCard = (kind: number, col: string) => (p: Pen) => fxNote(p, kind, col);
const sweat = (p: Pen) => { p.poly([[40, 10], [62, 60], [40, 86], [18, 60]], "#9ad8ff", 6); };
const bloodDrop = (p: Pen) => { p.poly([[40, 10], [60, 56], [40, 80], [20, 56]], "#c0242a", 6); };
const bandage = (p: Pen) => { p.poly(rr(10, 30, 150, 90, 14), "#f4efe0", 8); p.stroke([[50, 34], [50, 86]], 5, "#d8cfb8"); p.stroke([[100, 34], [100, 86]], 5, "#d8cfb8"); p.ell(110, 62, 12, 14, "#c0242a", 0); };
const zzz = (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 250, 150, 36), "#ffffff", 9); font(g, 70); g.fillStyle = "#4a5a9a"; g.fillText("ZZZ", 130, 80); };
const noBread = (p: Pen) => { const g = p.g; p.ell(120, 130, 90, 50, "#d8a860", 9); p.ell(120, 112, 70, 26, "#ecc888", 0); g.strokeStyle = "#c92a2e"; g.lineWidth = 22; g.beginPath(); g.arc(120, 120, 100, 0, 7); g.moveTo(50, 50); g.lineTo(190, 190); g.stroke(); };
const thermo = (level: number) => (p: Pen) => { const g = p.g; p.poly(rr(70, 10, 150, 330, 40), "#ffffff", 10); p.ell(110, 330, 60, 60, "#ffffff", 10); p.poly(rr(94, 330 - 300 * level, 126, 330, 14), "#d2373a", 0); p.ell(110, 330, 42, 42, "#d2373a", 0); font(g, 38); g.fillStyle = "#241726"; g.fillText("HOT BLOOD", 110, 392); };
const burstSign = (word: string, col = "#c92a2e") => (p: Pen) => { const g = p.g; p.poly([[20, 100], [70, 20], [120, 90], [200, 10], [240, 90], [330, 40], [330, 140], [250, 190], [190, 150], [120, 200], [70, 150]], "#ffe066", 10); font(g, 66); g.fillStyle = col; g.fillText(word, 175, 100); };
const scrollC = (l1: string, l2: string, col = "#c92a2e") => (p: Pen) => { const g = p.g; p.poly(rr(14, 30, 586, 250, 20), "#f2e8c8", 9); p.poly(rr(6, 20, 40, 260, 14), "#d8c890", 8); p.poly(rr(560, 20, 594, 260, 14), "#d8c890", 8); font(g, 64); g.fillStyle = col; g.fillText(l1, 300, 100); g.fillText(l2, 300, 176); };
const hammer = (p: Pen) => { p.stroke([[40, 160], [120, 60]], 14, "#6a3a22"); p.poly(rr(90, 20, 170, 70, 10), "#6a6a78", 8); };
const drum = (p: Pen) => { p.ell(80, 120, 70, 24, "#e8d8b0", 8); p.poly([[10, 120], [150, 120], [140, 190], [20, 190]], "#a02a38", 8); p.ell(80, 190, 60, 18, "#a02a38", 8); };
const lute = (p: Pen) => { p.ell(80, 150, 56, 44, "#c8884a", 8); p.stroke([[110, 120], [180, 30]], 12, "#6a3a22"); p.ell(80, 150, 14, 14, "#241726", 0); };
const flute = (p: Pen) => { p.stroke([[20, 120], [190, 60]], 14, "#d9b04a"); p.dot(90, 100, 5); p.dot(120, 92, 5); p.dot(150, 84, 5); };
const ghost = (p: Pen) => { p.poly([[40, 190], [30, 90], [70, 30], [130, 30], [170, 90], [160, 190], [130, 160], [100, 190], [70, 160]], "#f2f6ff", 8); p.ell(78, 98, 9, 12, INK, 0); p.ell(122, 98, 9, 12, INK, 0); p.ell(100, 140, 10, 14, INK, 0); };
const redShoes = (p: Pen) => { p.poly([[10, 110], [90, 90], [100, 140], [10, 150]], "#d2203a", 9); p.poly([[110, 110], [190, 90], [200, 140], [110, 150]], "#d2203a", 9); p.stroke([[20, 112], [84, 98]], 6, "#ff7a8a"); };
const redShoe = (p: Pen) => { p.poly([[10, 100], [120, 60], [150, 110], [140, 150], [10, 150]], "#d2203a", 10); p.stroke([[20, 104], [110, 72]], 8, "#ff7a8a"); };
const crossC = (p: Pen) => { p.poly(rr(70, 10, 110, 200, 6), "#8a5a32", 8); p.poly(rr(30, 50, 150, 86, 6), "#8a5a32", 8); };
const mold = (p: Pen) => { p.ell(120, 120, 100, 56, "#d8a860", 9); p.ell(90, 112, 22, 16, "#5a9a4a", 5); p.ell(140, 130, 26, 18, "#4a8a6a", 5); p.ell(160, 100, 14, 10, "#5a9a4a", 4); };
const qmark = (p: Pen) => { const g = p.g; font(g, 220); g.fillStyle = "#241726"; g.strokeStyle = "#ffffff"; g.lineWidth = 14; g.strokeText("?", 100, 120); g.fillText("?", 100, 120); };
const hysteria = (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 590, 230, 30), "#f6eaff", 10); font(g, 70); g.fillStyle = "#7a2a9a"; g.fillText("MASS HYSTERIA", 300, 110); g.strokeStyle = "#9a4ac8"; g.lineWidth = 8; g.beginPath(); for (let a = 0; a < 18; a += 0.2) g.lineTo(500 + Math.cos(a) * (4 + a * 3), 190 + Math.sin(a) * (4 + a * 2)); g.stroke(); };
const sunC = (p: Pen) => { p.ell(60, 60, 44, 44, "#ffd84a", 8); };
const moonC = (p: Pen) => { p.ell(60, 60, 44, 44, "#f0f4ff", 8); p.ell(78, 52, 38, 38, "#0f1738", 0); };
const confetti = (p: Pen) => { const cols = ["#e84a4a", "#ffd84a", "#4a9ae8", "#6ac85a", "#d84ae8"]; for (let i = 0; i < 20; i++) p.poly([[40 + (i * 61) % 520, 20 + (i * 37) % 200], [58 + (i * 61) % 520, 28 + (i * 37) % 200], [46 + (i * 61) % 520, 48 + (i * 37) % 200]], cols[i % 5], 2); };
const plankC = (p: Pen) => { p.poly(rr(10, 30, 180, 70, 6), "#9a6a3a", 8); };

// ---------------- helpers ----------------
const NOTE_COLS = ["#d2373a", "#2a4a9a", "#3f8f5a", "#7a2a9a"];
export const stage = (f: number, cam: CamInfo): Stage => {
  const sh = shotAt(f), t = f / FPS, s = new S(cam, sh.set, t), id = sh.id, a = t - sh.a / FPS;
  const pop = (age: number, k = 0.55) => 1 + k * (1 - Math.min(1, Math.max(0, age) / 0.14));
  const ar = (v: number) => Math.round(v * 2.5) / 2.5;
  /** a dancing bean-head: legs jog in place, arms swing, body bounces */
  const dance = (i: number, o: Outfit, x: number, y: number, z: number, o2: { sp?: number; expr?: Expr; sc?: number; tired?: number; shadow?: boolean } = {}) => {
    const sp = o2.sp ?? 1.7, ph = (((t * sp + hh(i, 4)) % 1) + 1) % 1, sn = Math.sin(ph * Math.PI * 2), bounce = (1 - (o2.tired ?? 0) * 0.6) * 0.09 * Math.abs(sn);
    s.who(i, o, `d${i % 8}${o.dress ?? o.jacket}`, x, y + bounce, z, { mode: "stroll", phase: q(ph, 12), expr: o2.expr ?? (i % 3 ? "laugh" : "grin"), headTilt: ar(0.12 * sn), arms: { l: [-0.6, ar(-0.95 + 0.22 * sn)], r: [0.6, ar(-0.95 - 0.22 * sn)] } }, o2.sc ?? 1, o2.shadow ?? true);
  };
  const notes = (x: number, z: number, n = 4, y0 = 2.4) => { for (let k = 0; k < n; k++) { const u = (t * 0.45 + k / n) % 1; s.fx(`nt${k % 4}`, 240, 240, noteCard(k % 2, NOTE_COLS[k % 4]), x + 0.8 * Math.sin(t * 2 + k * 2) + (k - n / 2) * 0.35, y0 + 2.4 * u, z, 0.5, 0.5, { rot: 0.3 * Math.sin(t * 3 + k) }); } };
  const crowd = (n: number, cx: number, cz: number, rx: number, rz: number, o2: { sp?: number; tired?: number; expr?: Expr; seed?: number; ground?: (z: number) => number } = {}) => { for (let k = 0; k < n; k++) { const ang = k * 2.399 + (o2.seed ?? 0), rad = Math.sqrt((k + 0.5) / n); const x = cx + Math.cos(ang) * rx * rad, z = cz + Math.sin(ang) * rz * rad; dance(500 + k + (o2.seed ?? 0) * 7, DANCER(k), x, o2.ground ? o2.ground(z) : 0, z, { sp: o2.sp ?? 1.6 + 0.4 * hh(k, 5), tired: o2.tired, expr: o2.expr, shadow: n < 60 }); } };
  switch (id) {
    case 1: {                                            // she steps into the square and starts to dance
      const walk = clamp01((t - 0.4) / 2.4), x = -9 + 9 * walk, dancing = t >= T.T_START;
      if (!dancing) s.who(1, TROFFEA, "tr", x, 0, -6, { mode: walk < 1 ? "stroll" : "stand", phase: q(((t * 1.3) % 1), 24), expr: "neutral", arms: { l: [-0.5, 0.2], r: [0.5, 0.2] } });
      else dance(1, TROFFEA, 0, 0, -6, { sp: 1.9, expr: "laugh" });
      for (let k = 0; k < 8; k++) { const ang = k * 0.8 + 0.3, rad = 4.5 + 1.2 * (k % 3); s.who(10 + k, DANCER(k + 2), `w${k % 6}`, Math.cos(ang) * rad, 0, -6 + Math.sin(ang) * rad * 0.8, { mode: "stand", expr: dancing ? "shock" : "neutral", look: k % 3 - 1, arms: { l: [-0.5, 0.3], r: [0.5, 0.3] } }); }
      if (dancing) { notes(0, -6.4, 4); if (t < T.T_START + 0.7) s.burst(T.T_START, 0, 1.0, -6, 2.4, 0.25, "#ffe9a0"); }
      break;
    }
    case 2: {                                            // she does not stop for days: time-lapse
      const k = (t - sh.a / FPS) / (51 / 30);
      dance(1, TROFFEA, 0, 0, -6, { sp: 1.9, expr: k < 0.5 ? "laugh" : "pained", tired: k });
      for (let n = 0; n < 5; n++) { const u = (t * 1.2 + n / 5) % 1; s.fx("sweat", 80, 100, sweat, 0.5 + 0.35 * n - 0.8, 2.6 - 1.2 * u, -6, 0.2, 0.25, { rot: 0.2 * n }); }
      for (let n = 0; n < 6; n++) { const ang = n * 1.05 + 0.4, rad = 5.0; s.who(10 + n, DANCER(n + 1), `w${n % 6}`, Math.cos(ang) * rad, 0, -6 + Math.sin(ang) * rad * 0.7, { mode: "stand", expr: k < 0.75 ? "shock" : "dazed", look: 0, arms: { l: [-0.5, 0.3], r: [0.5, 0.3] } }); }
      const arc = (kk: number) => ({ x: -26 + 52 * kk, y: 4 + 26 * Math.sin(Math.PI * kk) });
      const sp = arc(Math.min(0.999, k * 2)), mp = arc(Math.min(0.999, Math.max(0, k * 2 - 1)));
      s.fx("sun", 120, 120, sunC, sp.x, sp.y, -40, 4.5, 4.5); s.fx("moon", 120, 120, moonC, mp.x, mp.y, -40, 4.0, 4.0);
      notes(0, -6.4, 3);
      break;
    }
    case 3: {                                            // thirty-four more join
      dance(1, TROFFEA, 0, 0, -6, { sp: 1.9 });
      for (let k = 0; k < 34; k++) { const ang = k * 2.399, rad = 1.7 + 1.1 * (k % 3) + 0.2 * (k >> 3), tx = Math.cos(ang) * rad, tz = -6 + Math.sin(ang) * rad * 0.85; const u = clamp01((t - (T.T_JOIN - 0.4 + 0.045 * k)) / 0.6); if (u <= 0) continue; const sx = (k % 2 ? 1 : -1) * 14; dance(20 + k, DANCER(k), sx + (tx - sx) * u, 0, -6 + (tz + 6) * u, { sp: 1.6 + 0.5 * hh(k, 3) }); }
      notes(0, -6.4, 5);
      break;
    }
    case 4: {                                            // hundreds
      crowd(120, 0, -8, 14, 13, { sp: 1.7 });
      break;
    }
    case 5: {                                            // feet bled (low camera)
      for (let k = 0; k < 8; k++) { const x = -3 + 0.9 * k + 0.2 * hh(k, 2), z = -5.2 - 1.2 * (k % 3); dance(40 + k, DANCER(k + 3), x, 0, z, { sp: 2.0, expr: "pained" }); if (t >= T.T_BLED - 0.3) s.fx("band", 160, 120, bandage, x, 0.28, z + 0.15, 0.45, 0.35, { rot: 0.2 * k }); }
      if (t >= T.T_BLED) for (let k = 0; k < 10; k++) { const u = (t * 1.3 + k * 0.13) % 1; s.fx("drop", 80, 100, bloodDrop, -3 + 0.7 * k, 0.8 - 0.7 * u, -4.6 - (k % 3) * 0.8, 0.18, 0.24); }
      for (let k = 0; k < 6; k++) { const u = (t * 1.1 + k / 6) % 1; s.fx("sweat", 80, 100, sweat, -2.5 + k * 1.0, 2.2 - 1.6 * u, -4.8, 0.2, 0.25); }
      break;
    }
    case 6: {                                            // no food, no rest, cannot stop
      for (let k = 0; k < 16; k++) { const x = -7 + 1.0 * k + 0.4 * hh(k, 2), z = -5.6 - 1.0 * (k % 3); dance(60 + k, DANCER(k + 1), x, 0, z, { sp: 1.5, expr: k % 2 ? "dazed" : "pained", tired: 1 }); if (t >= T.T_REST && k % 4 === 0) s.fx(`z${k % 3}`, 260, 160, zzz, x + 0.4, 3.0 + 0.1 * Math.sin(t * 3 + k), z, 0.9, 0.55); }
      if (t >= T.T_EAT - 0.1 && t < T.T_REST + 0.5) s.fx("nobread", 240, 240, noBread, -2.0 + 6.0 * clamp01((t - T.T_EAT) / 1.0), 3.5, -4.6, 1.2 * pop(t - T.T_EAT), 1.2 * pop(t - T.T_EAT), { rot: 0.1 });
      break;
    }
    case 7: {                                            // the doctors arrive
      const u = clamp01(a / 1.0);
      for (let k = 0; k < 3; k++) s.who(70 + k, DOCTOR, "dr", -9 + (7 + 1.4 * k) * smooth(u) + 0.0, 0, -3.8 - 0.7 * k, { mode: u < 1 ? "stroll" : "stand", phase: q(((t * 1.5 + 0.2 * k) % 1), 24), expr: "stern", arms: { l: [-0.5, 0.3], r: [0.5, 0.3] } });
      for (let k = 0; k < 12; k++) dance(90 + k, DANCER(k), -5 + 0.9 * k, 0, -7.4 - 0.6 * (k % 3), { sp: 1.6, tired: 0.8, expr: "dazed" });
      break;
    }
    case 8: {                                            // "hot blood"
      const lv = clamp01((t - T.T_HOT + 0.6) / 1.0);
      s.who(1, DOCTOR, "dr", -0.9, 0, -4.8, { mode: "stand", expr: "stern", arms: { l: [-0.5, 0.2], r: [0.6, -0.4 + 0.08 * Math.sin(t * 6)] } });
      dance(2, DANCER(4), 0.9, 0, -5.4, { sp: 1.6, tired: 0.9, expr: "dazed" });
      s.fx(`th${Math.round(lv * 8)}`, 240, 420, thermo(Math.round(lv * 8) / 8), 0.0, 3.0, -4.6, 1.4, 2.4, { rot: 0.03 * Math.sin(t * 3) });
      for (let n = 0; n < 4; n++) { const u = (t * 0.9 + n / 4) % 1; s.fx("steam", 300, 300, (p) => fxPuff(p, 0.2 + 0.6 * u), 0.3 * (n - 1.5), 4.0 + 1.2 * u, -4.6, 0.8, 0.8, { soft: true }); }
      break;
    }
    case 9: {                                            // "More dancing"
      const age = t - T.T_CURE;
      s.who(1, DOCTOR, "dr", -0.4, 0, -4.6, { mode: "stand", expr: age >= 0 ? "grin" : "smile_closed", arms: { l: [-0.5, 0.2], r: [0.6, age >= 0 ? -0.95 : -0.3] } });
      for (let k = 0; k < 10; k++) dance(90 + k, DANCER(k + 2), -4 + 0.9 * k, 0, -7 - 0.5 * (k % 3), { sp: 1.9, expr: "laugh" });
      if (age >= 0) { s.fx("dance", 360, 220, burstSign("DANCE!"), 0.9, 3.2, -4.4, 2.6 * pop(age), 1.6 * pop(age), { rot: -0.08 }); s.burst(T.T_CURE, 0.9, 3.2, -4.3, 3.4, 0.3, "#ffe9a0"); }
      notes(0, -6, 4);
      break;
    }
    case 10: {                                           // the guildhall: stage built, musicians hired
      for (let k = 0; k < 3; k++) { const ph = Math.sin(t * 9 + k * 2); s.who(110 + k, CARP(k), `cp${k}`, -3.6 + 3.6 * k, 0, -9.2, { mode: "stand", expr: "grin", arms: { l: [-0.5, 0.3], r: [0.6, ar(-0.6 + 0.5 * ph)] } }); if (t < T.T_MUSIC) s.fx("hammer", 200, 200, hammer, -3.0 + 3.6 * k, 1.8 + 0.4 * ph, -9.4, 0.7, 0.7, { rot: 0.6 * ph }); }
      const mu = clamp01((t - T.T_MUSIC + 0.5) / 1.6);
      for (let k = 0; k < 5; k++) { const x = 8 - (8 + 4 - 2 * k) * 0 - (k - 2) * 1.8 * mu - 8 * (1 - mu) * (k % 2 ? 1 : -1) * (1 - mu); s.who(120 + k, MUSICIAN(k), `mu${k % 4}`, (k - 2) * 1.8 + (1 - mu) * (k % 2 ? 7 : -7), mu >= 1 ? 1.0 : 0, 6 - 20 * smooth(mu) * 1.0 + (mu >= 1 ? 0 : 0), { mode: mu < 1 ? "stroll" : "stand", phase: q(((t * 1.5 + 0.2 * k) % 1), 24), expr: "smile", arms: { l: [-0.5, 0.3], r: [0.5, 0.3] } }); void x; }
      if (t >= T.T_STAGE) for (let n = 0; n < 4; n++) { const u = (t * 1.5 + n / 4) % 1; s.fx("plk", 200, 100, plankC, -4 + 2.6 * n, 0.6 + 1.6 * u * (1 - u) * 2, -10.2, 0.9, 0.45, { rot: 4 * u }); }
      s.who(130, COUNCIL, "cn", 6.0, 0, -4.0, { mode: "stand", expr: "smile", arms: { l: [-0.5, 0.3], r: [0.5, -0.3 + 0.1 * Math.sin(t * 3)] } });
      break;
    }
    case 11: {                                           // it only got worse
      for (let k = 0; k < 5; k++) { const x = (k - 2) * 1.8; s.who(120 + k, MUSICIAN(k), `mu${k % 4}`, x, 1.0, -13.5, { mode: "stand", expr: "laugh", arms: { l: [-0.5, ar(-0.3 + 0.5 * Math.sin(t * 8 + k))], r: [0.5, ar(-0.3 - 0.5 * Math.sin(t * 8 + k))] } }); }
      crowd(40, 0, -5.0, 8.2, 7.0, { sp: 2.1, expr: "laugh", seed: 3 });
      notes(0, -9, 6, 3.0);
      break;
    }
    case 12: {                                           // some danced themselves to death
      const fall = clamp01((t - (T.T_DEATH - 0.3)) / 0.7);
      if (fall <= 0) dance(1, DANCER(7), 0, 0, -5.2, { sp: 1.2, expr: "pained", tired: 1 });
      else s.who(1, DANCER(7), "fall", 0, 0, -5.2, { mode: "fall", phase: q(fall, 12), expr: "dazed" });
      if (t >= T.T_DEATH + 0.3) { const u = clamp01((t - T.T_DEATH - 0.3) / 1.4); s.fx("ghost", 200, 220, ghost, 0.3 * Math.sin(u * 6), 1.4 + 2.2 * u, -5.4, 1.1, 1.2, { rot: 0.1 * Math.sin(u * 9) }); }
      for (let k = 0; k < 9; k++) dance(30 + k, DANCER(k), -4.2 + 1.05 * k, 0, -7.6 - 0.6 * (k % 2), { sp: 1.4, tired: 1, expr: "dazed", sc: 0.95 });
      break;
    }
    case 13: {                                           // music banned, stage torn down
      const out = clamp01((t - T.T_BAN) / 1.6);
      s.who(1, COUNCIL, "cn", 1.5, 0, -6.6, { mode: "stand", expr: "stern", arms: { l: [-0.5, 0.2], r: [0.6, -0.5 + 0.1 * Math.sin(t * 7)] } });
      s.fx("nomusic", 600, 290, scrollC("NO", "MUSIC!"), 1.6, 3.2, -6.2, 1.8 * pop(t - T.T_BAN), 0.88 * pop(t - T.T_BAN), { rot: 0.05 });
      for (let k = 0; k < 4; k++) s.who(120 + k, MUSICIAN(k), `mu${k}`, -2 + 1.2 * k + 12 * out * (k % 2 ? 1 : -1), 1.0 * (1 - smooth(out * 2)), -13.4 + 6 * out, { mode: out > 0.1 ? "stroll" : "stand", phase: q(((t * 1.6) % 1), 24), expr: "pained", arms: { l: [-0.5, 0.3], r: [0.5, 0.3] } });
      if (t >= T.T_TEAR) for (let n = 0; n < 6; n++) { const u = clamp01((t - T.T_TEAR) / 0.9); s.fx("plk", 200, 100, plankC, -4 + 1.6 * n, 1.0 + 2.4 * Math.sin(Math.PI * u) - 0.8 * u, -13.0 + 1.4 * u, 0.9, 0.45, { rot: 5 * u + n }); }
      if (t >= T.T_TEAR && t < T.T_TEAR + 0.5) s.burst(T.T_TEAR, 0, 1.5, -13.0, 6.0, 0.4, "#d8c8a0");
      for (let k = 0; k < 12; k++) dance(30 + k, DANCER(k + 1), -5 + 0.9 * k, 0, -4.0 - 0.7 * (k % 3), { sp: 1.3, tired: 1, expr: "dazed" });
      break;
    }
    case 14: {                                           // the procession climbs to the shrine
      const u = a * 0.9;
      s.who(1, PRIEST, "pr", 0, stairY(1 - 5 * u), 1 - 5 * u - 3.0, { mode: "stroll", phase: q(((t * 1.2) % 1), 24), expr: "stern", arms: { l: [-0.5, 0.3], r: [0.5, 0.3] } });
      for (let k = 0; k < 14; k++) { const z = 3 - 5 * u - 1.3 * k + 0.4 * hh(k, 2), x = (k % 3 - 1) * 1.4; s.who(40 + k, DANCER(k), `pc${k % 6}`, x, stairY(z), z, { mode: "stroll", phase: q(((t * 1.3 + 0.1 * k) % 1), 24), expr: k % 2 ? "dazed" : "pained", arms: { l: [-0.5, 0.2], r: [0.5, 0.2] } }, 1, false); }
      for (let k = 0; k < 3; k++) { const uu = (t * 0.2 + k / 3) % 1; s.fx("bird", 200, 140, (p: Pen) => { p.arc(60, 64, 40, 22, 190, 350, 6, "#241726"); p.arc(120, 64, 40, 22, 190, 350, 6, "#241726"); }, -8 + 16 * uu, 5 + k, -4, 1.0, 0.7); }
      break;
    }
    case 15: {                                           // red shoes, wooden crosses, prayer
      s.who(1, PRIEST, "pr", 0, stairY(-17), -17.0, { mode: "stand", expr: "smile", arms: { l: [-0.5, -0.3], r: [0.6, -0.8 + 0.1 * Math.sin(t * 4)] } });
      for (let k = 0; k < 8; k++) { const x = -3.2 + 0.92 * k, z = -19.5; const pray = t >= T.T_PRAY; s.who(40 + k, DANCER(k), `pc${k % 6}`, x, stairY(z), z, { mode: "stand", expr: pray ? "smile_closed" : "dazed", arms: pray ? { l: [-0.15, -0.3], r: [0.15, -0.3] } : { l: [-0.5, 0.3], r: [0.5, 0.3] } }); if (t >= T.T_SHOES) s.fx("shoes", 220, 180, redShoes, x, stairY(z) + 0.12, z + 0.2, 0.6, 0.45); if (t >= T.T_CROSS && !pray) s.fx("cross", 160, 220, crossC, x + 0.5, stairY(z) + 1.6, z + 0.1, 0.4, 0.55, { rot: 0.1 * Math.sin(t * 2 + k) }); }
      if (t >= T.T_SHOES && t < T.T_SHOES + 0.4) s.burst(T.T_SHOES, 0, stairY(-19) + 0.4, -19.2, 5.0, 0.3, "#ff7a8a");
      break;
    }
    case 16: {                                           // slowly the dancing stopped; sunrise
      for (let k = 0; k < 12; k++) { const z = -12 - 1.4 * (k % 4), x = -3 + 0.9 * k - 0.4 * (k % 3); s.who(40 + k, DANCER(k), `pc${k % 6}`, x, stairY(z), z, { mode: "sit", expr: "smile_closed", arms: { l: [-0.4, 0.6], r: [0.4, 0.6] } }, 1, false); }
      s.who(1, PRIEST, "pr", 0, stairY(-10), -10.0, { mode: "stand", expr: "smile", arms: { l: [-0.5, 0.2], r: [0.5, 0.2] } });
      for (let k = 0; k < 4; k++) { const uu = (t * 0.18 + k / 4) % 1; s.fx("bird", 200, 140, (p: Pen) => { p.arc(60, 64, 40, 22, 190, 350, 6, "#241726"); p.arc(120, 64, 40, 22, 190, 350, 6, "#241726"); }, -9 + 18 * uu, 9 + k, -10, 1.0, 0.7); }
      break;
    }
    case 17: {                                           // nobody knows why: poisoned bread? mass hysteria?
      s.who(1, SCHOLAR, "sc", 0, 0, -6.0, { mode: "stand", expr: "nervous", headTilt: 0.1 * Math.sin(t * 2), arms: { l: [-0.5, 0.2], r: [0.5, -0.6 + 0.1 * Math.sin(t * 5)] } });
      if (t >= T.T_WHY) s.fx("q", 220, 240, qmark, 0.3, 3.7 + 0.1 * Math.sin(t * 3), -5.8, 1.0 * pop(t - T.T_WHY), 1.1 * pop(t - T.T_WHY), { rot: 0.1 * Math.sin(t * 2) });
      if (t >= T.T_BREAD) s.fx("mold", 240, 240, mold, -2.0, 2.6, -5.4, 1.5 * pop(t - T.T_BREAD), 1.5 * pop(t - T.T_BREAD), { rot: -0.1 });
      if (t >= T.T_HYST) s.fx("hyst", 600, 240, hysteria, 1.0, 3.3, -5.4, 3.0 * pop(t - T.T_HYST), 1.2 * pop(t - T.T_HYST), { rot: 0.05 });
      break;
    }
    case 18: {                                           // the city throws a dance party
      for (let k = 0; k < 5; k++) s.who(120 + k, MUSICIAN(k), `mu${k % 4}`, (k - 2) * 1.8, 1.0, -13.5, { mode: "stand", expr: "laugh", arms: { l: [-0.5, ar(-0.3 + 0.5 * Math.sin(t * 8 + k))], r: [0.5, ar(-0.3 - 0.5 * Math.sin(t * 8 + k))] } });
      for (let k = 0; k < 4; k++) dance(140 + k, COUNCIL, -3 + 2.0 * k, 0, -6.0, { sp: 2.0, expr: "laugh" });
      crowd(22, 0, -4.5, 7.5, 6.0, { sp: 2.0, expr: "laugh", seed: 5 });
      for (let n = 0; n < 6; n++) { const u = (t * 0.5 + n / 6) % 1; s.fx("conf", 600, 300, confetti, -6 + 2.4 * n, 8 - 7 * u, -6, 3.0, 1.5, { rot: 0.4 * Math.sin(t + n) }); }
      notes(0, -8, 6, 3.0);
      break;
    }
    case 19: {                                           // CTA: one red shoe left on the cobbles
      s.fx("shoe", 180, 180, redShoe, 0.3, 0.2, -3.0, 0.7, 0.7, { rot: 0.1 });
      for (let k = 0; k < 6; k++) { const u = (t * 0.22 + k / 6) % 1; s.fx(`nt${k % 4}`, 240, 240, noteCard(k % 2, NOTE_COLS[k % 4]), 0.3 + 0.9 * Math.sin(t * 1.5 + k * 1.7), 0.8 + 4.0 * u, -3.0 - 0.4 * (k % 3), 0.5, 0.5, { rot: 0.3 * Math.sin(t * 2 + k) }); }
      s.fx("moon", 120, 120, moonC, -10, 16, -34, 5.0, 5.0);
      break;
    }
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW; void smooth;
export type { V3, SetName, Expr, FrontOpts };
