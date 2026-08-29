import { clsxJoin } from "@/lib/format";

export function Avatar({
  initials,
  accent,
  size = 36,
  className,
}: {
  initials: string;
  accent: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={clsxJoin(
        "inline-flex shrink-0 items-center justify-center rounded-full border font-medium",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        background: `${accent}22`,
        borderColor: `${accent}66`,
        color: accent,
      }}
    >
      {initials.slice(0, 2)}
    </span>
  );
}
