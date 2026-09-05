import { nanoid } from "nanoid";
import { getAgentRequestIdentity } from "@/lib/auth";
import { mutateDb, readDb } from "@/lib/db";
import { claimExecution, ExecutionError, updateExecution } from "@/lib/agent-execution";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgentRequestIdentity(req, id);
  if (!agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const attempt = (await readDb()).attempts.find(a => a.id === id && a.ownerId === agent.user.id);
  if (!attempt) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ runs: (attempt.execution ?? []).map(({ leaseId: _lease, ...run }) => run) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgentRequestIdentity(req, id);
  if (!agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!req.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "请使用 application/json" }, { status: 415 });
  try {
    const body = await req.json();
    if (!body || !["claim", "heartbeat", "report", "fail"].includes(body.action)) throw new ExecutionError(400, "无效操作。");
    if (body.action !== "claim" && (typeof body.run_id !== "string" || typeof body.lease_id !== "string" || !body.lease_id)) throw new ExecutionError(400, "缺少运行和租约 ID。");
    if (body.action === "claim" && (typeof body.worker_id !== "string" || !body.worker_id.trim())) throw new ExecutionError(400, "缺少执行器 ID。");
    if (["report", "fail"].includes(body.action) && typeof body.report !== "string") throw new ExecutionError(400, "缺少结果报告。");
    let run: unknown;
    const leaseId = nanoid(24);
    await mutateDb(db => {
      const attempt = db.attempts.find(a => a.id === id && a.ownerId === agent.user.id);
      if (!attempt) throw new ExecutionError(404, "承接分支不存在。");
      run = body.action === "claim"
        ? claimExecution(attempt, new Date().toISOString(), leaseId, body.worker_id)
        : updateExecution(attempt, { runId: body.run_id, leaseId: body.lease_id, action: body.action, report: body.report }, new Date().toISOString());
    });
    return NextResponse.json({ run }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ExecutionError ? error.message : "请求格式或执行状态无效。" }, { status: error instanceof ExecutionError ? error.status : 400 });
  }
}
