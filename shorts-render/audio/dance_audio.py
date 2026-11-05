"""Original sound for the dancing-plague short: a synthesized medieval dance tune (lute-like plucks, flute, drum) that runs under the dance scenes,
stops when the city bans music, becomes a hushed drone at the shrine and returns as a party at the end; plus SFX. numpy only.
usage: python3 dance_audio.py out.wav   (stereo 48 kHz 16-bit, 52.0 s)."""
import sys, wave
import numpy as np
SR = 48000; DUR = 52.0; N = int(SR * DUR)
rng = np.random.default_rng(21)
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
def pluck(f, d=0.45):
    n = int(SR * d); t = tt(n); x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.18) + 0.4 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.1) + 0.15 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t / 0.06)
    return x * np.minimum(t / 0.004, 1)
def flute(f, d=0.4):
    n = int(SR * d); t = tt(n); x = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t)) * np.minimum(t / 0.05, 1) * np.minimum((d - t) / 0.08, 1) * (1 + 0.03 * np.sin(2 * np.pi * 5.5 * t))
    return x * 0.6 + noise(n, 3000, 9000) * 0.02
def drum(f=90, d=0.3):
    n = int(SR * d); t = tt(n); return np.sin(2 * np.pi * (f + 50 * np.exp(-t / 0.04)) * t) * np.exp(-t / 0.1)
def tamb(d=0.12):
    n = int(SR * d); t = tt(n); return noise(n, 4000, 12000) * np.exp(-t / 0.03)
def clink(f, d=0.4):
    n = int(SR * d); t = tt(n); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.12)
def thud(f=70, d=0.5):
    n = int(SR * d); t = tt(n); return np.sin(2 * np.pi * (f + 90 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.16)
def whoosh(d=0.5, lo=300, hi=3000):
    n = int(SR * d); t = tt(n); return noise(n, lo, hi) * np.sin(np.pi * t / d) ** 2
# D-dorian dance tune, 2 bars of 4 beats, repeating. Frequencies (Hz): D4 293.7, E4 329.6, F4 349.2, G4 392, A4 440, B4 493.9, C5 523.3, D5 587.3
mel = [440, 392, 440, 587, 523, 440, 392, 349, 329, 392, 440, 392, 349, 329, 293, 329]
bass = [146.8, 0, 220, 0, 196, 0, 220, 0]
def tune(t0, t1, bpm, gain=1.0, melody=True, drumming=True):
    beat = 60.0 / bpm; k = 0; t = t0
    while t < t1:
        step = k % 16
        if melody: put(mus, t, pluck(mel[step], beat * 0.9), 0.15, 0.30 * gain); 
        if melody and step % 4 == 0: put(mus, t, flute(mel[(step + 4) % 16] * 2 if False else mel[step], beat * 1.6), -0.2, 0.12 * gain)
        if k % 2 == 0 and bass[(k // 2) % 8]: put(mus, t, pluck(bass[(k // 2) % 8], beat * 1.8), 0.0, 0.34 * gain)
        if drumming:
            if k % 4 in (0, 2): put(mus, t, drum(90, 0.3), 0.0, 0.3 * gain)
            put(mus, t + beat * 0.5, tamb(), 0.25, 0.1 * gain)
        k += 1; t += beat * 0.5
# the tune: starts when she starts dancing (3.4 s), speeds up with the crowd, stops at "banned music" (30.2 s)
tune(3.4, 9.7, 110, 0.7); tune(9.7, 20.4, 128, 0.9); tune(20.4, 30.0, 150, 1.1)
# the city's stage: a drum roll under "hired musicians"
for k in range(14): put(mus, 22.9 + 0.05 * k, drum(120, 0.1), 0.0, 0.1 + 0.01 * k)
# banned: record scratch-like drop and silence, then a low hushed drone (shrine, 33.5-39)
n = int(SR * 0.7); t = tt(n); put(sfx, 30.2, np.sin(2 * np.pi * np.cumsum(500 - 420 * t / 0.7) / SR) * np.exp(-t / 0.5) * 0.4, 0.0, 0.3)
put(sfx, 31.1, thud(45, 1.0), 0.0, 0.8); put(sfx, 31.1, noise(int(SR * 0.6), 200, 5000) * np.exp(-tt(int(SR * 0.6)) / 0.18), 0.0, 0.5)
t = tt(N); drone = (np.sin(2 * np.pi * 73.4 * t) + 0.5 * np.sin(2 * np.pi * 110 * t)) * (0.03 + 0.012 * np.sin(2 * np.pi * t / 9))
env = np.clip((t - 33.0) / 2.0, 0, 1) * np.clip((40.0 - t) / 1.5, 0, 1); mus[0] += drone * env; mus[1] += drone * env
for k, f in enumerate((587, 523, 440, 392)): put(mus, 38.6 + 0.35 * k, flute(f, 0.5), 0.0, 0.12)
# mystery: question plinks
for k, f in enumerate((440, 466, 440, 415)): put(sfx, 40.3 + 0.5 * k, clink(f * 2, 0.5), 0.0, 0.1)
# the party: full tune again at 47.1 s, a little faster, with a cheer
tune(47.1, 52.0, 140, 1.1)
put(sfx, 47.1, whoosh(0.6, 500, 6000), 0.0, 0.3)
for k in range(8): put(sfx, 47.2 + 0.08 * k, noise(int(SR * 0.4), 300, 3000) * np.exp(-tt(int(SR * 0.4)) / 0.2), (k % 5 - 2) * 0.35, 0.07)
# SFX: steps/crowd stomp while dancing (hundreds: louder), sweat plops, doctor chime, "DANCE!" sting, death chime, red-shoe sparkle, final ding
for k in range(60): put(sfx, 3.4 + 0.52 * k, thud(85, 0.12), 0.0, 0.07 + 0.003 * min(k, 40))
put(sfx, 15.3, clink(262, 1.2), 0.0, 0.2); put(sfx, 19.15, thud(110, 0.5), 0.0, 0.9)
for k, f in enumerate((523, 659, 784)): put(sfx, 19.2 + 0.1 * k, clink(f, 0.8), 0.0, 0.2)
put(sfx, 28.5, clink(220, 2.2), 0.0, 0.3)
for k, f in enumerate((1568, 1760, 2093)): put(sfx, 35.35 + 0.12 * k, clink(f, 0.5), 0.0, 0.14)
for k, f in enumerate((880, 1320)): put(sfx, 49.2 + k * 0.12, clink(f, 0.6), 0.0, 0.16)
mix = sfx * 0.8 + mus * 0.55
mix /= max(1.0, np.abs(mix).max() / 0.9)
out = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "dance_sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("sfx ok", DUR, "s")
