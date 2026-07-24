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

test("server-renders the lottery simulator shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>幸运彩票站｜中国即开票体验模拟器<\/title>/i);
  assert.match(html, /逛着逛着/);
  assert.match(html, /进去看看/);
  assert.match(html, /不连接真实彩票/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps realism and responsible-play requirements in source", async () => {
  const [page, research, roadmap, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("docs/research.md", root), "utf8"),
    readFile(new URL("docs/ROADMAP.md", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /整本预生成模型/);
  assert.match(page, /未成年人不得购彩/);
  assert.match(page, /奖金换票/);
  assert.match(page, /100元惊喜包/);
  assert.match(page, /createBook\(type\)/);
  assert.match(research, /65%/);
  assert.match(research, /爱玩的小宋/);
  assert.match(roadmap, /v0\.2/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
