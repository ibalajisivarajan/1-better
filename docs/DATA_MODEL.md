# Data Model — 1% Better PWA

## Entity Relationship Diagram

```
auth.users (Supabase built-in)
    │
    │ ON INSERT → trigger: on_auth_user_created
    │                       └─► insert into public.profiles
    │
    ├──1:1──► public.profiles
    │           user_id (PK, FK → auth.users.id)
    │           start_date
    │           timezone
    │           nudge_times[]
    │           nudges_enabled
    │           created_at
    │
    ├──1:N──► public.daily_log
    │           id (PK)
    │           user_id (FK → auth.users.id)
    │           done_date
    │           week_number
    │           mission_area
    │           mission_action
    │           done_at
    │           UNIQUE (user_id, done_date)
    │
    └──1:N──► public.push_subscriptions
                id (PK)
                user_id (FK → auth.users.id)
                endpoint
                p256dh
                auth_key
                created_at
                UNIQUE (user_id, endpoint)

public.missions (reference table — no FK to auth.users)
    week_number (PK)
    area
    action
    why
    micro
```

---

## Table Descriptions

### `public.profiles`

Stores per-user app settings. A single row is auto-created for every new Supabase auth user.

| Column          | Type          | Nullable | Default                                   | Description |
|-----------------|---------------|----------|-------------------------------------------|-------------|
| `user_id`       | `uuid`        | NOT NULL | —                                         | Primary key; FK to `auth.users.id`. Cascades on delete. |
| `start_date`    | `date`        | NOT NULL | `2026-06-14`                              | The calendar date the user begins their 52-week journey. Used to derive the current week number. |
| `timezone`      | `text`        | NOT NULL | `America/Vancouver`                       | IANA timezone string. Used to schedule push notifications and to determine "today" in local time. |
| `nudge_times`   | `text[]`      | NOT NULL | `{08:00,13:00,18:00,21:00}`              | Array of `HH:MM` strings (local time) at which push nudges should fire. |
| `nudges_enabled`| `boolean`     | NOT NULL | `true`                                    | Global toggle; when false, no push notifications are sent regardless of `nudge_times`. |
| `created_at`    | `timestamptz` | NOT NULL | `now()`                                   | Row creation timestamp (UTC). |

---

### `public.daily_log`

Records each day a user marks their mission as done. At most one row per user per calendar day (enforced by UNIQUE constraint).

