// "The War of Jenkins' Ear" (1731/1739): HOLDS (stay on the action) joined by quick eased TRAVELS through ONE world; voice: ElevenLabs James (excited), timed to fall-voice/words.json.
export const FPS = 30;
export const TOTAL = 2620;
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
export const T_SLICE = 2.9, T_EAR = 3.3, T_WARC = 6.7,
  T_CAPT = 7.3, T_CUBA = 10.5, T_SEARCH = 11.6, T_NOTHING = 14.0,
  T_ANGRY = 14.8, T_DRAW = 16.4, T_CUT = 17.9, T_SNEER = 19.2, T_GOTELL = 20.3, T_NEXT = 21.6,
  T_KEEP = 24.9, T_JAR = 25.6, T_HOME = 26.3, T_LONDON = 27.0,
  T_1738 = 28.8, T_WALK = 30.2, T_HOLD = 31.6, T_GASP = 33.0, T_SCREAM = 34.3,
  T_WALP = 37.4, T_NOWAR = 39.6, T_LOUD = 41.0, T_1739 = 43.0, T_DECL = 44.6,
  T_NAMED = 47.0, T_WOJ = 49.0,
  T_VERN = 50.9, T_1741 = 52.9, T_CART = 54.5, T_200 = 56.4,
  T_BLAS = 58.8, T_EYE = 61.7, T_ARM = 62.5, T_LEG = 63.2,
  T_FEW = 64.1, T_CRUSH = 66.7,
  T_DIED = 69.4, T_DIS = 72.0,
  T_DRAG = 73.0, T_1748 = 77.2, T_BECAUSE = 78.7, T_EAR2 = 80.2,
  T_CTA = 81.1, T_FOLLOW = 85.0;

