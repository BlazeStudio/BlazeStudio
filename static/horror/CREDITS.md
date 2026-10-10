# help.exe — assets

Everything here is loaded only when the console's `help.exe` starts the game
(`static/js/horror.js`). Each file is optional: a missing sound just stays
silent, a missing font falls back to Courier, a missing voice leaves the text
on screen without speech.

## Sounds — `sounds/`

All from [freesound.org](https://freesound.org), all **CC0 1.0** (public
domain; credit is a courtesy, not a requirement). They were trimmed,
looped (crossfaded), normalised and re-encoded to mono MP3.

| File | Source | Author |
| --- | --- | --- |
| `crt-on.mp3`, `crt-off.mp3` | [CRT computer monitor startup](https://freesound.org/people/corkob/sounds/415594/) | corkob |
| `forest.mp3` | [Forest Birds Wind Dark Haunted Outdoor Eerie Atmo](https://freesound.org/people/szegvari/sounds/617747/) | szegvari |
| `ring.mp3` | [Rotary Phone Ring loopable](https://freesound.org/people/cookies%2Bpolicy/sounds/556499/) | cookies+policy |
| `pickup.mp3`, `hangup.mp3` | [Foley_Phone_Old_PickUp_HangUp_Mono](https://freesound.org/people/Nox_Sound/sounds/559475/) | Nox_Sound |
| `twig.mp3` | [Twig snapping](https://freesound.org/people/fcsimba/sounds/114300/) | fcsimba |
| `whispers.mp3` | [Ghostly Whispers](https://freesound.org/people/dimbark1/sounds/316797/) | dimbark1 |

Everything else you hear (text ticks, the modem handshake, footsteps, the
heartbeat, static, drones and stings) is synthesized in the browser.

## Font — `fonts/PressStart2P.woff`

[Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by
CodeMan38, SIL Open Font License 1.1 (`fonts/OFL.txt`). Subset to Latin +
Cyrillic.

## Voice — `vendor/samjs.min.js`

[sam-js](https://github.com/discordier/sam) 0.3.1 by Christian Schiffler: a
JavaScript port of SAM (Software Automatic Mouth, Don't Ask Software, 1982) —
the same robotic voice FAITH uses. Note its licence status: SAM is a
reverse-engineered abandonware product (rights holder SoftVoice, Inc.), so the
port is published without an open-source licence, "use at your own risk".
Delete the file to drop the voice; the game keeps working text-only.
