import assert from "node:assert/strict";
import test from "node:test";
import { createNextIdeaRecord } from "./next-ideas.ts";
import { buildPublicCatalog } from "./public-catalog.ts";
import {
  buildRelationGraph,
  ideaRelationKind,
  isIterateIdea,
  seedGraphPositions,
  fitGraphView,
} from "./idea-relations.ts";
import { fixture, at } from "./agent-test-fixture.ts";

const input = { title: "下一步", summary: "做成工具", problem: "入口缺失", whyItMatters: "" };

test("legacy sourced ideas without relationKind are treated as derive", () => {
  assert.equal(ideaRelationKind({ parentIdeaId: "p", sourceWorkId: "w" }), "derive");
  assert.equal(ideaRelationKind({ parentIdeaId: "p", sourceWorkId: "w", relationKind: "iterate" }), "iterate");
  assert.equal(ideaRelationKind({ title: "root" } as never), undefined);
});

test("graph omits iterate ideas as nodes and folds them into the source work", () => {
  const db = fixture();
  createNextIdeaRecord(db, "owner", "work", { ...input, title: "补说明", relationKind: "iterate" }, "iter", at);
  createNextIdeaRecord(db, "owner", "work", { ...input, title: "独立产品", relationKind: "derive" }, "branch", at);
  db.attempts.push({ ...db.attempts[0], id: "branch-attempt", ideaId: "branch", workIds: ["branch-work"] });
  db.works.push({
    ...db.works[0],
    id: "branch-work",
    ideaId: "branch",
    attemptId: "branch-attempt",
    title: "独立作品",
    revisions: undefined,
  });
  const graph = buildRelationGraph(buildPublicCatalog(db));
  assert.deepEqual(graph.nodes.map((node) => node.id).sort(), ["branch", "branch-work", "idea", "work"]);
  assert.equal(graph.nodes.some((node) => node.id === "iter"), false);
  const work = graph.nodes.find((node) => node.id === "work");
  assert.equal(work?.kind, "work");
  assert.equal(work?.iterations.length, 1);
  assert.equal(work?.iterations[0].title, "补说明");
  assert.equal(graph.edges.some((edge) => edge.from === "work" && edge.to === "branch" && edge.kind === "derive"), true);
  const reversed = buildRelationGraph([...buildPublicCatalog(db)].reverse());
  assert.equal(reversed.edges.some((edge) => edge.from === "work" && edge.to === "branch" && edge.kind === "derive"), true);
  assert.equal(graph.nodes.find((node) => node.id === "branch")?.kind, "idea");
});

test("an unpublished derive idea is a sprout node, not a work", () => {
  const db = fixture();
  createNextIdeaRecord(db, "owner", "work", { ...input, title: "新方向", relationKind: "derive" }, "sprout", at);
  const graph = buildRelationGraph(buildPublicCatalog(db));
  assert.equal(graph.nodes.find((node) => node.id === "sprout")?.kind, "sprout");
});

test("layered seed places roots before derived branches", () => {
  const db = fixture();
  createNextIdeaRecord(db, "owner", "work", { ...input, relationKind: "derive" }, "child", at);
  const graph = buildRelationGraph(buildPublicCatalog(db));
  const positions = seedGraphPositions(graph, 800, 600);
  assert.equal(positions.size, graph.nodes.length);
  assert.ok((positions.get("idea")?.x ?? 0) <= (positions.get("child")?.x ?? 0));
  const fitted = fitGraphView(graph, positions, 400, 640);
  assert.ok(fitted.k > 0 && fitted.k <= 1);
});

test("iterate ideas stay in the public catalog but are not graph branches", () => {
  const db = fixture();
  createNextIdeaRecord(db, "owner", "work", { ...input, relationKind: "iterate" }, "iter", at);
  const catalog = buildPublicCatalog(db);
  const iter = catalog.find((idea) => idea.id === "iter");
  assert.equal(iter?.relationKind, "iterate");
  assert.equal(isIterateIdea(iter!), true);
  assert.equal(buildRelationGraph(catalog).nodes.some((node) => node.id === "iter"), false);
});
