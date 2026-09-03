"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "./admin";
import { runIdeaAgentScan } from "./idea-agent-runner";

export async function runIdeaAgentNowAction() {
  await requireAdminUser();
  const result = await runIdeaAgentScan();
  revalidatePath("/admin");
  revalidatePath("/works", "layout");
  return result;
}
