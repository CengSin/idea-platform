import { PageFrame } from "@/components/chrome/PageFrame";
import { Chip } from "@/components/ui/Chip";
import Link from "@/components/ui/NavigationLink";
import { requireAdminUser } from "@/lib/admin";
import { getAdminDashboard } from "@/lib/idea-agent-admin";
import { formatDate, WORK_TYPE_LABEL } from "@/lib/format";
import { Database, FolderGit2, HardDrive, Lightbulb, ShieldCheck, Sparkles, UserCheck, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { account } = await requireAdminUser();
  const dashboard = await getAdminDashboard();

  return (
    <PageFrame>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-indigo-600 uppercase">
            <ShieldCheck className="h-4 w-4" /> 管理控制台
          </div>
          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.04em] text-slate-900">平台总览与状态监控</h1>
          <p className="mt-1.5 text-[14px] text-slate-500">
            查看灵感流转、承接推进、成果产出及系统底层运行状态。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="active">{account.email}</Chip>
        </div>
      </div>

      {/* 1. Core Metrics Grid */}
      <section className="mt-7 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-slate-500">灵感念头</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Lightbulb className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-[32px] font-extrabold tracking-[-0.04em] text-slate-900">
            {dashboard.metrics.totalIdeas}
          </div>
          <div className="mt-1 text-[11.5px] text-slate-400">已记录的初始火花</div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-slate-500">承接推进</span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <FolderGit2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-[32px] font-extrabold tracking-[-0.04em] text-slate-900">
            {dashboard.metrics.totalAttempts}
          </div>
          <div className="mt-1 text-[11.5px] text-slate-400">正在落地的建造轨道</div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-slate-500">成果结晶</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-[32px] font-extrabold tracking-[-0.04em] text-slate-900">
            {dashboard.metrics.totalWorks}
          </div>
          <div className="mt-1 text-[11.5px] text-slate-400">
            其中已发布 {dashboard.metrics.publishedWorks} 个作品
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-slate-500">注册创造者</span>
            <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-[32px] font-extrabold tracking-[-0.04em] text-slate-900">
            {dashboard.metrics.totalUsers}
          </div>
          <div className="mt-1 text-[11.5px] text-slate-400">平台创作者总数</div>
        </div>
      </section>

      {/* 2. System Status Bento */}
      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-1">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <HardDrive className="h-4 w-4 text-indigo-600" /> 系统基础设施
          </div>
          <div className="mt-4 divide-y divide-slate-100 text-[13px]">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500">存储驱动</span>
              <span className="font-semibold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                {dashboard.system.backend}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500">运行环境</span>
              <span className="font-medium text-slate-700">{dashboard.system.nodeEnv}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500">管理员权限</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 text-[12px] font-medium">
                <UserCheck className="h-3.5 w-3.5" /> 白名单鉴权
              </span>
            </div>
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-slate-400 border-t border-slate-100 pt-3">
            平台已精简无状态化运行，完全依靠核心数据层保证一致性与持久化。
          </p>
        </div>

        {/* 3. Recent Works Showcase */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
              <Database className="h-4 w-4 text-emerald-600" /> 最近发布的落地作品
            </div>
            <Link href="/works" className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700">
              查看全部作品 →
            </Link>
          </div>

          {dashboard.recentWorks.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100">
              {dashboard.recentWorks.map((work) => (
                <div key={work.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/works/${work.id}`}
                      className="font-semibold text-slate-900 hover:text-indigo-600 text-[13.5px] transition-colors"
                    >
                      {work.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-slate-400">
                      <span>来自想法「{work.ideaTitle}」</span>
                      <span>·</span>
                      <span>{work.authorName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {WORK_TYPE_LABEL[work.type] ?? work.type}
                    </span>
                    <span className="text-[11.5px] text-slate-400">
                      {work.publishedAt ? formatDate(work.publishedAt) : "草稿"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[13px] text-slate-400">
              暂无已发布的落地作品。
            </div>
          )}
        </div>
      </section>
    </PageFrame>
  );
}
