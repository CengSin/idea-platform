import "server-only";

import { readDb } from "./db";
import { dataBackend } from "./data-backend";

export async function getAdminDashboard() {
  const db = await readDb();
  const completedWorks = db.works.filter((work) => {
    const attempt = db.attempts.find((item) => item.id === work.attemptId);
    return work.status === "published" && attempt?.status === "published";
  });

  const recentWorks = [...completedWorks]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, 12)
    .map((work) => {
      const idea = db.ideas.find((i) => i.id === work.ideaId);
      const attempt = db.attempts.find((a) => a.id === work.attemptId);
      const author = db.users.find((u) => u.id === attempt?.ownerId);
      return {
        id: work.id,
        title: work.title,
        publishedAt: work.publishedAt,
        type: work.type,
        ideaTitle: idea?.title ?? "未知想法",
        authorName: author?.displayName ?? "未知作者",
      };
    });

  return {
    metrics: {
      totalIdeas: db.ideas.length,
      totalAttempts: db.attempts.length,
      totalWorks: db.works.length,
      totalUsers: db.users.length,
      publishedWorks: completedWorks.length,
    },
    system: {
      backend: dataBackend(),
      nodeEnv: process.env.NODE_ENV ?? "development",
    },
    recentWorks,
  };
}
