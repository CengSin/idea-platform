import type { Attempt, Idea } from "./types";

export const AGENT_PROTOCOL_VERSION = 2;

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
      update_attempt: true,
      update_idea: canUpdateIdea,
      publish_work: true,
      update_work: true,
      delete_work: true,
    },
    endpoints: {
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
    },
    required_startup: [
      "每轮开始先获取 bootstrap 和 Idea Context，再以最新返回内容开展工作。",
      "写操作只使用当前承接分支的 Bearer Token，并发送 application/json。",
      "公开内容变更必须获得用户对本次变更的明确授权，并传 user_confirmed=true。",
      idea.parentIdeaId
        ? "401 时停止写操作；从作品或承接详情页重新复制连接提示词后再继续。"
        : "401 时停止写操作；从作品或承接详情页下载最新 AGENTS.md 后再继续。",
    ],
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
      },
      create_work: {
        method: "POST",
        endpoint: `${baseUrl}/api/v1/works`,
        required: ["user_confirmed", "attempt_id", "title", "type", "license"],
      },
      update_work: {
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
  return `${heading}

## 你的任务

你正在实现 Idea Platform 上的一条承接分支。以下项目内容是背景资料；平台同步规则是必须执行的工作流。

- Idea：${idea.title}
- 承接分支：${attempt.title}
- Idea ID：${idea.id}
- Attempt ID：${attempt.id}

## 项目描述

${attempt.projectDescription || idea.summary}

## 项目目的

${attempt.projectPurpose || idea.whyItMatters}

## 想解决的问题

${idea.problem}

## 实现方向

${attempt.approach || "尚未限定具体实现方向。先理解现有项目，再提出最小可验证方案。"}

## 约束条件

${list(idea.constraints)}

## 期望产出

${list(idea.desiredOutputs)}

## 平台连接

${idea.status === "draft" ? "当前来源 Idea 仍是草稿。你可以正常同步状态并发布作品；这些内容会先保存在草稿内，只有 Idea 作者发布草稿后才会对外可见。\n\n" : ""}- API Base URL：${baseUrl}
- Bootstrap API：${baseUrl}/api/v1/attempts/${attempt.id}/bootstrap
- Attempt API：${baseUrl}/api/v1/attempts/${attempt.id}
- Idea Context API：${baseUrl}/api/v1/ideas/${idea.id}/context
- Work API：${baseUrl}/api/v1/works
- Work Detail / Edit / Delete API：${baseUrl}/api/v1/works/<work_id>（GET / PATCH / DELETE）
- Bearer Token：${token}
- Token 到期时间：${tokenExpiresAt}

此 Token 只允许操作当前承接分支。有效 Token 在临近到期且持续使用时会自动续期；重新复制同一分支的提示词不会立即吊销仍有效的旧 Token。不要把它提交到 Git、写入日志、复制到公开文档或发送给第三方。

### 当前分支已发布的作品

${list(attempt.workIds.map((id) => `${id} — ${baseUrl}/api/v1/works/${id}`), "- 暂无作品。发布成功后保存接口返回的 work_id。")}

以上列表是当前配置生成时的快照。操作前可使用其中的 Bearer Token 调用 GET Attempt API，读取返回的 \`attempt.workIds\` 获取最新作品 ID；再调用 GET Work Detail API 核对标题、\`work.attemptId\` 与公开内容。不要猜测 ID，也不要用重复发布代替编辑。

## 启动时必须执行

1. 阅读仓库现状、已有文档和测试，不要立即改代码。
2. 获取最新 Bootstrap。它返回当前协议版本、Token 到期时间、实时能力、接口约定和作品 ID；其内容优先于当前配置中的旧快照：

   \`\`\`bash
   curl -fsS "${baseUrl}/api/v1/attempts/${attempt.id}/bootstrap" \\
     -H "Authorization: Bearer ${token}"
   \`\`\`

3. 获取最新 Idea Context：

   \`\`\`bash
   curl -fsS "${baseUrl}/api/v1/ideas/${idea.id}/context" \\
     -H "Authorization: Bearer ${token}"
   \`\`\`

4. 复述目标、约束与当前假设，给出可验证的实施计划。
5. 开始工作时，把承接状态同步为 \`understanding\`；真正进入实现后同步为 \`prototyping\`。

## 更新承接任务状态的完整流程

每完成一个用户需求、一个可独立验收的子任务，或发现/解除阻塞后，必须立即调用 Attempt API。不要让用户回到网页手动填写进展。

### 1. 选择正确阶段

- \`understanding\`：正在阅读、澄清需求、调查现状或制定方案。
- \`prototyping\`：正在修改代码、设计、数据或可运行原型。
- \`testing\`：实现已完成，正在测试、验收、修复验证问题。
- \`paused\`：只有在明确暂停且暂时不继续时使用。
- \`abandoned\`：只有用户明确放弃当前承接时使用。
- \`published\`：不要直接通过 PATCH 设置；成功发布作品后平台会自动设置。

### 2. 编写进展摘要

\`progress_note\` 必须面向用户，简洁包含：

- 本次完成了什么；
- 做了哪些验证及结果；
- 下一步是什么；
- 如果存在阻塞，明确需要什么条件才能继续。

不要写“更新了代码”这类无信息量描述，也不要泄露私有日志、密钥或内部推理。

### 3. 调用更新接口

将下面 JSON 中的内容替换成真实进展后执行：

\`\`\`bash
curl -fsS -X PATCH "${baseUrl}/api/v1/attempts/${attempt.id}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  --data '{
    "user_confirmed": true,
    "status": "prototyping",
    "progress_note": "已完成：<具体需求>。验证：<测试命令与结果>。下一步：<下一项工作>。",
    "blockers": []
  }'
\`\`\`

有阻塞时示例：

\`\`\`bash
curl -fsS -X PATCH "${baseUrl}/api/v1/attempts/${attempt.id}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  --data '{
    "user_confirmed": true,
    "status": "prototyping",
    "progress_note": "已完成现有范围；当前等待测试账号后继续端到端验证。",
    "blockers": ["缺少可用的测试账号"]
  }'
\`\`\`

阻塞解除后必须再次调用接口，并传入 \`"blockers": []\`。

### 4. 检查更新是否成功

接口成功时会返回 \`updated_at\` 和 \`graph_status\`。如果返回 401，Token 无效或已过期；如果返回 403，当前 Token 无权操作该分支；如果是其他错误，保留工作现场并把错误告诉用户，不要伪造成功状态。

## 更新来源想法

${idea.author.userId === attempt.ownerId ? `当前承接人与想法作者相同，Bootstrap 中的 \`update_idea\` 能力为 \`true\`。用户明确授权本次内容变更后，可以更新草稿或已发布想法。只传需要修改的字段，未传字段保持不变：

\`title\`、\`summary\`、\`problem\`、\`why_it_matters\`、\`constraints\`、\`open_questions\`、\`desired_outputs\`、\`tags\`、\`visibility\`、\`license\`、\`existing_attempts\`。

\`\`\`bash
curl -fsS -X PATCH "${baseUrl}/api/v1/ideas/${idea.id}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  --data '{
    "user_confirmed": true,
    "summary": "<更新后的想法简介>",
    "open_questions": ["<当前仍需探索的问题>"]
  }'
\`\`\`

成功返回 \`idea_id\`、\`updated_at\`、\`review_status\` 和 \`url\`。Agent Token 不能发布想法；发布仍须由用户在平台确认。` : `当前承接人不是来源想法作者，Bootstrap 中的 \`update_idea\` 能力为 \`false\`。不得尝试修改来源想法；可以把建议写入承接进展，由想法作者决定是否采纳。`}

