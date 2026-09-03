import assert from "node:assert/strict";
import test from "node:test";
import { ideaGrowthPath } from "./idea-graph.ts";
import type { Database } from "./types.ts";

function database(): Database {
  return {
    version: 1,
    users: [],
    ideas: [
      {
        id: "derived",
        title: "Derived idea",
        summary: "",
        problem: "",
        whyItMatters: "",
        constraints: [],
        existingAttempts: [],
        openQuestions: [],
        desiredOutputs: [],
        tags: [],
        author: { kind: "user", userId: "user-1", displayName: "User" },
        license: { implementation: true, derivatives: true, commercialUse: "yes" },
        visibility: "public",
        status: "published",
        parentIdeaId: "main",
        sourceWorkId: "main-work",
        graph: { x: 280, y: 190 },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "foreign-derived",
        title: "Foreign derived idea",
        summary: "",
        problem: "",
        whyItMatters: "",
        constraints: [],
        existingAttempts: [],
        openQuestions: [],
        desiredOutputs: [],
        tags: [],
        author: { kind: "user", userId: "user-2", displayName: "User" },
        license: { implementation: true, derivatives: true, commercialUse: "yes" },
        visibility: "public",
        status: "published",
        parentIdeaId: "other",
        sourceWorkId: "foreign-work",
        graph: { x: 320, y: 230 },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    events: [],
    notifications: [],
    follows: [],
    attempts: [
      {
        id: "main-branch",
        ideaId: "main",
        ownerId: "user-1",
        title: "Main branch",
        approach: "",
        status: "prototyping",
        progressNote: "",
        visibility: "public",
        blockers: [],
        startedAt: "2026-01-01T00:00:00.000Z",
        lastActiveAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        workIds: ["main-work", "foreign-work"],
        graph: { x: 20, y: 30 },
        featuredOnGraph: true,
      },
      {
        id: "other-branch",
        ideaId: "other",
        ownerId: "user-2",
        title: "Other branch",
        approach: "",
        status: "prototyping",
        progressNote: "",
        visibility: "public",
        blockers: [],
        startedAt: "2026-01-01T00:00:00.000Z",
        lastActiveAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        workIds: ["other-work"],
        graph: { x: 40, y: 50 },
        featuredOnGraph: true,
      },
    ],
    works: [
      {
        id: "main-work",
        attemptId: "main-branch",
        ideaId: "main",
        title: "Main work",
        summary: "",
        type: "website",
        coverUrl: "",
        status: "published",
        credits: [],
        license: { implementation: true, derivatives: true, commercialUse: "yes" },
        views: 0,
        saves: 0,
        citations: 0,
        graph: { x: 60, y: 70 },
      },
      {
        id: "foreign-work",
        attemptId: "main-branch",
        ideaId: "other",
        title: "Foreign work",
        summary: "",
        type: "website",
        coverUrl: "",
        status: "published",
        credits: [],
        license: { implementation: true, derivatives: true, commercialUse: "yes" },
        views: 0,
        saves: 0,
        citations: 0,
        graph: { x: 80, y: 90 },
      },
    ],
  };
}

test("ideaGrowthPath only returns the selected idea's implementation branches", () => {
  const path = ideaGrowthPath(database(), "main");

  assert.deepEqual(path.attempts.map((attempt) => attempt.id), ["main-branch"]);
  assert.deepEqual(path.works.map((work) => work.id), ["main-work"]);
  assert.deepEqual(path.derivedIdeas.map((idea) => idea.id), ["derived"]);
});

test("a derived idea growth path keeps its visible ancestry", () => {
  const db = database();
  db.ideas.push({ ...db.ideas[0], id: "main", parentIdeaId: undefined, sourceWorkId: undefined });

  const path = ideaGrowthPath(db, "derived");

  assert.equal(path.parentIdea?.id, "main");
  assert.equal(path.sourceAttempt?.id, "main-branch");
  assert.equal(path.sourceWork?.id, "main-work");
});
