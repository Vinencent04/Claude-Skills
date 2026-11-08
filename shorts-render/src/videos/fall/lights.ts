// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
export const LIGHTS: Record<"day" | "golden", LightPreset> = {
  day: {
    // KITCHEN: warm window sun from the left (set in world.ts), strong cool-warm fill so the room never crushes
    az: 75, el: 48,
    lit: [1.6, 1.42, 1.12], shade: [0.62, 0.6, 0.7], lift: [0.07, 0.07, 0.12], lambert: 0.3, sideK: 0.9, term: 0.25,
    charTint: [1.0, 0.9, 0.78], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.95, 0.92, 0.98],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#f1dcb4", fogNear: 400, fogFar: 900, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.0004, normalBias: 0.02,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<"day" | "golden", WorldLook> = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
};

// ---------------- war-of-the-bucket presets + smooth blending ----------------
import * as THREE from "three";
import type { LightName } from "./story";
export const PRESETS: Record<LightName, LightPreset> = {
  day: { ...LIGHTS.day, az: 60, el: 40, lit: [1.5, 1.25, 0.9], shade: [0.5, 0.5, 0.72], lift: [0.07, 0.07, 0.14], charTint: [1.0, 0.94, 0.84], sunCol: "#ffe6b0", sunI: 2.6, sky: "#cfe0f4", ground: "#8a7a5a", hemiI: 0.68, fogNear: 60, fogFar: 260, fog: "#cfe0ef" },
  night: { ...LIGHTS.day, az: 130, el: 30, lit: [0.75, 0.92, 1.45], shade: [0.46, 0.52, 0.84], lift: [0.05, 0.08, 0.24], charTint: [0.92, 0.96, 1.1], blob: [0.7, 0.72, 0.95], sunCol: "#b0c8ff", sunI: 2.3, sky: "#7088d0", ground: "#4a5a8a", hemiI: 0.62, fogNear: 30, fogFar: 150, fog: "#1c2a5a" },
  dawn: { ...LIGHTS.golden, az: 20, el: 14, lit: [1.55, 1.0, 0.65], shade: [0.5, 0.48, 0.74], lift: [0.08, 0.07, 0.2], charShade: 0.95, ground: "#9a8a80", fogNear: 60, fogFar: 260, fog: "#f0c0a0" },
  grey: { ...LIGHTS.day, az: 70, el: 40, lit: [1.05, 1.08, 1.2], shade: [0.46, 0.5, 0.66], lift: [0.07, 0.07, 0.14], charTint: [0.94, 0.97, 1.04], sunCol: "#e8ecf4", sunI: 2.0, sky: "#c0c8d8", ground: "#8a90a0", hemiI: 0.66, fogNear: 30, fogFar: 150, fog: "#b0b8c8" },
  gold: { ...LIGHTS.golden, az: 15, el: 14, fogNear: 60, fogFar: 300, lit: [1.6, 1.1, 0.7], shade: [0.5, 0.46, 0.7], lift: [0.08, 0.07, 0.18], charShade: 0.95, ground: "#b0a890" },
};
export const BG: Record<LightName, { bg: string; fog: string | null }> = {
  day: { bg: "#9fc8f0", fog: "#cfe0ef" }, night: { bg: "#0f1a40", fog: "#1c2a5a" }, dawn: { bg: "#f0b890", fog: "#f0c0a0" },
  grey: { bg: "#aab4c6", fog: "#b0b8c8" }, gold: { bg: "#f8c890", fog: "#f0c098" },
};
const mixC = new THREE.Color(), mixD = new THREE.Color();
const mixS = (a: string, b: string, k: number) => { mixC.set(a); mixD.set(b); mixC.lerp(mixD, k); return "#" + mixC.getHexString(); };
export const blend = <T extends object>(a: T, b: T, k: number): T => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(a)) {
    const x = (a as Record<string, unknown>)[key], y = (b as Record<string, unknown>)[key];
    if (typeof x === "number" && typeof y === "number") out[key] = x + (y - x) * k;
    else if (Array.isArray(x) && Array.isArray(y)) out[key] = x.map((v, i) => (v as number) + ((y[i] as number) - (v as number)) * k);
    else if (typeof x === "string" && typeof y === "string" && x[0] === "#" && y[0] === "#") out[key] = mixS(x, y, k);
    else out[key] = k < 0.5 ? x : y;
  }
  return out as T;
};
