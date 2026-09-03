import type { Database } from "./types";

export function createSeed(): Database {
  return {
    version: 3,
    users: [],
    ideas: [],
    attempts: [],
    works: [],
    events: [],
    notifications: [],
    follows: [],
    agentConfig: {},
  };
}
