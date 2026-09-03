import { PageFrame } from "@/components/chrome/PageFrame";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { WorkActions } from "@/components/idea/WorkActions";
import { AgentUpgradePanel } from "@/components/idea/AgentUpgradePanel";
import { NextIdeas } from "@/components/idea/NextIdeas";
import { formatDate, formatLicense, WORK_TYPE_LABEL } from "@/lib/format";
import { getWorkBundle } from "@/lib/queries";
import { ExternalLink } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
            <div className="media-zoom overflow-hidden rounded-[28px]">
              <CoverImage src={work.coverUrl} pageUrl={work.externalUrl} className="h-[340px] w-full object-cover" />
            </div>
            <h1 className="mt-6 text-[32px] font-semibold tracking-[-0.04em]">{work.title}</h1>
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
        <NextIdeas
          workId={work.id}
          workTitle={work.title}
          items={nextIdeas}
          canCreate={bundle.canManage}
        />
      </PageFrame>
  );
}
