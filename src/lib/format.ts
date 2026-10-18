export function gameDate(iso: string, opts?: { withTime?: boolean }) {
  const d = new Date(iso)
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  if (opts?.withTime === false) return date
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
}

export function countdown(iso: string, now = Date.now()) {
  let ms = new Date(iso).getTime() - now
  if (ms <= 0) return 'Starting'
  const d = Math.floor(ms / 86_400_000)
  ms -= d * 86_400_000
  const h = Math.floor(ms / 3_600_000)
  ms -= h * 3_600_000
  const m = Math.floor(ms / 60_000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function timeAgo(d: Date | undefined, now = Date.now()) {
  if (!d) return ''
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.round(m / 60)}h ago`
}

export function pct(v: number, digits = 1) {
  return Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : '–'
}

export function num(v: number | undefined, digits = 1) {
  return v !== undefined && Number.isFinite(v) ? v.toFixed(digits) : '–'
}

export function signed(v: number, digits = 1) {
  if (!Number.isFinite(v)) return '–'
  return (v > 0 ? '+' : '') + v.toFixed(digits)
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
