import type { TeamConfig } from '../../lib/teams'
import { Empty } from '../ui'

export function TeamAdvanced({ team }: { team: TeamConfig }) {
  return <Empty>Season analytics for the {team.nickname} are being set up.</Empty>
}
