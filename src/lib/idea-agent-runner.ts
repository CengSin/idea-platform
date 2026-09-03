import "server-only";

import { nanoid } from "nanoid";
import { getAccountPublic } from "./auth";
import { mutateDb, readDb } from "./db";
import { pendingAgentEmails, recordAgentEmail, scanCompletedWorks } from "./idea-agent";
import { sendAgentIterationEmail } from "./idea-agent-mailer";

export function ideaAgentConfiguration() {
  return {
    cronSecret: Boolean((process.env.CRON_SECRET ?? "").trim()),
    resendApiKey: Boolean((process.env.RESEND_API_KEY ?? "").trim()),
    emailFrom: Boolean((process.env.IDEA_AGENT_EMAIL_FROM ?? "").trim()),
    siteUrl: Boolean((process.env.NEXT_PUBLIC_SITE_URL ?? "").trim()),
    adminAllowlist: Boolean((process.env.ADMIN_EMAILS ?? "").trim()),
  };
}

export async function runIdeaAgentScan(input: { siteUrl?: string } = {}) {
  const at = new Date().toISOString();
  const requestedLimit = Number(process.env.IDEA_AGENT_SCAN_LIMIT ?? 20);
  const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 20;
  let scanned = 0;
  await mutateDb((db) => {
    scanned = scanCompletedWorks(db, at, (prefix) => `${prefix}_${nanoid(8)}`, limit).length;
  });

  const siteUrl = (
    input.siteUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://idea.z-agent.ccwu.cc"
  ).replace(/\/$/, "");
  const deliveries = pendingAgentEmails(await readDb()).slice(0, limit);
  const email = { sent: 0, failed: 0, skipped: 0, unconfigured: 0 };
  for (const batch of deliveries) {
    const account = await getAccountPublic(batch.ownerId);
    if (!account?.email) {
      email.skipped += 1;
      await mutateDb((db) => recordAgentEmail(db, batch.workId, "skipped", new Date().toISOString()));
      continue;
    }
    try {
      const result = await sendAgentIterationEmail({
        email: account.email,
        displayName: account.displayName,
        batch,
        siteUrl,
      });
      if (result.status === "unconfigured") {
        email.unconfigured += 1;
        continue;
      }
      email.sent += 1;
      await mutateDb((db) => recordAgentEmail(db, batch.workId, "sent", new Date().toISOString()));
    } catch {
      email.failed += 1;
      await mutateDb((db) => recordAgentEmail(db, batch.workId, "failed", new Date().toISOString()));
    }
  }

  return { scanned, pending_email_batches: deliveries.length, email, ran_at: at };
}
