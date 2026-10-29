import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GameView } from '../components/game/GameView'
import { Card, Empty, ErrorBox, HiddenScore, LiveBadge, Logo, Spinner } from '../components/ui'
import { easternDay, espnDate, isDayKey, isMonthKey, monthGrid, parseMonth, scheduleQueries, shiftMonth, today, type DayKey } from '../lib/calendar'
import { scoreText, sides, teamLogo, urls, type Competitor, type EspnEvent, type ScheduleResponse, type ScoreboardResponse } from '../lib/espn'
import { useSpoilers } from '../lib/spoilers'
import { TEAM_ORDER, TEAMS, type TeamConfig } from '../lib/teams'
import { isWithinHours } from '../lib/useLiveGames'
import { IDLE_MS, LIVE_MS, usePoll } from '../lib/usePoll'

interface TeamGame {
  team: TeamConfig
  event: EspnEvent
}

/** The Jets' and Blazers' games in this month's seasons, by Eastern game day. */
function useTeamGames(month: string): Map<DayKey, TeamGame[]> {
  // A month needs at most two schedule types per team, so the hook count is fixed.
  const urlsFor = (t: TeamConfig) => {
    const q = scheduleQueries(t.league, month)
    return [0, 1].map((i) => (q[i] ? urls.schedule(t, q[i].type, q[i].season) : null))
  }
  const [a, b] = TEAM_ORDER.map((k) => TEAMS[k])
  const [a1, a2] = urlsFor(a)
  const [b1, b2] = urlsFor(b)
  const polls = [
    { team: a, poll: usePoll<ScheduleResponse>(a1, IDLE_MS) },
    { team: a, poll: usePoll<ScheduleResponse>(a2, IDLE_MS) },
    { team: b, poll: usePoll<ScheduleResponse>(b1, IDLE_MS) },
    { team: b, poll: usePoll<ScheduleResponse>(b2, IDLE_MS) },
  ]
  const byDay = new Map<DayKey, TeamGame[]>()
  const seen = new Set<string>()
  for (const { team, poll } of polls) {
    for (const event of poll.data?.events ?? []) {
      if (seen.has(event.id)) continue
      seen.add(event.id)
      const k = easternDay(event.date)
      byDay.set(k, [...(byDay.get(k) ?? []), { team, event }])
    }
  }
  return byDay
}

interface DayGame extends TeamGame {
  /** One of our teams plays in it */
  ours: boolean
}

/** Fast while a game is on, every minute just before tip-off, else slow; settled days fetch once. */
function dayInterval(day: DayKey, isToday: boolean) {
  return (d: ScoreboardResponse | undefined) => {
    const comps = (d?.events ?? []).map((e) => e.competitions[0])
    if (comps.some((c) => c.status.type.state === 'in')) return LIVE_MS
    if (comps.some((c) => c.status.type.state === 'pre' && isWithinHours(c.date, 1))) return 60_000
    if (isToday || comps.some((c) => c.status.type.state === 'pre')) return IDLE_MS
    return day > today() ? IDLE_MS : null
  }
}

/** Every NFL and NBA game on `day`: ours first, then NFL, then NBA, each by start time. */
function useDayGames(day: DayKey, isToday: boolean) {
  const interval = dayInterval(day, isToday)
  const [a, b] = TEAM_ORDER.map((k) => TEAMS[k])
  const polls = [
    { team: a, poll: usePoll<ScoreboardResponse>(urls.scoreboard(a, espnDate(day)), interval) },
    { team: b, poll: usePoll<ScoreboardResponse>(urls.scoreboard(b, espnDate(day)), interval) },
  ]
  const games: DayGame[] = polls.flatMap(({ team, poll }) =>
    (poll.data?.events ?? []).map((event) => ({
      team,
      event,
      ours: event.competitions[0].competitors.some((c) => c.team.id === team.id),
    })),
  )
  const league = (g: DayGame) => TEAM_ORDER.indexOf(g.team.key)
  games.sort((a, b) => Number(b.ours) - Number(a.ours) || league(a) - league(b) || a.event.date.localeCompare(b.event.date))
  return {
    games,
    loading: polls.some((p) => p.poll.loading && !p.poll.data),
    failed: polls.filter((p) => p.poll.error && !p.poll.data),
  }
}

