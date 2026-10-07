import { WAGERS, STARTING_BALANCE, BONUS } from '../math/config.js';
import { resultAt, spin as randomSpin, spinWinning, payoutFor } from '../math/engine.js';

// Token accounting for one player. Holds the balance, the wager, and the
// free-spins meter, and applies each spin's result; it draws nothing.
// `bonusProgress` maps a wager to how far its meter has filled.
export function createGame({ balance = STARTING_BALANCE, wager = WAGERS[1], bonusProgress = {} } = {}) {
  const progress = new Map(WAGERS.map((w) => [w, bonusProgress[w] ?? 0]));
  // Free spins waiting to be played, and the wager they pay at.
  let free = { left: 0, wager: 0 };
  const affordable = () => WAGERS.filter((w) => w <= balance);

  // Keeps the wager within what the balance can cover.
  function clampWager() {
    const options = affordable();
    if (options.length > 0 && wager > balance) wager = options[options.length - 1];
  }
  clampWager();

  return {
    get balance() {
      return balance;
    },
    get wager() {
      return wager;
    },
    get needsRefill() {
      return free.left === 0 && balance < WAGERS[0];
    },
    // How far the meter for the current wager has filled, from 0 to BONUS.spinsToFill.
    get bonusProgress() {
      return progress.get(wager);
    },
    get freeSpinsLeft() {
      return free.left;
    },
    canSpin() {
      return free.left === 0 && wager <= balance;
    },
    canStepWager(direction) {
      const next = WAGERS[WAGERS.indexOf(wager) + direction];
      return free.left === 0 && next !== undefined && next <= balance;
    },
    stepWager(direction) {
      if (this.canStepWager(direction)) wager = WAGERS[WAGERS.indexOf(wager) + direction];
      return wager;
    },
    // A paid spin: takes the wager, resolves the reels, credits any win, and
    // fills the meter. Pass `stops` to choose the result; otherwise it is
    // random. `bonusAwarded` is true when this spin filled the meter.
    spin({ rng = Math.random, stops } = {}) {
      if (!this.canSpin()) throw new Error(`Cannot spin: balance ${balance}, wager ${wager}, free spins waiting ${free.left}`);
      const staked = wager;
      const result = stops ? resultAt(stops) : randomSpin(rng);
      const payout = payoutFor(result.units, staked);
      const balanceAfterWager = balance - staked;
      balance = balanceAfterWager + payout;

      const filled = progress.get(staked) + 1;
      const bonusAwarded = filled >= BONUS.spinsToFill;
      progress.set(staked, bonusAwarded ? 0 : filled);
      if (bonusAwarded) free = { left: BONUS.freeSpins, wager: staked };
      else clampWager();
      return { wager: staked, result, payout, balanceAfterWager, balance, bonusAwarded };
    },
    // One free spin: costs nothing and always lands on a winning position.
    // `stops` is used only if it is a winning position.
    freeSpin({ rng = Math.random, stops } = {}) {
      if (free.left === 0) throw new Error('No free spins waiting');
      const forced = stops ? resultAt(stops) : null;
      const result = forced && forced.units > 0 ? forced : spinWinning(rng);
      const payout = payoutFor(result.units, free.wager);
      balance += payout;
      free = { left: free.left - 1, wager: free.wager };
      if (free.left === 0) clampWager();
      return { wager: free.wager, result, payout, balance, freeSpinsLeft: free.left };
    },
    refill() {
      if (!this.needsRefill) throw new Error('Refill is only for a balance below the smallest wager');
      balance = STARTING_BALANCE;
      return balance;
    },
  };
}
