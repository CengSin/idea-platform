import { nanoid } from "nanoid";
import { getAgentRequestIdentity } from "@/lib/auth";
import { mutateDb, readDb } from "@/lib/db";
import { addTodo, deleteTodo, listTodos, TodoError, updateTodo } from "@/lib/attempt-todos";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgentRequestIdentity(req, id);
  if (!agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const attempt = (await readDb()).attempts.find((item) => item.id === id && item.ownerId === agent.user.id);
  if (!attempt) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ todos: listTodos(attempt) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgentRequestIdentity(req, id);
  if (!agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "请使用 application/json" }, { status: 415 });
  }
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") throw new TodoError(400, "请求无效。");
    const at = new Date().toISOString();
    let todo;
    await mutateDb((db) => {
      const attempt = db.attempts.find((item) => item.id === id && item.ownerId === agent.user.id);
      if (!attempt) throw new TodoError(404, "承接分支不存在。");
      const todoId = typeof body.id === "string" && body.id.trim() ? body.id.trim() : nanoid(12);
      todo = addTodo(attempt, { id: todoId, title: body.title }, at);
    });
    return NextResponse.json({ todo }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof TodoError ? error.message : "请求格式无效。" },
      { status: error instanceof TodoError ? error.status : 400 },
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgentRequestIdentity(req, id);
  if (!agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "请使用 application/json" }, { status: 415 });
  }
  try {
    const body = await req.json();
    if (!body || typeof body.id !== "string" || !body.id.trim()) throw new TodoError(400, "缺少待办 ID。");
    if (body.title === undefined && body.done === undefined) throw new TodoError(400, "请提供 title 或 done。");
    const at = new Date().toISOString();
    let todo;
    await mutateDb((db) => {
      const attempt = db.attempts.find((item) => item.id === id && item.ownerId === agent.user.id);
      if (!attempt) throw new TodoError(404, "承接分支不存在。");
      todo = updateTodo(attempt, { id: body.id, title: body.title, done: body.done }, at);
    });
    return NextResponse.json({ todo }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof TodoError ? error.message : "请求格式无效。" },
      { status: error instanceof TodoError ? error.status : 400 },
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgentRequestIdentity(req, id);
  if (!agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "请使用 application/json" }, { status: 415 });
  }
  try {
    const body = await req.json();
    if (!body || typeof body.id !== "string" || !body.id.trim()) throw new TodoError(400, "缺少待办 ID。");
    let todo;
    await mutateDb((db) => {
      const attempt = db.attempts.find((item) => item.id === id && item.ownerId === agent.user.id);
      if (!attempt) throw new TodoError(404, "承接分支不存在。");
      todo = deleteTodo(attempt, body.id);
    });
    return NextResponse.json({ deleted: true, todo }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof TodoError ? error.message : "请求格式无效。" },
      { status: error instanceof TodoError ? error.status : 400 },
    );
  }
}
