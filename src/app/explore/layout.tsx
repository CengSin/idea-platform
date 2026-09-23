import { Sparkles, ArrowUpRight } from "lucide-react";
import Link from "@/components/ui/NavigationLink";

// Visibility changes must take effect immediately; never statically cache public content.
export const dynamic = "force-dynamic";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="explore-shell relative z-10 min-h-dvh">
      <a href="#explore-content" className="skip-link">跳到主要内容</a>
      <header className="explore-header sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[70px] max-w-[1240px] items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/explore" className="flex shrink-0 items-center gap-2.5" aria-label="Idea Platform 首页">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white shadow-2xs">
              <Sparkles className="h-4 w-4 text-orange-400" />
            </span>
            <span className="text-[17px] font-bold tracking-tight text-slate-950">
              IDEA<span className="font-normal text-slate-500"> PLATFORM</span>
              <span className="text-orange-500">.</span>
            </span>
          </Link>
          <nav aria-label="游客导航" className="flex items-center gap-2 sm:gap-6">
            <Link href="/explore#explore-ideas" className="hidden text-[13px] font-medium text-slate-600 hover:text-slate-950 sm:block">
              探索想法
            </Link>
            <Link href="/login" className="rounded-xl px-3.5 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-950">
              登录
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-[13px] font-semibold text-white shadow-2xs transition hover:bg-slate-800"
            >
              <span>写下想法</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
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
