"use client";
import { NotebookPen, Plus, Settings, Bell, LogOut, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { logoutAction } from "@/lib/auth-actions";
import type { User } from "@/lib/types";
import Link from "@/components/ui/NavigationLink";
import { usePathname } from "next/navigation";
export function Sidebar({ unread = 0, user, isAdmin = false }: { unread?: number; user: User; isAdmin?: boolean }) {
  const path = usePathname();
  return <header className="notebook-nav">
    <Link href="/" className="notebook-brand" aria-label="想法共享首页"><NotebookPen size={27} strokeWidth={1.7}/><span>想法<span>共享.</span></span></Link>
    <nav aria-label="工作台导航">{[{href:"/",label:"发现"},{href:"/ideas",label:"我的想法"},{href:"/attempts",label:"承接中"},{href:"/works",label:"作品"}].map(item => <Link key={item.href} href={item.href} aria-current={(item.href === "/" ? path === "/" : path === item.href || path.startsWith(`${item.href}/`)) ? "page" : undefined}>{item.label}</Link>)}</nav>
    <div className="notebook-nav-tools"><Link className="nav-write" href="/ideas/new"><Plus size={16}/><span>写下想法</span></Link><Link href="/notifications" className="nav-icon" aria-label={unread ? `通知，${unread} 条未读` : "通知"} title="通知"><Bell size={18}/>{unread > 0 && <i/>}</Link>{isAdmin && <Link className="nav-icon" href="/admin" aria-label="管理" title="管理"><ShieldCheck size={18}/></Link>}<Link href="/settings" className="nav-icon" aria-label="设置" title="设置"><Settings size={18}/></Link><Link href="/profile" aria-label="个人资料" title={user.displayName}><Avatar initials={user.initials} accent={user.accent} size={30}/></Link><form action={logoutAction}><button className="nav-icon" title="退出登录" aria-label="退出登录"><LogOut size={16}/></button></form></div>
  </header>;
}
