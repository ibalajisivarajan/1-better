import { useRef, useState, useCallback } from 'react'

interface HoldButtonProps {
  onComplete: () => void
  disabled?: boolean
}

const HOLD_DURATION = 1500 // 1.5 seconds

export function HoldButton({ onComplete, disabled = false }: HoldButtonProps) {
  const [fillPercent, setFillPercent] = useState(0)
  const [holding, setHolding] = useState(false)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const completedRef = useRef(false)

  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    startTimeRef.current = null
    setHolding(false)
    setFillPercent(0)
    completedRef.current = false
  }, [])

  const tick = useCallback(() => {
    if (startTimeRef.current === null) return

    const elapsed = Date.now() - startTimeRef.current
    const pct = Math.min(100, (elapsed / HOLD_DURATION) * 100)
    setFillPercent(pct)

    if (pct >= 100 && !completedRef.current) {
      completedRef.current = true
      setHolding(false)
      setFillPercent(100)
      onComplete()
      return
    }

    if (pct < 100) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [onComplete])

  const startHold = useCallback(() => {
    if (disabled || completedRef.current) return
    completedRef.current = false
    startTimeRef.current = Date.now()
    setHolding(true)
    setFillPercent(0)
    rafRef.current = requestAnimationFrame(tick)
  }, [disabled, tick])

  const endHold = useCallback(() => {
    if (!holding) return
    cancel()
  }, [holding, cancel])

  return (
    <button
      role="button"
      aria-label="Hold to complete today's habit"
      aria-pressed={fillPercent >= 100}
      disabled={disabled}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onPointerCancel={endHold}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-36 h-36 rounded-full overflow-hidden select-none touch-none outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        backgroundColor: '#2A251D',
        cursor: disabled ? 'not-allowed' : 'pointer',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Fill layer rising from bottom */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-full transition-none"
        style={{
          height: `${fillPercent}%`,
          backgroundColor: 'rgba(242, 236, 224, 0.25)',
          transition: holding ? 'none' : 'height 0.2s ease-out',
        }}
      />

      {/* Label */}
      <span
        className="relative z-10 flex flex-col items-center justify-center w-full h-full"
        style={{ color: '#F2ECE0' }}
      >
        <span className="font-body text-sm font-medium leading-tight text-center px-2">
          {fillPercent >= 100 ? 'Done!' : holding ? 'Keep holding' : 'Hold to complete'}
        </span>
        {holding && fillPercent < 100 && (
          <span className="mt-1 text-xs opacity-60">
            {Math.round(fillPercent)}%
          </span>
        )}
      </span>
    </button>
  )
}
