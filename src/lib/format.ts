export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const DAY = 86_400_000;

export function relativeTime(iso: string | undefined, now = Date.now()) {
  if (!iso) return "未知";
  const diff = now - new Date(iso).getTime();
  if (diff < 60 * 60_000) return "刚刚";
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)} 小时前`;
  const days = Math.floor(diff / DAY);
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
}

/** Fixed to Beijing time so server and client render the same string. */
export function formatDateTime(iso: string | undefined) {
  if (!iso) return "从未";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#d4b830",
  Python: "#3572a5",
  Go: "#00add8",
  Swift: "#f05138",
  Java: "#b07219",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Kotlin: "#a97bff",
  "C#": "#178600",
  Vue: "#41b883",
  Dart: "#00b4ab",
};

export function languageColor(language?: string) {
  return (language && LANGUAGE_COLORS[language]) || "#a8a79f";
}
