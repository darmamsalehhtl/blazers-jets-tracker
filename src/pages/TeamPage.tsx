import { useParams, useSearchParams } from 'react-router-dom'
import { TeamAdvanced } from '../components/team/TeamAdvanced'
import { TeamNews } from '../components/team/TeamNews'
import { TeamOverview } from '../components/team/TeamOverview'
import { TeamPlayers } from '../components/team/TeamPlayers'
import { TeamRoster } from '../components/team/TeamRoster'
import { TeamSchedule } from '../components/team/TeamSchedule'
import { TeamStandings } from '../components/team/TeamStandings'
import { TeamStats } from '../components/team/TeamStats'
import { TeamVsLeague } from '../components/team/TeamVsLeague'
import { PlayerSearch } from '../components/PlayerSearch'
import { ErrorBox, Logo, SpoilerNote, Spinner, Tabs } from '../components/ui'
import { useSpoilers } from '../lib/spoilers'
import { urls, type ScheduleResponse } from '../lib/espn'
import { isTeamKey, TEAMS } from '../lib/teams'
import { IDLE_MS, usePoll } from '../lib/usePoll'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'stats', label: 'Team stats' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'players', label: 'Player stats' },
  { id: 'league', label: 'vs League' },
  { id: 'roster', label: 'Roster' },
  { id: 'standings', label: 'Standings' },
  { id: 'news', label: 'News' },
] as const
type TabId = (typeof TABS)[number]['id']

export default function TeamPage() {
  const { team: key } = useParams()
  const [params, setParams] = useSearchParams()
  const { show } = useSpoilers()
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as TabId
  const team = isTeamKey(key) ? TEAMS[key] : undefined
  const sched = usePoll<ScheduleResponse>(team ? urls.schedule(team) : null, IDLE_MS)

  if (!team) return <p className="text-muted">Unknown team.</p>
  const s = sched.data

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Logo src={team.logo} alt={team.name} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{team.name}</h1>
          <p className="text-sm text-muted">
            {s ? (
              <>
                {show && (
                  <>
                    <span className="font-semibold text-text">{s.team.recordSummary ?? '0-0'}</span>
                    {s.team.standingSummary && ` · ${s.team.standingSummary}`} ·{' '}
                  </>
                )}
                {s.season.displayName} {s.season.name}
              </>
            ) : (
              '…'
            )}
          </p>
        </div>
      </div>
      <PlayerSearch team={team} />
      <Tabs
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        value={tab}
        onChange={(id) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true })}
      />
      {sched.error && !s ? (
        <ErrorBox error={sched.error} retry={sched.refresh} />
      ) : !s ? (
        <Spinner />
      ) : (
        <>
          {tab === 'overview' && <TeamOverview team={team} schedule={s} />}
          {tab === 'schedule' && <TeamSchedule team={team} schedule={s} />}
          {tab === 'stats' && <TeamStats team={team} schedule={s} />}
          {tab === 'advanced' && <TeamAdvanced team={team} />}
          {tab === 'players' && <TeamPlayers team={team} />}
          {tab === 'league' && <TeamVsLeague team={team} />}
          {tab === 'roster' && <TeamRoster team={team} />}
          {tab === 'standings' && (show ? <TeamStandings team={team} season={s.season.year} /> : <SpoilerNote what="Standings are" />)}
          {tab === 'news' && (show ? <TeamNews team={team} /> : <SpoilerNote what="News headlines are" />)}
        </>
      )}
    </div>
  )
}
