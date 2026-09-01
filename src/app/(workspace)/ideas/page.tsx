import { PageFrame } from "@/components/chrome/PageFrame";
import { Chip } from "@/components/ui/Chip";
import { PublishIdeaButton } from "@/components/idea/PublishIdeaButton";
import { IDEA_STATUS_LABEL, ideaMetrics, relativeTime } from "@/lib/format";
import { getSnapshot } from "@/lib/queries";
import Link from "@/components/ui/NavigationLink";

export const dynamic = "force-dynamic";

export default async function MyIdeasPage() {
  const { db, currentUserId } = await getSnapshot();
  const mine = db.ideas.filter((i) => i.author.userId === currentUserId);

  return (
    <PageFrame>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.04em]">我的想法</h1>
            <p className="mt-1 text-[13.5px] text-muted">先在草稿中推进，准备好后再把想法、项目与作品一起发布。</p>
          </div>
          <PublishIdeaButton />
        </div>
        <div className="table-shell">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-white/4 text-[12px] tracking-[0.06em] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">想法</th>
                <th className="px-5 py-3 font-medium">状态</th>
                <th className="px-5 py-3 font-medium">有效承接</th>
                <th className="px-5 py-3 font-medium">作品</th>
                <th className="px-5 py-3 font-medium">衍生</th>
                <th className="px-5 py-3 font-medium">最近更新</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((idea) => {
                const m = ideaMetrics(db, idea.id);
                return (
                  <tr key={idea.id} className="row-hover border-t border-line">
                    <td className="px-5 py-4">
                      <Link href={`/ideas/${idea.id}`} className="tracking-[-0.02em]">
                        {idea.title}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Chip tone={idea.status === "realized" ? "artifact" : "idea"}>
                        {IDEA_STATUS_LABEL[idea.status]}
                      </Chip>
                    </td>
                    <td className="px-5 py-4 text-muted">{m.activeAttemptCount}</td>
                    <td className="px-5 py-4 text-muted">{m.workCount}</td>
                    <td className="px-5 py-4 text-muted">{m.forkCount}</td>
                    <td className="px-5 py-4 text-muted">{relativeTime(idea.updatedAt)}</td>
                  </tr>
                );
              })}
              {mine.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted">
                    还没有想法或草稿。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </PageFrame>
  );
}
