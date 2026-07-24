"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CATALOG_SIZE,
  TICKET_TYPES as CATALOG_TICKET_TYPES,
  type PlayFamily,
  type TicketDistribution,
} from "./ticket-catalog";

type Phase = "mall" | "budget" | "wandering" | "shop" | "scratch" | "validation" | "summary";
type PlayStyle = "quick" | "story";
type PlayMode =
  | "direct"
  | "match"
  | "symbol"
  | "combo"
  | "triple"
  | "compare"
  | "add"
  | "grid"
  | "path";
type PaySource = "cash" | "prize";
type StockTone = "open" | "thin" | "last" | "sold";
type ScratchToolId = "coin" | "small-scraper" | "wide-scraper";

type ScratchTool = {
  id: ScratchToolId;
  name: string;
  detail: string;
  width: number;
  glyph: string;
};

type PrizeTier = {
  amount: number;
  weight: number;
};

type TicketType = {
  id: string;
  name: string;
  subtitle: string;
  issuer: "中国福利彩票" | "中国体育彩票";
  price: number;
  bookSize: number;
  opportunities: number;
  opportunityLabel?: string;
  prizeTierCount: number;
  topPrize: number;
  mode: PlayMode;
  mechanic: string;
  design: string;
  color: string;
  ink: string;
  accent: string;
  prizeTiers: PrizeTier[];
  playFamily?: PlayFamily;
  artSymbols?: string[];
  variantCount?: number;
  distribution?: TicketDistribution;
  evidence?: "官方详规" | "官方介绍" | "官方目录";
  sourceUrl?: string;
  publishedWinRate?: number;
};

type TicketCell = {
  label: string;
  amount: number;
  kind: "blank" | "plain" | "winning" | "multiplier";
  section?: "triple" | "instant" | "numbers" | "lucky";
};

type Ticket = {
  id: string;
  typeId: string;
  bookId: string;
  bookIndex: number;
  bookSize: number;
  prize: number;
  winningNumbers: number[];
  cells: TicketCell[];
  validationCode: string;
};

type Book = {
  id: string;
  typeId: string;
  tickets: Ticket[];
  cursor: number;
};

type PublicStock = {
  tone: StockTone;
  label: string;
  canSell: boolean;
  hasSealed: boolean;
  openBooks: number;
  visibleBookIds: string[];
};

type SessionLog = {
  id: string;
  label: string;
  amount: number;
  tone: "spend" | "win" | "info";
};

const BASE_TICKET_TYPES: TicketType[] = [
  {
    id: "tenfold",
    name: "好运十倍",
    subtitle: "经典数字对碰",
    issuer: "中国福利彩票",
    price: 10,
    bookSize: 50,
    opportunities: 10,
    prizeTierCount: 12,
    topPrize: 400_000,
    mode: "match",
    mechanic: "任意“我的号码”与“中奖号码”相同，中得同行奖金；出现“10”标志，奖金乘十。",
    design: "红金底、铜钱暗纹、单个中奖号码与十行对数字",
    color: "#ba201f",
    ink: "#fff3ca",
    accent: "#f2c14a",
    prizeTiers: [
      { amount: 10, weight: 42 },
      { amount: 20, weight: 26 },
      { amount: 30, weight: 18 },
      { amount: 40, weight: 16 },
      { amount: 50, weight: 15 },
      { amount: 100, weight: 8 },
      { amount: 200, weight: 4 },
      { amount: 500, weight: 2 },
      { amount: 1_000, weight: 1.1 },
      { amount: 5_000, weight: 0.35 },
      { amount: 10_000, weight: 0.12 },
      { amount: 400_000, weight: 0.0008 },
    ],
  },
  {
    id: "meeting",
    name: "喜相逢",
    subtitle: "20元 · 喜字即中",
    issuer: "中国福利彩票",
    price: 20,
    bookSize: 25,
    opportunities: 25,
    prizeTierCount: 10,
    topPrize: 800_000,
    mode: "symbol",
    mechanic: "刮出“喜”中得下方奖金；刮出“囍”中得下方奖金的两倍，奖金兼中兼得。",
    design: "红蓝双边、祥云仙鹤、满版祝福语与二十五格奖符",
    color: "#194e83",
    ink: "#fff6dc",
    accent: "#e44035",
    prizeTiers: [
      { amount: 20, weight: 42 },
      { amount: 40, weight: 25 },
      { amount: 100, weight: 16 },
      { amount: 200, weight: 8 },
      { amount: 500, weight: 4 },
      { amount: 1_000, weight: 2 },
      { amount: 5_000, weight: 0.65 },
      { amount: 10_000, weight: 0.2 },
      { amount: 100_000, weight: 0.03 },
      { amount: 800_000, weight: 0.0005 },
    ],
  },
  {
    id: "fortune",
    name: "好运来",
    subtitle: "30元 · 三玩法",
    issuer: "中国福利彩票",
    price: 30,
    bookSize: 20,
    opportunities: 18,
    prizeTierCount: 11,
    topPrize: 800_000,
    mode: "combo",
    mechanic: "三同图、图符即中和对数字三种玩法同在一张票上，三个区域奖金兼中兼得。",
    design: "红金锦鲤、福袋与金元宝，三块独立刮开区",
    color: "#be2b20",
    ink: "#fff2ca",
    accent: "#f4c34e",
    prizeTiers: [
      { amount: 30, weight: 38 },
      { amount: 60, weight: 24 },
      { amount: 100, weight: 16 },
      { amount: 200, weight: 10 },
      { amount: 500, weight: 5 },
      { amount: 1_000, weight: 2.5 },
      { amount: 5_000, weight: 0.8 },
      { amount: 10_000, weight: 0.25 },
      { amount: 50_000, weight: 0.05 },
      { amount: 100_000, weight: 0.02 },
      { amount: 800_000, weight: 0.0005 },
    ],
  },
  {
    id: "coast",
    name: "一路向海",
    subtitle: "10元 · 海南环岛主题",
    issuer: "中国体育彩票",
    price: 10,
    bookSize: 50,
    opportunities: 15,
    opportunityLabel: "主玩法 + 幸运玩法",
    prizeTierCount: 10,
    topPrize: 250_000,
    mode: "direct",
    mechanic: "主玩法刮出奖金金额即中得该奖金；幸运玩法刮出奖金标志即中。没有中奖的位置刮开后就是空白。",
    design: "海岛公路、椰树与落日，共十五款沿线风景票面",
    color: "#087c85",
    ink: "#fff8dc",
    accent: "#f3a24b",
    prizeTiers: [
      { amount: 10, weight: 44 },
      { amount: 20, weight: 26 },
      { amount: 50, weight: 15 },
      { amount: 100, weight: 8 },
      { amount: 200, weight: 3.5 },
      { amount: 500, weight: 1.6 },
      { amount: 1_000, weight: 0.7 },
      { amount: 5_000, weight: 0.16 },
      { amount: 10_000, weight: 0.05 },
      { amount: 250_000, weight: 0.0008 },
    ],
  },
];

const TICKET_TYPES = CATALOG_TICKET_TYPES as TicketType[];
const FEATURED_TICKET_IDS = BASE_TICKET_TYPES.map((type) =>
  type.id === "meeting" ? "meeting-20" : type.id,
);

