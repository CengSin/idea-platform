"use client";

import { Button } from "@/components/ui/Button";
import { useSheets } from "@/components/sheets/SheetContext";
import type { ReactNode } from "react";

export function PublishIdeaButton({
  children = "发布 Idea",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const sheets = useSheets();
  return (
    <Button tone="idea" className={className} onClick={sheets.openPublishIdea}>
      {children}
    </Button>
  );
}
