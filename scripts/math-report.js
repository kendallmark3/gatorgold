// Prints the measured behavior of the slot math. Run with `npm run report`.
import { SYMBOLS, REEL_STRIPS, LINES, PAYTABLE, BIG_WIN_AT, WAGERS, STARTING_BALANCE } from '../src/math/config.js';
import { exactStats, simulateSessions } from '../src/math/analysis.js';

const pct = (x, digits = 2) => `${(x * 100).toFixed(digits)}%`;
const times = (units) => `${units / LINES.length}x`;
const stats = exactStats();

console.log('## Exact figures\n');
console.log(`From all ${stats.total.toLocaleString('en-US')} reel positions, with ${LINES.length} lines in play.\n`);
console.log('| Measure | Value |');
console.log('| --- | --- |');
console.log(`| Return to player | ${pct(stats.returnRate)} |`);
console.log(`| Spins that pay anything | ${pct(stats.hitRate)} (one in ${(1 / stats.hitRate).toFixed(1)}) |`);
console.log(`| Spins that pay the wager back or more | ${pct(stats.winRate)} (one in ${(1 / stats.winRate).toFixed(1)}) |`);
console.log(`| Big wins (${BIG_WIN_AT}x the wager or more) | ${pct(stats.bigWinRate)} (one in ${Math.round(1 / stats.bigWinRate)}) |`);

console.log('\n## Payout table\n');
console.log('Prizes as a multiple of the wager.\n');
console.log('| Prize | Pays | Symbols per reel |');
console.log('| --- | --- | --- |');
for (const [symbol, units] of Object.entries(PAYTABLE.three)) {
  const counts = REEL_STRIPS.map((strip) => strip.filter((s) => s === symbol).length).join(', ');
  console.log(`| 3 x ${SYMBOLS[symbol].name} on a line | ${times(units)} | ${counts} |`);
}
console.log(`| Any 3 gators on a line | ${times(PAYTABLE.anyGators)} | |`);
console.log(`| 3 gold coins anywhere | ${times(PAYTABLE.coins[3])} | |`);
console.log(`| 2 gold coins anywhere | ${times(PAYTABLE.coins[2])} | |`);

const ruleNames = { three: 'Three of a kind on a line', anyGators: 'Any 3 gators on a line', coins: 'Gold coins anywhere' };
console.log('\n## Where the wins come from\n');
console.log('| Kind of prize | Prizes per 100 spins | Share of all tokens returned |');
console.log('| --- | --- | --- |');
for (const { rule, perSpin, returnShare } of [...stats.byRule].sort((x, y) => y.perSpin - x.perSpin)) {
  console.log(`| ${ruleNames[rule]} | ${(perSpin * 100).toFixed(1)} | ${pct(returnShare, 1)} |`);
}

const bands = [
  ['Nothing', (m) => m === 0],
  ['Less than the wager', (m) => m > 0 && m < 1],
  ['1x to under 3x', (m) => m >= 1 && m < 3],
  ['3x to under 10x', (m) => m >= 3 && m < BIG_WIN_AT],
  [`${BIG_WIN_AT}x to under 30x`, (m) => m >= BIG_WIN_AT && m < 30],
  ['30x or more', (m) => m >= 30],
];
console.log('\n## How big each spin pays\n');
console.log('| Spin pays | Share of spins | About one in |');
console.log('| --- | --- | --- |');
for (const [label, inBand] of bands) {
  const share = stats.byMultiplier.filter(({ multiplier }) => inBand(multiplier)).reduce((sum, b) => sum + b.share, 0);
  console.log(`| ${label} | ${pct(share)} | ${(1 / share).toFixed(1)} |`);
}
const top = stats.byMultiplier[stats.byMultiplier.length - 1];
console.log(`\nThe largest possible spin pays ${top.multiplier}x the wager.`);

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
