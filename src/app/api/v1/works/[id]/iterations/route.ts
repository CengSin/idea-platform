import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getAgentRequestIdentity } from "@/lib/auth";
import { readDb, mutateDb } from "@/lib/db";
import { proposeIteration } from "@/lib/agent-iterations";
import { NextIdeaMutationError } from "@/lib/next-ideas";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const work = (await readDb()).works.find(w => w.id === id);
  // Always authenticate, including unknown IDs, to avoid exposing private work existence.
  const identity = await getAgentRequestIdentity(req, work?.attemptId ?? "missing");
  if (!identity || !work) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  if (!req.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "请使用 application/json" }, { status: 415, headers });
  try {
    const body = await req.json();
    let result: ReturnType<typeof proposeIteration> | undefined;
    await mutateDb(db => { result = proposeIteration(db, identity.user.id, work.attemptId, id, body, `idea_${nanoid(8)}`, new Date().toISOString()); });
    const { idea, created } = result!;
    return NextResponse.json({ idea_id: idea.id, status: idea.status, source_work_revision_id: idea.sourceWorkRevisionId, review_url: `/ideas/${idea.id}`, created }, { status: created ? 201 : 200, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof NextIdeaMutationError ? error.message : "无法提交迭代草稿。" }, { status: error instanceof NextIdeaMutationError ? error.status : 400, headers });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const work = db.works.find(w => w.id === id);
  const identity = await getAgentRequestIdentity(req, work?.attemptId ?? "missing");
  if (!identity || !work || !db.attempts.some(a => a.id === work.attemptId && a.ownerId === identity.user.id)) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  return NextResponse.json({ iterations: db.ideas.filter(i => i.sourceWorkId === id && i.author.userId === identity.user.id).map(i => ({
    idea_id: i.id, title: i.title, summary: i.summary, problem: i.problem, status: i.status,
    source_work_revision_id: i.sourceWorkRevisionId ?? null, request_id: i.agentRequestId ?? null,
    review_url: `/ideas/${i.id}`, updated_at: i.updatedAt,
  })) }, { headers });
}
