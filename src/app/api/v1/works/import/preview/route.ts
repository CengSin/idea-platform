import { getCurrentUser } from "@/lib/auth";
import { resolveWebsitePreview } from "@/lib/link-preview";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (req.headers.has("authorization")) return NextResponse.json({ error: "请使用网页会话预览网站。" }, { status: 401 });
  if (!await getCurrentUser()) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  if (!req.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "请使用 application/json" }, { status: 415 });
  try {
    const body = await req.json();
    const preview = await resolveWebsitePreview(String(body.url ?? ""));
    return NextResponse.json({ preview });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法预览网站。" }, { status: 400 });
  }
}
