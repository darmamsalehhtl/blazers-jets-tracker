import { Link, useParams } from 'react-router-dom'
import { GameView } from '../components/game/GameView'
import { isTeamKey, TEAMS } from '../lib/teams'

export default function GamePage() {
  const { team, eventId } = useParams()
  if (!isTeamKey(team) || !eventId) return <p className="text-muted">Unknown game.</p>
  return (
    <div className="space-y-3">
      <Link to={`/team/${team}`} className="text-sm text-muted hover:text-text">
        ← {TEAMS[team].nickname}
      </Link>
      <GameView key={eventId} teamKey={team} eventId={eventId} />
    </div>
  )
}
