"""Original sound for the emu-war short: synthesized SFX + a quiet drone, timed to story.ts events. numpy only.
usage: python3 emuwar_audio.py out.wav   (stereo 48 kHz 16-bit, 50.0 s)."""
import sys, wave
import numpy as np
SR = 48000; DUR = 50.0; N = int(SR * DUR)
rng = np.random.default_rng(9)
def tt(n): return np.arange(n) / SR
def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def noise(n, lo=None, hi=None): return fft_filter(rng.standard_normal(n), lo, hi)
sfx = np.zeros((2, N)); bed = np.zeros((2, N))
def put(buf, t0, x, pan=0.0, gain=1.0):
    pan = max(-0.95, min(0.95, pan)); i = int(t0 * SR)
    if i >= N or i + len(x) <= 0: return
    a, b = max(0, -i), min(len(x), N - i)
    buf[0, i + a:i + b] += x[a:b] * gain * np.sqrt((1 - pan) / 2) * 1.414
    buf[1, i + a:i + b] += x[a:b] * gain * np.sqrt((1 + pan) / 2) * 1.414
def thud(f=70, d=0.5):
    n = int(SR * d); t = tt(n); return np.sin(2 * np.pi * (f + 90 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.16)
def clink(f, d=0.4):
    n = int(SR * d); t = tt(n); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.12)
def whoosh(d=0.5, lo=300, hi=3000):
    n = int(SR * d); t = tt(n); return noise(n, lo, hi) * np.sin(np.pi * t / d) ** 2
def rumble(d, lo=40, hi=300, mod=14):
    n = int(SR * d); t = tt(n); return noise(n, lo, hi) * (0.6 + 0.4 * np.sin(2 * np.pi * mod * t))
def crunch(d=0.12):
    n = int(SR * d); t = tt(n); return noise(n, 600, 5000) * np.exp(-t / 0.03)
# hook A: stampeding emus (hoof thuds) and a chasing truck engine
for k in range(70): put(sfx, 0.05 + 0.075 * k, thud(75 + 15 * (k % 3), 0.18), -0.5 + (k % 9) * 0.12, 0.2)
put(bed, 0.0, rumble(5.4, 50, 260, 16) * 0.12, 0.0, 1.0)
# hook B: the emu wins: little fanfare + confetti pop
for k, f in enumerate((523, 659, 784, 1047)): put(sfx, 5.45 + 0.1 * k, clink(f, 0.6), 0.0, 0.22)
put(sfx, 5.75, thud(90, 0.3), 0.0, 0.5); put(sfx, 5.75, whoosh(0.5, 1000, 6000), 0.0, 0.25)
# farm: windmill creak + wind
put(bed, 7.8, noise(int(SR * 4.8), 120, 900) * 0.04, 0.0, 1.0)
for k in range(14): put(sfx, 14.0 + k * 0.28, crunch(), (k % 5 - 2) * 0.3, 0.12)
for k in range(30): put(sfx, 12.9 + 0.11 * k, thud(80, 0.15), -0.3, 0.1)
# office: stamp
put(sfx, 19.6, thud(80, 0.6), 0.0, 0.9); put(sfx, 19.6, crunch(0.2), 0.0, 0.5)
# army reveal: boots, clanks, crate
for t0 in (21.15, 22.1, 23.2): put(sfx, t0, thud(100, 0.2), 0.0, 0.5)
put(sfx, 23.2, clink(300, 0.8), 0.3, 0.2); put(sfx, 24.6, thud(60, 0.4), 0.4, 0.6)
# scatter: whoosh and quick hoof burst
put(sfx, 26.7, whoosh(0.8, 300, 4000), 0.0, 0.3)
for k in range(60): put(sfx, 26.8 + 0.06 * k, thud(85, 0.15), (k % 9 - 4) * 0.2, 0.17)
# gun on truck, engine, jam
put(sfx, 29.7, clink(220, 0.8), 0.0, 0.35); put(sfx, 29.7, thud(70, 0.3), 0.0, 0.5)
put(bed, 31.4, rumble(3.0, 40, 240, 12) * 0.14, 0.0, 1.0)
for k in range(8): put(sfx, 32.0 + 0.11 * k, clink(160 + 4 * k, 0.15), 0.0, 0.25)
put(sfx, 32.95, clink(1400, 0.2), 0.0, 0.35); put(sfx, 32.95, thud(60, 0.5), 0.0, 0.5); put(sfx, 33.1, whoosh(1.0, 200, 2500), 0.0, 0.25)
# army goes home: sad trombone-ish slide
n = int(SR * 1.8); t = tt(n); put(sfx, 36.3, np.sin(2 * np.pi * np.cumsum(220 - 70 * t / 1.8) / SR) * np.exp(-t / 1.2) * 0.4, 0.0, 0.25)
# major's verdict + the final munching
put(sfx, 38.0, clink(880, 0.5), 0.0, 0.1)
for k in range(24): put(sfx, 43.3 + 0.17 * k, crunch(), (k % 5 - 2) * 0.35, 0.16)
# CTA ding
for k, f in enumerate((880, 1320)): put(sfx, 47.1 + k * 0.12, clink(f, 0.6), 0.0, 0.16)
t = tt(N); drone = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.4 * t) + 0.3 * np.sin(2 * np.pi * 110.4 * t)) * (0.02 + 0.01 * np.sin(2 * np.pi * t / 15))
drone *= np.minimum(t / 2, 1) * np.minimum((DUR - t) / 2, 1); bed[0] += drone; bed[1] += drone
mix = sfx * 0.8 + bed; mix /= max(1.0, np.abs(mix).max() / 0.9)
out = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "emuwar_sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("sfx ok", DUR, "s")
