// Plays the running game in headless Chrome and captures evidence for feature 2:
// screenshots plus results.json. Start the game first with `npm start`, then run
// `npm run evidence`. Set CHROME to the browser binary if it is not in the default
// macOS location.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = fileURLToPath(new URL('../features/02-machine/evidence/', import.meta.url));
const BASE = `http://localhost:${process.env.PORT || 4747}/`;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(OUT, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-pipe', '--no-first-run', '--hide-scrollbars',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'gg-'))}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });

let nextId = 1;
const pending = new Map();
const errors = [];
let buffer = '';
chrome.stdio[4].on('data', (chunk) => {
  buffer += chunk.toString();
  let end;
  while ((end = buffer.indexOf('\0')) >= 0) {
    const msg = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push(msg.params.entry.text + ' ' + (msg.params.entry.url ?? ''));
    }
  }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0');
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const cdp = (m, p) => send(m, p, sessionId);
await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Log.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

const js = async (expression) => {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const open = async (query = '') => {
  await cdp('Page.navigate', { url: BASE + query });
  await sleep(900);
};
const shot = async (name) => {
  const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
};
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
  line: [...document.querySelectorAll('.reel')].map((r) => r.querySelectorAll('.sym')[1]?.dataset.symbol),
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
  '02-loss': '0,1,1',
  '03-coin': '0,0,1',
  '04-three-gators': '1,1,3',
  '05-three-baby': '1,4,3',
  '07-near-miss': '16,20,1',
};
for (const [name, stops] of Object.entries(cases)) {
  await open(`?stops=${stops}`);
  const stopTimes = await timedSpin();
  await settle();
  await sleep(450);
  await shot(name);
  report[name] = { stops, stopTimes, ...(await state()) };
}

// Mid-spin frame.
await open('?stops=1,1,3');
await click('spin');
await sleep(650);
await shot('08-mid-spin');
await settle();

// Big win: catch the celebration, then the settled screen.
await open('?stops=5,3,14');
await click('wagerUp');
const bigTimes = await timedSpin();
await sleep(1500);
await shot('06-big-win');
const during = await state();
await settle();
await sleep(300);
await shot('06-big-win-after');
report['06-big-win'] = { stops: '5,3,14', stopTimes: bigTimes, celebrationShowing: during.bigwin, ...(await state()) };

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
await shot('09-pays');
report.paysRows = await js(`document.querySelectorAll('.pays-row').length`);
await js(`document.getElementById('pays').close()`);

// Random play: check the balance after every spin.
await open('?speed=8');
let prev = (await state()).balance;
let mismatches = 0, winsSeen = 0, spins = 0;
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
  if (after.balance !== prev - before.wager + after.win) mismatches++;
  if ((after.win > 0) !== (after.lit > 0)) mismatches++;
  prev = after.balance;
}
report.randomPlay = { spins, winsSeen, mismatches, endBalance: prev };

// Run out of tokens, then refill.
await open('?stops=0,1,1&speed=10');
await click('wagerUp');
let guard = 0;
while ((await state()).spin === 'SPIN' && guard++ < 60) { await click('spin'); await settle(); }
await sleep(200);
await shot('10-out-of-tokens');
const broke = await state();
await click('spin');
await sleep(900);
report.refill = { spinsToEmpty: guard, atEmpty: { balance: broke.balance, spin: broke.spin, bubble: broke.bubble }, afterRefill: await state() };

report.pageErrors = errors;
writeFileSync(join(OUT, 'results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Wrote screenshots and results.json to ${OUT}`);
console.log(JSON.stringify({ randomPlay: report.randomPlay, pageErrors: report.pageErrors }));
chrome.kill();
process.exit(0);
