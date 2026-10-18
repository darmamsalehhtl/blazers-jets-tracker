import { useState } from 'react'
import { urls } from '../../lib/espn'
import { seasonOptions, type SplitsResponse } from '../../lib/player'
import type { TeamConfig } from '../../lib/teams'
import { IDLE_MS, usePoll } from '../../lib/usePoll'
import { labelColumns, StatTable, type Column } from '../StatTable'
import { Card, Empty, Select, Spinner } from '../ui'

type SplitRow = { displayName: string; stats: string[] }

export function PlayerSplits({ team, id }: { team: TeamConfig; id: string }) {
  const [season, setSeason] = useState<number | undefined>()
  const [category, setCategory] = useState<string | undefined>()
  const { data } = usePoll<SplitsResponse>(urls.athleteSplits(team, id, season, category), IDLE_MS)
  if (!data) return <Spinner />

  const seasons = seasonOptions(data.filters)
  const catFilter = data.filters?.find((f) => f.name === 'category')
  const currentSeason = season ?? Number(data.filters?.find((f) => f.name === 'season')?.value)
  const cats = data.splitCategories.filter((c) => c.splits?.length)

  const cols: Column<SplitRow>[] = [
    { key: 'split', label: 'Split', render: (r) => <span className="font-medium">{r.displayName}</span> },
    ...labelColumns<SplitRow>(data.labels, (r, i) => r.stats[i], data.descriptions ?? data.displayNames),
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {seasons.length > 0 && <Select label="Season" value={currentSeason} onChange={setSeason} options={seasons} />}
        {catFilter && (
          <Select
            label="Show"
            value={category ?? catFilter.value ?? catFilter.options[0].value}
            onChange={setCategory}
            options={catFilter.options.map((o) => ({ value: o.value, label: o.displayValue }))}
          />
        )}
      </div>
      {data.displayName && <p className="text-xs text-muted">{data.displayName}</p>}
      {!cats.length ? (
        <Empty>No splits for this season.</Empty>
      ) : (
        cats.map((c) => (
          <Card key={c.name} title={c.displayName === 'split' ? 'Overall' : c.displayName} pad={false}>
            <StatTable columns={cols} rows={c.splits!} rowKey={(r, i) => `${r.displayName}-${i}`} dense />
          </Card>
        ))
      )}
    </div>
  )
}
