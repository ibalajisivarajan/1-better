import type { Mission } from '../types'

type Area = Mission['area']

interface OrbBackgroundProps {
  area: Area
}

const areaGradients: Record<Area, { from: string; to: string }> = {
  Body: { from: '#FFD6A5', to: '#FF9E7D' },
  Mind: { from: '#C3F0CA', to: '#7DD8A4' },
  Work: { from: '#FFE8A3', to: '#FCB454' },
  People: { from: '#FFC9D6', to: '#FF8FA8' },
  Inner: { from: '#D6C9FF', to: '#A88FE8' },
}

export function OrbBackground({ area }: OrbBackgroundProps) {
  const { from, to } = areaGradients[area]

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      {/* Orb 1 — top left */}
      <div
        className="absolute rounded-full animate-breathe opacity-60"
        style={{
          width: '480px',
          height: '480px',
          top: '-160px',
          left: '-120px',
          background: `radial-gradient(circle at 40% 40%, ${from}, ${to})`,
          filter: 'blur(60px)',
          animationDelay: '0s',
        }}
      />
      {/* Orb 2 — bottom right */}
      <div
        className="absolute rounded-full animate-breathe opacity-50"
        style={{
          width: '400px',
          height: '400px',
          bottom: '-100px',
          right: '-80px',
          background: `radial-gradient(circle at 60% 60%, ${to}, ${from})`,
          filter: 'blur(70px)',
          animationDelay: '2s',
        }}
      />
      {/* Orb 3 — center subtle */}
      <div
        className="absolute rounded-full animate-breathe opacity-30"
        style={{
          width: '300px',
          height: '300px',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${from}, transparent)`,
          filter: 'blur(80px)',
          animationDelay: '1s',
        }}
      />
    </div>
  )
}
