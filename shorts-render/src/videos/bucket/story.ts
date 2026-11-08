// "The War of the Bucket" (Modena vs Bologna, 1325): one continuous camera path (Hermite spline through keyframes) flies through ONE world,
// no hard cuts. Voice: ElevenLabs James, per-line, timed to bucket-voice/words.json.
export const FPS = 30;
export const TOTAL = 1630;
export type V3 = [number, number, number];
export type SetName = "w";
export const ORG: Record<SetName, V3> = { w: [0, 0, 0] };
export type LightName = "day" | "night" | "dawn" | "grey" | "gold";
export const D0 = 0;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const F = (s: number) => Math.round(s * FPS);
export const toW = (_set: SetName, p: V3): V3 => p;

// ---------------- layout (world) ----------------
export const BOL = -28, MOD = 28;               // city centres on the road (x)
export const WELL: V3 = [BOL, 0, -2];
export const PLINTH: V3 = [MOD - 2, 0, 0];      // where the bucket ends up in Modena

// ---------------- events (seconds; words.json) ----------------
export const T_WAR = 3.1, T_DIE = 4.6, T_NEVER = 7.0, T_BOL = 8.9, T_MOD = 9.7, T_HATE = 11.5, T_NIGHT = 13.0, T_SNEAK = 14.6,
  T_STEAL = 16.3, T_NOGOLD = 18.0, T_NOCROWN = 19.0, T_BUCKET = 20.0, T_DEMAND = 20.9, T_NO = 23.0, T_ARMY = 24.1, T_MARCH = 26.7,
  T_FRAC = 28.1, T_CHARGE = 30.3, T_COLLAPSE = 31.8, T_RAN = 33.6, T_GATES = 36.7, T_LOST = 38.0, T_TODAY = 40.9, T_WAIT = 43.9,
  T_POET = 45.1, T_TITLE = 48.6, T_CTA = 50.0;

