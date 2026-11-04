"""Sound for 'The French Revolution in a nutshell' (60 s): Kokoro voice-over + original synthesized score + SFX, numpy only.
usage: python3 -I revo_audio.py voice.wav timing.json out.wav"""
import sys, json, wave
import numpy as np
import soundfile as sf

SR = 48000
DUR = 60.0
N = int(SR * DUR)
rng = np.random.default_rng(11)
def tt(n): return np.arange(n) / SR
def db(x): return 10 ** (x / 20)
def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def noise(n, lo=None, hi=None): return fft_filter(rng.standard_normal(n), lo, hi)

mus = np.zeros((2, N)); sfx = np.zeros((2, N)); amb = np.zeros((2, N))
def put(buf, t0, x, pan=0.0, gain=1.0):
    i = int(t0 * SR)
    if i >= N or i + len(x) <= 0: return
    a, b = max(0, -i), min(len(x), N - i)
    buf[0, i + a:i + b] += x[a:b] * gain * np.sqrt(2) * np.sqrt((1 - pan) / 2)
    buf[1, i + a:i + b] += x[a:b] * gain * np.sqrt(2) * np.sqrt((1 + pan) / 2)

NOTE = {"A2": 110.0, "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.0, "A3": 220.0, "B3": 246.94, "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.0,
        "A4": 440.0, "B4": 493.88, "C5": 523.25, "D5": 587.33, "E5": 659.25, "F5": 698.46, "G5": 783.99, "A5": 880.0, "C6": 1046.5, "G2": 98.0, "E2": 82.41, "F2": 87.31}
def harpsi(f, d=0.5):
    n = int(SR * d); t = tt(n)
    x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / (0.35 / k ** 0.5)) for k, a in [(1, 1), (2, 0.6), (3, 0.45), (4, 0.3), (5, 0.18)])
    return x * np.minimum(t / 0.002, 1)
def marimba(f, d=0.5):
    n = int(SR * d); t = tt(n)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.22) + 0.35 * np.sin(2 * np.pi * f * 3.9 * t) * np.exp(-t / 0.05)) * np.minimum(t / 0.004, 1)
def bass(f, d=0.35):
    n = int(SR * d); t = tt(n)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.18) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.07)) * np.minimum(t / 0.004, 1)
def brass(f, d=0.6, a=0.04):
    n = int(SR * d); t = tt(n)
    x = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 8)) * (0.6 + 0.4 * np.sin(2 * np.pi * 5 * t) * 0.05 + 0.4)
    return x * np.minimum(t / a, 1) * np.clip((d - t) / 0.06, 0, 1) * 0.35
def snare(d=0.18, amp=1.0):
    n = int(SR * d); t = tt(n)
    return (noise(n, 1200, 9000) * np.exp(-t / 0.05) + 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04)) * amp
def kick(d=0.4):
    n = int(SR * d); t = tt(n)
    return np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t / 0.06) + 40) / SR) * np.exp(-t / 0.18)
def roll(t0, dur, a0=0.15, a1=1.0, rate=22):
    k = int(dur * rate)
    for i in range(k):
        put(sfx, t0 + i / rate, snare(0.12, a0 + (a1 - a0) * i / k), 0.1 * ((-1) ** i), 0.5)
def shing_thunk(t0, big=1.0):
    n = int(SR * 0.35); t_ = tt(n)
    sh = fft_filter(rng.standard_normal(n), 3000, 12000) * np.exp(-t_ / 0.08) * np.sin(np.pi * np.minimum(t_ / 0.3, 1)) ** 0.5 * 0.8
    put(sfx, t0 - 0.12, sh, 0.1, 0.55 * big)
    n2 = int(SR * 0.5); t2 = tt(n2)
    th = (np.sin(2 * np.pi * (95 - 40 * np.minimum(t2 / 0.15, 1)) * t2) * np.exp(-t2 / 0.16) + noise(n2, 200, 2500) * np.exp(-t2 / 0.05) * 0.8)
    put(sfx, t0, th, 0.0, 1.0 * big)
def crowd(t0, dur, gain=1.0, cheer=True):
    n = int(SR * dur); t_ = tt(n)
    base = noise(n, 300, 3500) * (0.5 + 0.5 * np.abs(noise(n, None, 9))) * np.minimum(t_ / 0.15, 1) * np.clip((dur - t_) / 0.35, 0, 1)
    if cheer: base = base + 0.25 * np.sin(2 * np.pi * np.cumsum(520 + 160 * np.sin(2 * np.pi * 3 * t_)) / SR) * np.clip(1 - t_ / dur, 0, 1) * 0.3
    put(sfx, t0, base, 0.0, 0.6 * gain)
