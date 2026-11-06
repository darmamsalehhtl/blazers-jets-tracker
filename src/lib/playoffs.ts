// Playoff picture: league rules, seeding helpers and (further down) the
// postseason bracket. Seeds are ESPN's `playoffseed`, never re-broken here.

import type { EspnEvent } from './espn'
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

// ---------- Bracket ----------

export interface SeriesTeam {
  id: string
  abbr: string
  seed: number | null
  wins: number
}

/** One matchup: an NBA series, or a single NFL game (wins 0/1). */
export interface Series {
  key: string
  teams: [SeriesTeam, SeriesTeam]
  games: PostseasonGame[]
  /** Best-of length (1 for the NFL and the play-in) */
  bestOf: number
  winner?: string
  live: boolean
}

export interface Slot {
  series?: Series
  /** Shown while the matchup isn't set, e.g. "Winner of 4 v 5" */
  placeholder?: string
  /** Known side(s) of an unset matchup, e.g. the 1 seed waiting for the play-in */
  known?: { abbr: string; seed: number | null }[]
}

export interface BracketRound {
  name: string
  /** Per conference abbreviation, or 'final' for the championship */
  byConf: Record<string, Slot[]>
}

export interface Bracket {
  league: League
  label: string
  confs: string[]
  /** NBA play-in games per conference */
  playIn: Record<string, Series[]>
  /** NFL first-round byes per conference */
  byes: Record<string, { abbr: string; seed: number | null }[]>
  rounds: BracketRound[]
  final: Slot
  champion?: string
}

const NBA_ROUND_NOTES: [RegExp, number][] = [
  [/1st Round/i, 0],
  [/Semifinals/i, 1],
  [/(East|West)(ern Conference)? Finals/i, 2],
  [/NBA Finals/i, 3],
]
const NFL_ROUND_NOTES: [RegExp, number][] = [
  [/Wild Card/i, 0],
  [/Divisional/i, 1],
  [/Championship/i, 2],
  [/Super Bowl/i, 3],
]

function roundFromNote(league: League, note: string): number | undefined {
  return (league === 'nba' ? NBA_ROUND_NOTES : NFL_ROUND_NOTES).find(([re]) => re.test(note))?.[1]
}

/** Scoreboard event → bracket game (same shape the build writes). */
export function toPostseasonGame(e: EspnEvent): PostseasonGame {
  const c = e.competitions[0]
  const series = c.series?.type === 'playoff' ? c.series : undefined
  return {
    id: e.id,
    date: e.date,
    seasonType: e.season?.type ?? 3,
    note: c.notes?.[0]?.headline ?? '',
    state: c.status.type.state,
    detail: c.status.type.shortDetail,
    teams: c.competitors.map((t) => ({
      id: t.team.id,
      abbr: t.team.abbreviation,
      home: t.homeAway === 'home',
      score: t.score === undefined || t.score === '' ? null : Number(typeof t.score === 'string' ? t.score : t.score.value ?? t.score.displayValue),
      winner: t.winner ?? false,
      seriesWins: series?.competitors?.find((s) => s.id === t.team.id)?.wins ?? null,
    })),
    series: series ? { summary: series.summary ?? '', completed: !!series.completed, total: series.totalCompetitions ?? 7 } : undefined,
  }
}

