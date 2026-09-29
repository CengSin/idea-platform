"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImportedCollaboration({ workId, initiallyOpen }: { workId: string; initiallyOpen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/works/${encodeURIComponent(workId)}/collaboration`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collaboration_open: !open }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "设置失败，请稍后重试。");
      setOpen(payload.collaboration_open === true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "设置失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return <section className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="text-[14px] font-semibold text-slate-900">入驻网站共创</h2><p className="mt-2 text-[12px] leading-relaxed text-slate-500">当前{open ? "开放" : "仅展示"}。{open ? "其他人可承接关联问题或提出独立新方向。" : "其他人暂不能创建新的承接或衍生。"}关闭后，已存在的承接和公开内容仍会保留。此设置不授予复制源代码或商用权。</p><button type="button" disabled={pending} onClick={() => void toggle()} className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-[13px] font-semibold text-slate-800 disabled:opacity-50">{pending ? "保存中…" : open ? "关闭共创" : "开启共创"}</button>{error ? <p role="alert" className="mt-3 text-[12px] text-red-700">{error}</p> : null}</section>;
}
