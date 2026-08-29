"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { LiveDataRefresh } from "./LiveDataRefresh";
import type { User } from "@/lib/types";

export function AppShell({
  children,
  unread = 0,
  user,
}: {
  children: React.ReactNode;
  unread?: number;
  user: User;
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <div className="relative flex h-dvh overflow-hidden">
      <LiveDataRefresh />
      <div className="atmosphere" aria-hidden>
        <span className="atmosphere-blob a" />
        <span className="atmosphere-blob b" />
        <span className="atmosphere-blob c" />
      </div>
      <Sidebar unread={unread} user={user} />
      <main className="relative z-10 min-w-0 flex-1">
        <motion.div
          key={pathname}
          className="h-full"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
