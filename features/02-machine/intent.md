# Feature 2: The machine

Progressive Intent v1, feature 2 of 7. Parent intent: [intent.md](../../intent.md).

## Intent

Put Gator Gold in the browser as a slot machine that works and looks good from the first spin. Mark can open it, spin, watch the reels roll and stop, and win.

## Inputs

- The slot math from [feature 1](../01-slot-math/intent.md): reel layout, payout table, and spin results. Unchanged.
- The approved look: swamp green and gold, a gold cabinet with marquee bulbs, three reels showing three rows, the gator mascot with a speech bubble, and a big red SPIN button.
- A starting balance of 1,000 tokens and wagers of 10, 25, and 50.

## Outputs

- A game page that opens in a browser on a laptop or a phone.
- Three reels that spin and stop one after another, left to right.
- A SPIN control, a wager control, and a visible token balance.
- A clear win display: the winning symbols and line light up and the amount won is shown.
- A bigger celebration for a big win.
- A view of what each winning line pays.
- All ten symbols drawn, including Wild Gator and the treasure chest.

## Success criteria

1. The game opens in a browser with one command and needs no instructions to play.
2. Pressing SPIN takes the wager, rolls the reels, and stops them on a result from the slot math.
3. The reels stop in order, and the last reel takes longer when the first two could complete a three of a kind.
4. Three matching symbols, any three gators, and gold coins on the line each show as a win, with the right symbols lit and the right amount.
5. A loss is plainly a loss and the player can spin again at once.
6. A big win gets a visibly bigger celebration than a normal win.
7. The balance is right after every spin: down by the wager, up by the win.
8. The wager can be changed between spins and never exceeds the balance.
9. Running out of tokens does not dead-end the game.
10. It looks like the approved mockup, not a software demo.

## Constraints

- No change to odds or payouts.
- No Cash Out, sound, or saved balance in this feature; each has its own feature.
- No accounts, backend, or build step.
- A chosen result can be forced for evidence, by a means a player would not stumble on.

## Evidence

- Automated checks of the token accounting.
- Screenshots of the running game: at rest, a loss, a normal win, a three-gator win, and a big win, each with the balance shown.

## Stop

Stop when the game is playable and each criterion has evidence. Polish beyond that waits for Mark's reaction to playing it.
