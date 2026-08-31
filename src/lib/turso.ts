import { createClient, type Client, type InStatement, type Row } from "@libsql/client";
import { asDatabase, emptyAuthDump, type AuthDump, type DataDump } from "./data-backend.ts";
import type {
  Attempt,
  Database,
  Follow,
  Idea,
  Notification,
  User,
  Work,
  ActivityEvent,
} from "./types.ts";

const CONTENT_REVISION_KEY = "content_revision";
const AUTH_REVISION_KEY = "auth_revision";

export class StorePreconditionFailedError extends Error {
  constructor(message = "store revision conflict") {
    super(message);
    this.name = "StorePreconditionFailedError";
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS store_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  accent TEXT NOT NULL,
  bio TEXT NOT NULL,
  skills TEXT NOT NULL,
  visibility TEXT NOT NULL,
  created_at TEXT NOT NULL,
  project_links TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  problem TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  constraints TEXT NOT NULL,
  existing_attempts TEXT NOT NULL,
  open_questions TEXT NOT NULL,
  desired_outputs TEXT NOT NULL,
  tags TEXT NOT NULL,
  author TEXT NOT NULL,
  license TEXT NOT NULL,
  visibility TEXT NOT NULL,
  status TEXT NOT NULL,
  parent_idea_id TEXT,
  source_work_id TEXT,
  graph TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  approach TEXT NOT NULL,
  project_description TEXT,
  project_purpose TEXT,
  execution_prompt TEXT,
  status TEXT NOT NULL,
  progress_note TEXT NOT NULL,
  visibility TEXT NOT NULL,
  blockers TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  target_date TEXT,
  work_ids TEXT NOT NULL,
  graph TEXT,
  featured_on_graph INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  idea_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  type TEXT NOT NULL,
  cover_url TEXT NOT NULL,
  external_url TEXT,
  repository_url TEXT,
  status TEXT NOT NULL,
  credits TEXT NOT NULL,
  license TEXT NOT NULL,
  published_at TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  citations INTEGER NOT NULL DEFAULT 0,
  graph TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  text TEXT NOT NULL,
  idea_id TEXT,
  attempt_id TEXT,
  work_id TEXT
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  href TEXT NOT NULL,
  kind TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS follows (
  user_id TEXT NOT NULL,
  idea_id TEXT NOT NULL,
  PRIMARY KEY (user_id, idea_id)
);
CREATE TABLE IF NOT EXISTS accounts (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agent_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
`;

let client: Client | null = null;
let schemaReady = false;

function tursoConfig() {
  const rawUrl = (process.env.TURSO_DATABASE_URL ?? "").trim();
  const authToken = (process.env.TURSO_AUTH_TOKEN ?? "").trim();
  if (!rawUrl || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required when DATA_BACKEND=turso");
  }
  const url = rawUrl.startsWith("libsql://")
    ? `https://${rawUrl.slice("libsql://".length)}`
    : rawUrl;
  return { url, authToken };
}

export function tursoClient(): Client {
  if (!client) {
    client = createClient(tursoConfig());
  }
  return client;
}

async function ensureSchema() {
  if (schemaReady) return;
  await tursoClient().executeMultiple(SCHEMA);
  schemaReady = true;
}

function jsonText(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function str(value: unknown, fallback = ""): string {
  return value == null ? fallback : String(value);
}

function optStr(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  return String(value);
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

type Account = {
  userId: string;
  email: string;
  displayName: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
};

type Session = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
};

type AgentToken = {
  tokenHash: string;
  userId: string;
  attemptId: string;
  createdAt: string;
  expiresAt: string;
};

function decodeUser(row: Row): User {
  return {
    id: str(row.id),
    displayName: str(row.display_name),
    initials: str(row.initials),
    accent: str(row.accent),
    bio: str(row.bio),
    skills: parseJson(row.skills, []),
    visibility: str(row.visibility, "public") as User["visibility"],
    createdAt: str(row.created_at),
    projectLinks: parseJson(row.project_links, []),
  };
}

function decodeIdea(row: Row): Idea {
  const idea: Idea = {
    id: str(row.id),
    title: str(row.title),
    summary: str(row.summary),
    problem: str(row.problem),
    whyItMatters: str(row.why_it_matters),
    constraints: parseJson(row.constraints, []),
    existingAttempts: parseJson(row.existing_attempts, []),
    openQuestions: parseJson(row.open_questions, []),
    desiredOutputs: parseJson(row.desired_outputs, []),
    tags: parseJson(row.tags, []),
    author: parseJson(row.author, { kind: "user", userId: "", displayName: "" }),
    license: parseJson(row.license, {
      implementation: true,
      derivatives: true,
      commercialUse: "with_attribution",
    }),
    visibility: str(row.visibility, "public") as Idea["visibility"],
    status: str(row.status, "published") as Idea["status"],
    graph: parseJson(row.graph, { x: 0, y: 0 }),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
  const parentIdeaId = optStr(row.parent_idea_id);
  const sourceWorkId = optStr(row.source_work_id);
  if (parentIdeaId) idea.parentIdeaId = parentIdeaId;
  if (sourceWorkId) idea.sourceWorkId = sourceWorkId;
  return idea;
}

function decodeAttempt(row: Row): Attempt {
  const attempt: Attempt = {
    id: str(row.id),
    ideaId: str(row.idea_id),
    ownerId: str(row.owner_id),
    title: str(row.title),
    approach: str(row.approach),
    status: str(row.status) as Attempt["status"],
    progressNote: str(row.progress_note),
    visibility: str(row.visibility, "public") as Attempt["visibility"],
    blockers: parseJson(row.blockers, []),
    startedAt: str(row.started_at),
    lastActiveAt: str(row.last_active_at),
    createdAt: str(row.created_at),
    workIds: parseJson(row.work_ids, []),
  };
  const projectDescription = optStr(row.project_description);
  const projectPurpose = optStr(row.project_purpose);
  const executionPrompt = optStr(row.execution_prompt);
  const targetDate = optStr(row.target_date);
  if (projectDescription) attempt.projectDescription = projectDescription;
  if (projectPurpose) attempt.projectPurpose = projectPurpose;
  if (executionPrompt) attempt.executionPrompt = executionPrompt;
  if (targetDate) attempt.targetDate = targetDate;
  const graph = parseJson<Attempt["graph"] | null>(row.graph, null);
  if (graph) attempt.graph = graph;
  if (num(row.featured_on_graph) === 1) attempt.featuredOnGraph = true;
  return attempt;
}

function decodeWork(row: Row): Work {
  const work: Work = {
    id: str(row.id),
    attemptId: str(row.attempt_id),
    ideaId: str(row.idea_id),
    title: str(row.title),
    summary: str(row.summary),
    type: str(row.type) as Work["type"],
    coverUrl: str(row.cover_url),
    status: str(row.status) as Work["status"],
    credits: parseJson(row.credits, []),
    license: parseJson(row.license, {
      implementation: true,
      derivatives: true,
      commercialUse: "with_attribution",
    }),
    views: num(row.views),
    saves: num(row.saves),
    citations: num(row.citations),
  };
  const externalUrl = optStr(row.external_url);
  const repositoryUrl = optStr(row.repository_url);
  const publishedAt = optStr(row.published_at);
  if (externalUrl) work.externalUrl = externalUrl;
  if (repositoryUrl) work.repositoryUrl = repositoryUrl;
  if (publishedAt) work.publishedAt = publishedAt;
  const graph = parseJson<Work["graph"] | null>(row.graph, null);
  if (graph) work.graph = graph;
  return work;
}

function decodeEvent(row: Row): ActivityEvent {
  const event: ActivityEvent = {
    id: str(row.id),
    at: str(row.at),
    actorId: str(row.actor_id),
    actorName: str(row.actor_name),
    text: str(row.text),
  };
  const ideaId = optStr(row.idea_id);
  const attemptId = optStr(row.attempt_id);
  const workId = optStr(row.work_id);
  if (ideaId) event.ideaId = ideaId;
  if (attemptId) event.attemptId = attemptId;
  if (workId) event.workId = workId;
  return event;
}

function decodeNotification(row: Row): Notification {
  return {
    id: str(row.id),
    at: str(row.at),
    title: str(row.title),
    body: str(row.body),
    read: num(row.is_read) === 1,
    href: str(row.href),
    kind: str(row.kind) as Notification["kind"],
  };
}

function decodeFollow(row: Row): Follow {
  return { userId: str(row.user_id), ideaId: str(row.idea_id) };
}

function decodeAccount(row: Row): Account {
  return {
    userId: str(row.user_id),
    email: str(row.email),
    displayName: str(row.display_name),
    passwordSalt: str(row.password_salt),
    passwordHash: str(row.password_hash),
    createdAt: str(row.created_at),
  };
}

export function databaseFromRows(input: {
  users: Row[];
  ideas: Row[];
  attempts: Row[];
  works: Row[];
  events: Row[];
  notifications: Row[];
  follows: Row[];
}): Database {
  return asDatabase({
    version: 3,
    users: input.users.map(decodeUser),
    ideas: input.ideas.map(decodeIdea),
    attempts: input.attempts.map(decodeAttempt),
    works: input.works.map(decodeWork),
    events: input.events.map(decodeEvent),
    notifications: input.notifications.map(decodeNotification),
    follows: input.follows.map(decodeFollow),
  });
}

export function authFromRows(input: {
  accounts: Row[];
  sessions: Row[];
  agentTokens: Row[];
}): AuthDump {
  return {
    version: 1,
    accounts: input.accounts.map(decodeAccount),
    sessions: input.sessions.map((row) => ({
      tokenHash: str(row.token_hash),
      userId: str(row.user_id),
      expiresAt: str(row.expires_at),
    })),
    agentTokens: input.agentTokens.map((row) => ({
      tokenHash: str(row.token_hash),
      userId: str(row.user_id),
      attemptId: str(row.attempt_id),
      createdAt: str(row.created_at),
      expiresAt: str(row.expires_at),
    })),
  };
}

function contentInserts(db: Database): InStatement[] {
  const stmts: InStatement[] = [
    "DELETE FROM users",
    "DELETE FROM ideas",
    "DELETE FROM attempts",
    "DELETE FROM works",
    "DELETE FROM events",
    "DELETE FROM notifications",
    "DELETE FROM follows",
  ];
  for (const user of db.users) {
    stmts.push({
      sql: `INSERT INTO users (id, display_name, initials, accent, bio, skills, visibility, created_at, project_links)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        user.id,
        user.displayName,
        user.initials,
        user.accent,
        user.bio,
        jsonText(user.skills ?? []),
        user.visibility,
        user.createdAt,
        jsonText(user.projectLinks ?? []),
      ],
    });
  }
  for (const idea of db.ideas) {
    stmts.push({
      sql: `INSERT INTO ideas (id, title, summary, problem, why_it_matters, constraints, existing_attempts,
            open_questions, desired_outputs, tags, author, license, visibility, status, parent_idea_id,
            source_work_id, graph, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        idea.id,
        idea.title,
        idea.summary,
        idea.problem,
        idea.whyItMatters,
        jsonText(idea.constraints ?? []),
        jsonText(idea.existingAttempts ?? []),
        jsonText(idea.openQuestions ?? []),
        jsonText(idea.desiredOutputs ?? []),
        jsonText(idea.tags ?? []),
        jsonText(idea.author),
        jsonText(idea.license),
        idea.visibility,
        idea.status,
        idea.parentIdeaId ?? null,
        idea.sourceWorkId ?? null,
        jsonText(idea.graph),
        idea.createdAt,
        idea.updatedAt,
      ],
    });
  }
  for (const attempt of db.attempts) {
    stmts.push({
      sql: `INSERT INTO attempts (id, idea_id, owner_id, title, approach, project_description, project_purpose,
            execution_prompt, status, progress_note, visibility, blockers, started_at, last_active_at,
            created_at, target_date, work_ids, graph, featured_on_graph)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        attempt.id,
        attempt.ideaId,
        attempt.ownerId,
        attempt.title,
        attempt.approach,
        attempt.projectDescription ?? null,
        attempt.projectPurpose ?? null,
        attempt.executionPrompt ?? null,
        attempt.status,
        attempt.progressNote,
        attempt.visibility,
        jsonText(attempt.blockers ?? []),
        attempt.startedAt,
        attempt.lastActiveAt,
        attempt.createdAt,
        attempt.targetDate ?? null,
        jsonText(attempt.workIds ?? []),
        attempt.graph ? jsonText(attempt.graph) : null,
        attempt.featuredOnGraph ? 1 : 0,
      ],
    });
  }
  for (const work of db.works) {
    stmts.push({
      sql: `INSERT INTO works (id, attempt_id, idea_id, title, summary, type, cover_url, external_url,
            repository_url, status, credits, license, published_at, views, saves, citations, graph)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        work.id,
        work.attemptId,
        work.ideaId,
        work.title,
        work.summary,
        work.type,
        work.coverUrl,
        work.externalUrl ?? null,
        work.repositoryUrl ?? null,
        work.status,
        jsonText(work.credits ?? []),
        jsonText(work.license),
        work.publishedAt ?? null,
        work.views,
        work.saves,
        work.citations,
        work.graph ? jsonText(work.graph) : null,
      ],
    });
  }
  for (const event of db.events) {
    stmts.push({
      sql: `INSERT INTO events (id, at, actor_id, actor_name, text, idea_id, attempt_id, work_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        event.id,
        event.at,
        event.actorId,
        event.actorName,
        event.text,
        event.ideaId ?? null,
        event.attemptId ?? null,
        event.workId ?? null,
      ],
    });
  }
  for (const notification of db.notifications) {
    stmts.push({
      sql: `INSERT INTO notifications (id, at, title, body, is_read, href, kind)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        notification.id,
        notification.at,
        notification.title,
        notification.body,
        notification.read ? 1 : 0,
        notification.href,
        notification.kind,
      ],
    });
  }
  for (const follow of db.follows) {
    stmts.push({
      sql: `INSERT INTO follows (user_id, idea_id) VALUES (?, ?)`,
      args: [follow.userId, follow.ideaId],
    });
  }
  return stmts;
}

function authInserts(auth: AuthDump): InStatement[] {
  const stmts: InStatement[] = [
    "DELETE FROM accounts",
    "DELETE FROM sessions",
    "DELETE FROM agent_tokens",
  ];
  for (const raw of auth.accounts) {
    const account = raw as Account;
    stmts.push({
      sql: `INSERT INTO accounts (user_id, email, display_name, password_salt, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        account.userId,
        account.email,
        account.displayName,
        account.passwordSalt,
        account.passwordHash,
        account.createdAt,
      ],
    });
  }
  for (const raw of auth.sessions) {
    const session = raw as Session;
    stmts.push({
      sql: `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
      args: [session.tokenHash, session.userId, session.expiresAt],
    });
  }
  for (const raw of auth.agentTokens) {
    const token = raw as AgentToken;
    stmts.push({
      sql: `INSERT INTO agent_tokens (token_hash, user_id, attempt_id, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [token.tokenHash, token.userId, token.attemptId, token.createdAt, token.expiresAt],
    });
  }
  return stmts;
}

async function readRevision(key: string): Promise<string | null> {
  const result = await tursoClient().execute({
    sql: "SELECT value FROM store_meta WHERE key = ?",
    args: [key],
  });
  const value = result.rows[0]?.value;
  return value == null ? null : String(value);
}

async function writeRevisioned(
  key: string,
  statements: InStatement[],
  options: { etag?: string; createOnly?: boolean },
): Promise<string> {
  await ensureSchema();
  const db = tursoClient();
  const tx = await db.transaction("write");
  try {
    const current = await tx.execute({
      sql: "SELECT value FROM store_meta WHERE key = ?",
      args: [key],
    });
    const revision = current.rows[0]?.value == null ? null : String(current.rows[0].value);
    if (options.createOnly && revision != null) {
      throw new StorePreconditionFailedError(`${key} already exists`);
    }
    if (options.etag && revision !== options.etag) {
      throw new StorePreconditionFailedError(`${key} revision mismatch`);
    }
    const next = revision == null ? "1" : String(Number(revision) + 1);
    await tx.batch([
      ...statements,
      {
        sql: `INSERT INTO store_meta (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        args: [key, next],
      },
    ]);
    await tx.commit();
    return next;
  } catch (error) {
    if (!tx.closed) await tx.rollback();
    throw error;
  }
}

export async function readTursoContent(): Promise<{ value: DataDump | null; etag?: string }> {
  await ensureSchema();
  const revision = await readRevision(CONTENT_REVISION_KEY);
  if (revision == null) return { value: null };
  const db = tursoClient();
  const [users, ideas, attempts, works, events, notifications, follows] = await Promise.all([
    db.execute("SELECT * FROM users"),
    db.execute("SELECT * FROM ideas"),
    db.execute("SELECT * FROM attempts"),
    db.execute("SELECT * FROM works"),
    db.execute("SELECT * FROM events ORDER BY at DESC"),
    db.execute("SELECT * FROM notifications"),
    db.execute("SELECT * FROM follows"),
  ]);
  return {
    value: databaseFromRows({
      users: users.rows,
      ideas: ideas.rows,
      attempts: attempts.rows,
      works: works.rows,
      events: events.rows,
      notifications: notifications.rows,
      follows: follows.rows,
    }),
    etag: revision,
  };
}

export async function readTursoAuth(): Promise<{ value: AuthDump | null; etag?: string }> {
  await ensureSchema();
  const revision = await readRevision(AUTH_REVISION_KEY);
  if (revision == null) return { value: null };
  const db = tursoClient();
  const [accounts, sessions, agentTokens] = await Promise.all([
    db.execute("SELECT * FROM accounts"),
    db.execute("SELECT * FROM sessions"),
    db.execute("SELECT * FROM agent_tokens"),
  ]);
  return {
    value: authFromRows({
      accounts: accounts.rows,
      sessions: sessions.rows,
      agentTokens: agentTokens.rows,
    }) ?? emptyAuthDump(),
    etag: revision,
  };
}

export async function writeTursoContent(
  dump: DataDump,
  options: { etag?: string; createOnly?: boolean } = {},
) {
  await writeRevisioned(CONTENT_REVISION_KEY, contentInserts(asDatabase(dump)), options);
}

export async function writeTursoAuth(
  auth: AuthDump,
  options: { etag?: string; createOnly?: boolean } = {},
) {
  await writeRevisioned(AUTH_REVISION_KEY, authInserts(auth), options);
}
