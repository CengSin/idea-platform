import type { Metadata } from "next";
import { ArrowUpRight, Github, Star } from "lucide-react";
import { LanguageLabel, StatusLabel } from "@/components/ProjectMeta";
import { Sparkline } from "@/components/Sparkline";
import { formatDateTime } from "@/lib/format";
import { displayPitch, publicSections } from "@/lib/projects";
import { pageSocialMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { readShowcase } from "@/lib/store";
import type { Project } from "@/lib/types";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const { owner } = await readShowcase();
  const title = owner ? `${owner.name} 的项目` : "项目";
  const description = owner?.bio || "正在做的项目，和其中最有想象力的那几个。";
  return { title: { absolute: title }, description, ...pageSocialMetadata({ title, description, url: siteUrl() }) };
}

function ExternalLinks({ project }: { project: Project }) {
  return (
    <div className="flex items-center gap-3 text-[12.5px]">
      {project.homepage ? (
        <a href={project.homepage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-idea-deep hover:underline">
          打开<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}
      <a href={project.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-artifact">
        <Github className="h-3.5 w-3.5" aria-hidden />源码
      </a>
    </div>
  );
}

function FeaturedCard({ project, rank }: { project: Project; rank: number }) {
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-[0_6px_24px_rgba(41,41,39,0.04)] sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[12px] tabular-nums text-idea">{String(rank).padStart(2, "0")}</span>
        <ExternalLinks project={project} />
      </div>
      <h3 className="mt-3 break-words text-[20px] font-semibold tracking-[-0.02em]">
        <a href={project.homepage ?? project.url} target="_blank" rel="noreferrer" className="hover:text-idea-deep">
          {project.name}
        </a>
      </h3>
      <p className="mt-2 text-[15.5px] leading-7 text-artifact">{displayPitch(project) || "（暂无简介）"}</p>
      {project.curation?.reason ? (
        <p className="mt-3 border-l-2 border-[#f0c4b6] pl-3 text-[13px] leading-6 text-muted">{project.curation.reason}</p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pt-5 text-[12px] text-muted">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusLabel project={project} />
          <LanguageLabel language={project.language} />
          {project.stars > 0 ? (
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" aria-hidden />{project.stars}</span>
          ) : null}
        </div>
        <Sparkline weekly={project.activity?.weekly} className="ml-auto" />
      </div>
    </article>
  );
}

function BuildingRow({ project }: { project: Project }) {
  return (
    <li className="grid gap-x-6 gap-y-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <a href={project.homepage ?? project.url} target="_blank" rel="noreferrer" className="text-[15px] font-semibold hover:text-idea-deep">
            {project.name}
          </a>
          <span className="text-[12px] text-muted"><StatusLabel project={project} /></span>
        </div>
        <p className="mt-1 text-[13.5px] leading-6 text-[#55554f]">{displayPitch(project) || "（暂无简介）"}</p>
        {project.activity?.lastCommitMessage ? (
          <p className="mt-1 truncate font-mono text-[11.5px] text-muted" title={project.activity.lastCommitMessage}>
            最近提交：{project.activity.lastCommitMessage}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-4 sm:justify-end">
        <Sparkline weekly={project.activity?.weekly} />
        <ExternalLinks project={project} />
      </div>
    </li>
  );
}

function OtherRow({ project }: { project: Project }) {
  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <a href={project.homepage ?? project.url} target="_blank" rel="noreferrer" className="shrink-0 text-[14px] font-medium hover:text-idea-deep sm:w-56 sm:truncate">
        {project.name}
      </a>
      <span className="min-w-0 flex-1 text-[13px] leading-6 text-muted">{displayPitch(project) || "—"}</span>
      <span className="shrink-0 text-[12px] text-muted"><StatusLabel project={project} /></span>
    </li>
  );
}

function SectionTitle({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={id} className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#55554f]">{title}</h2>
      {hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}

export default async function ShowcasePage() {
  const showcase = await readShowcase();
  const { owner } = showcase;
  const { featured, building, others, total } = publicSections(showcase);

  return (
    <main className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-8 sm:pt-20">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {owner?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={owner.avatarUrl} alt="" width={64} height={64} className="h-16 w-16 rounded-full border border-line" />
        ) : null}
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">
            {owner ? `${owner.name} 的项目` : "项目"}
          </h1>
          <p className="mt-1 max-w-2xl text-[14.5px] leading-7 text-muted">
            {owner?.bio || "正在做的项目，和其中最有想象力的那几个。"}
          </p>
          {owner ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
              <a href={owner.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-artifact">
                <Github className="h-3.5 w-3.5" aria-hidden />@{owner.login}
              </a>
              <span>{total} 个公开项目</span>
              <span>{[...featured, ...building, ...others].filter((p) => p.activity?.commits30d).length} 个最近 30 天有提交</span>
            </p>
          ) : null}
        </div>
      </header>

      {total === 0 ? (
        <section className="mt-16 rounded-2xl border border-dashed border-line-strong p-10 text-center">
          <p className="text-[15px]">还没有同步任何仓库。</p>
          <p className="mt-2 text-[13px] text-muted">
            登录 <a href="/admin" className="text-idea-deep underline">后台</a> 从 GitHub 同步，或在本地运行 <code className="font-mono">npm run curate</code>。
          </p>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section aria-labelledby="featured" className="mt-14">
          <SectionTitle id="featured" title="最有想象力" hint="由 Claude 依据 README 评选，作者可调整" />
          <div className="grid gap-4 md:grid-cols-2">
            {featured.map((project, index) => (
              <FeaturedCard key={project.id} project={project} rank={index + 1} />
            ))}
          </div>
        </section>
      ) : null}

      {building.length > 0 ? (
        <section aria-labelledby="building" className="mt-16">
          <SectionTitle id="building" title="正在推进" hint="最近 14 天有提交 · 柱状图为近 12 周每周提交数" />
          <ul className="divide-y divide-line border-y border-line">
            {building.map((project) => <BuildingRow key={project.id} project={project} />)}
          </ul>
        </section>
      ) : null}

      {others.length > 0 ? (
        <section aria-labelledby="others" className="mt-16">
          <details className="group">
            <summary className="cursor-pointer list-none">
              <SectionTitle id="others" title={`其他项目 · ${others.length}`} hint="展开 ▾" />
            </summary>
            <ul className="divide-y divide-line border-y border-line">
              {others.map((project) => <OtherRow key={project.id} project={project} />)}
            </ul>
          </details>
        </section>
      ) : null}

      <footer className="mt-20 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
        <span>最近同步：{formatDateTime(showcase.syncedAt)}</span>
        <a href="/admin" className="hover:text-artifact">管理</a>
      </footer>
    </main>
  );
}
