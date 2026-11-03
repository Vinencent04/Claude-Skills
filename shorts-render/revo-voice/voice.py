"""Voice-over for 'The French Revolution in a nutshell' (Kokoro TTS, original script). Writes voice.wav (24 kHz) + timing.json."""
import json, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
SCRIPT = [
 "In 1789, the king of France ran out of money, and that started a revolution that ended with his head in a basket.",
 "France was broke. Wars had emptied the treasury, and bad harvests made bread too expensive.",
 "The nobles paid almost no taxes, so the Third Estate, ninety-seven percent of the country, paid for everything.",
 "The king called a meeting for more money. The Third Estate got locked out, so they swore an oath on a tennis court to write a constitution.",
 "On July fourteenth, Paris stormed the Bastille for gunpowder. It held exactly seven prisoners.",
 "Soon the monarchy was gone, and in 1793, King Louis lost his head to a new machine, the guillotine.",
 "Luckily, it was fast. Unluckily, it stayed busy. The Terror sent about seventeen thousand people to it.",
 "You see, when everyone is a suspect, nobody is safe. In 1794, even Robespierre got the same treatment.",
 "France then turned to a young general, Napoleon, who took power in 1799. A country that beheaded its king ended up with an emperor.",
]
speed = float(sys.argv[1]) if len(sys.argv) > 1 else 1.08
voice = sys.argv[2] if len(sys.argv) > 2 else "bm_george"
k = Kokoro("/tmp/claude-0/voice/kokoro-v1.0.onnx", "/tmp/claude-0/voice/voices-v1.0.bin")
SR = 24000; GAP = 0.7; LEAD = 0.4
parts, timing, t = [np.zeros(int(LEAD * SR), dtype=np.float32)], [], LEAD
for i, s in enumerate(SCRIPT):
    a, sr = k.create(s, voice=voice, speed=speed, lang="en-gb" if voice.startswith("b") else "en-us")
    assert sr == SR
    a = a.astype(np.float32)
    # trim leading/trailing silence
    m = np.abs(a) > 0.01; idx = np.where(m)[0]; a = a[idx[0]:idx[-1] + 1]
    timing.append({"i": i, "text": s, "start": round(t, 3), "end": round(t + len(a) / SR, 3), "words": len(s.split())})
    parts.append(a); gap = np.zeros(int(GAP * SR), dtype=np.float32); parts.append(gap); t += len(a) / SR + GAP
y = np.concatenate(parts)
sf.write("voice.wav", y, SR)
json.dump(timing, open("timing.json", "w"), indent=1)
print("total %.2f s, words %d, wps %.2f" % (len(y) / SR, sum(x["words"] for x in timing), sum(x["words"] for x in timing) / (len(y) / SR)))
for x in timing: print(x["i"], x["start"], x["end"])
