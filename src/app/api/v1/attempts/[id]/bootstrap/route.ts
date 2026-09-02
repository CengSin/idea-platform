import { buildAgentBootstrap } from "@/lib/agent-setup";
import { getAgentRequestIdentity } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { attemptById, ideaById } from "@/lib/format";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const agent = await getAgentRequestIdentity(req, id);
  if (!agent) {
    return NextResponse.json(
      {
        error: "unauthorized",
        recovery: "请从承接页或任一所属作品详情页下载最新 AGENTS.md。",
      },
      { status: 401 },
    );
  }
  const db = await readDb();
  const attempt = attemptById(db, id);
  if (!attempt || attempt.ownerId !== agent.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const idea = ideaById(db, attempt.ideaId);
  if (!idea) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(
    buildAgentBootstrap({
      idea,
      attempt,
      baseUrl: new URL(req.url).origin,
      tokenExpiresAt: agent.grant.expiresAt,
    }),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
