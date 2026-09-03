import type { Database, Idea } from "./types";

export type NextIdeaInput = {
  title: string;
  summary: string;
  problem: string;
  whyItMatters: string;
};

export type NextIdeaStage = "sprout" | "growing" | "result";

export const NEXT_IDEA_STAGE_LABEL: Record<NextIdeaStage, string> = {
  sprout: "萌芽",
  growing: "成长",
  result: "结果",
};

export class NextIdeaMutationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function cleanInput(input: NextIdeaInput) {
  const clean = {
    title: input.title.trim(),
    summary: input.summary.trim(),
    problem: input.problem.trim(),
    whyItMatters: input.whyItMatters.trim(),
  };
  if (!clean.title || clean.title.length > 200) {
    throw new NextIdeaMutationError(400, "下一步标题需为 1–200 字符");
  }
  if (!clean.summary) {
    throw new NextIdeaMutationError(400, "请描述这一步可以做成什么");
  }
  if (!clean.problem) {
    throw new NextIdeaMutationError(400, "请说明这一步要解决的问题");
  }
  if (clean.summary.length > 2000 || clean.problem.length > 4000 || clean.whyItMatters.length > 4000) {
    throw new NextIdeaMutationError(400, "下一步内容过长，请精简后再发布");
  }
  return clean;
}

export function nextIdeaStage(db: Database, ideaId: string): NextIdeaStage {
  if (db.works.some((work) => work.ideaId === ideaId && work.status === "published")) {
    return "result";
  }
  if (
    db.attempts.some(
      (attempt) =>
        attempt.ideaId === ideaId &&
        attempt.status !== "considering" &&
        attempt.status !== "abandoned",
    )
  ) {
    return "growing";
  }
  return "sprout";
}

export function createNextIdeaRecord(
  db: Database,
  userId: string,
  workId: string,
  input: NextIdeaInput,
  id: string,
  at: string,
): Idea {
  const work = db.works.find((item) => item.id === workId && item.status === "published");
  if (!work) throw new NextIdeaMutationError(404, "来源作品不存在或尚未发布");
  const attempt = db.attempts.find((item) => item.id === work.attemptId);
  if (!attempt || attempt.ownerId !== userId) {
    throw new NextIdeaMutationError(403, "只有作品所属承接的作者可以发布下一步");
  }
  const parent = db.ideas.find((item) => item.id === work.ideaId);
  const me = db.users.find((item) => item.id === userId);
  if (!parent || !me) throw new NextIdeaMutationError(404, "来源想法或用户不存在");

  const clean = cleanInput(input);
  const siblingIndex = db.ideas.filter((item) => item.sourceWorkId === workId).length;
  const origin = work.graph ?? parent.graph;
  const idea: Idea = {
    id,
    ...clean,
    constraints: [],
    existingAttempts: [],
    openQuestions: [],
    desiredOutputs: [],
    tags: [...parent.tags],
    author: { kind: "user", userId: me.id, displayName: me.displayName },
    license: {
      implementation: true,
      derivatives: true,
      commercialUse: "with_attribution",
    },
    visibility: "public",
    status: "published",
    parentIdeaId: parent.id,
    sourceWorkId: work.id,
    graph: {
      x: origin.x + 220,
      y: origin.y + 120 + siblingIndex * 90,
    },
    createdAt: at,
    updatedAt: at,
  };
  db.ideas.push(idea);
  work.citations += 1;
  return idea;
}

function ownedNextIdea(db: Database, userId: string, ideaId: string) {
  const idea = db.ideas.find((item) => item.id === ideaId);
  if (!idea || !idea.sourceWorkId) {
    throw new NextIdeaMutationError(404, "作品下的下一步不存在");
  }
  if (idea.author.userId !== userId) {
    throw new NextIdeaMutationError(403, "只能管理自己发布的下一步");
  }
  return idea;
}

export function updateNextIdeaRecord(
  db: Database,
  userId: string,
  ideaId: string,
  input: NextIdeaInput,
  at: string,
) {
  const idea = ownedNextIdea(db, userId, ideaId);
  Object.assign(idea, cleanInput(input));
  idea.visibility = "public";
  idea.updatedAt = at;
  return idea;
}

export function deleteNextIdeaRecord(db: Database, userId: string, ideaId: string) {
  const idea = ownedNextIdea(db, userId, ideaId);
  if (db.attempts.some((attempt) => attempt.ideaId === ideaId)) {
    throw new NextIdeaMutationError(409, "这一步已经有人关注或承接，不能删除；你仍可以更新说明");
  }
  if (db.works.some((work) => work.ideaId === ideaId)) {
    throw new NextIdeaMutationError(409, "这一步已经产生作品，不能删除");
  }

  db.ideas = db.ideas.filter((item) => item.id !== ideaId);
  db.follows = db.follows.filter((follow) => follow.ideaId !== ideaId);
  db.events = db.events.filter((event) => event.ideaId !== ideaId);
  const sourceWork = db.works.find((work) => work.id === idea.sourceWorkId);
  if (sourceWork) sourceWork.citations = Math.max(0, sourceWork.citations - 1);
  return idea;
}
