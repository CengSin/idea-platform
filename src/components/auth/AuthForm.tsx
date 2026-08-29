"use client";

import { SproutIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import {
  type AuthState,
  loginAction,
  registerAction,
} from "@/lib/auth-actions";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

export function AuthForm({
  mode,
  next = "/",
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const isLogin = mode === "login";
  const action = isLogin ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});

  return (
    <main className="relative z-10 grid min-h-dvh place-items-center px-5 py-10">
      <div className="grid w-full max-w-[980px] overflow-hidden rounded-[34px] border border-line bg-[#211c17]/78 shadow-[0_36px_110px_rgba(10,7,4,0.42)] backdrop-blur-3xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[650px] overflow-hidden border-r border-line p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(232,184,106,0.2),transparent_42%),radial-gradient(circle_at_90%_86%,rgba(111,212,203,0.16),transparent_38%)]" />
          <div className="relative">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-idea/30 bg-idea/10 text-idea">
              <SproutIcon className="h-7 w-7" />
            </span>
            <h1 className="mt-10 max-w-md text-[42px] font-semibold leading-[1.08] tracking-[-0.05em]">
              让一个想法，找到愿意把它做出来的人。
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-muted">
              发现项目、明确目的、生成可执行的承接提示词，并追踪它如何长成作品。
            </p>
          </div>
          <div className="relative grid gap-3 text-[13px] text-artifact/85">
            {[
              "保留项目描述、目的与来源",
              "多人可以沿不同方向独立承接",
              "每个成果都回到它的起点",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-active/10 text-active">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[620px] items-center p-7 sm:p-12">
          <div className="mx-auto w-full max-w-[370px]">
            <div className="mb-9 lg:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-idea/10 text-idea">
                <SproutIcon className="h-6 w-6" />
              </span>
            </div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-idea">Idea Platform</p>
            <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.04em]">
              {isLogin ? "欢迎回来" : "创建你的账号"}
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              {isLogin ? "继续发现、承接和完成值得实现的项目。" : "从一个想法开始，建立你的实现轨道。"}
            </p>

            <form action={formAction} className="mt-8 flex flex-col gap-4">
              <input type="hidden" name="next" value={next} />
              {!isLogin ? (
                <Field label="昵称">
                  <TextInput name="displayName" autoComplete="name" placeholder="你希望如何被称呼" required />
                </Field>
              ) : null}
              <Field label="邮箱">
                <TextInput name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
              </Field>
              <Field label="密码" hint={!isLogin ? "至少 8 个字符" : undefined}>
                <TextInput name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} placeholder="••••••••" required />
              </Field>
              {!isLogin ? (
                <Field label="确认密码">
                  <TextInput name="confirmPassword" type="password" autoComplete="new-password" placeholder="再次输入密码" required />
                </Field>
              ) : null}
              {state.error ? (
                <div role="alert" className="rounded-xl border border-blocked/25 bg-blocked/8 px-3.5 py-3 text-[13px] text-blocked">
                  {state.error}
                </div>
              ) : null}
              <Button type="submit" tone="idea" className="mt-2 w-full" disabled={pending}>
                {pending ? (isLogin ? "正在登录…" : "正在创建…") : isLogin ? "登录" : "注册并进入"}
                {!pending ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </form>

            <p className="mt-7 text-center text-[13px] text-muted">
              {isLogin ? "还没有账号？" : "已经有账号？"}{" "}
              <Link href={isLogin ? "/register" : "/login"} className="text-idea hover:underline">
                {isLogin ? "立即注册" : "返回登录"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
