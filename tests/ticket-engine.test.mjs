import assert from "node:assert/strict";
import test from "node:test";

import { TICKET_TYPES } from "../app/ticket-catalog.ts";
import { makeBookPrizePool, makeSeededRandom } from "../app/prize-model.js";
import { evaluateVisiblePrize, makeTicketOutcome } from "../app/ticket-engine.js";

function seeded(seed) {
  return makeSeededRandom(seed >>> 0);
}

test("property: every configured prize is exactly readable from the printed ticket face", () => {
  for (const [typeIndex, type] of TICKET_TYPES.entries()) {
    const prizes = [0, ...new Set(type.prizeTiers.map((tier) => tier.amount))];
    for (const [prizeIndex, prize] of prizes.entries()) {
      for (let sample = 0; sample < 24; sample += 1) {
        const random = seeded(
          (typeIndex + 1) * 1_000_003 + (prizeIndex + 1) * 10_007 + sample * 97,
        );
        const outcome = makeTicketOutcome(type, prize, random);
        assert.equal(
          evaluateVisiblePrize(type, outcome.winningNumbers, outcome.cells),
          prize,
          `${type.name} (${type.id}) 的可见票面必须等于计划奖金 ${prize}`,
        );
        assert.equal(outcome.cells.filter(Boolean).length, outcome.cells.length);
      }
    }
  }
});

test("property: losing tickets never contain a visible accidental win", () => {
  for (const [typeIndex, type] of TICKET_TYPES.entries()) {
    for (let sample = 0; sample < 180; sample += 1) {
      const outcome = makeTicketOutcome(type, 0, seeded(typeIndex * 65_537 + sample + 1));
      assert.equal(
        evaluateVisiblePrize(type, outcome.winningNumbers, outcome.cells),
        0,
        `${type.name} (${type.id}) 出现了假中奖`,
      );
    }
  }
});

test("property: whole-book visual totals equal the machine total for every catalog type", () => {
  for (const [typeIndex, type] of TICKET_TYPES.entries()) {
    for (let book = 0; book < 72; book += 1) {
      const poolRandom = seeded((typeIndex + 1) * 104_729 + book * 7_919);
      const faceRandom = seeded((typeIndex + 1) * 999_983 + book * 65_537);
      const prizePool = makeBookPrizePool(type, poolRandom);
      let visibleTotal = 0;
      for (const intendedPrize of prizePool) {
        const outcome = makeTicketOutcome(type, intendedPrize, faceRandom);
        visibleTotal += evaluateVisiblePrize(type, outcome.winningNumbers, outcome.cells);
      }
      const machineTotal = prizePool.reduce((sum, amount) => sum + amount, 0);
      assert.equal(
        visibleTotal,
        machineTotal,
        `${type.name} (${type.id}) 第 ${book + 1} 本可见合计与验票机不一致`,
      );
    }
  }
});

test("66顺88发、连中三元和好运十倍保留各自独立的真实判定符号", () => {
  const lucky = TICKET_TYPES.find((type) => type.id === "lucky-6688");
  const triple = TICKET_TYPES.find((type) => type.id === "three-yuan");
  const tenfold = TICKET_TYPES.find((type) => type.id === "tenfold");
  assert.ok(lucky && triple && tenfold);

  for (let seed = 1; seed <= 500; seed += 1) {
    const luckyOutcome = makeTicketOutcome(lucky, 80, seeded(seed * 11));
    const luckyWinners = luckyOutcome.cells.filter((cell) =>
      ["66", "88", "顺", "发"].includes(cell.label),
    );
    assert.equal(luckyWinners.length, 1);
    assert.equal(evaluateVisiblePrize(lucky, luckyOutcome.winningNumbers, luckyOutcome.cells), 80);

    const tripleOutcome = makeTicketOutcome(triple, 60, seeded(seed * 13));
    const tripleWinners = tripleOutcome.cells.filter(
      (cell) => cell.label === "元宝 · 元宝 · 元宝",
    );
    assert.equal(tripleWinners.length, 1);
    assert.equal(tripleOutcome.cells.length, 24);

    const losingTenfold = makeTicketOutcome(tenfold, 0, seeded(seed * 17));
    assert.ok(!losingTenfold.cells.some((cell) => cell.label === "10×"));
  }
});

test("通吃图符会把所有可见奖额相加，且仍与机器结果一致", () => {
  for (const [typeId, prize, symbol] of [
    ["mushroom-hunt", 100, "篮子"],
    ["horse-success-2026", 500, "成功"],
  ]) {
    const type = TICKET_TYPES.find((candidate) => candidate.id === typeId);
    assert.ok(type);
    let found = false;
    for (let seed = 1; seed <= 2_000 && !found; seed += 1) {
      const outcome = makeTicketOutcome(type, prize, seeded(seed * 31));
      if (!outcome.cells.some((cell) => cell.label === symbol)) continue;
      found = true;
      assert.equal(
        evaluateVisiblePrize(type, outcome.winningNumbers, outcome.cells),
        prize,
      );
      assert.equal(
        outcome.cells.reduce((sum, cell) => sum + cell.amount, 0),
        prize,
      );
    }
    assert.ok(found, `${type.name} 应能生成 ${symbol} 通吃票面`);
  }
});
