"use client";

import { useMemo, useState } from "react";
import Link from "@/components/ui/NavigationLink";
import { ArrowUpRight, GitBranch, Lightbulb, Search, Sparkles, X } from "lucide-react";
import type { PublicIdea } from "@/lib/public-catalog";

export function PublicCatalog({ ideas }: { ideas: PublicIdea[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const tags = useMemo(() => Array.from(new Set(ideas.flatMap((idea) => idea.tags))), [ideas]);
  const visible = ideas.filter((idea) => (!tag || idea.tags.includes(tag)) &&
    `${idea.title} ${idea.summary} ${idea.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const workCount = ideas.reduce((sum, idea) => sum + idea.works.length, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><div className="flex items-center gap-3"><h2 className="text-[25px] font-semibold tracking-[-0.04em]">发现，下一种可能</h2><span className="rounded-full border border-active/20 bg-active/5 px-2.5 py-1 text-[11px] text-active">公开广场</span></div><p className="mt-2 text-[13px] text-muted">{ideas.length} 个公开想法 <span className="mx-2 text-line-strong">/</span> {workCount} 个作品 <span className="mx-2 text-line-strong">/</span> 等你加入</p></div>
        <label className="catalog-search"><Search className="h-4 w-4 shrink-0 text-muted" /><input aria-label="搜索公开想法" placeholder="寻找你在意的问题…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="清空搜索" onClick={() => setQuery("")}><X className="h-4 w-4" /></button>}</label>
      </div>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="按主题筛选">
        {["", ...tags].map((item) => <button type="button" key={item} aria-pressed={tag === item} onClick={() => setTag(item)} className={`catalog-filter ${tag === item ? "selected" : ""}`}>{item || "全部想法"}</button>)}
      </div>
      <p role="status" className="sr-only">找到 {visible.length} 个公开想法</p>
      {visible.length > 0 ? <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((idea, index) => <Link key={idea.id} href={`/explore/${encodeURIComponent(idea.id)}`} className="public-idea-card group">
          <div className={`idea-card-art art-${index % 3}`} aria-hidden="true"><div className="art-grid" /><span className="art-number">{String(index + 1).padStart(2, "0")}</span><div className="art-symbol"><Lightbulb className="h-7 w-7" /></div><span className="art-label">{idea.tags[0] || "开放灵感"}</span><span className="art-arrow"><ArrowUpRight className="h-4 w-4" /></span></div>
          <div className="flex flex-1 flex-col p-5"><div className="mb-3 flex flex-wrap gap-1.5">{idea.tags.slice(0, 3).map((item) => <span key={item} className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-muted">{item}</span>)}</div><h3 className="text-[18px] font-semibold leading-snug tracking-[-0.03em] group-hover:text-idea">{idea.title}</h3><p className="mt-2 line-clamp-2 text-[13px] leading-6 text-muted">{idea.summary}</p><div className="mt-6 flex items-center justify-between gap-2 border-t border-line pt-4 text-[11px] text-muted"><span className="truncate">{idea.authorName}</span><span className="flex shrink-0 items-center gap-3"><span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{idea.attemptCount} 承接</span><span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />{idea.works.length} 作品</span></span></div></div>
        </Link>)}
        <div className="join-idea-card"><span className="mb-5 grid h-11 w-11 place-items-center rounded-full border border-idea/20 text-idea"><Lightbulb className="h-5 w-5" /></span><h3 className="text-[19px] font-medium tracking-[-0.03em]">这里，也可以是<br />你的想法。</h3><p className="mt-3 max-w-[220px] text-[13px] leading-6 text-muted">让那个一直放在备忘录里的灵感，遇见愿意动手的人。</p><Link href="/register" className="mt-6 inline-flex items-center gap-2 text-[13px] text-idea">发布第一个想法 <ArrowUpRight className="h-4 w-4" /></Link></div>
      </div> : <div className="mt-5 rounded-3xl border border-dashed border-line py-14 text-center"><Lightbulb className="mx-auto mb-4 h-8 w-8 text-idea" /><h3 className="text-[18px]">{ideas.length ? "还没找到匹配的想法" : "第一颗灵感，等你种下"}</h3><p className="mt-2 text-[13px] text-muted">{ideas.length ? "换个关键词，或看看其他主题。" : "这里将展示社区公开的想法和作品。"}</p>{ideas.length ? <button type="button" onClick={() => { setQuery(""); setTag(""); }} className="explore-secondary mt-5">清除筛选</button> : <Link href="/register" className="explore-cta mt-5">发布第一个想法 <ArrowUpRight className="h-4 w-4" /></Link>}</div>}
    </>
  );
}
