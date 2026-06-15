/**
 * send-nudges — Supabase Edge Function (Deno)
 *
 * Called every 15 minutes by the GitHub Actions cron job.
 * Finds users whose nudge window is active right now, verifies they
 * haven't already logged today, then sends an encrypted Web Push
 * notification (RFC 8291 / RFC 8188 aes128gcm) via manual VAPID signing.
 *
 * Auth: x-cron-secret header must match CRON_SECRET env var.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  user_id: string
  start_date: string     // 'YYYY-MM-DD'
  timezone: string
  nudge_times: string[]  // ['08:00','13:00','18:00','21:00']
  nudges_enabled: boolean
}

interface Mission {
  week_number: number
  area: string
  action: string
  why: string
  micro: string
}

interface PushSub {
  endpoint: string
  p256dh: string
  auth_key: string
}

interface SendResult {
  sent: number
  skipped: number
  errors: string[]
}

// ---------------------------------------------------------------------------
// Base64url helpers
// ---------------------------------------------------------------------------

function base64UrlDecode(str: string): Uint8Array {
  // Pad to multiple of 4
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
  // Convert base64url → base64
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function base64UrlEncode(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

// ---------------------------------------------------------------------------
// HKDF-SHA-256
// ---------------------------------------------------------------------------

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<CryptoKey> {
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const prk = await crypto.subtle.sign('HMAC', saltKey, ikm)
  return crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

async function hkdfExpand(prk: CryptoKey, info: Uint8Array, length: number): Promise<Uint8Array> {
  const blocks: Uint8Array[] = []
  let prev = new Uint8Array(0)
  let remaining = length
  let counter = 1

  while (remaining > 0) {
    const input = new Uint8Array(prev.length + info.length + 1)
    input.set(prev, 0)
    input.set(info, prev.length)
    input[prev.length + info.length] = counter++

    const block = new Uint8Array(await crypto.subtle.sign('HMAC', prk, input))
    blocks.push(block)
    prev = block
    remaining -= block.length
  }

  // Concatenate and trim
  const result = new Uint8Array(length)
  let offset = 0
  for (const block of blocks) {
    const toCopy = Math.min(block.length, length - offset)
    result.set(block.slice(0, toCopy), offset)
    offset += toCopy
  }
  return result
}

/**
 * HKDF-SHA-256: extract + expand in one call.
 * @param salt   Salt bytes
 * @param ikm    Input keying material
 * @param info   Context info bytes
 * @param length Output length in bytes
 */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prk = await hkdfExtract(salt, ikm)
  return hkdfExpand(prk, info, length)
}

// ---------------------------------------------------------------------------
// VAPID JWT creation
// ---------------------------------------------------------------------------

/**
 * Creates a VAPID JWT signed with ES256 (ECDSA P-256 / SHA-256).
 *
 * @param audience    Push service origin, e.g. "https://fcm.googleapis.com"
 * @param subject     mailto: or https: contact for the application server
 * @param publicKey   Base64url-encoded uncompressed public key (65 bytes: 0x04 + x + y)
 * @param privateKey  Base64url-encoded raw EC private key scalar (32 bytes)
 */
async function createVapidJWT(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const encoder = new TextEncoder()

  // --- Build header and payload -------------------------------------------
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  }

  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)))
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)))
  const signingInput = `${headerB64}.${payloadB64}`

  // --- Derive JWK x,y from uncompressed public key point ------------------
  // Public key from web-push is base64url of 65-byte uncompressed EC point:
  //   0x04 || x (32 bytes) || y (32 bytes)
  const pubBytes = base64UrlDecode(publicKey)
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY must be a 65-byte uncompressed EC point')
  }
  const x = base64UrlEncode(pubBytes.slice(1, 33))
  const y = base64UrlEncode(pubBytes.slice(33, 65))

  // --- Import private key via JWK -----------------------------------------
  // Private key from web-push is base64url of 32-byte raw EC scalar.
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKey,  // already base64url
    x,
    y,
    key_ops: ['sign'],
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  // --- Sign ----------------------------------------------------------------
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    cryptoKey,
    encoder.encode(signingInput)
  )

  const sigB64 = base64UrlEncode(new Uint8Array(signature))
  return `${signingInput}.${sigB64}`
}

// ---------------------------------------------------------------------------
// RFC 8291 / RFC 8188 (aes128gcm) Web Push payload encryption
// ---------------------------------------------------------------------------