def coin(t0, gain=1.0):
    n = int(SR * 0.5); t_ = tt(n)
    x = (np.sin(2 * np.pi * 2637 * t_) + 0.5 * np.sin(2 * np.pi * 3520 * t_)) * np.exp(-t_ / 0.12) * np.minimum(t_ / 0.001, 1)
    put(sfx, t0, x, rng.uniform(-0.4, 0.4), 0.4 * gain)
def thump(t0, f=70, d=0.25, gain=1.0, pan=0.0):
    n = int(SR * d); t_ = tt(n)
    put(sfx, t0, (np.sin(2 * np.pi * f * t_) * np.exp(-t_ / 0.08) + noise(n, 80, 600) * np.exp(-t_ / 0.03) * 0.6) * np.minimum(t_ / 0.002, 1), pan, gain)
def wah(t0, f0, f1, d, gain=0.5):
    n = int(SR * d); t_ = tt(n)
    f = f0 + (f1 - f0) * t_ / d
    x = sum(np.sin(2 * np.pi * np.cumsum(f * k) / SR) / k for k in range(1, 6)) * np.sin(np.pi * np.minimum(t_ / d, 1)) ** 0.5
    put(sfx, t0, x * 0.3, 0.0, gain)

# ---------------- score: A minor, 120 bpm, harpsichord + pizzicato; sections follow the story ----------------
beat = 0.5
prog = [("A2", ["A3", "C4", "E4"]), ("F2", ["A3", "C4", "F4"]), ("C3", ["G3", "C4", "E4"]), ("E2", ["G3", "B3", "E4"])]
def comp(t0, t1, vol=0.5, arp=True, bassvol=0.6):
    t = t0; bar = 0
    while t < t1 - 0.2:
        b, ch = prog[bar % 4]
        put(mus, t, bass(NOTE[b], 0.45), -0.15, bassvol); put(mus, t + 2 * beat, bass(NOTE[b] * 1.5, 0.35), -0.15, bassvol * 0.7)
        if arp:
            for k in range(8):
                put(mus, t + k * beat / 2, harpsi(NOTE[ch[k % 3]] * (2 if k % 4 == 3 else 1), 0.28), 0.25 * ((-1) ** k), vol * (0.6 if k % 2 else 1.0))
        bar += 1; t += 4 * beat
# hook: pompous royal, then sudden stop on the purse (sad trombone)
put(mus, 0.0, brass(NOTE["A2"] * 2, 0.8, 0.01) + brass(NOTE["E3"] * 2, 0.8, 0.01), 0.0, 0.9)
comp(0.5, 2.6, 0.55)
for i, (nm, d) in enumerate([("C5", 0.0), ("D5", 0.25), ("E5", 0.5), ("G5", 0.75)]): put(mus, d, brass(NOTE[nm] / 2, 0.3), 0.0, 0.5)
wah(2.65, 330, 220, 0.9, 0.7)
put(mus, 3.2, brass(NOTE["A2"] * 2, 0.5), 0.0, 0.7)
# flash-forward + street + taxes: tense minor, sparse
comp(7.5, 12.2, 0.3, True, 0.7)
comp(12.4, 18.1, 0.4, True, 0.7)
# meeting / oath: building march
comp(18.1, 24.8, 0.4, True, 0.8)
for k in range(8): put(mus, 22.5 + k * 0.3, brass(NOTE["A3"] * (1 if k % 2 == 0 else 1.25), 0.25), 0.0, 0.35)
# Bastille: martial drive
comp(24.8, 29.8, 0.45, True, 0.9)
# the guillotine: hollow low drone and tension
for k in range(10): put(mus, 29.8 + k * 0.5, bass(NOTE["A2"], 0.4), 0.0, 0.7 if k % 2 == 0 else 0.4)
comp(34.9, 41.0, 0.25, False, 0.9)
# suspicion + Robespierre: creeping pizzicato
t = 41.5; k = 0
line = ["A2", "A2", "C3", "A2", "E3", "D3", "C3", "E2"]
while t < 47.2:
    put(mus, t, bass(NOTE[line[k % 8]], 0.22), -0.1, 0.8)
    if k % 2: put(mus, t + 0.22, harpsi(NOTE["E5"] if k % 4 == 1 else NOTE["B4"], 0.15), 0.3, 0.25)
    t += 0.46; k += 1
