import { Sparkles, ArrowUpRight } from "lucide-react";
import Link from "@/components/ui/NavigationLink";

// Visibility changes must take effect immediately; never statically cache public content.
export const dynamic = "force-dynamic";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="explore-shell relative z-10 min-h-dvh">
      <a href="#explore-content" className="skip-link">跳到主要内容</a>
      <header className="explore-header">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/explore" className="flex shrink-0 items-center gap-2.5" aria-label="Idea Platform 游客首页">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-500 text-white shadow-2xs">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <span className="text-[17px] font-bold tracking-[-0.03em] text-slate-900">想法<span className="font-normal text-slate-500"> 共享</span><span className="text-orange-500">.</span></span>
          </Link>
          <nav aria-label="游客导航" className="flex items-center gap-2 sm:gap-7">
            <Link href="/explore#ideas" className="hidden text-[13px] text-muted hover:text-artifact sm:block">发现想法</Link>
            <Link href="/login" className="pressable rounded-xl px-3 py-2.5 text-[13px] text-muted hover:text-artifact">登录</Link>
            <Link href="/register" className="explore-cta small">写下想法 <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </nav>
        </div>
      </header>
      <main id="explore-content" className="mx-auto max-w-[1240px] px-5 sm:px-8">{children}</main>
      <footer className="mx-auto mt-16 flex max-w-[1240px] flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-7 text-[12px] text-muted sm:px-8">
        <span>IDEA PLATFORM / 每一个念头，都在这里遇见它的建造者</span>
        <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />游客可浏览公开内容，登录后参与共创</span>
      </footer>
    </div>
  );
}
