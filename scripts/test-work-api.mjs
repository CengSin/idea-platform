// Runs against a disposable app copy: never reads .env.local or writes real user data.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, scryptSync } from "node:crypto";
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = await mkdtemp(path.join(os.tmpdir(), "idea-work-api-"));
const port = Number(process.env.WORK_TEST_PORT || 3127);
const base = `http://localhost:${port}`;
const at = new Date().toISOString();
const expiresAt = new Date(Date.now() + 86400000).toISOString();
const hash = (value) => createHash("sha256").update(value).digest("hex");
const license = { implementation: true, derivatives: true, commercialUse: "with_attribution" };
const users = ["owner", "stranger"].map((id) => ({ id, displayName: id === "owner" ? "测试作者" : "其他用户", initials: "测", accent: "#66C7C0", bio: "", skills: [], visibility: "public", createdAt: at, projectLinks: [] }));
const idea = (id) => ({ id, title: "作品管理测试", summary: "独立测试数据", problem: "验证作品管理", whyItMatters: "数据安全", constraints: [], existingAttempts: [], openQuestions: [], desiredOutputs: [], tags: [], author: { kind: "user", userId: "owner", displayName: "测试作者" }, license, visibility: "public", status: "realized", graph: { x: 0, y: 0 }, createdAt: at, updatedAt: at });
const attempt = (id, ideaId, workIds) => ({ id, ideaId, ownerId: "owner", title: "测试承接", approach: "独立验证", status: workIds.length ? "published" : "testing", progressNote: "验证中", visibility: "public", blockers: [], startedAt: at, lastActiveAt: at, createdAt: at, workIds });
const work = (id, attemptId, ideaId) => ({ id, attemptId, ideaId, title: id === "ui-work" ? "可编辑的测试作品" : "接口测试作品", summary: "作品修改前的介绍。", type: "website", coverUrl: "/covers/echo-yard.jpg", externalUrl: "", repositoryUrl: "https://example.com/repo", status: "published", credits: [{ userId: "owner", role: "作者", name: "测试作者" }], license, publishedAt: at, views: 10, saves: 2, citations: 0 });
const database = {
  version: 3, users, ideas: [idea("idea"), idea("ui-idea")],
  attempts: [attempt("branch", "idea", ["work", "second"]), attempt("other-branch", "idea", []), attempt("ui-branch", "ui-idea", ["ui-work"])],
  works: [work("work", "branch", "idea"), work("second", "branch", "idea"), work("ui-work", "ui-branch", "ui-idea")],
  events: [{ id: "event", at, actorId: "owner", actorName: "测试作者", text: "发布了作品", workId: "work", ideaId: "idea", attemptId: "branch" }],
  notifications: [{ id: "notice", at, title: "作品发布", body: "测试", read: false, href: "/works/work", kind: "work" }], follows: [],
};
const auth = {
  version: 1,
  accounts: users.map(({ id, displayName }) => ({ userId: id, displayName, email: `${id}@work-test.example`, passwordSalt: "work-test-salt", passwordHash: scryptSync("Local-work-test-123!", "work-test-salt", 64).toString("hex"), createdAt: at })),
  sessions: [{ tokenHash: hash("test-owner-session"), userId: "owner", expiresAt }],
  agentTokens: [["owner-token", "owner", "branch"], ["other-token", "owner", "other-branch"], ["stranger-token", "stranger", "branch"], ["expired-token", "owner", "branch"]].map(([token, userId, attemptId]) => ({ tokenHash: hash(token), userId, attemptId, createdAt: at, expiresAt: token === "expired-token" ? "2020-01-01" : expiresAt })),
};
await Promise.all(["src", "public", "package.json", "tsconfig.json", "next.config.ts", "next-env.d.ts", "postcss.config.mjs"].map((name) => cp(path.join(root, name), path.join(dir, name), { recursive: true })));
await symlink(path.join(root, "node_modules"), path.join(dir, "node_modules"), "dir");
await mkdir(path.join(dir, "data"));
await writeFile(path.join(dir, "data/db.json"), JSON.stringify(database));
await writeFile(path.join(dir, "data/auth.json"), JSON.stringify(auth));
const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: dir,
  env: { ...process.env, DATA_BACKEND: "vercel", VERCEL: "", BLOB_READ_WRITE_TOKEN: "", NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_SITE_URL: base },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", (data) => { logs += data; });
