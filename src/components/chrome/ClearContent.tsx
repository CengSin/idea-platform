"use client";

import { Button } from "@/components/ui/Button";
import { clearContentAction } from "@/lib/actions";
import { useTransition } from "react";

export function ClearContent() {
  const [pending, start] = useTransition();
  return (
    <Button
      tone="danger"
      disabled={pending}
      onClick={() => start(() => clearContentAction())}
    >
      {pending ? "正在清空…" : "清空全部内容数据"}
    </Button>
  );
}
