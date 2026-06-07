# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **⚠️ 重要提醒：本项目是 monorepo，前端、后端、小程序在同一仓库的不同子目录。**
> - 前端（本项目）：`/Users/deuce/claudeproject/deathplaylist/deathplaylist_frontend`
> - 后端：`/Users/deuce/claudeproject/deathplaylist/deathplaylist_backends`
> - 小程序壳：`/Users/deuce/claudeproject/deathplaylist/deathplaylist_miniprogram`
>
> **请务必确认你要修改的代码在正确的子目录下，不要找错地方修改代码。**

## Project Overview

**死亡歌单 (Death Playlist)** is a Chinese-language React SPA for creating and sharing funeral music playlists. Users browse as guests, search and select up to 9 songs, optionally authorize via WeChat to save, and share a card with QR code. Guests can browse and add songs freely; login is only required when saving a playlist or viewing full friends' playlists.

This is the **frontend** repo.

## Commands

```bash
npm run dev       # Start dev server on port 3000 (vite --port=3000 --host=0.0.0.0)
npm run build     # Production build + unwrap CSS @layer for WebView compat
npm run preview   # Preview production build locally
npm run clean     # Remove dist/ directory
npm run lint      # Type-check only (tsc --noEmit)
```

No tests configured.

## Architecture

Single-page React 19 app. View navigation via `view` state machine: `'landing' | 'selection' | 'preview' | 'share' | 'friends'`.

**Tech stack:** Vite 6, React 19, Tailwind CSS 4 (`@tailwindcss/vite`), Framer Motion (`motion/react`), Lucide React icons.

**Source structure — everything in `src/`:**
- `App.tsx` — The entire application (~980 lines): all views, state, UI, API calls
- `main.tsx` — React entry point
- `index.css` — `@import "tailwindcss"`

**Key application flow:**
1. **Landing** → "新的歌单" or "看朋友们的歌单"
2. **Selection** → search/browse songs, add up to 9 (login required to proceed)
3. **Preview** → reorder songs via drag, edit intro (30 char max, randomly pre-filled from 15 suggestions)
4. **Share** → save to backend, display share card with QR code
5. **Friends** → view friends' playlists (guests see 1 demo card + login CTA)

**Deferred auth pattern:**
- `requireLogin()` checks if `user` exists; if not, shows auth popup and returns false
- `pendingAction` ref stores the action to execute after successful login
- Login gated actions: "完成" button (selection→preview), "分享预览" button (save playlist), friends "登录查看更多"
- Guest browsing allowed for: landing, selection (add/remove songs), friends (demo only)

**Auth flow:**
- Reads `wxCode` from URL params (passed by mini program shell) → `POST /api/auth/wechat`
- Reads `wxNickname`/`wxAvatar` from URL params to pre-fill auth popup
- Fallback: mock login with nickname input when no WeChat code
- JWT stored in localStorage, validated on mount via `GET /api/users/me`

**Playlist persistence:**
- `myPlaylistId` tracks saved playlist; on login, `loadMyPlaylist()` fetches existing playlist
- One playlist per user enforced by backend
- Create (`POST /playlists`) or update (`PUT /playlists/:id`) on save

**Recommendation system (visit-count rotation):**
- 6 keyword groups rotate by visit count (tracked in localStorage)
- `shuffleStrict()` enforces no adjacent same-artist songs — stops rather than degrades
- `ensureNoAdjacent()` validates and re-shuffles if violations found
- Extra keywords pulled in if primary batch insufficient (target: 20 songs)
- Cache format: `{ batches: Song[][], ts: number, ver: number }` with CACHE_VER=4 and 24h TTL
- Cache versioning prevents stale format issues

**Intro suggestions:**
- 15 pre-written Chinese phrases in `INTRO_SUGGESTIONS` array
- `suggestedIntro = useMemo(() => randomIntro(), [])` picks one randomly on mount
- Users can edit via inline input (30 char max)

## Frontend ↔ Backend API Endpoints

| Frontend Action | Backend Endpoint | Auth |
|----------------|-----------------|------|
| WeChat auth | `POST /api/auth/wechat` | No |
| Get current user | `GET /api/users/me` | JWT |
| Update profile | `PATCH /api/users/me` | JWT |
| Search songs | `GET /api/songs/search?q=keyword&limit=20` | No |
| Create playlist | `POST /api/playlists` | JWT |
| Get my playlists | `GET /api/playlists/me` | JWT |
| Update playlist | `PUT /api/playlists/:id` | JWT |
| Get friends' playlists | `GET /api/playlists/friends` | JWT |
| Get playlist by ID | `GET /api/playlists/:id` | No |
| Like a playlist | `POST /api/playlists/:id/like` | No |

## Important Patterns

- **Tailwind CSS 4 WebView compat:** Build uses `lightningcss` with `targets: 'chrome 60'` to convert oklch→rgb, plus `scripts/unwrap-css-layers.js` post-build step to remove `@layer` wrappers.
- **Motion library:** Imported as `motion/react` (not `framer-motion`). `AnimatePresence` for view transitions, `Reorder.Group` for drag-to-reorder songs.
- **Chinese-language UI:** All user-facing strings in Chinese. Dark glassmorphism design with `backdrop-blur` and `bg-white/` opacity patterns.
- **`apiFetch()` helper:** Auto-attaches JWT from localStorage, sets Content-Type to application/json.
- **Album art:** `referrerPolicy="no-referrer"` on all `<img>` tags for album art (iTunes URLs require this).

## Deployment

前端不再独立部署。构建产物由后端统一托管：

```bash
# 1. 构建前端
cd /Users/deuce/claudeproject/deathplaylist/deathplaylist_frontend
npm run build

# 2. 复制到后端 static/ 目录
rm -rf ../deathplaylist_backends/static
cp -r dist ../deathplaylist_backends/static

# 3. 重新部署后端到微信云托管（后端变更会一并托管前端）
```

**架构：** 前端构建产物放在后端 `static/` 目录，NestJS 通过 `app.useStaticAssets()` 托管。`/api` 走后端接口，`/` 走前端页面。用户通过微信云托管域名访问。

**Vercel 已弃用**（中国大陆无法稳定访问）。后端和前端统一部署到阿里云服务器，域名 `www.deuce.monster`。

**部署变更需要重新部署后端**，前端不会独立生效。
