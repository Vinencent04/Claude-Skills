// "Operation Mincemeat" (1943): HOLDS (stay on the action) joined by quick eased TRAVELS through ONE world; voice: ElevenLabs James (excited), timed to fall-voice/words.json.
export const FPS = 30;
export const TOTAL = 2495;
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
export const OX = 0, BX = -40, SX = -80, HX = -120, GX = -160, LX = -200, CX = -240;   // office, workshop, submarine, Spanish beach, German HQ, Sicily beach, cemetery

// ---------------- events (seconds; mincemeat-voice/stt.json) ----------------
export const T_FAKE = 3.2, T_WASH = 4.4, T_FOOLED = 6.4,
  T_ALLIES = 7.6, T_EXPECT = 9.6, T_TRICK = 11.2, T_ELSE = 13.6,
  T_MONT = 15.6, T_PLAN = 17.5, T_OP = 19.0,
  T_BODY = 20.8, T_WELSH = 22.4, T_POISON = 24.2,
  T_IDENT = 25.8, T_MARINES = 28.2, T_FIANCEE = 30.2, T_LETTERS = 31.2, T_TICKETS = 32.0, T_OVERDR = 33.0,
  T_CASE = 34.7, T_CHAIN = 35.9, T_FAKEL = 37.4, T_GREECE = 40.6, T_SARD = 41.3,
  T_APRIL = 42.2, T_SUB = 43.5, T_SLID = 46.9,
  T_FISH = 49.0, T_PAPERS = 50.5, T_GERM = 52.0,
  T_BELIEVED = 53.2, T_HITLER = 55.0, T_ROMMEL = 56.8, T_GRS = 57.8,
  T_JULY = 60.0, T_LAND = 61.4, T_SURP = 63.2,
  T_BURIED = 65.0, T_SECRET = 67.8, T_1996 = 70.6,
  T_STONE = 72.6, T_CTA = 77.4, T_FOLLOW = 81.0;

// ---------------- camera: HOLDS (stay on the action, slow push-in) joined by quick eased TRAVELS (no cuts) ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Hold = { a: number; tr: number; p0: V3; l0: V3; p1: V3; l1: V3; f0: number; f1?: number; roll?: number };
const Hd = (a: number, tr: number, p0: V3, l0: V3, p1: V3, l1: V3, f0 = 48, f1?: number, roll = 0): Hold => ({ a, tr, p0, l0, p1, l1, f0, f1, roll });
/** a = arrival time (the action starts), tr = seconds of travel BEFORE a (fast, eased), drift runs until the next travel starts */
const RAW_HOLDS: Hold[] = [
  Hd(0, 0, [-118, 3.8, 9.5], [-120, 2.4, 0], [-119, 3.6, 8.6], [-120, 2.4, 0], 52),
  Hd(4.2, 0.5, [-121, 3.2, 7.8], [-120.5, 2, 0], [-121, 3.2, 7.2], [-120.5, 2, 0], 48),
  Hd(6.3, 0.4, [-120, 3.8, 10], [-120, 2.6, 0], [-120, 3.7, 9.4], [-120, 2.6, 0], 50),
  Hd(7.4, 0.8, [0, 4.4, 9.5], [0, 3.2, 0], [0, 4.3, 8.8], [0, 3.2, 0], 50),
  Hd(11.0, 0.4, [0, 4.6, 9.8], [0, 3.4, 0], [0, 4.4, 9.0], [0, 3.4, 0], 50),
  Hd(14.4, 0.4, [0, 4, 7.6], [0, 3.3, 0], [0, 4, 7.0], [0, 3.3, 0], 48),
  Hd(20.3, 0.8, [-40, 4.6, 9], [-40, 3, 0], [-40, 4.5, 8.4], [-40, 3, 0], 50),
  Hd(25.6, 0.4, [-40, 4.7, 9], [-40, 3.2, 0], [-40, 4.6, 8.4], [-40, 3.2, 0], 50),
  Hd(34.5, 0.4, [-40, 4.7, 8.6], [-40, 3.2, 0], [-40, 4.6, 8.0], [-40, 3.2, 0], 48),
  Hd(42.0, 0.9, [-80, 5, 12], [-80, 2.8, 0], [-80, 4.8, 11], [-80, 2.8, 0], 54),
  Hd(46.6, 0.4, [-80, 4.2, 8.2], [-80, 2.4, 0], [-80, 4.1, 7.6], [-80, 2.4, 0], 48),
  Hd(48.7, 0.8, [-120, 3.6, 9], [-120, 2.3, 0], [-120, 3.5, 8.4], [-120, 2.3, 0], 50),
  Hd(53.0, 0.9, [-160, 4.6, 10], [-160, 3.3, 0], [-160, 4.4, 9.2], [-160, 3.3, 0], 50),
  Hd(56.6, 0.4, [-160, 4.6, 9.4], [-160, 3.4, 0], [-160, 4.4, 8.6], [-160, 3.4, 0], 50),
  Hd(59.8, 0.8, [-200, 5.2, 11], [-200, 3, 0], [-200, 5, 10], [-200, 3, 0], 52),
  Hd(63.0, 0.4, [-200, 4.4, 8.4], [-200, 3.2, 0], [-200, 4.3, 7.8], [-200, 3.2, 0], 48),
  Hd(64.8, 0.8, [-240, 4.4, 9], [-240, 3.1, 0], [-240, 4.3, 8.4], [-240, 3.1, 0], 50),
  Hd(72.4, 0.5, [-240, 4, 7.2], [-240, 3.2, 0], [-240, 4, 6.6], [-240, 3.2, 0], 48),
  Hd(77.2, 0.9, [0, 4.4, 9], [0, 3.2, 0], [0, 4.8, 10], [0, 3.4, 0], 52),
];

/** pull every hold back so the whole scene fits the narrow 9:16 phone screen (close holds more than wide ones) */
const zoomOut = (h: Hold): Hold => {
  const d = Math.hypot(h.p0[0] - h.l0[0], h.p0[2] - h.l0[2]), k = d < 9 ? 1.4 : d < 12 ? 1.3 : 1.18;
  const mv = (p: V3, l: V3): V3 => [l[0] + (p[0] - l[0]) * k, l[1] + (p[1] - l[1]) * k, l[2] + (p[2] - l[2]) * k];
  return { ...h, p0: mv(h.p0, h.l0), p1: mv(h.p1, h.l1) };
};
export const HOLDS: Hold[] = RAW_HOLDS.map(zoomOut);
const END_T = 83.1;
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
  { t: 0, n: "dawn" }, { t: 6.8, n: "dawn" }, { t: 8.4, n: "day" }, { t: 41.0, n: "day" }, { t: 42.6, n: "night" }, { t: 48.2, n: "night" }, { t: 49.4, n: "dawn" }, { t: 52.6, n: "dawn" }, { t: 53.6, n: "day" }, { t: 71.5, n: "day" }, { t: 73.5, n: "gold" }, { t: 100, n: "gold" },
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
