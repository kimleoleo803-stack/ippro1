# NADIBOX — Product Requirements Document

## Original Problem Statement (paraphrased across sessions)
1. Import my existing NADIBOX project (Vite + React + TS + FastAPI + MongoDB) and add a splash screen with sound.
2. Before the home page, show a chooser page: **Guest** (left) goes to current home, **Login** (right) goes to a username/password sign-in.
3. Admin is `admin / admin123`. Admin creates real subscriber accounts (username + password + expiry in days).
4. Logged-in (paid) users see the home page with Xtream already connected. Hide the Add-Server / editing features. Show how many days remain. When subscription expires, block everything and show a WhatsApp contact button.
5. Admin panel to control user expiry dates, Xtream (shared or per-user), and WhatsApp number. WhatsApp should be editable with an example value.
6. Stack: FastAPI + MongoDB + JWT auth are OK.

## Architecture
- Frontend: Vite + React 18 + TypeScript + TailwindCSS + shadcn/ui + framer-motion
- Backend: FastAPI + Motor (AsyncIOMotorClient), MongoDB, JWT (PyJWT) + bcrypt
- Auth flow: username + password, Bearer JWT in `localStorage` (key `nadi_auth_token`)
- Routing: React Router (`/welcome`, `/login`, `/admin`, `/`, `/live-tv`, `/movies`, `/series`, `/connect`, ...)

## What's been implemented

### Session 1 (2026-04-19) — Splash screen
- Imported the uploaded NADIBOX project into `/app/frontend` and `/app/backend`
- Fixed build blockers (renamed `postcss.config (1).js`, added `VITE_SUPABASE_*` env, clean-installed vite)
- Created `frontend/src/components/SplashScreen.tsx` — cinematic 3s gold/nebula splash (logo + animated wordmark + expanding rings + orbiting particles + shimmer loader)
- Auto-plays `Arrival_Queued.mp3` on first load; silent fallback if autoplay blocked
- Gated via `sessionStorage.nadibox_splash_shown` — once per browser session

### Session 2 (2026-04-19) — Welcome / Login / Admin / Subscription system
**Backend**
- `core/auth.py` — JWT helpers (HS256, 24h access tokens) + bcrypt hashing + `get_current_user` + `require_admin`
- `routes/auth.py` — `POST /api/auth/login`, `GET /api/auth/me` with computed `days_remaining` / `is_expired`
- `routes/admin_users.py` — admin-only CRUD:
  - `GET/POST /api/admin/users` (list, create)
  - `PUT/DELETE /api/admin/users/{id}` (extend_days / set_expiry_at / password / xtream fields / note)
  - `GET/PUT /api/admin/settings` (whatsapp_number + shared_xtream_*)
- `routes/subscription.py` — `GET /api/subscription/status` resolves xtream creds (own vs shared) and blanks them when expired
- `server.py` — wires all routers; on startup seeds admin user idempotently + creates unique index on `users.username`
- `.env` — `JWT_SECRET`, `ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=admin123`

**Frontend**
- `lib/nadiAuth.ts` — typed API client (login/me/subscription/admin users/admin settings)
- `hooks/useAuth.tsx` — AuthProvider + `useAuth()` with `user`, `isGuest`, `login`, `logout`, `continueAsGuest`, `refresh`
- `pages/Welcome.tsx` — glass-card chooser: **GUEST** (left) vs **LOGIN** (right), both with icons
- `pages/Login.tsx` — subscriber sign-in (username + password); on submit, admin → `/admin`, user → `/`
- `pages/Admin.tsx` — full admin dashboard:
  - Global Settings card (WhatsApp number + shared Xtream server/user/pass)
  - Create Subscriber form (username, password, days, mode, per-user xtream fields when "own")
  - Subscribers list with +30d / +7d / -7d / Delete and an "Advanced" panel (change password, edit xtream)
