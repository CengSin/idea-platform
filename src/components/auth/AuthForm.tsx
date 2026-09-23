"use client";

import { NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import {
  type AuthState,
  loginAction,
  registerAction,
} from "@/lib/auth-actions";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
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
      <div className="grid w-full max-w-[980px] overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[650px] overflow-hidden border-r border-slate-100 bg-slate-50/60 p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="relative">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-2xs">
              <Sparkles className="h-5 w-5 text-orange-400" />
            </span>
            <div className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              IDEA PLATFORM
            </div>
            <h1 className="mt-4 max-w-md text-[38px] font-bold leading-[1.25] tracking-tight text-slate-950">
              让一个想法，<br />
              找到愿意把它做出来的人。
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600">
              共享还没实现的问题，让别人沿着自己的方向实现它，再把开源作品带回来。
            </p>
          </div>
          <div className="relative grid gap-3 text-[13px] text-slate-700">
            {[
              "保留最初的想法、背景与作者署名",
              "同一个想法，允许多位开发者独立实现",
              "作品落地后，继续衍生新的想法与方向",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-800">
                  <Sparkles className="h-3 w-3" />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[620px] items-center p-7 sm:p-12">
          <div className="mx-auto w-full max-w-[370px]">
            <div className="mb-9 lg:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-idea/10 text-idea">
                <NotebookPen className="h-6 w-6" />
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
              <Link href={`${isLogin ? "/register" : "/login"}?next=${encodeURIComponent(next)}`} className="text-idea hover:underline">
                {isLogin ? "立即注册" : "返回登录"}
              </Link>
            </p>
            <div className="mt-6 border-t border-line pt-5 text-center">
              <Link href="/explore" className="inline-flex min-h-10 items-center gap-2 text-[13px] text-muted hover:text-idea">
                先逛逛，以游客身份浏览 <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
