import { currentWorkRevision } from "@/lib/work-revisions";
import { PageFrame } from "@/components/chrome/PageFrame";
import { WorkReminders } from "@/components/idea/WorkReminders";
import { Chip } from "@/components/ui/Chip";
import { CoverImage } from "@/components/ui/CoverImage";
import { publicReminders } from "@/lib/content-access";
import { WORK_TYPE_LABEL, ideaById } from "@/lib/format";
import { getSnapshot } from "@/lib/queries";
import Link from "@/components/ui/NavigationLink";

export const dynamic = "force-dynamic";

export default async function WorksPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string }>;
}) {
  const { mine } = await searchParams;
  const { db, currentUserId } = await getSnapshot();
  const myAttemptIds = new Set(
    db.attempts.filter((a) => a.ownerId === currentUserId).map((a) => a.id),
  );
  const works = db.works.filter((w) => {
    if (w.status !== "published") return false;
    const idea = ideaById(db, w.ideaId);
    if (mine) return myAttemptIds.has(w.attemptId);
    return idea?.status !== "draft";
  });

  return (
    <PageFrame>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              ✦ Works Showcase
            </div>
            <h1 className="mt-2 text-[30px] font-bold tracking-[-0.04em] text-slate-900">落地的作品</h1>
            <p className="mt-1 text-[14px] text-slate-500">从一个微小想法开始，最终被独立建造出来的作品殿堂。</p>
          </div>
          <div className="flex gap-2 text-[13px] bg-slate-100/80 p-1 rounded-full border border-slate-200/60">
            <Link href="/works" className={`px-4 py-1.5 rounded-full transition-all ${!mine ? "bg-white font-medium text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"}`} aria-current={!mine ? "page" : undefined}>
              全站作品
            </Link>
            <Link href="/works?mine=1" className={`px-4 py-1.5 rounded-full transition-all ${mine ? "bg-white font-medium text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"}`} aria-current={mine ? "page" : undefined}>
              我的作品
            </Link>
          </div>
        </div>
        {works.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-16 text-center shadow-2xs">
            <span className="inline-block text-3xl mb-2">🌱</span>
            <h2 className="text-lg font-semibold text-slate-900">{mine ? "你的第一个作品，正在路上" : "这里将收集被实现的成果"}</h2>
            <p className="mt-2 text-sm text-slate-500">从感兴趣的想法开始，完成一次属于你的尝试与创造。</p>
            <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-[13px] font-medium text-white shadow-xs hover:bg-slate-800 transition-all">发现想法 →</Link>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {works.map((work) => {
            const idea = ideaById(db, work.ideaId);
            return (
              <Link key={work.id} href={`/works/${work.id}`} className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
                <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                  <CoverImage src={work.coverUrl} pageUrl={work.externalUrl} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 shadow-xs border border-white/10">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      v{currentWorkRevision(work).number} · {WORK_TYPE_LABEL[work.type]}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {idea ? (
                    <div className="mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-700 border border-violet-100/80 max-w-full truncate">
                        <span className="text-[10px]">✦</span> 起源于：{idea.title}
                      </span>
                    </div>
                  ) : null}
                  <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900 transition-colors group-hover:text-indigo-600">
                    {work.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                    {work.summary}
                  </p>
                  <WorkReminders reminders={publicReminders(work)} compact />
                  {idea?.status === "draft" ? (
                    <p className="mt-2 text-[12px] text-amber-600 font-medium">随想法草稿一起发布</p>
                  ) : null}
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 text-[12px] text-slate-400">
                    <span>查看成果与演进</span>
                    <span className="text-slate-700 font-medium group-hover:translate-x-0.5 transition-transform">详情 →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
    </PageFrame>
  );
}
