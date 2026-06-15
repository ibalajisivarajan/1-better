import { useEffect } from 'react'
import type { Mission } from '../types'

type Area = Mission['area']

interface CelebrateWeekOverlayProps {
  weekNumber: number
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

const PARTICLES = Array.from({ length: 12 }, (_, i) => i)

function getParticleStyle(i: number) {
  const angle = (i / 12) * 360
  const radius = 80 + Math.random() * 60
  const x = Math.cos((angle * Math.PI) / 180) * radius
  const y = Math.sin((angle * Math.PI) / 180) * radius
  const size = 6 + Math.floor(Math.random() * 8)
  const delay = (i * 0.08).toFixed(2)
  const colors = ['#FF9E7D', '#7DD8A4', '#FCB454', '#FF8FA8', '#A88FE8', '#FFD6A5']
  const color = colors[i % colors.length]

  return {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: color,
    top: '50%',
    left: '50%',
    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
    opacity: 0,
    animation: `particleBurst 0.8s ease-out ${delay}s forwards`,
  }
}

export function CelebrateWeekOverlay({
  weekNumber,
  area,
  onDismiss,
}: CelebrateWeekOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Week complete"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
      style={{ background: areaGradients[area] }}
    >
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="relative w-full h-full">
          {PARTICLES.map((i) => (
            <div key={i} style={getParticleStyle(i)} aria-hidden="true" />
          ))}
        </div>
      </div>

      <div className="animate-popIn flex flex-col items-center gap-6 px-8 text-center relative z-10">
        <h2
          className="font-display text-6xl font-light"
          style={{ color: '#2A251D' }}
        >
          Week won.
        </h2>

        <p
          className="font-display text-xl italic font-light"
          style={{ color: '#2A251D', opacity: 0.8 }}
        >
          Week {weekNumber} complete
        </p>

        {/* 7 filled dots */}
        <div className="flex gap-2 mt-2">
          {Array(7).fill(true).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#2A251D' }}
            />
          ))}
        </div>

        <p
          className="font-body text-base mt-4 opacity-60"
          style={{ color: '#2A251D' }}
        >
          Tap anywhere to continue
        </p>
      </div>

      <style>{`
        @keyframes particleBurst {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          40% { opacity: 1; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--tx, 0px)), calc(-50% + var(--ty, 0px))) scale(0.3); }
        }
      `}</style>
    </div>
  )
}
