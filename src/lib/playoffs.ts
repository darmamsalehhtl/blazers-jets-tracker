// Playoff picture: league rules, seeding helpers and (further down) the
// postseason bracket. Seeds are ESPN's `playoffseed`, never re-broken here.

import type { League } from './teams'
import { sn, sv, type StandingEntry, type StandingsNode } from './standings'

export interface PlayoffRules {
  /** Seeds 1..seeds go straight to the playoffs */
  seeds: number
  /** Play-in seeds (inclusive), NBA only */
  playIn?: [number, number]
  /** Top seeds that skip the first round */
  byes: number
  /** Top seeds reserved for division winners */
  divisionLeaders: number
  /** First-round pairings by seed; 0 = winner of the play-in for that slot */
  firstRound: [number, number][]
  /** Round names per conference, final last */
  rounds: string[]
  final: string
}

export const PLAYOFF_RULES: Record<League, PlayoffRules> = {
  nfl: {
    seeds: 7,
    byes: 1,
    divisionLeaders: 4,
    firstRound: [
      [2, 7],
      [3, 6],
      [4, 5],
    ],
    rounds: ['Wild Card', 'Divisional', 'Conference Championship'],
    final: 'Super Bowl',
  },
  nba: {
    seeds: 6,
    playIn: [7, 10],
    byes: 0,
    divisionLeaders: 0,
    firstRound: [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ],
    rounds: ['First Round', 'Conference Semifinals', 'Conference Finals'],
    final: 'NBA Finals',
  },
}

/** ESPN `clincher` codes. Unknown codes are shown as they come. */
export const CLINCH_LABELS: Record<string, string> = {
  z: 'Clinched top seed',
  '*': 'Clinched top seed and bye',
  y: 'Clinched division',
  x: 'Clinched playoff spot',
  pi: 'Clinched play-in spot',
  e: 'Eliminated',
}

export type Tier = 'in' | 'play-in' | 'out'

export function tierOf(league: League, seed: number): Tier {
  const r = PLAYOFF_RULES[league]
  if (seed <= r.seeds) return 'in'
  if (r.playIn && seed <= r.playIn[1]) return 'play-in'
  return 'out'
}

export interface Seeded {
  entry: StandingEntry
  seed: number
  wins: number
  losses: number
  ties: number
  clincher?: string
}

export interface Conference {
  name: string
  abbr: string
  teams: Seeded[]
}

const rec = (e: StandingEntry, type: string) => sn(e, type) || 0

export function seeded(e: StandingEntry, fallbackSeed: number): Seeded {
  const clincher = sv(e, 'clincher')
  return {
    entry: e,
    seed: sn(e, 'playoffseed') || fallbackSeed,
    wins: rec(e, 'wins'),
    losses: rec(e, 'losses'),
    ties: rec(e, 'ties'),
    clincher: clincher === '–' || !clincher ? undefined : clincher,
  }
}

/** Conference standings (level=2) → conferences sorted by seed. */
export function conferences(root: StandingsNode): Conference[] {
  return (root.children ?? []).map((c) => {
    const entries = c.standings?.entries ?? []
    const teams = entries.map((e, i) => seeded(e, 90 + i)).sort((a, b) => a.seed - b.seed)
    return { name: c.name, abbr: c.abbreviation ?? c.name, teams }
  })
}

type Rec = Pick<Seeded, 'wins' | 'losses' | 'ties'>

/** Games `team` trails `ref` by (negative = leads). Ties count half a win and half a loss. */
export function gamesBack(team: Rec, ref: Rec): number {
  const w = (r: Rec) => r.wins + r.ties / 2
  const l = (r: Rec) => r.losses + r.ties / 2
  return (w(ref) - w(team) + (l(team) - l(ref))) / 2
}

export interface Race {
  /** Seed the margin is measured against */
  vs: number
  /** > 0 trails by, < 0 leads by, in games */
  gb: number
  /** What the margin is about, e.g. "playoffs", "play-in" */
  target: 'playoffs' | 'play-in'
}

/**
 * Margin to the nearest cut line: teams outside trail the last seed of the
 * tier above (and NBA teams below the play-in also the play-in); teams inside
 * lead the first team outside their tier.
 */
