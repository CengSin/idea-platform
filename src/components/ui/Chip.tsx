import { clsxJoin } from "@/lib/format";

export function Chip({
  children,
  tone = "mute",
}: {
  children: React.ReactNode;
  tone?: "mute" | "idea" | "active" | "artifact";
}) {
  const tones = {
    mute: "border-line bg-white/6 text-muted",
    idea: "border-idea/25 bg-idea/10 text-idea",
    active: "border-active/25 bg-active/10 text-active",
    artifact: "border-artifact/20 bg-artifact/10 text-artifact",
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
