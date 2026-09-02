"use client";

import { Button } from "@/components/ui/Button";
import { generateAgentsMdAction } from "@/lib/actions";
import { Check, Copy, Download, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

function downloadMarkdown(markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "AGENTS.md";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function AgentUpgradePanel({ attemptId }: { attemptId: string }) {
  const [pending, start] = useTransition();
  const [action, setAction] = useState<"download" | "copy" | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");

  function generate(nextAction: "download" | "copy") {
    setAction(nextAction);
    setError("");
    setCopied(false);
    start(async () => {
      try {
        const result = await generateAgentsMdAction({
          attemptId,
          baseUrl: window.location.origin,
        });
        setExpiresAt(result.expiresAt);
        if (nextAction === "download") {
          downloadMarkdown(result.content);
        } else {
          await navigator.clipboard.writeText(result.updatePrompt);
          setCopied(true);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "更新配置生成失败");
      } finally {
        setAction(null);
      }
    });
  }

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-active" />
        <h2 className="text-[13px] font-medium">更新老项目连接</h2>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
        下载最新 AGENTS.md，或复制提示词交给 Agent 自动更新旧文件。新 Token 不会立即挤掉同一分支仍有效的旧 Token。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => generate("download")}>
          <Download className="h-3.5 w-3.5" />
          {pending && action === "download" ? "正在生成…" : "下载最新 AGENTS.md"}
        </Button>
        <Button tone="active" disabled={pending} onClick={() => generate("copy")}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {pending && action === "copy" ? "正在生成…" : copied ? "提示词已复制" : "复制更新提示词"}
        </Button>
      </div>
      {expiresAt ? (
        <p role="status" className="mt-3 text-[12px] text-active">
          最新连接有效期至 {new Date(expiresAt).toLocaleDateString("zh-CN")}，持续使用时会自动续期。
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-[12.5px] text-blocked">{error}</p> : null}
    </div>
  );
}
