interface WeekDotsProps {
  dots: boolean[]
  todayIndex: number // 0=Mon, 6=Sun
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function WeekDots({ dots, todayIndex }: WeekDotsProps) {
  return (
    <div className="flex items-center gap-2" role="list" aria-label="Week progress">
      {dots.map((done, i) => {
        const isToday = i === todayIndex
        const isFuture = !done && i > todayIndex

        return (
          <div
            key={i}
            role="listitem"
            aria-label={`${DAY_LABELS[i]}: ${done ? 'done' : isToday ? 'today' : 'upcoming'}`}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-2.5 h-2.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: done
                  ? '#2A251D'
                  : isFuture
                  ? 'rgba(42, 37, 29, 0.15)'
                  : 'rgba(42, 37, 29, 0.2)',
                boxShadow: isToday && !done
                  ? '0 0 0 2px #2A251D'
                  : undefined,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
