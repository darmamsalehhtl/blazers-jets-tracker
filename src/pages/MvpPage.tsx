import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, Empty, ErrorBox, Spinner } from '../components/ui'
import { faceUrl, teamLogoByAbbr } from '../lib/espn'
import { timeAgo } from '../lib/format'
import type { MvpData, MvpLeague, NbaCandidate, NflCandidate } from '../lib/mvp'
import { useDataFile } from '../lib/seasonData'
import { TEAMS, type TeamConfig } from '../lib/teams'

const LEAGUES = [
  { id: 'nfl', label: 'NFL', team: TEAMS.nyj },
  { id: 'nba', label: 'NBA', team: TEAMS.por },
] as const
type LeagueId = (typeof LEAGUES)[number]['id']

const n0 = (v: number) => v.toLocaleString('en-US')
const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`

/** NFL and NBA MVP race if the season ended today, with our teams highlighted. */
export default function MvpPage() {
  const { data, error } = useDataFile<MvpData>('mvp')
  const [params, setParams] = useSearchParams()
  const league = LEAGUES.find((l) => l.id === params.get('league')) ?? LEAGUES[0]

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">MVP race</h1>
        <p className="text-sm text-muted">Who would win MVP if the season ended today.</p>
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

      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Spinner label="Loading MVP race" />
      ) : league.id === 'nfl' ? (
        <Race id="nfl" data={data.nfl} team={league.team} updatedAt={data.updatedAt} />
      ) : (
        <Race id="nba" data={data.nba} team={league.team} updatedAt={data.updatedAt} />
      )}
    </div>
  )
}

function Race<C extends NflCandidate | NbaCandidate>({
  id,
  data,
  team,
  updatedAt,
}: {
  id: LeagueId
  data: MvpLeague<C>
  team: TeamConfig
  updatedAt: string
}) {
  if (!data.available) return <Empty>The {id.toUpperCase()} MVP race isn't available right now ({data.error}).</Empty>
  const ours = data.ours

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        {id === 'nba' && 'seasonLabel' in data ? `${String(data.seasonLabel)} · ` : `${data.season} season · `}through {data.through} ·{' '}
        {data.poolSize} candidates · updated {timeAgo(new Date(updatedAt))}
      </p>
      {data.smallSample && (
        <p className="rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs text-muted">
          Early in the season: only a few games played, so the order can change a lot from game to game.
        </p>
      )}

      <Card pad={false}>
        <ol>
          {data.candidates.map((c) => (
            <Row key={`${c.rank}-${c.name}`} c={c} id={id} team={team} />
          ))}
        </ol>
      </Card>

      {ours.none ? (
        <p className="px-1 text-sm text-muted">No {team.nickname} player currently qualifies for the race.</p>
      ) : !ours.inTop && ours.candidate ? (
        <div>
          <p className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-muted uppercase">Best {team.nickname} player</p>
          <Card pad={false}>
            <ol>
              <Row c={ours.candidate} id={id} team={team} />
            </ol>
          </Card>
        </div>
      ) : null}

      <Methodology id={id} />
    </div>
  )
}

function Row({ c, id, team }: { c: NflCandidate | NbaCandidate; id: LeagueId; team: TeamConfig }) {
  const ours = c.team === team.abbr
  const body = (
    <>
      <div className="w-6 shrink-0 text-center text-base font-bold tabular-nums">{c.rank}</div>
      <Face c={c} league={id} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-sm font-semibold">{c.name}</span>
          <span className="shrink-0 text-xs text-muted">
            {c.pos} · {c.team}
          </span>
        </div>
        <div className="text-xs leading-snug text-muted tabular-nums">{id === 'nfl' ? nflLine(c as NflCandidate) : nbaLine(c as NbaCandidate)}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-medium">{c.reason}</span>
          {!c.reason.startsWith('Team record') && <span className="text-muted">Team {c.record}</span>}
          {'atRisk' in c && c.atRisk && (
            <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 font-semibold text-yellow-700 dark:text-yellow-400" title="Below pace for the 65-game minimum">
              65-game risk
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-lg leading-tight font-bold tabular-nums">{c.score.toFixed(1)}</div>
        <div className="text-[11px] text-muted tabular-nums">{c.gap === 0 ? 'Leader' : `−${c.gap.toFixed(1)}`}</div>
      </div>
    </>
  )
  const cls = `flex items-center gap-3 border-t border-border/60 px-4 py-2.5 first:border-0 ${ours ? (id === 'nfl' ? 'bg-nyj/10' : 'bg-por/10') : ''}`
  const style = ours ? { boxShadow: `inset 3px 0 0 ${team.color}` } : undefined
  return (
    <li className={cls} style={style}>
      {c.id ? (
        <Link to={`/player/${team.key}/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
    </li>
  )
}

