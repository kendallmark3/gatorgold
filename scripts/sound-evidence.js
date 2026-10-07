// Measures every sound and checks the running game plays them at the right
// moments. Start the game with `npm start`, then run `npm run sound-evidence`.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { launchBrowser, sleep } from './lib/browser.js';

const OUT = fileURLToPath(new URL('../features/04-sound/evidence/', import.meta.url));
const { js, open, shot, errors, close } = await launchBrowser(OUT);
const report = {};

// Part 1: render each sound on its own and measure it.
await open();
report.sounds = await js(`(async () => {
  const { createSound } = await import('/src/ui/sound.js');
  const RATE = 44100;
  const SECONDS = 4;
  const plays = {
    press: (s) => s.press(),
    tick: (s) => s.tick(),
    reelsRolling: (s) => s.reelsStart(),
    reelStop1: (s) => s.reelStop(0),
    reelStop2: (s) => s.reelStop(1),
    reelStop3: (s) => s.reelStop(2),
    build: (s) => s.buildStart(1.5),
    smallWin: (s) => s.smallWin(),
    win: (s) => s.win(),
    bigWin: (s) => s.bigWin(),
    refill: (s) => s.refill(),
    bonus: (s) => s.bonus(),
    mutedBigWin: (s) => { s.setMuted(true); s.bigWin(); },
  };
  const out = {};
  for (const [name, play] of Object.entries(plays)) {
    const context = new OfflineAudioContext(1, RATE * SECONDS, RATE);
    play(createSound({ context }));
    const data = (await context.startRendering()).getChannelData(0);
    let peak = 0, sum = 0, last = -1;
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
      sum += v * v;
      if (v > 0.003) last = i;
    }
    out[name] = { peak: Number(peak.toFixed(3)), rms: Number(Math.sqrt(sum / data.length).toFixed(4)), seconds: Number(((last + 1) / RATE).toFixed(2)) };
  }
  return out;
})()`);

// Part 2: count the sounds the game starts during real spins.
const counted = `
  window.__starts = [];
  const original = AudioScheduledSourceNode.prototype.start;
  AudioScheduledSourceNode.prototype.start = function (...args) {
    window.__starts.push(Math.round(performance.now()));
    return original.apply(this, args);
  };`;
const settle = async () => {
  for (let i = 0; i < 400; i++) {
    await sleep(50);
    if (!(await js(`document.getElementById('spin').disabled`))) return;
  }
  throw new Error('spin never finished');
};
// Spins once and returns how many sound sources started in each part of the spin.
const spinAndCount = async () => {
  await js(`window.__starts.length = 0; window.__t0 = Math.round(performance.now()); document.getElementById('spin').click()`);
  await settle();
  await sleep(300);
  return js(`(() => {
    const at = window.__starts.map((t) => t - window.__t0);
    const between = (a, b) => at.filter((t) => t >= a && t < b).length;
    return { atPress: between(0, 200), whileRolling: between(200, 2050), afterLastStop: at.filter((t) => t >= 2050).length, total: at.length };
  })()`);
};

report.inGame = {};
for (const [name, stops] of Object.entries({ loss: '0,2,3', smallWin: '1,1,3', win: '1,4,3', bigWin: '6,4,7', nearMiss: '16,20,0' })) {
  await open(`?stops=${stops}`);
  await js(counted);
  report.inGame[name] = await spinAndCount();
}

// Part 3: the sound control.
await open('?stops=1,4,3');
await js(counted);
await shot('01-sound-on');
const before = await js(`({ label: document.getElementById('mute').getAttribute('aria-label'), pressed: document.getElementById('mute').getAttribute('aria-pressed') })`);
await js(`document.getElementById('mute').click()`);
await sleep(100);
await shot('02-sound-off');
const off = await js(`({ label: document.getElementById('mute').getAttribute('aria-label'), pressed: document.getElementById('mute').getAttribute('aria-pressed'), stored: localStorage.getItem('gatorgold.muted') })`);
const mutedSpin = await spinAndCount();
const mutedState = await js(`({ balance: document.getElementById('balance').textContent, win: document.getElementById('winAmount').textContent })`);
await open('?stops=1,4,3');
const afterReload = await js(`document.getElementById('mute').getAttribute('aria-label')`);
await js(`document.getElementById('mute').click()`);
const backOn = await js(`({ label: document.getElementById('mute').getAttribute('aria-label'), stored: localStorage.getItem('gatorgold.muted') })`);
report.control = { before, off, mutedSpin, mutedState, afterReload, backOn };

// Part 4: a browser with no sound support.
await open('?stops=1,4,3');
await js(`delete window.AudioContext; delete window.webkitAudioContext; document.getElementById('spin').click()`);
await settle();
report.noSoundSupport = await js(`({ balance: document.getElementById('balance').textContent, win: document.getElementById('winAmount').textContent, title: document.getElementById('winTitle').textContent })`);

report.pageErrors = errors;
writeFileSync(join(OUT, 'results.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 1));
close();
