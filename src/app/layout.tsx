import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "项目", template: "%s · 项目" },
  description: "正在做的项目，和其中最有想象力的那几个。",
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
