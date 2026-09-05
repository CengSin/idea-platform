import { PageFrame } from "@/components/chrome/PageFrame";
import { ClearContent } from "@/components/chrome/ClearContent";
import { Chip } from "@/components/ui/Chip";
import { getSnapshot } from "@/lib/queries";
import Link from "@/components/ui/NavigationLink";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { me } = await getSnapshot();
  return (
    <PageFrame>
        <h1 className="text-[28px] font-semibold tracking-[-0.04em]">设置</h1>
        <p className="mt-1 text-[13.5px] text-muted">用户始终拥有控制权。一级承接使用 AGENTS.md，作品衍生的子想法使用专属提示词。</p>

        <section className="paper-sheet mt-8 max-w-xl">
          <div className="text-[12px] tracking-[0.08em] text-muted">当前用户</div>
          <div className="mt-2 text-[18px] tracking-[-0.02em]">{me.displayName}</div>
          <p className="mt-1 text-[13.5px] text-muted">{me.bio}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {me.skills.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
          <Link href="/profile" className="mt-4 inline-block text-[13px] text-idea hover:underline">
            打开个人资料
          </Link>
        </section>

        <section className="mt-8 max-w-xl">
          <ClearContent />
        </section>
    </PageFrame>
  );
}
