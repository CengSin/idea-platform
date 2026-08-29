import type { Database } from "./types";

export type DataBackend = "vercel" | "mysql";

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
  return value === "mysql" ? "mysql" : "vercel";
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
  };
}
