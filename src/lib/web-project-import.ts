import { DEFAULT_COVER } from "./cover.ts";
import { normalizeWebsiteUrl } from "./link-preview.ts";
import { ensureWorkRevision } from "./work-revisions.ts";
import type { Database, Idea, Attempt, Work } from "./types.ts";

export class WebProjectImportError extends Error {
  status: number;
  existingUrl?: string;
  constructor(message: string, status = 400, existingUrl?: string) {
    super(message);
    this.status = status;
    this.existingUrl = existingUrl;
  }
}

export type WebProjectImportInput = {
  url: string;
  title: string;
  summary: string;
  problem: string;
  coverUrl?: string;
  originalPublishedAt?: string;
  collaborationOpen: boolean;
  ownsWebsite: boolean;
  userConfirmed: boolean;
};

export function parseWebProjectImportInput(raw: unknown): WebProjectImportInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new WebProjectImportError("请填写网站作品信息。");
  const data = raw as Record<string, unknown>;
  const stringField = (key: string, max: number) => {
    const value = data[key];
    if (value != null && typeof value !== "string") throw new WebProjectImportError("作品信息格式无效。");
    const result = (value ?? "").toString().trim();
    if (result.length > max) throw new WebProjectImportError("作品信息过长，请精简后重试。");
    return result;
  };
  const url = stringField("url", 2048);
  const title = stringField("title", 200);
  const summary = stringField("summary", 2000);
  const problem = stringField("problem", 2000);
  const coverUrl = stringField("coverUrl", 2048);
  const originalPublishedAt = stringField("originalPublishedAt", 10);
  if (!url || !title || !summary || !problem) throw new WebProjectImportError("请填写网站链接、名称、简介和解决的问题。");
  if (data.ownsWebsite !== true) throw new WebProjectImportError("请确认你有权收录这个网站。");
  if (data.userConfirmed !== true) throw new WebProjectImportError("请预览公开信息并确认发布。");
  if (data.collaborationOpen != null && typeof data.collaborationOpen !== "boolean") throw new WebProjectImportError("共创设置无效。");
  if (originalPublishedAt && (!/^\d{4}-\d{2}-\d{2}$/.test(originalPublishedAt) || !Number.isFinite(Date.parse(`${originalPublishedAt}T00:00:00Z`)) || new Date(`${originalPublishedAt}T00:00:00Z`).toISOString().slice(0, 10) !== originalPublishedAt)) throw new WebProjectImportError("原发布时间格式无效。");
  try {
    normalizeWebsiteUrl(url);
  } catch {
    throw new WebProjectImportError("网站链接无效或不可公开访问。");
  }
  return { url, title, summary, problem, coverUrl: coverUrl || undefined, originalPublishedAt: originalPublishedAt || undefined, collaborationOpen: data.collaborationOpen === true, ownsWebsite: true, userConfirmed: true };
}

export function applyWebProjectImport(db: Database, userId: string, input: WebProjectImportInput, ids: { ideaId: string; attemptId: string; workId: string; eventId: string }, at: string) {
  const creator = db.users.find((user) => user.id === userId);
  if (!creator) throw new WebProjectImportError("请先登录。", 401);
  if (!input.ownsWebsite || !input.userConfirmed) throw new WebProjectImportError("请确认作品归属和公开内容。");
  const url = normalizeWebsiteUrl(input.url);
  const duplicate = db.works.find((work) => work.origin === "imported_web" && work.status === "published" && work.externalUrl && normalizeWebsiteUrl(work.externalUrl) === url);
  if (duplicate) throw new WebProjectImportError("这个网站已经入驻。", 409, `/explore/${duplicate.ideaId}#work-${duplicate.id}`);
  const license = { implementation: false, derivatives: false, commercialUse: "no" as const };
  const idea: Idea = {
    id: ids.ideaId, importedWorkId: ids.workId, title: `${input.title}解决的问题`, summary: input.summary, problem: input.problem,
    whyItMatters: "", constraints: [], existingAttempts: [], openQuestions: [], desiredOutputs: [], tags: [],
    author: { kind: "user", userId, displayName: creator.displayName }, license, visibility: "public", status: "realized",
    graph: { x: 0, y: 0 }, createdAt: at, updatedAt: at,
  };
  const attempt: Attempt = {
    id: ids.attemptId, ideaId: ids.ideaId, ownerId: userId, title: input.title, approach: "已有网站在平台收录，未记录历史开发过程。",
    status: "published", progressNote: "已有作品入驻", visibility: "public", blockers: [], startedAt: at, lastActiveAt: at, createdAt: at, workIds: [ids.workId],
  };
  const work: Work = {
    id: ids.workId, ideaId: ids.ideaId, attemptId: ids.attemptId, title: input.title, summary: input.summary,
    type: "website", origin: "imported_web", originalPublishedAt: input.originalPublishedAt, collaborationOpen: input.collaborationOpen,
    coverUrl: input.coverUrl || DEFAULT_COVER, externalUrl: url, status: "published", credits: [{ userId, role: "作者", name: creator.displayName }],
    license, publishedAt: at, views: 0, saves: 0, citations: 0,
  };
  ensureWorkRevision(work, at);
  db.ideas.push(idea);
  db.attempts.push(attempt);
  db.works.push(work);
  db.events.unshift({ id: ids.eventId, at, actorId: userId, actorName: creator.displayName, text: `收录了已有网站「${input.title}」`, ideaId: idea.id, attemptId: attempt.id, workId: work.id });
  return { idea, attempt, work, publicUrl: `/explore/${idea.id}#work-${work.id}` };
}

export function applyImportedCollaboration(db: Database, userId: string, workId: string, open: boolean) {
  const work = db.works.find((item) => item.id === workId);
  if (!work) throw new WebProjectImportError("作品不存在。", 404);
  if (work.origin !== "imported_web") throw new WebProjectImportError("只有入驻网站可设置共创。", 400);
  const attempt = db.attempts.find((item) => item.id === work.attemptId);
  if (!attempt || attempt.ownerId !== userId) throw new WebProjectImportError("只有作品所有者可设置共创。", 403);
  work.collaborationOpen = open;
  return work;
}

export function canAdoptImportedIdea(db: Database, idea: Idea, userId: string) {
  if (!idea.importedWorkId || idea.author.userId === userId) return true;
  const work = db.works.find((item) => item.id === idea.importedWorkId);
  return work?.origin === "imported_web" && work.status === "published" && work.collaborationOpen === true;
}
