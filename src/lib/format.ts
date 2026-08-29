import {
  ACTIVE_ATTEMPT_STATUSES,
  STALL_AFTER_DAYS,
  type Attempt,
  type AttemptStatus,
  type CommercialUse,
  type Database,
  type Idea,
  type IdeaContext,
  type IdeaMetrics,
  type IdeaStatus,
  type License,
  type Visibility,
  type WorkType,
} from "./types";

export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = {
  draft: "草稿",
  published: "已发布",
  evolving: "生长中",
  realized: "已产生作品",
  dormant: "沉寂",
  archived: "已归档",
};

export const ATTEMPT_STATUS_LABEL: Record<AttemptStatus, string> = {
  considering: "关注中",
  understanding: "理解中",
  prototyping: "原型中",
  testing: "公开测试",
  paused: "已暂停",
  stalled: "已沉寂",
  abandoned: "已放弃",
  published: "已发布",
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  public: "公开",
  unlisted: "不公开列出",
  invite_only: "仅邀请",
  private: "私密",
};

export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  website: "Web",
  app: "应用",
  video: "影像",
  article: "文章",
  research: "研究",
  art: "艺术",
  hardware: "硬件",
  other: "其他",
};

export const COMMERCIAL_LABEL: Record<CommercialUse, string> = {
  yes: "允许商用",
  with_attribution: "商用需署名",
  no: "禁止商用",
};

export function formatLicense(license: License): string {
  const parts = [
    license.implementation ? "允许实现" : "禁止实现",
    license.derivatives ? "允许衍生" : "禁止衍生",
    COMMERCIAL_LABEL[license.commercialUse],
  ];
  return parts.join(" · ");
}

export function daysBetween(iso: string, now = Date.now()): number {
  return (now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export function effectiveAttemptStatus(
  attempt: Attempt,
  now = Date.now(),
): AttemptStatus {
  if (
    ACTIVE_ATTEMPT_STATUSES.includes(attempt.status) &&
    daysBetween(attempt.lastActiveAt, now) > STALL_AFTER_DAYS
  ) {
    return "stalled";
  }
  return attempt.status;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const delta = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(delta / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} 个月前`;
  return `${Math.floor(month / 12)} 年前`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ideaMetrics(db: Database, ideaId: string): IdeaMetrics {
  const attempts = db.attempts.filter((a) => a.ideaId === ideaId);
  const statuses = attempts.map((a) => effectiveAttemptStatus(a));
  return {
    watchingCount: statuses.filter((s) => s === "considering").length,
    activeAttemptCount: statuses.filter((s) =>
      ACTIVE_ATTEMPT_STATUSES.includes(s),
    ).length,
    pausedAttemptCount: statuses.filter((s) => s === "paused").length,
    workCount: db.works.filter(
      (w) => w.ideaId === ideaId && w.status === "published",
    ).length,
    forkCount: db.ideas.filter(
      (i) => i.parentIdeaId === ideaId && i.status !== "draft",
    ).length,
    totalAttemptCount: attempts.filter((a) => a.status !== "abandoned").length,
  };
}

export function buildIdeaContext(idea: Idea, origin = ""): IdeaContext {
  return {
    idea_id: idea.id,
    title: idea.title,
    summary: idea.summary,
    problem: idea.problem,
    why_it_matters: idea.whyItMatters,
    constraints: idea.constraints,
    existing_attempts: idea.existingAttempts,
    open_questions: idea.openQuestions,
    desired_outputs: idea.desiredOutputs,
    license: idea.license,
    tags: idea.tags,
    source: {
      url: `${origin}/ideas/${idea.id}`,
      author: idea.author.displayName,
    },
  };
}

export function buildAdoptionPrompt(
  idea: Idea,
  input?: {
    projectDescription?: string;
    projectPurpose?: string;
    approach?: string;
  },
): string {
  const projectDescription = input?.projectDescription?.trim() || idea.summary;
  const projectPurpose = input?.projectPurpose?.trim() || idea.whyItMatters;
  const approach = input?.approach?.trim();
  const lines = [
    `# 项目：${idea.title}`,
    "",
    "## 项目描述",
    projectDescription,
    "",
    "## 项目目的",
    projectPurpose,
    "",
    "## 核心问题",
    idea.problem,
  ];

  if (approach) lines.push("", "## 本次承接方向", approach);
  if (idea.desiredOutputs.length) {
    lines.push("", "## 期望产出", ...idea.desiredOutputs.map((item) => `- ${item}`));
  }
  if (idea.constraints.length) {
    lines.push("", "## 约束条件", ...idea.constraints.map((item) => `- ${item}`));
  }
  if (idea.openQuestions.length) {
    lines.push("", "## 需要探索的问题", ...idea.openQuestions.map((item) => `- ${item}`));
  }
  lines.push(
    "",
    "## 执行要求",
    "请先复述你对项目目标和约束的理解，再给出可验证的实施计划。推进过程中保留关键决策、风险与未解决问题；在对外发布或扩大范围前等待我的确认。",
  );
  return lines.join("\n");
}

export function clsxJoin(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function userById(db: Database, id: string) {
  return db.users.find((u) => u.id === id);
}

export function ideaById(db: Database, id: string) {
  return db.ideas.find((i) => i.id === id);
}

export function workById(db: Database, id: string) {
  return db.works.find((w) => w.id === id);
}

export function attemptById(db: Database, id: string) {
  return db.attempts.find((a) => a.id === id);
}

export function recomputeIdeaStatus(idea: Idea, db: Database): IdeaStatus {
  if (idea.status === "draft" || idea.status === "archived") return idea.status;
  const attempts = db.attempts.filter((a) => a.ideaId === idea.id);
  const statuses = attempts.map((a) => effectiveAttemptStatus(a));
  const hasWork = db.works.some(
    (w) => w.ideaId === idea.id && w.status === "published",
  );
  const hasActive = statuses.some((s) => ACTIVE_ATTEMPT_STATUSES.includes(s));
  const hasPublishedAttempt = statuses.includes("published");
  if (hasWork || hasPublishedAttempt) return "realized";
  if (hasActive) return "evolving";
  if (attempts.length > 0) return "dormant";
  return "published";
}
