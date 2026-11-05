"""Original sound for the cadaver-synod short: synthesized SFX + a dark drone/choir bed, timed to story.ts events. numpy only.
usage: python3 cadaver_audio.py out.wav   (stereo 48 kHz 16-bit, 53.4 s)."""
import sys, wave
import numpy as np
SR = 48000; DUR = 53.4; N = int(SR * DUR)
rng = np.random.default_rng(13)
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
def splash(d=0.8):
    n = int(SR * d); t = tt(n); return noise(n, 400, 6000) * np.exp(-t / 0.2) * np.minimum(t / 0.01, 1)
def dig(d=0.18):
    n = int(SR * d); t = tt(n); return noise(n, 100, 1800) * np.exp(-t / 0.05)
def bell(f, d=2.5):
    n = int(SR * d); t = tt(n); return (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 2.4 * t) + 0.3 * np.sin(2 * np.pi * f * 5.1 * t)) * np.exp(-t / 0.9)
# 0-3.8 hook A: wind, dig/crunch, hurried footsteps carrying the throne
put(bed, 0.0, noise(int(SR * 6), 80, 900) * 0.06, 0.0, 1.0)
for k in range(6): put(sfx, 0.1 + 0.12 * k, dig(), (k % 3 - 1) * 0.3, 0.3)
put(sfx, 0.9, thud(60, 0.5), 0.0, 0.5)
for k in range(14): put(sfx, 1.2 + 0.27 * k, thud(85, 0.15), 0.0, 0.2)
# 3.8-6.3 trial: gavel, crowd cheer, church bell
put(sfx, 3.85, bell(220, 3.0), 0.0, 0.15)
put(sfx, 5.55, thud(120, 0.4), 0.0, 0.9); put(sfx, 5.55, dig(0.1) * 2, 0.0, 0.5)
for k in range(10): put(sfx, 5.65 + 0.04 * k, noise(int(SR * 0.5), 300, 3000) * np.exp(-tt(int(SR * 0.5)) / 0.25), (k % 5 - 2) * 0.35, 0.07)
# hate steam hiss, tombstone, bats
put(sfx, 6.9, whoosh(1.0, 1500, 7000), 0.0, 0.2)
for k in range(9): put(sfx, 9.5 + 0.18 * k, whoosh(0.2, 800, 4000), 0.4, 0.12)
put(sfx, 11.0, bell(110, 2.8), 0.0, 0.3)
# digging up, dressing, carrying
for k in range(40): put(sfx, 13.9 + 0.11 * k, dig(), (k % 3 - 1) * 0.4, 0.25)
put(sfx, 15.0, whoosh(0.4, 500, 3500), 0.0, 0.3); put(sfx, 16.3, clink(1320, 0.8), 0.0, 0.22)
for k in range(16): put(sfx, 17.2 + 0.14 * k, thud(85, 0.12), 0.0, 0.14)
# deacon speaking: small ticks; charges: scroll thuds
for k in range(4): put(sfx, 21.2 + 0.8 * k, clink(700 + 80 * k, 0.2), 0.3, 0.12)
put(sfx, 25.4, thud(70, 0.4), -0.3, 0.6); put(sfx, 26.8, thud(70, 0.4), 0.3, 0.6)
put(bed, 28.8, noise(int(SR * 2.0), 100, 500) * 0.06, 0.0, 1.0)
for k in range(5): put(sfx, 28.9 + 0.3 * k, clink(3400 + 60 * k, 0.05), 0.2, 0.05)
put(sfx, 30.4, thud(120, 0.5), 0.0, 1.0); put(sfx, 30.4, bell(165, 3.0), 0.0, 0.25)
put(sfx, 31.2, whoosh(0.4, 400, 5000), 0.0, 0.5)
for k in range(3): put(sfx, 32.4 + 0.1 * k, clink(2800, 0.1), 0.0, 0.3)
put(sfx, 35.0, whoosh(0.6, 300, 2500), 0.0, 0.3); put(sfx, 36.35, splash(), 0.0, 0.9); put(sfx, 36.35, thud(45, 0.7), 0.0, 0.7)
# mob: torches crackle + running feet
put(bed, 37.0, noise(int(SR * 3.0), 300, 4000) * 0.04, 0.0, 1.0)
for k in range(60): put(sfx, 37.0 + 0.05 * k, thud(90 + 10 * (k % 3), 0.1), (k % 7 - 3) * 0.15, 0.12)
put(sfx, 40.3, thud(60, 0.6), 0.0, 0.9); put(sfx, 40.3, clink(180, 1.4), 0.0, 0.3)
n = int(SR * 1.6); t = tt(n); put(sfx, 41.7, np.sin(2 * np.pi * np.cumsum(260 - 150 * t / 1.6) / SR) * np.exp(-t / 0.9) * 0.4, 0.0, 0.2)
# river, fisherman, reburial
put(bed, 42.4, noise(int(SR * 3.0), 100, 600) * 0.05, 0.0, 1.0)
put(sfx, 43.2, splash(0.6), 0.2, 0.3)
for k in range(8): put(sfx, 43.2 + 0.2 * k, dig(0.08), 0.2, 0.18)
put(sfx, 45.0, bell(196, 3.0), 0.0, 0.3)
for k, f in enumerate((392, 494, 587)): put(sfx, 45.6 + 0.2 * k, clink(f, 1.0), 0.0, 0.2)
put(sfx, 47.6, whoosh(0.5, 400, 4000), 0.0, 0.3); put(sfx, 48.9, thud(110, 0.5), 0.0, 0.9)
for k, f in enumerate((523, 659, 784)): put(sfx, 49.0 + 0.1 * k, clink(f, 0.9), 0.0, 0.18)
for k, f in enumerate((880, 1320)): put(sfx, 51.5 + k * 0.12, clink(f, 0.6), 0.0, 0.16)
# bed: dark drone with a soft fifth, slowly breathing
t = tt(N); drone = (np.sin(2 * np.pi * 49 * t) + 0.5 * np.sin(2 * np.pi * 73.4 * t) + 0.25 * np.sin(2 * np.pi * 98 * t)) * (0.024 + 0.012 * np.sin(2 * np.pi * t / 13))
drone *= np.minimum(t / 2, 1) * np.minimum((DUR - t) / 2, 1); bed[0] += drone; bed[1] += drone
mix = sfx * 0.8 + bed; mix /= max(1.0, np.abs(mix).max() / 0.9)
out = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "cadaver_sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("sfx ok", DUR, "s")
