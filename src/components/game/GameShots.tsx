import { useMemo, useState } from 'react'
import { shotsFromPlays } from '../../lib/shots'
import type { Summary } from '../../lib/summary'
import type { TeamConfig } from '../../lib/teams'
import { ShotChart } from '../ShotChart'
import { Card, Empty, Select } from '../ui'
import { TeamToggle } from './BoxScore'

export function GameShots({ s, team }: { s: Summary; team: TeamConfig }) {
  const all = useMemo(() => shotsFromPlays(s.plays ?? []), [s.plays])
  const boxTeams = s.boxscore?.players ?? []
  const [side, setSide] = useState(Math.max(0, boxTeams.findIndex((p) => p.team.id === team.id)))
  const [player, setPlayer] = useState('')

  if (!all.length) return <Empty>Shot chart shows up once the game starts.</Empty>

  const t = boxTeams[side]?.team
  const teamShots = all.filter((x) => x.teamId === t?.id)
  const shooters = (boxTeams[side]?.statistics[0]?.athletes ?? []).filter((a) => teamShots.some((x) => x.playerId === a.athlete.id))
  const shots = player ? teamShots.filter((x) => x.playerId === player) : teamShots
  const color = t?.id === team.id ? team.color : t?.color ? `#${t.color}` : 'var(--text)'

  return (
    <div className="space-y-3">
      <TeamToggle
        s={s}
        value={side}
        onChange={(i) => {
          setSide(i)
          setPlayer('')
        }}
      />
      <Card
        title="Shot chart"
        right={
          <Select
            value={player}
            onChange={setPlayer}
            options={[{ value: '', label: 'All players' }, ...shooters.map((a) => ({ value: a.athlete.id, label: a.athlete.displayName }))]}
          />
        }
      >
        <ShotChart shots={shots} color={color} />
      </Card>
    </div>
  )
}
