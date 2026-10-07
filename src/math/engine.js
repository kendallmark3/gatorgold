import { SYMBOLS, WILD, COIN, REEL_STRIPS, PAYTABLE, BIG_WIN_AT } from './config.js';

const ROWS = 3;

// The three symbols a reel shows when stopped at `stop`: the stop is the
// middle row, with its strip neighbours above and below.
function reelWindow(strip, stop) {
  const n = strip.length;
  return [strip[(stop - 1 + n) % n], strip[stop], strip[(stop + 1) % n]];
}

// Scores the three symbols on the win line.
export function evaluate(line) {
  const plain = line.filter((s) => s !== WILD);
  const kind = plain.length === 0 ? WILD : plain[0];
  let multiplier = 0;
  let rule = null;
  let symbol = null;

  if (plain.every((s) => s === kind)) {
    multiplier = PAYTABLE.three[kind];
    rule = 'three';
    symbol = kind;
  } else if (line.every((s) => SYMBOLS[s].gator)) {
    multiplier = PAYTABLE.anyGators;
    rule = 'anyGators';
  } else {
    const coins = line.filter((s) => s === COIN).length;
    if (coins > 0) {
      multiplier = PAYTABLE.coins[coins];
      rule = 'coins';
      symbol = COIN;
    }
  }

  const tier = multiplier === 0 ? 'none' : multiplier >= BIG_WIN_AT ? 'big' : 'win';
  return { multiplier, rule, symbol, tier };
}

// The full result of the reels stopping at the given positions.
export function resultAt(stops) {
  if (stops.length !== REEL_STRIPS.length) {
    throw new Error(`Expected ${REEL_STRIPS.length} reel stops, got ${stops.length}`);
  }
  const window = stops.map((stop, reel) => {
    const strip = REEL_STRIPS[reel];
    if (!Number.isInteger(stop) || stop < 0 || stop >= strip.length) {
      throw new Error(`Reel ${reel + 1} stop ${stop} is outside 0-${strip.length - 1}`);
    }
    return reelWindow(strip, stop);
  });
  const line = window.map((column) => column[(ROWS - 1) / 2]);
  return { stops, window, line, ...evaluate(line) };
}

// A random spin. `rng` returns a number in [0, 1), like Math.random.
export function spin(rng = Math.random) {
  return resultAt(REEL_STRIPS.map((strip) => Math.floor(rng() * strip.length)));
}

export function payoutFor(multiplier, wager) {
  return multiplier * wager;
}
