import fs from "node:fs";
import path from "node:path";
import { createSeed } from "./seed";
import { recomputeIdeaStatus } from "./format";
import type { Database } from "./types";

const VERSION = 3;
const dbPath = path.join(process.cwd(), "data", "db.json");

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

export function readDb(): Database {
  try {
    if (fs.existsSync(dbPath)) {
      const parsed = JSON.parse(fs.readFileSync(dbPath, "utf8")) as Database;
      if (parsed.version === VERSION) {
        return clone(normalizeDb(parsed));
      }
    }
  } catch {
    // fall through to seed
  }
  const seed = createSeed();
  writeDb(seed);
  return clone(seed);
}

export function writeDb(db: Database) {
  const snapshot = clone(normalizeDb(db));
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const temporaryPath = `${dbPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(snapshot, null, 2));
  fs.renameSync(temporaryPath, dbPath);
}

export function mutateDb(mutator: (db: Database) => void): Database {
  const db = readDb();
  mutator(db);
  writeDb(db);
  return clone(db);
}

export function resetDb(): Database {
  const seed = createSeed();
  writeDb(seed);
  return clone(seed);
}
