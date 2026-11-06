// "The Christmas Truce of 1914": our own ~46 s short. Voice only (no music), continuous narration with per-line delivery, timed to truce-voice/words.json.
// Two painted sets stand 100 m apart in one scene (front = trenches + no man's land, hq = the general's room).
export const FPS = 30;
export const TOTAL = 1392;
export type V3 = [number, number, number];
export type SetName = "front" | "hq";
export const ORG: Record<SetName, V3> = { front: [0, 0, 0], hq: [100, 0, 0] };
export type LightName = "war" | "night" | "dawn" | "hq" | "gold" | "grey";
export const D0 = 0; // (build.ts helper)

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const F = (s: number) => Math.round(s * FPS);
export const toW = (set: SetName, p: V3): V3 => [p[0] + ORG[set][0], p[1] + ORG[set][1], p[2] + ORG[set][2]];

// ---------------- events (seconds, from words.json; visuals land ~3 frames before the word) ----------------
export const T_DROP = 4.45;      // "put down their rifles"
export const T_SING = 5.35;      // "started to sing"
export const T_TREES = 8.1;      // "tiny Christmas trees lit by candles"
export const T_SILENT = 11.85;   // "Silent Night"
export const T_LISTEN = 12.9;    // "The British soldiers listened"
export const T_BACK = 15.2;      // "then they sang back"
export const T_DAWN = 16.3;      // "At dawn"
export const T_HANDS = 22.35;    // "They shook hands"
export const T_GIFTS = 23.1;     // "swapped cigarettes"
export const T_BURY = 26.4;      // "buried their dead"
export const T_BALL = 28.9;      // "found a ball"
export const T_FURIOUS = 33.0;   // "furious"
export const T_ORDERS = 33.85;   // "gave orders"
export const T_NEVER = 36.1;     // "It never did"
export const T_HUMAN = 41.2;     // "chose to be human"
export const T_CTA = 42.8;
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

// shot frames from truce-voice/words.json (3 frames before each beat)
export const SHOTS: ShotDef[] = [
  mk(1, "front", "war", 0, 120, (a) => [K(a, move("front", [-10, 1.4, 14], [0, 1.5, -4], [10, 1.4, 14], [0, 1.5, -4], a, 100, { fov: 58, roll: 0.04 }, 0.002))], 0),
  mk(2, "front", "night", 120, 178, (a) => [K(a, cam("front", [0, 1.9, 3.5], [0, 1.9, 12], a, 0.006, { fov: 50, roll: 0.03 }))], 8, [0, 1.8, 10]),
  mk(3, "front", "night", 178, 308, (a) => [K(a, cam("front", [0, 2.0, -2], [0, 1.8, -10.8], a, 0.005, { fov: 50, roll: 0.03 }))], 7, [0, 1.6, -10.5]),
  mk(4, "front", "night", 308, 381, (a) => [K(a, cam("front", [-2.0, 1.6, -6.0], [0, 1.8, -11], a, 0.006, { fov: 46, roll: -0.03 }))], 8, [0, 1.8, -11]),
  mk(5, "front", "night", 381, 484, (a) => [K(a, move("front", [0, 1.6, 3], [0, 1.8, -10], [0, 1.6, 6], [0, 1.8, 10], a, 70, { fov: 54, roll: 0.03 }, 0.003))], 0),
  mk(6, "front", "dawn", 484, 665, (a) => [K(a, move("front", [0, 12, 18], [0, 0, 0], [0, 2.0, 6], [0, 1.4, 0], a, 90, { fov: 56, roll: 0.02 }, 0.0012))], 0),
  mk(7, "front", "dawn", 665, 791, (a) => [K(a, cam("front", [1.5, 1.6, 5], [0, 1.6, 0], a, 0.006, { fov: 46, roll: 0.03 }))], 8, [0, 1.6, 0]),
  mk(8, "front", "dawn", 791, 848, (a) => [K(a, move("front", [-6, 1.5, 5], [0, 0.8, 0], [6, 1.5, 5], [0, 0.8, 0], a, 50, { fov: 52, roll: 0.03 }, 0.002))], 0),
  mk(9, "front", "dawn", 848, 965, (a) => [K(a, move("front", [-8, 1.4, 8], [0, 0.8, 0], [8, 2.4, 10], [0, 0.8, 0], a, 90, { fov: 56, roll: 0.03 }, 0.0012))], 0),
  mk(10, "hq", "hq", 965, 1014, (a) => [K(a, cam("hq", [0.5, 2.0, 2], [0, 1.8, -6], a, 0.008, { fov: 44, roll: 0.03 }))], 9, [0, 1.8, -6]),
  mk(11, "hq", "hq", 1014, 1084, (a) => [K(a, cam("hq", [-1.5, 2.2, 0], [0.5, 1.4, -5.2], a, 0.006, { fov: 46, roll: -0.03 }))], 8, [0.5, 1.4, -5.2]),
  mk(12, "front", "grey", 1084, 1140, (a) => [K(a, move("front", [0, 1.8, 6], [0, 0.8, -8], [0, 3.6, 8.5], [0, 0.8, -8], a, 60, { fov: 54, roll: 0.02 }, 0.0012))], 0),
  mk(13, "front", "gold", 1140, 1283, (a) => [K(a, move("front", [0, 1.4, 4], [0, 1.6, -1], [0, 5, 14], [0, 1.6, -1], a, 130, { fov: 54, roll: 0.02 }, 0.0012))], 0),
  mk(14, "front", "night", 1283, 1392, (a) => [K(a, move("front", [0.4, 1.0, 3], [0, 0.8, -2], [1.5, 2.6, 9], [0, 1.0, -4], a, 100, { fov: 50, roll: 0.02 }, 0.0012))], 0),
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// kicks: image shake on impacts
const KICKS: [number, number][] = [[0.3, 1.0], [1.0, 0.8], [1.7, 0.8], [2.4, 1.0], [3.1, 0.8], [T_FURIOUS, 0.8], [T_ORDERS, 1.0]];
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
