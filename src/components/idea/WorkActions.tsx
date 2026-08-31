"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { COMMERCIAL_LABEL, WORK_TYPE_LABEL } from "@/lib/format";
import { isPlaceholderCover } from "@/lib/cover";
import type { Work } from "@/lib/types";

export function WorkActions({ work }: { work: Work }) {
  const router = useRouter();
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const initialCover = isPlaceholderCover(work.coverUrl) ? "" : work.coverUrl;

  function open(next: "edit" | "delete") {
    setError("");
    setSaved(false);
    setMode(next);
  }

  async function submit(method: "PATCH" | "DELETE", fields: Record<string, unknown> = {}) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/works/${encodeURIComponent(work.id)}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, user_confirmed: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "操作失败，请稍后重试。");
      setMode(null);
      if (method === "DELETE") router.replace("/works");
      else setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "网络异常，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="glass rounded-3xl p-5">
      <h2 className="text-[13px] font-medium">管理我的作品</h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">更新作品信息，或从平台移除这个作品。</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => open("edit")}><Pencil className="h-3.5 w-3.5" />编辑作品</Button>
        <Button tone="danger" onClick={() => open("delete")}><Trash2 className="h-3.5 w-3.5" />删除作品</Button>
      </div>
      {saved ? <p role="status" className="mt-3 text-[13px] text-active">作品已更新。</p> : null}
      <Dialog open={mode === "edit"} onClose={() => { if (!pending) setMode(null); }} title="编辑作品" subtitle="保存后立即更新公开信息；来源想法、承接分支和贡献署名保持不变。" wide>
        <form key={`${work.id}-${mode}`} onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const fields: Record<string, unknown> = {
            title: data.get("title"), summary: data.get("summary"), type: data.get("type"),
            external_url: data.get("external_url"), repository_url: data.get("repository_url"),
            license: {
              implementation: data.get("implementation") === "on",
              derivatives: data.get("derivatives") === "on",
              commercialUse: data.get("commercialUse"),
            },
          };
          const cover = String(data.get("cover_url") ?? "").trim();
          if (cover !== initialCover) fields.cover_url = cover;
          void submit("PATCH", fields);
        }}>
          <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
            <Field label="作品名称"><TextInput name="title" defaultValue={work.title} required maxLength={200} autoFocus /></Field>
            <Field label="作品简介"><TextArea name="summary" defaultValue={work.summary} maxLength={10000} rows={4} /></Field>
            <Field label="作品类型"><Select name="type" defaultValue={work.type}>
              {Object.entries(WORK_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select></Field>
            <Field label="作品链接"><TextInput name="external_url" type="url" defaultValue={work.externalUrl ?? ""} placeholder="https://example.com" /></Field>
            <Field label="代码仓库链接（可选）"><TextInput name="repository_url" type="url" defaultValue={work.repositoryUrl ?? ""} placeholder="https://github.com/…" /></Field>
            <Field label="封面链接（可选）" hint="支持站内路径或 http/https 链接。清空封面，或修改作品链接而不改封面时，会重新提取网站预览。">
              <TextInput name="cover_url" defaultValue={initialCover} placeholder="留空自动获取网站预览" />
            </Field>
            <div className="flex flex-wrap gap-5 text-[13px]">
              <label className="flex items-center gap-2"><input name="implementation" type="checkbox" defaultChecked={work.license.implementation} />允许实现</label>
              <label className="flex items-center gap-2"><input name="derivatives" type="checkbox" defaultChecked={work.license.derivatives} />允许衍生</label>
            </div>
            <Field label="商用授权"><Select name="commercialUse" defaultValue={work.license.commercialUse}>
              {Object.entries(COMMERCIAL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select></Field>
          </fieldset>
          {error ? <p role="alert" className="mt-4 text-[13px] text-blocked">{error}</p> : null}
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" disabled={pending} onClick={() => setMode(null)}>取消</Button>
            <Button type="submit" tone="idea" disabled={pending}>{pending ? "正在保存…" : "保存修改"}</Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={mode === "delete"} onClose={() => { if (!pending) setMode(null); }} title="删除这个作品？" subtitle={`「${work.title}」将从平台移除，无法恢复。`}>
        <p className="text-[13.5px] leading-relaxed text-muted">
          来源想法、承接分支及其他作品会保留，外部网站与代码仓库不会被删除。
          如果这是分支最后一个已发布作品，已发布的承接将回到测试阶段。已有衍生想法会保留，并继续关联来源想法。
        </p>
        {error ? <p role="alert" className="mt-4 text-[13px] text-blocked">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button disabled={pending} onClick={() => setMode(null)}>取消</Button>
          <Button tone="danger" disabled={pending} onClick={() => void submit("DELETE")}>{pending ? "正在删除…" : "确认删除"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
