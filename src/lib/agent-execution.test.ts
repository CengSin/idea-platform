import test from "node:test";
import assert from "node:assert/strict";
import { fixture, at } from "./agent-test-fixture.ts";
import { enqueueExecution, claimExecution, updateExecution, decideExecution } from "./agent-execution.ts";
import { scopeDatabaseForUser } from "./content-access.ts";
const later = (seconds: number) => new Date(Date.parse(at) + seconds * 1000).toISOString();
const input = { id: "run", instruction: "实现子想法", acceptance: ["用户的标准"], stopConditions: ["本轮后停下"] };

test("execution claims once and requires user review without changing public attempt status", () => {
  const attempt = fixture().attempts[0];
  enqueueExecution(attempt, input, at); enqueueExecution(attempt, input, at);
  assert.equal(attempt.execution?.length, 1);
  assert.equal(claimExecution(attempt, at, "lease", "worker")?.status, "running");
  assert.equal(claimExecution(attempt, at, "other", "worker"), null);
  updateExecution(attempt, { runId: "run", leaseId: "lease", action: "heartbeat" }, later(90));
  const report = updateExecution(attempt, { runId: "run", leaseId: "lease", action: "report", report: "测试通过，等待验收" }, later(150));
  assert.equal(report.status, "waiting_review");
  assert.equal(updateExecution(attempt, { runId: "run", leaseId: "lease", action: "report", report: "同一请求重试" }, later(151)).report, report.report);
  assert.throws(() => enqueueExecution(attempt, { ...input, id: "new" }, later(151)));
  decideExecution(attempt, "run", "complete", later(152));
  assert.equal(attempt.execution?.[0].status, "completed");
  assert.equal(attempt.status, "published");
});

test("cancellation rejects late heartbeat and retry uses a fresh lease", () => {
  const attempt = fixture().attempts[0]; enqueueExecution(attempt, input, at); claimExecution(attempt, at, "old", "w");
  decideExecution(attempt, "run", "cancel", later(1));
  assert.throws(() => updateExecution(attempt, { runId: "run", leaseId: "old", action: "report", report: "late" }, later(2)));
  decideExecution(attempt, "run", "retry", later(3));
  assert.equal(claimExecution(attempt, later(4), "new", "w")?.leaseId, "new");
  assert.deepEqual(attempt.execution?.[0].stopConditions, input.stopConditions);
});

test("expired coding jobs fail without automatic reexecution; run details remain private", () => {
  const db = fixture(); const attempt = db.attempts[0]; enqueueExecution(attempt, input, at); claimExecution(attempt, at, "lease", "w");
  assert.equal(claimExecution(attempt, later(121), "new", "w"), null);
  assert.equal(attempt.execution?.[0].status, "failed");
  assert.equal(scopeDatabaseForUser(db, "other").attempts[0].execution, undefined);
  assert.equal(scopeDatabaseForUser(db, "owner").attempts[0].execution?.length, 1);
});

test("an old failed run cannot be retried while a newer run is active", () => {
  const attempt = fixture().attempts[0]; enqueueExecution(attempt, input, at);
  decideExecution(attempt, "run", "cancel", later(1));
  enqueueExecution(attempt, { ...input, id: "new" }, later(2));
  assert.throws(() => decideExecution(attempt, "run", "retry", later(3)));
});
