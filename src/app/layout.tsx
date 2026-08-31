import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://idea.z-agent.ccwu.cc";
const title = "Idea Platform — 让想法找到实现者";
const description = "发现项目、明确目的、生成可执行的承接任务，并追踪一个想法如何长成作品。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: "Idea Platform",
    title,
    description,
    images: [
      {
        url: "/covers/hushcity.jpg",
        width: 1280,
        height: 720,
        alt: "Idea Platform 中彼此连接并持续生长的想法网络",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/covers/hushcity.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="grain antialiased">
        <div className="atmosphere" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
