import { nanoid } from "nanoid";
import { DEFAULT_COVER } from "./cover";
import { mutateDb, readDb, resetDb } from "./db";
import { buildAdoptionPrompt, recomputeIdeaStatus } from "./format";
import { isPlaceholderCover } from "./cover";
import { resolveLinkPreview } from "./link-preview";
import { applyWorkDelete, applyWorkUpdate, ownedWork, parseWorkPatch } from "./work-management";
import {
  createNextIdeaRecord,
  deleteNextIdeaRecord,
  updateNextIdeaRecord,
  type NextIdeaInput,
} from "./next-ideas";
import {
  acceptAgentSuggestionRecord,
  dismissAgentSuggestionRecord,
  setWorkIterationStatusRecord,
} from "./idea-agent";
import { type AttemptStatus, type Visibility } from "./types";
import type { Idea, License, WorkType } from "./types";

function nowIso() {
  return new Date().toISOString();
}

export type IdeaInput = {
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
};

function cleanIdeaInput(input: IdeaInput) {
  return {
    title: input.title.trim(),
    summary: input.summary.trim(),
    problem: input.problem.trim(),
    whyItMatters: input.whyItMatters.trim(),
    constraints: input.constraints.map((item) => item.trim()).filter(Boolean),
    existingAttempts: input.existingAttempts
      .map((item) => ({ ...item, title: item.title.trim(), note: item.note?.trim() || undefined }))
      .filter((item) => item.title),
    openQuestions: input.openQuestions.map((item) => item.trim()).filter(Boolean),
    desiredOutputs: input.desiredOutputs.map((item) => item.trim()).filter(Boolean),
    tags: input.tags.map((item) => item.trim()).filter(Boolean),
  };
}

function validateIdea(input: ReturnType<typeof cleanIdeaInput>, publishing: boolean) {
  if (!input.title) throw new Error("请填写想法标题。");
  if (publishing && (!input.summary || !input.problem)) {
    throw new Error("发布前请填写简要描述和想解决的问题。");
  }
}

async function createIdea(userId: string, input: IdeaInput, status: "draft" | "published") {
  const clean = cleanIdeaInput(input);
  validateIdea(clean, status === "published");
  const id = `idea_${nanoid(8)}`;
  const createdAt = nowIso();
  await mutateDb((db) => {
    const me = db.users.find((u) => u.id === userId);
    if (!me) throw new Error("用户不存在");
    db.ideas.push({
      id,
      ...clean,
      author: {
        kind: input.viaAgent ? "agent" : "user",
        userId: me.id,
        displayName: input.viaAgent ? `Agent · ${me.displayName}` : me.displayName,
      },
      license: input.license,
      visibility: input.visibility,
      status,
      graph: {
        x: (Math.random() - 0.5) * 180,
        y: (Math.random() - 0.5) * 180 + 40,
      },
      createdAt,
      updatedAt: createdAt,
    });
    if (status === "published") {
      db.events.unshift({
        id: `evt_${nanoid(6)}`,
        at: createdAt,
        actorId: me.id,
        actorName: me.displayName,
        text: `发布了想法「${clean.title}」`,
        ideaId: id,
      });
    }
  });
  return { idea_id: id, url: `/ideas/${id}`, review_status: status };
}

export async function publishIdea(userId: string, input: IdeaInput) {
  return createIdea(userId, input, "published");
}

export async function saveIdeaDraft(userId: string, input: IdeaInput) {
  return createIdea(userId, input, "draft");
}

export async function createNextIdea(userId: string, workId: string, input: NextIdeaInput) {
  const id = `idea_${nanoid(8)}`;
  const at = nowIso();
  await mutateDb((db) => {
    const idea = createNextIdeaRecord(db, userId, workId, input, id, at);
    const me = db.users.find((item) => item.id === userId)!;
    db.events.unshift({
      id: `evt_${nanoid(6)}`,
      at,
      actorId: me.id,
      actorName: me.displayName,
      text: `从作品中发布了下一步「${idea.title}」`,
      ideaId: idea.id,
      workId,
    });
  });
  return { idea_id: id, url: `/ideas/${id}`, review_status: "published" as const };
}

export async function updateNextIdea(
  userId: string,
  ideaId: string,
  input: NextIdeaInput,
) {
  const at = nowIso();
  let workId = "";
  await mutateDb((db) => {
    const idea = updateNextIdeaRecord(db, userId, ideaId, input, at);
    workId = idea.sourceWorkId!;
    const me = db.users.find((item) => item.id === userId)!;
    db.events.unshift({
      id: `evt_${nanoid(6)}`,
      at,
      actorId: me.id,
      actorName: me.displayName,
      text: `更新了下一步「${idea.title}」`,
      ideaId,
      workId,
    });
  });
  return { idea_id: ideaId, url: `/ideas/${ideaId}`, work_id: workId, updated_at: at };
}

export async function deleteNextIdea(userId: string, ideaId: string) {
  let workId = "";
  await mutateDb((db) => {
    const idea = deleteNextIdeaRecord(db, userId, ideaId);
    workId = idea.sourceWorkId!;
  });
  return { idea_id: ideaId, work_id: workId, deleted: true };
}

