# Idea Platform

让想法被发现、被多人独立实现，并追踪它如何长成作品。

Discover ideas, let people implement them independently, and track how they grow into works.

---

## 中文

Idea Platform 是一个想法协作平台：发布想法、承接实现、跟踪进展，并最终把结果发布为作品。首页用图谱展示想法、承接与作品之间的关系。登录用户还可以给承接分支生成 `AGENTS.md` 和专属 Token，让 Agent 自动回写状态。

新想法可以先保存为草稿。草稿作者仍可创建承接项目、生成 `AGENTS.md`、同步状态并发布作品；整棵草稿内容在此期间仅作者可见，发布想法时统一进入公开链路。旧数据没有草稿标记时按已发布内容迁移。

登录后的发现首页默认展示项目摘要、代表承接与最新作品封面，按可用宽度排列，较多项目使用紧凑预览。点击「生长路径」后，桌面展开可拖拽图谱，手机展示可滚动的承接和作品详情。右侧动态按项目与日期合并，优先展示作品发布，完整记录可按需展开；搜索、主题筛选和发布入口常驻可用。

### 技术栈

- 前端：Next.js 15、React 19、Tailwind CSS 4
- 后端：Go（Gin）+ MySQL + Redis + MinIO
- 本地开发时，前端也可把数据写到 `data/db.json`

### 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3001](http://localhost:3001)，注册账号后即可从空白状态开始。内容保存在 `data/db.json`，账号和会话保存在 `data/auth.json`。

### 后端 API

```bash
cd backend
cp .env.example .env
docker compose up -d
go run ./cmd/api
```

