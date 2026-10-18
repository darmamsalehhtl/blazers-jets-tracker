import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { ordinal, timeAgo } from '../../lib/format'
import type { JetsData, NflSummary } from '../../lib/seasonData'
import type { TeamConfig } from '../../lib/teams'
import { Card, Empty } from '../ui'

type Fmt = (v: number | null) => string
const fx = (d: number): Fmt => (v) => (v === null ? '–' : (v > 0 && d === 3 ? '+' : '') + v.toFixed(d))
const fp: Fmt = (v) => (v === null ? '–' : `${(v * 100).toFixed(1)}%`)
const fpp: Fmt = (v) => (v === null ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`)

const METRICS: { key: keyof NflSummary; label: string; fmt: Fmt; help: string }[] = [
  { key: 'epaPerPlay', label: 'EPA / play', fmt: fx(3), help: 'Expected points added per play — the best single measure of efficiency.' },
  { key: 'successRate', label: 'Success rate', fmt: fp, help: 'Share of plays with positive EPA.' },
  { key: 'passEpa', label: 'Dropback EPA', fmt: fx(3), help: 'EPA per dropback (includes sacks and scrambles).' },
  { key: 'rushEpa', label: 'Rush EPA', fmt: fx(3), help: 'EPA per designed run.' },
  { key: 'passSuccess', label: 'Dropback success', fmt: fp, help: '' },
  { key: 'rushSuccess', label: 'Rush success', fmt: fp, help: '' },
  { key: 'explosiveRate', label: 'Explosive play rate', fmt: fp, help: 'Runs of 10+ and passes of 20+ yards.' },
  { key: 'thirdDownRate', label: '3rd down conversion', fmt: fp, help: '' },
  { key: 'redZoneEpa', label: 'Red zone EPA / play', fmt: fx(3), help: 'Inside the 20.' },
  { key: 'redZoneSuccess', label: 'Red zone success', fmt: fp, help: '' },
  { key: 'earlyDownPassRate', label: 'Early-down pass rate', fmt: fp, help: '1st and 2nd down dropbacks.' },
  { key: 'proe', label: 'Pass rate over expected', fmt: fpp, help: 'How much more (or less) they pass than an average team would in the same situations.' },
  { key: 'cpoe', label: 'CPOE', fmt: fpp, help: 'Completion % over expected, given throw depth, location and pressure-free context.' },
  { key: 'adot', label: 'Avg depth of target', fmt: fx(1), help: 'Air yards per pass attempt.' },
  { key: 'yacPerCompletion', label: 'YAC / completion', fmt: fx(1), help: 'Yards after catch per completion.' },
  { key: 'sackRate', label: 'Sack rate', fmt: fp, help: 'Sacks per dropback.' },
]

export function JetsAdvanced({ team, data }: { team: TeamConfig; data: JetsData }) {
  if (!data.available) return <Empty>nflverse data isn't available yet ({data.error}).</Empty>
  const n = data.teamCount
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        {data.season} season · from nflverse play-by-play ({data.offense.plays} offensive / {data.defense.plays} defensive plays) · updated{' '}
        {timeAgo(new Date(data.updatedAt))}. Ranks are out of {n}; for defense, rank 1 = best (allows the least).
      </p>

      <Card title="Efficiency vs the league" pad={false}>
        <table className="w-full text-[13px] tabular-nums">
          <thead>
            <tr className="border-b border-border text-[11px] text-muted uppercase">
              <th className="py-1.5 pl-4 text-left font-medium">Metric</th>
              <th className="py-1.5 text-right font-medium">Offense</th>
              <th className="py-1.5 pr-4 text-right font-medium">Defense</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => (
              <tr key={m.key} className="border-b border-border/60 last:border-0">
                <td className="py-2 pl-4" title={m.help}>
                  {m.label}
                  {m.help && <span className="ml-1 cursor-help text-muted opacity-60">ⓘ</span>}
                </td>
                <td className="py-2 text-right">
                  <Ranked value={m.fmt(data.offense[m.key] as number | null)} rank={data.ranks.off[m.key]} of={n} />
                </td>
                <td className="py-2 pr-4 text-right">
                  <Ranked value={m.fmt(data.defense[m.key] as number | null)} rank={data.ranks.def[m.key]} of={n} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <LeagueScatter team={team} data={data} />
      <WeeklyEpa team={team} data={data} />
      <Situational data={data} />
      <BigPlays data={data} />
      <PlayerEfficiency team={team} data={data} />
    </div>
  )
}

function Ranked({ value, rank, of }: { value: string; rank: number | null | undefined; of: number }) {
  const tone = rank ? (rank <= Math.round(of / 4) ? 'text-good' : rank > of - Math.round(of / 4) ? 'text-bad' : 'text-muted') : 'text-muted'
  return (
    <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
      <span className="font-medium">{value}</span>
      <span className={`w-9 text-right text-[11px] ${tone}`}>{rank ? ordinal(rank) : ''}</span>
    </span>
  )
}

function LeagueScatter({ team, data }: { team: TeamConfig; data: JetsData }) {
  const pts = data.league.filter((l) => l.offEpa !== null && l.defEpa !== null).map((l) => ({ x: l.offEpa!, y: l.defEpa!, team: l.team }))
  const us = pts.filter((p) => p.team === team.abbr)
  const rest = pts.filter((p) => p.team !== team.abbr)
  const avgX = pts.reduce((a, p) => a + p.x, 0) / pts.length
  const avgY = pts.reduce((a, p) => a + p.y, 0) / pts.length
  return (
    <Card title="Offense vs defense EPA · every team">
      <p className="mb-2 text-xs text-muted">Right = better offense, up = better defense (fewer EPA allowed). Top-right is elite.</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 12, left: -6 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Offense EPA/play"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              tickFormatter={(v: number) => v.toFixed(2)}
              domain={['auto', 'auto']}
              label={{ value: 'Offense EPA / play →', position: 'insideBottom', offset: -6, fill: 'var(--muted)', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Defense EPA/play"
              reversed
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              tickFormatter={(v: number) => v.toFixed(2)}
              domain={['auto', 'auto']}
            />
            <ZAxis range={[60, 60]} />
            <ReferenceLine x={avgX} stroke="var(--muted)" strokeDasharray="4 4" />
            <ReferenceLine y={avgY} stroke="var(--muted)" strokeDasharray="4 4" />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const d = active && payload?.[0]?.payload
                if (!d) return null
                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold">{d.team}</div>
                    <div className="text-muted">
                      Off {d.x.toFixed(3)} · Def {d.y.toFixed(3)}
                    </div>
                  </div>
                )
              }}
            />
            <Scatter data={rest} fill="var(--muted)" fillOpacity={0.55} isAnimationActive={false}>
              <LabelList dataKey="team" position="top" fontSize={9} fill="var(--muted)" />
            </Scatter>
            <Scatter data={us} fill={team.color} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
              <LabelList dataKey="team" position="top" fontSize={12} fontWeight={700} fill="var(--text)" />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function WeeklyEpa({ team, data }: { team: TeamConfig; data: JetsData }) {
  if (data.games.length < 1) return null
  const rows = data.games.map((g) => ({
    wk: `W${g.week}`,
    label: `Week ${g.week} ${g.home ? 'vs' : '@'} ${g.opp}`,
    Offense: g.off.epaPerPlay,
    'Defense (allowed)': g.def.epaPerPlay,
  }))
  return (
    <Card title="EPA per play by week">
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="wk" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toFixed(2)} />
            <ReferenceLine y={0} stroke="var(--muted)" />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Tooltip
              cursor={{ stroke: 'var(--muted)' }}
              content={({ active, payload }) => {
                const d = active && payload?.[0]?.payload
                if (!d) return null
                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold">{d.label}</div>
                    <div>Offense {d.Offense?.toFixed(3)}</div>
                    <div>Defense allowed {d['Defense (allowed)']?.toFixed(3)}</div>
                  </div>
                )
              }}
            />
            <Line dataKey="Offense" stroke={team.color} strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: team.color }} isAnimationActive={false} />
            <Line
              dataKey="Defense (allowed)"
              stroke="var(--muted)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 4, strokeWidth: 0, fill: 'var(--muted)' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted">Offense: higher is better. Defense: lower is better.</p>
    </Card>
  )
}

function Situational({ data }: { data: JetsData }) {
  const downs = ['1', '2', '3', '4']
  const quarters = ['1', '2', '3', '4', '5']
  const row = (label: string, o?: NflSummary, d?: NflSummary) => (
    <tr key={label} className="border-b border-border/60 last:border-0">
      <td className="py-1.5 pl-4">{label}</td>
      <td className="py-1.5 text-right">{o?.plays ?? '–'}</td>
      <td className="py-1.5 text-right">{fx(3)(o?.epaPerPlay ?? null)}</td>
      <td className="py-1.5 text-right">{fp(o?.successRate ?? null)}</td>
      <td className="py-1.5 text-right">{fx(3)(d?.epaPerPlay ?? null)}</td>
      <td className="py-1.5 pr-4 text-right">{fp(d?.successRate ?? null)}</td>
    </tr>
  )
  const head = (
    <thead>
      <tr className="border-b border-border text-[11px] text-muted uppercase">
        <th className="py-1.5 pl-4 text-left font-medium" />
        <th className="py-1.5 text-right font-medium">Plays</th>
        <th className="py-1.5 text-right font-medium">Off EPA</th>
        <th className="py-1.5 text-right font-medium">Off SR</th>
        <th className="py-1.5 text-right font-medium">Def EPA</th>
        <th className="py-1.5 pr-4 text-right font-medium">Def SR</th>
      </tr>
    </thead>
  )
  return (
    <Card title="Situational" pad={false}>
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full text-[13px] tabular-nums">
          {head}
          <tbody>
            {downs.filter((d) => data.byDown.off[d] || data.byDown.def[d]).map((d) => row(`${ordinal(Number(d))} down`, data.byDown.off[d], data.byDown.def[d]))}
            {quarters
              .filter((q) => data.byQuarter.off[q] || data.byQuarter.def[q])
              .map((q) => row(q === '5' ? 'Overtime' : `Q${q}`, data.byQuarter.off[q], data.byQuarter.def[q]))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function BigPlays({ data }: { data: JetsData }) {
  if (!data.bigPlays.length) return null
  return (
    <Card title="Biggest plays of the season (win probability swing)" pad={false}>
      <ul>
        {data.bigPlays.slice(0, 12).map((p, i) => (
          <li key={i} className="flex gap-3 border-t border-border/60 px-4 py-2 text-sm first:border-0">
            <span className={`w-14 shrink-0 text-right font-semibold tabular-nums ${p.wpa > 0 ? 'text-good' : 'text-bad'}`}>
              {p.wpa > 0 ? '+' : ''}
              {(p.wpa * 100).toFixed(1)}%
            </span>
            <div className="min-w-0">
              <div className="text-[11px] text-muted">
                Week {p.week} vs {p.opp} · Q{p.qtr} {p.clock}
              </div>
              <div className="line-clamp-2">{p.desc}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function PlayerEfficiency({ team, data }: { team: TeamConfig; data: JetsData }) {
  const link = (espnId: string | null, name: string) =>
    espnId ? (
      <Link to={`/player/${team.key}/${espnId}`} className="font-medium hover:underline">
        {name}
      </Link>
    ) : (
      <span className="font-medium">{name}</span>
    )
  const cell = (v: string, r: number | null | undefined) => (
    <td className="px-2 py-1.5 text-right whitespace-nowrap">
      {v}
      {r ? <span className="ml-1 text-[10px] text-muted">{ordinal(r)}</span> : null}
    </td>
  )
  const th = (l: string, title?: string) => (
    <th className="px-2 py-1.5 text-right font-medium whitespace-nowrap" title={title}>
      {l}
    </th>
  )
  const P = data.players
  return (
    <>
      {P.passing.length > 0 && (
        <Card title="Passing efficiency" pad={false}>
          <div className="no-scrollbar overflow-x-auto">
            <table className="stat-table w-full text-[13px] tabular-nums">
              <thead>
                <tr className="border-b border-border text-[11px] text-muted uppercase">
                  <th className="py-1.5 pl-4 text-left font-medium">Passer</th>
                  {th('DB', 'Dropbacks')}
                  {th('EPA/DB')}
                  {th('Tot EPA')}
                  {th('Success')}
                  {th('CPOE')}
                  {th('aDOT')}
                  {th('Sack%')}
                  {th('INT')}
                </tr>
              </thead>
              <tbody>
                {[...P.passing]
                  .sort((a, b) => b.dropbacks - a.dropbacks)
                  .map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="py-1.5 pl-4 whitespace-nowrap">{link(p.espnId, p.name)}</td>
                      <td className="px-2 py-1.5 text-right">{p.dropbacks}</td>
                      {cell(fx(3)(p.epaPerDb), p.ranks?.epaPerDb)}
                      {cell(fx(1)(p.totalEpa), p.ranks?.totalEpa)}
                      {cell(fp(p.successRate), p.ranks?.successRate)}
                      {cell(fpp(p.cpoe), p.ranks?.cpoe)}
                      {cell(fx(1)(p.adot), p.ranks?.adot)}
                      {cell(fp(p.sackRate), p.ranks?.sackRate)}
                      <td className="px-2 py-1.5 pr-4 text-right">{p.ints}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card title="Receiving efficiency" pad={false}>
        <div className="no-scrollbar overflow-x-auto">
          <table className="stat-table w-full text-[13px] tabular-nums">
            <thead>
              <tr className="border-b border-border text-[11px] text-muted uppercase">
                <th className="py-1.5 pl-4 text-left font-medium">Player</th>
                {th('Tgt')}
                {th('Rec')}
                {th('EPA/Tgt')}
                {th('Tot EPA')}
                {th('Success')}
                {th('Catch%')}
                {th('aDOT')}
                {th('YAC/Rec')}
                {th('Yds/Tgt')}
                {th('Air Yds')}
              </tr>
            </thead>
            <tbody>
              {[...P.receiving]
                .sort((a, b) => b.targets - a.targets)
                .map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="py-1.5 pl-4 whitespace-nowrap">{link(p.espnId, p.name)}</td>
                    <td className="px-2 py-1.5 text-right">{p.targets}</td>
                    <td className="px-2 py-1.5 text-right">{p.receptions}</td>
                    {cell(fx(3)(p.epaPerTarget), p.ranks?.epaPerTarget)}
                    {cell(fx(1)(p.totalEpa), p.ranks?.totalEpa)}
                    {cell(fp(p.successRate), p.ranks?.successRate)}
                    {cell(fp(p.catchRate), p.ranks?.catchRate)}
                    {cell(fx(1)(p.adot), p.ranks?.adot)}
                    {cell(fx(1)(p.yacPerRec), p.ranks?.yacPerRec)}
                    {cell(fx(1)(p.yardsPerTarget), p.ranks?.yardsPerTarget)}
                    <td className="px-2 py-1.5 pr-4 text-right">{p.airYards}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Rushing efficiency" pad={false}>
        <div className="no-scrollbar overflow-x-auto">
          <table className="stat-table w-full text-[13px] tabular-nums">
            <thead>
              <tr className="border-b border-border text-[11px] text-muted uppercase">
                <th className="py-1.5 pl-4 text-left font-medium">Player</th>
                {th('Car')}
                {th('EPA/Rush')}
                {th('Tot EPA')}
                {th('Success')}
                {th('YPC')}
                {th('Expl%', '10+ yard runs')}
              </tr>
            </thead>
            <tbody>
              {[...P.rushing]
                .sort((a, b) => b.carries - a.carries)
                .map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="py-1.5 pl-4 whitespace-nowrap">{link(p.espnId, p.name)}</td>
                    <td className="px-2 py-1.5 text-right">{p.carries}</td>
                    {cell(fx(3)(p.epaPerRush), p.ranks?.epaPerRush)}
                    {cell(fx(1)(p.totalEpa), p.ranks?.totalEpa)}
                    {cell(fp(p.successRate), p.ranks?.successRate)}
                    {cell(fx(1)(p.ypc), p.ranks?.ypc)}
                    <td className="px-2 py-1.5 pr-4 text-right">{fp(p.explosiveRate)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="px-1 text-[11px] text-muted">
        Player ranks are league-wide among qualifiers (50+ dropbacks, 15+ targets, 25+ carries). Small-sample players show no rank.
      </p>
    </>
  )
}
