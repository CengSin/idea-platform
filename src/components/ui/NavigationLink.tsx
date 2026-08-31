"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { createPortal } from "react-dom";

function PendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return createPortal(
    <span role="status" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-idea/15">
      <span className="navigation-progress block h-full w-1/3 bg-idea" />
      <span className="sr-only">正在打开页面…</span>
    </span>,
    document.body,
  );
}

export default function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<PendingIndicator /></Link>;
}
