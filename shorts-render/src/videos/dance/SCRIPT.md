# "The Dancing Plague of 1518" - script v1 (2026-11-05)

Format: 1080x1920, 30 fps, 52 s (1560 frames), ElevenLabs Liam. **Continuous narration with a different delivery per line** (each line generated separately with its own stability/style/speed and previous/next text, internal pauses >0.28 s trimmed, 0.12 s between lines; max gap 0.52 s).
Double hook: verbal = "a woman started to dance... she did not stop for days" + visual = she steps into the square and starts dancing, then the time-lapse of the sun and moon while she keeps dancing.

## Facts (flag = verify)
- July 1518, Strasbourg: a woman (traditionally Frau Troffea) began dancing in the street and did not stop for days; within a week ~34 people, within a month ~400 joined. [Wikipedia "Dancing plague of 1518"]
- Local physicians blamed "hot blood"; the authorities encouraged more dancing: guildhalls opened, a wooden stage was built, musicians hired. [Wikipedia]
- Some dancers reportedly died (claims of up to 15 a day are not reliable): script says "reportedly". [flag]
- Authorities later banned public music and dancing and sent the afflicted to a shrine (St Vitus, Saverne); they were given red shoes and wooden crosses. [Wikipedia; flag shoes/crosses details]
- Causes unknown: ergot (poisoned bread) or mass psychogenic illness are the main theories. [Wikipedia]

## Script (voice-over, 177 words)
In July 1518, a woman stepped into a street in Strasbourg and started to dance. She did not stop for days. Within a week, thirty-four more people had joined her. Within a month, there were hundreds. They danced until their feet bled. They did not eat, they did not rest, and they could not stop. The doctors had an answer. They said it was caused by hot blood. Their cure? More dancing. The city opened its guildhalls, built a wooden stage, and hired musicians to keep everyone moving. Of course, it only got worse. Some people reportedly danced themselves to death. At last, the city banned music, tore down the stage, and sent the dancers to a shrine in the mountains. They were given red shoes and wooden crosses, and told to pray. Slowly, the dancing stopped. Nobody knows why. Maybe it was poisoned bread. Maybe it was mass hysteria. Either way, the city's first answer to a dancing plague was to throw a dance party. If you like weird history, follow for more stories like this.

## Status
- 19 shots (dance-voice/shots.json), sets: street, guild, shrine. Parts: A 0-321, B 322-598, C 599-969, D 970-1329, E 1330-1559. `COMP=Dance sh shorts-render/scripts/job.sh <a> <b>`.
