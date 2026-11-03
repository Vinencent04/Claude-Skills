// Painted textures for the kitchen (same recipe as paint.ts: Canvas2D, jittered per tile, dark seams painted in).
import { ctex, jit } from "./paint";

export const floorTile = () => ctex("kFloor", 1024, 1024, (g, r) => {
  const n = 8, s = 1024 / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g.fillStyle = jit(r, (x + y) % 2 ? "#e9d3ac" : "#d4875a", 0.07, 3, 0.1);
    g.fillRect(x * s, y * s, s, s);
    g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x * s + 6, y * s + 6, s * 0.5, 5);
    g.fillStyle = "rgba(90,50,30,.14)"; g.beginPath(); g.arc(x * s + r() * s, y * s + r() * s, 8 + r() * 14, 0, 7); g.fill();
  }
  g.strokeStyle = "#7a5238"; g.lineWidth = 5;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 1024); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(1024, i * s); g.stroke(); }
});

export const plaster = (key: string, base: string) => ctex("kPlaster" + key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "150,110,60"},${0.02 + r() * 0.03})`; g.beginPath(); g.arc(r() * 512, r() * 512, 20 + r() * 60, 0, 7); g.fill(); }
});

export const subway = () => ctex("kSubway", 512, 512, (g, r) => {
  const w = 128, h = 64;
  for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) {
    const ox = (y % 2) * (w / 2);
    g.fillStyle = jit(r, y === 3 ? "#3f9aa0" : "#f4f0e4", 0.05, 3, 0.1);
    g.fillRect(x * w + ox, y * h, w, h);
    g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x * w + ox + 5, y * h + 5, w - 12, 5);
  }
  g.strokeStyle = "#8a9a98"; g.lineWidth = 4;
  for (let y = 0; y <= 8; y++) { g.beginPath(); g.moveTo(0, y * h); g.lineTo(512, y * h); g.stroke(); }
  for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { const ox = (y % 2) * (w / 2); g.beginPath(); g.moveTo(x * w + ox, y * h); g.lineTo(x * w + ox, y * h + h); g.stroke(); }
});

/** one cabinet front: drawer on top, door below, brass knobs; base colour = sage teal / wood */
export const cabinet = (key: string, base: string, face = "#ffffff") => ctex("kCab" + key, 256, 384, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 384);
  const panel = (x: number, y: number, w: number, h: number) => {
    g.fillStyle = jit(r, base, 0.04, 2, 0.05); g.fillRect(x, y, w, h);
    g.strokeStyle = "rgba(20,40,38,.55)"; g.lineWidth = 5; g.strokeRect(x, y, w, h);
    g.strokeStyle = "rgba(255,255,255,.22)"; g.lineWidth = 3; g.strokeRect(x + 12, y + 12, w - 24, h - 24);
  };
  panel(8, 8, 240, 92); panel(8, 108, 240, 268);
  g.fillStyle = "#e8c45a"; g.strokeStyle = "#3a2a18"; g.lineWidth = 3;
  for (const [x, y] of [[128, 54], [200, 160]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.stroke(); }
  g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 2;
  for (let i = 0; i < 18; i++) { const y = 120 + r() * 250; g.beginPath(); g.moveTo(22, y); g.bezierCurveTo(90, y + 4, 170, y - 4, 234, y); g.stroke(); }
  void face;
});

export const countertop = () => ctex("kCounter", 256, 256, (g, r) => {
  g.fillStyle = "#efe4cc"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "120,100,80" : "255,255,255"},${0.1 + r() * 0.12})`; g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 3); }
});

export const woodTex = (key: string, base: string) => ctex("kWood" + key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(85,48,20,.2)"; g.lineWidth = 2.5;
  for (let i = 0; i < 20; i++) { const y = r() * 256; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(90, y + 5, 170, y - 5, 256, y); g.stroke(); }
});

/** what is outside the window: bright sky, soft clouds, a green hill and a tree (unlit card) */
export const outside = () => ctex("kOutside", 1024, 640, (g, r) => {
  const sk = g.createLinearGradient(0, 0, 0, 640); sk.addColorStop(0, "#5f9be0"); sk.addColorStop(0.7, "#bcd9f2"); sk.addColorStop(1, "#e9f1f4");
  g.fillStyle = sk; g.fillRect(0, 0, 1024, 640);
  g.fillStyle = "rgba(255,255,255,.92)";
  for (const [x, y, s] of [[200, 150, 1], [620, 90, 1.3], [850, 230, 0.8]]) { for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + k * 46 * s - 90 * s, y + (k % 2) * 14, 55 * s, 34 * s, 0, 0, 7); g.fill(); } }
  g.fillStyle = "#79b45a"; g.beginPath(); g.moveTo(0, 520); g.bezierCurveTo(250, 440, 520, 470, 1024, 500); g.lineTo(1024, 640); g.lineTo(0, 640); g.fill();
  g.fillStyle = "#5e9a46"; g.beginPath(); g.moveTo(0, 580); g.bezierCurveTo(300, 520, 700, 560, 1024, 540); g.lineTo(1024, 640); g.lineTo(0, 640); g.fill();
  g.fillStyle = "#7a5238"; g.fillRect(640, 380, 26, 150);
  g.fillStyle = "#4f9a3e"; for (const [x, y, rr] of [[653, 350, 70], [610, 390, 50], [700, 395, 52]]) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
});

