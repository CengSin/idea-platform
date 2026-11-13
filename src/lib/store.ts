import fs from "node:fs/promises";
import path from "node:path";
import { emptyShowcase } from "./projects.ts";
import type { Showcase } from "./types.ts";

/**
 * The whole showcase is one small JSON document (~1 KB per repo).
 * Local development keeps it in data/showcase.json; production keeps it in a
 * single Turso row guarded by a revision number so a cron sync and an edit in
 * the admin page cannot overwrite each other.
 */

const DOC_KEY = "showcase";
const MAX_RETRIES = 4;

export class StoreConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreConfigError";
  }
}

export type StoreBackend = "file" | "turso";

export function storeBackend(env: NodeJS.ProcessEnv = process.env): StoreBackend {
  const value = (env.DATA_BACKEND ?? "").trim().toLowerCase();
  if (env.VERCEL_ENV === "production" && value !== "turso") {
    // Fail closed: a serverless filesystem would silently lose every write.
    throw new StoreConfigError('生产环境必须设置 DATA_BACKEND=turso');
  }
  if (value === "turso") return "turso";
  if (value === "" || value === "file" || value === "local") return "file";
  throw new StoreConfigError(`无法识别的 DATA_BACKEND：${value}`);
}

function normalize(raw: unknown): Showcase {
  if (raw == null) return emptyShowcase();
  if (typeof raw !== "object") throw new Error("showcase 数据不是对象");
  const doc = raw as Partial<Showcase>;
  if (doc.version !== 1) throw new Error(`不支持的 showcase 版本：${String(doc.version)}`);
  return {
    version: 1,
    owner: doc.owner,
    projects: (doc.projects ?? []).map((project) => ({
      ...project,
      topics: project.topics ?? [],
      pinned: project.pinned ?? false,
      hidden: project.hidden ?? false,
      tagline: project.tagline ?? "",
      note: project.note ?? "",
    })),
    syncedAt: doc.syncedAt,
    curatedAt: doc.curatedAt,
  };
}

interface Versioned {
  doc: Showcase;
  revision: number;
}

interface Backend {
  read(): Promise<Versioned>;
  /** Returns false when the stored revision moved on since `expected`. */
  write(doc: Showcase, expected: number): Promise<boolean>;
}

// ---------- file ----------

function dataDir() {
  return process.env.SHOWCASE_DATA_DIR || path.join(process.cwd(), "data");
}

let fileLock: Promise<unknown> = Promise.resolve();

const fileBackend: Backend = {
  async read() {
    try {
      const text = await fs.readFile(path.join(dataDir(), "showcase.json"), "utf8");
      const parsed = JSON.parse(text) as { revision?: number; doc?: unknown };
      return { doc: normalize(parsed.doc), revision: parsed.revision ?? 0 };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { doc: emptyShowcase(), revision: 0 };
      throw error;
    }
  },
  async write(doc, expected) {
    const current = await fileBackend.read();
    if (current.revision !== expected) return false;
    await fs.mkdir(dataDir(), { recursive: true });
    const file = path.join(dataDir(), "showcase.json");
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ revision: expected + 1, doc }, null, 2));
    await fs.rename(tmp, file);
    return true;
  },
};

// ---------- turso ----------

type LibsqlClient = import("@libsql/client").Client;
let tursoClient: Promise<LibsqlClient> | null = null;

function tursoConfig() {
  const rawUrl = (process.env.TURSO_DATABASE_URL ?? "").trim();
  const authToken = (process.env.TURSO_AUTH_TOKEN ?? "").trim();
  if (!rawUrl || !authToken) {
    throw new StoreConfigError("DATA_BACKEND=turso 需要 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN");
  }
  if (!/^(libsql|https?|wss?):/i.test(rawUrl)) {
    throw new StoreConfigError("TURSO_DATABASE_URL 不是 libsql:// 或 https:// 地址");
  }
  const url = rawUrl.startsWith("libsql://") ? `https://${rawUrl.slice("libsql://".length)}` : rawUrl;
  return { url, authToken };
}

function turso(): Promise<LibsqlClient> {
  tursoClient ??= (async () => {
    const { createClient } = await import("@libsql/client");
    const db = createClient(tursoConfig());
    // A new table: tables left over from the old idea platform are not touched.
    await db.execute(`CREATE TABLE IF NOT EXISTS showcase_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      revision INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    return db;
  })().catch((error) => {
    tursoClient = null;
    throw error;
  });
  return tursoClient;
}

const tursoBackend: Backend = {
  async read() {
    const db = await turso();
    const result = await db.execute({
      sql: "SELECT value, revision FROM showcase_store WHERE key = ?",
      args: [DOC_KEY],
    });
    const row = result.rows[0];
    if (!row) return { doc: emptyShowcase(), revision: 0 };
    return { doc: normalize(JSON.parse(String(row.value))), revision: Number(row.revision) };
  },
  async write(doc, expected) {
    const db = await turso();
    const now = new Date().toISOString();
    const value = JSON.stringify(doc);
    const result =
      expected === 0
        ? await db.execute({
            sql: "INSERT INTO showcase_store (key, value, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(key) DO NOTHING",
            args: [DOC_KEY, value, now],
          })
        : await db.execute({
            sql: "UPDATE showcase_store SET value = ?, revision = revision + 1, updated_at = ? WHERE key = ? AND revision = ?",
            args: [value, now, DOC_KEY, expected],
          });
    return result.rowsAffected === 1;
  },
};

function backend(): Backend {
  return storeBackend() === "turso" ? tursoBackend : fileBackend;
}

export async function readShowcase(): Promise<Showcase> {
  return (await backend().read()).doc;
}

/** Read-modify-write with optimistic concurrency; the mutator may run more than once. */
export async function mutateShowcase(mutator: (doc: Showcase) => Showcase): Promise<Showcase> {
  const store = backend();
  const run = async () => {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      const { doc, revision } = await store.read();
      const next = mutator(structuredClone(doc));
      if (await store.write(next, revision)) return next;
    }
    throw new Error("数据正在被其他操作修改，请重试");
  };
  if (store !== fileBackend) return run();
  const result = fileLock.then(run, run);
  fileLock = result.catch(() => undefined);
  return result;
}
