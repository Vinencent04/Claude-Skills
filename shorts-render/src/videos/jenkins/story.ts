// "The War of Jenkins' Ear" (1731/1739): HOLDS (stay on the action) joined by quick eased TRAVELS through ONE world; voice: ElevenLabs James (excited), timed to fall-voice/words.json.
export const FPS = 30;
export const TOTAL = 2812;
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
export const SX = 0, LX = -40, PX = -80, WX = -120;               // ship deck, London street, Parliament hall, Cartagena bay
export const DY = 0.8;                                             // deck height
export const FORT_X = -139;                                        // Blas de Lezo's fort wall (front face z=-8, top y=3.2)

// ---------------- events (seconds; jenkins-voice/stt.json) ----------------
export const T_SLICE = 3.8, T_WARC = 6.5,
  T_CAPT = 7.5, T_CUBA = 11.3, T_SEARCH = 13.2, T_SMUG = 13.7,
  T_SAID = 14.5, T_TIED = 15.3, T_DRAW = 16.2, T_CUT = 17.0, T_TOLD = 18.9, T_GOTELL = 20.4, T_SAME = 21.5,
  T_LEGEND = 22.9, T_KEEP = 23.8, T_JAR = 25.2, T_HOME = 26.2, T_ENG = 26.9,
  T_1738 = 27.8, T_QUEST = 29.4, T_LEG2 = 30.7, T_HOLD = 32.0, T_DOUBT = 33.4,
  T_PRESS = 35.0, T_REV = 36.9, T_WALP = 38.4, T_NOWAR = 40.4, T_1739 = 42.0, T_DECL = 43.3,
  T_1858 = 47.5, T_CARL = 48.8, T_NAMED = 50.4,
  T_1741 = 52.4, T_VERN = 53.8, T_CART = 55.9, T_180 = 57.4,
  T_BLAS = 59.8, T_SIX = 61.2, T_3000 = 62.5, T_EYE = 65.2, T_ARM = 66.0, T_LEG = 67.0, T_WON = 68.0, T_DIED = 69.5, T_DIS = 72.0,
  T_MED = 74.3, T_BEFORE = 76.8, T_MERGE = 78.4, T_1748 = 81.5, T_EXC = 84.0, T_TRADE = 86.1,
  T_CTA = 88.1, T_FOLLOW = 91.4;

