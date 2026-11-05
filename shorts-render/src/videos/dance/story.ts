// "The Dancing Plague of 1518": our own ~52 s short. Continuous narration (no pauses) with per-line delivery, timed to dance-voice/words.json.
// Three painted sets stand 60 m apart in one scene (street = Strasbourg's square, guild = the guildhall with the stage, shrine = the hill chapel).
export const FPS = 30;
export const TOTAL = 1560;
export type V3 = [number, number, number];
export type SetName = "street" | "guild" | "shrine";
export const ORG: Record<SetName, V3> = { street: [0, 0, 0], guild: [60, 0, 0], shrine: [120, 0, 0] };
export type LightName = "day" | "dusk" | "night" | "dawn" | "guild" | "party";
export const D0 = 0; // (build.ts helper)

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const F = (s: number) => Math.round(s * FPS);
export const toW = (set: SetName, p: V3): V3 => [p[0] + ORG[set][0], p[1] + ORG[set][1], p[2] + ORG[set][2]];

// ---------------- events (seconds, from words.json; visuals land ~3 frames before the word) ----------------
export const T_START = 3.4;       // "started to dance"
export const T_JOIN = 6.9;        // "thirty-four more people had joined her"
export const T_HUNDREDS = 9.7;    // "there were hundreds"
export const T_BLED = 11.8;       // "feet bled"
export const T_EAT = 12.85;       // "did not eat"
export const T_REST = 13.75;      // "did not rest"
export const T_NOSTOP = 14.3;     // "could not stop"
export const T_DOCTORS = 15.3;    // "the doctors"
export const T_HOT = 17.6;        // "hot blood"
export const T_CURE = 19.15;      // "More dancing"
export const T_OPEN = 20.4;       // "opened its guildhalls"
export const T_STAGE = 21.9;      // "built a wooden stage"
export const T_MUSIC = 23.1;      // "hired musicians"
export const T_WORSE = 26.0;      // "only got worse"
export const T_DEATH = 28.5;      // "to death"
export const T_BAN = 30.2;        // "banned music"
export const T_TEAR = 31.1;       // "tore down the stage"
export const T_SHRINE = 33.5;     // "a shrine in the mountains"
export const T_SHOES = 35.35;     // "red shoes"
export const T_CROSS = 36.35;     // "wooden crosses"
export const T_PRAY = 37.6;       // "told to pray"
export const T_STOPPED = 39.1;    // "the dancing stopped"
export const T_WHY = 40.3;        // "Nobody knows why"
export const T_BREAD = 41.7;      // "poisoned bread"
export const T_HYST = 43.15;      // "mass hysteria"
export const T_PARTY = 47.1;      // "throw a dance party"
export const T_CTA = 48.3;

