"use client";

import { CornerDownRight, MessageSquare, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/ui/NavigationLink";
import { deleteIdeaCommentAction, postIdeaCommentAction } from "@/lib/discussion-actions";
import { COMMENT_MAX_LENGTH, type DiscussionComment, type IdeaDiscussion as Discussion } from "@/lib/idea-discussion";

const commentDate = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai",
});

type Draft = { body: string; parentId?: string };

export function IdeaDiscussion({
  ideaId,
  discussion,
  viewerId,
  returnPath,
}: {
  ideaId: string;
  discussion: Discussion;
  viewerId?: string;
  returnPath: string;
}) {
  const router = useRouter();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const submissionId = useRef<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ body: "" });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [pending, startTransition] = useTransition();
  const storageKey = `idea-discussion-draft:${ideaId}`;
  const parent = discussion.threads.find((thread) => thread.id === draft.parentId && !thread.deleted);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<Draft>;
      if (typeof stored.body !== "string") return;
      const parentId = typeof stored.parentId === "string" && stored.parentId ? stored.parentId : undefined;
      setDraft({ body: stored.body.slice(0, COMMENT_MAX_LENGTH), parentId });
      if (viewerId && (stored.body || parentId)) {
        const frame = window.requestAnimationFrame(() => {
          document.getElementById("discussion-composer")?.scrollIntoView({ block: "center" });
          textarea.current?.focus({ preventScroll: true });
        });
        return () => window.cancelAnimationFrame(frame);
      }
    } catch {}
  }, [storageKey, viewerId]);

  const saveDraft = (next: Draft) => {
    try {
      if (!next.body && !next.parentId) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  };

  const updateDraft = (next: Draft) => {
    setDraft(next);
    submissionId.current = null;
    setError("");
    setStatus("");
    saveDraft(next);
  };

  const reply = (comment: DiscussionComment) => {
    updateDraft({ body: draft.body, parentId: comment.id });
    document.getElementById("discussion-composer")?.scrollIntoView({ behavior: "smooth", block: "center" });
    textarea.current?.focus({ preventScroll: true });
  };

  const submit = () => {
    if (!viewerId || pending || !draft.body.trim()) return;
    setError("");
    setStatus("");
    submissionId.current ??= `comment_${crypto.randomUUID()}`;
    const id = submissionId.current;
    startTransition(async () => {
      try {
        const result = await postIdeaCommentAction({ id, ideaId, body: draft.body, parentId: draft.parentId });
        if ("error" in result) { setError(result.error); setRequiresLogin(Boolean(result.requiresLogin)); return; }
        const empty = { body: "" };
        setDraft(empty);
        saveDraft(empty);
        submissionId.current = null;
        setStatus(parent ? "回复已发布。" : "留言已发布。");
        router.refresh();
      } catch {
        setError("留言暂时未能发布，内容已保留，请重试。");
      }
    });
  };

  const remove = (commentId: string) => {
    setError("");
    setStatus("");
    startTransition(async () => {
      try {
        const result = await deleteIdeaCommentAction(ideaId, commentId);
        if ("error" in result) { setError(result.error); setRequiresLogin(Boolean(result.requiresLogin)); return; }
        setDeletingId(null);
        if (draft.parentId === commentId) updateDraft({ body: draft.body });
        setStatus("留言已删除。");
        router.refresh();
      } catch {
        setError("留言暂时未能删除，请重试。");
      }
    });
  };

  const renderComment = (comment: DiscussionComment, isReply = false) => (
    <article id={`comment-${comment.id}`} className={`min-w-0 scroll-mt-24 ${isReply ? "py-4" : "py-5"}`} key={comment.id}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ backgroundColor: comment.author.accent }}>
          {comment.author.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
            {comment.author.profileUrl ? <Link href={comment.author.profileUrl} className="font-semibold text-slate-800 hover:underline">{comment.author.name}</Link>
              : <span className="font-semibold text-slate-800">{comment.author.name}</span>}
            {comment.author.isIdeaAuthor ? <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">想法作者</span>
              : comment.author.isBuilder ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">承接者</span> : null}
            <time dateTime={comment.createdAt} className="text-[11px] text-slate-400">{commentDate.format(new Date(comment.createdAt))}</time>
          </div>
          <p className={`mt-2 whitespace-pre-wrap break-words text-[14px] leading-7 ${comment.deleted ? "italic text-slate-400" : "text-slate-600"}`}>
            {comment.deleted ? "这条留言已由作者删除，回复仍保留。" : comment.body}
          </p>
          {!comment.deleted && <div className="mt-2 flex flex-wrap items-center gap-4">
            {!isReply && <button type="button" disabled={pending} onClick={() => reply(comment)} className="inline-flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50" aria-label={`回复 ${comment.author.name} 的留言`}>
              <CornerDownRight size={13} />回复
            </button>}
            {comment.canDelete && <button type="button" disabled={pending} onClick={() => setDeletingId(comment.id)} className="inline-flex min-h-9 items-center gap-1.5 text-[12px] text-slate-400 hover:text-red-600 disabled:opacity-50" aria-label="删除自己的留言">
              <Trash2 size={12} />删除
            </button>}
          </div>}
          {deletingId === comment.id && <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-[12px]">
            <span className="text-slate-600">删除这条留言？已有回复会保留。</span>
            <button type="button" disabled={pending} onClick={() => remove(comment.id)} className="min-h-9 font-semibold text-red-600 disabled:opacity-50">确认删除</button>
            <button type="button" disabled={pending} onClick={() => setDeletingId(null)} className="min-h-9 text-slate-500">取消</button>
          </div>}
        </div>
      </div>
    </article>
  );

  const nextPath = `${returnPath}#${draft.parentId ? `comment-${draft.parentId}` : "discussion"}`;

  return (
    <section id="discussion" aria-labelledby="discussion-heading" className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-orange-700"><MessageSquare size={13} />从交流开始</div>
          <h2 id="discussion-heading" className="mt-2 text-[22px] font-semibold tracking-tight text-slate-900">一起聊聊这个想法<span className="ml-2 text-[13px] font-normal text-slate-400">{discussion.count} 条</span></h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500">补充真实场景、问清一个问题，或分享你想到的实现方式。</p>
        </div>
      </div>

      <form id="discussion-composer" className="mt-5 scroll-mt-24" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        {draft.parentId && <div className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-orange-50/70 px-3 py-2 text-[12px] text-orange-800">
          <span className="truncate">{parent ? `正在回复 ${parent.author.name}：${parent.body}` : "原留言已删除，请取消回复后重新留言。"}</span>
          <button type="button" disabled={pending} onClick={() => updateDraft({ body: draft.body })} aria-label="取消回复" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-orange-100"><X size={14} /></button>
        </div>}
        <label htmlFor="discussion-body" className="sr-only">{draft.parentId ? "回复内容" : "留言内容"}</label>
        <textarea id="discussion-body" ref={textarea} value={draft.body} onChange={(event) => updateDraft({ ...draft, body: event.target.value })} disabled={pending}
          maxLength={COMMENT_MAX_LENGTH} rows={4} placeholder="补充你的使用场景、提出问题，或分享一种实现方式…"
          className="block w-full resize-y rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-[14px] leading-7 text-slate-800 outline-none placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:opacity-60" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">{draft.body.length}/{COMMENT_MAX_LENGTH} · {viewerId ? "留言将公开显示" : "登录后继续，已写内容会保留"}</span>
          {viewerId && !requiresLogin ? <button type="submit" disabled={pending || !draft.body.trim() || Boolean(draft.parentId && !parent)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
            <Send size={13} />{pending ? "正在保存…" : draft.parentId ? "发布回复" : "发布留言"}
          </button> : <Link href={`/login?next=${encodeURIComponent(nextPath)}`} onClick={(event) => {
            if (!saveDraft(draft) && draft.body) { event.preventDefault(); setError("浏览器暂时无法保留内容，请先复制留言，再登录继续。"); }
          }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800">登录并参与讨论</Link>}
        </div>
      </form>

      {error && <p role="alert" className="mt-3 text-[13px] text-red-600">{error}</p>}
      <p role="status" aria-live="polite" className="mt-2 text-[12px] text-emerald-700">{status}</p>

      {discussion.threads.length ? <div className="mt-5 divide-y divide-slate-100 border-t border-slate-200/70">
        {discussion.threads.map((thread) => <div key={thread.id}>
          {renderComment(thread)}
          {thread.replies.length > 0 && <div className="mb-4 ml-4 divide-y divide-slate-100 border-l-2 border-slate-100 pl-4 sm:ml-11">
            {thread.replies.map((comment) => renderComment(comment, true))}
          </div>}
        </div>)}
      </div> : <div className="mt-6 border-t border-slate-100 py-6 text-center">
        <p className="text-[14px] font-medium text-slate-700">这个想法，还缺哪一块？</p>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-400">一个问题或一个真实场景，就可以成为第一条讨论。</p>
      </div>}
    </section>
  );
}
