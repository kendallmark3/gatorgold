import { REEL_STRIPS, SYMBOLS, LINES, PAYTABLE, BIG_WIN_AT, WILD, COIN } from '../math/config.js';
import { resultAt, payoutFor } from '../math/engine.js';
import { createGame } from '../game/state.js';
import { createReel, symbolSvg } from './reels.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const format = (n) => n.toLocaleString('en-US');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const params = new URLSearchParams(location.search);
// For evidence: `?stops=5,3,14` makes every spin land on those reel positions,
// `&autospin=1` spins once on load, and `&speed=4` runs the reels faster.
const forcedStops = params.has('stops') ? params.get('stops').split(',').map(Number) : null;
const speed = Number(params.get('speed')) || 1;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const STOP_TIMES = [1100, 1600, 2100];
const SUSPENSE = 1500;
const BIG_WIN_SHOW = 2800;
const IDLE_DETAIL = `${LINES.length} lines pay on every spin`;

// One colour per win line, in the order of LINES.
const LINE_COLORS = ['#ffd54a', '#ff7ab8', '#5fd6ff', '#ff9a4d', '#c4f25a'];
// Cell centres inside the reel window, matching the layout in styles.css.
const CELL_X = [59, 167, 275];
const CELL_Y = [55, 149, 243];

const game = createGame();
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

function fit() {
  const scale = Math.min(innerWidth / 390, innerHeight / 844, 1.4);
  document.documentElement.style.setProperty('--scale', scale);
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
  $('wagerDown').disabled = busy || !game.canStepWager(-1);
  $('wagerUp').disabled = busy || !game.canStepWager(1);
  $('paysOpen').disabled = busy;
  const spin = $('spin');
  const refill = game.needsRefill;
  spin.textContent = refill ? 'REFILL' : 'SPIN';
  spin.classList.toggle('small-label', refill);
  spin.disabled = busy;
  spin.classList.toggle('ready', !busy);
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

async function celebrateBigWin(payout) {
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
  $('bigwin').hidden = false;
  await Promise.all([countTo($('bigwinAmount'), 0, payout, 1400, '+'), wait(BIG_WIN_SHOW / speed)]);
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
  const small = result.tier === 'small';
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
  $('winTitle').textContent = big ? 'BIG WIN!' : small ? 'SMALL WIN' : 'WIN!';
  $('winDetail').textContent = detail;
  $('winAmountWrap').hidden = false;
  say(line);

  const counting = Promise.all([countTo($('winAmount'), 0, payout, small ? 300 : 700, '+'), showBalance(outcome.balance, small ? 400 : 900)]);
  if (big) await celebrateBigWin(payout);
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

async function spin() {
  if (busy || $('pays').open) return;
  if (game.needsRefill) {
    game.refill();
    clearWin();
    $('winTitle').textContent = 'GOOD LUCK';
    $('winDetail').textContent = IDLE_DETAIL;
    say('Fresh tokens, on the house!');
    await showBalance(game.balance, 600);
    updateControls();
    return;
  }

  busy = true;
  const outcome = game.spin({ stops: forcedStops ?? undefined });
  const { window, stops } = outcome.result;
  clearWin();
  $('game').classList.add('spinning');
  $('winTitle').textContent = 'GOOD LUCK';
  $('winDetail').textContent = 'Reels rolling...';
  say('Here we go...');
  showBalance(outcome.balanceAfterWager);
  updateControls();

  // The last reel hangs when it could finish a big three of a kind.
  const suspense = bigWinPending(window);
  const times = STOP_TIMES.map((t, i) => (reducedMotion ? 300 : (t + (i === 2 && suspense ? SUSPENSE : 0)) / speed));
  const rolling = reels.map((reel, i) => reel.spinTo(stops[i], times[i]));
  if (suspense) {
    rolling[1].then(() => {
      reels[2].el.classList.add('waiting');
      $('mascot').classList.add('peek');
      say('Ooh... come on, one more!');
    });
  }
  await Promise.all(rolling);

  $('game').classList.remove('spinning');
  reels[2].el.classList.remove('waiting');
  $('mascot').classList.remove('peek');
  await reveal(outcome);

  if (game.needsRefill) say('Out of tokens! Tap REFILL, it is on the house.');
  busy = false;
  updateControls();
}

function renderPays() {
  $('paysWager').textContent = game.wager;

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
  game.stepWager(-1);
  updateControls();
});
$('wagerUp').addEventListener('click', () => {
  game.stepWager(1);
  updateControls();
});
$('paysOpen').addEventListener('click', () => {
  renderPays();
  $('pays').showModal();
});
addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat || event.target.closest('button, dialog')) return;
  event.preventDefault();
  spin();
});

$('balance').textContent = format(game.balance);
updateControls();
if (params.has('autospin')) document.fonts.ready.then(spin);
