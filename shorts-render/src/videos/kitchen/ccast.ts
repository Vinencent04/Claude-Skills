// Kitchen cast: the cook, the kid, the pancake and the little effects, as lit cards in the 3D room (stage(f, cam) -> places + fx).
import * as THREE from "three";
import { Pen, bodyFront, fxNote, fxBurst, fxPuff, fxStars, fxCake, fxCakeStuck, fxContact, fxShadow, SKINS, Outfit, Expr, FrontOpts } from "./toon";
import { Place, FxPlace, CamInfo, hh, q, clamp01, smooth } from "./cards";
import {
  FPS, V3, COOK, KID, STICK, HEAD, PAN_AT, CEIL_Y, T_WIND, T_TOSS, T_STICK, T_PEEL, T_FALL, T_LAND, T_LICK, cakeFlight, cakeFall,
  T2_WIND, T2_TOSS, T2_STICK, T2_PEEL, T2_FALL, T2_LAND, T2_LICK, STICK2, HEAD2,
} from "./story";

export type Stage = { places: Place[]; fx: FxPlace[] };

/** world direction TOWARD the window sun (world.ts uses the same vector for the shadow-casting light) */
export const SUN = new THREE.Vector3(-0.8, 0.55, -0.3).normalize();
const tmp = new THREE.Vector3();

const COOK_O: Outfit = { jacket: "#efe9dc", pants: "#3b3f52", boots: "#4a3426", hat: "chef", apron: "#c8483a", skin: SKINS[1], moustache: "#4a3020", build: "stout" };
const KID_O: Outfit = { jacket: "#7fb3e6", pants: "#4b5aa0", boots: "#f4f1ea", hat: "hair", hair: "#7a4a2a", skin: SKINS[0], build: "kid" };

/** drawing resolution by distance */
const tier = (d: number): [number, number, number] => (d < 4.6 ? [1080, 1800, 1.8] : [540, 900, 0.9]);
const light2D = (cam: CamInfo) => {
  const sx = SUN.dot(cam.right), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

// blinks: gaps 0.5-2.3 s, half / shut / shut / half
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - 2 / FPS) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};

const person = (cam: CamInfo, i: number, o: Outfit, ok: string, x: number, y: number, z: number, fo: FrontOpts): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.0, z));
  const [w, h, k] = tier(d), light = light2D(cam), f2: FrontOpts = { ...fo, light, seed: i === 0 ? 3 : 5 };
  return { key: `F|${ok}|${fkey(f2)}`, x, y, z, draw: (p) => bodyFront(p, o, f2), size: [w, h, k] };
};

