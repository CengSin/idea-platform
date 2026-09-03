"use client";

import { Button } from "@/components/ui/Button";
import { generateAgentSetupAction } from "@/lib/actions";
import { Check, Copy, Download, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

export function AgentUpgradePanel({ attemptId, derived }: { attemptId: string; derived: boolean }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");

  function generate() {
    setError("");
    setCopied(false);
    start(async () => {
      try {
        const result = await generateAgentSetupAction({
          attemptId,
          baseUrl: window.location.origin,
        });
        setExpiresAt(result.expiresAt);
        if (result.delivery === "copy_prompt") {
          await navigator.clipboard.writeText(result.content);
        } else {
          const blob = new Blob([result.content], { type: "text/markdown;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = result.filename ?? "AGENTS.md";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
        }
        setCopied(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "更新配置生成失败");
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
        {derived ? "复制最新的完整连接提示词交给 Agent。" : "下载最新 AGENTS.md 替换项目根目录中的旧文件。"}新 Token 不会立即挤掉同一分支仍有效的旧 Token。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button tone="active" disabled={pending} onClick={generate}>
          {copied ? <Check className="h-3.5 w-3.5" /> : derived ? <Copy className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
          {pending ? "正在生成…" : copied ? (derived ? "提示词已复制" : "AGENTS.md 已下载") : (derived ? "复制最新提示词" : "下载最新 AGENTS.md")}
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
