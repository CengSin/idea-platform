import { getCurrentUser } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/request-origin";
import { setImportedCollaboration } from "@/lib/web-project-import-server";
import { WebProjectImportError } from "@/lib/web-project-import";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (req.headers.has("authorization")) return NextResponse.json({ error: "请使用网页会话设置共创。" }, { status: 401 });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "不允许跨站修改作品。" }, { status: 403 });
  if (!req.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "请使用 application/json" }, { status: 415 });
  try {
    const body = await req.json();
    if (typeof body.collaboration_open !== "boolean") return NextResponse.json({ error: "共创设置无效。" }, { status: 400 });
    const result = await setImportedCollaboration(me.id, (await params).id, body.collaboration_open);
    revalidatePath("/", "layout");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof WebProjectImportError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "设置失败，请稍后重试。" }, { status: 400 });
  }
}
