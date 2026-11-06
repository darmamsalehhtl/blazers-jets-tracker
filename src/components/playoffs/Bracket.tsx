import { useState } from 'react'
import { Link } from 'react-router-dom'
import { teamLogoByAbbr } from '../../lib/espn'
import { gameDate, shortDate } from '../../lib/format'
import type { Bracket as BracketData, PostseasonGame, Series, Slot } from '../../lib/playoffs'
import type { TeamConfig } from '../../lib/teams'
import { Card, LiveBadge, Logo, Tabs } from '../ui'

interface Column {
  id: string
  name: string
  /** Tab label on phones */
  short: string
  /** Slots per conference ('final' holds the championship) */
  byConf: Record<string, Slot[]>
}

const SHORT: Record<string, string> = {
  'First Round': 'Round 1',
  'Conference Semifinals': 'Semis',
  'Conference Finals': 'Conf. Finals',
  'Conference Championship': 'Conf. Champ.',
}

function columnsOf(b: BracketData): Column[] {
  const cols: Column[] = []
  if (b.league === 'nba')
    cols.push({ id: 'play-in', name: 'Play-in', short: 'Play-in', byConf: Object.fromEntries(b.confs.map((c) => [c, (b.playIn[c] ?? []).map((series) => ({ series }))])) })
  b.rounds.forEach((r, i) => cols.push({ id: `r${i}`, name: r.name, short: SHORT[r.name] ?? r.name, byConf: r.byConf }))
  cols.push({ id: 'final', name: b.league === 'nfl' ? 'Super Bowl' : 'NBA Finals', short: b.league === 'nfl' ? 'Super Bowl' : 'Finals', byConf: { final: [b.final] } })
  return cols
}

/** The round to open on phones: one with a live game, else the last with a matchup set (or the first). */
function currentColumn(cols: Column[]) {
  const live = cols.find((c) => Object.values(c.byConf).some((slots) => slots.some((s) => s.series?.live)))
  if (live) return live.id
  const set = cols.filter((c) => Object.values(c.byConf).some((slots) => slots.some((s) => s.series)))
  return (set.at(-1) ?? cols[0]).id
}