// ---------------- camera: HOLDS (stay on the action, slow push-in) joined by quick eased TRAVELS (no cuts) ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Hold = { a: number; tr: number; p0: V3; l0: V3; p1: V3; l1: V3; f0: number; f1?: number; roll?: number };
const Hd = (a: number, tr: number, p0: V3, l0: V3, p1: V3, l1: V3, f0 = 48, f1?: number, roll = 0): Hold => ({ a, tr, p0, l0, p1, l1, f0, f1, roll });
/** a = arrival time (the action starts), tr = seconds of travel BEFORE a (fast, eased), drift runs until the next travel starts */
export const HOLDS: Hold[] = [
  Hd(0, 0, [6, 3.3, 13], [0, 2.4, -1], [4.4, 3, 11], [0, 2.4, -1], 54),
  Hd(3.3, 0.5, [0.2, 2.7, 6.6], [0, 2.5, 0], [0.1, 2.7, 6.0], [0, 2.5, 0], 46),
  Hd(4.6, 0.4, [0.5, 3.1, 8], [0.4, 3.4, 0], [0.4, 3.4, 8], [0.4, 3.8, 0], 50),
  Hd(5.8, 0.5, [-0.5, 2.1, 7.8], [-0.2, 2.0, 0], [-0.3, 2.1, 7.2], [-0.2, 2.0, 0], 48),
  Hd(7.4, 0.5, [-1.2, 2.3, 8.2], [-1.1, 2.0, 0], [-1.1, 2.2, 7.6], [-1.1, 2.0, 0], 48),
  Hd(11.3, 0.6, [5.5, 3.4, 15], [1, 1.2, -2], [4.5, 3.0, 14], [1, 1.2, -2], 52),
  Hd(13.1, 0.4, [1.8, 2.0, 8.2], [1.8, 1.4, 0], [1.8, 1.9, 7.6], [1.8, 1.4, 0], 48),
  Hd(14.5, 0.4, [0, 2.2, 8.8], [0, 2.0, 0], [0, 2.2, 8.2], [0, 2.0, 0], 48),
  Hd(16.2, 0.3, [-1.4, 1.3, 6.6], [0, 1.9, 0], [-1.0, 1.4, 6.2], [0, 1.9, 0], 46, 46, 0.03),
  Hd(18.8, 0.5, [1.4, 2.0, 7.8], [1.1, 1.8, 0], [1.3, 2.0, 7.2], [1.1, 1.8, 0], 48),
  Hd(22.8, 0.4, [-1.0, 2.0, 6.8], [-1.0, 1.7, 0], [-1.0, 2.0, 6.2], [-1.0, 1.7, 0], 46),
  Hd(24.9, 0.4, [-0.7, 2.2, 5.2], [-0.7, 2.0, 0], [-0.7, 2.1, 4.7], [-0.7, 2.0, 0], 44),
  Hd(26.0, 0.6, [-38, 2.8, 9], [-38, 2.1, 0], [-39, 2.8, 8.4], [-39, 2.1, 0], 50),
  Hd(27.6, 0.8, [-80, 4.6, 13], [-80, 2.6, -3], [-80, 4.2, 12], [-80, 2.6, -3], 52),
  Hd(29.2, 0.5, [-80, 2.7, 8], [-80, 2.7, 0], [-80, 2.7, 7.4], [-80, 2.7, 0], 48),
  Hd(32.7, 0.4, [-80, 2.6, 10.5], [-80, 2.5, 0], [-80, 2.6, 10], [-80, 2.5, 0], 50),
  Hd(35.0, 0.8, [-40, 3.2, 11], [-40, 2.3, 0], [-40, 3.0, 10], [-40, 2.3, 0], 52),
  Hd(38.4, 0.8, [-80.8, 2.5, 6.4], [-80.5, 2.3, 0], [-80.6, 2.5, 5.8], [-80.5, 2.3, 0], 46),
  Hd(40.5, 0.3, [-80, 2.4, 7.4], [-80, 2.3, 0], [-80, 2.4, 6.8], [-80, 2.3, 0], 46),
  Hd(41.9, 0.6, [-80, 3.2, 10], [-80, 2.7, 0], [-80, 3.0, 9], [-80, 2.7, 0], 50),
  Hd(45.9, 0.9, [-40, 3.0, 9.4], [-40, 2.1, 0], [-40, 3.0, 8.6], [-40, 2.1, 0], 48),
  Hd(50.2, 0.5, [-40, 3.4, 10], [-40, 3.2, 0], [-40, 3.2, 8.8], [-40, 3.2, 0], 48),
  Hd(52.2, 1.0, [-110, 3.4, 11], [-110, 2.2, 0], [-110, 3.2, 10], [-110, 2.2, 0], 50),
  Hd(54.0, 0.5, [-124, 5.0, 19], [-124, 2.0, -8], [-124, 4.8, 18], [-124, 2.0, -8], 54),
  Hd(57.0, 0.4, [-124, 4.4, 17], [-124, 2.4, -8], [-124, 4.4, 16], [-124, 2.4, -8], 52),
  Hd(58.7, 0.7, [-139, 4.4, 1.2], [-139, 4.2, -8], [-139, 4.4, 0.6], [-139, 4.2, -8], 50),
  Hd(60.9, 0.4, [-133, 4.2, 14], [-133, 2.4, -6], [-133, 4.0, 13], [-133, 2.4, -6], 52),
  Hd(64.9, 0.4, [-139, 4.6, 3.8], [-139, 4.0, -8], [-139, 4.5, 3.2], [-139, 4.0, -8], 52),
  Hd(67.8, 0.5, [-126, 4.2, 15], [-126, 2.0, -8], [-126, 4.0, 14], [-126, 2.0, -8], 54),
  Hd(69.4, 0.8, [-112, 2.5, 8], [-112, 1.9, 0], [-112, 2.4, 7.4], [-112, 1.9, 0], 48),
  Hd(73.2, 0.8, [-110.5, 2.6, 8.6], [-110.5, 2.2, 0], [-110.5, 2.5, 8.0], [-110.5, 2.2, 0], 48),
  Hd(78.3, 0.8, [-116, 4.8, 12.5], [-116, 4.6, 0], [-116, 4.7, 12], [-116, 4.6, 0], 50),
  Hd(83.0, 0.9, [-0.9, 2.8, 8.2], [-0.9, 2.4, 0], [-0.9, 2.7, 7.6], [-0.9, 2.4, 0], 48),
  Hd(85.9, 0.4, [0, 2.9, 10.5], [0, 2.2, 0], [0, 3.1, 11.5], [0, 2.4, 0], 50),
  Hd(88.0, 0.6, [0, 4.6, 12], [0, 3.6, 0], [0, 5.2, 17], [0, 4, 0], 52),
];
const END_T = 93.7;
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
  { t: 0, n: "day" }, { t: 51.5, n: "day" }, { t: 54.5, n: "dawn" }, { t: 73.0, n: "dawn" }, { t: 82.0, n: "gold" }, { t: 100, n: "gold" },
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
