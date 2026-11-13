import { lastActivityAt, projectStatus } from "@/lib/projects";
import { cx, languageColor, relativeTime } from "@/lib/format";
import { STATUS_LABEL, type Project, type ProjectStatus } from "@/lib/types";

const STATUS_DOT: Record<ProjectStatus, string> = {
  active: "bg-active",
  cooling: "bg-[#d9a441]",
  dormant: "bg-[#c4c3bb]",
  archived: "bg-[#c4c3bb]",
};

export function StatusLabel({ project, className }: { project: Project; className?: string }) {
  const status = projectStatus(project);
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
      <span aria-hidden className={cx("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]} · {relativeTime(lastActivityAt(project))}
    </span>
  );
}

export function LanguageLabel({ language }: { language?: string }) {
  if (!language) return null;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: languageColor(language) }} />
      {language}
    </span>
  );
}
