const SAFE_PICTOGRAMS = [
  "元宝",
  "喜鹊",
  "祥云",
  "灯笼",
  "福袋",
  "中国结",
  "锦鲤",
  "宝箱",
  "钻石",
  "皇冠",
  "星星",
  "山峰",
  "竹叶",
  "雪花",
  "足球",
  "奖杯",
  "海浪",
  "椰树",
  "骏马",
  "莲花",
  "金币",
  "钥匙",
  "花朵",
  "猫",
];

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick(random, items) {
  return items[randomInt(random, 0, items.length - 1)];
}

function shuffle(random, items) {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

function smallAmounts(type) {
  return type.prizeTiers
    .map((tier) => tier.amount)
    .filter((amount) => amount > 0 && amount <= Math.max(1_000, type.price * 10))
    .slice(0, 7);
}

function randomPrintedAmount(type, random) {
  return pick(random, smallAmounts(type).length > 0 ? smallAmounts(type) : [type.price]);
}

function makeWinningNumbers(type, random) {
  const requested =
    type.winningNumberCount ??
    (type.id === "tenfold" ? 1 : type.opportunities >= 30 ? 5 : type.opportunities >= 20 ? 3 : 1);
  return shuffle(
    random,
    Array.from({ length: 50 }, (_, index) => index + 1),
  ).slice(0, requested);
}

function symbolRules(type) {
  if (Array.isArray(type.winningSymbols) && type.winningSymbols.length > 0) {
    return type.winningSymbols;
  }
  if (type.id.startsWith("meeting")) {
    return [
      { label: "阿喜", multiplier: 1 },
      { label: "囍", multiplier: 2 },
    ];
  }
  if (type.id === "lucky-6688") {
    return [
      { label: "66", multiplier: 1 },
      { label: "88", multiplier: 1 },
      { label: "顺", multiplier: 6 },
      { label: "发", multiplier: 8 },
    ];
  }
  if (type.id === "star-shine") {
    return [{ label: "体彩", multiplier: 1 }];
  }
  return [{ label: type.artSymbols?.[0] ?? "好运", multiplier: 1 }];
}

function matchMultiplierRules(type) {
  if (Array.isArray(type.matchMultipliers)) return type.matchMultipliers;
  return type.id === "tenfold" ? [{ label: "10×", multiplier: 10 }] : [];
}

function makeMatchCells(type, prize, winningNumbers, random) {
  const nonWinning = Array.from({ length: 50 }, (_, index) => index + 1).filter(
    (number) => !winningNumbers.includes(number),
  );
  const cells = Array.from({ length: type.opportunities }, () => ({
    label: String(pick(random, nonWinning)),
    amount: randomPrintedAmount(type, random),
    kind: "plain",
  }));
  if (prize <= 0) return cells;

  const validMarkers = matchMultiplierRules(type).filter(
    (rule) => Number.isInteger(prize / rule.multiplier) && prize / rule.multiplier > 0,
  );
  const useMarker = validMarkers.length > 0 && random() < 0.24;
  const target = randomInt(random, 0, cells.length - 1);
  if (useMarker) {
    const rule = pick(random, validMarkers);
    cells[target] = {
      label: rule.label,
      amount: prize / rule.multiplier,
      kind: "multiplier",
    };
  } else {
    cells[target] = {
      label: String(pick(random, winningNumbers)),
      amount: prize,
      kind: "winning",
    };
  }
  return cells;
}

function makeSymbolCells(type, prize, random) {
  const rules = symbolRules(type);
  const blocked = new Set(rules.map((rule) => rule.label));
  const numeric6688Decoys = ["65", "67", "68", "69", "76", "78", "80", "86", "87", "89"];
  const ordinaryDecoys = [...(type.artSymbols ?? []), ...SAFE_PICTOGRAMS].filter(
    (symbol, index, values) => !blocked.has(symbol) && values.indexOf(symbol) === index,
  );
  const decoys = type.id === "lucky-6688" ? numeric6688Decoys : ordinaryDecoys;
  const cells = Array.from({ length: type.opportunities }, () => ({
    label: pick(random, decoys),
    amount: randomPrintedAmount(type, random),
    kind: "plain",
  }));
  if (prize <= 0) return cells;

  const allRule = rules.find((rule) => rule.award === "all");
  const allAmounts = (() => {
    if (!allRule || random() >= 0.12) return null;
    const amounts = [...new Set(type.prizeTiers.map((tier) => tier.amount))]
      .filter((amount) => amount > 0 && amount <= prize)
      .sort((a, b) => a - b);
    for (const first of amounts) {
      for (const second of amounts) {
        for (let firstCount = 0; firstCount <= type.opportunities; firstCount += 1) {
          const secondCount = type.opportunities - firstCount;
          if (first * firstCount + second * secondCount === prize) {
            return shuffle(random, [
              ...Array(firstCount).fill(first),
              ...Array(secondCount).fill(second),
            ]);
          }
        }
      }
    }
    return null;
  })();
  if (allAmounts) {
    cells.forEach((cell, index) => {
      cell.amount = allAmounts[index];
    });
    const target = randomInt(random, 0, cells.length - 1);
    cells[target] = {
      ...cells[target],
      label: allRule.label,
      kind: "winning",
    };
    return cells;
  }

  const usableRules = rules.filter(
    (rule) =>
      rule.award !== "all" &&
      Number.isInteger(prize / rule.multiplier) &&
      prize / rule.multiplier > 0,
  );
  const rule = pick(random, usableRules.length > 0 ? usableRules : [rules[0]]);
  cells[randomInt(random, 0, cells.length - 1)] = {
    label: rule.label,
    amount: prize / rule.multiplier,
    kind: rule.multiplier > 1 ? "multiplier" : "winning",
  };
  return cells;
}

function makeDirectCells(type, prize, random) {
  const cells = Array.from({ length: type.opportunities }, () => ({
    label: "",
    amount: 0,
    kind: "blank",
  }));
  const luckyWin = type.id === "coast" && prize > 0 && random() < 0.18;
  if (prize > 0 && !luckyWin) {
    cells[randomInt(random, 0, cells.length - 1)] = {
      label: "",
      amount: prize,
      kind: "winning",
    };
  }
  if (type.id !== "coast") return cells;
  return [
    ...cells,
    {
      label: "",
      amount: luckyWin ? prize : 0,
      kind: luckyWin ? "winning" : "blank",
      section: "lucky",
    },
  ];
}

function makeTripleCells(type, prize, random) {
  const symbols = type.artSymbols?.length ? type.artSymbols : SAFE_PICTOGRAMS.slice(0, 5);
  const cells = Array.from({ length: type.opportunities }, () => {
    const first = pick(random, symbols);
    const alternatives = symbols.filter((symbol) => symbol !== first);
    const second = pick(random, alternatives.length > 0 ? alternatives : SAFE_PICTOGRAMS);
    return {
      label: `${first} · ${second} · ${pick(random, symbols)}`,
      amount: randomPrintedAmount(type, random),
      kind: "plain",
    };
  });
  if (prize > 0) {
    const symbol = type.id === "three-yuan" ? "元宝" : pick(random, symbols);
    cells[randomInt(random, 0, cells.length - 1)] = {
      label: `${symbol} · ${symbol} · ${symbol}`,
      amount: prize,
      kind: "winning",
    };
  }
  return cells;
}

function makePairCells(type, prize, random) {
  const matchLabel = type.pairRule?.matchLabel ?? "骏马";
  const bonusLabel = type.pairRule?.bonusLabel ?? "灯笼";
  const bonusMultiplier = type.pairRule?.bonusMultiplier ?? 3;
  const decoys = [...(type.artSymbols ?? []), ...SAFE_PICTOGRAMS].filter(
    (symbol, index, values) =>
      symbol !== matchLabel && symbol !== bonusLabel && values.indexOf(symbol) === index,
  );
  const cells = Array.from({ length: type.opportunities }, () => {
    const first = pick(random, decoys);
    const second = pick(random, decoys.filter((symbol) => symbol !== first));
    return {
      label: `${first} · ${second}`,
      amount: randomPrintedAmount(type, random),
      kind: "plain",
    };
  });
  if (prize <= 0) return cells;

  const useBonus =
    Number.isInteger(prize / bonusMultiplier) && prize / bonusMultiplier > 0 && random() < 0.24;
  cells[randomInt(random, 0, cells.length - 1)] = {
    label: useBonus ? `${bonusLabel} · ${pick(random, decoys)}` : `${matchLabel} · ${matchLabel}`,
    amount: useBonus ? prize / bonusMultiplier : prize,
    kind: useBonus ? "multiplier" : "winning",
  };
  return cells;
}

function makeCompareCells(type, prize, random) {
  const cells = Array.from({ length: type.opportunities }, () => {
    const mine = randomInt(random, 1, 8);
    const opponent = randomInt(random, mine + 1, 10);
    return {
      label: `我 ${mine} ｜ 对手 ${opponent}`,
      amount: randomPrintedAmount(type, random),
      kind: "plain",
    };
  });
  if (prize > 0) {
    const opponent = randomInt(random, 1, 7);
    cells[randomInt(random, 0, cells.length - 1)] = {
      label: `我 ${randomInt(random, opponent + 1, 10)} ｜ 对手 ${opponent}`,
      amount: prize,
      kind: "winning",
    };
  }
  return cells;
}

function makeAddCells(type, prize, random) {
  const cells = Array.from({ length: type.opportunities }, () => {
    const left = randomInt(random, 1, 6);
    let right = randomInt(random, 1, 6);
    if (left + right === 7) right = right === 6 ? 5 : right + 1;
    return {
      label: `${left} + ${right}`,
      amount: randomPrintedAmount(type, random),
      kind: "plain",
    };
  });
  if (prize > 0) {
    const left = randomInt(random, 1, 6);
    cells[randomInt(random, 0, cells.length - 1)] = {
      label: `${left} + ${7 - left}`,
      amount: prize,
      kind: "winning",
    };
  }
  return cells;
}

const GRID_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winningGridLines(cells) {
  return GRID_LINES.filter(([a, b, c]) => {
    const label = cells[a]?.label;
    return label && label === cells[b]?.label && label === cells[c]?.label;
  });
}

function makeGridCells(type, prize, random) {
  const symbols = type.artSymbols?.length >= 3 ? type.artSymbols.slice(0, 4) : SAFE_PICTOGRAMS.slice(0, 4);
  let cells = [];
  for (let attempt = 0; attempt < 200; attempt += 1) {
    cells = Array.from({ length: 9 }, () => ({
      label: pick(random, symbols),
      amount: 0,
      kind: "plain",
    }));
    if (winningGridLines(cells).length === 0) break;
  }
  if (prize > 0) {
    const [a, b, c] = pick(random, GRID_LINES);
    const symbol = pick(random, symbols);
    for (const index of [a, b, c]) cells[index] = { label: symbol, amount: 0, kind: "winning" };
    cells[c].amount = prize;
  }
  return cells;
}

function makePathCells(type, prize, random) {
  const symbols = type.artSymbols?.length ? type.artSymbols : ["起点", "台阶", "云海", "终点"];
  const cells = Array.from({ length: type.opportunities }, (_, index) => ({
    label: `${index + 1} · ${pick(random, symbols)}`,
    amount: 0,
    kind: "plain",
  }));
  if (prize > 0) {
    const index = randomInt(random, Math.min(2, cells.length - 1), cells.length - 1);
    cells[index] = { label: `${index + 1} · 抵达奖位`, amount: prize, kind: "winning" };
  }
  return cells;
}

function makeComboTemplates(type, winningNumbers, random) {
  const tripleSymbols = type.artSymbols?.length ? type.artSymbols : SAFE_PICTOGRAMS.slice(0, 5);
  const nonWinning = Array.from({ length: 50 }, (_, index) => index + 1).filter(
    (number) => !winningNumbers.includes(number),
  );
  const directFirst = [
    "golden-chest",
    "big-winner",
    "head-start-2026",
    "new-year-luck-2026",
  ].includes(type.id);
  const directMiddle = ["lucky-123", "sprout"].includes(type.id);
  const cells = [];

  for (let index = 0; index < (directFirst ? 5 : 3); index += 1) {
    if (directFirst) {
      cells.push({ label: "", amount: 0, kind: "blank", section: "triple" });
    } else {
      const first = pick(random, tripleSymbols);
      const second = pick(
        random,
        tripleSymbols.filter((symbol) => symbol !== first),
      );
      cells.push({
        label: `${first} · ${second} · ${pick(random, tripleSymbols)}`,
        amount: randomPrintedAmount(type, random),
        kind: "plain",
        section: "triple",
      });
    }
  }

  for (let index = 0; index < 5; index += 1) {
    if (directMiddle) {
      cells.push({
        label: "",
        amount: 0,
        kind: "blank",
        section: "instant",
      });
    } else if (type.id === "golden-chest") {
      const first = pick(random, tripleSymbols);
      const second = pick(
        random,
        tripleSymbols.filter((symbol) => symbol !== first),
      );
      cells.push({
        label: `${first} · ${second}`,
        amount: randomPrintedAmount(type, random),
        kind: "plain",
        section: "instant",
      });
    } else if (type.id === "peaceful-harvest") {
      const amounts = shuffle(random, ["10", "20", "30"]);
      cells.push({
        label: amounts.join(" · "),
        amount: randomPrintedAmount(type, random),
        kind: "plain",
        section: "instant",
      });
    } else {
      cells.push({
        label: pick(
          random,
          SAFE_PICTOGRAMS.filter((symbol) => symbol !== "奖杯" && symbol !== "宝箱"),
        ),
        amount: randomPrintedAmount(type, random),
        kind: "plain",
        section: "instant",
      });
    }
  }

  for (let index = 0; index < 10; index += 1) {
    if (type.id === "golden-chest") {
      cells.push({
        label: pick(random, SAFE_PICTOGRAMS.filter((symbol) => symbol !== "宝箱")),
        amount: randomPrintedAmount(type, random),
        kind: "plain",
        section: "numbers",
      });
    } else if (type.id === "peaceful-harvest") {
      cells.push({
        label: pick(random, SAFE_PICTOGRAMS.filter((symbol) => symbol !== "奖杯")),
        amount: 0,
        kind: "plain",
        section: "numbers",
      });
    } else {
      cells.push({
        label: String(pick(random, nonWinning)),
        amount: randomPrintedAmount(type, random),
        kind: "plain",
        section: "numbers",
      });
    }
  }
  return cells;
}

function comboMethods(type, prize) {
  if (type.id === "golden-chest") return ["direct", "pair", "symbol"];
  if (type.id === "big-winner") return ["direct", "instant", "numbers"];
  if (type.id === "head-start-2026") {
    return Number.isInteger(prize / 2) ? ["direct", "numbers", "head-start"] : ["direct", "numbers"];
  }
  if (type.id === "new-year-luck-2026") {
    const methods = ["direct", "numbers"];
    if (Number.isInteger(prize / 2)) methods.push("horse-double");
    if (Number.isInteger(prize / 5)) methods.push("lucky-five");
    return methods;
  }
  if (type.id === "lucky-123" || type.id === "sprout") {
    return ["triple", "direct-middle", "numbers"];
  }
  if (type.id === "luxury-seven") {
    const methods = ["triple", "numbers"];
    if (Number.isInteger(prize / 7) && prize / 7 > 0) methods.push("seven");
    return methods;
  }
  if (type.id === "peaceful-harvest") {
    return prize === 50 ? ["symbol", "three-amounts", "fixed"] : ["symbol", "three-amounts"];
  }
  return ["triple", "instant", "numbers"];
}

function makeComboCells(type, prize, winningNumbers, random) {
  const cells = makeComboTemplates(type, winningNumbers, random);
  if (prize <= 0) return cells;
  const method = pick(random, comboMethods(type, prize));

  const candidates = (section) =>
    cells.map((cell, index) => ({ cell, index })).filter(({ cell }) => cell.section === section);
  const replace = (section, cell) => {
    const target = pick(random, candidates(section)).index;
    cells[target] = { ...cell, section };
  };
  const symbol = pick(random, type.artSymbols?.length ? type.artSymbols : SAFE_PICTOGRAMS);

  if (method === "direct") {
    replace("triple", { label: "", amount: prize, kind: "winning" });
  } else if (method === "direct-middle") {
    replace("instant", { label: "", amount: prize, kind: "winning" });
  } else if (method === "pair") {
    replace("instant", {
      label: `${symbol} · ${symbol}`,
      amount: prize,
      kind: "winning",
    });
  } else if (method === "symbol") {
    replace(type.id === "peaceful-harvest" ? "triple" : "numbers", {
      label: type.id === "peaceful-harvest" ? "奖杯" : "宝箱",
      amount: prize,
      kind: "winning",
    });
  } else if (method === "three-amounts") {
    replace("instant", {
      label: "30 · 30 · 30",
      amount: prize,
      kind: "winning",
    });
  } else if (method === "fixed") {
    replace("numbers", { label: "奖杯", amount: 50, kind: "winning" });
  } else if (method === "triple") {
    replace("triple", {
      label: `${symbol} · ${symbol} · ${symbol}`,
      amount: prize,
      kind: "winning",
    });
  } else if (method === "seven") {
    replace("instant", {
      label: "7×",
      amount: prize / 7,
      kind: "multiplier",
    });
  } else if (method === "head-start") {
    replace("numbers", {
      label: "头彩",
      amount: prize / 2,
      kind: "multiplier",
    });
  } else if (method === "horse-double") {
    replace("numbers", {
      label: "骏马",
      amount: prize / 2,
      kind: "multiplier",
    });
  } else if (method === "lucky-five") {
    replace("numbers", {
      label: "大吉",
      amount: prize / 5,
      kind: "multiplier",
    });
  } else if (method === "instant") {
    replace("instant", {
      label: type.id === "big-winner" ? "奖杯" : "好运",
      amount: prize,
      kind: "winning",
    });
  } else {
    replace("numbers", {
      label: String(pick(random, winningNumbers)),
      amount: prize,
      kind: "winning",
    });
  }
  return cells;
}

function splitSymbols(label) {
  return label.split(" · ").map((part) => part.trim());
}

function allSame(parts, count) {
  return parts.length === count && parts.every((part) => part === parts[0]);
}

function evaluateMatch(type, winningNumbers, cells) {
  const markerMap = new Map(
    matchMultiplierRules(type).map((rule) => [rule.label, rule.multiplier]),
  );
  return cells.reduce((sum, cell) => {
    if (markerMap.has(cell.label)) return sum + cell.amount * markerMap.get(cell.label);
    const number = Number(cell.label);
    return Number.isFinite(number) && winningNumbers.includes(number) ? sum + cell.amount : sum;
  }, 0);
}

function evaluateSymbols(type, cells) {
  const rules = new Map(symbolRules(type).map((rule) => [rule.label, rule]));
  let awardsAll = false;
  const ordinaryPrize = cells.reduce((sum, cell) => {
    const rule = rules.get(cell.label);
    if (!rule) return sum;
    if (rule.award === "all") {
      awardsAll = true;
      return sum;
    }
    return sum + cell.amount * rule.multiplier;
  }, 0);
  return awardsAll
    ? ordinaryPrize + cells.reduce((total, item) => total + item.amount, 0)
    : ordinaryPrize;
}

function evaluateCombo(type, winningNumbers, cells) {
  let total = 0;
  for (const cell of cells) {
    const parts = splitSymbols(cell.label);
    if (cell.section === "triple") {
      if (
        ["golden-chest", "big-winner", "head-start-2026", "new-year-luck-2026"].includes(
          type.id,
        ) &&
        cell.amount > 0
      ) {
        total += cell.amount;
      } else if (type.id === "peaceful-harvest") {
        if (cell.label === "奖杯") total += cell.amount;
      } else if (allSame(parts, 3)) {
        total += cell.amount;
      }
    } else if (cell.section === "instant") {
      if (["lucky-123", "sprout"].includes(type.id) && cell.amount > 0) total += cell.amount;
      else if (type.id === "golden-chest" && allSame(parts, 2)) total += cell.amount;
      else if (type.id === "peaceful-harvest" && allSame(parts, 3)) total += cell.amount;
      else if (cell.label === "7×") total += cell.amount * 7;
      else if (cell.label === "好运" || cell.label === "奖杯") total += cell.amount;
    } else if (cell.section === "numbers") {
      if (type.id === "golden-chest" && cell.label === "宝箱") total += cell.amount;
      else if (type.id === "peaceful-harvest" && cell.label === "奖杯") total += 50;
      else if (type.id === "head-start-2026" && cell.label === "头彩") {
        total += cell.amount * 2;
      } else if (type.id === "new-year-luck-2026" && cell.label === "骏马") {
        total += cell.amount * 2;
      } else if (type.id === "new-year-luck-2026" && cell.label === "大吉") {
        total += cell.amount * 5;
      }
      else if (winningNumbers.includes(Number(cell.label))) total += cell.amount;
    }
  }
  return total;
}

/**
 * The ticket face is the sole source of truth for validation.
 * No hidden planned-prize value participates in this calculation.
 */
export function evaluateVisiblePrize(type, winningNumbers, cells) {
  if (type.mode === "direct") {
    return cells.reduce((sum, cell) => sum + Math.max(0, cell.amount), 0);
  }
  if (type.mode === "match") return evaluateMatch(type, winningNumbers, cells);
  if (type.mode === "symbol") return evaluateSymbols(type, cells);
  if (type.mode === "combo") return evaluateCombo(type, winningNumbers, cells);
  if (type.mode === "triple") {
    return cells.reduce(
      (sum, cell) => (allSame(splitSymbols(cell.label), 3) ? sum + cell.amount : sum),
      0,
    );
  }
  if (type.mode === "pairs") {
    const matchLabel = type.pairRule?.matchLabel ?? "骏马";
    const bonusLabel = type.pairRule?.bonusLabel ?? "灯笼";
    const bonusMultiplier = type.pairRule?.bonusMultiplier ?? 3;
    return cells.reduce((sum, cell) => {
      const parts = splitSymbols(cell.label);
      if (parts.includes(bonusLabel)) return sum + cell.amount * bonusMultiplier;
      if (parts.length === 2 && parts.every((part) => part === matchLabel)) {
        return sum + cell.amount;
      }
      return sum;
    }, 0);
  }
  if (type.mode === "compare") {
    return cells.reduce((sum, cell) => {
      const match = cell.label.match(/我\s+(\d+)\s+｜\s+对手\s+(\d+)/);
      return match && Number(match[1]) > Number(match[2]) ? sum + cell.amount : sum;
    }, 0);
  }
  if (type.mode === "add") {
    return cells.reduce((sum, cell) => {
      const match = cell.label.match(/(\d+)\s*\+\s*(\d+)/);
      return match && Number(match[1]) + Number(match[2]) === 7 ? sum + cell.amount : sum;
    }, 0);
  }
  if (type.mode === "grid") {
    const winningIndexes = new Set(winningGridLines(cells).flat());
    return cells.reduce(
      (sum, cell, index) => (winningIndexes.has(index) ? sum + cell.amount : sum),
      0,
    );
  }
  if (type.mode === "path") {
    return cells.reduce(
      (sum, cell) => (cell.label.includes("抵达奖位") ? sum + cell.amount : sum),
      0,
    );
  }
  throw new Error(`Unsupported play mode: ${type.mode}`);
}

export function makeTicketOutcome(type, intendedPrize, random = Math.random) {
  if (!Number.isSafeInteger(intendedPrize) || intendedPrize < 0) {
    throw new TypeError(`${type.name} (${type.id}) prize must be a non-negative integer`);
  }
  const winningNumbers = makeWinningNumbers(type, random);
  let cells;
  if (type.mode === "direct") cells = makeDirectCells(type, intendedPrize, random);
  else if (type.mode === "match") {
    cells = makeMatchCells(type, intendedPrize, winningNumbers, random);
  } else if (type.mode === "symbol") cells = makeSymbolCells(type, intendedPrize, random);
  else if (type.mode === "combo") {
    cells = makeComboCells(type, intendedPrize, winningNumbers, random);
  } else if (type.mode === "triple") cells = makeTripleCells(type, intendedPrize, random);
  else if (type.mode === "pairs") cells = makePairCells(type, intendedPrize, random);
  else if (type.mode === "compare") cells = makeCompareCells(type, intendedPrize, random);
  else if (type.mode === "add") cells = makeAddCells(type, intendedPrize, random);
  else if (type.mode === "grid") cells = makeGridCells(type, intendedPrize, random);
  else if (type.mode === "path") cells = makePathCells(type, intendedPrize, random);
  else throw new Error(`Unsupported play mode: ${type.mode}`);

  if (
    cells.length === 0 ||
    cells.some(
      (cell) =>
        !cell ||
        typeof cell.label !== "string" ||
        !Number.isSafeInteger(cell.amount) ||
        cell.amount < 0,
    )
  ) {
    throw new Error(`${type.name} (${type.id}) generated an invalid printed ticket face`);
  }
  const visiblePrize = evaluateVisiblePrize(type, winningNumbers, cells);
  if (visiblePrize !== intendedPrize) {
    throw new Error(
      `${type.name} (${type.id}) ticket mismatch: planned ${intendedPrize}, visible ${visiblePrize}`,
    );
  }
  return { winningNumbers, cells, visiblePrize };
}

export const TICKET_ENGINE_INTERNALS = {
  GRID_LINES,
  symbolRules,
  matchMultiplierRules,
  winningGridLines,
};
