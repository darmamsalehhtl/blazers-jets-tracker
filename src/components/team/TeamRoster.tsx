import { useNavigate } from 'react-router-dom'
import { headshotUrl, urls, type Logo as LogoT } from '../../lib/espn'
import type { TeamConfig } from '../../lib/teams'
import { IDLE_MS, usePoll } from '../../lib/usePoll'
import { StatusPill } from '../game/GameInfo'
import { StatTable, type Column } from '../StatTable'
import { Card, ErrorBox, Headshot, Spinner } from '../ui'

export interface RosterPlayer {
  id: string
  displayName: string
  shortName?: string
  jersey?: string
  age?: number
  weight?: number
  height?: number
  displayHeight?: string
  displayWeight?: string
  dateOfBirth?: string
  headshot?: LogoT
  position?: { abbreviation: string; name?: string }
  college?: { name?: string }
  birthPlace?: { city?: string; state?: string; country?: string }
  experience?: { years: number }
  debutYear?: number
  injuries?: { status: string; date?: string }[]
  status?: { name?: string; type?: string }
  contract?: { salary?: number; yearsRemaining?: number; salaryRemaining?: number; signedThrough?: number; season?: { year: number } }
}

export interface RosterResponse {
  athletes: (RosterPlayer | { position: string; items: RosterPlayer[] })[]
  coach?: { firstName: string; lastName: string; experience?: number }[]
  season?: { year: number; displayName?: string }
}

const money = (v?: number) => (v ? `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2)}M` : '–')

/**
 * Seasons left on the contract, this one included. ESPN's NBA `yearsRemaining`
 * already counts the current season; its NFL one doesn't (a contract ending this
 * season says 0), but NFL contracts carry the last season instead.
 */
function yearsLeft(p: RosterPlayer) {
  const c = p.contract
  if (c?.signedThrough && c.season?.year) return c.signedThrough - c.season.year + 1
  return c?.yearsRemaining
}

export function rosterPlayers(r: RosterResponse) {
  return r.athletes.flatMap((a) => ('items' in a ? a.items : [a]))
}

function groupsOf(team: TeamConfig, r: RosterResponse): { name: string; players: RosterPlayer[] }[] {
  if (team.league === 'nfl') {
    const label: Record<string, string> = { offense: 'Offense', defense: 'Defense', specialTeam: 'Special teams', practiceSquad: 'Practice squad', injuredReserveOrOut: 'Injured reserve / out', suspended: 'Suspended' }
    return r.athletes.map((g) => ('items' in g ? { name: label[g.position] ?? g.position, players: g.items } : { name: 'Players', players: [g] }))
  }
  const all = rosterPlayers(r)
  const by = (pos: string) => all.filter((p) => (p.position?.abbreviation ?? '').startsWith(pos))
  return [
    { name: 'Guards', players: by('G') },
    { name: 'Forwards', players: by('F') },
    { name: 'Centers', players: by('C') },
  ].filter((g) => g.players.length)
}

export function TeamRoster({ team }: { team: TeamConfig }) {
  const { data, error, refresh } = usePoll<RosterResponse>(urls.roster(team), IDLE_MS)
  const nav = useNavigate()
  if (error && !data) return <ErrorBox error={error} retry={refresh} />
  if (!data) return <Spinner />

  const all = rosterPlayers(data)
  const payroll = all.reduce((a, p) => a + (p.contract?.salary ?? 0), 0)
  const noContract = all.filter((p) => !p.contract?.salary).length
  const avgAge = all.reduce((a, p) => a + (p.age ?? 0), 0) / Math.max(1, all.filter((p) => p.age).length)
  const coach = data.coach?.[0]

  const cols: Column<RosterPlayer>[] = [
    {
      key: 'name',
      label: 'Player',
      render: (p) => (
        <span className="flex items-center gap-2">
          <Headshot src={headshotUrl(p.headshot)} alt="" size={28} />
          <span>
            <span className="font-medium">{p.displayName}</span>
            <span className="ml-1 text-[11px] text-muted">#{p.jersey ?? '–'}</span>
          </span>
        </span>
      ),
      sort: (p) => p.displayName,
    },
    { key: 'pos', label: 'Pos', render: (p) => p.position?.abbreviation ?? '–', sort: (p) => p.position?.abbreviation ?? '' },
    { key: 'age', label: 'Age', render: (p) => p.age ?? '–', sort: (p) => p.age ?? 0 },
    { key: 'ht', label: 'Ht', render: (p) => p.displayHeight ?? '–', sort: (p) => p.height ?? 0 },
    { key: 'wt', label: 'Wt', render: (p) => p.displayWeight ?? '–', sort: (p) => p.weight ?? 0 },
    { key: 'exp', label: 'Exp', render: (p) => (p.experience?.years ? p.experience.years : 'R'), sort: (p) => p.experience?.years ?? 0 },
    { key: 'sal', label: 'Salary', render: (p) => money(p.contract?.salary), sort: (p) => p.contract?.salary ?? 0 },
    { key: 'yrs', label: 'Yrs left', render: (p) => yearsLeft(p) ?? '–', sort: (p) => yearsLeft(p) ?? 0 },
    ...(team.league === 'nfl'
      ? [{ key: 'col', label: 'College', render: (p: RosterPlayer) => p.college?.name ?? '–', sort: (p: RosterPlayer) => p.college?.name ?? '', align: 'left' as const }]
      : []),
    {
      key: 'status',
      label: 'Status',
      render: (p) => (p.injuries?.length ? <StatusPill status={p.injuries[0].status} /> : <span className="text-muted">Active</span>),
      sort: (p) => (p.injuries?.length ? 1 : 0),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Players" value={all.length} />
        <Tile label="Avg age" value={avgAge.toFixed(1)} />
        {coach && <Tile label="Head coach" value={`${coach.firstName} ${coach.lastName}`} />}
        {payroll > 0 && <Tile label="Payroll" value={money(payroll)} />}
      </div>
      {groupsOf(team, data).map((g) => (
        <Card key={g.name} title={`${g.name} · ${g.players.length}`} pad={false}>
          <StatTable columns={cols} rows={g.players} rowKey={(p) => p.id} onRowClick={(p) => nav(`/player/${team.key}/${p.id}`)} />
        </Card>
      ))}
      {noContract > 0 && (
        <p className="px-1 text-[11px] leading-relaxed text-muted">
          “–” under Salary: ESPN has no contract on file for {noContract === 1 ? 'this player' : `these ${noContract} players`} (
          {team.league === 'nfl' ? 'mostly rookies and practice-squad or recently signed players' : 'often two-way or recently signed players'}),
          so they aren't in the payroll either.
        </p>
      )}
    </div>
  )
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <div className="text-[11px] tracking-wide text-muted uppercase">{label}</div>
      <div className="truncate text-lg font-semibold">{value}</div>
    </div>
  )
}
