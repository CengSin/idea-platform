#!/usr/bin/env node
// A local adapter: the selected Agent command receives one JSON task on stdin.
// It must return {"report":"..."} on stdout and keep diagnostics on stderr.
import { spawn } from "node:child_process";
import { hostname } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function runWorker({ baseUrl, attemptId, token, command, args = [], cwd = process.cwd(), once = false, signal, pollMs = 15000, heartbeatMs = 30000 }) {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/v1/attempts/${encodeURIComponent(attemptId)}`;
  async function request(url, body) {
    if (new URL(url).origin !== new URL(baseUrl).origin) throw new Error("拒绝把分支凭据发送到其他站点。");
    const response = await fetch(url, {
      method: body ? "POST" : "GET", redirect: "error",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000), ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`平台请求失败 (${response.status})`);
    return response.json();
  }
  const wait = ms => new Promise(resolve => {
    if (signal?.aborted) return resolve();
    const done = () => { clearTimeout(timer); signal?.removeEventListener("abort", done); resolve(); };
    const timer = setTimeout(done, ms); signal?.addEventListener("abort", done, { once: true });
  });
  do {
    if (signal?.aborted) break;
    const { run } = await request(`${endpoint}/execution`, { action: "claim", worker_id: hostname() });
    if (!run) { if (once) return; await wait(pollMs); continue; }
    const payload = (action, report) => ({ action, run_id: run.id, lease_id: run.leaseId, ...(report ? { report } : {}) });
    let child, heartbeat, heartbeatBusy = false, lostLease = false, output = "", submittedReport = "";
    const terminate = () => {
      if (child?.pid && child.exitCode === null && child.signalCode === null) {
        try { process.kill(process.platform === "win32" ? child.pid : -child.pid, "SIGTERM"); } catch {}
        const timer = setTimeout(() => { try { process.kill(process.platform === "win32" ? child.pid : -child.pid, "SIGKILL"); } catch {} }, 3000);
        timer.unref();
      }
    };
    try {
      const bootstrap = await request(`${endpoint}/bootstrap`);
      const context = await request(bootstrap.endpoints.idea_context);
      if (signal?.aborted) throw new Error("执行器已停止");
      child = spawn(command, args, { cwd, stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32", shell: false });
      signal?.addEventListener("abort", terminate, { once: true });
      child.stdout.on("data", data => { output += data; if (output.length > 20000) { lostLease = true; terminate(); } });
      // Do not forward arbitrary Agent logs that might contain tokens.
      child.stderr.resume();
      heartbeat = setInterval(async () => {
        if (heartbeatBusy || lostLease) return;
        heartbeatBusy = true;
        try { await request(`${endpoint}/execution`, payload("heartbeat")); }
        catch { lostLease = true; terminate(); }
        finally { heartbeatBusy = false; }
      }, heartbeatMs);
      const completion = new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("close", code => code === 0 ? resolve() : reject(new Error("Agent 执行失败，请检查本地工作现场。")));
      });
      child.stdin.on("error", () => {});
      child.stdin.end(JSON.stringify({ run, context, bootstrap, instruction: "只执行 run.instruction，按 run.acceptance 和 run.stopConditions 工作。公开变更仍需用户明确授权；未获授权的内容留在私有报告。不得自行验收或开始下一轮。返回 JSON {report: 完成内容、测试证据与未完成项}。" }));
      await completion;
      if (lostLease || signal?.aborted) throw new Error("运行已停止或心跳中断，请检查本地工作现场。");
      const parsed = JSON.parse(output);
      if (typeof parsed.report !== "string" || !parsed.report.trim() || parsed.report.length > 12000) throw new Error("Agent 未返回有效的结果报告。");
      // Stop the heartbeat before committing a terminal state.
      clearInterval(heartbeat);
      submittedReport = parsed.report.replaceAll(token, "[redacted]");
      await request(`${endpoint}/execution`, payload("report", submittedReport));
    } catch {
      terminate();
      let delivered = false;
      if (submittedReport) {
        try { const state = await request(`${endpoint}/execution`); delivered = state.runs?.some(r => r.id === run.id && ["waiting_review", "completed"].includes(r.status) && r.report === submittedReport) ?? false; } catch {}
      }
      if (!delivered) {
        if (!lostLease) {
          try { await request(`${endpoint}/execution`, payload("fail", "执行器未能完成或回传本轮任务，请检查本地工作现场后决定重试。")); } catch {}
        }
        if (once) throw new Error("执行未完成，请查看承接页和本地工作现场。");
      }
    } finally {
      clearInterval(heartbeat); signal?.removeEventListener("abort", terminate);
    }
    if (!once) await wait(pollMs);
  } while (!once && !signal?.aborted);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { IDEA_PLATFORM_URL: baseUrl, IDEA_ATTEMPT_ID: attemptId, IDEA_AGENT_TOKEN: token, IDEA_AGENT_COMMAND, IDEA_AGENT_ARGS = "[]" } = process.env;
  const useCodex = process.argv.includes("--codex");
  const command = useCodex ? process.execPath : IDEA_AGENT_COMMAND;
  if (!baseUrl || !attemptId || !token || !command) {
    console.error("请配置 IDEA_PLATFORM_URL、IDEA_ATTEMPT_ID、IDEA_AGENT_TOKEN、IDEA_AGENT_COMMAND。");
    process.exitCode = 1;
  } else {
    const controller = new AbortController();
    process.once("SIGINT", () => controller.abort()); process.once("SIGTERM", () => controller.abort());
    try {
      const args = useCodex ? [fileURLToPath(new URL("./codex-execution-handler.mjs", import.meta.url))] : JSON.parse(IDEA_AGENT_ARGS);
      if (!Array.isArray(args) || args.some(a => typeof a !== "string")) throw new Error("IDEA_AGENT_ARGS 必须为字符串数组。");
      await runWorker({ baseUrl, attemptId, token, command, args, once: process.argv.includes("--once"), signal: controller.signal });
    } catch { console.error("执行器已停止，请检查连接配置与承接页状态。"); process.exitCode = 1; }
  }
}
