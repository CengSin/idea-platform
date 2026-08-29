"use client";

import { Button } from "@/components/ui/Button";
import { Check, Copy, Mail } from "lucide-react";
import { useState } from "react";

export function EmailCard({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-center gap-2 text-[12px] tracking-[0.08em] text-muted">
        <Mail className="h-3.5 w-3.5" />
        邮箱
      </div>
      {email ? (
        <div className="mt-3 flex items-center justify-between gap-4">
          <a
            href={`mailto:${email}`}
            className="truncate text-[18px] tracking-[-0.02em] text-artifact"
          >
            {email}
          </a>
          <Button type="button" tone="ghost" className="shrink-0 px-3 py-2" onClick={copy}>
            {copied ? <Check className="h-4 w-4 text-active" /> : <Copy className="h-4 w-4" />}
            {copied ? "已复制" : "复制"}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-[14px] text-muted">未绑定邮箱。</p>
      )}
    </section>
  );
}
