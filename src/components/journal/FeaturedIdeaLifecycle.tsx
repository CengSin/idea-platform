"use client";

import React, { useState } from "react";
import Link from "@/components/ui/NavigationLink";
import type { PublicIdea } from "@/lib/public-catalog";
import { ArrowUpRight, GitBranch, Sparkles, ExternalLink, MessageSquare, Terminal } from "lucide-react";

interface FeaturedIdeaLifecycleProps {
  ideas: PublicIdea[];
  className?: string;
}

export function FeaturedIdeaLifecycle({ ideas, className = "" }: { ideas: PublicIdea[]; className?: string }) {
  // Find an idea that best shows the full lifecycle (has works and/or next ideas, or fall back to the first)
  const fullCycleIdeaIndex = ideas.findIndex((i) => i.works.length > 0) !== -1
    ? ideas.findIndex((i) => i.works.length > 0)
    : 0;

  const [selectedIndex, setSelectedIndex] = useState(fullCycleIdeaIndex >= 0 ? fullCycleIdeaIndex : 0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const selectedIdea = ideas[selectedIndex] || ideas[0];
  if (!selectedIdea) return null;

  // Find any child ideas derived from this idea's works
  const derivedIdeas = ideas.filter(
    (i) => i.source && selectedIdea.works.some((w) => w.id === i.source?.workId)
  );

  const primaryWork = selectedIdea.works[0];
  const participants = selectedIdea.participants || [];

  const isHighlighted = (id: string, group?: string) => {
    if (!hoveredNode) return true;
    if (hoveredNode === id) return true;
    if (group && (hoveredNode === group || hoveredNode.startsWith(group))) return true;
    return false;
  };

  const getOpacity = (id: string, group?: string) => {
    if (!hoveredNode) return "opacity-100";
    return isHighlighted(id, group) ? "opacity-100" : "opacity-35";
  };

  return (
    <div className={`lifecycle-preview-card relative flex flex-col rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-sm overflow-hidden sm:p-7 ${className}`}>
      {/* Top Header: Badge & Idea Switcher if multiple */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Realtime Lifecycle Graph
          </span>
        </div>

        {ideas.length > 1 && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
            <span>观测案例：</span>
            <div className="flex items-center gap-1">
              {ideas.slice(0, 3).map((idea, idx) => (
                <button
                  key={idea.id}
                  onClick={() => {
                    setSelectedIndex(idx);
                    setHoveredNode(null);
                  }}
                  className={`rounded-md px-2 py-0.5 font-medium transition-all ${
                    selectedIndex === idx
                      ? "bg-slate-900 text-white font-mono"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  aria-label={`切换到想法：${idea.title}`}
                >
                  #{idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Lifecycle Graph */}
      <div className="relative mt-5 flex-1 select-none overflow-hidden">
        <div className="relative flex flex-col">
          {/* Node 1: Origin Idea Shared */}
          <div
            className={`group relative flex gap-4 transition-all duration-200 ${getOpacity("idea-origin")}`}
            onMouseEnter={() => setHoveredNode("idea-origin")}
            onMouseLeave={() => setHoveredNode(null)}
          >
            {/* Left rail column: dot + downward line */}
            <div className="relative flex flex-col items-center">
              <div className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-orange-500">
                <span className="h-2 w-2 rounded-full bg-orange-600" />
              </div>
              {/* Segment line to next node */}
              <div className="w-[2px] flex-1 bg-slate-200 my-1 relative overflow-hidden">
                <div className="lifecycle-rail-flow-v absolute inset-0 bg-gradient-to-b from-transparent via-slate-700 to-transparent opacity-40" />
              </div>
            </div>

            {/* Right card */}
            <div className="mb-5 flex-1 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition-colors group-hover:border-orange-200 group-hover:bg-orange-50/30">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs"
                    style={{ backgroundColor: selectedIdea.authorAccent || "#e05b38" }}
                  >
                    {selectedIdea.authorInitials}
                  </span>
                  {selectedIdea.authorId ? (
                    <Link
                      href={`/explore/people/${encodeURIComponent(selectedIdea.authorId)}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {selectedIdea.authorName}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-900">{selectedIdea.authorName}</span>
                  )}
                  <span className="text-slate-400">分享了想法</span>
                </div>
                <span className="font-mono text-[10.5px] text-slate-400">STAGE 01 · IDEA</span>
              </div>

              <Link
                href={`/explore/${selectedIdea.id}`}
                className="mt-2 block font-semibold text-[15px] tracking-tight text-slate-900 hover:text-orange-600 sm:text-[16px]"
              >
                {selectedIdea.title}
              </Link>
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-slate-600">
                {selectedIdea.problem || selectedIdea.summary}
              </p>
            </div>
          </div>

          {/* Node 2: Implementation Branch (Attempt) */}
          <div
            className={`group relative flex gap-4 transition-all duration-200 ${getOpacity("build-branch", "build")}`}
            onMouseEnter={() => setHoveredNode("build")}
            onMouseLeave={() => setHoveredNode(null)}
          >
            {/* Left rail column: dot + downward line */}
            <div className="relative flex flex-col items-center">
              <div className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-indigo-500">
                <GitBranch className="h-3 w-3 text-indigo-600" />
              </div>
              {/* Segment line to next node (only if work or next item exists) */}
              <div className="w-[2px] flex-1 bg-slate-200 my-1 relative overflow-hidden">
                <div className="lifecycle-rail-flow-v absolute inset-0 bg-gradient-to-b from-transparent via-slate-700 to-transparent opacity-40" />
              </div>
            </div>

            {/* Right card */}
            <div className="mb-5 flex-1 rounded-xl border border-indigo-100/80 bg-indigo-50/20 p-3.5 transition-colors group-hover:border-indigo-300 group-hover:bg-indigo-50/40">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-indigo-900 font-medium">
                  <Terminal className="h-3.5 w-3.5 text-indigo-600" />
                  <span>
                    {participants.length > 0
                      ? `${participants[0].displayName} 正在实现`
                      : "等待开发者沿自己的方向承接"}
                  </span>
                </div>
                <span className="font-mono text-[10.5px] text-indigo-600/80">STAGE 02 · BUILD</span>
              </div>

              {participants.length > 0 ? (
                <div className="mt-2 text-[12px] text-slate-600">
                  <span className="font-mono text-slate-400">方向: </span>
                  <span className="font-medium text-slate-800">{participants[0].title}</span>
                  <span className="ml-2 inline-block rounded-full bg-indigo-100/70 px-2 py-0.5 font-mono text-[10px] text-indigo-700">
                    {participants[0].status === "published" ? "已验收发布" : "推进中"}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-[12px] text-slate-500">
                  尚未有人承接。你可以从这里拉出第一个实现分支。
                </p>
              )}

              {/* Discussion hint */}
              <div className="mt-2.5 flex items-center gap-2 border-t border-indigo-100/50 pt-2 text-[11px] text-slate-500">
                <MessageSquare className="h-3 w-3 text-slate-400" />
                <span>交流与技术方案探讨直接附着在 Idea 节点上</span>
              </div>
            </div>
          </div>

          {/* Node 3: Open Source Product Generated */}
          {primaryWork ? (
            <div
              className={`group relative flex gap-4 transition-all duration-200 ${getOpacity("work-result", "work")}`}
              onMouseEnter={() => setHoveredNode("work")}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Left rail column: dot + downward line */}
              <div className="relative flex flex-col items-center">
                <div className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-emerald-500">
                  <span className="h-2 w-2 rotate-45 bg-emerald-600" />
                </div>
                {/* Segment line if derived idea exists */}
                {derivedIdeas.length > 0 ? (
                  <div className="w-[2px] flex-1 bg-slate-200 my-1 relative overflow-hidden">
                    <div className="lifecycle-rail-flow-v absolute inset-0 bg-gradient-to-b from-transparent via-slate-700 to-transparent opacity-40" />
                  </div>
                ) : null}
              </div>

              {/* Right card */}
              <div className="mb-5 flex-1 rounded-xl border border-emerald-100 bg-emerald-50/20 p-3.5 transition-colors group-hover:border-emerald-300 group-hover:bg-emerald-50/40">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-medium text-emerald-900">
                    产出开源作品 · v{primaryWork.revisionNumber}
                  </span>
                  <span className="font-mono text-[10.5px] text-emerald-700/80">STAGE 03 · PRODUCT</span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/explore/${selectedIdea.id}#work-${primaryWork.id}`}
                      className="font-semibold text-[14px] text-slate-900 hover:text-emerald-700"
                    >
                      {primaryWork.title}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-600">
                      {primaryWork.summary}
                    </p>
                  </div>
                  {primaryWork.externalUrl && (
                    <a
                      href={primaryWork.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-300"
                      aria-label={`访问作品：${primaryWork.title}`}
                    >
                      访问 <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Node 4: Continuous Sprouting (Product creates Next Idea) */}
          {derivedIdeas.length > 0 ? (
            <div
              className={`group relative flex gap-4 transition-all duration-200 ${getOpacity("derived-idea", "derived")}`}
              onMouseEnter={() => setHoveredNode("derived")}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="relative flex flex-col items-center">
                <div className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-amber-500">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                </div>
                {/* Last node: NO downward line! */}
              </div>

              <div className="flex-1 rounded-xl border border-amber-200/80 bg-amber-50/30 p-3.5 transition-colors group-hover:border-amber-300 group-hover:bg-amber-50/50">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-amber-900">
                    ↳ 从作品继续长出新想法（持续演进）
                  </span>
                  <span className="font-mono text-[10.5px] text-amber-700/80">NEW CYCLE</span>
                </div>
                <Link
                  href={`/explore/${derivedIdeas[0].id}`}
                  className="mt-1.5 block font-medium text-[13.5px] text-slate-900 hover:text-amber-800"
                >
                  {derivedIdeas[0].title}
                </Link>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] text-slate-600">
                  {derivedIdeas[0].problem || derivedIdeas[0].summary}
                </p>
              </div>
            </div>
          ) : (
            /* Loop hint if no derived ideas yet */
            <div className="flex items-center gap-2 pl-10 text-[11.5px] text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-amber-500/70 shrink-0" />
              <span>作品发布后，可直接衍生下一步新需求，开启新的生长循环</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Link to Idea Detail */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-[12px]">
        <span className="font-mono text-slate-400">Graph Source: #{selectedIdea.id}</span>
        <Link
          href={`/explore/${selectedIdea.id}`}
          className="inline-flex items-center gap-1 font-medium text-slate-900 hover:text-orange-600"
        >
          查看完整生命周期记录 <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
