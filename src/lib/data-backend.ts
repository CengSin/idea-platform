import type { Database } from "./types";

export type DataBackend = "vercel" | "mysql" | "turso";

export type AuthDump = {
  version: 1;
  accounts: unknown[];
  sessions: unknown[];
  agentTokens: unknown[];
};

export type DataDump = Database & {
  auth?: AuthDump;
};

export function dataBackend(): DataBackend {
  const value = (process.env.DATA_BACKEND ?? "vercel").trim().toLowerCase();
  if (value === "mysql") return "mysql";
  if (value === "turso") return "turso";
  return "vercel";
}

export function mysqlApiUrl() {
  return (process.env.MYSQL_API_URL ?? "http://127.0.0.1:8081").replace(/\/$/, "");
}

export function dataExportToken() {
  return (process.env.DATA_EXPORT_TOKEN ?? process.env.ADMIN_TOKEN ?? "").trim();
}

export function emptyAuthDump(): AuthDump {
  return { version: 1, accounts: [], sessions: [], agentTokens: [] };
}

export function asDatabase(dump: DataDump): Database {
  return {
    version: dump.version ?? 3,
    users: dump.users ?? [],
    ideas: dump.ideas ?? [],
    attempts: dump.attempts ?? [],
    works: dump.works ?? [],
    events: dump.events ?? [],
    notifications: dump.notifications ?? [],
    follows: dump.follows ?? [],
    agentConfig: dump.agentConfig ?? {},
  };
}

export function parseAuthDump(raw: unknown): AuthDump {
  if (raw == null) return emptyAuthDump();
  if (typeof raw !== "object") throw new Error("auth.json is not an object");
  const parsed = raw as Partial<AuthDump>;
  if (parsed.version !== 1) {
    throw new Error(`unsupported auth.json version: ${String(parsed.version)}`);
  }
  return {
    version: 1,
    accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    agentTokens: Array.isArray(parsed.agentTokens) ? parsed.agentTokens : [],
  };
}

export function parseDatabaseDump(raw: unknown): Database | null {
  if (raw == null) return null;
  if (typeof raw !== "object") throw new Error("db.json is not an object");
  const parsed = raw as Partial<DataDump>;
  if (parsed.version !== 3) {
    throw new Error(`unsupported db.json version: ${String(parsed.version)}`);
  }
  return asDatabase(parsed as DataDump);
}
