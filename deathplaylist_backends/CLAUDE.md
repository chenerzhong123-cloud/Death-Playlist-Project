# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **⚠️ 重要提醒：本项目是 monorepo，前端、后端、小程序在同一仓库的不同子目录。**
> - 后端（本项目）：`/Users/deuce/claudeproject/deathplaylist/deathplaylist_backends`
> - 前端：`/Users/deuce/claudeproject/deathplaylist/deathplaylist_frontend`
> - 小程序壳：`/Users/deuce/claudeproject/deathplaylist/deathplaylist_miniprogram`
>
> **请务必确认你要修改的代码在正确的子目录下，不要找错地方修改代码。**

## Project Overview

**死亡歌单 Backend** — NestJS API server for the Death Playlist app. Provides WeChat auth (jscode2session + JWT), song search via iTunes Search API, playlist CRUD (one per user), friend relationships, and share link generation.

This is the **backend** subproject inside the monorepo.

## Commands

```bash
npm install         # Install dependencies
npm run start:dev   # Start dev server with watch (port 80)
npm run build       # Production build (outputs to dist/)
npm run start:prod  # Run production build
npm run lint        # ESLint check
```

No tests configured. Database auto-seeds on first startup.

## Architecture

NestJS 11 modular monolith with TypeORM + SQLite (zero-config MVP).

**Tech stack:** NestJS 11, TypeORM, better-sqlite3, Passport JWT, class-validator.

**Source structure — `src/` with one module per domain:**
- `auth/` — WeChat jscode2session login + JWT strategy + guard (mock fallback when no real credentials)
- `users/` — User CRUD, find-or-create by WeChat OpenID, profile update (PATCH /me)
- `songs/` — Song search via iTunes Search API (with local SQLite cache + fallback)
- `playlists/` — Playlist CRUD with ordered song entries (max 9 songs, **one playlist per user**)
- `friends/` — Bidirectional friendship management
- `share/` — Share data generation with QR code URL
- `seed/` — Auto-seeds on startup via `OnModuleInit` (skips if DB not empty)

**Database:** SQLite file `death_playlist.db`. Entities: User, Song, Playlist, PlaylistSong (join with sortOrder), Friendship.

**API prefix:** All routes under `/api`. CORS enabled via `CORS_ORIGINS` env var (defaults include Vercel frontend URL).

**Auth:** JWT Bearer tokens. Secret via `JWT_SECRET` env var. 7-day expiry. WeChat flow: mini program `wx.login()` → code to H5 → `POST /api/auth/wechat` → backend calls jscode2session → returns JWT.

## Key Patterns

- **WeChat auth:** When `WECHAT_APP_ID` is placeholder, falls back to mock mode (code prefixed with `mock_` creates user by nickname).
- **Song search:** `SongsService.search()` calls iTunes API, caches by `externalId`. Falls back to local DB LIKE query if iTunes fails.
- **Playlist songs ordering:** `PlaylistSong` join entity with `sortOrder`. Update does delete-all-then-re-insert.
- **Song deduplication:** Songs deduped by `externalId` (iTunes trackId) via upsert.
- **One playlist per user:** `PlaylistsController.create()` checks `findByUserId()` and throws `BadRequestException` if user already has a playlist. Frontend uses `PUT /playlists/:id` for updates.
- **Playlist intro:** Max 30 characters (`intro` column length 30, validated by `class-validator` `@MaxLength(30)`).
- **Friendship bidirectionality:** Adding creates two rows (A→B and B→A). Removing deletes both.
- **Friends' playlists:** `PlaylistsService.getFriendsPlaylists()` fetches playlists of all confirmed friends.
- **Seed data:** `SeedService` runs `onModuleInit` — idempotent. Seeds 10 songs, 4 users, 3 playlists, friendships.
- **Response formatting:** `PlaylistsService.formatPlaylist()` converts entities to frontend-compatible plain objects.

## Environment Variables

