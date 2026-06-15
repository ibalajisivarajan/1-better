# Test Plan — 1% Better

Version: 0.1.0  
Last updated: 2026-06-15  
Type: Manual QA

---

## Test Environment

| Item | Value |
|------|-------|
| Primary test URL | Vercel production URL |
| Secondary test URL | `http://localhost:5173` (local dev) |
| Test browser (desktop) | Chrome 126+, Safari 17+ |
| Test browser (mobile) | Safari on iOS 16.4+, Chrome on Android |
| Supabase project | Production (use a separate project for test if data isolation is required) |
| Test user | `alabinnexus@gmail.com` |

---

## 1. Smoke Tests (manual, run after every deploy)

### SM-01: Sign in with Google

1. Open the app URL in an incognito window.
2. Click **Continue with Google**.
3. Complete Google OAuth flow.
4. **Expected:** Redirected to `/today`. Mission card visible. No error.

### SM-02: Sign in with magic-link

1. Open the app URL in an incognito window.
2. Enter your email in the magic-link form.
3. Click **Send magic link**.
4. **Expected:** "Check your email" confirmation screen appears.
5. Open the email, click the magic link.
6. **Expected:** Redirected to `/today`. Mission card visible.

### SM-03: Today screen loads

1. Sign in as the test user.
2. Navigate to `/today`.
3. **Expected:**
   - Mission card shows area, action, micro tip, why.
   - 7-dot week tracker shows correct state (today has a ring if not done).
   - OrbBackground gradients match the current area.
   - HoldButton is visible and enabled (if not already done today).

### SM-04: Mark today complete (hold button)

1. On `/today`, press and hold the HoldButton.
2. Hold for the full 1.5 seconds without releasing.
3. **Expected:**
   - Fill animation rises from 0% to 100% during the hold.
   - On completion: `CelebrateDayOverlay` appears (or `CelebrateWeekOverlay` if it is the 7th day).
   - Overlay auto-dismisses after 2.5s (or tap to dismiss).
   - After dismissal: HoldButton is disabled, shows "Done!".
   - Today's dot in WeekDots is now filled (solid ink).

### SM-05: Verify HoldButton cancels on early release

1. On `/today` with today not yet done, press and hold the HoldButton.
2. Release after approximately 0.5 seconds (before 1.5s complete).
3. **Expected:**
   - Fill drops back to 0% (smooth 200ms transition).
   - No completion recorded.
   - Button returns to idle state.

### SM-06: Check journey screen

1. Navigate to `/journey`.
2. **Expected:**
   - 52-dot grid is visible.
   - If any week is won, those dots show area gradient colors.
   - Stats row shows: "X weeks won", "Y days shown up", "Z% of the year".
   - Won habits list shows completed weeks (if any).

### SM-07: Settings screen

1. Navigate to `/settings`.
2. **Expected:**
   - 4 time inputs pre-populated with default nudge times (08:00, 13:00, 18:00, 21:00).
   - Nudges toggle shows current state.
   - Signed-in email is shown.
   - "Sign out" button is present.

### SM-08: Sign out

1. On `/settings`, click **Sign out**.
2. **Expected:** Redirected to `/login`. Session cleared. Returning to `/today` redirects back to `/login`.

---

## 2. Push Notification Tests

### PN-01: Subscribe to push notifications

1. Sign in and navigate to `/settings`.
2. Click **Turn on notifications**.
3. **Expected:** Browser permission prompt appears.
4. Click **Allow**.
5. **Expected:**
   - No error message.
   - Settings shows "Notifications active" (or similar confirmation).
   - In Supabase Dashboard → Table Editor → `push_subscriptions`: a new row exists with your user_id.

### PN-02: Push subscription persists across sessions

1. After PN-01, sign out and sign back in.
2. Navigate to `/settings`.
3. **Expected:** Notification status still shows as active. The `push_subscriptions` row is unchanged.

### PN-03: Push notification received (cron-triggered)

Prerequisites: push subscription is active (PN-01 done). Today's habit is NOT yet marked done.

1. In GitHub → Actions → **Nudge Cron**, click **Run workflow** → **Run workflow**.
2. Wait approximately 30 seconds.
3. **Expected:** Push notification appears on the device with title "1% Better" and a nudge message body. Tapping the notification opens the app at `/today`.

### PN-04: Nudge suppressed when today is already done

Prerequisites: push subscription is active. Today's habit IS already marked done.