export function races(league: League, conf: Conference, t: Seeded): Race[] {
  const r = PLAYOFF_RULES[league]
  const at = (seed: number) => conf.teams.find((x) => x.seed === seed)
  const out: Race[] = []
  const push = (vs: number, target: Race['target']) => {
    const ref = at(vs)
    if (ref && ref !== t) out.push({ vs, gb: gamesBack(t, ref), target })
  }
  const tier = tierOf(league, t.seed)
  if (tier === 'in') push(r.playIn ? r.playIn[0] : r.seeds + 1, 'playoffs')
  else if (tier === 'play-in') {
    push(r.seeds, 'playoffs')
    if (r.playIn) push(r.playIn[1] + 1, 'play-in')
  } else {
    push(r.seeds, 'playoffs')
    if (r.playIn) push(r.playIn[1], 'play-in')
  }
  return out
}

export interface Matchup {
  high: number
  low: number
  /** Low seed depends on the play-in */
  tbd?: boolean
}

export interface Projection {
  byes: number[]
  playIn: Matchup[]
  firstRound: Matchup[]
}

/** First-round matchups the current seeds would produce. */
export function projection(league: League): Projection {
  const r = PLAYOFF_RULES[league]
  const byes = Array.from({ length: r.byes }, (_, i) => i + 1)
  const playIn = r.playIn
    ? [
        { high: r.playIn[0], low: r.playIn[0] + 1 },
        { high: r.playIn[0] + 2, low: r.playIn[0] + 3 },
      ]
    : []
  const firstRound = r.firstRound.map(([high, low]) => ({ high, low, tbd: !!r.playIn && low > r.seeds }))
  return { byes, playIn, firstRound }
}

/** "2", "1.5" (sign dropped) */
export function fmtGames(g: number) {
  const a = Math.abs(g)
  if (a === 0) return '0'
  return Number.isInteger(a) ? String(a) : a.toFixed(1)
}

// ---------- Precomputed inputs (public/data/playoffs.json) ----------

export interface RemainingGame {
  opp: string
  /** Kickoff / tip-off (ISO) */
  date: string
}

export interface PostseasonTeam {
  id: string
  abbr: string
  home: boolean
  score: number | null
  winner: boolean
  seriesWins: number | null
}

export interface PostseasonGame {
  id: string
  date: string
  /** 3 = playoffs, 5 = NBA play-in */
  seasonType: number
  note: string
  state: 'pre' | 'in' | 'post'
  detail?: string
  teams: PostseasonTeam[]
  series?: { summary: string; completed: boolean; total: number }
}

export interface PlayoffsLeague {
  available: boolean
  error?: string
  season: number
  remaining: Record<string, RemainingGame[]>
  postseason: {
    season: number
    label: string
    seeds: Record<string, { seed: number | null; conf: string }>
    games: PostseasonGame[]
  }
}

export interface PlayoffsData {
  updatedAt: string
  nfl: PlayoffsLeague
  nba: PlayoffsLeague
}

/** A game counts as played this long after its start, so today's late games stay "left" until they end. */
const PLAYED_AFTER_MS = 4 * 3600_000

export interface Remaining {
  left: number
  /** Average win % of remaining opponents (repeats counted); null without games or data */
  sos: number | null
}

/** Games left and remaining strength of schedule for one team, using live win percentages. */
export function remainingFor(
  games: RemainingGame[] | undefined,
  winPct: Record<string, number>,
  at = Date.now(),
): Remaining | null {
  if (!games) return null
  const left = games.filter((g) => new Date(g.date).getTime() + PLAYED_AFTER_MS > at)
  const pcts = left.map((g) => winPct[g.opp]).filter((p): p is number => Number.isFinite(p))
  return { left: left.length, sos: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null }
}

/** Abbreviation → live win % across all conferences. */
export function winPcts(confs: Conference[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const c of confs)
    for (const t of c.teams) {
      const gp = t.wins + t.losses + t.ties
      out[t.entry.team.abbreviation] = gp ? (t.wins + t.ties / 2) / gp : 0
    }
  return out
}

// ---------- Season phase ----------

/** seeding = regular season; bracket = play-in or playoffs running; offseason = show the last bracket. */
export type Phase = 'seeding' | 'bracket' | 'offseason'

/** Phase from the current scoreboard's season type (ESPN: 1 pre, 2 regular, 3 post, 4 off, 5 play-in). */
export function phaseOf(seasonType: number | undefined): Phase | undefined {
  if (seasonType === undefined) return undefined
  if (seasonType === 2) return 'seeding'
  if (seasonType === 3 || seasonType === 5) return 'bracket'
  return 'offseason'
}
