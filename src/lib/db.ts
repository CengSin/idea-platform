import { parseDatabaseDump } from "./data-backend";
import { createSeed } from "./seed";
import { recomputeIdeaStatus } from "./format";
import { mutateJsonDocument, readJsonFile, writeJsonFile } from "./json-store";
import type { Database } from "./types";

const DB_FILE = "db.json";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeDb(db: Database) {
  for (const user of db.users) {
    user.projectLinks ??= [];
  }
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

function loadDatabase(raw: unknown): Database {
  const parsed = parseDatabaseDump(raw);
  return clone(normalizeDb(parsed ?? createSeed()));
}

export async function readDb(): Promise<Database> {
  const parsed = await readJsonFile<Database>(DB_FILE);
  return loadDatabase(parsed);
}

export async function writeDb(db: Database) {
  const snapshot = clone(normalizeDb(db));
  await writeJsonFile(DB_FILE, snapshot);
}

export async function mutateDb(mutator: (db: Database) => void): Promise<Database> {
  const db = await mutateJsonDocument(DB_FILE, loadDatabase, mutator);
  return clone(db);
}

export async function resetDb(): Promise<Database> {
  const seed = createSeed();
  await writeDb(seed);
  return clone(seed);
}
