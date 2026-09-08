# Idea Platform

让想法被发现、被多人独立实现，并追踪它如何长成作品。

Discover ideas, let people implement them independently, and track how they grow into works.

---

## 中文

Idea Platform 是一个想法协作平台：发布想法、承接实现、跟踪进展，并最终把结果发布为作品。首页用白板展示想法、作品与衍生想法之间的关系。登录用户可为一级承接生成 `AGENTS.md`，为作品衍生的子想法复制完整提示词，让 Agent 自动回写状态。

新想法可以先保存为草稿。草稿作者仍可创建承接项目、生成 `AGENTS.md`、同步状态并发布作品；整棵草稿内容在此期间仅作者可见，发布想法时统一进入公开链路。旧数据没有草稿标记时按已发布内容迁移。

登录后的发现首页按项目家族排列：图钉便签表示想法，夹子照片卡表示作品，箭头串联衍生想法。搜索保留项目关系；深层匹配会展开祖先。桌面可滚动、缩放和展开，手机纵向阅读。

### 技术栈

- Next.js 15、React 19、Tailwind CSS 4
- 生产数据：Turso（`DATA_BACKEND=turso`）
- 本地开发也可把数据写到 `data/db.json`

### 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3001](http://localhost:3001)，注册账号后即可从空白状态开始。内容保存在 `data/db.json`，账号和会话保存在 `data/auth.json`。设置 `DATA_BACKEND=turso` 后读写 Turso。

### Agent API

发布想法和确认承接由登录用户发起。一级承接页生成 `AGENTS.md`，作品衍生的子想法承接页生成可直接复制给 Agent 的完整提示词；两者都包含只允许操作该分支的 Bearer Token。Agent 每轮启动会读取 Bootstrap API 获取最新能力和接口约定；有效 Token 在临近到期且持续使用时自动续期，重新生成配置不会立即吊销同一分支仍有效的旧 Token。

所有写操作都要求 `user_confirmed: true`。更新承接、发布作品，以及 Agent 修改或删除作品需要 `Authorization: Bearer <attempt-token>`。作品详情页的编辑和删除入口仅向作品所属承接的所有者显示；网页操作使用登录会话，服务端仍会检查所有权。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/v1/ideas` | 创建想法；`as_draft: true` 保存草稿 |
| `PATCH` | `/api/v1/ideas/:id` | 编辑草稿；想法作者可授权所属分支 Agent 更新；`publish: true` 仅限网页确认 |
| `DELETE` | `/api/v1/ideas/:id` | 删除自己的草稿及关联内容 |
| `POST` | `/api/v1/attempts` | 承接想法 |
| `PATCH` | `/api/v1/attempts/:id` | 更新承接进展 |
| `GET` | `/api/v1/attempts/:id/bootstrap` | 获取最新 Agent 能力、接口约定与分支上下文 |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/v1/attempts/:id/todos` | 列出、添加、更新或删除承接待办 |
| `POST` | `/api/v1/works` | 发布作品 |
| `PATCH` | `/api/v1/works/:id` | 修改自己分支的作品，未传字段保持不变 |
| `DELETE` | `/api/v1/works/:id` | 确认后删除自己分支的作品 |
| `GET` | `/api/v1/ideas/:id/context` | 结构化 Idea Context |

发布作品时提供公开的 `external_url`，平台会读取 `og:image` / `twitter:image` 作为封面，没有预览图时回退到网站图标；`cover_url` 仅用于显式覆盖。

编辑接受 `title`、`summary`、`type`、`external_url`、`repository_url`、`cover_url` 和完整 `license` 对象；链接字段也接受 camelCase。名称不可清空，简介和可选链接可用空字符串清空。修改作品地址且不传封面，或把封面清空，会重新提取预览。作品 ID、来源、署名、发布时间和统计不可修改。

修改、删除均须发送 JSON，包含严格的布尔值 `user_confirmed: true`。成功返回 `work_id`、`updated_at`、`attempt_id`、`attempt_status`、`graph_status`；修改还返回 `work`，删除返回 `deleted: true`。错误状态为 400（参数无效）、401（凭证无效）、403（非所有者或 Token 分支不匹配）、404（作品不存在）、415（Content-Type 错误）。

删除会清理作品引用及其动态、通知，保留来源想法、承接和衍生想法，不会删除外部站点或仓库。删去分支最后一个已发布作品时，原为 `published` 的承接回到 `testing`；暂停或放弃状态不变。Agent 配置包含 Bootstrap、作品管理和作者更新想法的接口说明，可从承接页或所属作品详情页重新生成。

### idea-platform-agent 与承接待办

创建想法填写标题、问题和预期效果；补充价值、验收标准（`desiredOutputs`）与停止条件（`stopConditions`）可选。子想法记录本轮改动及原因，Context 返回可访问的上游想法和来源作品。承接的项目描述和目的仅在显式覆盖时保存；留空时读取想法的最新内容。

