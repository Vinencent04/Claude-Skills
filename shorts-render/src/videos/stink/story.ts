// "The Great Stink of 1858": our own ~57 s short. Continuous narration (per-line delivery, no pauses) timed to stink-voice/words.json.
// Three painted sets stand 60 m apart in one scene (west = Parliament + the Thames embankment, chamber = House of Commons, tunnel = Bazalgette's sewer).
export const FPS = 30;
export const TOTAL = 1710;
export type V3 = [number, number, number];
export type SetName = "west" | "chamber" | "tunnel";
export const ORG: Record<SetName, V3> = { west: [0, 0, 0], chamber: [100, 0, 0], tunnel: [200, 0, 0] };
export type LightName = "stink" | "hot" | "chamber" | "tunnel" | "clean" | "night";
export const D0 = 0; // (build.ts helper)

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const F = (s: number) => Math.round(s * FPS);
export const toW = (set: SetName, p: V3): V3 => [p[0] + ORG[set][0], p[1] + ORG[set][1], p[2] + ORG[set][2]];

// ---------------- events (seconds, from words.json; visuals land ~3 frames before the word) ----------------
export const T_FLEE = 0.9;       // MPs burst out of the doors
export const T_HANK = 5.2;       // "holding handkerchiefs"
export const T_RIVER = 8.4;      // "the River Thames"
export const T_PIPES = 12.5;     // "poured its sewage"
export const T_DRINK = 15.4;     // "millions of Londoners drank that water"
export const T_HOT = 17.6;       // "hottest ever recorded"
export const T_COOK = 19.4;      // "the river began to cook"
export const T_CURTAIN = 22.5;   // "curtains soaked in chemicals"
export const T_DOCTORS = 25.4;   // "Doctors believed"
export const T_CHOL = 30.8;      // "cholera"
export const T_WRONG = 31.6;     // "They were wrong"
export const T_PANIC = 33.3;     // "the panic worked"
export const T_DAYS = 34.0;      // "Within eighteen days"
export const T_LAW = 35.9;       // "passed a law"
export const T_BAZ = 37.4;       // "the engineer Joseph Bazalgette"
export const T_BRICKS = 41.2;    // "more than 300 million bricks"
export const T_FLOW = 43.4;      // "the sewage now flowed far out"
export const T_ENDED = 47.0;     // "cholera outbreaks finally ended"
export const T_SAVED = 48.2;     // "millions of lives were saved"
export const T_TODAY = 51.0;     // "still working today"
export const T_CTA = 52.9;
/** MPs run along the promenade in +x: x(t) (shots 1-2) */
export const mpX = (t: number) => -1 + 7.0 * Math.max(0, t - T_FLEE);
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

/** shots 1 and 2: the camera follows the running MPs along the promenade */
const track1 = (f: number): Shot => { const t = f / FPS, c = 2 + 6.6 * Math.max(0, t - 0.9); return { pos: toW("west", [c - 4.0, 1.6, 6]), look: toW("west", [c + 2.5, 3.0, -12]), fov: 60, roll: 0.04 }; };
const track2 = (f: number): Shot => { const t = f / FPS, c = 8 + 7.2 * (t - 4.14); return { pos: toW("west", [c - 1.5, 1.6, 3.2]), look: toW("west", [c + 2.5, 1.9, -5]), fov: 54, roll: 0.04 }; };

// shot frames from stink-voice/words.json (3 frames before each beat)
export const SHOTS: ShotDef[] = [
  mk(1, "west", "stink", 0, 121, (a) => [K(a, track1)], 0),
  mk(2, "west", "stink", 121, 249, (a) => [K(a, track2)], 0),
  mk(3, "west", "stink", 249, 340, (a) => [K(a, cam("west", [0, 2.2, 2.5], [0, 0.2, 30], a, 0.004, { fov: 54, roll: 0.03 }))], 7, [0, 0.2, 30]),
  mk(4, "west", "stink", 340, 503, (a) => [K(a, cam("west", [0, -1.0, 22], [0, 0.8, 8], a, 0.0045, { fov: 56, roll: 0.03 }))], 7, [0, 0.5, 8]),
  mk(5, "west", "hot", 503, 612, (a) => [K(a, cam("west", [0, 0.5, 6], [0, 5.0, 60], a, 0.0035, { fov: 56, roll: 0.03 }))], 0),
  mk(6, "chamber", "chamber", 612, 762, (a) => [K(a, move("chamber", [-8, 1.7, -4], [-2, 1.8, -12], [8, 1.7, -4], [2, 1.8, -12], a, 140, { fov: 54, roll: 0.03 }, 0.002))], 0),
  mk(7, "west", "stink", 762, 944, (a) => [K(a, cam("west", [-1.5, 1.8, 3.5], [0, 1.7, -5], a, 0.0055, { fov: 46, roll: 0.03 }))], 8, [0, 1.7, -5]),
  mk(8, "chamber", "chamber", 944, 1018, (a) => [K(a, cam("chamber", [0, 2.0, 2.0], [0, 1.9, -10], a, 0.006, { fov: 50, roll: 0.03 }, 0.003))], 8, [0, 1.9, -10]),
  mk(9, "chamber", "chamber", 1018, 1119, (a) => [K(a, cam("chamber", [3.0, 2.2, 0], [0, 1.8, -12], a, 0.005, { fov: 48, roll: 0.03 }))], 8, [0, 1.8, -12]),
  mk(10, "tunnel", "tunnel", 1119, 1298, (a) => [K(a, move("tunnel", [0, 1.8, 12], [0, 1.8, -22], [0, 1.8, 2], [0, 1.8, -26], a, 150, { fov: 58, roll: 0.02 }, 0.002))], 0),
  mk(11, "tunnel", "tunnel", 1298, 1443, (a) => [K(a, move("tunnel", [0, 1.2, -10], [0, 1.0, -40], [0, 1.0, -48], [0, 1.0, -80], a, 130, { fov: 58, roll: 0.03 }, 0.0))], 0),
  mk(12, "west", "clean", 1443, 1523, (a) => [K(a, move("west", [0, 1.6, 4], [0, 1.8, -6], [6, 4.5, 14], [0, 1.4, -4], a, 80, { fov: 54, roll: 0.03 }, 0.0012))], 0),
  mk(13, "tunnel", "tunnel", 1523, 1586, (a) => [K(a, cam("tunnel", [0, 1.7, -24], [0, 1.4, -44], a, 0.005, { fov: 54, roll: 0.03 }))], 7, [0, 1.4, -44]),
  mk(14, "west", "night", 1586, 1710, (a) => [K(a, move("west", [0.5, 1.2, 2.0], [0.5, 3.0, -10], [1.5, 3.0, 10], [0, 6, -12], a, 110, { fov: 52, roll: 0.02 }, 0.0012))], 0),
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// kicks: image shake on impacts
const KICKS: [number, number][] = [[T_FLEE, 0.8], [T_CHOL, 1.0], [T_LAW, 1.0], [T_PANIC, 0.6]];
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
