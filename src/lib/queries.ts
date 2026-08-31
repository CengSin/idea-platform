import { cache } from "react";
import { readDbForRender } from "./db";
import { getAccountPublic, requireCurrentUser } from "./auth";
import {
  attemptById,
  ideaById,
  ideaMetrics,
  userById,
  workById,
} from "./format";
// Covers are resolved when a work is published; page reads never fetch external sites.
export const getSnapshot = cache(async () => {
  const me = await requireCurrentUser();
  const db = await readDbForRender();
  return {
    db,
    me,
    currentUserId: me.id,
  };
});

export async function getIdeaBundle(id: string) {
  const { me, db } = await getSnapshot();
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
  const { me, db } = await getSnapshot();
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

export async function getProfile() {
  const { me, db } = await getSnapshot();
  const account = await getAccountPublic(me.id);
  const myAttemptIds = new Set(
    db.attempts.filter((attempt) => attempt.ownerId === me.id).map((attempt) => attempt.id),
  );
  const ideas = db.ideas
    .filter((idea) => idea.author.userId === me.id && idea.status !== "draft")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const attempts = db.attempts
    .filter((attempt) => attempt.ownerId === me.id && attempt.status !== "abandoned")
    .sort((a, b) => (a.lastActiveAt < b.lastActiveAt ? 1 : -1));
  const works = db.works
    .filter(
      (work) =>
        work.status === "published" &&
        (myAttemptIds.has(work.attemptId) ||
          work.credits.some((credit) => credit.userId === me.id)),
    )
    .sort((a, b) => ((a.publishedAt ?? "") < (b.publishedAt ?? "") ? 1 : -1));
  const profile = db.users.find((user) => user.id === me.id) ?? me;
  return {
    me: profile,
    email: account?.email ?? "",
    joinedAt: account?.createdAt ?? profile.createdAt,
    ideas,
    attempts,
    works,
    projectLinks: profile.projectLinks ?? [],
  };
}

export async function getWorkBundle(id: string) {
  const { db, me } = await getSnapshot();
  const work = workById(db, id);
  if (!work) return null;
  return {
    db,
    work,
    idea: ideaById(db, work.ideaId)!,
    attempt: attemptById(db, work.attemptId)!,
    forks: db.ideas.filter((i) => i.sourceWorkId === id),
    canManage: db.attempts.some((attempt) => attempt.id === work.attemptId && attempt.ownerId === me.id),
  };
}
