"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-[13px] font-medium">
        密码
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[14px] font-normal outline-none focus:border-idea"
        />
      </label>
      {state && !state.ok ? <p role="alert" className="text-[12.5px] text-blocked">{state.error}</p> : null}
      <Button tone="idea" type="submit" disabled={pending}>{pending ? "正在登录…" : "登录"}</Button>
    </form>
  );
}
