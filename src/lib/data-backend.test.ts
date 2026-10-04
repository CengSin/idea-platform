import assert from "node:assert/strict";
import test from "node:test";
import {
  DataBackendConfigError,
  dataBackend,
  emptyAuthDump,
  parseAuthDump,
  parseDatabaseDump,
  useRemoteBlobStore,
} from "./data-backend.ts";

test("parseAuthDump returns empty dump for missing files instead of implying a write", () => {
  assert.deepEqual(parseAuthDump(null), emptyAuthDump());
  assert.deepEqual(parseAuthDump(undefined), emptyAuthDump());
});

test("parseAuthDump rejects an unsupported version instead of replacing it", () => {
  assert.throws(
    () => parseAuthDump({ version: 2, accounts: [{ email: "keep-me@example.com" }] }),
    /unsupported auth.json version: 2/,
  );
});

test("parseAuthDump fills optional collections on a valid document", () => {
  const parsed = parseAuthDump({
    version: 1,
    accounts: [{ email: "cengsin2021@163.com" }],
  });
  assert.equal(parsed.version, 1);
  assert.equal(parsed.accounts.length, 1);
  assert.deepEqual(parsed.sessions, []);
  assert.deepEqual(parsed.agentTokens, []);
});

test("parseDatabaseDump returns null for a missing file", () => {
  assert.equal(parseDatabaseDump(null), null);
});

test("parseDatabaseDump rejects an unsupported version instead of seeding over it", () => {
  assert.throws(
    () => parseDatabaseDump({ version: 2, users: [{ id: "user_keep" }] }),
    /unsupported db.json version: 2/,
  );
});

test("local next dev does not write Vercel Blob when a leftover token is present", () => {
  const previous = {
    DATA_BACKEND: process.env.DATA_BACKEND,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  };
  const restore = () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  try {
    process.env.DATA_BACKEND = "vercel";
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL;
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    assert.equal(useRemoteBlobStore(), false);
    process.env.VERCEL = "1";
    assert.equal(useRemoteBlobStore(), true);
    delete process.env.VERCEL;
    process.env.DATA_BACKEND = "turso";
    assert.equal(useRemoteBlobStore(), false);
  } finally {
    restore();
  }
});

test("parseDatabaseDump preserves private agent configuration", () => {
  const parsed = parseDatabaseDump({
    version: 3,
    users: [],
    ideas: [],
    attempts: [],
    works: [],
    events: [],
    notifications: [],
    follows: [],
    agentConfig: { openaiBaseUrl: "https://api.example.com/v1", openaiApiKey: "sk-private" },
  });
  assert.equal(parsed?.agentConfig?.openaiApiKey, "sk-private");
});

test("JSON database round trip retains imported website metadata and accepts legacy records", () => {
  const old = { version: 3, users: [], ideas: [{ id: "old-idea" }], attempts: [], works: [{ id: "old-work" }], events: [], notifications: [], follows: [] };
  const legacy = parseDatabaseDump(JSON.parse(JSON.stringify(old)));
  assert.equal(legacy?.ideas[0]?.importedWorkId, undefined);
  assert.equal(legacy?.works[0]?.origin, undefined);
  const modern = structuredClone(old);
  Object.assign(modern.ideas[0], { importedWorkId: "imported-work" });
  Object.assign(modern.works[0], { origin: "imported_web", originalPublishedAt: "2025-01-01", collaborationOpen: false });
  const restored = parseDatabaseDump(JSON.parse(JSON.stringify(modern)));
  assert.equal(restored?.ideas[0]?.importedWorkId, "imported-work");
  assert.equal(restored?.works[0]?.originalPublishedAt, "2025-01-01");
  assert.equal(restored?.works[0]?.collaborationOpen, false);
});

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) previous[key] = process.env[key];
  try {
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("production refuses to fall back to Blob when DATA_BACKEND is missing", () => {
  withEnv({ VERCEL_ENV: "production", DATA_BACKEND: undefined }, () => {
    assert.throws(() => dataBackend(), DataBackendConfigError);
  });
});

test("production refuses an encrypted-looking DATA_BACKEND instead of silently using Blob", () => {
  withEnv({ VERCEL_ENV: "production", DATA_BACKEND: "eyJ2IjoidjIiLCJjIjoi" }, () => {
    assert.throws(() => dataBackend(), /must be "turso" in production/);
  });
  withEnv({ VERCEL_ENV: "production", DATA_BACKEND: "vercel" }, () => {
    assert.throws(() => dataBackend(), DataBackendConfigError);
  });
});

test("production accepts turso regardless of case and whitespace", () => {
  withEnv({ VERCEL_ENV: "production", DATA_BACKEND: "  Turso " }, () => {
    assert.equal(dataBackend(), "turso");
  });
});

test("outside production an unknown value is an error, an empty value means local/blob", () => {
  withEnv({ VERCEL_ENV: "preview", DATA_BACKEND: "eyJ2IjoidjIi" }, () => {
    assert.throws(() => dataBackend(), DataBackendConfigError);
  });
  withEnv({ VERCEL_ENV: undefined, DATA_BACKEND: undefined }, () => {
    assert.equal(dataBackend(), "vercel");
  });
  withEnv({ VERCEL_ENV: "preview", DATA_BACKEND: "turso" }, () => {
    assert.equal(dataBackend(), "turso");
  });
});
