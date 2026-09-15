import { NEXT_IDEA_STAGE_LABEL, type NextIdeaStage } from "./next-ideas.ts";
import type { PublicIdea } from "./public-catalog.ts";
import type { Idea, IdeaRelationKind } from "./types.ts";

export const IDEA_RELATION_KIND_LABEL: Record<IdeaRelationKind, string> = {
  iterate: "功能迭代",
  derive: "新的方向",
};

type Sourced = {
  parentIdeaId?: string;
  sourceWorkId?: string;
  relationKind?: IdeaRelationKind;
  source?: unknown;
};

export function ideaRelationKind(idea: Sourced): IdeaRelationKind | undefined {
  if (idea.relationKind === "iterate" || idea.relationKind === "derive") return idea.relationKind;
  if (idea.parentIdeaId || idea.sourceWorkId || idea.source) return "derive";
  return undefined;
}

export function isIterateIdea(idea: Sourced) {
  return ideaRelationKind(idea) === "iterate";
}

export function isDeriveIdea(idea: Sourced) {
  return ideaRelationKind(idea) === "derive";
}

export type RelationGraphNodeKind = "idea" | "work" | "sprout";

export type RelationGraphVersion = {
  number: number;
  title: string;
  recordedAt?: string;
};

export type RelationGraphIteration = {
  id: string;
  title: string;
  href: string;
  stage: NextIdeaStage;
  stageLabel: string;
  workTitle?: string;
};

export type RelationGraphNode = {
  id: string;
  kind: RelationGraphNodeKind;
  title: string;
  summary: string;
  href: string;
  status?: Idea["status"];
  deprecated: boolean;
  authorName?: string;
  sourceLabel?: string;
  versionLabel?: string;
  versions: RelationGraphVersion[];
  iterations: RelationGraphIteration[];
  workCount: number;
  attemptCount: number;
};

export type RelationGraphEdge = {
  id: string;
  from: string;
  to: string;
  kind: "owns" | "derive";
};

export type RelationGraph = {
  nodes: RelationGraphNode[];
  edges: RelationGraphEdge[];
};

function ideaHref(ideaId: string, workspace: boolean) {
  return workspace ? `/ideas/${ideaId}` : `/explore/${ideaId}`;
}

function workHref(ideaId: string, workId: string, workspace: boolean) {
  return workspace ? `/works/${workId}` : `/explore/${ideaId}#work-${workId}`;
}

function ideaStatusLabel(idea: PublicIdea) {
  if (idea.status === "deprecated") return "已弃用";
  if (idea.works.length) return "已落地";
  if (idea.status === "realized") return "已实现";
  if (idea.attemptCount) return `${idea.attemptCount} 人在实现`;
  return "等待实现";
}

function workStage(idea: PublicIdea): NextIdeaStage {
  if (idea.works.length) return "result";
  if (idea.attemptCount > 0) return "growing";
  return "sprout";
}

/** Public graph: iteration ideas collapse into the source work; only derive ideas become new nodes. */
export function buildRelationGraph(ideas: PublicIdea[], workspace = false): RelationGraph {
  const nodes: RelationGraphNode[] = [];
  const edges: RelationGraphEdge[] = [];
  const nodeIds = new Set<string>();

  const addNode = (node: RelationGraphNode) => {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  };

  for (const idea of ideas) {
    if (isIterateIdea(idea)) continue;
    const derive = isDeriveIdea(idea);
    const sprout = derive && idea.works.length === 0;
    addNode({
      id: idea.id,
      kind: sprout ? "sprout" : "idea",
      title: idea.title,
      summary: idea.summary || idea.problem,
      href: ideaHref(idea.id, workspace),
      status: idea.status,
      deprecated: idea.status === "deprecated",
      authorName: idea.authorName,
      sourceLabel: derive && idea.source
        ? `来自 ${idea.source.workTitle}`
        : sprout
          ? idea.source
            ? `来自 ${idea.source.workTitle}`
            : undefined
          : ideaStatusLabel(idea),
      versions: [],
      iterations: [],
      workCount: idea.works.length,
      attemptCount: idea.attemptCount,
    });

    for (const work of idea.works) {
      const iterations = ideas
        .filter((item) => item.source?.workId === work.id && isIterateIdea(item))
        .map((item) => {
          const stage = workStage(item);
          return {
            id: item.id,
            title: item.title,
            href: ideaHref(item.id, workspace),
            stage,
            stageLabel: NEXT_IDEA_STAGE_LABEL[stage],
            workTitle: item.works[0]?.title,
          };
        });
      addNode({
        id: work.id,
        kind: "work",
        title: work.title,
        summary: work.summary,
        href: workHref(idea.id, work.id, workspace),
        deprecated: idea.status === "deprecated",
        versionLabel: `v${work.revisionNumber}`,
        versions: work.revisions?.length
          ? work.revisions
          : [{ number: work.revisionNumber, title: work.title }],
        iterations,
        workCount: 0,
        attemptCount: 0,
      });
      edges.push({ id: `${idea.id}->${work.id}`, from: idea.id, to: work.id, kind: "owns" });
    }

    if (derive && idea.source) {
      const originWork = idea.source.workId;
      const originIdea = idea.source.ideaId;
      const parentHasWork = ideas.some((item) => item.works.some((work) => work.id === originWork));
      const from = parentHasWork ? originWork : originIdea;
      edges.push({ id: `${from}->${idea.id}`, from, to: idea.id, kind: "derive" });
    }
  }

  return {
    nodes,
    edges: edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)),
  };
}

export type GraphPoint = { x: number; y: number };

