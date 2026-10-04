import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { siteUrl } from "@/lib/site-url";

const title = "Idea Platform — 让想法找到实现者";
const description = "发现项目、明确目的、生成可执行的承接任务，并追踪一个想法如何长成作品。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: title, template: "%s · Idea Platform" },
  description,
  // 不在根布局写死 canonical / og:url，否则所有页面都会继承成首页地址；需要的页面各自声明。
  // 分享图由 app/opengraph-image.tsx 生成（PNG），不再引用会跳到 SVG 的 /og-image.jpg。
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Idea Platform",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="grain antialiased">
        <div className="atmosphere" aria-hidden="true" />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
