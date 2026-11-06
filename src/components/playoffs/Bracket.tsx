import { useState } from 'react'
import { Link } from 'react-router-dom'
import { teamLogoByAbbr } from '../../lib/espn'
import { gameDate, shortDate } from '../../lib/format'
import type { Bracket as BracketData, PostseasonGame, Series, Slot } from '../../lib/playoffs'
import type { League, TeamConfig } from '../../lib/teams'
import { Card, LiveBadge, Logo } from '../ui'

// A real bracket: the left conference flows right, the right one is mirrored,
// and both meet at the final in the middle. Columns space equal-height cards
// with justify-around, so every card's centre sits between the two it comes
// from and the connectors can be drawn in percentages.

/** One matchup position in the tree. */
interface Cell {
  slot: Slot
  round: string
  /** NFL 1 seed waiting out the Wild Card round */
  bye?: boolean
}

interface Column {
  name: string
  short: string
  cells: Cell[]
}

type Dir = 'ltr' | 'rtl'

const SHORT: Record<string, string> = {
  'First Round': 'Round 1',
  'Conference Semifinals': 'Semis',
  'Conference Finals': 'Conf. Finals',
  'Conference Championship': 'Conf. Champ.',
  'Wild Card': 'Wild Card',
  Divisional: 'Divisional',
}

/** Card + gap, per first-round slot; sets the tree's height. */
const ROW = 100

function finalName(league: League) {
  return league === 'nfl' ? 'Super Bowl' : 'NBA Finals'
}

/** West (or AFC) on the left, like a printed bracket. */
function sides(b: BracketData): [string, string] {
  const left = b.confs.includes('West') ? 'West' : b.confs[0]
  return [left, b.confs.find((c) => c !== left) ?? left]
}

function columnsFor(b: BracketData, conf: string): Column[] {
  return b.rounds.map((r, i) => {
    let cells: Cell[] = (r.byConf[conf] ?? []).map((slot) => ({ slot, round: r.name }))
    // NFL Wild Card: bye on top, then 4v5, 3v6, 2v7, so the 1 seed's path lines up with the first Divisional slot.
    // The NFL re-seeds, so once the Divisional games are set, each one's two feeders are moved next to each other.
    if (b.league === 'nfl' && i === 0) {
      const bye = b.byes[conf]?.[0]
      cells = [...(bye ? [{ slot: { known: [bye] }, round: r.name, bye: true }] : []), ...cells.slice().reverse()]
      const next = b.rounds[1]?.byConf[conf] ?? []
      if (next.every((x) => x.series)) {
        const feeds = (c: Cell, d: Slot) =>
          d.series!.teams.some((t) => (c.slot.series ? c.slot.series.winner === t.abbr : c.slot.known?.some((k) => k.abbr === t.abbr)))
        const ordered = next.flatMap((d) => cells.filter((c) => feeds(c, d)))
        if (ordered.length === cells.length) cells = ordered
      }
    }
    return { name: r.name, short: SHORT[r.name] ?? r.name, cells }
  })
}

/** NBA play-in per conference: 7 v 8 and 9 v 10 feed the game for the 8th seed. */
function playInColumns(b: BracketData, conf: string): Column[] {
  const games = b.playIn[conf] ?? []
  const label = (s: Series) => playInLabel(s.games[0]?.note ?? '')
  const pick = (want: string, fallback: number) => games.find((s) => label(s) === want) ?? games[fallback]
  const cell = (s: Series | undefined, fallback: Slot): Cell => ({ slot: s ? { series: s } : fallback, round: 'Play-in' })
  const [first, second] = b.playInSlots[conf] ?? []
  return [
    {
      name: 'Play-in',
      short: 'Play-in',
      cells: [cell(pick('7 v 8', 1), first ?? { placeholder: '7 v 8' }), cell(pick('9 v 10', 0), second ?? { placeholder: '9 v 10' })],
    },
    { name: 'For the 8th seed', short: '8th seed', cells: [cell(pick('For the 8th seed', 2), { placeholder: 'Loser of 7 v 8 vs winner of 9 v 10' })] },
  ]
}

