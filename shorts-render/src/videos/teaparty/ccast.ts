// Cast of the tea party short: bean-heads play the shopkeeper, the governor, colonists, the men in feathers and the guards.
// stage(f, cam) -> character cards + effect cards for the shot at frame f. All positions are set-local (toW converts).
import * as THREE from "three";
import { Pen, bodyFront, fxBurst, fxPuff, fxSplash, fxContact, fxShadow, SKINS, INK, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import { FPS, V3, SetName, toW, shotAt, T_TAG, T_CUT, T_TAX, T_REFUSE, T_MEET, T_MARCH, T_COUNT, T_CLOSE, T_JOIN, T_BACK, T_TIP } from "./story";
import { launchT, launchX, openT, tipT, deckX, DECK_Y, WATER_Y } from "./world";

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();

// ---------------- outfits ----------------
const EARTH = ["#8f6b4a", "#6e7f4a", "#9a7a52", "#7a6a8c", "#a05a46", "#3f7f86"];
const CAPS = ["#8a6a46", "#6a5a4a", "#a4824f", "#5a6a4a"];
const COL = (v: number): Outfit => ({ jacket: EARTH[v % 6], pants: ["#4a4038", "#3b3f52", "#5a4a3a"][v % 3], boots: "#3a2a20", hat: v % 3 === 0 ? "tophat" : v % 3 === 1 ? "cap" : "hair", cap: CAPS[v % 4], hair: ["#5a3b2a", "#2a2022", "#8a6a3a"][v % 3], skin: SKINS[v % 4], build: v % 5 === 3 ? "stout" : "adult" });
const MOH = (v: number): Outfit => ({ jacket: ["#2a4a6a", "#5a3a2a", "#3a5a4a", "#6a3a3a"][v % 4], pants: "#3a2a22", boots: "#3a2a20", hat: "feather", belt: "#c0392b", skin: SKINS[(v + 1) % 4], build: v % 3 === 2 ? "stout" : "adult" });
const SHOPK: Outfit = { jacket: "#4f7a5a", pants: "#5a4a3a", boots: "#3a2a20", hat: "hair", hair: "#6a4a2a", apron: "#f2ead2", moustache: "#4a3020", skin: SKINS[1], build: "stout" };
const GOV: Outfit = { jacket: "#1f3a6b", pants: "#f0f0f0", boots: "#2a2a30", hat: "wig", hair: "#f2efe8", buttons: "#e8c45a", sash: "#c0353a", skin: SKINS[0], build: "stout" };
const GUARD = (v: number): Outfit => ({ jacket: "#b02a30", pants: "#f0f0f0", boots: "#2a2a30", hat: "bicorne", belt: "#f6f3ea", buttons: "#e8c45a", skin: SKINS[v % 3], build: "adult" });
const SPEAKER: Outfit = { jacket: "#6b2d3c", pants: "#3b3f52", boots: "#2a2a30", hat: "hair", hair: "#d8d2c6", buttons: "#e8c45a", skin: SKINS[0], build: "adult" };

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
const teacup = (p: Pen) => { p.poly(rr(34, 60, 126, 138, 24), "#f2ead2", 8); p.arc(138, 96, 24, 28, -90, 90, 8, INK); p.poly(rr(26, 130, 134, 146, 8), "#e0d6b8", 6); p.arc(80, 60, 40, 8, 0, 360, 4, "#7a4a1a"); for (let i = 0; i < 2; i++) p.arc(60 + i * 40, 26, 10, 18, 200, 340, 4, "#ffffff"); };
const leaf = (p: Pen) => { p.ell(60, 60, 34, 14, "#5a7a2a", 6, 0, 360, 30); p.ell(40, 80, 24, 10, "#7a5a2a", 5, 0, 360, -20); };
const priceTag = (word: string, col: string) => (p: Pen) => { const g = p.g; p.poly(rr(10, 30, 330, 150, 18), col, 10); p.dot(36, 90, 10, "#f2ead2"); font(g, 62); g.fillStyle = "#fff6dc"; g.fillText(word, 190, 92); };
const board = (stage: number) => (p: Pen) => {
  const g = p.g; p.poly(rr(10, 10, 590, 380, 22), "#2f3a34", 14); p.poly(rr(26, 26, 574, 364, 14), "#3a4a42", 0);
  g.fillStyle = "#f2ead2"; font(g, 64); g.fillText("TEA", 300, 86); g.font = "700 40px Georgia, serif"; g.fillText("per pound", 300, 140);
  font(g, 120);
  if (stage === 0) { g.fillStyle = "#f2ead2"; g.fillText("9d", 300, 262); }
  else if (stage === 1) {
    g.fillStyle = "#8a948e"; g.fillText("9d", 180, 262); g.strokeStyle = "#e84a4a"; g.lineWidth = 14; g.beginPath(); g.moveTo(80, 300); g.lineTo(290, 210); g.stroke();
    g.fillStyle = "#ffd84a"; g.fillText("6d", 430, 262);
  } else {
    g.fillStyle = "#ffd84a"; g.fillText("6d", 190, 262); g.fillStyle = "#f2ead2"; font(g, 80); g.fillText("+", 330, 262); g.fillStyle = "#e84a4a"; font(g, 120); g.fillText("3d", 450, 262);
  }
};
const inkStamp = (word: string) => (p: Pen) => {
  const g = p.g; g.save(); g.translate(300, 120); g.rotate(-0.06);
  g.strokeStyle = "#c92a2e"; g.lineWidth = 16; g.strokeRect(-270, -92, 540, 184);
  g.fillStyle = "#c92a2e"; font(g, 92); g.fillText(word, 0, 8); g.restore();
};
const slate = (n: number) => (p: Pen) => { const g = p.g; p.poly(rr(10, 10, 590, 230, 22), "#2f3a34", 14); p.poly(rr(24, 24, 576, 216, 14), "#3f524a", 0); g.fillStyle = "#f2ead2"; font(g, 120); g.fillText(String(n), 300, 100); g.font = "800 44px Georgia, serif"; g.fillText("CHESTS", 300, 184); };
const shout = (word: string) => (p: Pen) => { const g = p.g; p.poly([[20, 100], [70, 20], [120, 90], [200, 10], [240, 90], [330, 40], [330, 140], [250, 190], [190, 150], [120, 200], [70, 150]], "#ffe066", 10); font(g, 70); g.fillStyle = "#c92a2e"; g.fillText(word, 180, 100); };
const stamper = (p: Pen) => { p.poly(rr(60, 150, 180, 250, 12), "#b45a3a", 8); p.poly(rr(100, 40, 140, 160, 12), "#6a3a22", 8); p.poly(rr(60, 150, 180, 190, 10), "#d2373a", 8); };

// ---------------- helpers ----------------
const stroll = (t: number, i: number, speed = 1.0) => ((t * 0.7 * speed + hh(i, 4)) % 1 + 1) % 1;
const cheerArms = (t: number, i: number) => ({ l: [-0.6 - 0.1 * Math.round(Math.sin(t * 9 + i)), -0.95] as [number, number], r: [0.6, -0.95 + 0.08 * Math.round(Math.sin(t * 9 + i * 2))] as [number, number] });

export const stage = (f: number, cam: CamInfo): Stage => {
  const sh = shotAt(f), t = f / FPS, s = new S(cam, sh.set, t), id = sh.id;
  const tagAge = t - T_TAG, taxAge = t - T_TAX;
  const pop = (age: number) => 1 + 0.55 * (1 - Math.min(1, age / 0.14));
  switch (id) {
    case 1: {                                            // HOOK A: the men in feathers throw the chests off the Eleanor
      for (let k = 0; k < 9; k++) {
        const x = -7.2 + 1.8 * k, ph = Math.round(Math.sin(t * 6 + k * 1.3));
        s.who(300 + k, MOH(k), `m${k % 4}${k % 3}`, x, DECK_Y, -4.95, { mode: "stand", expr: k % 3 ? "laugh" : "grin", arms: { l: [-0.6, -0.95 + 0.1 * ph], r: [0.6, -0.95 - 0.1 * ph] } }, 1, false);
      }
      for (let k = 0; k < 17; k++) {
        const u = t - (launchT(k) + 0.9);
        if (u >= 0 && u < 0.55) { const uu = q(u / 0.55, 10); s.fx(`splash${uu}`, 300, 300, (p) => fxSplash(p, uu), launchX(k) + 1.1, WATER_Y + 0.7, -2.2, 1.9, 1.9); }
      }
      break;
    }
    case 2: {                                            // HOOK B: calm shop, the CHEAPER! tag
      s.who(1, SHOPK, "shk", 0, 0, -6.9, { mode: "stand", expr: tagAge < 0 ? "smile" : "grin", arms: { l: [-0.7, -0.3], r: [0.7, tagAge < 0 ? 0.2 : -0.4] } });
      s.fx("cup", 160, 160, teacup, -1.6, 1.62, -4.9, 0.7, 0.7);
      if (tagAge >= 0) { const sc = pop(tagAge); s.fx("tagCheap", 340, 180, priceTag("CHEAPER!", "#c0392b"), 0.55, 1.8, -4.45, 1.2 * sc, 0.65 * sc, { rot: -0.12 }); s.burst(T_TAG, 0.9, 1.75, -4.4, 2.0, 0.3); }
      break;
    }
    case 3: {                                            // the price falls
      const stg = t < T_CUT ? 0 : 1, a = t - T_CUT;
      s.who(1, SHOPK, "shk", 1.6, 0, -6.9, { mode: "stand", expr: "smile", arms: { l: [-0.7, 0.2], r: [0.7, 0.2] } });
      s.fx(`board${stg}`, 600, 400, board(stg), -0.3, 1.9, -5.0, 2.0, 1.33, { rot: stg ? -0.03 : 0 });
      if (a >= 0) s.burst(T_CUT, 0.3, 2.0, -4.9, 2.2, 0.3, "#ffe066");
      break;
    }
    case 4: {                                            // one small tax: the stamp slams on the chest
      s.who(1, SHOPK, "shk", -0.8, 0, -6.9, { mode: "stand", expr: taxAge < 0 ? "smile" : "shock", arms: taxAge >= 0 ? { l: [-0.6, -0.9], r: [0.6, -0.9] } : { l: [-0.7, 0.2], r: [0.7, 0.2] } });
      const up = taxAge < -0.25 ? 1 : taxAge < 0 ? -taxAge / 0.25 : 0;
      if (taxAge < 0.35) s.fx("stamper", 240, 280, stamper, 0.9, 1.9 + 0.8 * up, -4.45, 0.6, 0.7);
      if (taxAge >= 0) { const sc = pop(taxAge); s.fx("taxstamp", 600, 240, inkStamp("TAX 3d"), 0.9, 1.62, -4.5, 1.5 * sc, 0.6 * sc, { rot: -0.08 }); s.burst(T_TAX, 0.9, 1.62, -4.4, 1.5, 0.25, "#ffd27a"); }
      break;
    }
    case 5: {                                            // three ships: tiny dockers on the pier
      for (let k = 0; k < 6; k++) s.who(60 + k, COL(k), `d${k % 3}`, -22 + 3.4 * k + 0.5 * Math.sin(t * 0.8 + k), 0, 6.2 + 0.7 * (k % 2), { mode: "stroll", phase: q(stroll(t, k, 0.7), 24), expr: "neutral" });
      break;
    }
    case 6: {                                            // the governor refuses
      const shake = t >= T_REFUSE ? Math.sign(Math.sin((t - T_REFUSE) * 14)) : 0;
      s.who(1, GOV, "gov", 19.0, 0.48, -7.2, { mode: "sit", expr: t < T_REFUSE ? "stern" : "stern", look: shake as -1 | 0 | 1, arms: { l: [-0.5, 0.4], r: [0.5, 0.4] } }, 1, false);
      s.who(2, COL(1), "pl1", 16.5, 0, -2.9, { mode: "stand", expr: "nervous", arms: { l: [-0.5, 0.45], r: [0.5, 0.2] } });
      s.who(3, COL(5), "pl2", 21.6, 0, -2.8, { mode: "stand", expr: "pained", arms: { l: [-0.5, 0.2], r: [0.5, 0.45] } });
      if (t >= T_REFUSE) { const ag = t - T_REFUSE; s.fx("no", 360, 220, shout("NO!"), 18.1, 3.0, -6.9, 1.5 * pop(ag), 0.92 * pop(ag), { rot: 0.1 }); }
      break;
    }
    case 7: {                                            // the meeting
      const up = t >= T_MEET;
      s.who(1, SPEAKER, "spk", 0, 1.2, -12.0, { mode: "stand", expr: up ? "laugh" : "stern", arms: up ? { l: [-0.6, -0.95], r: [0.6, -0.95] } : { l: [-0.5, 0.3], r: [0.5, 0.3] } }, 0.9);
      for (let k = 0; k < 26; k++) {
        const x = -6.8 + (k % 9) * 1.7 + 0.4 * hh(k, 2), z = -7.0 + 2.0 * Math.floor(k / 9) + 0.3 * hh(k, 3);
        s.who(100 + k, COL(k), `c${k % 6}${k % 3}`, x, 0, z, { mode: "stand", expr: up ? (k % 2 ? "laugh" : "grin") : "stern", arms: up ? cheerArms(t, k) : undefined });
      }
      break;
    }
    case 8: {                                            // the march: men in feathers walk straight at the lens
      for (let k = 0; k < 12; k++) {
        const row = k % 3, x = 6 + 2.6 * (t - 19.5) - 1.5 * (k >> 2) * 1.6 - 0.5 * row;
        s.who(200 + k, MOH(k), `h${k % 4}${k % 3}`, x, 0, 5.2 + 1.5 * row, { mode: "stroll", phase: q(stroll(t, k, 2.0), 24), expr: k % 2 ? "stern" : "grin", arms: k % 4 === 0 ? { l: [-0.55, -0.9], r: [0.5, 0.3] } : undefined });
      }
      break;
    }
    case 9: {                                            // tipping the chests over the rail
      for (let i = 0; i < 6; i++) {
        const ta = t - tipT(i), tl = t - (tipT(i) + 1.1);
        s.who(300 + i, MOH(i + 2), `t${i % 4}${i % 3}`, deckX(i) - 0.95, DECK_Y, -5.0, { mode: "stand", expr: ta > 0 ? "laugh" : "stern", arms: ta > -0.2 && ta < 0.6 ? { l: [-0.6, -0.5], r: [0.6, -0.5] } : { l: [-0.5, 0.3], r: [0.5, 0.3] } }, 1, false);
        if (ta >= 0 && ta < 1.2) for (let n = 0; n < 5; n++) { const u = clamp01((ta - 0.15 * n * 0.3) / 1.1); s.fx("leaf", 120, 120, leaf, deckX(i) + 0.6 * Math.sin(n * 2.1 + i) * u, 2.9 + 0.2 * n - 4.6 * u * u, -3.9 + 1.3 * u, 0.3, 0.3, { rot: 6 * u + n }); }
        if (tl >= 0 && tl < 0.55) { const uu = q(tl / 0.55, 10); s.fx(`splash${uu}`, 300, 300, (p) => fxSplash(p, uu), deckX(i) + 0.2, WATER_Y + 0.7, -2.5, 1.8, 1.8); }
      }
      break;
    }
    case 10: {                                           // the count
      const cu = clamp01((t - T_COUNT) / 1.25), n = cu >= 1 ? 342 : Math.round((342 * q(cu, 10)) / 6) * 6 % 342;
      for (let k = 0; k < 4; k++) s.who(400 + k, MOH(k + 5), `w${k % 4}`, -5 + 3.4 * k, DECK_Y, -5.0, { mode: "stand", expr: "laugh", arms: cheerArms(t, k) }, 1, false);
      if (t >= T_COUNT - 0.05) { const ag = t - T_COUNT; s.fx(`slate${n}`, 600, 240, slate(n), 0.4, 1.9 + 0.1 * Math.sin(t * 2), 0.5, 3.8 * pop(ag), 1.52 * pop(ag), { rot: -0.04 }); }
      break;
    }
    case 11: {                                           // the harbor is closed
      s.who(1, GUARD(0), "g0", -1.7, 0, 5.2, { mode: "stand", expr: "stern" });
      s.who(2, GUARD(1), "g1", 2.9, 0, 5.2, { mode: "stand", expr: "stern" });
      if (t >= T_CLOSE - 0.1) s.burst(T_CLOSE - 0.1, 0.6, 2.4, 3.4, 3.6, 0.35, "#ffffff");
      break;
    }
    case 12: {                                           // the colonies join up
      for (let k = 0; k < 3; k++) s.who(500 + k, COL(k * 2 + 1), `v${k}`, -1.9 + 1.9 * k, 0, -6.2, { mode: "stand", expr: t > T_JOIN ? "grin" : "neutral", look: 0, arms: t > T_JOIN ? { l: [-0.55, -0.9], r: [0.55, -0.9] } : undefined });
      if (t >= T_JOIN) s.burst(T_JOIN, 0, 4.4, -12.5, 4.0, 0.35, "#ffe9a0");
      break;
    }
    case 13: {                                           // callback: cheaper tea, still taxed
      s.who(1, SHOPK, "shk", 0.4, 0, -6.9, { mode: "stand", expr: t < T_BACK ? "smile" : "dazed", arms: { l: [-0.7, 0.3], r: [0.7, 0.3] } });
      s.fx("board2", 600, 400, board(2), -0.45, 1.95, -4.7, 1.8, 1.2);
      s.fx("taxstamp", 600, 240, inkStamp("TAX 3d"), 0.9, 1.62, -4.5, 1.5, 0.6, { rot: -0.08 });
      s.fx("cup", 160, 160, teacup, -1.9, 1.62, -4.4, 0.7, 0.7);
      break;
    }
    case 14: {                                           // CTA: one teacup on a barrel
      s.fx("cup", 160, 160, teacup, 0.6, 1.3, 3.0, 0.72, 0.72, { rot: 0.1 });
      for (let k = 0; k < 3; k++) s.fx("leaf", 120, 120, leaf, -2 + 1.8 * k, 0.02, 1.6 - 0.9 * k, 0.5, 0.35, { flat: true, rot: k });
      break;
    }
  }
  return s.out;
};
void fxBurst; void fxPuff; void fxContact; void fxShadow; void tmp; void bodyFront; void T_MARCH; void T_TIP; void openT; void smooth;
export type { V3, Expr, FrontOpts };
