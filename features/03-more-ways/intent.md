# Feature 3: More ways to win

Progressive Intent v1, feature 3. Parent intent: [intent.md](../../intent.md).

## Intent

Stop the game getting boring. After playing feature 2, Mark found that paying only on three across the middle means too many dead spins. Give the player frequent small wins so most spins feel alive, keep three of a kind as the big prize, and let the house still come out ahead over a long session.

## Inputs

- Mark's reaction to playing feature 2: "it's going to get boring fast", "pay out smaller wins", "the three across gives you the jackpot", and the player should feel they are winning while losing in the end.
- The reels, symbols, wagers, and starting balance from features 1 and 2. Unchanged.
- The playable machine from feature 2.

## Outputs

- More ways to win on the same three reels.
- A retuned payout table.
- The machine showing every way a spin won.
- An updated payout view.
- An updated report of the game's measured behavior.

## Success criteria

1. A spin can win on five lines: the three rows and both diagonals.
2. Three of a kind on any line is still the big prize, and rarer symbols pay more.
3. Any three gators on a line pays a small prize, less than the wager.
4. Gold coins pay wherever they land, by how many are in view.
5. Between 45% and 60% of spins pay something.
6. Between 15% and 25% of spins pay the wager back or more.
7. A big win (10 times the wager or more) arrives about once in 40 to 120 spins.
8. Long-run return is between 93% and 97%.
9. A long session usually ends below where it started, at every wager.
10. A 1,000 balance usually lasts 100 spins at the two lower wagers.
11. Every win on screen shows which symbols and which line won, and a win smaller than the wager is not dressed up as a big one.
12. The balance is right after every spin.

## Constraints

- Every spin is an independent, honest draw from the reels. The game never looks at the balance or the history to decide a result, and never steers a player toward a loss. The house comes out ahead only because the payouts return less than is wagered.
- The wager stays one amount per spin covering all five lines. No choosing lines.
- No bonus rounds, free spins, or jackpots that grow.
- No change to the look beyond what showing more wins needs.

## Evidence

- Automated checks of each numeric criterion.
- The measured report: return, hit rates, where wins come from, and how sessions end.
- Screenshots of the running game showing a small win, a diagonal win, several lines at once, and a big win, each with the balance.

## Stop

Stop when each criterion has evidence. Further tuning waits for Mark's reaction to playing it.
