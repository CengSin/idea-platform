import { getAccountPublic } from "@/lib/auth";
import { mutateDb, readDb } from "@/lib/db";
import { isAuthorizedAgentScan, pendingAgentEmails, recordAgentEmail, scanCompletedWorks } from "@/lib/idea-agent";
import { sendAgentIterationEmail } from "@/lib/idea-agent-mailer";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(req: Request) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET 未配置" }, { status: 503 });
  if (!isAuthorizedAgentScan(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const at = new Date().toISOString();
  const requestedLimit = Number(process.env.IDEA_AGENT_SCAN_LIMIT ?? 20);
  const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 20;
  let scanned = 0;
  await mutateDb((db) => {
    scanned = scanCompletedWorks(db, at, (prefix) => `${prefix}_${nanoid(8)}`, limit).length;
  });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin).replace(/\/$/, "");
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

  return NextResponse.json({ scanned, pending_email_batches: deliveries.length, email });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