/** per-frame light (shot 2 is a day-to-night time-lapse, everything else is the shot's light) */
export const lightOverride = (f: number, shotId: number, a: number): LightName | null => {
  if (shotId !== 2) return null;
  const k = (f - a) / 51;
  return k < 0.25 ? "day" : k < 0.5 ? "dusk" : k < 0.75 ? "night" : "dawn";
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
/** shot 2: low orbit around the dancing woman (time-lapse) */
const orbit = (f: number): Shot => { const a = 0.3 + (f - 137) * 0.058; return { pos: toW("street", [6.2 * Math.sin(a), 1.3, -6 + 6.2 * Math.cos(a)]), look: toW("street", [0, 1.6, -6]), fov: 56, roll: 0.05 }; };

// shot frames from dance-voice/words.json (3 frames before each beat)
export const SHOTS: ShotDef[] = [
  mk(1, "street", "day", 0, 137, (a) => [K(a, move("street", [5.5, 1.8, 3.2], [0, 1.7, -6], [-4.5, 1.7, 0.5], [0, 1.7, -6], a, 120, { fov: 54, roll: 0.03 }, 0.002))], 0),
  mk(2, "street", "day", 137, 188, (a) => [K(a, orbit)], 0),
  mk(3, "street", "day", 188, 265, (a) => [K(a, cam("street", [0, 2.0, 5.5], [0, 1.6, -7], a, 0.0055, { fov: 54, roll: 0.03 }))], 6, [0, 1.6, -7]),
  mk(4, "street", "day", 265, 322, (a) => [K(a, move("street", [0, 5, 5], [0, 0.5, -8], [0, 27, 24], [0, 0, -8], a, 50, { fov: 56, roll: 0.02 }, 0.0))], 0),
  mk(5, "street", "day", 322, 370, (a) => [K(a, cam("street", [0.3, 0.55, -2.2], [0, 0.9, -6.0], a, 0.004, { fov: 54, roll: 0.04 }))], 9, [0, 0.9, -6.0]),
  mk(6, "street", "day", 370, 458, (a) => [K(a, move("street", [-6, 1.7, -1], [-2, 1.6, -6], [6, 1.7, -1], [2, 1.6, -6], a, 85, { fov: 52, roll: 0.03 }, 0.0))], 0),
  mk(7, "street", "day", 458, 498, (a) => [K(a, cam("street", [-1.0, 1.8, 3.2], [0, 1.8, -5.5], a, 0.005, { fov: 48, roll: 0.03 }))], 7, [0, 1.8, -5.5]),
  mk(8, "street", "day", 498, 549, (a) => [K(a, cam("street", [1.4, 1.9, -2.8], [0, 1.8, -6.0], a, 0.007, { fov: 44, roll: -0.03 }))], 10, [0, 1.8, -6.0]),
  mk(9, "street", "day", 549, 599, (a) => [K(a, cam("street", [0, 1.8, 0.6], [0, 2.0, -5.6], a, 0.01, { fov: 46, roll: 0.02 }, 0.004))], 9, [0, 2.0, -5.6]),
  mk(10, "guild", "guild", 599, 752, (a) => [K(a, move("guild", [-8, 6.0, 8], [0, 2.0, -8], [0, 2.6, 3], [0, 2.0, -10], a, 120, { fov: 54, roll: 0.03 }, 0.002))], 0),
  mk(11, "guild", "guild", 752, 802, (a) => [K(a, cam("guild", [0, 2.0, 2.5], [0, 2.0, -8], a, 0.0045, { fov: 52, roll: 0.04 }, 0.003))], 6, [0, 2.0, -8]),
  mk(12, "guild", "guild", 802, 874, (a) => [K(a, cam("guild", [1.2, 1.4, -1.5], [0, 1.4, -5.0], a, 0.005, { fov: 44, roll: 0.03 }))], 9, [0, 1.4, -5.0]),
  mk(13, "guild", "guild", 874, 970, (a) => [K(a, cam("guild", [3.0, 2.2, 2.0], [-0.5, 2.0, -9.0], a, 0.004, { fov: 48, roll: -0.03 }))], 8, [-0.5, 2.0, -9.0]),
  mk(14, "shrine", "dawn", 970, 1045, (a) => [K(a, move("shrine", [-8, 1.8, 8], [0, 2.2, 3], [-8, 4.5, -4], [0, 5, -8], a, 70, { fov: 54, roll: 0.03 }, 0.0))], 0),
  mk(15, "shrine", "dawn", 1045, 1153, (a) => [K(a, cam("shrine", [-4, 6.8, -12], [0, 6.4, -17], a, 0.004, { fov: 50, roll: 0.03 }))], 8, [0, 6.4, -17]),
  mk(16, "shrine", "dawn", 1153, 1208, (a) => [K(a, move("shrine", [0, 6.2, -13], [0, 6.4, -20], [3, 9, -3], [0, 5.8, -18], a, 90, { fov: 54, roll: 0.02 }, 0.0012))], 0),
  mk(17, "street", "dusk", 1208, 1330, (a) => [K(a, cam("street", [0.6, 1.8, -0.5], [0, 1.8, -6], a, 0.004, { fov: 46, roll: 0.03 }))], 8, [0, 1.8, -6]),
  mk(18, "guild", "party", 1330, 1448, (a) => [K(a, move("guild", [-6, 2.2, 2], [0, 2.6, -8], [6, 2.2, 2], [0, 2.6, -8], a, 110, { fov: 56, roll: 0.04 }, 0.002))], 0),
  mk(19, "street", "night", 1448, 1560, (a) => [K(a, move("street", [0.5, 1.1, 1.5], [0.3, 0.4, -3], [1.5, 3.2, 9], [0, 1.4, -4], a, 100, { fov: 50, roll: 0.02 }, 0.0012))], 6, [0.3, 0.4, -3]),
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// kicks: image shake on impacts
const KICKS: [number, number][] = [[T_CURE, 1.0], [T_DEATH, 0.5], [T_TEAR, 1.0], [T_HYST, 0.4]];
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
