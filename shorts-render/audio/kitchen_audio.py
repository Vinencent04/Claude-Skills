"""Original sound for the 15 s kitchen short: synthesized SFX + a small pizzicato/marimba score, timed to story.ts.
numpy only. Output: stereo 48 kHz 24-bit wav (written via the stdlib wave module as 16/24-bit PCM)."""
import sys, wave
import numpy as np

SR = 48000
DUR = 30.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

# story times (seconds), mirrored from src/videos/kitchen/story.ts
T_WIND, T_TOSS, T_STICK, T_PEEL, T_FALL, T_LAND, T_LICK = 4.15, 5.0, 6.05, 9.6, 12.95, 13.25, 14.2
T2_WIND, T2_TOSS, T2_STICK, T2_PEEL, T2_FALL, T2_LAND, T2_LICK = 18.2, 19.0, 20.0, 23.0, 27.6, 27.9, 29.15

def tt(n): return np.arange(n) / SR
def env_ad(n, a, d):
    t = tt(n); e = np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-t / max(d, 1e-4)); return e
def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def noise(n, lo=None, hi=None): return fft_filter(rng.standard_normal(n), lo, hi)

mus = np.zeros((2, N)); sfx = np.zeros((2, N))
def put(buf, t0, x, pan=0.0, gain=1.0):
    i = int(t0 * SR)
    if i >= N or i + len(x) <= 0: return
    a, b = max(0, -i), min(len(x), N - i)
    l, r = (1 - pan) / 2 + 0.5 * 0, (1 + pan) / 2
    buf[0, i + a:i + b] += x[a:b] * gain * np.sqrt(2) * np.sqrt((1 - pan) / 2)
    buf[1, i + a:i + b] += x[a:b] * gain * np.sqrt(2) * np.sqrt((1 + pan) / 2)

# ---------------- instruments ----------------
def marimba(f, d=0.5):
    n = int(SR * d); t = tt(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.22) + 0.35 * np.sin(2 * np.pi * f * 3.9 * t) * np.exp(-t / 0.05) + 0.1 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / 0.02)
    return x * np.minimum(t / 0.004, 1)
def pluck(f, d=0.45):
    n = int(SR * d); t = tt(n)
    x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / (0.25 / k ** 0.7)) for k, a in [(1, 1), (2, 0.5), (3, 0.3), (4, 0.15)])
    return x * np.minimum(t / 0.003, 1)
def bass(f, d=0.3):
    n = int(SR * d); t = tt(n)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.16) * np.minimum(t / 0.004, 1) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.06)
def whistle(f0, f1, d, vib=6.0, vd=0.012, breath=0.06):
    n = int(SR * d); t = tt(n); f = f0 + (f1 - f0) * (t / d) + f0 * vd * np.sin(2 * np.pi * vib * t) * np.minimum(t / 0.12, 1)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.05 * np.sin(2 * ph)
    x = x + breath * fft_filter(rng.standard_normal(n), 2500, 6000)
    return x * np.minimum(t / 0.03, 1) * np.minimum((d - t) / 0.05, 1)
NOTE = {"C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.0, "A4": 440.0, "B4": 493.88, "C5": 523.25, "D5": 587.33, "E5": 659.25, "F5": 698.46, "G5": 783.99,
        "A5": 880.0, "B5": 987.77, "C6": 1046.5, "C3": 130.81, "D3": 146.83, "F3": 174.61, "G3": 196.0, "A3": 220.0, "E3": 164.81, "Bb4": 466.16, "Bb3": 233.08}

# ---------------- score (110 bpm feel, quirky pizzicato) ----------------
beat = 60 / 118
# A: jaunty (0 - 4.15): bass on 1/3, plucks off-beat, marimba tune
bar = 4 * beat
chords = [("C3", "E4", "G4"), ("F3", "A4", "C5"), ("G3", "B4", "D5"), ("C3", "E4", "G4")]
t = 0.0; ci = 0
while t < T_WIND - 0.2:
    b, c1, c2 = chords[ci % 4]
    put(mus, t, bass(NOTE[b]), -0.2, 0.5); put(mus, t + 2 * beat, bass(NOTE[b] * 1.5), -0.2, 0.4)
    for k in (1, 3):
        put(mus, t + k * beat, pluck(NOTE[c1], 0.25), 0.2, 0.22); put(mus, t + k * beat, pluck(NOTE[c2], 0.25), 0.3, 0.18)
    t += bar; ci += 1
