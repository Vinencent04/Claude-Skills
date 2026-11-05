// "The Corpse That Lost Its Trial" (the Cadaver Synod, 897): our own ~53 s short. Continuous narration (no pauses) timed to cadaver-voice/words.json.
// Three painted sets stand 60 m apart in one scene (church, night = graveyard + river, cell); every shot is a camera in one of them.
export const FPS = 30;
export const TOTAL = 1600;
export type V3 = [number, number, number];
export type SetName = "church" | "night" | "cell";
export const ORG: Record<SetName, V3> = { church: [0, 0, 0], night: [60, 0, 0], cell: [120, 0, 0] };
export type LightName = "church" | "night" | "dawn" | "cell";
export const D0 = 0; // (build.ts helper)

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const F = (s: number) => Math.round(s * FPS);
export const toW = (set: SetName, p: V3): V3 => [p[0] + ORG[set][0], p[1] + ORG[set][1], p[2] + ORG[set][2]];

// ---------------- events (seconds, from words.json; visuals land ~3 frames before the word) ----------------
export const T_POP = 0.5;        // hook A: the corpse rises out of the grave
export const T_GAVEL = 5.55;     // "the corpse lost": gavel + slump + stamp
export const T_HATE = 6.95;      // "hated": the portrait is crossed out
export const T_MONTHS = 11.0;    // "nine months"
export const T_CARE = 12.9;      // "did not care"
export const T_DIG = 13.9;       // "dug up the body"
export const T_ROBE = 15.0;      // "dressed it"
export const T_MITRE = 16.3;     // "papal robes": the mitre lands
export const T_Q = 21.2;         // the deacon answers
export const T_OATH = 25.4;      // "lying under oath"
export const T_ILL = 26.8;       // "illegally"
export const T_SILENT = 28.9;    // "said nothing"
export const T_GUILTY = 30.4;    // "guilty": gavel
export const T_TEAR = 31.2;      // "tore off his robes"
export const T_SNIP = 32.4;      // "cut off the three fingers"
export const T_THROW = 35.0;     // "threw the body"
export const T_SPLASH = 36.35;   // "into the river Tiber"
export const T_TURN = 38.5;      // "turned on Stephen"
export const T_PRISON = 40.3;    // "thrown in prison"
export const T_ALIVE = 41.75;    // "did not come out alive": the light goes out
export const T_FISH = 43.1;      // "a fisherman found"
export const T_TOMB = 45.0;      // "put it back in its tomb"
export const T_LAW = 47.6;       // "made it illegal"
export const T_LAWSTAMP = 48.9;  // "on trial": the decree stamp
export const T_CTA = 49.85;
/** hook A: throne carried away: x(t) */
export const throneX = (t: number) => 5.0 * Math.max(0, t - 1.1);
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
/** hook A: whip-follow of the carried throne */
const follow = (f: number): Shot => {
  const t = f / FPS, c = 0.3 * Math.min(t, 1.1) + throneX(t) * 0.92 + 0.5 * Math.max(0, t - 1.1);
  return { pos: toW("night", [c - 3.4, 1.6, 3.6]), look: toW("night", [c + 0.6, 1.6, -4.4]), fov: 58, roll: 0.05 };
};

