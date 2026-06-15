interface NudgeBubbleProps {
  message: string
  onDismiss?: () => void
}

export function NudgeBubble({ message, onDismiss }: NudgeBubbleProps) {
  return (
    <div className="relative inline-block max-w-xs animate-fadeIn">
      {/* Tail pointing upward */}
      <div
        aria-hidden="true"
        className="absolute -top-2 left-6 w-3 h-3"
        style={{
          background: '#2A251D',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        }}
      />
      <div
        className="relative px-4 py-3 rounded-3xl rounded-bl-sm"
        style={{
          backgroundColor: '#2A251D',
          color: '#F2ECE0',
        }}
      >
        <p className="font-body text-sm leading-snug">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss nudge"
            className="absolute top-1 right-2 text-xs opacity-40 hover:opacity-70 transition-opacity"
            style={{ color: '#F2ECE0' }}
          >
            x
          </button>
        )}
      </div>
    </div>
  )
}
