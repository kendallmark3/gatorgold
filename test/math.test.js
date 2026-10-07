import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYMBOLS, REEL_STRIPS, PAYTABLE, BIG_WIN_AT, WAGERS, STARTING_BALANCE } from '../src/math/config.js';
import { evaluate, resultAt, spin, payoutFor } from '../src/math/engine.js';
import { exactStats, seededRng, simulateSessions } from '../src/math/analysis.js';

const stats = exactStats();

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
        assert.deepEqual(r.line, r.window.map((column) => column[1]));
        assert.ok(Number.isInteger(r.multiplier) && r.multiplier >= 0);
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

test('three of the same symbol pays, and rarer symbols pay more', () => {
  for (const [symbol, multiplier] of Object.entries(PAYTABLE.three)) {
    assert.equal(evaluate([symbol, symbol, symbol]).multiplier, multiplier);
  }
  const count = (s) => REEL_STRIPS.flat().filter((x) => x === s).length;
  const byRarity = Object.keys(PAYTABLE.three).sort((x, y) => count(x) - count(y));
  for (let i = 1; i < byRarity.length; i++) {
    const rarer = byRarity[i - 1];
    const commoner = byRarity[i];
    if (count(rarer) < count(commoner)) {
      assert.ok(PAYTABLE.three[rarer] > PAYTABLE.three[commoner], `${rarer} should pay more than ${commoner}`);
    }
  }
});

test('Wild Gator stands in for any symbol', () => {
  assert.equal(evaluate(['wild', 'cool', 'cool']).multiplier, PAYTABLE.three.cool);
  assert.equal(evaluate(['diamond', 'wild', 'wild']).multiplier, PAYTABLE.three.diamond);
  assert.equal(evaluate(['coin', 'wild', 'coin']).multiplier, PAYTABLE.three.coin);
  assert.equal(evaluate(['wild', 'wild', 'wild']).multiplier, PAYTABLE.three.wild);
});

test('three gators of any mix pay a small prize', () => {
  assert.deepEqual(evaluate(['queen', 'baby', 'happy']), { multiplier: PAYTABLE.anyGators, rule: 'anyGators', symbol: null, tier: 'win' });
  assert.equal(evaluate(['wild', 'queen', 'cool']).multiplier, PAYTABLE.anyGators);
  assert.equal(evaluate(['queen', 'baby', 'melon']).multiplier, 0);
});

test('gold coins on the line pay by how many', () => {
  assert.equal(evaluate(['coin', 'melon', 'flower']).multiplier, PAYTABLE.coins[1]);
  assert.equal(evaluate(['coin', 'melon', 'coin']).multiplier, PAYTABLE.coins[2]);
});

test('a line with nothing on it loses', () => {
  assert.deepEqual(evaluate(['melon', 'flower', 'diamond']), { multiplier: 0, rule: null, symbol: null, tier: 'none' });
});

test('wins are tiered as normal or big', () => {
  assert.equal(evaluate(['flower', 'flower', 'flower']).tier, 'win');
  assert.equal(evaluate(['queen', 'queen', 'queen']).tier, 'big');
  assert.equal(evaluate(['diamond', 'diamond', 'diamond']).tier, PAYTABLE.three.diamond >= BIG_WIN_AT ? 'big' : 'win');
});

test('long-run return is between 95% and 98%', () => {
  assert.ok(stats.returnRate >= 0.95 && stats.returnRate <= 0.98, `return is ${stats.returnRate}`);
});

test('between 30% and 38% of spins pay something', () => {
  assert.ok(stats.hitRate >= 0.3 && stats.hitRate <= 0.38, `hit rate is ${stats.hitRate}`);
});

test('a big win arrives about once in 80 to 200 spins', () => {
  const oneIn = 1 / stats.bigWinRate;
  assert.ok(oneIn >= 80 && oneIn <= 200, `big win is one in ${oneIn}`);
});

test('a 1,000 token balance usually survives 100 spins at any wager', () => {
  for (const wager of WAGERS) {
    const { bustRate } = simulateSessions({ seed: 7, sessions: 5000, balance: STARTING_BALANCE, wager, spins: 100 });
    assert.ok(bustRate < 0.5, `bust rate at wager ${wager} is ${bustRate}`);
  }
});

test('payout is the multiple times the wager', () => {
  for (const wager of WAGERS) {
    assert.equal(payoutFor(0, wager), 0);
    assert.equal(payoutFor(PAYTABLE.three.cool, wager), PAYTABLE.three.cool * wager);
  }
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
