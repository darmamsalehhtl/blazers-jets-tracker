import { Link } from 'react-router-dom'
import { headshotUrl, teamLogo } from '../../lib/espn'
import { gameDate } from '../../lib/format'
import type { Summary } from '../../lib/summary'
import type { TeamConfig } from '../../lib/teams'
import { Card, Headshot, Logo } from '../ui'

const ml = (v?: number) => (v === undefined ? '–' : v > 0 ? `+${v}` : String(v))

export function GameInfo({ s, team }: { s: Summary; team: TeamConfig }) {
  const comp = s.header.competitions[0]
  const away = comp.competitors.find((c) => c.homeAway === 'away')!
  const home = comp.competitors.find((c) => c.homeAway === 'home')!
  const odds = s.pickcenter?.[0]
  const gi = s.gameInfo
  const series = s.seasonseries?.[0]

  return (
    <div className="space-y-3">
      {odds && (
        <Card title="Odds" right={odds.provider?.name}>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <div className="text-[11px] text-muted uppercase">Spread</div>
              <div className="font-semibold">{odds.details ?? '–'}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted uppercase">Total</div>
              <div className="font-semibold">{odds.overUnder ?? '–'}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted uppercase">Moneyline</div>
              <div className="font-semibold">
                {away.team.abbreviation} {ml(odds.awayTeamOdds?.moneyLine)} · {home.team.abbreviation} {ml(odds.homeTeamOdds?.moneyLine)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {s.injuries?.some((g) => g.injuries.length) && (
        <Card title="Injuries" pad={false}>
          {s.injuries.map((g) => (
            <div key={g.team.id} className="border-t border-border/60 first:border-0">
              <div className="flex items-center gap-2 px-4 pt-2.5 pb-1 text-xs font-semibold">
                <Logo src={teamLogo(g.team)} alt="" size={16} /> {g.team.abbreviation}
              </div>
              {g.injuries.length === 0 ? (
                <p className="px-4 pb-2 text-sm text-muted">None reported</p>
              ) : (
                <ul>
                  {g.injuries.map((inj) => (
                    <li key={inj.athlete.id} className="flex items-center gap-3 px-4 py-1.5">
                      <Headshot src={headshotUrl(inj.athlete.headshot)} alt="" size={30} />
                      <Link to={`/player/${team.key}/${inj.athlete.id}`} className="min-w-0 flex-1 text-sm">
                        <span className="font-medium">{inj.athlete.displayName}</span>
                        <span className="ml-1 text-xs text-muted">{inj.athlete.position?.abbreviation}</span>
                        {inj.details?.type && (
                          <div className="text-xs text-muted">
                            {[...new Set([inj.details.side, inj.details.type, inj.details.detail])].filter((x) => x && x !== 'Not Specified').join(' ')}
                            {inj.details.returnDate && ` · return ${new Date(inj.details.returnDate).toLocaleDateString()}`}
                          </div>
                        )}
                      </Link>
                      <StatusPill status={inj.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </Card>
      )}

      {series?.events?.length ? (
        <Card title={series.title ?? 'Season series'} right={series.summary}>
          <ul className="space-y-1.5 text-sm">
            {series.events.map((e) => (
              <li key={e.id} className="flex items-center justify-between">
                <Link to={`/game/${team.key}/${e.id}`} className="hover:underline">
                  {gameDate(e.date, { withTime: false })}
                </Link>
                <span className="tabular-nums">
                  {e.competitors.map((c) => `${c.team.abbreviation} ${c.score ?? ''}`).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title="Game info">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">Date</dt>
          <dd>{gameDate(comp.date)}</dd>
          {gi?.venue && (
            <>
              <dt className="text-muted">Venue</dt>
              <dd>
                {gi.venue.fullName}
                {gi.venue.address?.city && `, ${gi.venue.address.city}`}
                {gi.venue.address?.state && `, ${gi.venue.address.state}`}
                {gi.venue.grass !== undefined && team.league === 'nfl' && ` · ${gi.venue.grass ? 'grass' : 'turf'}`}
              </dd>
            </>
          )}
          {gi?.weather?.displayValue && (
            <>
              <dt className="text-muted">Weather</dt>
              <dd>
                {gi.weather.displayValue}
                {gi.weather.temperature !== undefined && `, ${gi.weather.temperature}°F`}
              </dd>
            </>
          )}
          {!!gi?.attendance && (
            <>
              <dt className="text-muted">Attendance</dt>
              <dd>{gi.attendance.toLocaleString()}</dd>
            </>
          )}
          {comp.broadcasts?.length ? (
            <>
              <dt className="text-muted">TV</dt>
              <dd>{comp.broadcasts.map((b) => b.media?.shortName).filter(Boolean).join(', ')}</dd>
            </>
          ) : null}
          {gi?.officials?.length ? (
            <>
              <dt className="text-muted">Officials</dt>
              <dd>
                {gi.officials.map((o) => (o.position?.displayName ? `${o.displayName} (${o.position.displayName})` : o.displayName)).join(', ')}
              </dd>
            </>
          ) : null}
        </dl>
      </Card>

      {s.news?.articles?.length ? (
        <Card title="Coverage" pad={false}>
          <ul>
            {s.news.articles.slice(0, 6).map((a, i) => (
              <li key={i} className="border-t border-border/60 px-4 py-2.5 first:border-0">
                <a href={a.links?.web?.href} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">
                  {a.headline}
                </a>
                {a.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{a.description}</p>}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}

export function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase()
  const tone = s.includes('out') || s.includes('injured reserve') || s === 'ir' ? 'bad' : s.includes('doubt') ? 'bad' : s.includes('question') || s.includes('day') ? 'warn' : 'muted'
  const cls =
    tone === 'bad' ? 'bg-bad/15 text-bad' : tone === 'warn' ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400' : 'bg-surface-2 text-muted'
  return <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{status}</span>
}
