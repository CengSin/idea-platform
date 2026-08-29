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
  adoptIdea,
  clearContent,
  followIdea,
  markNotificationsRead,
  publishIdea,
} from "./ops";

function refresh() {
  revalidatePath("/", "layout");
}

export async function publishIdeaAction(input: Parameters<typeof publishIdea>[1]) {
  const me = await requireCurrentUser();
  const result = publishIdea(me.id, input);
  refresh();
  return result;
}

export async function adoptIdeaAction(input: Parameters<typeof adoptIdea>[1]) {
  const me = await requireCurrentUser();
  const result = adoptIdea(me.id, input);
  refresh();
  return result;
}

export async function generateAgentsMdAction(input: {
  attemptId: string;
  baseUrl: string;
}) {
  const me = await requireCurrentUser();
  const db = readDb();
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

  const grant = issueAttemptAgentToken(me.id, attempt.id);
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
  followIdea(me.id, ideaId, follow);
  refresh();
}

export async function markNotificationsReadAction() {
  await requireCurrentUser();
  markNotificationsRead();
  refresh();
}

export async function clearContentAction() {
  const me = await requireCurrentUser();
  revokeAgentTokensForUser(me.id);
  clearContent();
  refresh();
}
