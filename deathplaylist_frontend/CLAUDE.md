# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**死亡歌单 (Death Playlist)** is a Chinese-language React SPA for creating and sharing funeral music playlists. Users authorize via WeChat, search songs via iTunes Search API (backend-proxied), select up to 9 songs, customize a shareable card with QR code, and browse friends' playlists.

This is the **frontend** repo. The backend lives in `../deathplaylist_backends` and the mini program shell in `../deathplaylist_miniprogram`.

## Commands

```bash
npm run dev       # Start dev server on port 3000 (vite --port=3000 --host=0.0.0.0)
npm run build     # Production build + unwrap CSS @layer for WebView compat
npm run preview   # Preview production build locally
npm run clean     # Remove dist/ directory
npm run lint      # Type-check only (tsc --noEmit)
```

There are no tests configured in this project.

## Architecture

Single-page React 19 app with no routing library. View navigation is managed via a `view` state machine (`'landing' | 'selection' | 'preview' | 'share' | 'friends'`).

**Tech stack:** Vite 6, React 19, Tailwind CSS 4 (via `@tailwindcss/vite` plugin), Framer Motion (`motion` package), Lucide React icons.

**Source structure:** Everything lives in `src/`:
- `App.tsx` - The entire application (all views, state, UI) in a single component
- `main.tsx` - React entry point, renders `<App />` into `#root`
- `index.css` - Single line: `@import "tailwindcss"`

**API integration:**
- `API_BASE` constant points to backend cloud hosting URL
- `apiFetch()` helper auto-attaches JWT from localStorage
- Song search hits backend which proxies iTunes Search API with local caching
- Auth: reads `wxCode` from URL params (passed by mini program shell), calls `POST /api/auth/wechat`
- Fallback: mock login with nickname input when no WeChat code available

**Key state:**
- `user` (AuthUser | null) — current user with id, nickname, avatar
- `authLoading` — shows loading during JWT validation / wx.login
- Song selection (max 9 songs), `searchResults` from backend API, `searchLoading`
- **Player state:** `playingSong` + `playProgress` (visual-only simulated progress bar)
- **Auth state:** `showAuthPopup` auto-triggers if no JWT and no wxCode

## Important Patterns

- **Tailwind CSS 4 WebView compat:** Build uses `lightningcss` with `targets: 'chrome 60'` to convert oklch→rgb, plus `scripts/unwrap-css-layers.js` post-build step to remove `@layer` wrappers that WeChat WebView doesn't support.
- **Motion library:** Imported as `motion/react` (not `framer-motion`), using `AnimatePresence` for view transitions and `Reorder.Group` for drag-to-reorder songs.
- **Chinese-language UI:** All user-facing strings are in Chinese. Dark glassmorphism design with `backdrop-blur` and `bg-white/` opacity patterns.
- **JWT persistence:** Stored in localStorage, validated on mount via `GET /api/users/me`, auto-refresh on 401.

## Frontend ↔ Backend API Endpoints

| Frontend Action | Backend Endpoint | Notes |
|----------------|-----------------|-------|
| WeChat auth | `POST /api/auth/wechat` | Body: `{ code, nickname? }` → JWT + user |
| Get current user | `GET /api/users/me` | Requires JWT |
| Update profile | `PATCH /api/users/me` | Body: `{ nickname?, avatar? }` |
| Search songs | `GET /api/songs/search?q=keyword` | Backend proxies iTunes API, caches locally |
| Create playlist | `POST /api/playlists` | Requires JWT, max 9 songs |
| Get my playlists | `GET /api/playlists/me` | Requires JWT |
| Get friends' playlists | `GET /api/playlists/friends` | Requires JWT |
| Get share data | `GET /api/share/:id` | No auth required |
| Like a playlist | `POST /api/playlists/:id/like` | No auth required |
| Add friend | `POST /api/friends` | Requires JWT |
| Get friends list | `GET /api/friends` | Requires JWT |

## Deployment

Deployed on Vercel. Build: `npm run build` (includes CSS compat post-processing), then `vercel deploy dist --prod --yes`.
