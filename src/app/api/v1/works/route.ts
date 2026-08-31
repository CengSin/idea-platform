import { publishWork } from "@/lib/ops";
import { getAgentRequestUser } from "@/lib/auth";
import { DEFAULT_COVER, isPlaceholderCover } from "@/lib/cover";
import { resolveLinkPreview } from "@/lib/link-preview";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const me = await getAgentRequestUser(req, body.attempt_id);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!body.user_confirmed) {
    return NextResponse.json(
      { error: "发布作品前必须预览归因与公开信息，并设置 user_confirmed=true。" },
      { status: 400 },
    );
  }
  try {
    const externalUrl = String(body.external_url ?? body.externalUrl ?? "").trim();
    if (externalUrl) {
      let parsed: URL;
      try {
        parsed = new URL(externalUrl);
      } catch {
        throw new Error("external_url 不是有效链接");
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("external_url 只支持 http 或 https 链接");
      }
      if (parsed.username || parsed.password) {
        throw new Error("external_url 不能包含用户名或密码");
      }
    }
    const explicitCover = String(body.cover_url ?? body.coverUrl ?? "").trim();
    if (explicitCover && (!explicitCover.startsWith("/") || explicitCover.startsWith("//"))) {
      let parsed: URL;
      try {
        parsed = new URL(explicitCover);
      } catch {
        throw new Error("cover_url 不是有效链接");
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("cover_url 只支持站内路径、http 或 https 链接");
      }
      if (parsed.username || parsed.password) {
        throw new Error("cover_url 不能包含用户名或密码");
      }
    }
    const customCover = explicitCover && !isPlaceholderCover(explicitCover) ? explicitCover : "";
    const preview = !customCover && externalUrl ? await resolveLinkPreview(externalUrl) : null;
    const coverUrl = customCover || preview?.imageUrl || DEFAULT_COVER;
    const result = await publishWork(me.id, {
      attemptId: body.attempt_id,
      title: body.title,
      summary: body.summary,
      type: body.type ?? "other",
      coverUrl,
      externalUrl: externalUrl || undefined,
      repositoryUrl: body.repository_url ?? body.repositoryUrl,
      license: body.license ?? {
        implementation: true,
        derivatives: true,
        commercialUse: "with_attribution",
      },
    });
    return NextResponse.json({
      ...result,
      attribution: {
        work_id: result.work_id,
        idea_url: undefined,
      },
      preview: {
        cover_url: coverUrl,
        source: customCover
          ? "provided"
          : preview?.source ?? "default",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "publish_work 失败" },
      { status: 400 },
    );
  }
}
