import assert from "node:assert/strict";
import test from "node:test";
import { createNextIdeaRecord } from "./next-ideas.ts";
import { buildPublicCatalog } from "./public-catalog.ts";
import {
  buildRelationGraph,
  buildFamilyBranch,
  previewWorkRows,
  familyWorkCount,
  ideaRelationKind,
  isIterateIdea,
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

test("family branch keeps independent ideas apart and aligns derives to their source work", () => {
  const db = fixture();
  createNextIdeaRecord(db, "owner", "work", { ...input, title: "新方向", relationKind: "derive" }, "child", at);
  db.ideas.push({ ...db.ideas[0], id: "lonely", title: "独处的念头", updatedAt: at });
  const catalog = buildPublicCatalog(db);
  const graph = buildRelationGraph(catalog);
  const family = buildFamilyBranch("idea", graph);
  const stray = buildFamilyBranch("lonely", graph);
  assert.equal(family?.rows.length, 1);
  assert.equal(family?.rows[0].work.id, "work");
  assert.equal(family?.rows[0].next[0]?.idea.id, "child");
  assert.equal(familyWorkCount(family!), 1);
  assert.equal(stray?.rows.length, 0);
  assert.equal(graph.nodes.some((node) => node.id === "lonely"), true);
  assert.equal(family?.rows[0].next.some((branch) => branch.idea.id === "lonely"), false);
});

test("work preview keeps the selected path when extra implementations are collapsed", () => {
  const db = fixture();
  for (const id of ["w2", "w3", "w4"]) {
    db.attempts.push({ ...db.attempts[0], id: `${id}-a`, workIds: [id] });
    db.works.push({ ...db.works[0], id, attemptId: `${id}-a`, title: id, revisions: undefined });
  }
  createNextIdeaRecord(db, "owner", "w4", { ...input, title: "从第四个作品长出", relationKind: "derive" }, "late", at);
  const graph = buildRelationGraph(buildPublicCatalog(db));
  const family = buildFamilyBranch("idea", graph);
  const preview = previewWorkRows(family!.rows, "late", false, 3);
  assert.equal(preview.shown.length >= 3, true);
  assert.equal(preview.shown.some((row) => row.work.id === "w4"), true);
  assert.equal(preview.shown.find((row) => row.work.id === "w4")?.next[0]?.idea.id, "late");
  assert.ok(preview.hidden.length >= 1);
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
