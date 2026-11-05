// Cast of the cadaver-synod short: bean-heads play Pope Stephen, the corpse of Pope Formosus (cartoon: spiral eyes), bishops, deacon, gravediggers, the mob.
// stage(f, cam) -> character cards + effect cards for the shot at frame f. All positions are set-local (toW converts).
import * as THREE from "three";
import { Pen, bodyFront, fxBurst, fxPuff, fxSplash, fxContact, fxShadow, SKINS, INK, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import * as T from "./story";
import { FPS, V3, SetName, toW, shotAt, throneX } from "./story";

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();

// ---------------- outfits ----------------
const PALE = "#b9c9b0";
const STEPHEN: Outfit = { jacket: "#b02a30", pants: "#8a2a30", boots: "#2a2a30", hat: "mitre", buttons: "#e8c45a", belt: "#e8c45a", skin: SKINS[0], build: "stout" };
const CORPSE: Outfit = { jacket: "#efe9d8", pants: "#efe9d8", boots: "#2a2a30", hat: "mitre", buttons: "#e8c45a", belt: "#e8c45a", skin: PALE, build: "adult" };
const CORPSE_T: Outfit = { jacket: "#d8d2c0", pants: "#d8d2c0", boots: "#6a5a4a", hat: null, skin: PALE, build: "adult" };
const BISHOP = (v: number): Outfit => ({ jacket: ["#6a2a7a", "#a02a38", "#2a4a8a", "#2a6a4a"][v % 4], pants: "#2a2a30", boots: "#2a2a30", hat: v % 2 ? "mitre" : "cap", cap: "#a02a38", buttons: "#e8c45a", skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult" });
const DEACON: Outfit = { jacket: "#f2efe4", pants: "#d8d2c0", boots: "#3a2a20", hat: "hair", hair: "#6a4a2a", belt: "#c8b070", skin: SKINS[1], build: "adult" };
const DIGGER = (v: number): Outfit => ({ jacket: ["#6a5a3a", "#4a4a5a", "#7a4a3a"][v % 3], pants: "#3a3228", boots: "#3a2a20", hat: "cap", cap: ["#8a7a5a", "#5a4a3a"][v % 2], skin: SKINS[v % 4], build: v % 2 ? "stout" : "adult" });
const MOB = (v: number): Outfit => ({ jacket: ["#8f6b4a", "#6e7f4a", "#9a7a52", "#7a6a8c", "#a05a46", "#3f7f86"][v % 6], pants: "#4a4038", boots: "#3a2a20", hat: v % 3 === 0 ? "cap" : "hair", cap: "#8a6a46", hair: ["#5a3b2a", "#2a2022", "#8a6a3a"][v % 3], skin: SKINS[v % 4], build: v % 5 === 3 ? "stout" : "adult" });
const FISHER: Outfit = { jacket: "#3a5a7a", pants: "#4a4038", boots: "#3a2a20", hat: "cap", cap: "#2a3a4a", moustache: "#5a4a3a", skin: SKINS[1], build: "stout" };
const POPE2: Outfit = { jacket: "#3f7a5a", pants: "#2a5a40", boots: "#2a2a30", hat: "mitre", buttons: "#e8c45a", belt: "#e8c45a", skin: SKINS[2], build: "adult" };

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
const bubble = (text: string) => (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 390, 170, 40), "#ffffff", 9); p.poly([[150, 168], [190, 232], [210, 168]], "#ffffff", 9); p.poly([[154, 160], [190, 218], [206, 160]], "#ffffff", 0); font(g, text.length > 5 ? 52 : 74); g.fillStyle = "#241726"; g.fillText(text, 200, 92); };
const scroll = (l1: string, l2: string, col = "#c92a2e") => (p: Pen) => { const g = p.g; p.poly(rr(14, 30, 586, 250, 20), "#f2e8c8", 9); p.poly(rr(6, 20, 40, 260, 14), "#d8c890", 8); p.poly(rr(560, 20, 594, 260, 14), "#d8c890", 8); font(g, 54); g.fillStyle = col; g.fillText(l1, 300, 100); g.fillText(l2, 300, 176); };
const inkStamp = (word: string, col = "#c92a2e") => (p: Pen) => { const g = p.g; g.save(); g.translate(300, 120); g.rotate(-0.06); g.strokeStyle = col; g.lineWidth = 16; g.strokeRect(-270, -92, 540, 184); g.fillStyle = col; font(g, 100); g.fillText(word, 0, 8); g.restore(); };
const gavel = (p: Pen) => { p.stroke([[60, 230], [170, 120]], 18, "#6a3a22"); p.poly(rr(120, 50, 230, 130, 14), "#8a5a32", 9); p.poly(rr(108, 44, 126, 136, 6), "#3d414c", 6); p.poly(rr(224, 44, 242, 136, 6), "#3d414c", 6); };
const finger = (p: Pen) => { p.poly(rr(20, 70, 160, 124, 26), "#ecc9a8", 9); p.ell(140, 96, 12, 14, "#fff2e4", 4); p.arc(60, 98, 6, 22, 100, 260, 3, "#b88a6a"); };
const robeCard = (p: Pen) => { p.poly([[30, 20], [150, 8], [270, 20], [250, 170], [150, 230], [50, 170]], "#efe9d8", 9); p.stroke([[150, 8], [150, 228]], 8, "#d9b04a"); p.stroke([[70, 60], [230, 60]], 8, "#d9b04a"); };
const bundle = (p: Pen) => { p.poly(rr(20, 70, 320, 170, 40), "#d8d2c0", 9); p.stroke([[110, 70], [110, 170]], 6, "#8a7a5a"); p.stroke([[210, 70], [210, 170]], 6, "#8a7a5a"); p.ell(330, 120, 38, 32, PALE, 8); p.ell(338, 112, 11, 11, "#ffffff", 4); p.arc(338, 112, 6, 6, 0, 270, 3, INK); p.poly([[318, 92], [330, 36], [352, 96]], "#f4efe2", 8); p.stroke([[20, 150], [-6, 176]], 12, "#6a5a4a"); p.stroke([[20, 96], [-4, 66]], 12, "#6a5a4a"); };
const portrait = (crossed: boolean) => (p: Pen) => { const g = p.g; p.poly(rr(14, 14, 226, 286, 14), "#d9b04a", 10); p.poly(rr(34, 34, 206, 266, 8), "#d8c8a8", 6); p.ell(120, 176, 56, 62, PALE, 8); p.poly([[80, 122], [120, 40], [160, 122]], "#f4efe2", 8); p.ell(102, 168, 9, 9, "#ffffff", 3); p.ell(138, 168, 9, 9, "#ffffff", 3); p.stroke([[100, 206], [140, 206]], 5, INK); if (crossed) { g.strokeStyle = "#c92a2e"; g.lineWidth = 22; g.beginPath(); g.moveTo(40, 40); g.lineTo(200, 262); g.moveTo(200, 40); g.lineTo(40, 262); g.stroke(); } };
const tombstone = (p: Pen) => { const g = p.g; p.poly([[20, 360], [20, 140], [60, 60], [140, 20], [220, 60], [260, 140], [260, 360]], "#8a8a96", 12); p.stroke([[40, 150], [240, 150]], 4, "#6a6a76"); g.fillStyle = "#2a2a32"; font(g, 40); g.fillText("FORMOSUS", 140, 120); font(g, 56); g.fillText("896", 140, 220); p.stroke([[140, 250], [140, 320]], 10, "#2a2a32"); p.stroke([[110, 275], [170, 275]], 10, "#2a2a32"); };
const page = (n: number) => (p: Pen) => { const g = p.g; p.poly(rr(14, 14, 186, 226, 10), "#f6f1e0", 9); p.poly(rr(14, 14, 186, 62, 10), "#c92a2e", 8); font(g, 90); g.fillStyle = "#241726"; g.fillText(String(n), 100, 148); };
const slate = (text: string) => (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 590, 230, 22), "#2f3a34", 14); p.poly(rr(24, 24, 576, 216, 14), "#3f524a", 0); g.fillStyle = "#f2ead2"; font(g, 100); g.fillText(text, 300, 124); };
const flameCard = (p: Pen) => { p.poly([[60, 200], [20, 130], [60, 80], [70, 10], [110, 80], [130, 140], [100, 200]], "#ff9a2a", 7); p.poly([[64, 196], [44, 150], [70, 120], [96, 150], [86, 196]], "#ffe066", 0); };
const fly = (wing: number) => (p: Pen) => { p.ell(60, 60, 10, 7, INK, 0); p.ell(52, 48 - wing * 6, 12, 7, "#cfd8e8", 3); p.ell(70, 48 - wing * 6, 12, 7, "#cfd8e8", 3); };
const bat = (wing: number) => (p: Pen) => { p.ell(100, 70, 12, 14, "#1a1420", 0); p.poly([[92, 62], [30, 40 - wing * 22], [60, 70], [20, 80 - wing * 16], [92, 80]], "#1a1420", 3); p.poly([[108, 62], [170, 40 - wing * 22], [140, 70], [180, 80 - wing * 16], [108, 80]], "#1a1420", 3); };
const bird = (wing: number) => (p: Pen) => { p.arc(60, 64 - wing * 12, 40, 22, 190, 350, 6, "#241726"); p.arc(120, 64 - wing * 12, 40, 22, 190, 350, 6, "#241726"); };
const mitreCard = (p: Pen) => { p.poly([[30, 190], [50, 70], [100, 6], [150, 70], [170, 190]], "#f4efe2", 9); p.stroke([[100, 70], [100, 140]], 8, "#d9b04a"); p.stroke([[70, 104], [130, 104]], 8, "#d9b04a"); p.stroke([[30, 176], [170, 176]], 14, "#d9b04a"); };
const mote = (p: Pen) => { p.ell(30, 30, 9, 9, "#fff3b0", 0); };
const dirt = (p: Pen) => { p.ell(40, 40, 22, 16, "#4a3a30", 5); p.ell(70, 52, 12, 9, "#6a5a48", 4); };

