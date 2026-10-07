# Feature 1: Slot math, evidence

> **Superseded.** [Feature 3](../03-more-ways/evidence.md) replaced the single win line and this payout table with five lines. The figures below describe the game as it was after feature 1.

Measured on 2026-10-06 against [intent.md](intent.md). Regenerate the figures with `npm run report`; rerun the checks with `npm test`.

## Result against each criterion

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Every reel position gives a valid result | Pass | All 39,304 positions checked |
| 2 | Three of a kind pays, rarer pays more | Pass | Checked for all ten symbols |
| 3 | Wild Gator stands in for any symbol | Pass | Checked in each reel position |
| 4 | Any three gators pay a small prize | Pass | Pays 5x |
| 5 | Return between 95% and 98% | Pass | 96.39%, exact |
| 6 | 30% to 38% of spins pay | Pass | 34.43%, exact |
| 7 | Big win once in 80 to 200 spins | Pass | Once in 162, exact |
| 8 | 1,000 tokens usually lasts 100 spins at any wager | Pass, narrowly at 50 | Ran out in 0.0%, 8.5%, and 48.1% of sessions at wagers 10, 25, and 50 |
| 9 | Payout is the multiple times the wager | Pass | Checked for each wager |

All 15 automated checks pass.

## What the evidence changed

The first payout table met the return and hit-rate targets but failed criterion 8: at a wager of 50, 64% of sessions ran out of tokens within 100 spins. Too much of the return sat in rare top prizes. The table was retuned:

- Top prizes were cut (Wild Gator 200x to 100x, Queen Gator 100x to 50x, Cool Gator 50x to 25x).
- "Any three gators" was raised from 3x to 5x, so more of the return arrives as frequent mid-sized wins.
- The big-win line moved from 20x to 15x to keep big wins inside the target range.
- Treasure chest paid less than the more common Cool Gator; the order now follows rarity.

## Open for Mark

- A wager of 50 from a 1,000 balance is only 20 spins of cover, and it still runs out in about half of 100-spin sessions. If that feels too harsh in play, raise the starting balance or lower the top wager; the payout table does not need to change.
- The typical session drifts down: after 100 spins at a wager of 10 the median balance is 920.

## Exact figures

From all 39,304 reel positions.

| Measure | Value |
| --- | --- |
| Return to player | 96.39% |
| Spins that pay | 34.43% (one in 2.9) |
| Big wins (15x or more) | 0.62% (one in 162) |

## Payout table

| Win line | Pays | Symbols per reel |
| --- | --- | --- |
| 3 x Wild Gator | 100x | 1, 1, 1 |
| 3 x Queen Gator | 50x | 2, 2, 2 |
| 3 x Treasure chest | 40x | 2, 2, 2 |
| 3 x Cool Gator | 25x | 3, 3, 3 |
| 3 x Diamond | 20x | 3, 3, 3 |
| 3 x Gold coin | 15x | 3, 3, 3 |
| 3 x Happy Gator | 12x | 4, 4, 4 |
| 3 x Baby Gator | 8x | 5, 5, 5 |
| 3 x Watermelon | 6x | 5, 5, 5 |
| 3 x Swamp flower | 4x | 6, 6, 6 |
| Any 3 gators | 5x | |
| 2 gold coins | 3x | |
| 1 gold coin | 1x | |

## How often each prize lands

| Prize | Share of spins | About one in |
| --- | --- | --- |
| Nothing | 65.566% | 1.5 |
| 1x | 21.982% | 4.5 |
| 3x | 2.061% | 48.5 |
| 4x | 0.870% | 114.9 |
| 5x | 7.495% | 13.3 |
| 6x | 0.547% | 182.8 |
| 8x | 0.547% | 182.8 |
| 12x | 0.315% | 317.0 |
| 15x | 0.160% | 623.9 |
| 20x | 0.160% | 623.9 |
| 25x | 0.160% | 623.9 |
| 40x | 0.066% | 1511.7 |
| 50x | 0.066% | 1511.7 |
| 100x | 0.003% | 39304.0 |

## Simulated sessions

5,000 sessions per row, each starting with 1,000 tokens.

| Wager | Spins | Ran out | Ended ahead | Low (10th pct) | Median | High (90th pct) |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 100 | 0.0% | 37.7% | 650 | 920 | 1320 |
| 10 | 300 | 2.1% | 36.6% | 320 | 840 | 1510 |
| 25 | 100 | 8.5% | 37.3% | 100 | 800 | 1800 |
| 25 | 300 | 46.8% | 32.8% | 0 | 275 | 2225 |
| 50 | 100 | 48.1% | 32.3% | 0 | 200 | 2450 |
| 50 | 300 | 74.9% | 20.7% | 0 | 0 | 2950 |
