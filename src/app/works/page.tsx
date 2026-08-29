import { PageFrame } from "@/components/chrome/PageFrame";
import { Chip } from "@/components/ui/Chip";
import { CoverImage } from "@/components/ui/CoverImage";
import { WORK_TYPE_LABEL, ideaById } from "@/lib/format";
import { getSnapshot } from "@/lib/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WorksPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string }>;
}) {
  const { mine } = await searchParams;
  const { db, currentUserId } = await getSnapshot();
  const myAttemptIds = new Set(
    db.attempts.filter((a) => a.ownerId === currentUserId).map((a) => a.id),
  );
  const works = db.works.filter((w) => {
    if (w.status !== "published") return false;
    if (mine) return myAttemptIds.has(w.attemptId);
    return true;
  });

  return (
    <PageFrame>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.04em]">作品</h1>
            <p className="mt-1 text-[13.5px] text-muted">每个作品都保留来源想法与实现轨道。</p>
          </div>
          <div className="flex gap-2 text-[13px]">
            <Link href="/works" className={!mine ? "text-idea" : "text-muted"}>
              全站
            </Link>
            <Link href="/works?mine=1" className={mine ? "text-idea" : "text-muted"}>
              我的
            </Link>
          </div>
        </div>
        <div className="stagger-in grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {works.map((work) => {
            const idea = ideaById(db, work.ideaId);
            return (
              <Link key={work.id} href={`/works/${work.id}`} className="glass lift pressable media-zoom overflow-hidden rounded-3xl">
                <CoverImage src={work.coverUrl} className="h-40 w-full object-cover" />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[16px] tracking-[-0.02em]">{work.title}</div>
                    <Chip>{WORK_TYPE_LABEL[work.type]}</Chip>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[13px] text-muted">{work.summary}</p>
                  <p className="mt-3 text-[12px] text-muted">来源 · {idea?.title}</p>
                </div>
              </Link>
            );
          })}
        </div>
    </PageFrame>
  );
}
