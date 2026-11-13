import type {
  Curation,
  OwnerPatch,
  Project,
  ProjectStatus,
  RepoActivity,
  RepoSnapshot,
  Showcase,
} from "./types.ts";

const DAY = 86_400_000;
export const ACTIVE_DAYS = 14;
export const COOLING_DAYS = 60;
export const FEATURED_MIN_SCORE = 55;
export const FEATURED_LIMIT = 6;
export const TAGLINE_MAX = 80;
export const NOTE_MAX = 4000;

export function emptyShowcase(): Showcase {
  return { version: 1, projects: [] };
}

export function lastActivityAt(project: Pick<Project, "pushedAt" | "activity">): string {
  return project.activity?.lastCommitAt ?? project.pushedAt;
}

export function projectStatus(
  project: Pick<Project, "isArchived" | "pushedAt" | "activity">,
  now = Date.now(),
): ProjectStatus {
  if (project.isArchived) return "archived";
  const age = (now - new Date(lastActivityAt(project)).getTime()) / DAY;
  if (age <= ACTIVE_DAYS) return "active";
  if (age <= COOLING_DAYS) return "cooling";
  return "dormant";
}

/**
 * Fold a fresh GitHub listing into the stored projects.
 * GitHub fields are replaced, owner fields and curation are kept, and repos that
 * disappeared are marked removed instead of deleted so notes are never lost.
 */
export function mergeRepos(
  existing: Project[],
  repos: RepoSnapshot[],
  activity: Map<string, RepoActivity>,
  now = new Date().toISOString(),
  options: { includesPrivate?: boolean } = {},
): Project[] {
  const includesPrivate = options.includesPrivate ?? true;
  const previous = new Map(existing.map((project) => [project.id, project]));
  const seen = new Set<string>();
  const merged: Project[] = repos.map((repo) => {
    seen.add(repo.id);
    const old = previous.get(repo.id);
    return {
      ...repo,
      activity: activity.get(repo.id) ?? old?.activity,
      curation: old?.curation,
      pinned: old?.pinned ?? false,
      hidden: old?.hidden ?? false,
      tagline: old?.tagline ?? "",
      note: old?.note ?? "",
    };
  });
  for (const old of existing) {
    if (seen.has(old.id)) continue;
    // A public-only listing (no token) says nothing about private repos: keep them as they are.
    if (old.isPrivate && !includesPrivate) merged.push(old);
    else merged.push({ ...old, removedAt: old.removedAt ?? now });
  }
  return merged;
}

export function applyOwnerPatch(project: Project, patch: OwnerPatch): Project {
  const next = { ...project };
  if (typeof patch.pinned === "boolean") next.pinned = patch.pinned;
  if (typeof patch.hidden === "boolean") next.hidden = patch.hidden;
  if (typeof patch.tagline === "string") next.tagline = patch.tagline.trim().slice(0, TAGLINE_MAX);
  if (typeof patch.note === "string") next.note = patch.note.slice(0, NOTE_MAX);
  return next;
}

/** `owner/owner` holds the GitHub profile README, not a project. */
export function isProfileRepo(project: Pick<Project, "fullName" | "name">) {
  return project.fullName.split("/")[0].toLowerCase() === project.name.toLowerCase();
}

/** The only projects that may ever reach a public page. */
export function isPublicProject(project: Project) {
  return (
    !project.isPrivate && !project.isFork && !project.hidden && !project.removedAt && !isProfileRepo(project)
  );
}

function scoreOf(project: Project) {
  return project.curation?.score ?? -1;
}

function byRecentActivity(a: Project, b: Project) {
  return lastActivityAt(b).localeCompare(lastActivityAt(a));
}

export function featuredProjects(projects: Project[], limit = FEATURED_LIMIT): Project[] {
  const visible = projects.filter(isPublicProject);
  const pinned = visible
    .filter((project) => project.pinned)
    .sort((a, b) => scoreOf(b) - scoreOf(a) || byRecentActivity(a, b));
  const curated = visible
    .filter((project) => !project.pinned && scoreOf(project) >= FEATURED_MIN_SCORE)
    .sort((a, b) => scoreOf(b) - scoreOf(a) || byRecentActivity(a, b));
  return [...pinned, ...curated].slice(0, Math.max(limit, pinned.length));
}

/** Strip owner-only fields before anything is handed to a public page. */
function toPublic(project: Project): Project {
  return { ...project, note: "" };
}

export function publicSections(showcase: Showcase, now = Date.now()) {
  const featured = featuredProjects(showcase.projects).map(toPublic);
  const featuredIds = new Set(featured.map((project) => project.id));
  const rest = showcase.projects
    .filter((project) => isPublicProject(project) && !featuredIds.has(project.id))
    .sort(byRecentActivity)
    .map(toPublic);
  return {
    featured,
    building: rest.filter((project) => projectStatus(project, now) === "active"),
    others: rest.filter((project) => projectStatus(project, now) !== "active"),
    total: featured.length + rest.length,
  };
}

/** Pitch shown in public: owner override, then curated pitch, then GitHub description. */
export function displayPitch(project: Project) {
  return project.tagline || project.curation?.pitch || project.description;
}

export function needsCuration(project: Project, options: { all?: boolean } = {}) {
  if (project.isFork || project.removedAt) return false;
  if (options.all || !project.curation) return true;
  return project.curation.basedOnPushedAt !== project.pushedAt;
}

export type CurationResult = Pick<Curation, "score" | "pitch" | "reason"> & {
  repo: string;
  /** pushedAt of the README that was judged; defaults to the stored value. */
  basedOnPushedAt?: string;
};

/**
 * Parse Claude's reply. Tolerates prose or code fences around the JSON array,
 * drops entries for repos that were not asked about, and clamps scores.
 */
export function parseCurationOutput(text: string, expected: string[]): CurationResult[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("评选结果里没有 JSON 数组");
  const raw: unknown = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(raw)) throw new Error("评选结果不是数组");
  const wanted = new Map(expected.map((name) => [name.toLowerCase(), name]));
  const results = new Map<string, CurationResult>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const repo = wanted.get(String(entry.repo ?? "").trim().toLowerCase());
    const score = Number(entry.score);
    if (!repo || !Number.isFinite(score)) continue;
    results.set(repo, {
      repo,
      score: Math.round(Math.min(100, Math.max(0, score))),
      pitch: String(entry.pitch ?? "").trim().slice(0, TAGLINE_MAX),
      reason: String(entry.reason ?? "").trim().slice(0, 200),
    });
  }
  return [...results.values()];
}

export function applyCurations(
  projects: Project[],
  results: CurationResult[],
  now = new Date().toISOString(),
): Project[] {
  const byRepo = new Map(results.map((result) => [result.repo.toLowerCase(), result]));
  return projects.map((project) => {
    const result = byRepo.get(project.id);
    if (!result) return project;
    return {
      ...project,
      curation: {
        score: result.score,
        pitch: result.pitch,
        reason: result.reason,
        curatedAt: now,
        basedOnPushedAt: result.basedOnPushedAt ?? project.pushedAt,
      },
    };
  });
}