function DayGames({
  games,
  loading,
  failed,
  day,
  isToday,
  picked,
  onPick,
}: ReturnType<typeof useDayGames> & { day: DayKey; isToday: boolean; picked?: string; onPick: (id: string) => void }) {
  const title = dayLabel(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  return (
    <Card title={title} right={games.length ? `${games.length} game${games.length === 1 ? '' : 's'}` : undefined} pad={false}>
      {failed.length === 2 ? (
        <div className="px-4 pb-3">
          <ErrorBox error={failed[0].poll.error!} retry={() => failed.forEach((f) => f.poll.refresh())} />
        </div>
      ) : loading && !games.length ? (
        <Spinner label="Loading games" />
      ) : (
        <>
          {failed.map((f) => (
            <p key={f.team.key} className="px-4 pb-2 text-xs text-bad">
              Couldn't load {f.team.league.toUpperCase()} games.{' '}
              <button type="button" onClick={f.poll.refresh} className="underline">
                Try again
              </button>
            </p>
          ))}
          {games.length ? (
            <ul>
              {games.map((g) => (
                <GameRow key={g.event.id} game={g} active={g.event.id === picked} onPick={() => onPick(g.event.id)} />
              ))}
            </ul>
          ) : (
            !failed.length && <Empty>No NFL or NBA games {isToday ? 'today' : 'on this day'}.</Empty>
          )}
        </>
      )}
    </Card>
  )
}

function GameRow({ game: { team, event, ours }, active, onPick }: { game: DayGame; active: boolean; onPick: () => void }) {
  const comp = event.competitions[0]
  const st = comp.status.type
  const hidden = !useSpoilers().canShow({ id: event.id, state: st.state })
  const away = comp.competitors.find((c) => c.homeAway === 'away') ?? comp.competitors[0]
  const home = comp.competitors.find((c) => c.homeAway === 'home') ?? comp.competitors[1]
  const tv = comp.broadcasts?.[0]?.media?.shortName ?? comp.broadcasts?.[0]?.names?.[0]
  const time = new Date(comp.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const odd = st.name === 'STATUS_POSTPONED' || st.name === 'STATUS_CANCELED'
  return (
    <li className={`flex items-center border-t border-border/60 first:border-0 ${active ? 'bg-surface-2' : 'hover:bg-surface-2'}`}>
      <button type="button" onClick={onPick} aria-pressed={active} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left">
        <span className="w-9 shrink-0 text-[10px] font-semibold tracking-wider text-muted">
          {team.league.toUpperCase()}
          {ours && <span className="ml-0.5 text-text">★</span>}
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <TeamLine c={away} state={st.state} hidden={hidden} />
          <TeamLine c={home} state={st.state} hidden={hidden} />
        </span>
        <span className="w-24 shrink-0 text-right text-xs text-muted">
          {st.state === 'in' ? (
            <span className="flex flex-col items-end gap-1">
              <LiveBadge />
              <span className="text-text">{st.shortDetail}</span>
            </span>
          ) : odd ? (
            st.description
          ) : st.state === 'pre' ? (
            <>
              <span className="block font-medium text-text">{time}</span>
              {tv}
            </>
          ) : hidden ? (
            'Final'
          ) : (
            st.shortDetail
          )}
        </span>
      </button>
      {st.completed && hidden && (
        <div className="shrink-0 pr-4">
          <HiddenScore id={event.id} />
        </div>
      )}
    </li>
  )
}

function TeamLine({ c, state, hidden }: { c: Competitor; state: string; hidden: boolean }) {
  const lost = state === 'post' && c.winner === false && !hidden
  return (
    <span className={`flex items-center gap-2 text-sm ${lost ? 'text-muted' : ''}`}>
      <Logo src={teamLogo(c.team)} alt="" size={20} />
      <span className="min-w-0 flex-1 truncate font-medium">
        <span className="sm:hidden">{c.team.abbreviation}</span>
        <span className="hidden sm:inline">{c.team.displayName}</span>
      </span>
      {state !== 'pre' && !hidden && <span className="font-bold tabular-nums">{scoreText(c.score)}</span>}
    </span>
  )
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Format a day key as a date, without the browser's time zone moving it. */
function dayLabel(d: DayKey, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' })
}

/**
 * Every NFL and NBA game by date. The URL holds the picked day (`d`), the
 * month on screen if it differs from the day's (`m`) and the open game (`g`).
 */
export default function CalendarPage() {
  const [params, setParams] = useSearchParams()
  const todayKey = today()
  const d = params.get('d')
  const day = isDayKey(d) ? d : todayKey
  const m = params.get('m')
  const month = isMonthKey(m) ? m : day.slice(0, 7)

  const update = (next: Record<string, string | undefined>, replace: boolean) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined) p.delete(k)
      else p.set(k, v)
    }
    setParams(p, { replace })
  }
  // A new day is a history entry (back returns to the last one); paging months isn't.
  const pickDay = (k: DayKey) => k !== day && update({ d: k, m: undefined, g: undefined }, false)
  const showMonth = (k: string) => update({ m: k === day.slice(0, 7) ? undefined : k }, true)
  const goToday = () => update({ d: todayKey, m: undefined, g: undefined }, day === todayKey)
  const dayGames = useDayGames(day, day === todayKey)
  const picked = dayGames.games.find((g) => g.event.id === params.get('g'))
  const gameRef = useRef<HTMLDivElement>(null)
  // On a phone the stats open below a long list, so bring them into view.
  const scrollTo = useRef(false)
  useEffect(() => {
    if (!scrollTo.current || !picked) return
    scrollTo.current = false
    gameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [picked])
  const pickGame = (id: string) => {
    scrollTo.current = true
    update({ g: id }, true)
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted">Every NFL and NBA game by date. Pick a day, then a game for all its stats.</p>
      </div>
      <div className="grid items-start gap-3 md:grid-cols-[22rem_minmax(0,1fr)]">
        <MonthGrid month={month} day={day} todayKey={todayKey} onPick={pickDay} onMonth={showMonth} onToday={goToday} />
        <DayGames {...dayGames} day={day} isToday={day === todayKey} picked={picked?.event.id} onPick={pickGame} />
      </div>
      {picked && (
        // Tall enough to scroll to before the stats have loaded.
        <div ref={gameRef} className="min-h-dvh scroll-mt-20">
          <GameView key={picked.event.id} teamKey={picked.team.key} eventId={picked.event.id} />
        </div>
      )}
    </div>
  )
}

function MonthGrid({
  month,
  day,
  todayKey,
  onPick,
  onMonth,
  onToday,
}: {
  month: string
  day: DayKey
  todayKey: DayKey
  onPick: (d: DayKey) => void
  onMonth: (m: string) => void
  onToday: () => void
}) {
  const teamGames = useTeamGames(month)
  const [y, mo] = parseMonth(month)
  const title = new Date(Date.UTC(y, mo - 1, 15)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return (
    <section className="rounded-2xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-1">
        <h2 className="mr-auto pl-1 font-semibold" aria-live="polite">
          {title}
        </h2>
        <button type="button" onClick={onToday} className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-2">
          Today
        </button>
        <NavButton label="Previous month" onClick={() => onMonth(shiftMonth(month, -1))} d="M15 18l-6-6 6-6" />
        <NavButton label="Next month" onClick={() => onMonth(shiftMonth(month, 1))} d="M9 18l6-6-6-6" />
      </div>
      <div role="grid" aria-label={title} className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={i} role="columnheader" className="pb-1 text-[11px] font-semibold text-muted">
            {w}
          </div>
        ))}
        {monthGrid(month)
          .flat()
          .map((c) => {
            const selected = c.key === day
            const isToday = c.key === todayKey
            return (
              <button
                key={c.key}
                type="button"
                role="gridcell"
                aria-selected={selected}
                aria-current={isToday ? 'date' : undefined}
                aria-label={dayLabel(c.key, { weekday: 'long', month: 'long', day: 'numeric' })}
                onClick={() => onPick(c.key)}
                className={`flex h-12 flex-col items-center justify-start rounded-lg pt-1 text-sm tabular-nums ${
                  selected ? 'bg-text text-bg' : 'hover:bg-surface-2'
                } ${c.outside && !selected ? 'text-muted/60' : ''}`}
              >
                <span className={isToday && !selected ? 'rounded-full px-1.5 font-bold ring-1 ring-text' : isToday ? 'font-bold' : ''}>{c.day}</span>
                <span className="flex gap-0.5">
                  {teamGames.get(c.key)?.map((g) => <TeamMark key={g.event.id} game={g} />)}
                </span>
              </button>
            )
          })}
      </div>
    </section>
  )
}

