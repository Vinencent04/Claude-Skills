// "The Carrington Event" (1859 solar storm): our own 60 s short. Voice only; timed to sun-voice/words.json.
export const FPS = 30;
export const TOTAL = 1800;
export type V3 = [number, number, number];
export type SetName = "space" | "office" | "obs" | "town" | "camp" | "grid";
export const ORG: Record<SetName, V3> = { space: [0, 0, 0], office: [100, 0, 0], obs: [200, 0, 0], town: [300, 0, 0], camp: [400, 0, 0], grid: [500, 0, 0] };
export type LightName = "space" | "office" | "obs" | "aurora" | "camp" | "city";
export const D0 = 0;

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const F = (s: number) => Math.round(s * FPS);
export const toW = (set: SetName, p: V3): V3 => [p[0] + ORG[set][0], p[1] + ORG[set][1], p[2] + ORG[set][2]];

// ---------------- events (seconds, from words.json) ----------------
export const T_HIT = 3.3;        // "so powerful"
export const T_BURN = 5.9;       // "burst into flames"
export const T_BATT = 10.6;      // "batteries"
export const T_SKETCH = 15.2;    // "sketching"
export const T_FLASH = 16.8;     // "blinding white flash"
export const T_RUN = 18.9;       // "By the time he found a witness"
export const T_GONE = 20.9;      // "gone"
export const T_REPLY = 23.6;     // "reply arrived"
export const T_RED = 25.4;       // "turned blood red"
export const T_CUBA = 28.0;      // "Cuba"
export const T_MINERS = 28.5;    // "gold miners"
export const T_MAD = 33.5;       // "networks went mad"
export const T_SPARK = 34.6;     // "Sparks leapt"
export const T_PAPER = 36.4;     // "Paper burst into flames"
export const T_CHAT = 41.5;      // "chatted"
export const T_TITLE = 45.4;     // "Carrington Event"
export const T_OUT = 51.0;       // lights go out
export const T_WHEN = 55.6;      // "but when"
export const T_CTA = 56.4;
export const lightOverride = (_f: number, _id: number, _a: number): LightName | null => null;
// ---------------- cameras ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 30) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** camera in set-local coordinates that pushes toward its look point */
const cam = (set: SetName, pos: V3, look: V3, f0: number, rate: number, rest: Partial<Cam> = {}, punch = 0) => (f: number): Shot => {
  const k = pushK(f, f0, rate, punch), p = toW(set, pos), l = toW(set, look);
  return { pos: [l[0] + (p[0] - l[0]) * k, l[1] + (p[1] - l[1]) * k, l[2] + (p[2] - l[2]) * k], look: l, ...rest };
};








export type ShotDef = { id: number; set: SetName; light: LightName; a: number; b: number; keys: Key[]; cInf: number; focus?: V3 };
const mk = (id: number, set: SetName, light: LightName, a: number, b: number, keys: ((a: number) => Key[]), cInf = 0, focus?: V3): ShotDef =>
  ({ id, set, light, a, b, keys: keys(a), cInf, focus });
const K = (f: number, s: (f: number) => Shot, extra: Partial<Key> = {}): Key => ({ f, s, ...extra });
/** camera that glides from (p0,l0) to (p1,l1) over dur frames starting at f0, then creeps forward */
const move = (set: SetName, p0: V3, l0: V3, p1: V3, l1: V3, f0: number, dur: number, rest: Partial<Cam> = {}, rate = 0.0012) => (f: number): Shot => {
  const u = glide((f - f0) / dur), lerp = (a: V3, b: V3): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  const p = toW(set, lerp(p0, p1)), l = toW(set, lerp(l0, l1)), k = Math.exp(-rate * Math.max(0, f - f0 - dur));
  return { pos: [l[0] + (p[0] - l[0]) * k, l[1] + (p[1] - l[1]) * k, l[2] + (p[2] - l[2]) * k], look: l, ...rest };
};

