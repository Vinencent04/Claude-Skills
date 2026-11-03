// "The French Revolution in a nutshell": our own 60 s short, stickmen play the roles, shots timed to voice/timing.json.
// Four painted sets stand 60 m apart in one scene (hall, street, Bastille, square); every shot is a camera in one of them.
export const FPS = 30;
export const TOTAL = 1800;
export type V3 = [number, number, number];
export type SetName = "hall" | "street" | "bast" | "square";
export const ORG: Record<SetName, V3> = { hall: [0, 0, 0], street: [60, 0, 0], bast: [120, 0, 0], square: [180, 0, 0] };
export const D0 = 0; // (build.ts helper leftover)

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const F = (s: number) => Math.round(s * FPS);
export const toW = (set: SetName, p: V3): V3 => [p[0] + ORG[set][0], p[1] + ORG[set][1], p[2] + ORG[set][2]];

// ---------------- voice timing (seconds, from voice/timing.json) ----------------
export const SENT = [[0.4, 6.83], [7.53, 11.7], [12.4, 17.48], [18.18, 24.05], [24.75, 29.07], [29.77, 35.46], [36.16, 40.81], [41.51, 47.71], [48.41, 56.05]];

// ---------------- events (seconds) ----------------
export const T_PURSE = 1.7;        // the king turns his purse out: nothing
export const T_FLASH = 5.4;        // flash-forward: the crown in the basket
export const T_CANNON = 26.0;
export const T_DROP_KING = 34.9;   // "...the guillotine"
export const T_DROPS = [36.4, 37.9, 38.3, 38.7, 39.1, 39.5, 39.9, 40.3]; // "Luckily, it was fast. Unluckily, it stayed busy."
export const T_DROP_ROB = 47.25;   // Robespierre, "the same treatment"
export const T_CROWN_HEAD = 55.0;  // Napoleon sits down, crowned

/** blade drop amount 0 (up) .. 1 (down): falls in 4 frames, is hoisted back 0.5 s later */
export const bladeAt = (t: number, shot: number) => {
  if (shot === 3) return 1; // flash-forward frame: blade already down
  const evs = [T_DROP_KING, ...T_DROPS, T_DROP_ROB];
  let v = 0;
  for (const e of evs) {
    if (t >= e && t < e + 0.13) v = Math.max(v, (t - e) / 0.13);
    else if (t >= e + 0.13 && t < e + 0.55) v = Math.max(v, 1);
    else if (t >= e + 0.55 && t < e + 0.95) v = Math.max(v, 1 - (t - e - 0.55) / 0.4);
  }
  return v;
};

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

export type ShotDef = { id: number; set: SetName; a: number; b: number; keys: Key[]; cInf: number; focus?: V3 };
const mk = (id: number, set: SetName, t0: number, t1: number, keys: ((a: number) => Key[]), cInf = 0, focus?: V3): ShotDef =>
  ({ id, set, a: F(t0), b: F(t1), keys: keys(F(t0)), cInf, focus });
const K = (f: number, s: (f: number) => Shot, extra: Partial<Key> = {}): Key => ({ f, s, ...extra });

