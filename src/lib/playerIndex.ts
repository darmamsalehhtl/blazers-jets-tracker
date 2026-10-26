// Player search index (players-nfl.json / players-nba.json from scripts/build-data.mjs)
// and the name matcher used by the team-page search.

export type MvpStanding =
  | { rank: number; of: number; score: number; gap: number; atRisk?: boolean; reason?: undefined }
  | { reason: string; rank?: undefined }

export interface IndexedPlayer {
  id: string
  name: string
  pos: string
  team: string
  mvp: MvpStanding
}

export interface PlayerIndex {
  available: boolean
  error?: string
  updatedAt: string
  league: 'nfl' | 'nba'
  season?: number
  ranked: number
  leader?: string
  mvpError?: string
  missingTeams: string[]
  players: IndexedPlayer[]
}

/** Lowercase, accents and punctuation stripped: "Luka Dončić" → "luka doncic". Same rules as the build. */
export function normName(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.'’-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface SearchResult {
  players: IndexedPlayer[]
  /** Matches beyond the ones returned */
  more: number
}

/**
 * Every typed word must be the start of one of the name's words, or the whole
 * query the start of the full name. Ordered by match quality (full-name prefix,
 * then last-name prefix, then the rest), then ranked players by MVP rank.
 */
export function searchPlayers(players: IndexedPlayer[], query: string, limit = 8): SearchResult {
  const q = normName(query)
  if (q.replace(/ /g, '').length < 2) return { players: [], more: 0 }
  const qTokens = q.split(' ')
  const hits: { p: IndexedPlayer; tier: number }[] = []
  for (const p of players) {
    const name = normName(p.name)
    const tokens = name.split(' ')
    const full = name.startsWith(q)
    if (!full && !qTokens.every((t) => tokens.some((n) => n.startsWith(t)))) continue
    const tier = full ? 0 : tokens.slice(1).some((n) => n.startsWith(qTokens[0])) ? 1 : 2
    hits.push({ p, tier })
  }
  hits.sort(
    (a, b) =>
      a.tier - b.tier ||
      (a.p.mvp.rank ?? Infinity) - (b.p.mvp.rank ?? Infinity) ||
      a.p.name.localeCompare(b.p.name),
  )
  return { players: hits.slice(0, limit).map((h) => h.p), more: Math.max(0, hits.length - limit) }
}
