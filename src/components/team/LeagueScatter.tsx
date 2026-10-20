import { useNavigate } from 'react-router-dom'
import { CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { TeamConfig } from '../../lib/teams'
import { Card } from '../ui'

export interface Axis<R> {
  get: (r: R) => number | null
  label: string
  fmt: (v: number) => string
  /** Lower is better: the axis is flipped so up/right always means better. */
  lowBetter?: boolean
  /** Whole-number stat (sacks, carries…): integer ticks only. */
  int?: boolean
}

export interface PlotDef<R> {
  id: string
  title: string
  note: string
  x: Axis<R>
  y: Axis<R>
  /** A playing-style plot: no corner is "better". */
  style?: boolean
  /** Extra qualifier, e.g. enough three-point attempts for 3P% to mean something. */
  only?: (r: R) => boolean
}

interface Pt {
  x: number
  y: number
  name: string
  team: string
  id: string | null
  label: string
  w: number
}

const tick = { fill: 'var(--muted)', fontSize: 11 }

function median(v: number[]) {
  const s = [...v].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Short label for a highlighted player: last name ("G.Smith" → "Smith"). */
function shortName(n: string) {
  const parts = n.replace(/^[A-Z]\.\s?/, '').split(' ')
  const last = parts.filter((p) => !/^(Jr\.?|Sr\.?|II|III|IV)$/.test(p)).pop()
  return last ?? n
}

/**
 * Name our players, most important first, skipping any label that would land
 * on top of one already placed (in chart-relative units, roughly a word wide).
 */
function placeLabels(all: Pt[], ours: Pt[]) {
  const span = (k: 'x' | 'y') => {
    const v = all.map((p) => p[k])
    const lo = Math.min(...v)
    return [lo, Math.max(...v) - lo || 1] as const
  }
  const [x0, xs] = span('x')
  const [y0, ys] = span('y')
  const placed: { x: number; y: number }[] = []
  for (const p of [...ours].sort((a, b) => b.w - a.w)) {
    const nx = (p.x - x0) / xs
    const ny = (p.y - y0) / ys
    if (placed.some((q) => Math.abs(q.x - nx) < 0.16 && Math.abs(q.y - ny) < 0.08)) continue
    placed.push({ x: nx, y: ny })
    p.label = shortName(p.name)
  }
}

/**
 * One league-wide scatter: every qualified player is a grey dot, our team's
 * players are big colour dots with their names. Dashed lines are league medians.
 */
export function LeagueScatter<R extends { id: string | null; name: string; team: string }>({
  plot,
  rows,
  team,
  weight,
}: {
  plot: PlotDef<R>
  rows: R[]
  team: TeamConfig
  /** Who gets a name label first when labels would collide (e.g. minutes played). */
  weight: (r: R) => number
}) {
  const nav = useNavigate()
  const pts: Pt[] = []
  for (const r of rows) {
    if (plot.only && !plot.only(r)) continue
    const x = plot.x.get(r)
    const y = plot.y.get(r)
    if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y)) continue
    pts.push({ x, y, name: r.name, team: r.team, id: r.id, label: '', w: weight(r) })
  }
  const ours = pts.filter((p) => p.team === team.abbr)
  const rest = pts.filter((p) => p.team !== team.abbr)
  if (pts.length < 5) return null
  placeLabels(pts, ours)

  const mx = median(pts.map((p) => p.x))
  const my = median(pts.map((p) => p.y))

  return (
    <Card title={plot.title}>
      <p className="-mt-1 text-xs text-muted">{plot.note}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: team.color }} />
          {team.nickname} ({ours.length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted/50" />
          Rest of league ({rest.length})
        </span>
        <span className="ml-auto font-medium">
          ↑ {plot.y.label}
          {plot.y.lowBetter && ' (flipped)'}
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 12, bottom: 16, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={['auto', 'auto']}
              reversed={plot.x.lowBetter}
              allowDecimals={!plot.x.int}
              tick={tick}
              tickFormatter={plot.x.fmt}
              tickLine={false}
              axisLine={false}
              label={{ value: `${plot.x.label}${plot.x.lowBetter ? ' (flipped)' : ''} →`, position: 'insideBottom', offset: -10, fill: 'var(--muted)', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={['auto', 'auto']}
              reversed={plot.y.lowBetter}
              allowDecimals={!plot.y.int}
              tick={tick}
              tickFormatter={plot.y.fmt}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <ReferenceLine x={mx} stroke="var(--muted)" strokeDasharray="4 4" strokeOpacity={0.6} />
            <ReferenceLine y={my} stroke="var(--muted)" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const p = active && (payload?.[0]?.payload as Pt | undefined)
                if (!p) return null
                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold">
                      {p.name} <span className="font-normal text-muted">{p.team}</span>
                    </div>
                    <div className="mt-0.5 tabular-nums">
                      {plot.x.label}: <b>{plot.x.fmt(p.x)}</b>
                    </div>
                    <div className="tabular-nums">
                      {plot.y.label}: <b>{plot.y.fmt(p.y)}</b>
                    </div>
                  </div>
                )
              }}
            />
            <Scatter data={rest} fill="var(--muted)" fillOpacity={0.35} isAnimationActive={false} shape={<Dot r={3.5} />} />
            <Scatter
              data={ours}
              fill={team.color}
              isAnimationActive={false}
              shape={<Dot r={6} ring />}
              onClick={(p: unknown) => {
                const id = (p as { payload?: Pt }).payload?.id
                if (id) nav(`/player/${team.key}/${id}`)
              }}
              className="cursor-pointer"
            >
              <LabelList dataKey="label" position="top" offset={8} fill="var(--text)" fontSize={11} fontWeight={600} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        {plot.style ? 'Playing style, no corner is better' : 'Up and to the right is better'} · dashed lines = league median · tap a{' '}
        {team.nickname} dot to open the player
      </p>
    </Card>
  )
}

function Dot({ cx, cy, r, fill, fillOpacity, ring }: { cx?: number; cy?: number; r: number; fill?: string; fillOpacity?: number; ring?: boolean }) {
  if (cx === undefined || cy === undefined) return null
  return <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={fillOpacity} stroke={ring ? 'var(--surface)' : 'none'} strokeWidth={ring ? 2 : 0} />
}
