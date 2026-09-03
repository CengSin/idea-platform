import { AgentRunControl } from "@/components/admin/AgentRunControl";
import { PageFrame } from "@/components/chrome/PageFrame";
import { Chip } from "@/components/ui/Chip";
import Link from "@/components/ui/NavigationLink";
import { requireAdminUser } from "@/lib/admin";
import { getIdeaAgentAdminDashboard } from "@/lib/idea-agent-admin";
import { Bot, CheckCircle2, KeyRound, Mail, ShieldCheck, TimerReset, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const configLabels = {
  adminAllowlist: "管理员白名单",
  cronSecret: "定时任务密钥",
  resendApiKey: "Resend API",
  emailFrom: "发件人",
  siteUrl: "站点地址",
};

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
          <p className="mt-2 text-[13.5px] text-muted">查看配置、扫描队列和邮件状态；密钥值永远不会在页面中显示。</p>
        </div>
        <Chip tone="active">{account.email}</Chip>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(dashboard.configuration).map(([key, configured]) => (
          <div key={key} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] text-muted">{configLabels[key as keyof typeof configLabels]}</span>
              {configured ? <CheckCircle2 className="h-4 w-4 text-active" /> : <XCircle className="h-4 w-4 text-blocked" />}
            </div>
            <div className="mt-3 text-[14px]">{configured ? "已配置" : "未配置"}</div>
          </div>
        ))}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[13px] text-idea"><Bot className="h-4 w-4" /> 扫描运行</div>
          <h2 className="mt-2 text-[20px] font-medium tracking-[-0.025em]">手动触发完整扫描</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
            与每日定时任务走同一个服务：生成新建议、补发失败邮件并保持作品级去重。
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
          ["待选择建议", dashboard.metrics.pendingSuggestions],
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
                <span className="text-[12px] text-muted">{work.scannedAt ? "已扫描" : "等待扫描"}</span>
                <span className="text-[12px] text-muted">{work.pendingSuggestions} 条待选择</span>
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
