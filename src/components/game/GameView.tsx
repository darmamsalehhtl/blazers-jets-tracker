import { useState } from 'react'
import { urls } from '../../lib/espn'
import type { Summary } from '../../lib/summary'
import { TEAMS, type TeamKey } from '../../lib/teams'
import { usePoll } from '../../lib/usePoll'
import { gameInterval } from '../../lib/useLiveGames'
import { ErrorBox, Spinner, Tabs, Updated } from '../ui'
import { BoxScore } from './BoxScore'
import { GameInfo } from './GameInfo'
import { GameShots } from './GameShots'
import { NbaPlays, NflDrives } from './Plays'
import { Scoreboard } from './Scoreboard'
import { GameLeaders, TeamCompare } from './TeamCompare'
import { WinProbChart } from './WinProbChart'
import { GameAnalytics } from './GameAnalytics'

type Tab = 'box' | 'team' | 'plays' | 'shots' | 'analytics' | 'info'

export function GameView({ teamKey, eventId }: { teamKey: TeamKey; eventId: string }) {
  const team = TEAMS[teamKey]
  const { data: s, error, loading, updatedAt, refresh } = usePoll<Summary>(urls.summary(team, eventId), (d) => {
    const comp = d?.header.competitions[0]
    if (!comp) return null
    if (comp.status.type.state === 'post') return null
    return gameInterval(comp.status.type.state, comp.date)
  })
  const state = s?.header.competitions[0].status.type.state
  const [tab, setTab] = useState<Tab | null>(null)

  if (loading && !s) return <Spinner label="Loading game" />
  if (error && !s) return <ErrorBox error={error} retry={refresh} />
  if (!s) return null

  const tabs: { id: Tab; label: string }[] =
    state === 'pre'
      ? [{ id: 'info', label: 'Preview' }]
      : [
          { id: 'box', label: 'Box score' },
          { id: 'team', label: 'Team stats' },
          { id: 'plays', label: team.league === 'nfl' ? 'Drives' : 'Play-by-play' },
          ...(team.league === 'nba' ? [{ id: 'shots' as Tab, label: 'Shot chart' }] : []),
          { id: 'analytics', label: 'Analytics' },
          { id: 'info', label: 'Info' },
        ]
  const active = tab && tabs.some((t) => t.id === tab) ? tab : tabs[0].id

  return (
    <div className="space-y-3">
      <Scoreboard s={s} team={team} />
      <div className="flex justify-end">
        <Updated at={updatedAt} live={state === 'in'} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <WinProbChart s={s} team={team} />
        <GameLeaders s={s} team={team} />
      </div>
      <Tabs tabs={tabs} value={active} onChange={setTab} />
      {active === 'box' && <BoxScore s={s} team={team} />}
      {active === 'team' && <TeamCompare s={s} />}
      {active === 'plays' && (team.league === 'nfl' ? <NflDrives s={s} /> : <NbaPlays s={s} />)}
      {active === 'shots' && <GameShots s={s} team={team} />}
      {active === 'analytics' && <GameAnalytics s={s} team={team} />}
      {active === 'info' && <GameInfo s={s} team={team} />}
    </div>
  )
}
