import { currentWorkRevision } from "@/lib/work-revisions";
import { PageFrame } from "@/components/chrome/PageFrame";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { WorkActions } from "@/components/idea/WorkActions";
import { AgentUpgradePanel } from "@/components/idea/AgentUpgradePanel";
import { NextIdeas } from "@/components/idea/NextIdeas";
import { IdeaAgentPanel } from "@/components/idea/IdeaAgentPanel";
import { formatDate, formatLicense, WORK_TYPE_LABEL } from "@/lib/format";
import { getWorkBundle } from "@/lib/queries";
import { ExternalLink } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  const { id } = await params;
  const { revision: requestedRevision } = await searchParams;
  const bundle = await getWorkBundle(id);
  if (!bundle) notFound();
  const { work, idea, attempt, nextIdeas } = bundle;

  return (
      <PageFrame
        breadcrumb={
          <span>
            <Link href="/works" className="hover:text-artifact">
              作品
            </Link>
            <span className="mx-2">/</span>
            {work.title}
          </span>
        }
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div>
            <div className="paper-photo">
              <CoverImage src={work.coverUrl} pageUrl={work.externalUrl} className="h-[340px] w-full object-cover" />
            </div>
            <p className="mt-5 text-[11px] tracking-widest text-muted">作品 · v{currentWorkRevision(work).number}</p>
            <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em]">{work.title}</h1>
            {idea.status === "draft" ? (
              <div className="mt-4 rounded-2xl border border-idea/25 bg-idea/7 px-4 py-3 text-[13px] text-muted">
                作品已保存到草稿项目，将在来源想法发布时一起对外可见。
              </div>
            ) : null}
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{work.summary}</p>
            {work.externalUrl ? (
              <a href={work.externalUrl} className="mt-5 inline-flex" target="_blank" rel="noreferrer">
                <Button tone="idea">
                  <ExternalLink className="h-4 w-4" />
                  打开作品
                </Button>
              </a>
            ) : null}
          </div>
          <aside className="space-y-4">
            {bundle.canManage ? <WorkActions work={work} /> : null}
            {bundle.canManage ? <AgentUpgradePanel attemptId={attempt.id} derived={Boolean(idea.parentIdeaId)} /> : null}
            <div className="glass rounded-3xl p-5">
              <div className="text-[12px] tracking-[0.08em] text-muted">来源想法</div>
              <Link href={`/ideas/${idea.id}`} className="mt-2 block text-[16px] tracking-[-0.02em]">
                {idea.title}
              </Link>
              <div className="mt-3 text-[13px] text-muted">
                实现轨道{" "}
                <Link href={`/attempts/${attempt.id}`} className="text-active">
                  {attempt.title}
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip>{WORK_TYPE_LABEL[work.type]}</Chip>
                <Chip tone="artifact">{work.publishedAt ? formatDate(work.publishedAt) : "草稿"}</Chip>
              </div>
            </div>
            <div className="glass rounded-3xl p-5">
              <div className="text-[12px] tracking-[0.08em] text-muted">贡献</div>
              <ul className="mt-3 space-y-2 text-[13.5px]">
                {work.credits.map((c, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{c.name}</span>
                    <span className="text-muted">
                      {c.role}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12.5px] text-muted">{formatLicense(work.license)}</p>
            </div>
          </aside>
        </div>
        <details className="revision-history paper-sheet mt-8" open={Boolean(requestedRevision)}>
          <summary>作品版本 · {work.revisions?.length || 1} 份记录</summary>
          <ol>{(work.revisions?.length ? [...work.revisions].reverse() : [currentWorkRevision(work)]).map(revision => <li key={revision.id} id={`revision-${revision.id}`} className={requestedRevision === revision.id ? "revision-selected" : undefined}><strong>v{revision.number} · {revision.title}</strong><span className="ml-3 text-[11px] text-muted">{revision.recordedAt ? formatDate(revision.recordedAt) : "现有作品，历史未记录"}</span><p>{revision.summary}</p>{revision.repositoryUrl && <a className="text-active text-[12px]" href={revision.repositoryUrl} target="_blank" rel="noreferrer">查看此版本记录的仓库 ↗</a>}</li>)}</ol>
          <p className="text-[11px] text-muted">版本记录保存作品说明与链接；链接所指的网站或仓库内容可能继续更新。</p>
        </details>
        {bundle.canManage ? <IdeaAgentPanel work={work} /> : null}
        <NextIdeas
          workId={work.id}
          workTitle={work.title}
          items={nextIdeas}
          canCreate={bundle.canManage}
        />
      </PageFrame>
  );
}
