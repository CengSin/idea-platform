"use client";

import { ArrowUpRight, GitBranch, Sparkles } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
import { relativeTime } from "@/lib/format";
import type { ActivityEvent, Database, Idea } from "@/lib/types";
import { useMemo } from "react";

export function ActivityDigest({ db, ideas, onSelect }: { db: Database; ideas: Idea[]; onSelect: (idea: Idea) => void }) {
  const items = useMemo(() => {
    const groups = new Map<string, { event: ActivityEvent; idea?: Idea; events: ActivityEvent[] }>();
    for (const event of [...db.events].sort((a, b) => b.at.localeCompare(a.at))) {
      const work = db.works.find((item) => item.id === event.workId);
      const attempt = db.attempts.find((item) => item.id === event.attemptId);
      const ideaId = event.ideaId ?? attempt?.ideaId ?? work?.ideaId;
      const idea = ideas.find((item) => item.id === ideaId);
      if (ideaId && !idea) continue;
      // Merge a project's updates within one day, without rewriting its history.
      const key = ideaId ? `${ideaId}:${event.at.slice(0, 10)}` : event.id;
      const group = groups.get(key);
      if (group) {
        group.events.push(event);
        // A shipped work is more useful on the home page than a build log.
        if (event.workId && !group.event.workId) group.event = event;
      } else groups.set(key, { event, idea, events: [event] });
    }
    return [...groups.values()].sort((a, b) => b.event.at.localeCompare(a.event.at)).slice(0, 5);
  }, [db, ideas]);

  return (
    <div className="discovery-digest glass-heavy">
      <div className="discovery-digest-heading"><h2><span className="live-dot" />正在发生</h2><span>最近进展</span></div>
      {items.length === 0 ? <p className="discovery-digest-empty">发布、承接或完成一个作品，第一条进展就会出现在这里。</p> : (
        <ol className="discovery-events">
          {items.map(({ event, idea, events }) => {
            const work = db.works.find((item) => item.id === event.workId && item.status === "published");
            const summary = work ? `发布了作品「${work.title}」` : event.text;
            const content = <>
              <span className={`discovery-event-icon ${work ? "is-work" : ""}`} aria-hidden="true">{work ? <Sparkles className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />}</span>
              <span className="min-w-0 flex-1">
                <span className="discovery-event-meta"><span>{event.actorName}</span><time dateTime={event.at}>{relativeTime(event.at)}</time></span>
                <span className="discovery-event-summary">{summary}</span>
                <span className="discovery-event-project">{idea?.title ?? "项目动态"}</span>
              </span>
            </>;
            return <li key={event.id}>
              {idea ? <button type="button" className="discovery-event" onClick={() => onSelect(idea)} aria-label={`查看 ${idea.title} 的进展`}>{content}</button> : <div className="discovery-event">{content}</div>}
              <details className="discovery-event-history">
                <summary>查看 {events.length} 条完整记录</summary>
                <ul>{events.map((item) => <li key={item.id}><time dateTime={item.at}>{relativeTime(item.at)}</time><p>{item.text}</p></li>)}</ul>
              </details>
            </li>;
          })}
        </ol>
      )}
      <Link href="/attempts" className="discovery-digest-footer">查看我的承接进展<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
    </div>
  );
}
