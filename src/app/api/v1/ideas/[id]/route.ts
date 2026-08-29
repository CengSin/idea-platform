import { readDb } from "@/lib/db";
import { ideaById, ideaMetrics } from "@/lib/format";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = readDb();
  const idea = ideaById(db, id);
  if (!idea) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    idea,
    metrics: ideaMetrics(db, id),
    attempts: db.attempts.filter((a) => a.ideaId === id),
    works: db.works.filter((w) => w.ideaId === id),
  });
}
