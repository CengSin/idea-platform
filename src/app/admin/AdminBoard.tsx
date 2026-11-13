"use client";

import { Eye, EyeOff, Lock, NotebookPen, Pin, Search } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { updateProjectAction } from "@/app/actions";
import { LanguageLabel, StatusLabel } from "@/components/ProjectMeta";
import { Sparkline } from "@/components/Sparkline";
import { Button } from "@/components/ui/Button";
import { cx, formatDateTime } from "@/lib/format";
import {
  FEATURED_MIN_SCORE,
  NOTE_MAX,
  TAGLINE_MAX,
  displayPitch,
  featuredProjects,
  isPublicProject,
  lastActivityAt,
  needsCuration,
  projectStatus,
} from "@/lib/projects";
import type { OwnerPatch, Project } from "@/lib/types";

type Filter = "all" | "featured" | "active" | "uncurated" | "private" | "hidden" | "other";
type Sort = "score" | "recent";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "featured", label: "公开精选" },
  { key: "active", label: "推进中" },
  { key: "uncurated", label: "待评选" },
  { key: "private", label: "私有" },
  { key: "hidden", label: "已隐藏" },
  { key: "other", label: "Fork / 已移除" },
];

function isOwn(project: Project) {
  return !project.isFork && !project.removedAt;
}

export function AdminBoard({ projects }: { projects: Project[] }) {
  const [items, setItems] = useState(projects);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("score");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, start] = useTransition();

  useEffect(() => setItems(projects), [projects]);

  const featuredIds = useMemo(() => new Set(featuredProjects(items).map((project) => project.id)), [items]);

  const counts = useMemo(() => {
    const result = {} as Record<Filter, number>;
    for (const { key } of FILTERS) result[key] = items.filter((project) => matches(project, key)).length;
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, featuredIds]);

  function matches(project: Project, key: Filter) {
    switch (key) {
      case "all":
        return isOwn(project);
      case "featured":
        return featuredIds.has(project.id);
      case "active":
        return isOwn(project) && projectStatus(project) === "active";
      case "uncurated":
        return needsCuration(project);
      case "private":
        return isOwn(project) && project.isPrivate;
      case "hidden":
        return isOwn(project) && project.hidden;
      case "other":
        return !isOwn(project);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((project) => matches(project, filter))
      .filter(
        (project) =>
          !q ||
          [project.name, project.description, project.tagline, project.note, project.curation?.pitch, ...project.topics]
            .filter(Boolean)
            .some((text) => text!.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        sort === "score"
          ? (b.curation?.score ?? -1) - (a.curation?.score ?? -1) || lastActivityAt(b).localeCompare(lastActivityAt(a))
          : lastActivityAt(b).localeCompare(lastActivityAt(a)),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, sort, query, featuredIds]);

  function update(id: string, patch: OwnerPatch, onDone?: (ok: boolean) => void) {
    const before = items;
    setError("");
    setItems((current) => current.map((project) => (project.id === id ? { ...project, ...patch } : project)));
    start(async () => {
      const result = await updateProjectAction(id, patch);
      if (!result.ok) {
        setItems(before);
        setError(result.error);
      }
      onDone?.(result.ok);
    });
  }

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="筛选项目" className="-mx-1 flex flex-wrap gap-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={cx(
                "rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors",
                filter === key ? "bg-artifact text-white" : "text-muted hover:bg-[#efeee8] hover:text-artifact",
              )}
            >
              {label}
              <span className={cx("ml-1 tabular-nums", filter === key ? "text-white/70" : "text-[#a8a79f]")}>{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative flex-1 lg:w-56 lg:flex-none">
            <span className="sr-only">搜索项目</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索名称、简介、笔记"
              className="w-full rounded-xl border border-line-strong bg-surface py-2 pl-8 pr-3 text-[13px] outline-none focus:border-idea"
            />
          </label>
          <label className="text-[12.5px] text-muted">
            <span className="sr-only">排序</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="rounded-xl border border-line-strong bg-surface px-2.5 py-2 text-[13px] text-artifact"
            >
              <option value="score">按想象力</option>
              <option value="recent">按最近活动</option>
            </select>
          </label>
        </div>
      </div>

      {error ? <p role="alert" className="mt-3 text-[12.5px] text-blocked">{error}</p> : null}

      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
        {visible.length === 0 ? (
          <li className="p-8 text-center text-[13px] text-muted">
            {items.length === 0 ? "还没有项目，点右上角「从 GitHub 同步」。" : "没有符合条件的项目。"}
          </li>
        ) : null}
        {visible.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            featured={featuredIds.has(project.id)}
            expanded={open === project.id}
            onToggle={() => setOpen(open === project.id ? null : project.id)}
            onUpdate={(patch, onDone) => update(project.id, patch, onDone)}
          />
        ))}
      </ul>
    </section>
  );
}

