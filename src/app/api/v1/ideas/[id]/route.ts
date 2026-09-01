import { getAgentRequestIdentity, getCurrentUser } from "@/lib/auth";
import { canAccessIdea } from "@/lib/content-access";
import { readDb } from "@/lib/db";
import { ideaById, ideaMetrics } from "@/lib/format";
import { deleteIdeaDraft, publishIdeaDraft, updateIdeaDraft } from "@/lib/ops";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await readDb();
  const idea = ideaById(db, id);
  if (!idea) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const hasAuthorization = req.headers.has("authorization");
  const agent = hasAuthorization ? await getAgentRequestIdentity(req) : null;
  const me = hasAuthorization ? agent?.user : await getCurrentUser();
  const agentAttempt = agent ? db.attempts.find((item) => item.id === agent.grant.attemptId) : null;
  if (!canAccessIdea(idea, me?.id) || (agent && agentAttempt?.ideaId !== idea.id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    idea,
    metrics: ideaMetrics(db, id),
    attempts: db.attempts.filter((a) => a.ideaId === id),
    works: db.works.filter((w) => w.ideaId === id),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    if (body.publish === true) {
      if (!body.user_confirmed) {
        return NextResponse.json({ error: "发布草稿前请确认公开内容。" }, { status: 400 });
      }
      return NextResponse.json(await publishIdeaDraft(me.id, id));
    }
    const db = await readDb();
    const idea = ideaById(db, id);
    if (!idea) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(await updateIdeaDraft(me.id, id, {
      title: body.title ?? idea.title,
      summary: body.summary ?? idea.summary,
      problem: body.problem ?? idea.problem,
      whyItMatters: body.why_it_matters ?? body.whyItMatters ?? idea.whyItMatters,
      constraints: body.constraints ?? idea.constraints,
      openQuestions: body.open_questions ?? idea.openQuestions,
      desiredOutputs: body.desired_outputs ?? idea.desiredOutputs,
      tags: body.tags ?? idea.tags,
      visibility: body.visibility ?? idea.visibility,
      license: body.license ?? idea.license,
      existingAttempts: body.existing_attempts ?? idea.existingAttempts,
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "草稿更新失败" }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ error: "请使用 JSON 确认删除草稿。" }, { status: 415 });
    }
    const body = await req.json();
    if (body?.user_confirmed !== true) {
      return NextResponse.json({ error: "删除草稿前请设置 user_confirmed=true。" }, { status: 400 });
    }
    return NextResponse.json(await deleteIdeaDraft(me.id, (await params).id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "草稿删除失败" }, { status: 400 });
  }
}
