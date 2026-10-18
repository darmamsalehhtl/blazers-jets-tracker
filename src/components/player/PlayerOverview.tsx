import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { urls } from '../../lib/espn'
import { shortDate } from '../../lib/format'
import { gamelogRows, parsePair, rolling, type AthleteBio, type GamelogResponse, type GameRow } from '../../lib/player'
import type { TeamConfig } from '../../lib/teams'
import { IDLE_MS, usePoll } from '../../lib/usePoll'
import { Card, Empty, Select, Spinner } from '../ui'

export function numeric(v: string | undefined) {
  if (v === undefined) return NaN
  if (/^\d+-\d+$/.test(v) || /^\d+\/\d+$/.test(v)) return parsePair(v)[0]
  return parseFloat(v)
}

export function PlayerOverview({ team, id, bio }: { team: TeamConfig; id: string; bio: AthleteBio }) {
  const log = usePoll<GamelogResponse>(urls.athleteGamelog(team, id), IDLE_MS)
  const summary = bio.athlete.statsSummary

  return (
    <div className="space-y-3">
      {summary?.statistics.length ? (
        <Card title={summary.displayName}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {summary.statistics.map((s) => (
              <div key={s.name} className="rounded-xl bg-surface-2 px-3 py-2.5">
                <div className="text-[11px] tracking-wide text-muted uppercase">{s.displayName}</div>
                <div className="text-xl font-semibold tabular-nums">{s.displayValue}</div>
                {s.rankDisplayValue && <div className="text-[11px] text-muted">{s.rankDisplayValue.replace('Tied-', 'T-')} in {team.league.toUpperCase()}</div>}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      {log.loading ? <Spinner /> : log.data ? <Trend team={team} log={log.data} /> : null}
    </div>
  )
}

function Trend({ team, log }: { team: TeamConfig; log: GamelogResponse }) {
  const rows = useMemo(() => gamelogRows(log).filter((r) => !/preseason/i.test(r.seasonType)), [log])
  const metrics = log.labels.map((l, i) => ({ value: i, label: log.displayNames?.[i] ?? l, short: l })).filter((m) => rows.some((r) => Number.isFinite(numeric(r.stats[m.value]))))
  const defaultIdx = Math.max(0, log.labels.findIndex((l) => l === 'PTS' || l === 'YDS'))
  const [idx, setIdx] = useState(defaultIdx)

  if (!rows.length) return <Empty>No games played this season yet.</Empty>

  const ordered = [...rows].reverse()
  const values = ordered.map((r) => numeric(r.stats[idx]) || 0)
  const avg = rolling(values, 5)
  const data = ordered.map((r, i) => ({
    i: i + 1,
    label: `${r.atVs} ${r.opponent.abbreviation}`,
    date: shortDate(r.gameDate),
    result: `${r.gameResult ?? ''} ${r.score}`,
    Game: values[i],
    'Last-5 avg': Math.round(avg[i] * 10) / 10,
  }))
  const short = log.labels[idx]
  const seasonAvg = values.reduce((a, b) => a + b, 0) / values.length
  const high = Math.max(...values)

  return (
    <>
      <Card
        title="Game by game"
        right={<Select value={idx} onChange={setIdx} options={metrics.map((m) => ({ value: m.value, label: m.label }))} />}
      >
        <div className="mb-2 flex gap-4 text-sm">
          <span>
            <span className="text-muted">Avg</span> <b className="tabular-nums">{seasonAvg.toFixed(1)}</b>
          </span>
          <span>
            <span className="text-muted">High</span> <b className="tabular-nums">{high}</b>
          </span>
          <span>
            <span className="text-muted">Games</span> <b className="tabular-nums">{values.length}</b>
          </span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="i" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={12} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)' }}
                content={({ active, payload }) => {
                  const d = active && payload?.[0]?.payload
                  if (!d) return null
                  return (
                    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                      <div className="font-semibold">
                        {d.Game} {short} · {d.label}
                      </div>
                      <div className="text-muted">
                        {d.date} · {d.result} · last-5 avg {d['Last-5 avg']}
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="Game" fill={team.color} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
              <Line dataKey="Last-5 avg" stroke="var(--text)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <RecentGames team={team} log={log} rows={rows.slice(0, 5)} />
    </>
  )
}

function RecentGames({ team, log, rows }: { team: TeamConfig; log: GamelogResponse; rows: GameRow[] }) {
  return (
    <Card title="Last 5 games" pad={false}>
      <div className="no-scrollbar overflow-x-auto">
        <table className="stat-table w-full text-[13px] tabular-nums">
          <thead>
            <tr className="border-b border-border text-[11px] text-muted">
              <th className="py-1.5 pl-4 text-left font-medium">Game</th>
              {log.labels.map((l, i) => (
                <th key={i} className="px-2 py-1.5 text-right font-medium" title={log.displayNames?.[i]}>
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="py-1.5 pl-4 whitespace-nowrap">
                  <Link to={`/game/${team.key}/${r.id}`} className="hover:underline">
                    <span className={r.gameResult === 'W' ? 'text-good' : r.gameResult === 'L' ? 'text-bad' : ''}>{r.gameResult}</span> {r.atVs}{' '}
                    {r.opponent.abbreviation}
                  </Link>
                </td>
                {r.stats.map((v, i) => (
                  <td key={i} className="px-2 py-1.5 text-right whitespace-nowrap">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
