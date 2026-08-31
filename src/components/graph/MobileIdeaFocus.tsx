"use client";

import { ArrowRight, GitBranch } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { ATTEMPT_STATUS_LABEL, effectiveAttemptStatus, userById } from "@/lib/format";
import type { Attempt, Database, Idea } from "@/lib/types";

// Preserve the same drill-down on small screens without shrinking text with the camera.
export function MobileIdeaFocus({ db, idea, myAttempt, onAdopt }: {
  db: Database;
  idea: Idea;
  myAttempt?: Attempt;
  onAdopt: () => void;
}) {
  const attempts = db.attempts.filter((attempt) => attempt.ideaId === idea.id && attempt.featuredOnGraph);
  const works = db.works.filter((work) => work.ideaId === idea.id && work.status === "published");
  return <section className="discovery-mobile-focus scroll-thin" aria-label={`${idea.title} 的生长路径`}>
    <div className="discovery-mobile-summary glass">
      <span className="discovery-status">想法的生长路径</span>
      <h1>{idea.title}</h1>
      <p>{idea.summary}</p>
      <Link href={`/ideas/${idea.id}`} className="explore-secondary">查看想法详情<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
      {myAttempt ? <Link href={`/attempts/${myAttempt.id}`} className="explore-cta">查看我的承接</Link> : <Button tone="idea" onClick={onAdopt}>承接这个想法</Button>}
    </div>
    <h2 className="discovery-mobile-section-title"><GitBranch aria-hidden="true" className="h-4 w-4" />实现路径 · {attempts.length}</h2>
    {attempts.length === 0 ? <p className="text-[13px] leading-relaxed text-muted">这里还没有展示的承接路径，你可以从一个方向开始。</p> : attempts.map((attempt) => {
      const owner = userById(db, attempt.ownerId);
      return <Link key={attempt.id} href={`/attempts/${attempt.id}`} className="discovery-mobile-attempt glass">
        <Avatar initials={owner?.initials ?? "·"} accent={owner?.accent ?? "#6fd4cb"} size={32} />
        <span className="min-w-0 flex-1"><span className="block truncate">{attempt.title}</span><span className="mt-1 block text-[11px] text-muted">{owner?.displayName ?? "承接者"} · {ATTEMPT_STATUS_LABEL[effectiveAttemptStatus(attempt)]}</span></span>
        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
      </Link>;
    })}
    {works.length > 0 ? <>
      <h2 className="discovery-mobile-section-title">已落地的作品 · {works.length}</h2>
      {works.map((work) => <Link key={work.id} href={`/works/${work.id}`} className="discovery-work glass media-zoom">
        <div className="discovery-work-cover"><CoverImage src={work.coverUrl} pageUrl={work.externalUrl} className="h-full w-full object-cover" /></div>
        <div className="discovery-work-caption"><h3>{work.title}</h3><ArrowRight aria-hidden="true" className="h-4 w-4" /></div>
      </Link>)}
    </> : null}
  </section>;
}
