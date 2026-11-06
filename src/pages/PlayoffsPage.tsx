import { useSearchParams } from 'react-router-dom'
import { TEAMS } from '../lib/teams'

const LEAGUES = [
  { id: 'nfl', label: 'NFL', team: TEAMS.nyj },
  { id: 'nba', label: 'NBA', team: TEAMS.por },
] as const

/** NFL and NBA playoff picture: seeding during the season, the bracket in the postseason. */
export default function PlayoffsPage() {
  const [params, setParams] = useSearchParams()
  const league = LEAGUES.find((l) => l.id === params.get('league')) ?? LEAGUES[0]

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Playoff picture</h1>
        <p className="text-sm text-muted">Who's in if the season ended today, and the bracket once the playoffs start.</p>
      </div>

      <div className="flex gap-1.5">
        {LEAGUES.map((l) => (
          <button
            key={l.id}
            onClick={() => setParams(l.id === 'nfl' ? {} : { league: l.id }, { replace: true })}
            aria-pressed={league.id === l.id}
            className={`rounded-full border px-4 py-1 text-sm font-medium ${
              league.id === l.id ? 'border-text bg-text text-bg' : 'border-border text-muted hover:text-text'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
