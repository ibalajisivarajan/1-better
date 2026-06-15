# Functional Requirements — 1% Better

Version: 0.1.0  
Last updated: 2026-06-15

---

## Authentication

**FR-01 — Google OAuth sign-in**  
The app must offer a "Continue with Google" button on the login screen. Clicking it initiates Supabase's `signInWithOAuth` flow with provider `google`. After successful OAuth, the user is redirected to `/today`. The OAuth redirect URI must be registered in both Google Cloud Console and Supabase Auth settings.

**FR-02 — Magic-link (email OTP) sign-in fallback**  
Below the Google button, the login screen must present an email input and a "Send magic link" button. On submit, the app calls `supabase.auth.signInWithOtp` with the provided email and a redirect URL of `<origin>/today`. After sending, the screen switches to a confirmation message: "Check your email." The user may tap "Use a different email" to reset the form. No password is required.

---

## Daily Completion

**FR-03 — Daily habit completion via press-and-hold (today only, no backdating)**  
The Today screen must display a press-and-hold button. The user must hold the button for 1.5 seconds continuously for the action to complete. A visual fill animation (bottom-to-top fill) must indicate progress during the hold. Releasing early cancels the action and resets the fill. The completion writes a row to `daily_log` with today's date in the user's local timezone. Only today's date is valid — the user cannot mark past or future dates from the UI.

