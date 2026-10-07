# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

Gator Gold is an alligator-themed slot game for one player, Stephanie, played with virtual tokens. Features 1 (slot math), 2 (the playable machine), 3 (five win lines), 4 (sound), 5 (logo and first look), 6 (scenery and screen sizes), and 7 (free-spins bonus) are built. Cash Out and a saved balance are not.

## Commands

Plain JavaScript modules on Node 20, with no dependencies and no build or lint step.

- `npm start` serves the game at http://localhost:4747 (`PORT` overrides). The page loads ES modules, so it must be served; opening `index.html` as a file does not work.
- `npm test` runs every test (Node's built-in runner).
- `node --test --test-name-pattern="Wild Gator"` runs tests whose name matches.
- `npm run evidence` plays the running game in headless Chrome and rewrites the screenshots and `results.json` under `features/07-free-spins/evidence/` (the output folder is set at the top of `scripts/capture-evidence.js`; point it at the feature being proven). Needs `npm start` running and Chrome installed (`CHROME` overrides the path).
- `npm run sound-evidence` renders each sound in headless Chrome and measures it, and checks the game starts sounds at the right moments. Same requirements as `npm run evidence`.
- `npm run report` prints the measured behavior of the slot math: exact return, hit rate, prize frequencies, and simulated sessions.

## Architecture

- `src/math/config.js` holds every tunable number: symbols, the three reel strips, the five win lines, the payout table, the big-win line, wagers, and starting balance. Odds come only from how often a symbol appears on a strip.
- Prizes are counted in line bets (`units`). A line bet is the wager divided by the number of lines, so `units / LINES.length` is the multiple of the wager, and every wager must divide evenly by the number of lines.
- `src/math/engine.js` turns reel stops into a result. `resultAt(stops)` is deterministic and is how a chosen outcome is produced for evidence; `spin(rng)` picks random stops and calls it. A result carries a `wins` list, one entry per winning line or coin prize, each with the `cells` (`[reel, row]`) to light. It has no balance handling.
- `src/math/analysis.js` measures the game: `exactStats()` enumerates every reel position, and the session simulator uses a seeded random source so its numbers repeat.
- `test/math.test.js` asserts the target ranges from the feature 3 intent, so changing `config.js` can fail the tests by design. After retuning, rerun `npm run report` and update the newest feature's evidence. Tests and the evidence script use fixed reel stops with known results; changing the strips or lines invalidates them.

- `src/game/state.js` is the token accounting: balance, wager, spin, refill, and the free-spins meter (`BONUS` in `config.js`). Each wager has its own meter so a cheap wager cannot fill a bonus paid at a dear one. `spin()` returns `bonusAwarded`; while `freeSpinsLeft` is above zero only `freeSpin()` is allowed. It imports the engine and draws nothing, so it is tested in Node.
- `index.html` holds the markup and every symbol's art as inline SVG `<symbol>`s named `gg-<symbol id>`. `src/ui/main.js` wires controls to the game state and runs the spin sequence; `src/ui/reels.js` animates one reel; `src/ui/styles.css` is the look.
- `src/ui/sound.js` synthesises every sound with Web Audio; there are no audio files. It takes an optional `context` so sounds can be rendered offline and measured. Do not put a `DynamicsCompressorNode` on the output: it cut every sound to about a quarter of its level. Sound cannot be verified by measurement alone; say so and ask Mark to listen.
- `scripts/lib/browser.js` is a dependency-free headless Chrome driver shared by the evidence scripts.

The same engine modules run in Node and in the browser. The game state settles the balance the moment SPIN is pressed; the screen shows the wager leaving at once and the win arriving after the reels stop.

The game is drawn at a fixed 390 x 844 and scaled to the window, so layout values are in pixels of that design size. The stacked parts leave about 24 pixels spare, shared out between them; anything added to the column needs height taken from something else.

`fit()` in `main.js` sets `--scale` for the machine and `--side` / `--side-inset` for the art either side, and adds `wide` to `<html>` when there is room for that art. The backdrop (`.scene`) and side art (`.side`) sit outside the machine and are decoration only. `body` is pinned with `position: fixed` on purpose: any overflow makes a phone browser zoom the whole page out. `--cell` in the CSS and `CELL` in `reels.js` must match, and `CELL_X`/`CELL_Y` in `main.js` are the cell centres the win lines are drawn through.

Every idle animation must be listed in the `prefers-reduced-motion` rule at the end of `styles.css`; the evidence script checks nothing is running under reduced motion.

For evidence, `?stops=5,3,14` forces every spin to those reel positions (a free spin ignores them unless they win), `&autospin=1` spins on load, `&speed=4` shortens the reel timings, and `&meter=39` starts with the free-spins meter that far filled.

The return has two parts, both in `exactStats()`: paid spins, and free spins (five average winning spins per full meter). Changing the payout table changes both, so retune against the total.

Each feature has a folder under `features/` with its `intent.md` and, once proven, `evidence.md`. Each feature is built on its own `feature/NN-name` branch. Mark pushes; do not push unless asked.

## Sources of truth

- `intent.md` is the overall Progressive Intent v1. It wins over anything else when they disagree.
- `README.md` summarizes the intent and records Mark's later direction, the working process, a proposed feature order, and an open-questions table.

The proposed feature order and every "proposed default" in the README's open-questions table are proposals. Do not treat them as decisions; confirm with Mark before building on one.

## How work is done here

Work is feature by feature, one at a time, using progressive intent:

1. Write a lean intent for one feature: inputs, outputs, success criteria, boundaries.
2. Build the smallest thing that satisfies it.
3. Run it and collect evidence against the intent.
4. Add to the intent only what the evidence shows is missing.
5. Move on only when the current feature is working and proven.

Do not design or build a feature ahead of its turn. v2 is deliberately undesigned: it comes from Stephanie's reaction to playing v1.

## What matters most

In priority order, from Mark:

1. **Looks.** It must feel like sitting at a real slot machine in a casino, not a web page with reels on it.
2. **Real gameplay.** Play must feel like a genuine slot, not a random-number demo.

The core loop to protect is: spin → anticipation → reveal → reaction → reward → spin again.

The game design is expected to be harder than the code: payout table, symbol weighting, hit frequency, return over time, win tiers, and pacing (reel stop timing, near misses). These numbers are to be designed and checked by simulation, not guessed.

## Hard boundaries

- Paid spins are honest. Every paid result is an independent draw from the reels; the game must never read the balance to choose an outcome or steer a player toward a loss. The house edge comes only from the payout table.
- The one stated exception is free spins: each is drawn from the winning reel positions only, so it always pays. That rule is shown to the player in the PAYS view and is counted in the return. Any future mechanic that changes the odds must likewise be stated to the player and included in the reported return, never hidden.
- Tokens are virtual game credits. No real money, payments, purchases, credit cards, advertising, or external gambling platform.
- Cash Out transfers nothing. It shows a playful message such as "See Mark to collect your winnings." and keeps the request and token amount visible so it can be settled in person.
- No accounts, multiplayer, social features, tournaments, complex bonus systems, or backend that the game does not strictly need.
- Keep v1 small and do not over-engineer. The implementer owns the technical solution.

## Evidence

A feature is done when it is demonstrated, not when it is claimed. The v1 evidence list in `intent.md` needs a losing spin, a normal win, and a larger win with correct accounting after each, so outcomes must be reproducible on demand rather than waited for by luck.

## Claude Code setup in this repo

`.claude/` contains a vendored copy of the `kendallmark3/intent-driven-starter` plugin (v1.0.0): the `start`, `intent-creator`, `execute-intent`, and `location-story` skills, the `intent-normalizer` and `architecture-reviewer` agents, and a Stop hook running `.claude/scripts/forbid-secrets.py`.

- The same plugin is also installed at user scope, so each skill appears twice: unprefixed from the project copy and as `intent-driven-starter:<name>` from the plugin.
- The hook is wired with `python3` because this machine has no `python` command.
- The secret guard inspects the uncommitted git diff for likely credentials and blocks the session from finishing if it finds one.
- `location-story` is for map projects and does not apply here.
