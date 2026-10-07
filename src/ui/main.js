import { REEL_STRIPS, SYMBOLS, PAYTABLE, WILD, COIN } from '../math/config.js';
import { resultAt } from '../math/engine.js';
import { createGame } from '../game/state.js';
import { createReel, symbolSvg } from './reels.js';

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

const game = createGame();
let busy = false;
let shownBalance = game.balance;

// Start on a losing position so the machine does not open on a win.
function quietStops() {
  for (;;) {
    const stops = REEL_STRIPS.map((strip) => Math.floor(Math.random() * strip.length));
    if (resultAt(stops).multiplier === 0) return stops;
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

function clearWin() {
  $('game').classList.remove('won');
  $('reelWindow').classList.remove('won');
  $('payline').classList.remove('on');
  $('winPanel').classList.remove('on');
  $('winAmountWrap').hidden = true;
  $('mascot').classList.remove('hop', 'peek');
  for (const reel of reels) {
    reel.el.classList.remove('waiting');
    for (const c of reel.cells) c.classList.remove('win');
  }
}

function describe(result) {
  if (result.rule === 'three') {
    const name = SYMBOLS[result.symbol].name;
    return { detail: `3 x ${name}`, line: result.tier === 'big' ? `Three ${name}s! Somebody call Mark!` : `Three ${name}s! Chomp!` };
  }
  if (result.rule === 'anyGators') return { detail: 'Any 3 gators', line: 'Gator party! That pays.' };
  if (result.multiplier === PAYTABLE.coins[1]) return { detail: 'Gold coin: wager back', line: 'Shiny! You get your wager back.' };
  return { detail: '2 gold coins', line: 'Double gold! Nice one.' };
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
  reels.forEach((reel, i) => {
    const onLine = reel.cells[1];
    if (result.rule !== 'coins' || result.line[i] === COIN) onLine.classList.add('win');
  });
  $('game').classList.add('won');
  $('reelWindow').classList.add('won');
  $('payline').classList.add('on');
  $('winPanel').classList.add('on');
  $('mascot').classList.add('hop');
  $('winTitle').textContent = big ? 'BIG WIN!' : 'WIN!';
  $('winDetail').textContent = detail;
  $('winAmountWrap').hidden = false;
  say(line);

  const counting = Promise.all([countTo($('winAmount'), 0, payout, 700, '+'), showBalance(outcome.balance, 900)]);
  if (big) await celebrateBigWin(payout);
  await counting;
}

async function spin() {
  if (busy || $('pays').open) return;
  if (game.needsRefill) {
    game.refill();
    clearWin();
    $('winTitle').textContent = 'GOOD LUCK';
    $('winDetail').textContent = 'Match 3 on the gold line';
    say('Fresh tokens, on the house!');
    await showBalance(game.balance, 600);
    updateControls();
    return;
  }

  busy = true;
  const outcome = game.spin({ stops: forcedStops ?? undefined });
  const { line, stops } = outcome.result;
  clearWin();
  $('game').classList.add('spinning');
  $('winTitle').textContent = 'GOOD LUCK';
  $('winDetail').textContent = 'Reels rolling...';
  say('Here we go...');
  showBalance(outcome.balanceAfterWager);
  updateControls();

  // The last reel hangs when the first two could finish a three of a kind.
  const suspense = line[0] === line[1] || line[0] === WILD || line[1] === WILD;
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
  const row = (symbols, text, multiplier) => {
    const div = document.createElement('div');
    div.className = 'pays-row';
    const left = document.createElement('div');
    left.className = 'pays-symbols';
    left.append(...symbols.map((s) => symbolSvg(s)), ` ${text}`);
    const right = document.createElement('div');
    right.className = 'pays-prize';
    const tokens = document.createElement('small');
    tokens.textContent = `${multiplier}x`;
    right.append(format(multiplier * game.wager), tokens);
    div.append(left, right);
    return div;
  };
  $('paysList').replaceChildren(
    ...Object.entries(PAYTABLE.three).map(([s, m]) => row([s, s, s], '', m)),
    row(['happy', 'queen', 'baby'], 'any gators', PAYTABLE.anyGators),
    row([COIN, COIN], '2 coins', PAYTABLE.coins[2]),
    row([COIN], '1 coin', PAYTABLE.coins[1]),
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