/**
 * Encrypts a plaintext string per RFC 8291 (Web Push Message Encryption)
 * using the aes128gcm content encoding defined in RFC 8188.
 *
 * Steps:
 *  1. Generate ephemeral ECDH key pair (P-256)
 *  2. ECDH shared secret with receiver public key
 *  3. HKDF-SHA-256 to derive IKM using auth secret
 *  4. HKDF-SHA-256 again to derive CEK (16 bytes) and nonce (12 bytes)
 *  5. Pad plaintext, encrypt with AES-128-GCM
 *  6. Prepend the aes128gcm header record
 *
 * @param plaintext  UTF-8 text to encrypt (the push notification payload JSON)
 * @param p256dh     Base64-encoded (standard, not url) subscription p256dh key
 * @param authKey    Base64-encoded (standard, not url) subscription auth key
 * @returns          Encrypted body bytes ready to POST to the push endpoint
 */
async function encryptPayload(
  plaintext: string,
  p256dh: string,
  authKey: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder()

  // Decode subscription keys.
  // The browser stores p256dh and auth as standard base64 (not url-safe).
  // However, our DB stores exactly what the browser gave us, so we handle both.
  function decodeKey(s: string): Uint8Array {
    // Try as base64url first, then standard base64
    try {
      return base64UrlDecode(s)
    } catch {
      const binary = atob(s)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return bytes
    }
  }

  const receiverPubKeyBytes = decodeKey(p256dh)   // 65 bytes uncompressed
  const authBytes = decodeKey(authKey)              // 16 bytes

  // Step 1: Generate ephemeral ECDH key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  // Export ephemeral public key (uncompressed, 65 bytes)
  const ephemeralPubKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey)
  )

  // Step 2: Import receiver's public key and derive ECDH shared secret
  const receiverPublicKey = await crypto.subtle.importKey(
    'raw',
    receiverPubKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverPublicKey },
    ephemeralKeyPair.privateKey,
    256
  )
  const sharedSecret = new Uint8Array(sharedSecretBits)

  // Step 3: Derive IKM using HKDF with auth as salt
  // auth_info = "WebPush: info\0" || receiver_pub_key || sender_pub_key
  const authInfoLabel = encoder.encode('WebPush: info\x00')
  const authInfo = new Uint8Array(
    authInfoLabel.length + receiverPubKeyBytes.length + ephemeralPubKeyRaw.length
  )
  authInfo.set(authInfoLabel, 0)
  authInfo.set(receiverPubKeyBytes, authInfoLabel.length)
  authInfo.set(ephemeralPubKeyRaw, authInfoLabel.length + receiverPubKeyBytes.length)

  // IKM = HKDF-SHA-256(salt=auth, ikm=sharedSecret, info=authInfo, len=32)
  const ikm = await hkdf(authBytes, sharedSecret, authInfo, 32)

  // Step 4: Generate random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Derive CEK (Content Encryption Key, 16 bytes) and Nonce (12 bytes)
  // key_info   = "Content-Encoding: aes128gcm\0\x01"
  // nonce_info = "Content-Encoding: nonce\0\x01"
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\x00')
  const nonceInfo = encoder.encode('Content-Encoding: nonce\x00')

  const cek = await hkdf(salt, ikm, cekInfo, 16)
  const nonce = await hkdf(salt, ikm, nonceInfo, 12)

  // Step 5: Pad plaintext
  // aes128gcm record: plaintext || 0x02 (delimiter) padded to rs-17 bytes
  // rs (record size) = 4096 bytes (standard)
  const rs = 4096
  const plaintextBytes = encoder.encode(plaintext)
  // record data = plaintext + delimiter(1) + GCM tag(16) must fit in rs
  // max plaintext in one record = rs - 1 - 16 = 4079
  if (plaintextBytes.length > rs - 17) {
    throw new Error(`Payload too large: max ${rs - 17} bytes`)
  }

  // Pad: plaintext || 0x02 || zeros to fill (rs - 17) - plaintextBytes.length
  const paddedLength = rs - 16  // GCM tag is appended externally by Web Crypto
  const paddedPlaintext = new Uint8Array(paddedLength)
  paddedPlaintext.set(plaintextBytes, 0)
  paddedPlaintext[plaintextBytes.length] = 0x02  // record delimiter

  // Step 6: AES-128-GCM encrypt
  const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, paddedPlaintext)
  )

  // Step 7: Build aes128gcm header + ciphertext
  // Header layout (RFC 8188 Section 2.1):
  //   salt (16) || rs (4, big-endian) || key_len (1) || local_pub_key (65)
  const keyLen = ephemeralPubKeyRaw.length  // 65
  const headerLen = 16 + 4 + 1 + keyLen
  const output = new Uint8Array(headerLen + ciphertext.length)

  let pos = 0
  // salt
  output.set(salt, pos); pos += 16
  // record size (4 bytes big-endian)
  const rsView = new DataView(output.buffer, pos, 4)
  rsView.setUint32(0, rs, false); pos += 4
  // key_len (1 byte)
  output[pos++] = keyLen
  // local public key (65 bytes)
  output.set(ephemeralPubKeyRaw, pos); pos += keyLen
  // encrypted record
  output.set(ciphertext, pos)

  return output
}

