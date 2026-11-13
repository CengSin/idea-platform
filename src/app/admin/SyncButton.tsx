"use client";

import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { syncAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";

export function SyncButton() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex items-center gap-2">
      {message ? (
        <span role={message.ok ? "status" : "alert"} className={message.ok ? "text-[12px] text-active-deep" : "text-[12px] text-blocked"}>
          {message.text}
        </span>
      ) : null}
      <Button
        tone="idea"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMessage(null);
            const result = await syncAction();
            setMessage(result.ok ? { ok: true, text: result.message ?? "已同步" } : { ok: false, text: result.error });
          })
        }
      >
        <RefreshCw className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} aria-hidden />
        {pending ? "正在同步…" : "从 GitHub 同步"}
      </Button>
    </div>
  );
}
