import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "@/components/ui/NavigationLink";
import { CoverImage } from "@/components/ui/CoverImage";
import { Author } from "@/components/journal/IdeaJournal";
import { ShareIdea } from "@/components/journal/ShareIdea";
import { getPublicCatalog } from "@/lib/public-queries";
import { WorkReminders } from "@/components/idea/WorkReminders";
import { IdeaLifecycleRail } from "@/components/idea/IdeaLifecycleRail";
import { IDEA_RELATION_KIND_LABEL } from "@/lib/idea-relations";
import { ArrowLeft, ArrowUpRight, GitBranch, Package, Sparkles } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const idea = (await getPublicCatalog()).find((i) => i.id === id);
  return { title: idea ? `${idea.title} · 想法共享` : "想法未公开" };
}

export default async function PublicIdeaPage({ params }: Props) {
  const { id } = await params;
  const catalog = await getPublicCatalog();
  const idea = catalog.find((i) => i.id === id);
  if (!idea) notFound();

  const isDeprecated = idea.status === "deprecated";
  const participants = idea.participants || [];

  return (
    <article className="journal-detail-container mx-auto max-w-[1080px] py-8 sm:py-12">
      {/* Back to Explore */}
      <Link
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 mb-8"
        href="/explore#explore-ideas"
      >
        <ArrowLeft size={16} />
        <span>回到探索广场</span>
      </Link>

      {/* Evolution Trail if derived from a work */}
      {idea.source && (
        <div className="mb-6 inline-flex flex-wrap items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/50 px-3.5 py-2 font-mono text-[12px] text-amber-900">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span>来源链路:</span>
          <Link href={`/explore/${idea.source.ideaId}`} className="font-medium underline underline-offset-2">
            {idea.source.ideaTitle}
          </Link>
          <span className="text-amber-400">↝</span>
          <Link href={`/explore/${idea.source.ideaId}#work-${idea.source.workId}`} className="font-medium underline underline-offset-2">
            {idea.source.workTitle} · {idea.source.revisionNumber ? `v${idea.source.revisionNumber}` : "初始版"}
          </Link>
          <span className="text-amber-400">↝</span>
          <span className="font-semibold text-amber-950">
            {IDEA_RELATION_KIND_LABEL[idea.relationKind ?? "derive"]}
          </span>
        </div>
      )}

      {idea.hasUnavailableSource && (
        <p className="mb-6 text-[12px] text-slate-400">来源作品暂不可见，保留这一步的独立记录。</p>
      )}

      {/* Header */}
      <header className="border-b border-slate-200/80 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {isDeprecated ? "IDEA RECORD / 保留记录" : "AN OPEN INVITATION / 开放共创邀请"}
          </span>

          {isDeprecated && (
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-600">
              已弃用
            </span>
          )}
        </div>

        <h1 className="mt-3 text-[32px] font-bold tracking-tight text-slate-950 sm:text-[42px]">
          {idea.title}
        </h1>

        <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-slate-600 sm:text-[17px]">
          {idea.summary}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Author idea={idea} />

          {/* Integrated Lifecycle Rail */}
          <div className="w-full sm:w-[320px] rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs">
            <IdeaLifecycleRail
              ideaCount={1}
              buildCount={idea.attemptCount}
              productCount={idea.works.length}
              status={idea.status}
              size="sm"
            />
          </div>
        </div>
      </header>

      {/* Two-Column Grid */}
      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Main Content (8 cols) */}
        <div className="space-y-10 lg:col-span-8">
          {/* Problem & Why it matters */}
          {[
            { n: "01", title: "我遇到的核心问题", text: idea.problem },
            {
              n: "02",
              title: "希望发生的改变",
              text: idea.whyItMatters.trim() !== idea.problem.trim() ? idea.whyItMatters : "",
            },
          ]
            .filter((s) => s.text)
            .map((s) => (
              <section key={s.n} className="rounded-2xl border border-slate-200/70 bg-white p-6 sm:p-7">
                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-slate-400">
                  <span>SECTION {s.n}</span>
                </div>
                <h2 className="mt-2 text-[20px] font-bold text-slate-900">{s.title}</h2>
                <p className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed text-slate-600">
                  {s.text}
                </p>
              </section>
            ))}

          {/* Criteria & Open Questions */}
          {[
            { n: "03", title: "作者的验收标准", items: idea.desiredOutputs },
            { n: "04", title: "还想一起探索的问题", items: idea.openQuestions },
            { n: "05", title: "动手前，补充说明", items: idea.constraints },
          ]
            .filter((s) => s.items.length)
            .map((s) => (
              <section key={s.n} className="rounded-2xl border border-slate-200/70 bg-white p-6 sm:p-7">
                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-slate-400">
                  <span>SECTION {s.n}</span>
                </div>
                <h2 className="mt-2 text-[20px] font-bold text-slate-900">{s.title}</h2>
                <ul className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-slate-600">
                  {s.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

          {/* Public Works Section */}
          <section id="works" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-emerald-700">
                  MADE FROM THIS IDEA
                </span>
                <h2 className="mt-1 text-[22px] font-bold text-slate-900">想法之后，发生了什么？</h2>
              </div>
              <span className="text-[12.5px] text-slate-500 font-mono">
                {idea.attemptCount} 个实现方向 · {idea.works.length} 个作品
              </span>
            </div>

            {idea.works.length ? (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {idea.works.map((w) => (
                  <article
                    key={w.id}
                    id={`work-${w.id}`}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/40 p-4 transition hover:border-slate-300"
                  >
                    <div>
                      <CoverImage
                        src={w.coverUrl}
                        pageUrl={w.externalUrl}
                        alt={w.title}
                        className="h-40 w-full rounded-xl object-cover"
                      />
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-medium text-slate-700">作品 · v{w.revisionNumber}</span>
                          <span className="font-mono uppercase">{w.type}</span>
                        </div>
                        <h3 className="mt-1 text-[17px] font-bold text-slate-900">{w.title}</h3>
                        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{w.summary}</p>
                        <WorkReminders reminders={w.reminders} />
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-200/60 pt-3">
                      {w.externalUrl && (
                        <a
                          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-900 hover:text-emerald-700"
                          href={w.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          打开作品 <ArrowUpRight size={15} />
                        </a>
                      )}

                      {/* Next Ideas from this work */}
                      {catalog.filter((child) => child.source?.workId === w.id && child.relationKind !== "iterate").length > 0 && (
                        <div className="mt-3 rounded-lg bg-amber-50/80 p-2.5 text-[11.5px] text-amber-900">
                          <div className="font-semibold text-amber-800">↳ 从这个作品长出的新方向:</div>
                          {catalog
                            .filter((child) => child.source?.workId === w.id && child.relationKind !== "iterate")
                            .map((child) => (
                              <Link
                                href={`/explore/${child.id}`}
                                key={child.id}
                                className="mt-1 flex items-center justify-between font-medium underline underline-offset-2"
                              >
                                <span>{child.title}</span>
                                <ArrowUpRight size={13} />
                              </Link>
                            ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center">
                <Package className="h-7 w-7 text-slate-300" />
                <p className="mt-2 text-[13.5px] text-slate-600">
                  {isDeprecated
                    ? "这个想法弃用前，尚未发布公开作品。"
                    : "还没有公开作品。你的尝试，可以成为这里的第一份回应。"}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Aside Column: Participate & Attribution (4 cols) */}
        <aside className="space-y-6 lg:col-span-4">
          <div className="sticky top-24 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
              {isDeprecated ? "KEPT FOR REFERENCE" : "LET’S MAKE IT REAL"}
            </span>

            <h2 className="mt-2 text-[22px] font-bold text-slate-900">
              {isDeprecated ? "供后来者参考" : "你也想到一种可能？"}
            </h2>

            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              {isDeprecated
                ? "这个方向已停止推进。你仍可以阅读已有成果或分享给需要的人。"
                : "沿着自己的方向实现它，再把成果带回来。一个想法，可以拥有很多种答案。"}
            </p>

            {!isDeprecated ? (
              <Link
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-slate-800"
                href={`/login?next=${encodeURIComponent(`/ideas/${idea.id}`)}`}
              >
                <span>我想动手实现</span>
                <ArrowUpRight size={16} />
              </Link>
            ) : (
              <div className="mt-4 rounded-lg bg-slate-100 p-3 text-[12px] text-slate-500">
                已弃用，暂不接受新的承接。
              </div>
            )}

            <div className="mt-4">
              <ShareIdea />
            </div>

            <small className="mt-4 block text-center text-[11px] text-slate-400">
              参与需要登录，阅读和分享无需账号。
            </small>

            {/* Attribution */}
            <div className="mt-6 border-t border-slate-100 pt-5 text-[12px]">
              <span className="text-slate-400">最初的想法，来自</span>
              <div className="mt-2">
                <Author idea={idea} />
              </div>
              <p className="mt-3 text-[11.5px] text-slate-400">
                每份实现都回到这个起点，保留想法的来源与作者署名。
              </p>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