// ---------------- camera: HOLDS (stay on the action, slow push-in) joined by quick eased TRAVELS (no cuts) ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Hold = { a: number; tr: number; p0: V3; l0: V3; p1: V3; l1: V3; f0: number; f1?: number; roll?: number };
const Hd = (a: number, tr: number, p0: V3, l0: V3, p1: V3, l1: V3, f0 = 48, f1?: number, roll = 0): Hold => ({ a, tr, p0, l0, p1, l1, f0, f1, roll });
/** a = arrival time (the action starts), tr = seconds of travel BEFORE a (fast, eased), drift runs until the next travel starts */
export const HOLDS: Hold[] = [
  Hd(0, 0, [6, 3.3, 13], [0, 2.4, -1], [4.4, 3, 11], [0, 2.4, -1], 54),
  Hd(2.3, 0.5, [0.2, 2.7, 6.6], [0, 2.5, 0], [0.1, 2.7, 6.0], [0, 2.5, 0], 46),
  Hd(3.5, 0.4, [0.5, 3.9, 8], [0.4, 4.2, 0], [0.4, 4.3, 8], [0.4, 4.6, 0], 50),
  Hd(5.0, 0.5, [-0.5, 2.9, 7.8], [-0.2, 2.7, 0], [-0.3, 2.8, 7.2], [-0.2, 2.7, 0], 48),
  Hd(7.2, 0.5, [-1.2, 2.8, 8.2], [-1.1, 2.5, 0], [-1.1, 2.7, 7.6], [-1.1, 2.5, 0], 48),
  Hd(9.7, 0.6, [5.5, 4.3, 15], [1, 2, -2], [4.5, 3.9, 14], [1, 2, -2], 52),
  Hd(11.5, 0.4, [1.8, 2.8, 8.2], [1.8, 2.1, 0], [1.8, 2.7, 7.6], [1.8, 2.1, 0], 48),
  Hd(14.6, 0.4, [0.9, 2.7, 6.6], [0.9, 2.5, 0], [0.9, 2.7, 6.0], [0.9, 2.5, 0], 46),
  Hd(16.3, 0.4, [0, 2.7, 9], [0, 2.5, 0], [0, 2.7, 8.4], [0, 2.5, 0], 48),
  Hd(17.8, 0.3, [-1.4, 2.1, 6.6], [0, 2.6, 0], [-1.0, 2.2, 6.2], [0, 2.6, 0], 46, 46, 0.03),
  Hd(19.1, 0.5, [1.4, 2.8, 7.8], [1.1, 2.5, 0], [1.3, 2.8, 7.2], [1.1, 2.5, 0], 48),
  Hd(22.7, 0.4, [-1.0, 2.7, 6.8], [-1.0, 2.4, 0], [-1.0, 2.7, 6.2], [-1.0, 2.4, 0], 46),
  Hd(24.8, 0.4, [-0.7, 3, 5.2], [-0.7, 2.7, 0], [-0.7, 2.9, 4.7], [-0.7, 2.7, 0], 44),
  Hd(26.2, 0.7, [-38, 2.8, 9], [-38, 2.1, 0], [-39, 2.8, 8.4], [-39, 2.1, 0], 50),
  Hd(28.6, 0.9, [-80, 4.6, 13], [-80, 2.6, -3], [-80, 4.2, 12], [-80, 2.6, -3], 52),
  Hd(30.7, 0.5, [-80, 2.7, 8], [-80, 2.7, 0], [-80, 2.7, 7.4], [-80, 2.7, 0], 48),
  Hd(32.8, 0.4, [-80, 2.6, 10.5], [-80, 2.5, 0], [-80, 2.6, 10], [-80, 2.5, 0], 50),
  Hd(34.2, 0.9, [-40, 3.2, 11], [-40, 2.3, 0], [-40, 3.0, 10], [-40, 2.3, 0], 52),
  Hd(37.2, 0.9, [-80.8, 2.5, 6.4], [-80.5, 2.3, 0], [-80.6, 2.5, 5.8], [-80.5, 2.3, 0], 46),
  Hd(39.4, 0.3, [-80, 2.4, 7.4], [-80, 2.3, 0], [-80, 2.4, 6.8], [-80, 2.3, 0], 46),
  Hd(40.8, 0.8, [-40, 3.0, 10.5], [-40, 2.3, 0], [-40, 2.9, 9.5], [-40, 2.3, 0], 52),
  Hd(42.9, 0.8, [-80, 3.2, 10], [-80, 2.7, 0], [-80, 3.0, 9], [-80, 2.7, 0], 50),
  Hd(46.6, 0.4, [-80, 3.6, 10], [-80, 3.2, 0], [-80, 3.4, 8.8], [-80, 3.2, 0], 48),
  Hd(50.7, 1.0, [-110, 3.4, 11], [-110, 2.2, 0], [-110, 3.2, 10], [-110, 2.2, 0], 50),
  Hd(52.8, 0.5, [-124, 5.0, 19], [-124, 2.0, -8], [-124, 4.8, 18], [-124, 2.0, -8], 54),
  Hd(56.2, 0.4, [-124, 4.4, 17], [-124, 2.4, -8], [-124, 4.4, 16], [-124, 2.4, -8], 52),
  Hd(58.3, 0.7, [-139, 4.4, 1.2], [-139, 4.2, -8], [-139, 4.4, 0.6], [-139, 4.2, -8], 50),
  Hd(61.2, 0.3, [-139, 4.6, 3.8], [-139, 4.0, -8], [-139, 4.5, 3.2], [-139, 4.0, -8], 52),
  Hd(63.9, 0.5, [-138, 5.0, 8], [-138, 3.8, -8], [-138, 4.8, 7], [-138, 3.8, -8], 54),
  Hd(66.5, 0.5, [-126, 4.2, 15], [-126, 2.0, -8], [-126, 4.0, 14], [-126, 2.0, -8], 54),
  Hd(69.2, 0.8, [-112, 2.5, 8], [-112, 1.9, 0], [-112, 2.4, 7.4], [-112, 1.9, 0], 48),
  Hd(72.8, 0.8, [-116, 4.8, 12.5], [-116, 4.6, 0], [-116, 4.7, 12], [-116, 4.6, 0], 50),
  Hd(78.5, 0.8, [-0.9, 2.8, 6.6], [-0.9, 2.7, 0], [-0.9, 2.8, 6.0], [-0.9, 2.7, 0], 48),
  Hd(81.0, 0.6, [0, 4.6, 12], [0, 3.6, 0], [0, 5.2, 17], [0, 4, 0], 52),
];
const END_T = 87.3;
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
  { t: 0, n: "day" }, { t: 49.5, n: "day" }, { t: 52.5, n: "dawn" }, { t: 70.0, n: "dawn" }, { t: 78.0, n: "gold" }, { t: 100, n: "gold" },
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
