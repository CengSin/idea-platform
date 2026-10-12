import type { Database, Idea, IdeaComment } from "./types.ts";

export const COMMENT_MAX_LENGTH = 2000;
const visibleStatuses = new Set(["published", "evolving", "realized", "dormant", "deprecated"]);

export class DiscussionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DiscussionError";
    this.status = status;
  }
}

export function canDiscussIdea(idea: Idea) {
  return idea.visibility === "public" && visibleStatuses.has(idea.status);
}

export type DiscussionComment = {
  id: string;
  body: string;
  createdAt: string;
  deleted: boolean;
  author: {
    name: string;
    initials: string;
    accent: string;
    profileUrl?: string;
    isIdeaAuthor: boolean;
    isBuilder: boolean;
  };
  canDelete: boolean;
};

export type DiscussionThread = DiscussionComment & { replies: DiscussionComment[] };
export type IdeaDiscussion = { count: number; threads: DiscussionThread[] };

export function buildIdeaDiscussion(db: Database, ideaId: string, viewerId?: string): IdeaDiscussion | null {
  const idea = db.ideas.find((item) => item.id === ideaId);
  if (!idea || !canDiscussIdea(idea)) return null;
  const comments = (db.comments ?? []).filter((item) => item.ideaId === ideaId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const project = (comment: IdeaComment): DiscussionComment => {
    const user = db.users.find((item) => item.id === comment.authorId);
    const publicProfile = user?.visibility === "public";
    const name = publicProfile ? user.displayName : "社区创作者";
    return {
      id: comment.id,
      body: comment.deletedAt ? "" : comment.body,
      createdAt: comment.createdAt,
      deleted: Boolean(comment.deletedAt),
      author: {
        name,
        initials: publicProfile ? user.initials || name.slice(0, 1) : "创",
        accent: publicProfile ? user.accent : "#64748b",
        profileUrl: publicProfile && db.ideas.some((item) => item.author.userId === user.id && canDiscussIdea(item))
          ? `/explore/people/${encodeURIComponent(user.id)}` : undefined,
        isIdeaAuthor: comment.authorId === idea.author.userId,
        isBuilder: db.attempts.some((attempt) => attempt.ideaId === ideaId && attempt.ownerId === comment.authorId
          && attempt.visibility === "public" && attempt.status !== "abandoned"),
      },
      canDelete: !comment.deletedAt && comment.authorId === viewerId,
    };
  };
  const threads = comments.filter((item) => !item.parentId).map((root) => ({
    ...project(root),
    replies: comments.filter((item) => item.parentId === root.id && !item.deletedAt).map(project),
  })).filter((thread) => !thread.deleted || thread.replies.length > 0);
  return { count: threads.reduce((total, thread) => total + Number(!thread.deleted) + thread.replies.length, 0), threads };
}

export function addIdeaComment(db: Database, userId: string, raw: unknown, at: string): IdeaComment {
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw new DiscussionError(401, "请先登录后参与讨论。");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new DiscussionError(400, "留言内容无效。");
  const input = raw as Record<string, unknown>;
  if (typeof input.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(input.id)) throw new DiscussionError(400, "留言标识无效，请重试。");
  if (typeof input.ideaId !== "string") throw new DiscussionError(400, "请选择要讨论的想法。");
  const idea = db.ideas.find((item) => item.id === input.ideaId);
  if (!idea || !canDiscussIdea(idea)) throw new DiscussionError(404, "这个想法暂未公开，无法参与讨论。");
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body || body.length > COMMENT_MAX_LENGTH) throw new DiscussionError(400, `请填写 1–${COMMENT_MAX_LENGTH} 字的留言。`);
  if (input.parentId !== undefined && (typeof input.parentId !== "string" || !input.parentId)) throw new DiscussionError(400, "请选择要回复的留言。");
  const parentId = input.parentId as string | undefined;
  const comments = db.comments ?? [];
  const existing = comments.find((item) => item.id === input.id);
  if (existing) {
    if (existing.authorId !== userId || existing.ideaId !== idea.id || existing.body !== body || existing.parentId !== parentId || existing.deletedAt) {
      throw new DiscussionError(409, "这条留言已发生变化，请重新提交。");
    }
    return existing;
  }
  const parent = parentId ? comments.find((item) => item.id === parentId && item.ideaId === idea.id) : undefined;
  if (parentId && (!parent || parent.parentId || parent.deletedAt)) throw new DiscussionError(400, "只能回复当前想法中尚未删除的一级留言。");
  if (comments.filter((item) => item.authorId === userId && Date.parse(at) - Date.parse(item.createdAt) < 60_000).length >= 10) {
    throw new DiscussionError(429, "留言太快了，请稍等一分钟再继续。");
  }
  const comment: IdeaComment = { id: input.id, ideaId: idea.id, authorId: userId, body, ...(parentId ? { parentId } : {}), createdAt: at };
  db.comments = [...comments, comment];
  const recipients = new Set([idea.author.userId, ...(parent ? [parent.authorId] : [])]);
  const actorName = user.visibility === "public" ? user.displayName : "一位社区创作者";
  for (const recipientId of recipients) {
    if (recipientId === userId || !db.users.some((item) => item.id === recipientId)) continue;
    db.notifications.unshift({
      id: `ntf_${comment.id}_${recipientId}`,
      userId: recipientId,
      at,
      title: parent?.authorId === recipientId ? "你的留言收到回复" : "你的想法有了新留言",
      body: `${actorName}${parent ? "回复了讨论" : "参与了讨论"} · ${idea.title}`,
      read: false,
      href: `/explore/${encodeURIComponent(idea.id)}#comment-${encodeURIComponent(comment.id)}`,
      kind: "discussion",
    });
  }
  return comment;
}

export function deleteIdeaComment(db: Database, userId: string, ideaId: string, commentId: string, at: string) {
  const idea = db.ideas.find((item) => item.id === ideaId);
  if (!idea || !canDiscussIdea(idea)) throw new DiscussionError(404, "这个想法暂未公开。");
  const comment = db.comments?.find((item) => item.id === commentId && item.ideaId === ideaId);
  if (!comment) throw new DiscussionError(404, "这条留言不存在。");
  if (comment.authorId !== userId) throw new DiscussionError(403, "只能删除自己的留言。");
  comment.body = "";
  comment.deletedAt ??= at;
  const href = `/explore/${encodeURIComponent(ideaId)}#comment-${encodeURIComponent(commentId)}`;
  db.notifications = db.notifications.filter((item) => item.kind !== "discussion" || item.href !== href);
}

export function removeIdeaDiscussion(db: Database, ideaId: string) {
  db.comments = (db.comments ?? []).filter((item) => item.ideaId !== ideaId);
  const prefix = `/explore/${encodeURIComponent(ideaId)}#comment-`;
  db.notifications = db.notifications.filter((item) => item.kind !== "discussion" || !item.href.startsWith(prefix));
}