export const hallway = () => ctex("kHall", 256, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#fff4d6"); gr.addColorStop(1, "#f0cf94");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#c79b62"; g.fillRect(150, 150, 70, 100); g.fillStyle = "#e9d6a6"; g.fillRect(158, 158, 54, 84);
});

// ---------------- revolution sets ----------------
export const marble = () => ctex("rMarble", 1024, 1024, (g, r) => {
  const n = 8, s = 1024 / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g.fillStyle = jit(r, (x + y) % 2 ? "#e7dccb" : "#8d8a93", 0.05, 2, 0.08);
    g.fillRect(x * s, y * s, s, s);
    g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = 3;
    for (let k = 0; k < 3; k++) { const x0 = x * s + r() * s, y0 = y * s + r() * s; g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + 40, y0 + 30, x0 + 20, y0 + 80, x0 + 90, y0 + 120); g.stroke(); }
  }
  g.strokeStyle = "#5c5560"; g.lineWidth = 4;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 1024); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(1024, i * s); g.stroke(); }
});
export const carpet = () => ctex("rCarpet", 256, 512, (g, r) => {
  g.fillStyle = "#b02a30"; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#e8c45a"; g.fillRect(0, 0, 22, 512); g.fillRect(234, 0, 22, 512);
  g.fillStyle = "#8c1f26"; g.fillRect(22, 0, 8, 512); g.fillRect(226, 0, 8, 512);
  for (let y = 40; y < 512; y += 96) { g.fillStyle = "#e8c45a"; g.beginPath(); g.moveTo(128, y - 28); g.lineTo(152, y); g.lineTo(128, y + 28); g.lineTo(104, y); g.closePath(); g.fill(); }
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`; g.fillRect(30 + r() * 196, r() * 512, 3, 3); }
});
export const netTex = () => ctex("rNet", 256, 64, (g) => {
  g.clearRect(0, 0, 256, 64);
  g.strokeStyle = "#f4f1ea"; g.lineWidth = 3;
  for (let x = 0; x <= 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
  for (let y = 0; y <= 64; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  
});
export const doorTex = () => ctex("rDoor", 256, 384, (g, r) => {
  g.fillStyle = "#5a3b24"; g.fillRect(0, 0, 256, 384);
  g.strokeStyle = "rgba(20,10,5,.7)"; g.lineWidth = 6;
  for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 384); g.stroke(); }
  g.strokeStyle = "#2a2a30"; g.lineWidth = 10; for (const y of [70, 310]) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  g.fillStyle = "#c9ccd2"; for (let x = 32; x < 256; x += 64) for (const y of [70, 310]) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
  g.fillStyle = "#e8c45a"; for (const x of [112, 144]) { g.beginPath(); g.arc(x, 200, 12, 0, 7); g.fill(); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = 2; const x = r() * 256; g.beginPath(); g.moveTo(x, r() * 384); g.lineTo(x + 3, r() * 384); g.stroke(); }
});
export const wicker = () => ctex("rWicker", 128, 128, (g, r) => {
  g.fillStyle = "#b9833f"; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "#7a5224"; g.lineWidth = 3;
  for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) { g.beginPath(); g.moveTo(x + ((y / 16) % 2) * 8, y); g.lineTo(x + ((y / 16) % 2) * 8 + 8, y + 16); g.stroke(); }
  void r;
});
export const tricolor = () => ctex("rTricolor", 192, 128, (g) => {
  g.fillStyle = "#2a4ba0"; g.fillRect(0, 0, 64, 128); g.fillStyle = "#f6f3ea"; g.fillRect(64, 0, 64, 128); g.fillStyle = "#d2373a"; g.fillRect(128, 0, 64, 128);
});
export const awning = () => ctex("rAwning", 128, 64, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f6f3ea" : "#d2373a"; g.fillRect(i * 16, 0, 16, 64); }
});
/** shop sign: a baguette next to a huge coin with a sad face (no text) */
export const breadSign = () => ctex("rBreadSign", 256, 128, (g) => {
  g.fillStyle = "#f2e2b4"; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "#2b1e1a"; g.lineWidth = 6; g.strokeRect(5, 5, 246, 118);
  g.save(); g.translate(70, 64); g.rotate(-0.5); g.fillStyle = "#d9a05b"; g.beginPath(); g.ellipse(0, 0, 54, 15, 0, 0, 7); g.fill(); g.stroke(); g.restore();
  g.fillStyle = "#f1c232"; g.beginPath(); g.arc(184, 64, 42, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#2b1e1a"; g.beginPath(); g.arc(171, 54, 4.5, 0, 7); g.arc(197, 54, 4.5, 0, 7); g.fill();
  g.lineWidth = 5; g.beginPath(); g.arc(184, 90, 14, 3.5, 5.9); g.stroke();
});