# exhausted France: slow, then Napoleon fanfare, then deadpan end
for k, nm in enumerate(["E4", "D4", "C4", "A3"]): put(mus, 48.5 + k * 0.7, marimba(NOTE[nm], 0.9), 0.0, 0.35)
for nm, a, d in [("C4", 51.2, 0.25), ("E4", 51.5, 0.25), ("G4", 51.8, 0.25), ("C5", 52.1, 0.9)]: put(mus, a, brass(NOTE[nm], d, 0.02), 0.0, 0.7)
roll(51.2, 0.9, 0.2, 0.9)
for k in range(10): put(mus, 52.6 + k * 0.5, bass(NOTE["C3"] if k % 2 == 0 else NOTE["G2"], 0.3), 0.0, 0.7)
put(mus, 54.4, brass(NOTE["C3"] * 2, 0.7), 0.0, 0.7)
put(mus, 55.0, harpsi(NOTE["C6"], 1.4) * 0.8 + harpsi(NOTE["G5"], 1.4) * 0.6 + harpsi(NOTE["E5"], 1.4) * 0.5, 0.0, 0.6)
put(mus, 56.2, brass(NOTE["C3"], 1.8, 0.03), 0.0, 0.8)
put(mus, 57.0, marimba(NOTE["G4"], 0.5) * 0.7, 0.2, 0.5); put(mus, 57.35, marimba(NOTE["C5"], 1.8), 0.0, 0.7)

# ---------------- sfx ----------------
# hook: BIG sting at frame 0 (king's shock), coin jingle out of the purse (1.75), mob roar + stomping (3.2 - 5.9), blade + crown (5.95)
n = int(SR * 0.9); t_ = tt(n)
put(sfx, 0.0, (fft_filter(rng.standard_normal(n), 2000, 14000) * np.exp(-t_ / 0.25) * 1.1 + np.sin(2 * np.pi * (80 - 30 * np.minimum(t_ / 0.4, 1)) * t_) * np.exp(-t_ / 0.3)), 0.0, 1.1)
for k in range(6): coin(1.75 + 0.07 * k, 0.8)
roll(3.2, 2.7, 0.1, 1.0, 20)
for k in range(8): thump(3.3 + k * 0.22, 70, 0.2, 0.6 + 0.05 * k, 0.1 * ((-1) ** k))
crowd(3.25, 2.5, 1.2)
thump(3.6, 55, 0.5, 1.0)
shing_thunk(T_HK := 5.95 + 0.15, 1.1); crowd(6.2, 1.4, 1.0)
# street: murmur + belly growl (10.2)
n = int(SR * 4.6); put(amb, 7.5, noise(n, 250, 1800) * (0.4 + 0.6 * np.abs(noise(n, None, 6))) * 0.12 * np.clip((tt(n)) / 0.3, 0, 1) * np.clip((4.6 - tt(n)) / 0.5, 0, 1), 0.0, 1.0)
n = int(SR * 1.0); t_ = tt(n)
put(sfx, 10.2, noise(n, 40, 220) * (0.4 + 0.6 * np.sin(2 * np.pi * (3 + 4 * t_) * t_) ** 2) * np.sin(np.pi * t_) * 1.5, 0.0, 0.9)
# taxes: sacks thud while peasants parade, coins clink on the nobles' side
for k in range(7): thump(12.7 + k * 0.55, 60, 0.2, 0.7, 0.2); coin(12.9 + k * 0.55, 0.7)
for k in range(5): coin(15.6 + k * 0.4, 0.8)
wah(16.4, 300, 180, 0.7, 0.5)
# meeting, gavel (19.2), knocks at the door (20.7 - 22.4), oath roar (23.0), net bounces
thump(19.2, 180, 0.15, 1.0)
for k in range(9): thump(20.7 + k * 0.2, 90, 0.18, 0.9 if k % 3 == 0 else 0.7, -0.1)
crowd(22.8, 1.5, 0.9)
t = 22.6
while t < 24.8: n = int(SR * 0.08); t_ = tt(n); put(sfx, t, np.sin(2 * np.pi * 900 * t_) * np.exp(-t_ / 0.02) * 0.5, 0.3, 0.5); t += 0.67
# Bastille: war drums (24.8 - 26), cannon (26.0), roar, deadpan prisoners counting (28.0 + k*0.27), sad wah
roll(24.8, 1.2, 0.2, 1.0, 20)
n = int(SR * 1.6); t_ = tt(n)
put(sfx, T := 26.0, (np.sin(2 * np.pi * (60 - 30 * np.minimum(t_ / 0.5, 1)) * t_) * np.exp(-t_ / 0.5) * 1.6 + noise(n, 40, 1800) * np.exp(-t_ / 0.25) * 1.2), 0.0, 1.2)
crowd(26.4, 1.5, 0.9)
for k in range(7):
    n = int(SR * 0.35); t_ = tt(n); f = 440 * 2 ** (k * 2 / 12)
    put(sfx, 28.0 + 0.27 * k, (np.sin(2 * np.pi * f * t_) + 0.3 * np.sin(2 * np.pi * 2 * f * t_)) * np.exp(-t_ / 0.1) * np.minimum(t_ / 0.002, 1) * 0.5, -0.4 + 0.13 * k, 0.55)
