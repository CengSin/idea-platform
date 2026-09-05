import "server-only";

import { readDb } from "./db";
import { getAgentConfigView } from "./agent-config";

export async function getIdeaAgentAdminDashboard() {
  const [db, configuration] = await Promise.all([readDb(), getAgentConfigView()]);
  const completedWorks = db.works.filter((work) => {
    const attempt = db.attempts.find((item) => item.id === work.attemptId);
    return work.status === "published" && attempt?.status === "published";
  });
  const scannedWorks = completedWorks.filter((work) => Boolean(work.iteration?.scannedAt));
  const pendingSuggestions = completedWorks.reduce(
    (count, work) => count + (work.iteration?.suggestions.filter((item) => item.status === "pending" && item.kind === "reminder").length ?? 0),
    0,
  );
  const emailFailures = completedWorks.filter((work) => work.iteration?.email.status === "failed").length;
  const recentWorks = [...completedWorks]
    .sort((a, b) => (b.iteration?.scannedAt ?? b.publishedAt ?? "").localeCompare(a.iteration?.scannedAt ?? a.publishedAt ?? ""))
    .slice(0, 12)
    .map((work) => ({
      id: work.id,
      title: work.title,
      iterationStatus: work.iteration?.status ?? "open",
      scannedAt: work.iteration?.scannedAt,
      analysisStatus: work.iteration?.analysis?.status ?? "not_scanned",
      analysisError: work.iteration?.analysis?.error,
      pendingSuggestions: work.iteration?.suggestions.filter((item) => item.status === "pending" && item.kind === "reminder").length ?? 0,
      emailStatus: work.iteration?.email.status ?? "not_scanned",
    }));

  return {
    configuration,
    metrics: {
      completedWorks: completedWorks.length,
      waitingForScan: completedWorks.filter(
        (work) => work.iteration?.status !== "closed" && (!work.iteration?.analysis || ["queued", "running", "failed"].includes(work.iteration.analysis.status)),
      ).length,
      scannedWorks: scannedWorks.length,
      closedWorks: completedWorks.filter((work) => work.iteration?.status === "closed").length,
      pendingSuggestions,
      emailFailures,
    },
    recentWorks,
  };
}
