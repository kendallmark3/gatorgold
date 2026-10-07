// Prints the measured behavior of the slot math. Run with `npm run report`.
import { SYMBOLS, REEL_STRIPS, PAYTABLE, BIG_WIN_AT, WAGERS, STARTING_BALANCE } from '../src/math/config.js';
import { exactStats, simulateSessions } from '../src/math/analysis.js';

const pct = (x, digits = 2) => `${(x * 100).toFixed(digits)}%`;
const stats = exactStats();

console.log('## Exact figures\n');
console.log(`From all ${stats.total.toLocaleString('en-US')} reel positions.\n`);
console.log('| Measure | Value |');
console.log('| --- | --- |');
console.log(`| Return to player | ${pct(stats.returnRate)} |`);
console.log(`| Spins that pay | ${pct(stats.hitRate)} (one in ${(1 / stats.hitRate).toFixed(1)}) |`);
console.log(`| Big wins (${BIG_WIN_AT}x or more) | ${pct(stats.bigWinRate)} (one in ${Math.round(1 / stats.bigWinRate)}) |`);

console.log('\n## Payout table\n');
console.log('| Win line | Pays | Symbols per reel |');
console.log('| --- | --- | --- |');
for (const [symbol, multiplier] of Object.entries(PAYTABLE.three)) {
  const counts = REEL_STRIPS.map((strip) => strip.filter((s) => s === symbol).length).join(', ');
  console.log(`| 3 x ${SYMBOLS[symbol].name} | ${multiplier}x | ${counts} |`);
}
console.log(`| Any 3 gators | ${PAYTABLE.anyGators}x | |`);
console.log(`| 2 gold coins | ${PAYTABLE.coins[2]}x | |`);
console.log(`| 1 gold coin | ${PAYTABLE.coins[1]}x | |`);

console.log('\n## How often each prize lands\n');
console.log('| Prize | Share of spins | About one in |');
console.log('| --- | --- | --- |');
for (const { multiplier, share } of stats.byMultiplier) {
  const label = multiplier === 0 ? 'Nothing' : `${multiplier}x`;
  console.log(`| ${label} | ${pct(share, 3)} | ${(1 / share).toFixed(1)} |`);
}

console.log('\n## Simulated sessions\n');
console.log(`5,000 sessions per row, each starting with ${STARTING_BALANCE.toLocaleString('en-US')} tokens.\n`);
console.log('| Wager | Spins | Ran out | Ended ahead | Low (10th pct) | Median | High (90th pct) |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const wager of WAGERS) {
  for (const spins of [100, 300]) {
    const r = simulateSessions({ seed: 7, sessions: 5000, balance: STARTING_BALANCE, wager, spins });
    console.log(`| ${wager} | ${spins} | ${pct(r.bustRate, 1)} | ${pct(r.aheadRate, 1)} | ${r.low} | ${r.median} | ${r.high} |`);
  }
}
