import { createNextIdeaRecord, NextIdeaMutationError } from "./next-ideas.ts";
import type { Database } from "./types";

export function proposeIteration(db: Database, ownerId: string, attemptId: string, workId: string, raw: unknown, id: string, at: string) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new NextIdeaMutationError(400, "请求必须为 JSON 对象。");
  const body = raw as Record<string, unknown>;
  const allowed = new Set(["request_id", "title", "summary", "problem", "why_it_matters", "desired_outputs", "stop_conditions", "source_work_revision_id"]);
  if (Object.keys(body).some(k => !allowed.has(k))) throw new NextIdeaMutationError(400, "仅支持提交私有草稿字段。");
  for (const key of ["request_id", "title", "summary", "problem"]) {
    if (typeof body[key] !== "string" || !body[key].trim()) throw new NextIdeaMutationError(400, `缺少 ${key}。`);
  }
  if ((body.request_id as string).length > 128) throw new NextIdeaMutationError(400, "request_id 过长。");
  for (const key of ["why_it_matters", "source_work_revision_id"]) if (body[key] !== undefined && typeof body[key] !== "string") throw new NextIdeaMutationError(400, `${key} 需为字符串。`);
  for (const key of ["desired_outputs", "stop_conditions"]) {
    const v = body[key];
    if (v !== undefined && (!Array.isArray(v) || v.length > 20 || v.some(s => typeof s !== "string" || s.length > 2000))) throw new NextIdeaMutationError(400, `${key} 需为最多 20 项的文本列表。`);
  }
  const attempt = db.attempts.find(a => a.id === attemptId && a.ownerId === ownerId);
  const work = db.works.find(w => w.id === workId && w.attemptId === attemptId);
  if (!attempt || !work) throw new NextIdeaMutationError(404, "当前分支没有此作品。");
  const idea = createNextIdeaRecord(db, ownerId, workId, {
    title: body.title as string, summary: body.summary as string, problem: body.problem as string,
    whyItMatters: body.why_it_matters as string || "", desiredOutputs: body.desired_outputs as string[] | undefined,
    stopConditions: body.stop_conditions as string[] | undefined,
  }, id, at, { draft: true, agentRequestId: (body.request_id as string).trim(), sourceWorkRevisionId: body.source_work_revision_id as string | undefined });
  const created = idea.id === id;
  if (created) {
    idea.author.kind = "agent";
    db.notifications.push({ id: `iteration_${id}`, userId: ownerId, at, kind: "agent", read: false,
      title: "Agent 提交了迭代草稿", body: idea.title, href: `/ideas/${idea.id}` });
  }
  return { idea, created };
}
