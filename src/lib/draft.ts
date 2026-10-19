// Live NFL draft order: "if the season ended today", from current standings,
// strength of schedule and every traded pick (see scripts/build-data.mjs).

import type { TeamRef } from './espn'
import { leafGroups, sn, type StandingsNode } from './standings'

export interface DraftTrade {
  round: number
  /** Team the pick originally belonged to */
  from: string
  /** Current owner */
  to: string
  via: string[]
  conditional: boolean
  /** `to` gets whichever of `from`'s picks in this round comes first */
  earlierOf: boolean
}

export interface DraftData {
  available: boolean
  error?: string
  updatedAt: string
  season: number
  draftYear: number
  /** Each team's 17 regular-season opponents (ESPN abbreviations, repeats included) */
  opponents: Record<string, string[]>
  trades: DraftTrade[]
  tradesSource: 'wikipedia' | 'snapshot'
}

export interface DraftTeam {
  team: TeamRef
  abbr: string
  wins: number
  losses: number
  ties: number
  pct: number
  sos: number
  seed: number | null
  playoff: boolean
}

export interface DraftPick {
  round: number
  pick: number
  overall: number
  /** Original team (whose record sets the slot) */
  original: DraftTeam
  /** Current owner; undefined when sources disagree about where it went */
  owner: string | undefined
  candidates: string[]
  conditional: boolean
  via: string[]
  /** Shares record and SOS with a neighbour: decided by tiebreakers / coin flip */
  tied: boolean
}

const PLAYOFF_SEEDS = 7

export function draftTeams(standings: StandingsNode, opponents: Record<string, string[]>): DraftTeam[] {
  const entries = leafGroups(standings).flatMap((g) => g.entries)
  const base = entries.map((e) => {
    const wins = sn(e, 'wins') || 0
    const losses = sn(e, 'losses') || 0
    const ties = sn(e, 'ties') || 0
    const seed = sn(e, 'playoffseed')
    return { team: e.team, abbr: e.team.abbreviation, wins, losses, ties, seed: Number.isFinite(seed) && seed > 0 ? seed : null }
  })
  const byAbbr = new Map(base.map((t) => [t.abbr, t]))
  return base.map((t) => {
    const games = t.wins + t.losses + t.ties
    // Strength of schedule: combined record of all 17 opponents (repeats count twice).
    let w = 0
    let g = 0
    for (const o of opponents[t.abbr] ?? []) {
      const r = byAbbr.get(o)
      if (!r) continue
      w += r.wins + r.ties / 2
      g += r.wins + r.losses + r.ties
    }
    return {
      ...t,
      pct: games ? (t.wins + t.ties / 2) / games : 0.5,
      sos: g ? w / g : 0.5,
      playoff: t.seed !== null && t.seed <= PLAYOFF_SEEDS,
    }
  })
}

/**
 * Non-playoff teams pick first (worst record first, then weakest strength of
 * schedule), then teams currently in a playoff spot in the same way.
 */
export function draftOrder(teams: DraftTeam[]): { team: DraftTeam; tied: boolean }[] {
  const cmp = (a: DraftTeam, b: DraftTeam) => Number(a.playoff) - Number(b.playoff) || a.pct - b.pct || a.sos - b.sos
  const sorted = [...teams].sort((a, b) => cmp(a, b) || a.abbr.localeCompare(b.abbr))
  const same = (a?: DraftTeam, b?: DraftTeam) => !!a && !!b && cmp(a, b) === 0
  return sorted.map((t, i) => ({ team: t, tied: same(t, sorted[i - 1]) || same(t, sorted[i + 1]) }))
}

export function draftBoard(order: { team: DraftTeam; tied: boolean }[], trades: DraftTrade[], rounds = 7): DraftPick[] {
  const n = order.length
  const out: DraftPick[] = []
  for (let round = 1; round <= rounds; round++) {
    const inRound = trades.filter((t) => t.round === round)
    const picks: DraftPick[] = order.map(({ team, tied }, i) => {
      const moves = inRound.filter((t) => t.from === team.abbr)
      const firm = moves.filter((t) => !t.conditional)
      const use = firm.length ? firm : moves
      const candidates = [...new Set(use.map((t) => t.to))]
      return {
        round,
        pick: i + 1,
        overall: (round - 1) * n + i + 1,
        original: team,
        owner: candidates.length === 0 ? team.abbr : candidates.length === 1 ? candidates[0] : undefined,
        candidates,
        conditional: !firm.length && moves.length > 0,
        via: use.length === 1 ? use[0].via : [],
        tied,
      }
    })
    // "Whichever is earlier": e.g. the Jets get the earlier of Dallas' own and
    // Green Bay's first-rounder, Dallas keeps the other.
    for (const t of inRound.filter((x) => x.earlierOf)) {
      const own = picks.find((p) => p.original.abbr === t.from)
      const other = picks.find((p) => p !== own && p.owner === t.from)
      if (!own || !other) continue
      const [early, late] = own.pick < other.pick ? [own, other] : [other, own]
      early.owner = t.to
      late.owner = t.from
    }
    out.push(...picks)
  }
  return out
}
