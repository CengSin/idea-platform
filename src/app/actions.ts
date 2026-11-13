"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/auth";
import { applyOwnerPatch } from "@/lib/projects";
import { SESSION_COOKIE, adminPassword, checkPassword, issueSession } from "@/lib/session";
import { mutateShowcase } from "@/lib/store";
import { syncFromGitHub } from "@/lib/sync";
import type { OwnerPatch } from "@/lib/types";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function loginAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!adminPassword()) return { ok: false, error: "服务端还没有设置 ADMIN_PASSWORD。" };
  if (!checkPassword(String(form.get("password") ?? ""))) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { ok: false, error: "密码不正确。" };
  }
  const session = issueSession();
  (await cookies()).set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expires,
  });
  redirect("/admin");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

export async function syncAction(): Promise<ActionResult> {
  if (!(await isOwner())) return { ok: false, error: "请先登录。" };
  try {
    const summary = await syncFromGitHub();
    revalidatePath("/");
    revalidatePath("/admin");
    const parts = [`同步了 ${summary.total} 个仓库`];
    if (summary.added) parts.push(`新增 ${summary.added} 个`);
    if (summary.removed) parts.push(`${summary.removed} 个已不在 GitHub`);
    return { ok: true, message: parts.join("，") };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "同步失败" };
  }
}

export async function updateProjectAction(id: string, patch: OwnerPatch): Promise<ActionResult> {
  if (!(await isOwner())) return { ok: false, error: "请先登录。" };
  let found = false;
  try {
    await mutateShowcase((doc) => ({
      ...doc,
      projects: doc.projects.map((project) => {
        if (project.id !== id) return project;
        found = true;
        return applyOwnerPatch(project, patch);
      }),
    }));
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "保存失败" };
  }
  if (!found) return { ok: false, error: "项目不存在，可能已被同步移除。" };
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}
