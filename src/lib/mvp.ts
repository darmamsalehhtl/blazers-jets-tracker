// "If the season ended today" MVP races, built by scripts/build-data.mjs (mvp.json).

interface CandidateBase {
  /** ESPN athlete id (null when it couldn't be mapped) */
  id: string | null
  name: string
  team: string
  pos: string
  /** Team record, e.g. "6-1" */
  record: string
  /** Team win % (0–1) */
  win: number
  /** 0–100 */
  score: number
  rank: number
  /** Score points behind the leader */
  gap: number
  /** Biggest factor behind the score, in words */
  reason: string
}

export interface NflCandidate extends CandidateBase {
  /** Total EPA (passing + rushing, or receiving + rushing) */
  epa: number
  stats: {
    games: number
    passYds: number
    passTd: number
    ints: number
    rushYds: number
    rushTd: number
    recYds: number
    recTd: number
    fumLost: number
    rec: number
    car: number
  }
}

export interface NbaCandidate extends CandidateBase {
  /** Below pace for the 65-game award minimum */
  atRisk: boolean
  gameScore: number
  stats: { games: number; teamGames: number; mpg: number; ppg: number; rpg: number; apg: number; spg: number; bpg: number; ts: number }
}

export type OursSummary<C> = { none: true } | { none?: undefined; rank: number; inTop: boolean; candidate?: C }

interface LeagueBase<C> {
  available: true
  season: number
  /** "Week 7" (NFL) or "12 games" (NBA, median team games) */
  through: string
  smallSample: boolean
  poolSize: number
  candidates: C[]
  ours: OursSummary<C>
}

export type MvpLeague<C> = LeagueBase<C> | { available: false; error: string }

export interface MvpData {
  updatedAt: string
  nfl: MvpLeague<NflCandidate> & { min?: { dropbacks: number; touches: number } }
  nba: MvpLeague<NbaCandidate> & { seasonLabel?: string; lgTs?: number }
}
