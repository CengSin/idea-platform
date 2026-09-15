"use client";

import { useEffect, useMemo, useState } from "react";
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
  if (node.kind === "work") return node.versionLabel ? `作品 · ${node.versionLabel}` : "作品";
  if (node.kind === "sprout" || node.sourceLabel?.startsWith("来自 ")) return "新方向";
  return "想法";
}

function meta(node: RelationGraphNode) {
  if (node.kind === "work") {
    return node.iterations.length ? `${node.iterations.length} 项功能迭代已收起` : "版本时间线已收起";
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
  return (
    <button
      type="button"
      className={`story-card story-${pin ? "pending" : node.kind}${node.deprecated ? " is-deprecated" : ""}${selected ? " is-active" : ""}${dim ? " is-dim" : ""}`}
      aria-pressed={selected}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
    >
      <span className="story-kicker">{pin ? "想法" : kicker(node)}</span>
      <strong>{node.title}</strong>
      <small>{pin ? (node.sourceLabel || meta(node)) : meta(node)}</small>
    </button>
  );
}

function ExploreNext({ href }: { href: string }) {
  return (
    <Link className="story-next" href={href} onClick={(event) => event.stopPropagation()}>
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
              <ExploreNext href={`${row.work.href}#next-ideas`} />
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAllWorks, setShowAllWorks] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  const selectedStory = selected ? stories.find((story) => branchContains(story.branch, selected)) : null;
  const expandedId = openId
    ?? (selectedStory && !selectedStory.pending ? selectedStory.family.root.id : null)
    ?? grown[0]?.family.root.id
    ?? null;
  const featured = grown.find((story) => story.family.root.id === expandedId);
  const compact = grown.filter((story) => story.family.root.id !== expandedId);

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
        {featured ? (
          <section
            className="family-story"
            aria-label={`${featured.family.root.title} 的演进`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="family-story-head">
              <h2>项目家族 · {featured.family.root.title}</h2>
              <small>
                {familyWorkCount(featured.branch)} 个作品
                {familySproutCount(featured.branch) ? ` · ${familySproutCount(featured.branch)} 个新方向` : ""}
                · 功能迭代收在作品里
              </small>
            </div>
            <FamilyTree
              branch={featured.branch}
              selected={selected}
              dimOf={dimOf(featured)}
              onSelect={setSelected}
              showAll={revealAll(featured)}
              onShowAll={() => setShowAllWorks((current) => new Set(current).add(featured.family.root.id))}
            />
          </section>
        ) : null}
        {pending.length > 0 ? (
          <section className="pending-story" onClick={(event) => event.stopPropagation()}>
            <div className="family-story-head">
              <h2>待实现的念头</h2>
              <small>没有作品，也就没有连线</small>
            </div>
            <div className="pending-grid">
              {pending.map((story) => (
                <StoryCard
                  key={story.family.root.id}
                  node={story.branch.idea}
                  selected={selected === story.branch.idea.id}
                  dim={dimOf(story)(story.branch.idea)}
                  onSelect={setSelected}
                  pin
                />
              ))}
            </div>
          </section>
        ) : null}
        {compact.map((story) => (
          <button
            type="button"
            className="family-compact"
            key={story.family.root.id}
            onClick={(event) => {
              event.stopPropagation();
              setSelected(null);
              setOpenId(story.family.root.id);
            }}
          >
            <span className="family-compact-tag">已落地</span>
            <strong>{story.family.root.title}</strong>
            <span className="family-compact-arrow">→</span>
            <span>作品 {familyWorkCount(story.branch)}</span>
            {familySproutCount(story.branch) ? <span>· 新方向 {familySproutCount(story.branch)}</span> : null}
            <span className="family-compact-status">独立项目</span>
          </button>
        ))}
      </div>
      {selectedNode ? <Drawer node={selectedNode} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
