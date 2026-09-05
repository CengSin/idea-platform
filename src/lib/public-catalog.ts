import type { Database } from "./types";

const visibleStatuses = new Set(["published", "evolving", "realized", "dormant", "deprecated"]);

function publicUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

// This allowlist is the only content passed into the unauthenticated UI.
// Never pass a Database, account, execution prompt or private relation to it.
export function buildPublicCatalog(db: Database) {
  return db.ideas
    .filter((idea) => idea.visibility === "public" && visibleStatuses.has(idea.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((idea) => {
      const attempts = db.attempts.filter((attempt) =>
        attempt.ideaId === idea.id && attempt.visibility === "public" && attempt.status !== "abandoned",
      );
      const attemptIds = new Set(attempts.map((attempt) => attempt.id));
      const works = db.works
        .filter((work) => work.ideaId === idea.id && work.status === "published" && attemptIds.has(work.attemptId))
        .map((work) => ({
          title: work.title,
          summary: work.summary,
          type: work.type,
          coverUrl: work.coverUrl?.startsWith("/covers/") ? work.coverUrl : publicUrl(work.coverUrl),
          externalUrl: publicUrl(work.externalUrl),
        }));
      const author = db.users.find((user) => user.id === idea.author.userId);
      return {
        id: idea.id,
        title: idea.title,
        status: idea.status,
        summary: idea.summary,
        problem: idea.problem,
        whyItMatters: idea.whyItMatters,
        constraints: idea.constraints,
        openQuestions: idea.openQuestions,
        desiredOutputs: idea.desiredOutputs,
        tags: idea.tags,
        authorName: author?.visibility === "public" ? author.displayName : "社区创作者",
        authorId: author?.visibility === "public" ? author.id : undefined,
        authorBio: author?.visibility === "public" ? author.bio : undefined,
        attemptCount: attempts.length,
        works,
      };
    });
}

export type PublicIdea = ReturnType<typeof buildPublicCatalog>[number];
