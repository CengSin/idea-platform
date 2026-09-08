import type { Attempt } from "./types";

export type AttemptTodo = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

export class TodoError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MAX_TITLE = 500;
const MAX_TODOS = 100;

function normalizeTitle(title: unknown) {
  if (typeof title !== "string") throw new TodoError(400, "请填写待办内容。");
  const trimmed = title.trim();
  if (!trimmed) throw new TodoError(400, "请填写待办内容。");
  if (trimmed.length > MAX_TITLE) throw new TodoError(400, `待办最多 ${MAX_TITLE} 字符。`);
  return trimmed;
}

export function listTodos(attempt: Attempt): AttemptTodo[] {
  return [...(attempt.todos ?? [])];
}

export function addTodo(
  attempt: Attempt,
  input: { id: string; title: string },
  at: string,
): AttemptTodo {
  const todos = attempt.todos ?? [];
  const existing = todos.find((item) => item.id === input.id);
  if (existing) return existing;
  if (todos.length >= MAX_TODOS) throw new TodoError(400, `待办最多 ${MAX_TODOS} 项。`);
  const todo: AttemptTodo = {
    id: input.id,
    title: normalizeTitle(input.title),
    done: false,
    createdAt: at,
    updatedAt: at,
  };
  attempt.todos = [...todos, todo];
  return todo;
}

export function updateTodo(
  attempt: Attempt,
  input: { id: string; title?: string; done?: boolean },
  at: string,
): AttemptTodo {
  const todo = attempt.todos?.find((item) => item.id === input.id);
  if (!todo) throw new TodoError(404, "待办不存在。");
  if (input.title !== undefined) todo.title = normalizeTitle(input.title);
  if (input.done !== undefined) {
    if (typeof input.done !== "boolean") throw new TodoError(400, "完成状态无效。");
    todo.done = input.done;
  }
  todo.updatedAt = at;
  return todo;
}

export function deleteTodo(attempt: Attempt, id: string): AttemptTodo {
  const todos = attempt.todos ?? [];
  const index = todos.findIndex((item) => item.id === id);
  if (index < 0) throw new TodoError(404, "待办不存在。");
  const [removed] = todos.splice(index, 1);
  attempt.todos = todos;
  return removed;
}
