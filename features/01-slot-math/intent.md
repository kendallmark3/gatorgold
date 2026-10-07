# Feature 1: Slot math

Progressive Intent v1, feature 1 of 7. Parent intent: [intent.md](../../intent.md).

## Intent

Give Gator Gold the odds and payouts of a real slot machine, so that later features can put reels on screen knowing every spin is fair, valid, and paced to feel good. No screen in this feature: the math is proven by numbers.

## Inputs

- The symbol set from the parent intent: five gators (Wild, Queen, Cool, Happy, Baby) and five supporting symbols (treasure chest, diamond, gold coin, watermelon, swamp flower).
- The approved mockup: three reels, three rows visible, one win line across the middle.
- A wager chosen by the player.
- Assumed until Mark says otherwise: wagers of 10, 25, and 50 tokens; a starting balance of 1,000 tokens; a slightly generous game that wins about one spin in three and drains the balance slowly.

## Outputs

- A reel layout: the order of symbols on each of the three reels.
- A payout table: what each winning line pays, as a multiple of the wager.
- A way to produce a spin result, either at random or at a chosen reel position.
- A way to score a spin: what it pays, why, and whether it is a normal or a big win.
- A report of the game's measured behavior.

## Success criteria

1. Every possible reel position produces a valid result: three visible symbols per reel, a win line, and a whole-number payout that is zero or more.
2. Three of the same symbol on the win line pays, and rarer symbols pay more.
3. Wild Gator stands in for any symbol.
4. Three gators of any mix on the win line pay a small prize.
5. Long-run return is between 95% and 98% of tokens wagered.
6. Between 30% and 38% of spins pay something.
7. A big win (15 times the wager or more) arrives about once in 80 to 200 spins.
8. A player starting with 1,000 tokens at any wager usually still has tokens after 100 spins.
9. Payout is always the line's multiple times the wager, for every wager.

## Constraints

- Return and hit rate are calculated exactly from every reel position, not estimated from a sample.
- Results come from the reel layout alone. No hidden adjustment of outcomes based on balance or history.
- No screen, animation, sound, or token balance handling in this feature.
- No bonus rounds, free spins, jackpots, or extra win lines.

## Evidence

- An automated check of each success criterion that anyone can rerun.
- A written report with the exact return, hit rate, big-win rate, how often each prize lands, and how simulated sessions end.

## Refined from evidence

- Criterion 7 first set the big-win line at 20 times the wager. The first payout table drained a 1,000 balance too fast at the top wager, so top prizes were cut and the line moved to 15 times. See [evidence.md](evidence.md).

## Stop

Stop when every criterion is checked and the report is written. Tuning beyond the target ranges waits for Stephanie's reaction to the playable game.
