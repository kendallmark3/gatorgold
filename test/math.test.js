import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYMBOLS, REEL_STRIPS, LINES, PAYTABLE, BONUS, BIG_WIN_AT, WAGERS, STARTING_BALANCE } from '../src/math/config.js';
import { evaluate, evaluateLine, resultAt, spin, spinWinning, payoutFor } from '../src/math/engine.js';
import { exactStats, seededRng, simulateSession, simulateSessions } from '../src/math/analysis.js';

const stats = exactStats();

// Builds a three-reel view from its rows, top to bottom.
const view = (top, middle, bottom) => [0, 1, 2].map((reel) => [top[reel], middle[reel], bottom[reel]]);
const QUIET_TOP = ['melon', 'flower', 'diamond'];
const QUIET_BOTTOM = ['flower', 'diamond', 'melon'];

test('every reel position gives a valid result', () => {
  const [a, b, c] = REEL_STRIPS;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      for (let k = 0; k < c.length; k++) {
        const r = resultAt([i, j, k]);
        assert.equal(r.window.length, 3);
        for (const column of r.window) {
          assert.equal(column.length, 3);
          for (const s of column) assert.ok(SYMBOLS[s], `unknown symbol ${s}`);
        }
        assert.ok(Number.isInteger(r.units) && r.units >= 0);
        assert.equal(r.units, r.wins.reduce((sum, win) => sum + win.units, 0));
        for (const wager of WAGERS) assert.ok(Number.isInteger(payoutFor(r.units, wager)));
      }
    }
  }
  assert.equal(stats.total, a.length * b.length * c.length);
});

test('a reel never shows the same symbol twice', () => {
  for (const strip of REEL_STRIPS) {
    strip.forEach((s, i) => {
      assert.notEqual(s, strip[(i + 1) % strip.length]);
      assert.notEqual(s, strip[(i + 2) % strip.length]);
    });
  }
});

test('three of the same symbol pays on a line, and rarer symbols pay more', () => {
  for (const [symbol, units] of Object.entries(PAYTABLE.three)) {
    assert.deepEqual(evaluateLine([symbol, symbol, symbol]), { rule: 'three', symbol, units });
  }
  const count = (s) => REEL_STRIPS.flat().filter((x) => x === s).length;
  const symbols = Object.keys(PAYTABLE.three);
  for (const rarer of symbols) {
    for (const commoner of symbols) {
      if (count(rarer) < count(commoner)) {
        assert.ok(PAYTABLE.three[rarer] > PAYTABLE.three[commoner], `${rarer} should pay more than ${commoner}`);
      }
    }
  }
});

test('Wild Gator stands in for any symbol', () => {
  assert.equal(evaluateLine(['wild', 'cool', 'cool']).units, PAYTABLE.three.cool);
  assert.equal(evaluateLine(['diamond', 'wild', 'wild']).units, PAYTABLE.three.diamond);
  assert.equal(evaluateLine(['coin', 'wild', 'coin']).units, PAYTABLE.three.coin);
  assert.equal(evaluateLine(['wild', 'wild', 'wild']).units, PAYTABLE.three.wild);
});

test('three gators of any mix pay a small prize on a line', () => {
  assert.deepEqual(evaluateLine(['queen', 'baby', 'happy']), { rule: 'anyGators', symbol: null, units: PAYTABLE.anyGators });
  assert.equal(evaluateLine(['wild', 'queen', 'cool']).units, PAYTABLE.anyGators);
  assert.equal(evaluateLine(['queen', 'baby', 'melon']), null);
  assert.ok(PAYTABLE.anyGators < LINES.length, 'any three gators should pay less than the wager');
});

test('all five lines pay: three rows and both diagonals', () => {
  assert.equal(LINES.length, 5);
  const three = PAYTABLE.three.baby;
  const cases = [
    [view(QUIET_TOP, ['baby', 'baby', 'baby'], QUIET_BOTTOM), 0],
    [view(['baby', 'baby', 'baby'], ['melon', 'flower', 'diamond'], QUIET_BOTTOM), 1],
    [view(QUIET_TOP, ['flower', 'diamond', 'melon'], ['baby', 'baby', 'baby']), 2],
    [view(['baby', 'flower', 'diamond'], ['melon', 'baby', 'flower'], ['flower', 'diamond', 'baby']), 3],
    [view(['melon', 'flower', 'baby'], ['flower', 'baby', 'melon'], ['baby', 'diamond', 'flower']), 4],
  ];
  for (const [window, line] of cases) {
    const r = evaluate(window);
    assert.deepEqual(r.wins.map((w) => [w.line, w.units]), [[line, three]], `line ${LINES[line].name}`);
    assert.deepEqual(r.wins[0].cells, LINES[line].rows.map((row, reel) => [reel, row]));
  }
});

test('wins on several lines add up', () => {
  const r = evaluate(view(['baby', 'baby', 'baby'], ['melon', 'flower', 'diamond'], ['queen', 'happy', 'cool']));
  assert.deepEqual(r.wins.map((w) => w.line), [1, 2]);
  assert.equal(r.units, PAYTABLE.three.baby + PAYTABLE.anyGators);
});

test('gold coins pay anywhere in view, by how many', () => {
  const one = evaluate(view(['coin', 'flower', 'diamond'], ['melon', 'diamond', 'flower'], QUIET_BOTTOM));
  assert.equal(one.units, 0);
  const two = evaluate(view(['coin', 'flower', 'diamond'], ['melon', 'diamond', 'flower'], ['flower', 'melon', 'coin']));
  assert.deepEqual(two.wins.map((w) => [w.rule, w.units, w.cells]), [['coins', PAYTABLE.coins[2], [[0, 0], [2, 2]]]]);
  const three = evaluate(view(['coin', 'flower', 'diamond'], ['melon', 'coin', 'flower'], ['flower', 'melon', 'coin']));
  assert.equal(three.units, PAYTABLE.coins[3] + PAYTABLE.three.coin, 'three coins on a diagonal also win that line');
});

