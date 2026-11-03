// "The Pancake Problem": our own 15 s kitchen short (no dialogue). A cook flips a pancake with a flourish, it sticks to the
// ceiling over the table where his kid eats cereal, slowly peels off, and lands on the kid's head. Camera grammar from the
// bridge skill (cuts on big jumps, smootherstep glides 18-40 f, every hold creeps, flip-kicks on impacts, DOF per beat).
export const FPS = 30;
export const TOTAL = 900;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

// ---------------- places (metres; room x -3.4..3.4, z -3.0..2.6, y 0..2.9) ----------------
export const COOK: V3 = [-0.35, 0, -1.95];
export const KID: V3 = [1.9, 0.5, -0.8]; // seat base (the kid sits behind the round table)
export const TABLE: V3 = [1.9, 0, 0.1];
export const CEIL_Y = 2.88;
export const STICK: V3 = [1.9, CEIL_Y, -0.55]; // above the kid's head
export const HEAD: V3 = [1.9, 1.42, -0.8]; // where the pancake lands
export const PAN_AT: V3 = [COOK[0] + 0.55, 1.02, COOK[2] + 0.02];

// ---------------- timeline (seconds) ----------------
export const T_WIND = 4.15;   // wind-up starts
export const T_TOSS = 5.0;    // flick: the cake leaves the pan
export const T_STICK = 6.05;  // splat on the ceiling
export const T_PEEL = 9.6;    // starts to sag
export const T_FALL = 12.95;  // lets go
export const T_LAND = 13.25;  // plop on the kid's head
export const T_LICK = 14.2;
// act 2 (15-30 s): the cook tries once more; the second pancake sticks over HIS head, peels, and lands on his hat
export const T2_WIND = 18.2, T2_TOSS = 19.0, T2_STICK = 20.0, T2_PEEL = 23.0, T2_FALL = 27.6, T2_LAND = 27.9, T2_LICK = 29.15;
export const STICK2: V3 = [-0.3, CEIL_Y, -1.55];
export const HEAD2: V3 = [-0.35, 2.06, -1.85];

/** cake flight from the pan to the ceiling: x/z linear, y eases out and arrives at the ceiling with no speed */
export const cakeFlight = (t: number, t0 = T_TOSS, t1 = T_STICK, to: V3 = STICK): { p: V3; ry: number; roll: number } => {
  const u = clamp01((t - t0) / (t1 - t0));
  return {
    p: [PAN_AT[0] + (to[0] - PAN_AT[0]) * u, PAN_AT[1] + (CEIL_Y - 0.16 - PAN_AT[1]) * (1 - (1 - u) ** 2), PAN_AT[2] + (to[2] - PAN_AT[2]) * u],
    ry: 10 + 80 * Math.abs(Math.cos(Math.PI * 2.5 * u)), roll: 0.35 * Math.sin(u * 7),
  };
};
/** drop from the ceiling onto a head (accelerating) */
export const cakeFall = (t: number, f0 = T_FALL, f1 = T_LAND, from: V3 = STICK, to: V3 = HEAD): V3 => {
  const u = clamp01((t - f0) / (f1 - f0));
  return [from[0] + (to[0] - from[0]) * u, from[1] - 0.1 - (from[1] - 0.1 - to[1]) * u * u, from[2] + (to[2] - from[2]) * u];
};

// ---------------- cameras ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
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
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

const F = (s: number) => Math.round(s * FPS);
// shot boundaries (frames)
export const B = { s2: F(2.6), s3: F(T_TOSS) - 3, s4: F(6.4), s5: F(8.3), s6: F(11.0), s7: F(12.4), s8: F(13.75), s9: F(14.45),
  s10: F(15), s11: F(17.5), s12: F(T2_TOSS) - 3, s13: F(21), s14: F(23), s15: F(26), s16: F(27.6), s17: F(29) };

const S1 = (f: number) => dolly([2.3, 1.6, 1.7], [-0.9, 1.2, -1.8], pushK(f, 0, 0.0025), { fov: 56 });
const S2a = (f: number) => dolly([0.7, 1.45, 1.0], [-0.2, 1.3, -1.95], pushK(f, B.s2, 0.0022), { fov: 40 });
const S2b = (f: number) => dolly([0.3, 1.5, 0.3], [-0.25, 1.4, -1.95], pushK(f, B.s2 + 50, 0.003), { fov: 34, roll: -0.04 });
/** low camera that follows the cake: starts at the pan, ends looking at the ceiling spot */
const S3 = (f: number): Shot => {
  const t = T(f), fl = cakeFlight(Math.max(T_TOSS, t - 0.06)).p, u = glide((t - (T_TOSS - 0.1)) / 0.7);
  const look: V3 = [PAN_AT[0] + (fl[0] - PAN_AT[0]) * 1, PAN_AT[1] + (fl[1] - PAN_AT[1]) * 1, PAN_AT[2] + (fl[2] - PAN_AT[2]) * 1];
  return { pos: [-0.25 + 0.2 * u, 0.55 + 0.1 * u, -0.9], look: t < T_STICK ? look : STICK, fov: 52 - 4 * u, roll: 0.07 * u };
};
const S4 = (f: number) => dolly([-0.15, 1.5, 0.05], [-0.33, 1.48, -1.95], pushK(f, B.s4, 0.003), { fov: 30, roll: -0.035 });
const S5 = (f: number) => dolly([0.9, 1.25, 1.7], [1.9, 1.75, -0.7], pushK(f, B.s5, 0.002), { fov: 62 });
const S6 = (f: number) => dolly([1.0, 0.8, 1.2], [1.9, 2.45, -0.35], pushK(f, B.s6, 0.0025, 0.006, 30), { fov: 56, roll: 0.045 });
const S7 = (f: number) => dolly([1.45, 1.3, 1.45], [1.9, 1.15, -0.8], pushK(f, B.s7, 0.0025), { fov: 36 });
const S8 = (f: number) => dolly([-0.2, 1.55, -0.3], [-0.33, 1.5, -1.95], pushK(f, B.s8, 0.004), { fov: 28, roll: 0.04 });
const S9 = (f: number) => dolly([1.75, 1.25, 0.9], [1.9, 1.12, -0.8], pushK(f, B.s9, 0.003), { fov: 30 });

