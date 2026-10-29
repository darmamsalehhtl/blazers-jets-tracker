// Types + helpers for ESPN's game `summary` endpoint (both NBA and NFL).

import type { AthleteRef, Competitor, Logo, Situation, Status, TeamRef } from './espn'

export interface SummaryCompetition {
  id: string
  date: string
  competitors: Competitor[]
  status: Status
  broadcasts?: { media?: { shortName?: string }; type?: { shortName?: string } }[]
  situation?: Situation
  neutralSite?: boolean
}

export interface BoxTeamStat {
  name: string
  label: string
  displayValue: string
  value?: number
  abbreviation?: string
}

export interface BoxTeam {
  team: TeamRef
  homeAway?: 'home' | 'away'
  statistics: BoxTeamStat[]
}

export interface BoxAthlete {
  athlete: AthleteRef
  stats: string[]
  starter?: boolean
  didNotPlay?: boolean
  reason?: string
  ejected?: boolean
  active?: boolean
}

export interface BoxGroup {
  name?: string
  text?: string
  keys?: string[]
  labels: string[]
  descriptions?: string[]
  athletes: BoxAthlete[]
  totals?: string[]
}

export interface BoxPlayers {
  team: TeamRef
  statistics: BoxGroup[]
}

export interface Play {
  id: string
  sequenceNumber?: string
  type?: { id?: string; text?: string; abbreviation?: string }
  text: string
  shortText?: string
  awayScore?: number
  homeScore?: number
  period: { number: number; displayValue?: string }
  clock: { displayValue: string; value?: number }
  scoringPlay?: boolean
  scoreValue?: number
  team?: { id: string }
  participants?: { athlete: { id: string } }[]
  shootingPlay?: boolean
  coordinate?: { x: number; y: number }
  pointsAttempted?: number
  // NFL-only
  start?: PlayEnd
  end?: PlayEnd
  statYardage?: number
  isTurnover?: boolean
  isPenalty?: boolean
}

export interface PlayEnd {
  down?: number
  distance?: number
  yardLine?: number
  yardsToEndzone?: number
  downDistanceText?: string
  shortDownDistanceText?: string
  possessionText?: string
  team?: { id: string }
}

export interface Drive {
  id: string
  description: string
  team: TeamRef & { logos?: Logo[] }
  start?: { period?: { number: number }; clock?: { displayValue: string }; yardLine?: number; text?: string }
  end?: { period?: { number: number }; clock?: { displayValue: string }; yardLine?: number; text?: string }
  timeElapsed?: { displayValue: string }
  yards?: number
  isScore?: boolean
  offensivePlays?: number
  result?: string
  displayResult?: string
  shortDisplayResult?: string
  plays: Play[]
}

export interface ScoringPlay {
  id: string
  type: { text: string; abbreviation?: string }
  text: string
  awayScore: number
  homeScore: number
  period: { number: number }
  clock: { displayValue: string }
  team: TeamRef
}

export interface WinProb {
  homeWinPercentage: number
  tiePercentage?: number
  playId: string
}

export interface LeaderGroup {
  team: TeamRef
  leaders: {
    name: string
    displayName: string
    leaders: { displayValue: string; value?: number; athlete: AthleteRef }[]
  }[]
}

export interface InjuryGroup {
  team: TeamRef
  injuries: {
    status: string
    date?: string
    athlete: AthleteRef
    type?: { description?: string; abbreviation?: string }
    details?: { type?: string; location?: string; detail?: string; side?: string; returnDate?: string }
  }[]
}

/** "Right Knee Surgery" from an injury's side/type/detail, skipping blanks and "Not Specified". */
export function injuryLabel(details?: InjuryGroup['injuries'][number]['details']) {
  if (!details) return ''
  return [...new Set([details.side, details.type, details.detail])].filter((x) => x && x !== 'Not Specified').join(' ')
}

export interface PickCenter {
  provider?: { name: string }
  details?: string
  overUnder?: number
  spread?: number
  homeTeamOdds?: { moneyLine?: number; spreadOdds?: number; favorite?: boolean }
  awayTeamOdds?: { moneyLine?: number; spreadOdds?: number; favorite?: boolean }
}

