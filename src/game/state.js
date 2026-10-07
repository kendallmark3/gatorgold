import { WAGERS, STARTING_BALANCE } from '../math/config.js';
import { resultAt, spin as randomSpin, payoutFor } from '../math/engine.js';

// Token accounting for one player. Holds the balance and wager and applies
// each spin's result; it draws nothing.
export function createGame({ balance = STARTING_BALANCE, wager = WAGERS[1] } = {}) {
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
      return balance < WAGERS[0];
    },
    canSpin() {
      return wager <= balance;
    },
    canStepWager(direction) {
      const next = WAGERS[WAGERS.indexOf(wager) + direction];
      return next !== undefined && next <= balance;
    },
    stepWager(direction) {
      if (this.canStepWager(direction)) wager = WAGERS[WAGERS.indexOf(wager) + direction];
      return wager;
    },
    // Takes the wager, resolves the reels, and credits any win. Pass `stops`
    // to choose the result; otherwise it is random.
    spin({ rng = Math.random, stops } = {}) {
      if (!this.canSpin()) throw new Error(`Balance ${balance} cannot cover a wager of ${wager}`);
      const staked = wager;
      const result = stops ? resultAt(stops) : randomSpin(rng);
      const payout = payoutFor(result.multiplier, staked);
      const balanceAfterWager = balance - staked;
      balance = balanceAfterWager + payout;
      clampWager();
      return { wager: staked, result, payout, balanceAfterWager, balance };
    },
    refill() {
      if (!this.needsRefill) throw new Error('Refill is only for a balance below the smallest wager');
      balance = STARTING_BALANCE;
      return balance;
    },
  };
}
