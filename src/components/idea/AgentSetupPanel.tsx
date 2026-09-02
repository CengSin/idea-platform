"use client";

import { Button } from "@/components/ui/Button";
import { generateAgentsMdAction } from "@/lib/actions";
import { Check, Copy, Download, FolderPlus, Terminal } from "lucide-react";
import { useState, useTransition } from "react";

export function AgentSetupPanel({ attemptId }: { attemptId: string }) {
  const [pending, start] = useTransition();
  const [content, setContent] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = (markdown: string) => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "AGENTS.md";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const generate = () => {
    setError(null);
    start(async () => {
      try {
        const result = await generateAgentsMdAction({
          attemptId,
          baseUrl: window.location.origin,
        });
        setContent(result.content);
        setExpiresAt(result.expiresAt);
        download(result.content);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "AGENTS.md 生成失败");
      }
    });
  };

  return (
    <section className="glass mt-8 max-w-3xl rounded-3xl p-5">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 className="text-[17px] font-medium tracking-[-0.025em]">让 Agent 接管这条分支</h2>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">
            进展、阻塞、测试阶段和作品发布由 Agent 自动同步；配置也包含修改、删除自己作品的接口与权限说明。
          </p>
        </div>
        <Button tone="idea" disabled={pending} onClick={generate}>
          <Download className="h-4 w-4" />
          {pending ? "正在生成…" : content ? "重新生成" : "生成 AGENTS.md"}
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Step icon={FolderPlus} number="1" title="新建项目文件夹">
          创建一个空文件夹，或进入准备开发的现有仓库。
        </Step>
        <Step icon={Download} number="2" title="放入 AGENTS.md">
          将下载的文件放在项目根目录。它会在每轮启动时获取最新接口能力；不要提交其中的 Token。
        </Step>
        <Step icon={Terminal} number="3" title="启动 Agent">
          在该目录启动你的 Agent，它会读取任务并自动回写进展。
        </Step>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-black/15 px-4 py-3 font-mono text-[12px] leading-6 text-artifact/80">
        <div>mkdir my-idea-project</div>
        <div>cd my-idea-project</div>
        <div className="text-muted"># 把下载的 AGENTS.md 放到这里，然后启动你的 Agent</div>
      </div>

      {content ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-active/20 bg-active/6 px-4 py-3">
          <div className="flex items-center gap-2 text-[12.5px] text-active">
            <Check className="h-4 w-4" />
            已生成专属配置；同一分支仍有效的旧 Token 会继续可用
            {expiresAt ? ` · 有效期至 ${new Date(expiresAt).toLocaleDateString("zh-CN")}` : ""}
          </div>
          <Button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
          >
            <Copy className="h-4 w-4" />
            {copied ? "已复制" : "复制全文"}
          </Button>
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
