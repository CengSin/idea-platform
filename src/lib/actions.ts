"use server";

import { revalidatePath } from "next/cache";
import {
  issueAttemptAgentToken,
  requireCurrentUser,
  revokeAgentTokensForUser,
} from "./auth";
import { buildAgentsMd } from "./agent-setup";
import { readDb } from "./db";
import { attemptById, ideaById } from "./format";
import {
  addProjectLink,
  adoptIdea,
  clearContent,
  followIdea,
  markNotificationsRead,
  publishIdea,
  publishIdeaDraft,
  removeProjectLink,
  saveIdeaDraft,
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

export async function generateAgentsMdAction(input: {
  attemptId: string;
  baseUrl: string;
}) {
  const me = await requireCurrentUser();
  const db = await readDb();
  const attempt = attemptById(db, input.attemptId);
  if (!attempt) throw new Error("承接不存在");
  if (attempt.ownerId !== me.id) throw new Error("只能为自己的承接生成 AGENTS.md");
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
  return {
    filename: "AGENTS.md",
    expiresAt: grant.expiresAt,
    content: buildAgentsMd({
      idea,
      attempt,
      baseUrl,
      token: grant.token,
      tokenExpiresAt: grant.expiresAt,
    }),
  };
}

export async function followIdeaAction(ideaId: string, follow: boolean) {
  const me = await requireCurrentUser();
  await followIdea(me.id, ideaId, follow);
  refresh();
}

export async function markNotificationsReadAction() {
  await requireCurrentUser();
  await markNotificationsRead();
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
