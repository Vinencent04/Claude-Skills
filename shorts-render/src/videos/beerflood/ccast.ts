// Cast of the beer-flood short: bean-heads play Crick the clerk, Mr Meux, workers, the coroner, jurors and the people of St Giles.
// stage(f, cam) -> character cards + effect cards for the shot at frame f. All positions are set-local (toW converts).
import * as THREE from "three";
import { Pen, bodyFront, fxBurst, fxPuff, fxSplash, fxContact, fxShadow, SKINS, INK, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import { FPS, V3, SetName, toW, shotAt, T_STAMP, T_COINS, T_NOTICE, T_BURST, T_WALL, T_ACCIDENT, T_REFUND } from "./story";
import { waveFront, waveFront8, WALL_Z } from "./world";

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();

// ---------------- outfits ----------------
const EARTH = ["#8f6b4a", "#6e7f4a", "#9a7a52", "#7a6a8c", "#a05a46", "#3f7f86"];
const CAPS = ["#8a6a46", "#6a5a4a", "#a4824f", "#5a6a4a"];
const P = (v: number): Outfit => v % 4 === 1 ? { jacket: "#3b3f52", pants: "#4a4038", boots: "#3a2a20", hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3], skin: SKINS[v % 4] } :
  { jacket: EARTH[v % 6], pants: ["#4a4038", "#3b3f52", "#5a4a3a"][v % 3], boots: "#3a2a20", hat: v % 3 === 0 ? "cap" : "hair", cap: CAPS[v % 4], hair: ["#5a3b2a", "#2a2022", "#8a6a3a"][v % 3], skin: SKINS[v % 4], build: v % 7 === 3 ? "stout" : "adult" };
const WORKER = (v: number): Outfit => ({ jacket: "#c8a878", pants: "#5a4a3a", boots: "#3a2a20", hat: "cap", cap: CAPS[v % 4], belt: "#6a4a2a", skin: SKINS[v % 4], build: v % 2 ? "stout" : "adult" });
const CRICK: Outfit = { jacket: "#7a7c86", pants: "#3b3f52", boots: "#2a2a30", hat: "hair", hair: "#3a2a22", buttons: "#d9dde0", skin: SKINS[1], build: "adult" };
const MEUX: Outfit = { jacket: "#6b2d5c", pants: "#2a2a30", boots: "#2a2a30", hat: "tophat", moustache: "#3a2a22", buttons: "#e8c45a", belt: "#e8c45a", skin: SKINS[0], build: "stout" };
const CORONER: Outfit = { jacket: "#1c1c22", pants: "#1c1c22", boots: "#2a2a30", hat: "wig", hair: "#f2efe8", buttons: "#e8c45a", skin: SKINS[2], build: "stout" };
const JUROR = (v: number): Outfit => ({ jacket: ["#6b5a4a", "#4a5a6b", "#7a6a3a", "#5a4a5a"][v % 4], pants: "#3b3f52", boots: "#2a2a30", hat: v % 2 ? "tophat" : "hair", hair: "#4a3a2a", skin: SKINS[v % 4], build: v % 3 === 0 ? "stout" : "adult" });
const KIDO: Outfit = { jacket: "#3f7f86", pants: "#5a4a3a", boots: "#3a2a20", hat: "cap", cap: "#a4824f", build: "kid", skin: SKINS[1] };

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
const mug = (p: Pen) => { p.poly(rr(34, 40, 120, 150, 14), "#d9b36a", 8); p.poly(rr(34, 40, 120, 64, 8), "#f6e8c2", 6); p.arc(134, 96, 26, 30, -90, 90, 8, INK); p.arc(134, 96, 14, 18, -90, 90, 6, "#d9b36a"); };
const bubble = (p: Pen) => { p.ell(60, 60, 44, 44, "#f6e8c2", 8); p.arc(46, 46, 14, 10, 180, 270, 4, "#ffffff"); };
const brickCard = (p: Pen) => { p.poly(rr(10, 30, 110, 90, 6), "#b45a3a", 8); p.stroke([[30, 50], [60, 50]], 4, "#d89a7a"); };
const coinCard = (p: Pen) => { p.ell(60, 60, 44, 44, "#f1c232", 8); p.ell(60, 60, 28, 28, null, 4); };
const stampCard = (p: Pen) => { p.poly(rr(60, 150, 180, 250, 12), "#b45a3a", 8); p.poly(rr(100, 40, 140, 160, 12), "#6a3a22", 8); p.poly(rr(60, 150, 180, 190, 10), "#d2373a", 8); };
/** wide red-ink text stamp card ("REFUNDED", "ACCIDENT") on a 600 x 240 canvas */
const inkStamp = (word: string) => (p: Pen) => {
  const g = p.g; p.poly(rr(16, 16, 584, 224, 22), null, 0);
  g.save(); g.translate(300, 120); g.rotate(-0.06);
  g.strokeStyle = "#c92a2e"; g.lineWidth = 16; g.strokeRect(-270, -92, 540, 184);
  g.fillStyle = "#c92a2e"; g.font = "900 96px Georgia, 'Times New Roman', serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(word, 0, 8);
  g.restore();
};
const paperCard = (word: string) => (p: Pen) => {
  const g = p.g; p.poly(rr(14, 14, 286, 386, 14), "#f6efd8", 8);
  g.fillStyle = "#8a7a5a"; for (let i = 0; i < 7; i++) g.fillRect(44, 60 + i * 28, 212 - (i % 3) * 30, 8);
  g.save(); g.translate(150, 300); g.rotate(-0.22); g.strokeStyle = "#c92a2e"; g.lineWidth = 8; g.strokeRect(-110, -34, 220, 68);
  g.fillStyle = "#c92a2e"; g.font = "900 40px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(word, 0, 3); g.restore();
};
const splat = (p: Pen) => { p.ell(100, 100, 72, 60, "#a24f17", 8); p.ell(150, 60, 20, 20, "#f6e8c2", 5); p.ell(50, 140, 16, 16, "#a24f17", 5); };

