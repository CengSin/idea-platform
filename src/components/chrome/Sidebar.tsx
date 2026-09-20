"use client";
import { Sparkles, Plus, Settings, Bell, LogOut, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { logoutAction } from "@/lib/auth-actions";
import type { User } from "@/lib/types";
import Link from "@/components/ui/NavigationLink";
import { usePathname } from "next/navigation";
export function Sidebar({ unread = 0, user, isAdmin = false }: { unread?: number; user: User; isAdmin?: boolean }) {
  const path = usePathname();

  const navItems = [
    { href: "/", label: "发现" },
    { href: "/ideas", label: "我的想法" },
    { href: "/attempts", label: "承接中" },
    { href: "/works", label: "作品" },
  ];

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md sm:px-8">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90" aria-label="想法共享首页">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-500 text-white shadow-2xs">
            <Sparkles size={18} strokeWidth={2} />
          </span>
          <span className="text-[17px] font-extrabold tracking-[-0.03em] text-slate-900">
            想法<span className="font-normal text-slate-500">共享</span>
            <span className="text-orange-500">.</span>
          </span>
        </Link>

        <nav aria-label="工作台导航" className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? path === "/" : path === item.href || path.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        <Link
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1.5 text-[12.5px] font-medium text-white shadow-2xs hover:brightness-105 transition-all"
          href="/ideas/new"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>写下想法</span>
        </Link>

        <Link
          href="/notifications"
          className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label={unread ? `通知，${unread} 条未读` : "通知"}
          title="通知"
        >
          <Bell size={17} />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-white" />
          ) : null}
        </Link>

        {isAdmin ? (
          <Link
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            href="/admin"
            aria-label="管理"
            title="管理"
          >
            <ShieldCheck size={17} />
          </Link>
        ) : null}

        <Link
          href="/settings"
          className="flex h-8.5 w-8.5 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="设置"
          title="设置"
        >
          <Settings size={17} />
        </Link>

        <Link
          href="/profile"
          className="ml-1 rounded-full ring-2 ring-transparent hover:ring-slate-300 transition-all"
          aria-label="个人资料"
          title={user.displayName}
        >
          <Avatar initials={user.initials} accent={user.accent} size={30} />
        </Link>

        <form action={logoutAction} className="flex items-center">
          <button
            type="submit"
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="退出登录"
            aria-label="退出登录"
          >
            <LogOut size={15} />
          </button>
        </form>
      </div>
    </header>
  );
}
