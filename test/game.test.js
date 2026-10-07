import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WAGERS, STARTING_BALANCE, PAYTABLE, LINES, BONUS } from '../src/math/config.js';
import { seededRng } from '../src/math/analysis.js';
import { createGame } from '../src/game/state.js';

// Reel stops that give a known result, with what they pay in line bets.
const LOSS = [0, 2, 3];
const TWO_COINS = [0, 0, 3];
const ONE_GATOR_LINE = [1, 1, 3];
const THREE_BABY = [1, 4, 3];
const THREE_COOL = [5, 3, 14];

test('a new game starts with the starting balance and the middle wager', () => {
  const game = createGame();
  assert.equal(game.balance, STARTING_BALANCE);
  assert.equal(game.wager, WAGERS[1]);
});

test('a losing spin takes the wager and pays nothing', () => {
  const game = createGame();
  const outcome = game.spin({ stops: LOSS });
  assert.equal(outcome.payout, 0);
  assert.equal(outcome.balanceAfterWager, STARTING_BALANCE - 25);
  assert.equal(game.balance, STARTING_BALANCE - 25);
});

test('a small win pays less than the wager, at every wager', () => {
  for (const wager of WAGERS) {
    const game = createGame({ wager });
    const outcome = game.spin({ stops: ONE_GATOR_LINE });
    assert.equal(outcome.payout, (PAYTABLE.anyGators * wager) / LINES.length);
    assert.ok(outcome.payout > 0 && outcome.payout < wager);
    assert.equal(game.balance, STARTING_BALANCE - wager + outcome.payout);
  }
  const coins = createGame();
  const coinPrize = (PAYTABLE.coins[2] * 25) / LINES.length;
  assert.equal(coins.spin({ stops: TWO_COINS }).payout, coinPrize);
  assert.equal(coins.balance, STARTING_BALANCE - 25 + coinPrize);
});

test('a win is credited in full, at every wager', () => {
  for (const wager of WAGERS) {
    const game = createGame({ wager });
    const outcome = game.spin({ stops: THREE_BABY });
    assert.equal(outcome.payout, (PAYTABLE.three.baby * wager) / LINES.length);
    assert.equal(game.balance, STARTING_BALANCE - wager + outcome.payout);
  }
});

test('a big win is credited in full', () => {
  const game = createGame({ wager: 50 });
  const outcome = game.spin({ stops: THREE_COOL });
  assert.equal(outcome.result.tier, 'big');
  const prize = (PAYTABLE.three.cool * 50) / LINES.length;
  assert.equal(outcome.payout, prize);
  assert.equal(game.balance, STARTING_BALANCE - 50 + prize);
});

test('the balance always equals start minus wagers plus wins, and never goes negative', () => {
  const rng = seededRng(3);
  const game = createGame({ wager: 50 });
  let expected = STARTING_BALANCE;
  let freeSpins = 0;
  for (let i = 0; i < 5000; i++) {
    if (game.needsRefill) {
      game.refill();
      expected = STARTING_BALANCE;
    }
    const outcome = game.spin({ rng });
    expected += outcome.payout - outcome.wager;
    while (game.freeSpinsLeft > 0) {
      expected += game.freeSpin({ rng }).payout;
      freeSpins += 1;
    }
    assert.equal(game.balance, expected);
    assert.ok(game.balance >= 0);
    assert.ok(game.needsRefill || game.wager <= game.balance);
  }
  assert.ok(freeSpins > 0);
});

test('each paid spin fills the meter by one, and a full meter awards free spins', () => {
  const game = createGame({ balance: 100000 });
  for (let i = 1; i < BONUS.spinsToFill; i++) {
    assert.equal(game.spin({ stops: LOSS }).bonusAwarded, false);
    assert.equal(game.bonusProgress, i);
    assert.equal(game.freeSpinsLeft, 0);
  }
  assert.equal(game.spin({ stops: LOSS }).bonusAwarded, true);
  assert.equal(game.freeSpinsLeft, BONUS.freeSpins);
  assert.equal(game.bonusProgress, 0);
});

