import { REEL_STRIPS, SYMBOLS, LINES, PAYTABLE, BONUS, BIG_WIN_AT, WAGERS, WILD, COIN } from '../math/config.js';
import { resultAt, payoutFor } from '../math/engine.js';
import { createGame } from '../game/state.js';
import { createReel, symbolSvg } from './reels.js';
import { createSound } from './sound.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const format = (n) => n.toLocaleString('en-US');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const params = new URLSearchParams(location.search);
// For evidence: `?stops=5,3,14` makes every spin land on those reel positions,
// `&autospin=1` spins once on load, `&speed=4` runs the reels faster, and
// `&meter=39` starts with the free-spins meter that far filled.
const forcedStops = params.has('stops') ? params.get('stops').split(',').map(Number) : null;
const speed = Number(params.get('speed')) || 1;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const STOP_TIMES = [1100, 1600, 2100];
const SUSPENSE = 1500;
const BIG_WIN_SHOW = 2800;
const IDLE_DETAIL = `${LINES.length} lines pay on every spin`;
const IDLE_AFTER = 8000;
const TOP_PRIZE = Math.max(...Object.values(PAYTABLE.three));

// One colour per win line, in the order of LINES.
const LINE_COLORS = ['#ffd54a', '#ff7ab8', '#5fd6ff', '#ff9a4d', '#c4f25a'];
// Cell centres inside the reel window, matching the layout in styles.css.
const CELL_X = [59, 167, 275];
const CELL_Y = [55, 149, 243];

const startMeter = Math.min(Number(params.get('meter')) || 0, BONUS.spinsToFill - 1);
const game = createGame({ bonusProgress: Object.fromEntries(WAGERS.map((w) => [w, startMeter])) });

// The sound choice is kept in the browser. Storage can be unavailable, in
// which case sound just starts on each time.
const MUTED_KEY = 'gatorgold.muted';
function storedMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
}
const sound = createSound({ muted: storedMuted() });
let busy = false;
let shownBalance = game.balance;

// Start on a losing position so the machine does not open on a win.
function quietStops() {
  for (;;) {
    const stops = REEL_STRIPS.map((strip) => Math.floor(Math.random() * strip.length));
    if (resultAt(stops).units === 0) return stops;
  }
}
const opening = quietStops();
const reels = [...document.querySelectorAll('.reel')].map((el, i) => createReel(el, REEL_STRIPS[i], opening[i]));

// Sizes the machine to the window and works out how much room is left at the
// sides for scenery.
function fit() {
  const root = document.documentElement;
  const byWidth = innerWidth / 390;
  const byHeight = innerHeight / 844;
  let scale = Math.min(byWidth, byHeight);
  // With room to spare at the sides, pull in a little so the gold rim shows.
  if (byHeight < byWidth && innerWidth - 390 * byHeight > 160) scale = (innerHeight - 24) / 844;
  const space = (innerWidth - 390 * scale) / 2;
  // The side art is 300 x 620, so its width is also limited by the height.
  const side = Math.max(0, Math.min(space - 28, innerHeight * 0.44, 340));
  root.style.setProperty('--scale', scale);
  root.style.setProperty('--side', `${side}px`);
  root.style.setProperty('--side-inset', `${(space - side) / 2}px`);
  root.classList.toggle('wide', side >= 96);
  // The countdown badge needs a wider margin, and clear sky above the side art.
  root.classList.toggle('roomy', side >= 200 && innerHeight - side * (620 / 300) - innerHeight * 0.03 > innerHeight * 0.12);
}
addEventListener('resize', fit);
fit();

function say(text) {
  $('bubble').textContent = text;
}

