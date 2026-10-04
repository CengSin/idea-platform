/** Shared, title-free TODO progress for an attempt: "3/5 项待办" plus a thin bar. */
export function TodoProgressBar({
  done,
  total,
  tone = "workspace",
  className = "",
}: {
  done: number;
  total: number;
  tone?: "workspace" | "public";
  className?: string;
}) {
  const muted = tone === "public" ? "text-slate-500" : "text-muted";
  if (total === 0) {
    return <span className={`text-[11.5px] ${muted} ${className}`}>还没有列出待办</span>;
  }
  const percent = Math.round((done / total) * 100);
  const finished = done === total;
  return (
    <span className={`flex min-w-0 items-center gap-2 ${className}`} aria-label={`待办完成 ${done}/${total}`}>
      <span className={`relative h-1.5 w-24 shrink-0 overflow-hidden rounded-full ${tone === "public" ? "bg-slate-200" : "bg-line"}`}>
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${finished ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className={`whitespace-nowrap font-mono text-[11.5px] ${muted}`}>
        {done}/{total} 项待办{finished ? " · 已全部完成" : ""}
      </span>
    </span>
  );
}
