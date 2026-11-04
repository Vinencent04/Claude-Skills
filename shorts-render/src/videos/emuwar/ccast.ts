// Cast of the emu war short: bean-heads play the farmers, the minister, the major and the soldiers; the emus are drawn cards (side view).
// stage(f, cam) -> character cards + effect cards for the shot at frame f. All positions are set-local (toW converts).
import * as THREE from "three";
import { Pen, bodyFront, fxBurst, fxPuff, fxContact, fxShadow, SKINS, INK, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import { FPS, V3, SetName, toW, shotAt, herdX, T_WON, T_CROPS, T_STAMP, T_MAJOR, T_SOLD, T_GUNS, T_ROUNDS, T_SPLIT, T_GUNON, T_JAM, T_HOME, T_QUOTE, T_EAT } from "./story";
import { truckPose } from "./world";

export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();

// ---------------- outfits ----------------
const SHIRTS = ["#4a6a8a", "#8a6a4a", "#6a7a4a", "#8a4a4a"];
const FARMER = (v: number): Outfit => ({ jacket: SHIRTS[v % 4], pants: "#5a4a3a", boots: "#3a2a20", hat: v % 2 ? "cap" : "hair", cap: ["#c8b070", "#a08850", "#d8c490"][v % 3], hair: ["#5a3b2a", "#2a2022", "#8a6a3a"][v % 3], skin: SKINS[v % 4], build: v % 5 === 3 ? "stout" : "adult" });
const SOLDIER = (v: number): Outfit => ({ jacket: "#8a8456", pants: "#6a6a44", boots: "#3a2a20", hat: "cap", cap: "#7a7448", belt: "#5a4a2a", buttons: "#d9b04a", skin: SKINS[v % 4], build: "adult" });
const MAJOR: Outfit = { jacket: "#8a8456", pants: "#6a6a44", boots: "#3a2a20", hat: "cap", cap: "#6a6440", belt: "#5a4a2a", sash: "#b02a30", buttons: "#d9b04a", moustache: "#3a2a22", skin: SKINS[0], build: "stout" };
const MINISTER: Outfit = { jacket: "#3a3f4a", pants: "#2a2a30", boots: "#2a2a30", hat: "tophat", moustache: "#5a4a3a", buttons: "#d9d4c4", skin: SKINS[2], build: "stout" };

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

// ---------------- the emu (side view, faces +x; mirror flips it) ----------------
type EmuMode = "run" | "stand" | "eat" | "watch";
const EMU_BODY = "#7a5a3c", EMU_LIGHT = "#a2825c", EMU_NECK = "#9db0c4";
const drawEmu = (p: Pen, mode: EmuMode, phase: number, hat: boolean, blink: number) => {
  const g = p.g, ph = phase * Math.PI * 2;
  // legs (behind the body): two long thin legs with three-toed feet
  for (const s of [0, 1]) {
    const hx = 250 + s * 80, sw = mode === "run" ? Math.sin(ph + s * Math.PI) : 0.15 * (s ? 1 : -1), lift = mode === "run" ? 46 * Math.max(0, Math.cos(ph + s * Math.PI)) : 0;
    const fx = hx + 95 * sw, fy = 970 - lift, kx = hx + 40 * sw - 22, ky = 820;
    p.line([[hx, 660], [kx, ky], [fx, fy - 20]], "#8a7a6a", 22);
    p.line([[fx - 6, fy - 20], [fx + 52, fy - 4]], "#6a5a4a", 14); p.line([[fx - 6, fy - 20], [fx + 36, fy + 6]], "#6a5a4a", 14); p.line([[fx - 10, fy - 22], [fx - 44, fy - 8]], "#6a5a4a", 12);
  }
  // tail + body
  p.ell(150, 520, 70, 62, EMU_BODY, 9, 0, 360, -20);
  p.ell(290, 560, 170, 126, EMU_BODY, 10);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rx = 120 * Math.cos(a), ry = 88 * Math.sin(a); p.stroke([[290 + rx, 560 + ry], [270 + rx * 0.9, 584 + ry * 0.9]], 6, EMU_LIGHT); }
  p.ell(330, 600, 96, 60, EMU_LIGHT, 0);
  // neck + head
  const bend = mode === "eat" ? 1 : mode === "watch" ? 0.15 : 0;
  const neck: [number, number][] = bend > 0.5 ? [[385, 520], [440, 640], [476, 790], [486, 920]] : [[380, 520], [415, 420], [432 + 14 * bend, 300], [446 + 18 * bend, 200]];
  p.line(neck, EMU_NECK, 46);
  const [hx, hy] = bend > 0.5 ? [490, 940] : neck[3];
  const dir = bend > 0.5 ? [0.3, 1] : [1, 0.12];
  p.ell(hx + 16, hy - (bend > 0.5 ? 0 : 14), 46, 32, EMU_NECK, 9, 0, 360, bend > 0.5 ? 80 : 4);
  const bx = hx + 16 + dir[0] * 40, by = hy - (bend > 0.5 ? -30 : 14) + dir[1] * 12;
  p.poly([[bx - 6, by - 14], [bx + (bend > 0.5 ? 18 : 62), by + (bend > 0.5 ? 52 : 12)], [bx - 8, by + 18]], "#352f36", 8);
  const ex = hx + 8, ey = hy - (bend > 0.5 ? -8 : 28);
  p.ell(ex, ey, 17, 17, "#ffffff", 6); p.ell(ex + 4, ey + (bend > 0.5 ? 4 : 2), 7, 7, INK, 0);
  if (blink > 0) p.ell(ex, ey, 18, 18 * (1 - blink * 0.9), "#9db0c4", 5);
  if (hat) {                                                    // a stolen slouch hat
    const hy2 = hy - (bend > 0.5 ? -10 : 40);
    p.ell(hx + 10, hy2 + 4, 66, 14, "#7a7448", 8); p.ell(hx + 10, hy2 - 16, 32, 26, "#7a7448", 8); p.ell(hx + 10, hy2 - 2, 32, 7, "#5a4a2a", 4);
  }
  void g;
};
const hatCardE = (p: Pen) => { p.ell(100, 120, 80, 18, "#7a7448", 8); p.ell(100, 96, 38, 34, "#7a7448", 8); p.ell(100, 112, 38, 9, "#5a4a2a", 4); };
const featherE = (p: Pen) => { p.poly([[100, 190], [78, 110], [92, 30], [112, 100]], "#d9c8a8", 7); p.stroke([[100, 190], [96, 40]], 5, "#7a5a3c"); };
const gunCard = (p: Pen) => { p.stroke([[40, 150], [210, 150]], 14, "#3d414c"); p.ell(110, 118, 34, 20, "#3d414c", 8); p.stroke([[90, 156], [60, 235]], 9, "#3d414c"); p.stroke([[130, 156], [160, 235]], 9, "#3d414c"); };
const rr = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): [number, number][] => {
  const pts: [number, number][] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(((a + (90 * i) / n) * Math.PI) / 180), cy + r * Math.sin(((a + (90 * i) / n) * Math.PI) / 180)]);
  return pts;
};
const font = (g: CanvasRenderingContext2D, px: number) => { g.font = `900 ${px}px Georgia, 'Times New Roman', serif`; g.textAlign = "center"; g.textBaseline = "middle"; };
const inkStamp = (word: string) => (p: Pen) => { const g = p.g; g.save(); g.translate(300, 120); g.rotate(-0.06); g.strokeStyle = "#c92a2e"; g.lineWidth = 16; g.strokeRect(-270, -92, 540, 184); g.fillStyle = "#c92a2e"; font(g, 88); g.fillText(word, 0, 8); g.restore(); };
const stamper = (p: Pen) => { p.poly(rr(60, 150, 180, 250, 12), "#b45a3a", 8); p.poly(rr(100, 40, 140, 160, 12), "#6a3a22", 8); p.poly(rr(60, 150, 180, 190, 10), "#d2373a", 8); };
const shout = (word: string, col = "#c92a2e") => (p: Pen) => { const g = p.g; p.poly([[20, 100], [70, 20], [120, 90], [200, 10], [240, 90], [330, 40], [330, 140], [250, 190], [190, 150], [120, 200], [70, 150]], "#ffe066", 10); font(g, 60); g.fillStyle = col; g.fillText(word, 180, 100); };
const confetti = (p: Pen) => { const cols = ["#e84a4a", "#ffd84a", "#4a9ae8", "#6ac85a"]; for (let i = 0; i < 18; i++) p.poly([[60 + (i * 53) % 480, 30 + (i * 37) % 200], [76 + (i * 53) % 480, 36 + (i * 37) % 200], [64 + (i * 53) % 480, 56 + (i * 37) % 200]], cols[i % 4], 2); };