1. Mark today complete (SM-04).
2. Trigger the cron (same as PN-03).
3. **Expected:** No push notification received. (Verify in edge function logs: Supabase → Edge Functions → Logs → send-nudges: should show "skipping user, already done today".)

### PN-05: Nudges disabled toggle

1. Navigate to `/settings`.
2. Toggle **Nudges** off.
3. Trigger the cron (PN-03 method).
4. **Expected:** No push notification received.
5. Toggle **Nudges** back on.

### PN-06: Custom nudge times saved and respected

1. Navigate to `/settings`.
2. Change one of the nudge times to be 2 minutes from now.
3. Click **Save**.
4. Verify in Supabase: `profiles.nudge_times` updated.
5. Wait for the next 15-minute cron window that covers your new time.
6. **Expected:** Push notification arrives at the new time (within ±7 minutes).

### PN-07: iOS Home Screen installation required

1. Open the Vercel URL in Safari on iPhone (not from Home Screen).
2. Navigate to `/settings`, click **Turn on notifications**.
3. **Expected:** iOS-specific notice is shown: "On iPhone, notifications only work when this app is added to your Home Screen."
4. Install the PWA to Home Screen (see SETUP.md Step 12).
5. Open from Home Screen, navigate to settings, subscribe again.
6. **Expected:** Subscription succeeds and push works from the Home Screen app.

---

## 3. Week Win Detection Tests

### WW-01: Simulate a full week win via DB

This test bypasses the UI to verify the week-win detection logic.

1. In Supabase Dashboard → SQL Editor, run:
   ```sql
   -- Get your user_id
   SELECT id FROM auth.users WHERE email = 'alabinnexus@gmail.com';
   
   -- Insert Mon-Sun of the current ISO week
   -- (adjust dates to be the Monday-Sunday of the current week)
   INSERT INTO public.daily_log (user_id, done_date, week_number, mission_area, mission_action)
   VALUES
     ('<your-user-id>', '2026-06-15', 1, 'Mind', 'Test mission'),
     ('<your-user-id>', '2026-06-16', 1, 'Mind', 'Test mission'),
     ('<your-user-id>', '2026-06-17', 1, 'Mind', 'Test mission'),
     ('<your-user-id>', '2026-06-18', 1, 'Mind', 'Test mission'),
     ('<your-user-id>', '2026-06-19', 1, 'Mind', 'Test mission'),
     ('<your-user-id>', '2026-06-20', 1, 'Mind', 'Test mission')
   ON CONFLICT DO NOTHING;
   ```
   (This seeds Mon-Sat; Sunday is left for the UI test.)
2. Open the app at `/today`.
3. Verify the week tracker shows 6 of 7 dots filled.
4. Hold the button to complete today (Sunday).
5. **Expected:** `CelebrateWeekOverlay` appears ("Week won."), not `CelebrateDayOverlay`.
6. Navigate to `/journey`.
7. **Expected:** Week 1 dot shows as a solid colored dot in the Mind gradient.
8. Clean up: delete the test rows from `daily_log` if needed.

### WW-02: Week boundary at Monday

Verify that the week tracker resets correctly on Monday.

