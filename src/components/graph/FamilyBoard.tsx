"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Plus, X } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
import { boardFamilies } from "@/lib/board-families";
import {
  branchContains,
  buildFamilyBranch,
  buildRelationGraph,
  familySproutCount,
  familyWorkCount,
  previewWorkRows,
  type FamilyBranch,
  type FamilyWorkRow,
  type RelationGraph,
  type RelationGraphNode,
} from "@/lib/idea-relations";

type FamilyGroup = ReturnType<typeof boardFamilies>[number];

type Story = {
  family: FamilyGroup;
  graph: RelationGraph;
  branch: FamilyBranch;
  pending: boolean;
};

function kicker(node: RelationGraphNode) {
  if (node.kind === "work") return node.versionLabel ? `已发布 · ${node.versionLabel}` : "已发布作品";
  if (node.kind === "sprout" || node.sourceLabel?.startsWith("来自 ")) return "新衍生方向";
  return "想法";
}

function meta(node: RelationGraphNode) {
  if (node.kind === "work") {
    return node.iterations.length ? `${node.iterations.length} 项迭代进展` : "已落地上线";
  }
  return node.sourceLabel || node.authorName || "";
}

function StoryCard({
  node,
  selected,
  dim,
  onSelect,
  pin = false,
}: {
  node: RelationGraphNode;
  selected: boolean;
  dim: boolean;
  onSelect: (id: string) => void;
  pin?: boolean;
}) {
  const isWork = node.kind === "work";
  const isSprout = node.kind === "sprout" || node.sourceLabel?.startsWith("来自 ");
  const badgeLabel = pin ? "待实现想法" : kicker(node);
  const badgeColor = isWork
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isSprout
    ? "bg-violet-50 text-violet-700 border-violet-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
  const badgeDot = isWork ? "bg-emerald-500" : isSprout ? "bg-violet-500" : "bg-amber-500";

  return (
    <button
      type="button"
      data-node-id={node.id}
      className={`story-card story-${pin ? "pending" : node.kind}${node.deprecated ? " is-deprecated" : ""}${selected ? " is-active" : ""}${dim ? " is-dim" : ""}`}
      aria-pressed={selected}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
    >
      <div className="flex items-center justify-between w-full">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold border ${badgeColor}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${badgeDot}`} />
          {badgeLabel}
        </span>
        {isWork ? (
          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
            已上线
          </span>
        ) : null}
      </div>
      <strong className="text-[14px] font-bold text-slate-900 tracking-[-0.02em] leading-snug line-clamp-1 mt-1.5">
        {node.title}
      </strong>
      {node.summary ? (
        <p className="text-[11.5px] leading-relaxed text-slate-500 line-clamp-2 mt-0.5">
          {node.summary}
        </p>
      ) : null}
      <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between w-full text-[10.5px] text-slate-400">
        <span className="truncate max-w-[140px]">{pin ? (node.sourceLabel || meta(node)) : meta(node)}</span>
        <span className="text-indigo-600 font-medium shrink-0">详情 ↗</span>
      </div>
    </button>
  );
}

function PendingSparkCard({
  story,
  selected,
  dim,
  onSelect,
}: {
  story: Story;
  selected: boolean;
  dim: boolean;
  onSelect: (id: string) => void;
}) {
  const node = story.branch.idea;
  const root = story.family.root;
  return (
    <button
      type="button"
      className={`story-card story-pending group text-left${node.deprecated ? " is-deprecated" : ""}${selected ? " is-active" : ""}${dim ? " is-dim" : ""}`}
      aria-pressed={selected}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
    >
      <div className="flex items-center justify-between w-full">
        <span className="story-kicker">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-semibold text-amber-600">✦ 灵感火花</span>
        </span>
        {root.attemptCount > 0 ? (
          <span className="text-[11px] font-medium text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
            {root.attemptCount} 人承接中
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">待认领</span>
        )}
      </div>
      <strong className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2 mt-1 group-hover:text-amber-600 transition-colors">
        {node.title}
      </strong>
      {root.problem || node.summary ? (
        <p className="text-[12px] leading-relaxed text-slate-500 line-clamp-2 mt-1">
          {root.problem || node.summary}
        </p>
      ) : null}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between w-full text-[11px] text-slate-400">
        <span>{node.sourceLabel || root.authorName || "匿名"}</span>
        <span className="text-amber-700 font-medium group-hover:underline flex items-center gap-0.5">
          探索念头 →
        </span>
      </div>
    </button>
  );
}

function ExploreNext({ id, href }: { id?: string; href: string }) {
  return (
    <Link data-node-id={id} className="story-next" href={href} onClick={(event) => event.stopPropagation()}>
      <Plus size={14} /> 探索下一步
    </Link>
  );
}

function WorkRows({
  rows,
  selected,
  dimOf,
  onSelect,
  showAll,
  onShowAll,
}: {
  rows: FamilyWorkRow[];
  selected: string | null;
  dimOf: (node: RelationGraphNode, parentIdeaId?: string) => boolean;
  onSelect: (id: string) => void;
  showAll: boolean;
  onShowAll?: () => void;
}) {
  const { shown, hidden } = previewWorkRows(rows, selected, showAll);
  return (
    <div className="family-continue">
      <div className={`family-rows${shown.length === 1 ? " is-single" : ""}`}>
        {shown.map((row) => (
          <div className="family-row" key={row.work.id}>
            <StoryCard node={row.work} selected={selected === row.work.id} dim={dimOf(row.work)} onSelect={onSelect} />
            {row.next.length ? (
              <div className={`family-rows is-derive${row.next.length === 1 ? " is-single" : ""}`}>
                {row.next.map((child) => (
                  <FamilyTree
                    key={child.idea.id}
                    branch={child}
                    selected={selected}
                    dimOf={dimOf}
                    onSelect={onSelect}
                    showAll
                  />
                ))}
              </div>
            ) : (
              <ExploreNext id={`next-${row.work.id}`} href={`${row.work.href}#next-ideas`} />
            )}
          </div>
        ))}
      </div>
      {hidden.length > 0 && onShowAll ? (
        <button type="button" className="family-more" onClick={onShowAll}>
          还有 {hidden.length} 个作品 · {hidden.map((row) => row.work.title).join(" / ")} ↓
        </button>
      ) : null}
    </div>
  );
}

