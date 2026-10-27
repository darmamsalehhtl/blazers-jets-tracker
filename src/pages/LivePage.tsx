import { useSearchParams } from 'react-router-dom'
import { GameView } from '../components/game/GameView'
import { Empty, ErrorBox, LiveBadge, Logo, Spinner, Updated } from '../components/ui'
import { scoreText, teamLogo, type Competitor } from '../lib/espn'
import { useSpoilers } from '../lib/spoilers'
import { TEAMS } from '../lib/teams'
import { useAllGames, type LeagueGame } from '../lib/useAllGames'

const LABEL = { nyj: 'NFL', por: 'NBA' } as const

/**
 * Every live NFL and NBA game. Pick one from the strip to get its full stats
 * (box score, plays, shot chart, analytics…) underneath.
 */
export default function LivePage() {
  const { games, live, loading, error, updatedAt, refresh } = useAllGames()
  const [params, setParams] = useSearchParams()
  const picked = params.get('g')

  if (loading && !games.length) return <Spinner label="Loading games" />
  if (error && !games.length) return <ErrorBox error={error} retry={refresh} />

  const selected = games.find((g) => g.event.id === picked) ?? live[0]
  const pick = (g: LeagueGame) => setParams({ g: g.event.id }, { replace: true })

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            Live games {live.length > 0 && <LiveBadge label={String(live.length)} />}
          </h1>
          <p className="text-sm text-muted">
            {live.length ? 'Every NFL and NBA game in progress. Tap one for all its stats.' : 'No NFL or NBA game is live right now.'}
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <Updated at={updatedAt} live={live.length > 0} />
        </div>
      </div>

      {games.length === 0 ? (
        <Empty>No games today. Check back on game day.</Empty>
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {games.map((g) => (
            <GameChip key={g.event.id} g={g} active={g.event.id === selected?.event.id} onClick={() => pick(g)} />
          ))}
        </div>
      )}

      {selected ? (
        <GameView key={selected.event.id} teamKey={selected.team} eventId={selected.event.id} />
      ) : (
        games.length > 0 && <Empty>Pick a game above to see its stats.</Empty>
      )}
    </div>
  )
}

function GameChip({ g, active, onClick }: { g: LeagueGame; active: boolean; onClick: () => void }) {
  const comp = g.event.competitions[0]
  const away = comp.competitors.find((c) => c.homeAway === 'away')!
  const home = comp.competitors.find((c) => c.homeAway === 'home')!
  const ours = [away, home].some((c) => c.team.id === TEAMS[g.team].id)
  // Finished games stay spoiler-free until revealed (in the game panel below).
  const hidden = !useSpoilers().canShow({ id: g.event.id, state: g.state })
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`w-40 shrink-0 snap-start rounded-xl border px-3 py-2 text-left ${
        active ? 'border-text bg-surface shadow-sm' : 'border-border bg-surface/60 hover:bg-surface'
      }`}
    >
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold tracking-wider text-muted">
        <span>
          {LABEL[g.team]}
          {ours && <span className="ml-1 text-text">★</span>}
        </span>
        {g.state === 'in' ? (
          <span className="flex items-center gap-1 text-live">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-live" />
            {comp.status.type.shortDetail}
          </span>
        ) : (
          <span>
            {g.state === 'pre'
              ? new Date(comp.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
              : hidden
                ? 'Final'
                : comp.status.type.shortDetail}
          </span>
        )}
      </div>
      <Row c={away} state={g.state} hidden={hidden} />
      <Row c={home} state={g.state} hidden={hidden} />
    </button>
  )
}

function Row({ c, state, hidden }: { c: Competitor; state: LeagueGame['state']; hidden: boolean }) {
  const lost = state === 'post' && c.winner === false && !hidden
  return (
    <div className={`flex items-center gap-2 text-sm ${lost ? 'text-muted' : ''}`}>
      <Logo src={teamLogo(c.team)} alt="" size={18} />
      <span className="flex-1 font-semibold">{c.team.abbreviation}</span>
      {state !== 'pre' && !hidden && <span className="font-bold tabular-nums">{scoreText(c.score)}</span>}
    </div>
  )
}
