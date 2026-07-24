"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Phase = "mall" | "budget" | "shop" | "scratch" | "summary";
type PlayMode = "amount" | "match" | "symbols" | "hybrid";
type PaySource = "cash" | "prize";

type PrizeBand = {
  amount: number;
  probability: number;
};

type TicketType = {
  id: string;
  name: string;
  subtitle: string;
  issuer: "福彩风格" | "体彩风格";
  price: number;
  bookSize: number;
  topPrize: number;
  mode: PlayMode;
  mechanic: string;
  color: string;
  ink: string;
  accent: string;
  prizeBands: PrizeBand[];
};

type TicketCell = {
  label: string;
  amount: number;
  kind: "plain" | "match" | "bonus" | "decoy";
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
};

type Book = {
  id: string;
  typeId: string;
  tickets: Ticket[];
  cursor: number;
};

type SessionLog = {
  id: string;
  label: string;
  amount: number;
  tone: "spend" | "win" | "info";
};

const TICKET_TYPES: TicketType[] = [
  {
    id: "little-luck",
    name: "好运小满",
    subtitle: "三格漫画票",
    issuer: "体彩风格",
    price: 5,
    bookSize: 120,
    topPrize: 100_000,
    mode: "amount",
    mechanic: "刮出奖金标志，所见即所得，奖金兼中兼得",
    color: "#f5d76e",
    ink: "#4f2b18",
    accent: "#e94b35",
    prizeBands: [
      { amount: 5, probability: 0.19 },
      { amount: 10, probability: 0.06 },
      { amount: 20, probability: 0.025 },
      { amount: 50, probability: 0.012 },
      { amount: 100, probability: 0.003 },
      { amount: 500, probability: 0.0004 },
      { amount: 5_000, probability: 0.00002 },
      { amount: 100_000, probability: 0.000001 },
    ],
  },
  {
    id: "tenfold",
    name: "好运十倍",
    subtitle: "经典对数字",
    issuer: "福彩风格",
    price: 10,
    bookSize: 50,
    topPrize: 400_000,
    mode: "match",
    mechanic: "我的号码对上中奖号码即中奖；刮出“10×”奖金翻十倍",
    color: "#d9392f",
    ink: "#fff8df",
    accent: "#ffd45a",
    prizeBands: [
      { amount: 10, probability: 0.2 },
      { amount: 20, probability: 0.06 },
      { amount: 50, probability: 0.025 },
      { amount: 100, probability: 0.008 },
      { amount: 500, probability: 0.0008 },
      { amount: 5_000, probability: 0.00008 },
      { amount: 400_000, probability: 0.000001 },
    ],
  },
  {
    id: "horse",
    name: "马到功成",
    subtitle: "符号寻宝票",
    issuer: "体彩风格",
    price: 20,
    bookSize: 30,
    topPrize: 1_000_000,
    mode: "symbols",
    mechanic: "出现马标志中得奖金；祥云翻倍；“功成”赢取全区奖金",
    color: "#1c5d74",
    ink: "#f7ead0",
    accent: "#f28d52",
    prizeBands: [
      { amount: 20, probability: 0.18 },
      { amount: 40, probability: 0.07 },
      { amount: 100, probability: 0.03 },
      { amount: 200, probability: 0.01 },
      { amount: 500, probability: 0.002 },
      { amount: 1_000, probability: 0.0005 },
      { amount: 10_000, probability: 0.00004 },
      { amount: 1_000_000, probability: 0.0000002 },
    ],
  },
  {
    id: "grand",
    name: "商场大满贯",
    subtitle: "双区复合票",
    issuer: "体彩风格",
    price: 50,
    bookSize: 12,
    topPrize: 1_000_000,
    mode: "hybrid",
    mechanic: "奖金标志直接中；号码匹配中对应奖金；奖杯标志可翻倍",
    color: "#532971",
    ink: "#fff5dd",
    accent: "#f4b63e",
    prizeBands: [
      { amount: 50, probability: 0.18 },
      { amount: 100, probability: 0.07 },
      { amount: 200, probability: 0.025 },
      { amount: 500, probability: 0.008 },
      { amount: 1_000, probability: 0.002 },
      { amount: 5_000, probability: 0.0003 },
      { amount: 10_000, probability: 0.00015 },
      { amount: 100_000, probability: 0.00001 },
      { amount: 1_000_000, probability: 0.000001 },
    ],
  },
];

