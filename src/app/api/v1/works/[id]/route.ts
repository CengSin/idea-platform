import { readDb } from "@/lib/db";
import { attemptById, ideaById, workById } from "@/lib/format";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = readDb();
  const work = workById(db, id);
  if (!work) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const idea = ideaById(db, work.ideaId);
  const attempt = attemptById(db, work.attemptId);
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
