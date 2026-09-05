import { PageFrame } from "@/components/chrome/PageFrame";
import { AgentContextPanel } from "@/components/idea/AgentContextPanel";
import { DraftIdeaActions } from "@/components/idea/DraftIdeaActions";
import { IdeaHeader } from "@/components/idea/IdeaHeader";
import { Lineage } from "@/components/idea/Lineage";
import { WorkGallery } from "@/components/idea/WorkGallery";
import { Chip } from "@/components/ui/Chip";
import { IDEA_STATUS_LABEL } from "@/lib/format";
import { getIdeaBundle } from "@/lib/queries";
import Link from "@/components/ui/NavigationLink";
import { notFound } from "next/navigation";
import { sourceContext } from "@/lib/agent-context";
import { GitBranch } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getIdeaBundle(id);
  if (!bundle) notFound();
  const { idea, attempts, works, forks, similar, author, metrics, following, myAttempt, db, currentUserId } =
    bundle;
  const source = sourceContext(db, idea, currentUserId);
  const isOwner = idea.author.userId === currentUserId;

  return (
      <PageFrame
        breadcrumb={
          <span>
            <Link href="/" className="hover:text-artifact">
              发现
            </Link>
            <span className="mx-2">/</span>
            {idea.tags[0] ?? "想法"}
          </span>
        }
      >
        {idea.status === "draft" && isOwner ? <DraftIdeaActions idea={idea} /> : null}
        {idea.parentIdeaId && <div className="evolution-trail"><GitBranch size={15}/>{source ? <><Link href={`/ideas/${source.idea.id}`}>{source.idea.title}</Link><span>↝</span>{source.work ? <Link href={`/works/${source.work.id}${source.work.revision_id ? `?revision=${encodeURIComponent(source.work.revision_id)}#revision-${encodeURIComponent(source.work.revision_id)}` : ""}`}>{source.work.title} · {source.work.revision_number ? `v${source.work.revision_number}` : "历史版本未记录"}</Link> : <span>来源作品暂不可见</span>}<span>↝</span><span>{idea.status === "draft" ? "迭代草稿" : "本轮迭代"}</span></> : <span>来源暂不可见，保留这一步的独立记录。</span>}</div>}
        <IdeaHeader
          idea={idea}
          author={author}
          metrics={metrics}
          following={following}
          myAttemptId={myAttempt?.id}
          isOwner={isOwner}
        />

        <section className="paper-sheet mt-8">
          <h2 className="text-[17px] font-medium">{idea.sourceWorkId ? "为什么改" : "我遇到的问题"}</h2>
          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-7 text-muted">{idea.problem}</p>
          {idea.whyItMatters && <><h3 className="mt-6 text-[14px] font-medium">希望带来的改变</h3><p className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-muted">{idea.whyItMatters}</p></>}
          {(idea.desiredOutputs.length > 0 || (idea.stopConditions?.length ?? 0) > 0) && <div className="mt-6 grid gap-5 sm:grid-cols-2">{[{title:"验收标准",items:idea.desiredOutputs},{title:"停止条件",items:idea.stopConditions ?? []}].filter(s=>s.items.length).map(section=><div key={section.title}><h3 className="text-[13px] font-medium">{section.title}</h3><ul className="mt-2 list-disc pl-5 text-[13px] leading-7 text-muted">{section.items.map((item,index)=><li key={index}>{item}</li>)}</ul></div>)}</div>}
        </section>

        <Lineage
          db={db}
          attempts={attempts}
          works={works}
          currentUserId={currentUserId}
          ideaTitle={idea.title}
        />

        <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <WorkGallery works={works} />
          <div className="xl:pt-16">
            <AgentContextPanel idea={idea} />
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-[18px] font-semibold tracking-[-0.03em]">衍生想法</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {forks.map((fork) => (
              <Link key={fork.id} href={`/ideas/${fork.id}`} className="paper-summary paper-progress lift pressable">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[14.5px] tracking-[-0.02em]">{fork.title}</div>
                  <Chip>{IDEA_STATUS_LABEL[fork.status]}</Chip>
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] text-muted">{fork.summary}</p><p className="mt-3 text-[11px] text-muted">基于 {db.works.find(w => w.id === fork.sourceWorkId)?.title || "历史来源"} · {fork.sourceWorkRevisionId ? `v${db.works.find(w => w.id === fork.sourceWorkId)?.revisions?.find(r => r.id === fork.sourceWorkRevisionId)?.number ?? "?"}` : "版本未记录"}</p>
              </Link>
            ))}
          </div>
        </section>

        {similar.length ? (
          <section className="mt-10">
            <h2 className="text-[18px] font-semibold tracking-[-0.03em]">相似或可能重复</h2>
            <p className="mt-1 text-[13px] text-muted">
              平台不会粗暴删除相似想法，你可以声明关联。
            </p>
            <div className="mt-4 space-y-2">
              {similar.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href={`/ideas/${item.id}`}
                  className="row-hover flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-[14px]"
                >
                  <span>{item.title}</span>
                  <span className="text-[12px] text-muted">{item.author.displayName}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </PageFrame>
  );
}
