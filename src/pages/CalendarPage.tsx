import { useSearchParams } from 'react-router-dom'
import { Card } from '../components/ui'
import { isDayKey, isMonthKey, monthGrid, parseMonth, shiftMonth, today, type DayKey } from '../lib/calendar'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Format a day key as a date, without the browser's time zone moving it. */
function dayLabel(d: DayKey, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' })
}

/**
 * Every NFL and NBA game by date. The URL holds the picked day (`d`), the
 * month on screen if it differs from the day's (`m`) and the open game (`g`).
 */
export default function CalendarPage() {
  const [params, setParams] = useSearchParams()
  const todayKey = today()
  const d = params.get('d')
  const day = isDayKey(d) ? d : todayKey
  const m = params.get('m')
  const month = isMonthKey(m) ? m : day.slice(0, 7)

  const update = (next: Record<string, string | undefined>, replace: boolean) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined) p.delete(k)
      else p.set(k, v)
    }
    setParams(p, { replace })
  }
  // A new day is a history entry (back returns to the last one); paging months isn't.
  const pickDay = (k: DayKey) => k !== day && update({ d: k, m: undefined, g: undefined }, false)
  const showMonth = (k: string) => update({ m: k === day.slice(0, 7) ? undefined : k }, true)
  const goToday = () => update({ d: todayKey, m: undefined, g: undefined }, day === todayKey)

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted">Every NFL and NBA game by date. Pick a day, then a game for all its stats.</p>
      </div>
      <div className="grid items-start gap-3 md:grid-cols-[22rem_minmax(0,1fr)]">
        <MonthGrid month={month} day={day} todayKey={todayKey} onPick={pickDay} onMonth={showMonth} onToday={goToday} />
        <Card title={dayLabel(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}>
          <p className="text-sm text-muted">Games load here.</p>
        </Card>
      </div>
    </div>
  )
}

function MonthGrid({
  month,
  day,
  todayKey,
  onPick,
  onMonth,
  onToday,
}: {
  month: string
  day: DayKey
  todayKey: DayKey
  onPick: (d: DayKey) => void
  onMonth: (m: string) => void
  onToday: () => void
}) {
  const [y, mo] = parseMonth(month)
  const title = new Date(Date.UTC(y, mo - 1, 15)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return (
    <section className="rounded-2xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-1">
        <h2 className="mr-auto pl-1 font-semibold" aria-live="polite">
          {title}
        </h2>
        <button type="button" onClick={onToday} className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-2">
          Today
        </button>
        <NavButton label="Previous month" onClick={() => onMonth(shiftMonth(month, -1))} d="M15 18l-6-6 6-6" />
        <NavButton label="Next month" onClick={() => onMonth(shiftMonth(month, 1))} d="M9 18l6-6-6-6" />
      </div>
      <div role="grid" aria-label={title} className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={i} role="columnheader" className="pb-1 text-[11px] font-semibold text-muted">
            {w}
          </div>
        ))}
        {monthGrid(month)
          .flat()
          .map((c) => {
            const selected = c.key === day
            const isToday = c.key === todayKey
            return (
              <button
                key={c.key}
                type="button"
                role="gridcell"
                aria-selected={selected}
                aria-current={isToday ? 'date' : undefined}
                aria-label={dayLabel(c.key, { weekday: 'long', month: 'long', day: 'numeric' })}
                onClick={() => onPick(c.key)}
                className={`flex h-12 flex-col items-center justify-start rounded-lg pt-1 text-sm tabular-nums ${
                  selected ? 'bg-text text-bg' : 'hover:bg-surface-2'
                } ${c.outside && !selected ? 'text-muted/60' : ''}`}
              >
                <span className={isToday && !selected ? 'rounded-full px-1.5 font-bold ring-1 ring-text' : isToday ? 'font-bold' : ''}>{c.day}</span>
              </button>
            )
          })}
      </div>
    </section>
  )
}

function NavButton({ label, onClick, d }: { label: string; onClick: () => void; d: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </button>
  )
}
