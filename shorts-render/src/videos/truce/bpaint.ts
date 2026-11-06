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


/** red-orange outback dirt with specks */
export const dirtTex = () => ctex("eDirt", 512, 512, (g, r) => {
  g.fillStyle = "#c46a3a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "250,190,120" : "110,50,25"},${0.08 + r() * 0.14})`; g.beginPath(); g.arc(r() * 512, r() * 512, 3 + r() * 14, 0, 7); g.fill(); }
});
export const roadTex = () => ctex("eRoad", 512, 512, (g, r) => {
  g.fillStyle = "#d9a36a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,230,180" : "130,80,40"},${0.1 + r() * 0.12})`; g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 10, 0, 7); g.fill(); }
});
/** a wheat row: golden stalks (vertical strokes) with ears */
export const wheatTex = () => ctex("eWheat", 512, 256, (g, r) => {
  g.fillStyle = "#d9a82e"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 150; i++) { const x = r() * 512; g.strokeStyle = `rgba(${r() < 0.5 ? "255,225,120" : "150,100,20"},.55)`; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 256); g.lineTo(x + (r() - 0.5) * 16, 20 + r() * 80); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = "#f4d870"; g.beginPath(); g.ellipse(r() * 512, 8 + r() * 26, 5, 12, 0, 0, 7); g.fill(); }
});
export const corrTex = (col: string) => ctex("eCorr" + col, 256, 256, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 16; i++) { g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(i * 16, 0, 5, 256); g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(i * 16 + 9, 0, 4, 256); }
});
export const khakiTex = () => ctex("eKhaki", 256, 256, (g, r) => {
  g.fillStyle = "#7c7a4a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "190,190,120" : "50,50,20"},${0.08 + r() * 0.1})`; g.beginPath(); g.arc(r() * 256, r() * 256, 6 + r() * 18, 0, 7); g.fill(); }
});
export const ausFlagTex = () => ctex("eAus", 512, 256, (g) => {
  g.fillStyle = "#1f2f7a"; g.fillRect(0, 0, 512, 256);
  g.save(); g.beginPath(); g.rect(0, 0, 256, 128); g.clip();
  g.strokeStyle = "#f4f1e8"; g.lineWidth = 26; g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 128); g.moveTo(256, 0); g.lineTo(0, 128); g.stroke();
  g.strokeStyle = "#c92a2e"; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 128); g.moveTo(256, 0); g.lineTo(0, 128); g.stroke();
  g.strokeStyle = "#f4f1e8"; g.lineWidth = 44; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 128); g.moveTo(0, 64); g.lineTo(256, 64); g.stroke();
  g.strokeStyle = "#c92a2e"; g.lineWidth = 26; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 128); g.moveTo(0, 64); g.lineTo(256, 64); g.stroke(); g.restore();
  g.fillStyle = "#f4f1e8"; for (const [x, y] of [[380, 80], [440, 140], [320, 160], [400, 210], [350, 40]]) { g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); }
});
export const ammoTex = () => ctex("eAmmo", 256, 256, (g, r) => {
  g.fillStyle = "#6a5a34"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(30,20,5,.4)"; g.lineWidth = 3; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, i * 51); g.lineTo(256, i * 51); g.stroke(); }
  g.fillStyle = "#e8d58a"; g.font = "900 56px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("AMMO", 128, 130);
  void r;
});

/** dark night grass/dirt with specks */
export const nightGround = () => ctex("cNight", 512, 512, (g, r) => {
  g.fillStyle = "#2c3a4a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "90,120,150" : "10,20,30"},${0.12 + r() * 0.16})`; g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 12, 0, 7); g.fill(); }
});
/** stone blocks (cool grey) */
export const stoneBlocks = (key: string, base: string) => ctex("cStone" + key, 512, 512, (g, r) => {
  const hh = 64, ww = 128;
  for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { const ox = (y % 2) * (ww / 2); g.fillStyle = jit(r, base, 0.07, 3, 0.08); g.fillRect(x * ww + ox, y * hh, ww, hh); }
  g.strokeStyle = "#2a2a32"; g.lineWidth = 5;
  for (let y = 0; y <= 8; y++) { g.beginPath(); g.moveTo(0, y * hh); g.lineTo(512, y * hh); g.stroke(); }
  for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { const ox = (y % 2) * (ww / 2); g.beginPath(); g.moveTo(x * ww + ox, y * hh); g.lineTo(x * ww + ox, y * hh + hh); g.stroke(); }
});
/** stained glass panel (basic material): coloured pieces with dark leading */
export const stainedTex = (key: string, a: string, b: string) => ctex("cGlass" + key, 256, 512, (g, r) => {
  g.fillStyle = a; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 26; i++) { g.fillStyle = r() < 0.5 ? b : "#f4d86a"; g.globalAlpha = 0.85; g.beginPath(); g.arc(r() * 256, r() * 512, 20 + r() * 40, 0, 7); g.fill(); }
  g.globalAlpha = 1; g.strokeStyle = "#1a1620"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 504);
  g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 512); g.moveTo(0, 170); g.lineTo(256, 170); g.moveTo(0, 340); g.lineTo(256, 340); g.stroke();
});
export const strawTex = () => ctex("cStraw", 256, 256, (g, r) => {
  g.fillStyle = "#a8864a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) { g.strokeStyle = r() < 0.5 ? "#d8b86a" : "#6a4a22"; g.lineWidth = 2; const x = r() * 256, y = r() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 20); g.stroke(); }
});

