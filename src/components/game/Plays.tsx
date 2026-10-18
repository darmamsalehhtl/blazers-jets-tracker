import { useMemo, useState } from 'react'
import { teamLogo, type TeamRef } from '../../lib/espn'
import { periodLabel, type Drive, type Summary } from '../../lib/summary'
import { Card, Empty, Logo, Select } from '../ui'

function teamMap(s: Summary) {
  const m = new Map<string, TeamRef>()
  for (const c of s.header.competitions[0].competitors) m.set(c.team.id, c.team)
  return m
}

/** NBA: every play, newest first, filterable by quarter / team / scoring. */
export function NbaPlays({ s }: { s: Summary }) {
  const teams = teamMap(s)
  const plays = s.plays ?? []
  const periods = [...new Set(plays.map((p) => p.period.number))]
  const [period, setPeriod] = useState<number>(0)
  const [teamId, setTeamId] = useState<string>('')
  const [scoringOnly, setScoringOnly] = useState(false)

  const shown = useMemo(
    () =>
      plays
        .filter((p) => (!period || p.period.number === period) && (!teamId || p.team?.id === teamId) && (!scoringOnly || p.scoringPlay))
        .slice()
        .reverse(),
    [plays, period, teamId, scoringOnly],
  )

  if (!plays.length) return <Empty>Play-by-play shows up once the game starts.</Empty>

  return (
    <Card
      title={`Play-by-play · ${shown.length}`}
      pad={false}
      right={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select
            value={period}
            onChange={setPeriod}
            options={[{ value: 0, label: 'All' }, ...periods.map((p) => ({ value: p, label: periodLabel(p) }))]}
          />
          <Select
            value={teamId}
            onChange={setTeamId}
            options={[{ value: '', label: 'Both' }, ...[...teams.values()].map((t) => ({ value: t.id, label: t.abbreviation }))]}
          />
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={scoringOnly} onChange={(e) => setScoringOnly(e.target.checked)} /> Scores
          </label>
        </div>
      }
    >
      <ul className="max-h-[70vh] overflow-y-auto">
        {shown.map((p) => {
          const t = p.team ? teams.get(p.team.id) : undefined
          return (
            <li key={p.id} className={`flex gap-3 border-t border-border/60 px-4 py-2 text-sm ${p.scoringPlay ? '' : 'text-muted'}`}>
              <div className="w-14 shrink-0 text-[11px] text-muted tabular-nums">
                {periodLabel(p.period.number)} {p.clock.displayValue}
              </div>
              <div className="w-5 shrink-0">{t && <Logo src={teamLogo(t)} alt={t.abbreviation} size={18} />}</div>
              <div className={`min-w-0 flex-1 ${p.scoringPlay ? 'font-medium text-text' : ''}`}>{p.text}</div>
              <div className="shrink-0 text-xs font-semibold text-text tabular-nums">
                {p.awayScore}-{p.homeScore}
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/** NFL: scoring summary plus every drive (newest first), expandable to its plays. */
export function NflDrives({ s }: { s: Summary }) {
  const teams = teamMap(s)
  const drives: Drive[] = [...(s.drives?.previous ?? [])]
  const cur = s.drives?.current
  if (cur && !drives.some((d) => d.id === cur.id)) drives.push(cur)
  const [open, setOpen] = useState<Set<string>>(() => new Set(cur ? [cur.id] : []))

  if (!drives.length) return <Empty>Drives show up once the game starts.</Empty>

  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div className="space-y-3">
      <ScoringSummary s={s} />
      <Card title={`Drives · ${drives.length}`} pad={false}>
        <ul>
          {drives
            .slice()
            .reverse()
            .map((d) => {
              const t = teams.get(d.team.id) ?? d.team
              const isOpen = open.has(d.id)
              const live = cur?.id === d.id && s.header.competitions[0].status.type.state === 'in'
              return (
                <li key={d.id} className="border-t border-border/60 first:border-0">
                  <button onClick={() => toggle(d.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2">
                    <Logo src={teamLogo(t)} alt={t.abbreviation} size={22} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className={d.isScore ? 'text-good' : ''}>{live ? 'Current drive' : (d.displayResult ?? d.result ?? '—')}</span>
                        {d.isScore && <span className="rounded bg-good/15 px-1.5 text-[10px] font-bold text-good">SCORE</span>}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {d.description}
                        {d.start?.text && ` · from ${d.start.text}`}
                        {d.start?.period && ` · ${periodLabel(d.start.period.number)} ${d.start.clock?.displayValue ?? ''}`}
                      </div>
                    </div>
                    <span className="text-xs text-muted">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <ol className="mx-4 mb-3 space-y-1.5 border-l-2 border-border pl-3">
                      {(d.plays ?? []).map((p) => (
                        <li key={p.id} className="text-[13px]">
                          <div className="text-[11px] text-muted">
                            {p.start?.downDistanceText ?? ''} · {periodLabel(p.period.number)} {p.clock.displayValue}
                            {typeof p.statYardage === 'number' && p.statYardage !== 0 && (
                              <span className={p.statYardage > 0 ? 'text-good' : 'text-bad'}>
                                {' '}
                                · {p.statYardage > 0 ? '+' : ''}
                                {p.statYardage} yds
                              </span>
                            )}
                          </div>
                          <div className={p.scoringPlay ? 'font-semibold' : p.isTurnover ? 'font-semibold text-bad' : ''}>{p.text}</div>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              )
            })}
        </ul>
      </Card>
    </div>
  )
}

export function ScoringSummary({ s }: { s: Summary }) {
  const sp = s.scoringPlays ?? []
  if (!sp.length) return null
  const comp = s.header.competitions[0]
  const away = comp.competitors.find((c) => c.homeAway === 'away')?.team.abbreviation
  const home = comp.competitors.find((c) => c.homeAway === 'home')?.team.abbreviation
  return (
    <Card title="Scoring plays" right={`${away} – ${home}`} pad={false}>
      <ul>
        {sp.map((p) => (
          <li key={p.id} className="flex items-center gap-3 border-t border-border/60 px-4 py-2 text-sm first:border-0">
            <Logo src={teamLogo(p.team)} alt={p.team.abbreviation} size={20} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-muted">
                {periodLabel(p.period.number)} {p.clock.displayValue} · {p.type.abbreviation ?? p.type.text}
              </div>
              <div>{p.text}</div>
            </div>
            <div className="shrink-0 font-semibold tabular-nums">
              {p.awayScore}-{p.homeScore}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
