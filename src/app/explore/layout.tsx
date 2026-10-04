import { SiteHeader } from "@/components/chrome/SiteHeader";
import { isAdminUser } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { getSnapshot } from "@/lib/queries";


export const dynamic = "force-dynamic";

export default async function ExploreLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  let unread = 0;
  let isAdmin = false;
  if (me) {
    const [{ db }, admin] = await Promise.all([getSnapshot(), isAdminUser(me.id)]);
    unread = db.notifications.filter((notification) => !notification.read).length;
    isAdmin = admin;
  }
  return (
    <div className="explore-shell relative z-10 min-h-dvh">
      <a href="#explore-content" className="skip-link">跳到主要内容</a>
      <SiteHeader user={me} unread={unread} isAdmin={isAdmin} />
      <main id="explore-content" className="mx-auto max-w-[1240px] px-5 sm:px-8">{children}</main>
      <footer className="mx-auto mt-16 flex max-w-[1240px] flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 px-5 py-8 text-[12px] text-slate-500 sm:px-8">
        <div className="flex items-center gap-2 font-mono">
          <span className="font-bold text-slate-900">IDEA PLATFORM</span>
          <span>/</span>
          <span>共享 · 承接 · 开源 · 持续生长</span>
        </div>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          开放协作平台 · 游客可浏览全部公开链路，登录后参与共创
        </span>
      </footer>
    </div>
  );
}
