import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ordinal } from '../../lib/format'
import { rolling } from '../../lib/player'
import { useSeasonData, type BlazersData, type JetsData } from '../../lib/seasonData'
import type { TeamConfig } from '../../lib/teams'
import { ShotChart } from '../ShotChart'
import { toShots } from '../team/BlazersAdvanced'
import { Card, Empty, ErrorBox, Spinner, Stat } from '../ui'

const p1 = (v: number | null | undefined) => (v === null || v === undefined ? '–' : `${(v * 100).toFixed(1)}%`)
const n1 = (v: number | null | undefined) => (v === null || v === undefined ? '–' : v.toFixed(1))
const n3 = (v: number | null | undefined) => (v === null || v === undefined ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(3)}`)
const pp = (v: number | null | undefined) => (v === null || v === undefined ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`)

export function PlayerAdvanced({ team, id, name }: { team: TeamConfig; id: string; name: string }) {
  const { data, error } = useSeasonData(team.key)
  if (error) return <ErrorBox error={error} />
  if (!data) return <Spinner />
  return team.key === 'por' ? (
    <NbaAdvanced team={team} id={id} name={name} data={data as BlazersData} />
  ) : (
    <NflAdvanced id={id} name={name} data={data as JetsData} />
  )
}

function NbaAdvanced({ team, id, name, data }: { team: TeamConfig; id: string; name: string; data: BlazersData }) {
  const p = data.players.find((x) => x.id === id)
  const shots = useMemo(() => toShots(data.shots).filter((s) => s.playerId === id), [data.shots, id])
  if (!data.available) return <Empty>Season analytics aren't available right now.</Empty>
  if (!p) return <Empty>{name} didn't play for the Blazers in {data.seasonLabel}.</Empty>

  const tsVals = p.games.map((g) => g.ts ?? 0)
  const roll = rolling(tsVals, 10)
  const rows = p.games.map((g, i) => ({ i: i + 1, ts: g.ts === null ? null : Math.round(g.ts * 1000) / 10, roll: Math.round(roll[i] * 1000) / 10, pts: g.pts }))
  const teamTs = data.totals?.us.ts

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        {data.seasonLabel} regular season with the Blazers · {p.gp} games ({p.gs} starts) · {p.mpg} min per game
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="True shooting" value={p1(p.ts)} sub={teamTs ? `team ${p1(teamTs)}` : undefined} />
        <Stat label="Usage" value={p1(p.usg)} sub="of team plays on floor" />
        <Stat label="Assist %" value={p1(p.astPct)} sub="of teammate FGs" />
        <Stat label="Rebound %" value={p1(p.rebPct)} sub={`O ${p1(p.orebPct)} · D ${p1(p.drebPct)}`} />
        <Stat label="eFG%" value={p1(p.efg)} />
        <Stat label="Turnover %" value={p1(p.tovPct)} sub={`AST/TO ${p.astTo?.toFixed(2) ?? '–'}`} />
        <Stat label="3PA rate" value={p1(p.threeRate)} sub={`3P ${p1(p.tpPct)}`} />
        <Stat label="FT rate" value={p1(p.ftr)} sub={`FT ${p1(p.ftPct)}`} />
        <Stat label="Plus/minus" value={`${p.pm > 0 ? '+' : ''}${p.pm}`} sub={`${n1(p.pmPerGame)} per game`} />
        <Stat label="Per 36: PTS" value={n1(p.pts36)} sub={`REB ${n1(p.reb36)} · AST ${n1(p.ast36)}`} />
        <Stat label="Per 36: STL/BLK" value={`${n1(p.stl36)} / ${n1(p.blk36)}`} sub={`TOV ${n1(p.tov36)}`} />
        <Stat label="Scoring" value={n1(p.ppg)} sub={`${n1(p.rpg)} reb · ${n1(p.apg)} ast`} />
      </div>
      {rows.length > 2 && (
        <Card title="True shooting % by game">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="i" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                {teamTs && <ReferenceLine y={teamTs * 100} stroke="var(--muted)" strokeDasharray="4 4" />}
                <Tooltip
                  cursor={{ stroke: 'var(--muted)' }}
                  content={({ active, payload }) => {
                    const d = active && payload?.[0]?.payload
                    if (!d) return null
                    return (
                      <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                        <div className="font-semibold">
                          Game {d.i}: {d.ts ?? '–'}% TS · {d.pts} pts
                        </div>
                        <div className="text-muted">10-game avg {d.roll}%</div>
                      </div>
                    )
                  }}
                />
                <Line dataKey="ts" stroke={team.color} strokeOpacity={0.35} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
                <Line dataKey="roll" stroke={team.color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] text-muted">Thin line = each game, thick line = 10-game rolling average, dashed = team average.</p>
        </Card>
      )}
      {shots.length > 0 && (
        <Card title={`${name} · season shot chart`}>
          <ShotChart shots={shots} color={team.color} />
        </Card>
      )}
    </div>
  )
}

