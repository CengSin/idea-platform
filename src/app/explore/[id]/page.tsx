import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "@/components/ui/NavigationLink";
import { CoverImage } from "@/components/ui/CoverImage";
import { getPublicCatalog } from "@/lib/public-queries";
import { ArrowLeft, ArrowUpRight, GitBranch, Globe2, Sparkles } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const idea = (await getPublicCatalog()).find((item) => item.id === id);
  return { title: idea ? `${idea.title} · Idea Platform` : "想法未公开", alternates: { canonical: `/explore/${encodeURIComponent(id)}` } };
}

export default async function PublicIdeaPage({ params }: Props) {
  const { id } = await params;
  const idea = (await getPublicCatalog()).find((item) => item.id === id);
  if (!idea) notFound();
  const next = encodeURIComponent(`/ideas/${idea.id}`);
  return (
    <article className="py-8 sm:py-12">
      <Link href="/explore#ideas" className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-artifact"><ArrowLeft className="h-4 w-4" />返回公开广场</Link>
      <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_290px] lg:gap-14">
        <div className="min-w-0">
          <div className="eyebrow"><Globe2 className="h-3.5 w-3.5" />公开想法 · 游客可读</div>
          <h1 className="mt-5 text-[clamp(28px,4vw,46px)] font-semibold leading-[1.25] tracking-[-0.045em] text-balance">{idea.title}</h1>
          <p className="mt-5 text-[16px] leading-8 text-muted">{idea.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">{idea.tags.map((tag) => <span key={tag} className="catalog-filter selected">{tag}</span>)}</div>
          <p className="mt-6 border-b border-line pb-8 text-[12px] text-muted">由 {idea.authorName} 提出</p>
          {[{ title: "想解决什么问题", text: idea.problem }, { title: "为什么值得做", text: idea.whyItMatters }].filter((section) => section.text).map((section) => <section key={section.title} className="mt-9"><h2 className="text-[20px] font-semibold tracking-[-0.03em]">{section.title}</h2><p className="mt-4 whitespace-pre-wrap text-[14px] leading-8 text-muted">{section.text}</p></section>)}
          {[{ title: "期待的成果", items: idea.desiredOutputs }, { title: "需要考虑的边界", items: idea.constraints }, { title: "一起探索的问题", items: idea.openQuestions }].filter((section) => section.items.length).map((section) => <section key={section.title} className="mt-9"><h2 className="text-[20px] font-semibold tracking-[-0.03em]">{section.title}</h2><ul className="mt-4 space-y-3 text-[14px] leading-7 text-muted">{section.items.map((item, index) => <li key={index} className="flex gap-3"><span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-idea" />{item}</li>)}</ul></section>)}
          <section className="mt-12 border-t border-line pt-8"><h2 className="text-[22px] font-semibold tracking-[-0.03em]">已经长出的作品 <span className="ml-2 text-[14px] text-muted">{idea.works.length}</span></h2>
            {idea.works.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{idea.works.map((work, index) => <div key={index} className="overflow-hidden rounded-2xl border border-line bg-canvas-soft/60"><CoverImage src={work.coverUrl} pageUrl={work.externalUrl} alt={work.title} className="h-44 w-full object-cover" /><div className="p-5"><h3 className="font-medium">{work.title}</h3><p className="mt-2 text-[13px] leading-6 text-muted">{work.summary}</p>{work.externalUrl && <a href={work.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-[13px] text-idea">查看作品 <ArrowUpRight className="h-4 w-4" /></a>}</div></div>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-line px-5 py-7 text-[14px] text-muted">还没有公开作品。你的尝试，或许就是第一个。</p>}
          </section>
        </div>
        <aside className="self-start rounded-3xl border border-line bg-canvas-soft/80 p-6 lg:sticky lg:top-28"><span className="eyebrow">MAKE IT HAPPEN</span><h2 className="mt-4 text-[23px] font-semibold tracking-[-0.04em]">这个想法，<br />可以从你开始。</h2><p className="mt-4 text-[13px] leading-7 text-muted">登录后可以关注进展、创建自己的承接，或带着作品回来。</p><div className="my-6 flex gap-5 border-y border-line py-4 text-[12px] text-muted"><span className="flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5 text-active" />{idea.attemptCount} 公开承接</span><span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-idea" />{idea.works.length} 作品</span></div><Link href={`/login?next=${next}`} className="explore-cta w-full">登录并参与 <ArrowUpRight className="h-4 w-4" /></Link><Link href={`/register?next=${next}`} className="mt-4 block text-center text-[12px] text-muted hover:text-idea">还没有账号？创建一个</Link></aside>
      </div>
    </article>
  );
}
