"use client";

import { Button } from "@/components/ui/Button";
import { markNotificationsReadAction } from "@/lib/actions";
import { useTransition } from "react";

export function MarkRead() {
  const [pending, start] = useTransition();
  return (
    <Button disabled={pending} onClick={() => start(() => markNotificationsReadAction())}>
      全部标为已读
    </Button>
  );
}
