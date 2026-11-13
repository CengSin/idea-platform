/** Fields copied from GitHub on every sync. */
export interface RepoSnapshot {
  id: string; // lower-cased full name, stable across syncs
  fullName: string;
  name: string;
  description: string;
  url: string;
  homepage?: string;
  language?: string;
  topics: string[];
  stars: number;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  createdAt: string;
  pushedAt: string;
}

export interface RepoActivity {
  /** Commits per week on the default branch, oldest first; the last bucket is the current week. */
  weekly: number[];
  commits30d: number;
  lastCommitAt?: string;
  lastCommitMessage?: string;
  fetchedAt: string;
}

/** Written by `npm run curate` (local Claude Code). */
export interface Curation {
  score: number; // 0-100 imagination score
  pitch: string;
  reason: string;
  curatedAt: string;
  /** pushedAt of the repo when it was curated; a newer push makes it stale. */
  basedOnPushedAt: string;
}

export interface Project extends RepoSnapshot {
  activity?: RepoActivity;
  curation?: Curation;
  // Owner-controlled; never overwritten by sync or curation.
  pinned: boolean;
  hidden: boolean;
  /** Public one-liner that overrides the curated pitch. */
  tagline: string;
  /** Private notes: what this project is really about, what to do next. */
  note: string;
  /** Set when the repo no longer comes back from GitHub (deleted, renamed or transferred). */
  removedAt?: string;
}

export interface OwnerProfile {
  login: string;
  name: string;
  bio: string;
  avatarUrl: string;
  url: string;
}

export interface Showcase {
  version: 1;
  owner?: OwnerProfile;
  projects: Project[];
  syncedAt?: string;
  curatedAt?: string;
}

export type ProjectStatus = "active" | "cooling" | "dormant" | "archived";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "推进中",
  cooling: "放缓",
  dormant: "沉睡",
  archived: "已归档",
};

export type OwnerPatch = Partial<Pick<Project, "pinned" | "hidden" | "tagline" | "note">>;
