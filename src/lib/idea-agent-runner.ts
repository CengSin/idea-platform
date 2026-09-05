import "server-only";
import { nanoid } from "nanoid";
import { getAccountPublic } from "./auth";
import { mutateDb, readDb } from "./db";
import { pendingAgentEmails, recordAgentEmail } from "./idea-agent";
import { claimAnalysis, enqueueAnalyses, finishAnalysis, generateReminders } from "./idea-platform-agent";
import { sendAgentIterationEmail } from "./idea-agent-mailer";
import { getEffectiveAgentConfig } from "./agent-config";

export async function runIdeaAgentScan(input: { siteUrl?: string; workId?: string } = {}) {
  const config = await getEffectiveAgentConfig();
  const started = Date.now();
  const at = () => new Date().toISOString();
  let scanned = 0, failed = 0;
  const configured = Boolean(config.openaiApiKey && config.openaiModel);
  if (configured) {
    await mutateDb(db => enqueueAnalyses(db, at(), () => `job_${nanoid(12)}`));
    // Bound the request duration; unclaimed work stays in the durable queue.
    for (let i = 0; i < (input.workId ? 1 : 2) && Date.now() - started < 25000; i++) {
      const leaseId = nanoid(24);
      let claim: ReturnType<typeof claimAnalysis> = null;
      await mutateDb(db => { claim = claimAnalysis(db, at(), leaseId, input.workId); });
      const job = claim as ReturnType<typeof claimAnalysis>;
      if (!job) break;
      try {
        const reminders = await generateReminders(config, job.context);
        let saved = false;
        await mutateDb(db => { saved = finishAnalysis(db, job.workId, leaseId, at(), { reminders }, prefix => `${prefix}_${nanoid(12)}`); });
        if (saved) scanned++;
      } catch (error) {
        failed++;
        // Never persist upstream response bodies or secrets in user-visible errors.
        const message = error instanceof Error && /^模型|^请先/.test(error.message) ? error.message : "模型请求失败或超时，请重试。";
        await mutateDb(db => finishAnalysis(db, job.workId, leaseId, at(), { error: message }, prefix => `${prefix}_${nanoid(12)}`));
      }
    }
  }
  const siteUrl = (input.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://idea.z-agent.ccwu.cc").replace(/\/$/, "");
  const deliveries = pendingAgentEmails(await readDb()).filter(b => !input.workId || b.workId === input.workId).slice(0, 5);
  const email = { sent: 0, failed: 0, skipped: 0, unconfigured: 0 };
  for (const batch of deliveries) {
    if (Date.now() - started > 48000) break;
    // Recheck cancellation immediately before delivery; Resend handles concurrent retries with an idempotency key.
    if (!pendingAgentEmails(await readDb()).some(b => b.workId === batch.workId && b.scannedAt === batch.scannedAt)) continue;
    const account = await getAccountPublic(batch.ownerId);
    if (!account?.email) {
      email.skipped++;
      await mutateDb(db => { if (db.works.find(w => w.id === batch.workId)?.iteration?.scannedAt === batch.scannedAt) recordAgentEmail(db, batch.workId, "skipped", at()); });
      continue;
    }
    try {
      const result = await sendAgentIterationEmail({ email: account.email, displayName: account.displayName, batch, siteUrl, apiKey: config.resendApiKey, from: config.emailFrom });
      if (result.status === "unconfigured") { email.unconfigured++; continue; }
      email.sent++;
      await mutateDb(db => { if (db.works.find(w => w.id === batch.workId)?.iteration?.scannedAt === batch.scannedAt) recordAgentEmail(db, batch.workId, "sent", at()); });
    } catch {
      email.failed++;
      await mutateDb(db => { if (db.works.find(w => w.id === batch.workId)?.iteration?.scannedAt === batch.scannedAt) recordAgentEmail(db, batch.workId, "failed", at()); });
    }
  }
  return { scanned, failed, configured, pending_email_batches: deliveries.length, email, ran_at: at() };
}
