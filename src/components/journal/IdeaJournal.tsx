"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search, Plus, Minus, Maximize2, Minimize2, Image as ImageIcon } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
import { CoverImage } from "@/components/ui/CoverImage";
import type { PublicIdea } from "@/lib/public-catalog";
import { boardFamilies } from "@/lib/board-families";

export function Author({ idea }: { idea: PublicIdea }) {
  const content = <><span className="journal-avatar">{idea.authorName.slice(0, 1).toUpperCase()}</span><span>{idea.authorName}<small>分享了一个想法</small></span></>;
  return idea.authorId ? <Link className="journal-author" href={`/explore/people/${encodeURIComponent(idea.authorId)}`}>{content}</Link> : <div className="journal-author">{content}</div>;
}
function Arrows({ count = 1, label }: { count?: number; label: string }) {
  return <div className="sketch-connectors" aria-hidden="true"><span>{label}</span><svg viewBox="0 0 1000 72" preserveAspectRatio="none">{Array.from({ length: count }, (_, i) => {
    const x = (i + .5) * 1000 / count;
    return <g key={i}><path d={`M 500 5 C 504 38, ${x + 5} 24, ${x} 64`} /><path d={`M ${x - 9} 56 L ${x} 65 L ${x + 11} 55`} /></g>;
  })}</svg></div>;
}
function FamilyNode({ idea, family, workspace, depth = 0 }: { idea: PublicIdea; family: ReturnType<typeof boardFamilies>[number]; workspace: boolean; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const href = workspace ? `/ideas/${idea.id}` : `/explore/${idea.id}`;
  const children = family.members.filter(i => family.parent.get(i.id) === idea.id);
  const show = depth < 2 || expanded || family.reveal.has(idea.id);
  return <div className="board-node">
    <article className={`pinned-note note-${depth === 0 ? "butter" : depth % 2 ? "sage" : "peach"} ${family.matches.has(idea.id) ? "" : "note-context"}`}>
      <span className="paper-pin" aria-hidden="true"/><div className="note-eyebrow"><span>{depth ? "衍生想法" : "想法"}</span><ArrowUpRight size={15}/></div>
      <Link href={href} className="note-story"><h2>{idea.title}</h2><p>{idea.summary || idea.problem}</p></Link>
      {idea.source && <small className="note-origin">基于 {idea.source.workTitle} · {idea.source.revisionNumber ? `v${idea.source.revisionNumber}` : "历史版本未记录"}</small>}
      {idea.hasUnavailableSource && <small className="note-origin">来源作品暂不可见</small>}
      <div className="note-meta"><span>{idea.authorName}</span><span>{idea.status === "deprecated" ? "已弃用" : idea.works.length ? "已落地" : idea.attemptCount ? `${idea.attemptCount} 人在实现` : "等待实现"}</span></div>
    </article>
    {idea.works.length > 0 && show && <><Arrows count={idea.works.length} label="做出来了"/><div className="board-branches">{idea.works.map(work => {
      const next = children.filter(i => i.source?.workId === work.id);
      return <div className="board-node work-branch" key={work.id}>
        <Link className="work-print" href={workspace ? `/works/${work.id}` : `/explore/${idea.id}#work-${work.id}`}>
          <span className="paper-clip" aria-hidden="true"/>
          <div className="print-preview">{work.coverUrl ? <CoverImage src={work.coverUrl} alt={work.title} className="h-full w-full object-cover"/> : <div className="print-placeholder"><ImageIcon size={32} strokeWidth={1}/><span>{work.title}</span><small>{work.type === "website" ? "网站作品" : "作品"}</small></div>}</div>
          <div className="print-caption"><strong>{work.title}</strong><ArrowUpRight size={16}/></div><small>作品 · v{work.revisionNumber}</small>
        </Link>
        {next.length ? <><Arrows count={next.length} label="继续迭代"/><div className="board-branches">{next.map(child => <FamilyNode key={child.id} idea={child} family={family} workspace={workspace} depth={depth + 1}/>)}</div></> : <><Arrows label="下一步会是什么"/><Link className="board-next" href={workspace ? `/works/${work.id}#next-ideas` : `/explore/${idea.id}#work-${work.id}`}><Plus size={16}/>探索下一步</Link></>}
      </div>;
    })}</div></>}
    {idea.works.length > 0 && !show && <button className="board-expand" onClick={() => setExpanded(true)}>展开 {idea.works.length} 个作品与后续迭代 ↓</button>}
    {expanded && <button className="board-expand" onClick={() => setExpanded(false)}>收起后续 ↑</button>}
  </div>;
}
export function IdeaJournal({ ideas, workspace = false }: { ideas: PublicIdea[]; workspace?: boolean }) {
  const [filter, setFilter] = useState("全部"); const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1); const [full, setFull] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!full) return; const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setFull(false); expandButton.current?.focus(); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [full]);
  const families = boardFamilies(ideas, query, filter);
  return <div id="ideas" className={`idea-whiteboard ${full ? "board-fullscreen" : ""}`}>
    <header className="board-heading"><div><p className="board-kicker">THE OPEN NOTEBOOK</p><h1>让想法，一步步发生<span>。</span></h1><p>从一个念头，到作品，再到新的可能。</p></div><Link className="board-create" href={workspace ? "/ideas/new" : "/register"}><Plus size={17}/>写下想法</Link></header>
    <div className="board-toolbar"><div className="board-filters" aria-label="筛选想法">{["全部", "待实现", "迭代中", "有作品", "已弃用"].map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div><label className="board-search"><Search size={16}/><input aria-label="搜索想法或作品" placeholder="找一个想法…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="清除搜索" onClick={() => setQuery("")}>×</button>}</label><button ref={expandButton} className="board-icon" aria-label={full ? "退出展开视图" : "展开白板"} aria-pressed={full} onClick={() => setFull(!full)}>{full ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button></div>
    <p className="sr-only" role="status">找到 {families.reduce((n, g) => n + g.matches.size, 0)} 个想法，保留所在项目的关系。</p>
    <div className="board-viewport" tabIndex={0} role="region" aria-label="想法演进白板，可横向滚动"><div className="board-canvas" style={{ zoom }}>{families.map(f => <section className="board-family" key={f.root.id} aria-label={`${f.root.title} 的演进`}><FamilyNode idea={f.root} family={f} workspace={workspace}/></section>)}{!families.length && <div className="board-empty"><span>✎</span><h2>{ideas.length ? "还没有匹配的想法" : "让第一个想法留在这里"}</h2><p>{ideas.length ? "换个关键词，或查看全部想法。" : "一个真实的问题，就是很好的开始。"}</p>{ideas.length ? <button onClick={() => { setQuery(""); setFilter("全部"); }}>查看全部</button> : <Link href={workspace ? "/ideas/new" : "/register"}>写下想法 →</Link>}</div>}</div></div>
    <footer className="board-footer"><div className="board-legend"><span><i/>想法</span><span><i/>作品</span><span>↝ 迭代关系</span></div><small>沿着箭头，看见想法的生长</small><div className="board-zoom"><button aria-label="缩小白板" disabled={zoom <= .6} onClick={() => setZoom(z => Math.max(.6, +(z - .1).toFixed(1)))}><Minus size={16}/></button><button aria-label="重置白板缩放" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button><button aria-label="放大白板" disabled={zoom >= 1.4} onClick={() => setZoom(z => Math.min(1.4, +(z + .1).toFixed(1)))}><Plus size={16}/></button></div></footer>
  </div>;
}