test('a view with nothing in it loses', () => {
  assert.deepEqual(evaluate(view(QUIET_TOP, ['flower', 'diamond', 'melon'], ['chest', 'melon', 'chest'])), { wins: [], units: 0, multiplier: 0, tier: 'none' });
});

test('wins are tiered as small, normal, or big', () => {
  assert.equal(resultAt([1, 1, 3]).tier, 'small', 'less than the wager back');
  assert.equal(resultAt([1, 4, 3]).tier, 'win');
  assert.equal(resultAt([6, 4, 7]).tier, 'big');
  assert.ok(resultAt([6, 4, 7]).multiplier >= BIG_WIN_AT);
});

test('long-run return, free spins included, is between 94% and 98%', () => {
  assert.ok(stats.returnRate >= 0.94 && stats.returnRate <= 0.98, `return is ${stats.returnRate}`);
  assert.ok(Math.abs(stats.baseReturn + stats.bonusReturn - stats.returnRate) < 1e-12);
});

test('free spins carry a real share of the return, but less than paid spins', () => {
  assert.ok(stats.bonusReturn >= 0.1 && stats.bonusReturn <= 0.25, `bonus return is ${stats.bonusReturn}`);
  assert.ok(stats.baseReturn > stats.bonusReturn);
});

test('a free spin always wins, and every winning position can come up', () => {
  const rng = seededRng(5);
  const seen = new Set();
  for (let i = 0; i < 20000; i++) {
    const r = spinWinning(rng);
    assert.ok(r.units > 0);
    seen.add(r.stops.join());
  }
  const winning = stats.total * stats.hitRate;
  assert.ok(seen.size > winning * 0.5, `saw ${seen.size} of ${winning} winning positions`);
});

test('a bonus pays several times the wager on average', () => {
  assert.equal(stats.bonusAverage, BONUS.freeSpins * stats.freeSpinAverage);
  assert.ok(stats.bonusAverage >= 5 && stats.bonusAverage <= 10, `bonus averages ${stats.bonusAverage}x`);
});

test('the calculated return matches a long simulated session', () => {
  const start = 1e9;
  const wager = 25;
  const session = simulateSession({ rng: seededRng(99), balance: start, wager, spins: 400000 });
  const measured = 1 + (session.balance - start) / (session.played * wager);
  assert.equal(session.bonuses, 400000 / BONUS.spinsToFill);
  assert.ok(Math.abs(measured - stats.returnRate) < 0.015, `measured ${measured}, calculated ${stats.returnRate}`);
});

test('between 45% and 60% of spins pay something', () => {
  assert.ok(stats.hitRate >= 0.45 && stats.hitRate <= 0.6, `hit rate is ${stats.hitRate}`);
});

test('between 15% and 25% of spins pay the wager back or more', () => {
  assert.ok(stats.winRate >= 0.15 && stats.winRate <= 0.25, `win rate is ${stats.winRate}`);
});

test('a big win arrives about once in 40 to 120 spins', () => {
  const oneIn = 1 / stats.bigWinRate;
  assert.ok(oneIn >= 40 && oneIn <= 120, `big win is one in ${oneIn}`);
});

test('small prizes make up most wins but three of a kind carries most of the paid-spin return', () => {
  const rule = (name) => stats.byRule.find((r) => r.rule === name);
  assert.ok(rule('anyGators').perSpin > rule('three').perSpin);
  assert.ok(rule('three').returnShare > 0.5);
});

test('a 1,000 token balance usually survives 100 paid spins at the two lower wagers', () => {
  for (const wager of WAGERS.slice(0, 2)) {
    const { bustRate } = simulateSessions({ seed: 7, sessions: 5000, balance: STARTING_BALANCE, wager, spins: 100 });
    assert.ok(bustRate < 0.25, `bust rate at wager ${wager} is ${bustRate}`);
  }
});

test('the house wins in the end: a long session usually finishes below where it started', () => {
  for (const wager of WAGERS) {
    const { median, aheadRate } = simulateSessions({ seed: 7, sessions: 5000, balance: STARTING_BALANCE, wager, spins: 300 });
    assert.ok(median < STARTING_BALANCE, `median at wager ${wager} is ${median}`);
    assert.ok(aheadRate < 0.5, `ahead rate at wager ${wager} is ${aheadRate}`);
  }
});

test('payout is line bets times the wager, split across the lines', () => {
  for (const wager of WAGERS) {
    assert.equal(wager % LINES.length, 0);
    assert.equal(payoutFor(0, wager), 0);
    assert.equal(payoutFor(LINES.length, wager), wager);
    assert.equal(payoutFor(PAYTABLE.three.cool, wager), (PAYTABLE.three.cool * wager) / LINES.length);
  }
  assert.throws(() => payoutFor(4, 12));
});

test('random spins land on real reel positions and repeat with the same seed', () => {
  const first = seededRng(42);
  const second = seededRng(42);
  for (let i = 0; i < 1000; i++) {
    const r = spin(first);
    r.stops.forEach((stop, reel) => assert.ok(stop >= 0 && stop < REEL_STRIPS[reel].length));
    assert.deepEqual(r, spin(second));
  }
});

test('a stop outside the reel is rejected', () => {
  assert.throws(() => resultAt([0, 0, 99]));
  assert.throws(() => resultAt([0, 0]));
});
