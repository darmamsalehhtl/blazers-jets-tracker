import { teamLogo } from '../../lib/espn'
import { ordinal } from '../../lib/format'
import { PLAYOFF_RULES, fmtGames, projection, races, tierOf, type Conference, type Matchup } from '../../lib/playoffs'
import type { League, TeamConfig } from '../../lib/teams'
import { Card, Logo } from '../ui'

/** Short conference name: "AFC", "West". */
function confShort(c: Conference) {
  return c.abbr.length <= 4 ? c.abbr : c.name.replace(/ Conference$/, '')
}

/** One line on where our team stands, e.g. "Jets: 12th in the AFC, 3 games back of the 7th seed". */
export function OurStanding({ league, confs, team }: { league: League; confs: Conference[]; team: TeamConfig }) {
  const conf = confs.find((c) => c.teams.some((t) => t.entry.team.id === team.id))
  const t = conf?.teams.find((x) => x.entry.team.id === team.id)
  if (!conf || !t) return null
  const r = PLAYOFF_RULES[league]
  const tier = tierOf(league, t.seed)
  const rs = races(league, conf, t)
  const games = (g: number) => `${fmtGames(g)} game${Math.abs(g) === 1 ? '' : 's'}`
  let status: string
  if (tier === 'in') {
    const lead = rs[0]
    const what = r.playIn ? 'the play-in' : 'the first team out'
    status = `in a playoff spot${lead ? (lead.gb < 0 ? `, ${games(lead.gb)} clear of ${what}` : lead.gb === 0 ? `, level with ${what}` : '') : ''}`
  } else if (tier === 'play-in') {
    const back = rs.find((x) => x.target === 'playoffs')
    status = `in the play-in${back && back.gb > 0 ? `, ${games(back.gb)} back of the ${ordinal(r.seeds)} seed` : ''}`
  } else {
    const line = rs.find((x) => x.target === (r.playIn ? 'play-in' : 'playoffs'))
    const seed = r.playIn ? r.playIn[1] : r.seeds
    status = line && line.gb > 0 ? `${games(line.gb)} back of the ${ordinal(seed)} seed` : `tied with the ${ordinal(seed)} seed`
  }
  return (
    <p className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" style={{ boxShadow: `inset 3px 0 0 ${team.color}` }}>
      <b>{team.nickname}:</b> {ordinal(t.seed)} in the {confShort(conf)}, {status}
      .
    </p>
  )
}

/** First-round matchups the current seeds would produce, per conference. */
export function Projection({ league, confs, team }: { league: League; confs: Conference[]; team: TeamConfig }) {
  const p = projection(league)
  return (
    <Card title="If the season ended today" pad={false}>
      <div className="grid gap-x-6 px-4 pb-3 md:grid-cols-2">
        {confs.map((c) => (
          <div key={c.name} className="py-1">
            <p className="mb-1 text-xs font-semibold text-muted">{confShort(c)}</p>
            <ul className="space-y-1 text-[13px]">
              {p.byes.map((s) => (
                <li key={`bye-${s}`} className="flex items-center gap-2">
                  <Side c={c} seed={s} team={team} />
                  <span className="text-xs text-muted">first-round bye</span>
                </li>
              ))}
              {p.playIn.map((m) => (
                <Pair key={`pi-${m.high}`} c={c} m={m} team={team} label="Play-in" />
              ))}
              {p.firstRound.map((m) => (
                <Pair key={`r1-${m.high}`} c={c} m={m} team={team} label={league === 'nfl' ? 'Wild Card' : 'Round 1'} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Pair({ c, m, team, label }: { c: Conference; m: Matchup; team: TeamConfig; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-muted">{label}</span>
      <Side c={c} seed={m.high} team={team} />
      <span className="text-xs text-muted">vs</span>
      {m.tbd ? (
        <span className="text-xs text-muted">{ordinal(m.low)} seed via play-in</span>
      ) : (
        <Side c={c} seed={m.low} team={team} />
      )}
    </li>
  )
}

function Side({ c, seed, team }: { c: Conference; seed: number; team: TeamConfig }) {
  const t = c.teams.find((x) => x.seed === seed)
  if (!t) return <span className="text-muted">({seed}) TBD</span>
  const ours = t.entry.team.id === team.id
  return (
    <span className={`inline-flex items-center gap-1 ${ours ? 'font-bold' : ''}`}>
      <span className="text-[11px] text-muted">{seed}</span>
      <Logo src={teamLogo(t.entry.team)} alt="" size={16} />
      {t.entry.team.abbreviation}
    </span>
  )
}
