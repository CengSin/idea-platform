import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { runWorker } from "./idea-platform-worker.mjs";

test("worker claims a task, heartbeats while command runs, and submits a private report", async () => {
  const calls = [];
  let origin;
  const server = createServer(async (req, res) => {
    assert.equal(req.headers.authorization, "Bearer test-token");
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    calls.push(body.action || req.url);
    res.setHeader("Content-Type", "application/json");
    if (body.action === "claim") res.end(JSON.stringify({ run: { id: "r", leaseId: "l", instruction: "test" } }));
    else if (req.url.endsWith("bootstrap")) res.end(JSON.stringify({ endpoints: { idea_context: `${origin}/context` } }));
    else { if (body.action === "report") assert.equal(body.report, "测试完成 [redacted]"); res.end('{}'); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  try {
    await runWorker({ baseUrl: origin, attemptId: "a", token: "test-token", command: process.execPath, args: ["-e", 'process.stdin.resume();process.stdin.on("end",()=>setTimeout(()=>console.log(JSON.stringify({report:"测试完成 test-token"})),100))'], once: true, heartbeatMs: 20 });
    assert.ok(calls.includes("heartbeat"));
    assert.equal(calls.at(-1), "report");
    assert.ok(!calls.includes("fail"));
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test("worker never launches an Agent when the queue is empty", async () => {
  const server = createServer((_req, res) => { res.setHeader("Content-Type", "application/json"); res.end('{"run":null}'); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try { await runWorker({ baseUrl: `http://127.0.0.1:${server.address().port}`, attemptId: "a", token: "t", command: "/nonexistent", once: true }); }
  finally { await new Promise(resolve => server.close(resolve)); }
});

test("worker stops the command when the platform cancels its lease", async () => {
  let origin, reported = false;
  const server = createServer(async (req, res) => {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    res.setHeader("Content-Type", "application/json");
    if (body.action === "claim") res.end('{"run":{"id":"r","leaseId":"l"}}');
    else if (body.action === "heartbeat") { res.statusCode = 409; res.end('{}'); }
    else if (req.url.endsWith("bootstrap")) res.end(JSON.stringify({ endpoints: { idea_context: `${origin}/context` } }));
    else { if (body.action === "report") reported = true; res.end('{}'); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  try {
    await assert.rejects(runWorker({ baseUrl: origin, attemptId: "a", token: "t", command: process.execPath, args: ["-e", 'setInterval(()=>{},1000)'], once: true, heartbeatMs: 30 }));
    assert.equal(reported, false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test("worker reconciles a report whose acknowledgement was lost", async () => {
  let origin, report, failed = false;
  const server = createServer(async (req, res) => {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    res.setHeader("Content-Type", "application/json");
    if (body.action === "claim") res.end('{"run":{"id":"r","leaseId":"l"}}');
    else if (body.action === "report") { report = body.report; res.statusCode = 503; res.end('{}'); }
    else if (body.action === "fail") { failed = true; res.end('{}'); }
    else if (req.url.endsWith("bootstrap")) res.end(JSON.stringify({ endpoints: { idea_context: `${origin}/context` } }));
    else if (req.url.endsWith("execution") && req.method === "GET") res.end(JSON.stringify({ runs: [{ id: "r", status: "waiting_review", report }] }));
    else res.end('{}');
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); origin = `http://127.0.0.1:${server.address().port}`;
  try {
    await runWorker({ baseUrl: origin, attemptId: "a", token: "t", command: process.execPath, args: ["-e", 'process.stdin.resume();process.stdin.on("end",()=>console.log(JSON.stringify({report:"done"})))'], once: true });
    assert.equal(failed, false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