const money = new Intl.NumberFormat("zh-CN");

function formatMoney(value: number) {
  return `¥${money.format(value)}`;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]) {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function drawPrize(type: TicketType) {
  const roll = Math.random();
  let cursor = 0;
  for (const band of type.prizeBands) {
    cursor += band.probability;
    if (roll < cursor) return band.amount;
  }
  return 0;
}

function makeWinningNumbers() {
  return shuffle(Array.from({ length: 30 }, (_, index) => index + 1)).slice(0, 3);
}

function makeCells(type: TicketType, prize: number, winningNumbers: number[]) {
  const count = type.mode === "symbols" ? 20 : type.mode === "hybrid" ? 16 : 10;
  const nonWinningNumbers = Array.from({ length: 30 }, (_, index) => index + 1).filter(
    (number) => !winningNumbers.includes(number),
  );
  const cells: TicketCell[] = Array.from({ length: count }, () => ({
    label:
      type.mode === "symbols"
        ? shuffle(["元宝", "灯笼", "如意", "铜钱", "福袋"])[0]
        : String(nonWinningNumbers[randomInt(0, nonWinningNumbers.length - 1)]),
    amount: shuffle([type.price, type.price * 2, type.price * 5, type.price * 10])[0],
    kind: "decoy",
  }));

  if (prize <= 0) return cells;

  const winningIndex = randomInt(0, cells.length - 1);
  if (type.mode === "match") {
    const useTenfold = prize >= type.price * 10 && prize % 10 === 0 && Math.random() < 0.24;
    cells[winningIndex] = {
      label: useTenfold ? "10×" : String(winningNumbers[0]),
      amount: useTenfold ? prize / 10 : prize,
      kind: useTenfold ? "bonus" : "match",
    };
  } else if (type.mode === "symbols") {
    const useDouble = prize % 2 === 0 && Math.random() < 0.25;
    cells[winningIndex] = {
      label: useDouble ? "祥云×2" : "骏马",
      amount: useDouble ? prize / 2 : prize,
      kind: useDouble ? "bonus" : "match",
    };
  } else if (type.mode === "hybrid") {
    const direct = Math.random() < 0.5;
    cells[winningIndex] = {
      label: direct ? "奖金" : String(winningNumbers[0]),
      amount: prize,
      kind: direct ? "bonus" : "match",
    };
  } else {
    cells[winningIndex] = {
      label: "奖金",
      amount: prize,
      kind: "bonus",
    };
  }

  return cells;
}

function createBook(type: TicketType): Book {
  const serial = `${new Date().getFullYear()}${String(randomInt(1, 999999)).padStart(6, "0")}`;
  const bookId = `${type.id}-${serial}`;
  const tickets = Array.from({ length: type.bookSize }, (_, index) => {
    const prize = drawPrize(type);
    const winningNumbers = makeWinningNumbers();
    return {
      id: `${bookId}-${index + 1}`,
      typeId: type.id,
      bookId,
      bookIndex: index + 1,
      bookSize: type.bookSize,
      prize,
      winningNumbers,
      cells: makeCells(type, prize, winningNumbers),
    };
  });
  return { id: bookId, typeId: type.id, tickets, cursor: 0 };
}

function ScratchLayer({ revealed, onReveal }: { revealed: boolean; onReveal: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const movesRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const paint = () => {
      const rect = parent.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * scale));
      canvas.height = Math.max(1, Math.floor(rect.height * scale));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      const gradient = context.createLinearGradient(0, 0, rect.width, rect.height);
      gradient.addColorStop(0, "#d7d7d2");
      gradient.addColorStop(0.48, "#9b9d9e");
      gradient.addColorStop(1, "#c8c7c2");
      context.fillStyle = gradient;
      context.fillRect(0, 0, rect.width, rect.height);
      context.fillStyle = "rgba(255,255,255,.45)";
      context.font = "700 13px system-ui";
      context.textAlign = "center";
      for (let y = 25; y < rect.height; y += 48) {
        for (let x = 40; x < rect.width; x += 96) {
          context.fillText("刮 开 区", x, y);
        }
      }
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [revealed]);

  const scratch = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      context.save();
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.arc(
        (clientX - rect.left) * scaleX,
        (clientY - rect.top) * scaleY,
        26 * Math.max(scaleX, scaleY),
        0,
        Math.PI * 2,
      );
      context.fill();
      context.restore();
      movesRef.current += 1;
      if (movesRef.current > 38) onReveal();
    },
    [onReveal],
  );

  if (revealed) return null;

  return (
    <canvas
      ref={canvasRef}
      className="scratch-layer"
      aria-label="彩票覆盖膜，用鼠标或手指来回刮开"
      onPointerDown={(event) => {
        drawingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        scratch(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (drawingRef.current) scratch(event.clientX, event.clientY);
      }}
      onPointerUp={() => {
        drawingRef.current = false;
      }}
      onPointerCancel={() => {
        drawingRef.current = false;
      }}
    />
  );
}

