const ORDINARY_BOOK_PROFILES = [
  { value: 0.42, weight: 10 },
  { value: 0.52, weight: 27 },
  { value: 0.62, weight: 38 },
  { value: 0.72, weight: 20 },
  { value: 0.88, weight: 4 },
  { value: 1.16, weight: 1 },
];

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function shuffle(random, items) {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

function weightedPick(random, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/**
 * Builds one pre-printed book before it reaches the shop.
 *
 * Ordinary books are intentionally centred below the发行层面 65% prize-fund
 * ratio because the rare high-prize tail contributes to that long-run ratio.
 * A book can receive at most one ¥100–¥1,000 ticket from the ordinary high-tier
 * injection. The jackpot draw remains independent and extremely rare.
 */
export function makeBookPrizePool(type, random = Math.random) {
  const model = type.distribution ?? {
    targetReturn: 0.65,
    smallWinsPerBook: [Math.ceil(type.bookSize * 0.27), Math.ceil(type.bookSize * 0.4)],
    hundredEveryBooks: 4,
    jackpotEveryBooks: 50_000,
    note: "体验模型",
  };
  const profile = weightedPick(random, ORDINARY_BOOK_PROFILES).value;
  const target = Math.max(
    type.price,
    Math.round((type.price * type.bookSize * profile) / type.price) * type.price,
  );
  const winCount = Math.min(
    type.bookSize - 1,
    randomInt(random, model.smallWinsPerBook[0], model.smallWinsPerBook[1]),
  );
  const prizes = Array.from({ length: winCount }, () => type.price);
  let remaining = Math.max(0, target - winCount * type.price);

  const injectHighTier = random() < 1 / model.hundredEveryBooks;
  if (injectHighTier && prizes.length > 0) {
    const highCandidates = type.prizeTiers.filter(
      (tier) =>
        tier.amount >= 100 &&
        tier.amount <= 1_000 &&
        tier.amount < type.topPrize &&
        tier.amount - type.price <= remaining,
    );
    if (highCandidates.length > 0) {
      const chosen = weightedPick(random, highCandidates).amount;
      prizes[randomInt(random, 0, prizes.length - 1)] = chosen;
      remaining -= chosen - type.price;
    }
  }

  let guard = 0;
  while (remaining >= type.price && guard < 200 && prizes.length > 0) {
    guard += 1;
    const index = randomInt(random, 0, prizes.length - 1);
    const current = prizes[index];
    const candidates = type.prizeTiers.filter(
      (tier) =>
        tier.amount > current &&
        tier.amount < 100 &&
        tier.amount - current <= remaining,
    );
    if (candidates.length === 0) break;
    const chosen = weightedPick(random, candidates).amount;
    prizes[index] = chosen;
    remaining -= chosen - current;
  }

  while (prizes.length < type.bookSize) prizes.push(0);

  if (random() < 1 / model.jackpotEveryBooks) {
    const zeroIndex = prizes.findIndex((prize) => prize === 0);
    prizes[zeroIndex >= 0 ? zeroIndex : prizes.length - 1] = type.topPrize;
  }
  return shuffle(random, prizes);
}

export function makeSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

export const BOOK_PROFILES = ORDINARY_BOOK_PROFILES;
