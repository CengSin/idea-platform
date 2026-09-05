"use client";

import { Sidebar } from "./Sidebar";
import { LiveDataRefresh } from "./LiveDataRefresh";
import type { User } from "@/lib/types";

export function AppShell({
  children,
  unread = 0,
  user,
  isAdmin = false,
}: {
  children: React.ReactNode;
  unread?: number;
  user: User;
  isAdmin?: boolean;
}) {
  return (
    <div className="app-shell relative flex flex-col h-dvh overflow-hidden">
      <LiveDataRefresh />
      <Sidebar unread={unread} user={user} isAdmin={isAdmin} />
      <main className="workspace-main relative z-10 min-h-0 min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
