import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, ErrorBox, Logo, Spinner, Tabs, Updated } from '../components/ui'
import { draftBoard, draftOrder, draftTeams, type DraftData, type DraftPick } from '../lib/draft'
import { teamLogo, urls, type TeamRef } from '../lib/espn'
import { ordinal } from '../lib/format'
import { mockDraft, type MockDraftData, type MockPick } from '../lib/mockDraft'
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
  const mockData = useDataFile<MockDraftData>('mock-draft')
  const standings = usePoll<StandingsNode>(urls.standings(TEAMS.nyj), IDLE_MS)
  const [params, setParams] = useSearchParams()
  const round = (ROUNDS as readonly string[]).includes(params.get('round') ?? '') ? (params.get('round') as Round) : '1'

  const board = useMemo(() => {
    if (!draft.data?.available || !standings.data) return null
    const teams = draftTeams(standings.data, draft.data.opponents)
    if (teams.length !== 32) return null
    return { picks: draftBoard(draftOrder(teams), draft.data.trades), refs: new Map(teams.map((t) => [t.abbr, t.team])) }
  }, [draft.data, standings.data])

  // Computer mock draft on the live order; null while loading or when the data is unavailable.
  const md = mockData.data?.available ? mockData.data : null
  const mock = useMemo(() => {
    if (!board || !md) return null
    const picks = mockDraft(board.picks, md)
    return new Map(board.picks.map((p, i) => [p.overall, picks[i]]))
  }, [board, md])

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
            <PickRow key={p.overall} p={p} refs={board.refs} mock={mock?.get(p.overall)} data={md} />
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

function PickRow({ p, refs, mock, data }: { p: DraftPick; refs: Map<string, TeamRef>; mock?: MockPick; data: MockDraftData | null }) {
  const [open, setOpen] = useState(false)
  const o = p.original
  const owner = p.owner ? refs.get(p.owner) : undefined
  const traded = p.owner !== o.abbr
  const ours = p.owner === JETS
  const prospect = mock?.prospect
  const trade = traded && (
    <>
      from {o.abbr}
      {p.via.length > 0 && ` via ${p.via.join(', ')}`}
      {!p.owner && ` · sent to ${p.candidates.join(' / ')}`}
    </>
  )
  const body = (
    <>
      <div className="w-9 shrink-0 self-start pt-0.5 text-right">
        <div className="text-base leading-tight font-bold tabular-nums">{p.pick}</div>
        <div className="text-[10px] text-muted tabular-nums">#{p.overall}</div>
      </div>
      <div className="shrink-0 self-start pt-0.5">
        <Logo src={owner ? teamLogo(owner) : undefined} alt="" size={30} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {owner?.displayName ?? 'Traded (unclear)'}
          {p.conditional && <span className="ml-1.5 text-[10px] font-medium text-muted uppercase">cond.</span>}
        </div>
        {mock ? (
          <>
            {prospect ? (
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
                <Logo src={prospect.collegeLogo ?? undefined} alt="" size={16} />
                <span className="truncate">
                  <span className="font-semibold">{prospect.name}</span>
                  <span className="text-muted">
                    {' '}
                    · {prospect.pos}
                    {prospect.college && ` · ${prospect.college}`}
                  </span>
                </span>
                {mock.uncertain && <span className="shrink-0 rounded bg-surface-2 px-1 text-[10px] font-semibold text-muted">uncertain</span>}
              </div>
            ) : (
              <div className="mt-0.5 truncate text-xs text-muted italic">
                ESPN's board ({data?.prospectCount} prospects) doesn't reach this pick yet
              </div>
            )}
            {trade && <div className="truncate text-[11px] text-muted">{trade}</div>}
          </>
        ) : (
          <div className="truncate text-xs text-muted">{trade || 'Own pick'}</div>
        )}
      </div>
      <div className="shrink-0 self-start pt-0.5 text-right text-xs tabular-nums">
        <div className="font-semibold">
          {o.abbr !== p.owner && <span className="mr-1 font-normal text-muted">{o.abbr}</span>}
          {o.wins}-{o.losses}
          {o.ties > 0 && `-${o.ties}`}
        </div>
        <div className={`text-muted ${mock ? 'hidden sm:block' : ''}`}>
          SOS {o.sos.toFixed(3).replace(/^0/, '')}
          {p.tied && <span className="ml-1 rounded bg-surface-2 px-1 text-[10px] font-semibold">tie</span>}
        </div>
      </div>
      <div className="hidden w-20 shrink-0 self-start pt-0.5 text-right text-[11px] text-muted sm:block">
        {o.playoff && o.seed ? `${ordinal(o.seed)} seed` : ''}
      </div>
    </>
  )

  return (
    <li
      className={`border-t border-border/60 first:border-0 ${ours ? 'bg-nyj/10' : ''}`}
      style={ours ? { boxShadow: 'inset 3px 0 0 var(--nyj)' } : undefined}
    >
      {prospect ? (
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2/40"
        >
          {body}
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
      )}
      {open && prospect && mock && <PickDetails mock={mock} needs={data?.needs[mock.team]} team={owner?.shortDisplayName ?? mock.team} />}
    </li>
  )
}

const GROUP_NAMES: Record<string, string> = {
  QB: 'quarterback', RB: 'running back', WR: 'wide receiver', TE: 'tight end', OT: 'offensive tackle', IOL: 'interior line',
  EDGE: 'edge rusher', DT: 'defensive tackle', LB: 'linebacker', CB: 'cornerback', S: 'safety', ST: 'specialist',
}

function PickDetails({ mock, needs, team }: { mock: MockPick; needs?: { top: string[] }; team: string }) {
  const pr = mock.prospect!
  const fit = mock.fills
    ? mock.fills === needs?.top[0]
      ? `Fills their biggest need (${GROUP_NAMES[mock.fills] ?? mock.fills})`
      : `Fills a top-3 need (${GROUP_NAMES[mock.fills] ?? mock.fills})`
    : 'Best player available for them'
  return (
    <div className="space-y-2 px-4 pb-3 pl-[5.25rem] text-xs">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {pr.rank && <span className="font-semibold">#{pr.rank} on ESPN's board</span>}
        {pr.posRank && (
          <span className="text-muted">
            No. {pr.posRank} {pr.pos}
          </span>
        )}
        {(pr.height || pr.weight) && <span className="text-muted">{[pr.height, pr.weight].filter(Boolean).join(' · ')}</span>}
      </div>
      {pr.note && <p className="leading-relaxed text-muted">{pr.note}</p>}
      <div className="space-y-0.5">
        <div>
          <span className="font-semibold">{fit}</span>
        </div>
        {needs && needs.top.length > 0 && (
          <div className="text-muted">
            {team} top needs: {needs.top.map((g) => GROUP_NAMES[g] ?? g).join(', ')}
          </div>
        )}
        {mock.uncertain && <div className="text-muted">Who owns this pick is unclear, so it's mocked for {team}'s needs.</div>}
      </div>
      {pr.url && (
        <a href={pr.url} target="_blank" rel="noreferrer" className="inline-block font-medium underline underline-offset-2">
          ESPN player card ↗
        </a>
      )}
    </div>
  )
}
