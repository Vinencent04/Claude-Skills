// "The Defenestration of Prague" (1618): HOLDS (stay on the action) joined by quick eased TRAVELS through ONE world; voice: ElevenLabs James (excited), timed to fall-voice/words.json.
export const FPS = 30;
export const TOTAL = 2340;
export type V3 = [number, number, number];
export type SetName = "w";
export const ORG: Record<SetName, V3> = { w: [0, 0, 0] };
export type LightName = "day" | "gold" | "grey" | "night" | "dawn";
export const D0 = 0;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const F = (s: number) => Math.round(s * FPS);
export const toW = (_set: SetName, p: V3): V3 => p;

// ---------------- layout (world; x runs east -> west for the story) ----------------
export const BARREL_X = 14, BOH = 40, HALL = -30, WAR = -70;      // powder barrel, Bohemian square, throne hall, war zone
export const PILE: V3 = [0, 0, -6.0];                              // the manure pile under the window
export const WIN: V3 = [0, 13.0, -8.9];                            // where the men stand at the window (sill height 13 m)

// ---------------- events (seconds; words.json) ----------------
export const T_ANGRY = 1.6, T_THREW = 2.6, T_LAUNCH = 4.6, T_FELL = 6.0, T_LAND = 6.4, T_SURV = 7.8, T_MANURE = 9.7, T_STINKY = 11.5, T_FUSE = 12.2, T_BOOM = 13.1,
  T_DEADLIEST = 14.6, T_RELIG = 17.5, T_BOH = 18.2, T_PROT = 19.4, T_KING = 20.7, T_RIGHTS = 22.5, T_MAY = 25.0, T_CROWD = 26.6, T_DEMAND = 29.5,
  T_SHOUT = 30.9, T_GRAB = 33.4, T_HURL = 36.8, T_CATH = 38.8, T_ANGELS = 39.8, T_PROTS = 41.3, T_DUNG = 43.2, T_SECR = 45.4, T_TITLE = 47.4,
  T_HOHEN = 48.4, T_EMP = 51.7, T_ARMIES = 53.9, T_NEIGH = 55.2, T_WAR = 57.3, T_VILL = 59.9, T_FAMINE = 60.9, T_MILL = 62.5, T_THIRD = 65.2,
  T_FLIGHT = 68.3, T_SOFT = 69.8, T_CTA = 71.6, T_PILE = 73.4, T_FOLLOW = 75.6;

