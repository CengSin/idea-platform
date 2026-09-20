import { clsxJoin } from "@/lib/format";

export function Chip({
  children,
  tone = "mute",
}: {
  children: React.ReactNode;
  tone?: "mute" | "idea" | "active" | "artifact";
}) {
  const tones = {
    mute: "border-slate-200/80 bg-slate-100/80 text-slate-600 font-medium",
    idea: "border-amber-200 bg-amber-50 text-amber-800 font-medium",
    active: "border-indigo-200 bg-indigo-50 text-indigo-700 font-medium",
    artifact: "border-emerald-200 bg-emerald-50 text-emerald-800 font-medium",
  };
  return (
    <span
      className={clsxJoin(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] tracking-[0.04em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
