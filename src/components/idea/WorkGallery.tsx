import { Chip } from "@/components/ui/Chip";
import { CoverImage } from "@/components/ui/CoverImage";
import { WORK_TYPE_LABEL } from "@/lib/format";
import type { Work } from "@/lib/types";
import { Eye, GitFork, Play, Star } from "lucide-react";
import Link from "next/link";

function compact(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function WorkGallery({ works }: { works: Work[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-[22px] font-semibold tracking-[-0.03em]">这个想法长成了什么</h2>
      <div className="stagger-in mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {works.map((work) => (
          <Link
            key={work.id}
            href={`/works/${work.id}`}
            className="glass lift pressable media-zoom group overflow-hidden rounded-3xl"
          >
            <div className="relative">
              <CoverImage src={work.coverUrl} className="h-[168px] w-full object-cover" />
              <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-artifact backdrop-blur-sm">
                <Play className="h-3.5 w-3.5 fill-current" />
              </span>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[16px] font-medium tracking-[-0.02em]">{work.title}</div>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">
                    {work.summary}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
                <span className="inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {compact(work.views)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    {work.saves}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitFork className="h-3.5 w-3.5" />
                    {work.citations}
                  </span>
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
