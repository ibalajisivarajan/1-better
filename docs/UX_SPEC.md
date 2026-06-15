# UX Specification — 1% Better

Version: 0.1.0  
Last updated: 2026-06-15

---

## 1. Design Principles

- **One thing at a time.** Each screen has one primary action. No competing CTAs.
- **Earned density.** The journey screen earns its density (52 dots) because the user built it over time. Today's screen is sparse.
- **Deliberate actions.** The completion requires a hold, not a tap. Intentional friction creates ritual.
- **Warm, not cute.** No emoji. Warmth comes from typography, color, and motion, not decoration.
- **Legible at a glance.** Mission and completion state must be readable within 2 seconds of opening the app.

---

## 2. Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| `base` | `#F2ECE0` | Page background, card background tint, manifest background_color |
| `ink` | `#2A251D` | Primary text, filled dots, buttons, orb fill, notification bubbles |
| `muted` | `#9A8F7E` | Secondary text, placeholder text, dividers, future dots |

### Area gradient colors

Used for OrbBackground, CelebrateDayOverlay, CelebrateWeekOverlay, and 52-dot grid won dots.

| Area | From | To |
|------|------|----|
| Body | `#FFD6A5` | `#FF9E7D` |
| Mind | `#C3F0CA` | `#7DD8A4` |
| Work | `#FFE8A3` | `#FCB454` |
| People | `#FFC9D6` | `#FF8FA8` |
| Inner | `#D6C9FF` | `#A88FE8` |

Gradients are expressed as `linear-gradient(135deg, <from>, <to>)` for overlays, and as `radial-gradient(circle at <pos>, <from>, <to>)` for orbs.

### Glassmorphic card

Cards use `background: rgba(255,255,255,0.70)`, `backdrop-filter: blur(12px)`, and `box-shadow: 0 1px 8px rgba(42,37,29,0.06)`.

---

## 3. Typography Scale

All font sizes are rem-based (root: 16px).

| Token | Font | Weight | Size | Line height | Usage |
|-------|------|--------|------|-------------|-------|
| `display-xl` | Fraunces | 300 (Light) | 4.5rem (72px) | 1.05 | Celebration headlines ("Week won.") |
| `display-lg` | Fraunces | 300 (Light) | 3rem (48px) | 1.1 | Login heading, day celebration |
| `display-md` | Fraunces | 300 (Light) | 2rem (32px) | 1.15 | Week number heading on Journey |
| `heading` | Fraunces | 400 (Regular) | 1.25rem (20px) | 1.3 | Mission action text |
| `body-lg` | DM Sans | 400 (Regular) | 1rem (16px) | 1.5 | Mission why text, card body |
| `body` | DM Sans | 400 (Regular) | 0.875rem (14px) | 1.5 | Labels, nudge text, secondary body |
| `caption` | DM Sans | 400 (Regular) | 0.75rem (12px) | 1.4 | Error messages, meta text, hints |
| `label-sm` | DM Sans | 500 (Medium) | 0.875rem (14px) | 1 | Buttons, area tags, day labels |

Font declarations in Tailwind config:
```js
fontFamily: {
  display: ['Fraunces', 'Georgia', 'serif'],
  body: ['DM Sans', 'system-ui', 'sans-serif'],
}
```

Usage: `font-display` for Fraunces, `font-body` for DM Sans.

---

## 4. Animation Specifications

