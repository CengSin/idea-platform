"use server";

import { revalidatePath } from "next/cache";
import {
  issueAttemptAgentToken,
  requireCurrentUser,
  revokeAgentTokensForUser,
} from "./auth";
import { agentSetupDelivery, buildAgentPrompt, buildAgentsMd } from "./agent-setup";
import { readDb, mutateDb } from "./db";
import { attemptById, ideaById } from "./format";
import {
  addProjectLink,
  acceptAgentSuggestion,
  adoptIdea,
  clearContent,
  createNextIdea,
  deleteNextIdea,
  dismissAgentSuggestion,
  followIdea,
  markNotificationsRead,
  publishIdea,
  publishIdeaDraft,
  removeProjectLink,
  saveIdeaDraft,
  setWorkIterationStatus,
  updateNextIdea,
  updateIdeaDraft,
  deleteIdeaDraft,
} from "./ops";

function refresh() {
  revalidatePath("/", "layout");
}

export async function publishIdeaAction(input: Parameters<typeof publishIdea>[1]) {
  const me = await requireCurrentUser();
  const result = await publishIdea(me.id, input);
  refresh();
  return result;
}

export async function saveIdeaDraftAction(input: Parameters<typeof saveIdeaDraft>[1]) {
  const me = await requireCurrentUser();
  const result = await saveIdeaDraft(me.id, input);
  refresh();
  return result;
}

export async function updateIdeaDraftAction(
  ideaId: string,
  input: Parameters<typeof updateIdeaDraft>[2],
) {
  const me = await requireCurrentUser();
  const result = await updateIdeaDraft(me.id, ideaId, input);
  refresh();
  return result;
}

export async function publishIdeaDraftAction(ideaId: string) {
  const me = await requireCurrentUser();
  const result = await publishIdeaDraft(me.id, ideaId);
  refresh();
  return result;
}

export async function deleteIdeaDraftAction(ideaId: string) {
  const me = await requireCurrentUser();
  const result = await deleteIdeaDraft(me.id, ideaId);
  refresh();
  return result;
}

export async function adoptIdeaAction(input: Parameters<typeof adoptIdea>[1]) {
  const me = await requireCurrentUser();
  const result = await adoptIdea(me.id, input);
  refresh();
  return result;
}

export async function createNextIdeaAction(
  workId: string,
  input: Parameters<typeof createNextIdea>[2],
  draft = false,
) {
  const me = await requireCurrentUser();
  const result = await createNextIdea(me.id, workId, input, draft);
  refresh();
  return result;
}

export async function updateNextIdeaAction(
  ideaId: string,
  input: Parameters<typeof updateNextIdea>[2],
) {
  const me = await requireCurrentUser();
  const result = await updateNextIdea(me.id, ideaId, input);
  refresh();
  return result;
}

export async function deleteNextIdeaAction(ideaId: string) {
  const me = await requireCurrentUser();
  const result = await deleteNextIdea(me.id, ideaId);
  refresh();
  return result;
}

export async function acceptAgentSuggestionAction(workId: string, suggestionId: string) {
  const me = await requireCurrentUser();
  const result = await acceptAgentSuggestion(me.id, workId, suggestionId);
  refresh();
  return result;
}

export async function dismissAgentSuggestionAction(workId: string, suggestionId: string) {
  const me = await requireCurrentUser();
  const result = await dismissAgentSuggestion(me.id, workId, suggestionId);
  refresh();
  return result;
}

export async function setWorkIterationStatusAction(workId: string, status: "open" | "closed") {
  const me = await requireCurrentUser();
  const result = await setWorkIterationStatus(me.id, workId, status);
  refresh();
  return result;
}

