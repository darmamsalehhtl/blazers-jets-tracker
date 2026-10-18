import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { rolling } from '../../lib/player'
import type { BlazersData, NbaFactors, NbaPlayerAdv } from '../../lib/seasonData'
import type { Shot } from '../../lib/shots'
import type { TeamConfig } from '../../lib/teams'
import { timeAgo } from '../../lib/format'
import { ShotChart } from '../ShotChart'
import { StatTable, type Column } from '../StatTable'
import { Card, Empty, Select, Stat } from '../ui'

const p1 = (v: number | null) => (v === null ? '–' : `${(v * 100).toFixed(1)}%`)
const n1 = (v: number | null) => (v === null ? '–' : v.toFixed(1))
const sgn = (v: number | null) => (v === null ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`)

export function toShots(rows: BlazersData['shots'] | BlazersData['oppShots']): Shot[] {
  return rows.map((r) => ({ x: r[0], y: r[1], made: r[2] === 1, points: r[3], playerId: (r as BlazersData['shots'][number])[4] ?? undefined }))
}

export function BlazersAdvanced({ team, data }: { team: TeamConfig; data: BlazersData }) {
  if (!data.available) return <Empty>Season analytics aren't available right now ({data.error}).</Empty>
  const t = data.totals
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        {data.seasonLabel} season{!data.isCurrent && ' (the new season has no regular-season games yet, so this shows last season)'} · computed from{' '}
        {data.games.length} ESPN box scores and play-by-play · updated {timeAgo(new Date(data.updatedAt))}.
      </p>

      {t && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Offensive rating" value={n1(t.ortg)} sub="pts / 100 possessions" />
            <Stat label="Defensive rating" value={n1(t.drtg)} sub="allowed / 100 poss." />
            <Stat label="Net rating" value={sgn(t.ortg - t.drtg)} sub={`${t.wins}-${t.gp - t.wins} record`} />
            <Stat label="Pace" value={n1(t.pace)} sub="possessions / 48 min" />
            <Stat label="Home" value={`${t.home.w}-${t.home.l}`} sub={`${sgn(t.home.net)} per game`} />
            <Stat label="Away" value={`${t.away.w}-${t.away.l}`} sub={`${sgn(t.away.net)} per game`} />
            <Stat
              label="Clutch games"
              value={`${t.clutch.wins}-${t.clutch.losses}`}
              sub={`${t.clutch.pf}-${t.clutch.pa} in clutch time`}
            />
            <Stat label="Scoring" value={`${n1(t.ppg)}`} sub={`allowed ${n1(t.oppg)}`} />
          </div>
          <FourFactors us={t.us} opp={t.opp} />
          {t.quarters && <Quarters q={t.quarters} />}
        </>
      )}
      <NetRatingChart team={team} data={data} />
      <SeasonShots team={team} data={data} />
      <PlayerAdvancedTable team={team} players={data.players} />
      <p className="px-1 text-[11px] text-muted">
        Clutch = last 5 minutes of the 4th quarter or overtime with the score within 5. Usage, assist % and rebound % follow the
        Basketball-Reference formulas using team totals from the games each player appeared in.
      </p>
    </div>
  )
}

function FourFactors({ us, opp }: { us: NbaFactors; opp: NbaFactors }) {
  const rows: { label: string; k: keyof NbaFactors; better: 'high' | 'low'; help: string }[] = [
    { label: 'Effective FG%', k: 'efg', better: 'high', help: '(FGM + 0.5×3PM) / FGA' },
    { label: 'Turnover %', k: 'tov', better: 'low', help: 'Turnovers per possession' },
    { label: 'Off. rebound %', k: 'orb', better: 'high', help: 'Share of own misses rebounded' },
    { label: 'Free throw rate', k: 'ftr', better: 'high', help: 'FTM / FGA' },
    { label: 'True shooting %', k: 'ts', better: 'high', help: 'PTS / (2 × (FGA + 0.44×FTA))' },
    { label: '3PA rate', k: 'threeRate', better: 'high', help: 'Share of shots from three' },
    { label: 'Assist rate', k: 'astRate', better: 'high', help: 'Share of made FGs assisted' },
  ]
  return (
    <Card title="Four factors (and friends)" pad={false}>
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="border-b border-border text-[11px] text-muted uppercase">
            <th className="py-1.5 pl-4 text-left font-medium">Factor</th>
            <th className="py-1.5 text-right font-medium">Blazers</th>
            <th className="py-1.5 pr-4 text-right font-medium">Opponents</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const a = us[r.k]
            const b = opp[r.k]
            const win = a !== null && b !== null && (r.better === 'high' ? a > b : a < b)
            return (
              <tr key={r.k} className="border-b border-border/60 last:border-0">
                <td className="py-1.5 pl-4" title={r.help}>
                  {r.label}
                </td>
                <td className={`py-1.5 text-right ${win ? 'font-semibold' : ''}`}>{p1(a)}</td>
                <td className={`py-1.5 pr-4 text-right ${!win ? 'font-semibold' : ''}`}>{p1(b)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function Quarters({ q }: { q: { pf: number[]; pa: number[] } }) {
  return (
    <Card title="Average points by quarter" pad={false}>
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="border-b border-border text-[11px] text-muted uppercase">
            <th className="py-1.5 pl-4 text-left font-medium" />
            {['Q1', 'Q2', 'Q3', 'Q4'].map((x) => (
              <th key={x} className="py-1.5 text-right font-medium last:pr-4">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ['Blazers', q.pf],
            ['Opponents', q.pa],
            ['Margin', q.pf.map((v, i) => v - q.pa[i])],
          ].map(([label, vals]) => (
            <tr key={label as string} className="border-b border-border/60 last:border-0">
              <td className="py-1.5 pl-4">{label as string}</td>
              {(vals as number[]).map((v, i) => (
                <td key={i} className={`py-1.5 text-right last:pr-4 ${label === 'Margin' ? (v >= 0 ? 'text-good' : 'text-bad') : ''}`}>
                  {label === 'Margin' ? sgn(v) : v.toFixed(1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function NetRatingChart({ team, data }: { team: TeamConfig; data: BlazersData }) {
  const games = data.games
  if (games.length < 2) return null
  const net = games.map((g) => g.ortg - g.drtg)
  const roll = rolling(net, 10)
  const rows = games.map((g, i) => ({
    i: i + 1,
    net: Math.round(net[i] * 10) / 10,
    'Rolling 10': Math.round(roll[i] * 10) / 10,
    label: `${g.home ? 'vs' : '@'} ${g.opp} · ${new Date(g.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
    result: `${g.win ? 'W' : 'L'} ${g.pf}-${g.pa}`,
    type: g.type,
    pace: g.pace,
  }))
  return (
    <Card title="Net rating by game">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="i" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <ReferenceLine y={0} stroke="var(--muted)" />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              content={({ active, payload }) => {
                const d = active && payload?.[0]?.payload
                if (!d) return null
                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold">
                      Game {d.i}
                      {d.type === 'playoffs' ? ' (playoffs)' : ''} · {d.label}
                    </div>
                    <div className="text-muted">
                      {d.result} · net {sgn(d.net)} · pace {d.pace}
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey="net" name="Game net rating" fill={team.color} isAnimationActive={false} radius={[2, 2, 0, 0]}>
              {rows.map((r) => (
                <Cell key={r.i} fill={r.net >= 0 ? team.color : 'var(--muted)'} fillOpacity={r.net >= 0 ? 0.85 : 0.5} />
              ))}
            </Bar>
            <Line dataKey="Rolling 10" stroke="var(--text)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function SeasonShots({ team, data }: { team: TeamConfig; data: BlazersData }) {
  const [side, setSide] = useState<'us' | 'opp'>('us')
  const [player, setPlayer] = useState('')
  const us = useMemo(() => toShots(data.shots), [data.shots])
  const opp = useMemo(() => toShots(data.oppShots), [data.oppShots])
  const shooters = data.players.filter((p) => us.some((s) => s.playerId === p.id))
  const shots = side === 'opp' ? opp : player ? us.filter((s) => s.playerId === player) : us
  if (!us.length) return null
  return (
    <Card
      title="Season shot chart"
      right={
        <div className="flex flex-wrap justify-end gap-2">
          <Select
            value={side}
            onChange={(v) => {
              setSide(v)
              setPlayer('')
            }}
            options={[
              { value: 'us', label: 'Blazers' },
              { value: 'opp', label: 'Opponents' },
            ]}
          />
          {side === 'us' && (
            <Select value={player} onChange={setPlayer} options={[{ value: '', label: 'All players' }, ...shooters.map((p) => ({ value: p.id, label: p.name }))]} />
          )}
        </div>
      }
    >
      <ShotChart shots={shots} color={side === 'us' ? team.color : 'var(--muted)'} caption={side === 'us' ? 'FG' : 'Opp FG'} />
    </Card>
  )
}

function PlayerAdvancedTable({ team, players }: { team: TeamConfig; players: NbaPlayerAdv[] }) {
  const nav = useNavigate()
  const c = (key: keyof NbaPlayerAdv, label: string, fmt: (v: number | null) => string, title?: string): Column<NbaPlayerAdv> => ({
    key,
    label,
    title,
    render: (p) => fmt(p[key] as number | null),
    sort: (p) => (p[key] as number | null) ?? -Infinity,
  })
  const cols: Column<NbaPlayerAdv>[] = [
    { key: 'name', label: 'Player', render: (p) => <span className="font-medium">{p.name}</span>, sort: (p) => p.name },
    c('gp', 'GP', (v) => String(v ?? '–')),
    c('mpg', 'MPG', n1),
    c('ppg', 'PPG', n1),
    c('ts', 'TS%', p1, 'True shooting'),
    c('efg', 'eFG%', p1),
    c('usg', 'USG%', p1, 'Share of team plays used while on the floor'),
    c('astPct', 'AST%', p1, 'Share of teammate FGs assisted while on the floor'),
    c('rebPct', 'REB%', p1, 'Share of available rebounds grabbed'),
    c('orebPct', 'OREB%', p1),
    c('drebPct', 'DREB%', p1),
    c('tovPct', 'TOV%', p1, 'Turnovers per play used'),
    c('astTo', 'AST/TO', (v) => (v === null ? '–' : v.toFixed(2))),
    c('threeRate', '3PAr', p1, 'Share of FGA from three'),
    c('ftr', 'FTr', p1, 'FTA / FGA'),
    c('fgPct', 'FG%', p1),
    c('tpPct', '3P%', p1),
    c('ftPct', 'FT%', p1),
    c('pts36', 'PTS/36', n1),
    c('reb36', 'REB/36', n1),
    c('ast36', 'AST/36', n1),
    c('stl36', 'STL/36', n1),
    c('blk36', 'BLK/36', n1),
    c('pm', '+/-', (v) => (v === null ? '–' : `${v > 0 ? '+' : ''}${v}`)),
    c('pmPerGame', '+/- /G', sgn),
  ]
  return (
    <Card title="Player advanced stats" pad={false}>
      <StatTable columns={cols} rows={players} rowKey={(p) => p.id} onRowClick={(p) => nav(`/player/${team.key}/${p.id}?tab=advanced`)} dense />
    </Card>
  )
}
