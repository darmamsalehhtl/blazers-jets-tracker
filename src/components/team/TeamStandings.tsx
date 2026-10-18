import { useState } from 'react'
import { teamLogo, urls } from '../../lib/espn'
import { leafGroups, sv, type StandingEntry, type StandingsNode } from '../../lib/standings'
import type { TeamConfig } from '../../lib/teams'
import { IDLE_MS, usePoll } from '../../lib/usePoll'
import { StatTable, type Column } from '../StatTable'
import { Card, ErrorBox, Logo, Select, Spinner } from '../ui'

export function TeamStandings({ team, season }: { team: TeamConfig; season: number }) {
  const [level, setLevel] = useState<2 | 3>(3)
  const { data, error } = usePoll<StandingsNode>(urls.standings(team, season, level), IDLE_MS)
  if (error && !data) return <ErrorBox error={error} />
  if (!data) return <Spinner />

  const nfl = team.league === 'nfl'
  const num = (t: string) => (e: StandingEntry) => parseFloat(sv(e, t)) || 0
  const cols: Column<StandingEntry>[] = [
    {
      key: 'team',
      label: 'Team',
      render: (e) => (
        <span className={`flex items-center gap-2 ${e.team.id === team.id ? 'font-bold' : ''}`}>
          <span className="w-4 text-right text-[11px] text-muted">{sv(e, 'playoffseed') !== '–' ? sv(e, 'playoffseed') : ''}</span>
          <Logo src={teamLogo(e.team)} alt="" size={18} />
          {e.team.abbreviation}
          {sv(e, 'clincher') !== '–' && <span className="text-[10px] text-muted">{sv(e, 'clincher')}</span>}
        </span>
      ),
    },
    { key: 'w', label: 'W', render: (e) => sv(e, 'wins'), sort: num('wins') },
    { key: 'l', label: 'L', render: (e) => sv(e, 'losses'), sort: num('losses') },
    ...(nfl ? [{ key: 't', label: 'T', render: (e: StandingEntry) => sv(e, 'ties'), sort: num('ties') }] : []),
    { key: 'pct', label: 'PCT', render: (e) => sv(e, 'winpercent'), sort: num('winpercent') },
    ...(!nfl ? [{ key: 'gb', label: 'GB', render: (e: StandingEntry) => sv(e, 'gamesbehind'), sort: num('gamesbehind') }] : []),
    { key: 'home', label: 'Home', render: (e) => sv(e, 'home') },
    { key: 'road', label: 'Away', render: (e) => sv(e, 'road') },
    { key: 'div', label: 'Div', render: (e) => sv(e, 'vsdiv') },
    { key: 'conf', label: 'Conf', render: (e) => sv(e, 'vsconf') },
    ...(nfl
      ? [
          { key: 'pf', label: 'PF', render: (e: StandingEntry) => sv(e, 'pointsfor'), sort: num('pointsfor') },
          { key: 'pa', label: 'PA', render: (e: StandingEntry) => sv(e, 'pointsagainst'), sort: num('pointsagainst') },
          { key: 'diff', label: 'Diff', render: (e: StandingEntry) => sv(e, 'differential'), sort: num('differential') },
        ]
      : [
          { key: 'ppg', label: 'PPG', render: (e: StandingEntry) => sv(e, 'avgpointsfor'), sort: num('avgpointsfor') },
          { key: 'opp', label: 'OPP', render: (e: StandingEntry) => sv(e, 'avgpointsagainst'), sort: num('avgpointsagainst') },
          { key: 'diff', label: 'Diff', render: (e: StandingEntry) => sv(e, 'differential'), sort: num('differential') },
          { key: 'l10', label: 'L10', render: (e: StandingEntry) => sv(e, 'lasttengames') },
        ]),
    { key: 'strk', label: 'Strk', render: (e) => sv(e, 'streak') },
  ]

  const groups = leafGroups(data)
  // Our team's group first.
  groups.sort((a, b) => Number(b.entries.some((e) => e.team.id === team.id)) - Number(a.entries.some((e) => e.team.id === team.id)))

  return (
    <div className="space-y-3">
      <Select
        label="View"
        value={level}
        onChange={setLevel}
        options={[
          { value: 3, label: 'Division' },
          { value: 2, label: 'Conference' },
        ]}
      />
      {groups.map((g) => (
        <Card key={g.name} title={g.name} pad={false}>
          <StatTable columns={cols} rows={g.entries} rowKey={(e) => e.team.id} dense />
        </Card>
      ))}
    </div>
  )
}
