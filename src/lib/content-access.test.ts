import assert from "node:assert/strict";
import test from "node:test";
import { scopeDatabaseForUser } from "./content-access.ts";
import type { Attempt, Database, Idea, Work } from "./types.ts";

const license = { implementation: true, derivatives: true, commercialUse: "with_attribution" as const };

function idea(id: string, userId: string, status: Idea["status"]): Idea {
  return {
    id, title: id, summary: "简介", problem: "问题", whyItMatters: "价值",
    constraints: [], existingAttempts: [], openQuestions: [], desiredOutputs: [], tags: [],
    author: { kind: "user", userId, displayName: userId }, license,
    visibility: "public", status, graph: { x: 0, y: 0 },
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

function fixture(): Database {
  const draft = idea("draft-a", "user-a", "draft");
  const otherDraft = idea("draft-b", "user-b", "draft");
  const published = idea("published", "user-b", "published");
  const attempts: Attempt[] = [draft, otherDraft, published].map((item) => ({
    id: `attempt-${item.id}`, ideaId: item.id, ownerId: item.author.userId,
    title: item.title, approach: "", status: "testing", progressNote: "private progress",
    visibility: "public", blockers: [], startedAt: item.createdAt, lastActiveAt: item.updatedAt,
    createdAt: item.createdAt, workIds: [`work-${item.id}`],
  }));
  const works: Work[] = attempts.map((attempt) => ({
    id: `work-${attempt.ideaId}`, ideaId: attempt.ideaId, attemptId: attempt.id,
    title: attempt.title, summary: "private work", type: "other", coverUrl: "",
    status: "published", credits: [], license, publishedAt: draft.createdAt,
    views: 0, saves: 0, citations: 0,
  }));
  return {
    version: 3, users: [], ideas: [draft, otherDraft, published], attempts, works,
    events: attempts.map((attempt) => ({
      id: `event-${attempt.id}`, at: draft.createdAt, actorId: attempt.ownerId,
      actorName: attempt.ownerId, text: "private event", ideaId: attempt.ideaId,
      attemptId: attempt.id, workId: `work-${attempt.ideaId}`,
    })),
    notifications: [],
    follows: [
      { userId: "user-a", ideaId: draft.id },
      { userId: "user-b", ideaId: published.id },
    ],
  };
}

test("a draft and its complete project tree are only present in the author's snapshot", () => {
  const db = fixture();
  const mine = scopeDatabaseForUser(db, "user-a");
  assert.deepEqual(mine.ideas.map((item) => item.id), ["draft-a", "published"]);
  assert.deepEqual(mine.attempts.map((item) => item.ideaId), ["draft-a", "published"]);
  assert.deepEqual(mine.works.map((item) => item.ideaId), ["draft-a", "published"]);
  assert.equal(JSON.stringify(mine).includes("draft-b"), false);
  assert.deepEqual(mine.follows, [{ userId: "user-a", ideaId: "draft-a" }]);
});

test("publishing the idea releases its existing project and work tree together", () => {
  const db = fixture();
  assert.equal(scopeDatabaseForUser(db, "viewer").ideas.some((item) => item.id === "draft-a"), false);
  db.ideas[0].status = "realized";
  const published = scopeDatabaseForUser(db, "viewer");
  assert.equal(published.ideas.some((item) => item.id === "draft-a"), true);
  assert.equal(published.attempts.some((item) => item.ideaId === "draft-a"), true);
  assert.equal(published.works.some((item) => item.ideaId === "draft-a"), true);
});
