import assert from "node:assert/strict";
import test from "node:test";
import { applyWorkDelete, applyWorkUpdate, ownedWork, parseWorkPatch, WorkMutationError } from "./work-management.ts";
import { buildAgentBootstrap, buildAgentsMd, buildAgentsUpdatePrompt } from "./agent-setup.ts";
import { buildPublicCatalog } from "./public-catalog.ts";
import type { Database } from "./types.ts";

const at = "2026-08-31T10:00:00.000Z";
const license = { implementation: true, derivatives: true, commercialUse: "with_attribution" as const };
function fixture(): Database {
  return {
    version: 3, users: [], events: [], notifications: [], follows: [],
    ideas: [{ id: "idea", title: "来源", summary: "简介", problem: "问题", whyItMatters: "目的", constraints: [], existingAttempts: [], openQuestions: [], desiredOutputs: [], tags: [], author: { kind: "user", userId: "idea-author", displayName: "原作者" }, license, visibility: "public", status: "realized", graph: { x: 0, y: 0 }, createdAt: at, updatedAt: at }],
    attempts: [{ id: "branch", ideaId: "idea", ownerId: "owner", title: "承接", approach: "", status: "published", progressNote: "已发布", visibility: "public", blockers: [], startedAt: at, lastActiveAt: at, createdAt: at, workIds: ["work"] }],
    works: [{ id: "work", attemptId: "branch", ideaId: "idea", title: "原作品", summary: "原简介", type: "website", coverUrl: "/cover.png", externalUrl: "https://example.com", status: "published", credits: [{ userId: "credited", role: "贡献者", name: "贡献者" }], license, publishedAt: at, views: 10, saves: 2, citations: 1 }],
  };
}
const status = (code: number) => (error: unknown) => error instanceof WorkMutationError && error.status === code;

test("only branch owner can manage a work; attribution and idea authorship grant no ownership", () => {
  for (const userId of ["stranger", "credited", "idea-author"]) {
    const db = fixture();
    const before = structuredClone(db);
    assert.throws(() => applyWorkDelete(db, userId, "work", at), status(403));
    assert.throws(() => applyWorkUpdate(db, userId, "work", { title: "hijacked" }, at), status(403));
    assert.deepEqual(db, before);
  }
  assert.equal(ownedWork(fixture(), "owner", "work").work.id, "work");
});

test("branch token cannot operate another branch even when the owner is the same", () => {
  assert.throws(() => ownedWork(fixture(), "owner", "work", "other-branch"), status(403));
  assert.equal(ownedWork(fixture(), "owner", "work", "branch").attempt.id, "branch");
  assert.throws(() => ownedWork(fixture(), "owner", "missing"), status(404));
});

test("partial update preserves IDs, publication date, attribution, counters and other fields", () => {
  const db = fixture();
  const before = structuredClone(db.works[0]);
  const patch = parseWorkPatch({ user_confirmed: true, title: " 新名称 ", repository_url: "" });
  applyWorkUpdate(db, "owner", "work", patch, at);
  assert.deepEqual(db.works[0], { ...before, title: "新名称", repositoryUrl: "" });
  assert.equal(db.attempts[0].status, "published");
});

test("patch requires a strict boolean confirmation and rejects invalid or protected fields", () => {
  for (const body of [null, [], "text", { user_confirmed: "true", title: "x" }, { title: "x" }, { user_confirmed: true },
    ...[{ title: " " }, { title: null }, { type: "invalid" }, { summary: [] }, { credits: [] }, { attempt_id: "branch" }, { ideaId: "another" }, { status: "archived" }, { license: { commercialUse: "no" } }, { external_url: "https://a.example", externalUrl: "https://b.example" }].map((patch) => ({ user_confirmed: true, ...patch }))]) {
    assert.throws(() => parseWorkPatch(body), status(400));
  }
});

test("patch rejects executable URLs, credentials and protocol-relative cover paths", () => {
  for (const field of ["external_url", "repository_url", "cover_url"]) {
    for (const url of ["javascript:alert(1)", "https://user:password@example.com", "//example.com/x", "/\\example.com/x", "https://exam\nple.com"]) {
      assert.throws(() => parseWorkPatch({ user_confirmed: true, [field]: url }), status(400));
    }
  }
  assert.deepEqual(parseWorkPatch({ user_confirmed: true, cover_url: "/covers/mine.jpg", summary: "", externalUrl: "", license }), { coverUrl: "/covers/mine.jpg", summary: "", externalUrl: "", license });
});

