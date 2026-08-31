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
        <div className="table-shell mt-6">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-white/4 text-[12px] tracking-[0.06em] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">分支</th>
                <th className="px-5 py-3 font-medium">来源想法</th>
                <th className="px-5 py-3 font-medium">当前阶段</th>
                <th className="px-5 py-3 font-medium">最近活动</th>
                <th className="px-5 py-3 font-medium">阻塞</th>
                <th className="px-5 py-3 font-medium">可见性</th>
                <th className="px-5 py-3 font-medium">目标日期</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((attempt) => {
                const idea = ideaById(db, attempt.ideaId);
                const status = effectiveAttemptStatus(attempt);
                return (
                  <tr key={attempt.id} className="row-hover border-t border-line">
                    <td className="px-5 py-4">
                      <Link href={`/attempts/${attempt.id}`}>{attempt.title}</Link>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      <Link href={`/ideas/${attempt.ideaId}`}>{idea?.title}</Link>
                    </td>
                    <td className="px-5 py-4">
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
                    </td>
                    <td className="px-5 py-4 text-muted">{relativeTime(attempt.lastActiveAt)}</td>
                    <td className="px-5 py-4 text-blocked">
                      {attempt.blockers[0] ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-muted">{VISIBILITY_LABEL[attempt.visibility]}</td>
                    <td className="px-5 py-4 text-muted">{attempt.targetDate ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
    </PageFrame>
  );
}
