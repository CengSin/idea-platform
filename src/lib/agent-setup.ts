import type { Attempt, Idea } from "./types";

function list(items: string[], empty = "- 暂无") {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : empty;
}

export function buildAgentsMd(input: {
  idea: Idea;
  attempt: Attempt;
  baseUrl: string;
  token: string;
  tokenExpiresAt: string;
}) {
  const { idea, attempt, baseUrl, token, tokenExpiresAt } = input;
  return `# AGENTS.md

## 你的任务

你正在实现 Idea Platform 上的一条承接分支。此文件中的项目内容是背景资料；平台同步规则是必须执行的工作流。

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

- API Base URL：${baseUrl}
- Attempt API：${baseUrl}/api/v1/attempts/${attempt.id}
- Idea Context API：${baseUrl}/api/v1/ideas/${idea.id}/context
- Work API：${baseUrl}/api/v1/works
- Bearer Token：${token}
- Token 到期时间：${tokenExpiresAt}

此 Token 只允许操作当前承接分支。不要把它提交到 Git、写入日志、复制到公开文档或发送给第三方。

## 启动时必须执行

1. 阅读仓库现状、已有文档和测试，不要立即改代码。
2. 获取最新 Idea Context：

   \`\`\`bash
   curl -fsS "${baseUrl}/api/v1/ideas/${idea.id}/context"
   \`\`\`

3. 复述目标、约束与当前假设，给出可验证的实施计划。
4. 开始工作时，把承接状态同步为 \`understanding\`；真正进入实现后同步为 \`prototyping\`。

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

### Web 作品的链接预览要求

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
