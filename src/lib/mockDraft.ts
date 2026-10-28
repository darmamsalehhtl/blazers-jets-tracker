// Computer mock draft: fills each pick of the live draft order with a prospect
// from ESPN's board, "best available, adjusted for need" (see
// openspec/specs/mock-draft). Prospects and team needs come from
// mock-draft.json (scripts/build-data.mjs); the picks are made here so they
// follow the order the Draft tab shows.

import type { DraftPick } from './draft'

export interface Prospect {
  id: string
  name: string
  pos: string
  /** Position group (QB, RB, WR, TE, OT, IOL, EDGE, DT, LB, CB, S, ST) */
  group: string
  /** ESPN overall rank */
  rank: number | null
  posRank: number | null
  college: string | null
  collegeLogo: string | null
  height: string | null
  weight: string | null
  note: string | null
  url: string | null
}

export interface TeamNeeds {
  /** 0 (no need) … 1 (big need) per position group */
  groups: Record<string, number>
  /** The three biggest needs, biggest first */
  top: string[]
}

export interface MockDraftData {
  available: boolean
  error?: string
  updatedAt: string
  draftYear: number
  prospectCount: number
  /** Best rank first */
  prospects: Prospect[]
  /** ESPN abbreviation → needs */
  needs: Record<string, TeamNeeds>
  missingTeams: string[]
}

export interface MockPick {
  /** null once the board has run out */
  prospect: Prospect | null
  /** Team the pick was made for */
  team: string
  /** The team's top need this pick fills, if any */
  fills: string | null
  /** The pick's owner is unclear; mocked with the original team's needs */
  uncertain: boolean
}

export const MOCK_WEIGHTS = {
  /** Board value of overall rank r: exp(-(r - 1) / boardDecay) */
  boardDecay: 24,
  /** score × (1 + need × needBoost) */
  needBoost: 0.6,
  /** How far past the best available a team may reach: max(minReach, ceil(reachPerPick × overall)) */
  minReach: 6,
  reachPerPick: 0.35,
  /** Need left at a position after a team takes one there (QB: qbAfterPick) */
  afterPick: 0.3,
  qbAfterPick: 0.1,
  /** Below this QB need there's no QB premium; a team with its starter set rarely takes one early */
  qbPremiumNeed: 0.3,
  qbWithoutNeed: 0.7,
  /** Kickers, punters and long snappers wait until this round */
  specialistsFromRound: 5,
}

const POS_VALUE: Record<string, number> = {
  QB: 1.15, EDGE: 1.08, OT: 1.06, CB: 1.04, WR: 1.03, DT: 1, S: 0.95, TE: 0.94, IOL: 0.94, LB: 0.92, RB: 0.9, ST: 0.4,
}

function posValue(group: string, need: number) {
  if (group === 'QB' && need < MOCK_WEIGHTS.qbPremiumNeed) return MOCK_WEIGHTS.qbWithoutNeed
  return POS_VALUE[group] ?? 0.9
}

/**
 * One mock pick per draft pick, in the same order. Deterministic: the same
 * picks and data always give the same mock.
 */
export function mockDraft(picks: DraftPick[], data: MockDraftData): MockPick[] {
  const W = MOCK_WEIGHTS
  const board = data.prospects.map((p, i) => ({ p, r: p.rank ?? i + 1 }))
  const taken = new Set<string>()
  // Needs change as teams pick, so each team gets its own working copy.
  const live = new Map<string, Record<string, number>>()
  const filled = new Map<string, Set<string>>()
  const needsOf = (team: string) => {
    if (!live.has(team)) live.set(team, { ...(data.needs[team]?.groups ?? {}) })
    return live.get(team)!
  }

  const byOverall = new Map<number, MockPick>()
  for (const pick of [...picks].sort((a, b) => a.overall - b.overall)) {
    byOverall.set(pick.overall, choose(pick))
  }
  return picks.map((p) => byOverall.get(p.overall)!)

  function choose(pick: DraftPick): MockPick {
    const uncertain = pick.owner === undefined
    const team = pick.owner ?? pick.original.abbr
    const left = board.filter((b) => !taken.has(b.p.id))
    if (!left.length) return { prospect: null, team, fills: null, uncertain }

    const needs = needsOf(team)
    const best = left[0].r
    const reach = best + Math.max(W.minReach, Math.ceil(W.reachPerPick * pick.overall))
    let pool = left.filter((b) => b.r <= reach && (b.p.group !== 'ST' || pick.round >= W.specialistsFromRound))
    if (!pool.length) pool = left

    let choice = pool[0]
    let top = -Infinity
    for (const b of pool) {
      const need = needs[b.p.group] ?? 0
      const score = Math.exp(-(b.r - 1) / W.boardDecay) * posValue(b.p.group, need) * (1 + W.needBoost * need)
      // Strictly greater: ties keep the better-ranked prospect (pool is in rank order).
      if (score > top) [choice, top] = [b, score]
    }

    const g = choice.p.group
    taken.add(choice.p.id)
    const done = filled.get(team) ?? new Set<string>()
    const fills = data.needs[team]?.top.includes(g) && !done.has(g) ? g : null
    filled.set(team, done.add(g))
    if (needs[g] !== undefined) needs[g] *= g === 'QB' ? W.qbAfterPick : W.afterPick
    return { prospect: choice.p, team, fills, uncertain }
  }
}
