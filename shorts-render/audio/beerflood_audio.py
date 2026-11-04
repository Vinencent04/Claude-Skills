"""Original sound for the beer-flood short: synthesized SFX + a quiet drone bed, timed to story.ts events. numpy only.
usage: python3 beerflood_audio.py out.wav   (stereo 48 kHz 16-bit, 54.0 s). The voice is mixed in afterwards with ffmpeg."""
import sys, wave
import numpy as np

SR = 48000; DUR = 54.0; N = int(SR * DUR)
rng = np.random.default_rng(11)
def tt(n): return np.arange(n) / SR
def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def noise(n, lo=None, hi=None): return fft_filter(rng.standard_normal(n), lo, hi)
sfx = np.zeros((2, N)); bed = np.zeros((2, N))
def put(buf, t0, x, pan=0.0, gain=1.0):
    i = int(t0 * SR)
    pan = max(-0.95, min(0.95, pan))
    if i >= N or i + len(x) <= 0: return
    a, b = max(0, -i), min(len(x), N - i)
    buf[0, i + a:i + b] += x[a:b] * gain * np.sqrt((1 - pan) / 2) * 1.414
    buf[1, i + a:i + b] += x[a:b] * gain * np.sqrt((1 + pan) / 2) * 1.414
def swell(d, a, lo, hi):
    n = int(SR * d); t = tt(n); e = np.minimum(t / a, 1) * np.exp(-np.maximum(t - a, 0) / (d * 0.35)); return noise(n, lo, hi) * e
def thud(f=60, d=0.6):
    n = int(SR * d); t = tt(n); return np.sin(2 * np.pi * (f + 90 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.18)
def clink(f, d=0.5):
    n = int(SR * d); t = tt(n); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.12)
def creak(d=1.4, f0=120):
    n = int(SR * d); t = tt(n); f = f0 + 40 * np.sin(2 * np.pi * 3.1 * t) + 30 * t
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) * np.minimum(t / 0.2, 1) * np.minimum((d - t) / 0.3, 1)
def whoosh(d=0.5, lo=300, hi=3000):
    n = int(SR * d); t = tt(n); return noise(n, lo, hi) * np.sin(np.pi * t / d) ** 2

# hook: a roaring wave chasing the crowd (0-4.2 s), mugs clattering
put(sfx, 0.0, swell(4.4, 1.6, 60, 900), 0.0, 0.55)
for k in range(9): put(sfx, 0.3 + k * 0.42, clink(900 + 130 * (k % 4), 0.4), (k % 3 - 1) * 0.5, 0.13)
put(sfx, 4.0, whoosh(0.4, 400, 4000), 0.0, 0.25)
# office: stamp, coins
put(sfx, 5.22, thud(90, 0.5), 0.0, 0.7); put(sfx, 5.22, noise(int(SR * 0.08), 1500, 5000) * np.exp(-tt(int(SR * 0.08)) / 0.02), 0.0, 0.3)
for k in range(7): put(sfx, 5.6 + k * 0.085, clink(2200 + 260 * (k % 3), 0.35), (k - 3) * 0.12, 0.2)
put(sfx, 7.33, whoosh(0.5, 200, 2500), 0.0, 0.22)
# brewery: yard ambience, vat creaks and a slipping hoop, near silence before the burst
put(sfx, 11.8, swell(5.0, 1.5, 150, 1200), 0.0, 0.06)
for t0 in (17.9, 19.6): put(sfx, t0, creak(1.5, 110), -0.2, 0.12)
put(sfx, 21.0, clink(520, 0.9), 0.1, 0.22); put(sfx, 21.05, creak(1.2, 90), 0.0, 0.18)
put(sfx, 24.6, creak(1.0, 100), 0.0, 0.10)
# THE BURST (27.15): boom + wood crack + wave roar
put(sfx, 27.15, thud(38, 1.8), 0.0, 1.1); put(sfx, 27.15, noise(int(SR * 0.5), 200, 6000) * np.exp(-tt(int(SR * 0.5)) / 0.12), 0.0, 0.9)
put(sfx, 27.2, swell(2.2, 0.12, 80, 1400), 0.0, 0.8)
for k in range(6): put(sfx, 27.3 + k * 0.11, thud(150 + 30 * k, 0.25), (k - 3) * 0.2, 0.28)
# wall smash (29.1) and the wave into the lane
put(sfx, 29.1, thud(45, 1.4), 0.0, 0.95); put(sfx, 29.1, noise(int(SR * 0.7), 300, 7000) * np.exp(-tt(int(SR * 0.7)) / 0.2), 0.0, 0.7)
put(sfx, 29.2, swell(4.2, 0.3, 70, 1100), 0.0, 0.6)
# quiet aftermath: drips, wind
put(bed, 34.0, noise(int(SR * 4.4), 100, 700) * 0.04, 0.0, 1.0)
for t0 in (34.8, 35.7, 36.4, 37.3): put(sfx, t0, clink(1300 + 90 * (t0 % 3), 0.5), (t0 % 2 - 0.5), 0.07)
# inquest: stamp (40.25), a soft pad for "an act of God" (41.45)
put(sfx, 40.25, thud(80, 0.6), 0.0, 0.85); put(sfx, 40.25, noise(int(SR * 0.06), 1500, 6000) * np.exp(-tt(int(SR * 0.06)) / 0.015), 0.0, 0.3)
n = int(SR * 3.2); t = tt(n); pad = sum(np.sin(2 * np.pi * f * t) for f in (196, 247, 294, 392)) * np.minimum(t / 0.6, 1) * np.exp(-np.maximum(t - 0.6, 0) / 1.4)
put(sfx, 41.45, pad, 0.0, 0.05)
# refund: stamp again + coins
put(sfx, 44.5, thud(90, 0.5), 0.0, 0.7)
for k in range(8): put(sfx, 44.6 + k * 0.09, clink(2000 + 240 * (k % 4), 0.35), (k - 4) * 0.1, 0.17)
# last shot: cold wind and a flickering lamp buzz
n = int(SR * 5); put(bed, 45.7, noise(n, 90, 500) * 0.05, 0.0, 1.0)
for k in range(16):
    t0 = 46.2 + k * 0.17 + 0.1 * rng.random()
    if rng.random() < 0.6: put(sfx, t0, noise(int(SR * 0.05), 400, 3000) * np.exp(-tt(int(SR * 0.05)) / 0.015), 0.0, 0.05)
# follow call-to-action: a small bright two-note ding on "follow" (51.6 s)
for k, f in enumerate((880, 1320)): put(sfx, 51.6 + k * 0.12, clink(f, 0.6), 0.0, 0.16)
# bed: low drone that darkens (A1 + fifth), minimal
t = tt(N); drone = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.4 * t) + 0.3 * np.sin(2 * np.pi * 110.4 * t)) * (0.025 + 0.015 * np.sin(2 * np.pi * t / 17))
drone *= np.minimum(t / 2, 1) * np.minimum((DUR - t) / 2, 1)
bed[0] += drone; bed[1] += drone
mix = sfx * 0.8 + bed
mix /= max(1.0, np.abs(mix).max() / 0.9)
out = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "beerflood_sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("sfx ok", DUR, "s")
