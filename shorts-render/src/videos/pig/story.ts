// "The Pig War" (1859): one continuous camera path (PCHIP spline) through ONE island world, no cuts. Voice: ElevenLabs James (excited), timed to pig-voice/words.json.
export const FPS = 30;
export const TOTAL = 1665;
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

// ---------------- layout (world; x runs west -> east) ----------------
export const KZ = -56, FARM = -30, USC = -8, DIN = 6, BRC = 20;      // Kaiser stage, farm, US camp, dinner table, British camp
export const TOMB: V3 = [-31, 0, 1.2];

// ---------------- events (seconds; words.json) ----------------
export const T_AMERICA = 1.4, T_BRITAIN = 2.0, T_WAR = 3.3, T_PIG = 4.0, T_DIED = 5.4, T_PIGDEAD = 6.4, T_SAN = 7.6, T_CLAIM = 9.8, T_MORNING = 11.2,
  T_FARMER = 12.1, T_FOUND = 14.5, T_EAT = 16.0, T_GUN = 17.2, T_SHOT = 18.3, T_BRITCO = 19.2, T_ARREST = 21.4, T_SOLD = 22.7, T_SHIPS = 24.5,
  T_HUNDREDS = 26.5, T_FACED = 28.1, T_DEADPIG = 30.6, T_ADMIRAL = 31.6, T_REFUSE = 32.7, T_SAID = 34.3, T_YEARS = 37.8, T_PARTY = 40.6, T_1872 = 42.4,
  T_EMP = 44.0, T_GAVE = 45.5, T_ZERO = 47.4, T_CASUALTY = 49.6, T_CTA = 51.4;

// ---------------- camera: HOLDS (stay on the action, slow push-in) joined by quick eased TRAVELS (no cuts) ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Hold = { a: number; tr: number; p0: V3; l0: V3; p1: V3; l1: V3; f0: number; f1?: number; roll?: number };
const Hd = (a: number, tr: number, p0: V3, l0: V3, p1: V3, l1: V3, f0 = 48, f1?: number, roll = 0): Hold => ({ a, tr, p0, l0, p1, l1, f0, f1, roll });
/** a = arrival time (the action starts), tr = seconds of travel BEFORE a (fast, eased), drift runs until the next travel starts */
export const HOLDS: Hold[] = [
  Hd(0.0, 0, [61.8, 1.2, 4.6], [60.7, 1.0, 0], [61.2, 1.15, 3.9], [60.7, 1.0, 0], 44),
  Hd(3.0, 0.6, [60, 3.4, 10.5], [60, 1.6, 0], [60, 2.8, 8.8], [60, 1.5, 0], 56),
  Hd(5.2, 0.5, [60.8, 1.4, 3.6], [60.3, 1.0, 0], [60.5, 1.3, 3.1], [60.3, 0.9, 0], 44),
  Hd(7.0, 1.0, [25, 28, 26], [12, 0, -4], [22, 24, 22], [12, 0, -4], 60),
  Hd(10.8, 0.9, [-34.2, 1.9, 5.5], [-33.4, 1.6, 1.6], [-33.8, 1.8, 4.8], [-33.2, 1.6, 1.6], 46),
  Hd(14.2, 0.5, [-32, 2.2, 9], [-32.2, 1.3, 1.2], [-32, 2.0, 8.2], [-32.2, 1.2, 1.2], 50),
  Hd(16.2, 0.5, [-30.3, 1.2, 3.8], [-30.4, 0.8, 1.0], [-30.4, 1.1, 3.3], [-30.4, 0.8, 1.0], 42),
  Hd(17.4, 0.4, [-33.2, 1.7, 5.5], [-33.4, 1.5, 1.6], [-33.2, 1.7, 5.0], [-33.4, 1.5, 1.6], 44),
  Hd(18.1, 0.3, [-31.6, 1.7, 8.8], [-32, 1.3, 1.4], [-31.8, 1.7, 8.2], [-32, 1.3, 1.4], 48),
  Hd(19.4, 0.6, [-28.5, 2.4, 8.5], [-29.5, 1.6, 1.0], [-28.8, 2.2, 7.5], [-29.5, 1.5, 1.0], 50),
  Hd(22.7, 0.8, [-10, 3.5, 10], [-8, 1.6, -3], [-8, 3.0, 9], [-8, 1.6, -3], 52),
  Hd(24.5, 0.8, [12, 4, 6], [14, 3, -22], [12, 3.4, 4], [14, 3, -22], 56),
  Hd(26.4, 0.7, [-4, 3.5, 8], [-3, 2.5, -18], [-4, 3.2, 6.5], [-3, 2.5, -18], 54),
  Hd(28.0, 0.6, [-4, 2.2, -6], [4, 3.5, -30], [-3, 2.6, -7], [4, 3.5, -30], 50),
  Hd(30.2, 0.6, [5.5, 3.2, 4.5], [3, 0.8, -1.2], [5, 2.6, 3.6], [3, 0.8, -1.2], 46),
  Hd(31.6, 0.8, [18.5, 1.8, 5.5], [20, 1.8, 0.2], [20, 2.0, 4.2], [20, 1.8, 0.2], 44),
  Hd(37.7, 0.9, [3, 2.4, 7.5], [6, 1.4, 1.6], [5.5, 2.0, 6], [6, 1.4, 1.6], 46),
  Hd(41.1, 0.5, [6, 2.0, 6.4], [6.5, 1.5, 3.5], [6.2, 2.0, 5.8], [6.5, 1.5, 3.5], 44),
  Hd(43.4, 1.2, [-52, 3.2, 10], [-56, 2.2, 0], [-55, 2.6, 7.5], [-56, 2.2, 0], 48),
  Hd(45.3, 0.4, [-58, 2.2, 6], [-56, 2.2, 0], [-57.5, 2.2, 5.4], [-56, 2.2, 0], 44),
  Hd(47.3, 1.0, [-33, 2.2, 7], [-31.5, 1.2, 1.2], [-32, 1.8, 5.5], [-31.5, 1.2, 1.2], 46),
  Hd(49.6, 0.4, [-32, 1.6, 5.5], [-31, 1.0, 1.2], [-31.6, 1.8, 6.5], [-31, 1.0, 1.2], 42),
  Hd(51.4, 0.6, [-31.5, 2.5, 9], [-31, 1.8, 0], [-31, 6.5, 18], [-31, 2, -2], 50, 56),
];
const END_T = 55.8;
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
  { t: 0, n: "day" }, { t: 36.5, n: "day" }, { t: 39.0, n: "gold" }, { t: 60, n: "gold" },
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
