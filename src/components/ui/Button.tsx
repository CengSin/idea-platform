import { clsxJoin } from "@/lib/format";
import type { ButtonHTMLAttributes } from "react";

type Tone = "idea" | "ghost" | "active" | "danger" | "quiet";

export function Button({
  tone = "ghost",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  const tones: Record<Tone, string> = {
    idea: "bg-slate-900 text-white shadow-xs hover:bg-slate-800 border border-transparent",
    ghost:
      "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-2xs",
    active: "bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100/80",
    danger: "bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100/80",
    quiet: "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80",
  };
  return (
    <button
      className={clsxJoin(
        "pressable inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-medium tracking-[-0.01em] transition-[filter,background-color,border-color,transform] disabled:opacity-40 disabled:pointer-events-none",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