`idea-platform-agent` 调用管理员配置的 OpenAI 兼容 Chat Completions 接口，根据作品说明、已同步进展、阻塞和已有子想法生成短提醒标签。允许没有提醒，数量不固定（最多六个）；不会自动创建需求，也不声称读取过仓库或实际运行过测试。JSON 输出经过服务端校验。兼容模式遵循 [OpenAI 的 JSON 输出说明](https://developers.openai.com/api/docs/guides/structured-outputs#json-mode)。

后台 `/admin` 或环境变量可设置 `OPENAI_BASE_URL`、`OPENAI_API_KEY`、`IDEA_AGENT_MODEL`。模型 ID 必须由管理员填写；缺配置时显示未配置，不生成模板结果。后台保存值优先。密钥不会回显。

`vercel.json` 每五分钟请求 `/api/v1/agent/scan`，需配置 `CRON_SECRET`。后台保存的定时密钥需与 Vercel 的 `CRON_SECRET` 一致。每次最多执行两个分析任务，单次模型请求超时20秒；剩余任务持久保存在作品的 `iteration.analysis`。上下文指纹防止重复分析，租约防止重叠执行和迟到结果覆盖；分析故障最多尝试三次并退避，之后可手动重试。关闭提醒取消未完成分析；重新开启或上下文变化后可再次分析。托管环境需支持此 Cron 频率；也可由现有外部调度器以 Bearer 密钥调用同一端点。

可选邮件配置仍为 `RESEND_API_KEY`、`IDEA_AGENT_EMAIL_FROM`，未配置不影响站内提醒。邮件使用作品和分析批次作为幂等键。待处理提醒标签对所有人可见；分析队列、邮件状态和已忽略记录仍只返回给所属分支作者。忽略、重新分析和开关仍仅作者可操作。

承接页提供简单的**待办清单**（不是执行队列）：每项含 `id`、`title`、`done`、`createdAt`、`updatedAt`。所有者可在网页添加、勾选完成、编辑标题或删除。待办仅对分支所有者可见，不会改写公开承接/作品状态。

外部 Agent 使用该分支 Bearer Token 调用 `/api/v1/attempts/<id>/todos`：

- `GET` 列出待办。
- `POST { "title": "..." }` 添加；可传稳定 `id` 以便重试幂等。
- `PATCH { "id": "...", "done": true }` 或 `{ "id": "...", "title": "新标题" }` 更新。
- `DELETE { "id": "..." }` 删除。

待办读写不构成公开发布授权；公开写接口仍要求 `user_confirmed=true`。Bootstrap 协议 v5 用 `todos_contract` / `attempt_todos` 取代旧的执行队列约定；请重新下载 `AGENTS.md` 或复制连接提示词。json-store 与 Turso 都会持久化 `attempt.todos`。

### 公开访问

部署到其他域名时设置：

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

用 Cloudflare 隧道挂到自己的域名（需要已安装 `cloudflared`，以及 `~/.cloudflared/idea-platform.token`）：

```bash
npm run tunnel          # 已有本地服务时只开隧道
npm run dev:public      # 一并启动 Next.js 再开隧道
./scripts/tunnel.sh --quick   # 临时 *.trycloudflare.com
```

---

## English

Idea Platform is a collaboration space for ideas: publish an idea, adopt it as an independent implementation, track progress, and ship a work. The home page is a graph of ideas, attempts, works, and derived ideas. Root attempts use `AGENTS.md`; attempts on ideas derived from works use a copyable prompt. Both include a branch-scoped token.

New ideas can be kept as drafts. Their authors can still create an implementation branch, generate `AGENTS.md`, sync progress, and ship works; the full tree remains author-only until publishing the idea releases it together. Historical rows without a draft state migrate as published.

The signed-in discovery page shows project families: pinned notes for ideas, clipped photo cards for works, and arrows to derived ideas. Search keeps project context; deeper matches expand ancestors. Desktop supports scroll, zoom and an expanded view; phones read the same relationships vertically.

### Stack

- Next.js 15, React 19, Tailwind CSS 4
- Production data: Turso (`DATA_BACKEND=turso`)
- Local development can also store data in `data/db.json`

### Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Visitors enter the public explore page; registering or signing in opens the workspace. Content is stored in `data/db.json`; accounts and sessions are stored in `data/auth.json`. Set `DATA_BACKEND=turso` to read and write Turso.

### Agent API

Publishing an idea and confirming an adoption are user-initiated. Root attempts provide a downloadable `AGENTS.md`; derived-idea attempts provide a complete copyable prompt. Both contain a Bearer token that can only mutate that branch. Agents fetch the Bootstrap API at the start of each run for current capabilities and contracts. Active tokens renew near expiry, and regenerating a setup does not immediately revoke other valid tokens for the branch.

All write operations require `user_confirmed: true`. Agent attempt updates and work publication, editing and deletion require `Authorization: Bearer <attempt-token>`. Browser edits/deletes use the signed-in session. Both paths enforce branch ownership on the server.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/ideas` | Create an idea; use `as_draft: true` to save a draft |
| `PATCH` | `/api/v1/ideas/:id` | Edit an owned idea; publishing remains a browser-confirmed action |
| `DELETE` | `/api/v1/ideas/:id` | Delete an owned draft and its related content |
| `POST` | `/api/v1/attempts` | Adopt an idea |
| `PATCH` | `/api/v1/attempts/:id` | Update attempt progress |
| `GET` | `/api/v1/attempts/:id/bootstrap` | Read current agent capabilities, contracts, and branch context |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/v1/attempts/:id/todos` | List, add, update, or delete attempt todos |
| `POST` | `/api/v1/works` | Publish a work |
| `PATCH` | `/api/v1/works/:id` | Edit a work owned by the current branch owner |
| `DELETE` | `/api/v1/works/:id` | Delete an owned work after confirmation |
| `GET` | `/api/v1/ideas/:id/context` | Structured idea context |

When publishing a work, pass a public `external_url`. The platform reads `og:image` / `twitter:image` as the cover, then falls back to the site icon; `cover_url` is only for an explicit override.

PATCH accepts title, summary, type, external/repository/cover URLs and a complete license object. Omitted fields are preserved; identity, attribution, publication time and counters cannot be edited. DELETE removes the work and dead references while preserving the idea, branch, derived ideas and external resources. Removing the last published work changes a published branch to `testing`. Existing projects can regenerate their appropriate Agent setup from the attempt or any owned work detail page.

### Attempt todos

Each attempt has a simple owner-private checklist (`id`, `title`, `done`, timestamps). Owners manage it on the attempt page; agents with the branch Bearer token can call `/api/v1/attempts/:id/todos` (GET/POST/PATCH/DELETE). Todo changes are not public publication authorization. Bootstrap protocol v5 exposes `todos_contract` instead of the removed execution queue/worker flow.

### Public access

`/explore` is the guest entrance, and `/explore/:id` shows a public idea and its public works. Only published public ideas and works belonging to public, non-abandoned attempts are exposed. Pending reminder labels on published works are public; analysis jobs, email state, dismissed reminders, drafts, unlisted/private ideas, account data, notifications, and private attempt todos are excluded. Public responses are not cached, so visibility changes apply on the next request. Participation still requires authentication; login and registration preserve the selected idea as the return destination.

Page reads reuse data only within the current request and never wait for external cover scraping. Covers are resolved on work publication, with browser fallbacks for older content. Navigation includes loading placeholders and pending feedback. Background updates run at most once every 30 seconds while the page is visible and no editor is active.

Run `npm test` for public-data isolation, redirect safety, covers, persistence and work ownership/cleanup tests. `npm run test:work-api` verifies authentication, branch scope, partial updates and deletion over HTTP using a disposable local app and synthetic data. Run `npm run build` for production compilation and type validation.

When deploying to another domain:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

Expose the app with a Cloudflare tunnel (`cloudflared` plus `~/.cloudflared/idea-platform.token`):

```bash
npm run tunnel          # tunnel only, if the app is already running
npm run dev:public      # start Next.js, then open the tunnel
./scripts/tunnel.sh --quick   # temporary *.trycloudflare.com URL
```

### 白板、作品版本与迭代草稿

首页以图钉便签表示想法、夹子照片卡表示作品，箭头串联“想法 → 作品 → 衍生想法”。搜索保留项目上下文；深层匹配会展开其祖先。手机端按纵向关系阅读，桌面支持滚动、缩放和展开视图。

作品首次发布保存 v1；说明、封面、链接或许可发生变更时追加快照，无变化不增加版本。衍生想法绑定 `sourceWorkRevisionId`，Context 读取绑定版本的说明和链接。已有作品首次修改或创建衍生想法时补录当前快照；旧衍生想法不推测历史版本。快照记录平台元数据，**不是 Git 提交或部署文件快照**，如需固定源码，应提供固定提交/发布标签的链接。删除作品后，已公开衍生想法保留独立记录并显示来源不可见；尚未发布的绑定草稿不能再发布。

Agent Bootstrap 协议 v5 保留 `propose_iteration` / `iteration_contract`，并以 `attempt_todos` / `todos_contract` 取代旧执行队列。每轮读取最新 Bootstrap，使用原有分支 Token：

```http
POST /api/v1/works/<work_id>/iterations
Authorization: Bearer <当前承接分支 Token>
Content-Type: application/json

{
  "request_id": "stable-id-for-this-proposal",
  "title": "下一步标题",
  "summary": "本轮希望改成什么",
  "problem": "现有作品有什么具体问题",
  "source_work_revision_id": "<GET 作品返回的 current_revision.id>"
}
```

可选 `why_it_matters`、`desired_outputs`、`stop_conditions`。省略版本时绑定提交时的当前版本。相同作品、作者和 `request_id` 重试返回原想法。对同一地址使用 GET 可读取本作品的草稿及用户审阅后的状态。接口只接受草稿字段，不接受发布或权限字段，不产生公开活动；会在作者的通知、作品下一步列表及“我的想法”中出现。作者编辑后通过“发布草稿”公开，来源作品与分支必须仍公开。原有公开写操作授权、验收和停止决定保持不变。

Turso 会自动增加作品快照、来源版本、幂等请求字段。发布前建议按项目现有备份流程保存数据库。
