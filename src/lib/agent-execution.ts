import type { Attempt } from "./types";

export type ExecutionRun = {
  id: string;
  status: "queued" | "running" | "waiting_review" | "completed" | "failed" | "cancelled";
  instruction: string;
  acceptance: string[];
  stopConditions: string[];
  createdAt: string;
  updatedAt: string;
  leaseId?: string;
  leaseUntil?: string;
  workerId?: string;
  report?: string;
  error?: string;
};

export class ExecutionError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function enqueueExecution(attempt: Attempt, input: { id: string; instruction: string; acceptance: string[]; stopConditions: string[] }, at: string) {
  const runs = attempt.execution ??= [];
  const previous = runs.find(r => r.id === input.id);
  if (previous) return previous;
  if (runs.some(r => ["queued", "running", "waiting_review"].includes(r.status))) throw new ExecutionError(409, "请先处理当前运行，再开始下一轮。");
  if (!input.instruction.trim() || input.instruction.length > 8000) throw new ExecutionError(400, "请填写本轮任务，最多 8000 字符。");
  if ([...input.acceptance, ...input.stopConditions].some(s => typeof s !== "string" || s.length > 2000) || input.acceptance.length > 30 || input.stopConditions.length > 30) throw new ExecutionError(400, "执行条件过长。");
  const run: ExecutionRun = { ...input, instruction: input.instruction.trim(), status: "queued", createdAt: at, updatedAt: at };
  attempt.execution = [...runs.slice(-19), run];
  return run;
}

export function claimExecution(attempt: Attempt, at: string, leaseId: string, workerId: string) {
  const runs = attempt.execution ?? [];
  // A lost coding worker may have changed files: never retry it automatically.
  for (const run of runs) {
    if (run.status === "running" && Date.parse(run.leaseUntil ?? "") <= Date.parse(at)) {
      run.status = "failed"; run.error = "执行器心跳中断，请检查工作现场后决定是否重试。"; run.updatedAt = at;
      delete run.leaseId; delete run.leaseUntil;
    }
  }
  if (runs.some(r => r.status === "running")) return null;
  const run = runs.find(r => r.status === "queued");
  if (!run) return null;
  Object.assign(run, { status: "running", leaseId, workerId: workerId.slice(0, 100), leaseUntil: new Date(Date.parse(at) + 120000).toISOString(), updatedAt: at });
  return run;
}

export function updateExecution(attempt: Attempt, input: { runId: string; leaseId: string; action: "heartbeat" | "report" | "fail"; report?: string }, at: string) {
  const run = attempt.execution?.find(r => r.id === input.runId);
  if (!run) throw new ExecutionError(404, "运行不存在。");
  if (run.leaseId !== input.leaseId) throw new ExecutionError(409, "运行已被取消或接管。");
  if ((run.status === "waiting_review" && input.action === "report") || (run.status === "failed" && input.action === "fail")) return run; // transport retry
  if (run.status !== "running" || Date.parse(run.leaseUntil ?? "") <= Date.parse(at)) throw new ExecutionError(409, "运行租约已过期，请保留现场并停止执行。");
  run.updatedAt = at;
  if (input.action === "heartbeat") {
    run.leaseUntil = new Date(Date.parse(at) + 120000).toISOString();
    return run;
  }
  if (!input.report?.trim() || input.report.length > 12000) throw new ExecutionError(400, "请提供本轮结果或失败原因，最多 12000 字符。");
  run.status = input.action === "report" ? "waiting_review" : "failed";
  if (input.action === "report") run.report = input.report.trim();
  else run.error = input.report.trim();
  delete run.leaseUntil;
  return run;
}

export function decideExecution(attempt: Attempt, runId: string, decision: "complete" | "cancel" | "retry", at: string) {
  const run = attempt.execution?.find(r => r.id === runId);
  if (!run) throw new ExecutionError(404, "运行不存在。");
  if (decision === "complete" && run.status !== "waiting_review") throw new ExecutionError(409, "只有已回传的运行可以验收。");
  if (decision === "retry" && !["failed", "cancelled", "waiting_review"].includes(run.status)) throw new ExecutionError(409, "请先停止当前执行，再重试。");
  if (decision === "cancel" && ["completed", "cancelled"].includes(run.status)) throw new ExecutionError(409, "本轮已经结束。");
  if (decision === "retry" && attempt.execution?.some(r => r.id !== runId && ["queued", "running", "waiting_review"].includes(r.status))) throw new ExecutionError(409, "已有其他运行，请先处理当前运行。");
  run.status = decision === "complete" ? "completed" : decision === "cancel" ? "cancelled" : "queued";
  run.updatedAt = at;
  delete run.leaseId; delete run.leaseUntil;
  if (decision === "retry") { delete run.error; delete run.workerId; }
  return run;
}