function Face({ c, league }: { c: NflCandidate | NbaCandidate; league: LeagueId }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative h-11 w-11 shrink-0">
      {c.id && !failed ? (
        <img
          src={faceUrl(league, c.id, 96)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-11 w-11 rounded-full bg-surface-2 object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">
          {c.name
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')}
        </div>
      )}
      <img
        src={teamLogoByAbbr(league, c.team)}
        alt=""
        loading="lazy"
        className="absolute -right-1 -bottom-1 h-5 w-5 rounded-full border border-border bg-surface object-contain p-0.5"
      />
    </div>
  )
}

function nflLine(c: NflCandidate) {
  const s = c.stats
  const epa = `${signed(c.epa)} EPA`
  if (c.pos === 'QB') {
    const rush = s.rushYds >= 150 || s.rushTd >= 2 ? ` · ${n0(s.rushYds)} rush yds` : ''
    return `${n0(s.passYds)} yds · ${s.passTd + s.rushTd} TD · ${s.ints} INT${rush} · ${epa}`
  }
  if (c.pos === 'RB' || c.pos === 'FB') return `${n0(s.rushYds)} rush yds · ${n0(s.recYds)} rec yds · ${s.rushTd + s.recTd} TD · ${epa}`
  return `${s.rec} rec · ${n0(s.recYds)} yds · ${s.recTd + s.rushTd} TD · ${epa}`
}

function nbaLine(c: NbaCandidate) {
  const s = c.stats
  return `${s.ppg} pts · ${s.rpg} reb · ${s.apg} ast · ${(s.ts * 100).toFixed(1)}% TS · ${s.games}/${s.teamGames} games`
}

function Methodology({ id }: { id: LeagueId }) {
  return (
    <div className="space-y-1.5 px-1 text-[11px] leading-relaxed text-muted">
      {id === 'nfl' ? (
        <>
          <p>
            <b className="text-text">How the score works:</b> 50% total EPA (expected points added: passing + rushing for quarterbacks, receiving + rushing
            for everyone else), 20% production (yards + touchdowns − turnovers) and 30% team win %. EPA and production are compared within each position
            (QB, RB, WR/TE). Non-quarterbacks get a deduction because voters almost always pick a quarterback, but a historic running back or receiver
            season can still crack the top 10. Defenders and kickers aren't ranked.
          </p>
          <p>Minimum: 12 dropbacks per week for quarterbacks, 8 touches per week for running backs, receivers and tight ends. Data from nflverse play-by-play.</p>
        </>
      ) : (
        <>
          <p>
            <b className="text-text">How the score works:</b> 55% production (Game Score per game: points, rebounds, assists, steals and blocks minus
            misses, fouls and turnovers), 20% scoring efficiency (points added over league-average true shooting) and 25% team win %. Players need 25+
            minutes a game.
          </p>
          <p>
            65-game rule: players who can no longer reach 65 games are out; players below pace are marked. The league's exceptions (for example certain
            injuries) can't be seen in the data. Data from ESPN.
          </p>
        </>
      )}
      <p>The score (0–100, 50 = average candidate) estimates who would win if the season ended today. It is not a prediction of the actual vote.</p>
    </div>
  )
}
