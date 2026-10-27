import { Link } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { headshotUrl, scoreText, sides, teamLogo, urls, type EspnEvent, type ScheduleResponse } from '../../lib/espn'
import { countdown, gameDate, shortDate } from '../../lib/format'
import { findEntry, sv, type StandingsNode } from '../../lib/standings'
import type { TeamConfig } from '../../lib/teams'
import { IDLE_MS, usePoll } from '../../lib/usePoll'
import { StatusPill } from '../game/GameInfo'
import { Card, Headshot, LiveBadge, Logo, SpoilerNote, Stat } from '../ui'
import { useSpoilers } from '../../lib/spoilers'
import type { RosterResponse } from './TeamRoster'

export function completed(events: EspnEvent[]) {
  return events.filter((e) => e.competitions[0].status.type.completed)
}

export function gameResult(e: EspnEvent, teamId: string) {
  const { us, them } = sides(e.competitions[0], teamId)
  const u = Number(scoreText(us.score))
  const o = Number(scoreText(them.score))
  return { us, them, pf: u, pa: o, res: us.winner ? 'W' : them.winner ? 'L' : u === o ? 'T' : u > o ? 'W' : 'L' }
}

export function TeamOverview({ team, schedule }: { team: TeamConfig; schedule: ScheduleResponse }) {
  const done = completed(schedule.events)
  // Before the regular season starts, fall back to preseason results.
  const pre = usePoll<ScheduleResponse>(done.length === 0 ? urls.schedule(team, 1) : null, IDLE_MS)
  const games = done.length ? done : completed(pre.data?.events ?? [])
  const label = done.length ? schedule.season.name : 'Preseason'

  const next = schedule.events.find((e) => !e.competitions[0].status.type.completed)
  const live = schedule.events.find((e) => e.competitions[0].status.type.state === 'in')

  const results = games.map((e) => ({ e, ...gameResult(e, team.id) }))
  const pf = results.reduce((a, r) => a + r.pf, 0)
  const pa = results.reduce((a, r) => a + r.pa, 0)
  const n = results.length || 1
  const { show } = useSpoilers()

  return (
    <div className="space-y-3">
      {(live ?? next) && <NextGame team={team} e={(live ?? next)!} />}

      {results.length > 0 && (
        <>
          <div className={`grid gap-2 ${show ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
            {show && <Stat label="Record" value={`${results.filter((r) => r.res === 'W').length}-${results.filter((r) => r.res === 'L').length}`} sub={label} />}
            <Stat label="PPG" value={(pf / n).toFixed(1)} sub="points scored" />
            <Stat label="Opp PPG" value={(pa / n).toFixed(1)} sub="points allowed" />
            <Stat label="Margin" value={`${pf - pa >= 0 ? '+' : ''}${((pf - pa) / n).toFixed(1)}`} sub="per game" />
          </div>

          {show ? (
            <Card title={`Results · ${label}`}>
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {results
                  .slice()
                  .reverse()
                  .map((r) => (
                    <Link
                      key={r.e.id}
                      to={`/game/${team.key}/${r.e.id}`}
                      className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl bg-surface-2 px-1 py-2 text-center"
                    >
                      <Logo src={teamLogo(r.them.team)} alt={r.them.team.abbreviation} size={22} />
                      <span className={`text-xs font-bold ${r.res === 'W' ? 'text-good' : r.res === 'L' ? 'text-bad' : 'text-muted'}`}>{r.res}</span>
                      <span className="text-[11px] tabular-nums">
                        {r.pf}-{r.pa}
                      </span>
                      <span className="text-[10px] text-muted">{shortDate(r.e.date)}</span>
                    </Link>
                  ))}
              </div>
            </Card>
          ) : (
            <SpoilerNote what="Results, points by game and the standings snapshot are" />
          )}
          {show && <ScoringTrend team={team} results={results} />}
        </>
      )}

      {show && <StandingSnapshot team={team} season={schedule.season.year} />}
      <Injuries team={team} />
    </div>
  )
}

function NextGame({ team, e }: { team: TeamConfig; e: EspnEvent }) {
  const comp = e.competitions[0]
  const { us, them } = sides(comp, team.id)
  const isLive = comp.status.type.state === 'in'
  const tv = comp.broadcasts?.[0]?.media?.shortName
  return (
    <Link to={`/game/${team.key}/${e.id}`} className="block rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2">
      <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{isLive ? <LiveBadge /> : 'Next game'}</div>
      <div className="flex items-center gap-3">
        <Logo src={teamLogo(them.team)} alt="" size={40} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {us.homeAway === 'home' ? 'vs' : '@'} {them.team.displayName}
          </div>
          <div className="text-sm text-muted">
            {isLive ? comp.status.type.shortDetail : `${gameDate(e.date)} · in ${countdown(e.date)}`}
            {tv && ` · ${tv}`}
            {comp.venue?.fullName && ` · ${comp.venue.fullName}`}
          </div>
        </div>
        {isLive && (
          <div className="text-xl font-bold tabular-nums">
            {scoreText(us.score)}-{scoreText(them.score)}
          </div>
        )}
      </div>
    </Link>
  )
}

type Result = ReturnType<typeof gameResult> & { e: EspnEvent }

function ScoringTrend({ team, results }: { team: TeamConfig; results: Result[] }) {
  if (results.length < 2) return null
  const data = results.map((r, i) => ({
    g: i + 1,
    label: `${r.us.homeAway === 'home' ? 'vs' : '@'} ${r.them.team.abbreviation} · ${shortDate(r.e.date)}`,
    For: r.pf,
    Against: r.pa,
    res: r.res,
  }))
  return (
    <Card title="Points by game">
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="g" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
            <Tooltip
              cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const d = active && payload?.[0]?.payload
                if (!d) return null
                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold">
                      Game {d.g} · {d.res} {d.For}-{d.Against}
                    </div>
                    <div className="text-muted">{d.label}</div>
                  </div>
                )
              }}
            />
            <Line type="linear" dataKey="For" stroke={team.color} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: team.color }} isAnimationActive={false} />
            <Line
              type="linear"
              dataKey="Against"
              stroke="var(--muted)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, strokeWidth: 0, fill: 'var(--muted)' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function StandingSnapshot({ team, season }: { team: TeamConfig; season: number }) {
  const { data } = usePoll<StandingsNode>(urls.standings(team, season, 3), IDLE_MS)
  const found = findEntry(data, team.id)
  if (!found) return null
  const { group, entry } = found
  const splits = ['home', 'road', 'vsdiv', 'vsconf', 'lasttengames', 'streak'].map((t) => ({
    t,
    label: entry.stats.find((s) => s.type === t)?.shortDisplayName ?? t,
    v: sv(entry, t),
  }))
  return (
    <Card title={group.name} pad={false}>
      <div className="grid grid-cols-3 gap-2 px-4 pb-3 sm:grid-cols-6">
        {splits
          .filter((s) => s.v !== '–')
          .map((s) => (
            <div key={s.t} className="rounded-lg bg-surface-2 px-2 py-1.5 text-center">
              <div className="text-[10px] text-muted uppercase">{s.label}</div>
              <div className="text-sm font-semibold tabular-nums">{s.v}</div>
            </div>
          ))}
      </div>
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="border-y border-border text-[11px] text-muted">
            <th className="py-1.5 pl-4 text-left font-medium">Team</th>
            <th className="py-1.5 text-right font-medium">W</th>
            <th className="py-1.5 text-right font-medium">L</th>
            <th className="py-1.5 text-right font-medium">PCT</th>
            <th className="py-1.5 text-right font-medium">GB</th>
            <th className="py-1.5 pr-4 text-right font-medium">STRK</th>
          </tr>
        </thead>
        <tbody>
          {group.entries.map((e) => (
            <tr key={e.team.id} className={`border-b border-border/60 last:border-0 ${e.team.id === team.id ? 'bg-surface-2 font-semibold' : ''}`}>
              <td className="py-1.5 pl-4">
                <span className="flex items-center gap-2">
                  <Logo src={teamLogo(e.team)} alt="" size={18} />
                  {e.team.abbreviation}
                </span>
              </td>
              <td className="py-1.5 text-right">{sv(e, 'wins')}</td>
              <td className="py-1.5 text-right">{sv(e, 'losses')}</td>
              <td className="py-1.5 text-right">{sv(e, 'winpercent')}</td>
              <td className="py-1.5 text-right">{sv(e, 'gamesbehind')}</td>
              <td className="py-1.5 pr-4 text-right">{sv(e, 'streak')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function Injuries({ team }: { team: TeamConfig }) {
  const { data } = usePoll<RosterResponse>(urls.roster(team), IDLE_MS)
  if (!data) return null
  const players = data.athletes.flatMap((a) => ('items' in a ? a.items : [a]))
  const hurt = players.filter((p) => p.injuries?.length)
  return (
    <Card title={`Injuries · ${hurt.length}`} pad={false}>
      {hurt.length === 0 ? (
        <p className="px-4 pb-3 text-sm text-muted">No injuries reported.</p>
      ) : (
        <ul>
          {hurt.map((p) => (
            <li key={p.id} className="flex items-center gap-3 border-t border-border/60 px-4 py-2 first:border-0">
              <Headshot src={headshotUrl(p.headshot)} alt="" size={32} />
              <Link to={`/player/${team.key}/${p.id}`} className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{p.displayName}</span>
                <span className="ml-1 text-xs text-muted">{p.position?.abbreviation}</span>
                {p.injuries?.[0]?.date && <div className="text-xs text-muted">since {new Date(p.injuries[0].date).toLocaleDateString()}</div>}
              </Link>
              <StatusPill status={p.injuries![0].status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