function FamilyTree({
  branch,
  selected,
  dimOf,
  onSelect,
  showAll,
  onShowAll,
}: {
  branch: FamilyBranch;
  selected: string | null;
  dimOf: (node: RelationGraphNode, parentIdeaId?: string) => boolean;
  onSelect: (id: string) => void;
  showAll: boolean;
  onShowAll?: () => void;
}) {
  return (
    <div className="family-branch">
      <StoryCard node={branch.idea} selected={selected === branch.idea.id} dim={dimOf(branch.idea)} onSelect={onSelect} />
      {branch.rows.length > 0 ? (
        <WorkRows
          rows={branch.rows}
          selected={selected}
          dimOf={dimOf}
          onSelect={onSelect}
          showAll={showAll}
          onShowAll={onShowAll}
        />
      ) : null}
    </div>
  );
}

function Drawer({ node, onClose }: { node: RelationGraphNode; onClose: () => void }) {
  const [openVersions, setOpenVersions] = useState(false);
  useEffect(() => setOpenVersions(false), [node.id]);
  const kindLabel = node.kind === "work" ? "作品分支" : node.kind === "sprout" ? "尚未落地的新方向" : "想法";
  return (
    <aside className="story-drawer" aria-label={`${node.title} 的详情`}>
      <div className="story-drawer-head">
        <span>{kindLabel}</span>
        <button type="button" aria-label="关闭详情" onClick={onClose}><X size={16} /></button>
      </div>
      <h2>{node.title}</h2>
      <p>{node.summary}</p>
      {node.kind === "work" ? (
        <div className="graph-versions">
          <button
            type="button"
            className="graph-version-toggle"
            onClick={() => setOpenVersions((current) => !current)}
          >
            {openVersions ? "收起版本历史" : `当前 ${node.versionLabel ?? "v1"} · 展开版本`}
          </button>
          {openVersions ? (
            <ol>
              {[...node.versions].reverse().map((revision) => (
                <li key={`${node.id}-v${revision.number}`}>
                  <strong>v{revision.number}</strong> {revision.title}
                </li>
              ))}
            </ol>
          ) : null}
          {node.iterations.length ? (
            <div className="graph-iterations">
              <small>收起的功能迭代</small>
              {node.iterations.map((item) => (
                <Link key={item.id} href={item.href}>
                  {item.title}
                  <span>{item.stageLabel}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {node.sourceLabel ? <p className="graph-source">{node.sourceLabel}</p> : null}
      <Link className="graph-open" href={node.href}>
        打开详情 <ArrowUpRight size={15} />
      </Link>
      <p className="story-drawer-hint">点击只打开详情。卡片位置由「想法 → 作品 → 新方向」决定，不会跟着鼠标走。</p>
    </aside>
  );
}

type TreeConnection = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: "work" | "sprout" | "next";
};

function extractConnections(branch: FamilyBranch): TreeConnection[] {
  const connections: TreeConnection[] = [];
  for (const row of branch.rows) {
    connections.push({
      id: `${branch.idea.id}->${row.work.id}`,
      sourceId: branch.idea.id,
      targetId: row.work.id,
      kind: "work",
    });
    if (row.next.length > 0) {
      for (const child of row.next) {
        connections.push({
          id: `${row.work.id}->${child.idea.id}`,
          sourceId: row.work.id,
          targetId: child.idea.id,
          kind: "sprout",
        });
        connections.push(...extractConnections(child));
      }
    } else {
      connections.push({
        id: `${row.work.id}->next`,
        sourceId: row.work.id,
        targetId: `next-${row.work.id}`,
        kind: "next",
      });
    }
  }
  return connections;
}

type CurvePath = {
  id: string;
  d: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  kind: "work" | "sprout" | "next";
  active: boolean;
  dim: boolean;
};

function SynapseCurves({
  containerRef,
  branch,
  selectedId,
  dependencyKey,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  branch: FamilyBranch;
  selectedId: string | null;
  dependencyKey?: string;
}) {
  const [curves, setCurves] = useState<CurvePath[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const updateCurves = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const width = Math.max(container.scrollWidth, container.clientWidth, containerRect.width);
    const height = Math.max(container.scrollHeight, container.clientHeight, containerRect.height);
    setSize({ width, height });

    const connections = extractConnections(branch);
    const newCurves: CurvePath[] = [];

    for (const conn of connections) {
      const srcEl = container.querySelector(`[data-node-id="${conn.sourceId}"]`) as HTMLElement | null;
      const tgtEl = container.querySelector(`[data-node-id="${conn.targetId}"]`) as HTMLElement | null;
      if (!srcEl || !tgtEl) continue;

      const srcRect = srcEl.getBoundingClientRect();
      const tgtRect = tgtEl.getBoundingClientRect();

      // Determine flow direction (horizontal on desktop, vertical when stacked on small screens)
      const isHorizontal = tgtRect.left >= srcRect.right - 10;

      let x1: number, y1: number, x2: number, y2: number, d: string;

      if (isHorizontal) {
        x1 = srcRect.right - containerRect.left;
        y1 = srcRect.top + srcRect.height / 2 - containerRect.top;
        x2 = tgtRect.left - containerRect.left;
        y2 = tgtRect.top + tgtRect.height / 2 - containerRect.top;
        const dx = Math.max((x2 - x1) * 0.52, 24);
        d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      } else {
        x1 = srcRect.left + srcRect.width / 2 - containerRect.left;
        y1 = srcRect.bottom - containerRect.top;
        x2 = tgtRect.left + tgtRect.width / 2 - containerRect.left;
        y2 = tgtRect.top - containerRect.top;
        const dy = Math.max((y2 - y1) * 0.5, 14);
        d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${(y1 + dy).toFixed(1)}, ${x2.toFixed(1)} ${(y2 - dy).toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      }

      const active = selectedId === conn.sourceId || selectedId === conn.targetId;
      const dim = srcEl.classList.contains("is-dim") || tgtEl.classList.contains("is-dim");

      newCurves.push({
        id: conn.id,
        d,
        sourceX: x1,
        sourceY: y1,
        targetX: x2,
        targetY: y2,
        kind: conn.kind,
        active,
        dim,
      });
    }

    setCurves(newCurves);
  }, [containerRef, branch, selectedId]);

  useEffect(() => {
    updateCurves();
    const timer = setTimeout(updateCurves, 50);

    const container = containerRef.current;
    if (!container) return () => clearTimeout(timer);

    const observer = new ResizeObserver(() => {
      updateCurves();
    });
    observer.observe(container);
    window.addEventListener("resize", updateCurves);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", updateCurves);
    };
  }, [updateCurves, dependencyKey]);

  return (
    <svg
      className="synapse-canvas"
      width={size.width}
      height={size.height}
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: size.width ? `${size.width}px` : "100%",
        height: size.height ? `${size.height}px` : "100%",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "visible",
      }}
    >
      <defs>
        <linearGradient id="gradient-work" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="gradient-sprout" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="gradient-next" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.55" />
        </linearGradient>
        <filter id="synapse-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {curves.map((curve) => {
        const strokeColor =
          curve.kind === "work" ? "#10b981" : curve.kind === "sprout" ? "#8b5cf6" : "#6366f1";
        const sourceColor =
          curve.kind === "work" ? "#f59e0b" : curve.kind === "sprout" ? "#10b981" : "#10b981";
        const targetColor =
          curve.kind === "work" ? "#10b981" : curve.kind === "sprout" ? "#8b5cf6" : "#6366f1";
        const strokeDasharray = curve.kind === "next" ? "5 5" : undefined;
        const strokeWidth = curve.active ? 3.5 : 2.5;
        const gradId = `synapse-grad-${curve.id.replace(/[^a-zA-Z0-9]/g, "-")}`;

        return (
          <g
            key={curve.id}
            className={`synapse-group ${curve.active ? "is-active" : ""}`}
            style={{ opacity: curve.dim ? 0.25 : 1, transition: "opacity 0.2s ease" }}
          >
            <defs>
              <linearGradient
                id={gradId}
                gradientUnits="userSpaceOnUse"
                x1={curve.sourceX}
                y1={curve.sourceY}
                x2={curve.targetX}
                y2={curve.targetY}
              >
                <stop offset="0%" stopColor={sourceColor} stopOpacity="0.85" />
                <stop offset="100%" stopColor={targetColor} stopOpacity="0.95" />
              </linearGradient>
            </defs>
            {/* Ambient Halo Glow */}
            <path
              d={curve.d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={curve.active ? 9 : 6}
              strokeOpacity={curve.active ? 0.35 : 0.18}
              strokeLinecap="round"
            />
            {/* Smooth Cubic Bezier Path */}
            <path
              d={curve.d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
            />
            {/* Source Terminal Anchor Dot */}
            <circle
              cx={curve.sourceX}
              cy={curve.sourceY}
              r={curve.active ? 4.5 : 3.5}
              fill={sourceColor}
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            {/* Target Terminal Anchor Dot */}
            <circle
              cx={curve.targetX}
              cy={curve.targetY}
              r={curve.active ? 5 : 4}
              fill={targetColor}
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}

function FamilyStoryItem({
  story,
  expanded,
  onToggle,
  selected,
  onSelect,
  dimOf,
  revealAll,
  onShowAll,
}: {
  story: Story;
  expanded: boolean;
  onToggle: () => void;
  selected: string | null;
  onSelect: (id: string) => void;
  dimOf: (node: RelationGraphNode) => boolean;
  revealAll: boolean;
  onShowAll: () => void;
}) {
  const treeCanvasRef = useRef<HTMLDivElement>(null);

  if (!expanded) {
    return (
      <button
        type="button"
        className="family-compact group"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <span className="family-compact-tag">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          项目星系
        </span>
        <strong className="group-hover:text-indigo-600 transition-colors">
          {story.family.root.title}
        </strong>
        <span className="family-compact-arrow">→</span>
        <div className="flex items-center gap-2 text-slate-500 text-[12px]">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
            💎 {familyWorkCount(story.branch)} 个作品
          </span>
          {familySproutCount(story.branch) ? (
            <span className="rounded-md bg-violet-50 px-2 py-0.5 font-medium text-violet-700">
              🌱 {familySproutCount(story.branch)} 个新方向
            </span>
          ) : null}
        </div>
        <span className="family-compact-status text-indigo-600 font-medium group-hover:translate-x-0.5 transition-transform">
          展开脉络 ↓
        </span>
      </button>
    );
  }

  return (
    <section
      className="family-story"
      aria-label={`${story.family.root.title} 的演进`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="family-story-head flex items-center justify-between">
        <div>
          <h2>项目家族 · {story.family.root.title}</h2>
          <small>
            {familyWorkCount(story.branch)} 个作品
            {familySproutCount(story.branch) ? ` · ${familySproutCount(story.branch)} 个新方向` : ""}
            · 功能迭代收在作品里
          </small>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="text-[12px] font-medium text-slate-400 hover:text-slate-600 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          收起 ↑
        </button>
      </div>
      <div className="family-tree-canvas relative" ref={treeCanvasRef}>
        <SynapseCurves
          containerRef={treeCanvasRef}
          branch={story.branch}
          selectedId={selected}
          dependencyKey={`${story.family.root.id}-${revealAll}-${selected}`}
        />
        <FamilyTree
          branch={story.branch}
          selected={selected}
          dimOf={dimOf}
          onSelect={onSelect}
          showAll={revealAll}
          onShowAll={onShowAll}
        />
      </div>
    </section>
  );
}

export function FamilyBoard({
  families,
  workspace = false,
}: {
  families: FamilyGroup[];
  workspace?: boolean;
}) {
  const stories = useMemo<Story[]>(() => {
    return families.flatMap((family) => {
      const graph = buildRelationGraph(family.members, workspace);
      const branch = buildFamilyBranch(family.root.id, graph);
      if (!branch) return [];
      return [{ family, graph, branch, pending: branch.rows.length === 0 }];
    });
  }, [families, workspace]);

  const grown = stories.filter((story) => !story.pending);
  const pending = stories.filter((story) => story.pending);

  // Expand all grown families by default for a vibrant, alive canvas
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(grown.map((s) => s.family.root.id)));
  const [showAllWorks, setShowAllWorks] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  // Auto-expand story if a node inside it is selected
  useEffect(() => {
    if (!selected) return;
    const story = stories.find((s) => branchContains(s.branch, selected));
    if (story && !story.pending) {
      setExpandedIds((prev) => {
        if (prev.has(story.family.root.id)) return prev;
        const next = new Set(prev);
        next.add(story.family.root.id);
        return next;
      });
    }
  }, [selected, stories]);

  const toggleFamily = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const nodes = useMemo(() => {
    const map = new Map<string, RelationGraphNode>();
    for (const story of stories) for (const node of story.graph.nodes) map.set(node.id, node);
    return map;
  }, [stories]);
  const selectedNode = selected ? nodes.get(selected) ?? null : null;

  useEffect(() => {
    if (selected && !nodes.has(selected)) setSelected(null);
  }, [nodes, selected]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dimOf = (story: Story) => (node: RelationGraphNode) => {
    const matches = story.family.matches;
    if (!matches.size) return false;
    if (matches.has(node.id)) return false;
    if (node.kind === "work") {
      const owner = story.family.members.find((idea) => idea.works.some((work) => work.id === node.id));
      return !(owner && matches.has(owner.id)) && !node.iterations.some((item) => matches.has(item.id));
    }
    return true;
  };

  const revealAll = (story: Story) =>
    showAllWorks.has(story.family.root.id) || story.family.reveal.size > 0;

  return (
    <div className={`family-board${selectedNode ? " has-drawer" : ""}`}>
      <div className="family-board-stage" onClick={() => setSelected(null)}>
        {grown.map((story) => (
          <FamilyStoryItem
            key={story.family.root.id}
            story={story}
            expanded={expandedIds.has(story.family.root.id)}
            onToggle={() => toggleFamily(story.family.root.id)}
            selected={selected}
            onSelect={setSelected}
            dimOf={dimOf(story)}
            revealAll={revealAll(story)}
            onShowAll={() => setShowAllWorks((current) => new Set(current).add(story.family.root.id))}
          />
        ))}
        {pending.length > 0 ? (
          <section className="pending-story" onClick={(event) => event.stopPropagation()}>
            <div className="family-story-head">
              <h2>✦ 待实现的初生念头</h2>
              <small>独立火花正在等待建造者认领 · 点击展开详情</small>
            </div>
            <div className="pending-grid">
              {pending.map((story) => (
                <PendingSparkCard
                  key={story.family.root.id}
                  story={story}
                  selected={selected === story.branch.idea.id}
                  dim={dimOf(story)(story.branch.idea)}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
      {selectedNode ? <Drawer node={selectedNode} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
