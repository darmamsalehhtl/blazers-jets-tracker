import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, ErrorBox, Logo, Spinner, Tabs, Updated } from '../components/ui'
import { draftBoard, draftOrder, draftTeams, type DraftData, type DraftPick } from '../lib/draft'
import { teamLogo, urls, type TeamRef } from '../lib/espn'
import { ordinal } from '../lib/format'
import { useDataFile } from '../lib/seasonData'
import type { StandingsNode } from '../lib/standings'
import { TEAMS } from '../lib/teams'
import { IDLE_MS, usePoll } from '../lib/usePoll'

const JETS = TEAMS.nyj.abbr
const ROUNDS = ['1', '2', '3', '4', '5', '6', '7'] as const
type Round = (typeof ROUNDS)[number]

/** Next NFL draft order if the season ended today, with traded picks. */
export default function DraftPage() {
  const draft = useDataFile<DraftData>('draft')
  const standings = usePoll<StandingsNode>(urls.standings(TEAMS.nyj), IDLE_MS)
  const [params, setParams] = useSearchParams()
  const round = (ROUNDS as readonly string[]).includes(params.get('round') ?? '') ? (params.get('round') as Round) : '1'

  const board = useMemo(() => {
    if (!draft.data?.available || !standings.data) return null
    const teams = draftTeams(standings.data, draft.data.opponents)
    if (teams.length !== 32) return null
    return { picks: draftBoard(draftOrder(teams), draft.data.trades), refs: new Map(teams.map((t) => [t.abbr, t.team])) }
  }, [draft.data, standings.data])

  if (draft.error) return <ErrorBox error={draft.error} />
  if (standings.error && !standings.data) return <ErrorBox error={standings.error} retry={standings.refresh} />
  if (!draft.data || !standings.data) return <Spinner label="Loading draft order" />
  if (!draft.data.available || !board) return <ErrorBox error={new Error(draft.data.error ?? 'Draft order not available yet')} />

  const { draftYear } = draft.data
  const jets = board.picks.filter((p) => p.owner === JETS)
  const shown = board.picks.filter((p) => String(p.round) === round)

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{draftYear} NFL Draft order</h1>
          <p className="text-sm text-muted">If the season ended today. Updates with the standings after every game.</p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <Updated at={standings.updatedAt} />
        </div>
      </div>

      <Card title="Jets picks" right={`${jets.length} total`}>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {jets.map((p) => (
            <button
              key={p.overall}
              onClick={() => setParams({ round: String(p.round) }, { replace: true })}
              className="shrink-0 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-left hover:bg-surface-2"
            >
              <div className="text-lg leading-tight font-bold tabular-nums">#{p.overall}</div>
              <div className="text-[11px] whitespace-nowrap text-muted">
                Rd {p.round}, pick {p.pick}
                {p.original.abbr !== JETS && ` · from ${p.original.abbr}`}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Tabs
        tabs={ROUNDS.map((r) => ({ id: r, label: `Round ${r}` }))}
        value={round}
        onChange={(r) => setParams({ round: r }, { replace: true })}
      />

      <Card pad={false}>
        <ol>
          {shown.map((p) => (
            <PickRow key={p.overall} p={p} refs={board.refs} />
          ))}
        </ol>
      </Card>

      <p className="px-1 text-[11px] leading-relaxed text-muted">
        Teams outside the current playoff spots pick first, worst record first. Ties go to the team with the weaker strength of
        schedule (combined record of all 17 opponents), after that the NFL uses division/conference tiebreakers and a coin flip (marked
        “tie”). Teams in a playoff spot follow in the same way; their real order depends on how far they go in the playoffs.
        Compensatory picks (rounds 3–7) are awarded in March and not shown. Traded picks from{' '}
        <a href={`https://en.wikipedia.org/wiki/${draftYear}_NFL_draft#Trades_involving_draft_picks`} target="_blank" rel="noreferrer" className="underline">
          Wikipedia
        </a>
        {draft.data.tradesSource === 'snapshot' && ' (last saved copy)'}, refreshed every few hours.
      </p>
    </div>
  )
}

function PickRow({ p, refs }: { p: DraftPick; refs: Map<string, TeamRef> }) {
  const o = p.original
  const owner = p.owner ? refs.get(p.owner) : undefined
  const traded = p.owner !== o.abbr
  const ours = p.owner === JETS
  return (
    <li
      className={`flex items-center gap-3 border-t border-border/60 px-4 py-2.5 first:border-0 ${ours ? 'bg-nyj/10' : ''}`}
      style={ours ? { boxShadow: 'inset 3px 0 0 var(--nyj)' } : undefined}
    >
      <div className="w-9 shrink-0 text-right">
        <div className="text-base leading-tight font-bold tabular-nums">{p.pick}</div>
        <div className="text-[10px] text-muted tabular-nums">#{p.overall}</div>
      </div>
      <Logo src={owner ? teamLogo(owner) : undefined} alt="" size={30} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {owner?.displayName ?? 'Traded (unclear)'}
          {p.conditional && <span className="ml-1.5 text-[10px] font-medium text-muted uppercase">cond.</span>}
        </div>
        <div className="truncate text-xs text-muted">
          {traded ? (
            <>
              from {o.abbr}
              {p.via.length > 0 && ` via ${p.via.join(', ')}`}
              {!p.owner && ` · sent to ${p.candidates.join(' / ')}`}
            </>
          ) : (
            'Own pick'
          )}
        </div>
      </div>
      <div className="shrink-0 text-right text-xs tabular-nums">
        <div className="font-semibold">
          {o.abbr !== p.owner && <span className="mr-1 font-normal text-muted">{o.abbr}</span>}
          {o.wins}-{o.losses}
          {o.ties > 0 && `-${o.ties}`}
        </div>
        <div className="text-muted">
          SOS {o.sos.toFixed(3).replace(/^0/, '')}
          {p.tied && <span className="ml-1 rounded bg-surface-2 px-1 text-[10px] font-semibold">tie</span>}
        </div>
      </div>
      <div className="hidden w-20 shrink-0 text-right text-[11px] text-muted sm:block">
        {o.playoff && o.seed ? `${ordinal(o.seed)} seed` : ''}
      </div>
    </li>
  )
}
