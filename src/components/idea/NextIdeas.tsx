"use client";

import { useSheets } from "@/components/sheets/SheetContext";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import Link from "@/components/ui/NavigationLink";
import {
  createNextIdeaAction,
  deleteNextIdeaAction,
  updateNextIdeaAction,
} from "@/lib/actions";
import { NEXT_IDEA_STAGE_LABEL, type NextIdeaStage } from "@/lib/next-ideas";
import type { Idea } from "@/lib/types";
import { ArrowRight, GitBranch, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type NextIdeaItem = {
  idea: Idea;
  stage: NextIdeaStage;
  attemptCount: number;
  workCount: number;
  canManage: boolean;
  canDelete: boolean;
};

export function NextIdeas({
  workId,
  workTitle,
  items,
  canCreate,
}: {
  workId: string;
  workTitle: string;
  items: NextIdeaItem[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const sheets = useSheets();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Idea | null>(null);
  const [deleting, setDeleting] = useState<NextIdeaItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openCreate = () => {
    setError(null);
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (idea: Idea) => {
    setError(null);
    setEditing(idea);
    setEditorOpen(true);
  };

  return (
    <section id="next-ideas" className="scroll-mt-8 mt-12 border-t border-line pt-9">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[12px] tracking-[0.08em] text-idea">
            <Sparkles className="h-4 w-4" />
            从结果继续
          </div>
          <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.035em]">这个作品，下一步可以长成什么？</h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            这里的每一步都是公开想法。认领后会从萌芽进入成长，交付新作品后成为结果。
          </p>
        </div>
        {canCreate ? (
          <Button tone="idea" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            发布下一步
          </Button>
        ) : null}
      </div>

      {items.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const tone = item.stage === "result" ? "artifact" : item.stage === "growing" ? "active" : "idea";
            return (
              <article key={item.idea.id} className="glass lift rounded-3xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={tone}>{NEXT_IDEA_STAGE_LABEL[item.stage]}</Chip>
                      <span className="text-[11px] text-muted">
                        {item.stage === "sprout"
                          ? "等待认领"
                          : item.stage === "growing"
                            ? `${item.attemptCount} 条承接正在推进`
                            : `${item.workCount} 个作品已交付`}
                      </span>
                    </div>
                    <Link href={`/ideas/${item.idea.id}`} className="mt-3 block text-[18px] font-medium tracking-[-0.025em] hover:text-idea">
                      {item.idea.title}
                    </Link>
                  </div>
                  {item.canManage ? (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label={`编辑${item.idea.title}`}
                        className="rounded-lg p-2 text-muted transition hover:bg-white/6 hover:text-artifact"
                        onClick={() => openEdit(item.idea)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`删除${item.idea.title}`}
                        title={item.canDelete ? "删除下一步" : "已有关注、承接或作品，不能删除"}
                        disabled={!item.canDelete}
                        className="rounded-lg p-2 text-muted transition hover:bg-blocked/10 hover:text-blocked disabled:cursor-not-allowed disabled:opacity-30"
                        onClick={() => {
                          setError(null);
                          setDeleting(item);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-muted">{item.idea.summary}</p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                  <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[11px] text-muted">
                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                    来自 {workTitle}
                  </span>
                  <Button
                    tone={item.stage === "result" ? "ghost" : "active"}
                    className="shrink-0 px-3 py-2"
                    onClick={() => sheets.openAdopt(item.idea)}
                  >
                    {item.stage === "result" ? "继续认领" : "认领下一步"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-line-strong px-6 py-10 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-idea/10 text-idea">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-[16px]">下一步还没有被写出来</h3>
          <p className="mt-2 text-[13px] text-muted">
            {canCreate ? "把作品留下的问题或新的可能公开交出去。" : "作者还没有为这个作品发布下一步。"}
          </p>
        </div>
      )}

      <NextIdeaEditor
        open={editorOpen}
        idea={editing}
        pending={pending}
        error={error}
        onClose={() => setEditorOpen(false)}
        onSubmit={(input) => {
          startTransition(async () => {
            try {
              if (editing) await updateNextIdeaAction(editing.id, input);
              else await createNextIdeaAction(workId, input);
              setEditorOpen(false);
              router.refresh();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "下一步保存失败");
            }
          });
        }}
      />

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="删除这个下一步？"
        subtitle="删除后，它将从作品和公开想法中移除。这个操作不能撤销。"
      >
        <div className="rounded-2xl border border-line bg-white/5 px-4 py-3 text-[14px]">
          {deleting?.idea.title}
        </div>
        {error ? <p className="mt-3 text-[13px] text-blocked">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setDeleting(null)}>取消</Button>
          <Button
            tone="danger"
            disabled={pending}
            onClick={() => {
              if (!deleting) return;
              startTransition(async () => {
                try {
                  await deleteNextIdeaAction(deleting.idea.id);
                  setDeleting(null);
                  router.refresh();
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "删除失败");
                }
              });
            }}
          >
            {pending ? "正在删除…" : "确认删除"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

function NextIdeaEditor({
  open,
  idea,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  idea: Idea | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: { title: string; summary: string; problem: string; whyItMatters: string; desiredOutputs: string[]; stopConditions: string[] }) => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [problem, setProblem] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [criteria, setCriteria] = useState("");
  const [stop, setStop] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(idea?.title ?? "");
    setSummary(idea?.summary ?? "");
    setProblem(idea?.problem ?? "");
    setWhyItMatters(idea?.whyItMatters ?? "");
    setCriteria(idea?.desiredOutputs.join("\n") ?? "");
    setStop(idea?.stopConditions?.join("\n") ?? "");
  }, [open, idea]);

  const canSubmit = Boolean(title.trim() && summary.trim() && problem.trim());
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={idea ? "编辑下一步" : "从这个作品发布下一步"}
      subtitle="发布后立即公开，其他人可以像认领普通想法一样建立自己的实现分支。"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit && !pending) onSubmit({ title, summary, problem, whyItMatters, desiredOutputs: criteria.split("\n").map(s => s.trim()).filter(Boolean), stopConditions: stop.split("\n").map(s => s.trim()).filter(Boolean) });
        }}
      >
        <Field label="下一步标题">
          <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="一句话说清还可以继续做什么" autoFocus />
        </Field>
        <Field label="本轮改什么">
          <TextArea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="描述下一步的方向和可能形态" />
        </Field>
        <Field label="为什么改">
          <TextArea value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="现有作品还留下了什么问题或机会？" />
        </Field>
        <details className="rounded-2xl border border-line p-4">
          <summary className="cursor-pointer text-[13px] text-muted">补充说明与执行条件（可选）</summary>
          <div className="mt-4 flex flex-col gap-4">
        <Field label="补充价值">
          <TextArea value={whyItMatters} onChange={(event) => setWhyItMatters(event.target.value)} placeholder="它会为谁带来什么新的价值？" />
        </Field>
        <Field label="验收标准" hint="每行一项；由你决定，不自动套用上一轮的标准。">
          <TextArea value={criteria} onChange={e => setCriteria(e.target.value)} />
        </Field>
        <Field label="停止条件" hint="每行一项；由你决定。">
          <TextArea value={stop} onChange={e => setStop(e.target.value)} />
        </Field>
          </div>
        </details>
        <p className="text-[12px] leading-relaxed text-muted">自动关联来源作品与上游背景。公开发布 · 允许认领与继续衍生 · 自动保留来源作品</p>
        {error ? <p className="text-[13px] text-blocked">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>取消</Button>
          <Button type="submit" tone="idea" disabled={!canSubmit || pending}>
            {pending ? "正在保存…" : idea ? "保存修改" : "公开发布"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
