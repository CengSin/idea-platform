import type { Database, License, Work, WorkType } from "./types";

export class WorkMutationError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type WorkPatch = Partial<Pick<Work,
  "title" | "summary" | "type" | "externalUrl" | "repositoryUrl" | "coverUrl" | "license"
>>;

const types: WorkType[] = ["website", "app", "video", "article", "research", "art", "hardware", "other"];
const fields = new Set([
  "user_confirmed", "title", "summary", "type", "external_url", "externalUrl",
  "repository_url", "repositoryUrl", "cover_url", "coverUrl", "license",
]);

export function workRequestBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new WorkMutationError(400, "请求体必须为 JSON 对象");
  }
  const value = body as Record<string, unknown>;
  if (value.user_confirmed !== true) {
    throw new WorkMutationError(400, "修改或删除作品前需用户确认，并设置 user_confirmed=true。");
  }
  return value;
}

function stringField(value: unknown, field: string) {
  if (typeof value !== "string") throw new WorkMutationError(400, `${field} 必须是字符串`);
  return value.trim();
}

function urlField(value: unknown, field: string, allowPath = false) {
  const text = stringField(value, field);
  if (!text) return "";
  if (/[\\\u0000-\u0020]/.test(text)) throw new WorkMutationError(400, `${field} 不是有效链接`);
  if (allowPath && text.startsWith("/") && !text.startsWith("//")) return text;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
  } catch {
    throw new WorkMutationError(400, `${field} 只支持不含账号密码的 http/https 链接${allowPath ? "或站内路径" : ""}`);
  }
  return text;
}

export function parseWorkPatch(raw: unknown): WorkPatch {
  const body = workRequestBody(raw);
  for (const field of Object.keys(body)) {
    if (!fields.has(field)) throw new WorkMutationError(400, `不支持修改字段：${field}；来源分支、归因和署名不可修改。`);
  }
  const patch: WorkPatch = {};
  if ("title" in body) {
    patch.title = stringField(body.title, "title");
    if (!patch.title || patch.title.length > 200) throw new WorkMutationError(400, "作品名称需为 1–200 字符");
  }
  if ("summary" in body) {
    patch.summary = stringField(body.summary, "summary");
    if (patch.summary.length > 10000) throw new WorkMutationError(400, "作品简介不能超过 10000 字符");
  }
  if ("type" in body) {
    if (!types.includes(body.type as WorkType)) throw new WorkMutationError(400, "作品类型无效");
    patch.type = body.type as WorkType;
  }
  for (const [snake, camel] of [["external_url", "externalUrl"], ["repository_url", "repositoryUrl"], ["cover_url", "coverUrl"]] as const) {
    if (snake in body && camel in body && body[snake] !== body[camel]) throw new WorkMutationError(400, `${snake} 与 ${camel} 不能冲突`);
    if (snake in body || camel in body) patch[camel] = urlField(snake in body ? body[snake] : body[camel], snake, camel === "coverUrl");
  }
  if ("license" in body) {
    const license = body.license as License | null;
    if (!license || typeof license.implementation !== "boolean" || typeof license.derivatives !== "boolean" || !["yes", "with_attribution", "no"].includes(license.commercialUse)) {
      throw new WorkMutationError(400, "license 需包含 implementation、derivatives 和有效的 commercialUse");
    }
    patch.license = { implementation: license.implementation, derivatives: license.derivatives, commercialUse: license.commercialUse };
  }
  if (!Object.keys(patch).length) throw new WorkMutationError(400, "请提供至少一个需要修改的作品字段");
  return patch;
}

export function ownedWork(db: Database, userId: string, workId: string, scopeAttemptId?: string) {
  const work = db.works.find((item) => item.id === workId);
  if (!work) throw new WorkMutationError(404, "作品不存在");
  const attempt = db.attempts.find((item) => item.id === work.attemptId);
  if (!attempt || attempt.ownerId !== userId || (scopeAttemptId !== undefined && scopeAttemptId !== attempt.id)) {
    throw new WorkMutationError(403, "只能管理自己承接分支的作品；Agent Token 仅能操作其所属分支。");
  }
  return { work, attempt };
}

export function applyWorkUpdate(db: Database, userId: string, workId: string, patch: WorkPatch, at: string, scopeAttemptId?: string) {
  const { work, attempt } = ownedWork(db, userId, workId, scopeAttemptId);
  // Explicit allowlist: callers cannot overwrite identity, attribution or counters.
  for (const key of ["title", "summary", "type", "externalUrl", "repositoryUrl", "coverUrl", "license"] as const) {
    if (patch[key] !== undefined) Object.assign(work, { [key]: patch[key] });
  }
  attempt.lastActiveAt = at;
  return { work, attempt };
}

export function applyWorkDelete(db: Database, userId: string, workId: string, at: string, scopeAttemptId?: string) {
  const { work, attempt } = ownedWork(db, userId, workId, scopeAttemptId);
  db.works = db.works.filter((item) => item.id !== workId);
  attempt.workIds = db.works.filter((item) => item.attemptId === attempt.id).map((item) => item.id);
  if (attempt.status === "published" && !db.works.some((item) => item.attemptId === attempt.id && item.status === "published")) attempt.status = "testing";
  attempt.lastActiveAt = at;
  attempt.progressNote = `已删除作品「${work.title}」${attempt.status === "testing" ? "，继续测试与完善。" : "。"}`;
  db.events = db.events.filter((event) => event.workId !== workId);
  db.notifications = db.notifications.filter((notification) => notification.href !== `/works/${workId}`);
  // Keep derived ideas and their parent idea attribution; only remove the dead work link.
  for (const idea of db.ideas) {
    if (idea.sourceWorkId === workId) {
      idea.parentIdeaId ||= work.ideaId;
      delete idea.sourceWorkId;
    }
  }
  return { work, attempt };
}
