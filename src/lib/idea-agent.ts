import type { AgentSuggestion, Database, Idea, Work } from "./types";

type NextIdeaInput = Pick<AgentSuggestion, "title" | "summary" | "problem" | "whyItMatters">;

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

type IdFactory = (prefix: "sug" | "ntf") => string;

export function isAuthorizedAgentScan(authorization: string | null, secret: string) {
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

function generatedSuggestions(work: Work, idea: Idea, at: string, makeId: IdFactory): AgentSuggestion[] {
  const subject = work.title.trim() || idea.title.trim() || "这个作品";
  const originalProblem = idea.problem.trim() || "还缺少来自真实使用者的反馈";
  const inputs: NextIdeaInput[] = [
    {
      title: `为「${subject}」建立反馈闭环`,
      summary: `增加一个轻量反馈入口与公开迭代记录，把真实使用结果整理成「${subject}」的下一版优先级。`,
      problem: `${originalProblem}；作品发布后也缺少持续收集和验证改进方向的机制。`,
      whyItMatters: "让下一次实现来自可验证的使用信号，而不是一次性的主观猜测。",
    },
    {
      title: `把「${subject}」做成可复用能力`,
      summary: `提炼作品中最有价值的流程，提供模板、导入导出或 API，让其他项目能够复用并组合。`,
      problem: "当前成果主要停留在单个作品里，复用成本高，也难以产生新的应用场景。",
      whyItMatters: "降低二次实现门槛，让一个完成品成为更多作品的起点。",
    },
    {
      title: `验证「${subject}」的真实使用场景`,
      summary: `选择一个边界清晰的目标人群，设计小规模试用、成功指标和复盘页面，形成可公开的验证报告。`,
      problem: "作品已经可以交付，但谁会持续使用、在哪个场景最有价值仍缺少证据。",
      whyItMatters: "明确最值得继续投入的方向，并为下一位承接者提供可靠上下文。",
    },
  ];
  return inputs.map((input) => ({
    id: makeId("sug"),
    ...input,
    status: "pending",
    createdAt: at,
  }));
}

export function scanCompletedWorks(
  db: Database,
  at: string,
  makeId: IdFactory,
  limit = 20,
): AgentScanBatch[] {
  const batches: AgentScanBatch[] = [];
  for (const work of db.works) {
    if (batches.length >= limit) break;
    if (work.status !== "published" || work.iteration?.status === "closed" || work.iteration?.scannedAt) continue;
    const attempt = db.attempts.find((item) => item.id === work.attemptId);
    const idea = db.ideas.find((item) => item.id === work.ideaId);
    if (!attempt || attempt.status !== "published" || !idea) continue;

    const suggestions = generatedSuggestions(work, idea, at, makeId);
    work.iteration = {
      status: "open",
      scannedAt: at,
      suggestions,
      email: { status: "pending" },
    };
    db.notifications.unshift({
      id: makeId("ntf"),
      userId: attempt.ownerId,
      at,
      title: `Idea Agent 为「${work.title}」找到了下一步`,
      body: "3 条建议正在等待你查阅；只有接受后才会发布为新的想法。",
      read: false,
      href: `/works/${work.id}`,
      kind: "agent",
    });
    batches.push({
      workId: work.id,
      ownerId: attempt.ownerId,
      workTitle: work.title,
      scannedAt: at,
      suggestions,
    });
  }
  return batches;
}

export function pendingAgentEmails(db: Database): AgentScanBatch[] {
  return db.works.flatMap((work) => {
    const iteration = work.iteration;
    const suggestions = iteration?.suggestions.filter((suggestion) => suggestion.status === "pending") ?? [];
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
    subject: `「${input.workTitle}」有了 3 个下一步`,
    html: `<main style="font-family:system-ui,sans-serif;line-height:1.6;color:#171717"><p>${escapeHtml(input.displayName)}，你好：</p><p>Idea Agent 为「${title}」整理了新的迭代方向：</p><ol>${items}</ol><p><a href="${escapeHtml(input.workUrl)}">查阅并选择下一步</a></p><p style="color:#666">建议只有在你接受后才会发布为公开想法；你也可以关闭这个作品的后续迭代。</p></main>`,
    text: `${input.displayName}，你好：\n\nIdea Agent 为「${input.workTitle}」整理了新的迭代方向：\n\n${input.suggestions.map((suggestion, index) => `${index + 1}. ${suggestion.title}\n${suggestion.summary}`).join("\n\n")}\n\n查阅并选择下一步：${input.workUrl}\n\n建议只有在你接受后才会发布为公开想法。`,
  };
}
