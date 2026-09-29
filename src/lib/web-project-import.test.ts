import assert from "node:assert/strict";
import test from "node:test";
import { applyImportedCollaboration, applyWebProjectImport, canAdoptImportedIdea, parseWebProjectImportInput, WebProjectImportError } from "./web-project-import.ts";
import type { Database } from "./types.ts";

const ids = { ideaId: "idea_import", attemptId: "att_import", workId: "work_import", eventId: "evt_import" };
const at = "2026-09-29T08:00:00.000Z";
function fixture(): Database {
  return { version: 3, users: [{ id: "owner", displayName: "Creator", initials: "C", accent: "#fff", bio: "", skills: [], visibility: "public", createdAt: at, projectLinks: [] }], ideas: [], attempts: [], works: [], events: [], notifications: [], follows: [] };
}
const valid = { url: "https://8.8.8.8", title: "Example Site", summary: "A useful website", problem: "Finding examples takes time", ownsWebsite: true, userConfirmed: true, collaborationOpen: false };

test("import creates one retrospective public chain with separate dates", () => {
  const db = fixture();
  const result = applyWebProjectImport(db, "owner", parseWebProjectImportInput({ ...valid, originalPublishedAt: "2025-01-01" }), ids, at);
  assert.equal(db.ideas.length, 1);
  assert.equal(db.attempts.length, 1);
  assert.equal(db.works.length, 1);
  assert.equal(db.events.length, 1);
  assert.equal(result.idea.importedWorkId, ids.workId);
  assert.equal(result.attempt.status, "published");
  assert.equal(result.work.origin, "imported_web");
  assert.equal(result.work.originalPublishedAt, "2025-01-01");
  assert.equal(result.work.publishedAt, at);
  assert.equal(result.work.collaborationOpen, false);
  assert.deepEqual(result.work.license, { implementation: false, derivatives: false, commercialUse: "no" });
  assert.equal(result.publicUrl, `/explore/${ids.ideaId}#work-${ids.workId}`);
});

test("invalid and duplicate submissions leave no partial records", () => {
  const db = fixture();
  for (const input of [{ ...valid, ownsWebsite: false }, { ...valid, userConfirmed: false }, { ...valid, url: "http://127.0.0.1" }, { ...valid, originalPublishedAt: "2025-02-30" }]) {
    assert.throws(() => parseWebProjectImportInput(input), WebProjectImportError);
    assert.equal(db.ideas.length, 0);
  }
  applyWebProjectImport(db, "owner", parseWebProjectImportInput(valid), ids, at);
  const before = structuredClone(db);
  assert.throws(() => applyWebProjectImport(db, "owner", parseWebProjectImportInput({ ...valid, url: "https://8.8.8.8/#fragment" }), { ...ids, workId: "second" }, at), (error: unknown) => error instanceof WebProjectImportError && error.status === 409 && Boolean(error.existingUrl));
  assert.deepEqual(db, before);
  assert.throws(() => applyWebProjectImport(db, "stranger", parseWebProjectImportInput({ ...valid, url: "https://8.8.4.4" }), ids, at), WebProjectImportError);
  assert.deepEqual(db, before);
});

test("only imported work owner can toggle collaboration, and closing affects only new requests", () => {
  const db = fixture();
  const result = applyWebProjectImport(db, "owner", parseWebProjectImportInput(valid), ids, at);
  assert.equal(canAdoptImportedIdea(db, result.idea, "other"), false);
  assert.throws(() => applyImportedCollaboration(db, "other", ids.workId, true), (error: unknown) => error instanceof WebProjectImportError && error.status === 403);
  applyImportedCollaboration(db, "owner", ids.workId, true);
  assert.equal(canAdoptImportedIdea(db, result.idea, "other"), true);
  db.attempts.push({ ...result.attempt, id: "other-attempt", ownerId: "other" });
  applyImportedCollaboration(db, "owner", ids.workId, false);
  assert.equal(canAdoptImportedIdea(db, result.idea, "other"), false);
  assert.equal(db.attempts.find((item) => item.id === "other-attempt")?.ownerId, "other");
  db.works.push({ ...result.work, id: "ordinary", origin: undefined });
  assert.throws(() => applyImportedCollaboration(db, "owner", "ordinary", true), (error: unknown) => error instanceof WebProjectImportError && error.status === 400);
});
