import { PageFrame } from "@/components/chrome/PageFrame";
import { EmailCard } from "@/components/profile/EmailCard";
import { ProjectLinkForm } from "@/components/profile/ProjectLinkForm";
import { RemoveProjectLink } from "@/components/profile/RemoveProjectLink";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import {
  ATTEMPT_STATUS_LABEL,
  IDEA_STATUS_LABEL,
  WORK_TYPE_LABEL,
  displayHost,
  effectiveAttemptStatus,
  formatDate,
} from "@/lib/format";
import { getProfile } from "@/lib/queries";
import {
  ArrowUpRight,
  GitBranch,
  LayoutGrid,
  Lightbulb,
  Link2,
} from "lucide-react";
import Link from "@/components/ui/NavigationLink";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { me, email, joinedAt, ideas, attempts, works, projectLinks } =
    await getProfile();
  const platformCount = ideas.length + attempts.length + works.length;
  const total = projectLinks.length + platformCount;

  return (
    <PageFrame>
      <h1 className="text-[28px] font-semibold tracking-[-0.04em]">我的开放笔记本</h1>
      <p className="mt-1 text-[13.5px] text-muted">
        记录我提出的问题、参与的实现，以及一路带回来的作品。
      </p>

      <section className="journal fade-up mt-8 flex max-w-2xl items-center gap-5 border-y border-line py-8">
        <Avatar initials={me.initials} accent={me.accent} size={56} />
        <div className="min-w-0">
          <div className="text-[18px] tracking-[-0.02em]">{me.displayName}</div>
          <p className="mt-1 line-clamp-2 text-[13.5px] text-muted">{me.bio}</p>
          <p className="mt-2 text-[12px] text-muted">加入于 {formatDate(joinedAt)}</p>
        </div>
      </section>

      <div className="mt-4 max-w-2xl">
        <EmailCard email={email} />
      </div>

      <section className="mt-8 max-w-2xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.03em]">我的想法与行动</h2>
            <p className="mt-1 text-[13.5px] text-muted">
              分享是一个起点，每一次动手都让想法更进一步。
            </p>
          </div>
          <span className="text-[12px] text-muted">{total} 个连接</span>
        </div>

        <div className="glass mt-5 rounded-3xl p-5">
          <div className="text-[12px] tracking-[0.08em] text-muted">添加外部项目</div>
          <ProjectLinkForm />
        </div>

        <div className="stagger-in mt-4 space-y-2">
          {projectLinks.map((link) => (
            <div
              key={link.id}
              className="glass lift flex items-center gap-4 rounded-2xl px-5 py-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-idea/10 text-idea">
                <Link2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 tracking-[-0.02em] hover:text-idea"
                >
                  {link.title}
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                </a>
                <p className="mt-0.5 truncate text-[12px] text-muted">
                  {displayHost(link.url)}
                  {link.note ? ` · ${link.note}` : ""}
                </p>
              </div>
              <Chip>外部</Chip>
              <RemoveProjectLink linkId={link.id} />
            </div>
          ))}

          <h3 className="pt-8 pb-3 text-lg">我提出的想法 · {ideas.length}</h3>
          {ideas.map((idea) => (
            <Link
              key={idea.id}
              href={`/ideas/${idea.id}`}
              className="glass lift flex items-center gap-4 rounded-2xl px-5 py-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-idea/10 text-idea">
                <Lightbulb className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="tracking-[-0.02em]">{idea.title}</div>
                <p className="mt-0.5 truncate text-[12px] text-muted">{idea.summary}</p>
              </div>
              <Chip tone="idea">{IDEA_STATUS_LABEL[idea.status]}</Chip>
            </Link>
          ))}

          <h3 className="pt-8 pb-3 text-lg">我参与的实现 · {attempts.length}</h3>
          {attempts.map((attempt) => {
            const status = effectiveAttemptStatus(attempt);
            return (
              <Link
                key={attempt.id}
                href={`/attempts/${attempt.id}`}
                className="glass lift flex items-center gap-4 rounded-2xl px-5 py-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-active/10 text-active">
                  <GitBranch className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="tracking-[-0.02em]">{attempt.title}</div>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {attempt.approach}
                  </p>
                </div>
                <Chip
                  tone={
                    status === "published"
                      ? "artifact"
                      : status === "stalled" || status === "paused"
                        ? "mute"
                        : "active"
                  }
                >
                  {ATTEMPT_STATUS_LABEL[status]}
                </Chip>
              </Link>
            );
          })}

          <h3 className="pt-8 pb-3 text-lg">我带回的作品 · {works.length}</h3>
          {works.map((work) => (
            <div
              key={work.id}
              className="glass lift flex items-center gap-4 rounded-2xl px-5 py-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-artifact/10 text-artifact">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/works/${work.id}`} className="tracking-[-0.02em]">
                  {work.title}
                </Link>
                <p className="mt-0.5 truncate text-[12px] text-muted">
                  {[work.externalUrl, work.repositoryUrl]
                    .filter(Boolean)
                    .map((url) => displayHost(url!))
                    .join(" · ") || work.summary}
                </p>
              </div>
              <Chip>{WORK_TYPE_LABEL[work.type]}</Chip>
              {work.externalUrl ? (
                <a
                  href={work.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pressable rounded-lg p-2 text-muted hover:bg-white/6 hover:text-idea"
                  aria-label="打开作品站点"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          ))}

          {total === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-5 py-12 text-center text-[13.5px] text-muted">
              还没有项目连接。添加一个外部链接，或先去发布想法、承接项目。
            </div>
          ) : null}
        </div>
      </section>
    </PageFrame>
  );
}
