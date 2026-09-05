import { isAuthorizedAgentScan } from "@/lib/idea-agent";
import { runIdeaAgentScan } from "@/lib/idea-agent-runner";
import { NextResponse } from "next/server";
import { getEffectiveAgentConfig } from "@/lib/agent-config";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(req: Request) {
  const { cronSecret: secret } = await getEffectiveAgentConfig();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET 未配置" }, { status: 503 });
  if (!isAuthorizedAgentScan(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  return NextResponse.json(await runIdeaAgentScan({ siteUrl }));
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
