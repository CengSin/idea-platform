import type { AgentSuggestion, Database } from "./types";


export type AgentScanBatch = {
  workId: string;
  ownerId: string;
  workTitle: string;
  scannedAt: string;
  suggestions: AgentSuggestion[];
};

export class IdeaAgentMutationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}


export function isAuthorizedAgentScan(authorization: string | null, secret: string) {
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

export function pendingAgentEmails(db: Database): AgentScanBatch[] {
  return db.works.flatMap((work) => {
    const iteration = work.iteration;
    const suggestions = iteration?.suggestions.filter((suggestion) => suggestion.status === "pending" && suggestion.kind === "reminder") ?? [];
    if (
      !iteration?.scannedAt ||
      iteration.status === "closed" ||
      suggestions.length === 0 ||
      !["pending", "failed"].includes(iteration.email.status)
    ) return [];
    const attempt = db.attempts.find((item) => item.id === work.attemptId);
    if (!attempt) return [];
    return [{
      workId: work.id,
      ownerId: attempt.ownerId,
      workTitle: work.title,
      scannedAt: iteration.scannedAt,
      suggestions,
    }];
  });
}

export function recordAgentEmail(
  db: Database,
  workId: string,
  status: "sent" | "failed" | "skipped",
  at: string,
) {
  const iteration = db.works.find((work) => work.id === workId)?.iteration;
  if (!iteration) return;
  iteration.email = {
    status,
    lastAttemptAt: at,
    ...(status === "sent" ? { sentAt: at } : {}),
  };
}

function ownedSuggestion(db: Database, userId: string, workId: string, suggestionId: string) {
  const work = db.works.find((item) => item.id === workId);
  if (!work) throw new IdeaAgentMutationError(404, "作品不存在");
  const attempt = db.attempts.find((item) => item.id === work.attemptId);
  if (!attempt || attempt.ownerId !== userId) {
    throw new IdeaAgentMutationError(403, "只能管理自己作品的迭代建议");
  }
  const suggestion = work.iteration?.suggestions.find((item) => item.id === suggestionId);
  if (!suggestion) throw new IdeaAgentMutationError(404, "迭代建议不存在");
  return { work, suggestion };
}

export function acceptAgentSuggestionRecord(
  db: Database,
  userId: string,
  workId: string,
  suggestionId: string,
  ideaId: string,
) {
  const { suggestion } = ownedSuggestion(db, userId, workId, suggestionId);
  if (suggestion.kind === "reminder") throw new IdeaAgentMutationError(400, "提醒不是完整需求，请先编写下一步。");
  if (suggestion.status !== "pending") {
    throw new IdeaAgentMutationError(409, "这条建议已经处理过了");
  }
  suggestion.status = "accepted";
  suggestion.acceptedIdeaId = ideaId;
  return suggestion;
}

export function dismissAgentSuggestionRecord(
  db: Database,
  userId: string,
  workId: string,
  suggestionId: string,
) {
  const { suggestion } = ownedSuggestion(db, userId, workId, suggestionId);
  if (suggestion.status !== "pending") {
    throw new IdeaAgentMutationError(409, "这条建议已经处理过了");
  }
  suggestion.status = "dismissed";
  return suggestion;
}

export function setWorkIterationStatusRecord(
  db: Database,
  userId: string,
  workId: string,
  status: "open" | "closed",
) {
  const work = db.works.find((item) => item.id === workId);
  if (!work) throw new IdeaAgentMutationError(404, "作品不存在");
  const attempt = db.attempts.find((item) => item.id === work.attemptId);
  if (!attempt || attempt.ownerId !== userId) {
    throw new IdeaAgentMutationError(403, "只能管理自己作品的迭代状态");
  }
  work.iteration ??= {
    status,
    suggestions: [],
    email: { status: "pending" },
  };
  work.iteration.status = status;
  if (status === "closed" && work.iteration.analysis) {
    work.iteration.analysis.status = "cancelled";
    delete work.iteration.analysis.leaseId;
    delete work.iteration.analysis.leaseUntil;
  }
  return work.iteration;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

export function renderAgentEmail(input: {
  displayName: string;
  workTitle: string;
  workUrl: string;
  suggestions: AgentSuggestion[];
}) {
  const title = escapeHtml(input.workTitle);
  const items = input.suggestions.map((suggestion) =>
    `<li style="margin:0 0 16px"><strong>${escapeHtml(suggestion.title)}</strong><br><span>${escapeHtml(suggestion.summary)}</span></li>`,
  ).join("");
  return {
    subject: `「${input.workTitle}」有了 ${input.suggestions.length} 个迭代提醒`,
    html: `<main style="font-family:system-ui,sans-serif;line-height:1.6;color:#171717"><p>${escapeHtml(input.displayName)}，你好：</p><p>Idea Agent 为「${title}」整理了迭代提醒：</p><ol>${items}</ol><p><a href="${escapeHtml(input.workUrl)}">查阅并选择下一步</a></p><p style="color:#666">提醒不会自动发布为想法；你也可以关闭这个作品的后续迭代。</p></main>`,
    text: `${input.displayName}，你好：\n\nIdea Agent 为「${input.workTitle}」整理了迭代提醒：\n\n${input.suggestions.map((suggestion, index) => `${index + 1}. ${suggestion.title}\n${suggestion.summary}`).join("\n\n")}\n\n查阅并选择下一步：${input.workUrl}\n\n提醒不会自动发布为想法。`,
  };
}
