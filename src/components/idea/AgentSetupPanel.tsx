"use client";

import { Button } from "@/components/ui/Button";
import { generateAgentSetupAction } from "@/lib/actions";
import { Check, Copy, Download, FolderPlus, Terminal } from "lucide-react";
import { useState, useTransition } from "react";

export function AgentSetupPanel({ attemptId, derived }: { attemptId: string; derived: boolean }) {
  const [pending, start] = useTransition();
  const [expiresAt, setExpiresAt] = useState("");
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = () => {
    setError(null);
    setComplete(false);
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
        setComplete(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Agent 配置生成失败");
      }
    });
  };

  return (
    <section className="glass mt-8 max-w-3xl rounded-3xl p-5">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 className="text-[17px] font-medium tracking-[-0.025em]">让 Agent 接管这条分支</h2>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">
            {derived
              ? "这是从作品衍生出的子想法。复制完整提示词给任意 Agent，即可延续这条生长路径。"
              : "进展、阻塞、测试阶段和作品发布由 Agent 自动同步；配置也包含修改、删除自己作品的接口与权限说明。"}
          </p>
        </div>
        <Button tone="idea" disabled={pending} onClick={generate}>
          {complete ? <Check className="h-4 w-4" /> : derived ? <Copy className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {pending ? "正在生成…" : complete ? (derived ? "提示词已复制" : "AGENTS.md 已下载") : (derived ? "复制提示词" : "生成 AGENTS.md")}
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Step icon={FolderPlus} number="1" title="新建项目文件夹">
          创建一个空文件夹，或进入准备开发的现有仓库。
        </Step>
        <Step icon={derived ? Copy : Download} number="2" title={derived ? "复制连接提示词" : "放入 AGENTS.md"}>
          {derived
            ? "点击上方按钮生成专属提示词；其中包含分支 Token，请勿粘贴到公开位置。"
            : "将下载的文件放在项目根目录；其中包含分支 Token，请勿提交到 Git。"}
        </Step>
        <Step icon={Terminal} number="3" title="启动 Agent">
          在该目录启动你的 Agent，它会读取任务并自动回写进展。
        </Step>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-black/15 px-4 py-3 font-mono text-[12px] leading-6 text-artifact/80">
        <div>mkdir my-idea-project</div>
        <div>cd my-idea-project</div>
        <div className="text-muted">{derived ? "# 在这个目录启动 Agent，再粘贴已复制的提示词" : "# 把下载的 AGENTS.md 放到这里，然后启动你的 Agent"}</div>
      </div>

      {complete ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-active/20 bg-active/6 px-4 py-3">
          <div className="flex items-center gap-2 text-[12.5px] text-active">
            <Check className="h-4 w-4" />
            {derived ? "已复制专属提示词" : "已下载专属 AGENTS.md"}；同一分支仍有效的旧 Token 会继续可用
            {expiresAt ? ` · 有效期至 ${new Date(expiresAt).toLocaleDateString("zh-CN")}` : ""}
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-[13px] text-blocked">{error}</p> : null}
    </section>
  );
}

function Step({
  icon: Icon,
  number,
  title,
  children,
}: {
  icon: typeof FolderPlus;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white/4 p-4">
      <div className="flex items-center gap-2 text-[13.5px]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-idea/10 text-[11px] text-idea">
          {number}
        </span>
        <Icon className="h-4 w-4 text-muted" />
        {title}
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}
