# "The Wave of Beer That Got a Refund" - script v1 (2026-11-04)

Format: vertical 1080x1920, 30 fps, ~52 s (1560 frames), ~2.5 words/s (slower than the reference on purpose: the viewer must be able to follow every beat).
Style: the cartoon-3d-short look. 2D bean-head cards in a painted 3D world. Camera grammar taken from the reference clip studied in this session (see "Camera grammar").
Voice: ElevenLabs, English. Captions: word by word, 2-3 words at a time.

## Facts (with sources, flag = still to verify)
- 17 Oct 1814, Meux & Co's Horse Shoe Brewery, Tottenham Court Road, London. A wooden vat of fermenting porter, ~22 ft tall, burst. [Wikipedia "London Beer Flood", History Press, VinePair]
- Held by iron hoops (one source: 29). Clerk George Crick saw a hoop had slipped about an hour before. [Wikipedia; time of day varies by source, 4:30-6 pm]
- Volume released: estimates 76,000 to 323,000 imperial gallons depending on source. Script says "over a hundred thousand gallons". [flag: pick one source]
- The burst smashed neighbouring vats; a wave of porter broke the back wall and flooded the St Giles slum, collapsing houses and basements. [Wikipedia]
- Eight dead (one source says nine incl. later alcohol poisoning; do not use the poisoning claim). [Wikipedia, History Press]
- Inquest verdict: deaths "casually, accidentally and by misfortune", treated as an act of God, nobody liable. [History Press]
- Meux & Co got the excise duty on the lost beer refunded. [History Press, one blog says Parliament; flag the exact mechanism, script only says "refunded"]
- [flag] "Nobody did anything about the hoop": confirm with a primary/secondary source before recording. If not confirmed, change shot 6 voice to "The hoop stayed where it was."

## Script (voice-over, ~129 words)
HOOK (twist first)
1. In 1814, a wave of beer drowned eight people in London.
2. And the brewery? It got a tax refund.

SETUP
3. It started at the Horse Shoe Brewery, in October 1814.
4. Inside stood a wooden vat two storeys tall, holding over a hundred thousand gallons of fermenting beer.
5. Iron hoops held it together. That afternoon, a clerk noticed one had slipped.
6. Nobody did anything about it.

SNAP
7. An hour later, the vat burst.
8. The wave smashed through the brewery wall and poured into St Giles, one of the poorest slums in London.
9. Whole families lived in basements there. Eight people died.

TWIST PAYOFF
10. At the inquest, the jury called it an accident. An act of God.
11. And the brewery got its beer tax refunded.
12. Eight people died. The beer duty was refunded.

(Last line mirrors the hook = callback. No call to action.)

## Pacing rules (fixes the "can't follow what happens" problem of revo/kitchen)
- One idea per shot, 12 shots in 52 s (~4.3 s each). One main subject, max 3 characters in focus.
- Every plot beat = its own shot, followed by a 0.5-1 s reaction hold (face or prop). Never two plot beats in one shot.
- The key prop of a beat (hoop, vat, refund stamp) must be big and centered in the frame while its word is spoken. Visual lands 0-3 frames BEFORE its word.
- Camera: one primary move per shot (push-in, dolly, tilt, descent, whip-follow). Holds always creep. Cut on big jumps; crossfade (8-10 frames) only at place/time changes.
- Quiet middle, loud snap: shots 5-6 are slow and nearly silent (low rumble), shot 7 is the loudest moment, then silence under shot 9 and 10.
- Captions: 2-3 words per chunk, bottom third, white bold with black outline, active word pops. Never cover the key prop (move them up if needed).
- Music ducked under voice (-12 dB), voice unchanged, SFX -6 dB.

## Camera grammar (from the reference clip)
- Hook = payoff shown first, no establishing shot.
- Descent/crane from above into a street, then dolly down a long corridor with props receding to a vanishing point.
- Push-in with rack focus on the sneaky/key character (blur background).
- Reveal by tilting/pulling back to the contrast shot of the last line.
- Place change = crossfade; plot beat change = cut.

