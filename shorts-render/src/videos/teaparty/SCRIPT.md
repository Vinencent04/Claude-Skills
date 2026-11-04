# "The Tea Party Over Cheaper Tea" - script v1 (2026-11-04)

Format: vertical 1080x1920, 30 fps, <= 60 s, ~2.5 words/s, English voice (ElevenLabs Liam, same settings as beerflood), word-by-word captions, final CTA line.
Look: cartoon-3d-short (bean-head cards in a painted 3D world), camera grammar from the beerflood short / reference clip. Same pacing rules as beerflood/SCRIPT.md.

## Facts (flag = verify before recording)
- 16 Dec 1773, Griffin's Wharf, Boston Harbor. Three ships: Dartmouth, Eleanor, Beaver. [Wikipedia "Boston Tea Party"]
- 342 chests of tea (some sources say 340) thrown overboard, ~92,000 lb (~46 tons). [Wikipedia, Boston Tea Party Ships & Museum; flag exact numbers, script says "forty-six tons"]
- Tea Act 1773 cut the price of East India Company tea (it undercut smuggled Dutch tea) but kept the Townshend duty of 3 pence per pound. Colonists objected to being taxed without representation. [Wikipedia] => the twist: the tea was getting CHEAPER.
- Governor Thomas Hutchinson refused to let the ships leave without the duty paid; mass meeting at Old South Meeting House that evening; ~30-130 men, some disguised as Mohawk, boarded the ships and finished in about three hours. [Wikipedia]
- Nothing else was damaged; one padlock was broken and replaced the next day. [Boston Tea Party Ships & Museum; flag]
- Britain answered with the Coercive Acts (1774): Boston harbor closed until the tea was paid for. This pushed the colonies together (First Continental Congress, 1774). [Wikipedia]
- The raiders reportedly swept the decks clean afterwards. [flag, drop if not confirmed]
- Do NOT say who "started" the revolution; say "it pushed the colonies together".

## Script (voice-over, ~125 words)
HOOK (twist first)
1. In 1773, Americans dumped forty-six tons of tea into Boston Harbor.
2. And the tea was getting cheaper.

SETUP
3. Britain had just cut the price of tea. But it kept one small tax on it.
4. Three ships full of tea sat in Boston Harbor.
5. The governor refused to send them back. So the colonists held a meeting.

SNAP
6. That night, men dressed as Mohawk marched to the docks.
7. They climbed aboard, opened every chest, and tipped it into the sea.
8. It took about three hours. Three hundred and forty-two chests. Nothing else was touched.

TWIST PAYOFF
9. Britain answered by closing Boston Harbor.
10. That pushed the colonies together.
11. All over a tax on cheaper tea.
12. [CTA] If you like tea, follow for more stories like this.

(Last story line mirrors the hook = callback; CTA appended like the beerflood CTA, 1 s pause after the last line.)

## Shot plan (12 shots, frames recomputed from words.json after the voice exists)
| # | Light | Camera | Voice | Visual |
|---|---|---|---|---|
| 1 | night, torch/lantern | low whip-follow behind men throwing chests off the ship, camera backs along the dock | line 1 | tea chests flying into the dark harbor, splashes, tea leaves floating |
| 2 | office/shop, warm | hard cut, fast push-in | line 2 | a price tag on a tea chest drops from "9" to "6"; shopkeeper smiles |
| 3 | day, golden | crane descent over Boston rooftops to Griffin's Wharf | line 3 | rooftops, harbor, a tiny "3d" tax tag stuck on a chest |
| 4 | dusk | dolly along the three ships, tilt up the masts | line 4 | Dartmouth, Eleanor, Beaver side by side, tea chests stacked on deck |
| 5 | interior, amber | push-in with rack focus on the governor | line 5 | governor in wig crosses his arms, "NO" gesture; colonists at the door |
| 6 | night, cold blue | low dolly, Mohawk-costumed bean-heads march | line 6 | feathers, lanterns, dock planks in the foreground |
| 7 | night | hard cut, whip pans | line 7 | axe opens a chest, tea pours into the harbor |
| 8 | night | slow descent, rack focus | line 8 | tea chests piling in the water, "342" counted on a slate |
| 9 | grey dawn | pull-back to wide | line 9 | British ship blocks the harbor, empty docks |
| 10 | day, cold | push-in on map | line 10 | colonies on a map joined by lines |
| 11 | tavern/shop, warm | push-in | line 11 | the cheaper-tea price tag, teacup |
| 12 | night street, cold | slow pull-back, teacup on a barrel | CTA | empty dock, one teacup, caption CTA |

## Render plan
Same as beerflood: parts at shot boundaries, `COMP=Teaparty sh shorts-render/scripts/job.sh <a> <b>` in sub-sessions (about 9 s/frame at 1080x1920 software GL), concat with ffmpeg, captions layer (new composition), ElevenLabs voice + synthesized SFX, loudnorm to -15 LUFS.
Open points before recording: confirm "forty-six tons" and "Nothing else was touched" (padlock detail).