| Name | Keyframes | Duration | Easing | Trigger |
|------|-----------|----------|--------|---------|
| `breathe` | scale: 1 → 1.12 → 1 | 4s | ease-in-out | continuous (infinite) on OrbBackground orbs |
| `popIn` | scale: 0.8, opacity:0 → scale:1.05, opacity:1 → scale:1, opacity:1 | 0.4s | `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring overshoot) | on mount (celebration overlays, cards) |
| `fillUp` | height: 0% → 100% | 1.5s (tied to hold duration) | `linear` | during HoldButton press |
| `fadeIn` | opacity:0, translateY:8px → opacity:1, translateY:0 | 0.3s | ease-out | on mount (NudgeBubble, secondary elements) |
| `shimmer` | backgroundPosition: -200% → 200% | 2s | linear | loading skeleton states (optional) |
| `particleBurst` | scale:0, opacity:0 → opacity:1 → scale:0.3, opacity:0 | 0.8s | ease-out | CelebrateWeekOverlay particles (staggered by 80ms per particle) |

### Breathe delays (OrbBackground)

The three orbs use staggered `animationDelay` values: `0s`, `2s`, `1s`. This creates an organic, non-synchronized breathing rhythm.

### Hold fill behavior

The fill uses `requestAnimationFrame` (not CSS animation) so it can be cancelled at any point and reset smoothly. On release before completion: fill drops to 0% over 200ms ease-out. On completion: fill snaps to 100% and `onComplete` fires immediately.

---

## 5. Component Specifications

### OrbBackground

**Purpose:** Decorative background with breathing gradient orbs. Sets the emotional tone for the current area.

**Props:** `{ area: 'Body' | 'Mind' | 'Work' | 'People' | 'Inner' }`

**Behavior:**
- Renders three absolutely-positioned blurred circles:
  - Orb 1: 480×480px, top-left offset (-160px, -120px), 60px blur, 60% opacity
  - Orb 2: 400×400px, bottom-right offset (-100px, -80px), 70px blur, 50% opacity
  - Orb 3: 300×300px, centered at 40% × 50%, 80px blur, 30% opacity
- All orbs use `filter: blur()` and `radial-gradient` for the area's color pair.
- All orbs animate with `breathe` (4s ease-in-out infinite).
- `pointer-events: none`, `z-index: 0`, `aria-hidden="true"` — purely decorative.
- Changing `area` prop updates gradient colors immediately (no transition).

---

### WeekDots

**Purpose:** 7-dot row showing Mon–Sun completion state for the current week.

**Props:** `{ dots: boolean[], todayIndex: number }` (todayIndex: 0=Mon, 6=Sun)

**Visual states per dot:**
- **Done** (`dots[i] === true`): solid ink circle (`#2A251D`), 10×10px
- **Today, not done** (`i === todayIndex && !dots[i]`): faint ink circle + 2px ink ring `box-shadow: 0 0 0 2px #2A251D`
- **Future** (`i > todayIndex && !dots[i]`): very faint ink circle (`rgba(42,37,29,0.15)`)
- **Past, not done** (`i < todayIndex && !dots[i]`): slightly more visible faint (`rgba(42,37,29,0.20)`)

**Accessibility:** `role="list"` on the container. Each dot is `role="listitem"` with `aria-label="<day>: done|today|upcoming"`.

---

### GlassCard

**Purpose:** General-purpose glassmorphic container.

**Props:** `{ children: ReactNode, className?: string }`

**Styles:** `border-radius: 16px`, `background: rgba(255,255,255,0.70)`, `backdrop-filter: blur(12px)`, `box-shadow: 0 1px 8px rgba(42,37,29,0.06)`, `padding: 24px`.

---

### HoldButton

**Purpose:** Press-and-hold 1.5s button to mark today's habit complete.

**Props:** `{ onComplete: () => void, disabled?: boolean }`

**States:**

| State | Label | Visual |
|-------|-------|--------|
| Idle | "Hold to complete" | Ink circle, base-color text |
| Holding | "Keep holding" + percent | Fill rising from bottom (rgba base color 25%) |
| Complete | "Done!" | Full fill (briefly) |
| Disabled | "Hold to complete" | 40% opacity, not-allowed cursor |

**Interaction spec:**
- `onPointerDown`: starts RAF loop, records `startTime`
- `onPointerUp` / `onPointerLeave` / `onPointerCancel`: cancels RAF, resets fill
- `onContextMenu`: `preventDefault()` to block long-press context menu on mobile
- `touch-action: none` prevents scroll during hold
- `user-select: none` prevents text selection
- After completion: `completedRef.current = true` prevents re-triggering even if pointer events continue

**Accessibility:**
- `role="button"` (explicit, even though it is a `<button>` element)
- `aria-label="Hold to complete today's habit"`
- `aria-pressed={fillPercent >= 100}`
- `disabled` attribute when in disabled state
- `:focus-visible` ring: `ring-2 ring-ink ring-offset-2`

---

### NudgeBubble

**Purpose:** A speech bubble that delivers in-app nudge copy (distinct from push notifications).

**Props:** `{ message: string, onDismiss?: () => void }`

