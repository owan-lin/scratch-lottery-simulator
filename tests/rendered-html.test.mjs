import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the v0.7.0 simulator shell and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>幸运彩票站｜中国即开票体验模拟器<\/title>/i);
  assert.match(html, /逛着逛着/);
  assert.match(html, /进去看看/);
  assert.match(html, /不使用真钱/);
  assert.match(html, /og-v070\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps the 60-ticket catalog, unified evaluator, three UIs and zero-token story mode", async () => {
  const [page, catalog, engine, styles, research, roadmap, llmCost, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/ticket-catalog.ts", root), "utf8"),
    readFile(new URL("app/ticket-engine.js", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("docs/research.md", root), "utf8"),
    readFile(new URL("docs/ROADMAP.md", root), "utf8"),
    readFile(new URL("docs/LLM_COST.md", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /tool\.width/);
  assert.match(page, /progress >= 72/);
  assert.match(page, /拿给老板验票/);
  assert.match(page, /请老板逐张验票/);
  assert.match(page, /保安区/);
  assert.match(page, /好运十倍/);
  assert.match(page, /喜相逢/);
  assert.match(page, /好运来/);
  assert.match(page, /一路向海/);
  assert.match(page, /看不见每个开本还剩多少张/);
  assert.match(page, /kind: "blank"/);
  assert.match(page, /一元硬币/);
  assert.match(page, /小号刮片/);
  assert.match(page, /宽口刮铲/);
  assert.match(page, /openBooksRef/);
  assert.match(page, /自己从露出的单张里挑/);
  assert.doesNotMatch(page, /className={`ticket-cell cell-\$\{cell\.kind\}`}/);
  assert.match(page, /总票库 \{CATALOG_SIZE\} 款/);
  assert.match(page, /smallWinsPerBook/);
  assert.match(catalog, /export const CATALOG_SIZE/);
  assert.match(catalog, /name: "星光灿烂"/);
  assert.match(catalog, /name: "盛世中华"/);
  assert.match(catalog, /name: "金玉满堂"/);
  assert.match(catalog, /name: "步步登高"/);
  assert.match(catalog, /name: "正当红"/);
  assert.match(catalog, /name: "66顺88发"/);
  assert.match(catalog, /name: "连中三元"/);
  assert.match(catalog, /name: "唐风宋韵"/);
  assert.match(catalog, /name: "彩虹宝石"/);
  assert.match(catalog, /name: "超级9"/);
  assert.match(catalog, /name: "幸运123"/);
  assert.match(catalog, /name: "非常有戏"/);
  assert.match(catalog, /name: "采蘑菇"/);
  assert.match(catalog, /name: "马到成功"/);
  assert.match(catalog, /name: "新春大吉2026"/);
  assert.match(engine, /evaluateVisiblePrize/);
  assert.match(engine, /ticket mismatch/);
  assert.match(page, /逛街剧情模式/);
  assert.match(page, /本地剧情 · 0 Token/);
  assert.match(page, /MALL_EVENTS/);
  assert.match(llmCost, /5,400–9,800 Token/);
  assert.match(llmCost, /不能决定奖项/);
  assert.match(styles, /\.ticket-direct \.ticket-cell/);
  assert.match(styles, /\.validation-screen/);
  assert.match(styles, /ticket-symbols-v1\.png/);
  assert.match(styles, /background: #b9bbb9/);
  assert.match(styles, /\.ui-diorama/);
  assert.match(styles, /\.ui-arcade/);
  assert.match(styles, /\.ui-ledger/);
  assert.match(research, /MZ\/T 076—2024/);
  assert.match(research, /60\.88%/);
  assert.match(research, /爱玩的小宋/);
  assert.match(roadmap, /v0\.5/);
  assert.equal(JSON.parse(packageJson).version, "0.7.0");
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
