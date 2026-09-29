import { getCurrentUser } from "@/lib/auth";
import { importWebProject } from "@/lib/web-project-import-server";
import { WebProjectImportError } from "@/lib/web-project-import";
import { isSameOriginRequest } from "@/lib/request-origin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (req.headers.has("authorization")) return NextResponse.json({ error: "请使用网页会话收录网站。" }, { status: 401 });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "不允许跨站发布作品。" }, { status: 403 });
  if (!req.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "请使用 application/json" }, { status: 415 });
  try {
    const result = await importWebProject(me.id, await req.json());
    return NextResponse.json({ work_id: result.work.id, idea_id: result.idea.id, url: result.publicUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof WebProjectImportError) return NextResponse.json({ error: error.message, existing_url: error.existingUrl }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "收录失败，请稍后重试。" }, { status: 400 });
  }
}