tune = [("E5", 0.0), ("G5", 0.5), ("E5", 1.0), ("C5", 1.5), ("D5", 2.0), ("E5", 2.5), ("D5", 3.0)]
for nme, k in tune:
    if k * beat + 0.3 < T_WIND - 0.3: put(mus, 0.25 + k * beat, marimba(NOTE[nme], 0.4), 0.1, 0.34)
# B: wind-up tension (4.15 - 5.0): rising chromatic plucks + riser, then HIT on the toss
for i, (nm, k) in enumerate([("C4", 0), ("D4", 1), ("E4", 2), ("F4", 3), ("G4", 4), ("A4", 5), ("B4", 6), ("C5", 7)]):
    put(mus, T_WIND + k * 0.105, pluck(NOTE[nm], 0.2), 0.0, 0.26)
put(mus, T_TOSS - 0.02, 0.9 * marimba(NOTE["C6"], 0.6) + 0.5 * marimba(NOTE["G5"], 0.6) + 0.4 * marimba(NOTE["E5"], 0.6), 0.0, 0.32)
# C: flight (5.0 - 6.05): twinkling glissando up (marimba run) then stinger
for i in range(10):
    put(mus, T_TOSS + 0.1 + i * 0.09, marimba(NOTE["C5"] * 2 ** (i * 2 / 12), 0.3), 0.15 * ((-1) ** i), 0.18)
n = int(SR * 0.5); t_ = tt(n)
sting = (np.sin(2 * np.pi * 98 * t_) + 0.6 * np.sin(2 * np.pi * 103 * t_) + 0.4 * np.sin(2 * np.pi * 147 * t_)) * np.exp(-t_ / 0.28)
put(mus, T_STICK, sting, 0.0, 0.45)
# D: suspense tiptoe (6.4 - 12.9): staccato pizzicato "sneaking" bass line + sparse plucks, slowing the bounce
t = 6.4; step = 0.46; k = 0
line = ["C3", "Bb3", "A3", "G3", "A3", "Bb3", "C3", "E3"]
while t < T_FALL - 0.15:
    put(mus, t, bass(NOTE[line[k % len(line)]], 0.22), -0.1, 0.5)
    if k % 2 == 1: put(mus, t + step / 2, pluck(NOTE["E5"] if k % 4 == 1 else NOTE["Bb4"], 0.12), 0.35 * (1 if k % 4 == 1 else -1), 0.16)
    t += step; k += 1
# E: the fall, plop, comic resolve
for i, nm in enumerate(["G5", "E5", "C5", "G4"]):
    put(mus, T_FALL + i * 0.075, marimba(NOTE[nm], 0.3), 0.0, 0.24)
put(mus, T_LAND, bass(NOTE["C3"], 0.5), 0.0, 0.8)
put(mus, T_LAND + 0.02, marimba(NOTE["C4"], 0.6) * 0.7 + marimba(NOTE["E4"], 0.6) * 0.5 + marimba(NOTE["G4"], 0.6) * 0.5, 0.0, 0.3)
for i, (nm, d) in enumerate([("E5", 0), ("D5", 0.28), ("E5", 0.56)]):
    put(mus, T_LICK + 0.2 + d, marimba(NOTE[nm], 0.4), 0.2, 0.28)
put(mus, T_LICK + 0.95, marimba(NOTE["G4"], 0.35) * 0.6, -0.1, 0.3); put(mus, T_LICK + 1.0, marimba(NOTE["C5"], 0.5) * 0.9 + np.pad(bass(NOTE["C3"], 0.4), (0, 4800)) * 0.8, 0.0, 0.3)

# ---------------- SFX ----------------
# sizzle on the pan (0 - 5.2) with crackle
n = int(SR * 5.4); z = noise(n, 3500, 11000); e = 0.5 + 0.5 * np.abs(noise(n, None, 14))
e = e / e.max()
cr = np.zeros(n)
for _ in range(110): j = rng.integers(0, n - 400); cr[j:j + 300] += rng.standard_normal(300) * np.exp(-np.arange(300) / 40) * rng.uniform(0.3, 1.0)
fade = np.minimum(tt(n) / 0.3, 1) * np.clip((5.4 - tt(n)) / 0.5, 0, 1)
put(sfx, 0.0, (z * (0.5 + 0.5 * e) * 0.35 + fft_filter(cr, 2500, 9000) * 0.5) * fade, -0.15, 0.55)
# whistle tune (0.25 - 2.2)
for nm, a, d in [("G5", 0.25, 0.22), ("E5", 0.5, 0.2), ("G5", 0.75, 0.22), ("A5", 1.0, 0.3), ("G5", 1.35, 0.22), ("E5", 1.6, 0.2), ("C5", 1.85, 0.34)]:
    put(sfx, a, whistle(NOTE[nm], NOTE[nm] * 1.012, d, 7), -0.1, 0.3)
