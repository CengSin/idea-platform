import { Avatar } from "@/components/ui/Avatar";
import { CoverImage } from "@/components/ui/CoverImage";
import { effectiveAttemptStatus, userById } from "@/lib/format";
import type { Attempt, Database, Work } from "@/lib/types";
import { ATTEMPT_STAGE_ORDER } from "@/lib/types";
import { SproutIcon } from "@/components/icons";
import { Bike, Fish, Headphones, Waves } from "lucide-react";
import Link from "@/components/ui/NavigationLink";

const STAGES = ATTEMPT_STAGE_ORDER;
const PREFERRED = ["att_seawalk", "att_noiseless", "att_echoplan", "att_citystudio"];

function glyph(title: string) {
  const t = title.toLowerCase();
  if (t.includes("sea") || t.includes("walk")) return Fish;
  if (t.includes("less") || t.includes("noise")) return Bike;
  if (t.includes("echo")) return Headphones;
  return Waves;
}

export function Lineage({
  db,
  attempts,
  works,
  currentUserId,
}: {
  db: Database;
  attempts: Attempt[];
  works: Work[];
  currentUserId: string;
}) {
  const eligible = attempts.filter((a) => {
    const s = effectiveAttemptStatus(a);
    return s !== "considering" && s !== "abandoned" && s !== "paused";
  });
  const preferred = PREFERRED.map((id) => eligible.find((a) => a.id === id)).filter(
    Boolean,
  ) as Attempt[];
  const rest = eligible.filter((a) => !PREFERRED.includes(a.id));
  const mine = rest.filter((a) => a.ownerId === currentUserId);
  const tracks = [...preferred, ...mine, ...rest.filter((a) => a.ownerId !== currentUserId)].slice(
    0,
    4,
  );
  const hidden = eligible.length - tracks.length;

  if (tracks.length === 0) return <p className="rounded-2xl border border-dashed border-line p-6 text-[13px] text-muted">还没有实现轨道。承接后，你的进展会出现在这里。</p>;

  return (
    <section className="mt-8">
      <div
        className="lineage-heading grid items-end gap-3 pb-2"
      >
        <div />
        {["理解中", "原型中", "公开测试", "已发布"].map((label) => (
          <div key={label} className="text-center text-[12px] tracking-[0.08em] text-muted">
            {label}
          </div>
        ))}
      </div>
      <div className="space-y-6">
        {tracks.map((attempt) => {
          const owner = userById(db, attempt.ownerId);
          const status = effectiveAttemptStatus(attempt);
          const stageIndex = Math.max(
            0,
            STAGES.indexOf(
              status === "stalled" ? (attempt.status as (typeof STAGES)[number]) : (status as (typeof STAGES)[number]),
            ),
          );
          const work = works.find((w) => w.attemptId === attempt.id);
          const Icon = glyph(attempt.title);
          const dim = status === "stalled";
          return (
            <div
              key={attempt.id}
              className="lineage-row grid items-center gap-3"
            >
              <Link href={`/attempts/${attempt.id}`} className="lineage-name flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full border"
                  style={{
                    color: owner?.accent ?? "#66C7C0",
                    borderColor: `${owner?.accent ?? "#66C7C0"}66`,
                    background: `${owner?.accent ?? "#66C7C0"}18`,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[14px] tracking-[-0.02em]">{attempt.title}</span>
              </Link>
              {STAGES.slice(0, 3).map((stage, i) => {
                const done = i <= stageIndex;
                const isCurrent = i === stageIndex && status !== "published";
                const dashed = i > stageIndex;
                return (
                  <div key={stage} data-stage={["理解中", "原型中", "公开测试"][i]} className="lineage-stage relative flex items-center">
                    <div
                      className="h-px w-full"
                      style={{
                        background: dashed
                          ? "transparent"
                          : "linear-gradient(90deg, rgba(102,199,192,0.18), rgba(102,199,192,0.85))",
                        borderTop: dashed ? "1px dashed rgba(102,199,192,0.3)" : undefined,
                        opacity: dim ? 0.45 : 1,
                      }}
                    />
                    <span
                      className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border ${isCurrent ? "stage-pulse" : ""}`}
                      style={{
                        background: done ? "#66C7C0" : "transparent",
                        borderColor: isCurrent ? "#9BE7E1" : "rgba(102,199,192,0.7)",
                        boxShadow: isCurrent ? "0 0 10px rgba(102,199,192,0.7)" : undefined,
                      }}
                    />
                  </div>
                );
              })}
              <div className="lineage-work relative min-h-[76px]">
                {work ? (
                  <Link
                    href={`/works/${work.id}`}
                    className="glass lift media-zoom flex items-center gap-3 overflow-hidden rounded-2xl"
                  >
                    <span className="absolute left-[-18px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-artifact" />
                    <CoverImage src={work.coverUrl} pageUrl={work.externalUrl} className="h-[76px] w-[112px] object-cover" />
                    <span className="min-w-0 py-2 pr-3">
                      <span className="block truncate text-[14px]">{work.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted">
                        {work.summary}
                      </span>
                    </span>
                  </Link>
                ) : (
                  <div className="flex h-[76px] items-center justify-between rounded-2xl border border-dashed border-line px-4 text-[12.5px] text-muted">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full border border-active/50" />
                      持续推进中
                    </span>
                    {owner ? <Avatar initials={owner.initials} accent={owner.accent} size={22} /> : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hidden > 0 ? (
        <p className="mt-4 text-[12.5px] text-muted">还有 {hidden} 条并行分支未展开。</p>
      ) : null}
    </section>
  );
}

export function LineageRail() {
  return (
    <div className="flex items-center">
      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-idea/40 bg-idea/10 text-idea shadow-[0_0_24px_rgba(242,166,90,0.18)]">
        <span className="idea-halo" />
        <SproutIcon className="h-8 w-8" />
      </span>
    </div>
  );
}
