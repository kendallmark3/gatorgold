# Gator Gold

A playful, alligator-themed slot game built for Stephanie. It should feel like a real animated slot machine, played with virtual tokens only.

**Status:** Progressive Intent v1. Features 1 (slot math) and 2 (the machine) are built: the game is playable in a browser. The source of truth is [intent.md](intent.md); this README summarizes it and records what still needs deciding.

## Play it

Needs Node 20 or later. No install step.

```
npm start
```

Then open http://localhost:4747. Press SPIN, or the space bar.

## What it is

Stephanie starts with a balance of tokens, picks a wager, and spins. Wins add tokens, losses deduct them. When she wants to collect, she hits Cash Out and the game tells her:

> "See Mark to collect your winnings."

Nothing is transferred by the software. The redemption request and token amount stay on screen so Mark and Stephanie can settle it in person.

## The heart of v1

> Spin → anticipation → reveal → reaction → reward → spin again.

The game should be fun to spin, not merely function as a slot machine. If that loop feels good, v1 has done its job. Everything else is secondary.

## Priorities

Direction from Mark, ahead of any implementation:

1. **Looks.** This one is about good looks. It has to feel like sitting at a real slot machine in a casino, not like a web page with reels on it.
2. **Real gameplay.** The play itself has to feel like a genuine slot, not a random-number demo dressed up.

## Agreed look

Mark approved the first game-screen mockup on 2026-10-06 as the visual direction: swamp green and heavy gold, a gold cabinet with marquee bulbs, three reels showing three rows, a gator mascot with a speech bubble, and a big red SPIN button. The mockup is a private design canvas at https://claude.ai/artifact/TkoBz7CcRfwNAtrHL8sdSh.

The numbers shown in it are placeholders, and Wild Gator and the treasure chest are not drawn yet.

## The hard part: game design

The game design is expected to be the hardest part of v1, harder than the code. It is what makes a slot feel real, and it has to be worked out before building:

- **Payout table:** which combinations pay, and how much, at each wager
- **Symbol weighting:** how often each symbol lands, so common wins are small and big wins are rare
- **Hit frequency:** how often a spin wins anything at all, so play never feels dead or rigged
- **Return over time:** how fast a starting balance drains or grows across a few minutes of play
- **Win tiers:** where a normal win ends and an "unusually good" win begins
- **Pacing:** reel stop timing, the delay on the last reel, and near misses, which create the anticipation

These numbers need to be designed and checked by simulation, not guessed. A slot that looks great but pays out wrong will feel off within a minute.

## How we work

Gator Gold is built feature by feature, one at a time, using progressive intent:

1. Write a lean intent for one feature: inputs, outputs, success criteria, boundaries.
2. Build the smallest thing that satisfies it.
3. Run it and collect evidence against the intent.
4. Add to the intent only what the evidence shows is missing.
5. Move to the next feature only when the current one is working and proven.

No feature is designed ahead of its turn. [intent.md](intent.md) stays the overall v1 intent; each feature gets its own smaller intent beneath it.

### Proposed feature order

Each line is one feature with its own intent under [features/](features/). Features 1 and 2 are agreed; the rest are a proposal.

| # | Feature | What it proves |
| --- | --- | --- |
| 1 | Slot math (done) | Symbols, weights, and payout table give the right hit frequency and return, shown by simulation. See the [evidence](features/01-slot-math/evidence.md) |
| 2 | The machine (done) | A game that actually works: Mark can spin, watch the reels roll and stop, and see a win when three gators land. See the [evidence](features/02-machine/evidence.md) |
| 3 | Token play | Mostly delivered in feature 2 (balance, wager, accounting). What is left: the balance surviving a reload |
| 4 | Wins | Winning combinations are obvious, with a celebration and a bigger one for large wins |
| 5 | Gators | The characters have personality and react to what happens |
| 6 | Cash Out | The "See Mark" redemption request appears and stays visible |
| 7 | Sound | Spins and wins sound like a casino, with a mute control |

## v1 scope

In:

- Animated slot reels
- Token balance, wager amount, and a spin control, all clearly visible
- Obvious winning combinations, with winnings added and wagers deducted automatically
- A celebration for wins, and a bigger one for unusually good wins
- Alligator characters with personality
- Cash Out / Redeem, showing the playful "See Mark" message

Out:

- Real money, payments, purchases, credit cards, advertising, external gambling platforms
- Accounts, multiplayer, social features, tournaments
- Complex bonus systems, elaborate paylines or economies
- Backend infrastructure that the game does not strictly need

## Symbols

Suggested starting set; the implementer may improve or simplify it.

| Gator characters | Supporting symbols |
| --- | --- |
| Happy Gator | Gold coin |
| Cool Gator | Diamond |
| Queen Gator | Watermelon |
| Wild Gator | Swamp flower |
| Baby Gator | Treasure chest |

## Success criteria

v1 succeeds when:

- Stephanie can open the game and play without instructions
- She can wager and spin repeatedly, and every spin produces a valid result
- Token accounting stays correct
- Winning combinations are obvious and the reels animate smoothly
- It feels colorful, polished, and playful, closer to a real slot than a software demo
- The gators give it a recognizable personality
- Winning feels rewarding through motion, sound, graphics, or a mix
- She can request redemption of her displayed balance
- It can be played for several minutes without errors or confusing states

## Evidence required

A demonstration of the running game showing:

1. Starting token balance
2. At least three different wager amounts
3. A losing spin
4. A normal winning spin
5. A larger winning spin
6. Correct token accounting after each
7. A gator animation or character reaction
8. A successful Cash Out / Redeem request

## Open questions

The intent leaves these to the implementer or does not address them. Each has a proposed default; none is decided.

| Question | Why it matters | Proposed default |
| --- | --- | --- |
| What device does Stephanie play on? | Drives layout and how the game is delivered to her | Build for a phone first, usable on a laptop |
| What is the technical shape? | "The implementer owns the technical solution" | A single static web page, no backend, no build step |
| What happens when tokens hit zero? | Otherwise the game dead-ends in a confusing state | A gator offers a free refill |
| What happens to the balance after Cash Out? | Affects accounting and what "remains visible" means | Balance resets to the starting amount; the request stays on screen with its amount and date |
| Does the balance survive closing the game? | A redemption request that vanishes on reload cannot be settled | Save balance and pending redemption in the browser |
| How many reels and lines? | The intent warns against burying v1 under paylines, but a real casino feel may want more than the minimum | Three reels, one win line, revisited once the payout table is designed |
| What return and hit frequency should the game target? | Sets how long a balance lasts and how often Stephanie wins | Slightly generous: a win on roughly one spin in three, with the balance drifting down slowly |
| Starting balance and wager steps? | Needed for the three-wager evidence | 1,000 tokens; wagers of 10, 25, and 50 |
| How are the gators drawn? | Five distinct characters with personality is a large part of the casino look | Hand-built vector art in the page, no external assets |
| Is sound in v1? | The intent lists it as one option, not a requirement | Yes, with a mute control |
| How is the evidence produced? | A large win cannot be waited for by luck | A hidden test mode that forces a chosen outcome |

## After v1

v2 is deliberately not designed. Stephanie plays v1 first, and her reaction and actual gameplay become the next intent.
