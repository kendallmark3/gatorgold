// The tunable numbers of the game. Change odds and payouts here, then run
// `npm test` and `npm run report` to see what the change does.

export const SYMBOLS = {
  wild: { name: 'Wild Gator', gator: true },
  queen: { name: 'Queen Gator', gator: true },
  cool: { name: 'Cool Gator', gator: true },
  happy: { name: 'Happy Gator', gator: true },
  baby: { name: 'Baby Gator', gator: true },
  chest: { name: 'Treasure chest', gator: false },
  diamond: { name: 'Diamond', gator: false },
  coin: { name: 'Gold coin', gator: false },
  melon: { name: 'Watermelon', gator: false },
  flower: { name: 'Swamp flower', gator: false },
};

export const WILD = 'wild';
export const COIN = 'coin';

// One strip per reel, top to bottom. A spin stops each reel at a random
// position; how often a symbol appears on its strip is its odds. No symbol
// repeats within three positions, so a reel never shows the same symbol twice.
export const REEL_STRIPS = [
  ['melon', 'baby', 'happy', 'melon', 'coin', 'cool', 'flower', 'wild', 'happy', 'baby', 'flower', 'happy', 'melon', 'flower', 'baby', 'diamond', 'queen', 'cool', 'melon', 'diamond', 'happy', 'flower', 'chest', 'baby', 'flower', 'melon', 'baby', 'coin', 'queen', 'diamond', 'cool', 'chest', 'flower', 'coin'],
  ['coin', 'happy', 'flower', 'cool', 'baby', 'wild', 'flower', 'melon', 'baby', 'chest', 'happy', 'diamond', 'cool', 'baby', 'melon', 'flower', 'coin', 'cool', 'melon', 'happy', 'queen', 'diamond', 'baby', 'coin', 'flower', 'chest', 'happy', 'flower', 'melon', 'queen', 'flower', 'diamond', 'baby', 'melon'],
  ['coin', 'chest', 'diamond', 'baby', 'flower', 'melon', 'coin', 'baby', 'queen', 'flower', 'happy', 'melon', 'flower', 'queen', 'cool', 'diamond', 'flower', 'happy', 'baby', 'coin', 'diamond', 'flower', 'melon', 'happy', 'cool', 'wild', 'happy', 'baby', 'melon', 'flower', 'baby', 'chest', 'cool', 'melon'],
];

// The five win lines, as the row each reel contributes (0 is the top row).
// Every spin plays all five; the wager is split evenly across them.
export const LINES = [
  { name: 'Middle', rows: [1, 1, 1] },
  { name: 'Top', rows: [0, 0, 0] },
  { name: 'Bottom', rows: [2, 2, 2] },
  { name: 'Downhill', rows: [0, 1, 2] },
  { name: 'Uphill', rows: [2, 1, 0] },
];

// Payouts are in line bets. A line bet is the wager divided by the number of
// lines, so 5 line bets returns the wager.
export const PAYTABLE = {
  // Three of the same symbol on a line. Wild Gator stands in for any.
  three: {
    wild: 500,
    queen: 125,
    chest: 75,
    cool: 40,
    diamond: 30,
    coin: 25,
    happy: 15,
    baby: 10,
    melon: 6,
    flower: 4,
  },
  // Three gators of any mix on a line.
  anyGators: 3,
  // Gold coins anywhere in view, by how many.
  coins: { 2: 2, 3: 10 },
};

// A spin that pays this many times the wager, or more, is a big win.
export const BIG_WIN_AT = 8;

// The free-spins bonus. Each paid spin fills the meter by one; a full meter
// awards free spins, played at the wager that filled it. Every free spin is
// drawn from the winning reel positions only, so each one pays something.
// The meter is kept separately for each wager.
export const BONUS = { spinsToFill: 40, freeSpins: 5 };

export const WAGERS = [10, 25, 50];
export const STARTING_BALANCE = 1000;
