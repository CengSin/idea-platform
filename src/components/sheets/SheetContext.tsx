"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import {
  adoptIdeaAction,
  publishIdeaAction,
  saveIdeaDraftAction,
  updateIdeaDraftAction,
} from "@/lib/actions";
import {
  buildAdoptionPrompt,
  buildIdeaContext,
  VISIBILITY_LABEL,
} from "@/lib/format";
import type { Idea, License, Visibility } from "@/lib/types";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

type Ctx = {
  openPublishIdea: () => void;
  openEditIdea: (idea: Idea) => void;
  openAdopt: (idea: Idea) => void;
};

const SheetCtx = createContext<Ctx | null>(null);

export function useSheets() {
  const ctx = useContext(SheetCtx);
  if (!ctx) throw new Error("useSheets must be used within SheetProvider");
  return ctx;
}

const defaultLicense: License = {
  implementation: true,
  derivatives: true,
  commercialUse: "with_attribution",
};

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [publishIdea, setPublishIdea] = useState<Idea | true | null>(null);
  const [adopt, setAdopt] = useState<Idea | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const value = useMemo<Ctx>(
    () => ({
      openPublishIdea: () => {
        setError(null);
        setPublishIdea(true);
      },
      openEditIdea: (idea) => {
        setError(null);
        setPublishIdea(idea);
      },
      openAdopt: (idea) => {
        setError(null);
        setAdopt(idea);
      },
    }),
    [],
  );

  return (
    <SheetCtx.Provider value={value}>
      {children}
      <PublishIdeaDialog
        idea={publishIdea === true ? null : publishIdea}
        open={Boolean(publishIdea)}
        error={error}
        pending={pending}
        onClose={() => setPublishIdea(null)}
        onSubmit={(form, intent) => {
          start(async () => {
            try {
              const editing = publishIdea !== true ? publishIdea : null;
              const input = {
                title: form.title,
                summary: form.summary,
                problem: form.problem,
                whyItMatters: form.whyItMatters || form.problem,
                constraints: editing?.constraints ?? [],
                openQuestions: editing?.openQuestions ?? [],
                desiredOutputs: editing?.desiredOutputs ?? [],
                tags: editing?.tags ?? [],
                visibility: editing?.visibility ?? "public" as const,
                license: editing?.license ?? defaultLicense,
                existingAttempts: editing?.existingAttempts ?? [],
                viaAgent: editing?.author.kind === "agent",
              };
              const result = editing
                ? await updateIdeaDraftAction(editing.id, input)
                : intent === "draft"
                  ? await saveIdeaDraftAction(input)
                  : await publishIdeaAction(input);
              setPublishIdea(null);
              router.push(`/ideas/${result.idea_id}`);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "发布失败");
            }
          });
        }}
      />
      <AdoptDialog
        idea={adopt}
        error={error}
        pending={pending}
        onClose={() => setAdopt(null)}
        onSubmit={(form) => {
          if (!adopt) return;
          start(async () => {
            try {
              const result = await adoptIdeaAction({
                ideaId: adopt.id,
                title: form.title,
                approach: form.approach,
                projectDescription: form.projectDescription,
                projectPurpose: form.projectPurpose,
                visibility: form.visibility,
                targetDate: form.targetDate || undefined,
                asWatch: form.asWatch,
              });
              setAdopt(null);
              router.push(`/attempts/${result.attempt_id}`);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "承接失败");
            }
          });
        }}
      />
    </SheetCtx.Provider>
  );
}

