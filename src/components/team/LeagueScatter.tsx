import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
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
  /** League player shown as a (smaller) face because there was room. */
  face?: boolean
}

const tick = { fill: 'var(--muted)', fontSize: 11 }
/** Headshot radius in px: a bit smaller on phones. */
const faceR = (width: number) => (width < 500 ? 12 : 18)

/** Track an element's rendered size. */
function useSize() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

/** Square-cropped ESPN headshot. */
function faceUrl(league: string, id: string, size = 96) {
  return `https://a.espncdn.com/combiner/i?img=/i/headshots/${league}/players/full/${id}.png&w=${size}&h=${size}&scale=crop`
}

function initials(n: string) {
  return n
    .replace(/\./g, ' ')
    .split(' ')
    .filter((w) => w && !/^(Jr|Sr|II|III|IV)$/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
}

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

/** Round a data range out to "nice" ticks so we know exactly where each point lands. */
function niceScale(values: number[], int?: boolean) {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const raw = (hi - lo || Math.abs(hi) || 1) / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  let step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  if (int) step = Math.max(1, Math.round(step))
  let start = Math.floor(lo / step) * step
  let end = Math.ceil(hi / step) * step
  // Leave room so a face at the very edge doesn't sit on the axis labels.
  if (lo - start < step * 0.15 && lo >= 0 === start - step >= 0) start -= step
  if (end - hi < step * 0.15) end += step
  const ticks: number[] = []
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v / step) * step)
  return { domain: [start, end] as [number, number], ticks }
}

const Y_AXIS_W = 44
const X_AXIS_H = 30

/**
 * Lay out the chart in the same pixels recharts will use:
 *  1. name our players, most important first, unless the name would overlap
 *     another name or one of our faces;
 *  2. give other players a face too, most important first, wherever it fits
 *     without touching any face or name already placed (capped, to keep the
 *     number of images reasonable).
 */
function layout(
  ours: Pt[],
  rest: Pt[],
  xd: [number, number],
  yd: [number, number],
  flip: { x?: boolean; y?: boolean },
  w: number,
  h: number,
  r: number,
  rl: number,
) {
  for (const p of rest) p.face = false
  if (!w) return
  const plotW = Math.max(100, w - Y_AXIS_W - (r + 4))
  const plotH = Math.max(100, h - (r + 6) - 16 - X_AXIS_H)
  const fx = (v: number) => ((flip.x ? xd[1] - v : v - xd[0]) / (xd[1] - xd[0] || 1)) * plotW
  const fy = (v: number) => (1 - (flip.y ? yd[1] - v : v - yd[0]) / (yd[1] - yd[0] || 1)) * plotH

  const faces = ours.map((p) => ({ p, x: fx(p.x), y: fy(p.y), r }))
  const labels: { x: number; y: number; half: number }[] = []
  for (const p of [...ours].sort((a, b) => b.w - a.w)) {
    const name = shortName(p.name)
    const half = (name.length * 6.6) / 2 + 2
    const x = fx(p.x)
    const y = fy(p.y) + r + 9
    if (labels.some((q) => Math.abs(q.x - x) < q.half + half && Math.abs(q.y - y) < 14)) continue
    if (faces.some((f) => f.p !== p && Math.abs(f.x - x) < half + r && Math.abs(f.y - y) < r + 6)) continue
    labels.push({ x, y, half })
    p.label = name
  }

  const cap = w < 500 ? 14 : 36
  let n = 0
  for (const p of [...rest].sort((a, b) => b.w - a.w)) {
    if (n >= cap) break
    if (!p.id) continue
    const x = fx(p.x)
    const y = fy(p.y)
    if (faces.some((f) => Math.hypot(f.x - x, f.y - y) < f.r + rl + 4)) continue
    if (labels.some((q) => Math.abs(q.x - x) < q.half + rl && Math.abs(q.y - y) < rl + 7)) continue
    faces.push({ p, x, y, r: rl })
    p.face = true
    n++
  }
}

