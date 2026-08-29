import { nanoid } from "nanoid";
import { mutateDb, resetDb } from "./db";
import { buildAdoptionPrompt } from "./format";
import { type AttemptStatus, type Visibility } from "./types";
import type { License, WorkType } from "./types";

function nowIso() {
  return new Date().toISOString();
}

export async function publishIdea(userId: string, input: {
  title: string;
  summary: string;
  problem: string;
  whyItMatters: string;
  constraints: string[];
  openQuestions: string[];
  desiredOutputs: string[];
  tags: string[];
  visibility: Visibility;
  license: License;
  existingAttempts: { title: string; note?: string }[];
  viaAgent?: boolean;
}) {
  const id = `idea_${nanoid(8)}`;
  const createdAt = nowIso();
  await mutateDb((db) => {
    const me = db.users.find((u) => u.id === userId)!;
    db.ideas.push({
      id,
      title: input.title.trim(),
      summary: input.summary.trim(),
      problem: input.problem.trim(),
      whyItMatters: input.whyItMatters.trim(),
      constraints: input.constraints.filter(Boolean),
      existingAttempts: input.existingAttempts.filter((x) => x.title),
      openQuestions: input.openQuestions.filter(Boolean),
      desiredOutputs: input.desiredOutputs.filter(Boolean),
      tags: input.tags.filter(Boolean),
      author: {
        kind: input.viaAgent ? "agent" : "user",
        userId: me.id,
        displayName: input.viaAgent ? `Agent · ${me.displayName}` : me.displayName,
      },
      license: input.license,
      visibility: input.visibility,
      status: "published",
      graph: {
        x: (Math.random() - 0.5) * 180,
        y: (Math.random() - 0.5) * 180 + 40,
      },
      createdAt,
      updatedAt: createdAt,
    });
    db.events.unshift({
      id: `evt_${nanoid(6)}`,
      at: createdAt,
      actorId: me.id,
      actorName: me.displayName,
      text: `发布了想法「${input.title.trim()}」`,
      ideaId: id,
    });
  });
  return { idea_id: id, url: `/ideas/${id}`, review_status: "published" };
}

export async function adoptIdea(userId: string, input: {
  ideaId: string;
  title: string;
  approach: string;
  projectDescription?: string;
  projectPurpose?: string;
  visibility: Visibility;
  targetDate?: string;
  asWatch?: boolean;
}) {
  const id = `att_${nanoid(8)}`;
  const createdAt = nowIso();
  await mutateDb((db) => {
    const idea = db.ideas.find((i) => i.id === input.ideaId);
    if (!idea) throw new Error("Idea 不存在");
    const me = db.users.find((u) => u.id === userId)!;
    const existing = db.attempts.find(
      (a) =>
        a.ideaId === input.ideaId &&
        a.ownerId === userId &&
        a.status !== "abandoned",
    );
    if (existing) throw new Error("你已经有一条承接分支，可在「承接中」继续更新。");
    const angle = Math.random() * Math.PI * 2;
    const radius = 180 + Math.random() * 80;
    db.attempts.push({
      id,
      ideaId: input.ideaId,
      ownerId: me.id,
      title: input.title.trim() || me.displayName,
      approach: input.approach.trim(),
      projectDescription: input.projectDescription?.trim() || idea.summary,
      projectPurpose: input.projectPurpose?.trim() || idea.whyItMatters,
      executionPrompt: buildAdoptionPrompt(idea, {
        projectDescription: input.projectDescription,
        projectPurpose: input.projectPurpose,
        approach: input.approach,
      }),
      status: input.asWatch ? "considering" : "understanding",
      progressNote: input.asWatch ? "正在观察这个想法。" : "已正式承接，开始理解问题。",
      visibility: input.visibility,
      blockers: [],
      startedAt: createdAt,
      lastActiveAt: createdAt,
      createdAt,
      targetDate: input.targetDate || undefined,
      workIds: [],
      graph: {
        x: idea.graph.x + Math.cos(angle) * radius,
        y: idea.graph.y + Math.sin(angle) * radius,
      },
      featuredOnGraph: true,
    });
    idea.updatedAt = createdAt;
    db.events.unshift({
      id: `evt_${nanoid(6)}`,
      at: createdAt,
      actorId: me.id,
      actorName: me.displayName,
      text: input.asWatch ? "开始关注这个想法" : `承接了「${idea.title}」`,
      ideaId: idea.id,
      attemptId: id,
    });
    db.notifications.unshift({
      id: `ntf_${nanoid(6)}`,
      at: createdAt,
      title: "承接已建立",
      body: "其他人仍可从不同方向实现。这条分支只属于你的执行轨道。",
      read: false,
      href: `/attempts/${id}`,
      kind: "attempt",
    });
  });
  return { attempt_id: id, stage: input.asWatch ? "considering" : "understanding" };
}

