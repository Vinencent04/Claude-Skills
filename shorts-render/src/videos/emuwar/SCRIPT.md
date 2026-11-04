# "The War Australia Lost to Birds" (Great Emu War, 1932) - script v1 (2026-11-04)

Format: vertical 1080x1920, 30 fps, <= 60 s, ~2.5 words/s, ElevenLabs Liam (same settings), word-by-word captions, final CTA line. Look and pacing: same as beerflood/teaparty (12-14 shots, one idea per shot, double hook verbal + visual).

## Facts (flag = verify before recording)
- Nov-Dec 1932, Campion/Campion district and Walgoolan, Western Australia; WWI veterans had been settled as wheat farmers; drought + falling wheat prices. [Wikipedia "Emu War"]
- ~20,000 emus (some sources "about 20,000") migrated into the farmland after breeding season and wrecked crops and fences. [flag count]
- Farmers (veterans) asked the Minister of Defence; the army sent Major G.P.W. Meredith (Royal Australian Artillery) with 2 soldiers, 2 Lewis machine guns, ~10,000 rounds. [Wikipedia; flag "three men"]
- First attempt (2 Nov): emus split into small groups, hard to hit; a truck-mounted gun failed (truck too slow, gun jammed). [Wikipedia]
- Operation withdrawn after about a week, resumed, ended ~10 Dec 1932; Meredith's report ~986 emus killed with ~9,860 rounds (~10 rounds per emu). [flag exact numbers, script says "thousands of rounds"]
- Meredith: "If we had a military division with the bullet-carrying capacity of these birds it would face any army in the world." [Wikipedia, widely quoted; flag, paraphrase in script]
- A bounty system later worked far better than the army; emus remain managed with barrier fences. [Wikipedia]
- Say "the birds won" only as the joke framing; in the script do not claim zero emus were killed.

## Script (voice-over, ~110 words)
1. In 1932, Australia sent soldiers with machine guns to fight an army of birds.
2. And the birds won.
3. After the First World War, veterans became wheat farmers in Western Australia.
4. Then about twenty thousand emus came and started eating the crops.
5. The farmers asked for help. The government sent the army.
6. A major, two soldiers, two machine guns, and thousands of rounds.
7. But the emus split into small groups and scattered.
8. They put a machine gun on a truck. The truck was too slow, and the gun jammed.
9. After about a month, the army quietly went home.
10. The major said an army with the stamina of those birds could take on any army in the world.
11. The emus kept eating the wheat.
12. [CTA] If you like wild history, follow for more stories like this.

## Shot plan (14 shots, frames recomputed from words.json)
| # | Light | Camera | Visual |
|---|---|---|---|
| 1 | day, red dust | low whip-follow, emus sprint across a wheat field, soldiers with machine gun on a truck bouncing after them | VISUAL HOOK A: dust cloud, emus outrun the truck |
| 2 | day | hard cut, push-in | VISUAL HOOK B: one emu stands on the helmet-less major's truck, looks at the camera, eats wheat |
| 3 | day | crane descent over wheat fields | veterans' farm, fence, tractor |
| 4 | day | dolly through the field | emus pouring in from the horizon, crops vanish |
| 5 | office | push-in | farmers at a desk, ministry stamp |
| 6 | day | pan along the line | major + two soldiers + two gun cases and crates |
| 7 | day | whip pan | emus split into small groups in all directions |
| 8 | day | follow truck | truck, gun jams, smoke |
| 9 | evening | pull-back | soldiers loading the truck, going home |
| 10 | day | push-in | major with notebook, emu on a fence |
| 11 | golden | pull-back | emus in the wheat |
| 12 | night | CTA, quiet | one emu feather on a fence post |

Open points: confirm "about twenty thousand" and "a major, two soldiers"; need a new emu character card (toon.ts) for the 3D world.

## Status 2026-11-04 (build)
- Voice: ElevenLabs Liam (same settings), 49.0 s, words in emuwar-voice/words.json, 14 shots, 1500 frames (50 s). Final text: emuwar-voice/script.txt ("about twenty thousand", "a major, two soldiers" still unconfirmed).
- Double hook: verbal = lines 1+2; visual = shot 1 (herd outruns the army truck, whip from emus to truck) + shot 2 (an emu in the soldiers' hat sits on the truck, soldiers surrender, confetti).
- Render parts (inclusive): A 0-384, B 385-630, C 631-878, D 879-1121, E 1122-1499. Composition `Emuwar`: `COMP=Emuwar sh shorts-render/scripts/job.sh <a> <b>`.
