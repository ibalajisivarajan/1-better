# Push Notification Architecture

This document describes the end-to-end push notification system for the
"1% Better" PWA, including the data flow, security model, encryption
details, and operational procedures.

---

## 1. Full Push Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUBSCRIPTION PHASE (one-time)                    │
│                                                                         │
│  User Browser / PWA                                                     │
│  ┌──────────────┐                                                       │
│  │ usePushSub-  │  1. navigator.serviceWorker.register('/sw.js')        │
│  │ scription.ts │  2. pushManager.subscribe({ applicationServerKey })   │
│  └──────┬───────┘                                                       │
│         │ PushSubscription { endpoint, p256dh, auth }                   │
│         ▼                                                               │
│  ┌──────────────┐  3. supabase.from('push_subscriptions').upsert(...)   │
│  │  Supabase DB │◄──────────────────────────────────────────────────── │
│  │  (push_sub-  │                                                       │
│  │  scriptions) │                                                       │
│  └──────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        DELIVERY PHASE (every 15 min)                    │
│                                                                         │
│  GitHub Actions                                                         │
│  ┌──────────────┐                                                       │
│  │ nudge-       │  4. POST /functions/v1/send-nudges                    │
│  │ cron.yml     │     Header: x-cron-secret: <secret>                  │
│  └──────┬───────┘                                                       │
│         │                                                               │
│         ▼                                                               │
│  Supabase Edge Function (Deno)                                          │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ send-nudges/index.ts                             │                  │
│  │                                                  │                  │
│  │ 5.  Validate x-cron-secret header               │                  │
│  │ 6.  SELECT profiles WHERE nudges_enabled = true │                  │
│  │ 7.  For each profile:                           │                  │
│  │       a. Get local HH:MM in user's timezone     │                  │
│  │       b. Check nudge_times ±7 min window        │                  │
│  │       c. Check daily_log for today → skip if    │                  │
│  │          already completed (auto-cancel)         │                  │
│  │       d. Calculate week_number from start_date  │                  │
│  │       e. Fetch mission for that week            │                  │
│  │       f. Build notification copy (time-bucketed)│                  │
│  │       g. Fetch push_subscriptions for user      │                  │
│  │       h. Encrypt payload (RFC 8291 aes128gcm)   │                  │
│  │       i. Sign VAPID JWT (ES256)                 │                  │
│  │       j. POST encrypted payload to endpoint     │                  │
│  └──────────────────────┬───────────────────────────┘                  │
│                         │                                               │
│         ┌───────────────┴──────────────────┐                           │
│         ▼                                  ▼                           │
│  ┌─────────────┐                   ┌──────────────┐                    │
│  │ FCM (Google │                   │ Mozilla /    │                    │
│  │ Android)    │                   │ APNs Web Push│                    │
│  │ Push Service│                   │ (iOS / Safari│                    │
│  └──────┬──────┘                   └──────┬───────┘                    │
│         │  8. Push message to device       │                           │
│         ▼                                 ▼                            │
│  ┌───────────────────────────────────────────────┐                     │
│  │ User Device — Service Worker (/sw.js)         │                     │
│  │                                               │                     │
│  │ 9.  'push' event fires                        │                     │
│  │ 10. Decrypt payload (browser handles this)    │                     │
│  │ 11. self.registration.showNotification(...)   │                     │
│  └───────────────────────────────────────────────┘                     │
│                         │                                               │
│         10. User taps notification                                      │
│         ▼                                                               │
│  ┌───────────────────────────────────────────────┐                     │
│  │ App opens / focuses → user logs daily action  │                     │
│  └───────────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Auto-Cancel Logic

A nudge is suppressed — and no push is sent — when the user has **already
logged their daily action** for the current local date.

```
Edge function checks:
  SELECT id FROM daily_log
  WHERE user_id = $1
    AND done_date = $today_local_date
  LIMIT 1

If a row exists → skip this user (result.skipped++)
```

This prevents pestering users who have already completed their habit for the
day, regardless of how many nudge times remain in the schedule.

The check uses `done_date` (a plain `date` column) compared against the
user's **local** date derived from their `timezone` field, so a user in
Tokyo who logs at 23:58 JST is still considered "done for today" even
though it might be yesterday in UTC.

---

## 3. Time Window Matching (±7 Minutes)

The GitHub Actions cron fires every 15 minutes. To avoid missing nudge
times that fall between two cron ticks, the edge function uses a ±7-minute
window around each configured nudge time.

```
Example: nudge_time = "08:00"
  Cron fires at 07:45 → |07:45 - 08:00| = 15 min → NO MATCH
  Cron fires at 07:53 → |07:53 - 08:00| = 7 min  → MATCH  ✓
  Cron fires at 08:00 → |08:00 - 08:00| = 0 min  → MATCH  ✓
  Cron fires at 08:07 → |08:07 - 08:00| = 7 min  → MATCH  ✓
  Cron fires at 08:15 → |08:15 - 08:00| = 15 min → NO MATCH
```

Because each nudge time must be at least 60 minutes apart (enforced by the
UI), two nudge windows cannot overlap, guaranteeing at most one nudge per
time slot per 15-minute cron cycle.

Midnight wrap-around is handled via circular distance:
```typescript
const diff = Math.abs(now - target)
const circular = Math.min(diff, 24 * 60 - diff)
return circular <= 7
```

---

## 4. Notification Copy — Time Buckets

The push body text varies based on the **user's local time of day**:

| Local time    | Title                         | Body content          |
|---------------|-------------------------------|-----------------------|
| 05:00–11:59   | "Morning check-in"            | `mission.action`      |
| 12:00–16:59   | "Afternoon reminder"          | `mission.action`      |
| 17:00–20:59   | "You've still got time today" | `mission.micro`       |
| 21:00–04:59   | "Last chance today"           | `mission.action`      |

`mission.micro` is the micro-habit — a shorter, lower-friction version of
the full action — intended to lower the activation energy needed for an
evening attempt.

---

## 5. VAPID Signing (Manual Implementation)

The edge function signs VAPID JWTs without any npm packages, using the Deno
`crypto.subtle` Web Crypto API.

```
Private key format:  base64url of 32-byte raw EC P-256 scalar
                     (output of: npx web-push generate-vapid-keys)

Public key format:   base64url of 65-byte uncompressed EC point
                     0x04 || x (32 bytes) || y (32 bytes)

JWT algorithm:       ES256 (ECDSA over P-256 with SHA-256)

Import method:       JWK — x and y components extracted from public key bytes
                     d = private key scalar (already base64url)

JWT payload:
  {
    aud: "https://<push-service-host>",  // e.g. https://fcm.googleapis.com
    exp: now + 43200,                    // valid for 12 hours
    sub: "mailto:alabinnexus@gmail.com"  // contact for push service
  }

Authorization header sent to push endpoint:
  vapid t=<jwt>,k=<base64url-public-key>
```

---

## 6. Payload Encryption (RFC 8291 / RFC 8188 aes128gcm)

Push payloads are encrypted end-to-end so only the user's browser can read
them. The server never sends plaintext over the wire to the push service.

```
Inputs:
  plaintext    — JSON string: { title, body, icon, badge, tag }
  p256dh       — subscription public key (65 bytes, uncompressed EC P-256)
  auth         — subscription auth secret (16 bytes)

Steps:
  1. Generate ephemeral P-256 key pair (local_pub, local_priv)
  2. ECDH: shared_secret = local_priv × p256dh
  3. HKDF-SHA-256 (extract+expand):
       auth_info = "WebPush: info\x00" || p256dh || local_pub
       ikm       = HKDF(salt=auth, ikm=shared_secret, info=auth_info, len=32)
  4. Generate random 16-byte salt
  5. Derive CEK and nonce via HKDF:
       cek   = HKDF(salt=salt, ikm=ikm, info="Content-Encoding: aes128gcm\x00\x01", len=16)
       nonce = HKDF(salt=salt, ikm=ikm, info="Content-Encoding: nonce\x00\x01",    len=12)
  6. Pad plaintext: plaintext || 0x02 || \x00... (to rs-16 = 4080 bytes)
  7. AES-128-GCM encrypt padded plaintext with (cek, nonce)
  8. Build aes128gcm content body:
       salt (16) || rs=4096 (4, big-endian) || key_len=65 (1) || local_pub (65) || ciphertext

HTTP request to push endpoint:
  POST <endpoint>
  Content-Type: application/octet-stream
  Content-Encoding: aes128gcm
  Authorization: vapid t=<jwt>,k=<public-key>
  TTL: 86400
  Urgency: normal
  Body: <encrypted body>
```

The browser's service worker push handler receives the decrypted payload
automatically — the browser runtime handles RFC 8291 decryption.

---

## 7. Platform Support

### Android (Chrome, Edge, Samsung Internet)

Full Web Push support. Push notifications work whether the PWA is installed
on the home screen or opened in the browser tab (as long as the service
worker is registered).

- FCM is the underlying push service; the endpoint URL begins with
  `https://fcm.googleapis.com/`.
- Chrome 50+, Edge 17+, Samsung Internet 6+ all support the full stack
  (service workers + Web Push + encrypted payloads).

### iOS (Safari, Chrome, Firefox on iOS)

**Requirement:** The PWA **must be added to the home screen** (via the
Share → Add to Home Screen flow in Safari) before push notifications are
available. Push does **not** work in a normal browser tab on iOS.

- Supported from **iOS 16.4** (released March 2023) and later.
- The push service endpoint begins with `https://web.push.apple.com/`.
- APNs Web Push uses the same RFC 8291 encryption and VAPID signing as other
  platforms — no special Apple-specific handling needed in the edge function.
- Users on iOS < 16.4 will not see the notification permission prompt.
  The `usePushSubscription` hook already guards for this by checking
  `'PushManager' in window`.

### Desktop (Chrome, Edge, Firefox)

Push works in desktop browsers even without "installing" the PWA, as long
as the browser is running in the background. Notifications appear as OS
notifications.

### Safari on macOS

Supported from **macOS 13 Ventura / Safari 16** using the same Web Push
standard (no more Apple Push Notification certificates required).

---

## 8. Idempotency

The system avoids duplicate notifications through two complementary mechanisms:

**1. Daily log check (primary guard)**
Before sending, the edge function checks whether `daily_log` has a row for
`(user_id, done_date)`. If it does, no push is sent. This is the "already
done" suppression.

**2. Cron window uniqueness (secondary guard)**
Each nudge time is separated by at least 60 minutes (enforced by the UI).
The cron fires every 15 minutes with a ±7 minute match window. Therefore,
each nudge time can only match **one** cron execution per day per user.

There is no separate `nudge_sent_log` table needed. The combination of the
two guards above means:
- A user who hasn't logged yet receives exactly one push per nudge time per
  day (assuming the cron fires reliably).
- A user who has already logged today receives zero pushes for all remaining
  nudge times that day.

**Expired subscription cleanup**
If a push endpoint returns HTTP 404 or 410 (subscription expired or
intentionally unsubscribed), the edge function automatically deletes that
row from `push_subscriptions`. The user will stop receiving pushes until
they re-subscribe from the settings screen.

---

## 9. VAPID Key Rotation Procedure

Rotating VAPID keys invalidates **all existing push subscriptions**. Only
do this if the private key is believed to be compromised.

```
Step 1: Generate new keys
  npx web-push generate-vapid-keys

Step 2: Update Supabase secrets
  supabase secrets set VAPID_PUBLIC_KEY=<new-public>
  supabase secrets set VAPID_PRIVATE_KEY=<new-private>

Step 3: Update frontend environment variable
  VITE_VAPID_PUBLIC_KEY=<new-public>
  Redeploy the frontend.

Step 4: Clear all push subscriptions from the database
  DELETE FROM push_subscriptions;
  (All users must re-subscribe — existing subscriptions are now invalid.)

Step 5: In-app nudge
  On next app open, the settings screen detects isSubscribed = false
  (because the browser's stored subscription no longer matches the new
  VAPID key) and prompts the user to re-enable push notifications.
```

**Without clearing the database**, the edge function will attempt to send
to old endpoints signed with the new VAPID key. All pushes will fail with
HTTP 401 from the push services. The 404/410 cleanup only runs on those
status codes, not 401 — so stale rows will persist but the function will
log errors. Best practice: clear the table in the same deployment transaction
as the key rotation.

---

## 10. Environment Variable Reference

| Variable                  | Where set              | Used by               |
|---------------------------|------------------------|-----------------------|
| `VITE_VAPID_PUBLIC_KEY`   | `.env.local` / Vercel  | Frontend (subscribe)  |
| `VAPID_PUBLIC_KEY`        | Supabase secrets       | Edge function (VAPID) |
| `VAPID_PRIVATE_KEY`       | Supabase secrets       | Edge function (VAPID) |
| `VAPID_SUBJECT`           | Supabase secrets       | Edge function (VAPID) |
| `CRON_SECRET`             | Supabase secrets + GHA | Auth guard            |
| `SUPABASE_URL`            | Auto-injected          | Edge function (DB)    |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected        | Edge function (DB)    |
| `SEND_NUDGES_URL`         | GitHub Actions secrets | nudge-cron.yml        |

---

## 11. Monitoring and Debugging

**Edge function logs**
Supabase Dashboard → Edge Functions → send-nudges → Logs

Every invocation logs a result object:
```json
{ "sent": 3, "skipped": 12, "errors": [] }
```

- `sent` — number of push messages successfully delivered to push services
- `skipped` — profiles that were outside their nudge window or already done
- `errors` — non-fatal errors (individual send failures, expired subs, etc.)

**GitHub Actions run history**
Repository → Actions → Nudge Cron — shows HTTP status returned by the
edge function for every 15-minute tick. A non-200 response fails the run
and GitHub will send an email notification after repeated failures.

**Testing a single push manually**
```bash
curl -X POST \
  -H "x-cron-secret: <your-cron-secret>" \
  https://<project-ref>.supabase.co/functions/v1/send-nudges
```