export async function updateAttempt(userId: string, input: {
  attemptId: string;
  status?: AttemptStatus;
  progressNote?: string;
  blockers?: string[];
  visibility?: Visibility;
  title?: string;
  approach?: string;
  targetDate?: string;
}) {
  const at = nowIso();
  await mutateDb((db) => {
    const attempt = db.attempts.find((a) => a.id === input.attemptId);
    if (!attempt) throw new Error("承接不存在");
    if (attempt.ownerId !== userId) throw new Error("只能更新自己的承接");
    if (input.status) attempt.status = input.status;
    if (input.progressNote !== undefined) attempt.progressNote = input.progressNote;
    if (input.blockers) attempt.blockers = input.blockers.filter(Boolean);
    if (input.visibility) attempt.visibility = input.visibility;
    if (input.title) attempt.title = input.title;
    if (input.approach) attempt.approach = input.approach;
    if (input.targetDate !== undefined) attempt.targetDate = input.targetDate || undefined;
    attempt.lastActiveAt = at;
    const idea = db.ideas.find((item) => item.id === attempt.ideaId);
    if (idea) idea.updatedAt = at;
    const me = db.users.find((u) => u.id === userId)!;
    db.events.unshift({
      id: `evt_${nanoid(6)}`,
      at,
      actorId: me.id,
      actorName: me.displayName,
      text: input.progressNote?.trim() || "更新了承接进展",
      ideaId: attempt.ideaId,
      attemptId: attempt.id,
    });
  });
  return { updated_at: at };
}

export async function followIdea(userId: string, ideaId: string, follow: boolean) {
  await mutateDb((db) => {
    db.follows = db.follows.filter(
      (f) => !(f.userId === userId && f.ideaId === ideaId),
    );
    if (follow) db.follows.push({ userId, ideaId });
  });
}

export async function publishWork(userId: string, input: {
  attemptId: string;
  title: string;
  summary: string;
  type: WorkType;
  coverUrl: string;
  externalUrl?: string;
  repositoryUrl?: string;
  license: License;
}) {
  const id = `work_${nanoid(8)}`;
  const at = nowIso();
  await mutateDb((db) => {
    const attempt = db.attempts.find((a) => a.id === input.attemptId);
    if (!attempt) throw new Error("承接不存在");
    if (attempt.ownerId !== userId) throw new Error("只能从自己的承接发布作品");
    const me = db.users.find((u) => u.id === userId)!;
    db.works.push({
      id,
      attemptId: attempt.id,
      ideaId: attempt.ideaId,
      title: input.title.trim(),
      summary: input.summary.trim(),
      type: input.type,
      coverUrl: input.coverUrl || "/covers/hushcity.jpg",
      externalUrl: input.externalUrl || undefined,
      repositoryUrl: input.repositoryUrl || undefined,
      status: "published",
      credits: [{ userId: me.id, role: "作者", name: me.displayName }],
      license: input.license,
      publishedAt: at,
      views: 0,
      saves: 0,
      citations: 0,
      graph: attempt.graph
        ? { x: attempt.graph.x + 180, y: attempt.graph.y + 10 }
        : undefined,
    });
    attempt.workIds = [...attempt.workIds, id];
    attempt.status = "published";
    attempt.lastActiveAt = at;
    attempt.progressNote = `发布了作品「${input.title.trim()}」`;
    const idea = db.ideas.find((i) => i.id === attempt.ideaId);
    if (idea) idea.updatedAt = at;
    db.events.unshift({
      id: `evt_${nanoid(6)}`,
      at,
      actorId: me.id,
      actorName: me.displayName,
      text: `发布了作品「${input.title.trim()}」`,
      ideaId: attempt.ideaId,
      attemptId: attempt.id,
      workId: id,
    });
    db.notifications.unshift({
      id: `ntf_${nanoid(6)}`,
      at,
      title: "作品已连接到来源想法",
      body: `「${input.title.trim()}」已归因到「${idea?.title ?? "想法"}」。署名不可移除。`,
      read: false,
      href: `/works/${id}`,
      kind: "work",
    });
  });
  return { work_id: id, url: `/works/${id}` };
}

export async function addProjectLink(
  userId: string,
  input: { title: string; url: string; note?: string },
) {
  const title = input.title.trim();
  if (!title) throw new Error("请填写项目名称。");
  if (title.length > 80) throw new Error("项目名称过长。");
  let parsed: URL;
  try {
    parsed = new URL(input.url.trim());
  } catch {
    throw new Error("请输入有效的项目链接。");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("链接需以 http 或 https 开头。");
  }
  const url = parsed.toString();
  const note = input.note?.trim() || undefined;
  const id = `plink_${nanoid(8)}`;
  const createdAt = nowIso();
  await mutateDb((db) => {
    const me = db.users.find((u) => u.id === userId);
    if (!me) throw new Error("用户不存在");
    me.projectLinks ??= [];
    if (me.projectLinks.some((link) => link.url === url)) {
      throw new Error("该项目链接已经添加过。");
    }
    me.projectLinks.unshift({ id, title, url, note, createdAt });
  });
  return { id };
}

export async function removeProjectLink(userId: string, linkId: string) {
  await mutateDb((db) => {
    const me = db.users.find((u) => u.id === userId);
    if (!me) throw new Error("用户不存在");
    me.projectLinks = (me.projectLinks ?? []).filter((link) => link.id !== linkId);
  });
}

export async function markNotificationsRead() {
  await mutateDb((db) => {
    db.notifications.forEach((n) => {
      n.read = true;
    });
  });
}

export async function clearContent() {
  await resetDb();
}
