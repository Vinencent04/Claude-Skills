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

// ---------------- camera: Hermite spline through keys (no stops, no cuts) ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { t: number; p: V3; l: V3; fov?: number; roll?: number };
const K = (t: number, p: V3, l: V3, fov = 48, roll = 0): Key => ({ t, p, l, fov, roll });
export const KEYS: Key[] = [
  K(0.0, [61.8, 1.2, 4.6], [60.7, 0.9, 0], 44, 0.03),
  K(1.6, [57, 1.6, 6.5], [59.5, 1.3, 0], 46, -0.03),
  K(2.4, [63, 1.8, 6.5], [60.5, 1.3, 0], 46, 0.03),
  K(3.4, [60, 3.8, 10.5], [60, 1.4, 0], 56, -0.02),
  K(4.6, [60.5, 2.0, 5.0], [60, 1.0, 0], 46, 0.03),
  K(6.0, [59, 1.4, 3.0], [60, 0.9, 0], 42, -0.03),
  K(6.9, [60, 12, 16], [60, 0, -2], 58, 0),
  K(8.0, [25, 28, 26], [10, 0, -4], 60, 0.03),
  K(9.4, [-12, 14, 16], [-8, 0, -2], 54, -0.03),
  K(10.6, [-24, 5, 13], [-30, 1.2, 0], 50, 0.03),
  K(11.8, [-33, 2.6, 9], [-36, 1.5, 0], 48, -0.03),
  K(13.2, [-34.2, 1.9, 5.5], [-33.4, 1.6, 1.6], 46, 0.03),
  K(14.8, [-32, 2.2, 9], [-32.2, 1.3, 1.2], 50, -0.03),
  K(16.2, [-30.3, 1.2, 3.8], [-30.4, 0.8, 1.0], 42, 0.03),
  K(17.4, [-33.2, 1.7, 5.5], [-33.4, 1.5, 1.6], 44, -0.03),
  K(18.5, [-31.6, 1.7, 8.8], [-32, 1.3, 1.4], 48, 0.03),
  K(19.6, [-24, 3, 9], [-20, 2.5, 0], 50, -0.03),
  K(21.4, [-28.5, 2.4, 8.5], [-29.5, 1.6, 1.0], 50, 0.03),
  K(22.8, [-14, 4, 12], [-8, 1.8, 0], 52, -0.03),
  K(24.2, [-3, 3, 10], [-6, 1.6, -1], 50, 0.03),
  K(24.6, [10, 5, 12], [18, 1.8, 0], 50, -0.03),
  K(25.8, [12, 4, 6], [14, 3, -22], 56, 0.03),
  K(27.0, [-4, 3.5, 8], [-3, 2.5, -18], 54, -0.03),
  K(28.6, [-4, 2.2, -6], [4, 3.5, -30], 50, 0.03),
  K(30.0, [2, 6, 5], [0, 1.0, -1], 52, -0.03),
  K(31.8, [15, 3, 9], [20, 2, 0], 48, 0.03),
  K(33.0, [18.5, 1.8, 5], [20, 1.8, 0], 42, -0.03),
  K(34.6, [22, 2.0, 6.5], [20, 2.0, 0], 44, 0.03),
  K(36.0, [17, 1.7, 5], [20, 1.8, 0], 42, -0.03),
  K(37.3, [18, 7, 12], [10, 1, 0], 54, 0.03),
  K(38.4, [8, 3.5, 10], [6, 1.2, 1], 50, -0.03),
  K(40.2, [3, 2.2, 6], [6, 1.4, 1.6], 46, 0.03),
  K(41.8, [8, 3.2, 8], [6, 1.4, 1.6], 48, -0.03),
  K(42.8, [-10, 10, 18], [-40, 2, -2], 54, 0.03),
  K(44.0, [-52, 3.2, 10], [-56, 2.2, 0], 48, -0.03),
  K(45.6, [-58, 2.2, 6], [-56, 2.2, 0], 44, 0.03),
  K(47.0, [-44, 8, 12], [-34, 0.5, 0], 54, -0.03),
  K(48.6, [-33, 2.2, 7], [-31.5, 1.2, 1.2], 46, 0.03),
  K(50.4, [-32, 1.6, 5], [-31, 1.0, 1.2], 42, -0.03),
  K(52.0, [-31.5, 2.5, 9], [-31, 1.8, 0], 50, 0.03),
  K(55.8, [-31, 6.5, 18], [-31, 2, -2], 56, 0),
];
const hermite = (p0: number, p1: number, m0: number, m1: number, u: number, dt: number) => {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * dt * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * dt * m1;
};
/** PCHIP tangents: C1-smooth but never overshoots a key (no swinging through walls on the long flights) */
const tan = (arr: number[], i: number, ts: number[]) => {
  if (i === 0 || i === arr.length - 1) { const j = i === 0 ? 1 : i - 1; return (arr[j] - arr[i]) / (ts[j] - ts[i]); }
  const h0 = ts[i] - ts[i - 1], h1 = ts[i + 1] - ts[i], d0 = (arr[i] - arr[i - 1]) / h0, d1 = (arr[i + 1] - arr[i]) / h1;
  if (d0 * d1 <= 0) return 0;
  const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
  return (w1 + w2) / (w1 / d0 + w2 / d1);
};
const T = KEYS.map((k) => k.t);
const chan = (sel: (k: Key) => number) => KEYS.map(sel);
const CH = {
  px: chan((k) => k.p[0]), py: chan((k) => k.p[1]), pz: chan((k) => k.p[2]),
  lx: chan((k) => k.l[0]), ly: chan((k) => k.l[1]), lz: chan((k) => k.l[2]), fov: chan((k) => k.fov ?? 48), roll: chan((k) => k.roll ?? 0),
};
const ev = (arr: number[], t: number, i: number) => {
  const u = (t - T[i]) / (T[i + 1] - T[i]);
  return hermite(arr[i], arr[i + 1], tan(arr, i, T), tan(arr, i + 1, T), u, T[i + 1] - T[i]);
};
export const camAt = (f: number): Cam => {
  const t = Math.min(f / FPS, T[T.length - 1] - 1e-3);
  let i = 0; while (i < T.length - 2 && t >= T[i + 1]) i++;
  // handheld breathing (tiny, continuous)
  const sx = 0.03 * Math.sin(t * 1.7) + 0.015 * Math.sin(t * 4.3), sy = 0.025 * Math.sin(t * 1.3 + 1) + 0.012 * Math.sin(t * 5.1);
  return {
    pos: [ev(CH.px, t, i) + sx, ev(CH.py, t, i) + sy, ev(CH.pz, t, i)],
    look: [ev(CH.lx, t, i) - sx * 0.5, ev(CH.ly, t, i) - sy * 0.5, ev(CH.lz, t, i)],
    fov: ev(CH.fov, t, i), roll: ev(CH.roll, t, i) + 0.004 * Math.sin(t * 2.1),
  };
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
