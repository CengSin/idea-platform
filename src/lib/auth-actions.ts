"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  authenticate,
  createSession,
  deleteSession,
  registerAccount,
} from "./auth";

export type AuthState = { error?: string };

function destination(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function setSession(userId: string) {
  const session = await createSession(userId);
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
}

export async function loginAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "请输入邮箱和密码。" };
  const account = await authenticate(email, password);
  if (!account) return { error: "邮箱或密码不正确。" };
  await setSession(account.userId);
  redirect(destination(formData.get("next")));
}

export async function registerAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (displayName.length < 2) return { error: "昵称至少需要 2 个字符。" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "请输入有效的邮箱地址。" };
  if (password.length < 8) return { error: "密码至少需要 8 个字符。" };
  if (password !== confirmPassword) return { error: "两次输入的密码不一致。" };

  try {
    const account = await registerAccount({ displayName, email, password });
    await setSession(account.userId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "注册失败，请稍后重试。" };
  }
  redirect("/");
}

export async function logoutAction() {
  const store = await cookies();
  await deleteSession(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
