"use client";

import React from "react";
import Link from "@/components/ui/NavigationLink";
import type { PublicActivityItem } from "@/lib/public-catalog";
import { Activity, ArrowUpRight, CheckCircle2, GitBranch, Lightbulb, PackageCheck, Sparkles } from "lucide-react";

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "刚刚";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} 小时前`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} 天前`;
    const d = new Date(isoString);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return "";
  }
}

function ActionIcon({ type }: { type: PublicActivityItem["actionType"] }) {
  switch (type) {
    case "idea":
      return <Lightbulb className="h-3.5 w-3.5 text-orange-600" />;
    case "attempt":
      return <GitBranch className="h-3.5 w-3.5 text-indigo-600" />;
    case "work":
      return <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />;
    case "next_idea":
      return <Sparkles className="h-3.5 w-3.5 text-amber-500" />;
    case "progress":
      return <CheckCircle2 className="h-3.5 w-3.5 text-slate-700" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-slate-500" />;
  }
}

export function HappeningNow({
  activities,
  className = "",
}: {
  activities: PublicActivityItem[];
  className?: string;
}) {
  return (
    <section className={`happening-now relative my-10 select-none ${className}`} aria-labelledby="happening-title">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            HAPPENING NOW
          </span>
          <h2 id="happening-title" className="mt-1 text-[20px] font-bold tracking-tight text-slate-900 sm:text-[22px]">
            现在正在发生
          </h2>
        </div>
        <p className="text-[12.5px] text-slate-500">
          社区中的每一次想法提出、承接推进与作品发布
        </p>
      </div>

      {activities.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activities.slice(0, 6).map((item) => (
            <article
              key={item.id}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white/80 p-4 transition-all hover:border-slate-300 hover:shadow-2xs"
            >
              <div>
                {/* Header: User avatar + action time */}
                <div className="flex items-center justify-between gap-2 text-[11.5px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs"
                      style={{ backgroundColor: item.actorAccent || "#e05b38" }}
                    >
                      {item.actorInitials}
                    </span>
                    {item.actorId ? (
                      <Link
                        href={`/explore/people/${encodeURIComponent(item.actorId)}`}
                        className="font-medium text-slate-800 hover:text-slate-950 hover:underline"
                      >
                        {item.actorName}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-700">{item.actorName}</span>
                    )}
                  </div>

                  <span className="font-mono text-[11px] text-slate-400">
                    {formatRelativeTime(item.at)}
                  </span>
                </div>

                {/* Event Summary Text */}
                <div className="mt-3 flex items-start gap-2">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100">
                    <ActionIcon type={item.actionType} />
                  </div>
                  <p className="line-clamp-2 text-[12.5px] leading-relaxed text-slate-600">
                    {item.text}
                  </p>
                </div>
              </div>

              {/* Related Object Links */}
              {(item.ideaId || item.workId) && (
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2 text-[11.5px]">
                  {item.ideaId && (
                    <Link
                      href={`/explore/${item.ideaId}`}
                      className="inline-flex max-w-[200px] truncate items-center gap-1 font-medium text-slate-700 hover:text-orange-600"
                    >
                      <span>{item.ideaTitle || "查看想法"}</span>
                      <ArrowUpRight className="h-3 w-3 shrink-0" />
                    </Link>
                  )}
                  {item.workId && item.ideaId && (
                    <>
                      <span className="text-slate-300">·</span>
                      <Link
                        href={`/explore/${item.ideaId}#work-${item.workId}`}
                        className="inline-flex max-w-[150px] truncate items-center gap-1 font-medium text-slate-600 hover:text-emerald-700"
                      >
                        <span>{item.workTitle || "作品"}</span>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-center">
          <Activity className="h-7 w-7 text-slate-300" />
          <p className="mt-2 text-[13px] text-slate-500">最近暂无公开动态</p>
          <span className="text-[12px] text-slate-400">第一个想法或承接将在这里实时呈现</span>
        </div>
      )}
    </section>
  );
}
