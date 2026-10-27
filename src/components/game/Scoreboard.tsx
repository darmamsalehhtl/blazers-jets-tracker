import { Link } from 'react-router-dom'
import { recordText, scoreText, teamLogo, type Competitor } from '../../lib/espn'
import { countdown, gameDate } from '../../lib/format'
import { liveSituation, periodLabel, type Summary } from '../../lib/summary'
import type { TeamConfig } from '../../lib/teams'
import { HiddenScore, LiveBadge, Logo } from '../ui'
import { useSpoilers } from '../../lib/spoilers'

/** `hidden`: a finished game while spoilers are off — matchup and "Final" only, no score, records or line score. */
export function Scoreboard({ s, team, hidden = false }: { s: Summary; team: TeamConfig; hidden?: boolean }) {
  const comp = s.header.competitions[0]
  const away = comp.competitors.find((c) => c.homeAway === 'away')!
  const home = comp.competitors.find((c) => c.homeAway === 'home')!
  const st = comp.status.type
  const situation = team.league === 'nfl' ? liveSituation(s) : undefined
  const tv = comp.broadcasts?.map((b) => b.media?.shortName).filter(Boolean).join(', ')
  const odds = s.pickcenter?.[0]

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="h-1" style={{ background: accent(team, away, home) }} />
      <div className="px-4 pt-4 pb-3 text-center text-xs font-medium text-muted">
        {st.state === 'in' ? (
          <LiveBadge label={st.shortDetail.toUpperCase()} />
        ) : st.state === 'pre' ? (
          <span>
            {gameDate(comp.date)} · starts in {countdown(comp.date)}
          </span>
        ) : hidden ? (
          <span>
            <span className="font-semibold text-text">Final</span> · {gameDate(comp.date, { withTime: false })}
          </span>
        ) : (
          <span className="font-semibold text-text">{st.detail}</span>
        )}
        {tv && <span> · {tv}</span>}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-4">
        <Side c={away} align="left" state={st.state} possession={situation?.possession} hidden={hidden} />
        <div className="text-center text-xs text-muted">{st.state === 'pre' ? (odds?.details ?? 'vs') : '–'}</div>
        <Side c={home} align="right" state={st.state} possession={situation?.possession} hidden={hidden} />
      </div>

      {st.state === 'in' && team.league === 'nfl' && situation && <FootballSituation s={s} />}

      {hidden ? (
        <div className="flex justify-center border-t border-border px-4 py-3">
          <HiddenScore id={s.header.id} />
        </div>
      ) : (
        st.state !== 'pre' && <LineScore away={away} home={home} />
      )}
    </div>
  )
}

function Side({
  c,
  align,
  state,
  possession,
  hidden,
}: {
  c: Competitor
  align: 'left' | 'right'
  state: string
  possession?: string
  hidden: boolean
}) {
  const lost = state === 'post' && c.winner === false && !hidden
  const { show } = useSpoilers()
  const hasBall = state === 'in' && (possession === c.team.id || c.possession)
  const logo = (
    <Link to={teamPath(c)} className="shrink-0">
      <Logo src={teamLogo(c.team)} alt={c.team.displayName} size={52} />
    </Link>
  )
  return (
    <div className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      {logo}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">
          {align === 'right' && hasBall && <Ball />}
          {c.team.abbreviation}
          {align === 'left' && hasBall && <Ball />}
        </div>
        {show && <div className="text-[11px] text-muted">{recordText(c)}</div>}
        {state !== 'pre' && !hidden && (
          <div className={`text-4xl leading-tight font-bold tracking-tight tabular-nums ${lost ? 'text-muted' : ''}`}>
            {scoreText(c.score)}
          </div>
        )}
      </div>
    </div>
  )
}

/** Our color when we're playing, otherwise a split of both teams' colors. */
function accent(team: TeamConfig, away: Competitor, home: Competitor) {
  if (away.team.id === team.id || home.team.id === team.id) return team.color
  const c = (x: Competitor) => (x.team.color ? `#${x.team.color}` : 'var(--border)')
  return `linear-gradient(90deg, ${c(away)} 50%, ${c(home)} 50%)`
}

