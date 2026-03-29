# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**死亡歌单 (Death Playlist)** is a Chinese-language React SPA for creating and sharing funeral music playlists. Users authorize via WeChat, select up to 9 songs, customize a shareable card with QR code, and browse friends' playlists. Originally built with Google AI Studio.

This is the **frontend** repo. The backend lives in a sibling directory `../deathplaylist_backends` (repo: `Death-Playlist-backends`).

## Commands

```bash
npm run dev       # Start dev server on port 3000 (vite --port=3000 --host=0.0.0.0)
npm run build     # Production build (vite build, outputs to dist/)
npm run preview   # Preview production build locally
npm run clean     # Remove dist/ directory
npm run lint      # Type-check only (tsc --noEmit)
```

There are no tests configured in this project.

## Architecture

Single-page React 19 app with no routing library. View navigation is managed via a `view` state machine (`'landing' | 'selection' | 'preview' | 'share' | 'friends'`).

**Tech stack:** Vite 6, React 19, Tailwind CSS 4 (via `@tailwindcss/vite` plugin), Framer Motion (`motion` package), Lucide React icons.

**Source structure:** Everything lives in `src/`:
- `App.tsx` - The entire application (all views, state, UI) in a single ~710-line component
- `main.tsx` - React entry point, renders `<App />` into `#root`
- `index.css` - Single line: `@import "tailwindcss"`

**Key state:**
- Song selection (max 9 songs), mock user/friend data, editable playlist intro (15-char limit), background image URL, toast notifications
- **Player state:** `playingSong` (currently playing Song or null), `playProgress` (0-100, simulated progress incrementing by 2 every 200ms)
- **Auth state:** `showAuthPopup` (auto-triggers after 800ms if user not logged in)

**API key handling:** `GEMINI_API_KEY` is loaded from `.env.local` via Vite's `loadEnv` and injected at build time as `process.env.GEMINI_API_KEY`. The `@google/genai` dependency is declared but not yet used in the current UI code.

## Important Patterns

- **Path alias:** `@/*` maps to the project root (configured in both `tsconfig.json` paths and `vite.config.ts` resolve alias).
- **Tailwind CSS 4:** Uses the Vite plugin approach (`@tailwindcss/vite`), not PostCSS. No `tailwind.config` file exists. Tailwind is imported via `@import "tailwindcss"` in CSS.
- **Motion library:** Imported as `motion/react` (not `framer-motion`), using `AnimatePresence` for view transitions and `Reorder.Group` for drag-to-reorder songs.
- **HMR control:** Vite HMR is toggled via `DISABLE_HMR` env var for AI Studio compatibility.
- **Auth flow:** A standalone popup modal auto-appears 800ms after app load if user is not logged in (`showAuthPopup` state). User can "允许" (mock authorize) or "拒绝" (dismiss). Landing page always shows "新的歌单" button regardless of auth state.
- **Music player:** Play/Pause buttons appear next to each song in both search results and added-songs list. When a song is playing, a bottom mini player bar slides up with album art, song info, pause button, and an animated progress bar (simulated, not real audio playback).
- **Data status:** All data is currently mocked in frontend state. Backend API is available at `http://localhost:3001/api` but not yet wired into the frontend. Music playback is visual-only (no real audio).
- **Chinese-language UI:** All user-facing strings are in Chinese. The app uses a dark glassmorphism design with `backdrop-blur` and `bg-white/` opacity patterns throughout.

## Frontend ↔ Backend Integration Points

When connecting the frontend to the backend, these are the key API endpoints:

| Frontend Action | Backend Endpoint | Notes |
|----------------|-----------------|-------|
| WeChat auth popup | `POST /api/auth/wechat` | Returns JWT + user info |
| Get current user | `GET /api/users/me` | Requires JWT |
| Search songs | `GET /api/songs/search?q=keyword` | No auth required |
| Create playlist | `POST /api/playlists` | Requires JWT, max 9 songs |
| Get my playlists | `GET /api/playlists/me` | Requires JWT |
| Get friends' playlists | `GET /api/playlists/friends` | Requires JWT |
| Get share data | `GET /api/share/:id` | No auth required |
| Like a playlist | `POST /api/playlists/:id/like` | No auth required |
| Add friend | `POST /api/friends` | Requires JWT |
| Get friends list | `GET /api/friends` | Requires JWT |
