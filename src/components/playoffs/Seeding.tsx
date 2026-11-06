import { Fragment } from 'react'
import { teamLogo } from '../../lib/espn'
import {
  CLINCH_LABELS,
  PLAYOFF_RULES,
  fmtGames,
  races,
  remainingFor,
  type Conference,
  type PlayoffsLeague,
  type Race,
  type Seeded,
  winPcts,
} from '../../lib/playoffs'
import type { League, TeamConfig } from '../../lib/teams'
import { Card, Logo } from '../ui'

interface Group {
  label: string
  from: number
  to: number
}

/** Row groups per league; the boundaries between them are the cut lines. */
function groupsFor(league: League, size: number): Group[] {
  const r = PLAYOFF_RULES[league]
  if (r.playIn)
    return [
      { label: 'Playoffs', from: 1, to: r.seeds },
      { label: 'Play-in', from: r.playIn[0], to: r.playIn[1] },
      { label: 'Out', from: r.playIn[1] + 1, to: size },
    ]
  return [
    { label: 'Division leaders', from: 1, to: r.divisionLeaders },
    { label: 'Wild cards', from: r.divisionLeaders + 1, to: r.seeds },
    { label: 'Out', from: r.seeds + 1, to: size },
  ]
}

export function Seeding({
  league,
  confs,
  data,
  team,
}: {
  league: League
  confs: Conference[]
  /** Precomputed remaining schedules; undefined while loading or when missing */
  data: PlayoffsLeague | undefined
  team: TeamConfig
}) {
  const winPct = winPcts(confs)
  const clinchers = new Set(confs.flatMap((c) => c.teams.map((t) => t.clincher).filter(Boolean)))
  return (
    <div className="space-y-3">
      {confs.map((c) => (
        <ConferenceTable key={c.name} league={league} conf={c} data={data} winPct={winPct} team={team} />
      ))}
      <Legend league={league} clinchers={clinchers as Set<string>} />
    </div>
  )
}

