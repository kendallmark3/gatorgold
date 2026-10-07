# Feature 4: Sound

Progressive Intent v1, feature 4. Parent intent: [intent.md](../../intent.md).

## Intent

Make Gator Gold sound like a slot machine on a casino floor, so a spin is heard as well as seen and a win sounds like a win.

## Inputs

- Mark's request after playing feature 3: "some cool sound, something that you would hear in a casino."
- The spin sequence from features 2 and 3: press, reels rolling, each reel stopping, the last reel hanging, and a small, normal, or big win.

## Outputs

- A sound for each moment of a spin: the press, the reels rolling, each reel landing, the hang before a possible big win, and each size of win.
- Sounds for the smaller controls: changing the wager and refilling.
- A sound on/off control that remembers the player's choice.

## Success criteria

1. Pressing SPIN makes a sound at once, and the reels are heard rolling until they stop.
2. Each reel lands with its own sound, in order.
3. When the last reel hangs, the sound builds.
4. A small win, a normal win, and a big win each sound different, and bigger wins sound bigger and last longer.
5. A loss plays no win sound.
6. No sound is so loud it distorts.
7. The player can turn sound off and on, the control shows which it is, and the choice is still set the next time the game opens.
8. With sound off, the game plays exactly as before.
9. The game works the same in a browser that cannot play sound.

## Constraints

- No sound plays before the player first touches the game.
- No music loop or background ambience in this feature.
- No sound files to download; the game stays a page that needs nothing else.
- No change to odds, payouts, or timing of the spin.

## Evidence

- Each sound rendered and measured: that it is audible, how long it lasts, and that it does not clip.
- The running game checked for the right sounds starting at the right moments, and for silence when sound is off.
- Mark listening to it. Sound cannot be judged by measurement.

## Stop

Stop when each criterion has evidence. How good it sounds is Mark's call after hearing it.
