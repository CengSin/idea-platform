import assert from "node:assert/strict";
import test from "node:test";
import { adminEmails, isAdminEmail } from "./admin-access.ts";

test("admin allowlist accepts normalized comma, semicolon and newline separated emails", () => {
  const raw = " Admin@Example.com,owner@example.com; third@example.com\nfourth@example.com ";
  assert.deepEqual(adminEmails(raw), [
    "admin@example.com",
    "owner@example.com",
    "third@example.com",
    "fourth@example.com",
  ]);
  assert.equal(isAdminEmail("ADMIN@example.com", raw), true);
  assert.equal(isAdminEmail("visitor@example.com", raw), false);
});

test("an empty allowlist grants no admin access", () => {
  assert.equal(isAdminEmail("admin@example.com", ""), false);
});
