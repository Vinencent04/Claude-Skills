"""Original sound for the great-stink short: a synthesized Victorian oompah/march/waltz underscore that follows the story, plus SFX
(flies, bubbling river, squelchy pours, gavel, stamps, brick taps, water flow). numpy only.
usage: python3 stink_audio.py out.wav   (stereo 48 kHz 16-bit, 57.0 s)."""
import sys, wave
import numpy as np
SR = 48000; DUR = 57.0; N = int(SR * DUR)
rng = np.random.default_rng(31)
def tt(n): return np.arange(n) / SR
def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def noise(n, lo=None, hi=None): return fft_filter(rng.standard_normal(n), lo, hi)
mus = np.zeros((2, N)); sfx = np.zeros((2, N))
def put(buf, t0, x, pan=0.0, gain=1.0):
    pan = max(-0.95, min(0.95, pan)); i = int(t0 * SR)
    if i >= N or i + len(x) <= 0: return
    a, b = max(0, -i), min(len(x), N - i)
    buf[0, i + a:i + b] += x[a:b] * gain * np.sqrt((1 - pan) / 2) * 1.414
    buf[1, i + a:i + b] += x[a:b] * gain * np.sqrt((1 + pan) / 2) * 1.414
def brass(f, d=0.3):
    n = int(SR * d); t = tt(n); x = sum(np.sin(2 * np.pi * f * k * t) / k for k in (1, 2, 3, 4)) * np.minimum(t / 0.02, 1) * np.exp(-t / (d * 0.8)); return x * 0.4
def tuba(f, d=0.25):
    n = int(SR * d); t = tt(n); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2 * t)) * np.minimum(t / 0.01, 1) * np.exp(-t / (d * 0.7))
def pluck(f, d=0.4):
    n = int(SR * d); t = tt(n); return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.2) + 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.1)) * np.minimum(t / 0.004, 1)
def thud(f=70, d=0.5):
    n = int(SR * d); t = tt(n); return np.sin(2 * np.pi * (f + 90 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.16)
def clink(f, d=0.4):
    n = int(SR * d); t = tt(n); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.12)
def whoosh(d=0.5, lo=300, hi=3000):
    n = int(SR * d); t = tt(n); return noise(n, lo, hi) * np.sin(np.pi * t / d) ** 2
def squelch(d=0.5):
    n = int(SR * d); t = tt(n); return noise(n, 80, 500) * np.exp(-t / 0.2) * (0.6 + 0.4 * np.sin(2 * np.pi * 18 * t))
def bubbles(d=2.0, rate=14):
    x = np.zeros(int(SR * d))
    for _ in range(int(rate * d)):
        i = int(rng.random() * (len(x) - 4000)); f = 300 + 700 * rng.random(); m = np.arange(3000) / SR; x[i:i + 3000] += np.sin(2 * np.pi * (f + 800 * m) * m) * np.exp(-m / 0.02) * 0.4
    return x
def buzz(d=3.0):
    n = int(SR * d); t = tt(n); return (np.sin(2 * np.pi * (180 + 30 * np.sin(2 * np.pi * 4 * t)) * t) * 0.5 + noise(n, 2000, 6000) * 0.1) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t))
def tap(): 
    n = int(SR * 0.06); t = tt(n); return noise(n, 800, 5000) * np.exp(-t / 0.012)
