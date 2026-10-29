// Date helpers for the Calendar tab. A "day" is always ESPN's game day, the
// US Eastern date its scoreboard files a game under (`?dates=YYYYMMDD`), so a
// 7 pm PT tip-off (02:00Z the next day) lands on the date it was played.

import type { League } from './teams'

/** `YYYY-MM-DD` */
export type DayKey = string

const eastern = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })

/** The Eastern date of a moment (en-CA formats as YYYY-MM-DD). */
export function easternDay(at: string | Date | number): DayKey {
  return eastern.format(new Date(at))
}

export const today = () => easternDay(Date.now())

/** `YYYY-MM-DD` → `YYYYMMDD` for ESPN's scoreboard. */
export const espnDate = (d: DayKey) => d.replaceAll('-', '')

export function isDayKey(s: string | null | undefined): s is DayKey {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`))
}

export function isMonthKey(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s)
}

const pad = (n: number) => String(n).padStart(2, '0')
export const dayKey = (y: number, m: number, d: number): DayKey => `${y}-${pad(m)}-${pad(d)}`

/** `YYYY-MM` → [year, month 1-12] */
export function parseMonth(m: string): [number, number] {
  const [y, mo] = m.split('-').map(Number)
  return [y, mo]
}

export function shiftMonth(m: string, by: number): string {
  const [y, mo] = parseMonth(m)
  const d = new Date(Date.UTC(y, mo - 1 + by, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

export interface GridDay {
  key: DayKey
  day: number
  /** Padding day from the month before or after */
  outside: boolean
}

/** The month as Sunday-first weeks, padded with the neighbouring months' days. */
export function monthGrid(month: string): GridDay[][] {
  const [y, mo] = parseMonth(month)
  const first = new Date(Date.UTC(y, mo - 1, 1))
  const start = new Date(first)
  start.setUTCDate(1 - first.getUTCDay())
  const weeks: GridDay[][] = []
  const d = new Date(start)
  do {
    const week: GridDay[] = []
    for (let i = 0; i < 7; i++) {
      week.push({
        key: dayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()),
        day: d.getUTCDate(),
        outside: d.getUTCMonth() !== mo - 1,
      })
      d.setUTCDate(d.getUTCDate() + 1)
    }
    weeks.push(week)
  } while (d.getUTCMonth() === mo - 1)
  return weeks
}

export interface ScheduleQuery {
  season: number
  type: number
}

/**
 * Which team-schedule seasons and types can have games in this month.
 * NFL seasons are named for the year they start (Sep–Feb), NBA seasons for
 * the year they end (Oct–Jun). Months without games give none.
 */
export function scheduleQueries(league: League, month: string): ScheduleQuery[] {
  const [y, mo] = parseMonth(month)
  if (league === 'nfl') {
    if (mo >= 3 && mo <= 7) return []
    const season = mo <= 2 ? y - 1 : y
    if (mo === 8) return [{ season, type: 1 }]
    if (mo === 9) return [1, 2].map((type) => ({ season, type }))
    if (mo <= 2) return [2, 3].map((type) => ({ season, type }))
    return [{ season, type: 2 }]
  }
  if (mo >= 7 && mo <= 9) return []
  const season = mo >= 10 ? y + 1 : y
  if (mo === 10) return [1, 2].map((type) => ({ season, type }))
  if (mo >= 4) return [2, 3].map((type) => ({ season, type }))
  return [{ season, type: 2 }]
}