function countTo(el, from, to, ms, prefix = '') {
  if (from === to || reducedMotion) {
    el.textContent = prefix + format(to);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const started = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - started) / ms);
      el.textContent = prefix + format(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function showBalance(value, ms = 0) {
  const from = shownBalance;
  shownBalance = value;
  return countTo($('balance'), from, value, ms);
}

function updateControls() {
  $('wager').textContent = game.wager;
  $('topPrize').textContent = format(payoutFor(TOP_PRIZE, game.wager));
  $('wagerDown').disabled = busy || !game.canStepWager(-1);
  $('wagerUp').disabled = busy || !game.canStepWager(1);
  $('paysOpen').disabled = busy;
  const spin = $('spin');
  const refill = game.needsRefill;
  spin.textContent = refill ? 'REFILL' : 'SPIN';
  spin.classList.toggle('small-label', refill);
  spin.disabled = busy;
  spin.classList.toggle('ready', !busy);
  showMeter();
}

// The free-spins meter on the machine, mirrored on the badge in the scenery.
function showMeter(text) {
  const left = BONUS.spinsToFill - game.bonusProgress;
  const meter = $('meter');
  meter.setAttribute('aria-valuenow', game.bonusProgress);
  meter.classList.toggle('hot', left <= 5);
  $('meterFill').style.width = `${(game.bonusProgress / BONUS.spinsToFill) * 100}%`;
  $('meterCount').textContent = text ?? `${left} ${left === 1 ? 'spin' : 'spins'} to go`;
  $('badgeCount').textContent = text ? 'NOW!' : left;
  $('badgeLabel').textContent = text ? '' : 'TO GO';
}

// When nobody has touched the game for a while, the gator invites a spin.
let idleTimer = null;
function idleLines() {
  const top = `${TOP_PRIZE / LINES.length}x`;
  return ['Tap SPIN to play!', 'The gators feel lucky...', `Three Wild Gators pays ${top}!`, `Fill the meter for ${BONUS.freeSpins} free spins!`, `${LINES.length} lines. One big red button.`];
}
function restartIdle() {
  clearInterval(idleTimer);
  let next = 1;
  idleTimer = setInterval(() => {
    if (busy || $('pays').open || game.needsRefill) return;
    const lines = idleLines();
    say(lines[next++ % lines.length]);
  }, IDLE_AFTER);
}

function polyline(points, className, color) {
  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('points', points.map(([reel, row]) => `${CELL_X[reel]},${CELL_Y[row]}`).join(' '));
  line.setAttribute('class', className);
  if (color) line.setAttribute('stroke', color);
  return line;
}

function clearWin() {
  $('game').classList.remove('won');
  $('reelWindow').classList.remove('won');
  $('lines').replaceChildren();
  $('winPanel').classList.remove('on');
  $('winAmountWrap').hidden = true;
  $('mascot').classList.remove('hop', 'peek');
  for (const reel of reels) {
    reel.el.classList.remove('waiting');
    for (const c of reel.cells) c.classList.remove('win');
  }
}

// The words for a result: the panel detail and what the gator says.
function describe(result) {
  const lineWins = result.wins.filter((w) => w.line !== null);
  const coins = result.wins.find((w) => w.rule === 'coins');
  const best = result.wins.reduce((a, b) => (b.units > a.units ? b : a));

  let detail;
  if (result.wins.length === 1) {
    if (best.rule === 'three') detail = `3 x ${SYMBOLS[best.symbol].name}`;
    else if (best.rule === 'anyGators') detail = 'Any 3 gators';
    else detail = `${best.cells.length} gold coins`;
  } else {
    detail = [lineWins.length > 0 && `${lineWins.length} ${lineWins.length === 1 ? 'line' : 'lines'}`, coins && 'coins'].filter(Boolean).join(' + ');
  }

  let line;
  if (result.tier === 'small') {
    line = pick(['A little something back.', 'Small bite. Keep going!', 'A snack for the gators.', 'Something is better than nothing!']);
  } else if (best.rule === 'three') {
    const name = SYMBOLS[best.symbol].name;
    line = result.tier === 'big' ? `Three ${name}s! Somebody call Mark!` : `Three ${name}s! Chomp!`;
  } else if (best.rule === 'coins') {
    line = 'Gold everywhere! Nice one.';
  } else {
    line = 'Gator party! That pays.';
  }
  return { detail, line };
}

// A full-screen banner over the machine with a shower of coins. `amount`
// counts up from zero when given.
async function banner({ title, sub = '', amount = null, ms = BIG_WIN_SHOW }) {
  const coins = $('bigwinCoins');
  coins.replaceChildren(
    ...Array.from({ length: 26 }, () => {
      const coin = symbolSvg(COIN);
      const size = 22 + Math.random() * 26;
      coin.classList.add('rain');
      coin.style.cssText = `left:${Math.random() * 360}px;width:${size}px;height:${size}px;animation-duration:${1.1 + Math.random() * 1.2}s;animation-delay:${-Math.random() * 2}s`;
      return coin;
    }),
  );
  $('bigwinTitle').textContent = title;
  $('bigwinTitle').classList.toggle('long', title.length > 9);
  $('bigwinAmount').textContent = amount === null ? sub : '+0';
  $('bigwinAmount').classList.toggle('words', amount === null);
  $('bigwin').hidden = false;
  await Promise.all([amount === null ? null : countTo($('bigwinAmount'), 0, amount, 1400, '+'), wait(ms / speed)]);
  $('bigwin').hidden = true;
  coins.replaceChildren();
}

async function reveal(outcome) {
  const { result, payout } = outcome;
  if (payout === 0) {
    $('winTitle').textContent = 'NO WIN';
    $('winDetail').textContent = 'Spin again!';
    say(pick(['So close! Go again.', 'The swamp is just warming up.', 'Not that time. Spin again!', 'Shake it off. One more!']));
    return;
  }

  const { detail, line } = describe(result);
  const big = result.tier === 'big';
  // A free spin cost nothing, so even a little is a win outright.
  const free = outcome.freeSpinsLeft !== undefined;
  const small = result.tier === 'small' && !free;
  for (const win of result.wins) {
    for (const [reel, row] of win.cells) reels[reel].cells[row].classList.add('win');
    if (win.line !== null) {
      $('lines').append(polyline(win.cells, 'edge'), polyline(win.cells, 'glow', LINE_COLORS[win.line]));
    }
  }
  $('reelWindow').classList.add('won');
  $('winPanel').classList.add('on');
  if (!small) {
    $('game').classList.add('won');
    $('mascot').classList.add('hop');
  }
  $('winTitle').textContent = big ? 'BIG WIN!' : small ? 'SMALL WIN' : free ? 'FREE WIN!' : 'WIN!';
  $('winDetail').textContent = detail;
  $('winAmountWrap').hidden = false;
  say(free && result.tier === 'small' ? pick(['Free tokens! Chomp.', 'On the house!', 'That one cost you nothing.']) : line);
  if (big) sound.bigWin();
  else if (small) sound.smallWin();
  else sound.win();

  const counting = Promise.all([countTo($('winAmount'), 0, payout, small ? 300 : 700, '+'), showBalance(outcome.balance, small ? 400 : 900)]);
  if (big) await banner({ title: 'BIG WIN!', amount: payout });
  await counting;
}

// True when the first two reels leave a big three of a kind one symbol away
// on some line.
function bigWinPending(window) {
  return LINES.some(({ rows }) => {
    const first = window[0][rows[0]];
    const second = window[1][rows[1]];
    if (first !== second && first !== WILD && second !== WILD) return false;
    const kind = first === WILD ? second : first;
    return PAYTABLE.three[kind] / LINES.length >= BIG_WIN_AT;
  });
}

// Rolls the reels to a result, with the sounds and the hang on the last reel.
// `pace` above 1 rolls faster.
async function roll(result, pace = 1) {
  const { window, stops } = result;
  clearWin();
  $('game').classList.add('spinning');
  $('winTitle').textContent = 'GOOD LUCK';
  $('winDetail').textContent = 'Reels rolling...';

  // The last reel hangs when it could finish a big three of a kind.
  const suspense = bigWinPending(window);
  const times = STOP_TIMES.map((t, i) => (reducedMotion ? 300 : (t + (i === 2 && suspense ? SUSPENSE : 0)) / speed / pace));
  const rolling = reels.map((reel, i) => reel.spinTo(stops[i], times[i]));
  sound.reelsStart();
  rolling.forEach((landed, i) => landed.then(() => sound.reelStop(i)));
  if (suspense) {
    rolling[1].then(() => {
      sound.buildStart((times[2] - times[1]) / 1000);
      reels[2].el.classList.add('waiting');
      $('mascot').classList.add('peek');
      say('Ooh... come on, one more!');
    });
  }
  await Promise.all(rolling);
  sound.buildEnd();

  $('game').classList.remove('spinning');
  reels[2].el.classList.remove('waiting');
  $('mascot').classList.remove('peek');
}

// The bonus: the game plays the free spins itself, then shows what they won.
async function playFreeSpins() {
  const count = game.freeSpinsLeft;
  $('game').classList.add('bonus-mode');
  showMeter('FREE SPINS!');
  say('You earned it! Free spins!');
  sound.bonus();
  await banner({ title: `${count} FREE SPINS!`, sub: 'Every one wins', ms: 2400 });

  let total = 0;
  for (let i = 1; i <= count; i++) {
    showMeter(`FREE SPIN ${i} OF ${count}`);
    say(`Free spin ${i} of ${count}. On the house!`);
    sound.press();
    const outcome = game.freeSpin({ stops: forcedStops ?? undefined });
    await roll(outcome.result, 1.25);
    await reveal(outcome);
    total += outcome.payout;
    await wait(1100 / speed);
  }

  clearWin();
  sound.bigWin();
  await banner({ title: 'FREE SPINS WON', amount: total });
  $('game').classList.remove('bonus-mode');
  $('winTitle').textContent = 'FREE SPINS';
  $('winDetail').textContent = `${count} spins on the house`;
  $('winAmount').textContent = `+${format(total)}`;
  $('winAmountWrap').hidden = false;
  say('That is how the swamp pays!');
}

async function spin() {
  if (busy || $('pays').open) return;
  restartIdle();
  if (game.needsRefill) {
    game.refill();
    sound.refill();
    clearWin();
    $('winTitle').textContent = 'GOOD LUCK';
    $('winDetail').textContent = IDLE_DETAIL;
    say('Fresh tokens, on the house!');
    await showBalance(game.balance, 600);
    updateControls();
    return;
  }

  busy = true;
  sound.press();
  const outcome = game.spin({ stops: forcedStops ?? undefined });
  say('Here we go...');
  showBalance(outcome.balanceAfterWager);
  updateControls();

  await roll(outcome.result);
  await reveal(outcome);

  if (outcome.bonusAwarded) {
    await wait(700 / speed);
    await playFreeSpins();
  } else {
    const left = BONUS.spinsToFill - game.bonusProgress;
    if (outcome.payout === 0 && left <= 3) say(`${left} more ${left === 1 ? 'spin' : 'spins'} to free spins!`);
  }

  if (game.needsRefill) say('Out of tokens! Tap REFILL, it is on the house.');
  busy = false;
  updateControls();
  restartIdle();
}

function renderPays() {
  $('paysWager').textContent = game.wager;
  $('paysBonus').textContent = `Every ${BONUS.spinsToFill} spins at one wager earns ${BONUS.freeSpins} free spins, and every free spin wins.`;

  // A small picture of each line.
  $('paysLines').replaceChildren(
    ...LINES.map(({ rows }, index) => {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 52 44');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', `${LINES[index].name} line`);
      const xs = [11, 26, 41];
      const ys = [9, 22, 35];
      for (const x of xs) {
        for (const y of ys) {
          const dot = document.createElementNS(SVG_NS, 'circle');
          dot.setAttribute('cx', x);
          dot.setAttribute('cy', y);
          dot.setAttribute('r', 3);
          dot.setAttribute('fill', '#3a5a48');
          svg.append(dot);
        }
      }
      const line = document.createElementNS(SVG_NS, 'polyline');
      line.setAttribute('points', rows.map((row, reel) => `${xs[reel]},${ys[row]}`).join(' '));
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', LINE_COLORS[index]);
      line.setAttribute('stroke-width', 4);
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('stroke-linejoin', 'round');
      svg.append(line);
      return svg;
    }),
  );

  const row = (symbols, text, units) => {
    const div = document.createElement('div');
    div.className = 'pays-row';
    const left = document.createElement('div');
    left.className = 'pays-symbols';
    left.append(...symbols.map((s) => symbolSvg(s)), ` ${text}`);
    const right = document.createElement('div');
    right.className = 'pays-prize';
    const times = document.createElement('small');
    times.textContent = `${units / LINES.length}x`;
    right.append(format(payoutFor(units, game.wager)), times);
    div.append(left, right);
    return div;
  };
  $('paysList').replaceChildren(
    ...Object.entries(PAYTABLE.three).map(([s, units]) => row([s, s, s], '', units)),
    row(['happy', 'queen', 'baby'], 'any gators', PAYTABLE.anyGators),
    row([COIN, COIN, COIN], 'anywhere', PAYTABLE.coins[3]),
    row([COIN, COIN], 'anywhere', PAYTABLE.coins[2]),
  );
}

