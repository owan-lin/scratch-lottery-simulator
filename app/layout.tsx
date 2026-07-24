import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "幸运彩票站｜中国即开票体验模拟器",
  description:
    "在商场偶遇一家彩票店：设定预算、从整本中选票、亲手刮开，并决定兑奖、换票或及时收手。",
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
