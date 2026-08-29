import { BlobNotFoundError, get, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");

function useBlobStore() {
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

export async function readJsonFile<T>(name: string): Promise<T | null> {
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
