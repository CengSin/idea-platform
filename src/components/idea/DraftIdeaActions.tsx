"use client";

import { useSheets } from "@/components/sheets/SheetContext";
import { Button } from "@/components/ui/Button";
import { deleteIdeaDraftAction, publishIdeaDraftAction } from "@/lib/actions";
import type { Idea } from "@/lib/types";
import { Pencil, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DraftIdeaActions({ idea }: { idea: Idea }) {
  const sheets = useSheets();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const publish = () => {
    setError(null);
    start(async () => {
      try {
        await publishIdeaDraftAction(idea.id);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "发布失败");
      }
    });
  };

  const remove = () => {
    if (!window.confirm("确定删除这个草稿吗？关联的项目、进展和作品也会一并删除，且无法恢复。")) return;
    setError(null);
    start(async () => {
      try {
        await deleteIdeaDraftAction(idea.id);
        router.push("/ideas");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "删除失败");
      }
    });
  };

  return (
    <div className="mb-7 rounded-2xl border border-idea/25 bg-idea/7 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[14px] font-medium text-idea">这是你的草稿</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            你可以继续创建项目、生成 AGENTS.md、同步进展和发布作品；对外发布想法时，它们会一起可见。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => sheets.openEditIdea(idea)}>
            <Pencil className="h-4 w-4" />编辑草稿
          </Button>
          <Button tone="danger" disabled={pending} onClick={remove}>
            <Trash2 className="h-4 w-4" />删除
          </Button>
          <Button tone="idea" disabled={pending} onClick={publish}>
            <Send className="h-4 w-4" />{pending ? "处理中…" : "发布草稿"}
          </Button>
        </div>
      </div>
      {error ? <p className="mt-3 text-[13px] text-blocked">{error}</p> : null}
    </div>
  );
}
