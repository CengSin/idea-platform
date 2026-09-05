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
  setWorkIterationStatusRecord,
} from "./idea-agent.ts";
import type { Database } from "./types.ts";

import { fixture, at } from "./agent-test-fixture.ts";
import { enqueueAnalyses, claimAnalysis, finishAnalysis } from "./idea-platform-agent.ts";
function ids() {
  let index = 0;
  return (prefix: "sug" | "ntf") => `${prefix}_${++index}`;
}

const status = (code: number) => (error: unknown) => error instanceof IdeaAgentMutationError && error.status === code;

test("completed analysis creates private reminders and sends one notification", () => {
  const db = fixture();
  const batches = analyze(db);
  assert.equal(batches.length, 1);
  assert.equal(db.works[0].iteration?.suggestions.length, 2);
  assert.equal(db.works[0].iteration?.email.status, "pending");
  assert.equal(db.notifications[0].userId, "owner");
  assert.equal(analyze(db).length, 0);
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
  assert.equal(analyze(unfinished).length, 0);

  const archived = fixture();
  archived.works[0].status = "archived";
  assert.equal(analyze(archived).length, 0);

  const closed = fixture();
  setWorkIterationStatusRecord(closed, "owner", "work", "closed");
  assert.equal(analyze(closed).length, 0);
  setWorkIterationStatusRecord(closed, "owner", "work", "open");
  assert.equal(analyze(closed).length, 1);
  setWorkIterationStatusRecord(closed, "owner", "work", "closed");
  assert.equal(pendingAgentEmails(closed).length, 0);
});

test("owner can accept or dismiss suggestions while other users cannot", () => {
  const db = fixture();
  analyze(db);
  const [accepted, dismissed] = db.works[0].iteration!.suggestions;
  delete accepted.kind; // legacy full suggestion still accepts explicit publication
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
  analyze(db);
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

function analyze(db: Database) {
  enqueueAnalyses(db, at, () => "job");
  const claim = claimAnalysis(db, at, "lease");
  if (!claim) return [];
  finishAnalysis(db, claim.workId, "lease", at, { reminders: [{ label: "缺少验收", reason: "没有同步验证结果" }, { label: "补充说明", reason: "当前说明过于简略" }] }, ids());
  return [claim];
}
