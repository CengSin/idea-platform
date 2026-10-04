import { ACTIVE_ATTEMPT_STATUSES, STALL_AFTER_DAYS, type Attempt, type AttemptStatus } from "./types.ts";

export function daysBetween(iso: string, now = Date.now()): number {
  return (now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

/** An active attempt with no activity for STALL_AFTER_DAYS reads as "stalled" everywhere. */
export function effectiveAttemptStatus(
  attempt: Pick<Attempt, "status" | "lastActiveAt">,
  now = Date.now(),
): AttemptStatus {
  if (
    ACTIVE_ATTEMPT_STATUSES.includes(attempt.status) &&
    daysBetween(attempt.lastActiveAt, now) > STALL_AFTER_DAYS
  ) {
    return "stalled";
  }
  return attempt.status;
}
