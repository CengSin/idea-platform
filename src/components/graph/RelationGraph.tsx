"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, GitBranch, X } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
import {
  buildRelationGraph,
  graphNodeSize,
  relaxGraphPositions,
  seedGraphPositions,
  fitGraphView,
  type GraphPoint,
  type RelationGraphNode,
} from "@/lib/idea-relations";
import type { PublicIdea } from "@/lib/public-catalog";

function layoutGraph(graph: ReturnType<typeof buildRelationGraph>, width: number, height: number) {
  const seed = seedGraphPositions(graph, width, height);
  const positions = relaxGraphPositions(graph, seed, width, height);
  return { positions, view: fitGraphView(graph, positions, width, height) };
}

export function RelationGraph({
  ideas,
  matches,
  workspace = false,
}: {
  ideas: PublicIdea[];
  matches?: Set<string>;
  workspace?: boolean;
}) {
  const graph = useMemo(() => buildRelationGraph(ideas, workspace), [ideas, workspace]);
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 960, h: 560 });
  const computed = useMemo(() => layoutGraph(graph, size.w, size.h), [graph, size.w, size.h]);
  const [positions, setPositions] = useState<Map<string, GraphPoint> | null>(null);
  const [view, setView] = useState<{ x: number; y: number; k: number } | null>(null);
  const pos = positions ?? computed.positions;
  const vis = view ?? computed.view;
  const visRef = useRef(vis);
  visRef.current = vis;
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const drag = useRef<{
    mode: "pan" | "node";
    id?: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => {
      const next = {
        w: Math.max(280, Math.min(el.clientWidth || 960, el.parentElement?.clientWidth || 960, window.innerWidth - 32)),
        h: Math.max(360, el.clientHeight),
      };
      setSize(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setPositions(null);
    setView(null);
    setSelected((current) => (current && graph.nodes.some((node) => node.id === current) ? current : null));
  }, [computed, graph]);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.08 : 0.92;
      const bounds = el.getBoundingClientRect();
      const mx = event.clientX - bounds.left;
      const my = event.clientY - bounds.top;
      setView((current) => {
        const base = current ?? visRef.current;
        const k = Math.min(1.8, Math.max(0.45, base.k * factor));
        const ratio = k / base.k;
        return {
          k,
          x: mx - (mx - base.x) * ratio,
          y: my - (my - base.y) * ratio,
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const selectedNode = graph.nodes.find((node) => node.id === selected) ?? null;
  const highlighted = matches && matches.size > 0 ? matches : null;

  const nodeEmphasis = (node: RelationGraphNode) => {
    if (!highlighted) return true;
    if (highlighted.has(node.id)) return true;
    if (node.kind === "work") {
      return node.iterations.some((item) => highlighted.has(item.id)) ||
        ideas.some((idea) => idea.works.some((work) => work.id === node.id) && highlighted.has(idea.id));
    }
    return false;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (Math.hypot(dx, dy) > 4) state.moved = true;
    if (state.mode === "pan") {
      setView({ x: state.origX + dx, y: state.origY + dy, k: vis.k });
      return;
    }
    if (!state.id) return;
    setPositions(() => {
      const next = new Map(pos);
      next.set(state.id!, {
        x: state.origX + dx / vis.k,
        y: state.origY + dy / vis.k,
      });
      return next;
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    frame.current?.releasePointerCapture(event.pointerId);
    if (state?.mode === "node" && !state.moved && state.id) setSelected(state.id);
    if (state?.mode === "pan" && !state.moved) setSelected(null);
  };

  return (
    <div className={`relation-graph${selectedNode ? " has-sidebar" : ""}`} ref={frame}>
      <div
        className="relation-graph-stage"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if ((event.target as HTMLElement).closest(".graph-node")) return;
          drag.current = { mode: "pan", startX: event.clientX, startY: event.clientY, origX: vis.x, origY: vis.y, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
      >
        {!graph.nodes.length ? (
          <div className="board-empty">
            <span>✎</span>
            <h2>还没有可以连起来的分支</h2>
            <p>公开的想法和作品会出现在这里。功能迭代会收进作品节点，不会铺成新的卡片。</p>
          </div>
        ) : (
          <svg className="relation-graph-svg" viewBox={`0 0 ${size.w} ${size.h}`} role="img" aria-label="想法关系图谱">
            <defs>
              <marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            <g transform={`translate(${vis.x} ${vis.y}) scale(${vis.k})`}>
              {graph.edges.map((edge) => {
                const from = pos.get(edge.from);
                const to = pos.get(edge.to);
                if (!from || !to) return null;
                const a = graphNodeSize(graph.nodes.find((node) => node.id === edge.from)?.kind ?? "idea");
                const b = graphNodeSize(graph.nodes.find((node) => node.id === edge.to)?.kind ?? "idea");
                const x1 = from.x + a.w / 2;
                const y1 = from.y + a.h / 2;
                const x2 = to.x + b.w / 2;
                const y2 = to.y + b.h / 2;
                return (
                  <g key={edge.id} className={`graph-edge graph-edge-${edge.kind}`}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd="url(#graph-arrow)" />
                  </g>
                );
              })}
              {graph.nodes.map((node) => {
                const point = pos.get(node.id);
                if (!point) return null;
                const box = graphNodeSize(node.kind);
                const active = selected === node.id;
                const dim = !nodeEmphasis(node);
                return (
                  <g
                    key={node.id}
                    className={`graph-node graph-node-${node.kind}${node.deprecated ? " is-deprecated" : ""}${active ? " is-active" : ""}${dim ? " is-dim" : ""}`}
                    transform={`translate(${point.x} ${point.y})`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      drag.current = {
                        mode: "node",
                        id: node.id,
                        startX: event.clientX,
                        startY: event.clientY,
                        origX: point.x,
                        origY: point.y,
                        moved: false,
                      };
                      frame.current?.setPointerCapture(event.pointerId);
                    }}
                  >
                    <rect width={box.w} height={box.h} rx={node.kind === "work" ? 6 : 10} />
                    <text className="graph-kicker" x={14} y={22}>
                      {node.kind === "work" ? "作品" : node.kind === "sprout" ? "新方向" : "想法"}
                      {node.versionLabel ? ` · ${node.versionLabel}` : ""}
                    </text>
                    <text className="graph-title" x={14} y={44}>
                      {truncate(node.title, 14)}
                    </text>
                    <text className="graph-meta" x={14} y={66}>
                      {truncate(node.kind === "work"
                        ? (node.iterations.length ? `${node.iterations.length} 项功能迭代` : "版本时间线已收起")
                        : (node.sourceLabel || node.authorName || ""), 16)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>
      {selectedNode ? (
        <aside className="relation-graph-sidebar" aria-label={`${selectedNode.title} 的详情`}>
          <div className="relation-graph-sidebar-head">
            <span>{selectedNode.kind === "work" ? "作品分支" : selectedNode.kind === "sprout" ? "尚未落地的新方向" : "想法"}</span>
            <button type="button" aria-label="关闭详情" onClick={() => setSelected(null)}><X size={16} /></button>
          </div>
          <h2>{selectedNode.title}</h2>
          <p>{selectedNode.summary}</p>
          {selectedNode.kind === "work" ? (
            <div className="graph-versions">
              <button
                type="button"
                className="graph-version-toggle"
                onClick={() => setExpandedVersions((current) => {
                  const next = new Set(current);
                  if (next.has(selectedNode.id)) next.delete(selectedNode.id);
                  else next.add(selectedNode.id);
                  return next;
                })}
              >
                {expandedVersions.has(selectedNode.id) ? "收起版本历史" : `当前 ${selectedNode.versionLabel ?? "v1"} · 展开版本`}
              </button>
              {expandedVersions.has(selectedNode.id) ? (
                <ol>
                  {[...selectedNode.versions].reverse().map((revision) => (
                    <li key={`${selectedNode.id}-v${revision.number}`}>
                      <strong>v{revision.number}</strong> {revision.title}
                    </li>
                  ))}
                </ol>
              ) : null}
              {selectedNode.iterations.length ? (
                <div className="graph-iterations">
                  <small>收起的功能迭代</small>
                  {selectedNode.iterations.map((item) => (
                    <Link key={item.id} href={item.href}>
                      {item.title}
                      <span>{item.stageLabel}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {selectedNode.sourceLabel ? <p className="graph-source">{selectedNode.sourceLabel}</p> : null}
          <Link className="graph-open" href={selectedNode.href}>
            打开详情 <ArrowUpRight size={15} />
          </Link>
        </aside>
      ) : (
        <p className="relation-graph-hint"><GitBranch size={14} /> 点击节点查看详情。功能迭代收在作品里，只有新方向会连出新节点。</p>
      )}
    </div>
  );
}

function truncate(value: string, max: number) {
  const chars = [...value];
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : value;
}
