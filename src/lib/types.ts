export type Visibility = "public" | "unlisted" | "invite_only" | "private";
export type UserVisibility = "public" | "limited" | "private";
export type IdeaStatus =
  | "draft"
  | "published"
  | "evolving"
  | "realized"
  | "dormant"
  | "archived";
export type AttemptStatus =
  | "considering"
  | "understanding"
  | "prototyping"
  | "testing"
  | "paused"
  | "stalled"
  | "abandoned"
  | "published";
export type WorkType =
  | "website"
  | "app"
  | "video"
  | "article"
  | "research"
  | "art"
  | "hardware"
  | "other";
export type WorkStatus = "draft" | "published" | "archived";
export type AgentSuggestionStatus = "pending" | "accepted" | "dismissed";
export type AgentEmailStatus = "pending" | "sent" | "failed" | "skipped";
export type ActorKind = "user" | "agent";
export type CommercialUse = "yes" | "with_attribution" | "no";
export type NotificationKind =
  | "match"
  | "attempt"
  | "work"
  | "agent"
  | "stale"
  | "fork";

export const ACTIVE_ATTEMPT_STATUSES: AttemptStatus[] = [
  "understanding",
  "prototyping",
  "testing",
];

export const ATTEMPT_STAGE_ORDER: AttemptStatus[] = [
  "understanding",
  "prototyping",
  "testing",
  "published",
];

export interface ActorRef {
  kind: ActorKind;
  userId: string;
  displayName: string;
}

export interface License {
  implementation: boolean;
  derivatives: boolean;
  commercialUse: CommercialUse;
}

export interface ProjectLink {
  id: string;
  title: string;
  url: string;
  note?: string;
  createdAt: string;
}

export interface User {
  id: string;
  displayName: string;
  initials: string;
  accent: string;
  bio: string;
  skills: string[];
  visibility: UserVisibility;
  createdAt: string;
  projectLinks: ProjectLink[];
}

export interface ExistingAttemptRef {
  title: string;
  url?: string;
  note?: string;
}

export interface Idea {
  id: string;
  title: string;
  summary: string;
  problem: string;
  whyItMatters: string;
  constraints: string[];
  existingAttempts: ExistingAttemptRef[];
  openQuestions: string[];
  desiredOutputs: string[];
  tags: string[];
  author: ActorRef;
  license: License;
  visibility: Visibility;
  status: IdeaStatus;
  parentIdeaId?: string;
  sourceWorkId?: string;
  graph: { x: number; y: number };
  createdAt: string;
  updatedAt: string;
}

export interface Attempt {
  id: string;
  ideaId: string;
  ownerId: string;
  title: string;
  approach: string;
  projectDescription?: string;
  projectPurpose?: string;
  executionPrompt?: string;
  status: AttemptStatus;
  progressNote: string;
  visibility: Visibility;
  blockers: string[];
  startedAt: string;
  lastActiveAt: string;
  createdAt: string;
  targetDate?: string;
  workIds: string[];
  graph?: { x: number; y: number };
  featuredOnGraph?: boolean;
}

export interface Credit {
  userId?: string;
  role: string;
  name: string;
}

export interface Work {
  id: string;
  attemptId: string;
  ideaId: string;
  title: string;
  summary: string;
  type: WorkType;
  coverUrl: string;
  externalUrl?: string;
  repositoryUrl?: string;
  status: WorkStatus;
  credits: Credit[];
  license: License;
  publishedAt?: string;
  views: number;
  saves: number;
  citations: number;
  graph?: { x: number; y: number };
  iteration?: WorkIteration;
}

export interface AgentSuggestion {
  id: string;
  title: string;
  summary: string;
  problem: string;
  whyItMatters: string;
  status: AgentSuggestionStatus;
  createdAt: string;
  acceptedIdeaId?: string;
}

export interface WorkIteration {
  status: "open" | "closed";
  suggestions: AgentSuggestion[];
  scannedAt?: string;
  email: {
    status: AgentEmailStatus;
    lastAttemptAt?: string;
    sentAt?: string;
  };
}

export interface ActivityEvent {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  text: string;
  ideaId?: string;
  attemptId?: string;
  workId?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  at: string;
  title: string;
  body: string;
  read: boolean;
  href: string;
  kind: NotificationKind;
}

export interface Follow {
  userId: string;
  ideaId: string;
}

export interface IdeaMetrics {
  watchingCount: number;
  activeAttemptCount: number;
  pausedAttemptCount: number;
  workCount: number;
  forkCount: number;
  totalAttemptCount: number;
}

export interface IdeaContext {
  idea_id: string;
  title: string;
  summary: string;
  problem: string;
  why_it_matters: string;
  constraints: string[];
  existing_attempts: ExistingAttemptRef[];
  open_questions: string[];
  desired_outputs: string[];
  license: License;
  tags: string[];
  source: {
    url: string;
    author: string;
  };
}

export interface Database {
  version: number;
  users: User[];
  ideas: Idea[];
  attempts: Attempt[];
  works: Work[];
  events: ActivityEvent[];
  notifications: Notification[];
  follows: Follow[];
}

export const STALL_AFTER_DAYS = 21;