// ---------------------------------------------------------------------------
// Web Push send
// ---------------------------------------------------------------------------

/**
 * Sends a single Web Push notification to one push subscription endpoint.
 *
 * @param sub        The push subscription record from our database
 * @param payload    JSON-serialisable notification payload
 * @param vapidPub   VAPID public key (base64url, 65 bytes uncompressed)
 * @param vapidPriv  VAPID private key (base64url, 32 bytes raw scalar)
 * @param subject    VAPID subject (mailto: or https: URI)
 */
async function sendWebPush(
  sub: PushSub,
  payload: object,
  vapidPub: string,
  vapidPriv: string,
  subject: string
): Promise<{ ok: boolean; status: number; body: string }> {
  const endpointURL = new URL(sub.endpoint)
  const audience = `${endpointURL.protocol}//${endpointURL.host}`

  // Create VAPID JWT
  const jwt = await createVapidJWT(audience, subject, vapidPub, vapidPriv)

  // Encrypt payload
  const plaintext = JSON.stringify(payload)
  const encryptedBody = await encryptPayload(plaintext, sub.p256dh, sub.auth_key)

  // POST to push endpoint
  const response = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt},k=${vapidPub}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '86400',
      Urgency: 'normal',
    },
    body: encryptedBody,
  })

  const body = await response.text()
  return { ok: response.ok, status: response.status, body: body.slice(0, 200) }
}

// ---------------------------------------------------------------------------
// Time / date utilities
// ---------------------------------------------------------------------------

/**
 * Returns the current local time string "HH:MM" in the given IANA timezone.
 */