/** Precomputed games with today's scoreboard laid over them (newer state wins by id). */
export function mergeGames(base: PostseasonGame[], live: EspnEvent[] | undefined): PostseasonGame[] {
  const byId = new Map(base.map((g) => [g.id, g]))
  for (const e of live ?? []) {
    const t = e.season?.type
    if (t !== 3 && t !== 5) continue
    const g = toPostseasonGame(e)
    if (g.teams.length === 2 && g.teams.every((x) => x.abbr && x.abbr !== 'TBD')) byId.set(g.id, g)
  }
  return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function makeSeries(games: PostseasonGame[], seeds: PlayoffsLeague['postseason']['seeds'], bestOf: number): Series {
  const first = games[0]
  const [a, b] = first.teams
  const last = [...games].reverse().find((g) => g.teams.every((t) => t.seriesWins !== null))
  const counted = (id: string) => games.filter((g) => g.state === 'post' && g.teams.find((t) => t.id === id)?.winner).length
  const side = (t: PostseasonTeam): SeriesTeam => ({
    id: t.id,
    abbr: t.abbr,
    seed: seeds[t.abbr]?.seed ?? null,
    wins: Math.max(counted(t.id), last?.teams.find((x) => x.id === t.id)?.seriesWins ?? 0),
  })
  // Higher seed first.
  const teams = [side(a), side(b)].sort((x, y) => (x.seed ?? 99) - (y.seed ?? 99)) as [SeriesTeam, SeriesTeam]
  const need = Math.ceil(bestOf / 2)
  const winner = teams.find((t) => t.wins >= need)?.abbr
  return {
    key: games.map((g) => g.id).join('-'),
    teams,
    games,
    bestOf,
    winner,
    live: games.some((g) => g.state === 'in'),
  }
}

const pairKey = (g: PostseasonGame) => g.teams.map((t) => t.abbr).sort().join('|')

/** Build the bracket for one league's postseason. */
export function buildBracket(league: League, post: PlayoffsLeague['postseason'], games: PostseasonGame[]): Bracket {
  const rules = PLAYOFF_RULES[league]
  const seeds = post.seeds
  const confOf = (abbr: string) => seeds[abbr]?.conf
  const confs = [...new Set(Object.values(seeds).map((s) => s.conf))].sort()
  const seedTeam = (conf: string, seed: number) => {
    const abbr = Object.keys(seeds).find((k) => seeds[k].conf === conf && seeds[k].seed === seed)
    return abbr ? { abbr, seed } : undefined
  }

  // Play-in: every game is its own one-game "series".
  const playIn: Record<string, Series[]> = {}
  for (const g of games.filter((x) => x.seasonType === 5)) {
    const conf = confOf(g.teams[0].abbr)
    if (conf) (playIn[conf] ??= []).push(makeSeries([g], seeds, 1))
  }

  // Group playoff games into matchups by round and team pair.
  const bestOf = league === 'nba' ? 7 : 1
  const groups = new Map<string, { round: number; games: PostseasonGame[] }>()
  const history = new Map<string, number>()
  for (const g of games.filter((x) => x.seasonType === 3)) {
    const pk = pairKey(g)
    const existing = [...groups.entries()].find(([k]) => k.endsWith(`#${pk}`))
    if (existing && league === 'nba') {
      existing[1].games.push(g)
      continue
    }
    // Fallback when the note is unfamiliar: a team's n-th matchup is round n.
    const round = roundFromNote(league, g.note) ?? Math.max(...g.teams.map((t) => history.get(t.abbr) ?? 0))
    for (const t of g.teams) history.set(t.abbr, round + 1)
    groups.set(`${round}#${pk}`, { round, games: [g] })
  }
  const matchups = [...groups.values()].map((m) => ({ round: m.round, series: makeSeries(m.games, seeds, bestOf) }))

  const rounds: BracketRound[] = rules.rounds.map((name) => ({ name, byConf: {} }))
  for (const conf of confs) {
    const inConf = (r: number) =>
      matchups.filter((m) => m.round === r && m.series.teams.every((t) => confOf(t.abbr) === conf)).map((m) => m.series)
    rounds.forEach((round, r) => {
      round.byConf[conf] = league === 'nba' ? nbaSlots(r, inConf(r), conf, seedTeam) : nflSlots(r, inConf(r), conf, seedTeam)
    })
  }

  const finalSeries = matchups.find((m) => m.round === rules.rounds.length)?.series
  const finalSlot: Slot = finalSeries
    ? { series: finalSeries }
    : { placeholder: `${confs.join(' vs ')} champions` }
  const byes: Record<string, { abbr: string; seed: number | null }[]> = {}
  for (const conf of confs)
    byes[conf] = Array.from({ length: rules.byes }, (_, i) => seedTeam(conf, i + 1)).filter((x): x is { abbr: string; seed: number } => !!x)

  return { league, label: post.label, confs, playIn, byes, rounds, final: finalSlot, champion: finalSeries?.winner }
}

type SeedTeam = (conf: string, seed: number) => { abbr: string; seed: number } | undefined

/** NBA: fixed tree. First round 1v8, 4v5, 3v6, 2v7; each later slot joins two neighbours. */
function nbaSlots(round: number, series: Series[], conf: string, seedTeam: SeedTeam): Slot[] {
  const first = PLAYOFF_RULES.nba.firstRound
  const size = first.length >> round
  const span = 1 << round
  return Array.from({ length: size }, (_, i) => {
    const pairs = first.slice(i * span, (i + 1) * span)
    const covered = new Set(pairs.flat())
    // Match on the series' top seed: a play-in team keeps its 7–10 standings seed, which can sit in another slot's range.
    const topSeed = (x: Series) => Math.min(...x.teams.map((t) => t.seed ?? 99))
    const s = series.find((x) => covered.has(topSeed(x))) ?? series.find((x) => x.teams.some((t) => t.seed !== null && covered.has(t.seed)))
    if (s) return { series: s }
    if (round === 0) {
      const [high, low] = pairs[0]
      const h = seedTeam(conf, high)
      const l = low <= PLAYOFF_RULES.nba.seeds ? seedTeam(conf, low) : undefined
      return {
        known: [h, l].filter((x): x is { abbr: string; seed: number } => !!x),
        placeholder: l ? undefined : `${high} vs ${low}th seed (play-in)`,
      }
    }
    const half = (k: number) => pairs.slice(k * (span / 2), (k + 1) * (span / 2)).map((p) => p.join('/')).join(', ')
    return { placeholder: `Winner of ${half(0)} vs winner of ${half(1)}` }
  })
}

/** NFL: Wild Card 2v7, 3v6, 4v5; later rounds re-seed, so slots follow the highest seed left. */
function nflSlots(round: number, series: Series[], conf: string, seedTeam: SeedTeam): Slot[] {
  const top = (s: Series) => Math.min(...s.teams.map((t) => t.seed ?? 99))
  if (round === 0) {
    return PLAYOFF_RULES.nfl.firstRound.map(([high, low]) => {
      const s = series.find((x) => x.teams.some((t) => t.seed === high || t.seed === low))
      if (s) return { series: s }
      return { known: [seedTeam(conf, high), seedTeam(conf, low)].filter((x): x is { abbr: string; seed: number } => !!x) }
    })
  }
  const count = round === 1 ? 2 : 1
  const sorted = [...series].sort((a, b) => top(a) - top(b))
  const holders = round === 1 ? ['1 seed vs lowest seed left', 'Other two Wild Card winners'] : ['Divisional winners']
  return Array.from({ length: count }, (_, i) => (sorted[i] ? { series: sorted[i] } : { placeholder: holders[i] }))
}
