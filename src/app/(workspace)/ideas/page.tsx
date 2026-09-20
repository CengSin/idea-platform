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
        {mine.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {mine.map((idea) => {
              const m = ideaMetrics(db, idea.id);
              const sourceWork = idea.sourceWorkId ? db.works.find((w) => w.id === idea.sourceWorkId) : null;
              return (
                <div
                  key={idea.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Chip tone={idea.status === "realized" ? "artifact" : "idea"}>
                        {IDEA_STATUS_LABEL[idea.status]}
                      </Chip>
                      <span className="text-[11.5px] text-slate-400">{relativeTime(idea.updatedAt)}</span>
                    </div>

                    <Link href={`/ideas/${idea.id}`} className="block">
                      <h2 className="text-[16px] font-bold text-slate-900 tracking-[-0.02em] leading-snug group-hover:text-indigo-600 transition-colors">
                        {idea.title}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                        {idea.problem || idea.summary}
                      </p>
                    </Link>

                    {sourceWork ? (
                      <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1 text-[11.5px] text-slate-600">
                        ↳ 源自作品：<span className="font-medium text-slate-800">{sourceWork.title}</span>
                        {idea.relationKind === "iterate" ? " · 功能迭代" : " · 新方向"}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span title="有效承接数">⚡ {m.activeAttemptCount}</span>
                      <span title="已孵化作品数">💎 {m.workCount}</span>
                      <span title="衍生新方向数">🌱 {m.forkCount}</span>
                    </div>
                    <Link
                      href={`/ideas/${idea.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                    >
                      查看详情 →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-2xs border border-slate-200/80 text-xl">
              💡
            </div>
            <h2 className="mt-4 text-[16px] font-bold text-slate-800">还没有写下想法</h2>
            <p className="mt-1 text-[13px] text-slate-500">
              分享你生活或工作中的真实问题，让其他建造者与你一起实现它。
            </p>
            <div className="mt-5">
              <Link
                href="/ideas/new"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-[13px] font-medium text-white shadow-xs hover:bg-slate-800 transition-colors"
              >
                写下第一个想法 →
              </Link>
            </div>
          </div>
        )}
      </PageFrame>
  );
}
