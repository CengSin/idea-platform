"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { mutateDb } from "./db";
import { addIdeaComment, deleteIdeaComment, DiscussionError } from "./idea-discussion";

type DiscussionActionResult = { ok: true; commentId?: string } | { error: string; requiresLogin?: boolean };

export async function postIdeaCommentAction(input: {
  id: string;
  ideaId: string;
  body: string;
  parentId?: string;
}): Promise<DiscussionActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "登录已失效，请重新登录后继续，已写内容会保留。", requiresLogin: true };
  try {
    await mutateDb((db) => { addIdeaComment(db, user.id, input, new Date().toISOString()); });
  } catch (error) {
    return { error: error instanceof DiscussionError ? error.message : "留言暂时未能发布，内容已保留，请重试。" };
  }
  revalidatePath("/", "layout");
  return { ok: true, commentId: input.id };
}

export async function deleteIdeaCommentAction(ideaId: string, commentId: string): Promise<DiscussionActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "请重新登录后管理自己的留言。", requiresLogin: true };
  try {
    await mutateDb((db) => { deleteIdeaComment(db, user.id, ideaId, commentId, new Date().toISOString()); });
  } catch (error) {
    return { error: error instanceof DiscussionError ? error.message : "留言暂时未能删除，请重试。" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
