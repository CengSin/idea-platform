"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addAttemptTodoAction,
  deleteAttemptTodoAction,
  updateAttemptTodoAction,
} from "@/lib/actions";
import type { Attempt } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";

export function AttemptTodoPanel({ attempt }: { attempt: Attempt }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const todos = attempt.todos ?? [];
  const remaining = todos.filter((item) => !item.done).length;

  const perform = (task: () => Promise<unknown>) => {
    setError("");
    start(async () => {
      try {
        await task();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "操作失败");
      }
    });
  };

  return (
    <section className="paper-sheet mt-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-medium">待办清单</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            记下本分支要做的事，完成后勾选。也可供连接的 Agent 通过接口同步。
          </p>
        </div>
        <span className="shrink-0 text-[12px] text-muted">
          {todos.length ? `${remaining}/${todos.length} 未完成` : "暂无待办"}
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-start gap-3 rounded-2xl border border-line/70 bg-white/4 px-3 py-2.5"
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[var(--idea)]"
              checked={todo.done}
              disabled={pending}
              onChange={() =>
                perform(() =>
                  updateAttemptTodoAction(attempt.id, { id: todo.id, done: !todo.done }),
                )
              }
              aria-label={todo.done ? "标为未完成" : "标为完成"}
            />
            <div className="min-w-0 flex-1">
              {editingId === todo.id ? (
                <form
                  className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    perform(async () => {
                      await updateAttemptTodoAction(attempt.id, {
                        id: todo.id,
                        title: editTitle,
                      });
                      setEditingId(null);
                    });
                  }}
                >
                  <TextInput
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    disabled={pending}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" tone="idea" disabled={pending || !editTitle.trim()}>
                      保存
                    </Button>
                    <Button
                      type="button"
                      tone="quiet"
                      disabled={pending}
                      onClick={() => setEditingId(null)}
                    >
                      取消
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className={`block w-full text-left text-[14px] leading-relaxed ${
                    todo.done ? "text-muted line-through" : "text-artifact"
                  }`}
                  onClick={() => {
                    setEditingId(todo.id);
                    setEditTitle(todo.title);
                  }}
                >
                  {todo.title}
                </button>
              )}
            </div>
            <Button
              type="button"
              tone="quiet"
              className="!px-2 !py-1 text-[12px]"
              disabled={pending}
              onClick={() => perform(() => deleteAttemptTodoAction(attempt.id, todo.id))}
            >
              删除
            </Button>
          </li>
        ))}
      </ul>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          const next = title.trim();
          if (!next) return;
          const id = crypto.randomUUID();
          perform(async () => {
            await addAttemptTodoAction(attempt.id, { id, title: next });
            setTitle("");
          });
        }}
      >
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="添加一项待办…"
          disabled={pending}
        />
        <Button type="submit" tone="idea" disabled={pending || !title.trim()}>
          {pending ? "保存中…" : "添加"}
        </Button>
      </form>
      {error ? <p className="mt-3 text-[13px] text-blocked">{error}</p> : null}
    </section>
  );
}