export interface Summary {
  header: { id: string; competitions: SummaryCompetition[]; week?: number; season?: { year: number; type: number } }
  boxscore?: { teams?: BoxTeam[]; players?: BoxPlayers[] }
  plays?: Play[]
  drives?: { current?: Drive; previous?: Drive[] }
  scoringPlays?: ScoringPlay[]
  winprobability?: WinProb[]
  leaders?: LeaderGroup[]
  injuries?: InjuryGroup[]
  pickcenter?: PickCenter[]
  situation?: Situation & { down?: number; distance?: number; yardLine?: number; isRedZone?: boolean }
  gameInfo?: {
    venue?: { fullName: string; address?: { city?: string; state?: string }; grass?: boolean; capacity?: number }
    attendance?: number
    officials?: { displayName: string; position?: { displayName?: string } }[]
    weather?: { displayValue?: string; temperature?: number; conditionId?: string }
  }
  seasonseries?: {
    title?: string
    summary?: string
    seriesScore?: string
    events?: { id: string; date: string; statusType?: { completed?: boolean }; competitors: { team: TeamRef; score?: string; winner?: boolean }[] }[]
  }[]
  news?: { articles?: { headline: string; description?: string; links?: { web?: { href?: string } }; published?: string }[] }
}

/** All plays in order, for NBA (flat list) or NFL (flattened from drives). */
export function allPlays(s: Summary): Play[] {
  if (s.plays?.length) return s.plays
  const drives = [...(s.drives?.previous ?? [])]
  if (s.drives?.current && !drives.some((d) => d.id === s.drives!.current!.id)) drives.push(s.drives.current)
  return drives.flatMap((d) => d.plays ?? [])
}

export interface LiveSituation {
  downDistanceText?: string
  possession?: string
  yardsToEndzone?: number
  distance?: number
  isRedZone?: boolean
  lastPlay?: string
  homeTimeouts?: number
  awayTimeouts?: number
}

const NOT_A_PLAY = /timeout|end (of )?(period|quarter|half|game)|two-minute/i

/**
 * Current NFL down/distance/field position. ESPN's summary usually omits the
 * `situation` block during live games, so fall back to the latest play's end state.
 */
export function liveSituation(s: Summary): LiveSituation | undefined {
  const given = s.situation ?? s.header.competitions[0].situation
  const plays = allPlays(s)
  const last = [...plays].reverse().find((p) => p.end?.team?.id && p.end.down !== undefined)
  const lastReal = [...plays].reverse().find((p) => !NOT_A_PLAY.test(p.type?.text ?? '') && !NOT_A_PLAY.test(p.text))
  const end = last?.end
  const derived: LiveSituation = end
    ? {
        downDistanceText: end.down && end.down > 0 ? end.downDistanceText : undefined,
        possession: end.team?.id,
        yardsToEndzone: end.yardsToEndzone,
        distance: end.distance,
        isRedZone: end.yardsToEndzone !== undefined && end.yardsToEndzone <= 20,
      }
    : {}
  if (!given && !end) return undefined
  return {
    ...derived,
    downDistanceText: given?.downDistanceText ?? derived.downDistanceText,
    possession: given?.possession ?? derived.possession,
    isRedZone: given?.isRedZone ?? derived.isRedZone,
    lastPlay: given?.lastPlay?.text ?? lastReal?.text,
    homeTimeouts: given?.homeTimeouts,
    awayTimeouts: given?.awayTimeouts,
  }
}

export function periodLabel(period: number) {
  const reg = 4
  if (period <= reg) return `Q${period}`
  return period === reg + 1 ? 'OT' : `${period - reg}OT`
}

/** Win-probability series from our team's point of view, tagged with period. */
export function winSeries(s: Summary, ourHome: boolean) {
  const wp = s.winprobability ?? []
  if (!wp.length) return []
  const byId = new Map(allPlays(s).map((p) => [p.id, p]))
  let lastPeriod = 1
  return wp.map((w, i) => {
    const p = byId.get(w.playId)
    if (p) lastPeriod = p.period.number
    const home = w.homeWinPercentage
    const tie = w.tiePercentage ?? 0
    const ours = ourHome ? home : 1 - home - tie
    return {
      i,
      ours: Math.round(ours * 1000) / 10,
      period: lastPeriod,
      clock: p?.clock.displayValue,
      text: p?.text,
      score: p ? `${p.awayScore ?? ''}-${p.homeScore ?? ''}` : undefined,
    }
  })
}
