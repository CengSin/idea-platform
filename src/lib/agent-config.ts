import "server-only";

import { mutateDb, readDb } from "./db";
import type { AgentRuntimeConfig } from "./types";

export type EffectiveAgentConfig = {
  openaiBaseUrl: string;
  openaiModel: string;
  openaiApiKey: string;
  cronSecret: string;
  resendApiKey: string;
  emailFrom: string;
};

export type AgentConfigView = {
  openaiBaseUrl: string;
  openaiModel: string;
  emailFrom: string;
  configured: Record<"openaiApiKey" | "cronSecret" | "resendApiKey", boolean>;
  saved: Record<keyof AgentRuntimeConfig, boolean>;
};

const envConfig = (): EffectiveAgentConfig => ({
  openaiModel: (process.env.IDEA_AGENT_MODEL ?? "").trim(),
  openaiBaseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").trim(),
  openaiApiKey: (process.env.OPENAI_API_KEY ?? "").trim(),
  cronSecret: (process.env.CRON_SECRET ?? "").trim(),
  resendApiKey: (process.env.RESEND_API_KEY ?? "").trim(),
  emailFrom: (process.env.IDEA_AGENT_EMAIL_FROM ?? "").trim(),
});

function resolve(saved: AgentRuntimeConfig = {}): EffectiveAgentConfig {
  const env = envConfig();
  return {
    openaiModel: saved.openaiModel?.trim() || env.openaiModel,
    openaiBaseUrl: saved.openaiBaseUrl?.trim() || env.openaiBaseUrl,
    openaiApiKey: saved.openaiApiKey?.trim() || env.openaiApiKey,
    cronSecret: saved.cronSecret?.trim() || env.cronSecret,
    resendApiKey: saved.resendApiKey?.trim() || env.resendApiKey,
    emailFrom: saved.emailFrom?.trim() || env.emailFrom,
  };
}

export async function getEffectiveAgentConfig(): Promise<EffectiveAgentConfig> {
  const db = await readDb();
  return resolve(db.agentConfig);
}

export async function getAgentConfigView(): Promise<AgentConfigView> {
  const db = await readDb();
  const saved = db.agentConfig ?? {};
  const effective = resolve(saved);
  return {
    openaiModel: effective.openaiModel,
    openaiBaseUrl: effective.openaiBaseUrl,
    emailFrom: effective.emailFrom,
    configured: {
      openaiApiKey: Boolean(effective.openaiApiKey),
      cronSecret: Boolean(effective.cronSecret),
      resendApiKey: Boolean(effective.resendApiKey),
    },
    saved: {
      openaiModel: Boolean(saved.openaiModel),
      openaiBaseUrl: Boolean(saved.openaiBaseUrl),
      openaiApiKey: Boolean(saved.openaiApiKey),
      cronSecret: Boolean(saved.cronSecret),
      resendApiKey: Boolean(saved.resendApiKey),
      emailFrom: Boolean(saved.emailFrom),
    },
  };
}

export type AgentConfigUpdate = {
  openaiBaseUrl: string;
  openaiModel: string;
  openaiApiKey?: string;
  cronSecret?: string;
  resendApiKey?: string;
  emailFrom: string;
  clearOpenaiApiKey?: boolean;
  clearCronSecret?: boolean;
  clearResendApiKey?: boolean;
};

export async function updateAgentConfig(input: AgentConfigUpdate) {
  const baseUrl = input.openaiBaseUrl.trim().replace(/\/$/, "");
  const emailFrom = input.emailFrom.trim();
  if (baseUrl) {
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      throw new Error("请输入有效的 OpenAI Base URL。");
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("OpenAI Base URL 必须使用 HTTP 或 HTTPS。");
    }
  }
  if (emailFrom && !/^[^<>\s]+@[^<>\s]+\.[^<>\s]+$|^.+<[^<>\s]+@[^<>\s]+\.[^<>\s]+>$/.test(emailFrom)) {
    throw new Error("请输入有效的发件人，例如 Idea Agent <agent@example.com>。");
  }

  await mutateDb((db) => {
    const next = { ...(db.agentConfig ?? {}) };
    if (input.openaiModel.trim()) next.openaiModel = input.openaiModel.trim();
    else delete next.openaiModel;
    if (baseUrl) next.openaiBaseUrl = baseUrl;
    else delete next.openaiBaseUrl;
    if (emailFrom) next.emailFrom = emailFrom;
    else delete next.emailFrom;

    for (const [field, clear, value] of [
      ["openaiApiKey", input.clearOpenaiApiKey, input.openaiApiKey],
      ["cronSecret", input.clearCronSecret, input.cronSecret],
      ["resendApiKey", input.clearResendApiKey, input.resendApiKey],
    ] as const) {
      if (clear) delete next[field];
      else if (value?.trim()) next[field] = value.trim();
    }
    db.agentConfig = next;
  });
}
