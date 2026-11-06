import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bracket } from '../components/playoffs/Bracket'
import { OurStanding, Projection } from '../components/playoffs/Projection'
import { Seeding } from '../components/playoffs/Seeding'
import { Empty, ErrorBox, Spinner, Tabs, Updated } from '../components/ui'
import { urls, type ScoreboardResponse } from '../lib/espn'
import { buildBracket, conferences, mergeGames, phaseOf, type Phase, type PlayoffsData } from '../lib/playoffs'
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
  const [params] = useSearchParams()
  // Dev only: ?phase=bracket|offseason|seeding to check a view out of season.
  const forced = import.meta.env.DEV ? (params.get('phase') as Phase | null) : null
  const phase = sb.data ? (forced ?? phaseOf(sb.data.leagues?.[0]?.season?.type?.type)) : undefined

  if (sb.error && !sb.data) return <ErrorBox error={sb.error} retry={sb.refresh} />
  if (!phase) return <Spinner label="Loading playoff picture" />
  if (phase === 'seeding') return <SeedingView team={team} />
  return <PostseasonView team={team} phase={phase} sb={sb.data} updatedAt={sb.updatedAt} />
}

function PostseasonView({ team, phase, sb, updatedAt }: { team: TeamConfig; phase: Phase; sb?: ScoreboardResponse; updatedAt?: Date }) {
  const [view, setView] = useState<'bracket' | 'seeding'>('bracket')
  const { data, error } = useDataFile<PlayoffsData>('playoffs')
  const league = data?.[team.league]
  const bracket = useMemo(() => {
    if (!league?.available) return undefined
    // Out of season the current scoreboard holds no postseason games, so only the stored ones count.
    const games = mergeGames(league.postseason.games, phase === 'bracket' ? sb?.events : undefined)
    return buildBracket(team.league, league.postseason, games)
  }, [league, phase, sb, team.league])
  const live = phase === 'bracket' && !!bracket && (sb?.events ?? []).some((e) => e.competitions[0].status.type.state === 'in')

  return (
    <div className="space-y-3">
      <Tabs
        tabs={[
          { id: 'bracket', label: phase === 'offseason' && league?.available ? `${league.postseason.label} bracket` : 'Bracket' },
          { id: 'seeding', label: phase === 'offseason' ? 'Standings' : 'Final seeding' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'seeding' ? (
        <SeedingView team={team} />
      ) : error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Spinner label="Loading bracket" />
      ) : !bracket ? (
        <Empty>The {team.league.toUpperCase()} bracket isn't available right now{league?.error ? ` (${league.error})` : ''}.</Empty>
      ) : (
        <>
          {phase === 'bracket' && <Updated at={updatedAt} live={live} />}
          <Bracket bracket={bracket} team={team} />
        </>
      )}
    </div>
  )
}

function SeedingView({ team }: { team: TeamConfig }) {
  const standings = usePoll<StandingsNode>(urls.standings(team, undefined, 2), IDLE_MS)
  const { data, error } = useDataFile<PlayoffsData>('playoffs')
  const remaining = data?.[team.league]
  const confs = useMemo(() => (standings.data ? conferences(standings.data) : undefined), [standings.data])

  if (standings.error && !standings.data) return <ErrorBox error={standings.error} retry={standings.refresh} />
  if (!confs) return <Spinner label="Loading standings" />
  return (
    <div className="space-y-3">
      <OurStanding league={team.league} confs={confs} team={team} />
      <Projection league={team.league} confs={confs} team={team} />
      <Updated at={standings.updatedAt} />
      {(error || remaining?.available === false) && (
        <p className="px-1 text-xs text-muted">Remaining schedules aren't available right now, so games left and SOS are missing.</p>
      )}
      <Seeding league={team.league} confs={confs} data={remaining} team={team} />
    </div>
  )
}
