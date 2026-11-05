# "The Corpse That Lost Its Trial" (Cadaver Synod, 897) - script v1 (2026-11-05)

Format: 1080x1920, 30 fps, 53 s (1600 frames), ElevenLabs Liam. **Continuous narration**: no SSML pauses; speech gaps >0.26 s were cut out of the audio and the tempo set to 0.95 (max gap 0.23 s). Double hook (verbal + visual). Something always moves: camera glides/creeps in every shot, characters sway, flames flicker, motes/birds drift.

## Facts (flag = verify)
- Jan 897, Rome: Pope Stephen VI (VII in some numberings) had the body of his predecessor Formosus (died Apr 896, ~9 months) exhumed, dressed in papal vestments and put on trial, seated on a throne; a deacon answered for him. [Wikipedia "Cadaver Synod"]
- Charges: perjury and serving as bishop of Rome illegally (violating canon law). [Wikipedia]
- Verdict guilty; vestments stripped, three fingers of the blessing hand cut off, body thrown into the Tiber. [Wikipedia]
- Stephen was deposed and imprisoned in Aug 897 and was strangled; script says "he did not come out alive". [Wikipedia]
- A monk/fisherman recovered the body; Pope Theodore II had it reburied and annulled the synod; John IX banned trials of the dead (898). [Wikipedia; flag "fisherman" detail and "next pope"]
- Script says "a pope" and "the next pope"/"another pope" without numbers.

## Script (voice-over, 193 words)
In 897, a pope dug up a dead pope, sat him on a throne, and put him on trial. And the corpse lost. Pope Stephen hated his old rival, Pope Formosus. The problem was that Formosus had been dead for nine months. Stephen did not care. His men dug up the body and dressed it in full papal robes. Then they sat it on a throne in the middle of a church. A frightened young deacon stood beside it and answered every question for the corpse. The charges were lying under oath, and taking the papacy illegally. Formosus, of course, said nothing. The court found him guilty. They tore off his robes, cut off the three fingers he used to bless people, and threw the body into the river Tiber. Soon after, the people of Rome turned on Stephen. He was thrown in prison, and he did not come out alive. A fisherman found the body in the river, and the next pope put it back in its tomb. Then another pope made it illegal to put a dead man on trial. If you like strange history, follow for more stories like this.

## Status
- 20 shots (frames in cadaver-voice/shots.json), sets: church, night (graveyard + Tiber), cell. Hook A = corpse rises from the grave and is carried off on a throne (whip-follow); hook B = the trial, gavel, LOST stamp.
- Render parts: A 0-369, B 370-717, C 718-1043, D 1044-1331, E 1332-1599. `COMP=Cadaver sh shorts-render/scripts/job.sh <a> <b>`.
