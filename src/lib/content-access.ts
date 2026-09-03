import type { Database, Idea, Work } from "./types";

export function isIdeaOwner(idea: Idea, userId: string) {
  return idea.author.userId === userId;
}

export function canAccessIdea(idea: Idea, userId?: string) {
  return idea.status !== "draft" || Boolean(userId && isIdeaOwner(idea, userId));
}

export function workForViewer(db: Database, work: Work, userId?: string): Work {
  const attempt = db.attempts.find((item) => item.id === work.attemptId);
  if (userId && attempt?.ownerId === userId) return work;
  const { iteration: _privateIteration, ...visibleWork } = work;
  return visibleWork;
}

/**
 * Drafts are a publication boundary for the complete idea tree. A draft's
 * attempts, works and activity may exist and keep changing, but are only
 * included in the author's request-scoped snapshot until the idea is published.
 */
export function scopeDatabaseForUser(db: Database, userId: string): Database {
  const { agentConfig: _privateAgentConfig, ...visibleDb } = db;
  const ideas = db.ideas.filter((idea) => canAccessIdea(idea, userId));
  const ideaIds = new Set(ideas.map((idea) => idea.id));
  const attempts = db.attempts.filter((attempt) => ideaIds.has(attempt.ideaId));
  const attemptIds = new Set(attempts.map((attempt) => attempt.id));
  const works = db.works
    .filter((work) => ideaIds.has(work.ideaId) && attemptIds.has(work.attemptId))
    .map((work) => workForViewer(db, work, userId));
  const workIds = new Set(works.map((work) => work.id));

  return {
    ...visibleDb,
    ideas,
    attempts,
    works,
    events: db.events.filter(
      (event) =>
        (!event.ideaId || ideaIds.has(event.ideaId)) &&
        (!event.attemptId || attemptIds.has(event.attemptId)) &&
        (!event.workId || workIds.has(event.workId)),
    ),
    notifications: db.notifications.filter(
      (notification) => !notification.userId || notification.userId === userId,
    ),
    follows: db.follows.filter(
      (follow) => follow.userId === userId && ideaIds.has(follow.ideaId),
    ),
  };
}
