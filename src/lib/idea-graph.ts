import type { Attempt, Database, Idea, Work } from "./types";

export interface IdeaGrowthPath {
  attempts: Attempt[];
  works: Work[];
  derivedIdeas: Idea[];
  parentIdea?: Idea;
  sourceAttempt?: Attempt;
  sourceWork?: Work;
}

export function ideasWithAncestors(ideas: Idea[], matches: Idea[]) {
  const byId = new Map(ideas.map((idea) => [idea.id, idea]));
  const included = new Set(matches.map((idea) => idea.id));
  for (const match of matches) {
    let parentId = match.parentIdeaId;
    const seen = new Set<string>();
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) break;
      included.add(parent.id);
      parentId = parent.parentIdeaId;
    }
  }
  return ideas.filter((idea) => included.has(idea.id));
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
