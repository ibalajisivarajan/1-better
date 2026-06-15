# 1% Better

1% Better assigns you one micro-habit per week for 52 consecutive weeks (June 14 2026 to June 14 2027). You complete the habit once each day by pressing and holding a button for 1.5 seconds; completing all 7 days in a week wins the week. Server-driven push notifications at 4 configurable times per day keep you accountable — and automatically silence themselves once you have done today's habit.

---

## Tech stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **PWA:** vite-plugin-pwa, Workbox, Web Push API (VAPID)
- **Backend:** Supabase (Postgres + RLS, Auth, Deno Edge Functions)
- **Auth:** Google OAuth + magic-link (email OTP)
- **Push scheduling:** GitHub Actions cron (every 15 min) → Supabase Edge Function
- **Hosting:** Vercel
- **Fonts:** Fraunces (display) + DM Sans (body) via Google Fonts

---

## Quick start (local development)

```bash
# 1. Clone the repo
git clone https://github.com/ibalajisivarajan/1-better.git
cd 1-better

# 2. Copy the env template and fill in your values
cp .env.example .env
# Edit .env — set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_VAPID_PUBLIC_KEY

# 3. Install dependencies
npm install

# 4. Start the dev server
npm run dev
```

The app runs at `http://localhost:5173`. The service worker is active in development mode.

You need a Supabase project with the migration and seed applied before sign-in will work. See [docs/SETUP.md](docs/SETUP.md) for the full setup checklist.

---

## Project structure

```
src/
  components/   UI components (OrbBackground, HoldButton, WeekDots, ...)
  hooks/        Data hooks (useAuth, useProfile, useTodayMission, usePushSubscription)
  lib/          Supabase client
  pages/        Route-level components (LoginPage, ...)
  types/        Shared TypeScript interfaces
public/
  sw.js         Service worker (push handler + offline cache)
  icons/        PWA icons (192px, 512px)
supabase/
  migrations/   SQL migration (0001_init.sql)
  seed.sql      52-week mission curriculum seed
.github/
  workflows/    nudge-cron.yml — GitHub Actions push cron
docs/           Full documentation (see docs/README.md)
```

---

## Screens

| Route | Screen |
|-------|--------|
| `/login` | Sign in — Google OAuth or magic-link |
| `/today` | Today's mission + press-and-hold completion + 7-dot week tracker |
| `/journey` | 52-week dot grid + stats + won-habit history |
| `/settings` | Nudge times, on/off toggle, push subscription, sign out |

---

## Documentation

Full product and technical documentation lives in [docs/](docs/):

- [Product Requirements (PRD)](docs/PRD.md)
- [Functional Requirements](docs/FUNCTIONAL_REQUIREMENTS.md)
- [Non-Functional Requirements](docs/NON_FUNCTIONAL_REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Architecture Decision Records](docs/ADRS.md)
- [UX Specification](docs/UX_SPEC.md)
- [Full Setup Guide](docs/SETUP.md)
- [Test Plan](docs/TESTPLAN.md)

---

## Environment variables

Copy `.env.example` to `.env` for local dev. For production, set these in Vercel:

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Vercel env + `.env` | Supabase project REST URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel env + `.env` | Supabase public/anon JWT |
| `VITE_VAPID_PUBLIC_KEY` | Vercel env + `.env` | VAPID public key for push subscription |

Edge function secrets (set via `supabase secrets set`, never in frontend):

| Secret | Purpose |
|--------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin DB access in Edge Function |
| `VAPID_PRIVATE_KEY` | Signs Web Push requests |
| `VAPID_PUBLIC_KEY` | Paired with private key |
| `VAPID_SUBJECT` | Contact URI for VAPID (`mailto:...`) |
| `CRON_SECRET` | Authenticates GitHub Actions → Edge Function calls |

GitHub Actions secrets (repo → Settings → Secrets → Actions):

| Secret | Purpose |
|--------|---------|
| `SEND_NUDGES_URL` | Full edge function URL |
| `CRON_SECRET` | Same value as the Edge Function secret |

---

## Screenshots

Screenshots will be added once the full UI is implemented.

---

## License

Private — personal productivity app for Bala.
