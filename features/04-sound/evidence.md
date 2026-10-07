# Feature 4: Sound, evidence

Captured on 2026-10-06 against [intent.md](intent.md). Reproduce with `npm start` in one terminal and `npm run sound-evidence` in another; raw values are in [evidence/results.json](evidence/results.json).

**Nobody has listened to it yet.** Everything below is measurement. Whether it sounds like a casino, and whether it sounds good, is Mark's call.

## The sounds

Each was rendered on its own and measured. Peak is loudness on a scale where 1.0 is the point of distortion.

| Sound | When | Peak | Lasts |
| --- | --- | --- | --- |
| Press | SPIN goes down | 0.25 | 0.05 s |
| Reels rolling | From the press until the last reel stops | 0.13 | Until stopped |
| Reel stop, reels 1 to 3 | Each reel landing, each a little higher | 0.26 to 0.28 | 0.08 s |
| Build | The last reel hanging before a possible big win | 0.18, rising | Until the reel lands |
| Small win | Less than the wager back | 0.15 | 0.17 s |
| Win | The wager back or more | 0.23 | 0.88 s |
| Big win | 10x the wager or more | 0.53 | 2.7 s |
| Refill | Free tokens at zero | 0.20 | 0.72 s |
| Tick | Wager and PAYS buttons | 0.06 | 0.01 s |

## Result against each criterion

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | SPIN sounds at once and the reels are heard rolling | Pass by measurement | A sound starts within 0.2 s of the press on every spin; the rolling loop is audible when rendered |
| 2 | Each reel lands with its own sound, in order | Pass by measurement | Two stops start while rolling and one at the last stop; each stop is pitched higher |
| 3 | The sound builds when the last reel hangs | Pass by measurement | Extra sounds start while rolling on a near miss and a big win, and not on other spins |
| 4 | Small, normal, and big wins sound different and bigger | Pass by measurement | Peak 0.15, 0.23, 0.53 and length 0.17 s, 0.88 s, 2.7 s |
| 5 | A loss plays no win sound | Pass | After the last reel lands on a loss, nothing else starts |
| 6 | Nothing distorts | Pass | The loudest sound peaks at 0.53 |
| 7 | Sound can be turned off and on, and the choice is remembered | Pass | The control reads "Sound is off", and still does after a reload |
| 8 | With sound off the game plays the same | Pass | No sound starts; the same spin pays the same 60 and leaves 1,035 |
| 9 | Works in a browser that cannot play sound | Pass | With sound support removed, the spin completes and pays the same |

The page logged no errors. All 30 automated checks still pass.

## Not covered

- Listening. The measurements show sounds exist, start at the right moments, and do not clip. They say nothing about whether the sounds are pleasant or casino-like.
- Loudness when several sounds overlap in the real game, such as a big win landing while the build fades. Each sound was measured alone. The largest peaks sum to under 1.0, but this was not measured together.
- Phones. Some phones stay silent when the ringer switch is off.
- The count of sounds started in the game misses the noise-based ones (the rolling loop and part of each click and stop), because the browser counts those differently. Those were measured in the rendered part instead.

## Decisions made while building

- All sound is synthesised in the page. No audio files, as the intent required.
- A limiter was tried to guard against distortion and removed: it cut every sound to about a quarter of its level. Levels are instead set low enough that the loudest sound has headroom.
- The sound button sits top right, where the approved mockup had it.
- There is no losing sound. Casinos do not play one.
