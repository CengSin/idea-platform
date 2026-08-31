import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicCatalog } from "./public-catalog.ts";
import { authDestination } from "./auth-destination.ts";
import type { Database, Idea, Attempt, Work } from "./types.ts";

const idea: Idea = {
  id: "public-idea", title: "公开想法", summary: "公开简介", problem: "问题", whyItMatters: "目的",
  constraints: [], existingAttempts: [], openQuestions: [], desiredOutputs: [], tags: ["设计"],
  author: { kind: "user", userId: "private-author", displayName: "PRIVATE_NAME" },
  license: { implementation: true, derivatives: true, commercialUse: "no" },
  visibility: "public", status: "published", graph: { x: 0, y: 0 },
  parentIdeaId: "PRIVATE_PARENT", sourceWorkId: "PRIVATE_SOURCE",
  createdAt: "2026-08-01", updatedAt: "2026-08-31",
};
const attempt: Attempt = {
  id: "public-attempt", ideaId: idea.id, ownerId: "private-author", title: "公开承接",
  approach: "APPROACH_SECRET", executionPrompt: "EXECUTION_SECRET", status: "testing",
  progressNote: "PROGRESS_SECRET", visibility: "public", blockers: [], startedAt: "2026-08-01",
  lastActiveAt: "2026-08-31", createdAt: "2026-08-01", workIds: [],
};
const work: Work = {
  id: "public-work", ideaId: idea.id, attemptId: attempt.id, title: "公开作品", summary: "作品简介",
  type: "website", status: "published", coverUrl: "/covers/hushcity.jpg", externalUrl: "https://example.com/",
  credits: [], license: idea.license, views: 0, saves: 0, citations: 0,
};

function fixture(): Database {
  return {
    version: 3,
    users: [{ id: "private-author", displayName: "PRIVATE_NAME", initials: "PN", accent: "#fff", bio: "PROFILE_SECRET", skills: [], visibility: "private", createdAt: "2026-08-01", projectLinks: [] }],
    ideas: [idea], attempts: [attempt], works: [work], events: [], notifications: [], follows: [],
  };
}

test("guest catalog excludes every non-public visibility and draft/archived idea", () => {
  const db = fixture();
  for (const visibility of ["private", "invite_only", "unlisted"] as const) db.ideas.push({ ...idea, id: visibility, visibility });
  for (const status of ["draft", "archived"] as const) db.ideas.push({ ...idea, id: status, status });
  assert.deepEqual(buildPublicCatalog(db).map((item) => item.id), [idea.id]);
});

test("public counts and works exclude private, abandoned, draft and mismatched relations", () => {
  const db = fixture();
  db.attempts.push({ ...attempt, id: "private-attempt", visibility: "private" }, { ...attempt, id: "abandoned", status: "abandoned" });
  db.works.push(
    { ...work, id: "private-work", attemptId: "private-attempt" },
    { ...work, id: "abandoned-work", attemptId: "abandoned" },
    { ...work, id: "draft-work", status: "draft" },
    { ...work, id: "orphan", attemptId: "missing" },
    { ...work, id: "mismatch", ideaId: "other" },
  );
  const [result] = buildPublicCatalog(db);
  assert.equal(result.attemptCount, 1);
  assert.equal(result.works.length, 1);
  assert.equal(result.works[0].title, work.title);
});

test("guest payload cannot disclose account identity, private ancestry or execution details", () => {
  const result = buildPublicCatalog(fixture());
  assert.equal(result[0].authorName, "社区创作者");
  const serialized = JSON.stringify(result);
  for (const secret of ["PRIVATE_NAME", "private-author", "PROFILE_SECRET", "PRIVATE_PARENT", "PRIVATE_SOURCE", "APPROACH_SECRET", "EXECUTION_SECRET", "PROGRESS_SECRET"]) assert.equal(serialized.includes(secret), false, secret);
  assert.equal("notifications" in result[0], false);
  assert.equal("attempts" in result[0], false);
});

test("guest outbound links reject scripts and embedded credentials", () => {
  const db = fixture();
  db.works = [{ ...work, externalUrl: "javascript:alert(1)", coverUrl: "https://secret:token@example.com/private.png" }];
  const [result] = buildPublicCatalog(db);
  assert.equal(result.works[0].externalUrl, undefined);
  assert.equal(result.works[0].coverUrl, undefined);
});

test("removing public visibility removes detail from the next catalog immediately", () => {
  const db = fixture();
  assert.equal(buildPublicCatalog(db).length, 1);
  db.ideas = [{ ...idea, visibility: "private" }];
  assert.deepEqual(buildPublicCatalog(db), []);
});

test("auth return path preserves an internal destination but rejects external redirects", () => {
  assert.equal(authDestination("/ideas/public-idea?from=explore"), "/ideas/public-idea?from=explore");
  for (const unsafe of [undefined, "https://example.com", "//example.com", "/\\example.com", "/\n/example.com", "/login?next=/register", "/register"]) assert.equal(authDestination(unsafe), "/");
});
