// Types + parsing for ESPN athlete endpoints (bio, gamelog, splits).

import type { AthleteRef, Logo, TeamRef } from './espn'

export interface AthleteBio {
  athlete: AthleteRef & {
    fullName?: string
    displayHeight?: string
    displayWeight?: string
    displayDOB?: string
    age?: number
    displayJersey?: string
    displayExperience?: string
    displayDraft?: string
    displayBirthPlace?: string
    college?: { name?: string }
    team?: TeamRef & { logos?: Logo[] }
    status?: { name?: string; type?: string }
    injuries?: { status: string; date?: string; details?: { type?: string; detail?: string; returnDate?: string } }[]
    statsSummary?: {
      displayName: string
      statistics: { name: string; displayName: string; abbreviation?: string; displayValue: string; rank?: number; rankDisplayValue?: string }[]
    }
  }
}

interface GamelogEventMeta {
  id: string
  atVs: string
  gameDate: string
  score: string
  gameResult?: string
  week?: number
  eventNote?: string
  opponent: { id: string; abbreviation: string; displayName: string; logo?: string }
}

export interface GamelogResponse {
  labels: string[]
  names?: string[]
  displayNames?: string[]
  categories?: { name: string; displayName: string; count: number }[]
  filters?: { name: string; value?: string; options: { value: string; displayValue: string }[] }[]
  events: Record<string, GamelogEventMeta>
  seasonTypes: {
    displayName: string
    categories: { displayName?: string; type: string; events?: { eventId: string; stats: string[] }[] }[]
    summary?: { stats: { displayName: string; stats: string[] }[] }
  }[]
}

export interface GameRow extends GamelogEventMeta {
  seasonType: string
  stats: string[]
}

/** Flatten a gamelog into rows (newest first), each tagged with its season type. */
export function gamelogRows(g: GamelogResponse): GameRow[] {
  const rows: GameRow[] = []
  for (const st of g.seasonTypes ?? []) {
    for (const c of st.categories ?? []) {
      for (const ev of c.events ?? []) {
        const meta = g.events?.[ev.eventId]
        if (meta) rows.push({ ...meta, seasonType: st.displayName, stats: ev.stats })
      }
    }
  }
  return rows.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime())
}

export interface SplitsResponse {
  displayName?: string
  labels: string[]
  names?: string[]
  displayNames?: string[]
  descriptions?: string[]
  categories?: { name: string; displayName: string; count: number }[]
  filters?: { name: string; value?: string; options: { value: string; displayValue: string }[] }[]
  splitCategories: { name: string; displayName: string; splits?: { displayName: string; abbreviation?: string; stats: string[] }[] }[]
}

export function seasonOptions(filters?: { name: string; options: { value: string; displayValue: string }[] }[]) {
  return filters?.find((f) => f.name === 'season')?.options.map((o) => ({ value: Number(o.value), label: o.displayValue })) ?? []
}

/** "7-15" → [7, 15]; "24" → [24, 0] */
export function parsePair(v?: string): [number, number] {
  if (!v) return [0, 0]
  const [a, b] = v.split(/[-/]/).map(Number)
  return [a || 0, b || 0]
}

export function rolling(values: number[], n: number) {
  return values.map((_, i) => {
    const w = values.slice(Math.max(0, i - n + 1), i + 1)
    return w.reduce((a, b) => a + b, 0) / w.length
  })
}