## Shot plan (30 fps, frames inclusive-exclusive)
| # | Frames | Sec | Light | Camera | Voice | Visual |
|---|---|---|---|---|---|---|
| 1 | 0-90 | 3.0 | dusk, warm | low-angle whip-follow ahead of the wave, camera backs up down the lane | line 1 | Brown foam-topped wave rushes down a narrow London lane, crowd of bean-heads flees, mugs fly |
| 2 | 90-180 | 3.0 | office, warm lamp | hard cut, fast push-in on desk | line 2 | Top-hat owner stamps "REFUNDED" on a paper, smiles, a coin stack grows |
| 3 | 180-330 | 5.0 | golden hour | crane descent over St Giles rooftops to the brewery gate, crossfade in | line 3 | Establishing: slum rooftops, brewery chimney, "MEUX" sign |
| 4 | 330-510 | 6.0 | interior, amber | dolly along the vat, tilt up | line 4 | Giant wooden vat bigger than the men, steam, workers dwarfed |
| 5 | 510-690 | 6.0 | interior | slow push-in on the hoop, rack focus | line 5 | Clerk points at a slipped iron hoop, glint on the metal |
| 6 | 690-810 | 4.0 | interior | creeping hold, then slow pull-out | line 6 | Boss waves it off, clerk shrugs and leaves; hoop sags in the foreground |
| 7 | 810-930 | 4.0 | interior | hard cut, impact flip-kicks, whip pan | line 7 | Vat cracks, side vats domino, boards fly, white flash |
| 8 | 930-1080 | 5.0 | dusk | whip-follow along the wave through the wall, into the lane | line 8 | Wave blasts the brewery wall, rushes into slum alley, camera travels with it |
| 9 | 1080-1230 | 5.0 | dusk, cold blue | high angle slow descent | line 9 | Flooded basements and street, collapsed house, survivors on a roof, quiet |
| 10 | 1230-1380 | 5.0 | courtroom, grey | crossfade in, slow push-in on the coroner | line 10 | Coroner and jury of bean-heads, stamp "ACCIDENT" lands |
| 11 | 1380-1470 | 3.0 | office, warm | push-in on the owner | line 11 | Owner holds the refund paper, smiles |
| 12 | 1470-1560 | 3.0 | street, cold | slow pull-back to wide | line 12 | Empty street, one mug on a barrel, lamp flickers, hold |

Frame numbers are provisional (hook line 1 is ~3.7 words/s, tighter than the 2.5 average: give shot 1 four seconds once the real voice timing is known). Recompute every frame range from words.json after the ElevenLabs voice exists, then re-cut the render parts.

## Characters (our own, colour-coded roles)
- Crick the clerk: grey waistcoat, round glasses.
- Mr Meux the owner: plum coat, top hat.
- Coroner: black robe, white wig.
- St Giles residents: patched browns and teal, mother + child, old man.
- Workers: tan shirts, flat caps.

## Render plan (parallel sub-sessions)
Cut the 1560 frames at shot boundaries so each part is self-contained and the crossfades land inside a part:
| Part | Frames | Shots |
|---|---|---|
| A | 0-329 | 1-3 |
| B | 330-689 | 4-5 |
| C | 690-929 | 6-7 |
| D | 930-1229 | 8-9 |
| E | 1230-1559 | 10-12 |
Each sub-session: attach this repo, checkout the build branch, `COMP=Beerflood sh shorts-render/scripts/job.sh <a> <b>` and push `render-<a>-<b>`. Then the main session concatenates (`ffmpeg -f concat`), overlays the captions layer (render-subs.mjs, ProRes alpha) and muxes the ElevenLabs voice plus music/SFX mix.
Note: job.sh currently hard-codes dpr 0.5; add `DPR` env so the final can use 1.3333.


## Status 2026-11-04 (build session)
- Voice: ElevenLabs "Liam" (premade, id TX3LPaxmHKxFdv7VOQHJ), eleven_multilingual_v2, stability .4, similarity .8, style .35, speed 1.08, speaker boost.
  Final text in `shorts-render/beerflood-voice/script.txt` (SSML breaks). Line 6 uses the softer "The hoop stayed where it was." (the "nobody did anything" claim stayed unconfirmed).
  Voice length 49.6 s, 125 words. `words.json` (STT scribe_v1, keys w/t0/t1) in the same folder. Total video = 1520 frames (50.7 s).
- Frame ranges recomputed from words.json (3 frames before each line): `beerflood-voice/shots.json`.
  Shots: 1 0-125, 2 125-220, 3 220-352, 4 352-532, 5 532-693, 6 693-774, 7 774-857, 8 857-1030, 9 1030-1153, 10 1153-1289, 11 1289-1385, 12 1385-1520.
- Render parts (inclusive): A 0-351, B 352-692, C 693-856, D 857-1152, E 1153-1519.
- Composition `Beerflood` (src/videos/beerflood/): story.ts (camera/shots/events), world.ts (5 sets, wave, vat burst, flood), ccast.ts (cast + effect cards), lights.ts (PRESETS per shot).
- Render cost (software GL, 3 workers): ~9 s/frame at DPR 0.5 (which still outputs 1080x1920, R3F clamps dpr to >=1). 2K (DPR 1.3333) is >25 s/frame: not practical here, deliver 1080x1920.
- Job: `COMP=Beerflood sh shorts-render/scripts/job.sh <a> <b>` (DPR env var overrides the 0.5 default).
