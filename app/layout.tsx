import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://lucky-ticket-shop-owanlin.owanlin.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "幸运彩票站｜中国即开票体验模拟器",
  description:
    "在商场偶遇一家彩票店：设定预算，从真实票种原型中选票，慢慢刮开，再交给老板扫码验票。",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    title: "幸运彩票站｜慢慢刮，验过才算",
    description: "无需登录的中国线下刮刮乐体验模拟器。",
    images: [
      {
        url: `${siteUrl}/og.png`,
        width: 1200,
        height: 630,
        alt: "幸运彩票站：柜台前慢慢刮开一张仿真即开票",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "幸运彩票站｜慢慢刮，验过才算",
    description: "无需登录的中国线下刮刮乐体验模拟器。",
    images: [`${siteUrl}/og.png`],
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
