import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dir = await fs.mkdtemp(path.join(os.tmpdir(), "showcase-store-"));
process.env.SHOWCASE_DATA_DIR = dir;
delete process.env.DATA_BACKEND;
const { mutateShowcase, readShowcase, storeBackend } = await import("./store.ts");

test("backend selection fails closed in production", () => {
  assert.equal(storeBackend({}), "file");
  assert.equal(storeBackend({ DATA_BACKEND: "turso" }), "turso");
  assert.throws(() => storeBackend({ VERCEL_ENV: "production" }));
  assert.throws(() => storeBackend({ DATA_BACKEND: "blob" }));
});

test("file store starts empty and serialises concurrent mutations", async () => {
  assert.deepEqual(await readShowcase(), { version: 1, projects: [] });
  await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      mutateShowcase((doc) => ({ ...doc, syncedAt: `${Number(doc.syncedAt ?? 0) + 1}`, curatedAt: String(i) })),
    ),
  );
  assert.equal((await readShowcase()).syncedAt, "5");
  await fs.rm(dir, { recursive: true, force: true });
});
