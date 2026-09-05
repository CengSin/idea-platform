import "server-only";

import { renderAgentEmail, type AgentScanBatch } from "./idea-agent";

export async function sendAgentIterationEmail(input: {
  email: string;
  displayName: string;
  batch: AgentScanBatch;
  siteUrl: string;
  apiKey?: string;
  from?: string;
}) {
  const apiKey = (input.apiKey ?? process.env.RESEND_API_KEY ?? "").trim();
  const from = (input.from ?? process.env.IDEA_AGENT_EMAIL_FROM ?? "").trim();
  if (!apiKey || !from) return { status: "unconfigured" as const };

  const message = renderAgentEmail({
    displayName: input.displayName,
    workTitle: input.batch.workTitle,
    workUrl: `${input.siteUrl.replace(/\/$/, "")}/works/${input.batch.workId}`,
    suggestions: input.batch.suggestions,
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(5000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `idea-agent-${input.batch.workId}-${input.batch.scannedAt}`,
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
  if (!response.ok) {
    throw new Error(`邮件服务返回 ${response.status}`);
  }
  return { status: "sent" as const };
}
