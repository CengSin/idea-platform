import type { Metadata } from "next";
import { logoutAction } from "@/app/actions";
import { requireOwner } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { needsCuration } from "@/lib/projects";
import { readShowcase } from "@/lib/store";
import { AdminBoard } from "./AdminBoard";
import { SyncButton } from "./SyncButton";

export const metadata: Metadata = { title: "后台", robots: { index: false } };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AdminPage() {
  await requireOwner();
  const showcase = await readShowcase();
  const pending = showcase.projects.filter((project) => needsCuration(project)).length;
  const hasToken = Boolean(process.env.GITHUB_TOKEN?.trim());

  return (
    <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">项目后台</h1>
          <p className="mt-1 text-[13px] text-muted">
            最近同步 {formatDateTime(showcase.syncedAt)} · 最近评选 {formatDateTime(showcase.curatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/" className="rounded-xl px-3 py-2 text-[13px] text-muted hover:bg-[#efeee8] hover:text-artifact">查看公开页</a>
          <SyncButton />
          <form action={logoutAction}>
            <button type="submit" className="rounded-xl px-3 py-2 text-[13px] text-muted hover:bg-[#efeee8] hover:text-artifact">退出</button>
          </form>
        </div>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-4 text-[13px] leading-6">
          <p className="font-medium">想象力评选{pending ? ` · ${pending} 个待评选` : " · 已是最新"}</p>
          <p className="mt-1 text-muted">
            在本地仓库目录运行 <code className="rounded bg-[#efeee8] px-1.5 py-0.5 font-mono text-[12px]">npm run curate</code>，
            用你的 Claude Code 读取 README 打分。只评新仓库和有新推送的仓库；加 <code className="font-mono text-[12px]">-- --all</code> 全部重评。
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 text-[13px] leading-6">
          <p className="font-medium">同步来源</p>
          <p className="mt-1 text-muted">
            {hasToken
              ? "已配置 GITHUB_TOKEN：包含私有仓库。私有仓库、Fork 和隐藏项目永远不会出现在公开页。"
              : "未配置 GITHUB_TOKEN：只能同步公开仓库（需设置 GITHUB_USER）。本地 npm run curate 会用 gh 的登录态同步私有仓库。"}
            每天自动同步一次。
          </p>
        </div>
      </section>

      <AdminBoard projects={showcase.projects} />
    </main>
  );
}
