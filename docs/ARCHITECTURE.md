# Architecture — 1% Better

Version: 0.1.0  
Last updated: 2026-06-15

---

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                   User's Browser                     │
│  ┌─────────────────┐   ┌──────────────────────────┐ │
│  │  React PWA      │   │  Service Worker (sw.js)  │ │
│  │  (Vite build)   │   │  - Push handler          │ │
│  │  - /today       │   │  - Offline cache         │ │
│  │  - /journey     │◄──►  - Notification click    │ │
│  │  - /settings    │   └──────────────────────────┘ │
│  └────────┬────────┘                                 │
└───────────┼──────────────────────────────────────────┘
            │ Supabase JS client (anon key + JWT)
            ▼
┌─────────────────────────────────────────────────────┐
│                  Supabase                            │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────┐ │
│  │  PostgreSQL  │  │    Auth    │  │  Edge Func  │ │
│  │  + RLS       │  │  Google/  │  │  send-nudges│ │
│  │  profiles    │  │  magic-   │  │  (Deno)     │ │
│  │  daily_log   │  │  link     │  └──────┬──────┘ │
│  │  push_subs   │  └────────────┘         │        │
│  │  missions    │                          │ VAPID  │
│  └──────────────┘                          │ sign   │
└───────────────────────────────────────────┼────────┘
                                             │
                               ┌─────────────▼──────┐
                               │  Push Services      │
                               │  (FCM / APNs / etc) │
                               └─────────────┬──────┘
                                             │
                               ┌─────────────▼──────┐
                               │  GitHub Actions     │
                               │  (cron */15 min)   │
                               │  → POST /send-nudges│
                               └────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | React | 18.3 |
| Language | TypeScript | 5.5 |
| Build tool | Vite | 5.4 |
| Styling | Tailwind CSS | 3.4 |
| PWA | vite-plugin-pwa + Workbox | 0.20 |
| Routing | React Router | 6.26 |
| Backend / DB | Supabase (Postgres 15) | hosted |
| Auth | Supabase Auth (Google OAuth + magic-link) | — |
| Edge functions | Deno (Supabase Edge Functions) | — |
| Push | Web Push API + VAPID | — |
| Scheduler | GitHub Actions cron | — |
| Hosting | Vercel | — |
| Fonts | Google Fonts (Fraunces, DM Sans) | — |

---

## Frontend Architecture

### File structure

```
src/
  components/
    CelebrateDayOverlay.tsx   # Full-screen day completion celebration
    CelebrateWeekOverlay.tsx  # Full-screen week win celebration with particles
    GlassCard.tsx             # Glassmorphic container card
    HoldButton.tsx            # Press-and-hold completion button
    NotConnectedBanner.tsx    # Banner shown when Supabase is not configured
    NudgeBubble.tsx           # Push-style tooltip bubble
    OrbBackground.tsx         # Breathing gradient orb background
    WeekDots.tsx              # 7-dot week progress row
  hooks/
    useAuth.ts                # Supabase session listener
    useProfile.ts             # Fetch/create user profile row
    usePushSubscription.ts    # Subscribe/unsubscribe Web Push
    useTodayMission.ts        # Current week mission + today's completion state
  lib/
    supabase.ts               # Supabase client singleton + isConfigured guard
  pages/
    LoginPage.tsx             # /login — Google + magic-link auth
    (TodayPage.tsx)           # /today — daily mission + hold button
    (JourneyPage.tsx)         # /journey — 52-week grid + history
    (SettingsPage.tsx)        # /settings — nudge times, toggle, sign out
  types/
    index.ts                  # Shared TypeScript interfaces
public/
  sw.js                       # Service worker: push handler + offline cache
  icons/
    icon-192.png
    icon-512.png
supabase/
  migrations/
    0001_init.sql             # Schema, RLS, trigger
  seed.sql                    # 52 placeholder missions
  config.toml                 # Supabase CLI config
.github/workflows/
  nudge-cron.yml              # Cron every 15 min → send-nudges
```

### Routing

| Path | Component | Guard |
|------|-----------|-------|
| `/` | Redirect | — (redirect to /login or /today) |
| `/login` | LoginPage | Public (redirect to /today if session exists) |
| `/today` | TodayPage | Auth required |
| `/journey` | JourneyPage | Auth required |
| `/settings` | SettingsPage | Auth required |

Auth guard is implemented in the root `App.tsx` component using `useAuth` hook. Unauthenticated users reaching protected routes are redirected to `/login`.

---

## Data Flows

### Completion flow

```
1. User holds HoldButton for 1.5s
       │
       ▼
2. HoldButton.onComplete() fires
       │
       ▼
3. TodayPage inserts row into daily_log via Supabase JS client
   { user_id, done_date: today (local tz), week_number, mission_area, mission_action }
       │
       ▼
4. On success: update local state → todayDone = true
       │
       ▼
5. Check if all 7 weekDots are now true
   ├── No  → show CelebrateDayOverlay (auto-dismiss 2.5s)
   └── Yes → show CelebrateWeekOverlay (auto-dismiss 4s)
       │
       ▼
6. HoldButton re-renders as disabled (today cannot be re-marked)
       │
       ▼
7. Push nudges for this user are automatically skipped by the edge function
   for the remainder of the day (daily_log row now exists)
```

### Nudge flow