function PublishIdeaDialog({
  idea,
  open,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  idea: Idea | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (
    form: { title: string; summary: string; problem: string; whyItMatters: string },
    intent: "draft" | "publish",
  ) => void;
  pending: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [problem, setProblem] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(idea?.title ?? "");
    setSummary(idea?.summary ?? "");
    setProblem(idea?.problem ?? "");
    setWhyItMatters(idea?.whyItMatters ?? "");
  }, [open, idea]);

  const canSave = Boolean(title.trim());
  const canPublish = Boolean(title.trim() && summary.trim() && problem.trim());

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={idea ? "编辑想法草稿" : "创建一个想法"}
      subtitle="可以先保存为草稿，在草稿中创建项目、生成 AGENTS.md 和持续同步进展；准备好后再统一发布。"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canPublish && !idea) onSubmit({ title, summary, problem, whyItMatters }, "publish");
        }}
      >
        <Field label="标题">
          <TextInput
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="用一句话说出你的想法"
            autoFocus
          />
        </Field>
        <Field label="简要描述">
          <TextArea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="它大概是什么，会怎样运作？"
          />
        </Field>
        <Field label="想解决的问题">
          <TextArea
            value={problem}
            onChange={(event) => setProblem(event.target.value)}
            placeholder="现在有什么不方便、不合理或尚未被满足？"
          />
        </Field>
        <Field label="为什么值得做（可选）">
          <TextArea
            value={whyItMatters}
            onChange={(event) => setWhyItMatters(event.target.value)}
            placeholder="它为什么重要，会给谁带来什么改变？"
          />
        </Field>
        <p className="text-[12px] leading-relaxed text-muted">
          草稿及其项目、进展和作品只对你可见。发布草稿后，这些内容会按各自的公开设置一起发布。
        </p>
        {error ? <p className="text-[13px] text-blocked">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>取消</Button>
          <Button
            type="button"
            disabled={!canSave || pending}
            onClick={() => onSubmit({ title, summary, problem, whyItMatters }, "draft")}
          >
            {pending ? "正在保存…" : idea ? "保存修改" : "保存草稿"}
          </Button>
          {!idea ? (
            <Button
              type="button"
              tone="idea"
              disabled={!canPublish || pending}
              onClick={() => onSubmit({ title, summary, problem, whyItMatters }, "publish")}
            >
              {pending ? "正在发布…" : "直接发布"}
            </Button>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}

type AdoptForm = {
  title: string;
  approach: string;
  projectDescription: string;
  projectPurpose: string;
  visibility: Visibility;
  targetDate: string;
  asWatch?: boolean;
};

function AdoptDialog({
  idea,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  idea: Idea | null;
  onClose: () => void;
  onSubmit: (form: AdoptForm) => void;
  pending: boolean;
  error: string | null;
}) {
  const [step, setStep] = useState<"form" | "preview">("form");
  const [title, setTitle] = useState("");
  const [approach, setApproach] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectPurpose, setProjectPurpose] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [targetDate, setTargetDate] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStep("form");
    setTitle("");
    setApproach("");
    setProjectDescription(idea?.summary ?? "");
    setProjectPurpose(idea?.whyItMatters ?? "");
    setVisibility("public");
    setTargetDate("");
    setCopied(false);
  }, [idea?.id]);

  const prompt = idea
    ? buildAdoptionPrompt(idea, { projectDescription, projectPurpose, approach })
    : "";

  return (
    <Dialog
      open={Boolean(idea)}
      onClose={onClose}
      title="承接这个想法"
      subtitle="承接不产生排他所有权。创建分支后可下载 AGENTS.md，在任意 Agent 中启动开发。"
      wide
    >
      {idea && step === "form" ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-white/5 px-4 py-3">
            <div className="text-[12px] text-muted">来源 Idea</div>
            <div className="mt-1 text-[15px] tracking-[-0.02em]">{idea.title}</div>
          </div>
          <Field label="这条分支的实现方向">
            <TextInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：先做一个可验证的最小版本"
            />
          </Field>
          <Field label="计划如何实现，与其他分支有何不同">
            <TextArea
              value={approach}
              onChange={(event) => setApproach(event.target.value)}
              placeholder="可以留空，之后由 Agent 调研并提出方案。"
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="项目描述" hint="会写入 AGENTS.md，默认取自 Idea 简介。">
              <TextArea
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
              />
            </Field>
            <Field label="项目目的" hint="说明为什么做，以及希望产生什么改变。">
              <TextArea
                value={projectPurpose}
                onChange={(event) => setProjectPurpose(event.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="公开程度">
              <Select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as Visibility)}
              >
                {Object.entries(VISIBILITY_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="目标日期（可选）">
              <TextInput
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
              />
            </Field>
          </div>
          {error ? <p className="text-[13px] text-blocked">{error}</p> : null}
          <div className="mt-1 flex justify-between gap-2">
            <Button
              type="button"
              tone="quiet"
              onClick={() =>
                onSubmit({
                  title: title || "观察中",
                  approach: approach || "先观察这个想法的演化。",
                  projectDescription,
                  projectPurpose,
                  visibility,
                  targetDate,
                  asWatch: true,
                })
              }
            >
              先关注，不正式承接
            </Button>
            <div className="flex gap-2">
              <Button type="button" onClick={onClose}>取消</Button>
              <Button type="button" tone="idea" onClick={() => setStep("preview")}>
                预览承接内容
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {idea && step === "preview" ? (
        <div className="flex flex-col gap-4">
          <PreviewBlock label="Idea Context">
            <pre className="overflow-auto text-[12px] leading-relaxed text-artifact/85">
              {JSON.stringify(buildIdeaContext(idea), null, 2)}
            </pre>
          </PreviewBlock>
          <PreviewBlock label="你的承接分支">
            <p>方向：{title || "未命名分支"}</p>
            <p>路径：{approach || "交给 Agent 调研后确定"}</p>
            <p>可见性：{VISIBILITY_LABEL[visibility]}</p>
          </PreviewBlock>
          <PreviewBlock label="项目提示词预览">
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-artifact/85">
              {prompt}
            </pre>
          </PreviewBlock>
          {error ? <p className="text-[13px] text-blocked">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(prompt);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
            >
              {copied ? "已复制" : "复制提示词"}
            </Button>
            <Button type="button" onClick={() => setStep("form")}>返回修改</Button>
            <Button
              type="button"
              tone="idea"
              disabled={pending}
              onClick={() =>
                onSubmit({
                  title,
                  approach,
                  projectDescription,
                  projectPurpose,
                  visibility,
                  targetDate,
                })
              }
            >
              {pending ? "正在创建…" : "确认承接"}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function PreviewBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-black/15 px-4 py-3">
      <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="space-y-1 text-[13.5px] leading-relaxed text-artifact/90">{children}</div>
    </div>
  );
}
