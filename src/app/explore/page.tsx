import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/ui/NavigationLink";
import { PublicCatalog } from "@/components/explore/PublicCatalog";
import { PageLoading } from "@/components/chrome/PageLoading";
import { getPublicCatalog } from "@/lib/public-queries";
import { ArrowDown, ArrowUpRight, Check, GitBranch, Lightbulb, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "发现想法 · Idea Platform",
  description: "无需登录，探索公开想法与作品。找到你在意的问题，让一个值得实现的想法走得更远。",
  alternates: { canonical: "/explore" },
};

async function Catalog() {
  const ideas = await getPublicCatalog();
  return <PublicCatalog ideas={ideas} />;
}

export default function ExplorePage() {
  return (
    <>
      <section className="explore-hero">
        <div className="relative z-10">
          <div className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-active" /> OPEN IDEAS, REAL POSSIBILITIES</div>
          <h1 className="explore-title">好想法，<br />值得<span className="text-idea">被实现。</span></h1>
          <p className="mt-6 max-w-[390px] text-[15px] leading-[1.9] text-muted">有些人发现问题，有些人擅长创造。<br className="hidden sm:block" />在这里相遇，让一个人的灵感，长成更多人的作品。</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#ideas" className="explore-cta">探索公开想法 <ArrowDown className="h-4 w-4" /></a>
            <Link href="/register" className="explore-secondary">分享我的想法 <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-[12px] text-muted/80"><Check className="h-3.5 w-3.5 text-active" /> 无需登录，自由探索</p>
        </div>
        <div className="idea-garden" role="img" aria-label="从一颗想法出发，经由不同方向的承接，生长为作品的流程示意">
          <div className="garden-orbit orbit-one" /><div className="garden-orbit orbit-two" />
          <svg className="garden-lines" viewBox="0 0 520 420" fill="none" aria-hidden="true">
            <path d="M128 180 C245 180 180 94 316 102 M128 180 C250 180 238 286 360 286 M316 102 C450 102 400 286 360 286" stroke="currentColor" strokeWidth="1" strokeDasharray="4 7" />
            <circle cx="233" cy="139" r="4" fill="#e8b86a" /><circle cx="245" cy="237" r="4" fill="#6fd4cb" />
          </svg>
          <div className="garden-origin"><Lightbulb className="h-8 w-8" /><span>一个想法</span></div>
          <div className="garden-card card-branch"><span className="garden-card-icon text-active"><GitBranch className="h-4 w-4" /></span><span><small>02 / 探索可能</small><strong>沿着不同方向，动手试试</strong></span><span className="garden-dot" /></div>
          <div className="garden-card card-work"><span className="garden-card-icon text-idea"><Sparkles className="h-4 w-4" /></span><span><small>03 / 让它发生</small><strong>第一个作品，新的起点</strong></span><span className="garden-dot amber" /></div>
          <span className="garden-caption">每一份实现，都保留最初的灵感。</span>
          <span className="garden-coordinate">IDEA → ATTEMPT → WORK</span>
        </div>
      </section>
      <section id="ideas" className="scroll-mt-24 border-t border-line pt-9">
        <Suspense fallback={<PageLoading />}><Catalog /></Suspense>
      </section>
      <section id="how-it-works" className="how-section scroll-mt-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div><p className="eyebrow">FROM A SPARK TO SOMETHING REAL</p><h2 className="mt-3 text-[25px] font-semibold tracking-[-0.04em]">想法的下一步，由你决定。</h2></div>
          <Link href="/register" className="inline-flex items-center gap-2 text-[13px] text-idea">从这里开始 <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { n: "01", title: "提出一个值得解决的问题", text: "说清它是什么、为什么重要。不需要完整的方案，一个清晰的起点就够了。", icon: Lightbulb },
            { n: "02",  title: "选一个方向，把它做出来", text: "认领你感兴趣的想法。独立探索，也可以和 AI 一起，记录尝试与进展。", icon: GitBranch },
            { n: "03", title: "交付作品，让灵感继续生长", text: "把成果带回最初的想法。一次实现，也可能成为下一次创造的起点。", icon: Sparkles },
          ].map(({ n, title, text, icon: Icon }) => <article key={n} className="how-card"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-idea" /><span className="font-mono text-[12px] text-muted/60">{n}</span></div><h3 className="mt-5 text-[16px] font-medium">{title}</h3><p className="mt-3 text-[13px] leading-7 text-muted">{text}</p></article>)}
        </div>
      </section>
    </>
  );
}