// ---------------- camera: HOLDS (stay on the action, slow push-in) joined by quick eased TRAVELS (no cuts) ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Hold = { a: number; tr: number; p0: V3; l0: V3; p1: V3; l1: V3; f0: number; f1?: number; roll?: number };
const Hd = (a: number, tr: number, p0: V3, l0: V3, p1: V3, l1: V3, f0 = 48, f1?: number, roll = 0): Hold => ({ a, tr, p0, l0, p1, l1, f0, f1, roll });
/** a = arrival time (the action starts), tr = seconds of travel BEFORE a (fast, eased), drift runs until the next travel starts */
export const HOLDS: Hold[] = [
  Hd(0, 0, [0, 6, 22], [0, 9, -9], [0, 7, 20], [0, 9, -9], 56),
  Hd(1.5, 0.5, [0, 2, 8], [0, 1.8, -1], [0, 2, 7.2], [0, 1.8, -1], 48),
  Hd(2.6, 0.5, [0, 14, 5], [0, 14.3, -9], [0, 14, 4.4], [0, 14.3, -9], 46),
  Hd(4.6, 0.35, [0, 10, 12], [0, 8, -8], [0, 8.6, 12], [0, 6.5, -8], 56),
  Hd(6.2, 0.4, [0, 2.2, 5.5], [0, 0.8, -6], [0, 2, 5], [0, 0.9, -6], 46),
  Hd(7.6, 0.4, [0.5, 1.9, 4.5], [0, 1.5, -6], [0.3, 1.8, 4], [0, 1.5, -6], 44),
  Hd(9.6, 0.5, [-3, 3.4, 9], [0, 1, -6], [-2, 3, 8], [0, 1, -6], 50),
  Hd(11.1, 0.4, [2.5, 1.5, -1], [3, 0.5, -4.5], [3.2, 1.4, -1], [5, 0.5, -3], 44),
  Hd(12.1, 0.5, [8, 2.4, 5], [10, 0.6, 0], [11, 2.2, 5], [13, 0.6, 0], 50),
  Hd(13.1, 0.3, [14, 2.4, 9], [14, 1.4, 0], [14, 2.6, 10], [14, 1.6, 0], 46),
  Hd(14.6, 0.4, [14, 5, 12], [14, 5, 0], [14, 5, 10.5], [14, 5, 0], 50),
  Hd(16.6, 1, [40, 3.2, 11], [40, 1.6, 0], [40, 3, 10], [40, 1.6, 0], 50),
  Hd(18.2, 0.4, [37, 2, 8.2], [37.4, 1.6, -0.4], [37, 1.9, 7.6], [37.4, 1.6, -0.4], 46),
  Hd(20.1, 0.4, [43.5, 2.2, 8.6], [43, 1.8, 0], [43.2, 2.1, 8], [43, 1.8, 0], 46),
  Hd(22.5, 0.4, [41, 2, 7.2], [41.4, 1.5, 0], [41, 1.9, 6.6], [41.4, 1.5, 0], 46),
  Hd(24.6, 0.3, [40, 3, 9], [40, 2, 0], [40, 2.8, 8.4], [40, 2, 0], 50),
  Hd(26.5, 0.3, [38, 2.2, 7], [36.5, 1.6, 0], [10, 2.4, 7], [8, 1.6, 0], 50),
  Hd(29.4, 0.3, [0, 3.4, 12], [0, 6, -9], [0, 3.2, 10.5], [0, 6, -9], 54),
  Hd(30.9, 0.5, [0, 2, 7], [0, 2, -3], [0, 2, 6.2], [0, 2, -3], 46),
  Hd(33.1, 0.6, [0, 14, 5.5], [0, 14.3, -9], [0, 14, 4.8], [0, 14.3, -9], 46),
  Hd(36.7, 0.3, [0, 10, 12], [0, 8, -8], [0, 8.2, 12], [0, 6, -8], 56),
  Hd(38.1, 0.35, [0, 2.2, 5.5], [0, 0.8, -6], [0, 2.1, 5.2], [0, 0.9, -6], 46),
  Hd(38.7, 0.3, [0.5, 2.6, 7.5], [0, 2.2, -6], [0.3, 2.5, 7], [0, 2.2, -6], 50),
  Hd(41.2, 0.3, [-2.5, 1.9, 5], [0, 1, -6], [-2, 1.8, 4.6], [0, 1, -6], 46),
  Hd(44.5, 0.8, [-30, 3, 11], [-30, 1.6, 0], [-30, 2.8, 10], [-30, 1.6, 0], 50),
  Hd(46.1, 0.4, [-31.5, 1.9, 5.8], [-30.8, 1.5, 0], [-31.2, 1.8, 5.3], [-30.8, 1.5, 0], 44),
  Hd(48.3, 0.4, [-30, 2.8, 6], [-30, 2.8, 0], [-30, 2.7, 5.5], [-30, 2.8, 0], 46),
  Hd(51.7, 0.5, [-30.5, 1.9, 5], [-30.3, 1.6, 0], [-30.3, 1.8, 4.6], [-30.3, 1.6, 0], 44),
  Hd(53.8, 1, [-68, 3, 9], [-68, 1.8, 0], [-68, 2.8, 8.4], [-68, 1.8, 0], 52),
  Hd(55.1, 0.4, [-72, 4, 12], [-72, 1.8, 0], [-72, 3.8, 11], [-72, 1.8, 0], 56),
  Hd(57.3, 0.4, [-70, 4.4, 10], [-70, 4.4, 0], [-70, 4.4, 9], [-70, 4.4, 0], 50),
  Hd(59.8, 0.4, [-76, 3, 12], [-76, 3, -6], [-76, 3, 11], [-76, 3, -6], 54),
  Hd(60.9, 0.3, [-66, 2.2, 6], [-66, 1.6, 0], [-66, 2.1, 5.5], [-66, 1.6, 0], 46),
  Hd(62.5, 0.3, [-72, 4, 12], [-72, 1.5, 0], [-72, 3.8, 11], [-72, 1.5, 0], 54),
  Hd(63.7, 0.3, [-70, 4.5, 9], [-70, 4, 0], [-70, 4.4, 8.5], [-70, 4, 0], 50),
  Hd(67.1, 1.2, [0, 13.8, 6], [0, 14.2, -9], [0, 13.8, 5.6], [0, 14.2, -9], 46),
  Hd(68.3, 0.3, [0, 10, 13], [0, 8, -8], [0, 8.4, 13], [0, 6.5, -8], 56),
  Hd(69.7, 0.3, [0, 2.2, 5.5], [0, 0.8, -6], [0, 2, 5], [0, 0.9, -6], 46),
  Hd(71.6, 0.5, [-2, 2.4, 8], [0, 1.3, -6], [-0.6, 2, 6], [0, 1.4, -6], 48),
  Hd(74.9, 0.6, [0, 3.6, 14], [0, 2, -5], [0, 5, 18], [0, 2.5, -5], 54),
];
const END_T = 78;
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const ST = HOLDS.map((h) => h.a - h.tr);
export const camAt = (f: number): Cam => {
  const t = Math.min(f / FPS, END_T);
  let j = 0; while (j < HOLDS.length - 1 && t >= ST[j + 1]) j++;
  const h = HOLDS[j];
  const fovAt = (hh: Hold, u: number) => hh.f0 + ((hh.f1 ?? hh.f0) - hh.f0) * u;
  let p: V3, l: V3, fov: number;
  if (t < h.a && j > 0) {                                  // quick eased travel from the previous hold's end to this hold's start
    const pv = HOLDS[j - 1], u = glide((t - ST[j]) / h.tr);
    p = lerp3(pv.p1, h.p0, u); l = lerp3(pv.l1, h.l0, u); fov = (pv.f1 ?? pv.f0) + (h.f0 - (pv.f1 ?? pv.f0)) * u;
  } else {                                                  // hold: slow push-in while the action plays
    const endT = j < HOLDS.length - 1 ? ST[j + 1] : END_T, d = clamp01((t - h.a) / Math.max(0.01, endT - h.a));
    p = lerp3(h.p0, h.p1, d); l = lerp3(h.l0, h.l1, d); fov = fovAt(h, d);
  }
  const sx = 0.02 * Math.sin(t * 1.7) + 0.01 * Math.sin(t * 4.3), sy = 0.018 * Math.sin(t * 1.3 + 1);
  return { pos: [p[0] + sx, p[1] + sy, p[2]], look: [l[0] - sx * 0.5, l[1] - sy * 0.5, l[2]], fov, roll: 0.01 * Math.sin(t * 0.9) };
};
export const dofAt = (_f: number) => ({ cInf: 5, focus: undefined as V3 | undefined, k: 1, prev: 5 });

// ---------------- light schedule (smooth blends, no pops) ----------------
export const LIGHT_KEYS: { t: number; n: LightName }[] = [
  { t: 0, n: "day" }, { t: 50.5, n: "day" }, { t: 53.0, n: "dawn" }, { t: 66.0, n: "dawn" }, { t: 68.0, n: "gold" }, { t: 100, n: "gold" },
];
export const lightAt = (t: number): { a: LightName; b: LightName; k: number } => {
  for (let i = 0; i < LIGHT_KEYS.length - 1; i++) {
    const A = LIGHT_KEYS[i], B = LIGHT_KEYS[i + 1];
    if (t >= A.t && t < B.t) return { a: A.n, b: B.n, k: smooth((t - A.t) / (B.t - A.t)) };
  }
  return { a: "gold", b: "gold", k: 0 };
};
export const nightness = (_t: number) => 0;
export const lightOverride = (_f: number, _id: number, _a: number): LightName | null => null;
export const SHOTS = [{ id: 1, set: "w" as SetName, light: "day" as LightName, a: 0, b: TOTAL, cInf: 5 }];
export const shotAt = (_f: number) => SHOTS[0];
