import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl bg-white/70 backdrop-blur-md shadow-sm p-6 ${className}`}
    >
      {children}
    </div>
  )
}