**Visual:** Dark ink background (`#2A251D`), base-color text (`#F2ECE0`), `border-radius: 24px 24px 24px 4px` (rounded-3xl rounded-bl-sm), with a small upward-pointing triangle tail at left.

**Behavior:** Mounts with `animate-fadeIn` (0.3s ease-out). Optional dismiss button (×) in top-right corner. No auto-dismiss — the parent component decides when to unmount.

---

### CelebrateDayOverlay

**Purpose:** Full-screen celebration after marking a single day complete.

**Props:** `{ dayNumber: number, weekDots: boolean[], todayIndex: number, area: Area, onDismiss: () => void }`

**Visual:** Full-screen area gradient background. Centered `popIn` animation showing "Day N done." in display font, updated WeekDots row, "Tap anywhere to continue" caption.

**Behavior:** Auto-dismisses after 2500ms via `setTimeout`. Clicking anywhere calls `onDismiss`. Today's dot is shown as filled in the WeekDots (`daysWithToday` array computed locally).

**Accessibility:** `role="dialog"`, `aria-modal="true"`, `aria-label="Day complete"`.

---

### CelebrateDayOverlay — when to use vs. CelebrateWeekOverlay

Show `CelebrateDayOverlay` when today's dot is filled but the week is not yet complete (weekDots does not have all 7 true after today's fill).

Show `CelebrateWeekOverlay` when filling today's dot makes all 7 true (week won). The day overlay is skipped in this case; the week overlay takes precedence.

---

### CelebrateWeekOverlay

**Purpose:** Full-screen celebration when all 7 days of the current week are complete.

**Props:** `{ weekNumber: number, area: Area, onDismiss: () => void }`

**Visual:** Area gradient background. "Week won." in 6rem display font. "Week N complete" in 1.25rem italic display font. 7 filled ink dots. 12 particle bursts (colored circles radiating outward). "Tap anywhere to continue" caption.

**Particles:** 12 circles placed at equal angular intervals around a center point. Radius 80–140px (random per particle). Size 6–14px (random). Colors rotate through area palette: `#FF9E7D`, `#7DD8A4`, `#FCB454`, `#FF8FA8`, `#A88FE8`, `#FFD6A5`. Animation: `particleBurst` keyframe, scale 0 → 1 → 0.3, opacity 0 → 1 → 0, 0.8s ease-out, staggered by 80ms.

**Behavior:** Auto-dismisses after 4000ms. Click anywhere to dismiss.

**Accessibility:** `role="dialog"`, `aria-modal="true"`, `aria-label="Week complete"`.

---

## 6. Screen Specifications

### Login (/login)

**Layout:** Full-screen centered column. OrbBackground with `area="Mind"` (default warm green). Vertically centered content block, max-width 384px.

**Content:**
1. App name "1% Better" in `display-lg` Fraunces Light
2. Tagline "One habit. Seven days. Fifty-two weeks." in `body` DM Sans muted color
3. GlassCard containing:
   - "Continue with Google" button (full width, ink background, base text)
   - Or-divider (muted line + "or" text)
   - Email input (rounded-xl, glass-tinted background, ink text)
   - "Send magic link" button (full width, ink background, base text)
   - Error message (caption, orange-tinted) if auth fails

**Post-magic-link state:** GlassCard replaces form with: "Check your email" heading + email confirmation text + "Use a different email" link.

**Unconfigured state:** When `VITE_SUPABASE_URL` is not set, buttons are disabled and a caption explains: "Configure Supabase env vars to enable auth."

---

### Today (/today)

**Layout:** Full-screen. OrbBackground with current week's area. Content scrolls if needed; primary content is above the fold on a 390px wide screen.

**Content:**
1. **Header:** App name or week label, settings icon (top right)
2. **Mission card** (GlassCard):
   - Area tag (colored pill: area name)
   - Mission `action` in `heading` Fraunces
   - "Today's micro:" label + `micro` text in `body`
   - "Why:" label + `why` text in `body` muted
3. **Week tracker:** WeekDots row, centered below the card
4. **HoldButton:** Centered, below week tracker, 144×144px circle
5. **NudgeBubble** (conditional): Shows above the HoldButton if the user hasn't opened the app today and it's past a nudge time. Dismissible.

**Done state:** HoldButton is disabled and shows "Done!" text. NudgeBubble is hidden (nudges auto-cancel).

**Loading state:** Skeleton placeholder in the mission card area.

