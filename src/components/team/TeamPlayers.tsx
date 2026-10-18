import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJSON, headshotUrl, urls } from '../../lib/espn'
import type { TeamConfig } from '../../lib/teams'
import { IDLE_MS, usePoll } from '../../lib/usePoll'
import { StatTable, labelColumns, type Column } from '../StatTable'
import { Card, Empty, Headshot, Select, Spinner } from '../ui'
import { rosterPlayers, type RosterPlayer, type RosterResponse } from './TeamRoster'

export interface AthleteStatCategory {
  name: string
  displayName: string
  labels: string[]
  names?: string[]
  displayNames?: string[]
  descriptions?: string[]
  statistics: { season: { year: number; displayName: string }; stats: string[]; teamId?: string; teamSlug?: string }[]
  totals?: string[]
}
export interface AthleteStatsResponse {
  categories?: AthleteStatCategory[]
}

/** Fetch `/stats` for many athletes with limited concurrency. */
function useManyStats(team: TeamConfig, players: RosterPlayer[] | undefined) {
  const [map, setMap] = useState<Map<string, AthleteStatsResponse>>(new Map())
  const [done, setDone] = useState(0)
  const ids = players?.map((p) => p.id).join(',')

  useEffect(() => {
    if (!players?.length) return
    const ctrl = new AbortController()
    const queue = [...players]
    const out = new Map<string, AthleteStatsResponse>()
    let finished = 0
    setDone(0)
    const worker = async () => {
      while (queue.length && !ctrl.signal.aborted) {
        const p = queue.shift()!
        try {
          out.set(p.id, await getJSON<AthleteStatsResponse>(urls.athleteStats(team, p.id), ctrl.signal))
        } catch {
          // Players without stats 404 — skip them.
        }
        finished++
        if (!ctrl.signal.aborted && (finished % 6 === 0 || finished === players.length)) {
          setDone(finished)
          setMap(new Map(out))
        }
      }
    }
    Promise.all(Array.from({ length: 8 }, worker))
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, team])

  return { map, done, total: players?.length ?? 0 }
}

interface Row {
  p: RosterPlayer
  stats: string[]
}

const SORT_PREF = ['PTS', 'YDS', 'TOT', 'FGM', 'PUNTS', 'TD']

export function TeamPlayers({ team }: { team: TeamConfig }) {
  const roster = usePoll<RosterResponse>(urls.roster(team), IDLE_MS)
  const players = useMemo(() => (roster.data ? rosterPlayers(roster.data) : undefined), [roster.data])
  const { map, done, total } = useManyStats(team, players)
  const nav = useNavigate()

  // Seasons present anywhere in the loaded data; default to the newest.
  const years = useMemo(() => {
    const s = new Map<number, string>()
    for (const r of map.values())
      for (const c of r.categories ?? []) for (const row of c.statistics ?? []) s.set(row.season.year, row.season.displayName)
    return [...s.entries()].sort((a, b) => b[0] - a[0]).slice(0, 8)
  }, [map])
  const [year, setYear] = useState<number | null>(null)
  const season = year ?? years[0]?.[0]

  const tables = useMemo(() => {
    const cats = new Map<string, { cat: AthleteStatCategory; rows: Row[] }>()
    for (const p of players ?? []) {
      const r = map.get(p.id)
      for (const c of r?.categories ?? []) {
        const row = c.statistics?.find((s) => s.season.year === season)
        if (!row) continue
        if (!cats.has(c.name)) cats.set(c.name, { cat: c, rows: [] })
        cats.get(c.name)!.rows.push({ p, stats: row.stats })
      }
    }
    for (const t of cats.values()) {
      const si = SORT_PREF.map((l) => t.cat.labels.indexOf(l)).find((i) => i >= 0) ?? 0
      t.rows.sort((a, b) => (parseFloat(b.stats[si]) || 0) - (parseFloat(a.stats[si]) || 0))
    }
    return [...cats.values()]
  }, [players, map, season])

  if (!players) return <Spinner />

  const nameCol: Column<Row> = {
    key: 'name',
    label: 'Player',
    render: (r) => (
      <span className="flex items-center gap-2">
        <Headshot src={headshotUrl(r.p.headshot)} alt="" size={24} />
        <span className="font-medium">{r.p.shortName ?? r.p.displayName}</span>
        <span className="text-[11px] text-muted">{r.p.position?.abbreviation}</span>
      </span>
    ),
    sort: (r) => r.p.displayName,
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {years.length > 0 && (
          <Select label="Season" value={season ?? 0} onChange={setYear} options={years.map(([y, d]) => ({ value: y, label: d }))} />
        )}
        {done < total && <span className="text-xs text-muted">Loading players {done}/{total}…</span>}
      </div>
      {tables.length === 0 ? (
        done < total ? (
          <Spinner label="Loading player stats" />
        ) : (
          <Empty>No player stats for this season.</Empty>
        )
      ) : (
        tables.map(({ cat, rows }) => (
          <Card key={cat.name} title={`${cat.displayName} · ${rows.length}`} pad={false}>
            <StatTable
              columns={[nameCol, ...labelColumns<Row>(cat.labels, (r, i) => r.stats[i], cat.descriptions ?? cat.displayNames)]}
              rows={rows}
              rowKey={(r) => r.p.id}
              onRowClick={(r) => nav(`/player/${team.key}/${r.p.id}`)}
              dense
            />
          </Card>
        ))
      )}
      <p className="text-[11px] text-muted">Tap a column header to sort, tap a player for their full profile.</p>
    </div>
  )
}
