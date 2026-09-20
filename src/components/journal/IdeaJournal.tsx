"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Maximize2, Minimize2 } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
import { FamilyBoard } from "@/components/graph/FamilyBoard";
import { CuratedMasonry } from "@/components/journal/CuratedMasonry";
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
  const [viewMode, setViewMode] = useState<"constellation" | "masonry">("constellation");
  const expandButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v === "masonry" || v === "constellation") {
      setViewMode(v);
    }
  }, []);

  const handleSetViewMode = (mode: "constellation" | "masonry") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", mode);
      window.history.replaceState(null, "", url.toString());
    }
  };

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
    <div id="ideas" className={`idea-whiteboard ${full ? "board-fullscreen" : ""}`}>
      <div className="hero-glow-backdrop" aria-hidden="true" />
      <header className="board-heading">
        <div>
          <p className="board-kicker">✦ EVERY IDEA DESERVES A BUILDER</p>
          <h1>每一个念头，都在这里遇见它的建造者<span>。</span></h1>
          <p>从一个微小的火花，到被独立实现，再长成惊艳的作品。分享你心中的问题，与更多创造者一起把它变成现实。</p>
        </div>
        <Link className="board-create" href={workspace ? "/ideas/new" : "/register"}><Plus size={17}/>写下想法</Link>
      </header>
      <div className="board-toolbar">
        <div className="board-filters" aria-label="筛选想法">
          {["全部", "待实现", "迭代中", "有作品", "已弃用"].map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <div className="board-view-switch" role="group" aria-label="展示模式切换">
          <button
            type="button"
            className={viewMode === "constellation" ? "is-active" : ""}
            aria-pressed={viewMode === "constellation"}
            onClick={() => handleSetViewMode("constellation")}
            title="查看灵感突触星云脉络"
          >
            🌌 脉络星云
          </button>
          <button
            type="button"
            className={viewMode === "masonry" ? "is-active" : ""}
            aria-pressed={viewMode === "masonry"}
            onClick={() => handleSetViewMode("masonry")}
            title="查看灵感画廊策展画卷"
          >
            📑 策展画卷
          </button>
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
      <div className={`board-viewport ${viewMode === "constellation" ? "family-viewport" : "masonry-viewport"}`} tabIndex={0} role="region" aria-label="想法项目家族">
        {viewMode === "constellation" ? (
          families.length ? (
            <FamilyBoard families={families} workspace={workspace} />
          ) : (
            <div className="board-empty">
              <span>✎</span>
              <h2>{emptyTitle}</h2>
              <p>{emptyBody}</p>
              {ideas.length ? <button onClick={() => { setQuery(""); setFilter("全部"); }}>查看全部</button> : <Link href={workspace ? "/ideas/new" : "/register"}>写下想法 →</Link>}
            </div>
          )
        ) : (
          filteredIdeas.length ? (
            <CuratedMasonry ideas={filteredIdeas} workspace={workspace} />
          ) : (
            <div className="board-empty">
              <span>✎</span>
              <h2>{emptyTitle}</h2>
              <p>{emptyBody}</p>
              {ideas.length ? <button onClick={() => { setQuery(""); setFilter("全部"); }}>查看全部</button> : <Link href={workspace ? "/ideas/new" : "/register"}>写下想法 →</Link>}
            </div>
          )
        )}
      </div>
      <footer className="board-footer">
        {viewMode === "constellation" ? (
          <>
            <div className="board-legend">
              <span><i className="legend-idea"/>想法（待实现）</span>
              <span><i className="legend-work"/>已上线作品</span>
              <span><i className="legend-sprout"/>衍生新方向</span>
              <span className="text-slate-400">· 突触连线串联起落地脉络</span>
            </div>
            <small className="text-slate-400">独立想法独立演进，专注陪伴每一次落地</small>
            <div className="board-zoom"><span className="board-zoom-hint">点击卡片展开详情 · 探索下一步</span></div>
          </>
        ) : (
          <>
            <div className="board-legend">
              <span className="text-slate-600 font-medium">✦ 策展画卷：杂志式沉浸探索每一颗灵感种子</span>
            </div>
            <small className="text-slate-400">选择心仪的念头，即可立即成为建造者承接落地</small>
            <div className="board-zoom"><span className="board-zoom-hint">共 {filteredIdeas.length} 颗闪耀灵感</span></div>
          </>
        )}
      </footer>
    </div>
  );
}