# underscore: C major oompah (2/4) as a polka: bass on beats 1, chords on beat 2
def oompah(t0, t1, bpm, gain=1.0, key=130.8, mel=True):
    beat = 60.0 / bpm; t = t0; k = 0; scale = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2]
    seq = [0, 2, 4, 2, 5, 4, 2, 0, 1, 3, 5, 3, 4, 2, 1, 0]
    while t < t1:
        if k % 2 == 0: put(mus, t, tuba(key * (1 if (k // 2) % 2 == 0 else 1.5), beat * 0.7), 0.0, 0.34 * gain)
        else:
            for m in (1.25, 1.5, 2.0): put(mus, t, brass(key * 2 * m, beat * 0.4), 0.2, 0.08 * gain)
        if mel and k % 1 == 0: put(mus, t, pluck(key * 4 * scale[seq[k % 16]], beat * 0.9), -0.2, 0.16 * gain)
        k += 1; t += beat
oompah(0.0, 8.5, 140, 0.9)                     # flee: a hurried polka
oompah(8.5, 16.5, 110, 0.8, 110.0)             # the river
oompah(16.5, 25.4, 120, 0.8, 123.5)            # the heat, the curtains
# doctors panic (25.4-31.5): a low drone and a heartbeat
t = tt(N); dr = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 58 * t)) * 0.03 * np.clip((t - 25.0) / 1.0, 0, 1) * np.clip((31.8 - t) / 0.8, 0, 1); mus[0] += dr; mus[1] += dr
for k in range(10): put(sfx, 26.0 + 0.55 * k, thud(60, 0.25), 0.0, 0.3); put(sfx, 26.18 + 0.55 * k, thud(55, 0.2), 0.0, 0.2)
# the law and the sewers: a triumphant march
oompah(33.5, 48.0, 104, 1.1, 130.8)
for k, f in enumerate((523, 659, 784, 1047)): put(mus, 34.0 + 0.12 * k, brass(f, 0.6), 0.0, 0.14)
# the end: a gentle waltz, then back to a light polka for the CTA
oompah(48.0, 57.0, 96, 0.8, 98.0)
# SFX
put(sfx, 0.9, thud(50, 0.8), 0.0, 0.7); put(sfx, 0.9, whoosh(0.6, 400, 5000), 0.0, 0.3)
for k in range(14): put(sfx, 0.9 + 0.14 * k, thud(90, 0.1), (k % 5 - 2) * 0.25, 0.14)
put(sfx, 0.0, buzz(8.0), 0.3, 0.22); put(sfx, 8.2, buzz(14.0), -0.3, 0.18)
for k in range(5): put(sfx, 8.3 + 0.9 * k, bubbles(1.0, 10), 0.0, 0.25)
put(sfx, 12.5, squelch(1.5), 0.0, 0.5)
for k in range(6): put(sfx, 12.6 + 0.35 * k, squelch(0.4), (k % 3 - 1) * 0.3, 0.25)
put(sfx, 15.4, whoosh(0.4, 500, 4000), 0.0, 0.2)
for k, f in enumerate((660, 700, 760)): put(sfx, 17.6 + 0.2 * k, clink(f, 0.6), 0.0, 0.12)
put(sfx, 19.4, bubbles(4.0, 24), 0.0, 0.35)
put(sfx, 22.5, whoosh(0.7, 200, 2500), 0.0, 0.3)
put(sfx, 30.8, thud(70, 0.8), 0.0, 0.9); put(sfx, 30.8, clink(1100, 0.8), 0.0, 0.3)
put(sfx, 31.6, whoosh(0.5, 500, 3000), 0.0, 0.2)
for k in range(12): put(sfx, 34.0 + 0.14 * k, clink(1200, 0.12), 0.0, 0.12)
put(sfx, 35.9, thud(100, 0.5), 0.0, 0.9); put(sfx, 35.9, clink(900, 0.5), 0.0, 0.3)
for k in range(30): put(sfx, 38.0 + 0.19 * k, tap(), (k % 7 - 3) * 0.2, 0.3)
for k in range(16): put(sfx, 41.2 + 0.07 * k, clink(1500 + 60 * k, 0.1), 0.0, 0.1)
put(sfx, 43.4, squelch(2.0), 0.0, 0.3); put(sfx, 43.4, noise(int(SR * 5), 150, 900) * 0.07, 0.0, 1.0)
put(sfx, 47.0, whoosh(0.6, 600, 5000), 0.0, 0.3)
for k, f in enumerate((523, 659, 784, 1047)): put(sfx, 48.2 + 0.1 * k, clink(f, 0.9), 0.0, 0.18)
for k in range(10): put(sfx, 48.6 + 0.08 * k, noise(int(SR * 0.4), 300, 3000) * np.exp(-tt(int(SR * 0.4)) / 0.2), (k % 5 - 2) * 0.35, 0.07)
for k, f in enumerate((880, 1320)): put(sfx, 53.2 + k * 0.12, clink(f, 0.6), 0.0, 0.16)
mix = sfx * 0.8 + mus * 0.55
mix /= max(1.0, np.abs(mix).max() / 0.9)
out = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "stink_sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("sfx ok", DUR, "s")
