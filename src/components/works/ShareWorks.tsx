"use client";

import { useState } from "react";

export function ShareWorks({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = new URL("/works", window.location.origin);
    url.searchParams.set("user", userId);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return <button type="button" onClick={copyLink} className="rounded-full bg-slate-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-700" aria-label="复制我的作品分享链接">{copied ? "链接已复制" : "分享我的作品"}</button>;
}
