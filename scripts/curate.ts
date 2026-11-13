/**
 * Local curation with Claude Code — no API key on the server.
 *
 *   npm run curate                 sync from GitHub, then score new or changed repos
 *   npm run curate -- --all        re-score every repo
 *   npm run curate -- --no-sync    skip the GitHub sync
 *   npm run curate -- --dry-run    print scores without saving
 *   npm run curate -- --model sonnet --limit 10
 *   npm run curate -- --remote https://example.com
 *
 * Reads .env.local / .env. With SHOWCASE_URL (or --remote) and ADMIN_PASSWORD it
 * reads and writes the live site through /api/owner/showcase; otherwise it uses
 * the local store (data/showcase.json, or Turso when DATA_BACKEND=turso).
 * GitHub access uses GITHUB_TOKEN or `gh auth token`.
 */
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import { fetchReadme } from "../src/lib/github.ts";
import {
  applyCurations,
  needsCuration,
  parseCurationOutput,
  type CurationResult,
} from "../src/lib/projects.ts";
import { mutateShowcase, readShowcase } from "../src/lib/store.ts";
import { syncFromGitHub } from "../src/lib/sync.ts";
import type { Project, Showcase } from "../src/lib/types.ts";

const BATCH_SIZE = 8;
const README_CHARS = 3000;
const CLAUDE_TIMEOUT_MS = 5 * 60_000;

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

function githubToken() {
  const fromEnv = process.env.GITHUB_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
}

const remote = (option("remote") ?? process.env.SHOWCASE_URL ?? "").trim().replace(/\/+$/, "");