# pan clank + chuckle-ish click at the smirk (2.6)
n = int(SR * 0.35); t_ = tt(n)
put(sfx, 2.62, (np.sin(2 * np.pi * 1840 * t_) * np.exp(-t_ / 0.05) + 0.6 * np.sin(2 * np.pi * 2760 * t_) * np.exp(-t_ / 0.03)) * 0.5, -0.2, 0.5)
# wind-up: creak + rising whoosh (4.15 - 4.95)
n = int(SR * 0.85); t_ = tt(n)
sweep = np.sin(2 * np.pi * np.cumsum(180 + 700 * (t_ / 0.85) ** 2) / SR) * 0.25 + fft_filter(rng.standard_normal(n), 500 + 0 * t_[0], 3000) * 0.5 * (t_ / 0.85)
put(sfx, T_WIND, sweep * np.minimum(t_ / 0.1, 1) * np.clip((0.85 - t_) / 0.05, 0, 1), -0.1, 0.4)
# toss whoosh (5.0) and a rising swish through the flight
n = int(SR * 0.55); t_ = tt(n)
put(sfx, T_TOSS - 0.03, fft_filter(rng.standard_normal(n), 600, 5000) * np.exp(-t_ / 0.17) * 1.2, 0.1, 0.8)
n = int(SR * 1.0); t_ = tt(n)
put(sfx, T_TOSS + 0.1, np.sin(2 * np.pi * np.cumsum(500 + 900 * t_ / 1.0) / SR) * 0.12 * np.exp(-((t_ - 0.5) / 0.4) ** 2) * (1 + 0 * t_), 0.2, 0.5)
# splat on the ceiling (6.05): wet slap + thump
n = int(SR * 0.5); t_ = tt(n)
slap = fft_filter(rng.standard_normal(n), 300, 4500) * np.exp(-t_ / 0.09) + 0.9 * np.sin(2 * np.pi * (70 - 25 * t_) * t_ * 1) * np.exp(-t_ / 0.14)
put(sfx, T_STICK, slap * 1.3, 0.15, 0.9)
put(sfx, T_STICK + 0.06, fft_filter(rng.standard_normal(int(SR * 0.25)), 1500, 6000) * np.exp(-tt(int(SR * 0.25)) / 0.07), 0.2, 0.5)
# cook gasp (6.1) and nervous off-key whistling (7.7 - 9.5)
n = int(SR * 0.35); t_ = tt(n)
put(sfx, T_STICK + 0.05, fft_filter(rng.standard_normal(n), 800, 3500) * np.sin(np.pi * t_ / 0.35) ** 1.5, -0.2, 0.7)
for a, f0, f1, d in [(7.7, "F5", "E5", 0.45), (8.25, "E5", "Eb5" if False else "D5", 0.4), (8.75, "F5", "E5", 0.5)]:
    put(sfx, a, whistle(NOTE[f0], NOTE[f1], d, 5.5, 0.03, 0.12), -0.2, 0.22)
# kid munching (cereal crunch) every 0.838 s, until 12.6, softer
t = 0.8
while t < 12.6:
    n = int(SR * 0.09); t_ = tt(n)
    put(sfx, t, fft_filter(rng.standard_normal(n), 1500, 7000) * np.exp(-t_ / 0.018) * 1.0 + fft_filter(rng.standard_normal(n), 200, 900) * np.exp(-t_ / 0.03) * 0.5, 0.45, 0.32)
    put(sfx, t + 0.12, fft_filter(rng.standard_normal(n), 1800, 8000) * np.exp(-t_ / 0.015) * 0.7, 0.45, 0.22)
    t += 2 * np.pi / 7.5
# drips of syrup from the ceiling (9.8 - 12.9), getting faster; slimy stretch under them
for a in [9.8, 10.7, 11.35, 11.85, 12.2, 12.5, 12.7, 12.85]:
    n = int(SR * 0.2); t_ = tt(n)
    f = 900 - 500 * np.minimum(t_ / 0.12, 1)
    put(sfx, a, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t_ / 0.05) * np.minimum(t_ / 0.002, 1), 0.3, 0.55)
