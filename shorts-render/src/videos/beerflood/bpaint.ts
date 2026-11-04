// Painted textures for the beer flood (same recipe as paint.ts: Canvas2D, jittered, dark seams painted in).
import { ctex, jit } from "./paint";

export const plaster = (key: string, base: string) => ctex("bPlaster" + key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "120,80,40"},${0.02 + r() * 0.04})`; g.beginPath(); g.arc(r() * 512, r() * 512, 20 + r() * 60, 0, 7); g.fill(); }
});
/** vertical wooden panelling / staves with dark seams */
export const staves = (key: string, base: string, n = 8) => ctex("bStaves" + key, 512, 512, (g, r) => {
  const w = 512 / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = jit(r, base, 0.1, 3, 0.1); g.fillRect(i * w, 0, w, 512);
    g.fillStyle = "rgba(255,230,180,.12)"; g.fillRect(i * w + 6, 0, w * 0.3, 512);
    g.strokeStyle = "rgba(60,30,10,.25)"; g.lineWidth = 2;
    for (let k = 0; k < 4; k++) { const x = i * w + w * (0.2 + r() * 0.6); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, 170, x - 8, 340, x + 4, 512); g.stroke(); }
  }
  g.strokeStyle = "#2a160a"; g.lineWidth = 6;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w, 512); g.stroke(); }
});
export const carpet = () => ctex("bCarpet", 512, 512, (g, r) => {
  g.fillStyle = "#7b2a2e"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#c9a24a"; g.lineWidth = 8; g.strokeRect(14, 14, 484, 484);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 40, 4); }
});
export const floorTile = () => ctex("bFloorTile", 512, 512, (g, r) => {
  const n = 4, s = 128;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = jit(r, (x + y) % 2 ? "#d9d2c2" : "#8d8678", 0.06, 3, 0.08); g.fillRect(x * s, y * s, s, s); }
  g.strokeStyle = "#4a443a"; g.lineWidth = 4;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(512, i * s); g.stroke(); }
});
/** big readable sign: painted text on a plate, unlit when used with a basic material */
export const textSign = (key: string, w: number, h: number, lines: string[], bg: string, fg: string, border = "#2a160a") => ctex("bSign" + key, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = border; g.lineWidth = Math.round(h * 0.06); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((t, i) => { const sz = Math.round((h * 0.62) / lines.length); g.font = `800 ${sz}px Georgia, 'Times New Roman', serif`; g.fillText(t, w / 2, h * ((i + 0.5) / lines.length)); });
});
export const hoopIron = () => ctex("bIron", 256, 64, (g, r) => {
  g.fillStyle = "#3d414c"; g.fillRect(0, 0, 256, 64);
  g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, 8, 256, 8);
  for (let i = 0; i < 8; i++) { g.fillStyle = "#1c1e24"; g.beginPath(); g.arc(16 + i * 32 + r() * 4, 38, 4, 0, 7); g.fill(); }
});

/** porter: amber with lighter streaks and foam bubbles (wave body, flood) */
export const beerTex = () => ctex("bBeer", 512, 512, (g, r) => {
  g.fillStyle = "#b8691b"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,214,140" : "140,70,16"},${0.12 + r() * 0.14})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 80, 6 + r() * 14, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 90; i++) { const x = r() * 512, y = r() * 512, s = 3 + r() * 7; g.fillStyle = "#f0d9a8"; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); g.strokeStyle = "#7a3a0c"; g.lineWidth = 2.5; g.stroke(); }
});
