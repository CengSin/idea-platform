"use client";

import { removeProjectLinkAction } from "@/lib/actions";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";

export function RemoveProjectLink({ linkId }: { linkId: string }) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(formData) => start(() => removeProjectLinkAction(formData))}
    >
      <input type="hidden" name="linkId" value={linkId} />
      <button
        type="submit"
        disabled={pending}
        className="pressable rounded-lg p-2 text-muted hover:bg-white/6 hover:text-blocked disabled:opacity-40"
        aria-label="移除项目连接"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