---

### Journey (/journey)

**Layout:** Full-screen scroll. Base background (no orb — the journey screen is calm and retrospective). Navigation back to Today.

**Content:**
1. **Header:** "Your journey" in `display-md` Fraunces
2. **Stats row:** Three stat blocks side by side:
   - "X weeks won"
   - "Y days shown up"
   - "Z% of the year"
3. **52-dot grid:** 8 columns × 7 rows (last row has 3 dots). Each dot 16×16px.
   - Won week: radial gradient dot in area color, 100% opacity
   - Current week: ring indicator (outline dot with inner fill for days done)
   - Past incomplete: faint ink dot
   - Future: very faint dot
4. **Won habits list:** Section header "Habits you've built". List of won weeks in reverse chronological order. Each row: week number, area tag, action text.

---

### Settings (/settings)

**Layout:** Full-screen scroll. Base background. Back navigation.

**Content:**
1. **Header:** "Settings"
2. **Notifications section:**
   - iOS notice (shown on iOS devices): "On iPhone, push only works from the Home Screen app. Tap Share then Add to Home Screen."
   - "Turn on notifications" button (if not yet subscribed, or permission not granted)
   - Status: "Notifications active" or "Notifications off" if toggled
   - Nudges on/off toggle
   - 4 time inputs (labeled "Morning", "Midday", "Afternoon", "Evening")
   - Save button for nudge times
3. **Account section:**
   - Signed in as: `<email>`
   - "Sign out" button (destructive styling — muted, not ink)
4. **About section:**
   - Version: 0.1.0
   - Program: Week N of 52

---

## 7. Press-and-Hold Interaction Specification

**Sequence:**

```
Pointer down
  → startHold():
    - record startTime = Date.now()
    - setHolding(true)
    - setFillPercent(0)
    - requestAnimationFrame(tick)
  → tick() [runs every frame]:
    - elapsed = Date.now() - startTime
    - pct = min(100, elapsed / 1500 * 100)
    - setFillPercent(pct)
    - if pct < 100: requestAnimationFrame(tick)
    - if pct >= 100 && !completed:
      - completedRef = true
      - setHolding(false)
      - onComplete()

Pointer up / leave / cancel (while holding)
  → cancel():
    - cancelAnimationFrame(rafRef)
    - setHolding(false)
    - setFillPercent(0)
    - completedRef = false
```

**Fill visual:** A `<span>` absolutely positioned at the bottom of the button circle, with height `${fillPercent}%`, background `rgba(242,236,224,0.25)`. When holding, no transition (direct RAF control). When cancelling, `transition: height 0.2s ease-out` so the fill drops smoothly.

**Label text transitions:**
- 0–99%: "Hold to complete"
- During hold 0–99%: "Keep holding" + percent below
- 100%: "Done!"

**Context menu:** `onContextMenu={(e) => e.preventDefault()}` prevents iOS and Android long-press menus from appearing during the hold.

---

## 8. Nudge Bubble Copy Strategy

The NudgeBubble copy is determined by the time of day and the day of the week. Suggested copy patterns (no emoji):

| Context | Copy |
|---------|------|
| Morning nudge | "Your habit is waiting. Two minutes is enough." |
| Midday nudge | "Half the day is gone. Your habit is still here." |
| Afternoon nudge | "Before the evening settles in — your one thing." |
| Evening nudge | "Last chance today. One minute. Right now." |
| Day 7 (streak at risk) | "Seven days would be a full week. One more." |
| Day 1 of new week | "New week, new mission. Start here." |

**Placement:** The NudgeBubble appears above the HoldButton. Its upward-pointing tail points toward the button, creating a visual connection between the nudge and the action.

**Dismissal:** The user can dismiss it with the × button or by completing the habit. It should not reappear in the same session after dismissal.

---

## 9. No Emoji Policy

No emoji characters appear anywhere in the app's user interface:
- Button labels
- Navigation items
- Notification titles or bodies
- Error messages
- Mission text (enforced by content guidelines, not code)
- Celebration overlays

Celebratory effect in overlays is achieved through:
- Typography (large Fraunces display text)
- Area gradient backgrounds
- CSS particle animation (colored circles)
- Dot animations

If the missions seed data contains emoji in the `action`, `why`, or `micro` fields, they must be replaced with text equivalents before launch.
