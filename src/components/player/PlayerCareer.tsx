import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { urls } from '../../lib/espn'
import type { TeamConfig } from '../../lib/teams'
import { IDLE_MS, usePoll } from '../../lib/usePoll'
import { labelColumns, StatTable, type Column } from '../StatTable'
import type { AthleteStatsResponse } from '../team/TeamPlayers'
import { Card, Empty, Select, Spinner } from '../ui'
import { numeric } from './PlayerOverview'

type SeasonRow = { season: { year: number; displayName: string }; stats: string[]; teamSlug?: string; teamId?: string }

export function PlayerCareer({ team, id }: { team: TeamConfig; id: string }) {
  const { data } = usePoll<AthleteStatsResponse>(urls.athleteStats(team, id), IDLE_MS)
  const [cat, setCat] = useState(0)
  const [stat, setStat] = useState<number | null>(null)
  if (!data) return <Spinner />
  const cats = data.categories ?? []
  if (!cats.length) return <Empty>No career stats.</Empty>

  const c = cats[Math.min(cat, cats.length - 1)]
  const si = stat ?? Math.max(0, c.labels.findIndex((l) => ['PTS', 'YDS', 'TOT'].includes(l)))
  const chartData = c.statistics.map((r) => ({ season: r.season.displayName, v: numeric(r.stats[si]) || 0, team: teamName(r.teamSlug) }))

  return (
    <div className="space-y-3">
      <Card title="Career trend">
        <div className="mb-3 flex flex-wrap gap-2">
            <Select
              value={cat}
              onChange={(v) => {
                setCat(v)
                setStat(null)
              }}
              options={cats.map((x, i) => ({ value: i, label: x.displayName }))}
            />
            <Select value={si} onChange={setStat} options={c.labels.map((l, i) => ({ value: i, label: c.displayNames?.[i] ?? l }))} />
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="season" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)' }}
                content={({ active, payload }) => {
                  const d = active && payload?.[0]?.payload
                  if (!d) return null
                  return (
                    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                      <div className="font-semibold">
                        {d.season}: {d.v} {c.labels[si]}
                      </div>
                      {d.team && <div className="text-muted">{d.team}</div>}
                    </div>
                  )
                }}
              />
              <Bar dataKey="v" fill={team.color} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {cats.map((cc) => {
        const cols: Column<SeasonRow>[] = [
          {
            key: 'season',
            label: 'Season',
            render: (r) => (
              <span>
                <span className="font-medium">{r.season.displayName}</span>
                {r.teamSlug && <span className="ml-1 text-[11px] text-muted">{teamName(r.teamSlug)}</span>}
              </span>
            ),
            sort: (r) => r.season.year,
          },
          ...labelColumns<SeasonRow>(cc.labels, (r, i) => r.stats[i], cc.descriptions ?? cc.displayNames),
        ]
        return (
          <Card key={cc.name} title={cc.displayName} pad={false}>
            <StatTable
              columns={cols}
              rows={[...cc.statistics].reverse()}
              rowKey={(r, i) => `${r.season.year}-${i}`}
              footer={cc.totals?.length ? ['Career', ...cc.totals] : undefined}
              dense
            />
          </Card>
        )
      })}
    </div>
  )
}

function teamName(slug?: string) {
  if (!slug) return ''
  return slug
    .split('-')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
}