test('free spins cost nothing, always win, and pay at the wager that filled the meter', () => {
  const rng = seededRng(8);
  const game = createGame({ balance: 100000, wager: 50, bonusProgress: { 50: BONUS.spinsToFill - 1 } });
  game.spin({ stops: LOSS });
  let balance = game.balance;
  for (let left = BONUS.freeSpins - 1; left >= 0; left--) {
    const outcome = game.freeSpin({ rng });
    assert.ok(outcome.result.units > 0);
    assert.equal(outcome.wager, 50);
    assert.equal(outcome.payout, (outcome.result.units * 50) / LINES.length);
    assert.equal(game.balance, balance + outcome.payout);
    assert.equal(outcome.freeSpinsLeft, left);
    balance = game.balance;
  }
  assert.throws(() => game.freeSpin({ rng }));
});

test('while free spins are waiting, paid spins and wager changes are locked', () => {
  const game = createGame({ balance: 100000, bonusProgress: { 25: BONUS.spinsToFill - 1 } });
  game.spin({ stops: LOSS });
  assert.equal(game.canSpin(), false);
  assert.equal(game.canStepWager(1), false);
  assert.equal(game.stepWager(1), 25);
  assert.throws(() => game.spin({ stops: LOSS }));
  for (let i = 0; i < BONUS.freeSpins; i++) game.freeSpin({ rng: seededRng(i) });
  assert.equal(game.canSpin(), true);
  assert.equal(game.canStepWager(1), true);
});

test('each wager has its own meter', () => {
  const game = createGame({ balance: 100000 });
  game.spin({ stops: LOSS });
  game.spin({ stops: LOSS });
  assert.equal(game.bonusProgress, 2);
  game.stepWager(1);
  assert.equal(game.bonusProgress, 0);
  game.spin({ stops: LOSS });
  assert.equal(game.bonusProgress, 1);
  game.stepWager(-1);
  assert.equal(game.bonusProgress, 2);
});

test('a free spin uses chosen stops only when they win', () => {
  const start = () => {
    const game = createGame({ balance: 100000, bonusProgress: { 25: BONUS.spinsToFill - 1 } });
    game.spin({ stops: LOSS });
    return game;
  };
  assert.deepEqual(start().freeSpin({ stops: THREE_BABY }).result.stops, THREE_BABY);
  const fromLoss = start().freeSpin({ stops: LOSS, rng: seededRng(1) });
  assert.ok(fromLoss.result.units > 0);
});

test('a player who empties the balance on the spin that fills the meter still gets the free spins', () => {
  const game = createGame({ balance: 10, wager: 10, bonusProgress: { 10: BONUS.spinsToFill - 1 } });
  game.spin({ stops: LOSS });
  assert.equal(game.balance, 0);
  assert.equal(game.needsRefill, false);
  assert.equal(game.freeSpinsLeft, BONUS.freeSpins);
  for (let i = 0; i < BONUS.freeSpins; i++) game.freeSpin({ rng: seededRng(i) });
  assert.ok(game.balance > 0);
});

test('the wager steps through the allowed amounts and stops at each end', () => {
  const game = createGame({ wager: 10 });
  assert.equal(game.canStepWager(-1), false);
  assert.equal(game.stepWager(-1), 10);
  assert.equal(game.stepWager(1), 25);
  assert.equal(game.stepWager(1), 50);
  assert.equal(game.canStepWager(1), false);
  assert.equal(game.stepWager(1), 50);
});

test('the wager cannot be raised past the balance, and drops when the balance falls', () => {
  const low = createGame({ balance: 30, wager: 25 });
  assert.equal(low.canStepWager(1), false);
  const falling = createGame({ balance: 60, wager: 50 });
  falling.spin({ stops: LOSS });
  assert.equal(falling.balance, 10);
  assert.equal(falling.wager, 10);
  assert.equal(falling.canSpin(), true);
});

test('with too few tokens the game cannot spin but can refill', () => {
  const game = createGame({ balance: 10, wager: 10 });
  game.spin({ stops: LOSS });
  assert.equal(game.balance, 0);
  assert.equal(game.needsRefill, true);
  assert.equal(game.canSpin(), false);
  assert.throws(() => game.spin({ stops: LOSS }));
  assert.equal(game.refill(), STARTING_BALANCE);
  assert.equal(game.canSpin(), true);
});

test('refill is refused while the player can still spin', () => {
  assert.throws(() => createGame().refill());
});
