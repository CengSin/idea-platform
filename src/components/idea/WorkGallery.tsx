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
    <section className="mt-12">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <h2 className="text-[20px] font-bold tracking-[-0.03em] text-slate-900">这个想法长成了什么</h2>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
          {works.length} 个落地成果
        </span>
      </div>
      <div className="stagger-in mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {works.map((work) => (
          <Link
            key={work.id}
            href={`/works/${work.id}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
              <CoverImage src={work.coverUrl} pageUrl={work.externalUrl} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 shadow-xs border border-white/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  已发布 · {WORK_TYPE_LABEL[work.type]}
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900 transition-colors group-hover:text-indigo-600">
                {work.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                {work.summary}
              </p>
              <WorkReminders reminders={publicReminders(work)} compact />
              <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 text-[12px] text-slate-400">
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <GitFork className="h-3.5 w-3.5" />
                  {work.citations} 次衍生
                </span>
                <span className="text-slate-700 font-medium group-hover:translate-x-0.5 transition-transform">
                  查看详情 →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
