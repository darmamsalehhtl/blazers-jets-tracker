import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { urls } from '../../lib/espn'
import { gamelogRows, seasonOptions, type GamelogResponse, type GameRow } from '../../lib/player'
import type { TeamConfig } from '../../lib/teams'
import { IDLE_MS, usePoll } from '../../lib/usePoll'
import { labelColumns, StatTable, type Column } from '../StatTable'
import { Card, Empty, Select, Spinner } from '../ui'

export function PlayerGamelog({ team, id }: { team: TeamConfig; id: string }) {
  const [season, setSeason] = useState<number | undefined>()
  const { data } = usePoll<GamelogResponse>(urls.athleteGamelog(team, id, season), IDLE_MS)
  const nav = useNavigate()
  const rows = useMemo(() => (data ? gamelogRows(data) : []), [data])
  if (!data) return <Spinner />

  const seasons = seasonOptions(data.filters)
  const current = season ?? Number(data.filters?.find((f) => f.name === 'season')?.value) ?? seasons[0]?.value
  const groups = [...new Set(rows.map((r) => r.seasonType))]

  const cols: Column<GameRow>[] = [
    {
      key: 'date',
      label: 'Date',
      render: (r) => new Date(r.gameDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      sort: (r) => new Date(r.gameDate).getTime(),
    },
    {
      key: 'opp',
      label: 'Opp',
      align: 'left',
      render: (r) => (
        <span className="flex items-center gap-1.5">
          <span className="text-muted">{r.atVs}</span>
          {r.opponent.logo && <img src={r.opponent.logo} alt="" className="h-4 w-4" />}
          {r.opponent.abbreviation}
        </span>
      ),
    },
    {
      key: 'res',
      label: 'Result',
      align: 'left',
      render: (r) => (
        <span>
          <span className={r.gameResult === 'W' ? 'font-semibold text-good' : r.gameResult === 'L' ? 'font-semibold text-bad' : ''}>{r.gameResult}</span>{' '}
          {r.score}
        </span>
      ),
    },
    ...labelColumns<GameRow>(data.labels, (r, i) => r.stats[i], data.displayNames),
  ]

  return (
    <div className="space-y-3">
      {seasons.length > 0 && (
        <Select label="Season" value={current} onChange={(v) => setSeason(v)} options={seasons} />
      )}
      {!rows.length ? (
        <Empty>No games logged for this season.</Empty>
      ) : (
        groups.map((g) => {
          const gr = rows.filter((r) => r.seasonType === g)
          const totals = data.seasonTypes.find((s) => s.displayName === g)?.summary?.stats
          return (
            <Card key={g} title={`${g} · ${gr.length} games`} pad={false}>
              <StatTable
                columns={cols}
                rows={gr}
                rowKey={(r) => r.id}
                onRowClick={(r) => nav(`/game/${team.key}/${r.id}`)}
                dense
                footer={totals?.[0] ? [totals[0].displayName, '', '', ...totals[0].stats] : undefined}
              />
              {totals && totals.length > 1 && (
                <div className="no-scrollbar overflow-x-auto border-t border-border px-4 py-2 text-xs text-muted">
                  {totals.slice(1).map((t) => (
                    <div key={t.displayName} className="whitespace-nowrap">
                      <b className="text-text">{t.displayName}:</b> {data.labels.map((l, i) => `${l} ${t.stats[i] ?? '–'}`).join(' · ')}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