const S10 = (f: number) => dolly([2.3, 1.6, 1.7], [-0.1, 1.3, -1.5], pushK(f, B.s10, 0.002), { fov: 54 });
const S11 = (f: number) => dolly([0.7, 1.45, 1.0], [-0.2, 1.3, -1.95], pushK(f, B.s11, 0.0022), { fov: 40 });
const S12 = (f: number): Shot => {
  const t = T(f), fl = cakeFlight(Math.max(T2_TOSS, t - 0.06), T2_TOSS, T2_STICK, STICK2).p, u = glide((t - (T2_TOSS - 0.1)) / 0.7);
  return { pos: [-0.35 + 0.2 * u, 0.55 + 0.1 * u, -0.9], look: t < T2_STICK ? fl : STICK2, fov: 52 - 4 * u, roll: -0.07 * u };
};
const S13 = (f: number) => dolly([-0.15, 1.5, 0.05], [-0.33, 1.5, -1.95], pushK(f, B.s13, 0.003), { fov: 30, roll: 0.035 });
const S14 = (f: number) => dolly([1.3, 1.35, 1.7], [0.45, 1.75, -1.5], pushK(f, B.s14, 0.002), { fov: 60 });
const S15 = (f: number) => dolly([-0.55, 0.9, -0.5], [-0.33, 2.45, -1.75], pushK(f, B.s15, 0.0025, 0.006, 30), { fov: 56, roll: -0.045 });
const S16 = (f: number) => dolly([0.2, 1.55, 0.4], [-0.33, 1.65, -1.95], pushK(f, B.s16, 0.003), { fov: 36 });
const S17 = (f: number) => dolly([1.75, 1.3, 0.9], [1.9, 1.3, -0.8], pushK(f, B.s17, 0.003), { fov: 30 });

const CAMS: Key[] = [
  { f: 0, s: S1 },
  { f: B.s2, cut: true, s: S2a },
  { f: B.s2 + 50, dur: 28, s: S2b },
  { f: B.s3, cut: true, s: S3 },
  { f: B.s4, cut: true, s: S4 },
  { f: B.s5, cut: true, s: S5 },
  { f: B.s6, cut: true, s: S6 },
  { f: B.s7, cut: true, s: S7 },
  { f: B.s8, cut: true, s: S8 },
  { f: B.s9, cut: true, s: S9 },
  { f: B.s10, cut: true, s: S10 },
  { f: B.s11, cut: true, s: S11 },
  { f: B.s12, cut: true, s: S12 },
  { f: B.s13, cut: true, s: S13 },
  { f: B.s14, cut: true, s: S14 },
  { f: B.s15, cut: true, s: S15 },
  { f: B.s16, cut: true, s: S16 },
  { f: B.s17, cut: true, s: S17 },
];

const KICKS: [number, number][] = [[T_TOSS, 0.4], [T_STICK, 1.0], [T_LAND, 1.4], [T2_TOSS, 0.3], [T2_STICK, 1.0], [T2_LAND, 1.4]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (f: number): Cam => {
  const c = run(CAMS, f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens (cInf = blur radius in px at 1080 for things at infinity) ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const cookEyes = (): V3 => [COOK[0], 1.52, COOK[2]];
const kidEyes = (): V3 => [KID[0], 1.2, KID[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                         // establishing wide, sharp
  { f: B.s2, cInf: 11, focus: cookEyes },                    // MS on the cook
  { f: B.s2 + 50, dur: 28, cInf: 14, focus: cookEyes },
  { f: B.s3, cInf: 6 },                                      // cake follow: focus = look
  { f: B.s4, cInf: 14, focus: cookEyes },                    // CU, eyes
  { f: B.s5, cInf: 0 },                                      // wide
  { f: B.s6, cInf: 10 },                                     // pancake overhead, focus = look
  { f: B.s7, cInf: 12, focus: kidEyes },                     // kid MS
  { f: B.s8, cInf: 14, focus: cookEyes },
  { f: B.s9, cInf: 14, focus: kidEyes },
  { f: B.s10, cInf: 0 },
  { f: B.s11, cInf: 11, focus: cookEyes },
  { f: B.s12, cInf: 6 },
  { f: B.s13, cInf: 14, focus: cookEyes },
  { f: B.s14, cInf: 0 },
  { f: B.s15, cInf: 10 },
  { f: B.s16, cInf: 12, focus: () => [COOK[0], 1.6, COOK[2]] },
  { f: B.s17, cInf: 14, focus: kidEyes },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const D0 = 0; // unused by the kitchen (build.ts helper leftover)
