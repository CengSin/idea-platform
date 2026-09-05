import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

test("built-in Codex adapter uses workspace sandbox and returns the final structured report", async () => {
  const dir = await mkdtemp(join(tmpdir(), "idea-codex-mock-"));
  try {
    await writeFile(join(dir, "codex"), `#!${process.execPath}\nconst fs=require('node:fs');const args=process.argv.slice(2);if(args[0]!=='exec'||args[args.indexOf('--sandbox')+1]!=='workspace-write'||args.some(a=>a.includes('bypass')))process.exit(2);process.stdin.resume();process.stdin.on('end',()=>fs.writeFileSync(args[args.indexOf('--output-last-message')+1],JSON.stringify({report:'适配器测试完成'})));`, { mode: 0o700 });
    const child = spawn(process.execPath, [fileURLToPath(new URL("./codex-execution-handler.mjs", import.meta.url))], { env: { ...process.env, PATH: `${dir}:${process.env.PATH}` }, stdio: ["pipe", "pipe", "pipe"] });
    let output = ""; child.stdout.on("data", data => output += data); child.stderr.resume();
    const done = new Promise((resolve, reject) => { child.once("error", reject); child.once("close", code => code === 0 ? resolve() : reject(new Error(`handler exited ${code}`))); });
    child.stdin.end(JSON.stringify({ run: { instruction: "测试适配器", acceptance: [], stopConditions: [] }, context: {}, bootstrap: {} }));
    await done;
    assert.deepEqual(JSON.parse(output), { report: "适配器测试完成" });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
