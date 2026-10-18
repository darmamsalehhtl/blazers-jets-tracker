import { useState } from 'react'
import { urls, type ScheduleResponse } from '../../lib/espn'
import type { TeamConfig } from '../../lib/teams'
import { IDLE_MS, usePoll } from '../../lib/usePoll'
import { Card, Empty, ErrorBox, Select, Spinner } from '../ui'
import { completed } from './TeamOverview'

interface CoreStat {
  name: string
  displayName: string
  shortDisplayName?: string
  abbreviation?: string
  description?: string
  displayValue: string
  perGameDisplayValue?: string
  rank?: number
  rankDisplayValue?: string
}
interface CoreStats {
  splits?: { categories: { name: string; displayName: string; stats: CoreStat[] }[] }
}
interface SiteStats {
  results?: {
    opponent?: { categories: { name: string; displayName: string; stats: CoreStat[] }[] }[] | { categories: { name: string; displayName: string; stats: CoreStat[] }[] }
  }
}

const LEAGUE_SIZE = { nfl: 32, nba: 30 }

export function TeamStats({ team, schedule }: { team: TeamConfig; schedule: ScheduleResponse }) {
  // Show last season until this one has a regular-season game in the books.
  const started = completed(schedule.events).length > 0 || schedule.season.type !== 2
  const current = schedule.season.year
  const [season, setSeason] = useState(started ? current : current - 1)
  const [type, setType] = useState(2)
  const [side, setSide] = useState<'team' | 'opp'>('team')
  const [q, setQ] = useState('')

  const core = usePoll<CoreStats>(side === 'team' ? urls.coreTeamStats(team, season, type) : null, IDLE_MS)
  const site = usePoll<SiteStats>(side === 'opp' ? urls.teamStats(team) : null, IDLE_MS)

  const opp = site.data?.results?.opponent
  const oppCats = Array.isArray(opp) ? opp[0]?.categories : opp?.categories
  const cats = side === 'team' ? core.data?.splits?.categories : oppCats
  const loading = side === 'team' ? core.loading : site.loading
  const error = side === 'team' ? core.error : site.error
  const n = LEAGUE_SIZE[team.league]
  const filter = q.trim().toLowerCase()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          label="Season"
          value={season}
          onChange={setSeason}
          options={Array.from({ length: 6 }, (_, i) => current - i).map((y) => ({
            value: y,
            label: team.league === 'nba' ? `${y - 1}-${String(y).slice(2)}` : String(y),
          }))}
        />
        <Select label="Type" value={type} onChange={setType} options={[{ value: 2, label: 'Regular' }, { value: 3, label: 'Postseason' }]} />
        {team.league === 'nfl' && (
          <Select
            label="Side"
            value={side}
            onChange={setSide}
            options={[
              { value: 'team', label: 'Jets' },
              { value: 'opp', label: 'Opponents (allowed)' },
            ]}
          />
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a stat…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        />
      </div>
      {side === 'opp' && <p className="text-xs text-muted">Opponent totals are for the current season.</p>}
      {loading ? (
        <Spinner />
      ) : error && !cats ? (
        <ErrorBox error={error} />
      ) : !cats?.length ? (
        <Empty>No stats for this season yet.</Empty>
      ) : (
        cats.map((c) => {
          const stats = c.stats.filter(
            (s) => !filter || s.displayName.toLowerCase().includes(filter) || (s.abbreviation ?? '').toLowerCase().includes(filter),
          )
          if (!stats.length) return null
          return (
            <Card key={c.name} title={c.displayName} pad={false}>
              <table className="w-full text-[13px] tabular-nums">
                <thead>
                  <tr className="border-b border-border text-[11px] text-muted uppercase">
                    <th className="py-1.5 pl-4 text-left font-medium">Stat</th>
                    <th className="py-1.5 text-right font-medium">Total</th>
                    <th className="py-1.5 text-right font-medium">Per game</th>
                    {side === 'team' && <th className="py-1.5 pr-4 text-right font-medium">Rank</th>}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.name} className="border-b border-border/60 last:border-0">
                      <td className="py-1.5 pl-4" title={s.description}>
                        {s.displayName}
                        {s.abbreviation && <span className="ml-1 text-[11px] text-muted">{s.abbreviation}</span>}
                      </td>
                      <td className="py-1.5 text-right font-medium">{s.displayValue}</td>
                      <td className="py-1.5 text-right text-muted">{fmtPerGame(s.perGameDisplayValue)}</td>
                      {side === 'team' && (
                        <td className="py-1.5 pr-4 text-right whitespace-nowrap">
                          {s.rank ? <RankBar rank={s.rank} of={n} label={(s.rankDisplayValue ?? String(s.rank)).replace('Tied-', 'T-')} /> : <span className="text-muted">–</span>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )
        })
      )}
      <p className="text-[11px] text-muted">Rank is ESPN's league rank for that stat (1st = highest value, which isn't always "best", e.g. turnovers).</p>
    </div>
  )
}

function fmtPerGame(v?: string) {
  if (!v) return '–'
  const n = Number(v)
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : v
}

function RankBar({ rank, of, label }: { rank: number; of: number; label: string }) {
  const pct = 1 - (rank - 1) / Math.max(1, of - 1)
  return (
    <span className="inline-flex items-center gap-2">
      <span className="hidden h-1 w-12 overflow-hidden rounded-full bg-surface-2 sm:inline-block">
        <span className="block h-full rounded-full bg-text/60" style={{ width: `${Math.max(4, pct * 100)}%` }} />
      </span>
      <span className="w-14 text-right whitespace-nowrap">{label}</span>
    </span>
  )
}
