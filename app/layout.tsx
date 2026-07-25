import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://lucky-ticket-night-kiosk-owanlin.owanlin.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "幸运彩票站｜中国即开票体验模拟器",
  description:
    "在商场偶遇一家彩票店：从60款真实票种原型中选票，慢慢刮开灰底黑字奖面，再交给老板扫码验票。",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    title: "幸运彩票站｜慢慢刮，验过才算",
    description: "60款票种、真实 SVG 印刷图符与统一票面验奖引擎，无需登录即可试玩。",
    images: [
      {
        url: `${siteUrl}/og-v070.png`,
        width: 1200,
        height: 630,
        alt: "幸运彩票站：三种高级游戏界面中的60款仿真即开票",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "幸运彩票站｜慢慢刮，验过才算",
    description: "60款票种、真实 SVG 印刷图符与统一票面验奖引擎，无需登录即可试玩。",
    images: [`${siteUrl}/og-v070.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
