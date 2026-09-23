"use client";

import { MasonryGrid } from "@egjs/react-grid";
import Link from "@/components/ui/NavigationLink";
import type { PublicIdea } from "@/lib/public-catalog";
import { ArrowUpRight } from "lucide-react";
import { HoloCard } from "@/components/journal/HoloCard";

function stageLabel(idea: PublicIdea) {
  if (idea.status === "deprecated") return "已弃用";
  if (idea.works.length > 0) return "已有作品";
  if (idea.attemptCount > 0) return "实现中";
  return "待实现";
}

function ideaHref(idea: PublicIdea, workspace: boolean) {
  return workspace ? `/ideas/${idea.id}` : `/explore/${idea.id}`;
}

function IdeaFacts({ idea, workspace, light = false }: { idea: PublicIdea; workspace: boolean; light?: boolean }) {
  const body = light ? "text-white/70" : "text-slate-500";
  const link = light ? "underline underline-offset-4 hover:text-white" : "underline underline-offset-4 hover:text-slate-800";
  const work = light ? "text-white/80" : "text-slate-600";
  const label = light ? "text-white/50" : "text-slate-400";
  return (
    <>
      {idea.source ? (
        <p className={`mt-3 text-[12px] ${body}`}>
          来自作品{" "}
          <Link className={link} href={workspace ? `/works/${idea.source.workId}` : `/explore/${idea.source.ideaId}#work-${idea.source.workId}`}>
            {idea.source.workTitle}
          </Link>
        </p>
      ) : null}
      {idea.works.length > 0 ? (
        <p className={`mt-3 text-[12.5px] leading-relaxed ${work}`}>
          <span className={label}>作品 </span>
          {idea.works.map((workItem, index) => (
            <span key={workItem.id}>
              {index > 0 ? "、" : null}
              <Link className={link} href={workspace ? `/works/${workItem.id}` : `/explore/${idea.id}#work-${workItem.id}`}>
                {workItem.title}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </>
  );
}

export function CuratedMasonry({
  ideas,
  workspace = false,
}: {
  ideas: PublicIdea[];
  workspace?: boolean;
}) {
  if (ideas.length === 0) return null;

  const [featured, ...rest] = ideas;

  return (
    <div className="space-y-8 py-6">
      {featured ? (
        <HoloCard label={featured.title}>
          <div className="flex h-full min-h-[280px] flex-col p-8 sm:p-10">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-white/70">
              <span className="font-medium text-white">{stageLabel(featured)}</span>
              <span>{featured.authorName}</span>
              {featured.attemptCount > 0 ? <span>{featured.attemptCount} 人在实现</span> : null}
            </div>
            <h2 className="mt-4 max-w-3xl text-[26px] font-semibold tracking-[-0.03em] text-white sm:text-[34px]">
              {featured.title}
            </h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-white/75">
              {featured.problem || featured.summary}
            </p>
            <IdeaFacts idea={featured} workspace={workspace} light />
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={ideaHref(featured, workspace)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-semibold text-slate-950 shadow-md hover:bg-white/90"
              >
                打开这个想法 <ArrowUpRight className="h-4 w-4" />
              </Link>
              {!workspace && featured.status !== "deprecated" ? (
                <Link
                  href={`/login?next=${encodeURIComponent(`/ideas/${featured.id}`)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-black/35 px-5 py-2.5 text-[13.5px] font-medium text-white backdrop-blur-sm hover:bg-black/50"
                >
                  我来实现
                </Link>
              ) : null}
            </div>
          </div>
        </HoloCard>
      ) : null}

      {rest.length > 0 ? (
        <MasonryGrid className="idea-masonry" gap={16} align="stretch" maxStretchColumnSize={420}>
          {rest.map((idea) => (
            <article key={idea.id} className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-2 text-[11.5px] text-slate-500">
                <span className="font-medium text-slate-700">{stageLabel(idea)}</span>
                <span>{idea.authorName}</span>
              </div>
              <Link href={ideaHref(idea, workspace)} className="group block">
                <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900 group-hover:text-slate-600">
                  {idea.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-slate-500">
                  {idea.problem || idea.summary}
                </p>
              </Link>
              <IdeaFacts idea={idea} workspace={workspace} />
            </article>
          ))}
        </MasonryGrid>
      ) : null}
    </div>
  );
}
