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


/** harbor water: deep blue with lighter wave lines */
export const harborTex = () => ctex("tHarbor", 512, 512, (g, r) => {
  g.fillStyle = "#1c3a78"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? "140,190,255" : "10,24,64"},${0.18 + r() * 0.2})`; g.lineWidth = 3 + r() * 3; const x = r() * 512, y = r() * 512, w = 30 + r() * 70; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 10, x + w, y); g.stroke(); }
});
/** tea chest: wooden crate with iron straps and a stencilled TEA */
export const chestTex = () => ctex("tChest", 256, 256, (g, r) => {
  g.fillStyle = jit(r, "#a8794a", 0.06, 3, 0.08); g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(60,30,10,.35)"; g.lineWidth = 3; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, i * 51); g.lineTo(256, i * 51); g.stroke(); }
  g.fillStyle = "#33343c"; g.fillRect(0, 22, 256, 18); g.fillRect(0, 216, 256, 18); g.fillRect(22, 0, 18, 256); g.fillRect(216, 0, 18, 256);
  g.fillStyle = "#2a160a"; g.font = "900 70px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TEA", 128, 130);
});
export const sailTex = () => ctex("tSail", 256, 256, (g, r) => {
  g.fillStyle = "#efe4c8"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(120,100,70,.35)"; g.lineWidth = 3; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, i * 43); g.lineTo(256, i * 43); g.stroke(); }
  for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(150,120,80,${0.04 + r() * 0.05})`; g.beginPath(); g.arc(r() * 256, r() * 256, 12 + r() * 30, 0, 7); g.fill(); }
});
export const unionTex = () => ctex("tUnion", 512, 256, (g) => {
  g.fillStyle = "#1f3a7a"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#f4f1e8"; g.lineWidth = 54; g.beginPath(); g.moveTo(0, 0); g.lineTo(512, 256); g.moveTo(512, 0); g.lineTo(0, 256); g.stroke();
  g.strokeStyle = "#c92a2e"; g.lineWidth = 18; g.beginPath(); g.moveTo(0, 0); g.lineTo(512, 256); g.moveTo(512, 0); g.lineTo(0, 256); g.stroke();
  g.strokeStyle = "#f4f1e8"; g.lineWidth = 86; g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 256); g.moveTo(0, 128); g.lineTo(512, 128); g.stroke();
  g.strokeStyle = "#c92a2e"; g.lineWidth = 50; g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 256); g.moveTo(0, 128); g.lineTo(512, 128); g.stroke();
});
/** parchment map of the east coast with 13 dots; `step` links are drawn (0..13) */
const DOTS: [number, number][] = [[300, 70], [318, 112], [300, 150], [286, 196], [272, 236], [255, 276], [236, 318], [212, 356], [190, 392], [170, 428], [150, 462], [135, 496], [124, 530]];
export const mapTex = (step: number) => ctex("tMap" + step, 512, 640, (g) => {
  g.fillStyle = "#e9d9ae"; g.fillRect(0, 0, 512, 640);
  g.strokeStyle = "#8a6a3a"; g.lineWidth = 8; g.strokeRect(10, 10, 492, 620);
  g.fillStyle = "#6a8fb8"; g.beginPath(); g.moveTo(330, 0); g.bezierCurveTo(360, 180, 220, 420, 180, 640); g.lineTo(512, 640); g.lineTo(512, 0); g.fill();
  g.fillStyle = "#c9b98a"; g.beginPath(); g.moveTo(330, 0); g.bezierCurveTo(360, 180, 220, 420, 180, 640); g.lineTo(0, 640); g.lineTo(0, 0); g.fill();
  g.strokeStyle = "#8a6a3a"; g.lineWidth = 5; g.beginPath(); g.moveTo(330, 0); g.bezierCurveTo(360, 180, 220, 420, 180, 640); g.stroke();
  g.strokeStyle = "#c92a2e"; g.lineWidth = 9; g.lineCap = "round";
  for (let i = 1; i <= Math.min(step, 12); i++) { g.beginPath(); g.moveTo(DOTS[i - 1][0] - 46, DOTS[i - 1][1]); g.lineTo(DOTS[i][0] - 46, DOTS[i][1]); g.stroke(); }
  DOTS.forEach(([x, y], i) => { g.fillStyle = i < step + 1 ? "#c92a2e" : "#7a5a30"; g.beginPath(); g.arc(x - 46, y, 13, 0, 7); g.fill(); g.strokeStyle = "#2a160a"; g.lineWidth = 4; g.stroke(); });
});
