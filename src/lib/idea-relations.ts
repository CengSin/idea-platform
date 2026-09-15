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

export type FamilyWorkRow = {
  work: RelationGraphNode;
  next: FamilyBranch[];
};

export type FamilyBranch = {
  idea: RelationGraphNode;
  rows: FamilyWorkRow[];
};

export const FAMILY_WORK_PREVIEW = 3;

function outgoing(graph: RelationGraph, from: string, kind: RelationGraphEdge["kind"]) {
  return graph.edges
    .filter((edge) => edge.from === from && edge.kind === kind)
    .map((edge) => graph.nodes.find((node) => node.id === edge.to))
    .filter((node): node is RelationGraphNode => Boolean(node));
}

/** One project family as a left-to-right tree: idea → works → derived ideas. */
export function buildFamilyBranch(ideaId: string, graph: RelationGraph, seen = new Set<string>()): FamilyBranch | null {
  const idea = graph.nodes.find((node) => node.id === ideaId);
  if (!idea) return null;
  if (seen.has(ideaId)) return { idea, rows: [] };
  const visiting = new Set(seen);
  visiting.add(ideaId);
  const rows = outgoing(graph, ideaId, "owns").map((work) => ({
    work,
    next: outgoing(graph, work.id, "derive")
      .map((child) => buildFamilyBranch(child.id, graph, visiting))
      .filter((branch): branch is FamilyBranch => Boolean(branch)),
  }));
  return { idea, rows };
}

export function familyWorkCount(branch: FamilyBranch): number {
  return branch.rows.reduce((count, row) => count + 1 + row.next.reduce((sum, child) => sum + familyWorkCount(child), 0), 0);
}

export function familySproutCount(branch: FamilyBranch): number {
  return branch.rows.reduce(
    (count, row) => count + row.next.reduce((sum, child) => sum + (child.rows.length ? familySproutCount(child) : 1), 0),
    0,
  );
}

export function branchContains(branch: FamilyBranch, id: string): boolean {
  if (branch.idea.id === id) return true;
  return branch.rows.some((row) => row.work.id === id || row.next.some((child) => branchContains(child, id)));
}

function rowContains(row: FamilyWorkRow, id: string) {
  return row.work.id === id || row.next.some((child) => branchContains(child, id));
}

/** Prefer rows that already grew a new direction; always keep the selected path visible. */
export function previewWorkRows(rows: FamilyWorkRow[], selectedId: string | null, showAll = false, limit = FAMILY_WORK_PREVIEW) {
  const ranked = [...rows].sort((a, b) => Number(b.next.length > 0) - Number(a.next.length > 0));
  if (showAll || ranked.length <= limit) return { shown: ranked, hidden: [] as FamilyWorkRow[] };
  const required = new Set(ranked.filter((row) => selectedId && rowContains(row, selectedId)));
  const shown: FamilyWorkRow[] = [];
  for (const row of ranked) {
    if (shown.length < limit || required.has(row)) shown.push(row);
  }
  return { shown, hidden: ranked.filter((row) => !shown.includes(row)) };
}
