import assert from "node:assert/strict";
import test from "node:test";
import { fixture, at } from "./agent-test-fixture.ts";
import { addIdeaComment, buildIdeaDiscussion, deleteIdeaComment, DiscussionError, removeIdeaDiscussion } from "./idea-discussion.ts";
import { parseDatabaseDump } from "./data-backend.ts";
import { buildPublicCatalog } from "./public-catalog.ts";
import { scopeDatabaseForUser } from "./content-access.ts";
import { deleteNextIdeaRecord } from "./next-ideas.ts";

function database() {
  const db = fixture();
  for (const id of ["visitor", "builder", "private"]) {
    db.users.push({ ...db.users[0], id, displayName: id === "private" ? "PRIVATE_NAME" : id, initials: id.slice(0, 1), visibility: id === "private" ? "private" : "public" });
  }
  db.attempts.push({ ...db.attempts[0], id: "visitor-attempt", ownerId: "builder", workIds: [] });
  return db;
}

const post = (id: string, body = "想先了解真实使用场景", parentId?: string) => ({ id, ideaId: "idea", body, parentId });
const status = (code: number) => (error: unknown) => error instanceof DiscussionError && error.status === code;

test("a visitor can start a discussion without adopting, with a targeted author notification", () => {
  const db = database();
  addIdeaComment(db, "visitor", post("root", "  我也遇到过这个问题  "), at);
  assert.equal(db.comments?.[0].body, "我也遇到过这个问题");
  assert.equal(db.attempts.length, 2);
  assert.deepEqual(db.notifications.map((item) => item.userId), ["owner"]);
  assert.equal(db.notifications[0].href, "/explore/idea#comment-root");
  assert.equal(db.notifications[0].kind, "discussion");
  assert.equal(buildPublicCatalog(db)[0].commentCount, 1);
  assert.equal(buildIdeaDiscussion(db, "idea")?.threads[0].canDelete, false);
  assert.equal(buildIdeaDiscussion(db, "idea", "visitor")?.threads[0].canDelete, true);
});

test("replies notify the root author and idea author once, with no notification to oneself", () => {
  const db = database();
  addIdeaComment(db, "visitor", post("root"), at);
  db.notifications = [];
  addIdeaComment(db, "builder", post("reply", "这个方案可以先做原型", "root"), at);
  assert.deepEqual(new Set(db.notifications.map((item) => item.userId)), new Set(["owner", "visitor"]));
  assert.equal(db.notifications.find((item) => item.userId === "visitor")?.title, "你的留言收到回复");
  db.notifications = [];
  addIdeaComment(db, "owner", post("author-reply", "我来补充场景", "root"), at);
  assert.deepEqual(db.notifications.map((item) => item.userId), ["visitor"]);
  const thread = buildIdeaDiscussion(db, "idea")?.threads[0];
  assert.equal(thread?.replies.length, 2);
  assert.equal(thread?.replies.find((item) => item.id === "reply")?.author.isBuilder, true);
  assert.equal(thread?.replies.find((item) => item.id === "author-reply")?.author.isIdeaAuthor, true);
});

test("duplicate submissions are idempotent and conflicting reuse cannot overwrite another comment", () => {
  const db = database();
  addIdeaComment(db, "visitor", post("root"), at);
  addIdeaComment(db, "visitor", post("root"), at);
  assert.equal(db.comments?.length, 1);
  assert.equal(db.notifications.length, 1);
  assert.throws(() => addIdeaComment(db, "builder", post("root"), at), status(409));
  assert.throws(() => addIdeaComment(db, "visitor", post("root", "内容变了"), at), status(409));
});

test("anonymous writes, invalid bodies and malformed payloads cannot create comments", () => {
  const db = database();
  assert.throws(() => addIdeaComment(db, "missing", post("root"), at), status(401));
  for (const input of [null, [], {}, post("root", " "), post("root", "x".repeat(2001)), { ...post("root"), parentId: 7 }, { ...post("root"), id: "bad/id" }]) {
    assert.throws(() => addIdeaComment(db, "visitor", input, at), status(400));
  }
  assert.equal(db.comments, undefined);
  assert.equal(db.notifications.length, 0);
});

test("draft, archived and non-public ideas cannot expose or accept discussions", () => {
  for (const override of [{ status: "draft" }, { status: "archived" }, { visibility: "private" }, { visibility: "invite_only" }, { visibility: "unlisted" }] as const) {
    const db = database();
    addIdeaComment(db, "visitor", post("root"), at);
    Object.assign(db.ideas[0], override);
    assert.equal(buildIdeaDiscussion(db, "idea", "owner"), null);
    assert.throws(() => addIdeaComment(db, "owner", post("another"), at), status(404));
    assert.deepEqual(scopeDatabaseForUser(db, "visitor").comments, []);
  }
});

