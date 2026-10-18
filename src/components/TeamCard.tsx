import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { recordText, scoreText, sides, teamLogo, urls, type EspnEvent, type ScheduleResponse } from '../lib/espn'
import { countdown, gameDate } from '../lib/format'
import { TEAMS, type TeamKey } from '../lib/teams'
import { IDLE_MS, usePoll } from '../lib/usePoll'
import { LiveBadge, Logo } from './ui'

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

export function TeamCard({ teamKey, today }: { teamKey: TeamKey; today?: EspnEvent }) {
  const t = TEAMS[teamKey]
  const { data } = usePoll<ScheduleResponse>(urls.schedule(t), IDLE_MS)
  const now = useNow()

  const events = data?.events ?? []
  const done = events.filter((e) => e.competitions[0].status.type.completed)
  const last = done[done.length - 1]
  const next = events.find((e) => !e.competitions[0].status.type.completed)
  const live = today?.competitions[0].status.type.state === 'in' ? today : undefined

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface">
      <Link to={`/team/${t.key}`} className="relative block p-5">
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: t.color }} />
        <div className="flex items-center gap-4">
          <Logo src={t.logo} alt={t.name} size={64} />
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wider text-muted uppercase">{t.league.toUpperCase()}</div>
            <h2 className="truncate text-2xl font-bold tracking-tight">{t.name}</h2>
            <div className="mt-0.5 text-sm text-muted">
              {data ? (
                <>
                  <span className="font-semibold text-text">{data.team.recordSummary ?? '0-0'}</span>
                  {data.team.standingSummary && <> · {data.team.standingSummary}</>}
                  <> · {data.season.displayName}</>
                </>
              ) : (
                '…'
              )}
            </div>
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {live ? (
          <GameRow label={<LiveBadge />} event={live} teamId={t.id} teamKey={t.key} detail={live.competitions[0].status.type.shortDetail} />
        ) : next ? (
          <GameRow
            label="Next"
            event={next}
            teamId={t.id}
            teamKey={t.key}
            detail={`${gameDate(next.date)} · in ${countdown(next.date, now)}`}
          />
        ) : (
          <div className="p-4 text-sm text-muted">No upcoming games</div>
        )}
        {last ? (
          <GameRow label="Last" event={last} teamId={t.id} teamKey={t.key} detail={gameDate(last.date, { withTime: false })} />
        ) : (
          <div className="p-4 text-sm text-muted">Season hasn't started yet</div>
        )}
      </div>
    </div>
  )
}

function GameRow({
  label,
  event,
  teamId,
  teamKey,
  detail,
}: {
  label: ReactNode
  event: EspnEvent
  teamId: string
  teamKey: TeamKey
  detail: string
}) {
  const comp = event.competitions[0]
  const { us, them } = sides(comp, teamId)
  const state = comp.status.type.state
  const result = state === 'post' ? (us.winner ? 'W' : them.winner ? 'L' : 'T') : null
  const tv = comp.broadcasts?.[0]?.media?.shortName ?? comp.broadcasts?.[0]?.names?.[0]
  return (
    <Link to={`/game/${teamKey}/${event.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-2">
      <div className="w-12 shrink-0 text-xs font-semibold tracking-wider text-muted uppercase">{label}</div>
      <Logo src={teamLogo(them.team)} alt={them.team.displayName} size={28} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {us.homeAway === 'home' ? 'vs' : '@'} {them.team.shortDisplayName ?? them.team.displayName}
          {recordText(them) && <span className="ml-1 font-normal text-muted">({recordText(them)})</span>}
        </div>
        <div className="truncate text-xs text-muted">
          {detail}
          {tv && state !== 'post' ? ` · ${tv}` : ''}
        </div>
      </div>
      {state !== 'pre' && (
        <div className="text-right text-sm font-bold tabular-nums">
          {result && <span className={result === 'W' ? 'text-good' : result === 'L' ? 'text-bad' : 'text-muted'}>{result} </span>}
          {scoreText(us.score)}-{scoreText(them.score)}
        </div>
      )}
    </Link>
  )
}