async function ownerApi<T>(init: RequestInit & { query?: string } = {}): Promise<T> {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) throw new Error("远程模式需要 ADMIN_PASSWORD");
  const response = await fetch(`${remote}/api/owner/showcase${init.query ?? ""}`, {
    ...init,
    headers: { authorization: `Bearer ${password}`, "content-type": "application/json" },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(`${remote} 返回 ${response.status}：${body.error ?? ""}`);
  return body;
}

/** Sync (unless --no-sync) and return the showcase to curate. */
async function loadShowcase(token: string | undefined): Promise<Showcase> {
  const sync = !flag("no-sync");
  if (sync) process.stdout.write(`同步 GitHub 仓库${remote ? `（经由 ${remote}）` : ""}… `);
  if (remote) {
    const body = await ownerApi<{ showcase: Showcase; sync?: { total: number; added: number } }>({
      query: sync ? "?sync=1" : "",
    });
    if (body.sync) console.log(`${body.sync.total} 个（新增 ${body.sync.added}）`);
    return body.showcase;
  }
  if (sync) {
    const summary = await syncFromGitHub({ token });
    console.log(`${summary.total} 个（新增 ${summary.added}）`);
  }
  return readShowcase();
}

async function saveCurations(results: CurationResult[]) {
  if (remote) {
    await ownerApi({ method: "POST", body: JSON.stringify({ curations: results }) });
    return;
  }
  const curatedAt = new Date().toISOString();
  await mutateShowcase((doc) => ({ ...doc, projects: applyCurations(doc.projects, results, curatedAt), curatedAt }));
}

const SYSTEM_PROMPT = `你是一位眼光挑剔的创意策展人，正在帮一位独立开发者从自己的 GitHub 仓库里挑出最有想象力的项目。
评分（0-100）只看想象力：
- 它在意的问题是否新颖、被忽视，或者视角独特；
- 是否把不相干的领域、媒介或技术组合出新东西；
- 做法是否出人意料；
- 如果真的做成，会给谁的生活或工作带来多大不同。
不考虑完成度、代码质量、星标数和仓库大小。
教程、练习、课程作业、配置或资料备份、模板、对现成产品的直接克隆，给 30 分以下。
pitch：一句中文（不超过 30 字），说清它想做的那件有想象力的事，不要复述仓库名，不要用“一个……的项目”的句式。
reason：不超过 60 字，说明为什么给这个分数。
只输出 JSON 数组，形如 [{"repo":"owner/name","score":0,"pitch":"","reason":""}]，不要任何其他文字。`;

function describe(project: Project, readme: string) {
  const lines = [
    `## ${project.fullName}`,
    project.description && `简介：${project.description}`,
    project.language && `语言：${project.language}`,
    project.topics.length > 0 && `主题：${project.topics.join(", ")}`,
    project.homepage && `主页：${project.homepage}`,
    `创建：${project.createdAt.slice(0, 10)}，最近推送：${project.pushedAt.slice(0, 10)}`,
    "README（节选）：",
    readme.trim() ? readme.trim().slice(0, README_CHARS) : "（没有 README）",
  ];
  return lines.filter(Boolean).join("\n");
}

function askClaude(prompt: string, model?: string): Promise<string> {
  const cliArgs = [
    "-p",
    "--output-format",
    "json",
    "--system-prompt",
    SYSTEM_PROMPT,
    "--tools",
    "",
    "--no-session-persistence",
    "--disable-slash-commands",
    "--strict-mcp-config",
    ...(model ? ["--model", model] : []),
  ];
  return new Promise((resolve, reject) => {
    const child = spawn("claude", cliArgs, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("claude 超时"));
    }, CLAUDE_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`无法启动 claude（是否已安装 Claude Code？）：${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`claude 退出码 ${code}：${stderr.trim() || stdout.slice(0, 500)}`));
      try {
        const envelope = JSON.parse(stdout) as { result?: string; is_error?: boolean };
        if (envelope.is_error || typeof envelope.result !== "string") {
          return reject(new Error(`claude 返回错误：${stdout.slice(0, 500)}`));
        }
        resolve(envelope.result);
      } catch {
        reject(new Error(`无法解析 claude 输出：${stdout.slice(0, 500)}`));
      }
    });
    child.stdin.end(prompt);
  });
}

async function main() {
  const token = githubToken();
  const showcase = await loadShowcase(token);
  let candidates = showcase.projects.filter((project) => needsCuration(project, { all: flag("all") }));
  const limit = Number(option("limit"));
  if (limit > 0) candidates = candidates.slice(0, limit);
  if (candidates.length === 0) {
    console.log("没有需要评选的仓库（已评过且没有新推送）。用 --all 重新评选全部。");
    return;
  }
  console.log(`待评选 ${candidates.length} 个仓库，读取 README…`);

  const readmes = new Map<string, string>();
  for (const project of candidates) {
    try {
      readmes.set(project.id, await fetchReadme(project.fullName, { token }));
    } catch (error) {
      console.warn(`  跳过 README ${project.fullName}：${(error as Error).message}`);
      readmes.set(project.id, "");
    }
  }

  const results: CurationResult[] = [];
  const failed: string[] = [];
  for (let start = 0; start < candidates.length; start += BATCH_SIZE) {
    const batch = candidates.slice(start, start + BATCH_SIZE);
    const label = `[${start + 1}-${start + batch.length}/${candidates.length}]`;
    process.stdout.write(`${label} 评选中… `);
    const prompt = `请评估以下 ${batch.length} 个仓库：\n\n${batch
      .map((project) => describe(project, readmes.get(project.id) ?? ""))
      .join("\n\n---\n\n")}`;
    try {
      const parsed = parseCurationOutput(
        await askClaude(prompt, option("model")),
        batch.map((project) => project.fullName),
      );
      const pushedAt = new Map(batch.map((project) => [project.fullName, project.pushedAt]));
      for (const result of parsed) results.push({ ...result, basedOnPushedAt: pushedAt.get(result.repo) });
      const missing = batch.filter((project) => !parsed.some((result) => result.repo === project.fullName));
      failed.push(...missing.map((project) => project.fullName));
      console.log(`完成 ${parsed.length} 个${missing.length ? `，缺 ${missing.length} 个` : ""}`);
    } catch (error) {
      failed.push(...batch.map((project) => project.fullName));
      console.log(`失败：${(error as Error).message}`);
    }
  }

  const ranked = [...results].sort((a, b) => b.score - a.score);
  console.log("\n想象力排名：");
  for (const result of ranked) {
    console.log(`  ${String(result.score).padStart(3)}  ${result.repo}  ${result.pitch}`);
  }
  if (failed.length) console.log(`\n未评选（下次运行会重试）：${failed.join(", ")}`);

  if (flag("dry-run")) {
    console.log("\n--dry-run：未保存。");
    return;
  }
  if (results.length === 0) return;
  await saveCurations(results);
  console.log(`\n已保存 ${results.length} 个评选结果。公开页最多 10 分钟内刷新。`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
