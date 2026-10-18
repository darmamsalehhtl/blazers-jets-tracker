import type { TeamConfig } from '../../lib/teams'
import { Empty } from '../ui'

export function PlayerAdvanced({ team, name }: { team: TeamConfig; id: string; name: string }) {
  return <Empty>Advanced stats for {name} ({team.abbr}) are being set up.</Empty>
}