const DIALOGUE = {
  greeting: [
    "先随便看，别急着拿。今天柜台上的票有的已经卖掉半本了。",
    "刚有人刮完一摞，桌面上还有点碎屑。你先看看想玩哪种。",
    "新票和老票都有，架上没有的不一定是卖完了，我得去柜子里找。",
    "今天商场人不多。还是先定预算，花到数就停。",
  ],
  smallBuy: [
    "给你从正在卖的这本接着拿，流水号是连着的。",
    "拿好了，别刮到下面写着“保安区刮开无效”的地方。",
    "硬币在纸杯旁边。慢慢刮，别一上来就把票刮破了。",
    "这几张是架上顺着抽的，我没给你挑号。",
  ],
  manyBuy: [
    "张数不少，我从同一本里连着给你拿。预算记着点。",
    "这一摞先刮完再说，不着急往上加。",
    "都从当前这包里顺着出，号码只是流水号，不代表中奖规律。",
  ],
  wholeBook: [
    "整本封条给你当面拆，票按流水号顺序排好，别弄乱。",
    "这是未拆封的一本。整本也不等于保本，只是一次把同包票拿完。",
    "先说好，整本的返奖也会波动，不存在每本固定回多少。",
  ],
  scratch: [
    "覆盖膜要来回刮。只碰一下可看不清号码。",
    "刮屑往一边扫，先把玩法区的信息都露出来。",
    "自己先按规则看，但最终还是拿过来扫保安区验票。",
  ],
  noPrize: [
    "机器没报码，这张没有。别因为刚没中就追着加张数。",
    "这张没出，桌上剩下的慢慢刮，预算别动。",
    "没有奖。票留这边，我再帮你核一遍也一样。",
  ],
  win: [
    "扫出来有奖。你可以直接兑，也可以拿同面值的票，自己选。",
    "这张中了。先把钱记在柜台账上，等你决定收钱还是换票。",
    "有回票钱。别急着全换，中奖不代表下一张更容易中。",
  ],
  exact: [
    "正好回本一张。要不要换同价票都行，不换就拿现金。",
    "中了票面价。很多人这时候会再拿一张，你也可以就此收手。",
  ],
  upsell: [
    "要不要拿张同价的试试？先说好，只从这笔奖金里出，不加预算。",
    "这笔奖金刚好够换一张，不过收进钱包也挺好。",
    "还想玩就按原预算来，别临时往里添。",
  ],
  big: [
    "这个金额店里只负责验票，票先别折，按票背说明去指定地点兑。",
    "先把票收好。金额大了不能在柜台直接付，要带证件去兑奖。",
  ],
};

const STORE_MOODS = [
  "周六傍晚 · 柜台刚送走一位顾客",
  "工作日午后 · 店里只有你和老板",
  "晚饭前 · 两种彩票刚卖掉一截",
  "商场打烊前一小时 · 有些票已经售罄",
];

const MALL_EVENTS = [
  {
    id: "milk-tea",
    time: "17:46",
    title: "先去取刚点好的奶茶",
    scene: "杯壁还挂着水珠，你拎着奶茶重新经过彩票店。",
    ownerLead: "奶茶先放右边，别碰到票。你刚才是不是已经在门口看了一圈？",
  },
  {
    id: "arcade",
    time: "17:51",
    title: "在抓娃娃机旁看一会儿",
    scene: "隔壁电玩区响了几轮庆祝音效，你一只娃娃也没抓到。",
    ownerLead: "抓娃娃也没抓到吧？彩票更不能上头，先把预算说好。",
  },
  {
    id: "supermarket",
    time: "17:48",
    title: "先把超市购物袋寄存",
    scene: "服务台给了你一块寄存牌，双手空出来后轻松多了。",
    ownerLead: "东西寄存好了再刮是对的，票面别被购物袋蹭坏。",
  },
  {
    id: "friend",
    time: "17:44",
    title: "朋友发消息问你在哪",
    scene: "你回了句“负一层随便逛逛”，没有提彩票店。",
    ownerLead: "朋友还在等你？那就少拿几张，刮完别耽误约好的事。",
  },
  {
    id: "queue",
    time: "17:54",
    title: "等前一位顾客验完票",
    scene: "前面的人把一小摞票推过去，机器连续响了几声。",
    ownerLead: "久等了。刚才那一摞有奖没奖都验完了，现在轮到你。",
  },
  {
    id: "rain",
    time: "18:02",
    title: "商场广播说外面下雨了",
    scene: "你暂时不急着走，顺着扶梯口又逛回彩票柜台。",
    ownerLead: "外面正下雨，在店里慢慢看可以，预算还是先定死。",
  },
] as const;

const SCRATCH_TOOLS: ScratchTool[] = [
  { id: "coin", name: "一元硬币", detail: "窄口 · 最细致", width: 17, glyph: "¥1" },
  { id: "small-scraper", name: "小号刮片", detail: "中口 · 日常省力", width: 30, glyph: "S" },
  { id: "wide-scraper", name: "宽口刮铲", detail: "宽口 · 整本效率", width: 48, glyph: "L" },
];

const money = new Intl.NumberFormat("zh-CN");

function formatMoney(value: number) {
  return `¥${money.format(value)}`;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]) {
  return items[randomInt(0, items.length - 1)];
}

