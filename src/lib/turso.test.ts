import assert from "node:assert/strict";
import test from "node:test";
import type { Row } from "@libsql/client";
import { authFromRows, databaseFromRows } from "./turso.ts";

function row(values: Record<string, unknown>): Row {
  return values as unknown as Row;
}

test("databaseFromRows restores nested JSON and optional fields", () => {
  const db = databaseFromRows({
    users: [
      row({
        id: "user_38c0e310a872",
        display_name: "cengsin",
        initials: "CE",
        accent: "#66C7C0",
        bio: "bio",
        skills: '["go"]',
        visibility: "public",
        created_at: "2026-08-29T05:00:12.365Z",
        project_links: "[]",
      }),
    ],
    ideas: [
      row({
        id: "idea_1",
        title: "t",
        summary: "s",
        problem: "p",
        why_it_matters: "w",
        constraints: "[]",
        existing_attempts: "[]",
        open_questions: "[]",
        desired_outputs: "[]",
        tags: '["a"]',
        author: '{"kind":"user","userId":"user_38c0e310a872","displayName":"cengsin"}',
        license: '{"implementation":true,"derivatives":true,"commercialUse":"with_attribution"}',
        visibility: "public",
        status: "evolving",
        parent_idea_id: null,
        source_work_id: null,
        graph: '{"x":1,"y":2}',
        created_at: "2026-08-29T05:01:48.985Z",
        updated_at: "2026-08-29T05:01:48.985Z",
      }),
    ],
    attempts: [
      row({
        id: "att_1",
        idea_id: "idea_1",
        owner_id: "user_38c0e310a872",
        title: "branch",
        approach: "",
        project_description: "desc",
        status: "published",
        progress_note: "note",
        visibility: "public",
        blockers: "[]",
        started_at: "2026-08-29T05:03:15.421Z",
        last_active_at: "2026-08-29T05:03:15.421Z",
        created_at: "2026-08-29T05:03:15.421Z",
        work_ids: '["work_1"]',
        graph: '{"x":3,"y":4}',
        featured_on_graph: 1,
      }),
    ],
    works: [
      row({
        id: "work_1",
        attempt_id: "att_1",
        idea_id: "idea_1",
        title: "Idea Platform",
        summary: "done",
        type: "website",
        cover_url: "/covers/hushcity.jpg",
        status: "published",
        credits: "[]",
        license: '{"implementation":true,"derivatives":true,"commercialUse":"with_attribution"}',
        views: 0,
        saves: 0,
        citations: 0,
        iteration: '{"status":"open","suggestions":[],"scannedAt":"2026-09-03T00:00:00.000Z","email":{"status":"pending"}}',
      }),
    ],
    events: [],
    notifications: [
      row({
        id: "n1",
        user_id: "user_38c0e310a872",
        at: "2026-08-29T05:03:15.421Z",
        title: "hello",
        body: "body",
        is_read: 1,
        href: "/",
        kind: "attempt",
      }),
    ],
    follows: [row({ user_id: "user_38c0e310a872", idea_id: "idea_1" })],
    agentConfig: [row({
      id: 1,
      openai_base_url: "https://api.example.com/v1",
      openai_api_key: "sk-private",
      cron_secret: "cron-private",
      resend_api_key: "re_private",
      email_from: "Agent <agent@example.com>",
    })],
  });

  assert.equal(db.users[0]?.displayName, "cengsin");
  assert.deepEqual(db.users[0]?.skills, ["go"]);
  assert.equal(db.ideas[0]?.author.userId, "user_38c0e310a872");
  assert.equal(db.attempts[0]?.featuredOnGraph, true);
  assert.equal(db.attempts[0]?.projectDescription, "desc");
  assert.equal(db.notifications[0]?.read, true);
  assert.equal(db.notifications[0]?.userId, "user_38c0e310a872");
  assert.equal(db.works[0]?.iteration?.email.status, "pending");
  assert.deepEqual(db.follows[0], { userId: "user_38c0e310a872", ideaId: "idea_1" });
  assert.equal(db.agentConfig?.openaiBaseUrl, "https://api.example.com/v1");
  assert.equal(db.agentConfig?.cronSecret, "cron-private");
});

test("authFromRows restores the login account", () => {
  const auth = authFromRows({
    accounts: [
      row({
        user_id: "user_38c0e310a872",
        email: "cengsin2021@163.com",
        display_name: "cengsin",
        password_salt: "salt",
        password_hash: "hash",
        created_at: "2026-08-29T05:00:12.365Z",
      }),
    ],
    sessions: [],
    agentTokens: [],
  });
  assert.equal(auth.version, 1);
  assert.equal((auth.accounts[0] as { email: string }).email, "cengsin2021@163.com");
  assert.equal((auth.accounts[0] as { userId: string }).userId, "user_38c0e310a872");
});
