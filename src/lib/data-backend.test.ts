import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyAuthDump,
  parseAuthDump,
  parseDatabaseDump,
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
