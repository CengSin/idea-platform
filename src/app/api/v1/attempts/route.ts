import { adoptIdea } from "@/lib/ops";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.user_confirmed) {
    return NextResponse.json(
      { error: "承接不排他。请向用户确认后设置 user_confirmed=true。" },
      { status: 400 },
    );
  }
  try {
    const result = await adoptIdea(me.id, {
      ideaId: body.idea_id,
      title: body.title ?? "",
      approach: body.approach ?? "",
      visibility: body.visibility ?? "public",
      targetDate: body.target_date,
      asWatch: body.as_watch,
    });
    return NextResponse.json({
      ...result,
      sync_url: `/api/v1/attempts/${result.attempt_id}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "adopt_idea 失败" },
      { status: 400 },
    );
  }
}
