import { createSeed } from "./seed";
import { recomputeIdeaStatus } from "./format";
import { readJsonFile, withStoreLock, writeJsonFile } from "./json-store";
import type { Database } from "./types";

const VERSION = 3;
const DB_FILE = "db.json";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeDb(db: Database) {
  for (const idea of db.ideas) {
    idea.status = recomputeIdeaStatus(idea, db);
    const activityTimes = [
      idea.updatedAt,
      ...db.attempts
        .filter((attempt) => attempt.ideaId === idea.id)
        .map((attempt) => attempt.lastActiveAt),
      ...db.works
        .filter((work) => work.ideaId === idea.id && work.publishedAt)
        .map((work) => work.publishedAt!),
    ];
    idea.updatedAt = activityTimes.reduce((latest, at) =>
      at > latest ? at : latest,
    );
  }
  return db;
}

export async function readDb(): Promise<Database> {
  try {
    const parsed = await readJsonFile<Database>(DB_FILE);
    if (parsed?.version === VERSION) {
      return clone(normalizeDb(parsed));
    }
  } catch {
    // fall through to seed
  }
  const seed = createSeed();
  await writeDb(seed);
  return clone(seed);
}

export async function writeDb(db: Database) {
  const snapshot = clone(normalizeDb(db));
  await writeJsonFile(DB_FILE, snapshot);
}

export async function mutateDb(mutator: (db: Database) => void): Promise<Database> {
  return withStoreLock(async () => {
    const db = await readDb();
    mutator(db);
    await writeDb(db);
    return clone(db);
  });
}

export async function resetDb(): Promise<Database> {
  const seed = createSeed();
  await writeDb(seed);
  return clone(seed);
}
