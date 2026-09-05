import { sourceContext } from "@/lib/agent-context";
import { readDb } from "@/lib/db";
import { getAgentRequestIdentity, getCurrentUser } from "@/lib/auth";
import { canAccessIdea } from "@/lib/content-access";
import { buildIdeaContext, ideaById } from "@/lib/format";
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
  const origin = new URL(req.url).origin;
  return NextResponse.json({ ...buildIdeaContext(idea, origin), upstream: sourceContext(db, idea, me?.id) }, { headers: { "Cache-Control": "private, no-store" } });
}
