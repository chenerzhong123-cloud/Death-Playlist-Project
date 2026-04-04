# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **⚠️ 重要提醒：本项目包含前端 + 后端，有两个独立的代码仓库路径。**
> - 后端（本项目）：`/Users/deuce.chen/deathplaylist/deathplaylist_backends`
> - 前端：`/Users/deuce.chen/deathplaylist/deathplaylist_frontend`
> - 小程序壳：`/Users/deuce.chen/deathplaylist/deathplaylist_miniprogram`
>
> **请务必确认你要修改的代码在正确的路径下，不要找错地方修改代码。**

## Project Overview

**死亡歌单 Backend** — NestJS API server for the Death Playlist app. Provides WeChat auth (jscode2session + JWT), song search via iTunes Search API, playlist CRUD (one per user), friend relationships, and share link generation.

This is the **backend** repo.

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
- `CORS_ORIGINS` — Comma-separated allowed origins

## Deployment

Deployed on WeChat Cloud Hosting (微信云托管). Container config in `container.config.json`, Dockerfile uses `node:20-slim`.

**前端静态文件由后端统一托管：**
- `main.ts` 中 `app.useStaticAssets(join(__dirname, '..', 'static'))` 托管前端构建产物
- `static/` 目录包含前端 build 输出（index.html、assets/、privacy.html）
- `/api` 走后端接口，`/` 走前端页面
- 小程序 web-view 加载后端云托管 URL（不再使用 Vercel）

**完整部署流程：**
```bash
# 1. 构建前端
cd /Users/deuce.chen/deathplaylist/deathplaylist_frontend
npm run build

# 2. 复制到后端 static/
rm -rf ../deathplaylist_backends/static
cp -r dist ../deathplaylist_backends/static

# 3. 构建后端（Dockerfile 中 COPY . . 会包含 static/）
cd ../deathplaylist_backends
npm run build

# 4. 部署到微信云托管
```

**Important:** 任何变更（前端或后端）都需要重新部署后端到微信云托管——刷新小程序不会自动生效。

## 工作流程

每次修改后端代码后，必须提交并推送到 GitHub：
```bash
git add -A && git commit -m "描述" && git push
```
不要只本地保存而不推送。