```
1. GitHub Actions cron fires every 15 minutes (e.g. 08:00, 08:15, 08:30...)
       │
       ▼
2. POST https://<project>.supabase.co/functions/v1/send-nudges
   Headers: { x-cron-secret: <CRON_SECRET> }
       │
       ▼
3. Edge function validates x-cron-secret (401 on mismatch)
       │
       ▼
4. Query: SELECT profiles JOIN push_subscriptions WHERE nudges_enabled = true
       │
       ▼
5. For each subscription:
   a. Convert nudge_times to UTC, check if current time matches ±7 min
   b. If no match → skip
   c. If match → check daily_log for today's date in user's timezone
      ├── Row exists (done today) → skip
      └── No row → send Web Push via VAPID-signed request to subscription.endpoint
       │
       ▼
6. Push service (FCM / APNs) delivers to device
       │
       ▼
7. Service worker push event handler fires
       │
       ▼
8. sw.js calls self.registration.showNotification("1% Better", { body: "..." })
       │
       ▼
9. User taps notification → notificationclick handler opens /today
```

### Auth flow

```
1. User opens /login
       │
       ▼
2a. Google OAuth path:
    User clicks "Continue with Google"
    → supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: origin+'/today' })
    → Browser redirects to accounts.google.com
    → User approves
    → Google redirects to Supabase callback URL
    → Supabase creates/updates auth.users row
    → Supabase trigger on_auth_user_created fires → inserts profiles row (on conflict do nothing)
    → Supabase redirects to origin+'/today' with session in URL hash
    → React app reads session from URL hash, stores in localStorage
    → useAuth hook receives SIGNED_IN event
    → App renders TodayPage

2b. Magic-link path:
    User enters email → clicks "Send magic link"
    → supabase.auth.signInWithOtp({ email, emailRedirectTo: origin+'/today' })
    → Supabase sends email with one-time link
    → User clicks link in email
    → Supabase validates OTP → creates/updates auth.users row
    → Trigger fires → profiles row created
    → Redirects to origin+'/today' with session
    → Same as step 3 above
```

### Offline flow

```
1. User opens app without network connection
       │
       ▼
2. Browser fetches / → sw.js intercepts
       │
       ▼
3. sw.js checks Workbox precache for cached response
       │
       ├── Cache hit → returns cached index.html, JS/CSS bundles, fonts
       │   App renders with stale data from React state (or empty state)
       │
       └── Cache miss → falls back to network (will fail → browser error page)
       │
       ▼
4. Supabase JS client attempts to fetch profile + mission + daily_log
       │
       ├── Requests fail (no network) → hooks return loading=false, data=null
       │   App renders in degraded state with offline indicator
       │
       └── IndexedDB / localStorage holds last Supabase session token
           (ensures user is not logged out on reconnect)
       │
       ▼
5. On network restore: page reload triggers fresh data fetch
   (or app detects online event and refetches automatically)
```

---

## Database Schema

```sql
-- User profile (one row per auth user)
profiles (
  user_id        uuid PK → auth.users(id)
  start_date     date     DEFAULT '2026-06-14'
  timezone       text     DEFAULT 'America/Vancouver'
  nudge_times    text[]   DEFAULT ['08:00','13:00','18:00','21:00']
  nudges_enabled boolean  DEFAULT true
  created_at     timestamptz
)

-- Daily completion log (one row per user per calendar date)
daily_log (
  id             uuid PK
  user_id        uuid → auth.users(id)
  done_date      date
  week_number    int
  mission_area   text
  mission_action text
  done_at        timestamptz
  UNIQUE (user_id, done_date)
)

-- Web Push subscriptions (one per user+endpoint pair)
push_subscriptions (
  id         uuid PK
  user_id    uuid → auth.users(id)
  endpoint   text
  p256dh     text
  auth_key   text
  created_at timestamptz
  UNIQUE (user_id, endpoint)
)

-- 52-week mission curriculum (seeded, admin-managed)
missions (
  week_number int PK
  area        text   -- Body | Mind | Work | People | Inner
  action      text
  why         text
  micro       text
)
```

All tables have RLS enabled. See `supabase/migrations/0001_init.sql` for full policy definitions.

---

## Environment Variables

### Frontend (Vite public vars — committed to .env.example, never commit real values)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project REST endpoint |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public JWT |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key for push subscription |

### Supabase Edge Function secrets (set via `supabase secrets set`)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role JWT for admin DB access in Edge Function |
| `VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key (never in frontend) |
| `VAPID_SUBJECT` | VAPID contact URI (mailto:...) |
| `CRON_SECRET` | Shared secret to authenticate cron caller |

### GitHub Actions secrets

| Variable | Purpose |
|----------|---------|
| `SEND_NUDGES_URL` | Full URL to the send-nudges edge function |
| `CRON_SECRET` | Same value as Edge Function CRON_SECRET |

---

## Deployment

**Frontend:** Vercel. Import the GitHub repo. Framework preset: Vite. Add the three `VITE_*` environment variables in the Vercel dashboard. Every push to `main` triggers a new deploy.

**Edge Function:** Supabase CLI. Run `supabase functions deploy send-nudges` from the repo root. Secrets must be set separately via `supabase secrets set`.

**Cron:** GitHub Actions. The workflow file `.github/workflows/nudge-cron.yml` is committed to the repo. Enable it in the repo's Actions tab. It requires `SEND_NUDGES_URL` and `CRON_SECRET` as repository secrets.