export async function acceptAgentSuggestion(userId: string, workId: string, suggestionId: string) {
  const ideaId = `idea_${nanoid(8)}`;
  const at = nowIso();
  await mutateDb((db) => {
    const suggestion = acceptAgentSuggestionRecord(db, userId, workId, suggestionId, ideaId);
    const idea = createNextIdeaRecord(db, userId, workId, suggestion, ideaId, at);
    idea.author.kind = "agent";
    idea.author.displayName = `Idea Agent · ${idea.author.displayName}`;
    const me = db.users.find((item) => item.id === userId)!;
    db.events.unshift({
      id: `evt_${nanoid(6)}`,
      at,
      actorId: me.id,
      actorName: me.displayName,
      text: `接受了 Idea Agent 的建议「${idea.title}」`,
      ideaId: idea.id,
      workId,
    });
  });
  return { idea_id: ideaId, url: `/ideas/${ideaId}`, review_status: "published" as const };
}

export async function dismissAgentSuggestion(userId: string, workId: string, suggestionId: string) {
  await mutateDb((db) => dismissAgentSuggestionRecord(db, userId, workId, suggestionId));
  return { work_id: workId, suggestion_id: suggestionId, status: "dismissed" as const };
}

export async function setWorkIterationStatus(userId: string, workId: string, status: "open" | "closed") {
  const at = nowIso();
  await mutateDb((db) => {
    setWorkIterationStatusRecord(db, userId, workId, status);
    const work = db.works.find((item) => item.id === workId)!;
    const me = db.users.find((item) => item.id === userId)!;
    db.events.unshift({
      id: `evt_${nanoid(6)}`,
      at,
      actorId: userId,
      actorName: me.displayName,
      text: `${status === "closed" ? "关闭" : "重新开启"}了作品「${work.title}」的后续迭代`,
      ideaId: work.ideaId,
      attemptId: work.attemptId,
      workId,
    });
  });
  return { work_id: workId, iteration_status: status, updated_at: at };
}

function applyIdeaInput(idea: Idea, input: ReturnType<typeof cleanIdeaInput>) {
  idea.title = input.title;
  idea.summary = input.summary;
  idea.problem = input.problem;
  idea.whyItMatters = input.whyItMatters;
  idea.constraints = input.constraints;
  idea.existingAttempts = input.existingAttempts;
  idea.openQuestions = input.openQuestions;
  idea.desiredOutputs = input.desiredOutputs;
  idea.tags = input.tags;
}

export async function updateIdeaDraft(userId: string, ideaId: string, input: IdeaInput) {
  return updateOwnedIdea(userId, ideaId, input, true);
}

export async function updateIdea(userId: string, ideaId: string, input: IdeaInput) {
  return updateOwnedIdea(userId, ideaId, input, false);
}

async function updateOwnedIdea(
  userId: string,
  ideaId: string,
  input: IdeaInput,
  draftOnly: boolean,
) {
  const clean = cleanIdeaInput(input);
  const updatedAt = nowIso();
  let reviewStatus: Idea["status"] = "draft";
  await mutateDb((db) => {
    const idea = db.ideas.find((item) => item.id === ideaId);
    if (!idea) throw new Error("想法不存在");
    if (idea.author.userId !== userId) throw new Error("只能更新自己发布的想法");
    if (draftOnly && idea.status !== "draft") throw new Error("已发布的想法不能作为草稿修改");
    validateIdea(clean, idea.status !== "draft");
    applyIdeaInput(idea, clean);
    idea.license = input.license;
    idea.visibility = input.visibility;
    idea.updatedAt = updatedAt;
    reviewStatus = idea.status;
    if (!draftOnly && idea.status !== "draft") {
      const me = db.users.find((item) => item.id === userId);
      db.events.unshift({
        id: `evt_${nanoid(6)}`,
        at: updatedAt,
        actorId: userId,
        actorName: me?.displayName ?? idea.author.displayName,
        text: `更新了想法「${idea.title}」`,
        ideaId,
      });
    }
  });
  return { idea_id: ideaId, url: `/ideas/${ideaId}`, updated_at: updatedAt, review_status: reviewStatus };
}

export async function publishIdeaDraft(userId: string, ideaId: string) {
  const publishedAt = nowIso();
  let nextStatus = "published";
  await mutateDb((db) => {
    const idea = db.ideas.find((item) => item.id === ideaId);
    if (!idea) throw new Error("想法不存在");
    if (idea.author.userId !== userId) throw new Error("只能发布自己的草稿");
    if (idea.status !== "draft") throw new Error("该想法已经发布");
    validateIdea(cleanIdeaInput({
      title: idea.title, summary: idea.summary, problem: idea.problem,
      whyItMatters: idea.whyItMatters, constraints: idea.constraints,
      existingAttempts: idea.existingAttempts, openQuestions: idea.openQuestions,
      desiredOutputs: idea.desiredOutputs, tags: idea.tags,
      visibility: idea.visibility, license: idea.license,
    }), true);
    idea.status = "published";
    idea.updatedAt = publishedAt;
    nextStatus = recomputeIdeaStatus(idea, db);
    idea.status = nextStatus as Idea["status"];
    const me = db.users.find((item) => item.id === userId);
    db.events.unshift({
      id: `evt_${nanoid(6)}`,
      at: publishedAt,
      actorId: userId,
      actorName: me?.displayName ?? idea.author.displayName,
      text: `发布了想法「${idea.title}」及其草稿内容`,
      ideaId,
    });
  });
  return { idea_id: ideaId, url: `/ideas/${ideaId}`, review_status: nextStatus };
}

