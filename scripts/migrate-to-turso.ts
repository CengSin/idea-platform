import fs from "node:fs";
import path from "node:path";
import { get } from "@vercel/blob";
import { readTursoAuth, readTursoContent, writeTursoAuth, writeTursoContent } from "../src/lib/turso.ts";
import type { AuthDump, DataDump } from "../src/lib/data-backend.ts";

function loadEnvFile(file: string) {
  const full = path.resolve(file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFile(".env.local");

async function readBlobJson<T>(name: string): Promise<T> {
  const result = await get(name, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`${name}: unexpected blob status ${result?.statusCode}`);
  }
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as T;
}

const db = await readBlobJson<DataDump>("db.json");
const auth = await readBlobJson<AuthDump>("auth.json");

await writeTursoContent(db);
await writeTursoAuth(auth);

const storedDb = await readTursoContent();
const storedAuth = await readTursoAuth();
const accounts = storedAuth.value?.accounts ?? [];

console.log(
  JSON.stringify(
    {
      ok: true,
      users: storedDb.value?.users.length ?? 0,
      ideas: storedDb.value?.ideas.length ?? 0,
      attempts: storedDb.value?.attempts.length ?? 0,
      works: storedDb.value?.works.length ?? 0,
      events: storedDb.value?.events.length ?? 0,
      notifications: storedDb.value?.notifications.length ?? 0,
      follows: storedDb.value?.follows.length ?? 0,
      accounts: accounts.length,
      emails: accounts.map((item) => (item as { email?: string }).email),
      userIds: accounts.map((item) => (item as { userId?: string }).userId),
    },
    null,
    2,
  ),
);