// ---------------- helpers ----------------
const stroll = (t: number, i: number, speed = 1.0) => ((t * 0.7 * speed + hh(i, 4)) % 1 + 1) % 1;
const sway = (t: number, i: number): FrontOpts["arms"] => ({ l: [-0.55 + 0.08 * Math.sin(t * 2.3 + i), 0.3 + 0.06 * Math.sin(t * 3.1 + i)], r: [0.55 - 0.08 * Math.sin(t * 2.7 + i), 0.3 + 0.06 * Math.sin(t * 2.9 + i * 2)] });
const cheer = (t: number, i: number): FrontOpts["arms"] => ({ l: [-0.6 - 0.1 * Math.round(Math.sin(t * 9 + i)), -0.95], r: [0.6, -0.95 + 0.08 * Math.round(Math.sin(t * 9 + i * 2))] });

export const stage = (f: number, cam: CamInfo): Stage => {
  const sh = shotAt(f), t = f / FPS, s = new S(cam, sh.set, t), id = sh.id, a = t - sh.a / FPS;
  const pop = (age: number, k = 0.55) => 1 + k * (1 - Math.min(1, Math.max(0, age) / 0.14));
  const bishops = (n: number, up: boolean, xs = 5.2, z0 = -13.5, rows = 3) => { for (let k = 0; k < n; k++) { const side = k % 2 ? 1 : -1, x = side * (xs + 1.5 * (k >> 1) % 4 + 0.4 * hh(k, 2)), z = z0 + 2.2 * (Math.floor(k / 4) % rows); s.who(200 + k, BISHOP(k), `bi${k % 4}${k % 2}`, x, 0, z, { mode: "stand", expr: up ? (k % 2 ? "laugh" : "grin") : "stern", arms: up ? cheer(t, k) : sway(t, k) }); } };
  const motes = (set: V3, n = 6) => { for (let k = 0; k < n; k++) { const u = (t * 0.25 + hh(k, 7)) % 1; s.fx("mote", 60, 60, mote, set[0] + (hh(k, 8) - 0.5) * 6, 0.6 + 3.2 * u, set[2] + (hh(k, 9) - 0.5) * 4, 0.1, 0.1, { soft: true }); } };
  switch (id) {
    case 1: {                                            // HOOK A: the corpse rises, is put on a throne and carried off
      const up = smooth(t / 0.9), moving = t >= 0.95, tx = throneX(t), tz = -4.8 + 1.4 * clamp01(t - 1.0);
      if (!moving) s.who(1, CORPSE, "cp", 0, -1.5 + 2.4 * up, -4.8, { mode: "stand", expr: "dazed", arms: { l: [-0.5, 0.5], r: [0.5, 0.5] } }, 1, false);
      else s.who(1, CORPSE, "cp", tx, 1.1 + 0.05 * Math.sin(t * 9), tz, { mode: "sit", expr: "dazed", headTilt: 0.18 * Math.sin(t * 8), arms: { l: [-0.5, 0.6], r: [0.5, 0.6] } }, 1, false);
      for (let k = 0; k < 4; k++) { const sx = k % 2 ? 1 : -1, lx = tx + (k >> 1 ? 1.9 : -1.9); s.who(10 + k, DIGGER(k), `dg${k % 3}`, moving ? lx : (k - 1.5) * 1.6, 0, moving ? tz + sx * 0.7 : -3.0 + 0.2 * (k % 2), { mode: moving ? "stroll" : "stand", phase: q(stroll(t, k, 2.4), 24), expr: "laugh", arms: moving ? { l: [-0.4, -0.2], r: [0.4, -0.2] } : cheer(t, k) }); }
      s.who(20, STEPHEN, "stp", moving ? tx + 3.4 : 3.0, 0, moving ? tz + 0.3 : -2.5, { mode: moving ? "stroll" : "stand", phase: q(stroll(t, 20, 2.2), 24), expr: "grin", arms: { l: [-0.55, -0.95], r: [0.55, -0.4] } });
      if (t < 1.6) for (let k = 0; k < 4; k++) { const u = clamp01((t - 0.1 * k) / 1.0); s.fx("dirt", 100, 100, dirt, -1.2 + 0.9 * k, 0.3 + 2.4 * Math.sin(Math.PI * u), -4.8 + 0.3 * k, 0.5, 0.4, { rot: 5 * u }); }
      for (let k = 0; k < 3; k++) { const u = (t * 0.35 + k / 3) % 1; s.fx("bat", 200, 140, bat(Math.sin(t * 22 + k * 2)), -9 + 3 * k + 30 * u * 0.3 + throneX(t) * 0.6, 7 + k, -8, 1.3, 0.9); }
      break;
    }
    case 2: {                                            // HOOK B: the trial; gavel; LOST
      const after = t - T.T_GAVEL, droop = after >= 0 ? 0.5 : 0.18 + 0.05 * Math.sin(t * 3);
      s.who(1, CORPSE, "cp", 0, 1.3, -16.4, { mode: "sit", expr: "dazed", headTilt: droop, arms: { l: [-0.4, 0.7], r: [0.4, 0.7] } }, 1, false);
      s.who(2, STEPHEN, "stp", -3.0, 0, -12.8, { mode: "stand", expr: after >= 0 ? "laugh" : "grin", arms: { l: [-0.55, -0.95], r: [0.6, -0.3 + 0.1 * Math.sin(t * 6)] } });
      bishops(14, true);
      const gp = after >= -0.2 && after < 0.6 ? Math.max(0, Math.min(1, 1 - Math.abs(after) * 5)) : 0, g0 = after < 0 ? clamp01(1 + after * 5) : 0;
      s.fx("gavel", 260, 260, gavel, 1.6, 1.5 + 0.7 * (after < 0 ? 1 - Math.max(0, 1 + after * 5) : 0) + 0.0, -12.2, 0.9, 0.9, { rot: after < 0 ? 0.8 * (1 + after * 4) - 0.2 * g0 : -0.3 });
      if (after >= 0) { s.fx("lost", 600, 240, inkStamp("LOST!"), 0, 3.9, -14.4, 2.0 * pop(after), 0.8 * pop(after), { rot: -0.06 }); s.burst(T.T_GAVEL, 0, 3.8, -14.3, 3.0, 0.3, "#ffe9a0"); }
      void gp;
      break;
    }
    case 3: {                                            // Stephen hates Formosus
      const hate = t >= T.T_HATE;
      s.who(1, STEPHEN, "stp", 0, 0, -10.9, { mode: "stand", expr: "stern", arms: { l: [-0.45 + 0.08 * Math.sin(t * 17), 0.5], r: [0.45 - 0.08 * Math.sin(t * 15), 0.5] }, headTilt: 0.05 * Math.sin(t * 11) }, 1.05);
      s.fx("portrait", 240, 300, portrait(hate), -1.7, 2.3, -10.3, 1.4, 1.75, { rot: 0.05 * Math.sin(t * 2) });
      for (let k = 0; k < 4; k++) { const u = ((t * 0.9 + k / 4) % 1); s.fx("steam", 300, 300, (p) => fxPuff(p, 0.2 + 0.6 * u), 0.2 * (k - 1.5), 3.0 + 1.2 * u, -10.9, 0.9, 0.9, { soft: true }); }
      if (hate) s.burst(T.T_HATE, -2.3, 2.2, -10.2, 2.0, 0.3, "#ff8a6a");
      break;
    }
    case 4: {                                            // dead for nine months
      const nOut = clamp01((t - 9.6) / 1.5);
      s.fx("tomb", 280, 380, tombstone, 0, 1.55, -5.0, 2.1, 2.85, { rot: 0.02 * Math.sin(t * 1.3) });
      for (let k = 0; k < 9; k++) { const t0 = 9.5 + 0.18 * k, u = clamp01((t - t0) / 0.7); if (u > 0 && u < 1) s.fx(`pg${k}`, 200, 240, page(k + 1), 1.3 + 1.3 * u, 2.4 + 1.6 * u, -4.5, 0.7, 0.84, { rot: -1.2 * u }); }
      if (t >= T.T_MONTHS) s.fx("nine", 600, 240, slate("9 MONTHS"), 0.0, 3.5, -4.2, 2.8 * pop(t - T.T_MONTHS), 1.12 * pop(t - T.T_MONTHS), { rot: -0.04 });
      for (let k = 0; k < 4; k++) { const u = (t * 0.3 + k / 4) % 1; s.fx("bat", 200, 140, bat(Math.sin(t * 22 + k * 2)), -5 + 10 * u, 5.5 + 0.5 * k, -9, 1.2, 0.85); }
      void nOut; motes([0, 0, -5]);
      break;
    }
    case 5: {                                            // Stephen does not care
      const w = Math.sin(t * 9);
      s.who(1, STEPHEN, "stp", 0, 0, -3.2, { mode: "stand", expr: "smile_closed", headTilt: 0.12 * Math.sin(t * 6), arms: { l: [-0.75, 0.1 + 0.15 * w], r: [0.75, 0.1 - 0.15 * w] } }, 1.05);
      motes([0, 0, -3.2], 5);
      break;
    }
    case 6: {                                            // his men dig up the body
      for (let k = 0; k < 3; k++) { const x = (k - 1) * 2.2, ph = Math.sin(t * 11 + k * 2); s.who(10 + k, DIGGER(k), `dg${k}`, x, 0, k === 1 ? -7.4 : -2.6, { mode: "stand", expr: "laugh", held: "fork", arms: { l: [-0.4, 0.3 + 0.2 * ph], r: [0.5, 0.2 - 0.2 * ph] } }); }
      for (let k = 0; k < 6; k++) { const u = clamp01(((t * 2.3 + k * 0.17) % 1)); s.fx("dirt", 100, 100, dirt, -0.9 + 0.38 * k, 0.2 + 2.6 * Math.sin(Math.PI * u), -4.9 + 0.2 * (k % 2), 0.55, 0.4, { rot: 6 * u + k }); }
      if (t >= T.T_DIG + 0.9) s.burst(T.T_DIG + 0.9, 0, 0.6, -4.8, 2.4, 0.3, "#d8c8a0");
      break;
    }
    case 7: {                                            // dressed in papal robes
      const robed = t >= T.T_ROBE + 0.3, mitred = t >= T.T_MITRE;
      const o = robed ? (mitred ? CORPSE : { ...CORPSE, hat: null }) : CORPSE_T;
      s.who(1, o, `cp${robed ? 1 : 0}${mitred ? 1 : 0}`, 0, 0, -4.0, { mode: "stand", expr: "dazed", headTilt: 0.12 * Math.sin(t * 5), arms: { l: [-0.5, 0.5 + 0.1 * Math.sin(t * 4)], r: [0.5, 0.5] } });
      for (let k = 0; k < 2; k++) s.who(10 + k, DIGGER(k + 1), `dg${k}`, (k ? 1 : -1) * 1.7, 0, -4.0, { mode: "stand", expr: "grin", arms: { l: [-0.5, -0.4 + 0.15 * Math.sin(t * 8 + k)], r: [0.5, -0.4 - 0.15 * Math.sin(t * 8 + k)] } });
      if (t >= T.T_ROBE && t < T.T_ROBE + 0.35) s.fx("robe", 300, 240, robeCard, 0, 1.6 + 1.4 * (1 - (t - T.T_ROBE) / 0.35), -3.9, 1.3, 1.04, { rot: 0.2 });
      if (t >= T.T_MITRE - 0.3 && t < T.T_MITRE) { const u = (t - T.T_MITRE + 0.3) / 0.3; s.fx("mitre", 200, 200, mitreCard, 0, 4.6 - 1.7 * u * u, -3.9, 0.7, 0.7, { rot: 0.3 * u }); }
      if (t >= T.T_MITRE) s.burst(T.T_MITRE, 0, 3.0, -3.9, 1.8, 0.3, "#fff3b0");
      break;
    }
    case 8: {                                            // carried down the nave into the church
      const u = clamp01(a / 2.2), z = 4 - 18 * u;
      s.who(1, CORPSE, "cp", 0, 0, z, { mode: "stroll", phase: q(stroll(t, 1, 2.0), 24), expr: "dazed", arms: { l: [-0.5, 0.2], r: [0.5, 0.2] } });
      for (let k = 0; k < 2; k++) s.who(10 + k, DIGGER(k), `dg${k}`, (k ? 1 : -1) * 1.3, 0, z + 0.2, { mode: "stroll", phase: q(stroll(t, 10 + k, 2.0), 24), expr: "grin", arms: { l: [-0.4, -0.3], r: [0.4, -0.3] } });
      for (let k = 0; k < 8; k++) { const side = k % 2 ? 1 : -1; s.who(100 + k, BISHOP(k), `bi${k % 4}${k % 2}`, side * 4.6, 0, 2 - 3.4 * (k >> 1), { mode: "stand", expr: "shock", arms: sway(t, k) }); }
      motes([0, 0, -4], 6);
      break;
    }
    case 9: {                                            // the deacon answers for the corpse
      const n = Math.floor(a / 0.8) % 4, words = ["YES!", "NO!", "I... I DO!", "YES!"];
      s.who(1, CORPSE, "cp", 0, 1.3, -16.4, { mode: "sit", expr: "dazed", headTilt: 0.2 + 0.06 * Math.sin(t * 4), arms: { l: [-0.4, 0.7], r: [0.4, 0.7] } }, 1, false);
      s.who(2, DEACON, "dc", 1.2, 0, -13.0, { mode: "stand", expr: "nervous", arms: { l: [-0.5, 0.4 + 0.1 * Math.sin(t * 8)], r: [0.5, 0.4 - 0.1 * Math.sin(t * 8)] } }, 0.88);
      s.who(3, STEPHEN, "stp", -3.2, 0, -12.2, { mode: "stand", expr: "stern", arms: { l: [-0.5, 0.4], r: [0.6, -0.4 + 0.1 * Math.sin(t * 5)] } });
      s.fx(`b${n}`, 400, 240, bubble(words[n]), 0.9, 4.4, -15.8, 1.7 * pop((a % 0.8)), 1.0 * pop((a % 0.8)), { rot: -0.04 });
      bishops(10, false); motes([0, 0, -12], 5);
      break;
    }
    case 10: {                                           // the charges
      s.who(1, STEPHEN, "stp", 0, 0, -9.2, { mode: "stand", expr: "stern", arms: { l: [-0.55, 0.3], r: [0.6, -0.5 + 0.12 * Math.sin(t * 6)] } }, 1.05);
      if (t >= T.T_OATH - 0.1) s.fx("oath", 600, 290, scroll("LYING", "UNDER OATH"), -2.1, 2.9 + 0.3 * Math.sin(t * 2), -8.6, 2.1 * pop(t - T.T_OATH), 1.0 * pop(t - T.T_OATH), { rot: 0.06 });
      if (t >= T.T_ILL - 0.1) s.fx("ill", 600, 290, scroll("ILLEGAL", "POPE"), 2.1, 2.9 + 0.3 * Math.sin(t * 2 + 1), -8.6, 2.1 * pop(t - T.T_ILL), 1.0 * pop(t - T.T_ILL), { rot: -0.06 });
      bishops(14, false, 4.4, -8.0, 2);
      break;
    }
    case 11: {                                           // the corpse says nothing
      s.who(1, CORPSE, "cp", 0, 1.3, -16.4, { mode: "sit", expr: "dazed", headTilt: 0.25 + 0.04 * Math.sin(t * 3), arms: { l: [-0.4, 0.75], r: [0.4, 0.75] } }, 1, false);
      const fa = t * 3.2;
      s.fx("fly", 120, 120, fly(Math.sin(t * 40)), 0.5 * Math.cos(fa) , 2.9 + 0.35 * Math.sin(fa * 1.7), -16.2 + 0.4 * Math.sin(fa), 0.3, 0.3);
      if (t >= T.T_SILENT) s.fx("dots", 400, 240, bubble("..."), -1.0, 3.9, -16.2, 1.5 * pop(t - T.T_SILENT), 0.9 * pop(t - T.T_SILENT), { rot: 0.05 });
      motes([0, 0, -15], 5);
      break;
    }
    case 12: {                                           // guilty
      const age = t - T.T_GUILTY;
      s.who(1, CORPSE, "cp", 0, 1.3, -16.4, { mode: "sit", expr: "dazed", headTilt: 0.4, arms: { l: [-0.4, 0.7], r: [0.4, 0.7] } }, 1, false);
      s.who(2, STEPHEN, "stp", -2.4, 0, -12.4, { mode: "stand", expr: age >= 0 ? "laugh" : "grin", arms: { l: [-0.55, -0.95], r: [0.55, -0.95 + 0.1 * Math.sin(t * 9)] } });
      s.fx("gavel", 260, 260, gavel, 0.9, 1.5 + (age < 0 ? 0.9 : 0.0), -12.4, 1.1, 1.1, { rot: age < 0 ? 0.9 * (1 + age * 4) : -0.3 });
      if (age >= 0) { s.fx("guilty", 600, 240, inkStamp("GUILTY"), 0, 3.2, -13.2, 2.4 * pop(age), 0.96 * pop(age), { rot: -0.06 }); s.burst(T.T_GUILTY, 0, 3.0, -13.1, 3.0, 0.3, "#ffe9a0"); }
      bishops(12, true, 4.4, -11.0, 2);
      break;
    }
    case 13: {                                           // robes torn off, three fingers cut
      const torn = t >= T.T_TEAR, tear = t - T.T_TEAR, snip = t - T.T_SNIP;
      s.who(1, torn ? CORPSE_T : { ...CORPSE, hat: torn ? null : "mitre" }, `cp${torn ? 1 : 0}`, 0, 1.3, -16.4, { mode: "sit", expr: "dazed", headTilt: 0.25, arms: { l: [-0.4, 0.7], r: [0.4, 0.7] } }, 1, false);
      s.who(2, STEPHEN, "stp", -2.0, 0, -13.4, { mode: "stand", expr: "laugh", arms: { l: [-0.55, -0.7], r: [0.6, -0.5 + 0.2 * Math.sin(t * 12)] } });
      s.who(3, DIGGER(0), "dg0", 2.2, 0, -13.6, { mode: "stand", expr: "grin", arms: { l: [-0.5, -0.6], r: [0.5, -0.6 + 0.2 * Math.sin(t * 12)] } });
      if (torn && tear < 1.0) s.fx("robeF", 300, 240, robeCard, 0.5 + 3.0 * tear, 2.2 + 2.0 * tear - 3.0 * tear * tear, -15.2 + 3.5 * tear, 1.4, 1.1, { rot: 6 * tear });
      if (tear >= 0 && tear < 0.3) s.burst(T.T_TEAR, 0, 2.4, -15.8, 3.0, 0.3, "#ffffff");
      if (snip >= 0) { s.fx("snip", 360, 220, (p: Pen) => { const g = p.g; p.poly([[20, 100], [70, 20], [120, 90], [200, 10], [240, 90], [330, 40], [330, 140], [250, 190], [190, 150], [120, 200], [70, 150]], "#ffe066", 10); font(g, 60); g.fillStyle = "#c92a2e"; g.fillText("SNIP!", 180, 100); }, 0.9, 3.3, -15.3, 2.0 * pop(snip), 1.2 * pop(snip), { rot: 0.1 });
        for (let k = 0; k < 3; k++) { const u = clamp01(snip / 1.0); s.fx("finger", 200, 160, finger, 0.2 + 0.7 * k * u - 0.6 * u, 2.0 + 1.6 * Math.sin(Math.PI * u) - 0.4 * k, -15.8 + 2.2 * u, 0.55, 0.45, { rot: 4 * u + k }); } }
      break;
    }
    case 14: {                                           // thrown into the Tiber
      const u = clamp01((t - T.T_THROW) / 1.3), air = t >= T.T_THROW;
      for (let k = 0; k < 2; k++) s.who(10 + k, DIGGER(k), `dg${k}`, (k ? 1 : -1) * 1.0, 0, -13.4, { mode: "stand", expr: "grin", arms: { l: [-0.55, air ? -0.9 : 0.1], r: [0.55, air ? -0.9 : 0.1] } });
      if (!air) s.fx("bundle", 360, 220, bundle, 0, 1.7, -13.6, 1.8, 1.1, { rot: 0.1 * Math.sin(t * 8) });
      else if (u < 1) s.fx("bundle", 360, 220, bundle, 0.3 * u, 1.8 + 1.6 * Math.sin(Math.PI * Math.min(1, u * 1.1)) - 4.8 * u * u, -13.6 - 3.6 * u, 1.8, 1.1, { rot: 5 * u });
      const sp = t - T.T_SPLASH; if (sp >= 0 && sp < 0.6) { const uu = q(sp / 0.6, 10); s.fx(`splash${uu}`, 300, 300, (p) => fxSplash(p, uu), 0.4, -2.2, -17.4, 3.6, 3.6); }
      s.who(20, STEPHEN, "stp", 3.4, 0, -12.6, { mode: "stand", expr: "laugh", arms: { l: [-0.55, -0.9], r: [0.55, -0.9] } });
      break;
    }
    case 15: {                                           // the mob storms the nave
      const u = clamp01(a / 2.7);
      s.who(1, STEPHEN, "stp", -1.0, 0, -4.0 - 5.0 * u + 4.0, { mode: "stroll", phase: q(stroll(t, 1, 2.8), 24), expr: "shock", arms: { l: [-0.5, -0.9], r: [0.5, -0.9] } }, 1.05);
      for (let k = 0; k < 24; k++) { const z = 8 - 17 * u * (0.82 + 0.18 * hh(k, 3)) - 1.1 * (k >> 2) + 2.0, x = -4.2 + 8.4 * ((k % 4) / 3) + 0.4 * hh(k, 2); s.who(300 + k, MOB(k), `mb${k % 6}${k % 3}`, x, 0, z, { mode: "stroll", phase: q(stroll(t, k, 2.6), 24), expr: k % 2 ? "laugh" : "stern", arms: { l: [-0.55, -0.95], r: [0.55, -0.95] }, held: k % 3 === 0 ? "fork" : undefined }); if (k % 2 === 0) s.fx("flame", 150, 220, flameCard, x + 0.55, 2.7 + 0.1 * Math.sin(t * 15 + k), z, 0.5, 0.72, { rot: 0.1 * Math.sin(t * 9 + k) }); }
      break;
    }
    case 16: {                                           // in prison
      const dead = clamp01((t - T.T_ALIVE) / 0.6);
      s.who(1, STEPHEN, "stp", -0.4, 0.18, -5.0, { mode: "sit", expr: dead > 0 ? "dazed" : "pained", headTilt: 0.1 + 0.3 * dead + 0.04 * Math.sin(t * 2), arms: { l: [-0.4, 0.7], r: [0.4, 0.7] } }, 1, false);
      if (t >= T.T_PRISON && t < T.T_PRISON + 0.4) s.burst(T.T_PRISON, 0, 2.0, 1.0, 3.5, 0.3, "#ffffff");
      motes([0, 0, -4], 5);
      break;
    }
    case 17: {                                           // the fisherman finds the body
      const u = smooth(clamp01(a / 1.7));
      s.who(1, FISHER, "fi", 1.2, 0, -13.3, { mode: "stand", expr: a > 0.35 ? "shock" : "neutral", arms: { l: [-0.5, -0.2], r: [0.5, -0.2 + 0.12 * Math.sin(t * 7)] } });
      s.fx("bundle", 360, 220, bundle, -0.2, -1.2 + 3.9 * u, -14.0, 1.7, 1.05, { rot: 0.3 * Math.sin(t * 3) });
      for (let k = 0; k < 3; k++) { const uu = (t * 0.3 + k / 3) % 1; s.fx("bird", 200, 140, bird(Math.sin(t * 14 + k)), -6 + 12 * uu, 6 + k, -10, 1.0, 0.7); }
      break;
    }
    case 18: {                                           // back in its tomb
      const u = clamp01(a / 1.8);
      s.who(1, POPE2, "pp", 5.2, 0, -3.4, { mode: "stand", expr: "smile", arms: { l: [-0.55, 0.3], r: [0.6, -0.8 + 0.1 * Math.sin(t * 4)] } });
      for (let k = 0; k < 2; k++) s.who(10 + k, DIGGER(k), `dg${k}`, 2.6 + 4.2 * u, 0, -3.0 - 0.8 * k, { mode: "stroll", phase: q(stroll(t, 10 + k, 1.4), 24), expr: "neutral", arms: { l: [-0.4, -0.3], r: [0.4, -0.3] } });
      s.fx("bundle", 360, 220, bundle, 2.9 + 4.7 * u, 1.3 + 0.7 * u * (1 - u) * 4, -3.4, 1.7, 1.05, { rot: 0.0 });
      for (let k = 0; k < 4; k++) { const uu = (t * 0.25 + k / 4) % 1; s.fx("bird", 200, 140, bird(Math.sin(t * 14 + k)), -8 + 18 * uu, 7 + k, -9, 1.1, 0.8); }
      if (t >= T.T_TOMB + 1.2) s.burst(T.T_TOMB + 1.2, 8, 1.3, -5.2, 2.6, 0.35, "#fff3b0");
      break;
    }
    case 19: {                                           // the new law
      const age = t - T.T_LAW, st = t - T.T_LAWSTAMP;
      s.who(1, POPE2, "pp", -1.2, 0, -11.6, { mode: "stand", expr: "smile", arms: { l: [-0.5, 0.2], r: [0.55, -0.6 + 0.1 * Math.sin(t * 5)] } });
      if (age >= -0.1) s.fx("decree", 600, 290, scroll("NO TRIALS FOR", "THE DEAD", "#241726"), 0.4, 3.0, -10.6, 2.3 * smooth(age / 0.3 + 0.3), 1.11 * smooth(age / 0.3 + 0.3), { rot: -0.04 });
      if (st >= 0) { s.fx("illegal", 600, 240, inkStamp("ILLEGAL"), 0.4, 2.1, -10.5, 1.7 * pop(st), 0.68 * pop(st), { rot: -0.08 }); s.burst(T.T_LAWSTAMP, 0.4, 2.1, -10.4, 2.6, 0.3, "#ffd27a"); }
      bishops(12, true, 3.4, -8.0, 2);
      break;
    }
    case 20: {                                           // CTA: the mitre on a gravestone
      s.fx("tomb", 280, 380, tombstone, 0.2, 1.45, -5.0, 2.0, 2.7, { rot: 0.0 });
      s.fx("mitre", 200, 200, mitreCard, 0.2, 3.2 + 0.08 * Math.sin(t * 2.2), -4.9, 0.8, 0.8, { rot: 0.06 * Math.sin(t * 1.7) });
      for (let k = 0; k < 8; k++) { const u = (t * 0.2 + hh(k, 5)) % 1; s.fx("mote", 60, 60, mote, -4 + 8 * hh(k, 6) + 0.6 * Math.sin(t + k), 0.4 + 2.6 * u, -3 - 3 * hh(k, 7), 0.12, 0.12, { soft: true }); }
      for (let k = 0; k < 3; k++) { const u = (t * 0.22 + k / 3) % 1; s.fx("bird", 200, 140, bird(Math.sin(t * 14 + k)), -7 + 14 * u, 6 + k, -10, 1.0, 0.7); }
      break;
    }
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void tmp; void toW;
export type { V3, SetName, Expr, FrontOpts };
