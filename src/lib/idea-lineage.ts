import type { Attempt } from "./types";

export function visibleLineageAttempts(attempts: Attempt[], currentUserId: string) {
  return attempts
    .filter((attempt) => attempt.status !== "abandoned")
    .sort((a, b) => {
      const ownerPriority = Number(b.ownerId === currentUserId) - Number(a.ownerId === currentUserId);
      return ownerPriority || b.lastActiveAt.localeCompare(a.lastActiveAt);
    });
}
