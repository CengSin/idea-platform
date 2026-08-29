import { readDb } from "./db";
import { requireCurrentUser } from "./auth";
import {
  attemptById,
  ideaById,
  ideaMetrics,
  userById,
  workById,
} from "./format";

export async function getSnapshot() {
  const me = await requireCurrentUser();
  const db = readDb();
  return {
    db,
    me,
    currentUserId: me.id,
  };
}

export async function getIdeaBundle(id: string) {
  const me = await requireCurrentUser();
  const db = readDb();
  const idea = ideaById(db, id);
  if (!idea) return null;
  const attempts = db.attempts
    .filter((a) => a.ideaId === id)
    .sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
  const works = db.works.filter((w) => w.ideaId === id && w.status === "published");
  const forks = db.ideas.filter((i) => i.parentIdeaId === id);
  const similar = db.ideas.filter(
    (i) =>
      i.id !== id &&
      i.parentIdeaId !== id &&
      i.status !== "draft" &&
      i.tags.some((t) => idea.tags.includes(t)),
  );
  const author = userById(db, idea.author.userId);
  const following = db.follows.some(
    (f) => f.userId === me.id && f.ideaId === id,
  );
  const myAttempt = attempts.find(
    (a) => a.ownerId === me.id && a.status !== "abandoned",
  );
  return {
    db,
    idea,
    attempts,
    works,
    forks,
    similar,
    author,
    metrics: ideaMetrics(db, id),
    following,
    myAttempt,
    me,
    currentUserId: me.id,
  };
}

export async function getAttemptBundle(id: string) {
  const me = await requireCurrentUser();
  const db = readDb();
  const attempt = attemptById(db, id);
  if (!attempt) return null;
  return {
    db,
    attempt,
    idea: ideaById(db, attempt.ideaId)!,
    owner: userById(db, attempt.ownerId)!,
    works: db.works.filter((w) => w.attemptId === id),
    me,
    currentUserId: me.id,
  };
}

export async function getWorkBundle(id: string) {
  await requireCurrentUser();
  const db = readDb();
  const work = workById(db, id);
  if (!work) return null;
  return {
    db,
    work,
    idea: ideaById(db, work.ideaId)!,
    attempt: attemptById(db, work.attemptId)!,
    forks: db.ideas.filter((i) => i.sourceWorkId === id),
  };
}
