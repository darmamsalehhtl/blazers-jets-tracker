import type { TeamRef } from './espn'

export interface StandingStat {
  name: string
  type: string
  abbreviation?: string
  displayName?: string
  shortDisplayName?: string
  displayValue: string
  value?: number
}

export interface StandingEntry {
  team: TeamRef
  stats: StandingStat[]
}

export interface StandingsNode {
  name: string
  abbreviation?: string
  children?: StandingsNode[]
  standings?: { entries: StandingEntry[] }
}

export const sv = (e: StandingEntry, type: string) => e.stats.find((s) => s.type === type)?.displayValue ?? '–'
export const sn = (e: StandingEntry, type: string) => {
  const s = e.stats.find((x) => x.type === type)
  return s?.value ?? parseFloat(s?.displayValue ?? '')
}

/** Leaf groups (divisions at level=3, conferences otherwise), sorted best-first. */
export function leafGroups(root: StandingsNode): { name: string; parent?: string; entries: StandingEntry[] }[] {
  const out: { name: string; parent?: string; entries: StandingEntry[] }[] = []
  const walk = (n: StandingsNode, parent?: string) => {
    if (n.standings?.entries?.length) out.push({ name: n.name, parent, entries: sortEntries(n.standings.entries) })
    n.children?.forEach((c) => walk(c, n.name))
  }
  walk(root)
  return out
}

export function sortEntries(entries: StandingEntry[]) {
  return [...entries].sort((a, b) => {
    const seed = (sn(a, 'playoffseed') || 99) - (sn(b, 'playoffseed') || 99)
    const pct = sn(b, 'winpercent') - sn(a, 'winpercent')
    return Number.isFinite(pct) && pct !== 0 ? pct : seed
  })
}

export function findEntry(root: StandingsNode | undefined, teamId: string) {
  if (!root) return undefined
  for (const g of leafGroups(root)) {
    const e = g.entries.find((x) => x.team.id === teamId)
    if (e) return { group: g, entry: e }
  }
  return undefined
}