function allCells(b: BracketData): Cell[] {
  const final: Cell = { slot: b.final, round: finalName(b.league) }
  return [...b.confs.flatMap((c) => [...columnsFor(b, c), ...(b.league === 'nba' ? playInColumns(b, c) : [])].flatMap((col) => col.cells)), final]
}

export function Bracket({ bracket, team }: { bracket: BracketData; team: TeamConfig }) {
  const [left, right] = sides(bracket)
  const cells = allCells(bracket)
  const liveKey = cells.find((c) => c.slot.series?.live)?.slot.series?.key
  const [picked, setPicked] = useState<string | undefined>(undefined)
  const [conf, setConf] = useState(() => {
    // Phones: open on the conference with a live game, else ours, else the left one.
    const live = cells.find((c) => c.slot.series?.live)?.slot.series?.teams[0].abbr
    const ours = cells.find((c) => c.slot.series?.teams.some((t) => t.id === team.id))
    const inConf = (abbr?: string) => bracket.confs.find((cf) => columnsFor(bracket, cf).some((col) => col.cells.some((x) => x.slot.series?.teams.some((t) => t.abbr === abbr))))
    return inConf(live) ?? inConf(ours?.slot.series?.teams[0].abbr) ?? left
  })
  const selectedKey = picked ?? liveKey
  const selected = cells.find((c) => c.slot.series?.key === selectedKey)
  const select = (key: string) => setPicked((k) => (k === key ? '' : key))
  const props = { league: bracket.league, team, selectedKey, onSelect: select }
  const final: Cell = { slot: bracket.final, round: finalName(bracket.league) }
  const height = ROW * Math.max(...bracket.confs.map((c) => columnsFor(bracket, c)[0]?.cells.length ?? 1))

  return (
    <div className="space-y-3">
      {bracket.champion && (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
          <Logo src={teamLogoByAbbr(bracket.league, bracket.champion)} alt="" size={20} />
          <span>
            <b>{bracket.champion}</b> won the{' '}
            {bracket.league === 'nfl' ? `Super Bowl (${bracket.label} season)` : `${bracket.label} NBA Finals`}.
          </span>
        </p>
      )}

      {/* Laptop: the whole tree, mirrored halves meeting at the final. */}
      <section className="hidden rounded-2xl border border-border bg-surface px-3 pt-3 pb-4 lg:block">
        <div className="flex">
          <Tree cols={columnsFor(bracket, left)} dir="ltr" height={height} conf={left} {...props} />
          <Connector n={1} height={height} />
          <div className="w-[13%] shrink-0">
            <Title text={finalName(bracket.league)} />
            <div className="flex flex-col justify-around" style={{ height }}>
              <MatchCard cell={final} dir="ltr" {...props} />
            </div>
          </div>
          <Connector n={1} height={height} mirrored />
          <Tree cols={columnsFor(bracket, right)} dir="rtl" height={height} conf={right} {...props} />
        </div>
        {bracket.league === 'nba' && (
          <div className="mt-4 border-t border-border/60 pt-3">
            <p className="mb-2 text-center text-[11px] font-semibold tracking-wide text-muted uppercase">Play-in tournament</p>
            <div className="flex justify-center gap-[13%]">
              {[left, right].map((c, i) => (
                <div key={c} className="w-[27%]">
                  <p className="text-center text-[10px] font-semibold text-muted uppercase">{c}</p>
                  <Tree cols={playInColumns(bracket, c)} dir={i ? 'rtl' : 'ltr'} height={ROW * 2} conf={`${c} play-in`} className="flex-1" {...props} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Phones and tablets: one conference half at a time, then the final. */}
      <section className="space-y-3 lg:hidden">
        <div className="flex gap-1.5">
          {[left, right].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setConf(c)}
              aria-pressed={conf === c}
              className={`rounded-full border px-3 py-0.5 text-xs font-medium ${conf === c ? 'border-text bg-text text-bg' : 'border-border text-muted hover:text-text'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-surface px-2 pt-3 pb-4">
          <Tree cols={columnsFor(bracket, conf)} dir="ltr" height={height} conf={conf} short {...props} />
        </div>
        <div className="rounded-2xl border border-border bg-surface px-3 pt-3 pb-4">
          <Title text={finalName(bracket.league)} />
          <div className="mx-auto max-w-[180px]">
            <MatchCard cell={final} dir="ltr" {...props} />
          </div>
        </div>
        {bracket.league === 'nba' && (
          <div className="rounded-2xl border border-border bg-surface px-2 pt-3 pb-4">
            <p className="mb-1 text-center text-[11px] font-semibold tracking-wide text-muted uppercase">{conf} play-in</p>
            <div className="mx-auto max-w-[300px]">
              <Tree cols={playInColumns(bracket, conf)} dir="ltr" height={ROW * 2} conf={`${conf} play-in`} className="flex-1" short {...props} />
            </div>
          </div>
        )}
      </section>

      {selected?.slot.series ? (
        <SeriesPanel cell={selected} league={bracket.league} team={team} />
      ) : bracket.projected ? (
        <p className="px-1 text-xs text-muted">
          Projected from today's seeds; it changes with the standings.
          {bracket.league === 'nba' ? ' Seeds 1 and 2 wait for the play-in winners.' : ''}
        </p>
      ) : (
        <p className="px-1 text-xs text-muted">Tap a matchup for its games.</p>
      )}
    </div>
  )
}

interface CardProps {
  league: League
  team: TeamConfig
  selectedKey: string | undefined
  onSelect: (key: string) => void
}

function Title({ text }: { text: string }) {
  return <p className="flex h-8 items-start justify-center px-1 text-center text-[10px] leading-tight font-semibold tracking-wide text-muted uppercase">{text}</p>
}

function Tree({
  cols,
  dir,
  height,
  conf,
  short,
  className = 'flex-[3]',
  ...props
}: CardProps & { cols: Column[]; dir: Dir; height: number; conf: string; short?: boolean; className?: string }) {
  const parts = cols.flatMap((col, i) => {
    const column = (
      <div key={col.name} className="min-w-0 flex-1">
        <Title text={short ? col.short : col.name} />
        <div className="flex flex-col justify-around" style={{ height }}>
          {col.cells.map((cell, k) => (
            <MatchCard key={k} cell={cell} dir={dir} {...props} />
          ))}
        </div>
      </div>
    )
    return i < cols.length - 1 ? [column, <Connector key={`c${i}`} n={col.cells.length} height={height} mirrored={dir === 'rtl'} />] : [column]
  })
  return (
    <div className={`flex min-w-0 ${className} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`} aria-label={`${conf} bracket`}>
      {parts}
    </div>
  )
}

/** Lines from n cards into n/2 (or straight across for n = 1). */
function Connector({ n, height, mirrored = false }: { n: number; height: number; mirrored?: boolean }) {
  const y = (k: number) => ((2 * k + 1) / (2 * n)) * 100
  let d = ''
  if (n <= 1) d = 'M0 50 H100'
  else
    for (let j = 0; j < n / 2; j++) {
      const a = y(2 * j)
      const b = y(2 * j + 1)
      d += `M0 ${a} H50 V${b} H0 M50 ${(a + b) / 2} H100 `
    }
  return (
    <div className="w-3 shrink-0 sm:w-4">
      <div className="h-8" />
      <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className={mirrored ? '-scale-x-100' : ''}>
        <path d={d} fill="none" stroke="var(--muted)" strokeOpacity="0.45" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

function MatchCard({ cell, dir, league, team, selectedKey, onSelect }: CardProps & { cell: Cell; dir: Dir }) {
  const { slot } = cell
  const s = slot.series
  const base = 'relative flex h-[76px] w-full flex-col justify-center rounded-xl border bg-surface px-1.5 text-left sm:px-2'
  if (!s) {
    const ours = slot.known?.some((t) => t.abbr === team.abbr)
    return (
      <div className={`${base} border-dashed border-border`} style={ours ? { boxShadow: `inset 3px 0 0 ${team.color}` } : undefined}>
        {slot.known?.map((t) => <TeamRow key={t.abbr} league={league} abbr={t.abbr} seed={t.seed} ours={t.abbr === team.abbr} />)}
        {cell.bye ? (
          <p className="pl-7 text-[10px] text-muted">First-round bye</p>
        ) : slot.placeholder && slot.known?.length ? (
          // One side known: the other is still to be decided, shown as a grey team row.
          <p className="flex h-8 items-center gap-1.5 text-[11px] text-muted">
            <span className="h-6 w-6 shrink-0 rounded-full border border-dashed border-border" />
            <span className="leading-tight">{slot.placeholder}</span>
          </p>
        ) : (
          slot.placeholder && <p className="text-center text-[10px] leading-tight text-muted">{slot.placeholder}</p>
        )}
      </div>
    )
  }
  const single = s.bestOf === 1
  const game = single ? s.games[0] : undefined
  const value = (abbr: string, id: string) => {
    if (!single) return s.teams.find((t) => t.abbr === abbr)?.wins
    if (!game || game.state === 'pre') return undefined
    return game.teams.find((t) => t.id === id)?.score ?? undefined
  }
  const ours = s.teams.some((t) => t.id === team.id)
  const selected = selectedKey === s.key
  return (
    <button
      type="button"
      onClick={() => onSelect(s.key)}
      aria-pressed={selected}
      className={`${base} ${s.live ? 'border-live/60' : 'border-border'} ${selected ? 'outline-2 outline-text/30' : ''} hover:bg-surface-2`}
      style={ours ? { boxShadow: `inset 3px 0 0 ${team.color}` } : undefined}
    >
      {s.live && (
        <span className="absolute -top-3 right-1 scale-90">
          <LiveBadge />
        </span>
      )}
      {s.teams.map((t) => (
        <TeamRow
          key={t.abbr}
          league={league}
          abbr={t.abbr}
          seed={t.seed}
          ours={t.id === team.id}
          value={value(t.abbr, t.id)}
          won={s.winner === t.abbr}
          lost={!!s.winner && s.winner !== t.abbr}
          dir={dir}
        />
      ))}
    </button>
  )
}

function TeamRow({
  league,
  abbr,
  seed,
  ours,
  value,
  won = false,
  lost = false,
  dir = 'ltr',
}: {
  league: League
  abbr: string
  seed: number | null
  ours: boolean
  value?: number | null
  won?: boolean
  lost?: boolean
  dir?: Dir
}) {
  return (
    <div className={`flex h-8 items-center gap-1.5 ${lost ? 'text-muted' : ''}`}>
      <Logo src={teamLogoByAbbr(league, abbr)} alt="" size={24} />
      <span className="min-w-0 leading-none">
        <span className={`block text-sm ${won || ours ? 'font-bold' : 'font-semibold'}`}>{abbr}</span>
        {seed !== null && <span className="block text-[10px] text-muted">{seed}</span>}
      </span>
      <span className={`ml-auto text-sm tabular-nums ${won ? 'font-bold' : ''}`}>{value ?? ''}</span>
      {/* Winner marker, pointing towards the next round. */}
      <svg aria-hidden width="6" height="8" viewBox="0 0 6 8" className={`shrink-0 ${won ? 'text-text' : 'invisible'} ${dir === 'rtl' ? '-scale-x-100' : ''}`}>
        <path d="M0 0 L6 4 L0 8 Z" fill="currentColor" />
      </svg>
    </div>
  )
}

function SeriesPanel({ cell, league, team }: { cell: Cell; league: League; team: TeamConfig }) {
  const s = cell.slot.series!
  const ours = s.teams.some((t) => t.id === team.id)
  const label = s.games[0]?.seasonType === 5 ? `Play-in · ${playInLabel(s.games[0].note)}` : cell.round
  return (
    <Card
      title={
        <span className="flex items-center gap-2 normal-case">
          {s.teams.map((t, i) => (
            <span key={t.abbr} className="inline-flex items-center gap-1 text-text">
              {i > 0 && <span className="mr-1 text-muted">vs</span>}
              <Logo src={teamLogoByAbbr(league, t.abbr)} alt="" size={16} />
              {t.abbr}
            </span>
          ))}
        </span>
      }
      right={label}
    >
      <p className="mb-2 flex items-center gap-2 text-xs text-muted">
        {s.live && <LiveBadge />}
        {status(s)}
      </p>
      <ol className="space-y-1 text-xs">
        {s.games.map((g, i) => (
          <GameLine key={g.id} g={g} n={i + 1} ours={ours} team={team} single={s.bestOf === 1} />
        ))}
      </ol>
    </Card>
  )
}

function status(s: Series): string {
  const live = s.games.find((g) => g.state === 'in')
  if (live) {
    if (s.bestOf === 1) return live.detail ?? 'In progress'
    const away = live.teams.find((t) => !t.home) ?? live.teams[0]
    const home = live.teams.find((t) => t.home) ?? live.teams[1]
    return `Game ${s.games.indexOf(live) + 1}: ${away.abbr} ${away.score ?? 0} @ ${home.abbr} ${home.score ?? 0} · ${live.detail ?? 'live'}`
  }
  const [a, b] = s.teams
  if (s.bestOf === 1) {
    const g = s.games[0]
    return g.state === 'pre' ? gameDate(g.date) : 'Final'
  }
  const next = s.games.find((g) => g.state === 'pre')
  const lead = a.wins === b.wins ? `Tied ${a.wins}-${b.wins}` : `${a.wins > b.wins ? a.abbr : b.abbr} ${s.winner ? 'wins' : 'leads'} ${Math.max(a.wins, b.wins)}-${Math.min(a.wins, b.wins)}`
  return next ? `${lead} · Game ${s.games.indexOf(next) + 1} ${gameDate(next.date)}` : lead
}

/** "NBA Play-In - East - 7th Place vs 8th Place" → "7 v 8"; "… - 8th Seed Game" → "For the 8th seed". */
function playInLabel(note: string) {
  const part = note.split(' - ').at(-1) ?? ''
  const m = part.match(/(\d+)\w* Place vs (\d+)\w* Place/)
  if (m) return `${m[1]} v ${m[2]}`
  const seed = part.match(/(\d+\w*) Seed Game/)
  return seed ? `For the ${seed[1]} seed` : part
}

function GameLine({ g, n, ours, team, single }: { g: PostseasonGame; n: number; ours: boolean; team: TeamConfig; single: boolean }) {
  const away = g.teams.find((t) => !t.home) ?? g.teams[0]
  const home = g.teams.find((t) => t.home) ?? g.teams[1]
  const text = (
    <>
      {!single && <span className="w-12 shrink-0 text-muted">Game {n}</span>}
      <span className={away.winner ? 'font-semibold' : ''}>
        {away.abbr} {g.state !== 'pre' ? away.score : ''}
      </span>
      <span className="text-muted">@</span>
      <span className={home.winner ? 'font-semibold' : ''}>
        {home.abbr} {g.state !== 'pre' ? home.score : ''}
      </span>
      <span className="ml-auto text-muted">{g.state === 'pre' ? gameDate(g.date) : g.state === 'in' ? g.detail : shortDate(g.date)}</span>
    </>
  )
  return (
    <li>
      {ours ? (
        <Link to={`/game/${team.key}/${g.id}`} className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-surface-2">
          {text}
          <span className="text-muted">›</span>
        </Link>
      ) : (
        <div className="flex items-center gap-1.5 px-1 py-0.5">{text}</div>
      )}
    </li>
  )
}
