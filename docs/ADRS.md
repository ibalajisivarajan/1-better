# Architecture Decision Records — 1% Better

This document records the significant architectural decisions made during the design and implementation of 1% Better.

---

## ADR-001: PWA over native Capacitor

**Date:** 2026-06-14  
**Status:** Accepted

### Context

The app needs to run on mobile (primarily iPhone), support push notifications, work offline, and be installable to the home screen. Three paths were considered:

- **PWA** (Web Push API + service worker)
- **Capacitor** (web code wrapped in a native shell, distributed via App Store)
- **React Native** (fully native)

### Decision

Build a PWA with the Web Push API and a Vite-generated service worker.

### Rationale

- Zero app store friction: no review, no developer account ($99/yr), instant deploys.
- Vercel hosting handles HTTPS and CDN — PWA criteria are met automatically.
- iOS 16.4+ supports Web Push for installed PWAs, which closes the main historical gap.
- Capacitor would require a separate Xcode build pipeline for iOS push (APNs certificates, provisioning profiles) plus App Store submission for any update.
- React Native is disproportionate complexity for a single-user personal app.
- The Supabase + Vite + React stack is already web-native.

### Tradeoffs

- iOS: Web Push only works when the PWA is added to the Home Screen. A Safari browser tab on iPhone does not receive push. The app must prominently communicate this (NFR-07).
- Push delivery is best-effort (NFR-06). There is no delivery receipt.
- Installability prompt behaviour differs between iOS (manual Share menu) and Android Chrome (automatic banner).

---

## ADR-002: Supabase over Firebase or a custom backend

**Date:** 2026-06-14  
**Status:** Accepted

### Context

The app needs: authentication, a relational database with per-user data isolation, serverless functions for push dispatch, and enough query flexibility for the 52-week data model.

Alternatives considered:
- **Firebase** (Firestore + Firebase Auth + Cloud Functions)
- **PlanetScale + Auth.js + Vercel Functions** (custom backend)
- **Supabase**

### Decision

Use Supabase for all backend concerns: Postgres, Auth, Edge Functions.

### Rationale

- **Postgres + RLS** is the cleanest, most auditable multi-tenant security model. Firestore security rules are harder to reason about for relational data.
- Supabase's `supabase-js` client is ergonomic and handles JWT refresh automatically.
- Deno Edge Functions have access to the database via the service role key and can run arbitrary TypeScript/Deno code for push dispatch.
- Supabase is open source and can be self-hosted if needed in future.
- The free tier (500MB DB, 500k Edge Function invocations/mo) is more than sufficient for this workload.
- SQL migrations in `supabase/migrations/` are version-controlled, reproducible, and reviewable.

### Tradeoffs

- Vendor lock-in at the infrastructure level. Migrating away would require re-implementing auth, RLS policies, and edge functions.
- Edge Function cold starts add approximately 200ms latency on the first invocation after idle. For a cron-triggered push function, this is acceptable.
- Supabase's hosted Postgres is shared infrastructure; there are no SLA guarantees on the free tier.

---

## ADR-003: Google OAuth as primary auth with magic-link fallback

**Date:** 2026-06-14  
**Status:** Accepted

### Context

The app needs a sign-in method. Bala primarily uses Google. Some future users may not have or want to use Google. Passwords add friction and risk (forgotten passwords, reset flows).

### Decision

Google OAuth as the primary sign-in method; Supabase magic-link (email OTP) as fallback.

### Rationale

- Google OAuth via Supabase is one-tap on Android and fast on iOS. It is the lowest-friction sign-in for users with a Google account.
- Magic-link requires no password to remember. The user receives an email with a one-click link. The link is single-use and expires.
- Both methods are implemented in Supabase Auth with minimal code (`signInWithOAuth` and `signInWithOtp`).
- Both methods redirect to `/today` on success, creating a unified post-auth path.

### Tradeoffs

- Google OAuth requires registering an OAuth 2.0 client in Google Cloud Console and configuring redirect URIs for both Supabase and Vercel. This is a one-time setup step.
- Magic-link depends on Supabase's email delivery (uses their SendGrid integration by default). For reliability in production, a custom SMTP provider (e.g. Resend) should be configured.
- If the user signs in with Google on one device and magic-link on another using the same email, Supabase may create two separate accounts. Users should use one consistent method per email address.

---

## ADR-004: Server-driven push via GitHub Actions cron + Supabase Edge Function

**Date:** 2026-06-14  
**Status:** Accepted

### Context

Push notifications must fire at 4 fixed local times per day, even when the app is closed. The delivery logic must be timezone-aware and must suppress nudges when the user has already completed today's habit. Options considered:

- **pg_cron** inside Supabase (scheduled SQL jobs)
- **Supabase cron** (native scheduled edge function invocations, in beta)
- **GitHub Actions cron** → Edge Function
- **External cron service** (cron-job.org, etc.)

### Decision

