# Idea Platform

让想法被发现、被多人独立实现，并追踪它如何长成作品。

Discover ideas, let people implement them independently, and track how they grow into works.

---

## 中文

Idea Platform 是一个想法协作平台：发布想法、承接实现、跟踪进展，并最终把结果发布为作品。首页用图谱展示想法、承接与作品之间的关系。登录用户还可以给承接分支生成 `AGENTS.md` 和专属 Token，让 Agent 自动回写状态。

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

发布想法和确认承接由登录用户发起。承接创建后，承接页会生成专属 `AGENTS.md`，其中包含只允许操作该分支的 Bearer Token。

所有写操作都要求 `user_confirmed: true`。更新承接和发布作品还需要 `Authorization: Bearer <attempt-token>`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/v1/ideas` | 发布想法 |
| `POST` | `/api/v1/attempts` | 承接想法 |
| `PATCH` | `/api/v1/attempts/:id` | 更新承接进展 |
| `POST` | `/api/v1/works` | 发布作品 |
| `GET` | `/api/v1/ideas/:id/context` | 结构化 Idea Context |

发布作品时提供公开的 `external_url`，平台会读取 `og:image` / `twitter:image` 作为封面；`cover_url` 仅用于显式覆盖。

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

### Stack

- Frontend: Next.js 15, React 19, Tailwind CSS 4
- Backend: Go (Gin) + MySQL + Redis + MinIO
- For local frontend-only development, data can live in `data/db.json`

### Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) and register a local account. Content is stored in `data/db.json`; accounts and sessions are stored in `data/auth.json`.

### Backend API

```bash
cd backend
cp .env.example .env
docker compose up -d
go run ./cmd/api
```

Listens on [http://localhost:8081](http://localhost:8081) by default. See [backend/README.md](backend/README.md) for the full API map.

### Agent API

Publishing an idea and confirming an adoption are user-initiated. After an attempt is created, the attempt page generates an `AGENTS.md` with a Bearer token that can only mutate that branch.

All write operations require `user_confirmed: true`. Attempt updates and work publishing also require `Authorization: Bearer <attempt-token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/ideas` | Publish an idea |
| `POST` | `/api/v1/attempts` | Adopt an idea |
| `PATCH` | `/api/v1/attempts/:id` | Update attempt progress |
| `POST` | `/api/v1/works` | Publish a work |
| `GET` | `/api/v1/ideas/:id/context` | Structured idea context |

When publishing a work, pass a public `external_url`. The platform reads `og:image` / `twitter:image` as the cover; `cover_url` is only for an explicit override.

### Public access

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