// shot frames from cadaver-voice/words.json (3 frames before each beat)
export const SHOTS: ShotDef[] = [
  // 1 HOOK A (visual): the corpse climbs out of its grave, is sat on a throne and carried off; whip-follow
  mk(1, "night", "night", 0, 115, (a) => [K(a, follow)], 0),
  // 2 HOOK B (visual): the trial: the corpse slumps on the throne, gavel, "LOST" stamp
  mk(2, "church", "church", 115, 188, (a) => [K(a, cam("church", [0.6, 2.5, -2.4], [0, 2.1, -16.0], a, 0.0055, { fov: 46, roll: 0.03 }, 0.004))], 8, [0, 2.1, -16.0]),
  // 3 Stephen hates Formosus
  mk(3, "church", "church", 188, 275, (a) => [K(a, cam("church", [1.2, 2.1, -5.4], [-0.4, 2.1, -10.8], a, 0.0065, { fov: 44, roll: -0.03 }))], 9, [0, 2.1, -10.8]),
  // 4 dead for nine months
  mk(4, "night", "night", 275, 370, (a) => [K(a, cam("night", [0.4, 1.6, 1.8], [0, 1.6, -5.0], a, 0.0062, { fov: 44, roll: 0.03 }))], 9, [0, 1.6, -5.0]),
  // 5 Stephen does not care
  mk(5, "night", "night", 370, 405, (a) => [K(a, cam("night", [0.8, 1.9, 1.2], [0, 1.9, -3.2], a, 0.01, { fov: 44, roll: -0.04 }, 0.004))], 10, [0, 1.9, -3.2]),
  // 6 his men dig up the body
  mk(6, "night", "night", 405, 447, (a) => [K(a, move("night", [-6, 1.8, 3.0], [0, 1.0, -4.8], [5, 2.0, 2.6], [0, 0.8, -4.8], a, 38, { fov: 56, roll: 0.04 }, 0.0))], 0),
  // 7 dressed in papal robes
  mk(7, "night", "night", 447, 512, (a) => [K(a, cam("night", [-2.6, 1.9, 1.2], [0, 1.9, -4.0], a, 0.0075, { fov: 44, roll: 0.03 }))], 8, [0, 1.9, -4.0]),
  // 8 carried into the church
  mk(8, "church", "church", 512, 588, (a) => [K(a, move("church", [-8.5, 1.8, 6], [0, 1.8, 0], [-8.5, 1.8, -8], [0, 1.8, -12], a, 70, { fov: 56, roll: 0.03 }, 0.0))], 0),
  // 9 the deacon answers for the corpse
  mk(9, "church", "church", 588, 718, (a) => [K(a, cam("church", [3.4, 2.0, -8.8], [0, 1.9, -15.4], a, 0.0035, { fov: 46, roll: -0.03 }))], 8, [0, 1.9, -15.4]),
  // 10 the charges
  mk(10, "church", "church", 718, 829, (a) => [K(a, move("church", [-3.6, 2.0, -2.0], [0, 2.0, -9.0], [3.6, 2.0, -2.0], [0, 2.0, -9.0], a, 100, { fov: 50, roll: 0.03 }, 0.002))], 0),
  // 11 the corpse says nothing
  mk(11, "church", "church", 829, 888, (a) => [K(a, cam("church", [0.9, 2.0, -10.8], [0, 1.8, -16.4], a, 0.0075, { fov: 44, roll: 0.03 }))], 9, [0, 1.8, -16.4]),
  // 12 guilty
  mk(12, "church", "church", 888, 931, (a) => [K(a, cam("church", [-1.4, 2.5, -6.4], [0, 2.2, -14.6], a, 0.008, { fov: 46, roll: -0.04 }, 0.004))], 8, [0, 2.2, -14.6]),
  // 13 robes torn off, fingers cut
  mk(13, "church", "church", 931, 1044, (a) => [K(a, cam("church", [2.3, 1.9, -11.2], [0, 1.9, -16.0], a, 0.0045, { fov: 44, roll: 0.03 }))], 9, [0, 1.9, -16.0]),
  // 14 into the Tiber
  mk(14, "night", "night", 1044, 1107, (a) => [K(a, move("night", [-4.5, 2.2, -6.0], [0, 0.6, -14.5], [4.0, 1.3, -7.5], [0, -0.8, -17], a, 55, { fov: 54, roll: 0.04 }, 0.0))], 0),
  // 15 the mob storms the nave
  mk(15, "church", "church", 1107, 1191, (a) => [K(a, cam("church", [0, 1.8, -10.5], [0, 1.8, 4], a, 0.004, { fov: 58, roll: 0.03 }, 0.002))], 0),
  // 16 prison
  mk(16, "cell", "cell", 1191, 1273, (a) => [K(a, cam("cell", [0.3, 1.6, 3.6], [-0.4, 1.3, -4.0], a, 0.0038, { fov: 46, roll: 0.03 }))], 8, [0, 1.4, -3.0]),
  // 17 the fisherman finds the body
  mk(17, "night", "dawn", 1273, 1332, (a) => [K(a, cam("night", [1.4, 1.5, -8.0], [0, 1.0, -14.5], a, 0.005, { fov: 46, roll: -0.03 }))], 8, [0, 0.5, -14.5]),
  // 18 back in its tomb
  mk(18, "night", "dawn", 1332, 1399, (a) => [K(a, move("night", [4.4, 1.7, -0.4], [6, 1.2, -4.2], [1.5, 3.2, 6], [6, 1.2, -4.2], a, 66, { fov: 52, roll: 0.03 }, 0.0))], 0),
  // 19 the new law
  mk(19, "church", "church", 1399, 1493, (a) => [K(a, cam("church", [0.2, 2.1, -5.0], [-0.2, 2.0, -11.4], a, 0.004, { fov: 48, roll: 0.03 }))], 8, [-0.2, 2.0, -11.4]),
  // 20 CTA: the mitre on a gravestone, slow pull-back
  mk(20, "night", "dawn", 1493, 1600, (a) => [K(a, move("night", [0.4, 1.6, 3.8], [0.2, 1.3, -5], [1.5, 3.0, 11], [0, 1.6, -5], a, 100, { fov: 50 }, 0.0012))], 5, [0.2, 1.3, -5]),
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// kicks: image shake on impacts
const KICKS: [number, number][] = [[T_GAVEL, 1.0], [T_GUILTY, 1.2], [T_SNIP, 0.6], [T_LAWSTAMP, 0.8], [T_SPLASH, 0.5]];
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
