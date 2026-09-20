"use client";

import Link from "@/components/ui/NavigationLink";
import type { PublicIdea } from "@/lib/public-catalog";
import { ArrowUpRight, Sparkles, User } from "lucide-react";

export function CuratedMasonry({
  ideas,
  workspace = false,
}: {
  ideas: PublicIdea[];
  workspace?: boolean;
}) {
  if (ideas.length === 0) return null;

  const [featured, ...rest] = ideas;

  const tagColors = [
    "bg-amber-50 text-amber-700 border-amber-200/80",
    "bg-violet-50 text-violet-700 border-violet-200/80",
    "bg-sky-50 text-sky-700 border-sky-200/80",
    "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    "bg-rose-50 text-rose-700 border-rose-200/80",
  ];

  return (
    <div className="py-6 space-y-10">
      {/* 1. Hero Spotlight Idea Card */}
      {featured ? (
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/50 to-amber-50/20 p-8 sm:p-10 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/10 via-violet-400/10 to-transparent blur-2xl pointer-events-none" />
          <div className="relative z-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3 py-1 text-[11px] font-semibold text-amber-800 uppercase tracking-wider border border-amber-200">
                <Sparkles className="h-3 w-3 text-amber-600" />
                Featured Spark · 焦点灵感
              </span>
              <div className="flex items-center gap-3 text-[12px] text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {featured.authorName}
                </span>
                {featured.attemptCount > 0 ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600 font-medium">
                    🔥 {featured.attemptCount} 人正在承接
                  </span>
                ) : null}
              </div>
            </div>

            <h2 className="mt-5 text-[24px] sm:text-[30px] font-extrabold tracking-[-0.03em] text-slate-900 leading-tight">
              {featured.title}
            </h2>

            <p className="mt-3 max-w-3xl text-[14.5px] sm:text-[15.5px] leading-relaxed text-slate-600">
              {featured.problem || featured.summary}
            </p>

            {featured.tags && featured.tags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {featured.tags.map((tag, idx) => (
                  <span
                    key={tag}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border ${tagColors[idx % tagColors.length]}`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            {featured.works.length > 0 ? (
              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-xs p-3.5 border border-slate-200/70">
                <span className="text-[12px] font-semibold text-emerald-700 flex items-center gap-1">
                  💎 成果结晶：
                </span>
                {featured.works.map((w) => (
                  <Link
                    key={w.id}
                    href={workspace ? `/works/${w.id}` : `/explore/${featured.id}#work-${w.id}`}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-700 hover:text-indigo-600 underline underline-offset-4"
                  >
                    {w.title} <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={workspace ? `/ideas/${featured.id}` : `/explore/${featured.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-[13.5px] font-medium text-white shadow-xs hover:bg-slate-800 transition-all"
              >
                深入这个想法 <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href={workspace ? `/attempts?ideaId=${featured.id}` : "/register"}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-[13.5px] font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all shadow-2xs"
              >
                ⚡ 我来建造落地
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* 2. Masonry Stream for Rest of the Ideas */}
      {rest.length > 0 ? (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              灵感画廊 · 更多值得被解决的问题
            </h3>
            <span className="text-[12px] text-slate-400">共 {ideas.length} 个念头</span>
          </div>

          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {rest.map((idea, index) => {
              const auraStyles = [
                "hover:border-amber-300 hover:shadow-amber-500/10",
                "hover:border-violet-300 hover:shadow-violet-500/10",
                "hover:border-sky-300 hover:shadow-sky-500/10",
                "hover:border-emerald-300 hover:shadow-emerald-500/10",
                "hover:border-rose-300 hover:shadow-rose-500/10",
              ];
              const cardTilt =
                index % 3 === 0
                  ? "hover:-rotate-0.5"
                  : index % 3 === 1
                  ? "hover:rotate-0.5"
                  : "";
              const aura = auraStyles[index % auraStyles.length];

              return (
                <div
                  key={idea.id}
                  className={`break-inside-avoid relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${aura} ${cardTilt}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {idea.works.length > 0 ? "已有作品" : idea.attemptCount > 0 ? "落地中" : "待认领"}
                    </span>
                    <span className="text-[11.5px] text-slate-400">
                      {idea.authorName}
                    </span>
                  </div>

                  <Link href={workspace ? `/ideas/${idea.id}` : `/explore/${idea.id}`} className="group block">
                    <h4 className="text-[16px] font-bold text-slate-900 tracking-[-0.02em] leading-snug group-hover:text-indigo-600 transition-colors">
                      {idea.title}
                    </h4>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-500 line-clamp-4">
                      {idea.problem || idea.summary}
                    </p>
                  </Link>

                  {idea.tags && idea.tags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {idea.tags.slice(0, 3).map((tag, tIdx) => (
                        <span
                          key={tag}
                          className={`rounded-md px-2 py-0.5 text-[10.5px] font-medium border ${tagColors[tIdx % tagColors.length]}`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {idea.works.length > 0 ? (
                    <div className="mt-4 rounded-xl bg-emerald-50/80 border border-emerald-100 p-2.5 text-[11.5px] text-emerald-800">
                      <span className="font-semibold">💎 已孵化出：</span>
                      {idea.works.map((w) => w.title).join("、")}
                    </div>
                  ) : null}

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[12px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      {idea.attemptCount > 0 ? `${idea.attemptCount} 个承接` : "等待第一位建造者"}
                    </span>
                    <Link
                      href={workspace ? `/ideas/${idea.id}` : `/explore/${idea.id}`}
                      className="font-medium text-slate-700 hover:text-indigo-600 flex items-center gap-0.5 transition-colors"
                    >
                      探索念头 <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
