import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./session.ts";

export async function isOwner() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireOwner() {
  if (!(await isOwner())) redirect("/login");
}