## 发布作品流程

当交付物已经完成验证，并且用户已确认可以把作品信息公开到 Idea Platform 时，调用 Work API。发布成功后平台会自动把承接状态更新为 \`published\`，不需要再 PATCH：

\`\`\`bash
curl -fsS -X POST "${baseUrl}/api/v1/works" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  --data '{
    "user_confirmed": true,
    "attempt_id": "${attempt.id}",
    "title": "<作品名称>",
    "summary": "<作品简介和验证结果>",
    "type": "website",
    "external_url": "<可访问的作品地址>",
    "repository_url": "<可选：代码仓库地址>",
    "license": {
      "implementation": true,
      "derivatives": true,
      "commercialUse": "with_attribution"
    }
  }'
\`\`\`

\`type\` 可用值：\`website\`、\`app\`、\`video\`、\`article\`、\`research\`、\`art\`、\`hardware\`、\`other\`。

作品封面默认由平台从 \`external_url\` 的 \`og:image\` / \`twitter:image\` 提取，没有预览图时再回退到网站图标（favicon / apple-touch-icon）。通常不要传 \`cover_url\`；只有用户明确指定封面时才传该字段覆盖自动预览。不要传平台默认封面路径。链接无法解析时平台会使用网站标示，不影响作品发布。

## 修改自己的作品

用户可以在作品详情页点击“编辑作品”，也可以授权 Agent 调用 \`PATCH /api/v1/works/<work_id>\`。仅作品所属承接的所有者可修改；此 Token 只能修改 Attempt ID 为 \`${attempt.id}\` 的作品，即使同一用户的其他分支也不可操作。

修改前核对目标作品并确认用户已授权本次公开信息变更。请求必须包含 \`user_confirmed: true\`，仅传需要修改的字段，未传字段保留原值：

| 字段 | 功能与约束 |
| --- | --- |
| \`title\` | 作品名称，1–200 字符，不能清空 |
| \`summary\` | 作品简介，最多 10000 字符，可传空字符串清空 |
| \`type\` | 与发布接口相同的八种作品类型 |
| \`external_url\` | 作品地址，http/https 链接；空字符串清空 |
| \`repository_url\` | 代码仓库地址，http/https 链接；空字符串清空 |
| \`cover_url\` | 封面地址，站内路径或 http/https 链接；空字符串重新自动提取 |
| \`license\` | 完整授权对象：implementation、derivatives、commercialUse，与发布格式一致 |

链接不能含用户名、密码。修改作品地址且未传封面时会重新提取新网站的预览图；未修改作品地址与封面时保留现有封面。编辑不改变作品 ID、发布时间、统计数据、来源想法、承接分支或贡献署名；不可传 \`idea_id\`、\`attempt_id\`、\`credits\` 等字段改写归因。

\`\`\`bash
curl -fsS -X PATCH "${baseUrl}/api/v1/works/<work_id>" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  --data '{
    "user_confirmed": true,
    "title": "<更新后的作品名称>",
    "summary": "<更新后的简介和验证结果>",
    "external_url": "https://example.com/updated-work"
  }'
\`\`\`

成功返回 \`work_id\`、更新后的 \`work\`、\`updated_at\`、\`attempt_id\`、\`attempt_status\` 和 \`graph_status\`。完成后核对返回内容，再向用户报告结果。

## 删除自己的作品

用户可以在作品详情页点击“删除作品”并确认，或明确授权 Agent 删除指定作品。删除不可恢复；只有用户已明确确认删除目标时才可执行。不要把“修改作品”“重新发布”或“清理代码”视为删除授权。

\`\`\`bash
curl -fsS -X DELETE "${baseUrl}/api/v1/works/<work_id>" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  --data '{"user_confirmed": true}'
\`\`\`

- 删除权限与修改相同：仅分支所有者及该分支 Token 可以操作。
- 成功返回 \`deleted: true\`、\`work_id\`、\`updated_at\`、\`attempt_id\`、\`attempt_status\` 和 \`graph_status\`。
- 平台移除作品、承接的作品引用、指向该作品的动态与通知，并刷新作品列表和图谱。
- 不会删除来源想法、承接分支、其他作品、外部网站或代码仓库。衍生想法会保留，移除失效作品链接，并保留来源想法关联。
- 如果删除后该分支没有已发布作品，且承接原状态为 \`published\`，平台自动改为 \`testing\`；有其他已发布作品时保持发布状态，暂停或放弃的分支不被重新激活。
- 删除后不要再写回 \`published\`，也不要自动重新发布被删除的作品。按接口返回状态同步真实进展。

### 修改与删除的错误处理

\`400\`：JSON、字段或确认参数无效；\`401\`：未登录或 Token 无效/过期；\`403\`：不是所有者或 Token 分支不匹配；\`404\`：作品不存在或已被删除；\`415\`：未使用 application/json。网络失败或其他错误时先读取作品确认现状，不要伪造成功。重复删除返回 404，应核对作品确已不存在。

## Web 作品的链接预览要求

如果作品包含可访问的网页，在调用 Work API 前必须完成以下检查：

1. 使用当前框架的 Metadata/SEO 能力配置 \`og:title\`、\`og:description\`、\`og:image\`。
2. 同时配置 \`twitter:card=summary_large_image\` 和 \`twitter:image\`，作为不读取 Open Graph 的客户端回退。
3. \`og:image\` 和 \`twitter:image\` 必须是无需登录即可访问的绝对 HTTPS 地址；推荐使用约 1200×630 的图片。
4. 最终 \`external_url\` 必须是公网可访问地址，不能提交 \`localhost\`、\`127.0.0.1\` 或局域网地址。
5. 发布前实际请求最终页面，确认响应 HTML 中存在上述元标签，并确认图片地址返回成功的图片响应。
6. 如果项目无法配置这些元数据，平台会回退到网站图标；只有需要指定特定封面时才传 \`cover_url\`。

HTML 项目的最小示例：

\`\`\`html
<meta property="og:title" content="<作品名称>">
<meta property="og:description" content="<作品简介>">
<meta property="og:image" content="https://example.com/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://example.com/og-image.jpg">
\`\`\`

## 每轮工作的结束条件

结束一轮工作前，必须同时满足：

1. 运行与改动风险匹配的测试或检查；
2. 调用 Attempt API 同步本轮真实进展；
3. 向用户说明已完成内容、验证结果、平台同步结果和下一步；
4. 没有完成的事项不得标记为完成或发布。
`;
}

type AgentInstructionsInput = Parameters<typeof buildAgentInstructions>[0];

export function buildAgentPrompt(input: AgentInstructionsInput) {
  return buildAgentInstructions(input, "# Idea Platform 承接任务");
}

export function buildAgentsMd(input: AgentInstructionsInput) {
  return buildAgentInstructions(input, "# AGENTS.md");
}