function shuffle<T>(items: T[]) {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function weightedPick<T extends { weight: number }>(items: T[]) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function makeWinningNumbers(count: number) {
  return shuffle(Array.from({ length: 50 }, (_, index) => index + 1)).slice(0, count);
}

function makeMatchCells(type: TicketType, prize: number, winningNumbers: number[]) {
  const nonWinning = Array.from({ length: 50 }, (_, index) => index + 1).filter(
    (number) => !winningNumbers.includes(number),
  );
  const cells: TicketCell[] = Array.from({ length: type.opportunities }, () => ({
    label: String(pick(nonWinning)),
    amount: pick(type.prizeTiers.slice(0, 5)).amount,
    kind: "plain",
  }));
  if (prize <= 0) return cells;
  const index = randomInt(0, cells.length - 1);
  const tenfold = type.id === "tenfold" && prize >= 100 && prize % 10 === 0 && Math.random() < 0.24;
  cells[index] = {
    label: tenfold ? "10" : String(pick(winningNumbers)),
    amount: tenfold ? prize / 10 : prize,
    kind: tenfold ? "multiplier" : "winning",
  };
  return cells;
}

function makeSymbolCells(type: TicketType, prize: number) {
  const decoys = type.artSymbols?.length
    ? [...type.artSymbols, "缘", "顺", "安", "乐"]
    : ["福", "缘", "顺", "安", "乐", "和", "春", "满"];
  const cells: TicketCell[] = Array.from({ length: type.opportunities }, () => ({
    label: pick(decoys),
    amount: pick(type.prizeTiers.slice(0, 5)).amount,
    kind: "plain",
  }));
  if (prize <= 0) return cells;
  const index = randomInt(0, cells.length - 1);
  const isMeeting = type.id.startsWith("meeting");
  const isStar = type.id === "star-shine";
  const double = isMeeting && prize % 2 === 0 && Math.random() < 0.2;
  cells[index] = {
    label: double
      ? "囍"
      : isMeeting
        ? "阿喜"
        : isStar
          ? "星星"
          : type.artSymbols?.[0] ?? "好运",
    amount: double ? prize / 2 : prize,
    kind: double ? "multiplier" : "winning",
  };
  return cells;
}

function makeDirectCells(type: TicketType, prize: number) {
  const cells: TicketCell[] = Array.from({ length: type.opportunities }, () => ({
    label: "",
    amount: 0,
    kind: "blank",
  }));
  const luckyWin = type.id === "coast" && prize > 0 && Math.random() < 0.18;
  if (prize > 0 && !luckyWin) {
    cells[randomInt(0, cells.length - 1)] = {
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

function makeComboCells(type: TicketType, prize: number, winningNumbers: number[]) {
  const tripleSymbols = type.artSymbols?.length
    ? [...type.artSymbols, "铜钱"]
    : ["锦鲤", "福袋", "元宝", "莲花", "铜钱"];
  const cells: TicketCell[] = [];
  for (let i = 0; i < 3; i += 1) {
    const symbols = shuffle(tripleSymbols).slice(0, 3);
    cells.push({
      label: symbols.join(" · "),
      amount: pick(type.prizeTiers.slice(0, 5)).amount,
      kind: "plain",
      section: "triple",
    });
  }
  for (let i = 0; i < 5; i += 1) {
    cells.push({
      label: pick(["锦鲤", "福字", "钱币", "如意", "灯笼"]),
      amount: pick(type.prizeTiers.slice(0, 5)).amount,
      kind: "plain",
      section: "instant",
    });
  }
  const nonWinning = Array.from({ length: 50 }, (_, index) => index + 1).filter(
    (number) => !winningNumbers.includes(number),
  );
  for (let i = 0; i < 10; i += 1) {
    cells.push({
      label: String(pick(nonWinning)),
      amount: pick(type.prizeTiers.slice(0, 5)).amount,
      kind: "plain",
      section: "numbers",
    });
  }
  if (prize <= 0) return cells;
  const method = pick(["triple", "instant", "numbers"] as const);
  const candidates = cells
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => cell.section === method);
  const target = pick(candidates).index;
  if (method === "triple") {
    const symbol = pick(tripleSymbols);
    cells[target] = {
      label: `${symbol} · ${symbol} · ${symbol}`,
      amount: prize,
      kind: "winning",
      section: "triple",
    };
  } else if (method === "instant") {
    cells[target] = {
      label: "好运",
      amount: prize,
      kind: "winning",
      section: "instant",
    };
  } else {
    cells[target] = {
      label: String(pick(winningNumbers)),
      amount: prize,
      kind: "winning",
      section: "numbers",
    };
  }
  return cells;
}

function makeTripleCells(type: TicketType, prize: number) {
  const symbols = type.artSymbols?.length ? type.artSymbols : ["7", "星", "钻石", "皇冠"];
  const cells: TicketCell[] = Array.from({ length: type.opportunities }, () => {
    const first = pick(symbols);
    const second = pick(symbols.filter((symbol) => symbol !== first));
    return {
      label: `${first} · ${second} · ${pick(symbols)}`,
      amount: pick(type.prizeTiers.slice(0, 5)).amount,
      kind: "plain",
    };
  });
  if (prize > 0) {
    const index = randomInt(0, cells.length - 1);
    const symbol = pick(symbols);
    cells[index] = {
      label: `${symbol} · ${symbol} · ${symbol}`,
      amount: prize,
      kind: "winning",
    };
  }
  return cells;
}

function makeCompareCells(type: TicketType, prize: number) {
  const cells: TicketCell[] = Array.from({ length: Math.min(type.opportunities, 12) }, () => {
    const mine = randomInt(1, 8);
    const opponent = randomInt(mine + 1, 10);
    return {
      label: `我 ${mine} ｜ 对手 ${opponent}`,
      amount: pick(type.prizeTiers.slice(0, 5)).amount,
      kind: "plain",
    };
  });
  if (prize > 0) {
    const index = randomInt(0, cells.length - 1);
    const opponent = randomInt(1, 7);
    cells[index] = {
      label: `我 ${randomInt(opponent + 1, 10)} ｜ 对手 ${opponent}`,
      amount: prize,
      kind: "winning",
    };
  }
  return cells;
}

function makeAddCells(type: TicketType, prize: number) {
  const cells: TicketCell[] = Array.from({ length: Math.min(type.opportunities, 12) }, () => {
    const left = randomInt(1, 6);
    let right = randomInt(1, 6);
    if (left + right === 7) right = right === 6 ? 5 : right + 1;
    return {
      label: `${left} + ${right}`,
      amount: pick(type.prizeTiers.slice(0, 5)).amount,
      kind: "plain",
    };
  });
  if (prize > 0) {
    const index = randomInt(0, cells.length - 1);
    const left = randomInt(1, 6);
    cells[index] = { label: `${left} + ${7 - left}`, amount: prize, kind: "winning" };
  }
  return cells;
}

function makeGridCells(type: TicketType, prize: number) {
  const symbols = type.artSymbols?.slice(0, 3) ?? ["花", "星", "果"];
  const cells: TicketCell[] = Array.from({ length: 9 }, (_, index) => ({
    label: symbols[(index + Math.floor(index / 3)) % symbols.length],
    amount: index === 8 ? pick(type.prizeTiers.slice(0, 5)).amount : 0,
    kind: "plain",
  }));
  if (prize > 0) {
    const row = randomInt(0, 2);
    const symbol = pick(symbols);
    for (let column = 0; column < 3; column += 1) {
      cells[row * 3 + column] = {
        label: symbol,
        amount: column === 2 ? prize : 0,
        kind: "winning",
      };
    }
  }
  return cells;
}

function makePathCells(type: TicketType, prize: number) {
  const symbols = type.artSymbols?.length ? type.artSymbols : ["起点", "台阶", "云海", "终点"];
  const cells: TicketCell[] = Array.from({ length: Math.min(type.opportunities, 10) }, (_, index) => ({
    label: `${index + 1} · ${pick(symbols)}`,
    amount: 0,
    kind: "plain",
  }));
  if (prize > 0) {
    const index = randomInt(2, cells.length - 1);
    cells[index] = { label: `${index + 1} · 抵达奖位`, amount: prize, kind: "winning" };
  }
  return cells;
}

function makeCells(type: TicketType, prize: number, winningNumbers: number[]) {
  if (type.mode === "direct") return makeDirectCells(type, prize);
  if (type.mode === "symbol") return makeSymbolCells(type, prize);
  if (type.mode === "combo") return makeComboCells(type, prize, winningNumbers);
  if (type.mode === "triple") return makeTripleCells(type, prize);
  if (type.mode === "compare") return makeCompareCells(type, prize);
  if (type.mode === "add") return makeAddCells(type, prize);
  if (type.mode === "grid") return makeGridCells(type, prize);
  if (type.mode === "path") return makePathCells(type, prize);
  return makeMatchCells(type, prize, winningNumbers);
}

function makeBookPrizePool(type: TicketType) {
  const model = type.distribution ?? {
    targetReturn: 0.65,
    smallWinsPerBook: [Math.ceil(type.bookSize * 0.27), Math.ceil(type.bookSize * 0.4)] as [
      number,
      number,
    ],
    hundredEveryBooks: 1.5,
    jackpotEveryBooks: 50_000,
    note: "体验模型",
  };
  const profiles = [
    { value: 0.42, weight: 8 },
    { value: 0.52, weight: 22 },
    { value: 0.62, weight: 34 },
    { value: 0.72, weight: 24 },
    { value: 0.88, weight: 9 },
    { value: 1.16, weight: 3 },
  ];
  const profile = weightedPick(profiles).value;
  const target = Math.max(
    type.price,
    Math.round((type.price * type.bookSize * profile) / type.price) * type.price,
  );
  const winCount = Math.min(
    type.bookSize - 1,
    randomInt(model.smallWinsPerBook[0], model.smallWinsPerBook[1]),
  );
  const prizes = Array.from({ length: winCount }, () => type.price);
  let remaining = Math.max(0, target - winCount * type.price);

  if (Math.random() < 1 / model.hundredEveryBooks && prizes.length > 0) {
    const hundredTier =
      type.prizeTiers.find((tier) => tier.amount >= 100 && tier.amount <= 500)?.amount ?? 100;
    if (hundredTier - type.price <= remaining) {
      prizes[randomInt(0, prizes.length - 1)] = hundredTier;
      remaining -= hundredTier - type.price;
    }
  }

  let guard = 0;
  while (remaining >= type.price && guard < 200 && prizes.length > 0) {
    guard += 1;
    const index = randomInt(0, prizes.length - 1);
    const current = prizes[index];
    const candidates = type.prizeTiers.filter(
      (tier) =>
        tier.amount > current &&
        tier.amount - current <= remaining &&
        tier.amount < type.topPrize &&
        tier.amount <= 1_000,
    );
    if (candidates.length === 0) break;
    const chosen = weightedPick(candidates).amount;
    prizes[index] = chosen;
    remaining -= chosen - current;
  }
  while (prizes.length < type.bookSize) prizes.push(0);

  if (Math.random() < 1 / model.jackpotEveryBooks) {
    const zeroIndex = prizes.findIndex((prize) => prize === 0);
    prizes[zeroIndex >= 0 ? zeroIndex : prizes.length - 1] = type.topPrize;
  }
  return shuffle(prizes);
}

function createBook(type: TicketType): Book {
  const serial = `${String(randomInt(1, 999)).padStart(3, "0")}${String(
    randomInt(1, 999999),
  ).padStart(6, "0")}`;
  const bookId = `${type.id}-${serial}`;
  const prizePool = makeBookPrizePool(type);
  const tickets = prizePool.map((prize, index) => {
    const winningNumbers = makeWinningNumbers(type.mode === "combo" ? 2 : 1);
    return {
      id: `${bookId}-${index + 1}`,
      typeId: type.id,
      bookId,
      bookIndex: index + 1,
      bookSize: type.bookSize,
      prize,
      winningNumbers,
      cells: makeCells(type, prize, winningNumbers),
      validationCode: String(randomInt(1000, 9999)),
    };
  });
  return { id: bookId, typeId: type.id, tickets, cursor: 0 };
}

function ScratchLayer({
  ticketId,
  tool,
  onProgress,
  onComplete,
}: {
  ticketId: string;
  tool: ScratchTool;
  onProgress: (progress: number) => void;
  onComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const movesRef = useRef(0);
  const completedRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onCompleteRef.current = onComplete;
  }, [onComplete, onProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const rect = parent.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#deded8");
    gradient.addColorStop(0.3, "#a6a8a8");
    gradient.addColorStop(0.58, "#d8d7d1");
    gradient.addColorStop(1, "#989b9d");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.fillStyle = "rgba(255,255,255,.4)";
    context.font = "700 12px system-ui";
    context.textAlign = "center";
    for (let y = 22; y < rect.height; y += 42) {
      for (let x = 42; x < rect.width; x += 88) {
        context.fillText("刮 开 区", x, y);
      }
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    movesRef.current = 0;
    completedRef.current = false;
    lastPointRef.current = null;
    onProgressRef.current(0);
  }, [ticketId]);

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let erased = 0;
    let sampled = 0;
    for (let index = 3; index < pixels.length; index += 64) {
      sampled += 1;
      if (pixels[index] < 36) erased += 1;
    }
    const progress = Math.min(100, Math.round((erased / sampled) * 100));
    onProgressRef.current(progress);
    if (progress >= 72 && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current();
    }
  }, []);

  const scratch = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const point = {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
      const previous = lastPointRef.current ?? point;
      context.save();
      context.globalCompositeOperation = "destination-out";
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = tool.width * Math.max(scaleX, scaleY);
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      context.restore();
      lastPointRef.current = point;
      movesRef.current += 1;
      if (movesRef.current % 7 === 0) measure();
    },
    [measure, tool.width],
  );

  return (
    <canvas
      ref={canvasRef}
      className="scratch-layer"
      aria-label={`银色彩票覆盖膜，使用${tool.name}按住并来回刮开`}
      onPointerDown={(event) => {
        drawingRef.current = true;
        lastPointRef.current = null;
        event.currentTarget.setPointerCapture(event.pointerId);
        scratch(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (drawingRef.current) scratch(event.clientX, event.clientY);
      }}
      onPointerUp={() => {
        drawingRef.current = false;
        lastPointRef.current = null;
        measure();
      }}
      onPointerCancel={() => {
        drawingRef.current = false;
        lastPointRef.current = null;
        measure();
      }}
    />
  );
}

function TicketCells({ ticket, type }: { ticket: Ticket; type: TicketType }) {
  if (type.mode === "combo") {
    const titles =
      type.id === "golden-chest"
        ? ["玩法一 · 金额即中", "玩法二 · 两同图符", "宝箱加奖区"]
        : type.id === "big-winner"
          ? ["玩法一 · 奖金即中", "玩法二 · 通吃图符", "号码比对区"]
          : type.id === "luxury-seven"
            ? ["玩法一 · 三同图", "玩法二 · 7倍图符", "数字比对区"]
            : ["玩法一 · 三同图", "玩法二 · 好运图符", "玩法三 · 对数字"];
    const groups = [
      { id: "triple", title: titles[0] },
      { id: "instant", title: titles[1] },
      { id: "numbers", title: titles[2] },
    ] as const;
    return (
      <div className="combo-games">
        {groups.map((group) => (
          <div className={`combo-game combo-${group.id}`} key={group.id}>
            <b>{group.title}</b>
            {group.id === "numbers" && (
              <div className="mini-winning">
                中奖号码 {ticket.winningNumbers.map((number) => <i key={number}>{number}</i>)}
              </div>
            )}
            <div>
              {ticket.cells
                .filter((cell) => cell.section === group.id)
                .map((cell, index) => (
                  <div className="ticket-cell" key={`${group.id}-${index}`}>
                    <span>{cell.label}</span>
                    <strong>{formatMoney(cell.amount)}</strong>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {type.mode === "match" && (
        <div className="winning-row">
          <span>中奖号码</span>
          {ticket.winningNumbers.map((number) => <b key={number}>{number}</b>)}
        </div>
      )}
      <div className="ticket-grid">
        {ticket.cells.filter((cell) => cell.section !== "lucky").map((cell, index) => (
          <div className="ticket-cell" key={`${ticket.id}-${index}`}>
            {type.mode !== "direct" && <span>{cell.label}</span>}
            {cell.amount > 0 && <strong>{formatMoney(cell.amount)}</strong>}
          </div>
        ))}
      </div>
      {type.mode === "direct" && type.id === "coast" && (
        <div className="lucky-play">
          <b>幸运玩法</b>
          <span>
            {ticket.cells.find((cell) => cell.section === "lucky")?.amount
              ? formatMoney(ticket.cells.find((cell) => cell.section === "lucky")!.amount)
              : ""}
          </span>
        </div>
      )}
    </>
  );
}

function TicketFace({
  ticket,
  type,
  tool,
  onProgress,
  onComplete,
}: {
  ticket: Ticket;
  type: TicketType;
  tool: ScratchTool;
  onProgress: (progress: number) => void;
  onComplete: () => void;
}) {
  return (
    <article
      className={`ticket-face ticket-${type.mode} face-${type.id}`}
      style={
        {
          "--ticket-color": type.color,
          "--ticket-ink": type.ink,
          "--ticket-accent": type.accent,
        } as React.CSSProperties
      }
    >
      <div className="ticket-watermark">仿真练习票 · 无兑奖价值</div>
      <div className="ticket-decoration" aria-hidden="true" />
      <div className="ticket-art-motifs" aria-hidden="true">
        {(type.artSymbols ?? []).slice(0, 4).map((symbol) => (
          <span key={symbol}>{symbol}</span>
        ))}
      </div>
      <header className="ticket-head">
        <div>
          <span className="ticket-issuer">{type.issuer} · 原型仿真</span>
          <h2>{type.name}</h2>
          <p>{type.subtitle}</p>
        </div>
        <strong>{formatMoney(type.price)}</strong>
      </header>
      <div className="ticket-rule">
        <b>玩法</b> {type.mechanic}
      </div>
      <div className="scratch-zone">
        <div className="ticket-content">
          <TicketCells ticket={ticket} type={type} />
        </div>
        <ScratchLayer ticketId={ticket.id} tool={tool} onProgress={onProgress} onComplete={onComplete} />
      </div>
      <footer className="ticket-foot">
        <span>保安区刮开无效　▦ {ticket.validationCode}</span>
        <span>
          {ticket.bookId.split("-").at(-1)}-{String(ticket.bookIndex).padStart(3, "0")}
        </span>
      </footer>
    </article>
  );
}

function MallScene({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="mall-scene">
      <div className="mall-sign">B1 · 生活广场</div>
      <div className="mall-ceiling" />
      <div className="passer passer-one" />
      <div className="passer passer-two" />
      <section className="lottery-kiosk" aria-label="商场里的一家彩票店">
        <div className="kiosk-light">幸运彩票站</div>
        <div className="kiosk-window">
          <div className="ticket-wall">
            <span>好运十倍</span>
            <span>喜相逢</span>
            <span>好运来</span>
            <span>一路向海</span>
          </div>
          <div className="owner owner-small"><i /></div>
        </div>
        <div className="kiosk-counter">理性购彩 · 未成年人不得购彩</div>
      </section>
      <section className="mall-intro">
        <span className="eyebrow">周六 · 17:42 · 商场负一层</span>
        <h1>逛着逛着，<br />又看见彩票店了。</h1>
        <p>柜台玻璃上有细小的刮屑。架上的票并不齐，有几格已经空了。</p>
        <button className="primary-action" onClick={onEnter}>
          进去看看 <span>→</span>
        </button>
        <small>非官方彩票产品，不使用真钱，仅模拟线下即开票体验。</small>
      </section>
      <div className="mall-floor" />
    </main>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("mall");
  const [playStyle, setPlayStyle] = useState<PlayStyle>("story");
  const [budgetInput, setBudgetInput] = useState(100);
  const [isAdult, setIsAdult] = useState(false);
  const [initialBudget, setInitialBudget] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [prizeBalance, setPrizeBalance] = useState(0);
  const [cashSpent, setCashSpent] = useState(0);
  const [rolloverSpent, setRolloverSpent] = useState(0);
  const [redeemed, setRedeemed] = useState(0);
  const [paySource, setPaySource] = useState<PaySource>("cash");
  const [ownerLine, setOwnerLine] = useState(pick(DIALOGUE.greeting));
  const [storeMood, setStoreMood] = useState(STORE_MOODS[0]);
  const [scratchQueue, setScratchQueue] = useState<Ticket[]>([]);
  const [scratchIndex, setScratchIndex] = useState(0);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [scratchReady, setScratchReady] = useState(false);
  const [scratchToolId, setScratchToolId] = useState<ScratchToolId>("small-scraper");
  const [bookRequestId, setBookRequestId] = useState(TICKET_TYPES[0].id);
  const [validationQueue, setValidationQueue] = useState<Ticket[]>([]);
  const [lastVerified, setLastVerified] = useState<Ticket[]>([]);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [stock, setStock] = useState<Record<string, PublicStock>>({});
  const [storeTypeIds, setStoreTypeIds] = useState<string[]>(FEATURED_TICKET_IDS);
  const [priceFilter, setPriceFilter] = useState<"all" | 10 | 20 | 30 | 50>("all");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [mallEventOptions, setMallEventOptions] = useState(() =>
    shuffle([...MALL_EVENTS]).slice(0, 3),
  );
  const [storyScene, setStoryScene] = useState("只是路过，老板还不认识你。");
  const [storyTurn, setStoryTurn] = useState(0);
  const openBooksRef = useRef<Record<string, Book[]>>({});
  const sealedBooksRef = useRef<Record<string, number>>({});

  const activeTicket = scratchQueue[scratchIndex];
  const activeType = activeTicket
    ? TICKET_TYPES.find((type) => type.id === activeTicket.typeId)
    : undefined;
  const scratchTool = SCRATCH_TOOLS.find((tool) => tool.id === scratchToolId) ?? SCRATCH_TOOLS[1];
  const storeTypes = useMemo(
    () => TICKET_TYPES.filter((type) => storeTypeIds.includes(type.id)),
    [storeTypeIds],
  );
  const filteredStoreTypes = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    return storeTypes.filter(
      (type) =>
        (priceFilter === "all" || type.price === priceFilter) &&
        (!query ||
          type.name.toLowerCase().includes(query) ||
          type.playFamily?.toLowerCase().includes(query) ||
          type.design.toLowerCase().includes(query)),
    );
  }, [catalogQuery, priceFilter, storeTypes]);

  const addLog = useCallback((label: string, amount: number, tone: SessionLog["tone"]) => {
    setLogs((current) => [
      { id: `${Date.now()}-${Math.random()}`, label, amount, tone },
      ...current,
    ].slice(0, 8));
  }, []);

  const syncStock = useCallback(() => {
    const snapshot = Object.fromEntries(
      TICKET_TYPES.map((type) => {
        const books = openBooksRef.current[type.id] ?? [];
        const remaining = books.reduce(
          (sum, book) => sum + Math.max(0, book.tickets.length - book.cursor),
          0,
        );
        const sealed = sealedBooksRef.current[type.id] ?? 0;
        let tone: StockTone = "open";
        let label = pick(["架上正在卖", "柜台里还有", "今天有人在买"]);
        if (remaining <= 0 && sealed <= 0) {
          tone = "sold";
          label = "这款暂时卖空";
        } else if (remaining <= 2 && sealed <= 0) {
          tone = "last";
          label = "玻璃下只看见几张";
        } else if (remaining <= Math.max(4, Math.floor(type.bookSize * 0.3))) {
          tone = "thin";
          label = "架上看着不多";
        }
        return [
          type.id,
          {
            tone,
            label,
            canSell: remaining > 0,
            hasSealed: sealed > 0,
            openBooks: books.filter((book) => book.cursor < book.tickets.length).length,
            visibleBookIds: books
              .filter((book) => book.cursor < book.tickets.length)
              .slice(0, 4)
              .map((book) => book.id),
          },
        ];
      }),
    );
    setStock(snapshot);
  }, []);

  const internalAvailable = useCallback((type: TicketType) => {
    const open = (openBooksRef.current[type.id] ?? []).reduce(
      (sum, book) => sum + Math.max(0, book.tickets.length - book.cursor),
      0,
    );
    return open + (sealedBooksRef.current[type.id] ?? 0) * type.bookSize;
  }, []);

  const takeFromOpenBooks = useCallback(
    (type: TicketType, count: number, preferredBookId?: string) => {
      if (internalAvailable(type) < count) return null;
      const taken: Ticket[] = [];
      while (taken.length < count) {
        let books = openBooksRef.current[type.id] ?? [];
        let book =
          books.find((candidate) => candidate.id === preferredBookId && candidate.cursor < candidate.tickets.length) ??
          pick(books.filter((candidate) => candidate.cursor < candidate.tickets.length));
        if (!book) {
          const sealed = sealedBooksRef.current[type.id] ?? 0;
          if (sealed <= 0) return null;
          book = createBook(type);
          books = [...books, book];
          openBooksRef.current[type.id] = books;
          sealedBooksRef.current[type.id] = sealed - 1;
        }
        const available = book.tickets.length - book.cursor;
        const amount = Math.min(count - taken.length, available);
        taken.push(...book.tickets.slice(book.cursor, book.cursor + amount));
        const updated = { ...book, cursor: book.cursor + amount };
        openBooksRef.current[type.id] = books.map((candidate) =>
          candidate.id === book.id ? updated : candidate,
        );
        preferredBookId = undefined;
      }
      syncStock();
      return taken;
    },
    [internalAvailable, syncStock],
  );

  const beginScratching = useCallback((tickets: Ticket[]) => {
    setScratchQueue(tickets);
    setScratchIndex(0);
    setScratchPercent(0);
    setScratchReady(false);
    setValidationQueue([]);
    setLastVerified([]);
    setOwnerLine(pick(DIALOGUE.scratch));
    setPhase("scratch");
  }, []);

  const canPay = useCallback(
    (amount: number) => (paySource === "cash" ? wallet >= amount : prizeBalance >= amount),
    [paySource, prizeBalance, wallet],
  );

  const charge = useCallback(
    (amount: number) => {
      if (paySource === "cash") {
        setWallet((value) => value - amount);
        setCashSpent((value) => value + amount);
      } else {
        setPrizeBalance((value) => value - amount);
        setRolloverSpent((value) => value + amount);
      }
    },
    [paySource],
  );

  const buyTickets = useCallback(
    (
      type: TicketType,
      count: number,
      options: { sealedBook?: boolean; preferredBookId?: string; ownerPicked?: boolean } = {},
    ) => {
      const { sealedBook = false, preferredBookId, ownerPicked = false } = options;
      const total = type.price * count;
      if (!canPay(total)) {
        setOwnerLine(
          paySource === "cash"
            ? "你定的预算不够这组票了。少拿几张，别临时往里加钱。"
            : "柜台上这笔奖金不够，换同价或更便宜的票吧。",
        );
        return;
      }
      let tickets: Ticket[] | null = null;
      if (sealedBook) {
        const sealed = sealedBooksRef.current[type.id] ?? 0;
        if (sealed > 0) {
          tickets = createBook(type).tickets;
          sealedBooksRef.current[type.id] = sealed - 1;
          syncStock();
        }
      } else {
        tickets = takeFromOpenBooks(type, count, preferredBookId);
      }
      if (!tickets) {
        setOwnerLine("这款实际剩下的不够你要的张数了。换少一点，或者看看别的票。");
        syncStock();
        return;
      }
      charge(total);
      if (playStyle === "story") setStoryTurn((value) => value + 1);
      addLog(`${sealedBook ? "整本" : `${count}张`} · ${type.name}`, -total, "spend");
      setOwnerLine(
        sealedBook
          ? pick(DIALOGUE.wholeBook)
          : ownerPicked
            ? `我从${stock[type.id]?.openBooks ?? "几"}个开本里随手拿了一摞，没有看号，也没有挑奖。`
          : count >= 5
            ? pick(DIALOGUE.manyBuy)
            : pick(DIALOGUE.smallBuy),
      );
      beginScratching(tickets);
    },
    [
      addLog,
      beginScratching,
      canPay,
      charge,
      paySource,
      playStyle,
      stock,
      syncStock,
      takeFromOpenBooks,
    ],
  );

  const buyBlindBox = useCallback(() => {
    if (!canPay(100)) {
      setOwnerLine("惊喜包固定100元，预算不够就先别拿。");
      return;
    }
    const patterns = [
      [["tenfold", 4], ["meeting-20", 3]],
      [["fortune", 2], ["meeting-20", 2]],
      [["coast", 4], ["meeting-20", 3]],
      [["fortune", 1], ["meeting-20", 2], ["tenfold", 3]],
    ] as const;
    const possible = patterns.filter((pattern) =>
      pattern.every(([id, count]) => {
        const type = TICKET_TYPES.find((item) => item.id === id)!;
        return internalAvailable(type) >= count;
      }),
    );
    if (possible.length === 0) {
      setOwnerLine("今天架上的票凑不出100元惊喜包了。单张挑吧。");
      return;
    }
    const tickets = pick(possible).flatMap(([id, count]) => {
      const type = TICKET_TYPES.find((item) => item.id === id)!;
      return takeFromOpenBooks(type, count) ?? [];
    });
    charge(100);
    addLog("店内100元惊喜包", -100, "spend");
    setOwnerLine("票面正好100元，都是从今天正在卖的开本里拿的，不承诺中奖或保底。");
    beginScratching(shuffle(tickets));
  }, [addLog, beginScratching, canPay, charge, internalAvailable, takeFromOpenBooks]);

  const finishCurrentScratch = useCallback(
    (validateNow: boolean) => {
      if (!activeTicket || !scratchReady) return;
      setValidationQueue((current) =>
        current.some((ticket) => ticket.id === activeTicket.id)
          ? current
          : [...current, activeTicket],
      );
      setLastVerified([]);
      const nextIndex = scratchIndex + 1;
      setScratchIndex(nextIndex);
      setScratchPercent(0);
      setScratchReady(false);
      if (validateNow || nextIndex >= scratchQueue.length) {
        setOwnerLine("票递过来吧。我刮保安区，再用机器扫一下才算正式核验。");
        setPhase("validation");
      } else {
        setOwnerLine(pick(DIALOGUE.scratch));
      }
    },
    [activeTicket, scratchIndex, scratchQueue.length, scratchReady],
  );

  const validateAtCounter = useCallback(() => {
    if (validationQueue.length === 0) return;
    const total = validationQueue.reduce((sum, ticket) => sum + ticket.prize, 0);
    setLastVerified(validationQueue);
    setValidationQueue([]);
    if (playStyle === "story") setStoryTurn((value) => value + 1);
    if (total > 0) {
      setPrizeBalance((value) => value + total);
      validationQueue.forEach((ticket) => {
        const type = TICKET_TYPES.find((item) => item.id === ticket.typeId)!;
        addLog(`${type.name} · 机器验票`, ticket.prize, ticket.prize > 0 ? "win" : "info");
      });
      const exact = validationQueue.length === 1 && total === TICKET_TYPES.find(
        (type) => type.id === validationQueue[0].typeId,
      )?.price;
      setOwnerLine(
        total >= 10_000
          ? pick(DIALOGUE.big)
          : exact
            ? pick(DIALOGUE.exact)
            : `${pick(DIALOGUE.win)} ${Math.random() < 0.45 ? pick(DIALOGUE.upsell) : ""}`,
      );
    } else {
      validationQueue.forEach((ticket) => {
        const type = TICKET_TYPES.find((item) => item.id === ticket.typeId)!;
        addLog(`${type.name} · 机器验票`, 0, "info");
      });
      setOwnerLine(pick(DIALOGUE.noPrize));
    }
  }, [addLog, playStyle, validationQueue]);

  const redeemAll = useCallback(() => {
    if (prizeBalance <= 0) return;
    setWallet((value) => value + prizeBalance);
    setRedeemed((value) => value + prizeBalance);
    addLog("奖金兑成模拟现金", prizeBalance, "win");
    setOwnerLine(`给你兑了${formatMoney(prizeBalance)}。现金收好，别把它又全放回去。`);
    setPrizeBalance(0);
    setPaySource("cash");
  }, [addLog, prizeBalance]);

  const returnFromValidation = useCallback(() => {
    if (scratchIndex < scratchQueue.length) {
      setOwnerLine(pick(DIALOGUE.scratch));
      setPhase("scratch");
    } else {
      setScratchQueue([]);
      setScratchIndex(0);
      setPhase("shop");
    }
  }, [scratchIndex, scratchQueue.length]);

  const startSession = useCallback(() => {
    if (!isAdult || budgetInput < 5) return;
    setInitialBudget(budgetInput);
    setWallet(budgetInput);
    setStoreMood(pick(STORE_MOODS));
    const balanced = [10, 20, 30, 50]
      .map((price) => pick(TICKET_TYPES.filter((type) => type.price === price)))
      .filter(Boolean);
    const chosenTypes = [
      ...TICKET_TYPES.filter((type) => FEATURED_TICKET_IDS.includes(type.id)),
      ...balanced,
      ...shuffle(TICKET_TYPES),
    ]
      .filter(
        (type, index, values) => values.findIndex((candidate) => candidate.id === type.id) === index,
      )
      .slice(0, 14);
    const chosenIds = chosenTypes.map((type) => type.id);
    setStoreTypeIds(chosenIds);
    setBookRequestId(chosenIds[0] ?? TICKET_TYPES[0].id);
    let availableCount = 0;
    TICKET_TYPES.forEach((type) => {
      const inStock = chosenIds.includes(type.id) && Math.random() > 0.12;
      if (inStock) {
        const openBookCount = randomInt(2, 4);
        openBooksRef.current[type.id] = Array.from({ length: openBookCount }, () => {
          const book = createBook(type);
          book.cursor = randomInt(1, Math.max(1, type.bookSize - 5));
          return book;
        });
        sealedBooksRef.current[type.id] = Math.random() > 0.35 ? randomInt(1, 3) : 0;
        availableCount += 1;
      } else {
        openBooksRef.current[type.id] = [];
        sealedBooksRef.current[type.id] = 0;
      }
    });
    if (availableCount < 8) {
      chosenTypes.slice(0, 8).forEach((type) => {
        if ((openBooksRef.current[type.id] ?? []).length === 0) {
          openBooksRef.current[type.id] = Array.from({ length: 2 }, () => {
            const book = createBook(type);
            book.cursor = randomInt(2, Math.max(2, type.bookSize - 7));
            return book;
          });
        }
      });
    }
    syncStock();
    setMallEventOptions(shuffle([...MALL_EVENTS]).slice(0, 3));
    setStoryTurn(0);
    setStoryScene("你在商场负一层多逛了一会儿，又绕回彩票柜台。");
    setOwnerLine(`${pick(DIALOGUE.greeting)} 你今天就按${formatMoney(budgetInput)}封顶。`);
    setPhase(playStyle === "story" ? "wandering" : "shop");
  }, [budgetInput, isAdult, playStyle, syncStock]);

  const resetGame = useCallback(() => {
    openBooksRef.current = {};
    sealedBooksRef.current = {};
    setPhase("mall");
    setBudgetInput(100);
    setIsAdult(false);
    setInitialBudget(0);
    setWallet(0);
    setPrizeBalance(0);
    setCashSpent(0);
    setRolloverSpent(0);
    setRedeemed(0);
    setPaySource("cash");
    setScratchQueue([]);
    setScratchIndex(0);
    setScratchPercent(0);
    setScratchReady(false);
    setValidationQueue([]);
    setLastVerified([]);
    setLogs([]);
    setStock({});
    setPlayStyle("story");
    setStoreTypeIds(FEATURED_TICKET_IDS);
    setPriceFilter("all");
    setCatalogQuery("");
    setMallEventOptions(shuffle([...MALL_EVENTS]).slice(0, 3));
    setStoryScene("只是路过，老板还不认识你。");
    setStoryTurn(0);
    setOwnerLine(pick(DIALOGUE.greeting));
  }, []);

  const sessionNet = wallet + prizeBalance - initialBudget;
  const totalStake = cashSpent + rolloverSpent;
  const validationTotal = lastVerified.reduce((sum, ticket) => sum + ticket.prize, 0);
  const requestedBookType =
    TICKET_TYPES.find((type) => type.id === bookRequestId) ?? TICKET_TYPES[0];
  const requestedBookStock = stock[requestedBookType.id];
  const stats = useMemo(
    () => [
      { label: "手上现金", value: formatMoney(wallet) },
      { label: "已验未兑", value: formatMoney(prizeBalance) },
      { label: "累计票款", value: formatMoney(totalStake) },
      { label: "本次盈亏", value: `${sessionNet >= 0 ? "+" : "−"}${formatMoney(Math.abs(sessionNet))}` },
    ],
    [prizeBalance, sessionNet, totalStake, wallet],
  );

  if (phase === "mall") return <MallScene onEnter={() => setPhase("budget")} />;

  if (phase === "budget") {
    return (
      <main className="budget-screen">
        <section className="budget-card">
          <span className="counter-number">4410 2638</span>
          <div className="owner owner-large"><i /></div>
          <div className="speech speech-budget">
            <small>老板</small>
            <p>{pick(["先问一句：成年了吗？今天准备拿多少玩？", "身份证不用掏，先确认你满18了。预算打算定多少？"])}</p>
          </div>
          <div className="budget-content">
            <span className="eyebrow">进店先定上限</span>
            <h1>今天最多花多少？</h1>
            <p>只使用这笔模拟现金。花完不会自动充值，中奖也要先验票才能使用。</p>
            <div className="play-style-picker">
              <button
                className={playStyle === "story" ? "selected" : ""}
                onClick={() => setPlayStyle("story")}
              >
                <b>逛街剧情模式</b>
                <span>先在商场走一段，再进店；本地对白，0 Token</span>
              </button>
              <button
                className={playStyle === "quick" ? "selected" : ""}
                onClick={() => setPlayStyle("quick")}
              >
                <b>快速进店</b>
                <span>跳过额外剧情，直接选票刮奖</span>
              </button>
              <button className="llm-disabled" disabled>
                <b>大模型闲聊 · 暂不接入</b>
                <span>估算每局约 0.8–2 万输入 Token，还需要安全后端</span>
              </button>
            </div>
            <div className="budget-presets">
              {[50, 100, 300, 600].map((value) => (
                <button
                  key={value}
                  className={budgetInput === value ? "selected" : ""}
                  onClick={() => setBudgetInput(value)}
                >
                  {formatMoney(value)}
                  {value === 600 && <small>常见整本价位</small>}
                </button>
              ))}
            </div>
            <label className="custom-budget">
              自定预算
              <span>
                ¥
                <input
                  min={5}
                  max={10000}
                  step={5}
                  type="number"
                  value={budgetInput}
                  onChange={(event) => setBudgetInput(Number(event.target.value))}
                />
              </span>
            </label>
            <label className="adult-check">
              <input
                type="checkbox"
                checked={isAdult}
                onChange={(event) => setIsAdult(event.target.checked)}
              />
              <span>我已年满18周岁，并理解这里没有真钱和真实兑奖</span>
            </label>
            <button
              className="primary-action full"
              disabled={!isAdult || budgetInput < 5}
              onClick={startSession}
            >
              就用 {formatMoney(budgetInput)} <span>→</span>
            </button>
            <button className="text-action" onClick={() => setPhase("mall")}>先不玩，回商场</button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === "wandering") {
    return (
      <main className="wandering-screen">
        <section className="wandering-card">
          <header>
            <span className="eyebrow">逛街剧情模式 · 本地运行 · 0 Token</span>
            <h1>还没急着进店。<br />你在负一层又走了一圈。</h1>
            <p>选择一段刚刚发生的小事。它只影响进店情境和老板对白，不会改变任何彩票结果。</p>
          </header>
          <div className="mall-event-list">
            {mallEventOptions.map((event) => (
              <button
                key={event.id}
                onClick={() => {
                  setStoryScene(event.scene);
                  setStoryTurn(1);
                  setOwnerLine(`${event.ownerLead} ${pick(DIALOGUE.greeting)}`);
                  setStoreMood(`${event.time} · ${event.scene}`);
                  setPhase("shop");
                }}
              >
                <span>{event.time}</span>
                <b>{event.title}</b>
                <small>{event.scene}</small>
              </button>
            ))}
          </div>
          <button
            className="text-action"
            onClick={() => {
              setStoryScene("你没有继续闲逛，直接推开了彩票店的玻璃门。");
              setOwnerLine(`${pick(DIALOGUE.greeting)} 先定预算，别临时加。`);
              setPhase("shop");
            }}
          >
            改主意了，直接进店
          </button>
        </section>
      </main>
    );
  }

  if (phase === "scratch" && activeTicket && activeType) {
    return (
      <main className="scratch-screen">
        <header className="scratch-topbar">
          <span className="back-link">票已付款 · 先刮完再离桌</span>
          <div className="scratch-progress">
            <span>第 {scratchIndex + 1} 张 / 共 {scratchQueue.length} 张</span>
            <i style={{ width: `${scratchPercent}%` }} />
          </div>
          <strong>待验票 {validationQueue.length} 张</strong>
        </header>
        <section className="scratch-stage">
          <div className="counter-dialogue compact">
            <div className="owner owner-medium"><i /></div>
            <div className="speech">
              <small>老板</small>
              <p>{ownerLine}</p>
            </div>
          </div>
          <TicketFace
            ticket={activeTicket}
            type={activeType}
            tool={scratchTool}
            onProgress={setScratchPercent}
            onComplete={() => setScratchReady(true)}
          />
          <div className="scratch-actions scratch-actions-v2">
            <div className="scratch-toolbox" aria-label="选择刮奖工具">
              <span>桌上的工具</span>
              <div>
                {SCRATCH_TOOLS.map((tool) => (
                  <button
                    className={scratchToolId === tool.id ? "active" : ""}
                    key={tool.id}
                    onClick={() => setScratchToolId(tool.id)}
                    aria-pressed={scratchToolId === tool.id}
                  >
                    <i>{tool.glyph}</i>
                    <b>{tool.name}</b>
                    <small>{tool.detail}</small>
                  </button>
                ))}
              </div>
            </div>
            {!scratchReady ? (
              <>
                <div className="scratch-meter" aria-label={`已刮开 ${scratchPercent}%`}>
                  <i style={{ width: `${scratchPercent}%` }} />
                </div>
                <p>
                  按住{scratchTool.name}来回移动。还要刮开 {Math.max(0, 72 - scratchPercent)}%
                  才能送去验票；票面不会替你圈出中奖位置。
                </p>
              </>
            ) : (
              <>
                <div className="ready-chip">玩法区已基本露出 · 结果尚未核验</div>
                {scratchIndex < scratchQueue.length - 1 && (
                  <button className="secondary-action" onClick={() => finishCurrentScratch(false)}>
                    放旁边，刮下一张
                  </button>
                )}
                <button className="primary-action" onClick={() => finishCurrentScratch(true)}>
                  拿给老板验票 <span>→</span>
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    );
  }

  if (phase === "validation") {
    const queued = validationQueue.length;
    const hasResult = lastVerified.length > 0;
    return (
      <main className="validation-screen">
        <section className="validation-counter">
          <div className="scanner">
            <div className="scanner-light" />
            <span>即开票验奖终端</span>
            <b>{hasResult ? "核验完成" : "等待扫描"}</b>
          </div>
          <div className="validation-owner">
            <div className="owner owner-large"><i /></div>
            <div className="speech">
              <small>老板</small>
              <p>{ownerLine}</p>
            </div>
          </div>
          {!hasResult ? (
            <div className="validation-pending">
              <span>{queued} 张票放在柜台上</span>
              <h1>自己看出来的不算，<br />机器验过才结算。</h1>
              <p>老板会刮开保安区并扫描验奖码。模拟器到这一步才把奖金计入“已验未兑”。</p>
              <button className="primary-action" disabled={queued === 0} onClick={validateAtCounter}>
                请老板逐张验票 <span>▦</span>
              </button>
            </div>
          ) : (
            <div className="validation-result">
              <span className="eyebrow">机器核验结果</span>
              <h1>{validationTotal > 0 ? `共中 ${formatMoney(validationTotal)}` : "这批没有中奖"}</h1>
              <div className="verified-list">
                {lastVerified.map((ticket) => {
                  const type = TICKET_TYPES.find((item) => item.id === ticket.typeId)!;
                  return (
                    <div key={ticket.id}>
                      <span>{type.name} · {String(ticket.bookIndex).padStart(3, "0")}</span>
                      <strong>{ticket.prize > 0 ? formatMoney(ticket.prize) : "未中奖"}</strong>
                    </div>
                  );
                })}
              </div>
              <div className="validation-actions">
                {prizeBalance > 0 && (
                  <button className="secondary-action" onClick={redeemAll}>兑成模拟现金</button>
                )}
                <button className="primary-action" onClick={returnFromValidation}>
                  {scratchIndex < scratchQueue.length ? "回桌继续刮" : "回柜台选票"} <span>→</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (phase === "summary") {
    return (
      <main className="summary-screen">
        <section className="receipt">
          <div className="receipt-top">
            <span>幸运彩票站 · 模拟小票</span>
            <strong>本次体验结束</strong>
          </div>
          <div className="summary-hero">
            <span className="eyebrow">离店结算</span>
            <h1>{sessionNet >= 0 ? "今天手气不错。" : "今天就到这里。"}</h1>
            <p>
              初始预算 {formatMoney(initialBudget)}，累计购买 {formatMoney(totalStake)}，
              {prizeBalance > 0 ? ` 已验未兑 ${formatMoney(prizeBalance)}。` : ` 已兑回 ${formatMoney(redeemed)}。`}
            </p>
          </div>
          <div className="receipt-grid">
            {stats.map((stat) => (
              <div key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
          <div className="receipt-note">
            <b>老板说</b>
            <p>{sessionNet >= 0 ? "有赚就收挺好。下次逛到再来，不用专门追着玩。" : "彩票就是消遣，没中也别追。商场还没逛完呢。"}</p>
          </div>
          <div className="summary-actions">
            {prizeBalance > 0 && <button className="secondary-action" onClick={redeemAll}>把奖金收进钱包</button>}
            <button className="primary-action" onClick={resetGame}>重新逛一次 <span>↻</span></button>
          </div>
          <small className="receipt-disclaimer">非官方产品 · 不涉及真实资金 · 票面仅作玩法仿真</small>
        </section>
      </main>
    );
  }

  return (
    <main className="shop-screen">
      <header className="shop-header">
        <div>
          <span className="eyebrow">{storeMood}</span>
          <h1>柜台今天不是满货。</h1>
          {playStyle === "story" && (
            <div className="story-status">本地剧情 · 0 Token · 情境第 {storyTurn} 段</div>
          )}
        </div>
        <div className="session-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <span>{stat.label}</span>
              <strong className={stat.label === "本次盈亏" && sessionNet < 0 ? "negative" : ""}>
                {stat.value}
              </strong>
            </div>
          ))}
        </div>
      </header>
      <section className="shop-body">
        <aside className="counter-panel">
          <div className="counter-dialogue">
            <div className="owner owner-large"><i /></div>
            <div className="speech">
              <small>老板</small>
              <p>{ownerLine}</p>
            </div>
          </div>
          {playStyle === "story" && (
            <div className="story-memory">
              <b>刚才在商场</b>
              <p>{storyScene}</p>
              <small>这段记忆只用于选择对白，不参与出票和验奖。</small>
            </div>
          )}
          <div className="pay-panel">
            <span>这次用什么付款？</span>
            <div>
              <button className={paySource === "cash" ? "active" : ""} onClick={() => setPaySource("cash")}>
                现金 {formatMoney(wallet)}
              </button>
              <button
                className={paySource === "prize" ? "active" : ""}
                disabled={prizeBalance <= 0}
                onClick={() => setPaySource("prize")}
              >
                奖金换票 {formatMoney(prizeBalance)}
              </button>
            </div>
            {prizeBalance > 0 && <button className="redeem-link" onClick={redeemAll}>不换票，直接兑奖收钱</button>}
          </div>
          <div className="book-request-panel">
            <span className="section-label">整本不摆在单张货架上</span>
            <p>想买未拆封整本，要单独问老板去柜子里找。</p>
            <select
              value={bookRequestId}
              onChange={(event) => setBookRequestId(event.target.value)}
              aria-label="选择想询问的整本彩票"
            >
              {storeTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} · {formatMoney(type.price * type.bookSize)}
                </option>
              ))}
            </select>
            <button
              disabled={
                !requestedBookStock?.hasSealed ||
                !canPay(requestedBookType.price * requestedBookType.bookSize)
              }
              onClick={() =>
                buyTickets(requestedBookType, requestedBookType.bookSize, { sealedBook: true })
              }
            >
              {requestedBookStock?.hasSealed ? "问老板拿一整本" : "老板说暂时没有密封本"}
            </button>
          </div>
          <div className="session-log">
            <div className="section-label">刚才发生的事</div>
            {logs.length === 0 ? (
              <p className="empty-log">还没买票。柜台边放着硬币和装刮屑的纸杯。</p>
            ) : (
              logs.slice(0, 5).map((log) => (
                <div className={`log-row ${log.tone}`} key={log.id}>
                  <span>{log.label}</span>
                  <strong>{log.amount === 0 ? "—" : `${log.amount > 0 ? "+" : "−"}${formatMoney(Math.abs(log.amount))}`}</strong>
                </div>
              ))
            )}
          </div>
          <button className="leave-button" onClick={() => setPhase("summary")}>收手，离开彩票店</button>
        </aside>
        <section className="ticket-shelf">
          <div className="shelf-head">
            <div>
              <span className="section-label">玻璃柜里能看到的票</span>
              <p>
                同一票种可能同时拆着几个开本。你能从柜台露出的几张里挑，也可以让老板随手拿；
                看不见每个开本还剩多少张。
              </p>
            </div>
            <span className="model-badge">总票库 {CATALOG_SIZE} 款 · 今日上架 {storeTypes.length} 款</span>
          </div>
          <div className="catalog-controls">
            <label>
              <span>找票</span>
              <input
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                placeholder="票名、玩法或图案"
              />
            </label>
            <div aria-label="按面值筛选">
              {(["all", 10, 20, 30, 50] as const).map((price) => (
                <button
                  className={priceFilter === price ? "active" : ""}
                  key={price}
                  onClick={() => setPriceFilter(price)}
                >
                  {price === "all" ? "全部" : `${price}元`}
                </button>
              ))}
            </div>
          </div>
          <div className="ticket-products">
            {filteredStoreTypes.map((type) => {
              const available = paySource === "cash" ? wallet : prizeBalance;
              const itemStock = stock[type.id] ?? {
                tone: "sold" as const,
                label: "老板还没理货",
                canSell: false,
                hasSealed: false,
                openBooks: 0,
                visibleBookIds: [],
              };
              return (
                <article
                  className={`product-card product-${type.id} stock-${itemStock.tone}`}
                  key={type.id}
                  style={
                    {
                      "--ticket-color": type.color,
                      "--ticket-ink": type.ink,
                      "--ticket-accent": type.accent,
                    } as React.CSSProperties
                  }
                >
                  <div className="product-ticket">
                    <span>{type.issuer}</span>
                    <h2>{type.name}</h2>
                    <p>{type.subtitle}</p>
                    <strong>{formatMoney(type.price)}</strong>
                    <i>最高 {formatMoney(type.topPrize)}</i>
                    <em>
                      {type.opportunityLabel ?? `${type.opportunities}次机会`} · {type.prizeTierCount}个奖级
                      {type.playFamily ? ` · ${type.playFamily}` : ""}
                    </em>
                  </div>
                  <div className="product-detail">
                    <div className={`stock-badge ${itemStock.tone}`}>{itemStock.label}</div>
                    <p>{type.mechanic}</p>
                    <div className="design-note">{type.design}</div>
                    {type.distribution && (
                      <div className="distribution-note">
                        <b>{type.evidence ?? "规则资料"} · 整本体验模型</b>
                        <span>
                          一般每本约 {type.distribution.smallWinsPerBook[0]}–
                          {type.distribution.smallWinsPerBook[1]} 张中小奖
                        </span>
                        <span>
                          百元档约每 {type.distribution.hundredEveryBooks} 本出现 1 张
                        </span>
                        <small>
                          头奖尾部约 {money.format(type.distribution.jackpotEveryBooks)} 本 1 张；
                          不是官方逐本承诺
                        </small>
                      </div>
                    )}
                    <div className="loose-ticket-picks">
                      <span>自己从露出的单张里挑</span>
                      <div>
                        {itemStock.visibleBookIds.map((bookId, index) => (
                          <button
                            key={bookId}
                            disabled={available < type.price}
                            onClick={() =>
                              buyTickets(type, 1, { preferredBookId: bookId })
                            }
                          >
                            {["左边", "中间", "右边", "下层"][index]}
                            <small>开本 {index + 1}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="quantity-actions owner-picks">
                      {[1, 3, 5].map((count) => (
                        <button
                          key={count}
                          disabled={!itemStock.canSell || available < type.price * count}
                          onClick={() => buyTickets(type, count, { ownerPicked: true })}
                        >
                          老板拿{count}张
                          <small>{formatMoney(type.price * count)}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
            <article className="product-card blind-box-card">
              <div className="blind-visual">
                <span>部分门店自配</span>
                <h2>100元<br />惊喜包</h2>
                <p>票种随机 · 总面值固定</p>
              </div>
              <div className="product-detail">
                <p>从今天实际在卖的开本里组合，票面总值正好100元；没有官方“盲盒票种”或中奖保证。</p>
                <div className="blind-note">如果现有零票凑不齐100元，老板会直接告诉你今天没法配。</div>
                <button className="primary-action full" disabled={!canPay(100)} onClick={buyBlindBox}>
                  问一个惊喜包 <span>{formatMoney(100)}</span>
                </button>
              </div>
            </article>
          </div>
        </section>
      </section>
      <footer className="shop-footer">
        <span>18+</span>
        <p>票种名称、公开玩法与票面结构来自真实产品资料；本模拟不复制验奖系统，也不预测真实彩票。</p>
        <button onClick={() => setOwnerLine("流水号只是生产和物流管理信息。正规的即开票没有可利用的中奖编号规律。")}>
          问老板：编号能看出奖吗？
        </button>
      </footer>
    </main>
  );
}
