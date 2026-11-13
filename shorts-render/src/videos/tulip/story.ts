// "Tulip mania" (1637): HOLDS (stay on the action) joined by quick eased TRAVELS through ONE world; voice: ElevenLabs James (excited), timed to fall-voice/words.json.
export const FPS = 30;
export const TOTAL = 2560;
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

// ---------------- layout (sets along -x; the camera flies between them) ----------------
export const AX = 0, BX = -40, DX = -120, EX = -160, FX = -200, GX = -240;   // Dutch street, Ottoman garden, tavern, Haarlem auction, town hall, library

// ---------------- events (seconds; tulip-voice/stt.json) ----------------
export const T_Y = 0.3, T_BULB = 2.0, T_HOUSE = 3.9, T_MYTH = 5.7, T_WRONG = 7.2,
  T_OTT = 8.4, T_NETH = 10.4, T_1590 = 11.4, T_CRAZY = 12.9,
  T_FLAME = 16.4, T_WHY = 18.6, T_VIRUS = 20.4,
  T_SEMPER = 23.4, T_SAID = 25.0, T_BULB2 = 27.2,
  T_UNDER = 29.4, T_PAPER = 31.6, T_TAV = 33.0,
  T_EARLY = 34.2, T_UP = 35.9, T_HANDS = 37.4,
  T_FEB = 40.5, T_AUC = 41.7, T_NOBODY = 43.0, T_CRASH = 44.5,
  T_LEG = 46.4, T_RUINED = 48.0, T_HIST = 51.0, T_NOPROOF = 52.6,
  T_LEG2 = 54.2, T_SAILOR = 55.5, T_ANEC = 58.1, T_TRUE = 60.2,
  T_TOWN = 62.0, T_CANCEL = 63.0, T_FRAC = 64.4, T_35 = 66.4,
  T_SMALL = 68.0, T_BOOK = 71.3, T_1841 = 74.8, T_TODAY = 76.3,
  T_CTA = 79.0, T_FOLLOW = 83.2;

// ---------------- camera: HOLDS (stay on the action, slow push-in) joined by quick eased TRAVELS (no cuts) ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Hold = { a: number; tr: number; p0: V3; l0: V3; p1: V3; l1: V3; f0: number; f1?: number; roll?: number };
const Hd = (a: number, tr: number, p0: V3, l0: V3, p1: V3, l1: V3, f0 = 48, f1?: number, roll = 0): Hold => ({ a, tr, p0, l0, p1, l1, f0, f1, roll });
/** a = arrival time (the action starts), tr = seconds of travel BEFORE a (fast, eased), drift runs until the next travel starts */
const RAW_HOLDS: Hold[] = [
  Hd(0, 0, [0, 3.6, 9], [0, 2.2, 0], [0, 3.4, 8.4], [0, 2.2, 0], 52),
  Hd(8.0, 0.8, [-40, 3.6, 9], [-40, 2.2, 0], [-40, 3.4, 8.4], [-40, 2.2, 0], 50),
  Hd(15.2, 0.5, [-40, 3.6, 8.4], [-40, 2.4, 0], [-40, 3.4, 7.8], [-40, 2.4, 0], 48),
  Hd(22.1, 0.5, [-40, 3.6, 8.6], [-40, 2.4, 0], [-40, 3.4, 8.0], [-40, 2.4, 0], 48),
  Hd(28.3, 0.9, [-120, 3.6, 9.5], [-120, 2.2, 0], [-120, 3.4, 8.8], [-120, 2.2, 0], 50),
  Hd(34.0, 0.4, [-120, 3.6, 9.5], [-120, 2.4, 0], [-120, 3.4, 8.8], [-120, 2.4, 0], 50),
  Hd(40.1, 0.9, [-160, 3.6, 10], [-160, 2.4, 0], [-160, 3.4, 9.4], [-160, 2.4, 0], 50),
  Hd(46.0, 0.8, [0, 3.6, 9.5], [0, 2.2, 0], [0, 3.4, 8.8], [0, 2.2, 0], 50),
  Hd(50.9, 0.8, [-240, 3.6, 9], [-240, 2.4, 0], [-240, 3.4, 8.4], [-240, 2.4, 0], 50),
  Hd(53.9, 0.8, [-120, 3.6, 9.5], [-120, 2.2, 0], [-120, 3.4, 8.8], [-120, 2.2, 0], 50),
  Hd(61.2, 0.8, [-200, 3.6, 9.5], [-200, 2.4, 0], [-200, 3.4, 8.8], [-200, 2.4, 0], 50),
  Hd(67.6, 0.8, [0, 3.6, 9.5], [0, 2.4, 0], [0, 3.4, 8.8], [0, 2.4, 0], 50),
  Hd(71.0, 0.7, [-240, 3.6, 9], [-240, 2.4, 0], [-240, 3.4, 8.4], [-240, 2.4, 0], 50),
  Hd(76.1, 0.7, [0, 3.8, 10], [0, 2.4, 0], [0, 3.8, 11], [0, 2.4, 0], 52),
  Hd(78.9, 0.5, [0, 3.8, 9], [0, 2.4, 0], [0, 4.4, 11], [0, 2.6, 0], 52),
];

/** pull every hold back so the whole scene fits the narrow 9:16 phone screen (close holds more than wide ones) */
const zoomOut = (h: Hold): Hold => {
  const d = Math.hypot(h.p0[0] - h.l0[0], h.p0[2] - h.l0[2]), k = d < 9 ? 1.4 : d < 12 ? 1.3 : 1.18;
  const mv = (p: V3, l: V3): V3 => [l[0] + (p[0] - l[0]) * k, l[1] + (p[1] - l[1]) * k, l[2] + (p[2] - l[2]) * k];
  return { ...h, p0: mv(h.p0, h.l0), p1: mv(h.p1, h.l1) };
};
export const HOLDS: Hold[] = RAW_HOLDS.map(zoomOut);
const END_T = 85.1;
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
  { t: 0, n: "day" }, { t: 77.0, n: "day" }, { t: 79.5, n: "gold" }, { t: 100, n: "gold" },
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