export async function generateAgentSetupAction(input: {
  attemptId: string;
  baseUrl: string;
}) {
  const me = await requireCurrentUser();
  const db = await readDb();
  const attempt = attemptById(db, input.attemptId);
  if (!attempt) throw new Error("承接不存在");
  if (attempt.ownerId !== me.id) throw new Error("只能为自己的承接生成 Agent 配置");
  const idea = ideaById(db, attempt.ideaId);
  if (!idea) throw new Error("来源想法不存在");

  let baseUrl: string;
  try {
    const parsed = new URL(input.baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    baseUrl = parsed.origin;
  } catch {
    throw new Error("站点地址无效");
  }

  const grant = await issueAttemptAgentToken(me.id, attempt.id);
  const delivery = agentSetupDelivery(idea);
  const build = delivery === "copy_prompt" ? buildAgentPrompt : buildAgentsMd;
  const content = build({
    idea,
    attempt,
    baseUrl,
    token: grant.token,
    tokenExpiresAt: grant.expiresAt,
  });
  return {
    delivery,
    filename: delivery === "agents_md" ? "AGENTS.md" : undefined,
    expiresAt: grant.expiresAt,
    content,
  };
}

export async function followIdeaAction(ideaId: string, follow: boolean) {
  const me = await requireCurrentUser();
  await followIdea(me.id, ideaId, follow);
  refresh();
}

export async function markNotificationsReadAction() {
  const me = await requireCurrentUser();
  await markNotificationsRead(me.id);
  refresh();
}

export async function clearContentAction() {
  const me = await requireCurrentUser();
  await revokeAgentTokensForUser(me.id);
  await clearContent();
  refresh();
}

export type ProfileLinkState = { error?: string; ok?: boolean };

export async function addProjectLinkAction(
  _state: ProfileLinkState,
  formData: FormData,
): Promise<ProfileLinkState> {
  const me = await requireCurrentUser();
  try {
    await addProjectLink(me.id, {
      title: String(formData.get("title") ?? ""),
      url: String(formData.get("url") ?? ""),
      note: String(formData.get("note") ?? ""),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "添加失败，请稍后重试。" };
  }
  refresh();
  return { ok: true };
}

export async function removeProjectLinkAction(formData: FormData) {
  const me = await requireCurrentUser();
  const linkId = String(formData.get("linkId") ?? "");
  if (!linkId) return;
  await removeProjectLink(me.id, linkId);
  refresh();
}

export async function setIdeaDeprecatedAction(ideaId: string, deprecated: boolean) {
  const me = await requireCurrentUser();
  await mutateDb(db => {
    const idea = db.ideas.find(i => i.id === ideaId);
    if (!idea || idea.author.userId !== me.id) throw new Error("只能修改自己的想法状态");
    if (idea.status === "draft" || idea.status === "archived") throw new Error("请先发布想法");
    idea.status = deprecated ? "deprecated" : "published";
    idea.updatedAt = new Date().toISOString();
  });
  refresh();
}

export async function runWorkAnalysisAction(workId: string) {
  const me = await requireCurrentUser();
  const { getEffectiveAgentConfig } = await import("./agent-config");
  const config = await getEffectiveAgentConfig();
  if (!config.openaiApiKey || !config.openaiModel) throw new Error("管理员尚未配置分析模型或 API Key。");
  await mutateDb(db => {
    const work = db.works.find(w => w.id === workId);
    const attempt = db.attempts.find(a => a.id === work?.attemptId);
    if (!work || attempt?.ownerId !== me.id) throw new Error("只能分析自己的作品。");
    if (work.status !== "published" || attempt.status !== "published") throw new Error("请先完成并提交作品。");
    if (work.iteration?.status === "closed") throw new Error("请先开启提醒。");
    const job = work.iteration?.analysis;
    if (job?.status === "running" && Date.parse(job.leaseUntil ?? "") > Date.now()) throw new Error("分析已在运行。");
    if (work.iteration) delete work.iteration.analysis;
  });
  const { runIdeaAgentScan } = await import("./idea-agent-runner");
  const result = await runIdeaAgentScan({ workId });
  refresh();
  return result;
}

export async function enqueueExecutionAction(attemptId: string, input: { id: string; instruction: string; acceptance: string[]; stopConditions: string[] }) {
  const me = await requireCurrentUser();
  const { enqueueExecution } = await import("./agent-execution");
  await mutateDb(db => {
    const attempt = db.attempts.find(a => a.id === attemptId);
    if (!attempt || attempt.ownerId !== me.id) throw new Error("只能调度自己的承接分支。");
    enqueueExecution(attempt, input, new Date().toISOString());
  });
  refresh();
}

export async function decideExecutionAction(attemptId: string, runId: string, decision: "complete" | "cancel" | "retry") {
  const me = await requireCurrentUser();
  const { decideExecution } = await import("./agent-execution");
  if (!["complete", "cancel", "retry"].includes(decision)) throw new Error("无效操作。");
  await mutateDb(db => {
    const attempt = db.attempts.find(a => a.id === attemptId);
    if (!attempt || attempt.ownerId !== me.id) throw new Error("只能调度自己的承接分支。");
    decideExecution(attempt, runId, decision, new Date().toISOString());
  });
  refresh();
}
