import { PageFrame } from "@/components/chrome/PageFrame";
import { Chip } from "@/components/ui/Chip";
import {
  ATTEMPT_STATUS_LABEL,
  VISIBILITY_LABEL,
  effectiveAttemptStatus,
  ideaById,
  relativeTime,
} from "@/lib/format";
import { getSnapshot } from "@/lib/queries";
import Link from "@/components/ui/NavigationLink";

export const dynamic = "force-dynamic";

export default async function AttemptsPage() {
  const { db, currentUserId } = await getSnapshot();
  const mine = db.attempts
    .filter((a) => a.ownerId === currentUserId)
    .sort((a, b) => (a.lastActiveAt < b.lastActiveAt ? 1 : -1));

  return (
    <PageFrame>
        <h1 className="text-[28px] font-semibold tracking-[-0.04em]">承接中</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          列表用于管理和完成任务。阶段、活性与阻塞比点赞更重要。
        </p>
        {mine.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {mine.map((attempt) => {
              const idea = ideaById(db, attempt.ideaId);
              const status = effectiveAttemptStatus(attempt);
              const hasBlocker = Boolean(attempt.blockers[0]);
              return (
                <div
                  key={attempt.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Chip
                          tone={
                            status === "published"
                              ? "artifact"
                              : status === "stalled" || status === "paused"
                                ? "mute"
                                : "active"
                          }
                        >
                          {ATTEMPT_STATUS_LABEL[status]}
                        </Chip>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          {VISIBILITY_LABEL[attempt.visibility]}
                        </span>
                      </div>
                      <span className="text-[11.5px] text-slate-400">{relativeTime(attempt.lastActiveAt)}</span>
                    </div>

                    <Link href={`/attempts/${attempt.id}`} className="block">
                      <h2 className="text-[16.5px] font-bold text-slate-900 tracking-[-0.02em] leading-snug group-hover:text-indigo-600 transition-colors">
                        {attempt.title}
                      </h2>
                    </Link>

                    {idea ? (
                      <Link
                        href={`/ideas/${attempt.ideaId}`}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50/80 border border-amber-200/60 px-2.5 py-1 text-[12px] font-medium text-amber-800 hover:bg-amber-100/70 transition-colors"
                      >
                        <span>💡 起源想法：</span>
                        <span className="underline underline-offset-2">{idea.title}</span>
                      </Link>
                    ) : null}

                    {hasBlocker ? (
                      <div className="mt-3.5 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-[12px] text-rose-800">
                        <span className="font-semibold">⚠️ 遭遇阻塞：</span>
                        <span>{attempt.blockers[0]}</span>
                      </div>
                    ) : attempt.targetDate ? (
                      <div className="mt-3 text-[12px] text-slate-500">
                        🎯 目标完成时间：<span className="font-medium text-slate-700">{attempt.targetDate}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[12px]">
                    <span className="text-slate-400">
                      {attempt.todos?.length ? `${attempt.todos.filter((t: { done: boolean }) => t.done).length}/${attempt.todos.length} 项任务` : "进行中"}
                    </span>
                    <Link
                      href={`/attempts/${attempt.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                    >
                      进入建造看板 →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-2xs border border-slate-200/80 text-xl">
              ⚡
            </div>
            <h2 className="mt-4 text-[16px] font-bold text-slate-800">当前没有正在进行的承接</h2>
            <p className="mt-1 text-[13px] text-slate-500">
              在广场发现感兴趣的想法，认领并把它建造出来吧。
            </p>
            <div className="mt-5">
              <Link
                href="/explore#ideas"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-[13px] font-medium text-white shadow-xs hover:bg-slate-800 transition-colors"
              >
                前往灵感广场探索 →
              </Link>
            </div>
          </div>
        )}
      </PageFrame>
  );
}
