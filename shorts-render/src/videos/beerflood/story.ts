// "The Beer Flood": our own ~50 s short about the London Beer Flood of 1814. Shots are timed to beerflood-voice/words.json.
// Five painted sets stand 60 m apart in one scene (lane, office, brewery yard, brewery hall, courtroom); every shot is a camera in one.
export const FPS = 30;
export const TOTAL = 1520;
export type V3 = [number, number, number];
export type SetName = "lane" | "office" | "yard" | "brew" | "court";
export const ORG: Record<SetName, V3> = { lane: [0, 0, 0], office: [60, 0, 0], yard: [120, 0, 0], brew: [180, 0, 0], court: [240, 0, 0] };
export type LightName = "dusk" | "office" | "yard" | "brew" | "court" | "cold";

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const F = (s: number) => Math.round(s * FPS);
export const D0 = 0; // (build.ts helper)
export const toW = (set: SetName, p: V3): V3 => [p[0] + ORG[set][0], p[1] + ORG[set][1], p[2] + ORG[set][2]];

// ---------------- events (seconds, from words.json; visuals land ~3 frames before the word) ----------------
export const T_STAMP = 5.22;        // "It got a tax refund": the stamp lands on the paper (word "got" 5.44)
export const T_COINS = 5.6;         // coins stack up while "tax refund" is spoken
export const T_NOTICE = 21.0;       // the clerk spots the slipped hoop ("noticed" 21.24)
export const T_BURST = 27.15;       // "the vat burst" (burst 27.28)
export const T_WALL = 29.1;         // "smashed" 29.22: the brewery wall goes
export const T_FLOOD = 33.2;        // flood settles in the lane
export const T_ACCIDENT = 40.25;    // "accident" 40.36: the ACCIDENT stamp lands
export const T_GOD = 41.45;         // "an act of God": light falls on the coroner
export const T_REFUND = 44.5;       // "tax refunded" (44.48): owner lifts the refund paper
export const T_END = 49.3;

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
const FA = (s: number) => F(s);

// shot frames from beerflood-voice/shots.json (3 frames before each line's first word)
export const SHOTS: ShotDef[] = [
  // 1 HOOK: low whip-follow ahead of the wave; camera backs up down the lane
  mk(1, "lane", "dusk", 0, 125, (a) => [K(a, move("lane", [0.2, 1.25, 5.5], [0, 2.3, -4.5], [0.4, 1.35, 26], [0, 2.1, 16], a, 120, { fov: 62, roll: 0.05 }, 0.0))], 0),
  // 2 the brewery's refund: hard cut, fast push-in on the desk
  mk(2, "office", "office", 125, 220, (a) => [K(a, cam("office", [0.9, 2.6, 2.4], [0, 1.7, -4.8], a, 0.0065, { fov: 44, roll: -0.03 }, 0.004))], 7, [0, 1.7, -4.8]),
  // 3 crane descent over the rooftops to the brewery gate
  mk(3, "yard", "yard", 220, 352, (a) => [K(a, move("yard", [10, 34, 36], [0, 4, -8], [0, 3.6, 17], [0, 3.8, -4], a, 118, { fov: 56 }, 0.0015))], 0),
  // 4 dolly along the vat, tilt up
  mk(4, "brew", "brew", 352, 532, (a) => [K(a, move("brew", [-9, 1.5, 8.5], [-4, 1.7, 0.5], [-1.5, 1.7, 12.5], [0.5, 4.8, 1.5], a, 130, { fov: 62, roll: 0.03 }, 0.0012))], 0),
  // 5 push-in on the slipped hoop with rack focus
  mk(5, "brew", "brew", 532, 693, (a) => [K(a, cam("brew", [2.2, 2.6, 12.5], [-0.3, 2.4, 4.6], a, 0.0035, { fov: 50, roll: -0.03 }, 0.0))], 12, [-0.3, 2.4, 4.6]),
  // 6 the boss waves it off: creeping hold, then slow pull-out
  mk(6, "brew", "brew", 693, 774, (a) => [K(a, cam("brew", [0.4, 2.4, 11.0], [0.0, 2.4, 4.6], a, 0.0035, { fov: 52 })), K(a + 38, move("brew", [0.4, 2.4, 10.0], [0.0, 2.4, 4.6], [-1.0, 2.6, 13.0], [-0.3, 2.6, 4.0], a + 38, 40, { fov: 54 }), { dur: 36 })], 9, [0.0, 2.4, 4.6]),
  // 7 the vat bursts: hard cut, kicks, whip pan
  mk(7, "brew", "brew", 774, 857, (a) => [K(a, cam("brew", [-3.5, 2.6, 20.0], [0.0, 3.8, 3.0], a, 0.0035, { fov: 56, roll: 0.03 }))], 0),
  // 8 the wave smashes the wall and runs into the lane, camera travels with it
  mk(8, "lane", "dusk", 857, 1030, (a) => [K(a, cam("lane", [0.6, 2.1, -8.0], [0, 2.8, -16.5], a, 0.002, { fov: 56, roll: -0.03 })), K(a + 14, move("lane", [0.6, 2.1, -8.0], [0, 2.8, -16.5], [0.3, 1.5, 20], [0, 2.2, 10], a + 14, 110, { fov: 62, roll: 0.05 }), { dur: 10 })], 0),
  // 9 flooded lane, slow high descent
  mk(9, "lane", "cold", 1030, 1153, (a) => [K(a, move("lane", [1.2, 13.5, 14.0], [-0.5, 2.2, -2], [0.8, 5.4, 9.0], [-0.8, 2.6, -2.5], a, 120, { fov: 54, roll: 0.03 }, 0.0012))], 0),
  // 10 inquest: slow push-in on the coroner
  mk(10, "court", "court", 1153, 1289, (a) => [K(a, cam("court", [0.2, 2.4, 3.6], [0, 2.5, -5.2], a, 0.006, { fov: 48, roll: 0.025 }))], 9, [0, 2.4, -5.2]),
  // 11 the refund: push-in on the owner
  mk(11, "office", "office", 1289, 1385, (a) => [K(a, cam("office", [-0.4, 2.0, -0.6], [0, 1.9, -5.4], a, 0.0075, { fov: 38, roll: 0.03 }, 0.0))], 10, [0, 1.9, -5.4]),
  // 12 empty street, slow pull-back to the wide
  mk(12, "lane", "cold", 1385, 1520, (a) => [K(a, move("lane", [0.1, 1.4, 4.2], [0.6, 1.2, 0.5], [0.2, 3.0, 12.5], [0, 2.0, -3.5], a, 130, { fov: 50 }, 0.0))], 5, [0.6, 1.2, 0.5]),
];
void FA;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// kicks: image shake on impacts
const KICKS: [number, number][] = [[T_BURST, 1.6], [T_BURST + 0.25, 0.9], [T_WALL, 1.2], [T_STAMP, 0.6], [T_ACCIDENT, 0.6]];
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
