import test from "node:test";
import assert from "node:assert/strict";
import { fixture, at } from "./agent-test-fixture.ts";
import { analysisContext, enqueueAnalyses, claimAnalysis, finishAnalysis, parseReminders, generateReminders } from "./idea-platform-agent.ts";
import { sourceContext } from "./agent-context.ts";
const later = (seconds: number) => new Date(Date.parse(at) + seconds * 1000).toISOString();
const ids = () => Math.random().toString();

test("analysis lease excludes duplicate workers and rejects stale commits", () => {
  const db = fixture(); enqueueAnalyses(db, at, ids);
  const first = claimAnalysis(db, at, "a")!;
  assert.equal(claimAnalysis(db, at, "b"), null);
  const takeover = claimAnalysis(db, later(61), "b")!;
  assert.equal(takeover.job.id, first.job.id);
  assert.equal(finishAnalysis(db, "work", "a", later(62), { reminders: [] }, ids), false);
  assert.equal(finishAnalysis(db, "work", "b", later(62), { reminders: [] }, ids), true);
  assert.equal(db.works[0].iteration?.suggestions.length, 0);
  assert.equal(db.works[0].iteration?.email.status, "skipped");
});

test("analysis retries transient failure, stops technical retries, and invalidates changed context", () => {
  const db = fixture(); enqueueAnalyses(db, at, ids);
  claimAnalysis(db, at, "a"); finishAnalysis(db, "work", "a", later(1), { error: "超时" }, ids);
  assert.equal(claimAnalysis(db, later(100), "b"), null);
  claimAnalysis(db, later(122), "b");
  db.works[0].summary = "新的实现结果";
  assert.equal(finishAnalysis(db, "work", "b", later(123), { reminders: [] }, ids), false);
  enqueueAnalyses(db, later(123), ids);
  assert.equal(db.works[0].iteration?.analysis?.attempts, 0);
  claimAnalysis(db, later(124), "c");
  db.works[0].iteration!.status = "closed";
  assert.equal(finishAnalysis(db, "work", "c", later(125), { reminders: [] }, ids), false);
});

test("model output supports zero and variable count, rejects malformed output, and deduplicates", async () => {
  assert.deepEqual(parseReminders({ reminders: [] }), []);
  assert.equal(parseReminders({ reminders: [{ label: "测试", reason: "缺少证据" }, { label: "测试", reason: "重复" }] }).length, 1);
  assert.throws(() => parseReminders({ reminders: [{ label: "", reason: "x" }] }));
  assert.throws(() => parseReminders({ reminders: Array(7).fill({ label: "a", reason: "b" }) }));
  const db = fixture(); db.attempts[0].executionPrompt = "SECRET";
  const context = analysisContext(db, db.works[0]);
  assert.ok(!JSON.stringify(context).includes("SECRET"));
  const config = { openaiBaseUrl: "https://model.example/v1", openaiApiKey: "private-key", openaiModel: "configured-model" };
  const mock: typeof fetch = async (url, init) => {
    assert.equal(url, "https://model.example/v1/chat/completions");
    const body = JSON.parse(init!.body as string);
    assert.equal(body.model, "configured-model");
    assert.ok(!JSON.stringify(body).includes("private-key"));
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: '{"reminders":[{"label":"补充测试证据","reason":"进展中未记录测试结果"}]}' } }] });
  };
  assert.equal((await generateReminders(config, context, mock)).length, 1);
  await assert.rejects(generateReminders(config, context, async () => Response.json({ choices: [{ finish_reason: "length", message: { content: '{}' } }] })));
  await assert.rejects(generateReminders(config, context, async () => new Response("secret upstream body", { status: 503 })), /503/);
});

test("subidea upstream context excludes another owner's private work and draft", () => {
  const db = fixture(); const child = { ...db.ideas[0], id: "child", parentIdeaId: "idea", sourceWorkId: "work" };
  db.attempts[0].visibility = "private";
  assert.equal(sourceContext(db, child, "other")?.work, null);
  assert.equal(sourceContext(db, child, "owner")?.work?.id, "work");
  db.ideas[0].status = "draft";
  assert.equal(sourceContext(db, child, "other"), null);
});

test("three interrupted analysis attempts require a manual retry", () => {
  const db = fixture(); enqueueAnalyses(db, at, ids);
  claimAnalysis(db, at, "a"); claimAnalysis(db, later(61), "b"); claimAnalysis(db, later(122), "c");
  assert.equal(claimAnalysis(db, later(183), "d"), null);
  assert.equal(db.works[0].iteration?.analysis?.status, "failed");
  assert.equal(db.works[0].iteration?.analysis?.attempts, 3);
});

test("dismissed reminders are not recreated even if the model repeats them", () => {
  const db = fixture(); enqueueAnalyses(db, at, ids); claimAnalysis(db, at, "a");
  finishAnalysis(db, "work", "a", later(1), { reminders: [{ label: "测试", reason: "无验证结果" }] }, ids);
  db.works[0].iteration!.suggestions[0].status = "dismissed";
  enqueueAnalyses(db, later(2), ids); claimAnalysis(db, later(2), "b");
  finishAnalysis(db, "work", "b", later(3), { reminders: [{ label: "测试", reason: "重复" }] }, ids);
  assert.equal(db.works[0].iteration?.suggestions.filter(s => s.status === "pending").length, 0);
});
