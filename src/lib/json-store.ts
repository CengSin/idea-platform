import {
  BlobNotFoundError,
  BlobPreconditionFailedError,
  get,
  put,
} from "@vercel/blob";
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
import {
  StorePreconditionFailedError,
  readTursoAuth,
  readTursoContent,
  writeTursoAuth,
  writeTursoContent,
} from "./turso";

const dataDir = path.join(process.cwd(), "data");
const AUTH_FILE = "auth.json";
const DB_FILE = "db.json";

function useBlobStore() {
  if (dataBackend() === "mysql" || dataBackend() === "turso") return false;
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

export type JsonRecord<T> = {
  value: T | null;
  etag?: string;
};

export type WriteJsonOptions = {
  etag?: string;
  createOnly?: boolean;
};

function isNotFoundError(error: unknown) {
  if (error instanceof BlobNotFoundError) return true;
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT",
  );
}

export async function readJsonRecord<T>(name: string): Promise<JsonRecord<T>> {
  if (dataBackend() === "turso") {
    if (name === AUTH_FILE) {
      const record = await readTursoAuth();
      return { value: record.value as T | null, etag: record.etag };
    }
    if (name === DB_FILE) {
      const record = await readTursoContent();
      return { value: record.value as T | null, etag: record.etag };
    }
    throw new Error(`unsupported turso document: ${name}`);
  }

  if (dataBackend() === "mysql") {
    try {
      const dump = await fetchMysqlDump();
      if (name === AUTH_FILE) {
        return { value: (dump.auth ?? emptyAuthDump()) as T };
      }
      return { value: asDatabase(dump) as T };
    } catch (error) {
      if (error instanceof Error && /\b404\b/.test(error.message)) {
        return { value: null };
      }
      throw error;
    }
  }

  if (useBlobStore()) {
    try {
      const result = await get(name, { access: "private", useCache: false });
      if (result == null) return { value: null };
      if (result.statusCode !== 200 || !result.stream) {
        throw new Error(`${name}: unexpected blob status ${result.statusCode}`);
      }
      const text = await new Response(result.stream).text();
      if (!text.trim()) {
        throw new Error(`${name} is empty`);
      }
      return { value: JSON.parse(text) as T, etag: result.blob.etag };
    } catch (error) {
      if (error instanceof BlobNotFoundError) return { value: null };
      throw error;
    }
  }

  try {
    const raw = await fs.readFile(path.join(dataDir, name), "utf8");
    if (!raw.trim()) throw new Error(`${name} is empty`);
    return { value: JSON.parse(raw) as T };
  } catch (error) {
    if (isNotFoundError(error)) return { value: null };
    throw error;
  }
}

export async function readJsonFile<T>(name: string): Promise<T | null> {
  const record = await readJsonRecord<T>(name);
  return record.value;
}

export async function writeJsonFile(
  name: string,
  value: unknown,
  options: WriteJsonOptions = {},
) {
  if (dataBackend() === "turso") {
    if (name === AUTH_FILE) {
      await writeTursoAuth(value as AuthDump, options);
      return;
    }
    if (name === DB_FILE) {
      await writeTursoContent(value as DataDump, options);
      return;
    }
    throw new Error(`unsupported turso document: ${name}`);
  }

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
      allowOverwrite: options.createOnly ? false : true,
      ...(options.etag ? { ifMatch: options.etag } : {}),
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

export async function mutateJsonDocument<T>(
  name: string,
  load: (raw: unknown) => T,
  mutator: (value: T) => void,
): Promise<T> {
  return withStoreLock(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const record = await readJsonRecord<unknown>(name);
      const value = load(record.value);
      mutator(value);
      try {
        await writeJsonFile(
          name,
          value,
          record.value == null
            ? { createOnly: true }
            : record.etag
              ? { etag: record.etag }
              : {},
        );
        return value;
      } catch (error) {
        lastError = error;
        if (
          error instanceof BlobPreconditionFailedError ||
          error instanceof StorePreconditionFailedError
        ) {
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  });
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
