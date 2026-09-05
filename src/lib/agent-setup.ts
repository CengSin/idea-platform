import type { Attempt, Idea } from "./types";

export const AGENT_PROTOCOL_VERSION = 3;

export function agentSetupDelivery(idea: Idea) {
  return idea.parentIdeaId ? "copy_prompt" as const : "agents_md" as const;
}

function list(items: string[], empty = "- 暂无") {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : empty;
}

export function buildAgentBootstrap(input: {
  idea: Idea;
  attempt: Attempt;
  baseUrl: string;
  tokenExpiresAt: string;
}) {
  const { idea, attempt, baseUrl, tokenExpiresAt } = input;
  const canUpdateIdea = idea.author.userId === attempt.ownerId;
  return {
    protocol_version: AGENT_PROTOCOL_VERSION,
    generated_at: new Date().toISOString(),
    token_expires_at: tokenExpiresAt,
    token_policy: "Token 在持续使用时自动续期；临近到期的有效 Token 会延长 90 天。",
    source_of_truth: idea.parentIdeaId
      ? "本响应的能力与接口约定优先于此前复制的连接提示词。"
      : "本响应的能力与接口约定优先于本地 AGENTS.md 中的旧快照。",
    capabilities: {
      read_idea_context: true,
      execution_queue: true,
      update_attempt: true,
      update_idea: canUpdateIdea,
      publish_work: true,
      update_work: true,
      delete_work: true,
    },
    endpoints: {
      execution: `${baseUrl}/api/v1/attempts/${attempt.id}/execution`,
      bootstrap: `${baseUrl}/api/v1/attempts/${attempt.id}/bootstrap`,
      attempt: `${baseUrl}/api/v1/attempts/${attempt.id}`,
      idea: `${baseUrl}/api/v1/ideas/${idea.id}`,
      idea_context: `${baseUrl}/api/v1/ideas/${idea.id}/context`,
      works: `${baseUrl}/api/v1/works`,
      work_detail: `${baseUrl}/api/v1/works/<work_id>`,
    },
    current: {
      idea_id: idea.id,
      idea_status: idea.status,
      idea_updated_at: idea.updatedAt,
      attempt_id: attempt.id,
      attempt_status: attempt.status,
      attempt_last_active_at: attempt.lastActiveAt,
      work_ids: attempt.workIds,
      progress: attempt.progressNote,
      blockers: attempt.blockers,
      expected: attempt.projectDescription || idea.summary,
      approach: attempt.approach,
      acceptance: idea.desiredOutputs,
      stop_conditions: idea.stopConditions ?? [],
    },
    required_startup: [
      "每轮开始先获取 bootstrap 和 Idea Context，再以最新返回内容开展工作。",
      "写操作只使用当前承接分支的 Bearer Token，并发送 application/json。",
      "公开内容变更必须获得用户对本次变更的明确授权，并传 user_confirmed=true。",
      idea.parentIdeaId
        ? "401 时停止写操作；从作品或承接详情页重新复制连接提示词后再继续。"
        : "401 时停止写操作；从作品或承接详情页下载最新 AGENTS.md 后再继续。",
    ],
    execution_contract: {
      endpoint: `${baseUrl}/api/v1/attempts/${attempt.id}/execution`,
      method: "POST",
      claim: { action: "claim", worker_id: "执行器标识" },
      heartbeat: { action: "heartbeat", run_id: "领取返回的 run.id", lease_id: "领取返回的 run.leaseId" },
      report: { action: "report", run_id: "run.id", lease_id: "run.leaseId", report: "完成内容、验证证据、未完成项" },
      fail: { action: "fail", run_id: "run.id", lease_id: "run.leaseId", report: "失败原因与工作现场" },
      rules: ["领取返回 run=null 时没有任务。每30秒心跳，租约有效期120秒；取消或409时停止执行。", "以领取任务的 instruction、acceptance、stopConditions 为本轮范围，条件由用户决定。", "回传结果只进入 waiting_review，不自动发布或验收。任务领取不等于公开变更授权。", "心跳中断不自动重跑代码；由用户检查后决定重试。"],
    },
    write_contracts: {
      update_idea: {
        available: canUpdateIdea,
        reason: canUpdateIdea ? null : "当前承接人不是来源想法作者。",
        method: "PATCH",
        endpoint: `${baseUrl}/api/v1/ideas/${idea.id}`,
        fields: [
          "title",
          "summary",
          "problem",
          "why_it_matters",
          "constraints",
          "open_questions",
          "desired_outputs",
          "stop_conditions",
          "tags",
          "visibility",
          "license",
          "existing_attempts",
        ],
        rules: [
          "仅想法作者可以更新；承接他人想法时不得调用。",
          "只传需要修改的字段，未传字段保持不变。",
          "必须传严格布尔值 user_confirmed=true。",
          "Agent Token 不能发布想法；发布仍需用户在平台确认。",
        ],
      },
      update_attempt: {
        method: "PATCH",
        endpoint: `${baseUrl}/api/v1/attempts/${attempt.id}`,
        required: ["user_confirmed"],
        fields: ["status", "progress_note", "blockers", "title", "approach", "visibility", "target_date"],
        statuses: ["understanding", "prototyping", "testing", "paused", "abandoned"],
        rules: ["进展写明完成内容、验证结果与下一步；解除阻塞时传 blockers=[]。", "published 由发布作品触发，不代表用户验收通过。"],
      },
      create_work: {
        method: "POST",
        endpoint: `${baseUrl}/api/v1/works`,
        required: ["user_confirmed", "attempt_id", "title", "type", "license"],
        optional: ["summary", "external_url", "repository_url", "cover_url"],
        types: ["website", "app", "video", "article", "research", "art", "hardware", "other"],
        license_shape: { implementation: "boolean", derivatives: "boolean", commercialUse: ["yes", "with_attribution", "no"] },
        rules: ["封面默认由链接自动提取，通常无需传 cover_url。", "先核对当前 work_ids；更新已有作品用 PATCH，避免重复发布。"],
      },
      update_work: {
        fields: ["title", "summary", "type", "external_url", "repository_url", "cover_url", "license"],
        rules: ["只传需修改的字段；不能改写 idea_id、attempt_id 或贡献署名。"],
        method: "PATCH",
        endpoint: `${baseUrl}/api/v1/works/<work_id>`,
        required: ["user_confirmed"],
      },
      delete_work: {
        method: "DELETE",
        endpoint: `${baseUrl}/api/v1/works/<work_id>`,
        required: ["user_confirmed"],
        destructive: true,
      },
    },
  };
}

