import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bracket } from '../components/playoffs/Bracket'
import { OurStanding, Projection } from '../components/playoffs/Projection'
import { Seeding } from '../components/playoffs/Seeding'
import { Empty, ErrorBox, LiveBadge, Logo, SpoilerNote, Spinner, Tabs, Updated } from '../components/ui'
import { scoreText, teamLogo, urls, type EspnEvent, type ScoreboardResponse } from '../lib/espn'
import { buildBracket, conferences, mergeGames, phaseOf, type Phase, type PlayoffsData } from '../lib/playoffs'
import { useDataFile } from '../lib/seasonData'
import { useSpoilers } from '../lib/spoilers'
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
  const [params] = useSearchParams()
  // Dev only: ?phase=bracket|offseason|seeding and ?sbdate=YYYYMMDD to check views out of season.
  const forced = import.meta.env.DEV ? (params.get('phase') as Phase | null) : null
  const sbDate = (import.meta.env.DEV && params.get('sbdate')) || undefined
  // The league's current scoreboard: its season type sets the phase, its events feed live bracket games.
  const sb = usePoll<ScoreboardResponse>(urls.scoreboard(team, sbDate), leagueInterval)
  const phase = sb.data ? (forced ?? phaseOf(sb.data)) : undefined

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
  const liveGames = phase === 'bracket' ? (sb?.events ?? []).filter((e) => (e.season?.type === 3 || e.season?.type === 5) && e.competitions[0].status.type.state === 'in') : []
  const live = !!bracket && liveGames.length > 0
  const { show } = useSpoilers()

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
      ) : !show ? (
        // Results and later-round matchups give winners away; games in progress always show their score.
        <>
          {liveGames.length > 0 && <Updated at={updatedAt} live />}
          {liveGames.map((e) => (
            <LiveGame key={e.id} e={e} team={team} />
          ))}
          <SpoilerNote what="Bracket results are" />
        </>
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

  const { show } = useSpoilers()

  // Seeds and records give results away, so the whole view waits for spoilers.
  if (!show) return <SpoilerNote what="The playoff picture is" />
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

/** A postseason game in progress, without anything about the series around it. */
function LiveGame({ e, team }: { e: EspnEvent; team: TeamConfig }) {
  const c = e.competitions[0]
  const ours = c.competitors.some((x) => x.team.id === team.id)
  const body = (
    <>
      {c.competitors
        .slice()
        .sort((a, b) => Number(b.homeAway === 'away') - Number(a.homeAway === 'away'))
        .map((x) => (
          <div key={x.id} className="flex items-center gap-2 py-0.5">
            <Logo src={teamLogo(x.team)} alt="" size={18} />
            <span className={x.team.id === team.id ? 'font-bold' : ''}>{x.team.abbreviation}</span>
            <span className="ml-auto font-semibold tabular-nums">{scoreText(x.score)}</span>
          </div>
        ))}
      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
        <LiveBadge />
        {c.status.type.shortDetail}
      </p>
    </>
  )
  const cls = 'block rounded-xl border border-live/50 bg-surface px-3 py-2 text-[13px]'
  return ours ? (
    <Link to={`/game/${team.key}/${e.id}`} className={`${cls} hover:bg-surface-2`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