// ground blobs (interior: soft contact pool + a short tail away from the window sun)
const CONTACT: [number, number, number] = [0.3, 0.3, 0.42];
const TAIL: [number, number, number] = [0.5, 0.5, 0.66];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  const len = 1.1 * sc, h = len + 0.55 * sc, c = 0.3 * h, tc = hexOf(TAIL, k);
  out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  const cc = hexOf(CONTACT, k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- the cook ----------------
const cookExpr = (t: number): Expr => {
  if (t >= 15) {
    if (t < 17.5) return "relief";
    if (t < T2_WIND) return "whistle";
    if (t < T2_TOSS + 0.7) return "stern";
    if (t < T2_STICK + 0.05) return "grin";
    if (t < 21.6) return "shock";
    if (t < T2_FALL) return "nervous";
    if (t < T2_LAND) return "shock";
    return "dazed";
  }
  if (t < 2.2) return "whistle";
  if (t < 4.15) return "grin";
  if (t < T_TOSS + 0.9) return "stern";           // concentration, then pride while the cake flies
  if (t < T_STICK + 0.05) return "grin";
  if (t < 7.4) return "shock";
  if (t < 9.7) return "nervous";
  if (t < T_FALL) return "shock";
  if (t < 13.8) return "shock";
  return "relief";
};
const cookPose2 = (t: number): FrontOpts => {
  const fo: FrontOpts = { mode: "stand", expr: cookExpr(t), blink: lidAt(t, 0, [T2_STICK, 21.6, T2_LAND]), look: 0 };
  if (t < 17.5) { fo.arms = { l: [-0.65, -0.85] }; fo.pan = null; }                            // wipes his brow
  else if (t < T2_TOSS + 0.18) {
    let tilt = 5 * Math.sin(t * 5), dy = 0.34 + 0.04 * Math.sin(t * 5);
    if (t >= T2_WIND && t < T2_TOSS - 0.14) { const u = smooth((t - T2_WIND) / (T2_TOSS - 0.14 - T2_WIND)); tilt = -16 * u; dy = 0.34 + 0.2 * u; }
    else if (t >= T2_TOSS - 0.14) { const u = clamp01((t - (T2_TOSS - 0.14)) / 0.14); tilt = -16 + 44 * u; dy = 0.54 - 0.3 * u; }
    fo.pan = { tilt: Math.round(tilt), cake: t < T2_TOSS ? 1 : 0 };
    fo.arms = { r: [0.95, Math.round(dy * 100) / 100] };
    if (t >= T2_WIND) fo.headTilt = -2;
  } else if (t < 22.6) { fo.arms = { l: [-0.75, -0.62], r: [0.3, 0.55] }; fo.pan = null; }
  else if (t < T2_LAND + 0.1) {
    const k = clamp01((t - 22.6) / 1.2);                                                       // holds the pan up to catch it
    fo.arms = { l: [-0.6, -0.8], r: [0.7 - 0.2 * k, -0.9] }; fo.pan = { tilt: Math.round(3 * Math.sin(t * 9)), cake: 0 };
  } else { fo.arms = { l: [-0.4, 0.5], r: [0.4, 0.5] }; fo.pan = null; }
  if (fo.expr === "whistle") fo.blink = 0;
  return fo;
};
const cookPose = (t: number): FrontOpts => {
  if (t >= 15) return cookPose2(t);
  const fo: FrontOpts = { mode: "stand", expr: cookExpr(t), blink: lidAt(t, 0, [T_STICK, 7.4, 9.7]), look: 0 };
  if (t < T_TOSS + 0.18) {
    // pan work: idle shake -> deep wind-up -> flick
    let tilt = 6 * Math.sin(t * 5.5), dy = 0.34 + 0.05 * Math.sin(t * 5.5);
    if (t >= T_WIND && t < T_TOSS - 0.12) { const u = smooth((t - T_WIND) / (T_TOSS - 0.12 - T_WIND)); tilt = -34 * u; dy = 0.34 + 0.38 * u; }
    else if (t >= T_TOSS - 0.12) { const u = clamp01((t - (T_TOSS - 0.12)) / 0.12); tilt = -34 + 94 * u; dy = 0.72 - 0.5 * u; }
    fo.pan = { tilt: Math.round(tilt), cake: t < T_TOSS ? 1 : 0 };
    fo.arms = { r: [0.95, Math.round(dy * 100) / 100] };
    fo.headTilt = t >= T_WIND ? -3 : 0;
  } else if (t < 9.7) {
    fo.arms = { l: [-0.75, -0.62], r: t < 7.4 ? [0.3, 0.55] : undefined };       // hand on the cheek in shock
    fo.pan = null;
  } else if (t < T_LAND + 0.4) {
    fo.arms = { l: [-0.55, -0.9], r: [0.55, -0.9] };                               // both hands up, helpless
  } else fo.arms = { l: [-0.75, -0.62] };
  if (fo.expr === "whistle") fo.blink = 0;
  return fo;
};

// ---------------- the kid ----------------
const kidExpr = (t: number): Expr => (t >= 15 ? (t < 29.0 ? "neutral" : t < T2_LICK + 0.9 ? "lick" : "smile_closed") : t < T_LAND ? "neutral" : t < T_LICK - 0.4 ? "stern" : t < T_LICK ? "neutral" : "lick");
const kidPose = (t: number): FrontOpts => {
  const eating = t >= 15 ? t > 15.3 && t < 28.6 : t < 12.6 || (t > T_LAND + 0.7 && t < T_LICK - 0.5);
  const bob = eating ? Math.round(2.5 * Math.sin(t * 7.5) * 2) / 2 : 0;
  return { mode: "sit", expr: kidExpr(t), blink: lidAt(t, 1, [T_LAND, 29.0]), look: 0, headTilt: bob };
};

export const stage = (f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const t = f / FPS;
  // cook + kid
  const cf = cookPose(t);
  out.places.push(person(cam, 0, COOK_O, "cook", COOK[0], COOK[1], COOK[2], cf));
  blob(out, COOK[0], COOK[1], COOK[2], 1.15);
  out.places.push(person(cam, 1, KID_O, "kid", KID[0], KID[1], KID[2], kidPose(t)));
  // whistled notes
  if (cf.expr === "whistle") {
    for (let n = 0; n < 4; n++) {
      const age = ((t + n * 0.42) % 1.68) / 1.68;
      const pop = Math.min(1, age * 7) * (age > 0.82 ? (1 - age) / 0.18 : 1);
      if (pop <= 0.02) continue;
      const kind = n % 2, side = 0.3 + 0.35 * age + 0.05 * Math.sin(age * 9 + n);
      out.fx.push({ key: `note${kind}`, cw: 220, ch: 260, draw: (p) => fxNote(p, kind), x: COOK[0] + cam.right.x * side, y: 1.55 + 0.7 * age, z: COOK[2] + cam.right.z * side - 0.1,
        w: 0.2 * pop, h: 0.23 * pop, rot: 0.3 * Math.sin(age * 6 + n) });
    }
  }
  // steam off the pan and the kettle
  for (const [sx, sy, sz, ph] of [[PAN_AT[0] - 0.1, 1.12, PAN_AT[2] - 0.1, 0], [0.55, 1.15, -2.7, 0.5]] as const) {
    if (sx === PAN_AT[0] - 0.1 && ((t >= T_TOSS && t < 17.5) || t >= T2_TOSS)) continue;
    for (let n = 0; n < 3; n++) {
      const u = ((t * 0.6 + n / 3 + ph) % 1);
      out.fx.push({ key: `puff${q(u, 8)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, q(u, 8)), x: sx, y: sy + 0.45 * u, z: sz, w: 0.42 * (0.6 + u), h: 0.42 * (0.6 + u), soft: true });
    }
  }
  // the pancake
  if (t >= T_TOSS && t < T_STICK) {
    const c = cakeFlight(t), ry = Math.round(c.ry / 5) * 5;
    out.fx.push({ key: `cake${ry}`, cw: 220, ch: 220, draw: (p) => fxCake(p, ry), x: c.p[0], y: c.p[1], z: c.p[2], w: 0.5, h: 0.5, rot: q(c.roll, 20) });
  }
  if (t >= T_STICK && t < T_FALL) {
    const drip = clamp01((t - T_PEEL) / (T_FALL - T_PEEL)), dq = q(drip, 12);
    const sag = t >= T_PEEL ? 0.012 * smooth(drip) : 0;
    out.fx.push({ key: `stuck${dq}`, cw: 440, ch: 440, draw: (p) => fxCakeStuck(p, dq), x: STICK[0], y: CEIL_Y - 0.01 - sag, z: STICK[2], w: 0.8, h: 0.8, flat: true, rot: 0.4 });
  }
  if (t >= T_FALL && t < T_LAND) {
    const p = cakeFall(t);
    out.fx.push({ key: "cakeF", cw: 220, ch: 220, draw: (g) => fxCake(g, 34, 0.25), x: p[0], y: p[1], z: p[2], w: 0.5, h: 0.5, rot: 0.1 });
  }
  if (t >= T_LAND) {
    const slide = 0.04 * smooth((t - T_LAND - 0.5) / 0.8);
    out.fx.push({ key: "cakeHead", cw: 220, ch: 220, draw: (g) => fxCake(g, 36, 0.35, false), x: HEAD[0] + 0.015, y: HEAD[1] - 0.01 - slide, z: HEAD[2] + 0.12, w: 0.55, h: 0.55, rot: -0.12 });
  }
  // second pancake: over the cook's own head
  if (t >= T2_TOSS && t < T2_STICK) {
    const c = cakeFlight(t, T2_TOSS, T2_STICK, STICK2), ry = Math.round(c.ry / 5) * 5;
    out.fx.push({ key: `cake${ry}`, cw: 220, ch: 220, draw: (p) => fxCake(p, ry), x: c.p[0], y: c.p[1], z: c.p[2], w: 0.5, h: 0.5, rot: q(c.roll, 20) });
  }
  if (t >= T2_STICK && t < T2_FALL) {
    const drip = clamp01((t - T2_PEEL) / (T2_FALL - T2_PEEL)), dq = q(drip, 12);
    const sag = t >= T2_PEEL ? 0.012 * smooth(drip) : 0;
    out.fx.push({ key: `stuck${dq}`, cw: 440, ch: 440, draw: (p) => fxCakeStuck(p, dq), x: STICK2[0], y: CEIL_Y - 0.01 - sag, z: STICK2[2], w: 0.8, h: 0.8, flat: true, rot: -0.3 });
  }
  if (t >= T2_FALL && t < T2_LAND) {
    const p = cakeFall(t, T2_FALL, T2_LAND, STICK2, HEAD2);
    out.fx.push({ key: "cakeF", cw: 220, ch: 220, draw: (g) => fxCake(g, 34, 0.25), x: p[0], y: p[1], z: p[2], w: 0.5, h: 0.5, rot: 0.1 });
  }
  if (t >= T2_LAND) {
    const slide = 0.03 * smooth((t - T2_LAND - 0.5) / 0.8);
    out.fx.push({ key: "cakeHead2", cw: 220, ch: 220, draw: (g) => fxCake(g, 36, 0.35, false), x: HEAD2[0] + 0.01, y: HEAD2[1] - slide, z: HEAD2[2] + 0.12, w: 0.6, h: 0.6, rot: 0.1 });
  }
  if (t >= T2_STICK && t < T2_STICK + 0.4) {
    const u = q((t - T2_STICK) / 0.4, 30);
    out.fx.push({ key: `burst${u}#fff3b0`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#fff3b0"), x: STICK2[0], y: CEIL_Y - 0.3, z: STICK2[2], w: 1.1, h: 1.1 });
  }
  if (t >= T2_LAND && t < T2_LAND + 0.4) {
    const u = q((t - T2_LAND) / 0.4, 30);
    out.fx.push({ key: `burst${u}#fff3b0`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#fff3b0"), x: HEAD2[0], y: HEAD2[1] + 0.25, z: HEAD2[2] + 0.2, w: 0.9, h: 0.9 });
  }
  if (t >= T2_LAND + 0.15 && t < T2_LAND + 1.2) {
    const u = ((t - T2_LAND) * 0.9) % 1;
    out.fx.push({ key: `stars${q(u, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(u, 30)), x: HEAD2[0], y: HEAD2[1] + 0.5, z: HEAD2[2], w: 0.75, h: 0.375 });
  }
  // bursts: stick on the ceiling, plop on the head
  for (const [t0, at, w, col] of [[T_STICK, [STICK[0], CEIL_Y - 0.3, STICK[2]] as V3, 1.1, "#fff3b0"], [T_LAND, [HEAD[0], HEAD[1] + 0.2, HEAD[2] + 0.2] as V3, 0.9, "#fff3b0"]] as const) {
    if (t >= t0 && t < t0 + 0.4) {
      const u = q((t - t0) / 0.4, 30);
      out.fx.push({ key: `burst${u}${col}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, col), x: at[0], y: at[1], z: at[2], w, h: w });
    }
  }
  if (t >= T_LAND + 0.15 && t < T_LAND + 1.2) {
    const u = ((t - T_LAND) * 0.9) % 1;
    out.fx.push({ key: `stars${q(u, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(u, 30)), x: HEAD[0], y: HEAD[1] + 0.42, z: HEAD[2], w: 0.75, h: 0.375 });
  }
  return out;
};
