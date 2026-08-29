import { PageFrame } from "@/components/chrome/PageFrame";
import { ClearContent } from "@/components/chrome/ClearContent";
import { Chip } from "@/components/ui/Chip";
import { getSnapshot } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { me } = await getSnapshot();
  return (
    <PageFrame>
        <h1 className="text-[28px] font-semibold tracking-[-0.04em]">设置</h1>
        <p className="mt-1 text-[13.5px] text-muted">用户始终拥有控制权。每条承接通过专属 AGENTS.md 连接任意 Agent。</p>

        <section className="glass fade-up mt-8 max-w-xl rounded-3xl p-5">
          <div className="text-[12px] tracking-[0.08em] text-muted">当前用户</div>
          <div className="mt-2 text-[18px] tracking-[-0.02em]">{me.displayName}</div>
          <p className="mt-1 text-[13.5px] text-muted">{me.bio}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {me.skills.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        </section>

        <section className="mt-8 max-w-xl">
          <ClearContent />
        </section>
    </PageFrame>
  );
}
