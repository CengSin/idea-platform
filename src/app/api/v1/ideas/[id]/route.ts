import { getAgentRequestIdentity, getCurrentUser } from "@/lib/auth";
import { canAccessIdea } from "@/lib/content-access";
import { readDb } from "@/lib/db";
import { ideaById, ideaMetrics } from "@/lib/format";
import { deleteIdeaDraft, publishIdeaDraft, updateIdea, updateIdeaDraft } from "@/lib/ops";
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
  // An invalid explicit Bearer token must never fall back to a browser session.
  const hasAuthorization = req.headers.has("authorization");
  const agent = hasAuthorization ? await getAgentRequestIdentity(req) : null;
  const me = hasAuthorization ? agent?.user : await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    if (agent && !req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ error: "请使用 Content-Type: application/json" }, { status: 415 });
    }
    const body = await req.json();
    if (agent && body.user_confirmed !== true) {
      return NextResponse.json(
        { error: "更新想法前请确认公开内容，并设置 user_confirmed=true。" },
        { status: 400 },
      );
    }
    if (body.publish === true) {
      if (agent) {
        return NextResponse.json({ error: "Agent Token 不能代替用户发布想法。" }, { status: 403 });
      }
      if (!body.user_confirmed) {
        return NextResponse.json({ error: "发布草稿前请确认公开内容。" }, { status: 400 });
      }
      return NextResponse.json(await publishIdeaDraft(me.id, id));
    }
    const db = await readDb();
    const idea = ideaById(db, id);
    if (!idea) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (agent) {
      const attempt = db.attempts.find((item) => item.id === agent.grant.attemptId);
      if (!attempt || attempt.ideaId !== id || attempt.ownerId !== me.id) {
        return NextResponse.json({ error: "当前 Token 不属于该想法的承接分支。" }, { status: 403 });
      }
      if (idea.author.userId !== me.id) {
        return NextResponse.json({ error: "只有想法作者可以更新想法。" }, { status: 403 });
      }
    }
    const input = {
      title: body.title ?? idea.title,
      summary: body.summary ?? idea.summary,
      problem: body.problem ?? idea.problem,
      whyItMatters: body.why_it_matters ?? body.whyItMatters ?? idea.whyItMatters,
      constraints: body.constraints ?? idea.constraints,
      openQuestions: body.open_questions ?? body.openQuestions ?? idea.openQuestions,
      desiredOutputs: body.desired_outputs ?? body.desiredOutputs ?? idea.desiredOutputs,
      tags: body.tags ?? idea.tags,
      visibility: body.visibility ?? idea.visibility,
      license: body.license ?? idea.license,
      existingAttempts: body.existing_attempts ?? body.existingAttempts ?? idea.existingAttempts,
    };
    return NextResponse.json(
      agent ? await updateIdea(me.id, id, input) : await updateIdeaDraft(me.id, id, input),
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "想法更新失败" }, { status: 400 });
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