function buildAgentInstructions(input: {
  idea: Idea;
  attempt: Attempt;
  baseUrl: string;
  token: string;
  tokenExpiresAt: string;
}, heading: string) {
  const { idea, attempt, baseUrl, token, tokenExpiresAt } = input;
  const notes = [
    `问题：${idea.problem}`,
    `预期效果：${attempt.projectDescription || idea.summary}`,
    attempt.approach ? `实现方向：${attempt.approach}` : "",
    idea.parentIdeaId ? `上游想法：${idea.parentIdeaId}；来源作品：${idea.sourceWorkId || "已移除"}。先检查现有项目，在其基础上实现本轮改动。` : "",
    idea.desiredOutputs.length ? `用户验收标准：\n${list(idea.desiredOutputs)}` : "",
    idea.stopConditions?.length ? `用户停止条件：\n${list(idea.stopConditions)}` : "",
  ].filter(Boolean).join("\n\n");
  return `${heading}

实现「${idea.title}」的分支「${attempt.title}」。

${notes}

## 连接

- Attempt ID：${attempt.id}
- Bootstrap：${baseUrl}/api/v1/attempts/${attempt.id}/bootstrap
- Context：${baseUrl}/api/v1/ideas/${idea.id}/context
- Bearer Token：${token}
- 到期：${tokenExpiresAt}（有效期内持续使用会自动续期）

每轮先用 Bearer Token 获取 Bootstrap 与 Context，并阅读仓库现状。最新响应包含接口、权限、来源作品、进展和作品 ID，优先于这份快照。Token 仅供本分支使用，不得提交到 Git 或公开输出；已有 AGENTS.md 时合并此连接信息，不要覆盖项目原有约定。

## 工作流

1. 按用户本轮需求实现并验证；验收与停止条件由用户决定，未设置时不要自行宣布通过验收或开启无限迭代。
2. 公开写操作仍需用户对本次变更的明确授权，并传 user_confirmed=true；不能把领取任务当成发布授权。Agent Token 不能发布想法。
3. 在阶段完成或阻塞变化时同步 progress_note、status 和 blockers；记录完成内容、验证结果及下一步。阶段：understanding → prototyping → testing；发布作品后平台设置 published。
4. 修改已有作品先核对 Bootstrap 的 work_ids，使用 PATCH；新交付才用 POST。DELETE 仅用于用户明确指定的删除。完整字段与约束以 Bootstrap 的 write_contracts 为准。
5. 若使用执行队列，按 Bootstrap 的 execution_contract 领取任务、每30秒心跳并回传结果；回传后等待用户验收，不自动开始下一轮。
6. 401/403 时停止写操作并重新获取连接配置；请求失败先读取当前状态再决定重试，不能报告虚假成功。
${idea.status === "draft" ? "\n当前来源 Idea 仍是草稿，相关项目和作品在发布前仅作者可见。\n" : ""}`;
}

type AgentInstructionsInput = Parameters<typeof buildAgentInstructions>[0];

export function buildAgentPrompt(input: AgentInstructionsInput) {
  return buildAgentInstructions(input, "# Idea Platform 承接任务");
}

export function buildAgentsMd(input: AgentInstructionsInput) {
  return buildAgentInstructions(input, "# AGENTS.md");
}