$('spin').addEventListener('click', spin);
$('wagerDown').addEventListener('click', () => {
  sound.tick();
  game.stepWager(-1);
  updateControls();
});
$('wagerUp').addEventListener('click', () => {
  sound.tick();
  game.stepWager(1);
  updateControls();
});
$('paysOpen').addEventListener('click', () => {
  sound.tick();
  renderPays();
  $('pays').showModal();
});
function showMuted() {
  const button = $('mute');
  button.classList.toggle('off', sound.muted);
  button.setAttribute('aria-pressed', String(!sound.muted));
  button.setAttribute('aria-label', sound.muted ? 'Sound is off' : 'Sound is on');
}
$('mute').addEventListener('click', () => {
  sound.setMuted(!sound.muted);
  try {
    localStorage.setItem(MUTED_KEY, sound.muted ? '1' : '0');
  } catch {
    // The choice just will not be remembered.
  }
  sound.tick();
  showMuted();
});
showMuted();

addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat || event.target.closest('button, dialog')) return;
  event.preventDefault();
  spin();
});

$('lineDots').replaceChildren(
  ...LINE_COLORS.map((color) => {
    const dot = document.createElement('i');
    dot.style.background = color;
    return dot;
  }),
);
$('meter').setAttribute('aria-valuemax', BONUS.spinsToFill);
$('meterLabel').textContent = `${BONUS.freeSpins} FREE SPINS`;
$('leftSignBig').textContent = `${LINES.length} LINES`;
$('rightSignBig').textContent = `${TOP_PRIZE / LINES.length}x`;
$('balance').textContent = format(game.balance);
updateControls();
restartIdle();
if (params.has('autospin')) document.fonts.ready.then(spin);
