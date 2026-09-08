"use client";

import { runIdeaAgentNowAction } from "@/lib/admin-actions";
import { Button } from "@/components/ui/Button";
import { Play, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type RunResult = Awaited<ReturnType<typeof runIdeaAgentNowAction>>;

export function AgentRunControl() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        tone="idea"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const next = await runIdeaAgentNowAction();
              setResult(next);
              router.refresh();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "扫描失败，请稍后重试");
            }
          });
        }}
      >
        {pending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {pending ? "正在排队…" : "立即运行一次"}
      </Button>
      {result ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          {result.configured
            ? `已排队 ${result.queued} 个分析任务，后台继续处理；请稍后刷新查看结果。`
            : "模型或 API Key 未配置，分析未执行。"}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-[12.5px] text-blocked">{error}</p> : null}
    </div>
  );
}
