import type { Attempt, Database, Idea, Work } from "./types";

export interface IdeaGrowthPath {
  attempts: Attempt[];
  works: Work[];
  derivedIdeas: Idea[];
  parentIdea?: Idea;
  sourceAttempt?: Attempt;
  sourceWork?: Work;
}

export function ideaGrowthPath(db: Database, ideaId: string): IdeaGrowthPath {
  const selectedIdea = db.ideas.find((idea) => idea.id === ideaId);
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

  const derivedIdeas = db.ideas.filter(
    (idea) =>
      idea.parentIdeaId === ideaId &&
      idea.status !== "draft" &&
      idea.status !== "archived" &&
      Boolean(idea.graph),
  );

  const parentIdea = selectedIdea?.parentIdeaId
    ? db.ideas.find(
        (idea) =>
          idea.id === selectedIdea.parentIdeaId &&
          idea.status !== "draft" &&
          idea.status !== "archived",
      )
    : undefined;
  const sourceWork = selectedIdea?.sourceWorkId
    ? db.works.find(
        (work) => work.id === selectedIdea.sourceWorkId && work.status === "published",
      )
    : undefined;
  const sourceAttempt = sourceWork
    ? db.attempts.find(
        (attempt) =>
          attempt.id === sourceWork.attemptId &&
          attempt.featuredOnGraph &&
          Boolean(attempt.graph),
      )
    : undefined;

  return { attempts, works, derivedIdeas, parentIdea, sourceAttempt, sourceWork };
}
