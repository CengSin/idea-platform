"use client";

import React from "react";
import Link from "@/components/ui/NavigationLink";
import type { PublicIdea } from "@/lib/public-catalog";
import { FeaturedIdeaLifecycle } from "@/components/journal/FeaturedIdeaLifecycle";
import { ArrowRight, Compass, Sparkles } from "lucide-react";

export function ExploreHero({ ideas, workspace = false }: { ideas: PublicIdea[]; workspace?: boolean }) {
  return (
    <section className="explore-hero relative pt-8 pb-12 sm:pt-14 sm:pb-16" aria-labelledby="hero-title">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Left Column (Approx 40-42%) */}
        <div className="flex flex-col lg:col-span-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/80 bg-orange-50/70 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-orange-700">
              <Sparkles className="h-3 w-3" />
              Idea Platform
            </span>
          </div>

          <h1
            id="hero-title"
            className="mt-6 text-[36px] font-bold tracking-tight text-slate-950 sm:text-[44px] sm:leading-[1.18] lg:text-[46px]"
          >
            这里的想法，<br />
            不止用来收藏。
          </h1>

          <p className="mt-5 text-[15.5px] leading-relaxed text-slate-600 sm:text-[16.5px]">
            分享一个还没实现的想法。<br className="hidden sm:inline" />
            让别人沿着自己的方向实现它，再把作品带回来。
          </p>

          {/* Core Mechanism Micro-Pointers */}
          <div className="mt-8 flex flex-col gap-2.5 border-l-2 border-slate-200 pl-4 text-[13px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
              <span>一个想法，可以由不同开发者分别独立实现</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
              <span>所有作品完整溯源归因到最初的想法</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
              <span>作品落地后，可继续衍生出新的想法与分支</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <Link
              href={workspace ? "/ideas/new" : "/register"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
            >
              <span>分享一个想法</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#explore-ideas"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-medium text-slate-800 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50/80 active:scale-[0.99]"
            >
              <Compass className="h-4 w-4 text-slate-500" />
              <span>找一个来实现</span>
            </a>
          </div>
        </div>

        {/* Right Column (Approx 58-60%): Interactive Lifecycle Graph */}
        <div className="lg:col-span-7">
          <FeaturedIdeaLifecycle ideas={ideas} />
        </div>
      </div>
    </section>
  );
}
