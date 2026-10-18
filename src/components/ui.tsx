import type { ReactNode } from 'react'
import { timeAgo } from '../lib/format'

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
      {live ? 'Auto-updating · ' : ''}updated {timeAgo(at)}
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
