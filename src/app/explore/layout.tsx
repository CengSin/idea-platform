import { SproutIcon } from "@/components/icons";
import Link from "@/components/ui/NavigationLink";
import { ArrowUpRight } from "lucide-react";

// Visibility changes must take effect immediately; never statically cache public content.
export const dynamic = "force-dynamic";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="explore-shell relative z-10 min-h-dvh">
      <a href="#explore-content" className="skip-link">跳到主要内容</a>
      <header className="explore-header">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/explore" className="flex shrink-0 items-center gap-2.5" aria-label="Idea Platform 游客首页">
            <span className="brand-mark"><SproutIcon className="h-6 w-6" /></span>
            <span className="text-[17px] font-semibold tracking-[-0.04em]">idea<span className="font-normal text-muted"> platform</span><span className="text-idea">.</span></span>
          </Link>
          <nav aria-label="游客导航" className="flex items-center gap-2 sm:gap-7">
            <Link href="/explore#ideas" className="hidden text-[13px] text-muted hover:text-artifact sm:block">发现想法</Link>
            <Link href="/explore#how-it-works" className="hidden text-[13px] text-muted hover:text-artifact md:block">如何参与</Link>
            <Link href="/login" className="pressable rounded-xl px-3 py-2.5 text-[13px] text-muted hover:text-artifact">登录</Link>
            <Link href="/register" className="explore-cta small">加入共创 <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </nav>
        </div>
      </header>
      <main id="explore-content" className="mx-auto max-w-[1240px] px-5 sm:px-8">{children}</main>
      <footer className="mx-auto mt-16 flex max-w-[1240px] flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-7 text-[12px] text-muted sm:px-8">
        <span>Idea Platform · 让想法找到实现者</span>
        <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-active" />游客可浏览公开内容，登录后参与共创</span>
      </footer>
    </div>
  );
}
