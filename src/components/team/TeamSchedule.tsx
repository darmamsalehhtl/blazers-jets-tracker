import { useState } from 'react'
import { Link } from 'react-router-dom'
import { recordText, scoreText, sides, teamLogo, urls, type EspnEvent, type ScheduleResponse } from '../../lib/espn'
import { gameDate } from '../../lib/format'
import type { TeamConfig } from '../../lib/teams'
import { IDLE_MS, usePoll } from '../../lib/usePoll'
import { Card, Empty, LiveBadge, Logo, Select, Spinner } from '../ui'

const TYPES = [
  { value: 2, label: 'Regular season' },
  { value: 1, label: 'Preseason' },
  { value: 3, label: 'Postseason' },
]

export function TeamSchedule({ team, schedule }: { team: TeamConfig; schedule: ScheduleResponse }) {
  const [type, setType] = useState(schedule.season.type)
  const [season, setSeason] = useState(schedule.season.year)
  const isDefault = type === schedule.season.type && season === schedule.season.year
  const other = usePoll<ScheduleResponse>(isDefault ? null : urls.schedule(team, type, season), IDLE_MS)
  const data = isDefault ? schedule : other.data
  const seasons = Array.from({ length: 6 }, (_, i) => schedule.season.year - i)

  // Group by month for scanning.
  const byMonth = new Map<string, EspnEvent[]>()
  for (const e of data?.events ?? []) {
    const k = new Date(e.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    byMonth.set(k, [...(byMonth.get(k) ?? []), e])
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Select
          label="Season"
          value={season}
          onChange={setSeason}
          options={seasons.map((y) => ({ value: y, label: team.league === 'nba' ? `${y - 1}-${String(y).slice(2)}` : String(y) }))}
        />
        <Select label="Type" value={type} onChange={setType} options={TYPES} />
      </div>
      {!data ? (
        <Spinner />
      ) : !data.events.length ? (
        <Empty>No games.</Empty>
      ) : (
        [...byMonth.entries()].map(([month, events]) => (
          <Card key={month} title={month} pad={false}>
            <ul>
              {events.map((e) => (
                <ScheduleRow key={e.id} team={team} e={e} />
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  )
}

function ScheduleRow({ team, e }: { team: TeamConfig; e: EspnEvent }) {
  const comp = e.competitions[0]
  const { us, them } = sides(comp, team.id)
  const st = comp.status.type
  const result = st.completed ? (us.winner ? 'W' : them.winner ? 'L' : 'T') : null
  const tv = comp.broadcasts?.[0]?.media?.shortName
  return (
    <li className="border-t border-border/60 first:border-0">
      <Link to={`/game/${team.key}/${e.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
        <div className="w-16 shrink-0 text-xs text-muted">
          {e.week?.number && team.league === 'nfl' ? <div className="font-semibold text-text">Wk {e.week.number}</div> : null}
          {gameDate(e.date, { withTime: false })}
        </div>
        <Logo src={teamLogo(them.team)} alt="" size={24} />
        <div className="min-w-0 flex-1 text-sm">
          <div className="truncate font-medium">
            {us.homeAway === 'home' ? 'vs' : '@'} {them.team.displayName}
          </div>
          <div className="truncate text-xs text-muted">
            {st.state === 'pre' ? `${new Date(e.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}${tv ? ` · ${tv}` : ''}` : recordText(us) ? `${team.abbr} ${recordText(us)}` : ''}
            {comp.notes?.[0]?.headline && ` · ${comp.notes[0].headline}`}
          </div>
        </div>
        <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
          {st.state === 'in' ? (
            <span className="flex items-center gap-2">
              <LiveBadge /> {scoreText(us.score)}-{scoreText(them.score)}
            </span>
          ) : result ? (
            <>
              <span className={result === 'W' ? 'text-good' : result === 'L' ? 'text-bad' : 'text-muted'}>{result}</span> {scoreText(us.score)}-
              {scoreText(them.score)}
            </>
          ) : st.name === 'STATUS_POSTPONED' || st.name === 'STATUS_CANCELED' ? (
            <span className="text-muted">{st.description}</span>
          ) : null}
        </div>
      </Link>
    </li>
  )
}
