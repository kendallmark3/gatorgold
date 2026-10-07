// Plays the running game in headless Chrome and captures evidence for the
// newest feature that changed the screen (feature 6):
// screenshots plus results.json. Start the game first with `npm start`, then run
// `npm run evidence`. Set CHROME to the browser binary if it is not in the default
// macOS location.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { launchBrowser, sleep } from './lib/browser.js';

const OUT = fileURLToPath(new URL('../features/06-fill-the-screen/evidence/', import.meta.url));
const { js, open, shot, cdp, errors, close } = await launchBrowser(OUT);

const state = () => js(`({
  balance: Number(document.getElementById('balance').textContent.replace(/,/g, '')),
  wager: Number(document.getElementById('wager').textContent),
  title: document.getElementById('winTitle').textContent,
  detail: document.getElementById('winDetail').textContent,
  win: document.getElementById('winAmountWrap').hidden ? 0 : Number(document.getElementById('winAmount').textContent.replace(/[+,]/g, '')),
  bubble: document.getElementById('bubble').textContent,
  spin: document.getElementById('spin').textContent,
  spinDisabled: document.getElementById('spin').disabled,
  lit: [...document.querySelectorAll('.cell.win')].length,
  linesDrawn: document.querySelectorAll('#lines .glow').length,
  view: [...document.querySelectorAll('.reel')].map((r) => [...r.querySelectorAll('.sym')].slice(0, 3).map((x) => x.dataset.symbol)),
  bigwin: !document.getElementById('bigwin').hidden,
})`);
const click = (id) => js(`document.getElementById('${id}').click()`);
const settle = async () => {
  for (let i = 0; i < 400; i++) {
    await sleep(50);
    if (!(await js(`document.getElementById('spin').disabled`))) return;
  }
  throw new Error('spin never finished');
};
// Clicks SPIN and reports when each reel came to rest, in ms.
const timedSpin = () => js(`new Promise((resolve) => {
  const reels = [...document.querySelectorAll('.reel .strip')];
  const stopped = [null, null, null];
  const t0 = performance.now();
  document.getElementById('spin').click();
  const timer = setInterval(() => {
    reels.forEach((r, i) => { if (stopped[i] === null && r.children.length === 3) stopped[i] = Math.round(performance.now() - t0); });
    if (stopped.every((s) => s !== null)) { clearInterval(timer); resolve(stopped); }
  }, 10);
})`);

const report = {};

await open();
await shot('01-at-rest');
report.atRest = await state();

const cases = {
  '02-loss': '0,2,3',
  '03-two-coins': '0,0,3',
  '04-gator-line': '1,1,3',
  '05-diagonal-gators': '2,1,2',
  '06-three-baby': '1,4,3',
  '07-several-lines': '0,0,24',
  '09-near-miss': '16,20,0',
};
for (const [name, stops] of Object.entries(cases)) {
  await open(`?stops=${stops}`);
  const stopTimes = await timedSpin();
  await settle();
  await sleep(450);
  await shot(name);
  report[name] = { stops, stopTimes, ...(await state()) };
}

// Big win: catch the celebration, then the settled screen.
await open('?stops=6,4,7');
const bigTimes = await timedSpin();
await sleep(1500);
await shot('08-big-win');
const during = await state();
await settle();
await sleep(300);
await shot('08-big-win-after');
report['08-big-win'] = { stops: '6,4,7', stopTimes: bigTimes, celebrationShowing: during.bigwin, ...(await state()) };

// Wager control.
await open();
const wagers = [];
for (const id of ['wagerUp', 'wagerUp', 'wagerDown', 'wagerDown', 'wagerDown']) {
  await click(id);
  wagers.push(await js(`[Number(document.getElementById('wager').textContent), document.getElementById('wagerDown').disabled, document.getElementById('wagerUp').disabled]`));
}
report.wagerSteps = wagers;

// Payout table.
await click('paysOpen');
await sleep(300);
await shot('10-pays');
report.paysRows = await js(`document.querySelectorAll('.pays-row').length`);
await js(`document.getElementById('pays').close()`);

// Random play: check the balance after every spin.
await open('?speed=8');
let prev = (await state()).balance;
let mismatches = 0, winsSeen = 0, smallWins = 0, spins = 0;
for (let i = 0; i < 60; i++) {
  if (i === 20) await click('wagerUp');
  if (i === 40) { await click('wagerDown'); await click('wagerDown'); }
  const before = await state();
  if (before.spin === 'REFILL') { await click('spin'); await settle(); prev = (await state()).balance; continue; }
  await click('spin');
  await settle();
  await sleep(60);
  const after = await state();
  spins++;
  if (after.win > 0) winsSeen++;
  if (after.win > 0 && after.win < before.wager) smallWins++;
  if (after.balance !== prev - before.wager + after.win) mismatches++;
  if ((after.win > 0) !== (after.lit > 0)) mismatches++;
  prev = after.balance;
}
report.randomPlay = { spins, winsSeen, smallWins, mismatches, endBalance: prev };

