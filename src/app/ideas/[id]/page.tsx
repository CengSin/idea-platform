import { PageFrame } from "@/components/chrome/PageFrame";
import { AgentContextPanel } from "@/components/idea/AgentContextPanel";
import { IdeaHeader } from "@/components/idea/IdeaHeader";
import { Lineage, LineageRail } from "@/components/idea/Lineage";
import { WorkGallery } from "@/components/idea/WorkGallery";
import { Chip } from "@/components/ui/Chip";
import { IDEA_STATUS_LABEL } from "@/lib/format";
import { getIdeaBundle } from "@/lib/queries";
import Link from "next/link";
import { notFound } from "next/navigation";

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
        <IdeaHeader
          idea={idea}
          author={author}
          metrics={metrics}
          following={following}
          myAttemptId={myAttempt?.id}
        />

        <div className="mt-10 flex gap-6">
          <div className="hidden pt-10 md:block">
            <LineageRail />
          </div>
          <div className="min-w-0 flex-1">
            <Lineage db={db} attempts={attempts} works={works} currentUserId={currentUserId} />
          </div>
        </div>

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
              <Link key={fork.id} href={`/ideas/${fork.id}`} className="glass lift pressable rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[14.5px] tracking-[-0.02em]">{fork.title}</div>
                  <Chip>{IDEA_STATUS_LABEL[fork.status]}</Chip>
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] text-muted">{fork.summary}</p>
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