**FR-04 — Per-day celebration on completion**  
Immediately after successful completion, a `CelebrateDayOverlay` must appear full-screen. It displays "Day N done." (where N = today's day-of-week index within the current week, 1–7), shows the updated 7-dot week tracker with today's dot filled, and auto-dismisses after 2.5 seconds. The user may tap anywhere to dismiss it early.

**FR-05 — 7/7 week win detection and celebration**  
After any daily completion, if all 7 dots for the current calendar week (Monday–Sunday) are now filled, the `CelebrateWeekOverlay` must appear instead of (or after) the day overlay. It displays "Week won." with particle burst animation and "Week N complete." It auto-dismisses after 4 seconds. Tapping anywhere dismisses it early.

---

## Program Clock

**FR-06 — 52-week program clock (Jun 14 2026 → Jun 14 2027)**  
The app operates on a fixed 52-week program. The default `start_date` in `profiles` is `2026-06-14`. Week 1 begins on the user's start_date. Week 52 ends 364 days later. Weeks are numbered 1–52. The app must not display or allow interaction beyond week 52.

**FR-07 — Week number derived from profile.start_date**  
The current week number is computed as: `floor((today - start_date) / 7) + 1`, clamped to the range [1, 52]. This computation must use the user's local timezone date for "today" (not UTC). The formula is implemented in `useTodayMission.ts → getWeekNumber()`.

---

## Mission Display

**FR-08 — Mission display (area, action, micro tip, why)**  
The Today screen must display the current week's mission with all four fields:
- **Area** — shown as a labelled pill or tag (Body / Mind / Work / People / Inner)
- **Action** — the main habit statement, displayed prominently using the display font
- **Micro tip** — a smaller, frictionless daily version of the action
- **Why** — the rationale for the habit

Mission data is fetched from the `missions` table by `week_number`.

---

## Week Tracker

**FR-09 — 7-dot week tracker on Today screen**  
Below or near the mission card on the Today screen, a row of 7 dots must be displayed representing Monday through Sunday. Completed days show a filled ink dot. Today (if not yet done) shows a dot with an ink ring (outline). Future days show a faint dot. Labels M/T/W/T/F/S/S are displayed below each dot. The component is `WeekDots`.

---

## Journey Screen

**FR-10 — 52-dot grid on Journey screen with area-colored won dots**  
The Journey screen must display a grid of 52 dots, one per week. Weeks that are won (all 7 days completed) display a solid dot colored with the mission area's gradient (Body=orange, Mind=green, Work=yellow, People=pink, Inner=purple). The current week's dot shows a ring indicator. Past weeks that were not won display a faint dot. Future weeks display the faintest treatment.

**FR-11 — Journey stats (weeks won, days shown up, % of year)**  
Above or below the 52-dot grid, the Journey screen must display three summary statistics:
- **Weeks won** — count of weeks with all 7 days completed
- **Days shown up** — total count of `daily_log` rows for the user
- **% of year** — `(weeks won / 52) * 100`, formatted as a whole number with %

**FR-12 — Won-habit history list on Journey screen**  
Below the stats, the Journey screen must display a scrollable list of won weeks in reverse chronological order. Each entry shows: week number, the mission area tag, and the mission action text. This allows the user to review what they accomplished.

---

## Push Notifications

**FR-13 — Push notification subscribe flow (permission → pushManager → store in DB)**  
On the Settings screen, a "Turn on notifications" button must trigger the browser's `Notification.requestPermission()`. On grant, the app calls `navigator.serviceWorker.ready` to get the SW registration, then `registration.pushManager.subscribe()` with the VAPID public key. The resulting `PushSubscription` object (endpoint, p256dh, auth) is stored in the `push_subscriptions` table. If permission is denied, a helpful message explains why notifications require permission.

**FR-14 — Push nudges at 4 user-editable times (default 08:00/13:00/18:00/21:00 local)**  
The system sends push notifications at 4 times per day. The defaults are 08:00, 13:00, 18:00, and 21:00 in the user's local timezone (stored in `profiles.nudge_times` as `text[]`). The GitHub Actions cron runs every 15 minutes and POSTs to the `send-nudges` edge function. The edge function determines which subscriptions have a nudge time falling within the current 15-minute window.

**FR-15 — Nudges auto-cancel when today is already marked done**  
Before sending a push to any subscription, the edge function queries `daily_log` for a row with `user_id` and `done_date = today (in user's timezone)`. If such a row exists, no push is sent. This prevents nagging the user after they have already completed the habit.

**FR-16 — Timezone-aware nudge delivery**  
The edge function converts each nudge time from the user's stored timezone (e.g. `America/Vancouver`) to UTC for comparison with the current time. Delivery must land within ±7 minutes of the target local time, given the 15-minute cron granularity.

**FR-17 — Editable nudge times in Settings**  
The Settings screen must display 4 time inputs, pre-populated with the current `nudge_times` from the user's profile. Changing any time and saving must update `profiles.nudge_times` in Supabase. The save must debounce or use an explicit Save button to avoid excessive writes.

**FR-18 — Nudges on/off toggle**  
The Settings screen must display a toggle for `nudges_enabled`. When toggled off, the edge function skips that user's subscriptions entirely (by checking `profiles.nudges_enabled = true` before sending). The toggle state must be persisted to `profiles.nudges_enabled`.

---

## Account

**FR-19 — Sign out**  
The Settings screen must include a "Sign out" button. Clicking it calls `supabase.auth.signOut()` and redirects the user to `/login`. The local session is cleared.

---

## Offline / PWA

**FR-20 — Offline read: last-known mission and completion state cached**  
The service worker must cache the app shell (HTML, JS, CSS, fonts) so the app loads without a network connection. The last-fetched mission and today's completion state must be readable offline. Write operations (marking complete) must be queued or gracefully degrade with a user-visible message if the network is unavailable.

**FR-21 — PWA installable (manifest, service worker, standalone display)**  
The app must meet Chrome and Safari criteria for "Add to Home Screen":
- A valid `manifest.webmanifest` with `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`, and icons at 192x192 and 512x512 px.
- A registered service worker with a `fetch` handler.
- Served over HTTPS.

The PWA is configured via `vite-plugin-pwa` in `vite.config.ts`.

---

## Design

**FR-22 — Google Fonts Fraunces + DM Sans, no emoji in UI chrome**  
The app must load Fraunces (variable, optical size) and DM Sans from Google Fonts. Fraunces is used for all display and heading text. DM Sans is used for all body, label, and caption text. No emoji characters may appear in UI chrome (buttons, labels, navigation, notifications). Decorative elements must use CSS or SVG only.

**FR-23 — Per-area gradient colors on Today screen orb background**  
The `OrbBackground` component renders three blurred, breathing orbs behind the Today screen. The orb colors are derived from the current week's mission area:

| Area   | From      | To        |
|--------|-----------|-----------|
| Body   | `#FFD6A5` | `#FF9E7D` |
| Mind   | `#C3F0CA` | `#7DD8A4` |
| Work   | `#FFE8A3` | `#FCB454` |
| People | `#FFC9D6` | `#FF8FA8` |
| Inner  | `#D6C9FF` | `#A88FE8` |

The orbs animate with the `breathe` keyframe (4s ease-in-out infinite, scale 1 → 1.12) at staggered delays (0s, 2s, 1s).
