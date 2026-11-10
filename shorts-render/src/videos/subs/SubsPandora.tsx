// Word-by-word captions (transparent layer): white heavy sans, thick black outline, lower-middle, hard swaps on every word chunk.
// Timings come from words.json (per-word proportions inside each voice sentence). Rendered alone (no WebGL) and overlaid with ffmpeg.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import words from "./words_pandora.json";

type W = { w: string; t0: number; t1: number; hi: boolean };
export const SUBS_PD_FRAMES = 2812;
const FPS = 30;

/** merge tiny words ("In", "the", "of") with the next one so the captions never flicker; max 2 words per chunk */
const chunks = (() => {
  const out: { text: string; t0: number; t1: number; hi: boolean }[] = [];
  const ws = words as W[];
  let cur: W[] = [];
  const flush = () => { if (cur.length) { out.push({ text: cur.map((x) => x.w).join(" "), t0: cur[0].t0, t1: cur[cur.length - 1].t1, hi: cur.some((x) => x.hi) }); cur = []; } };
  ws.forEach((w, i) => {
    cur.push(w);
    const dur = cur[cur.length - 1].t1 - cur[0].t0, endsSentence = /[.!?]$/.test(words[i].w) || i === ws.length - 1 || (ws[i + 1] && ws[i + 1].t0 - w.t1 > 0.3);
    if (dur >= 0.75 || cur.length >= 3 || endsSentence) flush();
  });
  flush();
  // a chunk stays up until the next one starts (or 0.25 s after its own end when a pause follows)
  return out.map((c, i) => ({ ...c, t1: out[i + 1] && out[i + 1].t0 - c.t1 < 0.3 ? out[i + 1].t0 : c.t1 + 0.12 }));
})();

export const SubsPandora: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const c = chunks.find((k) => t >= k.t0 && t < k.t1);
  if (!c) return <AbsoluteFill />;
  const age = (t - c.t0) * FPS;                                  // frames since the swap
  const pop = age < 4 ? 1 + 0.14 * (1 - age / 4) : 1;
  const text = c.text.toUpperCase(), size = Math.min(150, 940 / (Math.max(text.length, 6) * 0.66));
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div style={{
        position: "absolute", top: 1490, width: 1080, textAlign: "center", transform: `scale(${pop})`,
        fontFamily: "'Inter Display', 'Inter', 'DejaVu Sans', sans-serif", fontWeight: 900, fontSize: size, lineHeight: 1.05, letterSpacing: 1,
        color: c.hi ? "#FFD84A" : "#FFFFFF", WebkitTextStroke: `${Math.round(size * 0.13)}px #000`, paintOrder: "stroke fill" as never,
        filter: "drop-shadow(0 8px 10px rgba(0,0,0,.45))",
      }}>{text}</div>
    </AbsoluteFill>
  );
};