function getLocalHHMM(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  // Intl hour12:false can return "24" for midnight; normalise to "00"
  return `${hour === '24' ? '00' : hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

/**
 * Returns today's local date string "YYYY-MM-DD" in the given IANA timezone.
 */
function getLocalDateString(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

/**
 * Converts "HH:MM" to total minutes since midnight.
 */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Returns true if localTime is within ±windowMinutes of any of nudgeTimes.
 * Handles midnight wrap-around (e.g. window around 00:00).
 */
function isInNudgeWindow(localTime: string, nudgeTimes: string[], windowMinutes = 7): boolean {
  const now = toMinutes(localTime)
  const dayMinutes = 24 * 60

  return nudgeTimes.some((t) => {
    const target = toMinutes(t)
    const diff = Math.abs(now - target)
    // Circular distance to handle midnight wrap-around
    const circular = Math.min(diff, dayMinutes - diff)
    return circular <= windowMinutes
  })
}

/**
 * Returns the number of whole days between two YYYY-MM-DD strings.
 */
function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Returns the user's current week number (1–52) based on their start date
 * and today's local date in their timezone.
 */
function getWeekNumber(startDate: string, todayLocal: string): number {
  const daysSinceStart = daysBetween(startDate, todayLocal)
  // Week 1 = days 0-6, Week 2 = days 7-13, …
  return Math.min(Math.max(Math.ceil((daysSinceStart + 1) / 7), 1), 52)
}

// ---------------------------------------------------------------------------
// Notification copy selection
// ---------------------------------------------------------------------------

/**
 * Returns push notification copy based on local time of day and mission data.
 *
 * Time buckets:
 *   Morning   05:00–11:59 → "Morning check-in: {action}"
 *   Afternoon 12:00–16:59 → "Afternoon reminder: {action}"
 *   Evening   17:00–20:59 → "You've still got time today: {micro}"
 *   Bedtime   21:00–04:59 → "Last chance today: {action}"
 */
function buildNotificationPayload(
  localHHMM: string,
  mission: Mission
): { title: string; body: string; icon: string; badge: string; tag: string } {
  const totalMins = toMinutes(localHHMM)

  let title: string
  let body: string

  if (totalMins >= 5 * 60 && totalMins < 12 * 60) {
    // Morning 05:00–11:59
    title = 'Morning check-in'
    body = mission.action
  } else if (totalMins >= 12 * 60 && totalMins < 17 * 60) {
    // Afternoon 12:00–16:59
    title = 'Afternoon reminder'
    body = mission.action
  } else if (totalMins >= 17 * 60 && totalMins < 21 * 60) {
    // Evening 17:00–20:59
    title = "You've still got time today"
    body = mission.micro
  } else {
    // Bedtime 21:00–04:59
    title = 'Last chance today'
    body = mission.action
  }

  return {
    title,
    body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: `nudge-${new Date().toISOString().slice(0, 10)}`,
  }
}

// ---------------------------------------------------------------------------
// Edge Function entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // --- CORS preflight -------------------------------------------------------
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'x-cron-secret, Content-Type',
      },
    })
  }

  // --- Auth -----------------------------------------------------------------
  const cronSecret = Deno.env.get('CRON_SECRET')
  const providedSecret = req.headers.get('x-cron-secret')

  if (!cronSecret || providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- Environment ----------------------------------------------------------
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:alabinnexus@gmail.com'

  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- Supabase client (service role bypasses RLS) --------------------------
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // --- Fetch all nudge-enabled profiles -------------------------------------
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, start_date, timezone, nudge_times, nudges_enabled')
    .eq('nudges_enabled', true)

  if (profilesError) {
    console.error('Failed to fetch profiles:', profilesError)
    return new Response(JSON.stringify({ error: profilesError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result: SendResult = { sent: 0, skipped: 0, errors: [] }

  // Pre-fetch all missions into a lookup map (≤52 rows)
  const { data: allMissions } = await supabase.from('missions').select('*')
  const missionMap = new Map<number, Mission>()
  for (const m of allMissions ?? []) missionMap.set(m.week_number, m)

  // --- Process each profile -------------------------------------------------
  for (const profile of (profiles ?? []) as Profile[]) {
    try {
      // (a) Get user's current local time and today's local date
      const localHHMM = getLocalHHMM(profile.timezone)
      const todayLocal = getLocalDateString(profile.timezone)

      // (c) Check if current time matches any nudge window (±7 min)
      if (!isInNudgeWindow(localHHMM, profile.nudge_times, 7)) {
        result.skipped++
        continue
      }

      // (e) Check if user already logged today → auto-cancel nudge
      const { data: existingLog, error: logError } = await supabase
        .from('daily_log')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('done_date', todayLocal)
        .maybeSingle()

      if (logError) {
        result.errors.push(`daily_log check failed for ${profile.user_id}: ${logError.message}`)
        continue
      }

      if (existingLog) {
        // User already completed today — suppress the nudge
        result.skipped++
        continue
      }

      // (h) Determine current week number from start_date
      const weekNumber = getWeekNumber(profile.start_date, todayLocal)

      // (i) Look up the week's mission from the pre-fetched map
      const mission = missionMap.get(weekNumber) ?? null

      if (!mission) {
        // No mission configured for this week — skip silently
        result.skipped++
        continue
      }

      // Build notification payload
      const notificationPayload = buildNotificationPayload(localHHMM, mission as Mission)

      // (j) Fetch all push subscriptions for this user
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth_key')
        .eq('user_id', profile.user_id)

      if (subError) {
        result.errors.push(`push_subscriptions fetch failed for ${profile.user_id}: ${subError.message}`)
        continue
      }

      if (!subscriptions || subscriptions.length === 0) {
        result.skipped++
        continue
      }

      // (k) Send Web Push to each subscription
      for (const sub of subscriptions as PushSub[]) {
        try {
          const pushResult = await sendWebPush(sub, notificationPayload, vapidPublicKey, vapidPrivateKey, vapidSubject)
          if (pushResult.ok) {
            result.sent++
          } else if (pushResult.status === 404 || pushResult.status === 410) {
            // Subscription is expired — remove it
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', profile.user_id)
              .eq('endpoint', sub.endpoint)
            result.errors.push(`Removed expired subscription for ${profile.user_id}: ${sub.endpoint.slice(0, 60)}…`)
          } else {
            result.errors.push(`Push failed for ${profile.user_id}: HTTP ${pushResult.status}: ${pushResult.body}`)
          }
        } catch (pushError) {
          const msg = pushError instanceof Error ? pushError.message : String(pushError)
          result.errors.push(`Push failed for ${profile.user_id}: ${msg}`)
        }
      }
    } catch (profileError) {
      const msg = profileError instanceof Error ? profileError.message : String(profileError)
      result.errors.push(`Unhandled error processing profile ${profile.user_id}: ${msg}`)
    }
  }

  console.log('send-nudges result:', result)

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
