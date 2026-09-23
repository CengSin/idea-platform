import { publicReminders } from "./content-access.ts";
import { currentWorkRevision } from "./work-revisions.ts";
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

export interface PublicParticipant {
  userId?: string;
  displayName: string;
  initials: string;
  accent?: string;
  status: string;
  title: string;
  startedAt?: string;
}

export interface PublicActivityItem {
  id: string;
  at: string;
  actorName: string;
  actorId?: string;
  actorInitials: string;
  actorAccent?: string;
  text: string;
  actionType: "idea" | "attempt" | "work" | "next_idea" | "progress" | "general";
  ideaId?: string;
  ideaTitle?: string;
  workId?: string;
  workTitle?: string;
}


// This allowlist is the only content passed into the unauthenticated UI.
// Never pass a Database, account, private attempt todos or private relation to it.
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
        .map((work) => {
          const current = currentWorkRevision(work);
          const revisions = (work.revisions?.length ? work.revisions : [current]).map((revision) => ({
            number: revision.number,
            title: revision.title,
            recordedAt: revision.recordedAt || undefined,
          }));
          return {
            id: work.id,
            revisionNumber: current.number,
            title: work.title,
            summary: work.summary,
            type: work.type,
            coverUrl: work.coverUrl?.startsWith("/covers/") ? work.coverUrl : publicUrl(work.coverUrl),
            externalUrl: publicUrl(work.externalUrl),
            repositoryUrl: publicUrl(work.repositoryUrl),
            publishedAt: work.publishedAt,
            reminders: publicReminders(work),
            revisions,
          };
        });
      const author = db.users.find((user) => user.id === idea.author.userId);
      const isAuthorPublic = author?.visibility === "public";
      const parent = db.ideas.find(i => i.id === idea.parentIdeaId && i.visibility === "public" && visibleStatuses.has(i.status));
      const source = parent && db.works.find(w => w.id === idea.sourceWorkId && w.ideaId === parent.id && w.status === "published" && db.attempts.some(a => a.id === w.attemptId && a.ideaId === parent.id && a.visibility === "public" && a.status !== "abandoned"));
      const revision = source && source.revisions?.find(r => r.id === idea.sourceWorkRevisionId);

      const participants: PublicParticipant[] = attempts.map((attempt) => {
        const user = db.users.find((u) => u.id === attempt.ownerId);
        const isUserPublic = user?.visibility === "public";
        return {
          userId: isUserPublic ? user.id : undefined,
          displayName: isUserPublic ? user.displayName : "参与者",
          initials: isUserPublic ? (user.initials || user.displayName.slice(0, 1).toUpperCase()) : "参",
          accent: isUserPublic ? user.accent : undefined,
          status: attempt.status,
          title: isUserPublic ? attempt.title : "实现中",
          startedAt: attempt.startedAt,
        };
      });

      return {
        id: idea.id,
        createdAt: idea.createdAt,
        updatedAt: idea.updatedAt,
        source: parent && source ? { ideaId: parent.id, ideaTitle: parent.title, workId: source.id, workTitle: revision?.title ?? source.title, revisionNumber: revision?.number } : undefined,
        relationKind: idea.parentIdeaId || idea.sourceWorkId
          ? idea.relationKind === "iterate" ? "iterate" as const : "derive" as const
          : undefined,
        hasUnavailableSource: Boolean(idea.parentIdeaId && (!parent || !source)),
        title: idea.title,
        status: idea.status,
        summary: idea.summary,
        problem: idea.problem,
        whyItMatters: idea.whyItMatters,
        constraints: idea.constraints,
        openQuestions: idea.openQuestions,
        desiredOutputs: idea.desiredOutputs,
        tags: idea.tags,
        authorName: isAuthorPublic ? author.displayName : "社区创作者",
        authorId: isAuthorPublic ? author.id : undefined,
        authorBio: isAuthorPublic ? author.bio : undefined,
        authorInitials: isAuthorPublic ? (author.initials || author.displayName.slice(0, 1).toUpperCase()) : "创",
        authorAccent: isAuthorPublic ? author.accent : undefined,
        attemptCount: attempts.length,
        participants,
        works,
      };
    });
}

export function buildPublicActivities(db: Database, limit = 10): PublicActivityItem[] {
  const publicIdeaMap = new Map(
    db.ideas
      .filter((i) => i.visibility === "public" && visibleStatuses.has(i.status))
      .map((i) => [i.id, i]),
  );

  const publicWorkMap = new Map(
    db.works
      .filter((w) => w.status === "published" && publicIdeaMap.has(w.ideaId))
      .map((w) => [w.id, w]),
  );

  const events = (db.events ?? [])
    .filter((event) => {
      // Must refer to a public idea if ideaId is present
      if (event.ideaId && !publicIdeaMap.has(event.ideaId)) return false;
      // Must refer to a public work if workId is present
      if (event.workId && !publicWorkMap.has(event.workId)) return false;
      // At least one public entity should be present
      return Boolean(event.ideaId || event.workId);
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);

  return events.map((evt) => {
    const actor = db.users.find((u) => u.id === evt.actorId);
    const isActorPublic = actor?.visibility === "public";
    const idea = evt.ideaId ? publicIdeaMap.get(evt.ideaId) : undefined;
    const work = evt.workId ? publicWorkMap.get(evt.workId) : undefined;

    let actionType: PublicActivityItem["actionType"] = "general";
    if (evt.text.includes("发布了想法")) {
      actionType = "idea";
    } else if (evt.text.includes("发布了作品")) {
      actionType = "work";
    } else if (evt.text.includes("承接了") || evt.text.includes("开始实现")) {
      actionType = "attempt";
    } else if (evt.text.includes("从作品中发布") || evt.text.includes("新方向") || evt.text.includes("下一步")) {
      actionType = "next_idea";
    } else if (evt.text.includes("验收") || evt.text.includes("更新") || evt.text.includes("实现")) {
      actionType = "progress";
    }

    return {
      id: evt.id,
      at: evt.at,
      actorName: isActorPublic ? actor.displayName : (actor ? "社区创作者" : evt.actorName),
      actorId: isActorPublic ? actor.id : undefined,
      actorInitials: isActorPublic ? (actor.initials || actor.displayName.slice(0, 1).toUpperCase()) : "创",
      actorAccent: isActorPublic ? actor.accent : undefined,
      text: evt.text,
      actionType,
      ideaId: idea?.id,
      ideaTitle: idea?.title,
      workId: work?.id,
      workTitle: work?.title,
    };
  });
}

export type PublicIdea = ReturnType<typeof buildPublicCatalog>[number];
