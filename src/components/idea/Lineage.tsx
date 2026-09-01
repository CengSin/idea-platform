import { Avatar } from "@/components/ui/Avatar";
import { CoverImage } from "@/components/ui/CoverImage";
import { SproutIcon } from "@/components/icons";
import { ATTEMPT_STATUS_LABEL, effectiveAttemptStatus, userById } from "@/lib/format";
import { visibleLineageAttempts } from "@/lib/idea-lineage";
import type { Attempt, Database, Work } from "@/lib/types";
import Link from "@/components/ui/NavigationLink";

export function Lineage({
  db,
  attempts,
  works,
  currentUserId,
  ideaTitle,
}: {
  db: Database;
  attempts: Attempt[];
  works: Work[];
  currentUserId: string;
  ideaTitle: string;
}) {
  const tracks = visibleLineageAttempts(attempts, currentUserId);

  if (tracks.length === 0) return <p className="mt-10 rounded-2xl border border-dashed border-line p-6 text-[13px] text-muted">还没有实现分支。承接后，你的进展会出现在这里。</p>;

  return (
    <section className="lineage-tree mt-10" aria-label="项目实现分支">
      <div className="lineage-tree-root">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-idea/40 bg-idea/10 text-idea shadow-[0_0_24px_rgba(242,166,90,0.18)]">
          <span className="idea-halo" />
          <SproutIcon className="h-7 w-7" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] tracking-[0.08em] text-idea">主项目</span>
          <strong className="mt-1 block truncate text-[15px] font-medium tracking-[-0.02em]">{ideaTitle}</strong>
        </span>
      </div>

      <div className="lineage-tree-branches">
        {tracks.map((attempt) => {
          const owner = userById(db, attempt.ownerId);
          const status = effectiveAttemptStatus(attempt);
          const attemptWorks = works.filter((work) => work.attemptId === attempt.id);
          const dim = status === "stalled" || status === "paused";

          return (
            <article key={attempt.id} className={`lineage-tree-branch ${dim ? "is-dim" : ""}`}>
              <Link href={`/attempts/${attempt.id}`} className="lineage-tree-attempt glass lift">
                <Avatar initials={owner?.initials ?? "·"} accent={owner?.accent ?? "#66C7C0"} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] tracking-[-0.02em]">{attempt.title}</span>
                  <span className="mt-1 block truncate text-[11px] text-muted">{owner?.displayName ?? "实现者"}</span>
                </span>
                <span className="lineage-tree-status">{ATTEMPT_STATUS_LABEL[status]}</span>
              </Link>

              {attemptWorks.length > 0 ? (
                <div className="lineage-tree-works">
                  {attemptWorks.map((work) => (
                    <div key={work.id} className="lineage-tree-work-row">
                      <Link href={`/works/${work.id}`} className="lineage-tree-work glass lift media-zoom">
                        <CoverImage src={work.coverUrl} pageUrl={work.externalUrl} className="h-[76px] w-[112px] shrink-0 object-cover" />
                        <span className="min-w-0 py-2 pr-3">
                          <span className="block truncate text-[14px]">{work.title}</span>
                          <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-muted">{work.summary}</span>
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="lineage-tree-progress">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-active/60 bg-active/10" />
                  <span className="min-w-0 truncate">{attempt.progressNote || "持续推进中"}</span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
