import type { Database } from "./types";
export const at = "2026-09-03T10:00:00.000Z";
const license = { implementation: true, derivatives: true, commercialUse: "with_attribution" as const };

export function fixture(): Database {
  return {
    version: 3,
    users: [{ id: "owner", displayName: "作者", initials: "作", accent: "#fff", bio: "", skills: [], visibility: "public", createdAt: at, projectLinks: [] }],
    ideas: [{ id: "idea", title: "来源想法", summary: "简介", problem: "缺少迭代", whyItMatters: "持续生长", constraints: [], existingAttempts: [], openQuestions: [], desiredOutputs: [], tags: ["agent"], author: { kind: "user", userId: "owner", displayName: "作者" }, license, visibility: "public", status: "realized", graph: { x: 0, y: 0 }, createdAt: at, updatedAt: at }],
    attempts: [{ id: "attempt", ideaId: "idea", ownerId: "owner", title: "承接", approach: "", status: "published", progressNote: "", visibility: "public", blockers: [], startedAt: at, lastActiveAt: at, createdAt: at, workIds: ["work"] }],
    works: [{ id: "work", attemptId: "attempt", ideaId: "idea", title: "样例作品", summary: "已完成", type: "website", coverUrl: "", status: "published", credits: [], license, publishedAt: at, views: 0, saves: 0, citations: 0 }],
    events: [], notifications: [], follows: [],
  };
}

