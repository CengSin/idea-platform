import { readDb } from "@/lib/db";
import { buildIdeaContext, ideaById } from "@/lib/format";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = readDb();
  const idea = ideaById(db, id);
  if (!idea) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const origin = new URL(req.url).origin;
  return NextResponse.json(buildIdeaContext(idea, origin));
}