n = int(SR * 3.2); t_ = tt(n)
slime = fft_filter(rng.standard_normal(n), 120, 700) * (0.3 + 0.7 * (np.sin(2 * np.pi * (1.5 + t_ / 2) * t_) ** 2)) * (t_ / 3.2) ** 1.5 * np.minimum((3.2 - t_) / 0.1, 1)
put(sfx, T_PEEL + 0.1, slime * 0.9, 0.3, 0.55)
# fall whoosh (12.95 - 13.25) and plop on the head (13.25)
n = int(SR * 0.32); t_ = tt(n)
put(sfx, T_FALL - 0.02, np.sin(2 * np.pi * np.cumsum(1500 - 1100 * t_ / 0.32) / SR) * 0.18 * np.minimum(t_ / 0.03, 1) + fft_filter(rng.standard_normal(n), 800, 4000) * 0.4 * (t_ / 0.32), -0.1, 0.8)
n = int(SR * 0.7); t_ = tt(n)
plop = fft_filter(rng.standard_normal(n), 250, 3500) * np.exp(-t_ / 0.07) + 1.0 * np.sin(2 * np.pi * (140 - 70 * np.minimum(t_ / 0.15, 1)) * t_) * np.exp(-t_ / 0.2)
put(sfx, T_LAND, plop * 1.3, 0.1, 0.95)
# dazed stars: little bell twinkles (13.4 - 14.1)
for i, nm in enumerate(["E5", "G5", "C6", "G5"]):
    n = int(SR * 0.5); t_ = tt(n)
    put(sfx, T_LAND + 0.18 + i * 0.12, (np.sin(2 * np.pi * NOTE[nm] * t_) + 0.3 * np.sin(2 * np.pi * NOTE[nm] * 2.76 * t_)) * np.exp(-t_ / 0.2) * 0.8, 0.4 * ((-1) ** i), 0.25)
# cook relief gasp / sigh (13.8)
n = int(SR * 0.6); t_ = tt(n)
put(sfx, 13.8, fft_filter(rng.standard_normal(n), 400, 2500) * np.sin(np.pi * t_ / 0.6) ** 2 * 0.8, -0.2, 0.5)
# kid licks (14.25, 14.6): wet slurps
for a in (T_LICK + 0.1, T_LICK + 0.5):
    n = int(SR * 0.28); t_ = tt(n)
    f = 300 + 900 * np.sin(np.pi * t_ / 0.28)
    put(sfx, a, np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 * np.sin(np.pi * t_ / 0.28) + fft_filter(rng.standard_normal(n), 1200, 5000) * 0.25 * np.sin(np.pi * t_ / 0.28), 0.4, 0.6)

# ================= ACT 2 (15 - 30 s): the cook tries again =================
# music: relieved jaunty (15 - 18.2), gentle wind-up, hit, flight, sting, suspense, fall, plop, comic end
t = 15.2; ci = 0
while t < T2_WIND - 0.2:
    b, c1, c2 = chords[ci % 4]
    put(mus, t, bass(NOTE[b]), -0.2, 0.5); put(mus, t + 2 * beat, bass(NOTE[b] * 1.5), -0.2, 0.4)
    for k in (1, 3):
        put(mus, t + k * beat, pluck(NOTE[c1], 0.25), 0.2, 0.22); put(mus, t + k * beat, pluck(NOTE[c2], 0.25), 0.3, 0.18)
    t += bar; ci += 1
for nme, k in [("D5", 0.0), ("E5", 0.5), ("G5", 1.0), ("E5", 1.5), ("D5", 2.0)]:
    put(mus, 15.3 + k * beat, marimba(NOTE[nme], 0.4), 0.1, 0.3)
for i, (nm, k) in enumerate([("C4", 0), ("D4", 1), ("E4", 2), ("G4", 3), ("A4", 4), ("C5", 5)]):
    put(mus, T2_WIND + k * 0.12, pluck(NOTE[nm], 0.2), 0.0, 0.24)
put(mus, T2_TOSS - 0.02, 0.9 * marimba(NOTE["C6"], 0.6) + 0.5 * marimba(NOTE["G5"], 0.6) + 0.4 * marimba(NOTE["E5"], 0.6), 0.0, 0.3)
for i in range(9):
    put(mus, T2_TOSS + 0.1 + i * 0.1, marimba(NOTE["C5"] * 2 ** (i * 2 / 12), 0.3), 0.15 * ((-1) ** i), 0.17)
