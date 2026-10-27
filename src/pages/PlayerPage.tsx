import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MvpStandingCard } from '../components/player/MvpStandingCard'
import { PlayerAdvanced } from '../components/player/PlayerAdvanced'
import { PlayerCareer } from '../components/player/PlayerCareer'
import { PlayerGamelog } from '../components/player/PlayerGamelog'
import { PlayerOverview } from '../components/player/PlayerOverview'
import { PlayerSplits } from '../components/player/PlayerSplits'
import { StatusPill } from '../components/game/GameInfo'
import { ErrorBox, Headshot, Logo, SpoilerNote, Spinner, Tabs } from '../components/ui'
import { useSpoilers } from '../lib/spoilers'
import { headshotUrl, teamLogo, urls } from '../lib/espn'
import type { AthleteBio } from '../lib/player'
import { isTeamKey, TEAMS } from '../lib/teams'
import { IDLE_MS, usePoll } from '../lib/usePoll'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'gamelog', label: 'Game log' },
  { id: 'splits', label: 'Splits' },
  { id: 'career', label: 'Career' },
  { id: 'advanced', label: 'Advanced' },
] as const
type TabId = (typeof TABS)[number]['id']

export default function PlayerPage() {
  const { team: key, athleteId } = useParams()
  const [params, setParams] = useSearchParams()
  const { show } = useSpoilers()
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as TabId
  const team = isTeamKey(key) ? TEAMS[key] : undefined
  const bio = usePoll<AthleteBio>(team && athleteId ? urls.athlete(team, athleteId) : null, IDLE_MS)
  const [imgOk, setImgOk] = useState(true)

  if (!team || !athleteId) return <p className="text-muted">Unknown player.</p>
  if (bio.error && !bio.data) return <ErrorBox error={bio.error} retry={bio.refresh} />
  if (!bio.data) return <Spinner label="Loading player" />

  const a = bio.data.athlete
  const facts: [string, string | undefined][] = [
    ['Height / weight', [a.displayHeight, a.displayWeight].filter(Boolean).join(', ')],
    ['Age', a.age ? `${a.age}${a.displayDOB ? ` (born ${a.displayDOB})` : ''}` : undefined],
    ['Experience', a.displayExperience],
    ['Draft', a.displayDraft],
    ['College', a.college?.name],
    ['Birthplace', a.displayBirthPlace],
  ]

  return (
    <div className="space-y-4">
      <BackLink fallback={`/team/${team.key}`} />
      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="h-1" style={{ background: a.team?.id === team.id ? team.color : 'var(--border)' }} />
        <div className="flex items-end gap-4 px-4 pt-4">
          {imgOk && headshotUrl(a.headshot) ? (
            <img
              src={headshotUrl(a.headshot)}
              alt={a.displayName}
              onError={() => setImgOk(false)}
              className="h-28 w-36 shrink-0 object-contain object-bottom"
            />
          ) : (
            <Headshot alt="" size={96} />
          )}
          <div className="min-w-0 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
              {a.team && <Logo src={teamLogo(a.team)} alt="" size={18} />}
              {a.team?.displayName} · {a.displayJersey} · {a.position?.name ?? a.position?.abbreviation}
            </div>
            <h1 className="text-2xl leading-tight font-bold tracking-tight">{a.displayName}</h1>
            {a.injuries?.length ? (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                <StatusPill status={a.injuries[0].status} />
                {a.injuries[0].details?.type}
              </div>
            ) : null}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border px-4 py-3 text-sm sm:grid-cols-3">
          {facts
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] text-muted uppercase">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
        </dl>
      </div>

      <MvpStandingCard team={team} id={athleteId} />

      <Tabs tabs={TABS.map((t) => ({ id: t.id, label: t.label }))} value={tab} onChange={(id) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true })} />

      {tab === 'overview' && <PlayerOverview team={team} id={athleteId} bio={bio.data} />}
      {tab === 'gamelog' && (show ? <PlayerGamelog team={team} id={athleteId} /> : <SpoilerNote what="The game log is" />)}
      {tab === 'splits' && <PlayerSplits team={team} id={athleteId} />}
      {tab === 'career' && <PlayerCareer team={team} id={athleteId} />}
      {tab === 'advanced' && <PlayerAdvanced team={team} id={athleteId} name={a.displayName} />}
    </div>
  )
}

/** Back to wherever the user came from; a directly opened player page goes to its team page. */
function BackLink({ fallback }: { fallback: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const cls = 'text-sm text-muted hover:text-text'
  if (location.key === 'default') {
    return (
      <Link to={fallback} className={cls}>
        ← Back
      </Link>
    )
  }
  return (
    <button type="button" onClick={() => navigate(-1)} className={cls}>
      ← Back
    </button>
  )
}
