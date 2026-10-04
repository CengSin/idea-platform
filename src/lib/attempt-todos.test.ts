import assert from "node:assert/strict";
import test from "node:test";
import { addTodo, deleteTodo, listTodos, TodoError, todoProgress, updateTodo } from "./attempt-todos.ts";
import { fixture } from "./agent-test-fixture.ts";
import { scopeDatabaseForUser } from "./content-access.ts";

const at = "2026-09-08T00:00:00.000Z";

test("todos can be added, toggled, edited and deleted", () => {
  const attempt = fixture().attempts[0];
  const first = addTodo(attempt, { id: "t1", title: " 写测试 " }, at);
  assert.equal(first.title, "写测试");
  assert.equal(first.done, false);
  assert.equal(addTodo(attempt, { id: "t1", title: "写测试" }, at).id, "t1");
  assert.equal(listTodos(attempt).length, 1);

  const toggled = updateTodo(attempt, { id: "t1", done: true }, at);
  assert.equal(toggled.done, true);
  const renamed = updateTodo(attempt, { id: "t1", title: "补测试" }, at);
  assert.equal(renamed.title, "补测试");

  deleteTodo(attempt, "t1");
  assert.deepEqual(listTodos(attempt), []);
  assert.throws(() => deleteTodo(attempt, "t1"), (error: unknown) => error instanceof TodoError && error.status === 404);
});

test("todo validation rejects empty titles and missing ids", () => {
  const attempt = fixture().attempts[0];
  assert.throws(() => addTodo(attempt, { id: "t1", title: "   " }, at), TodoError);
  assert.throws(() => updateTodo(attempt, { id: "missing", done: true }, at), TodoError);
});

test("attempt todos stay private to the owner in scoped snapshots", () => {
  const db = fixture();
  addTodo(db.attempts[0], { id: "secret-todo", title: "私有待办" }, at);
  assert.equal(scopeDatabaseForUser(db, "other").attempts[0].todos, undefined);
  assert.equal(scopeDatabaseForUser(db, "owner").attempts[0].todos?.length, 1);
});

test("todoProgress counts done and total without titles", () => {
  assert.deepEqual(todoProgress(undefined), { done: 0, total: 0 });
  assert.deepEqual(todoProgress([{ done: true }, { done: false }, { done: true }]), { done: 2, total: 3 });
});

test("non-owners see todo progress counts but never todo titles", () => {
  const db = fixture();
  const attempt = db.attempts[0];
  attempt.ownerId = "owner";
  addTodo(attempt, { id: "a", title: "私有标题 A" }, at);
  addTodo(attempt, { id: "b", title: "私有标题 B" }, at);
  updateTodo(attempt, { id: "a", done: true }, at);
  const scoped = scopeDatabaseForUser(db, "other").attempts[0];
  assert.equal(scoped.todos, undefined);
  assert.deepEqual(scoped.todoProgress, { done: 1, total: 2 });
  assert.equal(JSON.stringify(scoped).includes("私有标题"), false);
});
