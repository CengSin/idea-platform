"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "./admin";
import { runIdeaAgentScan } from "./idea-agent-runner";
import { updateAgentConfig } from "./agent-config";

export type AgentConfigState = { ok?: boolean; error?: string };

export async function saveAgentConfigAction(
  _state: AgentConfigState,
  formData: FormData,
): Promise<AgentConfigState> {
  await requireAdminUser();
  try {
    await updateAgentConfig({
      openaiModel: String(formData.get("openaiModel") ?? ""),
      openaiBaseUrl: String(formData.get("openaiBaseUrl") ?? ""),
      openaiApiKey: String(formData.get("openaiApiKey") ?? ""),
      cronSecret: String(formData.get("cronSecret") ?? ""),
      resendApiKey: String(formData.get("resendApiKey") ?? ""),
      emailFrom: String(formData.get("emailFrom") ?? ""),
      clearOpenaiApiKey: formData.get("clearOpenaiApiKey") === "on",
      clearCronSecret: formData.get("clearCronSecret") === "on",
      clearResendApiKey: formData.get("clearResendApiKey") === "on",
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "保存失败，请稍后重试。" };
  }
}

export async function runIdeaAgentNowAction() {
  await requireAdminUser();
  const result = await runIdeaAgentScan();
  revalidatePath("/admin");
  revalidatePath("/works", "layout");
  return result;
}