/** Opponent logo for a Jets or Blazers game, plus W/L when spoilers allow. */
function TeamMark({ game: { team, event } }: { game: TeamGame }) {
  const { canShow } = useSpoilers()
  const comp = event.competitions[0]
  const { us, them } = sides(comp, team.id)
  const logo = teamLogo(them.team)
  const result =
    comp.status.type.completed && canShow({ id: event.id, state: comp.status.type.state }) ? (us.winner ? 'W' : them.winner ? 'L' : 'T') : null
  return (
    <span className="flex flex-col items-center leading-none" title={`${team.nickname} ${us.homeAway === 'home' ? 'vs' : '@'} ${them.team.displayName}`}>
      {logo ? (
        <span className="rounded-full bg-white p-px">
          <Logo src={logo} alt={`${team.nickname} vs ${them.team.abbreviation}`} size={16} />
        </span>
      ) : (
        // Some exhibition opponents (e.g. international clubs) have no logo.
        <span className="text-[9px] leading-[18px] font-semibold">{them.team.abbreviation}</span>
      )}
      {result && <span className={`text-[9px] font-bold ${result === 'W' ? 'text-good' : result === 'L' ? 'text-bad' : ''}`}>{result}</span>}
    </span>
  )
}

function NavButton({ label, onClick, d }: { label: string; onClick: () => void; d: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </button>
  )
}