// shot frames from sun-voice/words.json (3 frames before each beat)
export const SHOTS: ShotDef[] = [
  mk(1, "space", "space", 0, 135, (a) => [K(a, move("space", [10, 2.0, 10], [-6, 3, -40], [2, 1.5, 8], [3, 0.5, -8], a, 110, { fov: 52, roll: 0.04 }, 0.0015))], 0),
  mk(2, "office", "office", 135, 225, (a) => [K(a, cam("office", [-1.0, 2.5, 0.2], [0, 1.9, -6], a, 0.005, { fov: 48, roll: 0.03 }))], 8, [0.5, 1.5, -6]),
  mk(3, "office", "office", 225, 357, (a) => [K(a, move("office", [-3, 2.5, 0.0], [-3.5, 1.9, -6], [-4.2, 2.3, -1.5], [-4, 1.9, -6], a, 90, { fov: 46, roll: -0.03 }, 0.002))], 7, [-5, 1.3, -6]),
  mk(4, "obs", "obs", 357, 490, (a) => [K(a, move("obs", [2.5, 2.6, 6.5], [0.2, 2.6, -6], [1.0, 2.6, 4.5], [0.2, 2.6, -6], a, 120, { fov: 52, roll: 0.03 }, 0.002))], 8, [-2, 2.0, -6]),
  mk(5, "obs", "obs", 490, 640, (a) => [K(a, move("obs", [2.0, 2.8, 6.5], [0.2, 2.8, -6], [0.8, 2.6, 4.5], [0.2, 2.8, -6], a, 100, { fov: 54, roll: 0.02 }, 0.002))], 0),
  mk(6, "town", "aurora", 640, 740, (a) => [K(a, move("town", [0, 3, -16], [0, 8.5, -34], [0, 4, -22], [0, 16, -34], a, 90, { fov: 56, roll: 0.03 }, 0.0015))], 0),
  mk(7, "town", "aurora", 740, 846, (a) => [K(a, move("town", [0, 1.8, 14], [0, 9, -20], [0, 2.4, 14], [0, 18, -20], a, 95, { fov: 62, roll: -0.03 }, 0.0012))], 0),
  mk(8, "camp", "camp", 846, 975, (a) => [K(a, move("camp", [-3, 1.8, 7], [0, 1.4, -2], [3, 2.0, 5], [0, 1.4, -2], a, 110, { fov: 52, roll: 0.03 }, 0.002))], 0),
  mk(9, "office", "office", 975, 1089, (a) => [K(a, move("office", [0, 2.8, 1.5], [0, 1.9, -6], [0, 2.5, -0.5], [0, 1.9, -6], a, 90, { fov: 50, roll: 0.03 }, 0.002))], 0),
  mk(10, "office", "office", 1089, 1135, (a) => [K(a, cam("office", [-0.5, 2.6, 0.0], [0, 1.6, -6], a, 0.007, { fov: 48, roll: -0.03 }))], 9, [0.4, 1.3, -6]),
  mk(11, "office", "office", 1135, 1200, (a) => [K(a, cam("office", [-3.2, 2.5, -0.5], [-5, 1.7, -6], a, 0.006, { fov: 46, roll: 0.03 }))], 8, [-5, 1.6, -6]),
  mk(12, "office", "office", 1200, 1245, (a) => [K(a, cam("office", [3.2, 2.5, -0.5], [5, 1.7, -6], a, 0.006, { fov: 46, roll: -0.03 }))], 8, [5, 1.6, -6]),
  mk(13, "office", "office", 1245, 1329, (a) => [K(a, move("office", [0, 2.6, 3], [0, 2.4, -6], [0, 2.6, 1], [0, 2.4, -6], a, 80, { fov: 52, roll: 0.02 }, 0.0015))], 0),
  mk(14, "space", "space", 1329, 1473, (a) => [K(a, move("space", [0, 2.5, 12], [2, 1.5, -8], [0, 2.0, 7], [2, 2.0, -8], a, 120, { fov: 52, roll: 0.02 }, 0.0012))], 0),
  mk(15, "grid", "city", 1473, 1581, (a) => [K(a, move("grid", [0, 4, 20], [0, 12, -20], [0, 7, 12], [0, 13, -24], a, 100, { fov: 62, roll: 0.02 }, 0.0012))], 0),
  mk(16, "obs", "obs", 1581, 1688, (a) => [K(a, cam("obs", [0, 2.4, 3.5], [0, 2.4, -6], a, 0.005, { fov: 46, roll: 0.03 }))], 8, [0, 2.4, -6]),
  mk(17, "town", "aurora", 1688, 1800, (a) => [K(a, move("town", [0, 1.7, 6], [0, 6, -20], [0, 2.0, 8], [0, 4, -20], a, 100, { fov: 56, roll: 0.02 }, 0.001))], 0),
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

const KICKS: [number, number][] = [[T_HIT, 1.0], [T_BURN, 1.0], [T_FLASH, 1.0], [T_REPLY, 0.8], [T_SPARK, 0.8], [T_PAPER, 1.0], [T_TITLE, 0.8], [T_OUT, 1.0]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (f: number): Cam => {
  const s = shotAt(f), c = run(s.keys, f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const dofAt = (f: number) => {
  const s = shotAt(f), prev = SHOTS[Math.max(0, s.id - 2)];
  const k = Math.min(1, (f - s.a) / 1);
  return { cInf: s.cInf, focus: s.focus ? toW(s.set, s.focus) : undefined, k, prev: prev.cInf };
};
