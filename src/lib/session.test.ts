import assert from "node:assert/strict";
import test from "node:test";
import { checkPassword, issueSession, verifySession } from "./session.ts";

const env = { ADMIN_PASSWORD: "correct horse" };

test("password check", () => {
  assert.equal(checkPassword("correct horse", env), true);
  assert.equal(checkPassword("wrong", env), false);
  assert.equal(checkPassword("", {}), false);
});

test("sessions verify, expire, and die when the password changes", () => {
  const now = Date.now();
  const { value } = issueSession(env, now);
  assert.equal(verifySession(value, env, now + 1000), true);
  assert.equal(verifySession(value, env, now + 31 * 86_400_000), false);
  assert.equal(verifySession(value, { ADMIN_PASSWORD: "new" }, now), false);
  assert.equal(verifySession(value.replace("owner.", "owner.9"), env, now), false);
  assert.equal(verifySession(undefined, env), false);
  assert.equal(verifySession(value, {}, now), false);
});

test("an explicit SESSION_SECRET survives password changes", () => {
  const withSecret = { ...env, SESSION_SECRET: "s" };
  const { value } = issueSession(withSecret);
  assert.equal(verifySession(value, { ADMIN_PASSWORD: "new", SESSION_SECRET: "s" }), true);
});
