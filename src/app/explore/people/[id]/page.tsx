import { notFound } from "next/navigation";
import Link from "@/components/ui/NavigationLink";
import { getPublicCatalog } from "@/lib/public-queries";
import { ArrowLeft, ArrowUpRight, Lightbulb, Package, Sparkles } from "lucide-react";

export default async function PublicCreator({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const allIdeas = await getPublicCatalog();
  const ideas = allIdeas.filter((i) => i.authorId === id);
  if (!ideas.length) notFound();

  const author = ideas[0];
  const works = ideas.flatMap((i) => i.works.map((w) => ({ ...w, idea: i })));

  return (
    <div className="mx-auto max-w-[960px] py-8 sm:py-12 select-none">
      {/* Back link */}
      <Link
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 mb-8"
        href="/explore#explore-ideas"
      >
        <ArrowLeft size={16} />
        <span>回到探索广场</span>
      </Link>

      {/* Creator Profile Header */}
      <header className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-9 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[24px] font-bold text-white shadow-xs"
              style={{ backgroundColor: author.authorAccent || "#e05b38" }}
            >
              {author.authorInitials || author.authorName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  CREATOR NOTEBOOK
                </span>
              </div>
              <h1 className="mt-1 text-[28px] font-bold tracking-tight text-slate-950 sm:text-[34px]">
                {author.authorName}
                <span className="font-normal text-slate-400 text-[20px] sm:text-[24px]"> 的开放记录</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t border-slate-100 pt-4 sm:border-t-0 sm:pt-0 font-mono text-[13px]">
            <div className="flex flex-col">
              <span className="text-[22px] font-bold text-slate-900">{ideas.length}</span>
              <span className="text-slate-400 text-[11px]">公开想法</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-[22px] font-bold text-slate-900">{works.length}</span>
              <span className="text-slate-400 text-[11px]">长出作品</span>
            </div>
          </div>
        </div>

        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-600">
          {author.authorBio || "在这里分享在意的问题，让一个人的想法，遇见更多人的可能。"}
        </p>
      </header>

      {/* Ideas Section */}
      <section className="mt-10">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-orange-600" />
            <h2 className="text-[20px] font-bold text-slate-900">提出的想法</h2>
          </div>
          <span className="font-mono text-[11px] text-slate-400">{ideas.length} ITEMS</span>
        </div>

        <div className="mt-4 space-y-3">
          {ideas.map((i, idx) => (
            <Link
              key={i.id}
              href={`/explore/${i.id}`}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-5 transition hover:border-slate-300 hover:shadow-xs"
            >
              <div className="flex items-start gap-3.5">
                <span className="mt-0.5 font-mono text-[12px] font-semibold text-slate-400">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-bold text-slate-900 group-hover:text-orange-600">
                      {i.title}
                    </h3>
                    {i.status === "deprecated" ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                        已弃用
                      </span>
                    ) : i.works.length > 0 ? (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700">
                        已有作品
                      </span>
                    ) : i.attemptCount > 0 ? (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700">
                        实现中
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-slate-600">
                    {i.problem || i.summary}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 text-slate-400 group-hover:text-slate-800">
                <span className="font-mono text-[11.5px]">
                  {i.attemptCount} 承接 · {i.works.length} 作品
                </span>
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Works Section */}
      <section className="mt-12">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" />
            <h2 className="text-[20px] font-bold text-slate-900">从这些想法长出的作品</h2>
          </div>
          <span className="font-mono text-[11px] text-slate-400">{works.length} WORKS</span>
        </div>

        {works.length ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {works.map((w, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5"
              >
                <div>
                  <span className="font-mono text-[11px] text-emerald-700 font-medium uppercase">
                    源自「{w.idea.title}」
                  </span>
                  <h3 className="mt-1 text-[17px] font-bold text-slate-900">{w.title}</h3>
                  <p className="mt-1 text-[13px] text-slate-600">{w.summary}</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <Link
                    href={`/explore/${w.idea.id}#work-${w.id}`}
                    className="text-[12px] font-medium text-slate-600 hover:underline"
                  >
                    查看源想法
                  </Link>

                  {w.externalUrl && (
                    <a
                      href={w.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[12px] text-slate-900 hover:text-emerald-700"
                    >
                      访问作品 <ArrowUpRight size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-center text-[13px] text-slate-400">
            作品还在路上，先从一个想法开始。
          </p>
        )}
      </section>
    </div>
  );
}
