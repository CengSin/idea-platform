# 项目展示

从 GitHub 自动同步我的仓库，追踪每个项目推进到了哪里，并由本地 Claude Code 挑出其中最有想象力的几个对外展示。

- **公开页 `/`**：最有想象力的项目（最多 6 个）、最近 14 天有提交的项目、其余项目（默认折叠）。私有仓库、Fork、隐藏项目和 GitHub 个人主页仓库永远不会出现。
- **后台 `/admin`**：全部仓库（含私有）、想象力分数、近 12 周提交柱状图；可以置顶、隐藏、改写公开一句话，以及只有自己能看到的私人笔记。
- **零门槛**：不用手动录入项目。新仓库下次同步就会出现，删掉的仓库标为「已不在 GitHub」，笔记不会丢。

## 运行

```bash
npm install
ADMIN_PASSWORD=随便设一个 npm run dev   # http://localhost:3001
npm run curate                          # 用 gh 的登录态同步仓库，并用 Claude Code 评选
```

本地数据保存在 `data/showcase.json`。

## 想象力评选（`npm run curate`）

评选在本地运行，服务端不需要任何 LLM Key。

1. 同步 GitHub 仓库。Token 取 `GITHUB_TOKEN`，没有时用 `gh auth token`，所以包含私有仓库。
2. 只挑出新仓库和评选后又有新推送的仓库（Fork 不参与评选），读取 README 的前 3000 字。
3. 每 8 个一批交给 `claude -p` 打分。评分只看想象力：问题是否新颖、是否跨界组合、做法是否出人意料、做成后影响有多大；不看完成度和星标。教程、练习、备份类仓库给 30 分以下。
4. 写回分数、一句话 pitch 和打分理由。分数达到 55 分的公开项目会自动进入精选。

```bash
npm run curate -- --all        # 全部重评
npm run curate -- --no-sync    # 跳过同步
npm run curate -- --dry-run    # 只打印，不保存
npm run curate -- --model sonnet --limit 10
```

想直接写进线上数据，在 `.env.local` 里设置 `SHOWCASE_URL=https://你的域名` 和 `ADMIN_PASSWORD`（与线上一致）：脚本会经由线上的 `/api/owner/showcase` 同步和保存，本机不需要数据库凭证。也可以临时用 `--remote https://你的域名`。公开页最多 10 分钟内刷新。

## 部署（Vercel）

| 变量 | 说明 |
| --- | --- |
| `DATA_BACKEND=turso`、`TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN` | 生产环境必须配置。数据存在新表 `showcase_store`，旧平台的表不会被改动 |
| `ADMIN_PASSWORD` | 后台登录密码（单人使用） |
| `SESSION_SECRET` | 可选。不设置时，修改密码会让所有已登录的会话失效 |
| `GITHUB_TOKEN` | 只读 Token。配置后后台同步会包含私有仓库；不配置时需要设置 `GITHUB_USER`，只同步公开仓库 |
| `CRON_SECRET` | Vercel Cron 每天调用 `/api/cron/sync` 时使用 |
| `NEXT_PUBLIC_SITE_URL` | 站点地址 |

## 接口

- `GET /api/v1/projects`：公开页展示的内容（精选、推进中、其他），只包含公开字段，允许跨域，可供个人站点等使用。
- `GET /api/cron/sync`：需要 `Authorization: Bearer $CRON_SECRET`。
- `GET|POST /api/owner/showcase`：需要 `Authorization: Bearer $ADMIN_PASSWORD`，供本地 `npm run curate` 远程读写线上数据。

## 开发

```bash
npm test          # 状态推导、同步合并、精选规则、评选解析、会话签名、存储
npm run typecheck
npm run build
```
