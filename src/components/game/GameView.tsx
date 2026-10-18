import type { TeamKey } from '../../lib/teams'

export function GameView({ teamKey, eventId }: { teamKey: TeamKey; eventId: string }) {
  return <p className="text-muted">Game {eventId} ({teamKey}) coming soon</p>
}
