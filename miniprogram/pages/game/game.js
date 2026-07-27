/* global Page, wx */
/* eslint-disable @typescript-eslint/no-require-imports */

const { TICKET_TYPES, CATALOG_SIZE } = require("../../shared/ticket-catalog.js");
const { makeBookPrizePool } = require("../../shared/prize-model.js");
const { evaluateVisiblePrize, makeTicketOutcome } = require("../../shared/ticket-engine.js");

const SCRATCH_COMPLETION = 80;
const FEATURED_IDS = [
  "tenfold",
  "meeting-20",
  "fortune",
  "coast",
  "lucky-6688",
  "three-yuan",
];

const SCRATCH_TOOLS = [
  { id: "coin", name: "一元硬币", detail: "最细致", width: 17, mark: "¥1" },
  { id: "scraper", name: "小号刮片", detail: "日常省力", width: 30, mark: "S" },
  { id: "wide", name: "宽口刮铲", detail: "整本效率", width: 48, mark: "L" },
];

const DIALOGUE = {
  greeting: [
    "先随便看。架上的票有的已经卖掉半本了。",
    "硬币在纸杯旁边，今天有几款票刚好缺货。",
    "先定预算，花到数就停。想买整本要单独问我。",
  ],
  buy: [
    "从正在卖的开本里顺着拿，流水号不代表中奖规律。",
    "票拿好，刮玩法区就行，保安区等验票时再开。",
    "慢慢刮，别一上来把票面刮破了。",
  ],
  scratch: [
    "覆盖膜要来回刮，露清楚以后再拿来验票。",
    "票面不会替你圈中奖位置，先自己按规则找。",
    "刮屑往一边扫，信息都露出来才算刮完。",
  ],
  noPrize: [
    "机器没报码，这批没有。别因为刚没中就追。",
    "没有奖。预算别动，想收手随时都可以。",
  ],
  win: [
    "机器验出来有奖。可以收进模拟钱包，也可以留着换票。",
    "有回票钱。先记在柜台账上，是否继续你自己定。",
  ],
};

const GLYPH_MAP = {
  元宝: "g-ingot",
  铜钱: "g-ingot",
  金币: "g-ingot",
  金砖: "g-ingot",
  现金: "g-ingot",
  喜鹊: "g-magpie",
  仙鹤: "g-magpie",
  鸳鸯: "g-magpie",
  祥云: "g-cloud",
  云海: "g-cloud",
  灯笼: "g-lantern",
  灯彩: "g-lantern",
  福袋: "g-bag",
  钱袋: "g-bag",
  中国结: "g-knot",
  同心结: "g-knot",
  锦鲤: "g-koi",
  宝箱: "g-chest",
  钥匙: "g-chest",
  钻石: "g-diamond",
  宝石: "g-diamond",
  宝珠: "g-diamond",
  玉石: "g-diamond",
  戒指: "g-diamond",
  皇冠: "g-crown",
  王冠: "g-crown",
  星: "g-star",
  星星: "g-star",
  星光: "g-star",
  星芒: "g-star",
  星云: "g-star",
  光束: "g-star",
  山峰: "g-mountain",
  雪山: "g-mountain",
  山河: "g-mountain",
  竹叶: "g-bamboo",
  叶片: "g-bamboo",
  新芽: "g-bamboo",
  芝麻花: "g-bamboo",
  雪花: "g-snow",
  足球: "g-football",
  球门: "g-football",
  球衣: "g-trophy",
  奖杯: "g-trophy",
  奖牌: "g-trophy",
  海浪: "g-wave",
  公路: "g-wave",
  路线图: "g-wave",
  椰树: "g-palm",
  骏马: "g-horse",
  蘑菇: "g-bamboo",
  篮子: "g-bag",
  莲花: "g-lotus",
  牡丹: "g-lotus",
  花朵: "g-lotus",
  团花: "g-lotus",
};

const PRINTED_MARKS = new Set([
  "阿喜",
  "囍",
  "喜",
  "福",
  "戏",
  "顺",
  "发",
  "体彩",
  "成功",
  "大吉",
  "头彩",
  "好运",
  "中华",
  "红",
  "十",
  "20X",
  "10×",
  "7×",
]);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[randomInt(0, items.length - 1)];
}

