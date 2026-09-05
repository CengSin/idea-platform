"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enqueueExecutionAction, decideExecutionAction } from "@/lib/actions";
import type { Attempt, Idea } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";

export function AgentExecutionPanel({ attempt, idea }: { attempt: Attempt; idea: Idea }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [instruction, setInstruction] = useState(idea.summary);
  const [criteria, setCriteria] = useState(idea.desiredOutputs.join("\n"));
  const [stop, setStop] = useState((idea.stopConditions ?? []).join("\n"));
  const [requestId, setRequestId] = useState("");
  const runs = attempt.execution ?? [];
  const latest = runs.at(-1);
  const busy = latest && ["queued", "running", "waiting_review"].includes(latest.status);
  const status = { queued: "等待执行器领取", running: "执行中", waiting_review: "待你验收", completed: "已验收", failed: "执行中断", cancelled: "已停止" };
  const perform = (task: () => Promise<unknown>) => {
    setError(""); start(async () => { try { await task(); router.refresh(); } catch(e) { setError(e instanceof Error ? e.message : "操作失败"); } });
  };
  return <section className="mt-6 max-w-3xl rounded-3xl border border-line p-5">
    <h2 className="text-[17px] font-medium">执行调度</h2>
    <p className="mt-2 text-[13px] leading-relaxed text-muted">连接外部 Agent 后领取本轮任务，持续回传心跳与结果。验收、继续或停止由你决定，公开同步仍需原有授权。</p>
    <p className="mt-2 text-[12px] text-muted">排队不会自动启动本机软件；先在项目目录启动执行器。连接说明见仓库 README 的“执行调度”。</p>
    {latest ? <div className="mt-4 rounded-2xl bg-idea/5 p-4">
      <div className="text-[13px] font-medium">{status[latest.status]}{latest.status === "running" && Date.parse(latest.leaseUntil ?? "") <= Date.now() ? " · 心跳已过期，可停止后重试" : ""}</div>
      <p className="mt-2 whitespace-pre-wrap text-[13px] text-muted">{latest.instruction}</p>
      {latest.report ? <p className="mt-3 whitespace-pre-wrap text-[13px]">{latest.report}</p> : null}
      {latest.error ? <p className="mt-2 text-[12px] text-blocked">{latest.error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {latest.status === "waiting_review" ? <Button disabled={pending} tone="idea" onClick={() => perform(() => decideExecutionAction(attempt.id, latest.id, "complete"))}>验收通过</Button> : null}
        {["failed", "cancelled", "waiting_review"].includes(latest.status) ? <Button disabled={pending} onClick={() => perform(() => decideExecutionAction(attempt.id, latest.id, "retry"))}>按本轮要求重试</Button> : null}
        {busy ? <Button disabled={pending} onClick={() => perform(() => decideExecutionAction(attempt.id, latest.id, "cancel"))}>停止本轮</Button> : null}
      </div>
    </div> : null}
    {!busy ? <form className="mt-4 flex flex-col gap-4" onSubmit={e => {
      e.preventDefault(); const id = requestId || crypto.randomUUID(); setRequestId(id);
      perform(async () => { await enqueueExecutionAction(attempt.id, { id, instruction, acceptance: criteria.split("\n").map(s => s.trim()).filter(Boolean), stopConditions: stop.split("\n").map(s => s.trim()).filter(Boolean) }); setRequestId(""); });
    }}>
      <Field label="本轮任务"><TextArea value={instruction} onChange={e => setInstruction(e.target.value)} /></Field>
      <details><summary className="cursor-pointer text-[13px] text-muted">验收与停止条件（可选）</summary><div className="mt-3 flex flex-col gap-3">
        <Field label="怎样算完成" hint="每行一项"><TextArea value={criteria} onChange={e => setCriteria(e.target.value)} /></Field>
        <Field label="什么时候停下" hint="每行一项"><TextArea value={stop} onChange={e => setStop(e.target.value)} /></Field>
      </div></details>
      <Button type="submit" tone="idea" disabled={pending || !instruction.trim()}>{pending ? "保存中…" : "加入执行队列"}</Button>
    </form> : null}
    {runs.length > 1 ? <details className="mt-4"><summary className="cursor-pointer text-[12px] text-muted">之前的运行（{runs.length - 1}）</summary>{runs.slice(0, -1).reverse().map(r => <div key={r.id} className="mt-3 border-t border-line pt-3 text-[12px]"><p>{status[r.status]} · {r.instruction}</p><p className="mt-1 whitespace-pre-wrap text-muted">{r.report || r.error}</p></div>)}</details> : null}
    {error ? <p className="mt-3 text-[13px] text-blocked">{error}</p> : null}
  </section>;
}
