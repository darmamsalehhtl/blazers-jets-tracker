import type { MouseEvent, ReactNode } from 'react'
import { sides, scoreText, type EspnEvent } from '../lib/espn'
import { useSpoilers } from '../lib/spoilers'

export function Card({
  title,
  right,
  children,
  className = '',
  pad = true,
}: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  pad?: boolean
}) {
  return (
    <section className={`rounded-2xl border border-border bg-surface ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
          <h3 className="text-[13px] font-semibold tracking-wide text-muted uppercase">{title}</h3>
          {right && <div className="text-xs text-muted">{right}</div>}
        </header>
      )}
      <div className={pad ? 'px-4 pb-4' : 'pb-1'}>{children}</div>
    </section>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-text" />
      {label}…
    </div>
  )
}

export function ErrorBox({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <div className="rounded-xl border border-bad/40 bg-bad/10 p-4 text-sm">
      <p className="font-medium text-bad">Couldn't load data</p>
      <p className="mt-1 text-muted">{error.message}</p>
      {retry && (
        <button onClick={retry} className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium">
          Try again
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>
}

export function LiveBadge({ label = 'LIVE' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-[11px] font-bold tracking-wider text-live">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-live" />
      {label}
    </span>
  )
}

export function Updated({ at, live }: { at?: Date; live?: boolean }) {
  if (!at) return null
  return (
    <span className="text-[11px] text-muted">
      {live ? 'Auto-updating every 20s · ' : ''}updated {at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

export function Logo({ src, alt, size = 32 }: { src?: string; alt: string; size?: number }) {
  if (!src) return <span style={{ width: size, height: size }} className="inline-block rounded-full bg-surface-2" />
  return <img src={src} alt={alt} width={size} height={size} loading="lazy" className="object-contain" style={{ width: size, height: size }} />
}

export function Headshot({ src, alt, size = 40 }: { src?: string; alt: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-end justify-center overflow-hidden rounded-full bg-surface-2"
      style={{ width: size, height: size }}
    >
      {src && <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />}
    </span>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <div className="flex w-max gap-1 rounded-xl bg-surface-2 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              value === t.id ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label?: string
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted">
      {label}
      <select
        value={String(value)}
        onChange={(e) => {
          const o = options.find((x) => String(x.value) === e.target.value)
          if (o) onChange(o.value)
        }}
        className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-text"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <div className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-0.5 text-xl font-semibold">{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  )
}

/**
 * A finished game's result from the team's side, or null while spoilers hide it.
 * Pre and live games always return their (live) score; result is only set once final.
 */
export function useGameResult(event: EspnEvent, teamId: string) {
  const { canShow } = useSpoilers()
  const comp = event.competitions[0]
  const state = comp.status.type.state
  if (!canShow({ id: event.id, state })) return null
  const { us, them } = sides(comp, teamId)
  const result = comp.status.type.completed ? (us.winner ? 'W' : them.winner ? 'L' : 'T') : null
  return { us, them, result, score: `${scoreText(us.score)}-${scoreText(them.score)}` } as const
}

/** Stand-in for a hidden final score: reveals just this game, in place. */
export function HiddenScore({ id, final = false }: { id: string; final?: boolean }) {
  const { reveal } = useSpoilers()
  const onClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    reveal(id)
  }
  return (
    <span className="inline-flex items-center gap-2">
      {final && <span className="text-xs font-medium text-muted">Final</span>}
      <button
        type="button"
        onClick={onClick}
        className="min-w-[4.5rem] rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-muted hover:bg-surface-2 hover:text-text"
      >
        Show score
      </button>
    </span>
  )
}

/** Placeholder for a whole section that would give results away. */
export function SpoilerNote({ what }: { what: string }) {
  const { toggle } = useSpoilers()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-3 text-sm">
      <span className="text-muted">
        <EyeOffIcon /> {what} hidden while spoilers are off
      </span>
      <button type="button" onClick={toggle} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2">
        Show spoilers
      </button>
    </div>
  )
}

export function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-3px]">
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-2.16 3.19M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M2 2l20 20" />
    </svg>
  )
}
