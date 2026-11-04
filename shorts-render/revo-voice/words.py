"""Word timings for the captions: per-word Kokoro durations give the proportions inside each sentence; the sentence spans come from timing.json."""
import json, re, numpy as np
from kokoro_onnx import Kokoro
T = json.load(open("timing.json"))
k = Kokoro("/tmp/claude-0/voice/kokoro-v1.0.onnx", "/tmp/claude-0/voice/voices-v1.0.bin")
SR = 24000
KEY = {"1789", "1793", "1794", "1799", "king", "money", "bread", "bastille", "seven", "guillotine", "robespierre", "napoleon", "emperor", "constitution", "gunpowder", "terror", "suspect", "tennis", "basket", "ninety-seven", "july", "fourteenth", "seventeen", "thousand", "head"}
out = []
for s in T:
    ws = s["text"].split()
    durs = []
    for w in ws:
        a, sr = k.create(re.sub(r"[^\w'\-]", "", w) or w, voice="bm_george", speed=1.34, lang="en-gb")
        m = np.abs(a) > 0.01; idx = np.where(m)[0]
        durs.append(max(0.12, (idx[-1] - idx[0]) / SR) if len(idx) else 0.12)
    # pauses after commas / sentence-internal periods
    w8 = [d + (0.14 if w.endswith(",") else 0.2 if w.endswith(".") and i < len(ws) - 1 else 0) for i, (w, d) in enumerate(zip(ws, durs))]
    tot = sum(w8); span = s["end"] - s["start"]; t = s["start"]
    for w, d in zip(ws, w8):
        dd = d / tot * span
        clean = re.sub(r"[^\w'\-]", "", w).lower()
        out.append({"w": w.rstrip(",.").replace("—", "-"), "t0": round(t, 3), "t1": round(t + dd, 3), "hi": clean in KEY or clean.isdigit()})
        t += dd
json.dump(out, open("words.json", "w"), indent=0)
print(len(out), out[0], out[-1])