function Ball() {
  return <span title="Possession" className="mx-1 inline-block h-2 w-3 rounded-[50%] bg-[#8b4a1c] align-middle" />
}

function teamPath(c: Competitor) {
  const abbr = c.team.abbreviation?.toLowerCase()
  return abbr === 'nyj' || abbr === 'por' ? `/team/${abbr}` : '#'
}

function LineScore({ away, home }: { away: Competitor; home: Competitor }) {
  const n = Math.max(away.linescores?.length ?? 0, home.linescores?.length ?? 0, 4)
  const periods = Array.from({ length: n }, (_, i) => i + 1)
  const val = (c: Competitor, i: number) => {
    const l = c.linescores?.[i]
    return l ? (l.displayValue ?? String(l.value ?? '')) : '–'
  }
  return (
    <div className="no-scrollbar overflow-x-auto border-t border-border px-4 py-2">
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="text-[11px] text-muted">
            <th className="py-1 text-left font-medium" />
            {periods.map((p) => (
              <th key={p} className="w-10 py-1 text-center font-medium">
                {periodLabel(p)}
              </th>
            ))}
            <th className="w-10 py-1 text-center font-semibold">T</th>
          </tr>
        </thead>
        <tbody>
          {[away, home].map((c) => (
            <tr key={c.id}>
              <td className="py-1 font-semibold">{c.team.abbreviation}</td>
              {periods.map((p) => (
                <td key={p} className="py-1 text-center">
                  {val(c, p - 1)}
                </td>
              ))}
              <td className="py-1 text-center font-bold">{scoreText(c.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Down & distance plus a field strip showing where the ball is. */
function FootballSituation({ s }: { s: Summary }) {
  const comp = s.header.competitions[0]
  const sit = liveSituation(s)
  if (!sit) return null
  const offense = comp.competitors.find((c) => c.team.id === sit.possession)
  const toGo = sit.yardsToEndzone
  // Always drawn with the offense driving left → right.
  const ballX = toGo !== undefined ? 100 - toGo : undefined
  const firstDownX = ballX !== undefined && sit.distance ? Math.min(100, ballX + sit.distance) : undefined

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {sit.downDistanceText ?? ''}
          {sit.isRedZone && <span className="ml-2 rounded bg-bad/15 px-1.5 py-0.5 text-[10px] font-bold text-bad">RED ZONE</span>}
        </span>
        {offense && <span className="text-xs text-muted">{offense.team.abbreviation} ball →</span>}
      </div>
      {ballX !== undefined && (
        <div className="relative mt-2 h-6 overflow-hidden rounded-md bg-[#2f6b3a]">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="absolute top-0 h-full w-px bg-white/30" style={{ left: `${(i + 1) * 10}%` }} />
          ))}
          <div className="absolute top-0 h-full w-[6%] bg-white/10" style={{ left: '94%' }} />
          {firstDownX !== undefined && <div className="absolute top-0 h-full w-0.5 bg-yellow-300" style={{ left: `${firstDownX}%` }} />}
          <div className="absolute top-1/2 h-3 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[#8b4a1c] ring-1 ring-white" style={{ left: `${ballX}%` }} />
        </div>
      )}
      {sit.lastPlay && <p className="mt-2 text-xs text-muted">Last play: {sit.lastPlay}</p>}
      {(sit.homeTimeouts !== undefined || sit.awayTimeouts !== undefined) && (
        <p className="mt-1 text-[11px] text-muted">
          Timeouts — {comp.competitors.find((c) => c.homeAway === 'away')?.team.abbreviation}: {sit.awayTimeouts ?? '–'} ·{' '}
          {comp.competitors.find((c) => c.homeAway === 'home')?.team.abbreviation}: {sit.homeTimeouts ?? '–'}
        </p>
      )}
    </div>
  )
}
