import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture, at } from "./agent-test-fixture.ts";
import { proposeIteration } from "./agent-iterations.ts";
import { enqueueExecution } from "./agent-execution.ts";
import { enqueueAnalyses, claimAnalysis } from "./idea-platform-agent.ts";

test("Turso persists execution, analysis leases, model and user stop rules with CAS", async () => {
  const dir = await mkdtemp(join(tmpdir(), "idea-agent-test-"));
  const oldUrl = process.env.TURSO_DATABASE_URL, oldToken = process.env.TURSO_AUTH_TOKEN;
  process.env.TURSO_DATABASE_URL = `file:${join(dir, "test.db")}`;
  process.env.TURSO_AUTH_TOKEN = "local-test";
  const store = await import("./turso.ts");
  try {
    const db = fixture(); db.agentConfig = { openaiModel: "configured-model" };
    db.ideas[0].stopConditions = ["本轮完成后停下"];
    proposeIteration(db, "owner", "attempt", "work", { request_id: "stable-request", title: "迭代", summary: "白板", problem: "关联缺失" }, "child", at);
    enqueueExecution(db.attempts[0], { id: "r", instruction: "本轮", acceptance: ["自定义"], stopConditions: ["等我确认"] }, at);
    enqueueAnalyses(db, at, () => "analysis"); claimAnalysis(db, at, "lease");
    await store.writeTursoContent(db, { createOnly: true });
    const first = await store.readTursoContent();
    assert.deepEqual(first.value?.works[0].revisions, JSON.parse(JSON.stringify(db.works[0].revisions)));
    assert.equal(first.value?.ideas.find(i => i.id === "child")?.sourceWorkRevisionId, "work:r1");
    assert.equal(first.value?.ideas.find(i => i.id === "child")?.agentRequestId, "stable-request");
    assert.equal(first.value?.agentConfig?.openaiModel, "configured-model");
    assert.deepEqual(first.value?.ideas[0].stopConditions, db.ideas[0].stopConditions);
    assert.deepEqual(first.value?.attempts[0].execution, db.attempts[0].execution);
    assert.equal(first.value?.works[0].iteration?.analysis?.leaseId, "lease");
    await store.writeTursoContent(first.value!, { etag: first.etag });
    await assert.rejects(store.writeTursoContent(first.value!, { etag: first.etag }), store.StorePreconditionFailedError);
  } finally {
    store.tursoClient().close();
    if (oldUrl === undefined) delete process.env.TURSO_DATABASE_URL; else process.env.TURSO_DATABASE_URL = oldUrl;
    if (oldToken === undefined) delete process.env.TURSO_AUTH_TOKEN; else process.env.TURSO_AUTH_TOKEN = oldToken;
    await rm(dir, { recursive: true, force: true });
  }
});