// ---------------- helpers ----------------
const stroll = (t: number, i: number, speed = 1.0) => ((t * 0.7 * speed + hh(i, 4)) % 1 + 1) % 1;

export const stage = (f: number, cam: CamInfo): Stage => {
  const sh = shotAt(f), t = f / FPS, s = new S(cam, sh.set, t), id = sh.id;
  switch (id) {
    case 1: {                                            // HOOK: the wave chases the crowd down the lane (camera ahead of the wave, looking back)
      const zf = waveFront(t);
      for (let k = 0; k < 15; k++) {
        const row = k >> 1, z = zf + 3.0 + row * 1.3 + 0.5 * hh(k, 3), x = (k % 2 ? 1 : -1) * (0.5 + 1.25 * hh(k, 5));
        s.who(300 + k, P(k + (k % 4 === 0 ? 1 : 0)), `h${k % 6}${k % 4}`, x, 0, z, { mode: "stroll", phase: q(stroll(t, k, 3.0), 24), expr: k % 3 ? "shock" : "nervous", arms: { l: [-0.6, -0.95], r: [0.6, -0.9] } }, 1, false);
      }
      for (let k = 0; k < 5; k++) { const u = ((t * 0.9 + hh(k, 2)) % 1); s.fx(`mug${k % 2}`, 160, 160, mug, (k - 2) * 0.55, 1.6 + 2.0 * Math.sin(Math.PI * u), zf + 0.6 + 2.2 * u + k * 0.3, 0.42, 0.42, { rot: 5 * u + k }); }
      for (let k = 0; k < 4; k++) s.fx("bubble", 120, 120, bubble, (k - 1.5) * 1.0, 3.5 + 0.2 * Math.sin(t * 4 + k), zf + 0.2 + 0.8 * k, 0.5, 0.5);
      break;
    }
    case 2: {                                            // the owner stamps REFUNDED, coins stack up
      const up = t < T_STAMP - 0.25 ? 1 : t < T_STAMP ? 1 - (t - (T_STAMP - 0.25)) / 0.25 : 0;
      s.who(1, MEUX, "meux", 0, 0.45, -6.9, { mode: "sit", expr: t < T_STAMP ? "smile_closed" : "grin", arms: { r: [0.35, 0.35 + 0.15 * up] }, blink: t < T_STAMP ? 0 : undefined }, 1, false);
      s.fx("stamp", 240, 280, stampCard, 0.55, 1.2 + 0.7 * up + (t >= T_STAMP + 0.4 ? 0.2 * smooth((t - T_STAMP - 0.4) / 0.3) : 0), -4.55, 0.5, 0.58);
      if (t >= T_STAMP) s.fx("refpaper", 600, 240, inkStamp("REFUNDED"), 0.15, 1.13, -4.55, 1.3, 0.52, { flat: true, rot: 0.0 });
      s.burst(T_STAMP, 0.3, 1.3, -4.5, 1.0, 0.3);
      if (t >= T_COINS) for (let k = 0; k < 6; k++) { const u = clamp01((t - T_COINS - k * 0.07) / 0.4); if (u > 0 && u < 1) s.fx("coin", 120, 120, coinCard, -1.2 + k * 0.5, 2.9 - 1.8 * u * u, -4.7, 0.3, 0.3, { rot: 6 * u }); }
      break;
    }
    case 3: {                                            // establishing: the brewery yard, a few people at the gate, smoke
      for (let k = 0; k < 5; k++) s.who(10 + k, k % 2 ? WORKER(k) : P(k), `y${k % 2}${k % 5}`, -2.5 + 1.6 * k + 0.8 * Math.sin(t * 0.7 + k), 0, -9.2 + 0.4 * (k % 2), { mode: "stroll", phase: q(stroll(t, k, 0.8), 24), expr: "neutral" });
      for (let n = 0; n < 4; n++) { const u = ((t * 0.22 + n / 4) % 1); s.fx("smoke", 300, 300, (p) => fxPuff(p, 0.3 + 0.5 * u), -6.5 + 3 * u, 24.8 + 5 * u, -21, 4 + 4 * u, 4 + 4 * u, { soft: true }); }
      break;
    }
    case 4: {                                            // the vat dwarfs the workers
      const spots: [number, number, number][] = [[-5.2, 0, 7.6], [-2.4, 0, 6.8], [3.8, 0, 7.2], [6.2, 0, 6.6], [-8.8, 0, 3.6]];
      spots.forEach(([x, y, z], k) => s.who(20 + k, WORKER(k), `w${k % 2}${k % 4}`, x, y, z, { mode: k === 2 ? "stroll" : "stand", phase: q(stroll(t, k, 0.7), 24), expr: k % 2 ? "neutral" : "smile_closed", look: k % 3 - 1 }));
      for (let n = 0; n < 3; n++) { const u = ((t * 0.2 + n / 3) % 1); s.fx("steam", 300, 300, (p) => fxPuff(p, 0.3 + 0.4 * u), -2 + n * 2.4, 6.9 + 1.4 * u, 1.5, 3.2, 3.2, { soft: true }); }
      break;
    }
    case 5: {                                            // Crick points at the slipped hoop
      const point = clamp01((t - T_NOTICE) / 0.25);
      s.who(2, CRICK, "crick", -0.95, 0, 5.0, { mode: "stand", expr: t < T_NOTICE ? "neutral" : "shock", arms: { r: [0.15, 0.2 - point * 0.0], l: [-0.55 - 0.35 * point, -0.55 * point] } });
      s.who(3, WORKER(2), "w2", 1.15, 0, 5.1, { mode: "stand", expr: "neutral", look: -1 });
      if (t >= T_NOTICE && t < T_NOTICE + 0.5) s.burst(T_NOTICE, -0.3, 2.0, 4.9, 1.2, 0.35);
      break;
    }
    case 6: {                                            // the boss waves it off; Crick shrugs and walks away
      const walk = clamp01((t - 24.2) / 1.5);
      s.who(1, MEUX, "meux", 0.9, 0, 5.0, { mode: "stand", expr: t < 24.2 ? "stern" : "smile_closed", arms: { l: [-0.65, t < 24.0 ? 0.15 : -0.25 + 0.12 * Math.sin(t * 9)] } });
      s.who(2, CRICK, "crick", -1.2 - 4.8 * walk, 0, 5.1, { mode: walk > 0 && walk < 1 ? "stroll" : "stand", phase: q(stroll(t, 2, 0.9), 24), expr: walk > 0 ? "dazed" : "nervous", look: walk > 0 ? -1 : 0, arms: walk === 0 ? { r: [0.55, 0.25], l: [-0.55, 0.25] } : undefined });
      break;
    }
    case 7: {                                            // the vat bursts: workers blown back, flash, flying beer
      const burst = t - T_BURST;
      s.who(1, WORKER(1), "w1", -3.8 - Math.max(0, burst) * 3, Math.max(0, burst) * 1.5, 8.2 + Math.max(0, burst) * 2.5, { mode: "stand", expr: burst < 0 ? "neutral" : "shock", arms: burst >= 0 ? { l: [-0.6, -0.95], r: [0.6, -0.95] } : undefined });
      s.who(2, WORKER(2), "w2", 3.6 + Math.max(0, burst) * 3, Math.max(0, burst) * 1.2, 8.0 + Math.max(0, burst) * 2.2, { mode: "stand", expr: burst < 0 ? "neutral" : "shock", arms: burst >= 0 ? { l: [-0.6, -0.95], r: [0.6, -0.95] } : undefined });
      if (burst >= -0.05 && burst < 0.5) s.burst(T_BURST - 0.05, 0, 3.4, 4.4, 14, 0.5, "#ffffff");
      if (burst >= 0) for (let k = 0; k < 8; k++) { const u = clamp01(burst * 0.9 + 0.02 * k); s.fx("splat", 200, 200, splat, (k - 3.5) * 1.2, 1.2 + 3 * Math.sin(Math.PI * u) , 4.6 + 9 * u + 0.4 * k, 0.9, 0.9, { rot: 4 * u + k }); }
      break;
    }
    case 8: {                                            // the wave smashes the wall; bricks and mugs fly; people flee down the lane
      const bt = t - T_WALL;
      if (bt >= 0 && bt < 0.5) s.burst(T_WALL, 0, 2.6, WALL_Z + 0.6, 7, 0.5, "#ffe9c0");
      if (bt >= 0) for (let k = 0; k < 9; k++) { const u = clamp01(bt * 0.55 + 0.03 * k); s.fx("brick", 120, 120, brickCard, (k - 4) * 0.55, 0.8 + 3.0 * Math.sin(Math.PI * u * 0.9), WALL_Z + 0.5 + 7 * u + 0.4 * k, 0.6, 0.6, { rot: 6 * u + k }); }
      const front = waveFront8(t);
      for (let k = 0; k < 10; k++) {
        const z = Math.min(front, 20) + 3.5 + 1.2 * k, x = (k % 2 ? 1 : -1) * (0.4 + 1.2 * hh(k, 2)), run = bt >= 0 ? 1 : 0.3;
        s.who(320 + k, P(k + 2), `f${k % 6}${k % 4}`, x, 0, z + (bt >= 0 ? bt * 4.0 : 0), { mode: "stroll", phase: q(stroll(t, k, 2.6 * run), 24), expr: "shock", arms: { l: [-0.6, -0.95], r: [0.6, -0.9] } }, 1, false);
      }
      break;
    }
    case 9: {                                            // aftermath: survivors on the crate stack, flooded lane
      s.who(1, P(1), "mom", -2.1, 3.25, -1.5, { mode: "sit", expr: "pained", look: 1 }, 1, false);
      s.who(2, KIDO, "kid", -1.5, 3.25, -0.8, { mode: "sit", expr: "shock", look: 1 }, 0.9, false);
      s.who(3, P(5), "old", -2.5, 3.25, -0.9, { mode: "stand", expr: "dazed", look: 1 }, 1, false);
      for (let k = 0; k < 3; k++) s.fx("mugF", 160, 160, mug, -1.3 + k * 1.1, 0.7 + 0.04 * Math.sin(t * 2 + k), 3 - k * 3.5, 0.4, 0.4, { rot: 0.6 * k });
      break;
    }
    case 10: {                                           // inquest
      const stampAge = t - T_ACCIDENT;
      s.who(1, CORONER, "cor", 0, 0.8, -7.6, { mode: "stand", expr: t < T_ACCIDENT ? "stern" : "smile_closed", arms: t >= T_ACCIDENT && stampAge < 0.5 ? { r: [0.6, -0.4] } : { l: [-0.4, 0.4], r: [0.4, 0.4] } });
      for (let k = 0; k < 6; k++) s.who(40 + k, JUROR(k), `j${k % 4}${k % 2}`, (k % 2 ? 1 : -1) * 2.4, 0.45, -5.0 + 2.8 * (k >> 1) + 0.5 * hh(k, 3), { mode: "sit", expr: t < T_ACCIDENT ? "neutral" : k % 2 ? "dazed" : "smile_closed", look: k % 2 ? -1 : 1 });
      if (stampAge >= 0) s.fx("accident", 600, 240, inkStamp("ACCIDENT"), 0.0, 1.0 - 0.2 * (1 - Math.min(1, stampAge / 0.15)), -6.45, 1.9 * (1 + 0.5 * (1 - Math.min(1, stampAge / 0.15))), 0.76 * (1 + 0.5 * (1 - Math.min(1, stampAge / 0.15))), { rot: -0.06 });
      s.burst(T_ACCIDENT, 0, 1.0, -6.4, 2.4, 0.3, "#ffd27a");
      break;
    }
    case 11: {                                           // the owner holds the refund
      const lift = smooth((t - (T_REFUND - 0.4)) / 0.35);
      s.who(1, MEUX, "meux", 0, 0.45, -6.9, { mode: "sit", expr: t < T_REFUND ? "smile" : "grin", arms: { r: [0.7, -0.45 * lift] } }, 1, false);
      if (lift > 0) s.fx("refund", 300, 400, paperCard("REFUNDED"), 0.95, 1.2 + 0.7 * lift, -5.95, 0.85, 1.13, { rot: -0.1 });
      for (let k = 0; k < 5; k++) s.fx("coin", 120, 120, coinCard, -1.8 + k * 0.45, 1.25 + 0.05 * (k % 2), -4.5, 0.28, 0.28);
      break;
    }
    case 12: {                                           // empty cold street, one mug on a barrel
      const hop = t >= 51.0 ? Math.max(0, Math.sin((t - 51.0) * 9)) * Math.exp(-(t - 51.0) * 0.5) * 0.18 : 0;
      s.fx("mug", 160, 160, mug, 0.6, 1.2 + hop, 0.5, 0.6, 0.6, { rot: 0.1 + 0.25 * hop });
      for (let k = 0; k < 3; k++) s.fx("splash", 200, 200, splat, -1.6 + k * 1.3, 0.02, -2 - k * 3, 0.9, 0.5, { flat: true, rot: k });
      break;
    }
  }
  return s.out;
};
void fxBurst; void fxSplash; void fxContact; void T_COINS;
export type { V3 };
