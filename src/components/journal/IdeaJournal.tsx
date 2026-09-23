"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
import { CuratedMasonry } from "@/components/journal/CuratedMasonry";
import type { PublicIdea } from "@/lib/public-catalog";

export function Author({ idea }: { idea: PublicIdea }) {
  const content = <><span className="journal-avatar">{idea.authorName.slice(0, 1).toUpperCase()}</span><span>{idea.authorName}<small>分享了一个想法</small></span></>;
  return idea.authorId ? <Link className="journal-author" href={`/explore/people/${encodeURIComponent(idea.authorId)}`}>{content}</Link> : <div className="journal-author">{content}</div>;
}

export function IdeaJournal({ ideas, workspace = false }: { ideas: PublicIdea[]; workspace?: boolean }) {
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");

  const filteredIdeas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ideas.filter((i) => {
      const textMatch =
        !q ||
        `${i.title} ${i.summary} ${i.problem} ${i.authorName} ${i.tags?.join(" ") ?? ""} ${i.works.map((w) => w.title).join(" ")}`.toLowerCase().includes(q);
      const statusMatch =
        filter === "全部" ||
        (filter === "待实现" && i.attemptCount === 0 && !i.works.length && i.status !== "deprecated") ||
        (filter === "迭代中" && (Boolean(i.source) || i.attemptCount > 0) && i.status !== "deprecated") ||
        (filter === "有作品" && i.works.length > 0) ||
        (filter === "已弃用" && i.status === "deprecated");
      return textMatch && statusMatch;
    });
  }, [ideas, query, filter]);

  const emptyTitle = ideas.length ? "还没有匹配的想法" : "让第一个想法留在这里";
  const emptyBody = ideas.length ? "换个关键词，或查看全部想法。" : "一个真实的问题，就是很好的开始。";

  return (
    <div id="ideas" className="idea-whiteboard">
      <header className="board-heading">
        <div>
          <h1>共享，实现，追踪<span>。</span></h1>
          <p>想法先被共享，再被实现，进度一直能被追踪。</p>
        </div>
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
      </div>
      <p className="sr-only" role="status">找到 {filteredIdeas.length} 个想法。</p>
      <div className="board-viewport masonry-viewport" tabIndex={0} role="region" aria-label="想法列表">
        {filteredIdeas.length ? (
          <CuratedMasonry ideas={filteredIdeas} workspace={workspace} />
        ) : (
          <div className="board-empty">
            <span>✎</span>
            <h2>{emptyTitle}</h2>
            <p>{emptyBody}</p>
            {ideas.length ? <button onClick={() => { setQuery(""); setFilter("全部"); }}>查看全部</button> : <Link href={workspace ? "/ideas/new" : "/register"}>写下想法 →</Link>}
          </div>
        )}
      </div>
    </div>
  );
}