export const SHOTS: ShotDef[] = [
  // --- hook ---
  mk(1, "hall", 0, 3.2, (a) => [K(a, cam("hall", [2.8, 2.0, -1.0], [0, 1.6, -8.6], a, 0.0025, { fov: 50 }))], 0),
  mk(2, "hall", 3.2, 5.4, (a) => [K(a, cam("hall", [0.5, 2.0, -5.0], [0, 1.75, -8.4], a, 0.003, { fov: 32, roll: -0.035 }))], 13, [0, 1.8, -8.4]),
  mk(3, "square", 5.4, 7.5, (a) => [K(a, cam("square", [2.4, 2.7, -3.6], [0, 1.8, -7.2], a, 0.002, { fov: 34, roll: 0.04 }))], 10),
  // --- bread ---
  mk(4, "street", 7.5, 9.8, (a) => [K(a, cam("street", [6.0, 2.2, 8.0], [-0.2, 1.5, -5.0], a, 0.002, { fov: 46 }))], 0),
  mk(5, "street", 9.8, 12.2, (a) => [K(a, cam("street", [0.8, 1.5, -1.3], [-0.55, 1.45, -3.8], a, 0.003, { fov: 38, roll: -0.03 }))], 13, [-0.8, 1.5, -3.6]),
  // --- taxes ---
  mk(6, "hall", 12.2, 15.2, (a) => [K(a, cam("hall", [1.5, 1.9, 5.5], [-1.0, 1.2, -1.0], a, 0.002, { fov: 58 }))], 0),
  mk(7, "hall", 15.2, 18.1, (a) => [K(a, cam("hall", [0.5, 5.6, 5.5], [0, 0.9, -2.0], a, 0.002, { fov: 56 }))], 0),
  // --- meeting, locked out, oath ---
  mk(8, "hall", 18.1, 20.6, (a) => [K(a, cam("hall", [0, 2.0, 1.5], [0, 1.4, -6.0], a, 0.002, { fov: 56 }))], 0),
  mk(9, "street", 20.6, 22.5, (a) => [K(a, cam("street", [3.0, 1.7, -6.0], [0, 1.6, -13.4], a, 0.0025, { fov: 44, roll: 0.035 }))], 8, [0, 1.6, -11]),
  mk(10, "hall", 22.5, 24.8, (a) => [K(a, cam("hall", [0, 1.9, 3.5], [0, 1.9, -3.0], a, 0.003, { fov: 46 }, 0.006))], 6, [0, 1.8, -2.4]),
  // --- Bastille ---
  mk(11, "bast", 24.8, 27.4, (a) => [K(a, cam("bast", [-7.0, 2.2, 8.5], [0, 5.5, -14.0], a, 0.002, { fov: 52 }))], 0),
  mk(12, "bast", 27.4, 29.8, (a) => [K(a, cam("bast", [0, 1.5, 3.5], [0, 1.3, -7.0], a, 0.003, { fov: 60 }))], 9, [0, 1.4, -7.0]),
  // --- the monarchy falls, the guillotine ---
  mk(13, "hall", 29.8, 32.5, (a) => [K(a, cam("hall", [0, 1.9, -1.5], [0, 1.4, -8.4], a, 0.003, { fov: 52 }))], 7, [0, 1.2, -8.4]),
  mk(14, "square", 32.5, 36.0, (a) => [K(a, cam("square", [4.5, 2.4, 7.0], [0, 2.0, -7.0], a, 0.0022, { fov: 46 })), K(a + F(1.4), cam("square", [1.0, 1.6, -2.8], [0, 2.1, -7.0], a + F(1.4), 0.003, { fov: 36 }), { dur: 26 })], 0),
  // --- the Terror ---
  mk(15, "square", 36.0, 38.8, (a) => [K(a, cam("square", [4.2, 1.6, -2.4], [0, 2.2, -7.2], a, 0.002, { fov: 40, roll: -0.04 }))], 8, [0, 2.2, -7.0]),
  mk(16, "square", 38.8, 41.4, (a) => [K(a, cam("square", [7.0, 6.0, 11.0], [0, 1.0, -3.0], a, 0.002, { fov: 54 }))], 0),
  mk(17, "square", 41.4, 44.6, (a) => [K(a, cam("square", [0, 1.7, 6.5], [0, 1.5, -1.0], a, 0.0022, { fov: 50 }))], 0),
  mk(18, "square", 44.6, 48.4, (a) => [K(a, cam("square", [0.4, 1.9, -1.2], [0, 2.4, -7.2], a, 0.003, { fov: 38 }, 0.005))], 11, [0, 2.4, -7.2]),
  // --- Napoleon ---
  mk(19, "square", 48.4, 51.4, (a) => [K(a, cam("square", [5.0, 1.8, 8.0], [-1.0, 1.1, 0.0], a, 0.002, { fov: 48 }))], 0),
  mk(20, "square", 51.4, 54.2, (a) => [K(a, cam("square", [0, 0.9, 4.0], [0, 1.7, -3.0], a, 0.003, { fov: 44, roll: 0.035 }))], 8, [0, 1.8, -3.0]),
  mk(21, "hall", 54.2, 60.0, (a) => [K(a, cam("hall", [0, 1.5, -2.2], [0, 1.45, -8.3], a, 0.0016, { fov: 34 }))], 10, [0, 1.5, -8.3]),
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// kicks: image shake on impacts
const KICKS: [number, number][] = [[T_FLASH, 0.6], [T_CANNON, 0.8], [T_DROP_KING, 1.2], ...T_DROPS.map((t, i) => [t, i ? 0.3 : 0.7] as [number, number]), [T_DROP_ROB, 1.2], [T_CROWN_HEAD, 0.4], [3.6, 0.6]];
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