GitHub Actions cron workflow running every 15 minutes, POSTing to a Supabase Edge Function with a shared secret.

### Rationale

- No always-on server required. GitHub Actions free tier provides 2000 minutes/month; this cron uses roughly 1440 minutes/month (15 min × 96 runs/day × 30 days / 3 minutes per run ≈ 1440).
- The edge function has full access to Postgres (via service role key) for subscription lookup and today's log check.
- The setup is transparent: the `.github/workflows/nudge-cron.yml` file is version-controlled and auditable.
- A 15-minute cron gives ±7 minute delivery accuracy, which is sufficient for personal nudges.
- The edge function is independently testable via `curl`.

### Tradeoffs

- 15-minute granularity means nudges may arrive up to 7 minutes before or after the target time. Not a concern for motivational nudges.
- GitHub Actions has a known limitation: scheduled workflows may be delayed by GitHub's infrastructure load, especially during peak hours. In practice, delays are under 1–2 minutes.
- The `CRON_SECRET` shared secret is the only authentication between GitHub Actions and the edge function. It must be rotated if compromised.

---

## ADR-005: Press-and-hold for daily completion

**Date:** 2026-06-14  
**Status:** Accepted

### Context

The completion action — marking today's habit as done — needs to be deliberate. A simple tap is too easy to trigger accidentally. The action should feel like a small ritual, not a checkbox.

### Decision

A 1.5-second press-and-hold button with a bottom-to-top fill animation. Releasing before 1.5 seconds cancels the action.

### Rationale

- Accidental completion is prevented. If the user's phone bumps against something, it will not mark the habit done.
- The physical act of holding for 1.5 seconds creates a brief moment of intentionality — a micro-ritual that anchors the habit.
- The fill animation provides continuous progress feedback, making the interaction feel responsive and satisfying.
- The implementation uses Pointer Events (`onPointerDown`, `onPointerUp`, `onPointerLeave`, `onPointerCancel`) which work on both touch screens and mouse. `touch-action: none` prevents scroll interference during the hold.
- `requestAnimationFrame` drives the fill animation, ensuring smooth 60fps updates.

### Tradeoffs

- Slightly more friction than a tap, which may feel annoying if the user is in a hurry. The 1.5s duration was chosen as the minimum that feels deliberate without being tedious.
- Users with motor disabilities may find a sustained press difficult. A future accessibility option could reduce the hold duration or offer a tap alternative.

---

## ADR-006: Fraunces + DM Sans typography

**Date:** 2026-06-14  
**Status:** Accepted

### Context

The app's visual identity should convey warmth, craft, and intentionality. Generic system sans-serif fonts would make it feel like a productivity spreadsheet. Purely serif text at body sizes can reduce legibility.

### Decision

**Fraunces** (variable optical-size serif) for display and heading text. **DM Sans** for body, labels, and captions.

### Rationale

- Fraunces is a "wonky" optical-size variable font designed to express depth and personality at large display sizes, while remaining legible at smaller heading sizes. It conveys craftsmanship — matching the app's ethos.
- DM Sans is clean, modern, and highly legible in small sizes. It is neutral enough not to compete with Fraunces.
- The pairing creates clear typographic hierarchy: Fraunces commands attention on mission text and celebration headlines; DM Sans handles the functional copy.
- Both fonts are available on Google Fonts and are preloaded via `<link rel="preconnect">`.

### Tradeoffs

- Two Google Fonts requests add approximately 40KB of font data on first load. This is mitigated by:
  - `rel="preconnect"` hints reducing connection latency
  - Service worker caching `.woff2` files after first load
  - Google Fonts' own CDN and long cache TTLs
- The variable font axes for Fraunces (optical size, weight) increase the file size slightly compared to a static font file, but the expressiveness trade-off is worth it.

---

## ADR-007: Scaffold 52 missions at launch, content refined later

**Date:** 2026-06-14  
**Status:** Accepted

### Context

The app requires 52 weeks of mission content (area, action, why, micro). Writing high-quality content for all 52 weeks before launch would significantly delay development. The content schema is stable.

### Decision

Seed the database with 52 placeholder missions rotating across the 5 areas (Body, Mind, Work, People, Inner). Bala can update the content directly in Supabase Studio without redeploying the app.

### Rationale

- Unblocks all development and end-to-end testing. The data model, UI, and push system can be fully built and tested with placeholder content.
- The `missions` table is separate from application code. Content updates require only a SQL UPDATE in Supabase Studio — no code change, no Vercel deploy.
- The schema is locked: `week_number`, `area`, `action`, `why`, `micro`. Content quality can improve without schema changes.
- For a personal app, the author (Bala) is also the content creator. There is no external dependency.

### Tradeoffs

- Placeholder content ships in the initial version. If the app is shared before content is refined, the placeholder text is visible.
- Editing 52 rows in Supabase Studio is manual. A future admin UI could be added, but is not needed now.
