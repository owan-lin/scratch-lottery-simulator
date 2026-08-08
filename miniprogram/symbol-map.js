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

const SYMBOL_GLYPHS = {
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
  猫: "g2-cat",
  爱心: "g2-heart",
  彩带: "g2-ribbon",
  彩球: "g2-firework",
  烟花: "g2-firework",
  窗花: "g2-pattern",
  剪纸: "g2-pattern",
  金纹: "g2-pattern",
  银墨: "g2-pattern",
  盾牌: "g2-shield",
  二胡: "g2-erhu",
  华表: "g2-monument",
  滑雪: "g2-skier",
  礼盒: "g2-gift",
  脸谱: "g2-mask",
  灵蛇: "g2-snake",
  龙凤: "g2-dragon",
  腾龙: "g2-dragon",
  锣鼓: "g2-drum",
  落日: "g2-sunset",
  旗帜: "g2-flag",
  会师: "g2-flag",
  桥: "g2-bridge",
  如意: "g2-ruyi",
  绳索: "g2-rope",
  石阶: "g2-steps",
  台阶: "g2-steps",
  起点: "g2-steps",
  终点: "g2-flag",
  松树: "g2-pine",
  熊猫: "g2-panda",
  阳光: "g2-sun",
  月光: "g2-moon",
  折扇: "g2-fan",
};

const FALLBACK_GLYPHS = [
  "g2-pattern",
  "g2-sun",
  "g2-heart",
  "g2-fan",
  "g2-shield",
];

function isPrintedMark(label) {
  return (
    PRINTED_MARKS.has(label) ||
    /^\d+$/.test(label) ||
    /^\d+\s*\+\s*\d+$/.test(label) ||
    /^我\s+\d+\s+｜\s+对手\s+\d+$/.test(label) ||
    /^\d+\s+·\s+/.test(label)
  );
}

function fallbackGlyph(label) {
  let hash = 0;
  for (const character of label) {
    hash = (Math.imul(hash, 31) + character.codePointAt(0)) >>> 0;
  }
  return FALLBACK_GLYPHS[hash % FALLBACK_GLYPHS.length];
}

function decoratePart(label) {
  const text = isPrintedMark(label);
  const glyph = text ? "" : SYMBOL_GLYPHS[label] || fallbackGlyph(label);
  return {
    label,
    glyph,
    sheet: glyph.startsWith("g2-") ? "sprite-v2" : "sprite-v1",
    spriteSrc: glyph.startsWith("g2-")
      ? "/assets/ticket-symbols-v2.png"
      : "/assets/ticket-symbols-v1.png",
    text,
  };
}

module.exports = {
  PRINTED_MARKS,
  SYMBOL_GLYPHS,
  decoratePart,
  fallbackGlyph,
  isPrintedMark,
};
