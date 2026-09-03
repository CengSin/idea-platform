import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptAgentSuggestionRecord,
  dismissAgentSuggestionRecord,
  IdeaAgentMutationError,
  isAuthorizedAgentScan,
  pendingAgentEmails,
  recordAgentEmail,
  renderAgentEmail,
  scanCompletedWorks,
  setWorkIterationStatusRecord,
} from "./idea-agent.ts";
import type { Database } from "./types.ts";

const at = "2026-09-03T10:00:00.000Z";
const license = { implementation: true, derivatives: true, commercialUse: "with_attribution" as const };

function fixture(): Database {
  return {
    version: 3,
    users: [{ id: "owner", displayName: "作者", initials: "作", accent: "#fff", bio: "", skills: [], visibility: "public", createdAt: at, projectLinks: [] }],
    ideas: [{ id: "idea", title: "来源想法", summary: "简介", problem: "缺少迭代", whyItMatters: "持续生长", constraints: [], existingAttempts: [], openQuestions: [], desiredOutputs: [], tags: ["agent"], author: { kind: "user", userId: "owner", displayName: "作者" }, license, visibility: "public", status: "realized", graph: { x: 0, y: 0 }, createdAt: at, updatedAt: at }],
    attempts: [{ id: "attempt", ideaId: "idea", ownerId: "owner", title: "承接", approach: "", status: "published", progressNote: "", visibility: "public", blockers: [], startedAt: at, lastActiveAt: at, createdAt: at, workIds: ["work"] }],
    works: [{ id: "work", attemptId: "attempt", ideaId: "idea", title: "样例作品", summary: "已完成", type: "website", coverUrl: "", status: "published", credits: [], license, publishedAt: at, views: 0, saves: 0, citations: 0 }],
    events: [], notifications: [], follows: [],
  };
}

function ids() {
  let index = 0;
  return (prefix: "sug" | "ntf") => `${prefix}_${++index}`;
}

const status = (code: number) => (error: unknown) => error instanceof IdeaAgentMutationError && error.status === code;

test("scan creates three private suggestions once for a completed open work", () => {
  const db = fixture();
  const batches = scanCompletedWorks(db, at, ids());
  assert.equal(batches.length, 1);
  assert.equal(batches[0].suggestions.length, 3);
  assert.equal(db.works[0].iteration?.email.status, "pending");
  assert.equal(db.notifications[0].userId, "owner");
  assert.equal(scanCompletedWorks(db, at, ids()).length, 0);
  assert.equal(pendingAgentEmails(db).length, 1);
  recordAgentEmail(db, "work", "sent", at);
  assert.equal(pendingAgentEmails(db).length, 0);
});

test("scheduled scans require the exact configured bearer secret", () => {
  assert.equal(isAuthorizedAgentScan("Bearer expected", "expected"), true);
  assert.equal(isAuthorizedAgentScan("Bearer wrong", "expected"), false);
  assert.equal(isAuthorizedAgentScan(null, "expected"), false);
  assert.equal(isAuthorizedAgentScan("Bearer ", ""), false);
});

test("scan ignores unfinished, archived and closed works", () => {
  const unfinished = fixture();
  unfinished.attempts[0].status = "testing";
  assert.equal(scanCompletedWorks(unfinished, at, ids()).length, 0);

  const archived = fixture();
  archived.works[0].status = "archived";
  assert.equal(scanCompletedWorks(archived, at, ids()).length, 0);

  const closed = fixture();
  setWorkIterationStatusRecord(closed, "owner", "work", "closed");
  assert.equal(scanCompletedWorks(closed, at, ids()).length, 0);
  setWorkIterationStatusRecord(closed, "owner", "work", "open");
  assert.equal(scanCompletedWorks(closed, at, ids()).length, 1);
  setWorkIterationStatusRecord(closed, "owner", "work", "closed");
  assert.equal(pendingAgentEmails(closed).length, 0);
});

test("owner can accept or dismiss suggestions while other users cannot", () => {
  const db = fixture();
  scanCompletedWorks(db, at, ids());
  const [accepted, dismissed] = db.works[0].iteration!.suggestions;
  assert.throws(
    () => acceptAgentSuggestionRecord(db, "stranger", "work", accepted.id, "next"),
    status(403),
  );
  const suggestion = acceptAgentSuggestionRecord(db, "owner", "work", accepted.id, "next");
  assert.equal(suggestion.status, "accepted");
  assert.equal(accepted.acceptedIdeaId, "next");
  dismissAgentSuggestionRecord(db, "owner", "work", dismissed.id);
  assert.equal(dismissed.status, "dismissed");
  assert.equal(db.works[0].citations, 0);
});

test("email rendering escapes work and suggestion content", () => {
  const db = fixture();
  scanCompletedWorks(db, at, ids());
  db.works[0].iteration!.suggestions[0].title = "<script>alert(1)</script>";
  const email = renderAgentEmail({
    displayName: "A&B",
    workTitle: "<作品>",
    workUrl: "https://example.com/works/work?a=1&b=2",
    suggestions: db.works[0].iteration!.suggestions,
  });
  assert.ok(email.html.includes("A&amp;B"));
  assert.ok(email.html.includes("&lt;script&gt;"));
  assert.ok(!email.html.includes("<script>"));
  assert.ok(email.html.includes("a=1&amp;b=2"));
});
