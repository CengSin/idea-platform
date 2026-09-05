import { AgentRunControl } from "@/components/admin/AgentRunControl";
import { AgentConfigForm } from "@/components/admin/AgentConfigForm";
import { PageFrame } from "@/components/chrome/PageFrame";
import { Chip } from "@/components/ui/Chip";
import Link from "@/components/ui/NavigationLink";
import { requireAdminUser } from "@/lib/admin";
import { getIdeaAgentAdminDashboard } from "@/lib/idea-agent-admin";
import { Bot, KeyRound, Mail, ShieldCheck, TimerReset } from "lucide-react";

export const dynamic = "force-dynamic";

const emailLabels: Record<string, string> = {
  not_scanned: "未扫描",
  pending: "待发送",
  sent: "已发送",
  failed: "发送失败",
  skipped: "已跳过",
};

export default async function IdeaAgentAdminPage() {
  const { account } = await requireAdminUser();
  const dashboard = await getIdeaAgentAdminDashboard();

  return (
    <PageFrame>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[12px] tracking-[0.08em] text-idea">
            <ShieldCheck className="h-4 w-4" /> 管理员
          </div>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.04em]">Idea Agent 控制台</h1>
          <p className="mt-2 text-[13.5px] text-muted">配置 Agent、定时扫描和邮件服务，并查看运行状态。</p>
        </div>
        <Chip tone="active">{account.email}</Chip>
      </div>

      <section className="mt-7">
        <AgentConfigForm configuration={dashboard.configuration} />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[13px] text-idea"><Bot className="h-4 w-4" /> 扫描运行</div>
          <h2 className="mt-2 text-[20px] font-medium tracking-[-0.025em]">手动触发完整扫描</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
            与定时调度走同一个服务：分析有变化的作品、生成提醒标签、重试失败任务。重叠运行使用租约去重。
          </p>
          <div className="mt-5"><AgentRunControl /></div>
        </div>
        <div className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[13px] text-muted"><KeyRound className="h-4 w-4" /> 管理员账户</div>
          <p className="mt-3 break-all text-[14px]">{account.email}</p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            账户使用普通登录流程；权限来自 `ADMIN_EMAILS` 环境变量。移出白名单后立即失去后台访问权。
          </p>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["已完成作品", dashboard.metrics.completedWorks],
          ["等待扫描", dashboard.metrics.waitingForScan],
          ["已扫描", dashboard.metrics.scannedWorks],
          ["待查看提醒", dashboard.metrics.pendingSuggestions],
          ["邮件失败", dashboard.metrics.emailFailures],
          ["已关闭", dashboard.metrics.closedWorks],
        ].map(([label, value]) => (
          <div key={label} className="glass rounded-2xl p-4">
            <div className="text-[12px] text-muted">{label}</div>
            <div className="mt-2 text-[25px] font-semibold tracking-[-0.04em]">{value}</div>
          </div>
        ))}
      </section>

      <section className="mt-5 glass overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[17px] font-medium">最近作品</h2>
            <p className="mt-1 text-[12px] text-muted">这里只展示状态汇总，不展示建议正文。</p>
          </div>
          <TimerReset className="h-5 w-5 text-muted" />
        </div>
        {dashboard.recentWorks.length ? (
          <div className="divide-y divide-line">
            {dashboard.recentWorks.map((work) => (
              <div key={work.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_120px_120px_100px] sm:items-center">
                <Link href={`/works/${work.id}`} className="truncate text-[14px] hover:text-idea">{work.title}</Link>
                <span className="text-[12px] text-muted">{{ not_scanned: "未分析", queued: "排队中", running: "分析中", succeeded: "已分析", failed: "分析失败", cancelled: "已取消" }[work.analysisStatus]}</span>
                <span className="text-[12px] text-muted">{work.pendingSuggestions} 个提醒</span>
                <span className={`inline-flex items-center gap-1 text-[12px] ${work.emailStatus === "failed" ? "text-blocked" : "text-muted"}`}>
                  <Mail className="h-3.5 w-3.5" /> {emailLabels[work.emailStatus] ?? work.emailStatus}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-[13px] text-muted">还没有符合条件的已完成作品。</div>
        )}
      </section>
    </PageFrame>
  );
}
