import { Link } from 'react-router-dom'
import { headshotUrl, teamLogo } from '../../lib/espn'
import type { Summary } from '../../lib/summary'
import type { TeamConfig } from '../../lib/teams'
import { Card, Empty, Headshot, Logo } from '../ui'

/** First number in a display value: "5-12" → 5, "33:12" → 33.2, "45.5" → 45.5 */
function leadNumber(v: string) {
  const clock = v.match(/^(\d+):(\d+)$/)
  if (clock) return Number(clock[1]) + Number(clock[2]) / 60
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : NaN
}

// Stats where a lower number is the better one (bar highlights the other side).
const LOWER_IS_BETTER = /turnover|penalt|fumbles|interceptions thrown|sacks|fouls|lost/i

export function TeamCompare({ s }: { s: Summary }) {
  const teams = s.boxscore?.teams ?? []
  if (teams.length < 2 || !teams[0].statistics.length) return <Empty>Team stats show up once the game starts.</Empty>
  // Order away | home to match the scoreboard.
  const [a, h] = teams[0].homeAway === 'home' ? [teams[1], teams[0]] : [teams[0], teams[1]]

  return (
    <Card pad={false}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 text-sm font-semibold">
        <span className="flex items-center gap-2">
          <Logo src={teamLogo(a.team)} alt="" size={22} /> {a.team.abbreviation}
        </span>
        <span className="flex items-center gap-2">
          {h.team.abbreviation} <Logo src={teamLogo(h.team)} alt="" size={22} />
        </span>
      </div>
      <ul>
        {a.statistics.map((st) => {
          const hs = h.statistics.find((x) => x.name === st.name)
          const av = leadNumber(st.displayValue)
          const hv = leadNumber(hs?.displayValue ?? '')
          const total = Math.abs(av) + Math.abs(hv)
          const share = total > 0 && Number.isFinite(total) ? Math.abs(av) / total : 0.5
          const lowerBetter = LOWER_IS_BETTER.test(st.label)
          const aBetter = lowerBetter ? av < hv : av > hv
          const hBetter = lowerBetter ? hv < av : hv > av
          return (
            <li key={st.name} className="border-t border-border/60 px-4 py-2">
              <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
                <span className={aBetter ? 'font-semibold' : 'text-muted'}>{st.displayValue}</span>
                <span className="text-center text-xs text-muted">{st.label}</span>
                <span className={hBetter ? 'font-semibold' : 'text-muted'}>{hs?.displayValue ?? '–'}</span>
              </div>
              {Number.isFinite(av) && Number.isFinite(hv) && (
                <div className="mt-1.5 flex h-1 gap-0.5 overflow-hidden rounded-full">
                  <div className="rounded-full" style={{ width: `${share * 100}%`, background: aBetter ? 'var(--text)' : 'var(--border)' }} />
                  <div className="flex-1 rounded-full" style={{ background: hBetter ? 'var(--text)' : 'var(--border)' }} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function GameLeaders({ s, team }: { s: Summary; team: TeamConfig }) {
  const groups = s.leaders ?? []
  if (!groups.length) return null
  const [a, h] = groups
  const cats = a?.leaders ?? []
  return (
    <Card title={s.header.competitions[0].status.type.state === 'pre' ? 'Season leaders' : 'Game leaders'} pad={false}>
      <div className="grid grid-cols-2 gap-3 px-4 pb-1 text-xs font-semibold">
        {[a, h].map((g, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {g && <Logo src={teamLogo(g.team)} alt="" size={16} />}
            {g?.team.abbreviation}
          </span>
        ))}
      </div>
      <ul>
        {cats.map((cat) => {
          const al = cat.leaders?.[0]
          const hl = h?.leaders.find((x) => x.name === cat.name)?.leaders?.[0]
          if (!al && !hl) return null
          return (
            <li key={cat.name} className="border-t border-border/60 px-4 py-2.5 first:border-0">
              <div className="mb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">{cat.displayName}</div>
              <div className="grid grid-cols-2 gap-3">
                {[al, hl].map((l, i) =>
                  l ? (
                    <Link key={i} to={`/player/${team.key}/${l.athlete.id}`} className="flex min-w-0 items-center gap-2">
                      <Headshot src={headshotUrl(l.athlete.headshot)} alt="" size={36} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{l.athlete.shortName ?? l.athlete.displayName}</div>
                        <div className="line-clamp-2 text-xs text-muted">{l.displayValue}</div>
                      </div>
                    </Link>
                  ) : (
                    <div key={i} />
                  ),
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