function ConferenceTable({
  league,
  conf,
  data,
  winPct,
  team,
}: {
  league: League
  conf: Conference
  data: PlayoffsLeague | undefined
  winPct: Record<string, number>
  team: TeamConfig
}) {
  const nfl = league === 'nfl'
  const groups = groupsFor(league, conf.teams.length)
  // NBA: a margin column per line (playoffs, play-in); NFL: one.
  const lines: { target: Race['target']; label: string; title: string }[] = nfl
    ? [{ target: 'playoffs', label: 'Line', title: 'Games ahead of (+) or behind (−) the playoff line' }]
    : [
        { target: 'playoffs', label: 'Top 6', title: 'Games ahead of (+) or behind (−) the top-6 line' },
        { target: 'play-in', label: 'Top 10', title: 'Games ahead of (+) or behind (−) the play-in line' },
      ]
  const cols = 4 + lines.length + 2

  return (
    <Card title={conf.name} pad={false}>
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full border-collapse text-[13px] tabular-nums">
          <thead>
            <tr className="border-b border-border text-[11px] text-muted uppercase">
              <th className="sticky left-0 z-10 bg-surface py-1.5 pr-1 pl-4 text-right font-medium">#</th>
              <th className="sticky left-8 z-10 bg-surface px-1.5 py-1.5 md:px-2 text-left font-medium">Team</th>
              <th className="px-1.5 py-1.5 md:px-2 text-right font-medium">{nfl ? 'W-L-T' : 'W-L'}</th>
              {lines.map((l) => (
                <th key={l.target} title={l.title} className="px-1.5 py-1.5 md:px-2 text-right font-medium whitespace-nowrap">
                  {l.label}
                </th>
              ))}
              <th className="px-1.5 py-1.5 md:px-2 text-right font-medium">Pct</th>
              <th className="px-1.5 py-1.5 md:px-2 text-right font-medium" title="Regular-season games left">
                Left
              </th>
              <th className="py-1.5 pr-4 pl-1.5 md:pl-2 text-right font-medium" title="Remaining strength of schedule: opponents' average win %">
                SOS
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.label}>
                <tr className="border-b border-border/60 bg-surface-2/60">
                  <td colSpan={cols} className="py-1 pl-4 text-[11px] font-semibold tracking-wide text-muted uppercase">
                    <span className="sticky left-4">
                      {g.label}
                      {g.to > g.from && <span className="font-normal normal-case"> · seeds {g.from}–{g.to}</span>}
                    </span>
                  </td>
                </tr>
                {conf.teams
                  .filter((t) => t.seed >= g.from && t.seed <= g.to)
                  .map((t) => (
                    <Row key={t.entry.team.id} league={league} conf={conf} t={t} lines={lines} data={data} winPct={winPct} team={team} />
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Row({
  league,
  conf,
  t,
  lines,
  data,
  winPct,
  team,
}: {
  league: League
  conf: Conference
  t: Seeded
  lines: { target: Race['target'] }[]
  data: PlayoffsLeague | undefined
  winPct: Record<string, number>
  team: TeamConfig
}) {
  const abbr = t.entry.team.abbreviation
  const ours = t.entry.team.id === team.id
  const rs = races(league, conf, t)
  const rem = data?.available ? remainingFor(data.remaining[abbr], winPct) : null
  const bye = t.seed <= PLAYOFF_RULES[league].byes
  // Sticky cells need an opaque background, so the highlight is drawn on each cell.
  const bg = ours ? (league === 'nfl' ? 'bg-[color-mix(in_srgb,var(--nyj)_12%,var(--surface))]' : 'bg-[color-mix(in_srgb,var(--por)_12%,var(--surface))]') : 'bg-surface'
  const pct = t.wins + t.losses + t.ties ? (t.wins + t.ties / 2) / (t.wins + t.losses + t.ties) : 0

  return (
    <tr className={`border-b border-border/60 last:border-0 ${ours ? 'font-semibold' : ''}`}>
      <td className={`sticky left-0 z-10 w-8 py-1.5 pr-1 pl-4 text-right text-[11px] text-muted ${bg}`} style={ours ? { boxShadow: `inset 3px 0 0 ${team.color}` } : undefined}>
        {t.seed < 90 ? t.seed : ''}
      </td>
      <td className={`sticky left-8 z-10 px-1.5 py-1.5 md:px-2 whitespace-nowrap ${bg}`}>
        <span className="flex items-center gap-2">
          <Logo src={teamLogo(t.entry.team)} alt="" size={18} />
          <span className="w-11 shrink-0">{abbr}</span>
          <span className="hidden text-muted md:inline">{t.entry.team.shortDisplayName ?? t.entry.team.name}</span>
          {t.clincher && (
            <span title={CLINCH_LABELS[t.clincher] ?? `Clinch status ${t.clincher}`} className={`text-[10px] font-semibold ${t.clincher === 'e' ? 'text-bad' : 'text-good'}`}>
              {t.clincher}
            </span>
          )}
          {bye && <span className="rounded bg-surface-2 px-1 text-[10px] font-medium text-muted">Bye</span>}
        </span>
      </td>
      <td className={`px-1.5 py-1.5 md:px-2 text-right whitespace-nowrap ${bg}`}>
        {t.wins}-{t.losses}
        {league === 'nfl' ? `-${t.ties}` : ''}
      </td>
      {lines.map((l) => {
        const r = rs.find((x) => x.target === l.target)
        return (
          <td key={l.target} className={`px-1.5 py-1.5 md:px-2 text-right whitespace-nowrap ${bg} ${r ? (r.gb < 0 ? 'text-good' : r.gb > 0 ? 'text-bad' : '') : 'text-muted'}`}>
            {r ? (r.gb === 0 ? '0' : `${r.gb < 0 ? '+' : '−'}${fmtGames(r.gb)}`) : ''}
          </td>
        )
      })}
      <td className={`px-1.5 py-1.5 md:px-2 text-right ${bg}`}>{pct.toFixed(3).replace(/^0/, '')}</td>
      <td className={`px-1.5 py-1.5 md:px-2 text-right ${bg}`}>{rem ? rem.left : '–'}</td>
      <td className={`py-1.5 pr-4 pl-1.5 md:pl-2 text-right ${bg}`}>{rem?.sos != null ? rem.sos.toFixed(3).replace(/^0/, '') : '–'}</td>
    </tr>
  )
}

function Legend({ league, clinchers }: { league: League; clinchers: Set<string> }) {
  const codes = Object.keys(CLINCH_LABELS).filter((c) => (league === 'nba' ? c !== '*' : c !== 'pi'))
  const unknown = [...clinchers].filter((c) => !(c in CLINCH_LABELS))
  return (
    <div className="space-y-1 px-1 text-[11px] text-muted">
      <p>
        Seeds follow ESPN, tiebreakers included. {league === 'nfl' ? 'Line' : 'Top 6 / Top 10'}: games ahead (+) of the first team below
        the line, or behind (−) the last team above it. SOS: remaining opponents' current win %.
      </p>
      <p className="flex flex-wrap gap-x-3 gap-y-0.5">
        {codes.map((c) => (
          <span key={c}>
            <b className={c === 'e' ? 'text-bad' : 'text-good'}>{c}</b> {CLINCH_LABELS[c].toLowerCase()}
          </span>
        ))}
        {unknown.map((c) => (
          <span key={c}>
            <b>{c}</b> ESPN clinch status
          </span>
        ))}
      </p>
    </div>
  )
}
