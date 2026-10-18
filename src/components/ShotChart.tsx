import { useState } from 'react'
import { distance, zoneSplits, type Shot } from '../lib/shots'

// Court drawn in feet. SVG y grows downward from the baseline, so a shot's
// court y (from the basket) maps to svgY = y + BASKET_Y.
const BASKET_Y = 5.25
const W = 50
const H = 42

function Court() {
  const line = { fill: 'none', stroke: 'var(--border)', strokeWidth: 0.25 }
  const arcR = 23.75
  // Where the 3pt arc meets the corner lines (x = 3 / 47).
  const cornerY = BASKET_Y + Math.sqrt(arcR * arcR - 22 * 22)
  return (
    <g>
      <rect x={0} y={0} width={W} height={H} {...line} />
      <rect x={17} y={0} width={16} height={19} {...line} />
      <circle cx={25} cy={19} r={6} {...line} />
      <path d={`M 21 ${BASKET_Y} A 4 4 0 0 0 29 ${BASKET_Y}`} {...line} />
      <line x1={3} y1={0} x2={3} y2={cornerY} {...line} />
      <line x1={47} y1={0} x2={47} y2={cornerY} {...line} />
      <path d={`M 3 ${cornerY} A ${arcR} ${arcR} 0 0 0 47 ${cornerY}`} {...line} />
      <line x1={22} y1={4} x2={28} y2={4} stroke="var(--muted)" strokeWidth={0.3} />
      <circle cx={25} cy={BASKET_Y} r={0.75} fill="none" stroke="var(--muted)" strokeWidth={0.3} />
    </g>
  )
}

export function ShotChart({ shots, color, caption }: { shots: Shot[]; color: string; caption?: string }) {
  const [hover, setHover] = useState<Shot | null>(null)
  const visible = shots.filter((s) => s.y + BASKET_Y <= H)
  const made = shots.filter((s) => s.made).length
  const zones = zoneSplits(shots)

  return (
    <div>
      <div className="relative">
        <svg viewBox={`-1 -1 ${W + 2} ${H + 2}`} className="w-full" role="img" aria-label={`Shot chart, ${made} of ${shots.length} made`}>
          <Court />
          {visible.map((s, i) => {
            const cx = s.x
            const cy = s.y + BASKET_Y
            const onEnter = () => setHover(s)
            return s.made ? (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={0.85}
                fill={color}
                stroke="var(--surface)"
                strokeWidth={0.25}
                onMouseEnter={onEnter}
                onClick={onEnter}
              />
            ) : (
              <g key={i} onMouseEnter={onEnter} onClick={onEnter} stroke="var(--muted)" strokeWidth={0.3} strokeLinecap="round">
                <circle cx={cx} cy={cy} r={1.1} fill="transparent" stroke="none" />
                <line x1={cx - 0.6} y1={cy - 0.6} x2={cx + 0.6} y2={cy + 0.6} />
                <line x1={cx - 0.6} y1={cy + 0.6} x2={cx + 0.6} y2={cy - 0.6} />
              </g>
            )
          })}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute top-2 left-2 max-w-[75%] rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
            <div className="font-semibold">
              {hover.made ? 'Made' : 'Missed'} {hover.points}PT · {distance(hover).toFixed(0)} ft
            </div>
            {hover.text && <div className="text-muted">{hover.text}</div>}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} /> Made
          </span>
          <span className="flex items-center gap-1">✕ Missed</span>
        </span>
        <span>
          {caption ?? 'FG'} {made}/{shots.length}
          {shots.length ? ` · ${((made / shots.length) * 100).toFixed(1)}%` : ''}
        </span>
      </div>
      <table className="mt-3 w-full text-[13px] tabular-nums">
        <thead>
          <tr className="text-[11px] text-muted uppercase">
            <th className="py-1 text-left font-medium">Zone</th>
            <th className="py-1 text-right font-medium">FG</th>
            <th className="py-1 text-right font-medium">FG%</th>
            <th className="py-1 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.zone} className="border-t border-border/60">
              <td className="py-1.5">{z.zone}</td>
              <td className="py-1.5 text-right">
                {z.made}/{z.att}
              </td>
              <td className="py-1.5 text-right font-medium">{Number.isFinite(z.pct) ? (z.pct * 100).toFixed(1) + '%' : '–'}</td>
              <td className="py-1.5 text-right text-muted">{(z.share * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