export async function deleteIdeaDraft(userId: string, ideaId: string) {
  let attemptIds: string[] = [];
  await mutateDb((db) => {
    const idea = db.ideas.find((item) => item.id === ideaId);
    if (!idea) throw new Error("想法不存在");
    if (idea.author.userId !== userId) throw new Error("只能删除自己的草稿");
    if (idea.status !== "draft") throw new Error("只能删除尚未发布的草稿");
    attemptIds = db.attempts.filter((item) => item.ideaId === ideaId).map((item) => item.id);
    const workIds = new Set(db.works.filter((item) => item.ideaId === ideaId).map((item) => item.id));
    const attemptIdSet = new Set(attemptIds);
    db.ideas = db.ideas.filter((item) => item.id !== ideaId);
    db.attempts = db.attempts.filter((item) => item.ideaId !== ideaId);
    db.works = db.works.filter((item) => item.ideaId !== ideaId);
    db.events = db.events.filter(
      (item) => item.ideaId !== ideaId && (!item.attemptId || !attemptIdSet.has(item.attemptId)) && (!item.workId || !workIds.has(item.workId)),
    );
    db.notifications = db.notifications.filter(
      (item) => !attemptIds.some((id) => item.href === `/attempts/${id}`) &&
        ![...workIds].some((id) => item.href === `/works/${id}`),
    );
    db.follows = db.follows.filter((item) => item.ideaId !== ideaId);
  });
  return { idea_id: ideaId, deleted: true, attempt_ids: attemptIds };
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
    if (idea.status === "deprecated") throw new Error("该想法已弃用，不能创建新的承接");
    if (idea.status === "draft" && idea.author.userId !== userId) {
      throw new Error("草稿仅作者本人可以创建项目");
    }
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
      coverUrl: input.coverUrl || DEFAULT_COVER,
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

export async function updateWork(userId: string, workId: string, raw: unknown, scopeAttemptId?: string) {
  const { work } = ownedWork(await readDb(), userId, workId, scopeAttemptId);
  const patch = parseWorkPatch(raw);
  const externalChanged = patch.externalUrl !== undefined && patch.externalUrl !== (work.externalUrl ?? "");
  if ((patch.coverUrl !== undefined && isPlaceholderCover(patch.coverUrl)) || (externalChanged && patch.coverUrl === undefined)) {
    const externalUrl = patch.externalUrl ?? work.externalUrl;
    const preview = externalUrl ? await resolveLinkPreview(externalUrl) : null;
    patch.coverUrl = preview?.imageUrl || DEFAULT_COVER;
  }
  return mutateWork(userId, workId, "update", patch, scopeAttemptId);
}

export async function deleteWork(userId: string, workId: string, scopeAttemptId?: string) {
  return mutateWork(userId, workId, "delete", undefined, scopeAttemptId);
}

async function mutateWork(userId: string, workId: string, operation: "update" | "delete", patch?: Parameters<typeof applyWorkUpdate>[3], scopeAttemptId?: string) {
  const at = nowIso();
  const eventId = `evt_${nanoid(6)}`;
  const db = await mutateDb((db) => {
    // Recheck ownership inside the store transaction, including on conflict retries.
    const { work, attempt } = operation === "delete"
      ? applyWorkDelete(db, userId, workId, at, scopeAttemptId)
      : applyWorkUpdate(db, userId, workId, patch!, at, scopeAttemptId);
    const idea = db.ideas.find((item) => item.id === work.ideaId);
    if (idea) {
      idea.updatedAt = at;
      idea.status = recomputeIdeaStatus(idea, db);
    }
    db.events.unshift({
      id: eventId, at, actorId: userId,
      actorName: db.users.find((user) => user.id === userId)?.displayName ?? "作品作者",
      text: `${operation === "delete" ? "删除" : "更新"}了作品「${work.title}」`,
      ideaId: work.ideaId, attemptId: attempt.id,
      ...(operation === "update" ? { workId } : {}),
    });
  });
  const event = db.events.find((item) => item.id === eventId)!;
  return {
    work_id: workId,
    ...(operation === "delete" ? { deleted: true } : { work: db.works.find((item) => item.id === workId) }),
    updated_at: at,
    attempt_id: event.attemptId,
    attempt_status: db.attempts.find((item) => item.id === event.attemptId)?.status,
    graph_status: db.ideas.find((item) => item.id === event.ideaId)?.status,
  };
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

export async function markNotificationsRead(userId: string) {
  await mutateDb((db) => {
    db.notifications.forEach((n) => {
      if (!n.userId || n.userId === userId) n.read = true;
    });
  });
}

export async function clearContent() {
  await resetDb();
}
