"use client";

import React from "react";
import Link from "@/components/ui/NavigationLink";
import type { PublicIdea } from "@/lib/public-catalog";
import { IdeaLifecycleRail } from "@/components/idea/IdeaLifecycleRail";
import { ArrowRight, ArrowUpRight, ExternalLink, GitBranch, MessageSquare, Package, Sparkles } from "lucide-react";

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "今天";
    if (diffDays === 1) return "昨天";
    if (diffDays < 30) return `${diffDays} 天前`;
    const d = new Date(isoString);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return "";
  }
}

export function IdeaNode({
  idea,
  workspace = false,
  allIdeas = [],
}: {
  idea: PublicIdea;
  workspace?: boolean;
  allIdeas?: PublicIdea[];
}) {
  const isDeprecated = idea.status === "deprecated";
  const participants = idea.participants || [];
  const primaryWork = idea.works[0];

  // Sourced from work (iteration or derive)
  const source = idea.source;

  // Find ideas that sprouted from this idea's works
  const sproutedIdeas = allIdeas.filter(
    (item) => item.source && idea.works.some((w) => w.id === item.source?.workId)
  );

  const detailHref = workspace ? `/ideas/${idea.id}` : `/explore/${idea.id}`;
  const participateHref = workspace
    ? `/ideas/${idea.id}`
    : `/login?next=${encodeURIComponent(`/ideas/${idea.id}`)}`;

  return (
    <article
      className={`idea-node group relative flex flex-col justify-between rounded-3xl border bg-white p-6 transition-all duration-200 sm:p-7 ${
        isDeprecated
          ? "border-slate-200/60 bg-slate-50/50 opacity-80"
          : "border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
      }`}
    >
      <div>
        {/* Top: Origin Trace / Eyebrow */}
        {source ? (
          <div className="mb-3 flex items-center gap-1.5 font-mono text-[11px] text-amber-700">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="truncate">
              长自作品{" "}
              <Link
                href={workspace ? `/works/${source.workId}` : `/explore/${source.ideaId}#work-${source.workId}`}
                className="font-medium underline underline-offset-2 hover:text-amber-900"
              >
                {source.workTitle}
              </Link>
            </span>
          </div>
        ) : null}

        {/* Header: Author + Meta */}
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-2xs"
              style={{ backgroundColor: idea.authorAccent || "#e05b38" }}
            >
              {idea.authorInitials}
            </span>
            <div className="min-w-0 truncate">
              {idea.authorId ? (
                <Link
                  href={`/explore/people/${encodeURIComponent(idea.authorId)}`}
                  className="font-semibold text-slate-800 hover:text-slate-950 hover:underline"
                >
                  {idea.authorName}
                </Link>
              ) : (
                <span className="font-semibold text-slate-800">{idea.authorName}</span>
              )}
              <span className="ml-2 font-mono text-[11px] text-slate-400">
                {formatRelativeTime(idea.createdAt || idea.updatedAt)}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          {isDeprecated ? (
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] font-medium text-slate-500">
              已弃用
            </span>
          ) : idea.works.length > 0 ? (
            <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[10.5px] font-medium text-emerald-700">
              已有作品
            </span>
          ) : idea.attemptCount > 0 ? (
            <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[10.5px] font-medium text-indigo-700">
              实现中
            </span>
          ) : (
            <span className="shrink-0 rounded-md bg-orange-50 px-2 py-0.5 font-mono text-[10.5px] font-medium text-orange-700">
              待承接
            </span>
          )}
        </div>

        {/* Idea Title & Problem / Summary */}
        <div className="mt-4">
          <Link href={detailHref} className="block group-hover:text-orange-600 transition-colors">
            <h3 className="text-[18px] font-bold tracking-tight text-slate-900 sm:text-[20px]">
              {idea.title}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-slate-600">
            {idea.problem || idea.summary}
          </p>
        </div>

        {/* Lifecycle Rail (Core Visual Symbol) */}
        <div className="my-5 border-y border-slate-100 py-3">
          <IdeaLifecycleRail
            ideaCount={1}
            buildCount={idea.attemptCount}
            productCount={idea.works.length}
            status={idea.status}
            size="sm"
          />
        </div>

        {/* Collaboration & Social Graph State */}
        <div className="flex flex-col gap-3 text-[12px]">
          {/* 1. Implementation Participants */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {participants.length > 0 ? (
                <>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {participants.slice(0, 3).map((p, idx) => (
                      <span
                        key={p.userId || idx}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-white"
                        style={{ backgroundColor: p.accent || "#4f46e5" }}
                        title={`${p.displayName} (${p.title})`}
                      >
                        {p.initials}
                      </span>
                    ))}
                  </div>
                  <span className="truncate text-slate-700">
                    <b className="font-semibold text-slate-900">{participants.length}</b> 人正在实现
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <GitBranch className="h-3.5 w-3.5" />
                  <span>等待第一个开发者承接</span>
                </div>
              )}
            </div>

            {/* Discussion Extension Point */}
            <div className="flex items-center gap-1 text-slate-400 text-[11.5px]">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>围绕 Idea 交流</span>
            </div>
          </div>

          {/* 2. Product Outcome Preview (if any) */}
          {primaryWork ? (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <Package className="h-3.5 w-3.5 text-emerald-600" />
                  <Link
                    href={workspace ? `/works/${primaryWork.id}` : `/explore/${idea.id}#work-${primaryWork.id}`}
                    className="hover:underline truncate"
                  >
                    {primaryWork.title}
                  </Link>
                  <span className="font-mono text-[10.5px] text-slate-400">
                    v{primaryWork.revisionNumber}
                  </span>
                </div>

                {primaryWork.externalUrl && (
                  <a
                    href={primaryWork.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                    aria-label={`打开作品：${primaryWork.title}`}
                  >
                    作品链接 <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Next Idea Sprouting indicator */}
              {sproutedIdeas.length > 0 ? (
                <div className="mt-2 border-t border-slate-200/60 pt-2 text-[11.5px] text-amber-800">
                  <span className="font-medium">↳ 从该作品长出新想法：</span>
                  <Link
                    href={workspace ? `/ideas/${sproutedIdeas[0].id}` : `/explore/${sproutedIdeas[0].id}`}
                    className="ml-1 underline underline-offset-2 hover:text-amber-950 font-medium"
                  >
                    {sproutedIdeas[0].title}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <Link
          href={detailHref}
          className="text-[12.5px] font-medium text-slate-500 hover:text-slate-900"
        >
          查看完整记录
        </Link>

        {!isDeprecated && (
          <Link
            href={participateHref}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-slate-800"
          >
            <span>我也来实现</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </article>
  );
}