export function Bracket({ bracket, team }: { bracket: BracketData; team: TeamConfig }) {
  const cols = columnsOf(bracket)
  const [col, setCol] = useState(() => currentColumn(cols))
  const shown = cols.find((c) => c.id === col) ?? cols[0]

  return (
    <div className="space-y-3">
      {bracket.champion && (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
          <Logo src={teamLogoByAbbr(bracket.league, bracket.champion)} alt="" size={20} />
          <span>
            <b>{bracket.champion}</b> won the {bracket.league === 'nfl' ? `Super Bowl (${bracket.label} season)` : `${bracket.label} NBA Finals`}.
          </span>
        </p>
      )}

      {/* Phones: one round at a time. */}
      <div className="space-y-3 md:hidden">
        <Tabs tabs={cols.map((c) => ({ id: c.id, label: c.short }))} value={shown.id} onChange={setCol} />
        {Object.entries(shown.byConf).map(([conf, slots]) => (
          <section key={conf}>
            {conf !== 'final' && <p className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-muted uppercase">{conf}</p>}
            {conf === 'final' || shown.id !== 'r0' || bracket.league !== 'nfl' ? null : <Byes bracket={bracket} conf={conf} />}
            <div className="space-y-2">
              {slots.length ? slots.map((s, i) => <SlotCard key={i} slot={s} league={bracket.league} team={team} />) : <p className="px-1 text-sm text-muted">No games yet.</p>}
            </div>
          </section>
        ))}
      </div>

      {/* Laptop: every round side by side, per conference. */}
      <div className="hidden space-y-3 md:block">
        {bracket.confs.map((conf) => (
          <Card key={conf} title={conf}>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols.length - 1}, minmax(0, 1fr))` }}>
              {cols
                .filter((c) => c.id !== 'final')
                .map((c) => (
                  <div key={c.id} className="flex flex-col">
                    <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">{c.name}</p>
                    {c.id === 'r0' && bracket.league === 'nfl' && <Byes bracket={bracket} conf={conf} />}
                    <div className="flex flex-1 flex-col justify-around gap-2">
                      {(c.byConf[conf] ?? []).map((s, i) => (
                        <SlotCard key={i} slot={s} league={bracket.league} team={team} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        ))}
        <Card title={bracket.league === 'nfl' ? 'Super Bowl' : 'NBA Finals'}>
          <div className="max-w-sm">
            <SlotCard slot={bracket.final} league={bracket.league} team={team} />
          </div>
        </Card>
      </div>
    </div>
  )
}

function Byes({ bracket, conf }: { bracket: BracketData; conf: string }) {
  const byes = bracket.byes[conf] ?? []
  if (!byes.length) return null
  return (
    <p className="mb-2 flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-[13px]">
      {byes.map((t) => (
        <span key={t.abbr} className="inline-flex items-center gap-1">
          <span className="text-[11px] text-muted">{t.seed}</span>
          <Logo src={teamLogoByAbbr(bracket.league, t.abbr)} alt="" size={16} />
          {t.abbr}
        </span>
      ))}
      <span className="text-xs text-muted">first-round bye</span>
    </p>
  )
}

function SlotCard({ slot, league, team }: { slot: Slot; league: 'nfl' | 'nba'; team: TeamConfig }) {
  if (slot.series) return <SeriesCard s={slot.series} league={league} team={team} />
  return (
    <div className="rounded-xl border border-dashed border-border px-3 py-2 text-[13px]">
      {slot.known?.map((t) => (
        <div key={t.abbr} className="flex items-center gap-2 py-0.5">
          <span className="w-4 text-right text-[11px] text-muted">{t.seed}</span>
          <Logo src={teamLogoByAbbr(league, t.abbr)} alt="" size={18} />
          {t.abbr}
        </div>
      ))}
      {slot.placeholder && <p className="py-0.5 text-xs text-muted">{slot.placeholder}</p>}
    </div>
  )
}

function SeriesCard({ s, league, team }: { s: Series; league: 'nfl' | 'nba'; team: TeamConfig }) {
  const [open, setOpen] = useState(false)
  const single = s.bestOf === 1
  const game = single ? s.games[0] : undefined
  const ours = s.teams.some((t) => t.id === team.id)
  const score = (abbr: string) => (single ? game?.teams.find((t) => t.abbr === abbr)?.score : s.teams.find((t) => t.abbr === abbr)?.wins)
  const showScore = !single || game?.state !== 'pre'

  const body = (
    <>
      {s.teams.map((t) => {
        const lost = !!s.winner && s.winner !== t.abbr
        return (
          <div key={t.abbr} className={`flex items-center gap-2 py-0.5 ${lost ? 'text-muted' : ''} ${s.winner === t.abbr ? 'font-semibold' : ''}`}>
            <span className="w-4 text-right text-[11px] text-muted">{t.seed ?? ''}</span>
            <Logo src={teamLogoByAbbr(league, t.abbr)} alt="" size={18} />
            <span className={t.id === team.id ? 'font-bold' : ''}>{t.abbr}</span>
            <span className="ml-auto tabular-nums">{showScore ? score(t.abbr) ?? '' : ''}</span>
          </div>
        )
      })}
      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
        {s.live && <LiveBadge />}
        <span>
          {game?.seasonType === 5 && <>{playInLabel(game.note)} · </>}
          {status(s)}
        </span>
        {!single && (
          <span aria-hidden className={`ml-auto text-sm leading-none transition-transform ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        )}
      </p>
    </>
  )

  const cls = `block rounded-xl border bg-surface px-3 py-2 text-[13px] ${s.live ? 'border-live/50' : 'border-border'}`
  const style = ours ? { boxShadow: `inset 3px 0 0 ${team.color}` } : undefined
  if (single && game) {
    return ours ? (
      <Link to={`/game/${team.key}/${game.id}`} className={`${cls} hover:bg-surface-2`} style={style}>
        {body}
      </Link>
    ) : (
      <div className={cls} style={style}>
        {body}
      </div>
    )
  }
  return (
    <div className={cls} style={style}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="block w-full text-left">
        {body}
      </button>
      {open && (
        <ol className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs">
          {s.games.map((g, i) => (
            <GameLine key={g.id} g={g} n={i + 1} ours={ours} team={team} />
          ))}
        </ol>
      )}
    </div>
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

function GameLine({ g, n, ours, team }: { g: PostseasonGame; n: number; ours: boolean; team: TeamConfig }) {
  const away = g.teams.find((t) => !t.home) ?? g.teams[0]
  const home = g.teams.find((t) => t.home) ?? g.teams[1]
  const text = (
    <>
      <span className="w-12 shrink-0 text-muted">Game {n}</span>
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
        <Link to={`/game/${team.key}/${g.id}`} className="flex items-center gap-1.5 rounded hover:bg-surface-2">
          {text}
        </Link>
      ) : (
        <div className="flex items-center gap-1.5">{text}</div>
      )}
    </li>
  )
}
