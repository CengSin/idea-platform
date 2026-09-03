import "server-only";

import { redirect } from "next/navigation";
import { getAccountPublic, getCurrentUser, requireCurrentUser } from "./auth";
import { isAdminEmail } from "./admin-access";

export async function isAdminUser(userId: string) {
  const account = await getAccountPublic(userId);
  return Boolean(account && isAdminEmail(account.email));
}

export async function getCurrentAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  const account = await getAccountPublic(user.id);
  if (!account || !isAdminEmail(account.email)) return null;
  return { user, account };
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();
  const account = await getAccountPublic(user.id);
  if (!account || !isAdminEmail(account.email)) redirect("/");
  return { user, account };
}
