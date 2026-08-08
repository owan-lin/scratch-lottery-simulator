import { mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ci = require("miniprogram-ci");

const APP_ID = "wx6ea3bd67ad8d311a";
const keyPath = process.env.WECHAT_PRIVATE_KEY_PATH;
const version = process.env.WECHAT_UPLOAD_VERSION ?? "0.1.0";

if (!keyPath) {
  throw new Error("请先设置 WECHAT_PRIVATE_KEY_PATH，指向微信公众平台下载的上传密钥。");
}

const keyStat = statSync(keyPath);
if (!keyStat.isFile() || keyStat.size < 100) {
  throw new Error("上传密钥路径无效，或文件内容不完整。");
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const projectPath = resolve(repositoryRoot, "miniprogram");
const outputDirectory = resolve(repositoryRoot, "outputs");
const qrcodeOutputDest = resolve(
  outputDirectory,
  `wechat-preview-${version}.jpg`,
);

mkdirSync(outputDirectory, { recursive: true });

const project = new ci.Project({
  appid: APP_ID,
  type: "miniProgram",
  projectPath,
  privateKeyPath: keyPath,
  ignores: ["node_modules/**/*", "project.private.config.json"],
});

await ci.preview({
  project,
  desc: `刮卡概率模拟器 ${version} 预览`,
  robot: 1,
  setting: { useProjectConfig: true },
  qrcodeFormat: "image",
  qrcodeOutputDest,
  pagePath: "pages/game/game",
});

console.log(
  JSON.stringify(
    {
      ok: true,
      appid: APP_ID,
      version,
      qrcodeOutputDest,
      message: "微信预览二维码已生成。",
    },
    null,
    2,
  ),
);