// ---------------- helpers ----------------
const stroll = (t: number, i: number, speed = 1.0) => ((t * 0.7 * speed + hh(i, 4)) % 1 + 1) % 1;
const SIZE = (d: number): [number, number, number] => (d < 6 ? [600, 1000, 1.0] : d < 16 ? [400, 667, 0.67] : [300, 500, 0.5]);

export const stage = (f: number, cam: CamInfo): Stage => {
  const sh = shotAt(f), t = f / FPS, s = new S(cam, sh.set, t), id = sh.id;
  const emu = (i: number, x: number, y: number, z: number, mode: EmuMode, ph: number, o: { mirror?: boolean; hat?: boolean; sc?: number } = {}) => {
    const [X, Y, Z] = s.w(x, y, z), d = cam.pos.distanceTo(tmp.set(X, Y + 1, Z)), sc = (o.sc ?? 0.9) * 1.15, size = SIZE(d / sc);
    const blink = (Math.floor(t * 30 + i * 11) % 80) < 3 ? 1 : 0, phq = q(ph, 12), hat = !!o.hat;
    s.out.places.push({ key: `EMU|${mode}|${phq}|${hat ? 1 : 0}|${blink}`, x: X, y: Y, z: Z, scale: sc, mirror: !!o.mirror, draw: (p) => drawEmu(p, mode, phq, hat, blink), size });
    if (mode !== "eat" || true) s.blob(x, y, z, sc * 1.25);
  };
  const run = (i: number, speed = 3.2) => ((t * speed + 0.137 * i) % 1 + 1) % 1;
  const truckCrew = (tp: ReturnType<typeof truckPose>, expr: Expr, arms?: FrontOpts["arms"], n = 3) => {
    const c = Math.cos(tp.yaw), sn = -Math.sin(tp.yaw), y = 1.25 + tp.bounce;
    const at = (lx: number) => [tp.x + lx * c, tp.z + lx * sn] as const;
    const [cx, cz] = at(1.5); s.who(70, SOLDIER(1), "tdrv", cx, y, cz, { mode: "sit", expr }, 0.9, false);
    if (n > 1) { const [gx, gz] = at(-1.0); s.who(71, SOLDIER(2), "tgun", gx, y, gz + 0.5, { mode: "stand", expr, arms }, 0.9, false); }
    if (n > 2) { const [mx, mz] = at(0.2); s.who(72, MAJOR, "tmaj", mx, y, mz - 0.5, { mode: "stand", expr: expr === "shock" ? "stern" : expr, arms: arms ? { l: [-0.6, -0.95], r: [0.5, 0.2] } : undefined }, 0.9, false); }
  };
  switch (id) {
    case 1: {                                            // HOOK A: the herd outruns the truck
      for (let k = 0; k < 9; k++) emu(300 + k, herdX(t) + 0.85 * k + 0.4 * hh(k, 2), 0, -5.4 - 0.9 * (k % 3), "run", run(k), { mirror: true, sc: 0.9 });
      for (let k = 0; k < 9; k += 2) { const u = ((t * 2.2 + hh(k, 3)) % 1); s.fx("dust", 300, 300, (p) => fxPuff(p, 0.2 + 0.6 * u), herdX(t) + 0.85 * k + 1.6, 0.5, -5.4, 1.9, 1.9, { soft: true }); }
      truckCrew(truckPose(1, t), "shock", { l: [-0.6, -0.9], r: [0.6, -0.9] });
      { const tp = truckPose(1, t); const u = ((t * 2.6) % 1); s.fx("dust2", 300, 300, (p) => fxPuff(p, 0.2 + 0.6 * u), tp.x + 3.2, 0.6, tp.z, 2.6, 2.4, { soft: true }); }
      break;
    }
    case 2: {                                            // HOOK B: the emu sits on the truck wearing the hat, soldiers surrender
      emu(1, -0.9, 1.25, -6.0, "stand", 0, { hat: true, sc: 0.85 });
      s.who(2, SOLDIER(1), "sa", 2.7, 0, -4.3, { mode: "stand", expr: "shock", arms: { l: [-0.6, -0.95], r: [0.6, -0.95] } });
      s.who(3, SOLDIER(2), "sb", 4.0, 0, -4.9, { mode: "stand", expr: "pained", arms: { l: [-0.6, -0.95], r: [0.6, -0.95] } });
      s.who(4, MAJOR, "maj", -2.6, 0, -4.2, { mode: "stand", expr: "nervous", arms: { l: [-0.6, -0.95], r: [0.6, -0.95] } });
      if (t >= T_WON - 0.1) { const a = t - T_WON; for (let k = 0; k < 3; k++) s.fx("confetti", 600, 300, confetti, -0.9 + 0.5 * (k - 1), 3.1 - 0.5 * a, -5.6, 2.4, 1.2, { rot: 0.1 * k }); s.burst(T_WON - 0.1, -0.9, 2.4, -5.9, 2.4, 0.35, "#ffe9a0"); }
      break;
    }
    case 3: {                                            // veterans turned farmers
      for (let k = 0; k < 5; k++) s.who(10 + k, FARMER(k), `fa${k % 4}`, -3 + 2.2 * k, 0, 3.4, { mode: "stand", expr: k % 2 ? "smile" : "grin", arms: { l: [-0.6, -0.9 + 0.1 * Math.round(Math.sin(t * 5 + k))], r: [0.5, 0.3] } });
      break;
    }
    case 4: {                                            // the emus pour in
      for (let k = 0; k < 30; k++) { const x = 16 + 2.0 * k - 6.4 * (t - 12.5), z = -3.4 - 1.1 * (k % 5) - 0.3 * hh(k, 2); emu(400 + k, x, 0, z, "run", run(k, 2.6), { mirror: true, sc: 0.85 }); }
      break;
    }
    case 5: {                                            // the farmers ask for help
      s.who(1, MINISTER, "min", 0, 0.48, -7.7, { mode: "sit", expr: "stern", arms: { l: [-0.5, 0.4], r: [0.5, 0.4] } }, 1, false);
      s.who(2, FARMER(0), "fm0", -1.6, 0, -3.3, { mode: "stand", expr: "pained", arms: { l: [-0.5, 0.35], r: [0.5, 0.35] } });
      s.who(3, FARMER(3), "fm1", 1.5, 0, -3.1, { mode: "stand", expr: "nervous", arms: { l: [-0.5, 0.2], r: [0.5, 0.45] } });
      break;
    }
    case 6: {                                            // "the government sent the army": the stamp
      const age = t - T_STAMP, up = age < -0.25 ? 1 : age < 0 ? -age / 0.25 : 0;
      s.who(1, MINISTER, "min", 0, 0.48, -7.7, { mode: "sit", expr: age < 0 ? "smile_closed" : "grin", arms: { r: [0.5, 0.3 - 0.2 * up] } }, 1, false);
      if (age < 0.35) s.fx("stamper", 240, 280, stamper, 0.0, 1.5 + 0.9 * up, -4.7, 0.55, 0.64);
      if (age >= 0) { const sc = 1 + 0.5 * (1 - Math.min(1, age / 0.14)); s.fx("armystamp", 600, 240, inkStamp("ARMY SENT"), -0.5, 1.17, -5.3, 1.5 * sc, 0.6 * sc, { flat: true, rot: -0.06 }); s.burst(T_STAMP, -0.5, 1.4, -5.2, 1.6, 0.25, "#ffd27a"); }
      break;
    }
    case 7: {                                            // the army lines up
      const pop = (t0: number) => clamp01((t - t0) / 0.2);
      if (pop(T_MAJOR) > 0) s.who(1, MAJOR, "maj", -2.4, 0, 6.0, { mode: "stand", expr: "stern", arms: { l: [-0.5, 0.2], r: [0.5, -0.5] } }, pop(T_MAJOR) * 1.05);
      if (pop(T_SOLD) > 0) { s.who(2, SOLDIER(1), "s1", 0.4, 0, 6.0, { mode: "stand", expr: "neutral", arms: { r: [0.5, -0.5] } }, pop(T_SOLD)); s.who(3, SOLDIER(2), "s2", 2.8, 0, 6.0, { mode: "stand", expr: "neutral", arms: { r: [0.5, -0.5] } }, pop(T_SOLD)); }
      if (pop(T_GUNS) > 0) for (let k = 0; k < 2; k++) s.fx("gun", 240, 280, gunCard, 5.0 + 1.5 * k, 0.65, 6.1, 1.5 * pop(T_GUNS), 1.7 * pop(T_GUNS));
      if (t >= T_ROUNDS - 0.1 && t < T_ROUNDS + 0.3) s.burst(T_ROUNDS - 0.1, 8.6, 1.0, 6.3, 2.2, 0.3, "#ffd27a");
      break;
    }
    case 8: {                                            // the emus split and scatter
      const age = Math.max(0, t - T_SPLIT);
      s.who(1, MAJOR, "maj", 0, 0, -9.0, { mode: "stand", expr: "shock", look: 0, arms: { l: [-0.6, -0.5], r: [0.6, -0.5] } }, 0.95);
      s.who(2, SOLDIER(1), "s1", -1.4, 0, -8.6, { mode: "stand", expr: "nervous" }, 0.95); s.who(3, SOLDIER(2), "s2", 1.5, 0, -8.7, { mode: "stand", expr: "shock" }, 0.95);
      for (let k = 0; k < 25; k++) {
        const g = k % 5, ang = (g / 5) * Math.PI * 2 + 0.6, sp = 5.5 + 1.2 * hh(k, 4), spread = (hh(k, 5) - 0.5) * 2.0;
        const x = Math.cos(ang) * (4 + sp * age) + spread, z = -9 + Math.sin(ang) * (3 + sp * age) * 0.9;
        emu(500 + k, x, 0, z, "run", run(k, 3.2), { mirror: Math.cos(ang) < 0, sc: 0.85 });
      }
      break;
    }
    case 9: {                                            // the gun goes on the truck
      const tp = truckPose(9, t);
      s.who(2, SOLDIER(1), "sa", -2.0, 0, -1.2, { mode: "stand", expr: "grin", arms: { l: [-0.6, -0.5], r: [0.6, -0.5] } });
      s.who(3, SOLDIER(2), "sb", 1.9, 0, -1.0, { mode: "stand", expr: "grin", arms: { l: [-0.6, -0.5], r: [0.6, -0.5] } });
      s.who(4, MAJOR, "maj", 3.1, 0, -1.6, { mode: "stand", expr: "smile", arms: { r: [0.6, -0.5] } });
      if (t >= T_GUNON - 0.1) s.burst(T_GUNON - 0.1, -0.9, 2.3, -2.7, 2.0, 0.3, "#ffe9a0");
      void tp;
      break;
    }
    case 10: {                                            // the emu outruns the truck, the gun jams
      const tp = truckPose(10, t), ex = -4 + 11.5 * (t - 31.4);
      emu(1, ex, 0, -7.4, "run", run(1, 3.4), { sc: 0.95 });
      truckCrew(tp, t < T_JAM ? "nervous" : "pained", { l: [-0.6, -0.5], r: [0.6, -0.5] });
      const u = (t * 2.4) % 1; s.fx("dust", 300, 300, (p) => fxPuff(p, 0.2 + 0.6 * u), tp.x - 3.0, 0.6, tp.z, 2.4, 2.2, { soft: true });
      if (t >= T_JAM - 0.05) { const age = t - T_JAM, sc = 1 + 0.5 * (1 - Math.min(1, age / 0.14)); s.fx("click", 360, 220, shout("CLICK!"), tp.x - 0.9, 3.6 + 0.2 * age, tp.z, 2.0 * sc, 1.2 * sc, { rot: 0.1 }); for (let n = 0; n < 3; n++) { const w = clamp01(age / 1.2); s.fx("smoke", 300, 300, (p) => fxPuff(p, 0.3 + 0.5 * w), tp.x - 0.9 + 0.2 * n, 2.2 + 0.7 * n * w, tp.z, 1.4, 1.4, { soft: true }); } }
      break;
    }
    case 11: {                                            // the army goes home
      const tp = truckPose(11, t);
      truckCrew(tp, "dazed");
      for (let k = 0; k < 6; k++) emu(600 + k, -7 + 3.0 * k, 0, 0.8 + 0.3 * (k % 2), "watch", 0, { mirror: k % 2 === 0, sc: 0.9, hat: k === 3 });
      break;
    }
    case 12: {                                            // the major's verdict
      const awe = t >= T_QUOTE + 0.3;
      s.who(1, MAJOR, "maj", 0.4, 0, 3.6, { mode: "stand", expr: awe ? "shock" : "stern", arms: { l: [-0.55, -0.4], r: [0.5, 0.3] } }, 1.05);
      emu(2, -1.6, 0, 0.9, "stand", 0, { mirror: false, sc: 0.95 }); emu(3, 2.4, 0, 0.6, "watch", 0, { mirror: true, sc: 0.9 });
      break;
    }
    case 13: {                                            // the emus keep eating
      for (let k = 0; k < 16; k++) emu(700 + k, -7 + 1.0 * k + 0.5 * hh(k, 2), 0, -2.5 - 1.5 * (k % 5), "eat", 0, { mirror: k % 2 === 0, sc: 0.9 });
      break;
    }
    case 14: {                                            // CTA: the hat on the fence post, one feather
      s.fx("hatpost", 200, 200, hatCardE, 0.1, 1.55, 2.25, 0.85, 0.85, { rot: -0.08 });
      s.fx("feather", 200, 200, featherE, 0.55, 1.6, 2.25, 0.5, 0.7, { rot: 0.3 });
      break;
    }
  }
  return s.out;
};
void fxBurst; void fxContact; void fxShadow; void bodyFront; void smooth; void stroll; void T_CROPS; void T_SOLD; void T_HOME; void T_EAT;
export type { V3, SetName, Expr, FrontOpts };
