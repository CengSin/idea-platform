# Idea Platform API

Go 后端，覆盖当前页面已经用到的读写能力。持久化用 MySQL，热数据与未读计数走 Redis，作品封面等文件走 MinIO。

## 启动

```bash
cd backend
cp .env.example .env
docker compose up -d
go mod tidy
go run ./cmd/api
```

默认监听 `http://localhost:8081`，可用请求头 `X-User-Id` 指定调用用户。`seed/db.json` 默认为空，不会自动灌入演示内容。

## 页面接口对照

| 页面 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| 发现 `/` | GET | `/api/v1/snapshot` | 图谱所需的全量快照 |
| 侧栏未读 | GET | `/api/v1/me` | 当前用户、未读数 |
| 我的想法 `/ideas` | GET | `/api/v1/ideas?mine=1` | 带 metrics |
| 发布想法弹窗 | POST | `/api/v1/ideas` | 需 `user_confirmed=true` |
| 想法详情 `/ideas/:id` | GET | `/api/v1/ideas/:id` | idea + attempts + works + forks + similar + metrics |
| 关注 | POST/DELETE | `/api/v1/ideas/:id/follow` | `{ "follow": true }` |
| Agent Context | GET | `/api/v1/ideas/:id/context` | 结构化 Idea Context |
| 承接中 `/attempts` | GET | `/api/v1/attempts?mine=1` | 默认只返回当前用户 |
| 承接想法 | POST | `/api/v1/attempts` | 需 `user_confirmed=true` |
| 承接详情 `/attempts/:id` | GET | `/api/v1/attempts/:id` | attempt + idea + owner + works |
| 更新进展 | PATCH | `/api/v1/attempts/:id` | 需 `user_confirmed=true` |
| 作品 `/works` | GET | `/api/v1/works` / `?mine=1` | 已发布作品 |
| 发布作品 | POST | `/api/v1/works` | 需 `user_confirmed=true` |
| 作品详情 `/works/:id` | GET | `/api/v1/works/:id` | work + 归因 + 衍生想法 |
| 通知 | GET | `/api/v1/notifications` | |
| 全部已读 | POST | `/api/v1/notifications/read` | |
| 设置 | GET | `/api/v1/me` | 用户信息 |
| 清空内容 | POST | `/api/v1/content/clear` | |
| 封面上传 | POST | `/api/v1/uploads` | `multipart/form-data` 字段 `file` |
| 文件读取 | GET | `/api/v1/files/*key` | MinIO 对象代理 |
| 健康检查 | GET | `/health` | mysql / redis / minio |

接口请求体同时接受 camelCase 与 snake_case。Next.js 主应用在承接页生成 `AGENTS.md` 和分支专属 Token，由 Agent 自动调用进展与作品接口。

发布作品时提供公开的 `external_url`，API 会自动读取页面的 `og:image` / `twitter:image` 作为封面，没有预览图时回退到网站图标；`cover_url` 仅用于显式覆盖。链接预览包含超时、重定向次数、响应大小和内网地址限制，解析失败时使用网站标示。

## 基础设施

- MySQL `localhost:3306` 库 `idea_platform` / 用户 `idea`
- Redis `localhost:6379`
- MinIO API `localhost:9000`，控制台 `localhost:9001`（compose 默认 idea / ideaidea）
- 若本机 9000 已被占用，可把 `.env` 里的 `MINIO_*` 指到已有实例，或设置 `MINIO_HOST_PORT` 换端口
