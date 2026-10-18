import { findTeamEvent, urls, type EspnEvent, type ScoreboardResponse } from './espn'
import { TEAM_ORDER, TEAMS, type TeamKey } from './teams'
import { IDLE_MS, LIVE_MS, usePoll } from './usePoll'

export interface TodayGame {
  team: TeamKey
  event: EspnEvent | undefined
  state: 'pre' | 'in' | 'post' | undefined
}

/** Poll fast while live, every minute on game day (to catch the start), else slowly. */
export function gameInterval(event: EspnEvent | undefined) {
  const state = event?.competitions[0].status.type.state
  if (state === 'in') return LIVE_MS
  if (state === 'pre' && isWithinHours(event!.date, 12)) return 60_000
  return IDLE_MS
}

function useTeamToday(key: TeamKey): TodayGame & { loading: boolean } {
  const t = TEAMS[key]
  const sb = usePoll<ScoreboardResponse>(urls.scoreboard(t), (d) => gameInterval(findTeamEvent(d?.events, t.id)))
  const event = findTeamEvent(sb.data?.events, t.id)
  return { team: key, event, state: event?.competitions[0].status.type.state, loading: sb.loading }
}

/** Today's scoreboard entry for each team, refreshed on a live-aware cadence. */
export function useLiveGames() {
  const nyj = useTeamToday('nyj')
  const por = useTeamToday('por')
  const games = { nyj, por }
  const live = TEAM_ORDER.map((k) => games[k]).filter((g) => g.state === 'in')
  return {
    games,
    /** The game the home screen should show (Jets take priority). */
    featured: live[0] as TodayGame | undefined,
    alsoLive: live.slice(1),
    loading: nyj.loading || por.loading,
  }
}

export function isWithinHours(iso: string, hours: number) {
  const diff = new Date(iso).getTime() - Date.now()
  return diff < hours * 3_600_000
}

export function isToday(iso: string) {
  const d = new Date(iso)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}
