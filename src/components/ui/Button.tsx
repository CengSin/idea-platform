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
    idea: "bg-idea text-[#1a1208] shadow-[0_8px_24px_rgba(232,176,110,0.28)] hover:brightness-105",
    ghost:
      "bg-white/6 text-artifact border border-line hover:bg-white/10 hover:border-line-strong",
    active: "bg-active/15 text-active border border-active/30 hover:bg-active/22",
    danger: "bg-blocked/12 text-blocked border border-blocked/30",
    quiet: "bg-transparent text-muted hover:text-artifact hover:bg-white/5",
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
