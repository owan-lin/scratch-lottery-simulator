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
    for (let sample = 0; sample < 320; sample += 1) {
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
    for (let book = 0; book < 128; book += 1) {
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

test("oracle: all ten play modes calculate only what is printed on the face", () => {
  const cell = (label, amount, section) => ({
    label,
    amount,
    kind: amount > 0 ? "winning" : "blank",
    ...(section ? { section } : {}),
  });
  const cases = [
    {
      name: "direct",
      type: { id: "oracle-direct", mode: "direct" },
      winning: [],
      cells: [cell("", 25), cell("", 0), cell("", 5)],
      expected: 30,
    },
    {
      name: "match",
      type: {
        id: "oracle-match",
        mode: "match",
        matchMultipliers: [{ label: "10×", multiplier: 10 }],
      },
      winning: [7],
      cells: [cell("7", 10), cell("10×", 2), cell("8", 999)],
      expected: 30,
    },
    {
      name: "symbol",
      type: {
        id: "oracle-symbol",
        mode: "symbol",
        winningSymbols: [
          { label: "喜", multiplier: 1 },
          { label: "回", multiplier: 2 },
        ],
      },
      winning: [],
      cells: [cell("喜", 10), cell("回", 10), cell("祥云", 999)],
      expected: 30,
    },
    {
      name: "combo",
      type: { id: "fortune", mode: "combo" },
      winning: [7],
      cells: [
        cell("元宝 · 元宝 · 元宝", 10, "triple"),
        cell("好运", 20, "instant"),
        cell("7", 30, "numbers"),
        cell("8", 999, "numbers"),
      ],
      expected: 60,
    },
    {
      name: "triple",
      type: { id: "oracle-triple", mode: "triple" },
      winning: [],
      cells: [cell("星 · 星 · 星", 15), cell("星 · 云 · 星", 999)],
      expected: 15,
    },
    {
      name: "pairs",
      type: {
        id: "oracle-pairs",
        mode: "pairs",
        pairRule: { matchLabel: "骏马", bonusLabel: "灯笼", bonusMultiplier: 3 },
      },
      winning: [],
      cells: [
        cell("骏马 · 骏马", 10),
        cell("灯笼 · 祥云", 5),
        cell("骏马 · 祥云", 999),
      ],
      expected: 25,
    },
    {
      name: "compare",
      type: { id: "oracle-compare", mode: "compare" },
      winning: [],
      cells: [cell("我 8 ｜ 对手 3", 12), cell("我 2 ｜ 对手 9", 999)],
      expected: 12,
    },
    {
      name: "add",
      type: { id: "oracle-add", mode: "add" },
      winning: [],
      cells: [cell("3 + 4", 20), cell("2 + 6", 999)],
      expected: 20,
    },
    {
      name: "grid",
      type: { id: "oracle-grid", mode: "grid" },
      winning: [],
      cells: [
        cell("星", 10), cell("星", 0), cell("星", 0),
        cell("云", 999), cell("山", 999), cell("海", 999),
        cell("路", 999), cell("桥", 999), cell("花", 999),
      ],
      expected: 10,
    },
    {
      name: "path",
      type: { id: "oracle-path", mode: "path" },
      winning: [],
      cells: [cell("前进2步 · 抵达奖位", 30), cell("前进1步", 999)],
      expected: 30,
    },
  ];

  for (const sample of cases) {
    assert.equal(
      evaluateVisiblePrize(sample.type, sample.winning, sample.cells),
      sample.expected,
      `${sample.name} 独立票面判定错误`,
    );
  }
});

test("oracle: duplicate all-award symbols cannot count the same printed amounts twice", () => {
  const type = {
    id: "oracle-all",
    mode: "symbol",
    winningSymbols: [{ label: "篮子", multiplier: 1, award: "all" }],
  };
  const cells = [
    { label: "篮子", amount: 0, kind: "winning" },
    { label: "篮子", amount: 0, kind: "winning" },
    { label: "蘑菇", amount: 10, kind: "plain" },
    { label: "祥云", amount: 20, kind: "plain" },
  ];
  assert.equal(evaluateVisiblePrize(type, [], cells), 30);
});

test("property: generated faces contain only valid printable cells and unique winning numbers", () => {
  for (const [typeIndex, type] of TICKET_TYPES.entries()) {
    for (let sample = 0; sample < 80; sample += 1) {
      const prize = sample % 3 === 0
        ? 0
        : type.prizeTiers[sample % type.prizeTiers.length].amount;
      const outcome = makeTicketOutcome(type, prize, seeded(7_000_001 + typeIndex * 997 + sample));
      assert.ok(outcome.cells.length > 0);
      assert.equal(new Set(outcome.winningNumbers).size, outcome.winningNumbers.length);
      for (const printedCell of outcome.cells) {
        assert.equal(typeof printedCell.label, "string");
        assert.ok(Number.isSafeInteger(printedCell.amount));
        assert.ok(printedCell.amount >= 0);
      }
    }
  }
});

test("invalid planned prize values are rejected before a ticket can be printed", () => {
  const type = TICKET_TYPES[0];
  for (const invalid of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => makeTicketOutcome(type, invalid, seeded(42)), /non-negative integer/);
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
