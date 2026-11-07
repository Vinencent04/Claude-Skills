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

// ---------------- carrington presets ----------------
import type { LightName } from "./story";
export const PRESETS: Record<LightName, LightPreset> = {
  space: { ...LIGHTS.golden, az: 60, el: 20, lit: [1.5, 1.0, 0.6], shade: [0.2, 0.2, 0.4], lift: [0.04, 0.05, 0.14], charShade: 0.9, sunCol: "#ffb070", sunI: 3.0, sky: "#8070a0", ground: "#403858", hemiI: 0.5, fogNear: 400, fogFar: 900, fog: "#05061a" },
  office: { ...LIGHTS.day, az: 30, el: 38, lit: [1.5, 1.1, 0.7], shade: [0.4, 0.34, 0.46], lift: [0.06, 0.05, 0.1], charTint: [1.0, 0.88, 0.7], sunCol: "#ffc77a", sunI: 2.5, sky: "#f0d0a0", ground: "#5a3a28", hemiI: 0.66 },
  obs: { ...LIGHTS.day, az: 40, el: 40, lit: [1.45, 1.2, 0.85], shade: [0.42, 0.4, 0.55], lift: [0.06, 0.06, 0.12], charTint: [1.0, 0.92, 0.8], sunCol: "#ffe0a8", sunI: 2.6, sky: "#e8d8c0", ground: "#6a5038", hemiI: 0.66 },
  aurora: { ...LIGHTS.day, az: 130, el: 30, lit: [1.2, 0.7, 0.8], shade: [0.5, 0.36, 0.7], lift: [0.1, 0.05, 0.2], charTint: [1.0, 0.82, 0.9], blob: [0.7, 0.6, 0.85], sunCol: "#ff8090", sunI: 2.4, sky: "#c06080", ground: "#5a3a5a", hemiI: 0.7, fogNear: 50, fogFar: 240, fog: "#3a1a40" },
  camp: { ...LIGHTS.day, az: 100, el: 24, lit: [1.4, 0.8, 0.7], shade: [0.46, 0.4, 0.7], lift: [0.08, 0.06, 0.18], charTint: [1.0, 0.84, 0.76], sunCol: "#ff9080", sunI: 2.6, sky: "#c07080", ground: "#8a7a90", hemiI: 0.68, fogNear: 40, fogFar: 220, fog: "#6a3a50" },
  city: { ...LIGHTS.day, az: 130, el: 30, lit: [0.8, 0.95, 1.4], shade: [0.46, 0.52, 0.84], lift: [0.05, 0.08, 0.24], charTint: [0.92, 0.96, 1.1], sunCol: "#b0c8ff", sunI: 2.2, sky: "#7088d0", ground: "#4a5a8a", hemiI: 0.62, fogNear: 60, fogFar: 260, fog: "#101a40" },
};
export const BG: Record<LightName, { bg: string; fog: string | null }> = {
  space: { bg: "#04051a", fog: null }, office: { bg: "#2a1a14", fog: null }, obs: { bg: "#2a1c14", fog: null },
  aurora: { bg: "#2a1038", fog: "#3a1a40" }, camp: { bg: "#7a3a52", fog: "#6a3a50" }, city: { bg: "#0c1438", fog: "#101a40" },
};
