// "The War Australia Lost to Birds": our own ~50 s short about the Great Emu War (1932). Timed to emuwar-voice/words.json.
// Two painted sets stand 60 m apart in one scene (farm, office); every shot is a camera in one of them.
export const FPS = 30;
export const TOTAL = 1500;
export type V3 = [number, number, number];
export type SetName = "farm" | "office";
export const ORG: Record<SetName, V3> = { farm: [0, 0, 0], office: [60, 0, 0] };
export type LightName = "day" | "office" | "dusk" | "gold" | "night";
export const D0 = 0; // (build.ts helper)

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const F = (s: number) => Math.round(s * FPS);
export const toW = (set: SetName, p: V3): V3 => [p[0] + ORG[set][0], p[1] + ORG[set][1], p[2] + ORG[set][2]];

// ---------------- events (seconds, from words.json; visuals land ~3 frames before the word) ----------------
export const T_WON = 5.75;       // "the birds won": emu on the truck, confetti
export const T_CROPS = 14.6;     // "eating the crops"
export const T_STAMP = 19.6;     // "sent the army": the stamp
export const T_MAJOR = 21.15;    // "a major"
export const T_SOLD = 22.1;      // "two soldiers"
export const T_GUNS = 23.2;      // "two machine guns"
export const T_ROUNDS = 24.6;    // "thousands of rounds"
export const T_SPLIT = 26.7;     // "split into small groups"
export const T_GUNON = 29.7;     // "machine gun on a truck"
export const T_JAM = 32.95;      // "the gun jammed"
export const T_HOME = 36.3;      // "went home"
export const T_QUOTE = 38.0;     // "the major said"
export const T_EAT = 43.3;       // "kept eating the wheat"
export const T_CTA = 45.62;

/** shared ease for the hook chase (shot 1) */
export const chaseT = (t: number) => t;
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
/** hook chase: herd x and truck x as functions of time (used by ccast/world too) */
export const herdX = (t: number) => 4 - 9.0 * t;
export const truckChaseX = (t: number) => 15 - 6.2 * t;
const chase = (f: number): Shot => {
  const t = f / FPS, w = smooth((t - 2.5) / 0.7);              // whip from the herd to the truck
  const x = (1 - w) * (herdX(t) + 3.6) + w * truckChaseX(t);
  return { pos: toW("farm", [x, 1.45, 2.7]), look: toW("farm", [x - 2.2, 1.9, -6.0]), fov: 62, roll: 0.05 };
};

// shot frames from emuwar-voice (3 frames before each line / beat)
export const SHOTS: ShotDef[] = [
  // 1 HOOK A (visual): the herd outruns the truck; low whip-follow that whips from the emus to the chasing truck
  mk(1, "farm", "day", 0, 164, (a) => [K(a, chase)], 0),
  // 2 HOOK B (visual): hard cut, one emu on the truck, soldiers with their hands up
  mk(2, "farm", "day", 164, 235, (a) => [K(a, cam("farm", [6.0, 2.3, 3.4], [-0.3, 2.1, -6.0], a, 0.0055, { fov: 46, roll: -0.03 }, 0.004))], 7, [-0.3, 2.1, -6.0]),
  // 3 veterans turned farmers: crane descent over the farm
  mk(3, "farm", "day", 235, 385, (a) => [K(a, move("farm", [16, 38, 34], [4, 0, -12], [3, 7, 22], [0, 2, -6], a, 130, { fov: 58, roll: 0.02 }, 0.0))], 0),
  // 4 the emus pour in: dolly through the field
  mk(4, "farm", "day", 385, 518, (a) => [K(a, move("farm", [0, 1.4, 9], [0, 2.0, -26], [0, 1.6, -3], [0, 2.0, -30], a, 120, { fov: 60, roll: 0.03 }, 0.0))], 0),
  // 5 the farmers ask for help
  mk(5, "office", "office", 518, 563, (a) => [K(a, cam("office", [0.4, 2.0, 2.4], [0, 1.8, -4.4], a, 0.007, { fov: 44, roll: 0.03 }))], 8, [0, 1.8, -4.4]),
  // 6 the stamp: sent the army
  mk(6, "office", "office", 563, 631, (a) => [K(a, cam("office", [-0.3, 2.2, 1.6], [0.3, 1.3, -4.6], a, 0.008, { fov: 42, roll: -0.04 }, 0.004))], 9, [0.3, 1.3, -4.6]),
  // 7 the army lines up: pan along the road
  mk(7, "farm", "day", 631, 781, (a) => [K(a, move("farm", [-8, 1.5, 12.5], [-5, 1.4, 6], [7, 1.5, 12.5], [4, 1.4, 6], a, 135, { fov: 54, roll: 0.03 }, 0.0))], 6),
  // 8 the emus scatter: aerial, slow descent
  mk(8, "farm", "day", 781, 879, (a) => [K(a, move("farm", [0, 30, 22], [0, 0, -10], [0, 8, 14], [0, 1, -8], a, 90, { fov: 56, roll: 0.03 }, 0.0))], 0),
  // 9 the gun goes on the truck
  mk(9, "farm", "day", 879, 944, (a) => [K(a, cam("farm", [-6.0, 2.8, 3.6], [0.2, 1.8, -2.8], a, 0.005, { fov: 48, roll: 0.03 }))], 8, [0.2, 1.8, -2.8]),
  // 10 too slow, the gun jams: follow along
  mk(10, "farm", "day", 944, 1032, (a) => [K(a, move("farm", [-8, 1.5, 5], [-3, 1.9, -6], [16, 1.6, 5], [20, 1.9, -6], a, 84, { fov: 56, roll: -0.04 }, 0.0))], 0),
  // 11 the army goes home: dusk pull-back
  mk(11, "farm", "dusk", 1032, 1122, (a) => [K(a, move("farm", [0, 1.8, 12], [0, 1.8, -14], [0, 3.6, 24], [0, 1.8, -14], a, 86, { fov: 52 }, 0.0))], 0),
  // 12 the major's verdict: push-in
  mk(12, "farm", "day", 1122, 1280, (a) => [K(a, cam("farm", [2.6, 1.8, 10.2], [0.2, 2.0, 2.8], a, 0.0035, { fov: 46, roll: 0.03 }))], 9, [0.2, 2.0, 2.8]),
  // 13 the emus keep eating: golden pull-back over the flattened field
  mk(13, "farm", "gold", 1280, 1366, (a) => [K(a, move("farm", [1, 1.6, 3.6], [0, 1.5, -8], [9, 6, 20], [0, 1.0, -10], a, 84, { fov: 56 }, 0.0))], 0),
  // 14 CTA: night, the hat on the fence post
  mk(14, "farm", "night", 1366, 1500, (a) => [K(a, move("farm", [0.3, 1.6, 4.6], [0.1, 1.6, 2.0], [1.2, 3.0, 13], [0, 2.0, -2], a, 110, { fov: 50 }, 0.0012))], 5, [0.2, 1.7, 2.0]),
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// kicks: image shake on impacts
const KICKS: [number, number][] = [[T_WON, 0.8], [T_STAMP, 1.2], [T_JAM, 1.0], [T_SPLIT, 0.5]];
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
