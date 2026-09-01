"use client";

import { SproutIcon } from "@/components/icons";
import { useSheets } from "@/components/sheets/SheetContext";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { followIdeaAction } from "@/lib/actions";
import { formatDateTime, formatLicense, VISIBILITY_LABEL } from "@/lib/format";
import type { Idea, IdeaMetrics, User } from "@/lib/types";
import { Users } from "lucide-react";
import { useState, useTransition } from "react";

export function IdeaHeader({
  idea,
  author,
  metrics,
  following,
  myAttemptId,
  isOwner = false,
}: {
  idea: Idea;
  author?: User;
  metrics: IdeaMetrics;
  following: boolean;
  myAttemptId?: string;
  isOwner?: boolean;
}) {
  const sheets = useSheets();
  const [on, setOn] = useState(following);
  const [, start] = useTransition();

  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 gap-5">
        <span className="relative mt-1 flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full border border-idea/40 bg-[radial-gradient(circle_at_35%_30%,rgba(232,184,106,0.28),rgba(28,24,20,0.15))] text-idea shadow-[0_0_40px_rgba(232,184,106,0.28)]">
          <span className="idea-halo" />
          <SproutIcon className="h-12 w-12" />
        </span>
        <div className="min-w-0">
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.04em]">
            {idea.title}
          </h1>
          <p className="mt-3 max-w-[640px] text-[14.5px] leading-relaxed text-muted">
            {idea.summary}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            <span>
              by {idea.author.kind === "agent" ? idea.author.displayName : author?.displayName}
            </span>
            <span>·</span>
            <span>{formatDateTime(idea.createdAt)}</span>
            <span>·</span>
            <span>{VISIBILITY_LABEL[idea.visibility]}</span>
            <span>·</span>
            <span>{formatLicense(idea.license)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {idea.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-3">
        <div className="flex gap-2">
          <Button
            tone="idea"
            onClick={() => sheets.openAdopt(idea)}
            disabled={!!myAttemptId}
          >
            <Users className="h-4 w-4" />
            {myAttemptId ? "项目已创建" : idea.status === "draft" && isOwner ? "为草稿创建项目" : "承接这个想法"}
          </Button>
        </div>
        <div className="flex items-center gap-3 text-[13px] text-muted">
          <span>
            {metrics.totalAttemptCount} 人承接 · {metrics.workCount} 个作品 · {metrics.forkCount}{" "}
            次衍生
          </span>
          {idea.status !== "draft" ? <button
            type="button"
            className="text-idea"
            onClick={() => {
              const next = !on;
              setOn(next);
              start(() => followIdeaAction(idea.id, next));
            }}
          >
            {on ? "已关注" : "关注"}
          </button> : null}
        </div>
      </div>
    </header>
  );
}
