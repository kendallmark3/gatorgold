import { REEL_STRIPS } from './config.js';
import { resultAt, spin, payoutFor } from './engine.js';

// Exact figures from every possible combination of reel stops.
export function exactStats() {
  const [a, b, c] = REEL_STRIPS;
  let total = 0;
  let returned = 0;
  let hits = 0;
  let big = 0;
  const byMultiplier = new Map();

  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      for (let k = 0; k < c.length; k++) {
        const { multiplier, tier } = resultAt([i, j, k]);
        total += 1;
        returned += multiplier;
        if (multiplier > 0) hits += 1;
        if (tier === 'big') big += 1;
        byMultiplier.set(multiplier, (byMultiplier.get(multiplier) ?? 0) + 1);
      }
    }
  }

  return {
    total,
    returnRate: returned / total,
    hitRate: hits / total,
    bigWinRate: big / total,
    byMultiplier: [...byMultiplier.entries()]
      .sort(([x], [y]) => x - y)
      .map(([multiplier, count]) => ({ multiplier, count, share: count / total })),
  };
}

// A repeatable random source, so simulated sessions give the same numbers on every run.
export function seededRng(seed) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Plays one session at a fixed wager until the spins run out or the balance
// cannot cover the wager.
export function simulateSession({ rng, balance, wager, spins }) {
  let played = 0;
  while (played < spins && balance >= wager) {
    balance += payoutFor(spin(rng).multiplier, wager) - wager;
    played += 1;
  }
  return { balance, played, bust: balance < wager };
}

export function simulateSessions({ seed, sessions, balance, wager, spins }) {
  const rng = seededRng(seed);
  const endings = [];
  let busts = 0;
  for (let s = 0; s < sessions; s++) {
    const result = simulateSession({ rng, balance, wager, spins });
    endings.push(result.balance);
    if (result.bust) busts += 1;
  }
  endings.sort((x, y) => x - y);
  const at = (p) => endings[Math.min(endings.length - 1, Math.floor(p * endings.length))];
  return {
    bustRate: busts / sessions,
    aheadRate: endings.filter((b) => b > balance).length / sessions,
    low: at(0.1),
    median: at(0.5),
    high: at(0.9),
  };
}
