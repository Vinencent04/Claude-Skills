import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const out = process.argv[2] || "out/subs.mov";
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "Subs", browserExecutable });
const t0 = Date.now();
await renderMedia({ composition, serveUrl, outputLocation: out, codec: "prores", proResProfile: "4444", imageFormat: "png", pixelFormat: "yuva444p10le", browserExecutable, concurrency: 4,
  onProgress: (p) => { if (p.renderedFrames % 300 === 0) console.log(p.renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
