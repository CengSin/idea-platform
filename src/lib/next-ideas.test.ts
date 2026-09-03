import assert from "node:assert/strict";
import test from "node:test";
import {
  createNextIdeaRecord,
  deleteNextIdeaRecord,
  nextIdeaStage,
  NextIdeaMutationError,
  updateNextIdeaRecord,
} from "./next-ideas.ts";
import type { Database } from "./types.ts";

const at = "2026-09-03T10:00:00.000Z";
const license = { implementation: true, derivatives: true, commercialUse: "with_attribution" as const };

function fixture(): Database {
  return {
    version: 3,
    users: [{ id: "owner", displayName: "作者", initials: "作", accent: "#fff", bio: "", skills: [], visibility: "public", createdAt: at, projectLinks: [] }],
    ideas: [{ id: "parent", title: "来源", summary: "简介", problem: "问题", whyItMatters: "价值", constraints: [], existingAttempts: [], openQuestions: [], desiredOutputs: [], tags: ["社区"], author: { kind: "user", userId: "owner", displayName: "作者" }, license, visibility: "public", status: "realized", graph: { x: 10, y: 20 }, createdAt: at, updatedAt: at }],
    attempts: [{ id: "branch", ideaId: "parent", ownerId: "owner", title: "承接", approach: "", status: "published", progressNote: "", visibility: "public", blockers: [], startedAt: at, lastActiveAt: at, createdAt: at, workIds: ["work"] }],
    works: [{ id: "work", attemptId: "branch", ideaId: "parent", title: "作品", summary: "", type: "website", coverUrl: "", status: "published", credits: [], license, views: 0, saves: 0, citations: 0, graph: { x: 100, y: 200 } }],
    events: [], notifications: [], follows: [],
  };
}

const input = { title: " 下一步 ", summary: " 做成工具 ", problem: " 入口缺失 ", whyItMatters: " 让更多人继续 " };
const status = (code: number) => (error: unknown) => error instanceof NextIdeaMutationError && error.status === code;

test("work owner can create a public, attributed next idea", () => {
  const db = fixture();
  const idea = createNextIdeaRecord(db, "owner", "work", input, "next", at);
  assert.equal(idea.title, "下一步");
  assert.equal(idea.visibility, "public");
  assert.equal(idea.status, "published");
  assert.equal(idea.parentIdeaId, "parent");
  assert.equal(idea.sourceWorkId, "work");
  assert.deepEqual(idea.tags, ["社区"]);
  assert.equal(db.works[0].citations, 1);
  assert.equal(nextIdeaStage(db, idea.id), "sprout");
});

test("a next idea moves from sprout to growing to result from existing records", () => {
  const db = fixture();
  createNextIdeaRecord(db, "owner", "work", input, "next", at);
  db.attempts.push({ ...db.attempts[0], id: "watch", ideaId: "next", status: "considering", workIds: [] });
  assert.equal(nextIdeaStage(db, "next"), "sprout");
  db.attempts.push({ ...db.attempts[0], id: "maker", ideaId: "next", status: "understanding", workIds: [] });
  assert.equal(nextIdeaStage(db, "next"), "growing");
  db.works.push({ ...db.works[0], id: "result", ideaId: "next", attemptId: "maker" });
  assert.equal(nextIdeaStage(db, "next"), "result");
});

test("only the author can edit and an unclaimed next idea can be deleted", () => {
  const db = fixture();
  createNextIdeaRecord(db, "owner", "work", input, "next", at);
  assert.throws(() => updateNextIdeaRecord(db, "stranger", "next", input, at), status(403));
  updateNextIdeaRecord(db, "owner", "next", { ...input, title: "更新" }, at);
  assert.equal(db.ideas[1].title, "更新");
  deleteNextIdeaRecord(db, "owner", "next");
  assert.equal(db.ideas.length, 1);
  assert.equal(db.works[0].citations, 0);
});

test("claimed next ideas cannot be deleted", () => {
  const db = fixture();
  createNextIdeaRecord(db, "owner", "work", input, "next", at);
  db.attempts.push({ ...db.attempts[0], id: "maker", ideaId: "next", workIds: [] });
  assert.throws(() => deleteNextIdeaRecord(db, "owner", "next"), status(409));
  assert.equal(db.ideas.length, 2);
});

test("a non-owner cannot create a next idea for the work", () => {
  const db = fixture();
  assert.throws(() => createNextIdeaRecord(db, "stranger", "work", input, "next", at), status(403));
});