- `pages/ConnectProfile.tsx` — renamed original Xtream-connect page (now at `/connect`, kept for deep-links)
- `components/ExpiredOverlay.tsx` — full-screen block with WhatsApp CTA (`https://wa.me/...`) and Sign Out
- `pages/Index.tsx` — home now:
  - For paid users: shows subscription strip (username, expiry date, "N days remaining" badge), hides Add-Server/Settings, shows Logout
  - If `is_expired` → shows `ExpiredOverlay` covering everything
  - For guests: unchanged Add-Server + profile flow
- `App.tsx` — wraps router in `<AuthProvider>`, adds `RequireEntry` (guest or user) and `RequireAdmin` guards, routes admins to `/admin` automatically

## Verified end-to-end (Playwright)
- Welcome shows Guest + Login cards
- Admin login (`admin`/`admin123`) → lands on `/admin`; can create subscribers
- Subscriber login → lands on `/`; subscription strip shows "30 days remaining"; Add-Server button is hidden
- Admin setting `set_expiry_at` to past date → next subscriber load shows `SUBSCRIPTION EXPIRED` overlay with working WhatsApp link (`https://wa.me/1234567890?text=...`)

## Backlog / P1-P2
- Wire a real Xtream server/playback pipeline using resolved creds from `/api/subscription/status`
- Admin UX: sortable user list, search, export CSV
- Email notifications when subscription is about to expire (7d, 3d, 1d)
- Proper logout endpoint (currently stateless — token still technically valid until JWT exp)
- Swap TV icon for real NADIBOX logo asset when user provides one

## Session 3 (2026-04-19) — Guest "Advanced" toggle + Responsive + i18n (7 languages)

**Backend**
- New `routes/public.py` → `GET /api/public/shared-xtream` (unauthenticated) returns the admin-configured shared Xtream credentials so the Guest "Add Playlist" dialog can offer a one-click "Use shared server" option. Marked `configured: true/false` flag.

**Frontend — Shared/Own toggle for Guests**
- Reworked `components/AddServerDialog.tsx`:
  - New "ADVANCED" radio group inside the Xtream tab: **Shared** (default) | **Own server**.
  - Shared: auto-fetches `/api/public/shared-xtream`, fills serverUrl/username/password, renders a read-only summary card "Auto-filled from Global Settings". Connect button disabled if admin hasn't configured the shared creds yet.
  - Own server: three manual inputs just like before.
  - Responsive — bottom sheet on mobile (`rounded-t-3xl sm:rounded-3xl items-end sm:items-center`), 90vh max height with scroll.

**Frontend — Responsive across all device classes**
- All pages updated with mobile-first breakpoints (`sm:` / `md:` / `lg:`): padding, font sizes, icon sizes, card widths, header layouts. CategoryCard now uses aspect ratios + flex-wrap instead of fixed pixel sizes so it scales from 390px mobile → 1920px TV.
- Added `rtl:rotate-180` on the back arrow in Login and replaced `left`/`right` / `ml`/`mr` utilities with logical `start`/`end` / `ms`/`me` so layouts mirror correctly in RTL.
- `min-w-0` on all flex `input` rows to fix mobile overflow bugs.

**Frontend — i18n (7 languages) with react-i18next**
- Added `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
- New `src/i18n.ts` with full translation resources for: **English 🇬🇧, Arabic 🇸🇦 (RTL), French 🇫🇷, Spanish 🇪🇸, Russian 🇷🇺, Korean 🇰🇷, Filipino 🇵🇭**.
- Covered surfaces: Welcome, Login, Splash (tagline + premium tag), Index (header / subscription strip / category cards / info bar / footer), ExpiredOverlay (including WhatsApp prefill message).
- Language persistence via `localStorage.nadibox_lang`; `i18n.on("languageChanged")` updates `<html dir>` and `<html lang>` so Arabic flips the layout automatically.
- Reusable `components/LanguageSelect.tsx` — glass pill button (🇬🇧 English ▾), dropdown with flag + localized language name + check mark on the active one. Mounted on Welcome (top-right), Login (top-end), and Home header.

**Verified end-to-end (Playwright)**
- Welcome desktop EN, Welcome desktop AR (dir=rtl, text mirrored), Welcome mobile 390px, Home guest mobile, Add-server mobile — both Shared (auto-filled from admin's real creds) and Own (manual) variants, Home guest TV 1920×1080.