wah(29.4, 280, 170, 0.9, 0.55)
# hall: crown clatter (30.4), cheer (30.0), tense snare roll up to the first blade (32.4 - 34.9)
crowd(30.0, 1.6, 0.7)
for k in range(6): coin(30.5 + 0.06 * k, 0.9)
roll(32.6, 2.3, 0.1, 1.0, 18)
shing_thunk(34.9, 1.2); crowd(35.0, 1.8, 1.0)
# Terror: blade after blade, hats flopping, short crowd gasps
from_t = [36.4, 37.9, 38.3, 38.7, 39.1, 39.5, 39.9, 40.3]
for e in from_t: shing_thunk(e, 0.9); thump(e + 0.35, 220, 0.1, 0.35, 0.2)
crowd(36.5, 1.0, 0.5, False)
# suspicion: gasps + whispers (41.5 - 44.6)
for a in (41.6, 42.5, 43.2, 44.0):
    n = int(SR * 0.4); t_ = tt(n)
    put(sfx, a, noise(n, 600, 3500) * np.sin(np.pi * t_ / 0.4) ** 2 * 0.8, rng.uniform(-0.5, 0.5), 0.5)
# Robespierre: footsteps up the steps, final blade + wig flop
for k in range(6): thump(44.9 + k * 0.28, 150, 0.1, 0.5)
shing_thunk(47.25, 1.2); thump(47.7, 200, 0.2, 0.5); crowd(47.4, 1.0, 0.6, False)
# exhausted France: sighs and snoring, then Napoleon's boots and the crowd
for a in (48.6, 49.6, 50.5):
    n = int(SR * 0.9); t_ = tt(n)
    put(sfx, a, noise(n, 150, 900) * np.sin(np.pi * t_ / 0.9) ** 2 * 0.6, rng.uniform(-0.5, 0.5), 0.5)
for k in range(8): thump(49.0 + k * 0.3, 140, 0.08, 0.45, 0.4)
crowd(51.3, 2.2, 1.0)
for k in range(8): coin(54.7 + k * 0.04, 0.5)
thump(55.0 + 0.05, 90, 0.3, 0.8)

# ---------------- voice ----------------
vo, vsr = sf.read(sys.argv[1]); vo = vo.astype(np.float64)
if vsr != SR:
    n_out = int(round(len(vo) * SR / vsr)); X = np.fft.rfft(vo); Y = np.zeros(n_out // 2 + 1, dtype=complex); m = min(len(X), len(Y)); Y[:m] = X[:m]
    vo = np.fft.irfft(Y, n_out) * (n_out / len(vo))
vo = vo / max(np.abs(vo).max(), 1e-6) * 0.9
voice = np.zeros((2, N)); voice[:, :min(N, len(vo))] = vo[:N]

# sidechain duck: music/sfx/ambience dip under speech
env = np.abs(voice[0]); k = int(0.04 * SR); env = np.convolve(env, np.ones(k) / k, mode="same")
env = np.maximum.accumulate(env[::-1])[::-1] * 0 + env
sm = np.copy(env)
for i in range(1, N): sm[i] = max(env[i], sm[i - 1] * (1 - 1 / (0.25 * SR)))   # 250 ms release
duck = 1 - 0.5 * np.clip(sm / 0.08, 0, 1)
mix = voice * 1.0 + (mus * db(-17) + amb * db(-9) + sfx * db(-10)) * duck
fi = np.minimum(tt(N) / 0.05, 1); fo = np.minimum((DUR - tt(N)) / 0.4, 1)
mix *= fi * fo
mix = np.tanh(mix * 0.85) / np.tanh(0.85)
mix *= db(-1.5) / np.abs(mix).max()
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(sys.argv[3], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
sp = np.abs(voice[0]) > 0.02
print("rms dBFS", 20 * np.log10(np.sqrt((mix ** 2).mean())), "music-under-speech vs voice (dB):",
      20 * np.log10(np.sqrt(((mus * db(-17) * duck)[:, sp] ** 2).mean()) / np.sqrt((voice[:, sp] ** 2).mean())))
