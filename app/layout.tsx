import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://lucky-ticket-shop-owanlin.owanlin.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "幸运彩票站｜中国即开票体验模拟器",
  description:
    "在商场偶遇一家彩票店：从50款真实票种原型中选票，慢慢刮开灰底黑字奖面，再交给老板扫码验票。",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    title: "幸运彩票站｜慢慢刮，验过才算",
    description: "50款票种、真实印刷图符与整本概率模型，无需登录即可试玩。",
    images: [
      {
        url: `${siteUrl}/og-v060.png`,
        width: 1200,
        height: 630,
        alt: "幸运彩票站：商场柜台内陈列着50款仿真即开票",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "幸运彩票站｜慢慢刮，验过才算",
    description: "50款票种、真实印刷图符与整本概率模型，无需登录即可试玩。",
    images: [`${siteUrl}/og-v060.png`],
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