// Run out of tokens, then refill.
await open('?stops=0,2,3&speed=10');
await click('wagerUp');
let guard = 0;
while ((await state()).spin === 'SPIN' && guard++ < 60) { await click('spin'); await settle(); }
await sleep(200);
await shot('11-out-of-tokens');
const broke = await state();
await click('spin');
await sleep(900);
report.refill = { spinsToEmpty: guard, atEmpty: { balance: broke.balance, spin: broke.spin, bubble: broke.bubble }, afterRefill: await state() };

// First look: layout, motion at rest, the top prize, the idle invitation.
await open();
const boxes = await js(`[...document.querySelectorAll('.topbar, .logo, .mascot-row, .cabinet, .win-panel, .controls')].map((e) => {
  const r = e.getBoundingClientRect();
  return { part: e.className.split(' ')[0], top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
})`);
const running = () => js(`document.getAnimations().filter((a) => a.playState === 'running').length`);
const prizes = [];
for (const id of ['wagerDown', 'wagerUp', 'wagerUp']) {
  await js(`document.getElementById('${id}').click()`);
  prizes.push(await js(`[Number(document.getElementById('wager').textContent), document.getElementById('topPrize').textContent]`));
}
const firstLine = await js(`document.getElementById('bubble').textContent`);
const movingAtRest = await running();
await sleep(8600);
const idleLine = await js(`document.getElementById('bubble').textContent`);
report.firstLook = {
  boxes,
  logoLabel: await js(`document.querySelector('.logo svg').getAttribute('aria-label')`),
  tabIcon: await js(`fetch(document.querySelector('link[rel=icon]').href).then((r) => r.status + ' ' + r.headers.get('content-type'))`),
  movingAtRest,
  topPrizeByWager: prizes,
  firstLine,
  idleLine,
};

// Reduced motion: nothing moves at rest, and a spin still completes.
await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await open('?stops=1,4,3');
const movingReduced = await running();
await js(`document.getElementById('spin').click()`);
await settle();
report.reducedMotion = { movingAtRest: movingReduced, afterSpin: await state() };
await cdp('Emulation.setEmulatedMedia', { features: [] });

// Screen sizes: the machine must be fully on screen, keep its shape, and not
// be covered by the scenery.
const sizes = {
  '12-phone-small': [375, 667],
  '13-phone': [390, 844],
  '14-phone-tall': [412, 915],
  '15-tablet-upright': [820, 1180],
  '16-tablet-sideways': [1180, 820],
  '17-laptop': [1440, 900],
};
report.sizes = {};
for (const [name, [width, height]] of Object.entries(sizes)) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 1000 });
  await open();
  await sleep(300);
  await shot(name);
  report.sizes[name] = await js(`(() => {
    const box = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const game = box(document.getElementById('game'));
    const sides = [...document.querySelectorAll('.side')].filter((e) => getComputedStyle(e).display !== 'none').map(box);
    const spin = box(document.getElementById('spin'));
    return {
      screen: [innerWidth, innerHeight],
      machine: [Math.round(game.width), Math.round(game.height)],
      fullyOnScreen: game.left >= -0.5 && game.top >= -0.5 && game.right <= innerWidth + 0.5 && game.bottom <= innerHeight + 0.5,
      shapeKept: Math.abs(game.width / game.height - 390 / 844) < 0.002,
      fillsOneDimension: Math.abs(game.width - innerWidth) < 1 || innerHeight - game.height <= 25,
      sceneryShown: sides.length,
      sceneryClearOfMachine: sides.every((s) => s.right <= game.left || s.left >= game.right),
      sceneryOnScreen: sides.every((s) => s.left >= 0 && s.right <= innerWidth && s.bottom <= innerHeight && s.top >= 0),
      spinButton: Math.round(spin.width),
      logoText: document.querySelector('.logo text').textContent,
    };
  })()`);
}

// Reduced motion with the scenery showing.
await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await open();
report.reducedMotionLaptop = { movingAtRest: await running() };
await cdp('Emulation.setEmulatedMedia', { features: [] });
await open();
report.laptopMovingAtRest = await running();

report.pageErrors = errors;
writeFileSync(join(OUT, 'results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Wrote screenshots and results.json to ${OUT}`);
console.log(JSON.stringify({ randomPlay: report.randomPlay, pageErrors: report.pageErrors }));
close();
