# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**死亡歌单 Backend** — NestJS API server for the Death Playlist app. Provides WeChat auth (jscode2session + JWT), song search via iTunes Search API, playlist CRUD, friend relationships, and share link generation.

This is the **backend** repo. The frontend lives in `../deathplaylist_frontend` and the mini program shell in `../deathplaylist_miniprogram`.

## Commands

```bash
npm install         # Install dependencies
npm run start:dev   # Start dev server with watch (port 3001)
npm run build       # Production build (outputs to dist/)
npm run start:prod  # Run production build
npm run lint        # ESLint check
```

There are no tests configured. The database auto-seeds on first startup.

## Architecture

NestJS 11 modular monolith with TypeORM + SQLite (zero-config MVP).

**Tech stack:** NestJS 11, TypeORM, better-sqlite3, Passport JWT, class-validator.

**Source structure:** `src/` with one module per domain:
- `auth/` — WeChat jscode2session login + JWT strategy + guard (mock fallback when no real credentials)
- `users/` — User CRUD, find-or-create by WeChat OpenID, profile update (PATCH /me)
- `songs/` — Song search via iTunes Search API (with local SQLite cache + fallback)
- `playlists/` — Playlist CRUD with ordered song entries (max 9 songs)
- `friends/` — Bidirectional friendship management
- `share/` — Share data generation with QR code URL
- `seed/` — Auto-seeds on startup via `OnModuleInit` (skips if DB not empty)

**Database:** SQLite file `death_playlist.db` (auto-created, synced via `synchronize: true`). Entities: User, Song, Playlist, PlaylistSong (join with sortOrder), Friendship.

**API prefix:** All routes are under `/api`. CORS enabled via `CORS_ORIGINS` env var (defaults to localhost:3000 and localhost:5173).

**Auth:** JWT Bearer tokens via `Authorization: Bearer <token>`. Secret configured via `JWT_SECRET` env var. Token expires in 7 days. WeChat login flow: mini program calls `wx.login()` → passes code to H5 → H5 sends to `POST /api/auth/wechat` → backend calls WeChat jscode2session API → returns JWT.

## Key Patterns

- **WeChat auth:** When `WECHAT_APP_ID` is placeholder, falls back to mock mode (code prefixed with `mock_` creates user by nickname). When real credentials configured, calls `https://api.weixin.qq.com/sns/jscode2session`.
- **Song search:** `SongsService.search()` calls iTunes Search API (`https://itunes.apple.com/search`), caches results in local SQLite by `externalId`. Falls back to local DB LIKE query if iTunes API fails.
- **Playlist songs ordering:** Uses a `PlaylistSong` join entity with `sortOrder` field. Songs are re-ordered via delete-all-then-re-insert on update.
- **Song deduplication:** Songs are deduped by `externalId` (iTunes trackId) via upsert pattern.
- **Friendship bidirectionality:** Adding a friend creates two rows (A→B and B→A). Removing deletes both.
- **Seed data:** `SeedService` runs `onModuleInit` — idempotent (checks song count). Seeds 10 songs, 4 users, 3 playlists, and friendships.
- **Response formatting:** `PlaylistsService.formatPlaylist()` converts entities to frontend-compatible plain objects.

## Environment Variables

See `.env.example`. Key vars:
- `PORT` — Server port (default 3001)
- `JWT_SECRET` — JWT signing secret
- `DB_DATABASE` — SQLite file path (default `death_playlist.db`)
- `WECHAT_APP_ID` / `WECHAT_APP_SECRET` — WeChat OAuth credentials (placeholder = mock mode)
- `CORS_ORIGINS` — Comma-separated allowed origins

## Deployment

Deployed on WeChat Cloud Hosting (微信云托管). Container config in `container.config.json`, Dockerfile uses `node:20-slim`. Build locally (`npm run build`) then deploy the `dist/` folder.
