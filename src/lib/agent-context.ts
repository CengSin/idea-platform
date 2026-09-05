import type { Database, Idea } from "./types";

/** Return only a readable source, never a token/prompt or someone else's private project. */
export function sourceContext(db: Database, idea: Idea, userId?: string) {
  const parent = db.ideas.find(i => i.id === idea.parentIdeaId);
  const readable = parent && (parent.author.userId === userId || (parent.visibility === "public" && parent.status !== "draft"));
  if (!readable) return null;
  const work = db.works.find(w => w.id === idea.sourceWorkId && w.ideaId === parent.id);
  const owner = db.attempts.find(a => a.id === work?.attemptId);
  const workReadable = work && owner && (owner.ownerId === userId || (owner.visibility === "public" && work.status === "published"));
  return {
    idea: { id: parent.id, title: parent.title, problem: parent.problem, expected: parent.summary, constraints: parent.constraints },
    work: workReadable ? { id: work.id, title: work.title, summary: work.summary, external_url: work.externalUrl, repository_url: work.repositoryUrl } : null,
  };
}
