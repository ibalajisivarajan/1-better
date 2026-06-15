import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { GlassCard } from '../components/GlassCard'
import { NotConnectedBanner } from '../components/NotConnectedBanner'
import { OrbBackground } from '../components/OrbBackground'
import { supabase, isConfigured } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import type { DailyLog } from '../types'

const areaColors: Record<string, string> = {
  Body: '#FF9E7D',
  Mind: '#7DD8A4',
  Work: '#FCB454',
  People: '#FF8FA8',
  Inner: '#A88FE8',
}

interface WeekSummary {
  weekNumber: number
  area: string
  action: string
  daysLogged: number
  isWon: boolean
}

interface JourneyPageProps {
  user: User
}

export function JourneyPage({ user }: JourneyPageProps) {
  const { profile } = useProfile(user)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(false)
  const [popoverWeek, setPopoverWeek] = useState<number | null>(null)

  useEffect(() => {
    if (!isConfigured) return

    setLoading(true)
    supabase
      .from('daily_log')
      .select('*')
      .eq('user_id', user.id)
      .order('done_date', { ascending: true })
      .then(({ data }) => {
        setLogs((data as DailyLog[]) ?? [])
        setLoading(false)
      })
  }, [user])

  // Group by week number
  const weekMap = new Map<number, WeekSummary>()
  for (const log of logs) {
    const existing = weekMap.get(log.week_number)
    if (!existing) {
      weekMap.set(log.week_number, {
        weekNumber: log.week_number,
        area: log.mission_area,
        action: log.mission_action,
        daysLogged: 1,
        isWon: false,
      })
    } else {
      existing.daysLogged += 1
    }
  }
  // Mark weeks as won (7 days)
  for (const summary of weekMap.values()) {
    summary.isWon = summary.daysLogged >= 7
  }

  // Current week number — matches getWeekNumber in useTodayMission.ts exactly
  const currentWeek = profile
    ? (() => {
        const start = new Date(profile.start_date + 'T00:00:00Z')
        const diffDays = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))
        return Math.max(1, Math.min(52, Math.floor(diffDays / 7) + 1))
      })()
    : 1

  const totalDays = logs.length
  const wonWeeks = Array.from(weekMap.values()).filter((w) => w.isWon).length
  const percentOfYear = Math.round((totalDays / 365) * 100)

  const wonList = Array.from(weekMap.values())
    .filter((w) => w.isWon)
    .sort((a, b) => a.weekNumber - b.weekNumber)

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{ backgroundColor: '#F2ECE0' }}
    >
      {!isConfigured && <NotConnectedBanner />}
      <OrbBackground area="Inner" />

      <div
        className="relative z-10 flex flex-col px-6 py-8"
        style={{ paddingTop: !isConfigured ? '3rem' : '2rem' }}
      >
        {/* Nav */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/today" className="font-body text-sm" style={{ color: '#9A8F7E' }}>
            Back
          </Link>
          <Link to="/settings" className="font-body text-sm" style={{ color: '#9A8F7E' }}>
            Settings
          </Link>
        </div>

        <h1
          className="font-display text-4xl font-light mb-8"
          style={{ color: '#2A251D' }}
        >
          Your journey
        </h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: '#2A251D', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <GlassCard className="text-center !p-4">
                <p
                  className="font-display text-3xl font-light"
                  style={{ color: '#2A251D' }}
                >
                  {wonWeeks}
                </p>
                <p className="font-body text-xs mt-1" style={{ color: '#9A8F7E' }}>
                  Weeks won
                </p>
              </GlassCard>
              <GlassCard className="text-center !p-4">
                <p
                  className="font-display text-3xl font-light"
                  style={{ color: '#2A251D' }}
                >
                  {totalDays}
                </p>
                <p className="font-body text-xs mt-1" style={{ color: '#9A8F7E' }}>
                  Days shown up
                </p>
              </GlassCard>
              <GlassCard className="text-center !p-4">
                <p
                  className="font-display text-3xl font-light"
                  style={{ color: '#2A251D' }}
                >
                  {percentOfYear}%
                </p>
                <p className="font-body text-xs mt-1" style={{ color: '#9A8F7E' }}>
                  Of year
                </p>
              </GlassCard>
            </div>

            {/* 52-dot grid */}
            <GlassCard className="mb-6">
              <p className="font-body text-xs mb-4" style={{ color: '#9A8F7E' }}>
                52-week map
              </p>
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
              >
                {Array.from({ length: 52 }, (_, i) => {
                  const week = i + 1
                  const summary = weekMap.get(week)
                  const isWon = summary?.isWon ?? false
                  const isCurrent = week === currentWeek
                  const isPast = week < currentWeek
                  const area = summary?.area ?? ''
                  const dotColor = isWon
                    ? (areaColors[area] ?? '#2A251D')
                    : isPast
                    ? 'rgba(42, 37, 29, 0.15)'
                    : 'rgba(42, 37, 29, 0.07)'

                  return (
                    <button
                      key={week}
                      onClick={() => isWon ? setPopoverWeek(popoverWeek === week ? null : week) : undefined}
                      aria-label={`Week ${week}${isWon ? `: ${area} — ${summary?.action}` : ''}`}
                      className="aspect-square rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                      style={{
                        backgroundColor: dotColor,
                        boxShadow: isCurrent
                          ? '0 0 0 2px #2A251D, 0 0 0 4px rgba(42,37,29,0.2)'
                          : undefined,
                        cursor: isWon ? 'pointer' : 'default',
                        animation: isCurrent ? 'breathe 4s ease-in-out infinite' : undefined,
                      }}
                    />
                  )
                })}
              </div>

              {/* Popover for clicked won dot */}
              {popoverWeek !== null && weekMap.get(popoverWeek)?.isWon && (
                <div
                  className="mt-4 p-3 rounded-xl animate-fadeIn"
                  style={{
                    backgroundColor: 'rgba(42, 37, 29, 0.08)',
                    color: '#2A251D',
                  }}
                >
                  <p className="font-body text-xs font-medium">
                    Week {popoverWeek} · {weekMap.get(popoverWeek)?.area}
                  </p>
                  <p className="font-body text-sm mt-0.5">
                    {weekMap.get(popoverWeek)?.action}
                  </p>
                  <button
                    onClick={() => setPopoverWeek(null)}
                    className="mt-2 text-xs opacity-50 hover:opacity-80"
                    style={{ color: '#2A251D' }}
                  >
                    Close
                  </button>
                </div>
              )}
            </GlassCard>

            {/* Won habit list */}
            {wonList.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2
                  className="font-display text-xl font-light"
                  style={{ color: '#2A251D' }}
                >
                  Habits built
                </h2>
                {wonList.map((w) => (
                  <GlassCard key={w.weekNumber} className="!p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: areaColors[w.area] ?? '#2A251D' }}
                      />
                      <div>
                        <p className="font-body text-xs" style={{ color: '#9A8F7E' }}>
                          Week {w.weekNumber} · {w.area}
                        </p>
                        <p
                          className="font-body text-sm font-medium mt-0.5"
                          style={{ color: '#2A251D' }}
                        >
                          {w.action}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}

            {wonList.length === 0 && !loading && (
              <GlassCard className="text-center">
                <p className="font-display text-lg font-light" style={{ color: '#2A251D' }}>
                  Your story starts today.
                </p>
                <p className="font-body text-sm mt-2" style={{ color: '#9A8F7E' }}>
                  Complete 7 days in a row to win your first week.
                </p>
              </GlassCard>
            )}
          </>
        )}
      </div>
    </div>
  )
}
