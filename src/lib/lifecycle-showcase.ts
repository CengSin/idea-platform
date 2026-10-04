/**
 * Pick which public ideas the homepage lifecycle card should showcase first.
 *
 * The card is meant to show the whole loop: idea -> someone takes it on -> a work ships
 * -> the work grows a next idea. Ideas that complete more of that loop rank higher, so
 * the default case is never one stuck at "nobody has taken this on yet" while a fuller
 * example exists.
 */
export type ShowcaseIdea = {
  id: string;
  updatedAt: string;
  attemptCount?: number;
  participants?: unknown[];
  works: { id: string }[];
  source?: { workId: string };
};

export type LifecycleStage = "idea" | "attempt" | "work" | "next_idea";

export function derivedIdeaCount<T extends ShowcaseIdea>(idea: T, all: T[]) {
  const workIds = new Set(idea.works.map((work) => work.id));
  if (workIds.size === 0) return 0;
  return all.filter((other) => other.source && workIds.has(other.source.workId)).length;
}

export function lifecycleStage<T extends ShowcaseIdea>(idea: T, all: T[]): LifecycleStage {
  if (derivedIdeaCount(idea, all) > 0) return "next_idea";
  if (idea.works.length > 0) return "work";
  if ((idea.attemptCount ?? idea.participants?.length ?? 0) > 0) return "attempt";
  return "idea";
}

const stageWeight: Record<LifecycleStage, number> = { idea: 0, attempt: 1, work: 2, next_idea: 3 };

export function rankLifecycleShowcase<T extends ShowcaseIdea>(ideas: T[]): T[] {
  const scored = ideas.map((idea, index) => ({
    idea,
    index,
    stage: stageWeight[lifecycleStage(idea, ideas)],
    derived: derivedIdeaCount(idea, ideas),
    works: idea.works.length,
    participants: idea.attemptCount ?? idea.participants?.length ?? 0,
    isRoot: idea.source ? 0 : 1,
  }));
  scored.sort(
    (a, b) =>
      b.stage - a.stage ||
      b.derived - a.derived ||
      b.works - a.works ||
      b.participants - a.participants ||
      b.isRoot - a.isRoot ||
      b.idea.updatedAt.localeCompare(a.idea.updatedAt) ||
      a.index - b.index,
  );
  return scored.map((item) => item.idea);
}
