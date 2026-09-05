import { PageFrame } from "@/components/chrome/PageFrame";
import { AgentExecutionPanel } from "@/components/idea/AgentExecutionPanel";
import { AgentSetupPanel } from "@/components/idea/AgentSetupPanel";
import { Chip } from "@/components/ui/Chip";
import { CoverImage } from "@/components/ui/CoverImage";
import {
  ATTEMPT_STATUS_LABEL,
  effectiveAttemptStatus,
  formatDateTime,
} from "@/lib/format";
import { getAttemptBundle } from "@/lib/queries";
import Link from "@/components/ui/NavigationLink";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAttemptBundle(id);
  if (!bundle) notFound();
  const { attempt, idea, owner, works, currentUserId } = bundle;
  const status = effectiveAttemptStatus(attempt);
  const mine = attempt.ownerId === currentUserId;
  const statusTone =
    status === "published"
      ? "artifact"
      : status === "paused" || status === "stalled" || status === "abandoned"
        ? "mute"
        : "active";

  return (
      <PageFrame
        breadcrumb={
          <span>
            <Link href="/attempts" className="hover:text-artifact">
              承接中
            </Link>
            <span className="mx-2">/</span>
            {attempt.title}
          </span>
        }
      >
        <div className="paper-sheet flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] font-semibold tracking-[-0.04em]">{attempt.title}</h1>
              <Chip tone={statusTone}>{ATTEMPT_STATUS_LABEL[status]}</Chip>
            </div>
            <p className="mt-2 text-[14px] text-muted">
              来源{" "}
              <Link href={`/ideas/${idea.id}`} className="text-idea">
                {idea.title}
              </Link>
              {" · "}
              {owner.displayName}
            </p>
          </div>
        </div>
        {idea.status === "draft" ? (
          <div className="mt-5 rounded-2xl border border-idea/25 bg-idea/7 px-4 py-3 text-[13px] text-muted">
            当前项目属于想法草稿。状态、进展与作品会正常保存，但在想法发布前仅草稿作者可见。
          </div>
        ) : null}
        <p className="mt-5 max-w-3xl text-[14.5px] leading-relaxed text-artifact/90">
          {attempt.approach}
        </p>
        <div className="mt-4 text-[13px] text-muted">
          开始于 {formatDateTime(attempt.startedAt)} · 最近活动 {formatDateTime(attempt.lastActiveAt)}
        </div>
        <section className="paper-summary paper-progress mt-6 max-w-3xl">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[15px] font-medium tracking-[-0.02em]">最新进展</h2>
            <span className="text-[12px] text-muted">
              {formatDateTime(attempt.lastActiveAt)}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-artifact/90">
            {attempt.progressNote || "Agent 尚未同步进展。"}
          </p>
        </section>
        {mine ? <AgentSetupPanel attemptId={attempt.id} derived={Boolean(idea.parentIdeaId)} /> : null}
        {mine ? <AgentExecutionPanel attempt={attempt} idea={idea} /> : null}
        {attempt.blockers.length ? (
          <div className="mt-4 text-[13.5px] text-blocked">阻塞：{attempt.blockers.join("；")}</div>
        ) : null}

        {works.length ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {works.map((work) => (
              <Link key={work.id} href={`/works/${work.id}`} className="glass lift media-zoom overflow-hidden rounded-2xl">
                <CoverImage src={work.coverUrl} pageUrl={work.externalUrl} className="h-28 w-full object-cover" />
                <div className="p-3 text-[14px]">{work.title}</div>
              </Link>
            ))}
          </div>
        ) : null}

      </PageFrame>
  );
}
