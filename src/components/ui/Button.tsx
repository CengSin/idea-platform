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
    idea: "bg-[#292927] text-white shadow-xs hover:bg-[#3d3d3a] border border-transparent",
    ghost:
      "bg-[#fffefb] text-[#4a4a45] border border-[#e4e3db] hover:bg-[#f1f0eb] hover:border-[#d8d7cf] shadow-2xs",
    active: "bg-[#eef3f1] text-[#3f5852] border border-[#c9d6d1] hover:bg-[#e4ece9]",
    danger: "bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100/80",
    quiet: "bg-transparent text-[#777771] hover:text-[#292927] hover:bg-[#efeee8]",
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
