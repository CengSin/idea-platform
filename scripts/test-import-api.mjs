import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, scryptSync } from "node:crypto";
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = await mkdtemp(path.join(os.tmpdir(), "idea-import-api-"));
const port = Number(process.env.IMPORT_TEST_PORT || 3139);
const base = `http://127.0.0.1:${port}`;
const at = new Date().toISOString();
const expiresAt = new Date(Date.now() + 86400000).toISOString();
const hash = (value) => createHash("sha256").update(value).digest("hex");
const ids = ["owner", "other", "third"];
const users = ids.map((id) => ({ id, displayName: id, initials: id.slice(0, 1).toUpperCase(), accent: "#66C7C0", bio: "", skills: [], visibility: "public", createdAt: at, projectLinks: [] }));
const database = { version: 3, users, ideas: [], attempts: [], works: [], events: [], notifications: [], follows: [] };
const auth = {
  version: 1,
  accounts: ids.map((id) => ({ userId: id, displayName: id, email: `${id}@import-test.example`, passwordSalt: "import-test-salt", passwordHash: scryptSync("Local-import-test-123!", "import-test-salt", 64).toString("hex"), createdAt: at })),
  sessions: ids.map((id) => ({ tokenHash: hash(`${id}-session`), userId: id, expiresAt })),
  agentTokens: [{ tokenHash: hash("agent-token"), userId: "owner", attemptId: "none", createdAt: at, expiresAt }],
};
await Promise.all(["src", "public", "package.json", "tsconfig.json", "next.config.ts", "next-env.d.ts", "postcss.config.mjs"].map((name) => cp(path.join(root, name), path.join(dir, name), { recursive: true })));
await symlink(path.join(root, "node_modules"), path.join(dir, "node_modules"), "dir");
await mkdir(path.join(dir, "data"));
await writeFile(path.join(dir, "data/db.json"), JSON.stringify(database));
await writeFile(path.join(dir, "data/auth.json"), JSON.stringify(auth));
const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: dir, env: { ...process.env, DATA_BACKEND: "vercel", VERCEL: "", BLOB_READ_WRITE_TOKEN: "", NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_SITE_URL: base }, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
child.stdout.on("data", (data) => { logs += data; });
child.stderr.on("data", (data) => { logs += data; });

async function request(pathname, method, body, expected, session, token) {
  const response = await fetch(`${base}${pathname}`, { method, headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(session ? { Cookie: `idea_session=${session}-session`, Origin: base } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const payload = await response.json();
  assert.equal(response.status, expected, `${method} ${pathname}: ${JSON.stringify(payload)}`);
  return payload;
}

try {
  const deadline = Date.now() + 60000;
  for (;;) {
    try {
      const probe = await fetch(`${base}/api/v1/ideas`);
      if (!probe.ok || child.exitCode !== null) throw new Error("Test server unavailable");
      break;
    } catch {
      if (Date.now() > deadline || child.exitCode !== null) throw new Error(`Test server unavailable: ${logs}`);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  const data = { url: "https://8.8.8.8/site", coverUrl: "https://8.8.8.8/cover.png", title: "Imported Site", summary: "A site already online", problem: "A problem the site solves", ownsWebsite: true, userConfirmed: true, collaborationOpen: false, originalPublishedAt: "2025-01-01" };
  await request("/api/v1/works/import", "POST", data, 401);
  await request("/api/v1/works/import/preview", "POST", { url: data.url }, 401, "owner", "agent-token");
  await request("/api/v1/works/import", "POST", { ...data, url: "http://127.0.0.1" }, 400, "owner");
  await request("/api/v1/works/import", "POST", { ...data, userConfirmed: false }, 400, "owner");
  await request("/api/v1/works/import/preview", "POST", { url: "http://127.0.0.1" }, 400, "owner");
  const preview = await request("/api/v1/works/import/preview", "POST", { url: data.url }, 200, "owner");
  assert.equal(preview.preview.url, data.url);
  assert.equal(typeof preview.preview.fetched, "boolean");
  const imported = await request("/api/v1/works/import", "POST", data, 201, "owner");
  assert.equal(imported.url, `/explore/${imported.idea_id}#work-${imported.work_id}`);
  const duplicate = await request("/api/v1/works/import", "POST", { ...data, url: "https://8.8.8.8/site#fragment" }, 409, "owner");
  assert.equal(duplicate.existing_url, imported.url);
  const stored = JSON.parse(await readFile(path.join(dir, "data/db.json"), "utf8"));
  assert.equal(stored.ideas.length, 1);
  assert.equal(stored.attempts.length, 1);
  assert.equal(stored.works.length, 1);
  assert.equal(stored.works[0].origin, "imported_web");
  assert.equal(stored.works[0].collaborationOpen, false);
  await request("/api/v1/attempts", "POST", { idea_id: imported.idea_id, title: "other branch", user_confirmed: true }, 400, "other");
  await request(`/api/v1/works/${imported.work_id}/collaboration`, "PATCH", { collaboration_open: true }, 401, "owner", "agent-token");
  await request(`/api/v1/works/${imported.work_id}/collaboration`, "PATCH", { collaboration_open: true }, 403, "other");
  await request(`/api/v1/works/${imported.work_id}/collaboration`, "PATCH", { collaboration_open: true }, 200, "owner");
  await request("/api/v1/attempts", "POST", { idea_id: imported.idea_id, title: "other branch", user_confirmed: true }, 200, "other");
  await request(`/api/v1/works/${imported.work_id}/collaboration`, "PATCH", { collaboration_open: false }, 200, "owner");
  await request("/api/v1/attempts", "POST", { idea_id: imported.idea_id, title: "third branch", user_confirmed: true }, 400, "third");
  const after = JSON.parse(await readFile(path.join(dir, "data/db.json"), "utf8"));
  assert.equal(after.attempts.length, 2);
  const publicPage = await fetch(`${base}/explore/${imported.idea_id}`);
  const html = await publicPage.text();
  assert.equal(publicPage.status, 200);
  assert.ok(html.includes("已有作品入驻"));
  const portfolio = await fetch(`${base}/works?user=owner`);
  assert.equal(portfolio.status, 200);
  assert.ok((await portfolio.text()).includes("Imported Site"));
  const creatorPage = await fetch(`${base}/explore/people/owner`);
  assert.equal(creatorPage.status, 200);
  assert.ok((await creatorPage.text()).includes("已有作品入驻"));
  console.log("PASS: import auth, validation, duplicate, atomic records, owner-only collaboration, server-side adoption gate and public page.");
  if (process.argv.includes("--serve")) {
    console.log(`Disposable UI fixture: ${base}/works/import (owner@import-test.example / Local-import-test-123!)`);
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
