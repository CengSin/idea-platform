import { Sparkles, ArrowUpRight, Plus } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
import { getCurrentUser } from "@/lib/auth";


export const dynamic = "force-dynamic";

export default async function ExploreLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  return (
    <div className="explore-shell relative z-10 min-h-dvh">
      <a href="#explore-content" className="skip-link">跳到主要内容</a>
      <header className="explore-header sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[70px] max-w-[1240px] items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/explore" className="flex shrink-0 items-center gap-2.5" aria-label="Idea Platform 首页">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white shadow-2xs">
              <Sparkles className="h-4 w-4 text-orange-400" />
            </span>
            <span className="hidden whitespace-nowrap text-[17px] font-bold tracking-tight text-slate-950 sm:inline">
              IDEA<span className="font-normal text-slate-500"> PLATFORM</span>
              <span className="text-orange-500">.</span>
            </span>
          </Link>
          <nav aria-label={me ? "用户导航" : "游客导航"} className="flex min-w-0 items-center gap-1 sm:gap-6">
            <Link href="/explore#explore-ideas" className="hidden text-[13px] font-medium text-slate-600 hover:text-slate-950 sm:block">
              探索想法
            </Link>
            {me ? (
              <>
                <Link href="/works" prefetch={false} className="shrink-0 whitespace-nowrap rounded-xl px-2.5 py-2 sm:px-3.5 text-[13px] font-medium text-slate-600 hover:text-slate-950">我的作品</Link>
                <Link href="/works/import" className="hidden rounded-xl px-3.5 py-2 text-[13px] font-medium text-emerald-700 hover:text-emerald-900 sm:block">收录已有网站</Link>
                <Link href="/profile" className="inline-flex min-w-0 max-w-[10rem] items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-2 text-[13px] font-semibold text-white shadow-2xs transition hover:bg-slate-800 sm:max-w-none sm:px-4"><span className="truncate">{me.displayName}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0" /></Link>
              </>
            ) : (
              <>
                <Link href="/login?next=%2Fworks%2Fimport" className="hidden text-[13px] font-medium text-emerald-700 hover:text-emerald-900 md:inline">收录已有网站</Link>
                <Link href="/login" className="shrink-0 whitespace-nowrap rounded-xl px-2.5 py-2 sm:px-3.5 text-[13px] font-medium text-slate-600 hover:text-slate-950">登录</Link>
                <Link href="/register" className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-2 sm:px-4 text-[13px] font-semibold text-white shadow-2xs transition hover:bg-slate-800"><Plus className="h-3.5 w-3.5" /><span>写下想法</span></Link>
              </>
            )}
          </nav>
        </div>
      </header>
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
