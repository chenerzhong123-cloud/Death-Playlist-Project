# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**死亡歌单 Backend** — NestJS API server for the Death Playlist app. Provides user auth (mock WeChat + JWT), song search, playlist CRUD, friend relationships, and share link generation.

This is the **backend** repo. The frontend lives in a sibling directory `../deathplaylist` (repo: `Death-Playlist`).

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
- `auth/` — Mock WeChat login + JWT strategy + guard
- `users/` — User CRUD, find-or-create by WeChat OpenID
- `songs/` — Song search (LIKE query), find-or-create by externalId
- `playlists/` — Playlist CRUD with ordered song entries (max 9 songs)
- `friends/` — Bidirectional friendship management
- `share/` — Share data generation with QR code URL
- `seed/` — Auto-seeds on startup via `OnModuleInit` (skips if DB not empty)

**Database:** SQLite file `death_playlist.db` (auto-created, synced via `synchronize: true`). Entities: User, Song, Playlist, PlaylistSong (join with sortOrder), Friendship.

**API prefix:** All routes are under `/api`. CORS enabled for `localhost:3000` and `localhost:5173`.

**Auth:** JWT Bearer tokens via `Authorization: Bearer <token>`. Secret configured via `JWT_SECRET` env var (default in `.env`). Token expires in 7 days.

## Key Patterns

- **Playlist songs ordering:** Uses a `PlaylistSong` join entity with `sortOrder` field (not array column). Songs are re-ordered via delete-all-then-re-insert on update.
- **Song deduplication:** Songs are deduped by `externalId` via `findOrCreate` pattern. The `externalId` column has a unique constraint.
- **Friendship bidirectionality:** Adding a friend creates two rows (A→B and B→A). Removing deletes both.
- **Seed data:** `SeedService` runs `onModuleInit` — idempotent (checks song count). Seeds 10 songs, 4 users, 3 playlists, and friendships matching the frontend mock data.
- **Response formatting:** `PlaylistsService.formatPlaylist()` converts entities to frontend-compatible plain objects.

## Environment Variables

See `.env.example`. Key vars:
- `PORT` — Server port (default 3001)
- `JWT_SECRET` — JWT signing secret
- `DB_DATABASE` — SQLite file path (default `death_playlist.db`)
- `WECHAT_APP_ID` / `WECHAT_APP_SECRET` — Placeholder for real WeChat OAuth
