import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Seeding } from '../components/playoffs/Seeding'
import { ErrorBox, Spinner, Updated } from '../components/ui'
import { urls, type ScoreboardResponse } from '../lib/espn'
import { conferences, phaseOf, type PlayoffsData } from '../lib/playoffs'
import { useDataFile } from '../lib/seasonData'
import type { StandingsNode } from '../lib/standings'
import { TEAMS, type TeamConfig } from '../lib/teams'
import { leagueInterval } from '../lib/useAllGames'
import { IDLE_MS, usePoll } from '../lib/usePoll'

const LEAGUES = [
  { id: 'nfl', label: 'NFL', team: TEAMS.nyj },
  { id: 'nba', label: 'NBA', team: TEAMS.por },
] as const

/** NFL and NBA playoff picture: seeding during the season, the bracket in the postseason. */
export default function PlayoffsPage() {
  const [params, setParams] = useSearchParams()
  const league = LEAGUES.find((l) => l.id === params.get('league')) ?? LEAGUES[0]

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Playoff picture</h1>
        <p className="text-sm text-muted">Who's in if the season ended today, and the bracket once the playoffs start.</p>
      </div>

      <div className="flex gap-1.5">
        {LEAGUES.map((l) => (
          <button
            key={l.id}
            onClick={() => setParams(l.id === 'nfl' ? {} : { league: l.id }, { replace: true })}
            aria-pressed={league.id === l.id}
            className={`rounded-full border px-4 py-1 text-sm font-medium ${
              league.id === l.id ? 'border-text bg-text text-bg' : 'border-border text-muted hover:text-text'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <LeagueView key={league.id} team={league.team} />
    </div>
  )
}

function LeagueView({ team }: { team: TeamConfig }) {
  // The league's current scoreboard: its season type sets the phase, its events feed live bracket games.
  const sb = usePoll<ScoreboardResponse>(urls.scoreboard(team), leagueInterval)
  const phase = phaseOf(sb.data?.leagues?.[0]?.season?.type?.type)

  if (sb.error && !sb.data) return <ErrorBox error={sb.error} retry={sb.refresh} />
  if (!phase) return <Spinner label="Loading playoff picture" />
  return <SeedingView team={team} />
}

function SeedingView({ team }: { team: TeamConfig }) {
  const standings = usePoll<StandingsNode>(urls.standings(team, undefined, 2), IDLE_MS)
  const { data } = useDataFile<PlayoffsData>('playoffs')
  const confs = useMemo(() => (standings.data ? conferences(standings.data) : undefined), [standings.data])

  if (standings.error && !standings.data) return <ErrorBox error={standings.error} retry={standings.refresh} />
  if (!confs) return <Spinner label="Loading standings" />
  return (
    <div className="space-y-3">
      <Updated at={standings.updatedAt} />
      <Seeding league={team.league} confs={confs} data={data?.[team.league]} team={team} />
    </div>
  )
}