/** river water: deep blue with lighter wave lines */
export const harborTex = () => ctex("cHarbor", 512, 512, (g, r) => {
  g.fillStyle = "#1c3a78"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? "140,190,255" : "10,24,64"},${0.18 + r() * 0.2})`; g.lineWidth = 3 + r() * 3; const x = r() * 512, y = r() * 512, w = 30 + r() * 70; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 10, x + w, y); g.stroke(); }
});

/** gothic parliament stone with rows of pointed windows */
export const gothicTex = () => ctex("sGothic", 1024, 512, (g, r) => {
  g.fillStyle = "#c8b890"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,240,200" : "100,80,50"},${0.04 + r() * 0.06})`; g.beginPath(); g.arc(r() * 1024, r() * 512, 10 + r() * 30, 0, 7); g.fill(); }
  for (let row = 0; row < 2; row++) for (let i = 0; i < 12; i++) { const x = 40 + i * 82, y = 50 + row * 230; g.fillStyle = "#2a3a5a"; g.beginPath(); g.moveTo(x, y + 150); g.lineTo(x, y + 40); g.quadraticCurveTo(x + 28, y - 20, x + 56, y + 40); g.lineTo(x + 56, y + 150); g.closePath(); g.fill(); g.strokeStyle = "#5a4a30"; g.lineWidth = 6; g.stroke(); g.beginPath(); g.moveTo(x + 28, y); g.lineTo(x + 28, y + 150); g.stroke(); }
});
/** murky Thames water: olive-brown with bubbles */
export const murkTex = (key: string, base: string) => ctex("sMurk" + key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "190,200,120" : "40,40,20"},${0.1 + r() * 0.14})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 50, 4 + r() * 12, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 30; i++) { g.strokeStyle = "rgba(220,230,160,.6)"; g.lineWidth = 3; g.beginPath(); g.arc(r() * 512, r() * 512, 3 + r() * 9, 0, 7); g.stroke(); }
});
export const brickTunnel = () => ctex("sBrickT", 512, 512, (g, r) => {
  const hh = 32, ww = 96;
  for (let y = 0; y < 16; y++) for (let x = -1; x < 7; x++) { const ox = (y % 2) * (ww / 2); g.fillStyle = jit(r, "#a8583a", 0.1, 4, 0.12); g.fillRect(x * ww + ox, y * hh, ww, hh); }
  g.strokeStyle = "#3a2a22"; g.lineWidth = 4;
  for (let y = 0; y <= 16; y++) { g.beginPath(); g.moveTo(0, y * hh); g.lineTo(512, y * hh); g.stroke(); }
  for (let y = 0; y < 16; y++) for (let x = -1; x < 7; x++) { const ox = (y % 2) * (ww / 2); g.beginPath(); g.moveTo(x * ww + ox, y * hh); g.lineTo(x * ww + ox, y * hh + hh); g.stroke(); }
});
export const clothGreen = () => ctex("sCloth", 256, 256, (g, r) => { g.fillStyle = "#2a6a3a"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "120,200,140" : "10,40,20"},0.1)`; g.fillRect(r() * 256, 0, 6, 256); } });

export const snowTex = () => ctex("tSnow", 512, 512, (g, r) => {
  g.fillStyle = "#e4ecf8"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "150,170,210"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 30, 3 + r() * 10, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,70,60,${0.1 + r() * 0.12})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 18, 2 + r() * 8, 0, 0, 7); g.fill(); }
});
export const sandbagTex = () => ctex("tSand", 512, 256, (g, r) => {
  g.fillStyle = "#8a7a5a"; g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 4; y++) for (let x = -1; x < 5; x++) { const ox = (y % 2) * 64; g.fillStyle = jit(r, "#a8966a", 0.09, 4, 0.1); g.beginPath(); g.ellipse(x * 128 + ox + 64, y * 64 + 32, 62, 30, 0, 0, 7); g.fill(); g.strokeStyle = "#3a2e1e"; g.lineWidth = 4; g.stroke(); }
});
export const mudTex = () => ctex("tMud", 256, 256, (g, r) => { g.fillStyle = "#5a4636"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "120,95,70" : "30,22,16"},0.25)`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 20, 3 + r() * 8, 0, 0, 7); g.fill(); } });
