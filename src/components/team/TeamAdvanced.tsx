import { useSeasonData, type BlazersData, type JetsData } from '../../lib/seasonData'
import type { TeamConfig } from '../../lib/teams'
import { ErrorBox, Spinner } from '../ui'
import { BlazersAdvanced } from './BlazersAdvanced'
import { JetsAdvanced } from './JetsAdvanced'

export function TeamAdvanced({ team }: { team: TeamConfig }) {
  const { data, error } = useSeasonData(team.key)
  if (error) return <ErrorBox error={error} />
  if (!data) return <Spinner label="Loading season analytics" />
  return team.key === 'nyj' ? <JetsAdvanced team={team} data={data as JetsData} /> : <BlazersAdvanced team={team} data={data as BlazersData} />
}
