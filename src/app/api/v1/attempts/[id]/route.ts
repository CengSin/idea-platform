import { updateAttempt } from "@/lib/ops";
import { getAgentRequestUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { attemptById, effectiveAttemptStatus } from "@/lib/format";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const me = await getAgentRequestUser(_req, id);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await readDb();
  const attempt = attemptById(db, id);
  if (!attempt) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    attempt,
    graph_status: effectiveAttemptStatus(attempt),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const me = await getAgentRequestUser(req, id);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.user_confirmed) {
    return NextResponse.json(
      { error: "公开进展需用户确认，请设置 user_confirmed=true。" },
      { status: 400 },
    );
  }
  try {
    const result = await updateAttempt(me.id, {
      attemptId: id,
      status: body.status,
      progressNote: body.progress_note,
      blockers: body.blockers,
      visibility: body.visibility,
      title: body.title,
      approach: body.approach,
      targetDate: body.target_date,
    });
    const db = await readDb();
    const attempt = attemptById(db, id);
    return NextResponse.json({
      ...result,
      graph_status: attempt ? effectiveAttemptStatus(attempt) : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "update_attempt 失败" },
      { status: 400 },
    );
  }
}
