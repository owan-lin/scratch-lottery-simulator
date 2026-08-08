import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { TICKET_TYPES as WEB_TYPES } from "../app/ticket-catalog.ts";
import {
  evaluateVisiblePrize as evaluateWebPrize,
  makeTicketOutcome as makeWebTicketOutcome,
} from "../app/ticket-engine.js";
import {
  makeBookPrizePool as makeWebBookPrizePool,
  makeSeededRandom as makeWebSeededRandom,
} from "../app/prize-model.js";

const require = createRequire(import.meta.url);
const {
  TICKET_TYPES: MINI_TYPES,
  CATALOG_SIZE: MINI_CATALOG_SIZE,
} = require("../miniprogram/shared/ticket-catalog.js");
const {
  evaluateVisiblePrize: evaluateMiniPrize,
  makeTicketOutcome: makeMiniTicketOutcome,
} = require("../miniprogram/shared/ticket-engine.js");
const {
  makeBookPrizePool: makeMiniBookPrizePool,
  makeSeededRandom: makeMiniSeededRandom,
} = require("../miniprogram/shared/prize-model.js");
const {
  SYMBOL_GLYPHS,
  decoratePart,
  isPrintedMark,
} = require("../miniprogram/symbol-map.js");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function hashSeed(text) {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

test("mini-program catalog is a lossless snapshot of the web catalog", () => {
  assert.equal(MINI_CATALOG_SIZE, 60);
  assert.deepEqual(MINI_TYPES, WEB_TYPES);
});

test("web and mini-program ticket engines are oracle-equivalent for every prize tier", () => {
  for (const webType of WEB_TYPES) {
    const miniType = MINI_TYPES.find((type) => type.id === webType.id);
    assert.ok(miniType, `missing mini-program type ${webType.id}`);
    const prizes = [0, ...new Set(webType.prizeTiers.map((tier) => tier.amount))];

    for (const intendedPrize of prizes) {
      for (let iteration = 0; iteration < 8; iteration += 1) {
        const seed = hashSeed(`${webType.id}:${intendedPrize}:${iteration}`);
        const webTicket = makeWebTicketOutcome(
          webType,
          intendedPrize,
          makeWebSeededRandom(seed),
        );
        const miniTicket = makeMiniTicketOutcome(
          miniType,
          intendedPrize,
          makeMiniSeededRandom(seed),
        );

        assert.deepEqual(
          miniTicket,
          webTicket,
          `${webType.name} differs across runtimes at prize ${intendedPrize}, seed ${seed}`,
        );
        assert.equal(
          evaluateMiniPrize(miniType, miniTicket.winningNumbers, miniTicket.cells),
          intendedPrize,
        );
        assert.equal(
          evaluateWebPrize(webType, miniTicket.winningNumbers, miniTicket.cells),
          intendedPrize,
        );
      }
    }
  }
});

test("whole-book pools remain identical and every printed ticket re-evaluates to its pool prize", () => {
  for (const webType of WEB_TYPES) {
    const miniType = MINI_TYPES.find((type) => type.id === webType.id);
    for (let iteration = 0; iteration < 12; iteration += 1) {
      const seed = hashSeed(`book:${webType.id}:${iteration}`);
      const webPool = makeWebBookPrizePool(webType, makeWebSeededRandom(seed));
      const miniPool = makeMiniBookPrizePool(miniType, makeMiniSeededRandom(seed));
      assert.deepEqual(miniPool, webPool, `${webType.name} whole-book pool differs`);
      assert.equal(miniPool.length, webType.bookSize);

      miniPool.forEach((prize, ticketIndex) => {
        const ticketSeed = hashSeed(`face:${webType.id}:${iteration}:${ticketIndex}`);
        const ticket = makeMiniTicketOutcome(
          miniType,
          prize,
          makeMiniSeededRandom(ticketSeed),
        );
        assert.equal(
          evaluateMiniPrize(miniType, ticket.winningNumbers, ticket.cells),
          prize,
          `${webType.name} ticket ${ticketIndex + 1} visible prize differs from book pool`,
        );
      });
    }
  }
});

test("every catalog pictogram has a visual glyph and unknown symbols never degrade to text", () => {
  const symbols = new Set([
    ...MINI_TYPES.flatMap((type) => type.artSymbols || []),
    "猫",
    "起点",
    "终点",
    "未收录测试图符",
  ]);

  for (const symbol of symbols) {
    const decorated = decoratePart(symbol);
    if (isPrintedMark(symbol)) {
      assert.equal(decorated.text, true, `${symbol} should remain a printed mark`);
      assert.equal(decorated.glyph, "");
      continue;
    }
    assert.ok(decorated.glyph, `${symbol} is missing a pictogram`);
    assert.ok(
      decorated.sheet === "sprite-v1" || decorated.sheet === "sprite-v2",
      `${symbol} has an invalid sprite sheet`,
    );
    assert.match(decorated.spriteSrc, /^\/assets\/ticket-symbols-v[12]\.png$/);
    assert.equal(decorated.text, false, `${symbol} unexpectedly degraded to text`);
  }

  for (const printedMark of ["阿喜", "66", "10×"]) {
    const decorated = decoratePart(printedMark);
    assert.equal(decorated.text, true);
    assert.equal(decorated.glyph, "");
  }
});

test("mini-program project is importable and validates at the static boundary", async () => {
  for (const file of [
    "miniprogram/app.js",
    "miniprogram/symbol-map.js",
    "miniprogram/pages/game/game.js",
    "miniprogram/shared/ticket-engine.js",
    "miniprogram/shared/prize-model.js",
    "miniprogram/shared/ticket-catalog.js",
  ]) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.doesNotThrow(() => new vm.Script(source, { filename: file }));
  }

  const [
    appConfig,
    projectConfig,
    sitemap,
    pageSource,
    template,
    pageStyle,
    appStyle,
    sourceSpriteV2,
    miniSpriteV2,
    vectorSpriteV2,
  ] = await Promise.all([
    readFile(path.join(root, "miniprogram", "app.json"), "utf8"),
    readFile(path.join(root, "miniprogram", "project.config.json"), "utf8"),
    readFile(path.join(root, "miniprogram", "sitemap.json"), "utf8"),
    readFile(path.join(root, "miniprogram", "pages", "game", "game.js"), "utf8"),
    readFile(path.join(root, "miniprogram", "pages", "game", "game.wxml"), "utf8"),
    readFile(path.join(root, "miniprogram", "pages", "game", "game.wxss"), "utf8"),
    readFile(path.join(root, "miniprogram", "app.wxss"), "utf8"),
    readFile(path.join(root, "public", "assets", "ticket-symbols-v2.png")),
    readFile(path.join(root, "miniprogram", "assets", "ticket-symbols-v2.png")),
    readFile(path.join(root, "public", "assets", "ticket-symbols-v2.svg"), "utf8"),
  ]);

  assert.doesNotThrow(() => JSON.parse(appConfig));
  assert.doesNotThrow(() => JSON.parse(projectConfig));
  assert.doesNotThrow(() => JSON.parse(sitemap));
  assert.match(pageSource, /evaluateVisiblePrize\(type, ticket\.winningNumbers, ticket\.cells\)/);
  assert.match(pageSource, /visiblePrize !== ticket\.prize/);
  assert.match(template, /type="2d"/);
  assert.match(template, /catchtouchmove="onScratchMove"/);
  assert.match(template, /拿给老板验票/);
  assert.match(template, /灰|ticket-content/);
  assert.match(template, /<image[\s\S]*?sprite-sheet \{\{part\.sheet\}\} \{\{part\.glyph\}\}/);
  assert.match(template, /src="\{\{part\.spriteSrc\}\}"/);
  assert.match(pageStyle, /repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(pageStyle, /\.toolbox[\s\S]*?button[\s\S]*?min-width:\s*0/);
  assert.doesNotMatch(
    pageStyle,
    /background-image:\s*url\(["']?\/assets\/ticket-symbols/,
    "local mini-program pictograms must render through <image>, not WXSS background-image",
  );
  assert.match(appStyle, /overflow-x:\s*hidden/);
  assert.match(appStyle, /view,[\s\S]*?box-sizing:\s*border-box/);
  assert.match(pageStyle, /@media \(max-width:\s*390px\)/);
  assert.match(pageStyle, /\.budget-input[\s\S]*?flex-direction:\s*column/);
  assert.match(vectorSpriteV2, /viewBox="0 0 500 500"/);
  assert.deepEqual(miniSpriteV2, sourceSpriteV2);

  for (const glyph of new Set(Object.values(SYMBOL_GLYPHS))) {
    assert.match(pageStyle, new RegExp(`\\.${glyph}\\s*\\{`), `${glyph} has no crop rule`);
  }

  const allowedTags = new Set([
    "view",
    "text",
    "button",
    "input",
    "switch",
    "scroll-view",
    "picker",
    "canvas",
    "image",
  ]);
  const usedTags = [...template.matchAll(/<([a-z][a-z0-9-]*)\b/g)].map((match) => match[1]);
  assert.deepEqual(
    [...new Set(usedTags.filter((tag) => !allowedTags.has(tag)))],
    [],
    "WXML must only use registered built-in components",
  );
});
