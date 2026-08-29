import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { mutateDb, readDb } from "./db";
import type { User } from "./types";

export const SESSION_COOKIE = "idea_session";
const SESSION_DAYS = 30;
const authPath = path.join(process.cwd(), "data", "auth.json");

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

type AuthDb = {
  version: 1;
  accounts: Account[];
  sessions: Session[];
  agentTokens: AgentToken[];
};

function passwordHash(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function createAccount(
  userId: string,
  email: string,
  displayName: string,
  password: string,
  createdAt = new Date().toISOString(),
): Account {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    userId,
    email: email.trim().toLowerCase(),
    displayName: displayName.trim(),
    passwordSalt: salt,
    passwordHash: passwordHash(password, salt),
    createdAt,
  };
}

function readAuthDb(): AuthDb {
  try {
    const parsed = JSON.parse(fs.readFileSync(authPath, "utf8")) as AuthDb;
    if (parsed.version === 1) {
      parsed.agentTokens ??= [];
      return parsed;
    }
  } catch {
    // Initialize the local demo account below.
  }
  const db: AuthDb = {
    version: 1,
    accounts: [],
    sessions: [],
    agentTokens: [],
  };
  writeAuthDb(db);
  return db;
}

function writeAuthDb(db: AuthDb) {
  fs.mkdirSync(path.dirname(authPath), { recursive: true });
  fs.writeFileSync(authPath, JSON.stringify(db, null, 2));
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function initials(displayName: string) {
  return Array.from(displayName.trim()).slice(0, 2).join("").toUpperCase();
}

function ensureProfile(account: Account): User {
  const existing = readDb().users.find((user) => user.id === account.userId);
  if (existing) return existing;
  const profile: User = {
    id: account.userId,
    displayName: account.displayName,
    initials: initials(account.displayName),
    accent: "#66C7C0",
    bio: "正在把值得实现的想法变成作品。",
    skills: [],
    visibility: "public",
    createdAt: account.createdAt,
  };
  mutateDb((db) => db.users.push(profile));
  return profile;
}

export function authenticate(email: string, password: string) {
  const db = readAuthDb();
  const account = db.accounts.find(
    (item) => item.email === email.trim().toLowerCase(),
  );
  if (!account) return null;
  const candidate = passwordHash(password, account.passwordSalt);
  if (!safeEqual(candidate, account.passwordHash)) return null;
  ensureProfile(account);
  return account;
}

export function registerAccount(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const db = readAuthDb();
  const email = input.email.trim().toLowerCase();
  if (db.accounts.some((item) => item.email === email)) {
    throw new Error("该邮箱已注册，请直接登录。");
  }
  const account = createAccount(
    `user_${crypto.randomBytes(6).toString("hex")}`,
    email,
    input.displayName,
    input.password,
  );
  db.accounts.push(account);
  writeAuthDb(db);
  ensureProfile(account);
  return account;
}

export function createSession(userId: string) {
  const db = readAuthDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  db.sessions = db.sessions.filter(
    (session) => new Date(session.expiresAt).getTime() > Date.now(),
  );
  db.sessions.push({
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    userId,
    expiresAt: expiresAt.toISOString(),
  });
  writeAuthDb(db);
  return { token, expiresAt };
}

export function deleteSession(token?: string) {
  if (!token) return;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const db = readAuthDb();
  db.sessions = db.sessions.filter((session) => session.tokenHash !== hash);
  writeAuthDb(db);
}

export function issueAttemptAgentToken(userId: string, attemptId: string) {
  const db = readAuthDb();
  const token = `iat_${crypto.randomBytes(32).toString("base64url")}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 86400000);
  db.agentTokens = db.agentTokens.filter(
    (item) =>
      !(item.userId === userId && item.attemptId === attemptId) &&
      new Date(item.expiresAt).getTime() > Date.now(),
  );
  db.agentTokens.push({
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    userId,
    attemptId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  writeAuthDb(db);
  return { token, expiresAt: expiresAt.toISOString() };
}

export function revokeAgentTokensForUser(userId: string) {
  const db = readAuthDb();
  db.agentTokens = db.agentTokens.filter((item) => item.userId !== userId);
  writeAuthDb(db);
}

function authenticateAgentToken(token: string, attemptId?: string) {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const db = readAuthDb();
  const grant = db.agentTokens.find(
    (item) =>
      item.tokenHash === hash &&
      (!attemptId || item.attemptId === attemptId) &&
      new Date(item.expiresAt).getTime() > Date.now(),
  );
  if (!grant) return null;
  const account = db.accounts.find((item) => item.userId === grant.userId);
  return account ? { user: ensureProfile(account), grant } : null;
}

export function getAgentRequestUser(request: Request, attemptId?: string) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authenticateAgentToken(authorization.slice(7).trim(), attemptId)?.user ?? null;
  }
  return null;
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const db = readAuthDb();
  const session = db.sessions.find(
    (item) => item.tokenHash === hash && new Date(item.expiresAt).getTime() > Date.now(),
  );
  if (!session) return null;
  const account = db.accounts.find((item) => item.userId === session.userId);
  return account ? ensureProfile(account) : null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
