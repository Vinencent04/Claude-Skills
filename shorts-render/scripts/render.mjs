import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, range, dpr = "1", conc = "4"] = process.argv.slice(2);
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const inputProps = Number(dpr) === 1 ? {} : { post: { dpr: Number(dpr) } };
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "Kitchen", browserExecutable, chromiumOptions, inputProps });
const [a, b] = range.split("-").map(Number);
const t0 = Date.now();
await renderMedia({ composition, serveUrl, outputLocation: out, codec: "h264", crf: 16, inputProps, browserExecutable, chromiumOptions, concurrency: Number(conc), frameRange: [a, b], timeoutInMilliseconds: 600000,
  onProgress: (p) => { if (p.renderedFrames % 10 === 0) console.log(p.renderedFrames, "frames", ((Date.now() - t0) / 1000).toFixed(0) + "s"); } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
