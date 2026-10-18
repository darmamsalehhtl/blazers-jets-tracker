import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  biggestRuns,
  fourFactors,
  nbaLine,
  nflTeamAnalytics,
  possessions,
  scoreFlow,
} from '../../lib/analytics'
import { scoreText, teamLogo } from '../../lib/espn'
import { num, pct } from '../../lib/format'
import type { Summary } from '../../lib/summary'
import type { TeamConfig } from '../../lib/teams'
import { Card, Empty, Logo } from '../ui'

interface Row {
  label: string
  title?: string
  away: number
  home: number
  fmt: (v: number) => string
  /** true when the lower number is better */
  low?: boolean
}

export function GameAnalytics({ s, team }: { s: Summary; team: TeamConfig }) {
  const comp = s.header.competitions[0]
  const away = comp.competitors.find((c) => c.homeAway === 'away')!
  const home = comp.competitors.find((c) => c.homeAway === 'home')!
  const ourHome = home.team.id === team.id
  const rows = team.league === 'nba' ? nbaRows(s) : nflRows(s)

  return (
    <div className="space-y-3">
      <ScoreFlowChart s={s} team={team} ourHome={ourHome} />
      {rows.length ? (
        <Card title="Advanced" pad={false}>
          <div className="flex items-center justify-between px-4 pb-1 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Logo src={teamLogo(away.team)} alt="" size={16} /> {away.team.abbreviation}
            </span>
            <span className="flex items-center gap-1.5">
              {home.team.abbreviation} <Logo src={teamLogo(home.team)} alt="" size={16} />
            </span>
          </div>
          <ul>
            {rows.map((r) => {
              const aBetter = r.low ? r.away < r.home : r.away > r.home
              const hBetter = r.low ? r.home < r.away : r.home > r.away
              return (
                <li key={r.label} className="flex items-baseline justify-between gap-3 border-t border-border/60 px-4 py-2 text-sm tabular-nums">
                  <span className={aBetter ? 'font-semibold' : 'text-muted'}>{r.fmt(r.away)}</span>
                  <span className="text-center text-xs text-muted" title={r.title}>
                    {r.label}
                    {r.title && <span className="ml-0.5 cursor-help opacity-60">ⓘ</span>}
                  </span>
                  <span className={hBetter ? 'font-semibold' : 'text-muted'}>{r.fmt(r.home)}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      ) : (
        <Empty>Advanced stats show up once the game starts.</Empty>
      )}
      <p className="px-1 text-[11px] text-muted">
        Computed live from the box score and play-by-play.{' '}
        {team.league === 'nba'
          ? 'Possessions use the Basketball-Reference estimate; ratings are points per 100 possessions.'
          : 'Success = 40% of yards-to-go on 1st down, 60% on 2nd, 100% on 3rd/4th. Explosive = 10+ yd run or 20+ yd pass.'}
      </p>
    </div>
  )
}

function nbaRows(s: Summary): Row[] {
  const teams = s.boxscore?.teams ?? []
  const comp = s.header.competitions[0]
  if (teams.length < 2) return []
  const byId = (id: string) => teams.find((t) => t.team.id === id)!
  const awayC = comp.competitors.find((c) => c.homeAway === 'away')!
  const homeC = comp.competitors.find((c) => c.homeAway === 'home')!
  const a = nbaLine(byId(awayC.team.id), Number(scoreText(awayC.score)) || 0)
  const h = nbaLine(byId(homeC.team.id), Number(scoreText(homeC.score)) || 0)
  if (!a.fga && !h.fga) return []
  const poss = possessions(a, h)
  const fa = fourFactors(a, h, poss)
  const fh = fourFactors(h, a, poss)
  const runs = biggestRuns(s.plays ?? [], [awayC.team.id, homeC.team.id])
  const p1 = (v: number) => pct(v)
  const n1 = (v: number) => num(v)
  const n0 = (v: number) => num(v, 0)
  return [
    { label: 'Possessions', away: poss, home: poss, fmt: n1, title: 'Estimated possessions per team' },
    { label: 'Offensive rating', away: fa.ortg, home: fh.ortg, fmt: n1, title: 'Points scored per 100 possessions' },
    { label: 'Defensive rating', away: fa.drtg, home: fh.drtg, fmt: n1, low: true, title: 'Points allowed per 100 possessions' },
    { label: 'Net rating', away: fa.ortg - fa.drtg, home: fh.ortg - fh.drtg, fmt: (v) => (v > 0 ? '+' : '') + v.toFixed(1) },
    { label: 'eFG%', away: fa.efg, home: fh.efg, fmt: p1, title: 'Effective FG%: (FGM + 0.5×3PM) / FGA' },
    { label: 'True shooting %', away: fa.ts, home: fh.ts, fmt: p1, title: 'PTS / (2 × (FGA + 0.44×FTA))' },
    { label: 'Turnover %', away: fa.tovPct, home: fh.tovPct, fmt: p1, low: true, title: 'Turnovers per possession' },
    { label: 'Off. rebound %', away: fa.orbPct, home: fh.orbPct, fmt: p1, title: 'Share of available offensive rebounds grabbed' },
    { label: 'FT rate', away: fa.ftRate, home: fh.ftRate, fmt: (v) => num(v, 3), title: 'FTM / FGA' },
    { label: 'Assist rate', away: fa.astRate, home: fh.astRate, fmt: p1, title: 'Share of made FGs that were assisted' },
    { label: '3PA rate', away: fa.threeRate, home: fh.threeRate, fmt: p1, title: 'Share of FGA from three' },
    { label: 'Points in paint', away: a.paint ?? NaN, home: h.paint ?? NaN, fmt: n0 },
    { label: 'Fast break points', away: a.fastBreak ?? NaN, home: h.fastBreak ?? NaN, fmt: n0 },
    { label: 'Points off turnovers', away: a.offTov ?? NaN, home: h.offTov ?? NaN, fmt: n0 },
    { label: 'Biggest run', away: runs[awayC.team.id] ?? 0, home: runs[homeC.team.id] ?? 0, fmt: (v) => `${v}-0` },
  ]
}

function nflRows(s: Summary): Row[] {
  const drives = [...(s.drives?.previous ?? [])]
  if (s.drives?.current && !drives.some((d) => d.id === s.drives!.current!.id)) drives.push(s.drives.current)
  if (!drives.length) return []
  const comp = s.header.competitions[0]
  const awayC = comp.competitors.find((c) => c.homeAway === 'away')!
  const homeC = comp.competitors.find((c) => c.homeAway === 'home')!
  const a = nflTeamAnalytics(drives, awayC.team.id, awayC.team.abbreviation)
  const h = nflTeamAnalytics(drives, homeC.team.id, homeC.team.abbreviation)
  const p0 = (v: number) => pct(v, 0)
  const n1 = (v: number) => num(v)
  const n0 = (v: number) => num(v, 0)
  const ratio = (made: number, att: number) => (att ? made / att : NaN)
  return [
    { label: 'Success rate', away: a.successRate, home: h.successRate, fmt: p0, title: 'Share of plays that kept the offense on schedule' },
    { label: 'Yards per play', away: a.ypp, home: h.ypp, fmt: n1 },
    { label: 'Dropback success', away: a.passSuccess, home: h.passSuccess, fmt: p0 },
    { label: 'Rush success', away: a.rushSuccess, home: h.rushSuccess, fmt: p0 },
    { label: 'Yards per dropback', away: a.passYpp, home: h.passYpp, fmt: n1, title: 'Includes sacks' },
    { label: 'Yards per rush', away: a.rushYpp, home: h.rushYpp, fmt: n1 },
    { label: 'Explosive plays', away: a.explosive, home: h.explosive, fmt: n0 },
    { label: 'Early-down pass rate', away: a.earlyDownPassRate, home: h.earlyDownPassRate, fmt: p0, title: 'Dropbacks on 1st/2nd down' },
    { label: '3rd down', away: ratio(a.thirdDownConv, a.thirdDownAtt), home: ratio(h.thirdDownConv, h.thirdDownAtt), fmt: p0 },
    { label: 'Avg 3rd down distance', away: a.avgThirdDownDist, home: h.avgThirdDownDist, fmt: n1, low: true },
    { label: 'Red zone TD %', away: ratio(a.redZoneTds, a.redZoneTrips), home: ratio(h.redZoneTds, h.redZoneTrips), fmt: p0 },
    { label: 'Red zone trips', away: a.redZoneTrips, home: h.redZoneTrips, fmt: n0 },
    { label: 'Scoring drive %', away: ratio(a.pointsDrives, a.drives), home: ratio(h.pointsDrives, h.drives), fmt: p0 },
    { label: 'Avg starting field pos.', away: a.avgStart, home: h.avgStart, fmt: (v) => (Number.isFinite(v) ? `own ${v.toFixed(0)}` : '–') },
    { label: 'Three-and-outs', away: a.threeAndOuts, home: h.threeAndOuts, fmt: n0, low: true },
    { label: 'Sacks taken', away: a.sacks, home: h.sacks, fmt: n0, low: true },
    { label: 'Offensive plays', away: a.plays, home: h.plays, fmt: n0 },
  ]
}

function ScoreFlowChart({ s, team, ourHome }: { s: Summary; team: TeamConfig; ourHome: boolean }) {
  const data = scoreFlow(s, ourHome, team.league)
  if (data.length < 2) return null
  const max = Math.max(5, ...data.map((d) => Math.abs(d.margin)))
  const qLen = team.league === 'nba' ? 12 : 15
  const end = Math.max(4 * qLen, data[data.length - 1].t)
  return (
    <Card title={`${team.nickname} score margin`}>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, end]}
              ticks={[qLen, 2 * qLen, 3 * qLen]}
              tickFormatter={(v: number) => `Q${v / qLen + 1}`}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[-max, max]}
              ticks={[-max, 0, max]}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v > 0 ? `+${v}` : String(v))}
            />
            <ReferenceLine y={0} stroke="var(--muted)" />
            <Tooltip
              cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const d = active && payload?.[0]?.payload
                if (!d) return null
                return (
                  <div className="max-w-64 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold">
                      {d.margin > 0 ? `+${d.margin}` : d.margin} · {d.score}
                    </div>
                    <div className="mt-0.5 line-clamp-3 text-muted">{d.text}</div>
                  </div>
                )
              }}
            />
            <Area
              type="stepAfter"
              dataKey="margin"
              stroke={team.color}
              strokeWidth={2}
              fill={team.color}
              fillOpacity={0.12}
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
