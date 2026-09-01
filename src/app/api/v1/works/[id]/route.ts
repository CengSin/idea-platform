import { readDb } from "@/lib/db";
import { attemptById, ideaById, workById } from "@/lib/format";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAgentRequestIdentity, getCurrentUser } from "@/lib/auth";
import { canAccessIdea } from "@/lib/content-access";
import { deleteWork, updateWork } from "@/lib/ops";
import { WorkMutationError, workRequestBody } from "@/lib/work-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function mutate(req: Request, id: string, operation: "update" | "delete") {
  try {
    // An explicit invalid credential must never fall back to the browser session.
    const agent = req.headers.has("authorization") ? await getAgentRequestIdentity(req) : null;
    const me = req.headers.has("authorization") ? agent?.user : await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      throw new WorkMutationError(415, "请使用 Content-Type: application/json");
    }
    if (!agent && req.headers.get("origin") && req.headers.get("origin") !== new URL(req.url).origin) {
      throw new WorkMutationError(403, "不允许跨站修改作品");
    }
    let raw: unknown;
    try { raw = await req.json(); } catch { throw new WorkMutationError(400, "请求体不是有效 JSON"); }
    const body = workRequestBody(raw);
    const result = operation === "update"
      ? await updateWork(me.id, id, body, agent?.grant.attemptId)
      : await deleteWork(me.id, id, agent?.grant.attemptId);
    revalidatePath("/", "layout");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof WorkMutationError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Work mutation failed", error);
    return NextResponse.json({ error: "作品操作失败，请稍后重试。" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return mutate(req, (await params).id, "update");
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return mutate(req, (await params).id, "delete");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await readDb();
  const work = workById(db, id);
  if (!work) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const idea = ideaById(db, work.ideaId);
  const attempt = attemptById(db, work.attemptId);
  const hasAuthorization = req.headers.has("authorization");
  const agent = hasAuthorization ? await getAgentRequestIdentity(req) : null;
  const me = hasAuthorization ? agent?.user : await getCurrentUser();
  if (!idea || !canAccessIdea(idea, me?.id) || (agent && agent.grant.attemptId !== work.attemptId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    work,
    attribution: {
      idea_id: idea?.id,
      idea_title: idea?.title,
      attempt_id: attempt?.id,
      attempt_title: attempt?.title,
      credits: work.credits,
    },
  });
}
