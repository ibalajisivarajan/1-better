# Generating VAPID Keys

VAPID (Voluntary Application Server Identification) keys authenticate your
server to push services (FCM, APNs Web Push, Mozilla, etc.). Generate them
exactly **once** and store them securely. Regenerating keys invalidates every
existing push subscription — all users would need to re-subscribe.

---

## Step 1 — Generate the key pair

Run this one-time command (requires Node.js ≥ 14 installed locally):

```bash
npx web-push generate-vapid-keys
```

Example output:

```
=======================================

Public Key:
BHKbMPP8gcU8...64-char-base64url-string...

Private Key:
aB3kLq9...43-char-base64url-string...

=======================================
```

- **Public Key** — 65-byte uncompressed EC P-256 point encoded as base64url
  (~88 chars). Safe to include in the browser bundle.
- **Private Key** — 32-byte raw EC scalar encoded as base64url (~44 chars).
  **Never expose this in the browser or commit it to git.**

---

## Step 2 — Set Supabase Edge Function secrets

```bash
supabase secrets set VAPID_PUBLIC_KEY=<public-key-from-above>
supabase secrets set VAPID_PRIVATE_KEY=<private-key-from-above>
supabase secrets set VAPID_SUBJECT=mailto:alabinnexus@gmail.com
supabase secrets set CRON_SECRET=<random-32-char-string>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **auto-injected** by
Supabase at runtime — you do not need to set them manually.

To generate a strong `CRON_SECRET`:

```bash
openssl rand -base64 32
```

---

## Step 3 — Set the frontend environment variable

In your `.env.local` (or Vercel / Netlify environment settings):

```
VITE_VAPID_PUBLIC_KEY=<same-public-key-as-above>
```

This is the **only** VAPID value that belongs in the frontend.

---

## Step 4 — Set GitHub Actions secrets

In your repository: **Settings → Secrets and variables → Actions → New secret**

| Secret name        | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| `SEND_NUDGES_URL`  | `https://<project-ref>.supabase.co/functions/v1/send-nudges`         |
| `CRON_SECRET`      | Same value you set in Step 2                                          |

---

## Summary of where each key lives

| Key                    | Frontend (browser) | Supabase secrets | GitHub secrets |
|------------------------|--------------------|------------------|----------------|
| `VAPID_PUBLIC_KEY`     | ✓ `VITE_VAPID_PUBLIC_KEY` | ✓ `VAPID_PUBLIC_KEY` | — |
| `VAPID_PRIVATE_KEY`    | **NEVER**          | ✓ `VAPID_PRIVATE_KEY` | — |
| `CRON_SECRET`          | **NEVER**          | ✓ `CRON_SECRET`  | ✓ `CRON_SECRET` |
| `SEND_NUDGES_URL`      | —                  | —                | ✓ `SEND_NUDGES_URL` |

---

## Verifying the setup

After deploying the edge function and setting secrets, trigger a test run:

```bash
# Replace placeholders with real values
curl -X POST \
  -H "x-cron-secret: <your-cron-secret>" \
  https://<project-ref>.supabase.co/functions/v1/send-nudges
```

Expected response:

```json
{ "sent": 0, "skipped": 0, "errors": [] }
```

A non-empty `errors` array means something went wrong — check Supabase
Function logs: **Dashboard → Edge Functions → send-nudges → Logs**.
