"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

const REFRESH_INTERVAL_MS = 30_000;

export function LiveDataRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const refreshing = useRef(false);
  refreshing.current = pending;

  useEffect(() => {
    let lastRefresh = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || refreshing.current) return;
      if (Date.now() - lastRefresh < REFRESH_INTERVAL_MS) return;
      // Do not interrupt an open editor or a form submission.
      if (document.querySelector('[role="dialog"]') || document.activeElement?.matches("input, textarea, select")) return;
      lastRefresh = Date.now();
      startTransition(() => router.refresh());
    };
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, startTransition]);

  return null;
}