child.stderr.on("data", (data) => { logs += data; });
async function request(method, id, body, expected, token = "owner-token", extra = {}) {
  const response = await fetch(`${base}/api/v1/works/${id}`, {
    method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
  const result = await response.json();
  assert.equal(response.status, expected, `${method} ${id}: ${JSON.stringify(result)}`);
  return result;
}
async function apiRequest(method, pathname, body, expected, token = "owner-token", extra = {}) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
  const result = await response.json();
  assert.equal(response.status, expected, `${method} ${pathname}: ${JSON.stringify(result)}`);
  return result;
}
try {
  const deadline = Date.now() + 60000;
  for (;;) {
    try {
      const probe = await fetch(`${base}/api/v1/works/work`);
      const payload = await probe.json();
      // Never send mutations to an unrelated service already using the port.
      if (!probe.ok || payload.work?.publishedAt !== at) throw new Error("Test fixture identity mismatch");
      break;
    } catch {
      if (Date.now() > deadline || child.exitCode !== null) throw new Error(`Test server unavailable: ${logs}`);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  const bootstrap = await apiRequest("GET", "/api/v1/attempts/branch/bootstrap", undefined, 200);
  assert.equal(bootstrap.protocol_version, 2);
  assert.equal(bootstrap.capabilities.update_idea, true);
  assert.deepEqual(bootstrap.current.work_ids, ["work", "second"]);
  await apiRequest("GET", "/api/v1/attempts/branch/bootstrap", undefined, 401, "expired-token");
  await apiRequest("PATCH", "/api/v1/ideas/idea", { user_confirmed: false, summary: "未确认" }, 400);
  await apiRequest("PATCH", "/api/v1/ideas/idea", { user_confirmed: true, summary: "由 Agent 更新的想法" }, 200);
  await apiRequest("PATCH", "/api/v1/ideas/idea", { user_confirmed: true, publish: true }, 403);
  await apiRequest("PATCH", "/api/v1/ideas/idea", { user_confirmed: true, summary: "越权" }, 403, "stranger-token");
  await apiRequest("PATCH", "/api/v1/ideas/ui-idea", { user_confirmed: true, summary: "跨分支" }, 403);
  const confirmed = { user_confirmed: true };
  for (const method of ["PATCH", "DELETE"]) {
    const body = { ...confirmed, ...(method === "PATCH" ? { title: "updated" } : {}) };
    for (const token of [null, "bad-token", "expired-token"]) await request(method, "work", body, 401, token);
    for (const token of ["stranger-token", "other-token"]) await request(method, "work", body, 403, token);
    await request(method, "missing", body, 404);
    await request(method, "work", { ...body, user_confirmed: "true" }, 400);
    await request(method, "work", "{", 400);
    await request(method, "work", body, 415, "owner-token", { "Content-Type": "text/plain" });
  }
  for (const patch of [{ credits: [] }, { attempt_id: "other-branch" }, { external_url: "javascript:alert(1)" }, { title: " " }, { type: "invalid" }]) await request("PATCH", "work", { ...confirmed, ...patch }, 400);
  await request("PATCH", "work", { ...confirmed, title: "bad-origin" }, 403, null, { Cookie: "idea_session=test-owner-session", Origin: "https://evil.example" });
  await request("PATCH", "work", { ...confirmed, title: "bad-token" }, 401, "invalid", { Cookie: "idea_session=test-owner-session" });
  const result = await request("PATCH", "work", { ...confirmed, title: "已编辑", repository_url: "" }, 200);
  assert.deepEqual(result.work, { ...database.works[0], title: "已编辑", repositoryUrl: "" });
  const cookieResult = await request("PATCH", "work", { ...confirmed, summary: "网页会话更新" }, 200, null, { Cookie: "idea_session=test-owner-session", Origin: base });
  assert.equal(cookieResult.work.summary, "网页会话更新");
  await Promise.all([
    request("PATCH", "work", { ...confirmed, title: "并发名称" }, 200),
    request("PATCH", "work", { ...confirmed, summary: "并发简介" }, 200),
  ]);
  const concurrent = await request("GET", "work", undefined, 200);
  assert.equal(concurrent.work.title, "并发名称");
  assert.equal(concurrent.work.summary, "并发简介");
  const cleared = await request("PATCH", "work", { ...confirmed, cover_url: "", external_url: "" }, 200);
  assert.equal(cleared.work.coverUrl, "/covers/hushcity.jpg");
  const removed = await request("DELETE", "work", confirmed, 200);
  assert.equal(removed.deleted, true);
  assert.equal(removed.attempt_status, "published");
  await request("GET", "work", undefined, 404);
  await request("DELETE", "work", confirmed, 404);
  const last = await request("DELETE", "second", confirmed, 200);
  assert.equal(last.attempt_status, "testing");
  assert.notEqual(last.graph_status, "realized");
  const stored = JSON.parse(await readFile(path.join(dir, "data/db.json"), "utf8"));
  const storedAuth = JSON.parse(await readFile(path.join(dir, "data/auth.json"), "utf8"));
  assert.ok(new Date(storedAuth.agentTokens.find((item) => item.tokenHash === hash("owner-token")).expiresAt).getTime() > Date.now() + 80 * 86400000);
  assert.equal(stored.ideas.find((item) => item.id === "idea").summary, "由 Agent 更新的想法");
  assert.deepEqual(stored.attempts.find((item) => item.id === "branch").workIds, []);
  assert.ok(!stored.events.some((event) => event.workId === "work"));
  assert.ok(!stored.notifications.some((item) => item.href === "/works/work"));
  assert.equal(stored.works.length, 1);
  console.log("PASS: bootstrap, rolling token renewal, idea updates, API auth, ownership, branch scope, validation, partial edits, session/CSRF checks, concurrent edits, deletion and graph cleanup.");
  if (process.argv.includes("--serve")) {
    console.log(`Disposable UI fixture: ${base}/works/ui-work (owner@work-test.example / Local-work-test-123!)`);
    console.log(`Fixture directory: ${dir}`);
    await new Promise((resolve) => { process.once("SIGINT", resolve); process.once("SIGTERM", resolve); });
  }
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => { if (child.exitCode !== null) resolve(); else child.once("exit", resolve); });
  await rm(dir, { recursive: true, force: true });
}