See `.env.example`. Key vars:
- `PORT` — Server port (default 80)
- `JWT_SECRET` — JWT signing secret
- `DB_DATABASE` — SQLite file path (default `death_playlist.db`)
- `WECHAT_APP_ID` / `WECHAT_APP_SECRET` — WeChat OAuth credentials (placeholder = mock mode)
- `CORS_ORIGINS` — Comma-separated allowed origins（生产环境包含 `https://www.deuce.monster`）

## Deployment

Deployed on Alibaba Cloud (阿里云), domain `www.deuce.monster`. Dockerfile uses `node:20-slim`, production port 80.

**前端静态文件由后端统一托管：**
- `main.ts` 中 `app.useStaticAssets(join(__dirname, '..', 'static'))` 托管前端构建产物
- `static/` 目录包含前端 build 输出（index.html、assets/、privacy.html）
- `/api` 走后端接口，`/` 走前端页面
- 小程序直接调用阿里云 API（不再走微信云托管内网）

**完整部署流程：**
```bash
# 1. 构建前端
cd /Users/deuce/claudeproject/deathplaylist/deathplaylist_frontend
npm run build

# 2. 复制到后端 static/
rm -rf ../deathplaylist_backends/static
cp -r dist ../deathplaylist_backends/static

# 3. 构建后端
cd ../deathplaylist_backends
npm run build

# 4. 部署到阿里云
# Docker:
docker build -t deathplaylist .
docker run -d -p 127.0.0.1:3000:3000 -e CORS_ORIGINS=http://47.103.81.95 deathplaylist
```

**Important:** 域名备案完成后替换 `47.103.81.95` 为正式域名。

## 工作流程

每次修改后端代码后，必须在 monorepo 根目录提交并推送到 GitHub：
```bash
git add -A && git commit -m "描述" && git push
```
不要只本地保存而不推送。

## 部署链路规则

**必须严格遵循 本地 → GitHub → 服务器 的部署链路**，禁止跳过 GitHub 直接向服务器推送文件或代码。

- 所有代码变更必须先 commit & push 到 GitHub
- 服务器通过 git pull 或 GitHub Actions CI/CD 自动拉取并构建部署
- 禁止使用 scp 直接传输源代码到服务器绕过 GitHub
- 如需手动部署，也必须通过 `git pull` 在服务器上拉取最新代码

## Claude Code CI/CD 中枢操作指南

### 检查部署状态
```bash
# 查看最近工作流运行
gh run list -R chenerzhong123-cloud/Death-Playlist-Project --limit 3

# 查看某次运行日志（失败时排查用）
gh run view <run-id> -R chenerzhong123-cloud/Death-Playlist-Project --log
```

### 服务器访问（已配置 SSH 别名 `aliyun`）
```bash
# 查看容器状态
ssh aliyun "docker ps -a --filter name=deathplaylist"

# 查看最近日志
ssh aliyun "docker logs deathplaylist --tail 50"

# 查看磁盘和内存
ssh aliyun "df -h / && free -h"

# 在服务器上手动拉取并重建
ssh aliyun "cd /root/deathplaylist && git pull origin main && cd deathplaylist_frontend && npm install --prefer-offline && npm run build && rm -rf ../deathplaylist_backends/static && cp -r dist ../deathplaylist_backends/static && cd ../deathplaylist_backends && docker build -t deathplaylist . && docker stop deathplaylist; docker rm deathplaylist; docker run -d --name deathplaylist -p 127.0.0.1:3000:3000 --restart=always --env-file /root/deathplaylist/deathplaylist_backends/.env -v deathplaylist-data:/data deathplaylist"
```

### 部署失败排查 Playbook
1. **GitHub Actions 日志**：`gh run view <id> --log` 查看 SSH 连接或构建错误
2. **服务器容器状态**：`ssh aliyun "docker ps -a"` 确认容器是否在运行
3. **容器日志**：`ssh aliyun "docker logs deathplaylist --tail 50"` 查看应用错误
4. **代码同步**：`ssh aliyun "cd /root/deathplaylist && git log --oneline -3"` 确认代码版本
5. **磁盘空间**：`ssh aliyun "df -h"` 空间不足会导致构建失败
6. **环境配置**：`ssh aliyun "cat /root/deathplaylist/deathplaylist_backends/.env"` 确认生产环境变量