默认地址 [http://localhost:8081](http://localhost:8081)。完整接口说明见 [backend/README.md](backend/README.md)。

### Agent API

发布想法和确认承接由登录用户发起。承接创建后，承接页会生成专属 `AGENTS.md`，其中包含只允许操作该分支的 Bearer Token。Agent 每轮启动会读取 Bootstrap API 获取最新能力和接口约定；有效 Token 在临近到期且持续使用时自动续期，重新生成配置不会立即吊销同一分支仍有效的旧 Token。

所有写操作都要求 `user_confirmed: true`。更新承接、发布作品，以及 Agent 修改或删除作品需要 `Authorization: Bearer <attempt-token>`。作品详情页的编辑和删除入口仅向作品所属承接的所有者显示；网页操作使用登录会话，服务端仍会检查所有权。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/v1/ideas` | 创建想法；`as_draft: true` 保存草稿 |
| `PATCH` | `/api/v1/ideas/:id` | 编辑草稿；想法作者可授权所属分支 Agent 更新；`publish: true` 仅限网页确认 |
| `DELETE` | `/api/v1/ideas/:id` | 删除自己的草稿及关联内容 |
| `POST` | `/api/v1/attempts` | 承接想法 |
| `PATCH` | `/api/v1/attempts/:id` | 更新承接进展 |
| `GET` | `/api/v1/attempts/:id/bootstrap` | 获取最新 Agent 能力、接口约定与分支上下文 |
| `POST` | `/api/v1/works` | 发布作品 |
| `PATCH` | `/api/v1/works/:id` | 修改自己分支的作品，未传字段保持不变 |
| `DELETE` | `/api/v1/works/:id` | 确认后删除自己分支的作品 |
| `GET` | `/api/v1/ideas/:id/context` | 结构化 Idea Context |

发布作品时提供公开的 `external_url`，平台会读取 `og:image` / `twitter:image` 作为封面，没有预览图时回退到网站图标；`cover_url` 仅用于显式覆盖。

编辑接受 `title`、`summary`、`type`、`external_url`、`repository_url`、`cover_url` 和完整 `license` 对象；链接字段也接受 camelCase。名称不可清空，简介和可选链接可用空字符串清空。修改作品地址且不传封面，或把封面清空，会重新提取预览。作品 ID、来源、署名、发布时间和统计不可修改。

修改、删除均须发送 JSON，包含严格的布尔值 `user_confirmed: true`。成功返回 `work_id`、`updated_at`、`attempt_id`、`attempt_status`、`graph_status`；修改还返回 `work`，删除返回 `deleted: true`。错误状态为 400（参数无效）、401（凭证无效）、403（非所有者或 Token 分支不匹配）、404（作品不存在）、415（Content-Type 错误）。

删除会清理作品引用及其动态、通知，保留来源想法、承接和衍生想法，不会删除外部站点或仓库。删去分支最后一个已发布作品时，原为 `published` 的承接回到 `testing`；暂停或放弃状态不变。每条承接生成的 `AGENTS.md` 包含 Bootstrap、作品管理和作者更新想法的接口说明。老项目可从承接页或所属作品详情页下载最新文件，也可复制更新提示词交给 Agent 自动替换旧配置。

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

Idea Platform is a collaboration space for ideas: publish an idea, adopt it as an independent implementation, track progress, and ship a work. The home page is a graph of ideas, attempts, and works. Signed-in users can generate an `AGENTS.md` plus a branch-scoped token so an agent can report status back to the platform.

New ideas can be kept as drafts. Their authors can still create an implementation branch, generate `AGENTS.md`, sync progress, and ship works; the full tree remains author-only until publishing the idea releases it together. Historical rows without a draft state migrate as published.

The signed-in discovery page starts with responsive project summaries, representative attempts, and the latest published work covers. Larger collections use compact previews. Selecting a project opens the draggable graph on desktop or readable attempt/work details on mobile. Activity is grouped by project and date, with work publications highlighted and complete records available on demand.

### Stack

- Frontend: Next.js 15, React 19, Tailwind CSS 4
- Backend: Go (Gin) + MySQL + Redis + MinIO
- For local frontend-only development, data can live in `data/db.json`

### Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Visitors enter the public explore page; registering or signing in opens the workspace. Content is stored in `data/db.json`; accounts and sessions are stored in `data/auth.json`.

### Backend API

```bash
cd backend
cp .env.example .env
docker compose up -d
go run ./cmd/api
```

Listens on [http://localhost:8081](http://localhost:8081) by default. See [backend/README.md](backend/README.md) for the full API map.

### Agent API

Publishing an idea and confirming an adoption are user-initiated. After an attempt is created, the attempt page generates an `AGENTS.md` with a Bearer token that can only mutate that branch. Agents fetch the Bootstrap API at the start of each run for current capabilities and contracts. Active tokens renew near expiry, and generating a new configuration no longer immediately revokes other valid tokens for the branch.

All write operations require `user_confirmed: true`. Agent attempt updates and work publication, editing and deletion require `Authorization: Bearer <attempt-token>`. Browser edits/deletes use the signed-in session. Both paths enforce branch ownership on the server.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/ideas` | Create an idea; use `as_draft: true` to save a draft |
| `PATCH` | `/api/v1/ideas/:id` | Edit an owned idea; publishing remains a browser-confirmed action |
| `DELETE` | `/api/v1/ideas/:id` | Delete an owned draft and its related content |
| `POST` | `/api/v1/attempts` | Adopt an idea |
| `PATCH` | `/api/v1/attempts/:id` | Update attempt progress |
| `GET` | `/api/v1/attempts/:id/bootstrap` | Read current agent capabilities, contracts, and branch context |
| `POST` | `/api/v1/works` | Publish a work |
| `PATCH` | `/api/v1/works/:id` | Edit a work owned by the current branch owner |
| `DELETE` | `/api/v1/works/:id` | Delete an owned work after confirmation |
| `GET` | `/api/v1/ideas/:id/context` | Structured idea context |

When publishing a work, pass a public `external_url`. The platform reads `og:image` / `twitter:image` as the cover, then falls back to the site icon; `cover_url` is only for an explicit override.

PATCH accepts title, summary, type, external/repository/cover URLs and a complete license object. Omitted fields are preserved; identity, attribution, publication time and counters cannot be edited. DELETE removes the work and dead references while preserving the idea, branch, derived ideas and external resources. Removing the last published work changes a published branch to `testing`. Existing projects can download the latest `AGENTS.md` or copy an agent update prompt from their attempt or any owned work detail page.

### Public access

`/explore` is the guest entrance, and `/explore/:id` shows a public idea and its public works. Only published public ideas and works belonging to public, non-abandoned attempts are exposed. Drafts, unlisted/private ideas, account data, notifications, and execution prompts are excluded. Public responses are not cached, so visibility changes apply on the next request. Participation still requires authentication; login and registration preserve the selected idea as the return destination.

Page reads reuse data only within the current request and never wait for external cover scraping. Covers are resolved on work publication, with browser fallbacks for older content. Navigation includes loading placeholders and pending feedback. Background updates run at most once every 30 seconds while the page is visible and no editor is active.

Run `npm test` for public-data isolation, redirect safety, covers, persistence and work ownership/cleanup tests. `npm run test:work-api` verifies authentication, branch scope, partial updates and deletion over HTTP using a disposable local app and synthetic data. Run `npm run build` for production compilation and type validation, and `cd backend && go test ./...` for Go tests.

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
