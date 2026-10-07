import { SYMBOLS, WILD, COIN, REEL_STRIPS, LINES, PAYTABLE, BIG_WIN_AT } from './config.js';

// The three symbols a reel shows when stopped at `stop`: the stop is the
// middle row, with its strip neighbours above and below.
function reelWindow(strip, stop) {
  const n = strip.length;
  return [strip[(stop - 1 + n) % n], strip[stop], strip[(stop + 1) % n]];
}

// Scores the three symbols on one line. Returns the prize the line qualifies
// for, or null.
export function evaluateLine(symbols) {
  const plain = symbols.filter((s) => s !== WILD);
  const kind = plain.length === 0 ? WILD : plain[0];
  if (plain.every((s) => s === kind)) {
    return { rule: 'three', symbol: kind, units: PAYTABLE.three[kind] };
  }
  if (symbols.every((s) => SYMBOLS[s].gator)) {
    return { rule: 'anyGators', symbol: null, units: PAYTABLE.anyGators };
  }
  return null;
}

// Scores everything in view: each win line, then coins anywhere. `window` is
// one column of three symbols per reel.
export function evaluate(window) {
  const wins = [];
  LINES.forEach((line, index) => {
    const win = evaluateLine(line.rows.map((row, reel) => window[reel][row]));
    if (win) wins.push({ line: index, ...win, cells: line.rows.map((row, reel) => [reel, row]) });
  });

  const coins = [];
  window.forEach((column, reel) => column.forEach((s, row) => s === COIN && coins.push([reel, row])));
  if (PAYTABLE.coins[coins.length]) {
    wins.push({ line: null, rule: 'coins', symbol: COIN, units: PAYTABLE.coins[coins.length], cells: coins });
  }

  const units = wins.reduce((sum, win) => sum + win.units, 0);
  const multiplier = units / LINES.length;
  const tier = units === 0 ? 'none' : multiplier >= BIG_WIN_AT ? 'big' : multiplier >= 1 ? 'win' : 'small';
  return { wins, units, multiplier, tier };
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
  return { stops, window, ...evaluate(window) };
}

// A random spin. `rng` returns a number in [0, 1), like Math.random.
export function spin(rng = Math.random) {
  return resultAt(REEL_STRIPS.map((strip) => Math.floor(rng() * strip.length)));
}

// A free spin: a random spin drawn from the winning reel positions only. Every
// winning position is equally likely.
export function spinWinning(rng = Math.random) {
  for (;;) {
    const result = spin(rng);
    if (result.units > 0) return result;
  }
}

// Tokens paid for `units` line bets at a wager. The wager must split evenly
// across the lines, so the result is always a whole number.
export function payoutFor(units, wager) {
  if (wager % LINES.length !== 0) throw new Error(`A wager of ${wager} does not split across ${LINES.length} lines`);
  return (units * wager) / LINES.length;
}
