# NADIBOX — Product Requirements Document

## Original Problem Statement
> "repo it clone this my project already make add just splash screen on it with sound"

User uploaded their existing NADIBOX IPTV project (WEB.zip) and the `Arrival_Queued.mp3` splash sound, and asked to add a splash screen with sound.

## User Preferences (captured)
- Splash duration: **3 seconds**
- Visual style: **Logo + app name with animation** (creative design)
- Sound behavior: **Auto-play on first load only** (persisted via `sessionStorage`)
- Sound file: `Arrival_Queued.mp3`

## Architecture
- Frontend: Vite + React 18 + TypeScript + TailwindCSS + shadcn/ui + framer-motion (existing project)
- Backend: FastAPI + MongoDB (existing project)
- Supabase integration kept as-is (IPTV data source)

## What's been implemented (2026-04-19)
- Imported the uploaded NADIBOX project into `/app/frontend` and `/app/backend`
- Fixed blocking issues that prevented the project from building in this env:
  - Renamed `postcss.config (1).js` → `postcss.config.js` (Tailwind wasn't being applied)
  - Added `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` to `frontend/.env` (app was throwing "supabaseUrl is required")
  - Clean-installed `node_modules` to restore missing `vite` binary
- New file: `frontend/src/components/SplashScreen.tsx` — cinematic splash with:
  - Gold-glowing TV logo badge (spring-scale entrance)
  - Animated NADIBOX wordmark (Cinzel, letter-spacing tween, gold gradient text)
  - "Tune In to the Universe" tagline + shimmer loader
  - Three concentric gold rings expanding infinitely + 6 orbiting gold particles (rotate 360°)
  - Nebula background + grain overlay + radial dark gradient
  - Auto-play of `/audio/Arrival_Queued.mp3` on mount (silent fallback if browser blocks autoplay)
  - 3s duration → 0.8s fade-out via framer-motion `AnimatePresence`
- Hooked into `frontend/src/App.tsx` with `sessionStorage` gate (`nadibox_splash_shown`)
  so the splash only appears on the first load per browser session.
- Copied `Arrival_Queued.mp3` to `/app/frontend/public/audio/`.

## Verified
- First visit → splash screen renders with wordmark (captured via Playwright)
- `sessionStorage.nadibox_splash_shown` set to `"1"` after splash completes
- Second visit in same session → splash correctly skipped, app shows Index page immediately
- Visual QA: beautiful gold-on-nebula splash, matches NADIBOX gold/teal aesthetic

## Backlog / P1-P2
- Wire real data sources (profiles, Live TV playback flows already present in code)
- Decide whether to keep Supabase or migrate IPTV calls to the FastAPI backend
- Add user-choice to disable splash sound (preference in Account page)
