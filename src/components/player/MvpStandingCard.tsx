import { Link } from 'react-router-dom'
import type { PlayerIndex } from '../../lib/playerIndex'
import { useDataFile } from '../../lib/seasonData'
import type { TeamConfig } from '../../lib/teams'

/** Where this player stands in the "if the season ended today" MVP race of the page's league. */
export function MvpStandingCard({ team, id }: { team: TeamConfig; id: string }) {
  const { data, error } = useDataFile<PlayerIndex>(`players-${team.league}`)
  const league = team.league.toUpperCase()
  const link = `/mvp${team.league === 'nfl' ? '' : '?league=nba'}`
  const p = data?.available ? data.players.find((x) => x.id === id) : undefined

  let body
  if (error || (data && (!data.available || data.mvpError))) body = <span className="text-muted">MVP standing unavailable right now.</span>
  else if (!data) body = <span className="text-muted">Loading…</span>
  else if (!p) body = <span className="text-muted">Not ranked: not on a current {league} roster.</span>
  else if (p.mvp.rank === undefined)
    body = (
      <span>
        <b>Not ranked</b> <span className="text-muted">· {p.mvp.reason}</span>
      </span>
    )
  else
    body = (
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <b className="text-base tabular-nums">
          #{p.mvp.rank} <span className="text-sm font-normal text-muted">of {p.mvp.of}</span>
        </b>
        <span className="text-muted tabular-nums">
          score {p.mvp.score.toFixed(1)} · {p.mvp.gap === 0 ? 'leader' : `−${p.mvp.gap.toFixed(1)} to the leader`}
        </span>
        {p.mvp.atRisk && (
          <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-yellow-700 dark:text-yellow-400">65-game risk</span>
        )}
      </span>
    )

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{league} MVP race</div>
        <div className="mt-0.5">{body}</div>
      </div>
      <Link to={link} className="shrink-0 text-xs font-medium text-muted hover:text-text">
        MVP race →
      </Link>
    </div>
  )
}
