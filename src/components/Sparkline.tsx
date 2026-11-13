import { ACTIVITY_WEEKS } from "@/lib/github";

/** Weekly commits over the last 12 weeks; the right end is this week. */
export function Sparkline({
  weekly,
  width = 96,
  height = 24,
  className,
}: {
  weekly?: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const values = weekly?.length ? weekly : new Array<number>(ACTIVITY_WEEKS).fill(0);
  const total = values.reduce((sum, value) => sum + value, 0);
  const max = Math.max(1, ...values);
  const gap = 2;
  const bar = (width - gap * (values.length - 1)) / values.length;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`最近 12 周共 ${total} 次提交`}
      className={className}
    >
      <title>{`最近 12 周共 ${total} 次提交`}</title>
      {values.map((value, index) => {
        const h = value === 0 ? 1.5 : Math.max(3, (value / max) * height);
        return (
          <rect
            key={index}
            x={index * (bar + gap)}
            y={height - h}
            width={bar}
            height={h}
            rx={1}
            fill={value === 0 ? "var(--color-line-strong)" : "var(--color-active)"}
            opacity={value === 0 ? 1 : 0.45 + 0.55 * (value / max)}
          />
        );
      })}
    </svg>
  );
}
