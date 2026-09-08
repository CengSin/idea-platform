import { WorkReminders } from "@/components/idea/WorkReminders";
import { Chip } from "@/components/ui/Chip";
import { CoverImage } from "@/components/ui/CoverImage";
import { publicReminders } from "@/lib/content-access";
import { WORK_TYPE_LABEL } from "@/lib/format";
import type { Work } from "@/lib/types";
import { GitFork } from "lucide-react";
import Link from "@/components/ui/NavigationLink";

export function WorkGallery({ works }: { works: Work[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-[22px] font-semibold tracking-[-0.03em]">这个想法长成了什么</h2>
      <div className="stagger-in mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {works.map((work) => (
          <Link
            key={work.id}
            href={`/works/${work.id}`}
            className="paper-photo lift pressable media-zoom group"
          >
            <div className="relative">
              <CoverImage src={work.coverUrl} pageUrl={work.externalUrl} className="h-[168px] w-full object-cover" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[16px] font-medium tracking-[-0.02em]">{work.title}</div>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">
                    {work.summary}
                  </p>
                  <WorkReminders reminders={publicReminders(work)} compact />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <GitFork className="h-3.5 w-3.5" />
                  {work.citations}
                </span>
                <Chip tone="artifact">已发布 · {WORK_TYPE_LABEL[work.type]}</Chip>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
