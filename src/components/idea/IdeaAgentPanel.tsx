"use client";

import {
  acceptAgentSuggestionAction,
  dismissAgentSuggestionAction,
  setWorkIterationStatusAction,
} from "@/lib/actions";
import type { Work } from "@/lib/types";
import { Bot, Check, ExternalLink, PauseCircle, PlayCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "@/components/ui/NavigationLink";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

export function IdeaAgentPanel({ work }: { work: Work }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const iteration = work.iteration;
  const isOpen = iteration?.status !== "closed";
  const suggestions = iteration?.suggestions ?? [];

  const run = (task: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "操作失败，请稍后重试");
      }
    });
  };

  return (
    <section className="mt-10 rounded-[28px] border border-idea/20 bg-idea/[0.045] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[12px] tracking-[0.08em] text-idea">
            <Bot className="h-4 w-4" />
            IDEA AGENT
          </div>
          <h2 className="mt-2 text-[21px] font-semibold tracking-[-0.03em]">让完成的作品继续生长</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
            Agent 每天扫描一次已完成作品，建议先私下交给你；接受后才会发布为可承接的下一步。
          </p>
        </div>
        <Button
          tone="quiet"
          disabled={pending}
          onClick={() => run(() => setWorkIterationStatusAction(work.id, isOpen ? "closed" : "open"))}
        >
          {isOpen ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
          {isOpen ? "关闭后续迭代" : "重新开启迭代"}
        </Button>
      </div>

      {!isOpen ? (
        <div className="mt-5 rounded-2xl border border-line bg-black/10 px-4 py-3 text-[13px] text-muted">
          这个作品已停止接收新的 Agent 建议；已有想法和承接不会受影响。
        </div>
      ) : suggestions.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-muted">
          已加入扫描队列。下一次每日扫描后，2–3 条建议会出现在这里并发送到你的注册邮箱。
        </div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {suggestions.map((suggestion) => (
            <article
              key={suggestion.id}
              className={`rounded-2xl border border-line bg-black/10 p-4 ${suggestion.status === "dismissed" ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <Chip tone={suggestion.status === "accepted" ? "active" : suggestion.status === "dismissed" ? "mute" : "idea"}>
                  {suggestion.status === "accepted" ? "已发布" : suggestion.status === "dismissed" ? "已忽略" : "待选择"}
                </Chip>
              </div>
              <h3 className="mt-3 text-[15px] font-medium leading-snug">{suggestion.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{suggestion.summary}</p>
              {suggestion.status === "pending" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    tone="idea"
                    className="px-3 py-2"
                    disabled={pending}
                    onClick={() => run(() => acceptAgentSuggestionAction(work.id, suggestion.id))}
                  >
                    <Check className="h-3.5 w-3.5" />
                    接受并发布
                  </Button>
                  <Button
                    tone="quiet"
                    className="px-3 py-2"
                    disabled={pending}
                    onClick={() => run(() => dismissAgentSuggestionAction(work.id, suggestion.id))}
                  >
                    <X className="h-3.5 w-3.5" />
                    忽略
                  </Button>
                </div>
              ) : suggestion.acceptedIdeaId ? (
                <Link
                  href={`/ideas/${suggestion.acceptedIdeaId}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-active hover:underline"
                >
                  查看并承接这个想法 <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      )}
      {error ? <p className="mt-4 text-[13px] text-blocked">{error}</p> : null}
    </section>
  );
}
