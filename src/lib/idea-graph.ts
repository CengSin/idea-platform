import type { Attempt, Database, Work } from "./types";

export interface IdeaGrowthPath {
  attempts: Attempt[];
  works: Work[];
}

export function ideaGrowthPath(db: Database, ideaId: string): IdeaGrowthPath {
  const attempts = db.attempts.filter(
    (attempt) => attempt.ideaId === ideaId && attempt.featuredOnGraph && attempt.graph,
  );
  const attemptIds = new Set(attempts.map((attempt) => attempt.id));

  const works = db.works.filter(
    (work) =>
      work.ideaId === ideaId &&
      work.status === "published" &&
      work.graph &&
      attemptIds.has(work.attemptId),
  );

  return { attempts, works };
}
