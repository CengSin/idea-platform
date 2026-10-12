import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture, at } from "./agent-test-fixture.ts";
import { proposeIteration } from "./agent-iterations.ts";
import { addTodo } from "./attempt-todos.ts";
import { addIdeaComment, buildIdeaDiscussion, deleteIdeaComment } from "./idea-discussion.ts";

test("Turso persists todos, discussions, notifications, model and user stop rules with CAS", async () => {
  const dir = await mkdtemp(join(tmpdir(), "idea-agent-test-"));
  const oldUrl = process.env.TURSO_DATABASE_URL, oldToken = process.env.TURSO_AUTH_TOKEN;
  process.env.TURSO_DATABASE_URL = `file:${join(dir, "test.db")}`;
  process.env.TURSO_AUTH_TOKEN = "local-test";
  const store = await import("./turso.ts");
  try {
    const db = fixture(); db.agentConfig = { openaiModel: "configured-model" };
    db.ideas[0].stopConditions = ["本轮完成后停下"];
    proposeIteration(db, "owner", "attempt", "work", { request_id: "stable-request", title: "迭代", summary: "白板", problem: "关联缺失" }, "child", at);
    addTodo(db.attempts[0], { id: "t1", title: "本轮待办" }, at);
    db.users.push({ ...db.users[0], id: "visitor", displayName: "讨论参与者" });
    addIdeaComment(db, "visitor", { id: "root-comment", ideaId: "idea", body: "补充一个使用场景" }, at);
    addIdeaComment(db, "owner", { id: "reply-comment", ideaId: "idea", body: "已收到反馈", parentId: "root-comment" }, at);
    deleteIdeaComment(db, "visitor", "idea", "root-comment", at);
    await store.writeTursoContent(db, { createOnly: true });
    const first = await store.readTursoContent();
    assert.deepEqual(first.value?.works[0].revisions, JSON.parse(JSON.stringify(db.works[0].revisions)));
    assert.equal(first.value?.ideas.find(i => i.id === "child")?.sourceWorkRevisionId, "work:r1");
    assert.equal(first.value?.ideas.find(i => i.id === "child")?.agentRequestId, "stable-request");
    assert.equal(first.value?.agentConfig?.openaiModel, "configured-model");
    assert.deepEqual(first.value?.ideas[0].stopConditions, db.ideas[0].stopConditions);
    assert.deepEqual(first.value?.attempts[0].todos, db.attempts[0].todos);
    const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
    assert.deepEqual(JSON.parse(JSON.stringify(first.value?.comments?.toSorted(byId))), JSON.parse(JSON.stringify(db.comments?.toSorted(byId))));
    assert.equal(first.value?.notifications.find((item) => item.kind === "discussion")?.userId, "visitor");
    assert.equal(buildIdeaDiscussion(first.value!, "idea")?.threads[0].replies[0].body, "已收到反馈");
    await store.writeTursoContent(first.value!, { etag: first.etag });
    assert.equal((await store.readTursoContent()).value?.comments?.length, 2);
    await assert.rejects(store.writeTursoContent(first.value!, { etag: first.etag }), store.StorePreconditionFailedError);
  } finally {
    store.tursoClient().close();
    if (oldUrl === undefined) delete process.env.TURSO_DATABASE_URL; else process.env.TURSO_DATABASE_URL = oldUrl;
    if (oldToken === undefined) delete process.env.TURSO_AUTH_TOKEN; else process.env.TURSO_AUTH_TOKEN = oldToken;
    await rm(dir, { recursive: true, force: true });
  }
});
