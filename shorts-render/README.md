# shorts-render
Remotion + three.js project for the 30 s kitchen short "The Pancake Problem" (style of the cartoon-3d-short skill).
- `src/videos/kitchen/` scene, cast, story timeline (story.ts), post chain.
- `scripts/render.mjs out.mp4 <a>-<b> <dpr> <concurrency>` renders a frame range (needs Chromium, set CHROME).
- `scripts/job.sh <a> <b>` = install + render + push the part to branch `render-<a>-<b>` (used for parallel rendering in several sessions).
- `audio/kitchen_audio.py out.wav` synthesizes the sound (numpy only).