test("delete last published work cleans references without deleting the branch or derived ideas", () => {
  const db = fixture();
  db.events = [{ id: "event", at, actorId: "owner", actorName: "Owner", text: "发布", workId: "work" }, { id: "keep", at, actorId: "owner", actorName: "Owner", text: "承接" }];
  db.notifications = [{ id: "notice", at, title: "作品", body: "", read: false, href: "/works/work", kind: "work" }, { id: "keep", at, title: "承接", body: "", read: false, href: "/attempts/branch", kind: "attempt" }];
  db.ideas.push({ ...db.ideas[0], id: "derived", sourceWorkId: "work" });
  applyWorkDelete(db, "owner", "work", at);
  assert.equal(db.works.length, 0);
  assert.deepEqual(db.attempts[0].workIds, []);
  assert.equal(db.attempts[0].status, "testing");
  assert.equal(db.ideas.length, 2);
  assert.equal(db.ideas[1].sourceWorkId, undefined);
  assert.equal(db.ideas[1].parentIdeaId, "idea");
  assert.deepEqual(db.events.map((item) => item.id), ["keep"]);
  assert.deepEqual(db.notifications.map((item) => item.id), ["keep"]);
  assert.equal(buildPublicCatalog(db).find((item) => item.id === "idea")?.works.length, 0);
  assert.throws(() => applyWorkDelete(db, "owner", "work", at), status(404));
});

test("deleting one of multiple works preserves published status and unrelated works", () => {
  const db = fixture();
  db.works.push({ ...db.works[0], id: "other" });
  db.attempts[0].workIds.push("other");
  applyWorkDelete(db, "owner", "work", at);
  assert.deepEqual(db.attempts[0].workIds, ["other"]);
  assert.equal(db.attempts[0].status, "published");
  assert.equal(db.works[0].id, "other");
});

test("draft works do not keep a branch published, and inactive branches are never reactivated", () => {
  const db = fixture();
  db.works.push({ ...db.works[0], id: "draft", status: "draft" });
  applyWorkDelete(db, "owner", "work", at);
  assert.equal(db.attempts[0].status, "testing");
  for (const state of ["paused", "abandoned"] as const) {
    const db = fixture();
    db.attempts[0].status = state;
    applyWorkDelete(db, "owner", "work", at);
    assert.equal(db.attempts[0].status, state);
  }
});

test("every generated AGENTS.md includes branch-specific work IDs, PATCH/DELETE contracts and safety rules", () => {
  for (const id of ["branch-one", "branch-two"]) {
    const db = fixture();
    const markdown = buildAgentsMd({ idea: db.ideas[0], attempt: { ...db.attempts[0], id }, baseUrl: "https://platform.example", token: "test-token", tokenExpiresAt: at });
    assert.ok(markdown.includes(`Attempt ID：${id}`));
    assert.ok(markdown.includes("work — https://platform.example/api/v1/works/work"));
    for (const text of ["-X PATCH \"https://platform.example/api/v1/works/<work_id>\"", "-X DELETE", "attempt.workIds", "user_confirmed", "删除不可恢复", "403", "testing", "贡献署名"]) assert.ok(markdown.includes(text), text);
  }
  const db = fixture();
  const markdown = buildAgentsMd({
    idea: { ...db.ideas[0], status: "draft" },
    attempt: db.attempts[0],
    baseUrl: "https://platform.example",
    token: "draft-token",
    tokenExpiresAt: at,
  });
  assert.ok(markdown.includes("当前来源 Idea 仍是草稿"));
  assert.ok(markdown.includes('-H "Authorization: Bearer draft-token"'));
  assert.ok(markdown.includes("/api/v1/attempts/branch/bootstrap"));
  assert.ok(markdown.includes("其内容优先于本文件中的旧快照"));
});

test("bootstrap exposes live capabilities and the old-project prompt carries the latest AGENTS.md", () => {
  const db = fixture();
  const denied = buildAgentBootstrap({
    idea: db.ideas[0], attempt: db.attempts[0], baseUrl: "https://platform.example", tokenExpiresAt: at,
  });
  assert.equal(denied.protocol_version, 2);
  assert.equal(denied.capabilities.update_idea, false);
  assert.equal(denied.write_contracts.update_idea.available, false);
  assert.deepEqual(denied.current.work_ids, ["work"]);

  const allowedIdea = { ...db.ideas[0], author: { ...db.ideas[0].author, userId: "owner" } };
  const allowed = buildAgentBootstrap({
    idea: allowedIdea, attempt: db.attempts[0], baseUrl: "https://platform.example", tokenExpiresAt: at,
  });
  assert.equal(allowed.capabilities.update_idea, true);
  assert.equal(allowed.write_contracts.update_idea.endpoint, "https://platform.example/api/v1/ideas/idea");

  const markdown = buildAgentsMd({
    idea: allowedIdea, attempt: db.attempts[0], baseUrl: "https://platform.example", token: "new-token", tokenExpiresAt: at,
  });
  const prompt = buildAgentsUpdatePrompt(markdown);
  assert.ok(prompt.includes("读取项目根目录现有的 AGENTS.md"));
  assert.ok(prompt.includes("<IDEA_PLATFORM_AGENTS_MD>"));
  assert.ok(prompt.includes("Bearer Token：new-token"));
  assert.ok(markdown.includes("## 更新来源想法"));
});