function shuffle(items) {
  const clone = items.slice();
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const value = clone[index];
    clone[index] = clone[swapIndex];
    clone[swapIndex] = value;
  }
  return clone;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function formatMoney(value) {
  const digits = String(Math.max(0, Math.trunc(Number(value) || 0)));
  return `¥${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function typeById(typeId) {
  return TICKET_TYPES.find((type) => type.id === typeId);
}

function createBook(type) {
  const serial = `${String(randomInt(1, 999)).padStart(3, "0")}${String(
    randomInt(1, 999999),
  ).padStart(6, "0")}`;
  const id = `${type.id}-${serial}`;
  const tickets = makeBookPrizePool(type).map((intendedPrize, index) => {
    const outcome = makeTicketOutcome(type, intendedPrize);
    return {
      id: `${id}-${index + 1}`,
      typeId: type.id,
      bookId: id,
      bookIndex: index + 1,
      bookSize: type.bookSize,
      prize: outcome.visiblePrize,
      winningNumbers: outcome.winningNumbers,
      cells: outcome.cells,
      validationCode: String(randomInt(1000, 9999)),
    };
  });
  return { id, typeId: type.id, tickets, cursor: 0 };
}

function isPrintedMark(label) {
  return (
    PRINTED_MARKS.has(label) ||
    /^\d+$/.test(label) ||
    /^\d+\s*\+\s*\d+$/.test(label) ||
    /^我\s+\d+\s+｜\s+对手\s+\d+$/.test(label) ||
    /^\d+\s+·\s+/.test(label)
  );
}

function decoratePart(part) {
  const glyph = GLYPH_MAP[part];
  return {
    label: part,
    glyph: glyph || "",
    text: !glyph || isPrintedMark(part),
  };
}

function decorateCell(cell, index) {
  return {
    id: `${cell.section || "main"}-${index}`,
    label: cell.label,
    amount: cell.amount,
    amountText: cell.amount > 0 ? formatMoney(cell.amount) : "",
    section: cell.section || "main",
    parts: cell.label
      ? cell.label.split(" · ").map((part, partIndex) => ({
          ...decoratePart(part),
          id: `${index}-${partIndex}`,
        }))
      : [],
  };
}

function comboTitles(type) {
  if (type.id === "golden-chest") return ["金额即中", "两同图符", "宝箱加奖"];
  if (type.id === "big-winner") return ["奖金即中", "通吃图符", "号码比对"];
  if (type.id === "luxury-seven") return ["三同图", "7倍图符", "数字比对"];
  if (type.id === "peaceful-harvest") return ["丰收图符", "三同金额", "五谷奖符"];
  if (type.id === "lucky-123" || type.id === "sprout") {
    return ["三同图符", "金额即中", "号码比对"];
  }
  if (type.id === "head-start-2026") return ["金额即中", "收藏区", "号码 / 头彩"];
  if (type.id === "new-year-luck-2026") return ["金额即中", "插画区", "号码 / 倍数"];
  return ["三同图", "好运图符", "号码比对"];
}

function prepareTicketView(ticket, type) {
  const cells = ticket.cells.map(decorateCell);
  const groups = [];
  if (type.mode === "combo") {
    const titles = comboTitles(type);
    ["triple", "instant", "numbers"].forEach((section, index) => {
      if (
        ["head-start-2026", "new-year-luck-2026"].includes(type.id) &&
        section === "instant"
      ) {
        return;
      }
      groups.push({
        id: section,
        title: titles[index],
        showWinningNumbers: section === "numbers",
        cells: cells.filter((cell) => cell.section === section),
      });
    });
  }
  return {
    id: ticket.id,
    name: type.name,
    subtitle: type.subtitle,
    issuer: type.issuer,
    priceText: formatMoney(type.price),
    mechanic: type.mechanic,
    color: type.color,
    ink: type.ink,
    accent: type.accent,
    mode: type.mode,
    isCombo: type.mode === "combo",
    showWinningNumbers: type.mode === "match",
    winningNumbers: ticket.winningNumbers,
    normalCells: cells.filter((cell) => cell.section !== "lucky"),
    luckyCell: cells.find((cell) => cell.section === "lucky") || null,
    groups,
    validationCode: ticket.validationCode,
    serialText: `${ticket.bookId.split("-").slice(-1)[0]}-${String(ticket.bookIndex).padStart(
      3,
      "0",
    )}`,
  };
}

function makeStoreCard(type, stock) {
  return {
    id: type.id,
    name: type.name,
    subtitle: type.subtitle,
    issuer: type.issuer,
    price: type.price,
    priceText: formatMoney(type.price),
    bookPriceText: formatMoney(type.price * type.bookSize),
    topPrizeText: formatMoney(type.topPrize),
    mechanic: type.mechanic,
    playFamily: type.playFamily,
    opportunities: type.opportunities,
    color: type.color,
    ink: type.ink,
    accent: type.accent,
    stockLabel: stock.label,
    stockTone: stock.tone,
    canSell: stock.canSell,
    hasSealed: stock.hasSealed,
    openBooks: stock.openBooks,
    visibleBookIds: stock.visibleBookIds.map((bookId, index) => ({
      id: bookId,
      label: ["左边", "中间", "右边", "下层"][index] || `开本${index + 1}`,
    })),
    motifs: (type.artSymbols || []).slice(0, 3).map((part, index) => ({
      ...decoratePart(part),
      id: `${type.id}-motif-${index}`,
    })),
  };
}

Page({
  data: {
    phase: "mall",
    catalogSize: CATALOG_SIZE,
    budget: 100,
    budgetValid: true,
    adult: false,
    wallet: 0,
    prizeBalance: 0,
    paySource: "cash",
    ownerLine: DIALOGUE.greeting[0],
    storeMood: "商场负一层 · 周六傍晚",
    priceFilter: "all",
    searchQuery: "",
    storeCards: [],
    visibleCards: [],
    bookOptions: [],
    bookRequestId: "",
    scratchTools: SCRATCH_TOOLS,
    scratchToolId: "scraper",
    scratchToolName: "小号刮片",
    scratchPercent: 0,
    scratchReady: false,
    scratchIndexText: "",
    validationQueueCount: 0,
    activeTicket: null,
    validationHasResult: false,
    validationTotal: 0,
    validationTotalText: "¥0",
    verifiedTickets: [],
    stats: {
      initialBudget: 0,
      cashSpent: 0,
      rolloverSpent: 0,
      redeemed: 0,
    },
    summary: {},
  },

  onLoad() {
    this._openBooks = {};
    this._sealedBooks = {};
    this._scratchQueue = [];
    this._scratchIndex = 0;
    this._validationQueue = [];
    this._selectedTypes = [];
    this._canvas = null;
    this._context = null;
    this._canvasRect = null;
    this._drawing = false;
    this._lastPoint = null;
    this._scratchMoves = 0;
    this._scratchedCells = new Set();
    this._scratchGrid = null;
    const savedTool = wx.getStorageSync("scratch-lottery-tool");
    const tool = SCRATCH_TOOLS.find((item) => item.id === savedTool) || SCRATCH_TOOLS[1];
    this.setData({ scratchToolId: tool.id, scratchToolName: tool.name });
  },

  enterShop() {
    this.setData({
      phase: "budget",
      ownerLine: pick([
        "先问一句：成年了吗？今天准备拿多少玩？",
        "确认满18岁，再把今天的上限定下来。",
      ]),
    });
  },

  backToMall() {
    this.setData({ phase: "mall" });
  },

  setBudgetPreset(event) {
    const budget = Number(event.currentTarget.dataset.value);
    this.setData({ budget, budgetValid: this.isValidBudget(budget) });
  },

  onBudgetInput(event) {
    const budget = Number(event.detail.value);
    this.setData({ budget, budgetValid: this.isValidBudget(budget) });
  },

  onAdultChange(event) {
    this.setData({ adult: Boolean(event.detail.value) });
  },

  isValidBudget(value) {
    return Number.isSafeInteger(value) && value >= 5 && value <= 10000 && value % 5 === 0;
  },

  startSession() {
    const budget = Number(this.data.budget);
    if (!this.data.adult || !this.isValidBudget(budget)) return;
    wx.showLoading({ title: "老板正在理货", mask: true });
    setTimeout(() => {
      try {
        const balanced = [5, 10, 20, 30, 50]
          .map((price) => pick(TICKET_TYPES.filter((type) => type.price === price)))
          .filter(Boolean);
        this._selectedTypes = uniqueById([
          ...FEATURED_IDS.map(typeById),
          ...balanced,
          ...shuffle(TICKET_TYPES),
        ]).slice(0, 14);
        this._openBooks = {};
        this._sealedBooks = {};
        this._selectedTypes.forEach((type) => {
          const inStock = Math.random() > 0.12;
          if (!inStock) {
            this._openBooks[type.id] = [];
            this._sealedBooks[type.id] = 0;
            return;
          }
          this._openBooks[type.id] = Array.from({ length: 2 }, () => {
            const book = createBook(type);
            book.cursor = randomInt(1, Math.max(1, type.bookSize - 5));
            return book;
          });
          this._sealedBooks[type.id] = Math.random() > 0.35 ? randomInt(1, 2) : 0;
        });
        this._stats = {
          initialBudget: budget,
          cashSpent: 0,
          rolloverSpent: 0,
          redeemed: 0,
        };
        this.setData({
          phase: "shop",
          wallet: budget,
          prizeBalance: 0,
          paySource: "cash",
          stats: this._stats,
          ownerLine: `${pick(DIALOGUE.greeting)} 今天就按${formatMoney(budget)}封顶。`,
          storeMood: pick([
            "周六傍晚 · 柜台刚送走一位顾客",
            "工作日午后 · 店里只有你和老板",
            "晚饭前 · 两款票刚卖掉一截",
          ]),
          bookRequestId: this._selectedTypes[0] ? this._selectedTypes[0].id : "",
        });
        this.refreshStock();
      } finally {
        wx.hideLoading();
      }
    }, 20);
  },

  stockFor(type) {
    const books = this._openBooks[type.id] || [];
    const remaining = books.reduce(
      (sum, book) => sum + Math.max(0, book.tickets.length - book.cursor),
      0,
    );
    const sealed = this._sealedBooks[type.id] || 0;
    let tone = "open";
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
    return {
      tone,
      label,
      canSell: remaining > 0,
      hasSealed: sealed > 0,
      openBooks: books.filter((book) => book.cursor < book.tickets.length).length,
      visibleBookIds: books
        .filter((book) => book.cursor < book.tickets.length)
        .slice(0, 4)
        .map((book) => book.id),
    };
  },

  refreshStock() {
    const storeCards = this._selectedTypes.map((type) => makeStoreCard(type, this.stockFor(type)));
    const bookOptions = storeCards.map((card) => ({
      id: card.id,
      label: `${card.name} · ${card.bookPriceText}`,
      disabled: !card.hasSealed,
    }));
    this.setData({ storeCards, bookOptions }, () => this.applyCatalogFilter());
  },

  onSearchInput(event) {
    this.setData({ searchQuery: event.detail.value }, () => this.applyCatalogFilter());
  },

  setPriceFilter(event) {
    this.setData({ priceFilter: String(event.currentTarget.dataset.price) }, () =>
      this.applyCatalogFilter(),
    );
  },

  applyCatalogFilter() {
    const query = String(this.data.searchQuery || "").trim().toLowerCase();
    const price = this.data.priceFilter;
    const visibleCards = this.data.storeCards.filter(
      (card) =>
        (price === "all" || String(card.price) === price) &&
        (!query ||
          card.name.toLowerCase().includes(query) ||
          card.playFamily.toLowerCase().includes(query) ||
          card.mechanic.toLowerCase().includes(query)),
    );
    this.setData({ visibleCards });
  },

  onBookRequestChange(event) {
    const option = this.data.bookOptions[Number(event.detail.value)];
    if (option) this.setData({ bookRequestId: option.id });
  },

  setPaySource(event) {
    const source = event.currentTarget.dataset.source;
    if (source === "prize" && this.data.prizeBalance <= 0) return;
    this.setData({ paySource: source });
  },

  availableBalance() {
    return this.data.paySource === "cash" ? this.data.wallet : this.data.prizeBalance;
  },

  internalAvailable(type) {
    const open = (this._openBooks[type.id] || []).reduce(
      (sum, book) => sum + Math.max(0, book.tickets.length - book.cursor),
      0,
    );
    return open + (this._sealedBooks[type.id] || 0) * type.bookSize;
  },

  takeFromOpenBooks(type, count, preferredBookId) {
    if (this.internalAvailable(type) < count) return null;
    const taken = [];
    while (taken.length < count) {
      let books = this._openBooks[type.id] || [];
      let book =
        books.find(
          (candidate) =>
            candidate.id === preferredBookId && candidate.cursor < candidate.tickets.length,
        ) || pick(books.filter((candidate) => candidate.cursor < candidate.tickets.length));
      if (!book) {
        const sealed = this._sealedBooks[type.id] || 0;
        if (sealed <= 0) return null;
        book = createBook(type);
        books.push(book);
        this._openBooks[type.id] = books;
        this._sealedBooks[type.id] = sealed - 1;
      }
      const amount = Math.min(count - taken.length, book.tickets.length - book.cursor);
      taken.push(...book.tickets.slice(book.cursor, book.cursor + amount));
      book.cursor += amount;
      preferredBookId = "";
    }
    return taken;
  },

  buyLoose(event) {
    const type = typeById(event.currentTarget.dataset.typeId);
    if (!type) return;
    this.buyTickets(type, 1, {
      preferredBookId: event.currentTarget.dataset.bookId,
      ownerPicked: false,
    });
  },

  buyOwnerPick(event) {
    const type = typeById(event.currentTarget.dataset.typeId);
    const count = Number(event.currentTarget.dataset.count);
    if (!type || !Number.isSafeInteger(count)) return;
    this.buyTickets(type, count, { ownerPicked: true });
  },

  buyWholeBook() {
    const type = typeById(this.data.bookRequestId);
    if (!type) return;
    this.buyTickets(type, type.bookSize, { sealedBook: true });
  },

  buyTickets(type, count, options) {
    const settings = options || {};
    const total = type.price * count;
    if (this.availableBalance() < total) {
      this.setData({
        ownerLine:
          this.data.paySource === "cash"
            ? "预算不够这组票了。少拿几张，别临时加钱。"
            : "这笔奖金不够，换同价或更便宜的票吧。",
      });
      return;
    }
    let tickets = null;
    if (settings.sealedBook) {
      const sealed = this._sealedBooks[type.id] || 0;
      if (sealed > 0) {
        tickets = createBook(type).tickets;
        this._sealedBooks[type.id] = sealed - 1;
      }
    } else {
      tickets = this.takeFromOpenBooks(type, count, settings.preferredBookId);
    }
    if (!tickets) {
      this.setData({ ownerLine: "实际剩下的不够你要的张数了，换少一点或看看别的票。" });
      this.refreshStock();
      return;
    }
    this.charge(total);
    this.setData({
      ownerLine: settings.sealedBook
        ? "密封整本当面拆。整本也不代表保本，票按流水号排好。"
        : settings.ownerPicked
          ? "我从开着的几本里随手拿，没有看号，也没有挑奖。"
          : pick(DIALOGUE.buy),
    });
    this.refreshStock();
    this.beginScratching(tickets);
  },

  charge(amount) {
    if (this.data.paySource === "cash") {
      this._stats.cashSpent += amount;
      this.setData({
        wallet: this.data.wallet - amount,
        stats: this._stats,
      });
    } else {
      this._stats.rolloverSpent += amount;
      this.setData({
        prizeBalance: this.data.prizeBalance - amount,
        stats: this._stats,
      });
    }
  },

  beginScratching(tickets) {
    this._scratchQueue = tickets;
    this._scratchIndex = 0;
    this._validationQueue = [];
    this.showActiveTicket();
  },

  showActiveTicket() {
    const ticket = this._scratchQueue[this._scratchIndex];
    const type = ticket ? typeById(ticket.typeId) : null;
    if (!ticket || !type) return;
    this.setData(
      {
        phase: "scratch",
        activeTicket: prepareTicketView(ticket, type),
        scratchPercent: 0,
        scratchReady: false,
        scratchIndexText: `第 ${this._scratchIndex + 1} 张 / 共 ${this._scratchQueue.length} 张`,
        validationQueueCount: this._validationQueue.length,
        ownerLine: pick(DIALOGUE.scratch),
      },
      () => this.initScratchCanvas(),
    );
  },

  selectScratchTool(event) {
    const id = event.currentTarget.dataset.id;
    const tool = SCRATCH_TOOLS.find((item) => item.id === id);
    if (!tool) return;
    wx.setStorageSync("scratch-lottery-tool", id);
    this.setData({ scratchToolId: id, scratchToolName: tool.name });
  },

  initScratchCanvas() {
    const query = wx.createSelectorQuery().in(this);
    query.select("#scratch-canvas").fields({ node: true, size: true });
    query.select("#scratch-canvas").boundingClientRect();
    query.exec((results) => {
      const canvasResult = results[0];
      const rect = results[1];
      if (!canvasResult || !canvasResult.node || !rect) {
        wx.showToast({ title: "Canvas 初始化失败", icon: "none" });
        return;
      }
      const canvas = canvasResult.node;
      const context = canvas.getContext("2d");
      const system = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const dpr = system.pixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(canvasResult.width * dpr));
      canvas.height = Math.max(1, Math.floor(canvasResult.height * dpr));
      context.scale(dpr, dpr);
      const gradient = context.createLinearGradient(0, 0, canvasResult.width, canvasResult.height);
      gradient.addColorStop(0, "#deded8");
      gradient.addColorStop(0.3, "#a6a8a8");
      gradient.addColorStop(0.58, "#d8d7d1");
      gradient.addColorStop(1, "#929698");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvasResult.width, canvasResult.height);
      context.fillStyle = "rgba(255,255,255,.42)";
      context.font = "700 12px sans-serif";
      context.textAlign = "center";
      for (let y = 22; y < canvasResult.height; y += 42) {
        for (let x = 42; x < canvasResult.width; x += 88) {
          context.fillText("刮 开 区", x, y);
        }
      }
      this._canvas = canvas;
      this._context = context;
      this._canvasRect = rect;
      this._canvasCssSize = { width: canvasResult.width, height: canvasResult.height };
      this._drawing = false;
      this._lastPoint = null;
      this._scratchMoves = 0;
      this._scratchedCells = new Set();
      const cellSize = 12;
      this._scratchGrid = {
        cellSize,
        columns: Math.ceil(canvasResult.width / cellSize),
        rows: Math.ceil(canvasResult.height / cellSize),
      };
    });
  },

  onScratchStart(event) {
    this._drawing = true;
    this._lastPoint = null;
    this.eraseAtTouch(event);
  },

  onScratchMove(event) {
    if (this._drawing) this.eraseAtTouch(event);
  },

  onScratchEnd() {
    this._drawing = false;
    this._lastPoint = null;
    this.updateScratchProgress();
  },

  eraseAtTouch(event) {
    if (!this._context || !this._canvasRect || !event.touches || !event.touches[0]) return;
    const touch = event.touches[0];
    const point = {
      x: Number.isFinite(touch.x) ? touch.x : touch.clientX - this._canvasRect.left,
      y: Number.isFinite(touch.y) ? touch.y : touch.clientY - this._canvasRect.top,
    };
    const previous = this._lastPoint || point;
    const tool =
      SCRATCH_TOOLS.find((item) => item.id === this.data.scratchToolId) || SCRATCH_TOOLS[1];
    const context = this._context;
    context.save();
    context.globalCompositeOperation = "destination-out";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = tool.width;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.restore();
    this.markScratchCoverage(previous, point, tool.width / 2);
    this._lastPoint = point;
    this._scratchMoves += 1;
    if (this._scratchMoves % 5 === 0) this.updateScratchProgress();
  },

  markScratchCoverage(from, to, radius) {
    if (!this._scratchGrid) return;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / (this._scratchGrid.cellSize / 2)));
    for (let step = 0; step <= steps; step += 1) {
      const ratio = step / steps;
      const x = from.x + (to.x - from.x) * ratio;
      const y = from.y + (to.y - from.y) * ratio;
      const minColumn = Math.max(
        0,
        Math.floor((x - radius) / this._scratchGrid.cellSize),
      );
      const maxColumn = Math.min(
        this._scratchGrid.columns - 1,
        Math.floor((x + radius) / this._scratchGrid.cellSize),
      );
      const minRow = Math.max(0, Math.floor((y - radius) / this._scratchGrid.cellSize));
      const maxRow = Math.min(
        this._scratchGrid.rows - 1,
        Math.floor((y + radius) / this._scratchGrid.cellSize),
      );
      for (let row = minRow; row <= maxRow; row += 1) {
        for (let column = minColumn; column <= maxColumn; column += 1) {
          const centerX = (column + 0.5) * this._scratchGrid.cellSize;
          const centerY = (row + 0.5) * this._scratchGrid.cellSize;
          if (Math.hypot(centerX - x, centerY - y) <= radius) {
            this._scratchedCells.add(`${column}:${row}`);
          }
        }
      }
    }
  },

  updateScratchProgress() {
    if (!this._scratchGrid || this.data.scratchReady) return;
    const total = this._scratchGrid.columns * this._scratchGrid.rows;
    const progress = Math.min(100, Math.round((this._scratchedCells.size / total) * 100));
    if (progress >= SCRATCH_COMPLETION) {
      if (this._context && this._canvasCssSize) {
        this._context.clearRect(0, 0, this._canvasCssSize.width, this._canvasCssSize.height);
      }
      this.setData({ scratchPercent: 100, scratchReady: true });
    } else {
      this.setData({ scratchPercent: progress });
    }
  },

  finishCurrentScratch(event) {
    if (!this.data.scratchReady) return;
    const ticket = this._scratchQueue[this._scratchIndex];
    if (ticket && !this._validationQueue.some((item) => item.id === ticket.id)) {
      this._validationQueue.push(ticket);
    }
    this._scratchIndex += 1;
    const validateNow =
      event.currentTarget.dataset.action === "validate" ||
      this._scratchIndex >= this._scratchQueue.length;
    if (validateNow) {
      this.setData({
        phase: "validation",
        validationQueueCount: this._validationQueue.length,
        validationHasResult: false,
        verifiedTickets: [],
        ownerLine: "票递过来吧。我刮保安区，再用机器扫一下才算正式核验。",
      });
    } else {
      this.showActiveTicket();
    }
  },

  validateAtCounter() {
    if (this._validationQueue.length === 0) return;
    const verified = this._validationQueue.map((ticket) => {
      const type = typeById(ticket.typeId);
      if (!type) throw new Error(`验票时找不到票种：${ticket.typeId}`);
      const visiblePrize = evaluateVisiblePrize(type, ticket.winningNumbers, ticket.cells);
      if (visiblePrize !== ticket.prize) {
        throw new Error(
          `${type.name} 票面/购买记录不一致：${visiblePrize} != ${ticket.prize}`,
        );
      }
      return {
        id: ticket.id,
        name: type.name,
        serial: String(ticket.bookIndex).padStart(3, "0"),
        prize: visiblePrize,
        prizeText: visiblePrize > 0 ? formatMoney(visiblePrize) : "未中奖",
      };
    });
    const total = verified.reduce((sum, ticket) => sum + ticket.prize, 0);
    this._validationQueue = [];
    this.setData({
      validationQueueCount: 0,
      validationHasResult: true,
      validationTotal: total,
      validationTotalText: formatMoney(total),
      verifiedTickets: verified,
      prizeBalance: this.data.prizeBalance + total,
      ownerLine: total > 0 ? pick(DIALOGUE.win) : pick(DIALOGUE.noPrize),
    });
  },

  returnFromValidation() {
    if (this._scratchIndex < this._scratchQueue.length) {
      this.showActiveTicket();
    } else {
      this._scratchQueue = [];
      this._scratchIndex = 0;
      this.setData({ phase: "shop", activeTicket: null });
    }
  },

  redeemAll() {
    const amount = this.data.prizeBalance;
    if (amount <= 0) return;
    const nextWallet = this.data.wallet + amount;
    const net = nextWallet - this._stats.initialBudget;
    this._stats.redeemed += amount;
    const nextData = {
      wallet: nextWallet,
      prizeBalance: 0,
      paySource: "cash",
      stats: this._stats,
      ownerLine: `给你兑了${formatMoney(amount)}模拟现金。收好，别又全放回去。`,
    };
    if (this.data.phase === "summary") {
      nextData.summary = {
        ...this.data.summary,
        walletText: formatMoney(nextWallet),
        pendingText: formatMoney(0),
        netText: `${net >= 0 ? "+" : "−"}${formatMoney(Math.abs(net))}`,
        positive: net >= 0,
      };
    }
    this.setData(nextData);
  },

  leaveShop() {
    const stake = this._stats.cashSpent + this._stats.rolloverSpent;
    const net = this.data.wallet + this.data.prizeBalance - this._stats.initialBudget;
    this.setData({
      phase: "summary",
      summary: {
        budgetText: formatMoney(this._stats.initialBudget),
        stakeText: formatMoney(stake),
        walletText: formatMoney(this.data.wallet),
        pendingText: formatMoney(this.data.prizeBalance),
        netText: `${net >= 0 ? "+" : "−"}${formatMoney(Math.abs(net))}`,
        positive: net >= 0,
      },
    });
  },

  resetGame() {
    this._openBooks = {};
    this._sealedBooks = {};
    this._scratchQueue = [];
    this._validationQueue = [];
    this.setData({
      phase: "mall",
      adult: false,
      wallet: 0,
      prizeBalance: 0,
      storeCards: [],
      visibleCards: [],
      activeTicket: null,
      validationHasResult: false,
      ownerLine: DIALOGUE.greeting[0],
    });
  },
});
