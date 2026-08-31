import "server-only";

import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseAuthDump } from "./data-backend";
import { mutateDb, readDb, readDbForRender } from "./db";
import { mutateJsonDocument, readJsonFile } from "./json-store";
import type { User } from "./types";

export const SESSION_COOKIE = "idea_session";
const SESSION_DAYS = 30;
const AUTH_FILE = "auth.json";

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

function asAuthDb(raw: unknown): AuthDb {
  return parseAuthDump(raw) as AuthDb;
}

async function readAuthDb(): Promise<AuthDb> {
  const parsed = await readJsonFile<AuthDb>(AUTH_FILE);
  return asAuthDb(parsed);
}

async function mutateAuthDb(mutator: (db: AuthDb) => void): Promise<AuthDb> {
  return mutateJsonDocument(AUTH_FILE, asAuthDb, mutator);
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function initials(displayName: string) {
  return Array.from(displayName.trim()).slice(0, 2).join("").toUpperCase();
}

async function ensureProfile(account: Account): Promise<User> {
  const existing = (await readDb()).users.find((user) => user.id === account.userId);
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
    projectLinks: [],
  };
  await mutateDb((db) => db.users.push(profile));
  return profile;
}

export async function authenticate(email: string, password: string) {
  const db = await readAuthDb();
  const account = db.accounts.find(
    (item) => item.email === email.trim().toLowerCase(),
  );
  if (!account) return null;
  const candidate = passwordHash(password, account.passwordSalt);
  if (!safeEqual(candidate, account.passwordHash)) return null;
  await ensureProfile(account);
  return account;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const email = input.email.trim().toLowerCase();
  let account: Account | undefined;
  await mutateAuthDb((db) => {
    if (db.accounts.some((item) => item.email === email)) {
      throw new Error("该邮箱已注册，请直接登录。");
    }
    account = createAccount(
      `user_${crypto.randomBytes(6).toString("hex")}`,
      email,
      input.displayName,
      input.password,
    );
    db.accounts.push(account);
  });
  if (!account) throw new Error("注册失败，请稍后重试。");
  await ensureProfile(account);
  return account;
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await mutateAuthDb((db) => {
    db.sessions = db.sessions.filter(
      (session) => new Date(session.expiresAt).getTime() > Date.now(),
    );
    db.sessions.push({
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      userId,
      expiresAt: expiresAt.toISOString(),
    });
  });
  return { token, expiresAt };
}

export async function deleteSession(token?: string) {
  if (!token) return;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  await mutateAuthDb((db) => {
    db.sessions = db.sessions.filter((session) => session.tokenHash !== hash);
  });
}

export async function issueAttemptAgentToken(userId: string, attemptId: string) {
  const token = `iat_${crypto.randomBytes(32).toString("base64url")}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 86400000);
  await mutateAuthDb((db) => {
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
  });
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function revokeAgentTokensForUser(userId: string) {
  await mutateAuthDb((db) => {
    db.agentTokens = db.agentTokens.filter((item) => item.userId !== userId);
  });
}

async function authenticateAgentToken(token: string, attemptId?: string) {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const db = await readAuthDb();
  const grant = db.agentTokens.find(
    (item) =>
      item.tokenHash === hash &&
      (!attemptId || item.attemptId === attemptId) &&
      new Date(item.expiresAt).getTime() > Date.now(),
  );
  if (!grant) return null;
  const account = db.accounts.find((item) => item.userId === grant.userId);
  return account ? { user: await ensureProfile(account), grant } : null;
}

export async function getAgentRequestUser(request: Request, attemptId?: string) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return (await authenticateAgentToken(authorization.slice(7).trim(), attemptId))?.user ?? null;
  }
  return null;
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const db = await readAuthDb();
  const session = db.sessions.find(
    (item) => item.tokenHash === hash && new Date(item.expiresAt).getTime() > Date.now(),
  );
  if (!session) return null;
  const account = db.accounts.find((item) => item.userId === session.userId);
  if (!account) return null;
  const profile = (await readDbForRender()).users.find((user) => user.id === account.userId);
  return profile ?? ensureProfile(account);
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getAccountPublic(userId: string) {
  const db = await readAuthDb();
  const account = db.accounts.find((item) => item.userId === userId);
  if (!account) return null;
  return {
    userId: account.userId,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
  };
}
