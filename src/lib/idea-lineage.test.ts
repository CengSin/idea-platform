import assert from "node:assert/strict";
import test from "node:test";
import { visibleLineageAttempts } from "./idea-lineage.ts";
import type { Attempt, AttemptStatus } from "./types.ts";

function attempt(id: string, status: AttemptStatus, ownerId = "other"): Attempt {
  return {
    id,
    ideaId: "idea",
    ownerId,
    title: id,
    approach: "",
    status,
    progressNote: "",
    visibility: "public",
    blockers: [],
    startedAt: "2026-01-01T00:00:00.000Z",
    lastActiveAt: `2026-01-0${id.length}T00:00:00.000Z`,
    createdAt: "2026-01-01T00:00:00.000Z",
    workIds: [],
  };
}

test("project lineage keeps every non-abandoned branch, including work in progress", () => {
  const attempts = [
    attempt("watch", "considering"),
    attempt("understand", "understanding"),
    attempt("prototype", "prototyping"),
    attempt("test", "testing", "me"),
    attempt("pause", "paused"),
    attempt("stalled", "stalled"),
    attempt("done", "published"),
    attempt("gone", "abandoned"),
  ];

  const visible = visibleLineageAttempts(attempts, "me");

  assert.equal(visible[0]?.id, "test");
  assert.deepEqual(
    new Set(visible.map((item) => item.status)),
    new Set(["considering", "understanding", "prototyping", "testing", "paused", "stalled", "published"]),
  );
});
