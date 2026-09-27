import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/NavigationLink";
import { CoverImage } from "@/components/ui/CoverImage";
import { WorkReminders } from "@/components/idea/WorkReminders";
import { ShareWorks } from "@/components/works/ShareWorks";
import { getCurrentUser } from "@/lib/auth";
import { WORK_TYPE_LABEL } from "@/lib/format";
import { getPublicWorksPage } from "@/lib/public-queries";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ user?: string; all?: string; mine?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { user: userId } = await searchParams;
  if (!userId) return { title: "作品 · 想法共享", alternates: { canonical: "/works" } };
  const page = await getPublicWorksPage(userId);
  const title = page?.user ? `${page.user.displayName}的作品 · 想法共享` : "作品 · 想法共享";
  const description = page?.user ? `看看${page.user.displayName}公开发布的作品。` : undefined;
  const url = `/works?user=${encodeURIComponent(userId)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function WorksPage({ searchParams }: Props) {
  const { user: requestedUserId, all } = await searchParams;
  const me = await getCurrentUser();
  const userId = requestedUserId || (!all && me ? me.id : undefined);
  const page = await getPublicWorksPage(userId);
  if (!page) notFound();
  const { user, works } = page;
  const isMine = Boolean(user && me?.id === user.id);

  return (
    <div className="mx-auto max-w-[1180px] py-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">✦ Works Showcase</div>
          <h1 className="mt-3 text-[30px] font-bold tracking-[-0.04em] text-slate-900 sm:text-[36px]">
            {user ? `${user.displayName}的作品` : "公开作品"}
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-slate-500">
            {user?.bio || "从一个想法开始，看看已经落地的作品。"}
          </p>
          <p className="mt-3 text-[12px] text-slate-400">{works.length} 件公开作品</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isMine ? <ShareWorks userId={user!.id} /> : null}
          {me && !isMine ? <Link href={`/works?user=${encodeURIComponent(me.id)}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:border-slate-300">我的作品</Link> : null}
          {user ? <Link href="/works?all=1" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:border-slate-300">全部作品</Link> : null}
        </div>
      </div>

      {works.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-12 text-center">
          <h2 className="text-lg font-semibold text-slate-900">还没有公开作品</h2>
          <p className="mt-2 text-sm text-slate-500">作品发布后会出现在这里。</p>
          <Link href="/explore" className="mt-5 inline-block text-[13px] font-medium text-indigo-600 hover:underline">探索公开想法 →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {works.map((work) => (
            <Link key={work.id} href={`/explore/${work.ideaId}#work-${work.id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <CoverImage src={work.coverUrl} pageUrl={work.externalUrl} alt={work.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-emerald-300 backdrop-blur-md">v{work.revisionNumber} · {WORK_TYPE_LABEL[work.type]}</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="mb-2 self-start rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-700">✦ 起源于：{work.ideaTitle}</span>
                <h2 className="text-[17px] font-semibold tracking-tight text-slate-900 group-hover:text-indigo-600">{work.title}</h2>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500">{work.summary}</p>
                <WorkReminders reminders={work.reminders} compact />
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-[12px] text-slate-500"><span>查看作品与来源</span><span className="font-medium text-slate-700">详情 →</span></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
