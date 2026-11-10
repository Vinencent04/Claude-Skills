// "Pandora's jar" (Hesiod): HOLDS (stay on the action) joined by quick eased TRAVELS through ONE world; voice: ElevenLabs James (excited), timed to fall-voice/words.json.
export const FPS = 30;
export const TOTAL = 2802;
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
export const HX = 0, OX = -40, FX = -80, LX = -120;               // Epimetheus' yard, Olympus, Hephaestus' forge, Erasmus' study

// ---------------- events (seconds; pandora-voice/stt.json) ----------------
export const T_PBOX = 1.0, T_NOBOX = 5.3, T_JAR0 = 6.9,
  T_HESIOD = 8.9, T_700 = 10.4, T_THEFT = 12.4, T_PROM = 14.1, T_FIRE = 15.3, T_HUM = 16.8,
  T_ZEUS = 18.0, T_FURY = 19.0, T_ORD = 21.0, T_PAND = 23.4,
  T_HEPH = 25.2, T_SHAPED = 27.4, T_EARTH = 28.2,
  T_ATH = 29.2, T_APH = 30.7, T_HERM = 32.4, T_NAME = 35.4, T_GIFTS = 36.5,
  T_SENT = 37.5, T_EPI = 38.8, T_WARN = 41.7, T_NEVER = 43.4,
  T_HOUSE = 45.8, T_JAR = 46.8, T_EVILS = 49.4, T_SICK = 52.2, T_WORK = 53.0, T_GRIEF = 53.8,
  T_LIFT = 54.7, T_WHY = 56.9, T_CUR = 58.3,
  T_FLEW = 61.1, T_SPREAD = 62.6, T_SLAM = 64.2, T_HOPE = 65.9,
  T_DEBATE = 68.9, T_COMF = 71.6, T_TRICK = 72.9,
  T_1508 = 77.0, T_SCHOL = 78.1, T_PITH = 80.4, T_LATIN = 82.6,
  T_MIST = 84.4, T_500 = 86.4, T_CTA = 87.5, T_FOLLOW = 91.1;

// ---------------- camera: HOLDS (stay on the action, slow push-in) joined by quick eased TRAVELS (no cuts) ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Hold = { a: number; tr: number; p0: V3; l0: V3; p1: V3; l1: V3; f0: number; f1?: number; roll?: number };
const Hd = (a: number, tr: number, p0: V3, l0: V3, p1: V3, l1: V3, f0 = 48, f1?: number, roll = 0): Hold => ({ a, tr, p0, l0, p1, l1, f0, f1, roll });
/** a = arrival time (the action starts), tr = seconds of travel BEFORE a (fast, eased), drift runs until the next travel starts */
const RAW_HOLDS: Hold[] = [
  Hd(0, 0, [4, 2.6, 10], [0, 1.8, 0], [3, 2.4, 9], [0, 1.8, 0], 52),
  Hd(4.8, 0.5, [0, 2.4, 8], [0, 1.9, 0], [0, 2.4, 7.4], [0, 1.9, 0], 48),
  Hd(6.7, 0.4, [-0.6, 2.2, 6.4], [-0.6, 1.7, 0], [-0.6, 2.2, 5.8], [-0.6, 1.7, 0], 46),
  Hd(8.5, 0.8, [-80, 2.3, 7.6], [-80, 1.8, 0], [-80, 2.3, 7.0], [-80, 1.8, 0], 48),
  Hd(12.1, 0.8, [-40, 3.4, 12], [-40, 1.9, 0], [-40, 3.2, 11], [-40, 1.9, 0], 50),
  Hd(14.0, 0.4, [-39.5, 2.6, 8.4], [-39.5, 1.8, 0], [-39.5, 2.5, 7.8], [-39.5, 1.8, 0], 48),
  Hd(16.6, 0.4, [-42, 3.0, 11], [-42, 1.6, 0], [-42, 2.9, 10], [-42, 1.6, 0], 50),
  Hd(17.9, 0.4, [-40, 2.8, 8.0], [-40, 2.3, -1], [-40, 2.8, 7.4], [-40, 2.3, -1], 48),
  Hd(21.0, 0.5, [-40, 3.2, 11.0], [-40, 2.4, -1], [-40, 3.0, 10.0], [-40, 2.4, -1], 50),
  Hd(24.0, 0.9, [-80, 2.4, 8.8], [-80, 1.8, 0], [-80, 2.4, 8.0], [-80, 1.8, 0], 48),
  Hd(29.0, 0.9, [-40, 2.9, 10.5], [-40, 1.9, 0], [-40, 2.8, 9.8], [-40, 1.9, 0], 50),
  Hd(37.3, 0.8, [0, 2.7, 10], [0, 1.9, 0], [0, 2.6, 9.2], [0, 1.9, 0], 50),
  Hd(41.5, 0.4, [0.5, 2.3, 7], [0.5, 1.9, 0], [0.5, 2.3, 6.4], [0.5, 1.9, 0], 48),
  Hd(45.6, 0.4, [-0.4, 2.4, 8.0], [-0.4, 1.9, 0], [-0.4, 2.4, 7.4], [-0.4, 1.9, 0], 46),
  Hd(54.4, 0.3, [0, 2.4, 8.0], [0, 1.9, 0], [0, 2.4, 7.4], [0, 1.9, 0], 46),
  Hd(60.9, 0.3, [0, 3.4, 9.5], [0, 2.8, 0], [0, 3.4, 9.0], [0, 2.8, 0], 52),
  Hd(63.9, 0.3, [0, 2.4, 8.0], [0, 1.9, 0], [0, 2.4, 7.4], [0, 1.9, 0], 46),
  Hd(68.7, 0.4, [0, 2.4, 8.0], [0, 1.9, 0], [0, 2.4, 7.4], [0, 1.9, 0], 46),
  Hd(73.9, 0.9, [-120, 2.6, 9.2], [-120, 1.8, 0], [-120, 2.5, 8.4], [-120, 1.8, 0], 50),
  Hd(80.2, 0.4, [-120, 2.4, 7.2], [-120, 1.8, 0], [-120, 2.4, 6.6], [-120, 1.8, 0], 48),
  Hd(84.1, 0.5, [-120, 3.0, 10.5], [-120, 2.0, 0], [-120, 3.0, 9.8], [-120, 2.0, 0], 50),
  Hd(87.3, 1.0, [0, 3.4, 11], [0, 2.4, 0], [0, 4.4, 15], [0, 2.8, 0], 52),
];

/** pull every hold back so the whole scene fits the narrow 9:16 phone screen (close holds more than wide ones) */
const zoomOut = (h: Hold): Hold => {
  const d = Math.hypot(h.p0[0] - h.l0[0], h.p0[2] - h.l0[2]), k = d < 9 ? 1.4 : d < 12 ? 1.3 : 1.18;
  const mv = (p: V3, l: V3): V3 => [l[0] + (p[0] - l[0]) * k, l[1] + (p[1] - l[1]) * k, l[2] + (p[2] - l[2]) * k];
  return { ...h, p0: mv(h.p0, h.l0), p1: mv(h.p1, h.l1) };
};
export const HOLDS: Hold[] = RAW_HOLDS.map(zoomOut);
const END_T = 93.4;
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
  { t: 0, n: "day" }, { t: 85.0, n: "day" }, { t: 89.0, n: "gold" }, { t: 100, n: "gold" },
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
