"use client";

import { dismissAgentSuggestionAction, setWorkIterationStatusAction, runWorkAnalysisAction } from "@/lib/actions";
import type { Work } from "@/lib/types";
import { Bot, PauseCircle, PlayCircle, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";

export function IdeaAgentPanel({ work }: { work: Work }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const isOpen = work.iteration?.status !== "closed";
  const reminders = work.iteration?.suggestions.filter(s => s.status === "pending" && s.kind === "reminder") ?? [];
  const active = reminders.find(r => r.id === selected);
  const job = work.iteration?.analysis;
  const run = (task: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try { await task(); router.refresh(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败，请稍后重试"); }
    });
  };
  const labels = { queued: "等待分析", running: "正在分析", succeeded: "分析完成", failed: "分析失败", cancelled: "已取消" };
  return (
    <section className="mt-10 rounded-3xl border border-line p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-idea"><Bot className="h-4 w-4" />迭代提醒</div>
        <div className="flex flex-wrap gap-2">
          {isOpen ? <Button tone="quiet" disabled={pending || (job?.status === "running" && Date.parse(job.leaseUntil ?? "") > Date.now())} onClick={() => run(() => runWorkAnalysisAction(work.id))}><RefreshCw className="h-3.5 w-3.5" />{pending ? "分析中…" : "重新分析"}</Button> : null}
          <Button tone="quiet" onClick={() => run(() => setWorkIterationStatusAction(work.id, isOpen ? "closed" : "open"))}>
            {isOpen ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}{isOpen ? "停止提醒" : "开启提醒"}
          </Button>
        </div>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-muted">根据作品说明和已同步的进展提取值得留意的点。点击标签查看依据，下一步做什么由你决定。</p>
      {!isOpen ? <p className="mt-4 text-[13px] text-muted">已停止后续分析。</p> : <>
        <div className="mt-4 flex flex-wrap gap-2">
          {reminders.map(r => <button key={r.id} type="button" aria-pressed={selected === r.id} onClick={() => setSelected(selected === r.id ? null : r.id)} className={`rounded-full border px-3 py-1.5 text-[12px] ${selected === r.id ? "border-idea bg-idea/10 text-idea" : "border-line text-muted"}`}>{r.title}</button>)}
        </div>
        {active ? <div className="mt-3 rounded-xl bg-idea/5 p-4 text-[13px] leading-relaxed">
          <p>{active.summary}</p>
          <div className="mt-3 flex items-center gap-5 text-[12px]">
            <a href="#next-ideas" className="text-idea">在下方写下一步</a>
            <button type="button" disabled={pending} className="inline-flex items-center gap-1 text-muted" onClick={() => run(() => dismissAgentSuggestionAction(work.id, active.id))}><X className="h-3 w-3" />忽略</button>
          </div>
        </div> : null}
        <p className="mt-3 text-[12px] text-muted">{job ? labels[job.status] : "尚未分析，可手动运行或等待定时调度。"}{job?.status === "succeeded" && reminders.length === 0 ? "，目前没有新的提醒。" : ""}{job?.nextAttemptAt ? `，下次调度将在 ${new Date(job.nextAttemptAt).toLocaleString("zh-CN")} 后重试。` : ""}</p>
        {job?.error ? <p className="mt-2 text-[12px] text-blocked">{job.error}</p> : null}
      </>}
      {error ? <p className="mt-3 text-[13px] text-blocked">{error}</p> : null}
    </section>
  );
}