function TicketFace({
  ticket,
  type,
  revealed,
  onReveal,
}: {
  ticket: Ticket;
  type: TicketType;
  revealed: boolean;
  onReveal: () => void;
}) {
  return (
    <article
      className={`ticket-face ticket-${type.mode}`}
      style={
        {
          "--ticket-color": type.color,
          "--ticket-ink": type.ink,
          "--ticket-accent": type.accent,
        } as React.CSSProperties
      }
    >
      <div className="ticket-watermark">仅供模拟 · 无兑奖价值</div>
      <header className="ticket-head">
        <div>
          <span className="ticket-issuer">{type.issuer}</span>
          <h2>{type.name}</h2>
          <p>{type.subtitle}</p>
        </div>
        <strong>{formatMoney(type.price)}</strong>
      </header>

      <div className="ticket-rule">{type.mechanic}</div>

      {type.mode !== "amount" && (
        <div className="winning-row">
          <span>中奖号码</span>
          {ticket.winningNumbers.map((number) => (
            <b key={number}>{number}</b>
          ))}
        </div>
      )}

      <div className="scratch-zone">
        <div className="ticket-grid">
          {ticket.cells.map((cell, index) => (
            <div className={`ticket-cell cell-${cell.kind}`} key={`${ticket.id}-${index}`}>
              <span>{cell.label}</span>
              <strong>{formatMoney(cell.amount)}</strong>
            </div>
          ))}
        </div>
        <ScratchLayer revealed={revealed} onReveal={onReveal} />
      </div>

      <footer className="ticket-foot">
        <span>流水号 {ticket.bookId.split("-").at(-1)}</span>
        <span>
          {String(ticket.bookIndex).padStart(3, "0")}/{String(ticket.bookSize).padStart(3, "0")}
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
            <span>5元</span>
            <span>10元</span>
            <span>20元</span>
            <span>50元</span>
          </div>
          <div className="owner owner-small">
            <i />
          </div>
        </div>
        <div className="kiosk-counter">理性购彩 · 未成年人不得购彩</div>
      </section>
      <section className="mall-intro">
        <span className="eyebrow">周六 · 17:42 · 商场负一层</span>
        <h1>逛着逛着，<br />又看见彩票店了。</h1>
        <p>奶茶还没喝完。玻璃柜里新到了一批票，老板正把一整本拆开摆上架。</p>
        <button className="primary-action" onClick={onEnter}>
          进去看看 <span>→</span>
        </button>
        <small>本游戏不连接真实彩票、不使用真钱，仅模拟即开票体验。</small>
      </section>
      <div className="mall-floor" />
    </main>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("mall");
  const [budgetInput, setBudgetInput] = useState(100);
  const [isAdult, setIsAdult] = useState(false);
  const [initialBudget, setInitialBudget] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [prizeBalance, setPrizeBalance] = useState(0);
  const [cashSpent, setCashSpent] = useState(0);
  const [rolloverSpent, setRolloverSpent] = useState(0);
  const [redeemed, setRedeemed] = useState(0);
  const [paySource, setPaySource] = useState<PaySource>("cash");
  const [ownerLine, setOwnerLine] = useState("欢迎，随便看看。新到的票都在架上。");
  const [scratchQueue, setScratchQueue] = useState<Ticket[]>([]);
  const [scratchIndex, setScratchIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [inventoryRemaining, setInventoryRemaining] = useState<Record<string, number>>({});
  const [countedTicketIds, setCountedTicketIds] = useState<Set<string>>(new Set());
  const booksRef = useRef<Record<string, Book>>({});

  const activeTicket = scratchQueue[scratchIndex];
  const activeType = activeTicket
    ? TICKET_TYPES.find((type) => type.id === activeTicket.typeId)
    : undefined;

  const addLog = useCallback((label: string, amount: number, tone: SessionLog["tone"]) => {
    setLogs((current) => [
      { id: `${Date.now()}-${Math.random()}`, label, amount, tone },
      ...current,
    ].slice(0, 8));
  }, []);

  const getOpenBook = useCallback((type: TicketType) => {
    let book = booksRef.current[type.id];
    if (!book || book.cursor >= book.tickets.length) {
      book = createBook(type);
      booksRef.current[type.id] = book;
    }
    return book;
  }, []);

  const syncInventory = useCallback(() => {
    setInventoryRemaining(
      Object.fromEntries(
        TICKET_TYPES.map((type) => {
          const book = booksRef.current[type.id];
          return [type.id, book ? book.tickets.length - book.cursor : type.bookSize];
        }),
      ),
    );
  }, []);

  const takeFromOpenBooks = useCallback(
    (type: TicketType, count: number) => {
      const taken: Ticket[] = [];
      while (taken.length < count) {
        const book = getOpenBook(type);
        const available = book.tickets.length - book.cursor;
        const take = Math.min(count - taken.length, available);
        taken.push(...book.tickets.slice(book.cursor, book.cursor + take));
        book.cursor += take;
      }
      syncInventory();
      return taken;
    },
    [getOpenBook, syncInventory],
  );

  const beginScratching = useCallback((tickets: Ticket[]) => {
    setScratchQueue(tickets);
    setScratchIndex(0);
    setRevealed(false);
    setPhase("scratch");
  }, []);

  const canPay = useCallback(
    (amount: number) => (paySource === "cash" ? wallet >= amount : prizeBalance >= amount),
    [paySource, wallet, prizeBalance],
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
    (type: TicketType, count: number, sealedBook = false) => {
      const total = type.price * count;
      if (!canPay(total)) {
        setOwnerLine(
          paySource === "cash"
            ? "手上的预算不够这组票。少拿几张，别临时加钱。"
            : "这笔奖金换不了这么多。可以挑同价或更便宜的票。",
        );
        return;
      }
      charge(total);
      const tickets = sealedBook ? createBook(type).tickets : takeFromOpenBooks(type, count);
      addLog(`${sealedBook ? "整本" : `${count}张`} · ${type.name}`, -total, "spend");
      setOwnerLine(
        sealedBook
          ? `整本给你拆封，${tickets.length}张都在同一个流水号里，按顺序刮。`
          : count >= 5
            ? `给你连着拿${count}张，都是柜台上这一本里的。`
            : "票给你。硬币在旁边，刮完别忘了核对规则。",
      );
      beginScratching(tickets);
    },
    [addLog, beginScratching, canPay, charge, paySource, takeFromOpenBooks],
  );

  const buyBlindBox = useCallback(() => {
    const total = 100;
    if (!canPay(total)) {
      setOwnerLine("盲盒固定100元，预算不够就先别拿。");
      return;
    }
    const patterns = [
      [["grand", 1], ["horse", 2], ["tenfold", 1]],
      [["horse", 3], ["tenfold", 4]],
      [["tenfold", 5], ["little-luck", 10]],
      [["horse", 5]],
    ] as const;
    const pattern = patterns[randomInt(0, patterns.length - 1)];
    const tickets = pattern.flatMap(([typeId, count]) => {
      const type = TICKET_TYPES.find((item) => item.id === typeId)!;
      return takeFromOpenBooks(type, count);
    });
    charge(total);
    addLog("100元惊喜包", -total, "spend");
    setOwnerLine("这是店里自己配的100元盲盒，票都从架上正在卖的整本里拿，不是官方票种。");
    beginScratching(shuffle(tickets));
  }, [addLog, beginScratching, canPay, charge, takeFromOpenBooks]);

  const revealTicket = useCallback(() => {
    if (!activeTicket || countedTicketIds.has(activeTicket.id)) {
      setRevealed(true);
      return;
    }
    setCountedTicketIds((current) => {
      const next = new Set(current);
      next.add(activeTicket.id);
      return next;
    });
    setRevealed(true);
    if (activeTicket.prize > 0) {
      setPrizeBalance((value) => value + activeTicket.prize);
      addLog(`${activeType?.name ?? "彩票"}中奖`, activeTicket.prize, "win");
      if (activeTicket.prize === activeType?.price) {
        setOwnerLine(`中了${activeTicket.prize}，回本一张。要不要直接换张同价的？`);
      } else if (activeTicket.prize === 20) {
        setOwnerLine("中了20块。收手也行，或者正好换一张20的，自己决定。");
      } else if (activeTicket.prize >= 1000) {
        setOwnerLine("这个金额店里先验票，大奖要按票背说明去指定地点兑。票先收好。");
      } else {
        setOwnerLine(`不错，中了${activeTicket.prize}块。先把剩下的刮完，再决定兑不兑。`);
      }
    } else {
      addLog(`${activeType?.name ?? "彩票"}未中奖`, 0, "info");
      setOwnerLine("这张没出。慢慢来，别因为没中就追着加预算。");
    }
  }, [activeTicket, activeType, addLog, countedTicketIds]);

  const nextTicket = useCallback(() => {
    if (scratchIndex < scratchQueue.length - 1) {
      setScratchIndex((value) => value + 1);
      setRevealed(false);
    } else {
      setPhase("shop");
      if (prizeBalance > 0) {
        setOwnerLine(`这轮有${formatMoney(prizeBalance)}还没兑。可以收钱，也可以按面值换票。`);
      } else {
        setOwnerLine("这一轮刮完了。预算到了就收手，想看票也可以再看看。");
      }
    }
  }, [prizeBalance, scratchIndex, scratchQueue.length]);

  const redeemAll = useCallback(() => {
    if (prizeBalance <= 0) return;
    setWallet((value) => value + prizeBalance);
    setRedeemed((value) => value + prizeBalance);
    addLog("奖金已兑入钱包", prizeBalance, "win");
    setOwnerLine(`给你兑了${formatMoney(prizeBalance)}。现金收好。`);
    setPrizeBalance(0);
    setPaySource("cash");
  }, [addLog, prizeBalance]);

  const startSession = useCallback(() => {
    if (!isAdult || budgetInput < 5) return;
    setInitialBudget(budgetInput);
    setWallet(budgetInput);
    setOwnerLine(`成年就行。你今天打算玩${formatMoney(budgetInput)}？预算到了我提醒你。`);
    setPhase("shop");
    TICKET_TYPES.forEach((type) => {
      booksRef.current[type.id] = createBook(type);
    });
    syncInventory();
  }, [budgetInput, isAdult, syncInventory]);

  const resetGame = useCallback(() => {
    booksRef.current = {};
    setInventoryRemaining({});
    setCountedTicketIds(new Set());
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
    setLogs([]);
    setOwnerLine("欢迎，随便看看。新到的票都在架上。");
  }, []);

  const sessionNet = wallet + prizeBalance - initialBudget;
  const totalStake = cashSpent + rolloverSpent;
  const pendingScratchCount = scratchQueue.filter(
    (ticket) => !countedTicketIds.has(ticket.id),
  ).length;

  const stats = useMemo(
    () => [
      { label: "手上现金", value: formatMoney(wallet) },
      { label: "未兑奖金", value: formatMoney(prizeBalance) },
      { label: "累计票款", value: formatMoney(totalStake) },
      { label: "本次盈亏", value: `${sessionNet >= 0 ? "+" : "−"}${formatMoney(Math.abs(sessionNet))}` },
    ],
    [prizeBalance, sessionNet, totalStake, wallet],
  );

  if (phase === "mall") {
    return <MallScene onEnter={() => setPhase("budget")} />;
  }

  if (phase === "budget") {
    return (
      <main className="budget-screen">
        <section className="budget-card">
          <span className="counter-number">4410 2638</span>
          <div className="owner owner-large"><i /></div>
          <div className="speech speech-budget">
            <small>老板</small>
            <p>先问一句：你成年了吗？今天准备拿多少钱玩？</p>
          </div>
          <div className="budget-content">
            <span className="eyebrow">进店第一步</span>
            <h1>给今天定个预算</h1>
            <p>只使用这笔模拟现金。预算花完后，游戏不会自动充值。</p>
            <div className="budget-presets">
              {[50, 100, 300, 600].map((value) => (
                <button
                  key={value}
                  className={budgetInput === value ? "selected" : ""}
                  onClick={() => setBudgetInput(value)}
                >
                  {formatMoney(value)}
                  {value === 600 && <small>约一整本</small>}
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
              <span>我已年满18周岁，理解这只是概率模拟游戏</span>
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

  if (phase === "scratch" && activeTicket && activeType) {
    return (
      <main className="scratch-screen">
        <header className="scratch-topbar">
          <button className="back-link" onClick={() => setPhase("shop")}>← 暂停刮票</button>
          <div className="scratch-progress">
            <span>第 {scratchIndex + 1} 张 / 共 {scratchQueue.length} 张</span>
            <i style={{ width: `${((scratchIndex + (revealed ? 1 : 0)) / scratchQueue.length) * 100}%` }} />
          </div>
          <strong>未兑奖 {formatMoney(prizeBalance)}</strong>
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
            revealed={revealed}
            onReveal={revealTicket}
          />
          <div className="scratch-actions">
            {!revealed ? (
              <>
                <p>按住鼠标或手指，在银色覆盖膜上来回刮。</p>
                <button className="secondary-action" onClick={revealTicket}>快速刮开</button>
              </>
            ) : (
              <>
                <div className={`result-chip ${activeTicket.prize > 0 ? "winner" : ""}`}>
                  {activeTicket.prize > 0
                    ? `本张中奖 ${formatMoney(activeTicket.prize)}`
                    : "本张未中奖"}
                </div>
                <button className="primary-action" onClick={nextTicket}>
                  {scratchIndex < scratchQueue.length - 1 ? "下一张" : "回到柜台"} <span>→</span>
                </button>
              </>
            )}
          </div>
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
              {prizeBalance > 0 ? ` 另有 ${formatMoney(prizeBalance)} 仍未兑奖。` : ` 已兑奖 ${formatMoney(redeemed)}。`}
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
            {prizeBalance > 0 && (
              <button className="secondary-action" onClick={redeemAll}>把未兑奖金收进钱包</button>
            )}
            <button className="primary-action" onClick={resetGame}>重新逛一次 <span>↻</span></button>
          </div>
          <small className="receipt-disclaimer">非官方产品 · 不涉及真实资金 · 所有结果仅用于概率模拟</small>
        </section>
      </main>
    );
  }

  return (
    <main className="shop-screen">
      <header className="shop-header">
        <div>
          <span className="eyebrow">幸运彩票站 · 商场店</span>
          <h1>今天想刮哪一种？</h1>
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

          <div className="pay-panel">
            <span>这次用什么付款？</span>
            <div>
              <button
                className={paySource === "cash" ? "active" : ""}
                onClick={() => setPaySource("cash")}
              >
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
            {prizeBalance > 0 && (
              <button className="redeem-link" onClick={redeemAll}>不换票，直接兑奖收钱</button>
            )}
            {pendingScratchCount > 0 && (
              <button className="resume-link" onClick={() => setPhase("scratch")}>
                继续刮剩下的 {pendingScratchCount} 张
              </button>
            )}
          </div>

          <div className="session-log">
            <div className="section-label">刚才发生的事</div>
            {logs.length === 0 ? (
              <p className="empty-log">还没买票。老板把硬币推到了柜台边。</p>
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
              <span className="section-label">柜台上的票</span>
              <p>单张票会从当前整本按流水号顺序取出；买整本则拆一包新的。</p>
            </div>
            <span className="model-badge">整本预生成模型</span>
          </div>

          <div className="ticket-products">
            {TICKET_TYPES.map((type) => {
              const remaining = inventoryRemaining[type.id] ?? type.bookSize;
              const available = paySource === "cash" ? wallet : prizeBalance;
              return (
                <article
                  className="product-card"
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
                  </div>
                  <div className="product-detail">
                    <p>{type.mechanic}</p>
                    <div className="book-line">
                      <span>当前本剩 {remaining}/{type.bookSize} 张</span>
                      <span>整本 {formatMoney(type.price * type.bookSize)}</span>
                    </div>
                    <div className="quantity-actions">
                      {[1, 3, 5].map((count) => (
                        <button
                          key={count}
                          disabled={available < type.price * count}
                          onClick={() => buyTickets(type, count)}
                        >
                          {count}张
                          <small>{formatMoney(type.price * count)}</small>
                        </button>
                      ))}
                      <button
                        className="book-button"
                        disabled={available < type.price * type.bookSize}
                        onClick={() => buyTickets(type, type.bookSize, true)}
                      >
                        买整本
                        <small>{type.bookSize}张</small>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            <article className="product-card blind-box-card">
              <div className="blind-visual">
                <span>店内自配</span>
                <h2>100元<br />惊喜包</h2>
                <p>票种随机 · 总面值固定</p>
              </div>
              <div className="product-detail">
                <p>从柜台上正在销售的5/10/20/50元整本里组合，总票面价值刚好100元。</p>
                <div className="blind-note">不是官方彩票品种，不承诺中奖或保底。</div>
                <button
                  className="primary-action full"
                  disabled={!canPay(100)}
                  onClick={buyBlindBox}
                >
                  拿一个盲盒 <span>{formatMoney(100)}</span>
                </button>
              </div>
            </article>
          </div>
        </section>
      </section>

      <footer className="shop-footer">
        <span>18+</span>
        <p>仅模拟线下即开票体验。概率以公开返奖结构建模，不预测真实彩票结果，也不存在“选号技巧”。</p>
        <button onClick={() => setOwnerLine("正规的即开票没有中奖编号规律。每张结果在印制时就已经确定了。")}>
          问老板：编号有规律吗？
        </button>
      </footer>
    </main>
  );
}
