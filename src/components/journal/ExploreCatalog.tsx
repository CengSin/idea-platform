"use client";

import React, { useMemo, useState } from "react";
import Link from "@/components/ui/NavigationLink";
import type { PublicIdea } from "@/lib/public-catalog";
import { IdeaNode } from "@/components/journal/IdeaNode";
import { Search, SlidersHorizontal, Sparkles, X } from "lucide-react";

export type ExploreTab = "all" | "unclaimed" | "building" | "has_works";

export function ExploreCatalog({
  ideas,
  workspace = false,
}: {
  ideas: PublicIdea[];
  workspace?: boolean;
}) {
  const [tab, setTab] = useState<ExploreTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [includeDeprecated, setIncludeDeprecated] = useState(false);

  // Compute counts for tabs
  const counts = useMemo(() => {
    const nonDeprecated = ideas.filter((i) => i.status !== "deprecated");
    return {
      all: nonDeprecated.length,
      unclaimed: nonDeprecated.filter((i) => i.attemptCount === 0 && i.works.length === 0).length,
      building: nonDeprecated.filter((i) => i.attemptCount > 0 && i.works.length === 0).length,
      has_works: nonDeprecated.filter((i) => i.works.length > 0).length,
      deprecated: ideas.filter((i) => i.status === "deprecated").length,
    };
  }, [ideas]);

  const filteredIdeas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return ideas.filter((idea) => {
      // Deprecated filter
      if (!includeDeprecated && idea.status === "deprecated") {
        return false;
      }
      if (includeDeprecated && tab !== "all" && idea.status === "deprecated") {
        // if user specifically chose a tab, only match deprecated if they selected 'all' with deprecated checked
        return false;
      }

      // Intent filter
      if (tab === "unclaimed") {
        if (idea.attemptCount > 0 || idea.works.length > 0) return false;
      } else if (tab === "building") {
        if (idea.attemptCount === 0 || idea.works.length > 0) return false;
      } else if (tab === "has_works") {
        if (idea.works.length === 0) return false;
      }

      // Search match
      if (!q) return true;
      const haystack = [
        idea.title,
        idea.summary,
        idea.problem,
        idea.authorName,
        ...(idea.tags || []),
        ...idea.works.map((w) => w.title),
        ...idea.works.map((w) => w.summary),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [ideas, tab, searchQuery, includeDeprecated]);

  return (
    <section id="explore-ideas" className="explore-catalog relative pt-8 pb-20" aria-labelledby="catalog-heading">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            EXPLORE IDEAS
          </span>
          <h2 id="catalog-heading" className="mt-1 text-[24px] font-bold tracking-tight text-slate-900 sm:text-[28px]">
            寻找一个想法并参与
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            每一个想法都在等待不同的实现方式。你可以浏览、承接或在此基础上发布新作品。
          </p>
        </div>
      </div>

      {/* Toolbar: Intent Tabs & Search & More Filter */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Intent-Driven Primary Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 select-none" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "all"}
            onClick={() => setTab("all")}
            className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-all ${
              tab === "all"
                ? "bg-white text-slate-950 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            探索 <span className="ml-1 text-[11px] text-slate-400">({counts.all})</span>
          </button>

          <button
            role="tab"
            aria-selected={tab === "unclaimed"}
            onClick={() => setTab("unclaimed")}
            className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-all ${
              tab === "unclaimed"
                ? "bg-white text-slate-950 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            等你实现 <span className="ml-1 text-[11px] text-slate-400">({counts.unclaimed})</span>
          </button>

          <button
            role="tab"
            aria-selected={tab === "building"}
            onClick={() => setTab("building")}
            className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-all ${
              tab === "building"
                ? "bg-white text-slate-950 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            正在发生 <span className="ml-1 text-[11px] text-slate-400">({counts.building})</span>
          </button>

          <button
            role="tab"
            aria-selected={tab === "has_works"}
            onClick={() => setTab("has_works")}
            className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-all ${
              tab === "has_works"
                ? "bg-white text-slate-950 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            已有作品 <span className="ml-1 text-[11px] text-slate-400">({counts.has_works})</span>
          </button>
        </div>

        {/* Right side: Search & Secondary Filters */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索想法、标签或作品…"
              className="w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-9 pr-8 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              aria-label="搜索想法"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="清除搜索"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Secondary Filter: Toggle Deprecated */}
          {counts.deprecated > 0 && (
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[12px] text-slate-600 hover:bg-slate-50 select-none">
              <input
                type="checkbox"
                checked={includeDeprecated}
                onChange={(e) => setIncludeDeprecated(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>含已弃用 ({counts.deprecated})</span>
            </label>
          )}
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="mt-8">
        {filteredIdeas.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredIdeas.map((idea) => (
              <IdeaNode
                key={idea.id}
                idea={idea}
                workspace={workspace}
                allIdeas={ideas}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-16 text-center">
            <Sparkles className="h-8 w-8 text-slate-300" />
            <h3 className="mt-3 text-[16px] font-semibold text-slate-800">
              {ideas.length ? "没有找到符合条件的想法" : "让第一个想法留在这里"}
            </h3>
            <p className="mt-1 max-w-sm text-[13px] text-slate-500">
              {ideas.length
                ? "尝试更换搜索词，或者切换到其他意图标签。"
                : "提出一个你在意的问题，让更多开发者一起实现。"}
            </p>
            {ideas.length ? (
              <button
                onClick={() => {
                  setTab("all");
                  setSearchQuery("");
                  setIncludeDeprecated(false);
                }}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                重置筛选条件
              </button>
            ) : (
              <Link
                href={workspace ? "/ideas/new" : "/register"}
                className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-800"
              >
                写下想法 →
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
