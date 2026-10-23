"use client";

import { Bell, ChevronDown, Plus, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import Link from "@/components/ui/NavigationLink";
import { logoutAction } from "@/lib/auth-actions";
import type { User } from "@/lib/types";

// 全站唯一的顶部导航：登录前后共用同一个品牌和组件，登录后只是多出几项。
// 手机宽度（< sm / 640px）只留 图标、铃铛、＋、头像，其余收进头像菜单。

type NavItem = { href: string; label: string; match: (path: string) => boolean };

const startsWith = (prefix: string) => (path: string) => path === prefix || path.startsWith(`${prefix}/`);

const EXPLORE: NavItem = {
  href: "/explore",
  label: "探索",
  match: (path) => path === "/" || startsWith("/explore")(path),
};
const MEMBER_NAV: NavItem[] = [
  EXPLORE,
  { href: "/ideas", label: "我的想法", match: (path) => startsWith("/ideas")(path) && path !== "/ideas/new" },
  { href: "/attempts", label: "承接中", match: startsWith("/attempts") },
];

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#292927] text-white shadow-2xs ${className}`}>
      <Sparkles className="h-4 w-4 text-[#e05b38]" />
    </span>
  );
}

function Brand() {
  return (
    <Link href="/explore" className="flex shrink-0 items-center gap-2.5" aria-label="Idea Platform 首页">
      <BrandMark />
      <span className="hidden whitespace-nowrap text-[17px] font-bold tracking-tight text-[#292927] sm:inline">
        IDEA<span className="font-normal text-[#777771]"> PLATFORM</span>
        <span className="text-[#e05b38]">.</span>
      </span>
    </Link>
  );
}

function navLinkClass(active: boolean) {
  return `shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-medium transition ${
    active ? "bg-[#efeee8] text-[#292927]" : "text-[#777771] hover:text-[#292927]"
  }`;
}

function WriteIdeaButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="写下想法"
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#292927] px-2.5 py-2 text-[13px] font-semibold text-white shadow-2xs transition hover:bg-[#3d3d3a] sm:px-4"
    >
      <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      <span className="hidden sm:inline">写下想法</span>
    </Link>
  );
}

function AccountMenu({ user, isAdmin, path }: { user: User; isAdmin: boolean; path: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass = (active: boolean) =>
    `block rounded-lg px-3 py-2 text-[13px] transition ${
      active ? "bg-[#efeee8] font-medium text-[#292927]" : "text-[#4a4a45] hover:bg-[#f1f0eb] hover:text-[#292927]"
    }`;
  const accountItems = [
    { href: "/works", label: "我的作品" },
    { href: "/works/import", label: "收录已有网站" },
    { href: "/profile", label: "个人资料" },
    { href: "/settings", label: "设置" },
    ...(isAdmin ? [{ href: "/admin", label: "管理后台" }] : []),
  ];

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`账户菜单：${user.displayName}`}
        className="flex items-center gap-1 rounded-full p-0.5 ring-2 ring-transparent transition hover:ring-[#d8d7cf] focus-visible:ring-[#c9c8bf]"
      >
        <Avatar initials={user.initials} accent={user.accent} size={30} />
        <ChevronDown className="hidden h-3.5 w-3.5 text-[#989890] sm:block" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-2xl border border-[#e4e3db] bg-[#fffefb] p-1.5 shadow-[0_12px_40px_rgba(41,41,39,0.1)]">
          <div className="truncate px-3 pb-2 pt-1.5 text-[12px] text-[#777771]">{user.displayName}</div>
          <div className="sm:hidden">
            {MEMBER_NAV.map((item) => (
              <Link key={item.href} role="menuitem" href={item.href} className={itemClass(item.match(path))}>
                {item.label}
              </Link>
            ))}
            <div className="my-1 border-t border-[#efeee8]" />
          </div>
          {accountItems.map((item) => (
            <Link
              key={item.href}
              role="menuitem"
              href={item.href}
              prefetch={item.href === "/works" ? false : undefined}
              className={itemClass(path === item.href)}
            >
              {item.label}
            </Link>
          ))}
          <div className="my-1 border-t border-[#efeee8]" />
          <form action={logoutAction}>
            <button type="submit" role="menuitem" className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-[#777771] transition hover:bg-rose-50 hover:text-rose-600">
              退出登录
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader({
  user,
  unread = 0,
  isAdmin = false,
  className = "",
}: {
  user: User | null;
  unread?: number;
  isAdmin?: boolean;
  className?: string;
}) {
  const path = usePathname() ?? "";

  return (
    <header className={`explore-header site-header sticky top-0 z-40 w-full border-b border-[#e4e3db]/80 backdrop-blur-md ${className}`}>
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-8">
        <div className="flex shrink-0 items-center gap-6">
          <Brand />
          <nav aria-label={user ? "主导航" : "游客导航"} className="hidden items-center gap-1 sm:flex">
            {(user ? MEMBER_NAV : [EXPLORE]).map((item) => {
              const active = item.match(path);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={navLinkClass(active)}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {user ? (
            <>
              <Link
                href="/notifications"
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#777771] transition hover:bg-[#efeee8] hover:text-[#292927]"
                aria-label={unread ? `通知，${unread} 条未读` : "通知"}
                title="通知"
              >
                <Bell size={17} />
                {unread > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#e05b38] ring-2 ring-[#faf9f6]" /> : null}
              </Link>
              <WriteIdeaButton href="/ideas/new" />
              <AccountMenu user={user} isAdmin={isAdmin} path={path} />
            </>
          ) : (
            <>
              <Link href={`/login?next=${encodeURIComponent(path || "/")}`} className={navLinkClass(false)}>
                登录
              </Link>
              <WriteIdeaButton href="/register" />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