n = int(SR * 0.5); t_ = tt(n)
put(mus, T2_STICK, (np.sin(2 * np.pi * 98 * t_) + 0.6 * np.sin(2 * np.pi * 103 * t_) + 0.4 * np.sin(2 * np.pi * 147 * t_)) * np.exp(-t_ / 0.28), 0.0, 0.45)
t = 20.5; k = 0
while t < T2_FALL - 0.15:
    put(mus, t, bass(NOTE[line[k % len(line)]], 0.22), -0.1, 0.5)
    if k % 2 == 1: put(mus, t + 0.23, pluck(NOTE["E5"] if k % 4 == 1 else NOTE["Bb4"], 0.12), 0.35 * (1 if k % 4 == 1 else -1), 0.16)
    t += 0.46 - 0.004 * k; k += 1   # the tiptoe speeds up a little: she is about to fall
for i, nm in enumerate(["G5", "E5", "C5", "G4"]):
    put(mus, T2_FALL + i * 0.075, marimba(NOTE[nm], 0.3), 0.0, 0.24)
put(mus, T2_LAND, bass(NOTE["C3"], 0.5), 0.0, 0.8)
put(mus, T2_LAND + 0.02, marimba(NOTE["C4"], 0.6) * 0.7 + marimba(NOTE["E4"], 0.6) * 0.5 + marimba(NOTE["G4"], 0.6) * 0.5, 0.0, 0.3)
for nm, d in [("E5", 0), ("D5", 0.28), ("E5", 0.56)]:
    put(mus, T2_LICK + 0.1 + d, marimba(NOTE[nm], 0.4), 0.2, 0.28)
put(mus, 29.75, marimba(NOTE["G4"], 0.3) * 0.6, -0.1, 0.3); put(mus, 29.82, marimba(NOTE["C5"], 0.5) * 0.9 + np.pad(bass(NOTE["C3"], 0.4), (0, 4800)) * 0.8, 0.0, 0.3)

# sfx: sizzle of the new pancake (17.5 - 19.2), whistling, gentle wind-up, flick
n = int(SR * 1.9); z = noise(n, 3500, 11000)
cr = np.zeros(n)
for _ in range(35): j = rng.integers(0, n - 400); cr[j:j + 300] += rng.standard_normal(300) * np.exp(-np.arange(300) / 40) * rng.uniform(0.3, 1.0)
fade = np.minimum(tt(n) / 0.3, 1) * np.clip((1.9 - tt(n)) / 0.4, 0, 1)
put(sfx, 17.4, (z * 0.3 + fft_filter(cr, 2500, 9000) * 0.5) * fade, -0.15, 0.5)
for nm, a, d in [("E5", 17.55, 0.22), ("G5", 17.8, 0.2), ("A5", 18.0, 0.18)]:
    put(sfx, a, whistle(NOTE[nm], NOTE[nm] * 1.012, d, 7), -0.1, 0.3)
n = int(SR * 0.8); t_ = tt(n)
put(sfx, T2_WIND, (np.sin(2 * np.pi * np.cumsum(160 + 450 * (t_ / 0.8) ** 2) / SR) * 0.2 + fft_filter(rng.standard_normal(n), 500, 3000) * 0.4 * (t_ / 0.8)) * np.minimum(t_ / 0.1, 1) * np.clip((0.8 - t_) / 0.05, 0, 1), -0.1, 0.35)
n = int(SR * 0.55); t_ = tt(n)
put(sfx, T2_TOSS - 0.03, fft_filter(rng.standard_normal(n), 600, 5000) * np.exp(-t_ / 0.2) * 1.0, 0.1, 0.7)
n = int(SR * 1.0); t_ = tt(n)
put(sfx, T2_TOSS + 0.1, np.sin(2 * np.pi * np.cumsum(500 + 900 * t_) / SR) * 0.12 * np.exp(-((t_ - 0.5) / 0.4) ** 2), -0.2, 0.5)
n = int(SR * 0.5); t_ = tt(n)
put(sfx, T2_STICK, (fft_filter(rng.standard_normal(n), 300, 4500) * np.exp(-t_ / 0.09) + 0.9 * np.sin(2 * np.pi * (70 - 25 * t_) * t_) * np.exp(-t_ / 0.14)) * 1.3, -0.2, 0.9)
n = int(SR * 0.35); t_ = tt(n)
put(sfx, T2_STICK + 0.05, fft_filter(rng.standard_normal(n), 800, 3500) * np.sin(np.pi * t_ / 0.35) ** 1.5, -0.2, 0.7)
for a, f0, f1, d in [(21.7, "F5", "E5", 0.45), (22.25, "E5", "D5", 0.4), (22.75, "F5", "E5", 0.5)]:
    put(sfx, a, whistle(NOTE[f0], NOTE[f1], d, 5.5, 0.03, 0.12), -0.2, 0.22)
