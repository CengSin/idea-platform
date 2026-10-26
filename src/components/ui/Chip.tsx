import { clsxJoin } from "@/lib/format";

export function Chip({
  children,
  tone = "mute",
}: {
  children: React.ReactNode;
  tone?: "mute" | "idea" | "active" | "artifact";
}) {
  const tones = {
    mute: "border-[#e4e3db] bg-[#efeee8] text-[#777771] font-medium",
    idea: "border-[#f0c4b6] bg-[#fdf0eb] text-[#bf4528] font-medium",
    active: "border-[#c9d6d1] bg-[#eef3f1] text-[#3f5852] font-medium",
    artifact: "border-[#d8d7cf] bg-[#f1f0eb] text-[#292927] font-medium",
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