// ---------------- camera: Hermite spline through keys (no stops, no cuts) ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { t: number; p: V3; l: V3; fov?: number; roll?: number };
const K = (t: number, p: V3, l: V3, fov = 48, roll = 0): Key => ({ t, p, l, fov, roll });
export const KEYS: Key[] = [
  K(0.0, [1.4, 0.9, 3.4], [0, 0.9, 0], 44, 0.03),
  K(2.2, [3, 1.4, 6], [0, 1.0, 0], 46, -0.03),
  K(3.8, [0, 3.4, 10.5], [0, 1.6, 0], 58, 0.03),
  K(5.6, [-2.2, 2.6, 9], [0, 1.5, 0], 58, -0.02),
  K(7.0, [0.6, 1.2, 3.0], [0, 1.0, 0], 44, 0.03),
  K(8.2, [0, 13, 22], [0, 2, -2], 56, 0),
  K(8.9, [-6, 8, 16], [-28, 4, -6], 52, -0.04),
  K(9.8, [6, 8, 16], [28, 4, -6], 52, 0.04),
  K(10.8, [2, 2.4, 8.5], [0, 1.6, 3], 46, -0.03),
  K(12.4, [-2.5, 1.8, 8.5], [0.5, 1.6, 3], 46, 0.03),
  K(13.2, [-20, 5, 15], [-28, 2, -4], 52, -0.04),
  K(14.6, [-26, 2.5, 9], [-28, 1.5, -6], 50, 0.03),
  K(16.0, [-28.3, 1.7, 3.6], [-28, 1.3, -2], 44, -0.03),
  K(17.4, [-27, 1.5, 3], [-28, 1.4, -1], 42, 0.03),
  K(18.2, [-23, 1.7, 5.5], [-25.7, 1.3, 0], 46, -0.02),
  K(18.7, [-21.8, 1.6, 5], [-23.7, 1.3, 0.8], 44, 0.02),
  K(19.5, [-18.5, 1.5, 4.3], [-20.5, 1.3, 1.2], 42, -0.02),
  K(20.2, [-17.4, 1.4, 3.6], [-19.6, 1.3, 1.2], 40, 0.03),
  K(20.55, [-8, 2.4, 8], [-2, 1.6, 0], 52, 0.02),
  K(20.9, [0.3, 2.0, 6.5], [0, 1.6, 0], 46, -0.03),
  K(22.4, [3, 1.8, 5.5], [0.2, 1.6, 0], 44, 0.03),
  K(23.9, [-2.2, 2.0, 5], [0.2, 1.6, 0], 44, -0.03),
  K(25.0, [-10, 14, 18], [-24, 1, -2], 56, 0.04),
  K(26.7, [-30, 6, 12], [-16, 1, 0], 52, -0.03),
  K(28.3, [26, 5, 11], [20, 1.2, 0], 50, 0.03),
  K(29.9, [27, 3.5, 9], [20, 1.4, 0], 48, -0.03),
  K(30.5, [22, 2.2, 8], [14, 1.4, 0], 48, 0.04),
  K(31.6, [8, 2.4, 8], [0, 1.4, 0], 48, -0.03),
  K(32.6, [-2, 8, 12], [-4, 1, 0], 54, 0.03),
  K(33.8, [0, 2.8, 9], [-4, 1.4, 0], 48, -0.03),
  K(35.4, [-12, 2.8, 9], [-14, 1.4, 0], 48, 0.03),
  K(37.0, [-24, 2.8, 9], [-28, 1.5, -2], 48, -0.03),
  K(38.0, [-27.5, 1.7, 5.5], [-28, 1.5, -2], 44, 0.02),
  K(39.9, [-28.2, 1.5, 3], [-28, 1.4, -2], 40, -0.02),
  K(41.2, [-20, 12, 12], [0, 6, -2], 54, 0.04),
  K(42.2, [18, 10, 12], [26, 5, -6], 54, -0.03),
  K(42.9, [27, 1.8, 4.5], [26, 1.3, 0], 44, 0.03),
  K(44.4, [21, 1.8, 5], [23.5, 1.3, 0.5], 46, -0.03),
  K(45.6, [25, 1.9, 7], [27.5, 1.5, 3], 46, 0.03),
  K(47.5, [29, 2.0, 6], [27.5, 1.4, 3], 46, -0.03),
  K(50.2, [26, 3, 12], [26, 1.5, 0], 50, 0.02),
  K(52.2, [26, 6, 18], [26, 2, -2], 54, 0),
  K(54.4, [26, 9, 24], [26, 2, -4], 56, 0),
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
  { t: 0, n: "day" }, { t: 12.6, n: "day" }, { t: 13.8, n: "night" }, { t: 20.0, n: "night" }, { t: 21.4, n: "dawn" }, { t: 24.0, n: "day" },
  { t: 37.4, n: "day" }, { t: 38.4, n: "grey" }, { t: 40.4, n: "grey" }, { t: 42.0, n: "gold" }, { t: 60, n: "gold" },
];
export const lightAt = (t: number): { a: LightName; b: LightName; k: number } => {
  for (let i = 0; i < LIGHT_KEYS.length - 1; i++) {
    const A = LIGHT_KEYS[i], B = LIGHT_KEYS[i + 1];
    if (t >= A.t && t < B.t) return { a: A.n, b: B.n, k: smooth((t - A.t) / (B.t - A.t)) };
  }
  return { a: "gold", b: "gold", k: 0 };
};
export const nightness = (t: number) => { const l = lightAt(t); return (l.a === "night" ? 1 - l.k : 0) + (l.b === "night" ? l.k : 0); };
export const lightOverride = (_f: number, _id: number, _a: number): LightName | null => null;
export const SHOTS = [{ id: 1, set: "w" as SetName, light: "day" as LightName, a: 0, b: TOTAL, cInf: 5 }];
export const shotAt = (_f: number) => SHOTS[0];
