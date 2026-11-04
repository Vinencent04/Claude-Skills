// "The Tea Party Over Cheaper Tea": our own ~43 s short about the Boston Tea Party (1773). Timed to teaparty-voice/words.json.
// Three painted sets stand 60 m apart in one scene (hall, shop, dock); every shot is a camera in one of them.
export const FPS = 30;
export const TOTAL = 1302;
export type V3 = [number, number, number];
export type SetName = "hall" | "shop" | "dock";
export const ORG: Record<SetName, V3> = { hall: [0, 0, 0], shop: [60, 0, 0], dock: [120, 0, 0] };
export type LightName = "shop" | "dusk" | "night" | "dawn" | "hall" | "office";
export const D0 = 0; // (build.ts helper)

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const F = (s: number) => Math.round(s * FPS);
export const toW = (set: SetName, p: V3): V3 => [p[0] + ORG[set][0], p[1] + ORG[set][1], p[2] + ORG[set][2]];

// ---------------- events (seconds, from words.json; visuals land ~3 frames before the word) ----------------
export const T_TAG = 5.45;       // "getting cheaper": CHEAPER! tag slaps on the chest
export const T_CUT = 7.85;       // "cut the price": 9d is struck out, 6d appears
export const T_TAX = 10.5;       // "one small tax": the 3d TAX stamp slams down
export const T_REFUSE = 15.0;    // governor shakes his head ("refused")
export const T_MEET = 17.8;      // "held a meeting": fists up
export const T_MARCH = 19.6;     // men march
export const T_OPEN = 24.4;      // "opened every chest" (first lids pop)
export const T_TIP = 25.6;       // "tipped it into the sea" (first chest over the rail)
export const T_COUNT = 29.3;     // "three hundred and forty-two chests" slate
export const T_CLOSE = 32.95;    // "closing Boston Harbor"
export const T_JOIN = 35.45;     // "pushed the colonies together"
export const T_BACK = 37.65;     // "a tax on cheaper tea" (callback)
export const T_CTA = 40.04;
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

// shot frames from teaparty-voice (3 frames before each line / beat)
export const SHOTS: ShotDef[] = [
  // 1 HOOK A (visual): chests fly off the ship toward the lens, camera whip-follows along the pier
  mk(1, "dock", "night", 0, 146, (a) => [K(a, move("dock", [-9, 2.4, 3.2], [-4.5, 3.2, -5], [6.5, 2.3, 3.2], [8.5, 2.8, -5], a, 140, { fov: 62, roll: 0.05 }, 0.0))], 0),
  // 2 HOOK B (visual): hard cut to the calm shop, fast push-in, the CHEAPER! tag slaps on
  mk(2, "shop", "shop", 146, 212, (a) => [K(a, cam("shop", [1.0, 2.3, 1.8], [0.3, 1.7, -5.2], a, 0.0095, { fov: 46, roll: -0.03 }, 0.004))], 7, [0.3, 1.7, -5.2]),
  // 3 price cut: push-in on the chalkboard
  mk(3, "shop", "shop", 212, 281, (a) => [K(a, cam("shop", [-0.3, 2.0, 1.6], [-0.3, 1.9, -5.0], a, 0.0042, { fov: 42, roll: 0.03 }))], 9, [-0.3, 1.9, -5.0]),
  // 4 the tax: slam on the chest
  mk(4, "shop", "shop", 281, 356, (a) => [K(a, cam("shop", [1.6, 2.0, -0.2], [0.6, 1.5, -4.6], a, 0.0075, { fov: 42, roll: -0.04 }, 0.004))], 10, [0.6, 1.5, -4.6]),
  // 5 three ships: dolly along the pier, tilt up the masts
  mk(5, "dock", "dusk", 356, 436, (a) => [K(a, move("dock", [-27, 2.6, 6], [-9, 4.2, -6], [-16, 1.8, 6], [-2, 9.0, -6], a, 74, { fov: 62, roll: 0.03 }, 0.0))], 0),
  // 6 the governor refuses
  mk(6, "hall", "office", 436, 503, (a) => [K(a, cam("hall", [17.2, 2.2, -0.3], [18.5, 2.0, -6.3], a, 0.0065, { fov: 44, roll: 0.03 }, 0.0))], 9, [18.5, 2.0, -6.3]),
  // 7 the meeting: low push-in on the crowd
  mk(7, "hall", "hall", 503, 586, (a) => [K(a, cam("hall", [0.5, 1.7, 5.5], [0, 2.1, -4.0], a, 0.0045, { fov: 50, roll: -0.04 }, 0.004))], 8, [0, 2.0, -4.0]),
  // 8 the march: low, camera retreats down the pier ahead of the men
  mk(8, "dock", "night", 586, 695, (a) => [K(a, move("dock", [13, 1.1, 6.5], [0, 1.9, 6.0], [19, 1.4, 6.5], [4, 2.2, 6.0], a, 100, { fov: 60, roll: 0.05 }, 0.0))], 0),
  // 9 tipping the chests over the rail
  mk(9, "dock", "night", 695, 830, (a) => [K(a, move("dock", [-5, 2.7, 2.4], [-1, 3.2, -5.2], [3, 2.6, 2.8], [2, 3.0, -5.2], a, 128, { fov: 54, roll: -0.03 }, 0.0))], 7, [0, 2.5, -4.2]),
  // 10 the count: slow descent over the floating chests
  mk(10, "dock", "night", 830, 961, (a) => [K(a, move("dock", [3, 7.0, 7.0], [0, -1.0, -3.5], [1.5, 3.4, 3.5], [0, -0.5, -3.0], a, 124, { fov: 56, roll: 0.03 }, 0.0))], 6, [0, -0.5, -3.0]),
  // 11 the harbor is closed: pull-back to the warship
  mk(11, "dock", "dawn", 961, 1046, (a) => [K(a, move("dock", [0, 2.4, 5.0], [0, 2.0, 0.5], [0, 6.0, 22], [0, 3.0, -24], a, 80, { fov: 52 }, 0.0))], 0),
  // 12 the colonies join: push-in on the map
  mk(12, "hall", "hall", 1046, 1114, (a) => [K(a, cam("hall", [0.3, 3.1, 4.2], [0, 3.2, -9.0], a, 0.0075, { fov: 40, roll: 0.025 }, 0.003))], 9, [0, 3.2, -9.0]),
  // 13 callback: cheaper tea with a tax tag on it
  mk(13, "shop", "shop", 1114, 1198, (a) => [K(a, cam("shop", [0.0, 1.9, 2.0], [0.2, 1.4, -4.6], a, 0.0035, { fov: 40, roll: 0.03 }))], 9, [0.1, 1.4, -4.6]),
  // 14 CTA: quiet dock, one teacup, slow pull-back
  mk(14, "dock", "night", 1198, 1302, (a) => [K(a, move("dock", [0.2, 1.4, 6.0], [0.6, 1.1, 3.0], [0.2, 3.0, 13.5], [0, 2.0, -1.0], a, 100, { fov: 50 }, 0.0012))], 5, [0.6, 1.1, 3.0]),
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// kicks: image shake on impacts
const KICKS: [number, number][] = [[T_TAG, 0.8], [T_TAX, 1.2], [T_TIP + 0.5, 0.4], [T_CLOSE, 1.0]];
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