function NflAdvanced({ id, name, data }: { id: string; name: string; data: JetsData }) {
  if (!data.available) return <Empty>nflverse data isn't available yet.</Empty>
  const pass = data.players.passing.find((p) => p.espnId === id)
  const rec = data.players.receiving.find((p) => p.espnId === id)
  const rush = data.players.rushing.find((p) => p.espnId === id)
  if (!pass && !rec && !rush) return <Empty>No play-by-play involvement for {name} in {data.season} yet (offensive skill players only).</Empty>

  const R = ({ r, of }: { r?: number | null; of: number }) => (r ? <span className="text-[11px] text-muted">{ordinal(r)} of {of}</span> : null)

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        {data.season} · nflverse play-by-play. Ranks are league-wide among qualified players.
      </p>
      {pass && (
        <Card title={`Passing · ${pass.dropbacks} dropbacks`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="EPA / dropback" value={n3(pass.epaPerDb)} sub={<R r={pass.ranks?.epaPerDb} of={pass.rankOf} />} />
            <Stat label="Total EPA" value={n1(pass.totalEpa)} sub={<R r={pass.ranks?.totalEpa} of={pass.rankOf} />} />
            <Stat label="Success rate" value={p1(pass.successRate)} sub={<R r={pass.ranks?.successRate} of={pass.rankOf} />} />
            <Stat label="CPOE" value={pp(pass.cpoe)} sub={<R r={pass.ranks?.cpoe} of={pass.rankOf} />} />
            <Stat label="Avg depth of target" value={n1(pass.adot)} sub={<R r={pass.ranks?.adot} of={pass.rankOf} />} />
            <Stat label="Sack rate" value={p1(pass.sackRate)} sub={<R r={pass.ranks?.sackRate} of={pass.rankOf} />} />
          </div>
        </Card>
      )}
      {rec && (
        <Card title={`Receiving · ${rec.targets} targets`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="EPA / target" value={n3(rec.epaPerTarget)} sub={<R r={rec.ranks?.epaPerTarget} of={rec.rankOf} />} />
            <Stat label="Total EPA" value={n1(rec.totalEpa)} sub={<R r={rec.ranks?.totalEpa} of={rec.rankOf} />} />
            <Stat label="Success rate" value={p1(rec.successRate)} sub={<R r={rec.ranks?.successRate} of={rec.rankOf} />} />
            <Stat label="Catch rate" value={p1(rec.catchRate)} sub={<R r={rec.ranks?.catchRate} of={rec.rankOf} />} />
            <Stat label="Avg depth of target" value={n1(rec.adot)} sub={<R r={rec.ranks?.adot} of={rec.rankOf} />} />
            <Stat label="YAC / reception" value={n1(rec.yacPerRec)} sub={<R r={rec.ranks?.yacPerRec} of={rec.rankOf} />} />
            <Stat label="Yards / target" value={n1(rec.yardsPerTarget)} sub={<R r={rec.ranks?.yardsPerTarget} of={rec.rankOf} />} />
            <Stat label="Air yards" value={rec.airYards} />
          </div>
        </Card>
      )}
      {rush && (
        <Card title={`Rushing · ${rush.carries} carries`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="EPA / rush" value={n3(rush.epaPerRush)} sub={<R r={rush.ranks?.epaPerRush} of={rush.rankOf} />} />
            <Stat label="Total EPA" value={n1(rush.totalEpa)} sub={<R r={rush.ranks?.totalEpa} of={rush.rankOf} />} />
            <Stat label="Success rate" value={p1(rush.successRate)} sub={<R r={rush.ranks?.successRate} of={rush.rankOf} />} />
            <Stat label="Yards / carry" value={n1(rush.ypc)} sub={<R r={rush.ranks?.ypc} of={rush.rankOf} />} />
            <Stat label="Explosive rate" value={p1(rush.explosiveRate)} sub={<R r={rush.ranks?.explosiveRate} of={rush.rankOf} />} />
          </div>
        </Card>
      )}
    </div>
  )
}