t = 15.3
while t < 28.6:
    n = int(SR * 0.09); t_ = tt(n)
    put(sfx, t, fft_filter(rng.standard_normal(n), 1500, 7000) * np.exp(-t_ / 0.018) + fft_filter(rng.standard_normal(n), 200, 900) * np.exp(-t_ / 0.03) * 0.5, 0.45, 0.3)
    put(sfx, t + 0.12, fft_filter(rng.standard_normal(n), 1800, 8000) * np.exp(-t_ / 0.015) * 0.7, 0.45, 0.2)
    t += 2 * np.pi / 7.5
for a in [23.2, 24.2, 25.0, 25.6, 26.1, 26.5, 26.85, 27.15, 27.4, 27.52]:
    n = int(SR * 0.2); t_ = tt(n)
    put(sfx, a, np.sin(2 * np.pi * np.cumsum(900 - 500 * np.minimum(t_ / 0.12, 1)) / SR) * np.exp(-t_ / 0.05) * np.minimum(t_ / 0.002, 1), -0.3, 0.55)
n = int(SR * 4.4); t_ = tt(n)
put(sfx, T2_PEEL + 0.1, fft_filter(rng.standard_normal(n), 120, 700) * (0.3 + 0.7 * (np.sin(2 * np.pi * (1.5 + t_ / 3) * t_) ** 2)) * (t_ / 4.4) ** 1.5 * np.minimum((4.4 - t_) / 0.1, 1) * 0.9, -0.3, 0.55)
n = int(SR * 0.32); t_ = tt(n)
put(sfx, T2_FALL - 0.02, np.sin(2 * np.pi * np.cumsum(1500 - 1100 * t_ / 0.32) / SR) * 0.18 * np.minimum(t_ / 0.03, 1) + fft_filter(rng.standard_normal(n), 800, 4000) * 0.4 * (t_ / 0.32), -0.2, 0.8)
n = int(SR * 0.7); t_ = tt(n)
put(sfx, T2_LAND, (fft_filter(rng.standard_normal(n), 250, 3500) * np.exp(-t_ / 0.07) + np.sin(2 * np.pi * (140 - 70 * np.minimum(t_ / 0.15, 1)) * t_) * np.exp(-t_ / 0.2)) * 1.3, -0.2, 0.95)
for i, nm in enumerate(["E5", "G5", "C6", "G5"]):
    n = int(SR * 0.5); t_ = tt(n)
    put(sfx, T2_LAND + 0.18 + i * 0.12, (np.sin(2 * np.pi * NOTE[nm] * t_) + 0.3 * np.sin(2 * np.pi * NOTE[nm] * 2.76 * t_)) * np.exp(-t_ / 0.2) * 0.8, -0.4 * ((-1) ** i), 0.25)
for a in (T2_LICK + 0.15, T2_LICK + 0.6):
    n = int(SR * 0.28); t_ = tt(n)
    f = 300 + 900 * np.sin(np.pi * t_ / 0.28)
    put(sfx, a, np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 * np.sin(np.pi * t_ / 0.28) + fft_filter(rng.standard_normal(n), 1200, 5000) * 0.25 * np.sin(np.pi * t_ / 0.28), 0.4, 0.6)

# ---------------- mix: music +3 dB, sfx -6 dB (standard mix), fades, loudness ----------------
def db(x): return 10 ** (x / 20)
mus *= db(3); sfx *= db(-6)
mix = mus * 0.9 + sfx
fi = np.minimum(tt(N) / 0.05, 1); fo = np.minimum((DUR - tt(N)) / 0.25, 1)
mix *= fi * fo
# soft limiter
mix = np.tanh(mix * 0.9) / np.tanh(0.9)
pk = np.abs(mix).max()
mix *= db(-1.5) / pk
out = sys.argv[1]
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("peak dBFS", 20 * np.log10(np.abs(mix).max()), "rms dBFS", 20 * np.log10(np.sqrt((mix ** 2).mean())))
