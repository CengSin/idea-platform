"use client";

import { ArrowRight, GitBranch, Sparkles } from "lucide-react";
import { SproutIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { CoverImage } from "@/components/ui/CoverImage";
import Link from "@/components/ui/NavigationLink";
import {
  ATTEMPT_STATUS_LABEL, IDEA_STATUS_LABEL, WORK_TYPE_LABEL,
  effectiveAttemptStatus, relativeTime, userById,
} from "@/lib/format";
import { ACTIVE_ATTEMPT_STATUSES, type Database, type Idea, type IdeaMetrics } from "@/lib/types";

export function IdeaOverview({ db, ideas, metricsById, onSelect, list = false }: {
  db: Database;
  ideas: Idea[];
  metricsById: Map<string, IdeaMetrics>;
  onSelect: (idea: Idea) => void;
  list?: boolean;
}) {
  return (
    <div className={`discovery-projects ${list ? "is-list" : "is-map"} ${ideas.length > 6 ? "is-dense" : ""}`} data-count={ideas.length}>
      {ideas.map((idea) => {
        const metrics = metricsById.get(idea.id)!;
        const works = db.works
          .filter((work) => work.ideaId === idea.id && work.status === "published")
          .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
        const work = works[0];
        const attempts = db.attempts
          .filter((attempt) => attempt.ideaId === idea.id && attempt.featuredOnGraph && attempt.status !== "abandoned")
          .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
        const active = attempts.find((attempt) => ACTIVE_ATTEMPT_STATUSES.includes(effectiveAttemptStatus(attempt)));
        const workAttempt = work ? attempts.find((attempt) => attempt.id === work.attemptId) : undefined;
        const attempt = active ?? workAttempt ?? attempts[0];
        const owner = attempt ? userById(db, attempt.ownerId) : undefined;
        const parent = db.ideas.find((item) => item.id === idea.parentIdeaId && item.status !== "draft" && item.status !== "archived");

        return (
          <article key={idea.id} className="discovery-project" aria-label={idea.title}>
            <div className="discovery-idea glass">
              <div className="discovery-project-heading">
                <span className={`idea-shell discovery-orb ${idea.status === "dormant" ? "is-dormant" : ""}`} aria-hidden="true">
                  <span className="idea-bloom" />
                  <span className="idea-orb"><SproutIcon className="idea-core" /></span>
                </span>
                <div className="min-w-0 flex-1">
                  <span className="discovery-status">{IDEA_STATUS_LABEL[idea.status]}</span>
                  <h2><button type="button" data-idea-id={idea.id} onClick={() => onSelect(idea)} aria-label={`展开 ${idea.title}`}>{idea.title}</button></h2>
                </div>
              </div>
              <p className="discovery-summary">{idea.summary || idea.problem || "一个等待被实现的新想法。"}</p>
              {idea.tags.length > 0 ? <div className="discovery-tags">{idea.tags.slice(0, 2).map((tag) => <span key={tag}>#{tag}</span>)}</div> : null}
              <div className="discovery-metrics">
                <span><span className="discovery-dot active" />{metrics.activeAttemptCount} 个进行中</span>
                <span><span className="discovery-dot work" />{metrics.workCount} 个作品</span>
              </div>
              <div className="discovery-project-footer">
                <span>{relativeTime(idea.updatedAt)}更新</span>
                <button type="button" onClick={() => onSelect(idea)} aria-label={`查看 ${idea.title} 的生长路径`}>
                  生长路径 <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {parent ? <button type="button" className="discovery-parent" onClick={() => onSelect(parent)}><GitBranch aria-hidden="true" className="h-3.5 w-3.5" /><span>衍生自 {parent.title}</span></button> : null}

            {attempt || work ? (
              <div className="discovery-branches">
                {attempt ? (
                  <Link href={`/attempts/${attempt.id}`} className="discovery-attempt" aria-label={`${owner?.displayName ?? attempt.title} · ${ATTEMPT_STATUS_LABEL[effectiveAttemptStatus(attempt)]}`}>
                    <Avatar initials={owner?.initials ?? "·"} accent={owner?.accent ?? "#6fd4cb"} size={26} />
                    <span className="truncate">{owner?.displayName ?? attempt.title}</span>
                    <span className="discovery-attempt-stage">{ATTEMPT_STATUS_LABEL[effectiveAttemptStatus(attempt)]}</span>
                    {metrics.activeAttemptCount > 1 ? <span className="discovery-more">另有 {metrics.activeAttemptCount - (active ? 1 : 0)} 个进行中</span> : null}
                  </Link>
                ) : null}
                {work ? (
                  <Link href={`/works/${work.id}`} className="discovery-work glass media-zoom" aria-label={`查看作品 ${work.title}`}>
                    <div className="discovery-work-cover">
                      <CoverImage src={work.coverUrl} pageUrl={work.externalUrl} className="h-full w-full object-cover" />
                      <span className="discovery-work-label"><Sparkles aria-hidden="true" className="h-3 w-3" />已落地</span>
                    </div>
                    <div className="discovery-work-caption">
                      <div className="min-w-0"><h3>{work.title}</h3><p>{WORK_TYPE_LABEL[work.type]}{works.length > 1 ? ` · 另有 ${works.length - 1} 个作品` : " · 来自这个想法"}</p></div>
                      <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                    </div>
                  </Link>
                ) : null}
              </div>
            ) : (
              <button type="button" className="discovery-invitation" onClick={() => onSelect(idea)}>
                <GitBranch aria-hidden="true" className="h-4 w-4" />{metrics.totalAttemptCount === 0 ? "第一条实现路径，等你开启" : "看看这个想法的实现路径"}<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
