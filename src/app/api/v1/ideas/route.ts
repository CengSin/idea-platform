import { publishIdea } from "@/lib/ops";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { ideaMetrics } from "@/lib/format";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const db = readDb();
  const ideas = db.ideas
    .filter((i) => i.visibility === "public" && i.status !== "draft")
    .filter((i) => {
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .map((idea) => ({ ...idea, metrics: ideaMetrics(db, idea.id) }));
  return NextResponse.json({ ideas });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.user_confirmed) {
    return NextResponse.json(
      { error: "发布前必须向用户展示最终公开内容，并设置 user_confirmed=true。" },
      { status: 400 },
    );
  }
  try {
    const result = publishIdea(me.id, {
      title: body.title,
      summary: body.summary ?? "",
      problem: body.problem,
      whyItMatters: body.why_it_matters ?? body.whyItMatters,
      constraints: body.constraints ?? [],
      openQuestions: body.open_questions ?? [],
      desiredOutputs: body.desired_outputs ?? [],
      tags: body.tags ?? [],
      visibility: body.visibility ?? "public",
      license: body.license,
      existingAttempts: body.existing_attempts ?? [],
      viaAgent: true,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "publish_idea 失败" },
      { status: 400 },
    );
  }
}
