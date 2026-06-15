# Product Requirements Document — 1% Better

## 1. Overview

**Product name:** 1% Better  
**Owner:** Bala (alabinnexus@gmail.com)  
**Type:** Progressive Web App (PWA)  
**Program dates:** June 14 2026 → June 14 2027 (52 weeks)  
**Status:** v0.1.0 — initial development

---

## 2. Problem

Bala experiences recurring lethargy and difficulty following through on personal development habits. The root causes are:

1. **No commitment device.** Wanting to improve is not enough — there is no mechanism that creates accountability beyond internal will.
2. **Habit overload.** Attempting to change too many things at once makes it easy to abandon all of them.
3. **No external nudge.** Without a reminder at the right moment, habits are forgotten in the flow of the day.
4. **No streak visualization.** When progress is invisible, it feels like nothing is happening.

---

## 3. Solution

1% Better assigns one micro-habit per week, for 52 consecutive weeks. The user's only job is to complete the habit once per day, every day.

The app creates a commitment device through:
- A **daily press-and-hold** action (deliberate, hard to do accidentally)
- A **7-dot week tracker** that makes streaks viscerally visible
- **Server-driven push notifications** at 4 times per day so the nudge comes to the user
- A **52-week journey grid** that shows the full year at a glance

The micro-habit model reduces cognitive load: one thing, repeated daily, for one week. Small enough to actually do; consistent enough to build the neural groove.

---

## 4. Users

**Primary user:** Bala. This is a single-user personal productivity app. However, the architecture supports multiple accounts (Supabase Auth + RLS) so it can be shared with others without modification.

---

## 5. The Core Loop

### Daily loop

1. User opens the app (or receives a push nudge).
2. **Today screen** shows the current week's mission: area, action, micro tip, and why it matters.
3. A 7-dot tracker shows which days this week are already done.
4. User **press-and-holds** the completion button for 1.5 seconds.
5. A **day celebration overlay** appears: "Day N done." with the updated dot tracker.
6. The nudge is automatically cancelled for the rest of today.
7. The button becomes disabled — today cannot be marked done twice.

### Weekly loop

1. On the 7th consecutive day of completion, the app detects a **week win**.
2. A **week celebration overlay** appears: "Week won." with particle burst animation.
3. The journey screen updates: the week's dot turns solid with the area's gradient color.
4. Week N+1 begins on the following Monday with a new mission.

### Yearly loop

The program runs from the user's `start_date` (set at sign-up, default June 14 2026) for exactly 52 weeks. Each week's mission is stored in the `missions` table and indexed by `week_number`. Completing all 52 weeks is the program goal.

---

## 6. Mission Structure

Each mission has four fields:

| Field    | Purpose                                             |
|----------|-----------------------------------------------------|
| `area`   | One of: Body, Mind, Work, People, Inner             |
| `action` | The concrete habit for the week (imperative sentence) |
| `micro`  | A tiny, frictionless daily version of the action    |
| `why`    | The reason this habit matters                       |

The 52 missions rotate across 5 areas. They are seeded in the database and can be updated via Supabase Studio without redeploying the app.

---

## 7. Nudge System

Push notifications are sent at 4 configurable times per day (default: 08:00, 13:00, 18:00, 21:00 local time). The system:

1. A **GitHub Actions cron** fires every 15 minutes.
2. The cron POSTs to a **Supabase Edge Function** with a shared secret.
3. The edge function checks which push subscriptions have a nudge-time matching the current 15-minute window, in the user's local timezone.
4. For each matching subscription, it checks whether today's daily_log row already exists.
5. If today is **not yet done**, it sends a Web Push notification via the VAPID-signed Web Push API.
6. Once the user completes today's habit, nudges are **auto-cancelled** for the day.

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Year completion | 52/52 weeks with 7/7 days per week |
| Daily streak | No missed days in any completed week |
| Push subscription | Active subscription on primary device |
| App installed | PWA added to Home Screen on primary mobile device |

Secondary metrics (nice to have, not tracked in-app):
- Subjective energy/focus improvement after 12 weeks
- Habit areas covered across the year (at least 3 of 5 areas)

---

## 9. Non-Goals

- Social / sharing features
- Habit library / custom habit creation by the user
- Calendar integration
- Streaks across different habits (only within a single week's mission)
- Analytics dashboard
- Paid plans or monetization
