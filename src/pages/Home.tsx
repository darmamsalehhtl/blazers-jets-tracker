import { Link, useSearchParams } from 'react-router-dom'
import { GameView } from '../components/game/GameView'
import { TeamCard } from '../components/TeamCard'
import { LiveBadge, Spinner } from '../components/ui'
import { useLiveGames } from '../lib/useLiveGames'
import { TEAM_ORDER, TEAMS } from '../lib/teams'

/**
 * Main screen: if one of the teams is playing right now, show that game
 * (the Jets win if both are live). Otherwise show the team picker.
 */
export default function Home() {
  const { games, featured, alsoLive, loading } = useLiveGames()
  const [params] = useSearchParams()
  const forcePicker = params.has('pick')

  if (loading) return <Spinner />

  if (featured?.event && !forcePicker) {
    const t = TEAMS[featured.team]
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <LiveBadge /> {t.nickname} are playing
          </div>
          <Link to="/?pick" className="text-sm text-muted hover:text-text">
            All teams →
          </Link>
        </div>
        {alsoLive.map((g) => (
          <Link
            key={g.team}
            to={`/game/${g.team}/${g.event!.id}`}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
          >
            <span className="flex items-center gap-2">
              <LiveBadge /> The {TEAMS[g.team].nickname} are live too
            </span>
            <span className="text-muted">{g.event!.competitions[0].status.type.shortDetail} →</span>
          </Link>
        ))}
        <GameView teamKey={featured.team} eventId={featured.event.id} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your teams</h1>
        <p className="text-sm text-muted">No game on right now. This page switches to the game automatically when one starts.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {TEAM_ORDER.map((k) => (
          <TeamCard key={k} teamKey={k} today={games[k].event} />
        ))}
      </div>
    </div>
  )
}
