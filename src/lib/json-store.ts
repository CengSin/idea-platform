import { BlobNotFoundError, get, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";
import {
  asDatabase,
  dataBackend,
  dataExportToken,
  emptyAuthDump,
  mysqlApiUrl,
  type AuthDump,
  type DataDump,
} from "./data-backend";

const dataDir = path.join(process.cwd(), "data");
const AUTH_FILE = "auth.json";
const DB_FILE = "db.json";

function useBlobStore() {
  if (dataBackend() === "mysql") return false;
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) || process.env.VERCEL === "1";
}

let queue: Promise<unknown> = Promise.resolve();

export function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

let mysqlDumpCache: { at: number; dump: DataDump } | null = null;

function adminHeaders(json = false): HeadersInit {
  const token = dataExportToken();
  if (!token) {
    throw new Error("DATA_EXPORT_TOKEN is required when DATA_BACKEND=mysql");
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function fetchMysqlDump(): Promise<DataDump> {
  const now = Date.now();
  if (mysqlDumpCache && now - mysqlDumpCache.at < 1000) {
    return mysqlDumpCache.dump;
  }
  const response = await fetch(`${mysqlApiUrl()}/api/v1/admin/export`, {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`mysql export failed (${response.status}): ${text}`);
  }
  const dump = (await response.json()) as DataDump;
  mysqlDumpCache = { at: now, dump };
  return dump;
}

async function importMysql(body: DataDump | { auth: AuthDump }) {
  mysqlDumpCache = null;
  const response = await fetch(`${mysqlApiUrl()}/api/v1/admin/import`, {
    method: "PUT",
    headers: adminHeaders(true),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`mysql import failed (${response.status}): ${text}`);
  }
}

export async function readJsonFile<T>(name: string): Promise<T | null> {
  if (dataBackend() === "mysql") {
    try {
      const dump = await fetchMysqlDump();
      if (name === AUTH_FILE) {
        return (dump.auth ?? emptyAuthDump()) as T;
      }
      return asDatabase(dump) as T;
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) return null;
      throw error;
    }
  }

  if (useBlobStore()) {
    try {
      const result = await get(name, { access: "private", useCache: false });
      if (result?.statusCode !== 200) return null;
      const text = await new Response(result.stream).text();
      if (!text) return null;
      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    }
  }

  try {
    const raw = await fs.readFile(path.join(dataDir, name), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonFile(name: string, value: unknown) {
  if (dataBackend() === "mysql") {
    if (name === AUTH_FILE) {
      await importMysql({ auth: value as AuthDump });
      return;
    }
    if (name === DB_FILE) {
      await importMysql(value as DataDump);
      return;
    }
    throw new Error(`unsupported mysql document: ${name}`);
  }

  const payload = JSON.stringify(value, null, 2);
  if (useBlobStore()) {
    await put(name, payload, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
    });
    return;
  }

  await fs.mkdir(dataDir, { recursive: true });
  const target = path.join(dataDir, name);
  const temporaryPath = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, payload);
  await fs.rename(temporaryPath, target);
}

export async function exportDataDump(): Promise<DataDump> {
  const db = (await readJsonFile<DataDump>(DB_FILE)) ?? {
    version: 3,
    users: [],
    ideas: [],
    attempts: [],
    works: [],
    events: [],
    notifications: [],
    follows: [],
  };
  const auth = (await readJsonFile<AuthDump>(AUTH_FILE)) ?? emptyAuthDump();
  return { ...asDatabase(db), auth };
}
