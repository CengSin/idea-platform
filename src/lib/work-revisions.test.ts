import test from "node:test";
import assert from "node:assert/strict";
import { fixture, at } from "./agent-test-fixture.ts";
import { ensureWorkRevision, recordWorkRevision } from "./work-revisions.ts";
import { createNextIdeaRecord } from "./next-ideas.ts";
import { sourceContext } from "./agent-context.ts";
import { proposeIteration } from "./agent-iterations.ts";
import { buildPublicCatalog } from "./public-catalog.ts";
import { boardFamilies } from "./board-families.ts";
const input = { title: "下一步", summary: "添加白板", problem: "关系不清晰", whyItMatters: "" };
const body = { request_id: "iteration-one", title: input.title, summary: input.summary, problem: input.problem };
test("a derived idea keeps its exact source snapshot after future edits", () => {
  const db = fixture(), work = db.works[0];
  const idea = createNextIdeaRecord(db, "owner", "work", input, "child", at);
  const old = sourceContext(db, idea, "owner")!.work!;
  work.summary = "改变的说明"; work.license.commercialUse = "no";
  recordWorkRevision(work, "2026-09-06T00:00:00Z");
  assert.equal(work.revisions?.length, 2);
  assert.equal(work.revisions?.[0].license.commercialUse, "with_attribution");
  assert.deepEqual(sourceContext(db, idea, "owner")!.work, old);
  assert.equal(old.revision_number, 1);
  recordWorkRevision(work, at);
  assert.equal(work.revisions?.length, 2, "no-op must not create a new revision");
});
test("Agent drafts are scoped, idempotent, private and notify their owner once", () => {
  const db = fixture();
  assert.throws(() => proposeIteration(db, "owner", "other-branch", "work", body, "child", at));
  assert.throws(() => proposeIteration(db, "stranger", "attempt", "work", body, "child", at));
  const first = proposeIteration(db, "owner", "attempt", "work", body, "child", at);
  const retry = proposeIteration(db, "owner", "attempt", "work", body, "retry", at);
  assert.equal(first.created, true); assert.equal(retry.created, false);
  assert.equal(retry.idea.id, first.idea.id); assert.equal(first.idea.status, "draft");
  assert.equal(first.idea.visibility, "private"); assert.equal(first.idea.author.kind, "agent");
  assert.equal(db.notifications.length, 1); assert.equal(db.notifications[0].userId, "owner");
  assert.equal(db.events.length, 0); assert.equal(db.works[0].citations, 0);
  assert.equal(buildPublicCatalog(db).length, 1);
});
test("Agent rejects publish fields, invalid version and malformed inputs", () => {
  for (const extra of [{ status: "published" }, { visibility: "public" }, { source_work_revision_id: "missing" }, { desired_outputs: [false] }, { stop_conditions: "invented" }, { title: "" }, { why_it_matters: 5 }]) {
    assert.throws(() => proposeIteration(fixture(), "owner", "attempt", "work", { ...body, ...extra }, "child", at));
  }
});
test("private source supports drafting but cannot produce a public iteration", () => {
  const db = fixture(); db.ideas[0].status = "draft";
  assert.throws(() => createNextIdeaRecord(db, "owner", "work", input, "public-child", at));
  assert.equal(proposeIteration(db, "owner", "attempt", "work", body, "child", at).idea.status, "draft");
});
test("search retains ancestors and work links; hidden sources and cycles cannot corrupt groups", () => {
  const db = fixture(); createNextIdeaRecord(db, "owner", "work", input, "child", at);
  let catalog = buildPublicCatalog(db), groups = boardFamilies(catalog, "下一步");
  assert.equal(groups.length, 1); assert.equal(groups[0].root.id, "idea");
  assert.deepEqual([...groups[0].matches], ["child"]); assert.equal(groups[0].members.length, 2);
  db.ideas[0].visibility = "private"; catalog = buildPublicCatalog(db);
  assert.equal(catalog[0].source, undefined); assert.equal(catalog[0].hasUnavailableSource, true);
  assert.equal(boardFamilies(catalog)[0].root.id, "child");
  db.ideas[0].visibility = "public"; catalog = buildPublicCatalog(db);
  catalog[1].works = [{ ...catalog[0].works[0], id: "loop-work" }];
  catalog[0].source = { ideaId: "child", ideaTitle: "下一步", workId: "loop-work", workTitle: "loop", revisionNumber: 1 };
  groups = boardFamilies(catalog); assert.equal(groups.flatMap(g => g.members).length, 2);
});
test("legacy child never fabricates a historical revision", () => {
  const db = fixture(); const idea = createNextIdeaRecord(db, "owner", "work", input, "child", at);
  delete idea.sourceWorkRevisionId;
  assert.equal(sourceContext(db, idea, "owner")?.work?.revision_number, null);
  assert.equal(ensureWorkRevision(db.works[0], at).number, 1);
});
test("deep matches reveal every ancestor instead of hiding the result under a collapsed branch", () => {
  const db = fixture();
  let workId = "work";
  for (let i = 1; i <= 4; i++) {
    const id = `child-${i}`;
    createNextIdeaRecord(db, "owner", workId, {...input,title:`层级 ${i}`}, id, at);
    db.attempts.push({...db.attempts[0],id:`attempt-${i}`,ideaId:id,workIds:[`work-${i}`]});
    db.works.push({...db.works[0],id:`work-${i}`,ideaId:id,attemptId:`attempt-${i}`,revisions:undefined});
    workId = `work-${i}`;
  }
  const [group] = boardFamilies(buildPublicCatalog(db), "层级 4");
  assert.equal(group.root.id,"idea");
  assert.deepEqual([...group.reveal], ["child-3","child-2","child-1","idea"]);
});