const NODE_SIZE: Record<RelationGraphNodeKind, { w: number; h: number }> = {
  idea: { w: 196, h: 86 },
  work: { w: 188, h: 92 },
  sprout: { w: 188, h: 86 },
};

export function graphNodeSize(kind: RelationGraphNodeKind) {
  return NODE_SIZE[kind];
}

function incoming(graph: RelationGraph) {
  const inbound = new Map<string, string[]>();
  for (const node of graph.nodes) inbound.set(node.id, []);
  for (const edge of graph.edges) inbound.get(edge.to)?.push(edge.from);
  return inbound;
}

/** Stable layered seed so growth reads left-to-right before forces relax overlap. */
export function seedGraphPositions(graph: RelationGraph, width: number, height: number): Map<string, GraphPoint> {
  const positions = new Map<string, GraphPoint>();
  if (!graph.nodes.length) return positions;
  const inbound = incoming(graph);
  const layer = new Map<string, number>();
  const queue = graph.nodes.filter((node) => (inbound.get(node.id)?.length ?? 0) === 0).map((node) => node.id);
  for (const id of queue) layer.set(id, 0);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    const depth = layer.get(id) ?? 0;
    for (const edge of graph.edges) {
      if (edge.from !== id) continue;
      const next = Math.max(layer.get(edge.to) ?? 0, depth + 1);
      if (!layer.has(edge.to)) queue.push(edge.to);
      layer.set(edge.to, next);
    }
  }
  for (const node of graph.nodes) if (!layer.has(node.id)) layer.set(node.id, 0);
  const buckets = new Map<number, string[]>();
  for (const node of graph.nodes) {
    const depth = layer.get(node.id) ?? 0;
    buckets.set(depth, [...(buckets.get(depth) ?? []), node.id]);
  }
  const depths = [...buckets.keys()].sort((a, b) => a - b);
  const maxDepth = Math.max(1, depths.at(-1) ?? 0);
  const padX = 120;
  const padY = 80;
  for (const depth of depths) {
    const ids = buckets.get(depth) ?? [];
    ids.forEach((id, index) => {
      const x = padX + (maxDepth === 0 ? width / 2 - padX : (depth / maxDepth) * Math.max(240, width - padX * 2));
      const y = padY + ((index + 1) / (ids.length + 1)) * Math.max(160, height - padY * 2);
      positions.set(id, { x, y });
    });
  }
  return positions;
}

export function relaxGraphPositions(
  graph: RelationGraph,
  positions: Map<string, GraphPoint>,
  width: number,
  height: number,
  ticks = 80,
) {
  const velocities = new Map(graph.nodes.map((node) => [node.id, { vx: 0, vy: 0 }]));
  for (let tick = 0; tick < ticks; tick++) {
    const alpha = 0.12 * (1 - tick / ticks);
    for (let i = 0; i < graph.nodes.length; i++) {
      for (let j = i + 1; j < graph.nodes.length; j++) {
        const a = graph.nodes[i];
        const b = graph.nodes[j];
        const pa = positions.get(a.id)!;
        const pb = positions.get(b.id)!;
        let dx = pa.x - pb.x;
        let dy = pa.y - pb.y;
        let dist = Math.hypot(dx, dy) || 0.01;
        const min = (graphNodeSize(a.kind).w + graphNodeSize(b.kind).w) * 0.42;
        const force = ((min * min) / dist) * alpha * 0.04;
        dx /= dist;
        dy /= dist;
        const va = velocities.get(a.id)!;
        const vb = velocities.get(b.id)!;
        va.vx += dx * force;
        va.vy += dy * force;
        vb.vx -= dx * force;
        vb.vy -= dy * force;
        if (dist < min) {
          const overlap = (min - dist) * 0.45;
          pa.x += dx * overlap;
          pa.y += dy * overlap;
          pb.x -= dx * overlap;
          pb.y -= dy * overlap;
        }
      }
    }
    for (const edge of graph.edges) {
      const pa = positions.get(edge.from);
      const pb = positions.get(edge.to);
      if (!pa || !pb) continue;
      let dx = pb.x - pa.x;
      let dy = pb.y - pa.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const rest = edge.kind === "owns" ? 150 : 210;
      const force = (dist - rest) * alpha * 0.08;
      dx /= dist;
      dy /= dist;
      const va = velocities.get(edge.from)!;
      const vb = velocities.get(edge.to)!;
      va.vx += dx * force;
      va.vy += dy * force;
      vb.vx -= dx * force;
      vb.vy -= dy * force;
    }
    for (const node of graph.nodes) {
      const p = positions.get(node.id)!;
      const v = velocities.get(node.id)!;
      v.vx += ((width / 2) - p.x) * alpha * 0.004;
      v.vy += ((height / 2) - p.y) * alpha * 0.006;
      v.vx *= 0.72;
      v.vy *= 0.72;
      p.x = Math.min(width - 40, Math.max(40, p.x + v.vx));
      p.y = Math.min(height - 40, Math.max(40, p.y + v.vy));
    }
  }
  return positions;
}

export function fitGraphView(
  graph: RelationGraph,
  positions: Map<string, GraphPoint>,
  width: number,
  height: number,
) {
  if (!graph.nodes.length) return { x: 0, y: 0, k: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of graph.nodes) {
    const point = positions.get(node.id);
    if (!point) continue;
    const box = graphNodeSize(node.kind);
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x + box.w);
    maxY = Math.max(maxY, point.y + box.h);
  }
  const pad = 40;
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const k = Math.min((width - pad * 2) / w, (height - pad * 2) / h, 1);
  return {
    k,
    x: (width - w * k) / 2 - minX * k,
    y: (height - h * k) / 2 - minY * k,
  };
}
