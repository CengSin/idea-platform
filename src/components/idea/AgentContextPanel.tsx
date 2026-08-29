"use client";

import { Button } from "@/components/ui/Button";
import { buildIdeaContext } from "@/lib/format";
import type { Idea } from "@/lib/types";
import { ChevronDown, Copy } from "lucide-react";
import { useMemo, useState } from "react";

export function AgentContextPanel({ idea }: { idea: Idea }) {
  const ctx = useMemo(() => buildIdeaContext(idea), [idea]);
  const [copied, setCopied] = useState(false);
  const sections = [
    { key: "问题", body: idea.problem },
    { key: "为什么值得做", body: idea.whyItMatters },
    { key: "约束", body: idea.constraints.join("；") },
    { key: "已有尝试", body: idea.existingAttempts.map((x) => `${x.title}${x.note ? `：${x.note}` : ""}`).join("\n") },
    { key: "开放问题", body: idea.openQuestions.join("\n") },
  ];

  return (
    <aside className="glass-heavy rounded-[24px] p-4">
      <div className="mb-3 flex items-center gap-2 text-[14px] tracking-[-0.02em]">
        <span className="text-muted">Agent 可读取的上下文</span>
      </div>
      <div className="divide-y divide-white/6">
        {sections.map((s) => (
          <details key={s.key} className="group py-2" open={s.key === "问题"}>
            <summary className="flex cursor-pointer list-none items-center justify-between py-1.5 text-[13.5px] text-artifact">
              {s.key}
              <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" />
            </summary>
            <p className="pb-2 text-[13px] leading-relaxed text-muted whitespace-pre-line">
              {s.body}
            </p>
          </details>
        ))}
      </div>
      <Button
        className="mt-3 w-full"
        onClick={async () => {
          await navigator.clipboard.writeText(JSON.stringify(ctx, null, 2));
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
      >
        <Copy className="h-4 w-4" />
        {copied ? "已复制 Idea Context" : "复制 Idea Context"}
      </Button>
    </aside>
  );
}
