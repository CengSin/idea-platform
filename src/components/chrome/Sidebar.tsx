"use client";

import { SproutIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { logoutAction } from "@/lib/auth-actions";
import { clsxJoin } from "@/lib/format";
import type { User } from "@/lib/types";
import {
  Bell,
  LayoutGrid,
  Lightbulb,
  Settings,
  LogOut,
  Users,
  MoreHorizontal,
  Globe2,
  ShieldCheck,
} from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "@/components/ui/NavigationLink";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const items = [
  { href: "/", key: "discover", label: "发现", icon: SproutIcon },
  { href: "/ideas", key: "ideas", label: "我的想法", icon: Lightbulb },
  { href: "/attempts", key: "attempts", label: "承接中", icon: Users },
  { href: "/works", key: "works", label: "作品", icon: LayoutGrid },
  { href: "/notifications", key: "notifications", label: "通知", icon: Bell },
];

export function Sidebar({ unread = 0, user, isAdmin = false }: { unread?: number; user: User; isAdmin?: boolean }) {
  const pathname = usePathname();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (mobileMenu.current) mobileMenu.current.open = false; }, [pathname]);
  const reduce = useReducedMotion();
  const active = (key: string, href: string) => {
    if (key === "discover") {
      return pathname === "/" || /^\/ideas\/(?!new(?:\/|$)).+/.test(pathname);
    }
    if (key === "ideas") return pathname === "/ideas" || pathname === "/ideas/new";
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  };

  const pill = reduce
    ? undefined
    : { type: "spring" as const, bounce: 0, duration: 0.35 };

  return (
    <aside className="workspace-sidebar relative z-20 flex w-[92px] shrink-0 flex-col py-4 pl-3">
      <div className="glass-heavy flex h-full flex-col rounded-[28px] px-2 py-3">
        <Link
          href="/"
          className="sidebar-brand pressable mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl text-idea"
          aria-label="Idea Platform"
        >
          <SproutIcon className="h-7 w-7" />
        </Link>
        <LayoutGroup id="sidebar-nav">
          <nav aria-label="工作台导航" className="flex flex-1 flex-col gap-1">
            {[...items, ...(isAdmin ? [{ href: "/admin", key: "admin", label: "管理", icon: ShieldCheck }] : [])].map((item) => {
              const Icon = item.icon;
              const isActive = active(item.key, item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={clsxJoin(
                    "pressable relative flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-[11px] tracking-[0.04em]",
                    isActive ? "text-idea" : "text-muted hover:bg-white/4 hover:text-artifact",
                  )}
                >
                  {isActive && reduce ? (
                    <>
                      <span className="absolute inset-0 rounded-2xl bg-idea/12" />
                      <span className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full bg-idea" />
                    </>
                  ) : null}
                  {isActive && !reduce ? (
                    <>
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-2xl bg-idea/12"
                        transition={pill}
                      />
                      <motion.span
                        layoutId="nav-mark"
                        className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full bg-idea"
                        transition={pill}
                      />
                    </>
                  ) : null}
                  <span className="relative">
                    <Icon className="h-[18px] w-[18px]" />
                    {item.key === "notifications" && unread > 0 ? (
                      <span className="live-dot absolute -right-1.5 -top-1" />
                    ) : null}
                  </span>
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>
        <Link
          href="/settings"
          className={clsxJoin(
            "sidebar-secondary pressable relative mt-2 flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-[11px] tracking-[0.04em]",
            active("settings", "/settings")
              ? "bg-idea/12 text-idea"
              : "text-muted hover:bg-white/4 hover:text-artifact",
          )}
        >
          <Settings className="h-[18px] w-[18px]" />
          设置
        </Link>
        <div className="sidebar-divider mx-1 my-2 h-px bg-line" />
        <Link
          href="/profile"
          title={user.displayName}
          className={clsxJoin(
            "sidebar-profile pressable relative mt-0.5 flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-[11px] tracking-[0.04em]",
            pathname.startsWith("/profile")
              ? "bg-idea/12 text-idea"
              : "text-muted hover:bg-white/4 hover:text-artifact",
          )}
        >
          <Avatar initials={user.initials} accent={user.accent} size={28} />
          资料
        </Link>
        <form action={logoutAction} className="sidebar-secondary">
          <button
            type="submit"
            className="pressable mt-1 flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] tracking-[0.04em] text-muted hover:bg-white/4 hover:text-artifact"
          >
            <LogOut className="h-[16px] w-[16px]" />
            退出
          </button>
        </form>
        <details ref={mobileMenu} className="sidebar-mobile-menu relative hidden">
          <summary aria-label="更多选项" className="pressable grid h-10 w-8 cursor-pointer list-none place-items-center rounded-xl text-muted"><MoreHorizontal className="h-5 w-5" /></summary>
          <div className="absolute right-0 top-12 z-50 w-40 rounded-2xl border border-line bg-[#29251f] p-2 shadow-xl">
            <Link href="/settings" className="flex items-center gap-2 rounded-xl p-3 text-[13px]"><Settings className="h-4 w-4" />设置</Link>
            <Link href="/explore" className="flex items-center gap-2 rounded-xl p-3 text-[13px]"><Globe2 className="h-4 w-4" />公开广场</Link>
            <form action={logoutAction}><button type="submit" className="flex w-full items-center gap-2 rounded-xl p-3 text-[13px] text-muted"><LogOut className="h-4 w-4" />退出登录</button></form>
          </div>
        </details>
      </div>
    </aside>
  );
}
