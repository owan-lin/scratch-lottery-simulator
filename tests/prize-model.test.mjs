import assert from "node:assert/strict";
import test from "node:test";

import { makeBookPrizePool, makeSeededRandom } from "../app/prize-model.js";

const MODEL_TYPES = [
  { price: 10, bookSize: 50, hundredEveryBooks: 4.2 },
  { price: 20, bookSize: 25, hundredEveryBooks: 3.6 },
  { price: 30, bookSize: 20, hundredEveryBooks: 3 },
].map(({ price, bookSize, hundredEveryBooks }) => ({
  id: `property-${price}`,
  price,
  bookSize,
  topPrize: price === 10 ? 400_000 : 1_000_000,
  prizeTiers: [price, price * 2, price * 3, price * 5, 100, 200, 500, 1_000]
    .filter((amount, index, values) => values.indexOf(amount) === index)
    .map((amount, index) => ({ amount, weight: Math.max(1, 20 - index * 2) })),
  distribution: {
    targetReturn: 0.65,
    smallWinsPerBook: [Math.ceil(bookSize * 0.27), Math.ceil(bookSize * 0.4)],
    hundredEveryBooks,
    jackpotEveryBooks: 1_000_000_000_000,
    note: "test",
  },
}));

test("property: every generated book preserves size, valid tiers and the one-high-ticket cap", () => {
  for (const type of MODEL_TYPES) {
    const allowed = new Set([0, ...type.prizeTiers.map((tier) => tier.amount), type.topPrize]);
    for (let seed = 1; seed <= 800; seed += 1) {
      const pool = makeBookPrizePool(type, makeSeededRandom(seed * 7_919 + type.price));
      assert.equal(pool.length, type.bookSize);
      assert.ok(pool.every((prize) => allowed.has(prize)));
      assert.ok(pool.filter((prize) => prize >= 100 && prize < type.topPrize).length <= 1);
    }
  }
});

test("property: ¥100–¥1,000 tickets stay below the configured long-run ceiling", () => {
  for (const type of MODEL_TYPES) {
    let booksWithHighTier = 0;
    const sampleSize = 8_000;
    for (let seed = 1; seed <= sampleSize; seed += 1) {
      const pool = makeBookPrizePool(type, makeSeededRandom(seed * 104_729 + type.price));
      if (pool.some((prize) => prize >= 100 && prize <= 1_000)) booksWithHighTier += 1;
    }
    const observed = booksWithHighTier / sampleSize;
    const expectedCeiling = 1 / type.distribution.hundredEveryBooks + 0.035;
    assert.ok(
      observed <= expectedCeiling,
      `${type.price}元票百元档整本占比 ${observed.toFixed(3)} 超过 ${expectedCeiling.toFixed(3)}`,
    );
  }
});
