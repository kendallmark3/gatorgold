import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WAGERS, STARTING_BALANCE, PAYTABLE, LINES } from '../src/math/config.js';
import { seededRng } from '../src/math/analysis.js';
import { createGame } from '../src/game/state.js';

// Reel stops that give a known result, with what they pay in line bets.
const LOSS = [0, 2, 3];
const TWO_COINS = [0, 0, 3]; // 2
const ONE_GATOR_LINE = [1, 1, 3]; // 4
const THREE_BABY = [1, 4, 3]; // 12
const THREE_COOL = [5, 3, 14]; // 50

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
  assert.equal(coins.spin({ stops: TWO_COINS }).payout, 10);
  assert.equal(coins.balance, STARTING_BALANCE - 25 + 10);
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
  assert.equal(outcome.payout, 500);
  assert.equal(game.balance, STARTING_BALANCE - 50 + 500);
});

test('the balance always equals start minus wagers plus wins, and never goes negative', () => {
  const rng = seededRng(3);
  const game = createGame({ wager: 50 });
  let expected = STARTING_BALANCE;
  for (let i = 0; i < 5000; i++) {
    if (game.needsRefill) {
      game.refill();
      expected = STARTING_BALANCE;
    }
    const outcome = game.spin({ rng });
    expected += outcome.payout - outcome.wager;
    assert.equal(game.balance, expected);
    assert.ok(game.balance >= 0);
    assert.ok(game.needsRefill || game.wager <= game.balance);
  }
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
