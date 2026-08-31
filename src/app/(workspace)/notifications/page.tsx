import { PageFrame } from "@/components/chrome/PageFrame";
import { MarkRead } from "@/components/chrome/MarkRead";
import { relativeTime } from "@/lib/format";
import { getSnapshot } from "@/lib/queries";
import Link from "@/components/ui/NavigationLink";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { db } = await getSnapshot();
  return (
    <PageFrame>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.04em]">通知</h1>
            <p className="mt-1 text-[13.5px] text-muted">匹配、活性、阻塞和衍生，而不是点赞。</p>
          </div>
          <MarkRead />
        </div>
        <div className="stagger-in space-y-2">
          {db.notifications.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              className="glass lift flex items-start justify-between gap-4 rounded-2xl px-5 py-4"
            >
              <div>
                <div className="text-[14.5px] tracking-[-0.02em]">
                  {!n.read ? <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-idea" /> : null}
                  {n.title}
                </div>
                <p className="mt-1 text-[13px] text-muted">{n.body}</p>
              </div>
              <div className="shrink-0 text-[12px] text-muted">{relativeTime(n.at)}</div>
            </Link>
          ))}
        </div>
    </PageFrame>
  );
}