/**
 * One league-wide scatter: every qualified player is a grey dot, our team's
 * players are their headshots in a team-colour ring, with names. Dashed lines
 * are league medians.
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
  const [box, size] = useSize()
  const r = faceR(size.w)
  const uid = useId().replace(/:/g, '')
  const pts: Pt[] = []
  for (const r of rows) {
    if (plot.only && !plot.only(r)) continue
    const x = plot.x.get(r)
    const y = plot.y.get(r)
    if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y)) continue
    pts.push({ x, y, name: r.name, team: r.team, id: r.id, label: '', w: weight(r) })
  }
  // Least important first, so the main players are drawn on top.
  const ours = pts.filter((p) => p.team === team.abbr).sort((a, b) => a.w - b.w)
  const rest = pts.filter((p) => p.team !== team.abbr)
  if (pts.length < 5) return null
  const xs = niceScale(pts.map((p) => p.x), plot.x.int)
  const ys = niceScale(pts.map((p) => p.y), plot.y.int)
  const rl = Math.round(r * 0.72)
  layout(ours, rest, xs.domain, ys.domain, { x: plot.x.lowBetter, y: plot.y.lowBetter }, size.w, size.h, r, rl)
  const restFaces = rest.filter((p) => p.face).sort((a, b) => a.w - b.w)

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
      <div ref={box} className="h-[420px] sm:h-[540px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: r + 6, right: r + 4, bottom: 16, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={xs.domain}
              ticks={xs.ticks}
              height={X_AXIS_H}
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
              domain={ys.domain}
              ticks={ys.ticks}
              reversed={plot.y.lowBetter}
              allowDecimals={!plot.y.int}
              tick={tick}
              tickFormatter={plot.y.fmt}
              tickLine={false}
              axisLine={false}
              width={Y_AXIS_W}
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
                    <div className="flex items-center gap-2 font-semibold">
                      {p.id && <img src={faceUrl(team.league, p.id, 64)} alt="" className="h-8 w-8 rounded-full bg-surface-2 object-cover" />}
                      <span>
                        {p.name} <span className="font-normal text-muted">{p.team}</span>
                      </span>
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
            <Scatter data={rest} fill="var(--muted)" fillOpacity={0.35} isAnimationActive={false} shape={<Dot r={4} />} />
            <Scatter data={restFaces} isAnimationActive={false} shape={<Face color="var(--border)" league={team.league} uid={`${uid}l`} r={rl} muted />} />
            <Scatter
              data={ours}
              isAnimationActive={false}
              shape={<Face color={team.color} league={team.league} uid={uid} r={r} />}
              onClick={(p: unknown) => {
                const id = (p as { payload?: Pt }).payload?.id
                if (id) nav(`/player/${team.key}/${id}`)
              }}
              className="cursor-pointer"
            />
            {/* Names in their own layer so no face covers them. */}
            <Scatter data={ours} isAnimationActive={false} shape={<Name r={r} />} tooltipType="none" style={{ pointerEvents: 'none' }} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        {plot.style ? 'Playing style, no corner is better' : 'Up and to the right is better'} · dashed lines = league median · tap a{' '}
        {team.nickname} player to open their page
      </p>
    </Card>
  )
}

function Dot({ cx, cy, r, fill, fillOpacity, ring }: { cx?: number; cy?: number; r: number; fill?: string; fillOpacity?: number; ring?: boolean }) {
  if (cx === undefined || cy === undefined) return null
  return <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={fillOpacity} stroke={ring ? 'var(--surface)' : 'none'} strokeWidth={ring ? 2 : 0} />
}

/** A player's headshot in a team-colour ring, with their name underneath when there's room. */
function Face({
  cx,
  cy,
  payload,
  color,
  league,
  uid,
  r,
  muted,
}: {
  cx?: number
  cy?: number
  payload?: Pt
  color: string
  league: string
  uid: string
  r: number
  /** Other teams' players: thinner ring, slightly faded. */
  muted?: boolean
}) {
  const [failed, setFailed] = useState(false)
  if (cx === undefined || cy === undefined || !payload) return null
  const clip = `${uid}-${payload.id ?? payload.name.replace(/\W/g, '')}`
  return (
    <g opacity={muted ? 0.85 : 1}>
      <circle cx={cx} cy={cy} r={r + (muted ? 1.5 : 2.5)} fill={color} />
      <circle cx={cx} cy={cy} r={r} fill="var(--surface-2)" />
      {payload.id && !failed ? (
        <>
          <clipPath id={clip}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
          <image
            href={faceUrl(league, payload.id)}
            x={cx - r}
            y={cy - r}
            width={r * 2}
            height={r * 2}
            clipPath={`url(#${clip})`}
            preserveAspectRatio="xMidYMid slice"
            onError={() => setFailed(true)}
          />
        </>
      ) : (
        <text x={cx} y={cy} dy="0.35em" textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text)">
          {initials(payload.name)}
        </text>
      )}
    </g>
  )
}

function Name({ cx, cy, payload, r }: { cx?: number; cy?: number; payload?: Pt; r: number }) {
  if (cx === undefined || cy === undefined || !payload?.label) return null
  return (
    <text
      x={cx}
      y={cy + r + 13}
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
      fill="var(--text)"
      stroke="var(--surface)"
      strokeWidth={3}
      paintOrder="stroke"
      strokeLinejoin="round"
    >
      {payload.label}
    </text>
  )
}
