"use client";

import { useSheets } from "@/components/sheets/SheetContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewIdeaPage() {
  const { openPublishIdea } = useSheets();
  const router = useRouter();

  useEffect(() => {
    openPublishIdea();
    router.replace("/ideas");
  }, [openPublishIdea, router]);

  return null;
}
