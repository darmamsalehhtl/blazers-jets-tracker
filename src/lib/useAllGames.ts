import { urls, type EspnEvent, type ScoreboardResponse } from './espn'
import { TEAMS, type TeamKey } from './teams'
import { IDLE_MS, LIVE_MS, usePoll } from './usePoll'
import { isWithinHours } from './useLiveGames'

export interface LeagueGame {
  /** Which of our team configs the game's league belongs to (drives URLs + layout). */
  team: TeamKey
  event: EspnEvent
  state: 'pre' | 'in' | 'post'
}

const RANK = { in: 0, pre: 1, post: 2 }

/** Live fast when anything is live, every minute when a game starts soon, else slowly. */
function leagueInterval(d: ScoreboardResponse | undefined) {
  const states = (d?.events ?? []).map((e) => e.competitions[0])
  if (states.some((c) => c.status.type.state === 'in')) return LIVE_MS
  if (states.some((c) => c.status.type.state === 'pre' && isWithinHours(c.date, 12))) return 60_000
  return IDLE_MS
}

/** Games worth showing now: everything live, today's upcoming games and the last few hours' finals. */
function relevant(e: EspnEvent) {
  const c = e.competitions[0]
  const t = new Date(c.date).getTime()
  switch (c.status.type.state) {
    case 'in':
      return true
    case 'pre':
      return isWithinHours(c.date, 18)
    default:
      return Date.now() - t < 14 * 3_600_000
  }
}

/** Every NFL and NBA game around right now, live games first. */
export function useAllGames() {
  const nfl = usePoll<ScoreboardResponse>(urls.scoreboard(TEAMS.nyj), leagueInterval)
  const nba = usePoll<ScoreboardResponse>(urls.scoreboard(TEAMS.por), leagueInterval)
  const tag = (team: TeamKey, d?: ScoreboardResponse): LeagueGame[] =>
    (d?.events ?? []).filter(relevant).map((event) => ({ team, event, state: event.competitions[0].status.type.state }))
  const games = [...tag('nyj', nfl.data), ...tag('por', nba.data)].sort(
    (a, b) => RANK[a.state] - RANK[b.state] || a.event.date.localeCompare(b.event.date),
  )
  const updatedAt = [nfl.updatedAt, nba.updatedAt].reduce<Date | undefined>((a, b) => (b && (!a || b > a) ? b : a), undefined)
  return {
    games,
    live: games.filter((g) => g.state === 'in'),
    loading: nfl.loading || nba.loading,
    error: nfl.error && nba.error ? nfl.error : undefined,
    updatedAt,
    refresh: () => {
      nfl.refresh()
      nba.refresh()
    },
  }
}
