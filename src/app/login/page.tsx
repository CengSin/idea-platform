import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "登录", robots: { index: false } };

export default async function LoginPage() {
  if (await isOwner()) redirect("/admin");
  return (
    <main className="relative z-10 mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em]">后台登录</h1>
      <p className="mt-1 text-[13px] text-muted">只有站点主人可以进入。</p>
      <LoginForm />
      <a href="/" className="mt-6 text-[12.5px] text-muted hover:text-artifact">← 返回公开页</a>
    </main>
  );
}
