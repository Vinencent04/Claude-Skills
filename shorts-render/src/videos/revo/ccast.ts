// Cast of the revolution short: the stickmen play king, nobles, peasants, revolutionaries, Robespierre, Napoleon, prisoners.
// stage(f, cam) -> character cards + effect cards for the shot at frame f. All positions are set-local (toW converts).
import * as THREE from "three";
import { Pen, bodyFront, fxBurst, fxPuff, fxStars, fxContact, fxShadow, SKINS, INK, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import { FPS, V3, SetName, toW, shotAt, T_PURSE, T_HOOK_DROP, T_CANNON, T_DROP_KING, T_DROPS, T_DROP_ROB, T_CROWN_HEAD } from "./story";

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();

// ---------------- outfits ----------------
const EARTH = ["#8f6b4a", "#6e7f4a", "#9a7a52", "#7a6a8c", "#a05a46"];
const CAPS = ["#8a6a46", "#6a5a4a", "#a4824f", "#5a6a4a"];
const P = (v: number): Outfit => ({ jacket: EARTH[v % 5], pants: ["#4a4038", "#3b3f52", "#5a4a3a"][v % 3], boots: "#3a2a20", hat: "cap", cap: CAPS[v % 4], skin: SKINS[v % 4], build: v % 7 === 3 ? "stout" : "adult" });
const REV = (v: number): Outfit => ({ jacket: "#2a4ba0", pants: "#f1efe6", boots: "#2a2a30", hat: "phrygian", cap: "#d2373a", belt: "#f6f3ea", buttons: "#e8c45a", skin: SKINS[v % 4], build: v % 5 === 2 ? "stout" : "adult" });
const NOBLE = (v: number): Outfit => ({ jacket: ["#8e5bd0", "#c9507a", "#3f8f9a"][v % 3], pants: "#f0f0f0", boots: "#2a2a30", hat: "wig", hair: "#f2efe8", buttons: "#e8c45a", skin: SKINS[v % 2], build: v % 2 ? "stout" : "adult" });
const KING: Outfit = { jacket: "#2a4ba0", pants: "#f0f0f0", boots: "#2a2a30", hat: "crown", apron: "#f6f3ea", buttons: "#e8c45a", skin: SKINS[0], moustache: "#4a3020", build: "stout" };
const ROBES: Outfit = { jacket: "#4f9a6a", pants: "#f0f0f0", boots: "#2a2a30", hat: "wig", hair: "#f2efe8", buttons: "#e8c45a", skin: SKINS[2], build: "adult" };
const NAP = (crowned: boolean): Outfit => ({ jacket: "#2f3f6a", pants: "#f0f0f0", boots: "#2a2a30", hat: crowned ? "bicorne" : "bicorne", belt: "#f6f3ea", buttons: "#e8c45a", skin: SKINS[2], build: "adult" });
const PRIS = (v: number): Outfit => ({ jacket: "#d9d4c4", pants: "#7a7a82", boots: "#2a2a30", hat: v % 2 ? "hair" : null, hair: "#5a3b2a", skin: SKINS[v % 4], build: "adult" });
const BAKER: Outfit = { jacket: "#f6f3ea", pants: "#8a7a66", boots: "#3a2a20", hat: "cap", cap: "#f6f3ea", apron: "#e9dfc2", moustache: "#4a3020", skin: SKINS[1], build: "stout" };

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

// ---------------- little drawings ----------------
const hatCard = (p: Pen, kind: string) => {
  const o = 8;
  if (kind === "crown") {
    p.poly([[40, 150], [40, 80], [75, 110], [100, 55], [125, 110], [160, 80], [160, 150]], "#f1c232", o);
    for (const [x, c] of [[62, "#d2373a"], [100, "#2a4ba0"], [138, "#d2373a"]] as const) p.ell(x, 128, 7, 7, c, 3);
  } else if (kind === "wig") {
    p.ell(100, 100, 62, 56, "#f2efe8", o); p.ell(46, 128, 22, 32, "#f2efe8", o); p.ell(154, 128, 22, 32, "#f2efe8", o);
    p.arc(100, 96, 30, 18, 200, 340, 5, "#c9c2b4");
  } else if (kind === "cap") {
    p.ell(100, 120, 64, 46, "#8a6a46", o, 180, 360); p.poly([[36, 120], [164, 120], [150, 138], [50, 138]], "#6e5336", o);
  } else if (kind === "bicorne") {
    p.poly([[18, 118], [48, 64], [152, 64], [182, 118], [140, 130], [60, 130]], "#2a2a33", o); p.ell(150, 94, 12, 12, "#d2373a", 4);
  } else if (kind === "phrygian") {
    p.ell(100, 120, 60, 44, "#d2373a", o, 180, 360); p.ell(150, 62, 22, 24, "#d2373a", o); p.poly([[40, 120], [160, 120], [152, 138], [48, 138]], "#a82a2e", o);
  }
};
const coinDot = (p: Pen, n: number) => { p.ell(100, 100, 74, 74, "#f1c232", 10); p.ell(100, 100, 52, 52, null, 5); for (let i = 0; i < n; i++) p.dot(100 + (i - (n - 1) / 2) * 20, 100, 6, INK); };
const ball = (p: Pen) => { p.ell(60, 60, 44, 44, "#d9e84a", 8); p.arc(60, 60, 30, 30, 120, 240, 4, "#f6f3ea"); };
const crownCard = (p: Pen) => hatCard(p, "crown");

// ---------------- crowds ----------------
const stroll = (t: number, i: number, speed = 1.0) => ((t * 0.7 * speed + hh(i, 4)) % 1 + 1) % 1;
const cheer = (t: number, i: number): FrontOpts => ({ mode: "stand", expr: i % 3 ? "laugh" : "grin", arms: { l: [-0.6 - 0.1 * Math.round(Math.sin(t * 9 + i)), -0.95], r: [0.6, -0.95 + 0.08 * Math.round(Math.sin(t * 9 + i * 2))] } });

export const stage = (f: number, cam: CamInfo): Stage => {
  const sh = shotAt(f), t = f / FPS, s = new S(cam, sh.set, t), id = sh.id;
  const nobles = (spots: [number, number, number][], sit = false) => spots.forEach(([x, y, z], i) => s.who(100 + i, NOBLE(i), `n${i % 3}${i % 2}`, x, y, z, { mode: sit ? "sit" : "stand", expr: i % 2 ? "smile" : "smile_closed", wave: i % 3 === 0 && sit ? q(Math.sin(t * 5 + i), 10) : undefined }));
  const cheering = (spots: [number, number, number][], flags = 0, forks = 0, o: (i: number) => Outfit = REV) => spots.forEach(([x, y, z], i) => {
    const fo = cheer(t, i); if (i < flags) fo.held = "flag"; else if (i < flags + forks) fo.held = "fork";
    s.who(i, o(i), `c${o(i).jacket}${i % 5}`, x, y, z, fo);
  });

  switch (id) {
    case 1: case 2: {                                    // hook: the king runs out of money
      const kingExpr: Expr = t < 1.2 ? "shock" : t < 2.6 ? "nervous" : t < 4.4 ? "shock" : "dazed";
      const dy = t < T_PURSE ? 0.55 : 0.55 - 0.9 * smooth((t - T_PURSE) / 0.25) + 0.1 * Math.sin(t * 14);
      s.who(1, KING, "king", 0, 0.45, -8.3, { mode: "sit", expr: kingExpr, arms: { r: [0.45, Math.round(dy * 20) / 20] }, held: "purse", blink: t < 1.2 ? 0 : lidAt(t, 1) }, 1, false);
      nobles([[-2.5, 0.45, -8.3], [2.6, 0.45, -8.4]]);
      s.burst(0.0, 0.0, 2.0, -8.0, 2.0, 0.35);
      s.puff(T_PURSE + 0.2, 0.9, 1.6, -8.0, 1.0, 0.9);
      break;
    }
    case 22: {                                           // the mob bursts in through the doors, straight at the lens
      const u = clamp01((t - 3.2) / 1.8);
      for (let k = 0; k < 24; k++) {
        const z = 7.2 - 12.6 * u * (0.78 + 0.22 * hh(k, 3)) - 0.9 * (k >> 2), x = -2.3 + 4.6 * ((k % 4) / 3) + 0.35 * hh(k, 2);
        const fo: FrontOpts = { mode: "stroll", phase: q(stroll(t, k, 2.4), 24), expr: k % 2 ? "laugh" : "grin", arms: { l: [-0.55, -0.95], r: [0.55, -0.95] }, held: k < 2 ? "flag" : "fork" };
        s.who(200 + k, k % 3 === 2 ? P(k) : REV(k), `m${k % 3 === 2 ? "p" : "r"}${k % 5}`, x, 0, z, fo);
      }
      s.burst(3.6, 0.0, 2.6, 0.5, 2.4, 0.4);
      break;
    }
    case 3: {                                            // flash-forward: the blade falls, the crown lands in the basket
      const k = clamp01((t - T_HOOK_DROP - 0.05) / 0.28);
      if (t < T_HOOK_DROP + 0.05) { /* blade still up, empty frame */ }
      else if (t < T_HOOK_DROP + 0.4) s.fx("crown", 200, 200, crownCard, 0, 2.7 - 0.75 * k * k, -7.6 + 0.5 * k, 0.55, 0.55, { rot: 3.2 * k });
      else s.fx("crown", 200, 200, crownCard, 0, 1.95, -7.1, 0.55, 0.55, { rot: 0.15 });
      cheering([[-5, 0, -2], [-3, 0, 0], [-1.5, 0, 1], [1.5, 0, 1], [3, 0, 0], [5, 0, -2], [-4, 0, 3], [4, 0, 3]], 2, 3);
      s.burst(T_HOOK_DROP + 0.33, 0, 2.3, -7.0, 1.5, 0.4);
      break;
    }
    case 4: case 5: {                                    // bread is too expensive
      s.who(2, BAKER, "baker", 0.9, 0, -6.2, { mode: "stand", expr: "neutral", arms: { l: [-0.75, 0.3], r: [0.75, 0.3] } });
      const n = id === 4 ? 9 : 3;
      for (let k = 0; k < n; k++) s.who(10 + k, P(k), `p${k % 5}`, -0.55 - 0.12 * k, 0, -3.8 + 1.2 * k, { mode: "stand", expr: k % 2 ? "nervous" : "pained", arms: k === 0 ? { l: [-0.1, 0.38] } : undefined });
      break;
    }
    case 6: {                                            // taxes: the haul to the nobles
      nobles([[-4.8, 0, -1.6], [-3.4, 0, -2.4], [-5.6, 0, -3.2]], true);
      for (let k = 0; k < 6; k++) {
        const x = 7 - 1.7 * (t - 12.2) - k * 1.6 + 1;
        s.who(20 + k, P(k + 3), `p${(k + 3) % 5}`, x, 0, 0.5 + 0.35 * (k % 2), { mode: "stroll", phase: q(stroll(t, k, 1.2), 24), expr: "pained", arms: { r: [0.45, 0.35] }, held: "sack" });
      }
      break;
    }
    case 7: {                                            // 97 % vs the few
      for (let k = 0; k < 26; k++) s.who(30 + k, P(k), `p${k % 5}`, -5.2 + (k % 9) * 1.3 + 0.4 * hh(k), 0, -3 + Math.floor(k / 9) * 1.5, { mode: "stand", expr: k % 2 ? "pained" : "nervous", arms: { r: [0.45, 0.35] }, held: "sack" });
      nobles([[-1.8, 0.45, -7.8], [0, 0.45, -8.2], [1.8, 0.45, -7.8]], true);
      break;
    }
    case 8: {                                            // the Estates-General
      s.who(1, KING, "king", 0, 0.45, -8.3, { mode: "sit", expr: t < 20 ? "smile_closed" : "grin", arms: { r: [0.5, 0.5] }, held: "scroll" }, 1, false);
      const spots: [number, number, number][] = [];
      for (let k = 0; k < 10; k++) spots.push([(k % 2 ? 1 : -1) * (1.2 + 0.85 * (k >> 1)), 0, -5.2 + 1.2 * (k % 3)]);
      nobles(spots);
      break;
    }
    case 9: {                                            // locked out
      for (let k = 0; k < 12; k++) {
        const bang = Math.round(Math.sin(t * 8 + k));
        s.who(40 + k, k % 3 === 0 ? REV(k) : P(k), `d${k % 3 === 0 ? "r" : "p"}${k % 5}`, -3.6 + (k % 6) * 1.45, 0, -11.3 + 1.2 * Math.floor(k / 6), { mode: "stand", expr: k % 2 ? "stern" : "laugh", arms: { l: [-0.5, -0.95 + 0.12 * bang], r: [0.5, -0.95 - 0.12 * bang] } });
      }
      break;
    }
    case 10: {                                           // the Tennis Court Oath
      for (let k = 0; k < 16; k++) s.who(60 + k, k % 4 === 0 ? REV(k) : P(k), `o${k % 4 === 0 ? "r" : "p"}${k % 5}`, -5.5 + (k % 8) * 1.57, 0, -4.0 + 1.3 * Math.floor(k / 8) + 0.3 * hh(k), { mode: "stand", expr: "stern", look: 0, arms: { r: [0.55, -1.0] } });
      s.who(70, REV(1), "oath", 0, 0, -2.3, { mode: "stand", expr: "grin", arms: { l: [-0.55, -0.95], r: [0.55, -1.0] }, held: "scroll" });
      const bt = (t * 1.5) % 1;
      s.fx("ball", 120, 120, ball, 3.2 + 0.6 * Math.sin(t * 1.5), 0.25 + 1.1 * Math.abs(Math.sin(Math.PI * bt)), -0.8, 0.28, 0.28);
      break;
    }
    case 11: {                                           // storming the Bastille
      for (let k = 0; k < 20; k++) {
        const run = clamp01((t - 24.8) / 2.6), x = -7.5 + (k % 10) * 1.65 + 0.5 * hh(k, 2), z = 6.5 - 12.5 * run * (0.75 + 0.25 * hh(k, 3)) + (k >> 3) * 1.4;
        s.who(80 + k, REV(k), `s${k % 5}`, x, 0, z, { mode: "stroll", phase: q(stroll(t, k, 2.2), 24), expr: k % 2 ? "laugh" : "grin", arms: { l: [-0.55, -0.9], r: [0.55, -0.95] }, held: k < 2 ? "flag" : "fork" });
      }
      s.burst(T_CANNON, -4.6, 1.3, -1.3, 2.2, 0.5);
      for (let n = 0; n < 4; n++) s.puff(T_CANNON + 0.1 + n * 0.12, -4.6 + n * 0.3, 1.2 + n * 0.1, -1.6 - n * 0.5, 1.8 + 0.4 * n, 1.4);
      s.burst(T_CANNON + 0.35, -3.0, 5.5, -13.8, 2.6, 0.5, "#ffd27a");
      break;
    }
    case 12: {                                           // exactly seven prisoners
      for (let k = 0; k < 7; k++) {
        s.who(90 + k, PRIS(k), `pr${k % 4}`, -2.55 + 0.85 * k, 0, -7.0, { mode: "stand", expr: k % 2 ? "neutral" : "dazed", look: k % 3 - 1 });
        const u = t - (28.0 + 0.27 * k);
        if (u >= 0 && u < 0.7) s.fx(`coin${k + 1}`, 200, 200, (p) => coinDot(p, k + 1), -2.55 + 0.85 * k, 2.3 + 0.1 * smooth(u / 0.2), -6.9, 0.3, 0.3, { rot: 0 });
        else if (u >= 0.7) s.fx(`coin${k + 1}`, 200, 200, (p) => coinDot(p, k + 1), -2.55 + 0.85 * k, 2.4, -6.9, 0.3, 0.3);
      }
      cheering([[-4.4, 0, -6.2], [4.4, 0, -6.2]], 1, 1);
      break;
    }
    case 13: {                                           // the throne is empty
      s.fx("crown", 200, 200, crownCard, 0.0, 1.15, -8.3, 0.6, 0.6, { rot: 0.1 * Math.sin(t * 2) });
      cheering([[-1.7, 0.45, -8.4], [1.7, 0.45, -8.4], [-2.4, 0, -6.4], [2.4, 0, -6.4], [-1.1, 0, -4.8], [1.1, 0, -4.8]], 3, 3);
      break;
    }
    case 14: case 15: case 16: case 17: case 18: case 19: case 20: {
      squareScene(s, id, t, cheering);
      break;
    }
    case 21: {                                           // the emperor on the throne
      s.who(5, NAP(false), "napT", 0, 0.45, -8.3, { mode: "sit", expr: "neutral", blink: lidAt(t, 5) }, 0.85, false);
      const land = clamp01((t - T_CROWN_HEAD) / 0.4);
      if (t >= T_CROWN_HEAD - 0.05) s.fx("crown", 200, 200, crownCard, 0.0, 1.55 + 1.6 * (1 - land) ** 2, -8.2, 0.5, 0.5, { rot: 0.08 });
      s.burst(T_CROWN_HEAD + 0.4, 0, 1.8, -8.1, 1.1, 0.4);
      break;
    }
  }
  return s.out;
};

// ---------------- the square: guillotine, queue, Robespierre, Napoleon ----------------
const BASKET: V3 = [0, 1.85, -7.2];
const hatKinds = ["crown", "wig", "cap", "bicorne", "phrygian", "wig", "cap", "phrygian", "wig", "cap"];
const stepY = (z: number) => (z < -5.05 ? 1.28 : z < -3.9 ? 1.28 - 0.68 * clamp01((z + 5.05) / -1.15 * -1 + 0) : z < -3.1 ? 0.3 : 0);
const rampY = (z: number) => (z <= -5.05 ? 1.28 : z <= -3.9 ? 0.6 + 0.68 * ((-3.9 - z) / 1.15) : z <= -3.1 ? 0.3 + 0.3 * ((-3.1 - z) / 0.8) : 0.3 * clamp01((-2.3 - z) / 0.8));
void stepY;
const basketHats = (s: S, t: number, shot: number) => {
  const events = [T_DROP_KING, ...T_DROPS, T_DROP_ROB];
  let n = 0;
  if (shot === 3) { return; }
  events.forEach((e, k) => {
    if (t < e + 0.12) return;
    const kind = k === events.length - 1 ? "wig" : hatKinds[k % hatKinds.length];
    const arrive = clamp01((t - e - 0.12) / 0.25), y0 = 2.55 + 0.3 * (k % 2);
    s.fx(`hat${kind}`, 200, 200, (p) => hatCard(p, kind), BASKET[0] + 0.12 * Math.sin(k * 2.3), BASKET[1] + 0.05 * n + (y0 - BASKET[1]) * (1 - arrive) ** 2, BASKET[2] - 0.02 * (k % 3), 0.42, 0.42, { rot: 0.5 * Math.sin(k * 1.7) * (1 - arrive) + 0.1 * (k % 3) });
    n++;
  });
};
const squareScene = (s: S, id: number, t: number, cheering: (spots: [number, number, number][], flags?: number, forks?: number, o?: (i: number) => Outfit) => void) => {
  basketHats(s, t, id);
  const crowdSpots = (n: number, x0: number, x1: number, z0: number, rows: number): [number, number, number][] =>
    Array.from({ length: n }, (_, k) => [x0 + ((k % Math.ceil(n / rows)) / Math.max(1, Math.ceil(n / rows) - 1)) * (x1 - x0) + 0.4 * hh(k, 5), 0, z0 + 1.3 * Math.floor(k / Math.ceil(n / rows))]);
  if (id === 14) {                                       // King Louis climbs the steps
    const u = clamp01((t - 32.6) / 2.0), z = -1.0 - 5.0 * u, vis = t < T_DROP_KING;
    if (vis) s.who(1, KING, "kingW", 0, rampY(z), z, { mode: u < 1 ? "stroll" : "stand", phase: q(stroll(t, 1, 1.0), 24), expr: u < 0.9 ? "nervous" : "shock", arms: undefined }, 1, true);
    else s.puff(T_DROP_KING, 0, 2.0, -7.6, 1.3, 0.8);
    if (t >= T_DROP_KING && t < T_DROP_KING + 0.4) {     // the crown pops off and into the basket
      const k = clamp01((t - T_DROP_KING) / 0.4);
      s.fx("crown", 200, 200, crownCard, 0, 2.5 - 0.65 * k * k, -7.5 + 0.3 * k, 0.45, 0.45, { rot: 3 * k });
    }
    cheering(crowdSpots(18, -7, 7, 0.5, 3), 2, 4);
  } else if (id === 15 || id === 16) {                   // the queue
    const N = id === 15 ? 6 : 24, gone = T_DROPS.filter((e) => t >= e + 0.1).length;
    for (let k = gone; k < N + gone; k++) {
      const slot = k - gone, z = -5.2 + 1.15 * slot + (id === 16 ? 0.45 * slot : 0);
      const walk = Math.max(0, T_DROPS.filter((e) => t >= e + 0.12 && t < e + 0.5).length ? 1 : 0);
      const x = id === 16 ? 0.9 * Math.sin(slot * 0.9) : 0.35 * ((slot % 3) - 1);
      s.who(120 + k, k % 4 === 1 ? NOBLE(k) : k % 3 === 0 ? REV(k) : P(k), `q${k % 4}${k % 3}${k % 5}`, x, rampY(z), z, { mode: walk ? "stroll" : "stand", phase: q(stroll(t, k, 2), 24), expr: slot === 0 ? "shock" : slot < 3 ? "nervous" : "neutral" });
    }
    T_DROPS.forEach((e) => s.puff(e, 0, 2.0, -7.7, 1.1, 0.5));
    if (id === 16) cheering(crowdSpots(10, -8, 8, 4, 2), 1, 2, P);
  } else if (id === 17) {                                // everyone is a suspect
    const spots = crowdSpots(21, -3.4, 3.4, -1.5, 3);
    spots.forEach((p, k) => {
      const dir = hh(k, 8) < 0.5 ? -1 : 1, expr: Expr = (["nervous", "stern", "shock"] as Expr[])[k % 3];
      s.who(140 + k, k % 3 === 0 ? NOBLE(k) : k % 3 === 1 ? P(k) : REV(k), `a${k % 3}${k % 5}${dir}`, p[0], 0, p[2], { mode: "stand", expr, look: dir, arms: { l: undefined, r: [dir * 0.95 * (k % 2 ? 1 : 1), -0.05] } });
    });
  } else if (id === 18) {                                // Robespierre goes up
    const u = clamp01((t - 44.7) / 1.7), z = -1.2 - 4.8 * u, vis = t < T_DROP_ROB;
    if (vis) s.who(2, ROBES, "robes", 0, rampY(z), z, { mode: u < 1 ? "stroll" : "stand", phase: q(stroll(t, 2, 1.0), 24), expr: "neutral", arms: u >= 1 ? { l: [-0.75, 0.25], r: [0.75, 0.25] } : undefined }, 1, true);
    else s.puff(T_DROP_ROB, 0, 2.0, -7.6, 1.3, 0.8);
    if (t >= T_DROP_ROB && t < T_DROP_ROB + 0.4) { const k = clamp01((t - T_DROP_ROB) / 0.4); s.fx("wig", 200, 200, (p) => hatCard(p, "wig"), 0, 2.6 - 0.75 * k * k, -7.5 + 0.3 * k, 0.45, 0.45, { rot: -3 * k }); }
    cheering([[-3.8, 0, -2.6], [3.8, 0, -2.6], [-5.5, 0, -1.2], [5.5, 0, -1.2]], 1, 1, P);
  } else if (id === 19) {                                // exhausted France, then Napoleon walks in
    crowdSpots(24, -8, 8, -3.5, 3).forEach((p, k) => s.who(160 + k, k % 3 ? P(k) : REV(k), `x${k % 3 ? "p" : "r"}${k % 5}`, p[0], 0, p[2], { mode: "sit", expr: k % 2 ? "dazed" : "neutral", look: 0 }, 1, false));
    const u = clamp01((t - 48.9) / 2.4), x = 12 - 10 * u;
    s.who(3, NAP(false), "nap", x, 0, 3.4, { mode: u < 1 ? "stroll" : "stand", phase: q(stroll(t, 3, 1.4), 24), expr: "smile" }, 0.85);
  } else if (id === 20) {                                // Napoleon on a crate
    cheering(crowdSpots(22, -7, 7, 0, 3), 3, 4, (i) => (i % 2 ? REV(i) : P(i)));
    s.who(3, NAP(false), "napC", 0, 0.8, -2.95, { mode: "stand", expr: "grin", arms: { r: [0.55, -1.0] } }, 0.85);
  }
};
