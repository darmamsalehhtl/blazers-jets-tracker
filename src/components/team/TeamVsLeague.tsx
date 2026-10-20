import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { timeAgo } from '../../lib/format'
import type { NbaLeague, NbaPlayerRow, NflDefenderRow, NflLeague, NflPasserRow, NflReceiverRow, NflRusherRow } from '../../lib/leagueData'
import { useDataFile } from '../../lib/seasonData'
import type { TeamConfig } from '../../lib/teams'
import { Empty, ErrorBox, Spinner } from '../ui'
import { LeagueScatter, type Axis, type PlotDef } from './LeagueScatter'

// ---- formatting
const pct = (v: number) => `${(v * 100).toFixed(0)}%`
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`
const epa = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`
const d1 = (v: number) => v.toFixed(1)
const d0 = (v: number) => v.toFixed(0)
const pp = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`

function ax<R>(get: (r: R) => number | null, label: string, fmt: (v: number) => string, lowBetter = false): Axis<R> {
  return { get, label, fmt, lowBetter, int: fmt === d0 }
}

// ---- NFL
const QB: PlotDef<NflPasserRow>[] = [
  {
    id: 'qb-eff',
    title: 'Efficiency vs accuracy',
    note: 'EPA per dropback (sacks and scrambles included) against completion % over expected.',
    x: ax((r) => r.cpoe, 'CPOE', pp),
    y: ax((r) => r.epa, 'EPA / dropback', epa),
  },
  {
    id: 'qb-depth',
    title: 'Throwing deep vs results',
    note: 'How far downfield they throw on average, and what it produces.',
    x: ax((r) => r.adot, 'Avg depth of target', d1),
    y: ax((r) => r.epa, 'EPA / dropback', epa),
  },
  {
    id: 'qb-safety',
    title: 'Sacks vs interceptions',
    note: 'Sack rate per dropback and interception rate per attempt. Both axes are flipped, so safer is up and right.',
    x: ax((r) => r.sackRate, 'Sack rate', pct1, true),
    y: ax((r) => r.intRate, 'INT rate', pct1, true),
  },
  {
    id: 'qb-vol',
    title: 'Volume vs consistency',
    note: 'Dropbacks against success rate (share of dropbacks with positive EPA).',
    x: ax((r) => r.db, 'Dropbacks', d0),
    y: ax((r) => r.success, 'Success rate', pct),
  },
]
const WR: PlotDef<NflReceiverRow>[] = [
  {
    id: 'wr-usage',
    title: 'Usage vs efficiency',
    note: 'Targets per game against EPA per target, for wide receivers, tight ends and backs.',
    x: ax((r) => r.tgtPerGame, 'Targets / game', d1),
    y: ax((r) => r.epa, 'EPA / target', epa),
  },
  {
    id: 'wr-style',
    title: 'Downfield vs after the catch',
    note: 'Average depth of target against yards after catch per reception: deep threats sit right, YAC players high.',
    x: ax((r) => r.adot, 'Avg depth of target', d1),
    y: ax((r) => r.yac, 'YAC / reception', d1),
    style: true,
  },
  {
    id: 'wr-hands',
    title: 'Depth vs catch rate',
    note: 'Deeper targets are harder to catch. Players above the cloud catch more than their depth suggests.',
    x: ax((r) => r.adot, 'Avg depth of target', d1),
    y: ax((r) => r.catchRate, 'Catch rate', pct),
    style: true,
  },
  {
    id: 'wr-ypt',
    title: 'Yards per target vs success',
    note: 'Big-play production against how often a target helps the offense.',
    x: ax((r) => r.ypt, 'Yards / target', d1),
    y: ax((r) => r.success, 'Success rate', pct),
  },
]
const RB: PlotDef<NflRusherRow>[] = [
  {
    id: 'rb-vol',
    title: 'Workload vs efficiency',
    note: 'Carries (QB scrambles excluded) against EPA per rush.',
    x: ax((r) => r.car, 'Carries', d0),
    y: ax((r) => r.epa, 'EPA / rush', epa),
  },
  {
    id: 'rb-boom',
    title: 'Consistency vs big plays',
    note: 'Success rate against the share of runs that go for 10+ yards.',
    x: ax((r) => r.success, 'Success rate', pct),
    y: ax((r) => r.explosive, 'Explosive run rate', pct),
  },
  {
    id: 'rb-ypc',
    title: 'Yards per carry vs EPA',
    note: 'Yards per carry ignores down and distance; EPA does not.',
    x: ax((r) => r.ypc, 'Yards / carry', d1),
    y: ax((r) => r.epa, 'EPA / rush', epa),
  },
]
const DEF: PlotDef<NflDefenderRow>[] = [
  {
    id: 'def-tackles',
    title: 'Tackles vs tackles for loss',
    note: 'Total tackles against tackles behind the line of scrimmage.',
    x: ax((r) => r.tackles, 'Tackles', d0),
    y: ax((r) => r.tfl, 'Tackles for loss', d0),
  },
  {
    id: 'def-rush',
    title: 'Pass rush',
    note: 'Sacks against tackles for loss.',
    x: ax((r) => r.sacks, 'Sacks', d1),
    y: ax((r) => r.tfl, 'Tackles for loss', d0),
  },
  {
    id: 'def-cover',
    title: 'Coverage',
    note: 'Passes defended against interceptions.',
    x: ax((r) => r.pd, 'Passes defended', d0),
    y: ax((r) => r.ints, 'Interceptions', d0),
  },
]

// ---- NBA
const NBA: Record<string, PlotDef<NbaPlayerRow>[]> = {
  scoring: [
    {
      id: 'nba-ts',
      title: 'Scoring volume vs efficiency',
      note: 'Points per game against true shooting % (counts threes and free throws).',
      x: ax((r) => r.ppg, 'Points / game', d1),
      y: ax((r) => r.ts, 'True shooting', pct1),
    },
    {
      id: 'nba-fga36',
      title: 'Shot volume vs shot quality',
      note: 'Field goal attempts per 36 minutes against effective FG % (a three counts 1.5×).',
      x: ax((r) => r.fga36, 'FGA / 36 min', d1),
      y: ax((r) => r.efg, 'eFG%', pct1),
    },
    {
      id: 'nba-creators',
      title: 'Scorers and creators',
      note: 'Points against assists per game.',
      x: ax((r) => r.ppg, 'Points / game', d1),
      y: ax((r) => r.apg, 'Assists / game', d1),
    },
  ],
  shooting: [
    {
      id: 'nba-3',
      title: 'Three-point volume vs accuracy',
      note: 'Threes attempted per game against 3P%, for players taking at least one a game.',
      only: (r) => (r.tpaPg ?? 0) >= 1,
      x: ax((r) => r.tpaPg, '3PA / game', d1),
      y: ax((r) => r.tpPct, '3P%', pct1),
    },
    {
      id: 'nba-diet',
      title: 'Shot diet',
      note: 'Share of shots from three against free throw attempts per shot: who lives behind the arc, who gets to the line.',
      x: ax((r) => r.tpaRate, '3PA rate', pct),
      y: ax((r) => r.ftr, 'Free throw rate', pct),
      style: true,
    },
    {
      id: 'nba-ft',
      title: 'Free throws vs threes',
      note: 'FT% is a good predictor of real shooting touch. Players taking at least one three a game.',
      only: (r) => (r.tpaPg ?? 0) >= 1,
      x: ax((r) => r.ftPct, 'FT%', pct),
      y: ax((r) => r.tpPct, '3P%', pct1),
    },
  ],
  playmaking: [
    {
      id: 'nba-ast',
      title: 'Playmaking vs care',
      note: 'Assists per 36 minutes against assist-to-turnover ratio.',
      x: ax((r) => r.ast36, 'Assists / 36 min', d1),
      y: ax((r) => r.astTo, 'AST/TO', d1),
    },
    {
      id: 'nba-tov',
      title: 'Assists vs turnovers',
      note: 'Per game. The turnover axis is flipped, so fewer turnovers is higher.',
      x: ax((r) => r.apg, 'Assists / game', d1),
      y: ax((r) => r.tpg, 'Turnovers / game', d1, true),
    },
  ],
  defense: [
    {
      id: 'nba-reb',
      title: 'Rebounding vs rim protection',
      note: 'Rebounds and blocks per 36 minutes.',
      x: ax((r) => r.reb36, 'Rebounds / 36 min', d1),
      y: ax((r) => r.blk36, 'Blocks / 36 min', d1),
    },
    {
      id: 'nba-stocks',
      title: 'Steals vs blocks',
      note: 'Per 36 minutes: guards and wings go right, bigs go up.',
      x: ax((r) => r.stl36, 'Steals / 36 min', d1),
      y: ax((r) => r.blk36, 'Blocks / 36 min', d1),
    },
    {
      id: 'nba-min',
      title: 'Minutes vs scoring rate',
      note: 'Minutes per game against points per 36 minutes.',
      x: ax((r) => r.mpg, 'Minutes / game', d1),
      y: ax((r) => r.pts36, 'Points / 36 min', d1),
    },
  ],
}

const NFL_GROUPS = [
  { id: 'qb', label: 'Quarterbacks' },
  { id: 'wr', label: 'Receivers' },
  { id: 'rb', label: 'Running backs' },
  { id: 'def', label: 'Defense' },
] as const
const NBA_GROUPS = [
  { id: 'scoring', label: 'Scoring' },
  { id: 'shooting', label: 'Shooting' },
  { id: 'playmaking', label: 'Playmaking' },
  { id: 'defense', label: 'Boards & defense' },
] as const

function useGroup<T extends string>(ids: readonly { id: T }[]) {
  const [params, setParams] = useSearchParams()
  const g = ids.find((x) => x.id === params.get('g'))?.id ?? ids[0].id
  const set = (id: T) => {
    const next = new URLSearchParams(params)
    next.set('g', id)
    setParams(next, { replace: true })
  }
  return [g, set] as const
}

function Chips<T extends string>({ groups, value, onChange }: { groups: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
      {groups.map((g) => (
        <button
          key={g.id}
          onClick={() => onChange(g.id)}
          className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium ${
            value === g.id ? 'border-text bg-text text-bg' : 'border-border text-muted hover:text-text'
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 lg:grid-cols-2">{children}</div>
}

export function TeamVsLeague({ team }: { team: TeamConfig }) {
  return team.league === 'nfl' ? <NflVsLeague team={team} /> : <NbaVsLeague team={team} />
}

function NflVsLeague({ team }: { team: TeamConfig }) {
  const { data, error } = useDataFile<NflLeague>('nfl-league')
  const [g, setG] = useGroup(NFL_GROUPS)
  if (error) return <ErrorBox error={error} />
  if (!data) return <Spinner />
  if (!data.available) return <Empty>League player data isn't available yet ({data.error}).</Empty>
  const min = {
    qb: `${Math.round(data.min.dropbacks)}+ dropbacks`,
    wr: `${Math.round(data.min.targets)}+ targets`,
    rb: `${Math.round(data.min.carries)}+ carries`,
    def: `${Math.round(data.min.tackles)}+ tackles, or regular sacks / passes defended`,
  }[g]
  return (
    <div className="space-y-3">
      <Chips groups={NFL_GROUPS} value={g} onChange={setG} />
      <p className="text-xs text-muted">
        {data.season} season through week {data.weeks} · every player with {min} · offense from nflverse play-by-play, defense from ESPN · updated{' '}
        {timeAgo(new Date(data.updatedAt))}
      </p>
      <Grid>
        {g === 'qb' && QB.map((p) => <LeagueScatter key={p.id} weight={(r) => r.db} plot={p} rows={data.passing} team={team} />)}
        {g === 'wr' && WR.map((p) => <LeagueScatter key={p.id} weight={(r) => r.tgt} plot={p} rows={data.receiving} team={team} />)}
        {g === 'rb' && RB.map((p) => <LeagueScatter key={p.id} weight={(r) => r.car} plot={p} rows={data.rushing} team={team} />)}
        {g === 'def' && DEF.map((p) => <LeagueScatter key={p.id} weight={(r) => r.tackles + 5 * r.sacks} plot={p} rows={data.defense} team={team} />)}
      </Grid>
    </div>
  )
}

function NbaVsLeague({ team }: { team: TeamConfig }) {
  const { data, error } = useDataFile<NbaLeague>('nba-league')
  const [g, setG] = useGroup(NBA_GROUPS)
  if (error) return <ErrorBox error={error} />
  if (!data) return <Spinner />
  if (!data.available) return <Empty>League player data isn't available yet ({data.error}).</Empty>
  return (
    <div className="space-y-3">
      <Chips groups={NBA_GROUPS} value={g} onChange={setG} />
      <p className="text-xs text-muted">
        {data.seasonLabel} regular season{!data.isCurrent && ' (the new season has no games yet)'} · every player with {data.minGames}+ games and 12+
        minutes a game · players are shown with their current team · updated {timeAgo(new Date(data.updatedAt))}
      </p>
      <Grid>
        {NBA[g].map((p) => (
          <LeagueScatter key={p.id} plot={p} rows={data.players} team={team} weight={(r) => r.gp * (r.mpg ?? 0)} />
        ))}
      </Grid>
    </div>
  )
}