| Column           | Type          | Nullable | Default            | Description |
|------------------|---------------|----------|--------------------|-------------|
| `id`             | `uuid`        | NOT NULL | `gen_random_uuid()`| Surrogate primary key. |
| `user_id`        | `uuid`        | NOT NULL | —                  | FK to `auth.users.id`. Cascades on delete. |
| `done_date`      | `date`        | NOT NULL | —                  | Calendar date (in the user's local timezone) on which the mission was completed. |
| `week_number`    | `int`         | NOT NULL | —                  | Week 1–52 computed at insert time by the client. Stored for fast aggregation without repeated computation. |
| `mission_area`   | `text`        | NOT NULL | —                  | Denormalized copy of `missions.area` at the time of completion (snapshot in case missions are edited). |
| `mission_action` | `text`        | NOT NULL | —                  | Denormalized copy of `missions.action` at the time of completion. |
| `done_at`        | `timestamptz` | NOT NULL | `now()`            | Exact UTC timestamp of completion. |

**Unique constraint:** `(user_id, done_date)` — one completion per day per user.

---

### `public.push_subscriptions`

Stores Web Push API subscription objects so the server (Edge Function or external worker) can send push notifications.

| Column      | Type          | Nullable | Default            | Description |
|-------------|---------------|----------|--------------------|-------------|
| `id`        | `uuid`        | NOT NULL | `gen_random_uuid()`| Surrogate primary key. |
| `user_id`   | `uuid`        | NOT NULL | —                  | FK to `auth.users.id`. Cascades on delete. |
| `endpoint`  | `text`        | NOT NULL | —                  | Browser-issued push endpoint URL (unique per browser/device). |
| `p256dh`    | `text`        | NOT NULL | —                  | ECDH public key for payload encryption (base64url). |
| `auth_key`  | `text`        | NOT NULL | —                  | HMAC authentication secret (base64url). |
| `created_at`| `timestamptz` | NOT NULL | `now()`            | Row creation timestamp (UTC). |

**Unique constraint:** `(user_id, endpoint)` — prevents duplicate registrations for the same browser session.

---

### `public.missions`

Reference table containing the 52 pre-written weekly missions. Populated by `seed.sql`. Not editable by regular users.

| Column        | Type   | Nullable | Default | Description |
|---------------|--------|----------|---------|-------------|
| `week_number` | `int`  | NOT NULL | —       | Primary key; values 1–52. |
| `area`        | `text` | NOT NULL | —       | One of: `Body`, `Mind`, `Work`, `People`, `Inner`. Follows a 5-week cycle. |
| `action`      | `text` | NOT NULL | —       | Short imperative describing what to do this week. Displayed on the main card. |
| `why`         | `text` | NOT NULL | —       | 1–2 sentence rationale. Displayed on detail/expand view. |
| `micro`       | `text` | NOT NULL | —       | Concrete implementation hint. Displayed as a sub-prompt to lower friction. |

---

## Row Level Security Policies

RLS is enabled on all four tables. The policies below are exhaustive.

### `public.profiles`

| Policy name                     | Command  | Expression |
|---------------------------------|----------|------------|
| `profiles: own row select`      | SELECT   | `auth.uid() = user_id` |
| `profiles: own row insert`      | INSERT   | `auth.uid() = user_id` (WITH CHECK) |
| `profiles: own row update`      | UPDATE   | `auth.uid() = user_id` |
| `profiles: own row delete`      | DELETE   | `auth.uid() = user_id` |

Users can only read and modify their own profile row.

### `public.daily_log`

| Policy name                     | Command  | Expression |
|---------------------------------|----------|------------|
| `daily_log: own rows select`    | SELECT   | `auth.uid() = user_id` |
| `daily_log: own rows insert`    | INSERT   | `auth.uid() = user_id` (WITH CHECK) |
| `daily_log: own rows update`    | UPDATE   | `auth.uid() = user_id` |
| `daily_log: own rows delete`    | DELETE   | `auth.uid() = user_id` |

Users can only read and modify their own log entries.

### `public.push_subscriptions`

| Policy name                                | Command  | Expression |
|--------------------------------------------|----------|------------|
| `push_subscriptions: own rows select`      | SELECT   | `auth.uid() = user_id` |
| `push_subscriptions: own rows insert`      | INSERT   | `auth.uid() = user_id` (WITH CHECK) |
| `push_subscriptions: own rows update`      | UPDATE   | `auth.uid() = user_id` |
| `push_subscriptions: own rows delete`      | DELETE   | `auth.uid() = user_id` |

Users can only read and modify their own push subscription records.

### `public.missions`

| Policy name                       | Command | Expression |
|-----------------------------------|---------|------------|
| `missions: authenticated read`    | SELECT  | `auth.uid() IS NOT NULL` |

Any signed-in user can read all 52 missions. No INSERT/UPDATE/DELETE policy exists for regular users — only the Supabase `service_role` key (used by admin tools or migrations) can write to this table.

---

## Profile Auto-Create Trigger

When Supabase Auth creates a new user (via email/password sign-up, magic link, OAuth, etc.), it inserts a row into `auth.users`. The trigger `on_auth_user_created` fires immediately after that insert:

```sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
```

The underlying function is:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;
```

**Key design decisions:**

- `SECURITY DEFINER` — the function runs with the privileges of its owner (typically `postgres` or the migration role) rather than the caller (`supabase_auth_admin`). This is required because `auth.users` is in a separate schema that the `public` schema RLS policies cannot bridge.
- `ON CONFLICT DO NOTHING` — idempotent; safe to call multiple times (e.g., if a migration re-runs in a test environment).
- `REVOKE ... FROM public; GRANT ... TO supabase_auth_admin` — limits who can invoke the function directly, reducing the attack surface.
- All profile columns except `user_id` take their defaults from the table definition, so no additional data needs to be passed by the auth trigger.

---

## Indexing Strategy

| Index name                          | Table                   | Columns                   | Purpose |
|-------------------------------------|-------------------------|---------------------------|---------|
| `idx_daily_log_user_date`           | `public.daily_log`      | `(user_id, done_date)`    | Efficient lookup of whether a user has already logged today; also supports streak calculations. The most frequent query pattern. |
| `idx_daily_log_user_week`           | `public.daily_log`      | `(user_id, week_number)`  | Efficient aggregation of completions per week (for progress charts and streak counters by week). |
| `idx_push_subscriptions_user`       | `public.push_subscriptions` | `(user_id)`           | Fast retrieval of all active push endpoints when sending a notification to a user (a user may have multiple devices). |

The `profiles` and `missions` tables are accessed primarily by their primary keys (`user_id` and `week_number` respectively), so PostgreSQL's default B-tree index on the PK covers those patterns without additional indexes.

---

## Week Number Derivation

The current week number is computed on the client (TypeScript) and stored in `daily_log.week_number` at insert time:

```
week_number = CEIL((today - start_date + 1) / 7)
```

Capped at 52 to stay within the mission set.

### TypeScript reference implementation

```typescript
function getWeekNumber(startDate: Date, today: Date): number {
  // Normalise both dates to midnight UTC to avoid timezone-shift edge cases
  const start = new Date(
    Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  );
  const now = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const daysDiff = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  const week = Math.ceil((daysDiff + 1) / 7);
  return Math.min(Math.max(week, 1), 52);
}
```

### Worked examples

| `start_date`  | `today`       | `daysDiff` | raw week | capped |
|---------------|---------------|------------|----------|--------|
| 2026-06-14    | 2026-06-14    | 0          | 1        | **1**  |
| 2026-06-14    | 2026-06-20    | 6          | 1        | **1**  |
| 2026-06-14    | 2026-06-21    | 7          | 2        | **2**  |
| 2026-06-14    | 2026-12-27    | 196        | 29       | **29** |
| 2026-06-14    | 2027-06-13    | 364        | 52       | **52** |
| 2026-06-14    | 2027-06-14    | 365        | 53       | **52** (capped) |

The week number is denormalized into `daily_log` rather than derived at query time to keep aggregation queries simple and fast, and to ensure historical records are never retroactively altered if a user changes their `start_date`.
