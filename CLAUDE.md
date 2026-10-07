# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

Gator Gold is an alligator-themed slot game for one player, Stephanie, played with virtual tokens. Feature 1 (slot math) is built. There is no screen or playable game yet; that is feature 2.

## Commands

Plain JavaScript modules on Node 20, with no dependencies and no build or lint step.

- `npm test` runs every test (Node's built-in runner).
- `node --test --test-name-pattern="Wild Gator"` runs tests whose name matches.
- `npm run report` prints the measured behavior of the slot math: exact return, hit rate, prize frequencies, and simulated sessions.

## Architecture

- `src/math/config.js` holds every tunable number: symbols, the three reel strips, the payout table, the big-win line, wagers, and starting balance. Odds come only from how often a symbol appears on a strip.
- `src/math/engine.js` turns reel stops into a result. `resultAt(stops)` is deterministic and is how a chosen outcome is produced for evidence; `spin(rng)` picks random stops and calls it. It has no balance handling.
- `src/math/analysis.js` measures the game: `exactStats()` enumerates every reel position, and the session simulator uses a seeded random source so its numbers repeat.
- `test/math.test.js` asserts the target ranges from the feature 1 intent, so changing `config.js` can fail the tests by design. After retuning, regenerate `features/01-slot-math/evidence.md` figures with `npm run report`.

The engine is written as browser-compatible modules so the game screen can import it unchanged.

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

By the end of feature 2 Mark wants a game that actually works: spin, watch the reels, and see a win when three gators land.

## What matters most

In priority order, from Mark:

1. **Looks.** It must feel like sitting at a real slot machine in a casino, not a web page with reels on it.
2. **Real gameplay.** Play must feel like a genuine slot, not a random-number demo.

The core loop to protect is: spin → anticipation → reveal → reaction → reward → spin again.

The game design is expected to be harder than the code: payout table, symbol weighting, hit frequency, return over time, win tiers, and pacing (reel stop timing, near misses). These numbers are to be designed and checked by simulation, not guessed.

## Hard boundaries

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
