// Cast of the christmas-truce short: bean-heads play British Tommies and German soldiers (rifles, helmets), a furious general and his aide; ball, gifts, flares and snow are drawn cards.
// stage(f, cam) -> character cards + effect cards for the shot at frame f. All positions are set-local (toW converts).
import * as THREE from "three";
import { Pen, bodyFront, fxBurst, fxPuff, fxNote, fxContact, fxShadow, SKINS, INK, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import * as T from "./story";
import { FPS, V3, SetName, toW, shotAt } from "./story";

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();
const BZ = 11.9, GZ = -11.9;   // soldiers stand behind the sandbag walls

// ---------------- outfits ----------------
const TOMMY = (v: number, rifle = false): Outfit => ({ jacket: "#8a8456", pants: "#6a6a44", boots: "#3a2a20", hat: "cap", cap: "#7a7448", belt: "#5a4a2a", buttons: "#d9b04a", rifle, skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult" });
const GERMAN = (v: number, rifle = false): Outfit => ({ jacket: "#6a7068", pants: "#4a4e52", boots: "#2a2a30", hat: "shako", belt: "#d8d0b0", buttons: "#c8c8d0", rifle, skin: SKINS[(v + 1) % 4], build: v % 3 === 1 ? "stout" : "adult" });
const BARE = (o: Outfit): Outfit => ({ ...o, hat: null });
const GENERAL: Outfit = { jacket: "#8a8456", pants: "#6a6a44", boots: "#2a2a30", hat: "bicorne", belt: "#5a4a2a", sash: "#c0353a", buttons: "#e8c45a", moustache: "#d8d2c6", skin: SKINS[0], build: "stout" };
const AIDE: Outfit = { jacket: "#8a8456", pants: "#6a6a44", boots: "#3a2a20", hat: "cap", cap: "#7a7448", belt: "#5a4a2a", skin: SKINS[1], build: "adult" };

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
const noteCard = (kind: number) => (p: Pen) => fxNote(p, kind, "#fff3b0");
const flake = (p: Pen) => { p.ell(30, 30, 9, 9, "#ffffff", 0); };
const breath = (p: Pen) => { const g = p.g; const gr = g.createRadialGradient(100, 100, 6, 100, 100, 70); gr.addColorStop(0, "rgba(255,255,255,0.75)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(100, 100, 70, 0, 7); g.fill(); };
const smoke = (p: Pen) => { const g = p.g; for (let i = 0; i < 6; i++) { const x = 100 + 40 * Math.cos(i * 1.9), y = 100 + 30 * Math.sin(i * 1.4), r = 52; const gr = g.createRadialGradient(x, y, 4, x, y, r); gr.addColorStop(0, "rgba(40,36,44,0.7)"); gr.addColorStop(1, "rgba(40,36,44,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } };
const flash = (p: Pen) => { p.poly([[100, 10], [120, 80], [190, 60], [136, 112], [186, 170], [112, 140], [96, 196], [84, 140], [20, 176], [64, 112], [12, 60], [80, 80]], "#fff0a0", 7); p.ell(100, 100, 28, 28, "#ffffff", 0); };
const tracer = (p: Pen) => { p.poly([[10, 30], [190, 18], [190, 42]], "#ffe066", 3); };
const flare = (p: Pen) => { const g = p.g; const gr = g.createRadialGradient(80, 80, 4, 80, 80, 76); gr.addColorStop(0, "rgba(255,255,230,1)"); gr.addColorStop(0.4, "rgba(255,230,140,0.6)"); gr.addColorStop(1, "rgba(255,220,120,0)"); g.fillStyle = gr; g.beginPath(); g.arc(80, 80, 76, 0, 7); g.fill(); };
const rifleC = (p: Pen) => { p.stroke([[20, 110], [220, 60]], 12, "#4a3220"); p.stroke([[120, 86], [220, 60]], 6, "#3d414c"); };
const cigs = (p: Pen) => { p.poly(rr(20, 40, 120, 110, 8), "#d8d2c0", 8); p.stroke([[30, 62], [110, 62]], 5, "#c0392b"); p.stroke([[30, 84], [110, 84]], 5, "#c0392b"); };
const choc = (p: Pen) => { p.poly(rr(10, 30, 130, 100, 8), "#6a3a22", 9); for (let i = 0; i < 4; i++) p.stroke([[40 + i * 25, 36], [40 + i * 25, 96]], 3, "#8a5a3a"); p.poly(rr(10, 50, 130, 70, 3), "#d9b04a", 5); };
const button = (p: Pen) => { p.ell(50, 50, 30, 30, "#e8c45a", 8); p.dot(40, 42, 4); p.dot(60, 42, 4); p.dot(40, 60, 4); p.dot(60, 60, 4); };
const ball = (p: Pen) => { p.ell(60, 60, 44, 44, "#f4efe0", 8); p.poly([[60, 36], [80, 52], [72, 76], [48, 76], [40, 52]], "#2a2a32", 4); };
const helmetC = (p: Pen) => { p.ell(80, 90, 60, 36, "#7a7448", 8, 180, 360); p.poly([[14, 90], [146, 90], [160, 106], [0, 106]], "#6a6440", 7); };
const telegram = (p: Pen) => { const g = p.g; p.poly(rr(14, 14, 286, 226, 10), "#f6efd8", 9); font(g, 40); g.fillStyle = "#2a2a30"; g.fillText("NO MORE", 150, 80); g.fillText("TRUCES!", 150, 130); g.fillStyle = "#8a7a5a"; for (let i = 0; i < 3; i++) g.fillRect(40, 160 + i * 18, 220 - i * 30, 6); };
const inkStamp = (word: string, col = "#c92a2e") => (p: Pen) => { const g = p.g; g.save(); g.translate(300, 120); g.rotate(-0.06); g.strokeStyle = col; g.lineWidth = 16; g.strokeRect(-270, -92, 540, 184); g.fillStyle = col; font(g, 96); g.fillText(word, 0, 8); g.restore(); };
const stamper = (p: Pen) => { p.poly(rr(60, 150, 180, 250, 12), "#b45a3a", 8); p.poly(rr(100, 40, 140, 160, 12), "#6a3a22", 8); p.poly(rr(60, 150, 180, 190, 10), "#d2373a", 8); };
const candle = (p: Pen) => { p.poly(rr(40, 100, 80, 220, 6), "#f4efe0", 8); p.poly([[60, 20], [44, 70], [60, 100], [76, 70]], "#ffb040", 6); p.poly([[60, 50], [54, 74], [60, 90], [66, 74]], "#ffe890", 0); };
const starC = (p: Pen) => { p.poly([[30, 4], [38, 24], [58, 26], [42, 38], [48, 58], [30, 46], [12, 58], [18, 38], [2, 26], [22, 24]], "#fff3b0", 2); };

// ---------------- helpers ----------------
const sway = (t: number, i: number): FrontOpts["arms"] => ({ l: [-0.55 + 0.08 * Math.sin(t * 2.3 + i), 0.3 + 0.06 * Math.sin(t * 3.1 + i)], r: [0.55 - 0.08 * Math.sin(t * 2.7 + i), 0.3 + 0.06 * Math.sin(t * 2.9 + i * 2)] });
const ar = (v: number) => Math.round(v * 2.5) / 2.5;
const stroll = (t: number, i: number, speed = 1.0) => ((t * 0.7 * speed + hh(i, 4)) % 1 + 1) % 1;

export const stage = (f: number, cam: CamInfo): Stage => {
  const sh = shotAt(f), t = f / FPS, s = new S(cam, sh.set, t), id = sh.id, a = t - sh.a / FPS;
  const pop = (age: number, k = 0.55) => 1 + k * (1 - Math.min(1, Math.max(0, age) / 0.14));
  const snow = (n = 22, x0 = 0, z0 = 0, w = 26, h = 9) => { for (let k = 0; k < n; k++) { const u = ((t * 0.18 + hh(k, 2) * 3) % 1); s.fx("fl", 60, 60, flake, x0 + (hh(k, 3) - 0.5) * w + 0.6 * Math.sin(t * 0.8 + k), h * (1 - u), z0 + (hh(k, 4) - 0.5) * 12, 0.12, 0.12, { soft: true }); } };
  const stars = (n = 14) => { for (let k = 0; k < n; k++) s.fx("star", 70, 70, starC, -30 + 60 * hh(k, 5), 16 + 14 * hh(k, 6), -40, 1.0, 1.0, { rot: 0.4 * Math.sin(t + k) }); };
  const breathAt = (x: number, y: number, z: number, k = 0) => { const u = (t * 0.8 + k * 0.31) % 1; s.fx("br", 200, 200, breath, x + 0.25 * u, y + 0.35 * u, z, 0.7 * (0.5 + u), 0.7 * (0.5 + u), { soft: true }); };
  const sing = (i: number, o: Outfit, x: number, z: number, expr: Expr = "relief_open", y = 0.5) => { s.who(i, o, `sg${i % 6}${o.jacket}`, x, y, z, { mode: "stand", expr, headTilt: ar(0.1 * Math.sin(t * 3 + i)), arms: sway(t, i) }, 1, false); };
  switch (id) {
    case 1: {                                            // war: the front is loud
      for (let k = 0; k < 9; k++) { const x = -14 + 3.4 * k, shoot = Math.sin(t * 9 + k * 2) > 0.2, kick = shoot ? 0.04 : 0; s.who(10 + k, TOMMY(k, true), `tm${k % 4}r`, x, 0, BZ + 0.3, { mode: "stand", expr: "stern", arms: { l: [-0.4, ar(-0.2 + kick)], r: [0.3, ar(-0.1 - kick)] }, headTilt: ar(0.04 * Math.sin(t * 14 + k)) }, 1, false); if (shoot && (Math.floor(t * 9 + k * 2) % 3 === 0)) s.fx("fls", 200, 200, flash, x - 0.6, 1.5, BZ - 0.9, 0.9, 0.9, { rot: 0.3 * k }); }
      for (let k = 0; k < 8; k++) { const u = (t * 2.4 + k * 0.37) % 1; s.fx("trc", 200, 60, tracer, -12 + 3.4 * k + 4 * u, 1.5 + 0.3 * Math.sin(k), 8 - 18 * u, 2.2, 0.3, { rot: 0.15 }); }
      for (let k = 0; k < 4; k++) { const ph = (t * 0.9 + k * 0.43) % 1; if (ph < 0.5) { s.fx("exp", 200, 200, smoke, -12 + 8 * k + 3 * Math.sin(k), 0.5 + 3 * ph, -2 + 2 * k, 4 * (0.5 + ph), 4 * (0.5 + ph), { soft: true }); s.fx("fls", 200, 200, flash, -12 + 8 * k + 3 * Math.sin(k), 0.8 + 2 * ph, -2 + 2 * k, 3.0 * (0.8 - ph), 3.0 * (0.8 - ph)); } }
      { const u = (t * 0.35) % 1; s.fx("flr", 160, 160, flare, -6 + 12 * u, 9 - 3 * u, -2, 7, 7, { soft: true }); }
      for (let k = 0; k < 6; k++) { const x = -12 + 5 * k; s.who(40 + k, GERMAN(k, true), `gm${k % 4}r`, x, 0, GZ, { mode: "stand", expr: "stern", arms: { l: [-0.4, -0.2], r: [0.3, -0.1] } }, 1, false); }
      snow(); break;
    }
    case 2: {                                            // rifles down, and they start to sing
      for (let k = 0; k < 5; k++) { const x = -3.6 + 1.8 * k, down = t >= T.T_DROP + 0.12 * k; s.who(10 + k, down ? TOMMY(k) : TOMMY(k, true), `tm${k % 4}${down ? "" : "r"}`, x, 0.5, BZ + 0.1, { mode: "stand", expr: t >= T.T_SING ? "relief_open" : down ? "dazed" : "stern", arms: down ? sway(t, k) : { l: [-0.4, -0.2], r: [0.3, -0.1] } }, 1, false); if (down) { const u = clamp01((t - T.T_DROP - 0.12 * k) / 0.5); s.fx("rf", 260, 160, rifleC, x - 0.6 + 0.2 * k, 1.4 - 1.2 * u * u, BZ - 1.0, 1.1, 0.7, { rot: 1.2 * u }); } if (t >= T.T_SING) breathAt(x + 0.3, 1.8, BZ - 0.3, k); }
      if (t >= T.T_SING) for (let k = 0; k < 5; k++) { const u = (t * 0.45 + k / 5) % 1; s.fx(`nt${k % 2}`, 240, 240, noteCard(k % 2), -3 + 1.6 * k + 0.4 * Math.sin(t * 2 + k), 2.6 + 2.2 * u, BZ - 1.2, 0.5, 0.5, { rot: 0.3 * Math.sin(t * 3 + k) }); }
      snow(); stars(8); break;
    }
    case 3: {                                            // German trench: tiny trees with candles
      for (let k = 0; k < 7; k++) sing(10 + k, GERMAN(k), -11 + 3.7 * k + (k % 2) * 0.5, GZ, t > T.T_TREES ? "smile" : "neutral");
      for (let k = 0; k < 5; k++) { const x = [-9, -4.5, 0, 4.5, 9][k]; if (t > T.T_TREES) s.fx("glow", 200, 200, flare, x, 2.0, GZ + 1.2, 1.2, 1.2, { soft: true }); }
      for (let k = 0; k < 6; k++) { const u = (t * 0.4 + k / 6) % 1; s.fx(`nt${k % 2}`, 240, 240, noteCard(k % 2), -9 + 3.6 * k, 3 + 2 * u, GZ, 0.5, 0.5, { rot: 0.3 * Math.sin(t * 3 + k) }); }
      snow(); stars(); break;
    }
    case 4: {                                            // the Germans sing Silent Night
      for (let k = 0; k < 5; k++) { const x = -3.6 + 1.8 * k; s.who(10 + k, GERMAN(k + 1), `gm${k % 4}`, x, 0.5, GZ + 0.2, { mode: "stand", expr: "relief_open", headTilt: ar(0.12 * Math.sin(t * 3 + k)), arms: { l: [-0.3, ar(0.3 + 0.05 * Math.sin(t * 4 + k))], r: [0.3, ar(0.3 - 0.05 * Math.sin(t * 4 + k))] } }, 1, false); breathAt(x + 0.3, 1.8, GZ + 0.5, k); }
      for (let k = 0; k < 8; k++) { const u = (t * 0.5 + k / 8) % 1; s.fx(`nt${k % 2}`, 240, 240, noteCard(k % 2), -4 + 1.1 * k + 0.4 * Math.sin(t * 2 + k), 2.6 + 2.6 * u, GZ + 0.8, 0.55, 0.55, { rot: 0.3 * Math.sin(t * 3 + k) }); }
      for (let k = 0; k < 5; k++) s.fx("glow", 200, 200, flare, -9 + 4.5 * k, 2.0, GZ + 1.4, 1.3, 1.3, { soft: true });
      snow(); stars(); break;
    }
    case 5: {                                            // the British listen, then sing back
      const sung = t >= T.T_BACK;
      for (let k = 0; k < 7; k++) { const x = -6 + 2.0 * k; s.who(10 + k, TOMMY(k), `tm${k % 4}`, x, 0.5, BZ, { mode: "stand", expr: sung ? "relief_open" : "dazed", headTilt: ar(0.1 * Math.sin(t * 3 + k)), arms: sway(t, k) }, 1, false); if (sung) breathAt(x + 0.3, 1.8, BZ - 0.3, k); }
      if (sung) for (let k = 0; k < 6; k++) { const u = (t * 0.5 + k / 6) % 1; s.fx(`nt${k % 2}`, 240, 240, noteCard(k % 2), -5 + 2.0 * k, 2.6 + 2.4 * u, BZ - 1, 0.55, 0.55, { rot: 0.3 * Math.sin(t * 3 + k) }); }
      for (let k = 0; k < 5; k++) { const x = -9 + 4.5 * k; s.fx("glow", 200, 200, flare, x, 2.0, GZ + 1.4, 1.3, 1.3, { soft: true }); }
      for (let k = 0; k < 6; k++) s.who(40 + k, GERMAN(k), `gm${k % 4}`, -9 + 3.6 * k, 0.5, GZ, { mode: "stand", expr: "relief_open", arms: sway(t, k) }, 1, false);
      snow(); stars(); break;
    }
    case 6: {                                            // dawn: both sides climb out with raised hands
      const u = clamp01(a / 4.4);
      for (let k = 0; k < 8; k++) { const x = -7 + 2.0 * k, off = 0.35 * (k % 3), uk = clamp01((u * 1.15) - 0.06 * k), z = BZ - 0.8 - (BZ - 1.4 - off) * smooth(uk); s.who(10 + k, TOMMY(k), `tm${k % 4}`, x * (1 - 0.7 * smooth(uk)), 0, z, { mode: uk > 0 && uk < 1 ? "stroll" : "stand", phase: q(stroll(t, k, 1.2), 24), expr: uk > 0.5 ? "smile" : "nervous", arms: { l: [-0.55, -0.95], r: [0.55, -0.95] } }, 1, true); }
      for (let k = 0; k < 8; k++) { const x = -7 + 2.0 * k, off = 0.35 * (k % 3), uk = clamp01((u * 1.15) - 0.06 * k), z = GZ + 0.8 + (-GZ - 1.4 - off) * smooth(uk); s.who(40 + k, GERMAN(k), `gm${k % 4}`, x * (1 - 0.7 * smooth(uk)), 0, z, { mode: uk > 0 && uk < 1 ? "stroll" : "stand", phase: q(stroll(t, k + 3, 1.2), 24), expr: uk > 0.5 ? "smile" : "nervous", arms: { l: [-0.55, -0.95], r: [0.55, -0.95] } }, 1, true); }
      snow(); break;
    }
    case 7: {                                            // handshakes; swapping gifts
      for (let k = 0; k < 5; k++) { const x = (k - 2) * 2.4, z = -0.5 * k + 1.0, sh0 = k === 2; s.who(10 + k, TOMMY(k), `tm${k % 4}`, x - 0.75, 0, z, { mode: "stand", expr: "grin", arms: { l: [-0.5, 0.3], r: [0.6, ar(sh0 ? 0.25 + 0.15 * Math.sin(t * 9) : 0.3)] } }, 1, true); s.who(40 + k, GERMAN(k), `gm${k % 4}`, x + 0.75, 0, z, { mode: "stand", expr: "grin", arms: { l: [-0.6, ar(sh0 ? 0.25 + 0.15 * Math.sin(t * 9) : 0.3)], r: [0.5, 0.3] } }, 1, true); }
      if (t >= T.T_HANDS) s.burst(T.T_HANDS, 0, 1.2, 0.8, 2.0, 0.3, "#ffe9a0");
      const gift = (k: number, card: (p: Pen) => void, nm: string, x0: number, x1: number, t0: number) => { const u = clamp01((t - t0) / 0.8); if (u > 0 && u < 1) s.fx(nm, 160, 140, card, x0 + (x1 - x0) * u, 1.4 + 0.9 * Math.sin(Math.PI * u), 0.6 + 0.3 * k, 0.55, 0.45, { rot: 4 * u }); };
      gift(0, cigs, "cg", -0.8, 0.8, T.T_GIFTS); gift(1, choc, "ch", 0.8, -0.8, T.T_GIFTS + 0.5); gift(2, button, "bt", -2.4, -1.0, T.T_GIFTS + 1.0); gift(3, cigs, "cg", 3.2, 1.6, T.T_GIFTS + 1.4); gift(4, button, "bt", 1.6, 3.2, T.T_GIFTS + 1.8);
      snow(); break;
    }
    case 8: {                                            // they bury their dead together
      for (let k = 0; k < 6; k++) { const x = -5.5 + 2.2 * k; s.who(10 + k, BARE(k % 2 ? GERMAN(k) : TOMMY(k)), `bu${k % 4}${k % 2}`, x, 0, 1.8 + 0.4 * (k % 2), { mode: "stand", expr: "pained", headTilt: 0.28, arms: { l: [-0.3, 0.6], r: [0.3, 0.6] } }, 1, true); s.fx("hm", 180, 130, helmetC, x + (k % 2 ? 0.45 : -0.45), 0.95, 1.8 + 0.4 * (k % 2) + 0.15, 0.55, 0.4); }
      for (let k = 0; k < 3; k++) { const u = (t * 1.3 + k / 3) % 1; s.fx("dirt", 120, 120, (p: Pen) => { p.ell(40, 40, 22, 16, "#4a3a30", 5); }, -4 + 4 * k, 0.4 + 0.9 * Math.sin(Math.PI * u), -0.4, 0.4, 0.3, { rot: 5 * u }); }
      snow(); break;
    }
    case 9: {                                            // a football match in the mud
      const bx = 6.5 * Math.sin(t * 0.9), bz = 2.2 * Math.sin(t * 1.5 + 1.0), by = 0.35 + 0.5 * Math.abs(Math.sin(t * 5));
      s.fx("ball", 120, 120, ball, bx, by, bz + 0.3, 0.5, 0.5, { rot: t * 6 });
      for (let k = 0; k < 20; k++) { const team = k % 2, home = ((k >> 1) % 5 - 2) * 3.2 * (team ? 1 : -1) * 0.5 + (team ? 3 : -3), chase = 0.55 * (k >> 1) / 10, px = home + (bx - home) * (0.45 - chase) + 1.6 * Math.sin(t * 1.3 + k), pz = (((k >> 1) % 4) - 1.5) * 1.8 + (bz - (((k >> 1) % 4) - 1.5) * 1.8) * 0.4 + 0.6 * Math.cos(t * 1.1 + k); s.who(10 + k, team ? GERMAN(k) : TOMMY(k), `fb${k % 4}${team}`, px, 0, pz, { mode: "stroll", phase: q(((t * 2.2 + 0.13 * k) % 1), 24), expr: k % 3 ? "laugh" : "grin", arms: { l: [-0.5, ar(-0.3 + 0.3 * Math.sin(t * 6 + k))], r: [0.5, ar(-0.3 - 0.3 * Math.sin(t * 6 + k))] } }, 1, k < 12); }
      for (let k = 0; k < 6; k++) { const x = -8 + 3.2 * k; s.who(60 + k, k % 2 ? GERMAN(k) : TOMMY(k), `sp${k % 4}${k % 2}`, x, 0, 5.2, { mode: "stand", expr: "laugh", arms: { l: [-0.6, -0.95 + 0.1 * Math.round(Math.sin(t * 8 + k))], r: [0.6, -0.95] } }, 1, true); }
      snow(); break;
    }
    case 10: {                                           // the general is furious
      const rage = clamp01((t - T.T_FURIOUS + 0.3) / 0.5), ph = Math.sin(t * 22);
      s.who(1, GENERAL, "gen", 0, 0, -6.0, { mode: "stand", expr: "pained", headTilt: ar(0.12 * ph * rage), arms: { l: [-0.5, ar(0.5 + 0.2 * ph * rage)], r: [0.5, ar(0.5 - 0.2 * ph * rage)] } }, 1.1);
      for (let n = 0; n < 5; n++) { const u = (t * 1.0 + n / 5) % 1; s.fx("steam", 200, 200, breath, 0.25 * (n - 2), 3.4 + 1.2 * u, -6.0, 0.9, 0.9, { soft: true }); }
      s.who(2, AIDE, "aide", 2.5, 0, -4.2, { mode: "stand", expr: "nervous", headTilt: 0.1, arms: { l: [-0.3, 0.2], r: [0.3, 0.2] } });
      if (t >= T.T_FURIOUS) s.fx("bang", 360, 220, (p: Pen) => { p.poly([[20, 100], [70, 20], [120, 90], [200, 10], [240, 90], [330, 40], [330, 140], [250, 190], [190, 150], [120, 200], [70, 150]], "#ffe066", 10); const g = p.g; font(g, 64); g.fillStyle = "#c92a2e"; g.fillText("!!!", 180, 100); }, -1.9, 3.4, -5.6, 2.0 * pop(t - T.T_FURIOUS), 1.2 * pop(t - T.T_FURIOUS), { rot: -0.1 });
      break;
    }
    case 11: {                                           // orders: never again
      const age = t - T.T_ORDERS, up = age < -0.25 ? 1 : age < 0 ? -age / 0.25 : 0;
      s.who(1, GENERAL, "gen", -1.6, 0, -6.2, { mode: "stand", expr: "stern", arms: { l: [-0.5, 0.3], r: [0.6, -0.4 + 0.3 * up] } }, 1.1);
      s.fx("tel", 300, 240, telegram, 1.2, 2.5, -5.6, 1.8 * pop(Math.max(0, a), 0.3), 1.44 * pop(Math.max(0, a), 0.3), { rot: 0.05 * Math.sin(t * 3) });
      if (age < 0.4) s.fx("stamper", 240, 280, stamper, 1.2, 3.3 + 0.8 * up, -5.5, 0.6, 0.7);
      if (age >= 0) { s.fx("stp", 600, 240, inkStamp("FORBIDDEN"), 0.9, 2.0, -5.4, 1.6 * pop(age), 0.64 * pop(age), { rot: -0.08 }); s.burst(T.T_ORDERS, 1.2, 2.0, -5.3, 3.0, 0.3, "#ffd27a"); }
      { const u = clamp01((t - T.T_ORDERS - 0.4) / 1.2); s.who(2, AIDE, "aide", 3.0 + 4.0 * u, 0, -3.8, { mode: u > 0 && u < 1 ? "stroll" : "stand", phase: q(((t * 2.2) % 1), 24), expr: "nervous", arms: { l: [-0.55, -0.5], r: [0.55, -0.5] } }); }
      break;
    }
    case 12: {                                           // it never did, not on that scale: an empty no man's land
      s.fx("ball", 120, 120, ball, 0.5, 0.35, 0.0, 0.5, 0.5, { rot: 0.6 });
      s.fx("hm", 180, 130, helmetC, -3.2, 0.25, 1.2, 0.7, 0.5, { rot: 0.25 });
      for (let k = 0; k < 4; k++) s.who(10 + k, TOMMY(k, true), `tm${k % 4}r`, -6 + 4 * k, 0, BZ, { mode: "stand", expr: "dazed", arms: { l: [-0.4, -0.2], r: [0.3, -0.1] } }, 1, false);
      for (let k = 0; k < 4; k++) s.who(40 + k, GERMAN(k, true), `gm${k % 4}r`, -6 + 4 * k, 0, GZ, { mode: "stand", expr: "dazed", arms: { l: [-0.4, -0.2], r: [0.3, -0.1] } }, 1, false);
      snow(24); break;
    }
    case 13: {                                           // one night, one morning: enemies choose to be human
      for (let k = 0; k < 8; k++) { const x = -9 + 2.4 * k + 0.3 * hh(k, 2), z = -0.5 + 3.0 * ((k % 3) - 1), laugh = Math.sin(t * 6 + k) > 0; s.who(10 + k, TOMMY(k), `tm${k % 4}`, x - 0.8, 0, z, { mode: "stand", expr: laugh ? "laugh" : "smile", arms: { l: [-0.5, 0.3], r: [0.3, ar(0.1 + 0.1 * Math.sin(t * 3 + k))] } }, 1, k < 6); s.who(40 + k, GERMAN(k), `gm${k % 4}`, x + 0.8, 0, z, { mode: "stand", expr: laugh ? "laugh" : "smile", arms: { l: [-0.3, ar(0.1 - 0.1 * Math.sin(t * 3 + k))], r: [0.5, 0.3] } }, 1, k < 6); }
      for (let k = 0; k < 16; k++) { const u = (t * 0.25 + hh(k, 2)) % 1; s.fx("fl", 60, 60, flake, -10 + 20 * hh(k, 3), 7 * (1 - u), -4 + 8 * hh(k, 4), 0.14, 0.14, { soft: true }); }
      break;
    }
    case 14: {                                           // CTA: a candle and a ball in the snow
      s.fx("cnd", 120, 240, candle, 0.0, 0.7, -2.0, 0.5, 1.0, { rot: 0 }); s.fx("glow", 200, 200, flare, 0.0, 1.0, -2.0, 3.0, 3.0, { soft: true });
      s.fx("ball", 120, 120, ball, 0.9, 0.35, -1.2, 0.5, 0.5, { rot: 0.4 });
      snow(30, 0, -2, 14, 8); stars(); break;
    }
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW; void smooth; void fxPuff; void smoke;
export type { V3, SetName, Expr, FrontOpts };