test("a reply must reference an active root comment in the same idea", () => {
  const db = database();
  addIdeaComment(db, "visitor", post("root"), at);
  addIdeaComment(db, "owner", post("reply", "回复", "root"), at);
  db.ideas.push({ ...db.ideas[0], id: "other-idea" });
  assert.throws(() => addIdeaComment(db, "builder", post("nested", "回复", "reply"), at), status(400));
  assert.throws(() => addIdeaComment(db, "builder", { ...post("cross", "回复", "root"), ideaId: "other-idea" }, at), status(400));
  assert.throws(() => addIdeaComment(db, "builder", post("missing", "回复", "not-found"), at), status(400));
  assert.equal(db.comments?.length, 2);
});

test("private profile names and ids never enter public discussion or notification text", () => {
  const db = database();
  addIdeaComment(db, "private", post("root"), at);
  const serialized = JSON.stringify(buildIdeaDiscussion(db, "idea"));
  assert.equal(serialized.includes("PRIVATE_NAME"), false);
  assert.equal(serialized.includes('"private"'), false);
  assert.equal(db.notifications[0].body.includes("PRIVATE_NAME"), false);
  assert.equal(buildIdeaDiscussion(db, "idea")?.threads[0].author.name, "社区创作者");
});

test("deleting an owned root removes its text and notifications while preserving replies", () => {
  const db = database();
  addIdeaComment(db, "visitor", post("root", "要撤回的内容"), at);
  addIdeaComment(db, "owner", post("reply", "已收到你的问题", "root"), at);
  assert.throws(() => deleteIdeaComment(db, "builder", "idea", "root", at), status(403));
  deleteIdeaComment(db, "visitor", "idea", "root", at);
  const discussion = buildIdeaDiscussion(db, "idea");
  assert.equal(discussion?.count, 1);
  assert.equal(discussion?.threads[0].deleted, true);
  assert.equal(discussion?.threads[0].body, "");
  assert.equal(discussion?.threads[0].replies[0].body, "已收到你的问题");
  assert.equal(JSON.stringify(db).includes("要撤回的内容"), false);
  assert.equal(db.notifications.some((item) => item.href.endsWith("#comment-root")), false);
  assert.throws(() => addIdeaComment(db, "builder", post("new-reply", "回复", "root"), at), status(400));
  deleteIdeaComment(db, "owner", "idea", "reply", at);
  assert.deepEqual(buildIdeaDiscussion(db, "idea"), { count: 0, threads: [] });
});

test("public text remains plain text and comment records survive a legacy-compatible JSON round trip", () => {
  const db = database();
  addIdeaComment(db, "visitor", post("root", '<script>alert("x")</script>'), at);
  addIdeaComment(db, "owner", post("reply", "答复", "root"), at);
  deleteIdeaComment(db, "visitor", "idea", "root", at);
  const restored = parseDatabaseDump(JSON.parse(JSON.stringify(db)))!;
  assert.deepEqual(restored.comments, db.comments);
  assert.equal(buildIdeaDiscussion(restored, "idea")?.threads[0].deleted, true);
  assert.equal(parseDatabaseDump(fixture())?.comments?.length, 0);
});

test("removing an idea clears only its discussion and targeted notifications", () => {
  const db = database();
  addIdeaComment(db, "visitor", post("root"), at);
  db.ideas.push({ ...db.ideas[0], id: "other-idea" });
  addIdeaComment(db, "visitor", { ...post("other"), ideaId: "other-idea" }, at);
  removeIdeaDiscussion(db, "idea");
  assert.deepEqual(db.comments?.map((item) => item.id), ["other"]);
  assert.equal(db.notifications.length, 1);
  assert.ok(db.notifications[0].href.startsWith("/explore/other-idea#"));
});

test("deleting a derived idea cleans its discussion through the existing deletion operation", () => {
  const db = database();
  db.ideas.push({ ...db.ideas[0], id: "next", parentIdeaId: "idea", sourceWorkId: "work", relationKind: "derive" });
  addIdeaComment(db, "visitor", { ...post("root"), ideaId: "next" }, at);
  deleteNextIdeaRecord(db, "owner", "next");
  assert.deepEqual(db.comments, []);
  assert.equal(db.notifications.length, 0);
});

test("repeated rapid posts are limited without blocking an idempotent retry", () => {
  const db = database();
  for (let index = 0; index < 10; index++) addIdeaComment(db, "visitor", post(`comment-${index}`), at);
  assert.throws(() => addIdeaComment(db, "visitor", post("overflow"), at), status(429));
  addIdeaComment(db, "visitor", post("comment-0"), at);
  addIdeaComment(db, "visitor", post("later"), "2026-09-03T10:01:01.000Z");
  assert.equal(db.comments?.length, 11);
});
