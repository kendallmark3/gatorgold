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

// Payouts are multiples of the wager.
export const PAYTABLE = {
  // Three of the same symbol on the win line. Wild Gator stands in for any.
  three: {
    wild: 100,
    queen: 50,
    chest: 40,
    cool: 25,
    diamond: 20,
    coin: 15,
    happy: 12,
    baby: 8,
    melon: 6,
    flower: 4,
  },
  // Three gators of any mix on the win line.
  anyGators: 5,
  // Gold coins anywhere on the win line, by how many.
  coins: { 1: 1, 2: 3 },
};

// A win of this many times the wager, or more, is a big win.
export const BIG_WIN_AT = 15;

export const WAGERS = [10, 25, 50];
export const STARTING_BALANCE = 1000;
