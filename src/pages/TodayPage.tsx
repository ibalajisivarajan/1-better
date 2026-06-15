import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { OrbBackground } from '../components/OrbBackground'
import { WeekDots } from '../components/WeekDots'
import { GlassCard } from '../components/GlassCard'
import { HoldButton } from '../components/HoldButton'
import { NudgeBubble } from '../components/NudgeBubble'
import { CelebrateDayOverlay } from '../components/CelebrateDayOverlay'
import { CelebrateWeekOverlay } from '../components/CelebrateWeekOverlay'
import { NotConnectedBanner } from '../components/NotConnectedBanner'
import { useProfile } from '../hooks/useProfile'
import { useTodayMission } from '../hooks/useTodayMission'
import { usePushSubscription } from '../hooks/usePushSubscription'
import { supabase, isConfigured } from '../lib/supabase'
import type { Mission } from '../types'

const NUDGE_MESSAGES = [
  "Just start. Even one minute counts.",
  "The hardest part is opening the door. Open it.",
  "Future you is watching. Don't let them down.",
  "You've already done harder things than this.",
  "Progress over perfection. Every time.",
  "Tiny is powerful. Go.",
]

const MOCK_MISSION: Mission = {
  week_number: 1,
  area: 'Body',
  action: 'Move for 10 minutes',
  why: 'Movement primes your brain and body for the day ahead.',
  micro: 'Walk to the end of the street and back — that is enough.',
}

function getTodayDateString(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

function getTodayIndex(): number {
  // 0=Mon, 6=Sun
  const dow = new Date().getDay()
  return dow === 0 ? 6 : dow - 1
}

interface TodayPageProps {
  user: User
}

export function TodayPage({ user }: TodayPageProps) {
  const { profile, loading: profileLoading } = useProfile(user)
  const { mission, weekNumber, todayDone: initialTodayDone, weekDots: initialWeekDots, loading: missionLoading } = useTodayMission(user, profile)
  const { isSubscribed, subscribe } = usePushSubscription(user)

  const [todayDone, setTodayDone] = useState<boolean | null>(null)
  const [weekDots, setWeekDots] = useState<boolean[] | null>(null)
  const [celebrate, setCelebrate] = useState<'day' | 'week' | null>(null)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  // Use local state if available (after completing), otherwise use hook state
  const effectiveTodayDone = todayDone ?? initialTodayDone
  const effectiveWeekDots = weekDots ?? initialWeekDots

  const activeMission = isConfigured ? mission : MOCK_MISSION
  const area = activeMission?.area ?? 'Body'

  const nudgeMessage = useMemo(() => {
    return NUDGE_MESSAGES[Math.floor(Math.random() * NUDGE_MESSAGES.length)]
  }, [])

  const todayIndex = getTodayIndex()

  const handleComplete = async () => {
    if (!isConfigured || !profile || !activeMission) {
      // In demo mode, just show celebration
      const newDots = [...effectiveWeekDots]
      newDots[todayIndex] = true
      setWeekDots(newDots)
      setTodayDone(true)
      const allDone = newDots.every(Boolean)
      setCelebrate(allDone ? 'week' : 'day')
      return
    }

    const timezone = profile.timezone || 'UTC'
    const today = getTodayDateString(timezone)

    const { error } = await supabase.from('daily_log').upsert(
      {
        user_id: user.id,
        done_date: today,
        week_number: weekNumber,
        mission_area: activeMission.area,
        mission_action: activeMission.action,
        done_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,done_date' }
    )

    if (!error) {
      const newDots = [...effectiveWeekDots]
      newDots[todayIndex] = true
      setWeekDots(newDots)
      setTodayDone(true)
      const allDone = newDots.every(Boolean)
      setCelebrate(allDone ? 'week' : 'day')
    }
  }

  const doneCountThisWeek = effectiveWeekDots.filter(Boolean).length

  const loading = profileLoading || missionLoading

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{ backgroundColor: '#F2ECE0' }}
    >
      {!isConfigured && <NotConnectedBanner />}
      <OrbBackground area={area} />

      <div
        className="relative z-10 flex flex-col min-h-screen px-6 py-8"
        style={{ paddingTop: !isConfigured ? '3rem' : '2rem' }}
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#2A251D', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <>
            {/* Top: week badge */}
            <div className="flex items-center justify-between mb-8">
              <span className="font-body text-sm font-medium" style={{ color: '#9A8F7E' }}>
                Week {weekNumber} · {area}
              </span>
              <div className="flex gap-4">
                <Link
                  to="/journey"
                  className="font-body text-sm"
                  style={{ color: '#9A8F7E' }}
                >
                  Journey
                </Link>
                <Link
                  to="/settings"
                  className="font-body text-sm"
                  style={{ color: '#9A8F7E' }}
                >
                  Settings
                </Link>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col justify-center gap-6">
              {/* Mission action */}
              <div>
                <h1
                  className="font-display text-4xl font-light leading-tight mb-3"
                  style={{ color: '#2A251D' }}
                >
                  {activeMission?.action ?? 'Loading mission...'}
                </h1>
                {activeMission?.micro && (
                  <p className="font-body text-base" style={{ color: '#9A8F7E' }}>
                    {activeMission.micro}
                  </p>
                )}
              </div>

              {/* Week dots */}
              <WeekDots dots={effectiveWeekDots} todayIndex={todayIndex} />

              {/* Done or hold button */}
              {effectiveTodayDone ? (
                <GlassCard className="text-center">
                  <p
                    className="font-display text-xl font-light mb-3"
                    style={{ color: '#2A251D' }}
                  >
                    Today's done.
                  </p>
                  <p className="font-body text-sm mb-4" style={{ color: '#9A8F7E' }}>
                    See you tomorrow.
                  </p>
                  <WeekDots dots={effectiveWeekDots} todayIndex={todayIndex} />
                </GlassCard>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <HoldButton onComplete={handleComplete} />
                  {!nudgeDismissed && (
                    <NudgeBubble
                      message={nudgeMessage}
                      onDismiss={() => setNudgeDismissed(true)}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Push notification CTA */}
            {!isSubscribed && !effectiveTodayDone && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={subscribe}
                  className="font-body text-xs px-4 py-2 rounded-xl transition-opacity hover:opacity-70"
                  style={{
                    color: '#9A8F7E',
                    border: '1px solid rgba(154, 143, 126, 0.4)',
                  }}
                >
                  Enable push nudges
                </button>
              </div>
            )}

            {/* Week progress summary */}
            <div className="mt-4 text-center">
              <p className="font-body text-xs" style={{ color: '#9A8F7E' }}>
                {doneCountThisWeek}/7 days this week
              </p>
            </div>
          </>
        )}
      </div>

      {/* Celebration overlays */}
      {celebrate === 'day' && activeMission && (
        <CelebrateDayOverlay
          dayNumber={doneCountThisWeek}
          weekDots={effectiveWeekDots}
          todayIndex={todayIndex}
          area={area}
          onDismiss={() => setCelebrate(null)}
        />
      )}
      {celebrate === 'week' && activeMission && (
        <CelebrateWeekOverlay
          weekNumber={weekNumber}
          area={area}
          onDismiss={() => setCelebrate(null)}
        />
      )}
    </div>
  )
}
