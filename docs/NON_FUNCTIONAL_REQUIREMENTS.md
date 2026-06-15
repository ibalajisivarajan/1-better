# Non-Functional Requirements — 1% Better

Version: 0.1.0  
Last updated: 2026-06-15

---

**NFR-01 — Performance**  
The app must achieve a Lighthouse PWA score of 90 or above. First Contentful Paint must be under 2 seconds on a simulated 4G connection (Lighthouse throttling profile). Bundle size must be minimized through Vite's tree-shaking and code-splitting. Google Fonts must be loaded with `rel="preconnect"` hints to reduce DNS + TLS overhead.

---

**NFR-02 — Offline capability**  
The service worker (configured via `vite-plugin-pwa` + Workbox) must cache the complete app shell on first install: all JS/CSS chunks, the root HTML, font files (`*.woff2`), and PWA icons. On subsequent loads without a network connection, the app must render the Today and Journey screens using cached data. The user must see the last-known mission and their current completion state. If a network write fails (e.g., marking today done), the app must inform the user with a non-blocking error message and must not silently lose the action.

---

**NFR-03 — Privacy and Row-Level Security**  
Every table in the database must have `ROW LEVEL SECURITY` enabled:

| Table               | RLS policies                                    |
|---------------------|-------------------------------------------------|
| `profiles`          | `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE |
| `daily_log`         | `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE |
| `push_subscriptions`| `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE |
| `missions`          | `auth.uid() IS NOT NULL` for SELECT only (read-only for all authenticated users; no user writes) |

No user may read or modify another user's rows through the API. The frontend uses only the Supabase anon key, which has no elevated privileges. The service role key is restricted to the Edge Function runtime and must never appear in frontend code or version control.

---

**NFR-04 — Accessibility**  
- All interactive elements must have a visible `:focus-visible` ring (2px ink ring with offset).
- Body text color contrast ratio must be at least 4.5:1 against the background. Ink `#2A251D` on base `#F2ECE0` achieves approximately 10.6:1.
- The press-and-hold button (`HoldButton`) must carry `aria-label="Hold to complete today's habit"` and `role="button"`.
- The `WeekDots` component must use `role="list"` with each dot as `role="listitem"` and a descriptive `aria-label` (e.g. "Mon: done", "Tue: today", "Wed: upcoming").
- Celebration overlays must use `role="dialog"` and `aria-modal="true"` with a descriptive `aria-label`.
- Form inputs on the login and settings screens must have associated labels or `aria-label` attributes.
- The app must be navigable by keyboard alone for all core flows (sign-in, today completion, settings).

---

**NFR-05 — PWA installability**  
The app must meet the following criteria for "Add to Home Screen" on both Chrome (Android) and Safari (iOS 16.4+):

- Web App Manifest served at `/manifest.webmanifest` (linked in `<head>`)
- `display: "standalone"` in manifest
- `theme_color: "#F2ECE0"` and `background_color: "#F2ECE0"` in manifest
- Icons at exactly 192x192 and 512x512 px in PNG format, marked `"purpose": "any maskable"`
- `start_url: "/"` with `scope: "/"`
- A registered service worker with a `fetch` event handler
- Served over HTTPS (Vercel enforces this by default)

The `vite-plugin-pwa` plugin generates the manifest automatically from `vite.config.ts`. Icon files must be present at `/public/icons/icon-192.png` and `/public/icons/icon-512.png`.

---

**NFR-06 — Push notification reliability**  
Web Push is a best-effort delivery channel. The following limitations apply and must be communicated to the user in-app where relevant:

- The browser, OS, or push service (FCM for Chrome, APNs for Safari/iOS) may throttle, delay, or drop push messages.
- Battery saver mode, Do Not Disturb, and notification permission settings can prevent delivery.
- VAPID TTL is set to 86400 seconds (24 hours); notifications older than this are dropped by the push service.
- The app does not retry failed pushes within the same 15-minute cron window.
- The app does not guarantee exactly-once delivery; duplicate nudges within a single time slot are possible if the cron is retried.

---

**NFR-07 — iOS push caveat**  
Web Push on iOS requires:

1. **iOS 16.4 or later** — older iOS versions do not support Web Push at all.
2. **The PWA must be installed to the Home Screen** — Web Push does not work in a Safari browser tab, only from the standalone installed PWA.

The Settings screen must display a persistent informational notice on iOS: "On iPhone, notifications only work when this app is added to your Home Screen. In Safari, tap Share then Add to Home Screen."

This notice must be shown regardless of whether the user has already granted notification permission, as permission granted in the browser tab is distinct from permission in the installed PWA.

---

**NFR-08 — Push rate limits**  
The system must send at most one push notification per nudge time per day per subscription. The cron fires every 15 minutes; the edge function must check that a push has not already been sent for the current nudge slot before dispatching. Push frequency: maximum 4 per day per user. This protects against re-runs, retries, or duplicate cron executions.

---

**NFR-09 — Security**  
- `CRON_SECRET` is a shared secret used to authenticate the GitHub Actions cron call to the edge function. The edge function must reject all requests that do not include this secret in the `x-cron-secret` header with an HTTP 401 response.
- The `CRON_SECRET` must be rotated immediately if it is ever exposed in logs, commits, or error messages. After rotation, update both the Supabase Edge Function secret and the GitHub Actions secret.
- `SUPABASE_SERVICE_ROLE_KEY` must never appear in the frontend bundle or any client-side code. It is injected only into the Edge Function runtime by Supabase.
- `VITE_SUPABASE_ANON_KEY` is safe to expose in the browser bundle; it grants only what RLS policies permit.
- `VITE_VAPID_PUBLIC_KEY` is safe to expose; the matching private key must remain secret in the Edge Function.
- VAPID keys must be generated once and stored securely. Never regenerate VAPID keys without also deleting all existing `push_subscriptions` rows, as old subscriptions become invalid.

---

**NFR-10 — Data retention**  
`daily_log` rows are kept indefinitely. The 52-week history is the core product value — deleting log rows would erase the user's progress visualization. No automated purge or archival policy is applied. The expected volume is at most 365 rows per user per year, which is negligible for Postgres.
