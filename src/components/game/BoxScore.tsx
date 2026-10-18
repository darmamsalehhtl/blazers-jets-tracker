import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { teamLogo } from '../../lib/espn'
import type { BoxAthlete, BoxGroup, Summary } from '../../lib/summary'
import type { TeamConfig } from '../../lib/teams'
import { labelColumns, StatTable, type Column } from '../StatTable'
import { Card, Empty, Logo } from '../ui'

/** Parse "7-15" style made-attempted strings. */
export function madeAtt(v?: string): [number, number] {
  const [m, a] = (v ?? '').split(/[-/]/).map(Number)
  return [m || 0, a || 0]
}

export function trueShooting(pts: number, fga: number, fta: number) {
  const tsa = fga + 0.44 * fta
  return tsa > 0 ? pts / (2 * tsa) : NaN
}

export function TeamToggle({ s, value, onChange }: { s: Summary; value: number; onChange: (i: number) => void }) {
  const teams = s.boxscore?.players?.map((p) => p.team) ?? s.boxscore?.teams?.map((t) => t.team) ?? []
  return (
    <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
      {teams.map((t, i) => (
        <button
          key={t.id}
          onClick={() => onChange(i)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${
            value === i ? 'bg-surface shadow-sm' : 'text-muted'
          }`}
        >
          <Logo src={teamLogo(t)} alt="" size={18} />
          {t.abbreviation}
        </button>
      ))}
    </div>
  )
}

export function BoxScore({ s, team }: { s: Summary; team: TeamConfig }) {
  const players = s.boxscore?.players ?? []
  const ours = Math.max(0, players.findIndex((p) => p.team.id === team.id))
  const [side, setSide] = useState(ours)
  const nav = useNavigate()

  if (!players.length) return <Empty>Box score shows up once the game starts.</Empty>
  const tp = players[side] ?? players[0]
  const open = (a: BoxAthlete) => nav(`/player/${team.key}/${a.athlete.id}`)

  return (
    <div className="space-y-3">
      <TeamToggle s={s} value={side} onChange={setSide} />
      {tp.statistics.map((g, gi) =>
        team.league === 'nba' ? (
          <NbaGroup key={gi} g={g} onOpen={open} />
        ) : (
          <Card key={gi} title={g.text ?? g.name} pad={false}>
            <StatTable
              columns={[nameCol(), ...labelColumns<BoxAthlete>(g.labels, (a, i) => a.stats[i], g.descriptions)]}
              rows={g.athletes}
              rowKey={(a) => a.athlete.id}
              onRowClick={open}
              footer={g.totals?.some(Boolean) ? ['Team', ...g.totals] : undefined}
              dense
            />
          </Card>
        ),
      )}
    </div>
  )
}

function nameCol(): Column<BoxAthlete> {
  return {
    key: 'name',
    label: 'Player',
    render: (a) => (
      <span className="font-medium">
        {a.athlete.shortName ?? a.athlete.displayName}
        {a.athlete.position?.abbreviation && <span className="ml-1 text-[11px] text-muted">{a.athlete.position.abbreviation}</span>}
        {a.ejected && <span className="ml-1 text-[10px] font-bold text-bad">EJ</span>}
      </span>
    ),
    sort: (a) => a.athlete.displayName,
  }
}

function NbaGroup({ g, onOpen }: { g: BoxGroup; onOpen: (a: BoxAthlete) => void }) {
  const ix = (l: string) => g.labels.indexOf(l)
  const tsCol: Column<BoxAthlete> = {
    key: 'ts',
    label: 'TS%',
    title: 'True shooting %: PTS / (2 × (FGA + 0.44 × FTA))',
    render: (a) => {
      const v = ts(a.stats)
      return Number.isFinite(v) ? (v * 100).toFixed(1) : '–'
    },
    sort: (a) => {
      const v = ts(a.stats)
      return Number.isFinite(v) ? v : -1
    },
  }
  function ts(stats: string[]) {
    const pts = Number(stats[ix('PTS')]) || 0
    const [, fga] = madeAtt(stats[ix('FG')])
    const [, fta] = madeAtt(stats[ix('FT')])
    return trueShooting(pts, fga, fta)
  }

  const cols = [nameCol(), ...labelColumns<BoxAthlete>(g.labels, (a, i) => a.stats[i], g.descriptions), tsCol]
  const played = g.athletes.filter((a) => !a.didNotPlay && a.stats.length)
  const starters = played.filter((a) => a.starter)
  const bench = played.filter((a) => !a.starter)
  const dnp = g.athletes.filter((a) => a.didNotPlay || !a.stats.length)
  const totalTs = g.totals ? ts(g.totals) : NaN

  return (
    <>
      <Card title="Starters" pad={false}>
        <StatTable columns={cols} rows={starters} rowKey={(a) => a.athlete.id} onRowClick={onOpen} dense />
      </Card>
      <Card title="Bench" pad={false}>
        <StatTable
          columns={cols}
          rows={bench}
          rowKey={(a) => a.athlete.id}
          onRowClick={onOpen}
          dense
          footer={
            g.totals?.some(Boolean)
              ? ['Team totals', ...g.totals.map((t) => t || ''), Number.isFinite(totalTs) ? (totalTs * 100).toFixed(1) : '']
              : undefined
          }
        />
      </Card>
      {dnp.length > 0 && (
        <Card title="Did not play">
          <ul className="space-y-1 text-sm">
            {dnp.map((a) => (
              <li key={a.athlete.id} className="flex justify-between gap-3">
                <button onClick={() => onOpen(a)} className="text-left font-medium hover:underline">
                  {a.athlete.displayName}
                </button>
                <span className="text-right text-xs text-muted">{a.reason ?? 'DNP'}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
