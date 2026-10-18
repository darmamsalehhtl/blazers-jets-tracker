import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { periodLabel, winSeries, type Summary } from '../../lib/summary'
import type { TeamConfig } from '../../lib/teams'
import { Card } from '../ui'

export function WinProbChart({ s, team }: { s: Summary; team: TeamConfig }) {
  const comp = s.header.competitions[0]
  const us = comp.competitors.find((c) => c.team.id === team.id)
  if (!us) return null
  const data = winSeries(s, us.homeAway === 'home')
  if (data.length < 2) return null

  const now = data[data.length - 1].ours
  // First index of each period, used as x-axis ticks.
  const seen = new Set<number>()
  const ticks = data.filter((d) => !seen.has(d.period) && seen.add(d.period)).map((d) => d.i)

  return (
    <Card
      title={`${team.nickname} win probability`}
      right={<span className="text-base font-semibold text-text tabular-nums">{now.toFixed(1)}%</span>}
    >
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="wp-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={team.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={team.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="i"
              type="number"
              domain={[0, data.length - 1]}
              ticks={ticks}
              tickFormatter={(i: number) => periodLabel(data[i]?.period ?? 1)}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="3 3" />
            {ticks.slice(1).map((t) => (
              <ReferenceLine key={t} x={t} stroke="var(--border)" />
            ))}
            <Tooltip
              cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const d = active && payload?.[0]?.payload
                if (!d) return null
                return (
                  <div className="max-w-64 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold">
                      {team.abbr} {d.ours.toFixed(1)}%
                    </div>
                    <div className="text-muted">
                      {periodLabel(d.period)} {d.clock ?? ''} {d.score ? `· ${d.score}` : ''}
                    </div>
                    {d.text && <div className="mt-1 line-clamp-3">{d.text}</div>}
                  </div>
                )
              }}
            />
            <Area
              type="stepAfter"
              dataKey="ours"
              stroke={team.color}
              strokeWidth={2}
              fill="url(#wp-fill)"
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
