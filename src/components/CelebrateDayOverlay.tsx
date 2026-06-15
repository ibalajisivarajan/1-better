import { useEffect } from 'react'
import { WeekDots } from './WeekDots'
import type { Mission } from '../types'

type Area = Mission['area']

interface CelebrateDayOverlayProps {
  dayNumber: number       // 1-7, which day of the week was just completed
  weekDots: boolean[]
  todayIndex: number
  area: Area
  onDismiss: () => void
}

const areaGradients: Record<Area, string> = {
  Body: 'linear-gradient(135deg, #FFD6A5, #FF9E7D)',
  Mind: 'linear-gradient(135deg, #C3F0CA, #7DD8A4)',
  Work: 'linear-gradient(135deg, #FFE8A3, #FCB454)',
  People: 'linear-gradient(135deg, #FFC9D6, #FF8FA8)',
  Inner: 'linear-gradient(135deg, #D6C9FF, #A88FE8)',
}

export function CelebrateDayOverlay({
  dayNumber,
  weekDots,
  todayIndex,
  area,
  onDismiss,
}: CelebrateDayOverlayProps) {
  // Auto-dismiss after 2.5s
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const daysWithToday = weekDots.map((d, i) => (i === todayIndex ? true : d))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Day complete"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
      style={{ background: areaGradients[area] }}
    >
      <div className="animate-popIn flex flex-col items-center gap-6 px-8 text-center">
        <h2
          className="font-display text-5xl font-light"
          style={{ color: '#2A251D' }}
        >
          Day {dayNumber} done.
        </h2>
        <WeekDots dots={daysWithToday} todayIndex={todayIndex} />
        <p
          className="font-body text-base mt-2 opacity-70"
          style={{ color: '#2A251D' }}
        >
          Tap anywhere to continue
        </p>
      </div>
    </div>
  )
}
