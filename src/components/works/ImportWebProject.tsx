"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ImportFields = {
  url: string;
  title: string;
  summary: string;
  problem: string;
  coverUrl: string;
  originalPublishedAt: string;
  collaborationOpen: boolean;
  ownsWebsite: boolean;
};

const initial: ImportFields = { url: "", title: "", summary: "", problem: "", coverUrl: "", originalPublishedAt: "", collaborationOpen: false, ownsWebsite: false };
const inputStyle = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 outline-none focus:border-emerald-600";

export function ImportWebProject({ authorName }: { authorName: string }) {
  const router = useRouter();
  const [fields, setFields] = useState<ImportFields>(initial);
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [existingUrl, setExistingUrl] = useState("");
  const update = <K extends keyof ImportFields>(key: K, value: ImportFields[K]) => setFields((current) => ({ ...current, [key]: value }));

  async function previewWebsite() {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/v1/works/import/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: fields.url }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "无法检查网站链接。");
      const preview = payload.preview as { title: string; description: string; imageUrl?: string; fetched: boolean; url: string };
      setFields((current) => ({ ...current, url: preview.url, title: current.title || preview.title, summary: current.summary || preview.description, coverUrl: current.coverUrl || preview.imageUrl || "" }));
      setMessage(preview.fetched ? "已读取网站信息，请检查并修改。" : "暂时无法读取网站信息，请手动填写后继续。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "检查网站时发生错误。");
    } finally {
      setPending(false);
    }
  }

  function showReview() {
    setError("");
    if (!fields.url || !fields.title.trim() || !fields.summary.trim() || !fields.problem.trim()) {
      setError("请填写网站链接、名称、简介和解决的问题。");
      return;
    }
    if (!fields.ownsWebsite) {
      setError("请确认你有权收录这个网站。");
      return;
    }
    setReview(true);
  }

  async function publish() {
    setPending(true);
    setError("");
    setExistingUrl("");
    try {
      const response = await fetch("/api/v1/works/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, userConfirmed: true }) });
      const payload = await response.json();
      if (!response.ok) {
        setExistingUrl(payload.existing_url || "");
        throw new Error(payload.error || "收录失败，请稍后重试。");
      }
      router.push(payload.url);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "收录失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-[860px] py-10 sm:py-14">
      <div className="mb-8"><span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">已有网站入驻</span><h1 className="mt-2 text-[34px] font-bold tracking-[-0.04em] text-slate-950">把你的线上作品带进来</h1><p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-slate-600">收录网站及它解决的问题。平台会标明这是已有作品，不会把后来补充的问题描述成开发起点。</p></div>
      {!review ? (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <div><label className="text-[13px] font-semibold text-slate-800" htmlFor="import-url">网站链接 *</label><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><input id="import-url" className={inputStyle} type="url" placeholder="https://your-site.com" value={fields.url} onChange={(event) => update("url", event.target.value)} /><button type="button" disabled={pending || !fields.url} onClick={() => void previewWebsite()} className="shrink-0 rounded-xl border border-slate-300 px-4 py-3 text-[13px] font-semibold text-slate-700 disabled:opacity-50">{pending ? "读取中…" : "获取网站信息"}</button></div></div>
          <div><label className="text-[13px] font-semibold text-slate-800" htmlFor="import-title">作品名称 *</label><input id="import-title" className={inputStyle} maxLength={200} value={fields.title} onChange={(event) => update("title", event.target.value)} /></div>
          <div><label className="text-[13px] font-semibold text-slate-800" htmlFor="import-summary">作品简介 *</label><textarea id="import-summary" className={inputStyle} rows={3} maxLength={2000} value={fields.summary} onChange={(event) => update("summary", event.target.value)} /></div>
          <div><label className="text-[13px] font-semibold text-slate-800" htmlFor="import-problem">这个网站解决了什么问题？ *</label><textarea id="import-problem" className={inputStyle} rows={3} maxLength={2000} value={fields.problem} onChange={(event) => update("problem", event.target.value)} /></div>
          <div className="grid gap-5 sm:grid-cols-2"><div><label className="text-[13px] font-semibold text-slate-800" htmlFor="import-date">原发布时间（可选）</label><input id="import-date" className={inputStyle} type="date" value={fields.originalPublishedAt} onChange={(event) => update("originalPublishedAt", event.target.value)} /></div><div><label className="text-[13px] font-semibold text-slate-800" htmlFor="import-cover">封面图片链接（可选）</label><input id="import-cover" className={inputStyle} type="url" placeholder="留空使用网站预览" value={fields.coverUrl} onChange={(event) => update("coverUrl", event.target.value)} /></div></div>
          <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-[13px] text-slate-700"><label className="flex items-start gap-3"><input type="checkbox" checked={fields.collaborationOpen} onChange={(event) => update("collaborationOpen", event.target.checked)} className="mt-1" /><span><strong>开放共创</strong><br />其他用户可以承接这个网站解决的问题，或从网站提出独立的新方向。默认关闭；此设置不授予复制源代码或商用权。</span></label><label className="flex items-start gap-3"><input type="checkbox" checked={fields.ownsWebsite} onChange={(event) => update("ownsWebsite", event.target.checked)} className="mt-1" /><span>我确认自己有权收录这个网站，并同意公开以上信息。</span></label></div>
          {message ? <p role="status" className="text-[13px] text-emerald-700">{message}</p> : null}
          {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
          <button type="button" onClick={showReview} className="rounded-xl bg-slate-950 px-6 py-3 text-[14px] font-semibold text-white">预览公开页面</button>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">已有作品入驻 · 发布预览</span><h2 className="mt-5 text-[27px] font-bold text-slate-950">{fields.title}</h2><p className="mt-2 text-[14px] leading-relaxed text-slate-600">{fields.summary}</p><dl className="mt-6 grid gap-4 text-[13px] sm:grid-cols-2"><div><dt className="text-slate-400">网站</dt><dd className="mt-1 break-all font-medium text-slate-800">{fields.url}</dd></div><div><dt className="text-slate-400">署名</dt><dd className="mt-1 font-medium text-slate-800">{authorName}</dd></div><div><dt className="text-slate-400">入驻时补充的问题</dt><dd className="mt-1 font-medium text-slate-800">{fields.problem}</dd></div><div><dt className="text-slate-400">原发布时间</dt><dd className="mt-1 font-medium text-slate-800">{fields.originalPublishedAt || "未提供"}</dd></div><div><dt className="text-slate-400">共创</dt><dd className="mt-1 font-medium text-slate-800">{fields.collaborationOpen ? "开放" : "仅展示"}</dd></div><div><dt className="text-slate-400">许可</dt><dd className="mt-1 font-medium text-slate-800">默认不授权复制、衍生或商用</dd></div></dl><p className="mt-6 text-[12px] leading-relaxed text-slate-500">作品将在确认后收录到平台，平台收录时间会与原发布时间分开显示。</p>{error ? <p role="alert" className="mt-4 text-[13px] text-red-700">{error}{existingUrl ? <a href={existingUrl} className="ml-2 underline">查看已有作品</a> : null}</p> : null}<div className="mt-7 flex flex-wrap gap-3"><button type="button" disabled={pending} onClick={() => setReview(false)} className="rounded-xl border border-slate-300 px-5 py-3 text-[13px] font-semibold text-slate-700">返回修改</button><button type="button" disabled={pending} onClick={() => void publish()} className="rounded-xl bg-slate-950 px-6 py-3 text-[13px] font-semibold text-white disabled:opacity-50">{pending ? "收录中…" : "确认并公开收录"}</button></div></div>
      )}
    </div>
  );
}
