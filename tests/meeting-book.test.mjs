import assert from "node:assert/strict";
import test from "node:test";

import {
  MEETING_DOUBLE_SYMBOL,
  MEETING_WIN_SYMBOL,
  calculateMeetingPrize,
  makeMeetingCells,
  meetingDecoySymbols,
} from "../app/meeting-prize.js";

const variants = [
  { opportunities: 15, price: 10, symbols: ["喜鹊", "祥云", "阿喜", "囍"] },
  { opportunities: 25, price: 20, symbols: ["仙鹤", "喜鹊", "阿喜", "囍"] },
  { opportunities: 30, price: 30, symbols: ["鸳鸯", "灯笼", "阿喜", "囍"] },
];

test("喜相逢的干扰图符永远不包含中奖图符", () => {
  for (const variant of variants) {
    const decoys = meetingDecoySymbols(variant.symbols);
    assert.ok(!decoys.includes(MEETING_WIN_SYMBOL));
    assert.ok(!decoys.includes(MEETING_DOUBLE_SYMBOL));
  }
});

test("模拟多本喜相逢时，逐张票面计算与机器兑奖完全一致", () => {
  for (const variant of variants) {
    const prizeAmounts = [
      variant.price,
      variant.price * 2,
      variant.price * 5,
      100,
      200,
    ];
    for (let book = 0; book < 120; book += 1) {
      const bookPrizes = Array.from(
        { length: variant.price === 10 ? 50 : variant.price === 20 ? 25 : 20 },
        (_, index) =>
          index % 5 === 0
            ? prizeAmounts[Math.floor(index / 5) % prizeAmounts.length]
            : 0,
      );
      const visibleTotal = bookPrizes.reduce((sum, prize) => {
        const cells = makeMeetingCells({
          opportunities: variant.opportunities,
          prize,
          prizeAmounts,
          artSymbols: variant.symbols,
        });
        return sum + calculateMeetingPrize(cells);
      }, 0);
      const machineTotal = bookPrizes.reduce((sum, prize) => sum + prize, 0);
      assert.equal(visibleTotal, machineTotal);
    }
  }
});
