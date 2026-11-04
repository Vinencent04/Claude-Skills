"""Original sound for the tea-party short: synthesized SFX + a quiet drone, timed to story.ts events. numpy only.
usage: python3 teaparty_audio.py out.wav   (stereo 48 kHz 16-bit, 43.4 s)."""
import sys, wave
import numpy as np
SR = 48000; DUR = 43.4; N = int(SR * DUR)
rng = np.random.default_rng(5)
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
def splash(d=0.7, gain=1.0):
    n = int(SR * d); t = tt(n); return noise(n, 400, 6000) * np.exp(-t / 0.16) * np.minimum(t / 0.01, 1) * gain
def clink(f, d=0.4):
    n = int(SR * d); t = tt(n); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.12)
def whoosh(d=0.5, lo=300, hi=3000):
    n = int(SR * d); t = tt(n); return noise(n, lo, hi) * np.sin(np.pi * t / d) ** 2
def crate(d=0.3):
    n = int(SR * d); t = tt(n); return (noise(n, 150, 1800) + 0.8 * np.sin(2 * np.pi * 110 * t)) * np.exp(-t / 0.07)
# hook A: chests thrown overboard (launch 0.12 + 0.27 k, splash 0.9 s later)
for k in range(17):
    put(sfx, 0.12 + 0.27 * k, whoosh(0.35, 400, 2500), -0.4 + 0.05 * k, 0.12)
    put(sfx, 1.02 + 0.27 * k, splash(0.7), -0.4 + 0.05 * k, 0.3); put(sfx, 1.02 + 0.27 * k, thud(60, 0.4), -0.4 + 0.05 * k, 0.25)
# hook B: shop bell, tag slap
put(sfx, 4.9, whoosh(0.25, 800, 4000), 0.0, 0.2)
for k, f in enumerate((1568, 2093)): put(sfx, 4.95 + k * 0.1, clink(f, 0.7), 0.3, 0.22)
put(sfx, 5.45, thud(110, 0.3), 0.2, 0.7); put(sfx, 5.45, crate(0.2), 0.2, 0.3)
# price cut: falling slide-whistle + coin ding
n = int(SR * 0.5); t = tt(n); put(sfx, 7.8, np.sin(2 * np.pi * np.cumsum(900 - 700 * t / 0.5) / SR) * np.exp(-t / 0.4), 0.0, 0.12)
put(sfx, 8.35, clink(1760, 0.6), 0.0, 0.2)
# tax stamp
put(sfx, 10.5, thud(80, 0.6), 0.0, 0.9); put(sfx, 10.5, crate(0.25), 0.0, 0.35)
# harbor ambience, creaks
put(bed, 11.9, noise(int(SR * 2.8), 80, 500) * 0.05, 0.0, 1.0)
for t0 in (12.2, 13.0): put(sfx, t0, clink(240, 0.8) * 0.5, -0.3, 0.1)
# governor refuses: desk slam, crowd murmur
put(sfx, 15.0, thud(90, 0.5), 0.0, 0.8); put(sfx, 15.0, crate(0.3), 0.0, 0.35)
put(bed, 16.8, noise(int(SR * 2.8), 200, 1800) * 0.07, 0.0, 1.0)
put(sfx, 17.8, thud(50, 1.0), 0.0, 0.5)
for k in range(8): put(sfx, 17.8 + 0.05 * k, noise(int(SR * 0.4), 300, 3000) * np.exp(-tt(int(SR * 0.4)) / 0.2), (k % 3 - 1) * 0.5, 0.08)
# the march: footsteps and a low drum
for k in range(26): put(sfx, 19.6 + 0.37 * k, thud(70, 0.25), 0.0, 0.18 + 0.1 * (k % 2))
put(bed, 19.6, noise(int(SR * 3.6), 60, 400) * 0.05, 0.0, 1.0)
# tipping: crate pops and splashes (matches world.ts T_OPEN/T_TIP schedule: open 24.4 + .34 i, tip 25.6 + .34 i, splash +1.1)
for i in range(6):
    put(sfx, 24.4 + 0.34 * i, crate(0.3), -0.5 + 0.2 * i, 0.4)
    put(sfx, 25.6 + 0.34 * i, whoosh(0.5, 300, 2500), -0.5 + 0.2 * i, 0.2)
    put(sfx, 26.7 + 0.34 * i, splash(0.8), -0.5 + 0.2 * i, 0.55); put(sfx, 26.7 + 0.34 * i, thud(55, 0.5), -0.5 + 0.2 * i, 0.4)
# count: ticking up then a final ding
for k in range(12): put(sfx, 29.3 + k * 0.1, clink(1100 + 40 * k, 0.15), 0.0, 0.06)
put(sfx, 30.55, clink(1568, 0.9), 0.0, 0.22)
# harbor closed: heavy chain, gun boom
put(sfx, 32.95, thud(40, 1.6), 0.0, 1.0); put(sfx, 32.95, noise(int(SR * 0.5), 150, 5000) * np.exp(-tt(int(SR * 0.5)) / 0.12), 0.0, 0.6)
for k in range(5): put(sfx, 33.2 + 0.12 * k, clink(310 + 20 * k, 0.5), 0.0, 0.12)
# colonies join: rising chime per link
for k in range(13): put(sfx, 35.45 + 0.18 * k, clink(660 * 2 ** (k / 12), 0.6), -0.4 + 0.07 * k, 0.12)
# callback + CTA ding
put(sfx, 38.14, thud(90, 0.4), 0.0, 0.5)
for k, f in enumerate((880, 1320)): put(sfx, 41.0 + k * 0.12, clink(f, 0.6), 0.0, 0.16)
t = tt(N); drone = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.4 * t) + 0.3 * np.sin(2 * np.pi * 110.4 * t)) * (0.022 + 0.012 * np.sin(2 * np.pi * t / 15))
drone *= np.minimum(t / 2, 1) * np.minimum((DUR - t) / 2, 1); bed[0] += drone; bed[1] += drone
mix = sfx * 0.8 + bed; mix /= max(1.0, np.abs(mix).max() / 0.9)
out = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "teaparty_sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("sfx ok", DUR, "s")