function ScoreBadge({ project }: { project: Project }) {
  const score = project.curation?.score;
  if (score === undefined) return <span className="w-9 text-center text-[11px] text-[#b5b4ac]">未评</span>;
  const tone = score >= FEATURED_MIN_SCORE ? "bg-[#fdf0eb] text-idea-deep border-[#f0c4b6]" : score >= 40 ? "bg-[#f1f0eb] text-artifact border-line" : "bg-transparent text-muted border-line";
  return (
    <span title={`想象力 ${score}`} className={cx("w-9 rounded-lg border py-0.5 text-center font-mono text-[12px] tabular-nums", tone)}>
      {score}
    </span>
  );
}

function IconToggle({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(
        "rounded-lg p-1.5 transition-colors",
        active ? "bg-[#fdf0eb] text-idea-deep" : "text-muted hover:bg-[#efeee8] hover:text-artifact",
      )}
    >
      {children}
    </button>
  );
}

function ProjectItem({
  project,
  featured,
  expanded,
  onToggle,
  onUpdate,
}: {
  project: Project;
  featured: boolean;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: OwnerPatch, onDone?: (ok: boolean) => void) => void;
}) {
  const own = isOwn(project);
  return (
    <li className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3 sm:pt-0.5">
          <ScoreBadge project={project} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <a href={project.url} target="_blank" rel="noreferrer" className="break-all text-[14.5px] font-semibold hover:text-idea-deep">
              {project.name}
            </a>
            {project.isPrivate ? <Lock className="h-3.5 w-3.5 text-muted" aria-label="私有仓库" /> : null}
            {featured ? <span className="rounded-md bg-[#fdf0eb] px-1.5 text-[11px] text-idea-deep">公开精选</span> : null}
            {project.isFork ? <span className="rounded-md bg-[#efeee8] px-1.5 text-[11px] text-muted">Fork</span> : null}
            {project.removedAt ? <span className="rounded-md bg-rose-50 px-1.5 text-[11px] text-rose-700">已不在 GitHub</span> : null}
            {project.hidden ? <span className="rounded-md bg-[#efeee8] px-1.5 text-[11px] text-muted">已隐藏</span> : null}
            {project.curation && needsCuration(project) ? <span className="rounded-md bg-[#fbf3e1] px-1.5 text-[11px] text-[#8a6416]">有新推送，待重评</span> : null}
          </div>
          <p className="mt-1 text-[13px] leading-6 text-[#55554f]">{displayPitch(project) || "（暂无简介）"}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
            <StatusLabel project={project} />
            <LanguageLabel language={project.language} />
            {project.note ? <span className="inline-flex items-center gap-1 text-active-deep"><NotebookPen className="h-3 w-3" aria-hidden />有笔记</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:pt-0.5">
          <Sparkline weekly={project.activity?.weekly} width={84} className="mr-2" />
          {own ? (
            <>
              <IconToggle
                active={project.pinned}
                label={project.isPrivate ? "私有仓库不会公开展示" : project.pinned ? "取消置顶" : "置顶到公开精选"}
                onClick={() => !project.isPrivate && onUpdate({ pinned: !project.pinned })}
              >
                <Pin className={cx("h-4 w-4", project.pinned && "fill-current")} />
              </IconToggle>
              <IconToggle
                active={project.hidden}
                label={project.hidden ? "在公开页显示" : "在公开页隐藏"}
                onClick={() => onUpdate({ hidden: !project.hidden })}
              >
                {project.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </IconToggle>
            </>
          ) : null}
          <IconToggle active={expanded} label="笔记与评选详情" onClick={onToggle}>
            <NotebookPen className="h-4 w-4" />
          </IconToggle>
        </div>
      </div>
      {expanded ? <ProjectEditor project={project} onUpdate={onUpdate} /> : null}
    </li>
  );
}

function ProjectEditor({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (patch: OwnerPatch, onDone?: (ok: boolean) => void) => void;
}) {
  const [tagline, setTagline] = useState(project.tagline);
  const [note, setNote] = useState(project.note);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const dirty = tagline !== project.tagline || note !== project.note;

  return (
    <div className="mt-4 grid gap-4 rounded-xl bg-canvas p-4 sm:ml-12 md:grid-cols-[1fr_1.2fr]">
      <div className="text-[12.5px] leading-6">
        <p className="font-medium">Claude 的评选</p>
        {project.curation ? (
          <>
            <p className="mt-1 text-artifact">{project.curation.pitch}</p>
            <p className="mt-1 text-muted">{project.curation.reason}</p>
            <p className="mt-1 text-[11.5px] text-[#a8a79f]">评选于 {formatDateTime(project.curation.curatedAt)}</p>
          </>
        ) : (
          <p className="mt-1 text-muted">还没评选。本地运行 npm run curate。</p>
        )}
        {project.activity?.lastCommitMessage ? (
          <>
            <p className="mt-3 font-medium">最近提交</p>
            <p className="mt-1 break-words font-mono text-[11.5px] text-muted">{project.activity.lastCommitMessage}</p>
            <p className="text-[11.5px] text-[#a8a79f]">近 30 天 {project.activity.commits30d} 次提交</p>
          </>
        ) : null}
        {isPublicProject(project) ? null : (
          <p className="mt-3 text-[11.5px] text-muted">此项目不会出现在公开页（私有、Fork、隐藏或已移除）。</p>
        )}
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved("saving");
          onUpdate({ tagline, note }, (ok) => setSaved(ok ? "saved" : "idle"));
        }}
      >
        <label className="flex flex-col gap-1 text-[12.5px] font-medium">
          公开一句话
          <input
            value={tagline}
            maxLength={TAGLINE_MAX}
            onChange={(event) => { setTagline(event.target.value); setSaved("idle"); }}
            placeholder={project.curation?.pitch || project.description || "留空则使用评选结果或 GitHub 简介"}
            className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] font-normal outline-none focus:border-idea"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-medium">
          私人笔记
          <textarea
            value={note}
            maxLength={NOTE_MAX}
            rows={5}
            onChange={(event) => { setNote(event.target.value); setSaved("idle"); }}
            placeholder="它真正想解决什么？做到哪了？下一步想试什么？（只有你能看到）"
            className="resize-y rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] font-normal leading-6 outline-none focus:border-idea"
          />
        </label>
        <div className="flex items-center gap-3">
          <Button tone="idea" type="submit" disabled={!dirty || saved === "saving"} className="px-3 py-1.5 text-[12.5px]">
            {saved === "saving" ? "保存中…" : "保存"}
          </Button>
          {saved === "saved" && !dirty ? <span role="status" className="text-[12px] text-active-deep">已保存</span> : null}
        </div>
      </form>
    </div>
  );
}
