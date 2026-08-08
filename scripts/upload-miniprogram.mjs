import { statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ci = require("miniprogram-ci");

const APP_ID = "wx6ea3bd67ad8d311a";
const keyPath = process.env.WECHAT_PRIVATE_KEY_PATH;
const version = process.env.WECHAT_UPLOAD_VERSION ?? "0.1.0";
const description =
  process.env.WECHAT_UPLOAD_DESCRIPTION ??
  "原生微信小程序首个体验版：60款票库、逐步刮奖、按票面验奖";

if (!keyPath) {
  throw new Error("请先设置 WECHAT_PRIVATE_KEY_PATH，指向微信公众平台下载的上传密钥。");
}

const keyStat = statSync(keyPath);
if (!keyStat.isFile() || keyStat.size < 100) {
  throw new Error("上传密钥路径无效，或文件内容不完整。");
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error("WECHAT_UPLOAD_VERSION 必须使用 x.y.z 格式，例如 0.1.0。");
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectPath = resolve(scriptDirectory, "..", "miniprogram");

const project = new ci.Project({
  appid: APP_ID,
  type: "miniProgram",
  projectPath,
  privateKeyPath: keyPath,
  ignores: ["node_modules/**/*", "project.private.config.json"],
});

let lastProgress = -1;
let result;

try {
  result = await ci.upload({
    project,
    version,
    desc: description,
    robot: 1,
    setting: { useProjectConfig: true },
    onProgressUpdate(progress) {
      const percentage = Number(progress?.status ?? progress?.progress ?? -1);
      if (Number.isFinite(percentage) && percentage !== lastProgress) {
        lastProgress = percentage;
        console.log(`[微信上传] ${percentage}%`);
      }
    },
  });
} catch (error) {
  const message = String(error?.message ?? error);
  const rejectedIp = message.match(/invalid ip:\s*([^,}\s]+)/i)?.[1];
  if (rejectedIp) {
    throw new Error(
      `微信拒绝了当前公网 IP ${rejectedIp}。请先将它加入“小程序代码上传”的 IP 白名单。`,
    );
  }
  throw error;
}

const subPackages = Array.isArray(result?.subPackageInfo)
  ? result.subPackageInfo.length
  : 0;

console.log(
  JSON.stringify(
    {
      ok: true,
      appid: APP_ID,
      version,
      subPackages,
      message: "代码已上传到微信公众平台。",
    },
    null,
    2,
  ),
);
