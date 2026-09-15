"use client";
import { useEffect, useRef, useState } from "react";
import { Search, Plus, Maximize2, Minimize2 } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
import { FamilyBoard } from "@/components/graph/FamilyBoard";
import type { PublicIdea } from "@/lib/public-catalog";
import { boardFamilies } from "@/lib/board-families";

export function Author({ idea }: { idea: PublicIdea }) {
  const content = <><span className="journal-avatar">{idea.authorName.slice(0, 1).toUpperCase()}</span><span>{idea.authorName}<small>分享了一个想法</small></span></>;
  return idea.authorId ? <Link className="journal-author" href={`/explore/people/${encodeURIComponent(idea.authorId)}`}>{content}</Link> : <div className="journal-author">{content}</div>;
}

export function IdeaJournal({ ideas, workspace = false }: { ideas: PublicIdea[]; workspace?: boolean }) {
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [full, setFull] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFull(false);
        expandButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  const families = boardFamilies(ideas, query, filter);
  const emptyTitle = ideas.length ? "还没有匹配的想法" : "让第一个想法留在这里";
  const emptyBody = ideas.length ? "换个关键词，或查看全部想法。" : "一个真实的问题，就是很好的开始。";
  return (
    <div id="ideas" className={`idea-whiteboard ${full ? "board-fullscreen" : ""}`}>
      <header className="board-heading">
        <div>
          <p className="board-kicker">THE OPEN NOTEBOOK</p>
          <h1>让想法，一步步发生<span>。</span></h1>
          <p>从一个念头，到作品，再到新的可能。</p>
        </div>
        <Link className="board-create" href={workspace ? "/ideas/new" : "/register"}><Plus size={17}/>写下想法</Link>
      </header>
      <div className="board-toolbar">
        <div className="board-filters" aria-label="筛选想法">
          {["全部", "待实现", "迭代中", "有作品", "已弃用"].map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <label className="board-search">
          <Search size={16}/>
          <input aria-label="搜索想法或作品" placeholder="找一个想法…" value={query} onChange={(e) => setQuery(e.target.value)}/>
          {query ? <button aria-label="清除搜索" onClick={() => setQuery("")}>×</button> : null}
        </label>
        <button ref={expandButton} className="board-icon" aria-label={full ? "退出展开视图" : "展开白板"} aria-pressed={full} onClick={() => setFull(!full)}>
          {full ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
        </button>
      </div>
      <p className="sr-only" role="status">找到 {families.reduce((n, g) => n + g.matches.size, 0)} 个想法，保留所在项目的关系。</p>
      <div className="board-viewport family-viewport" tabIndex={0} role="region" aria-label="想法项目家族">
        {families.length ? (
          <FamilyBoard families={families} workspace={workspace} />
        ) : (
          <div className="board-empty">
            <span>✎</span>
            <h2>{emptyTitle}</h2>
            <p>{emptyBody}</p>
            {ideas.length ? <button onClick={() => { setQuery(""); setFilter("全部"); }}>查看全部</button> : <Link href={workspace ? "/ideas/new" : "/register"}>写下想法 →</Link>}
          </div>
        )}
      </div>
      <footer className="board-footer">
        <div className="board-legend">
          <span><i className="legend-idea"/>想法</span>
          <span><i className="legend-work"/>作品</span>
          <span><i className="legend-sprout"/>新方向</span>
          <span>折线 = 同一项目里的衍生</span>
        </div>
        <small>不相关的想法各走各的，不会画到一张网里</small>
        <div className="board-zoom"><span className="board-zoom-hint">点击查看 · 卡片固定在家族里</span></div>
      </footer>
    </div>
  );
}
