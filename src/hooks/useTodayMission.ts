import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isConfigured } from '../lib/supabase'
import type { Mission, DailyLog, Profile } from '../types'

interface TodayMissionState {
  mission: Mission | null
  weekNumber: number
  todayDone: boolean
  weekDots: boolean[]
  loading: boolean
}

function getWeekNumber(startDate: string, today: Date): number {
  const start = new Date(startDate + 'T00:00:00Z')
  const diffMs = today.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.min(52, Math.floor(diffDays / 7) + 1))
}

function getTodayDateString(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone })
      .format(new Date())
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

function getWeekBounds(timezone: string): { monday: string; sunday: string } {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  // Get current day of week in local timezone (0=Sun, 1=Mon, ..., 6=Sat)
  const localDateStr = formatter.format(now)
  const localDate = new Date(localDateStr + 'T00:00:00')
  const dayOfWeek = new Date(
    now.toLocaleString('en-US', { timeZone: timezone })
  ).getDay()

  // Adjust: Mon=0, Tue=1, ..., Sun=6
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const monday = new Date(localDate)
  monday.setDate(localDate.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  function formatDate(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  }
  return {
    monday: formatDate(monday),
    sunday: formatDate(sunday),
  }
}

export function useTodayMission(user: User | null, profile: Profile | null): TodayMissionState {
  const [mission, setMission] = useState<Mission | null>(null)
  const [weekNumber, setWeekNumber] = useState(1)
  const [todayDone, setTodayDone] = useState(false)
  const [weekDots, setWeekDots] = useState<boolean[]>(Array(7).fill(false))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isConfigured || !user || !profile) {
      setLoading(false)
      return
    }

    const timezone = profile.timezone || 'UTC'
    const today = getTodayDateString(timezone)
    const now = new Date()
    const week = getWeekNumber(profile.start_date, now)
    setWeekNumber(week)

    const { monday, sunday } = getWeekBounds(timezone)

    async function fetchData() {
      setLoading(true)
      try {
        // Fetch mission and logs in parallel
        const [
          { data: missionData, error: missionError },
          { data: todayLog },
          { data: weekLogs },
        ] = await Promise.all([
          supabase.from('missions').select('*').eq('week_number', week).single(),
          supabase.from('daily_log').select('done_date').eq('user_id', user!.id).eq('done_date', today).single(),
          supabase.from('daily_log').select('done_date').eq('user_id', user!.id).gte('done_date', monday).lte('done_date', sunday),
        ])

        if (!missionError && missionData) {
          setMission(missionData as Mission)
        }

        setTodayDone(!!todayLog)

        // Build 7-boolean array (Mon=0, Sun=6)
        const dots = Array(7).fill(false)
        if (weekLogs) {
          for (const log of weekLogs as Pick<DailyLog, 'done_date'>[]) {
            const d = new Date(log.done_date + 'T00:00:00')
            const dow = d.getDay() // 0=Sun
            const idx = dow === 0 ? 6 : dow - 1 // Mon=0, Sun=6
            if (idx >= 0 && idx < 7) dots[idx] = true
          }
        }
        setWeekDots(dots)
      } catch {
        // Silently fail — component will show defaults
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, profile])

  return { mission, weekNumber, todayDone, weekDots, loading }
}