1. In SQL Editor, insert a `done_date` for last Sunday (the day before today's Monday).
2. Open the app.
3. **Expected:** WeekDots shows 0 dots for the current week (last week's Sunday is in the previous calendar week).

---

## 4. Settings Persistence Tests

### ST-01: Nudge times save and reload

1. Navigate to `/settings`.
2. Change all 4 nudge times to arbitrary values (e.g. 07:30, 12:15, 17:45, 20:00).
3. Click **Save**.
4. Reload the page (hard refresh).
5. **Expected:** The 4 time inputs show the saved values (07:30, 12:15, 17:45, 20:00).
6. Verify in Supabase: `profiles.nudge_times = ['07:30','12:15','17:45','20:00']`.

### ST-02: Timezone stored on first profile creation

1. Sign in as a new user (use a fresh email address or delete the profile row first).
2. Navigate to `/today`.
3. **Expected:** A row exists in `profiles` with `timezone` matching your browser's IANA timezone (e.g. `America/Vancouver`).
4. Verify: `SELECT timezone FROM profiles WHERE user_id = '<your-id>'`.

---

## 5. Offline Tests

### OF-01: App shell loads without network

1. Sign in, navigate to `/today`. The page must load at least once while online.
2. Open Chrome DevTools → Network → change throttle to **Offline**.
3. Hard refresh the page (Ctrl+Shift+R).
4. **Expected:** The app loads (HTML, JS, CSS served from service worker cache). The layout renders. Some data (mission, dots) may show as stale or empty depending on what was previously cached.
5. Restore network: set throttle back to **No throttling**.

### OF-02: Data fetches gracefully fail offline

1. With DevTools network set to **Offline** (after a prior online session):
2. Navigate to `/today`.
3. **Expected:** App does not crash. A non-breaking error state or empty/stale data is shown. No white screen.

### OF-03: Completion fails offline with user feedback

1. Set network to **Offline**.
2. Attempt to complete today's habit (hold button).
3. **Expected:** An error message or banner informs the user that the action could not be saved (e.g. "No connection — try again when online"). The completion is NOT recorded in the DB.

---

## 6. Edge Function Direct Test

Run from your terminal to verify the edge function is deployed and secured correctly.

### EF-01: Valid secret — should succeed

```bash
curl -X POST \
  -H "x-cron-secret: <your-cron-secret>" \
  -H "Content-Type: application/json" \
  "https://<your-project-ref>.supabase.co/functions/v1/send-nudges"
```

**Expected response:** `{"ok":true,"sent":<number>}` with HTTP 200.

### EF-02: Missing secret — should be rejected

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  "https://<your-project-ref>.supabase.co/functions/v1/send-nudges"
```

**Expected response:** HTTP 401 `{"error":"Unauthorized"}` or similar.

### EF-03: Wrong secret — should be rejected

```bash
curl -X POST \
  -H "x-cron-secret: wrong-secret" \
  "https://<your-project-ref>.supabase.co/functions/v1/send-nudges"
```

**Expected response:** HTTP 401.

---

## 7. Cron Trigger Test

### CR-01: Manual workflow dispatch

1. In GitHub → your repo → **Actions** tab.
2. Find **Nudge Cron** in the left sidebar.
3. Click **Run workflow** → **Run workflow** (select `main` branch).
4. The workflow run appears in the list. Click it.
5. **Expected:**
   - The `send-nudges` job completes with green checkmark.
   - Logs show: `POST <edge-function-url>` → `200 OK` or `{"ok":true,...}`.
   - If today is not yet done for your user and the current time matches a nudge window: push notification arrives on the subscribed device.

### CR-02: Verify cron schedule

1. Go to **Actions → Nudge Cron**.
2. View recent runs.
3. **Expected:** Runs appear at approximately 15-minute intervals (every :00, :15, :30, :45 of each hour).

---

## 8. Accessibility Spot Checks

### AC-01: Keyboard navigation

1. Open the app in Chrome.
2. Tab through all interactive elements on `/login`.
3. **Expected:** Every focusable element shows a visible focus ring. Order is logical (top to bottom, left to right).

### AC-02: HoldButton keyboard activation

1. Tab to the HoldButton.
2. **Expected:** Focus ring is visible.
3. Note: press-and-hold via keyboard is not required (pointer-only interaction is acceptable for this component), but it must not be keyboard-inaccessible in a way that prevents discovery.

### AC-03: Screen reader labels

1. Open the app with VoiceOver (iOS/macOS) or TalkBack (Android).
2. Navigate to `/today`.
3. **Expected:**
   - The HoldButton is announced as "Hold to complete today's habit, button".
   - WeekDots are announced as a list with each day's state.

---

## 9. PWA Installability Check

### PWA-01: Lighthouse PWA audit

1. Open Chrome DevTools → Lighthouse.
2. Select **Progressive Web App** category only.
3. Analyze the production Vercel URL.
4. **Expected:** Score 90 or above. All "installable" checks pass. No red errors.

### PWA-02: Manifest validation

1. In Chrome DevTools → Application → Manifest.
2. **Expected:**
   - Name: "1% Better"
   - Icons at 192×192 and 512×512 visible
   - Display: standalone
   - Theme color: #F2ECE0

### PWA-03: Service worker registration

1. In Chrome DevTools → Application → Service Workers.
2. **Expected:** Service worker shows as "activated and running". Source is `sw.js`.

---

## 10. Test Data Cleanup

After testing, clean up test rows to avoid polluting the journey screen:

```sql
-- Remove all daily_log rows for test dates
DELETE FROM public.daily_log
WHERE user_id = '<your-user-id>'
  AND done_date IN ('2026-06-15','2026-06-16','2026-06-17','2026-06-18','2026-06-19','2026-06-20');

-- Remove test push subscriptions (will re-subscribe in real use)
DELETE FROM public.push_subscriptions
WHERE user_id = '<your-user-id>';
```
