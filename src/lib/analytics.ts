// Advanced stats computed in the browser from ESPN box scores and plays.

import type { BoxTeam, Drive, Play, Summary } from './summary'

// ---------------------------------------------------------------- NBA

export interface NbaTeamLine {
  pts: number
  fgm: number
  fga: number
  tpm: number
  tpa: number
  ftm: number
  fta: number
  oreb: number
  dreb: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  pf: number
  paint?: number
  fastBreak?: number
  offTov?: number
}

function stat(t: BoxTeam, name: string) {
  return t.statistics.find((s) => s.name === name)?.displayValue
}
function pair(v?: string): [number, number] {
  const [a, b] = (v ?? '').split('-').map(Number)
  return [a || 0, b || 0]
}

export function nbaLine(t: BoxTeam, pts: number): NbaTeamLine {
  const [fgm, fga] = pair(stat(t, 'fieldGoalsMade-fieldGoalsAttempted'))
  const [tpm, tpa] = pair(stat(t, 'threePointFieldGoalsMade-threePointFieldGoalsAttempted'))
  const [ftm, fta] = pair(stat(t, 'freeThrowsMade-freeThrowsAttempted'))
  const n = (k: string) => Number(stat(t, k)) || 0
  return {
    pts,
    fgm,
    fga,
    tpm,
    tpa,
    ftm,
    fta,
    oreb: n('offensiveRebounds'),
    dreb: n('defensiveRebounds'),
    reb: n('totalRebounds'),
    ast: n('assists'),
    stl: n('steals'),
    blk: n('blocks'),
    tov: n('totalTurnovers') || n('turnovers'),
    pf: n('fouls'),
    paint: n('pointsInPaint'),
    fastBreak: n('fastBreakPoints'),
    offTov: n('turnoverPoints'),
  }
}

/** Basketball-Reference style possession estimate, averaged over both teams. */
export function possessions(a: NbaTeamLine, b: NbaTeamLine) {
  const one = (t: NbaTeamLine, o: NbaTeamLine) =>
    t.fga + 0.4 * t.fta - 1.07 * (t.oreb / Math.max(1, t.oreb + o.dreb)) * (t.fga - t.fgm) + t.tov
  return 0.5 * (one(a, b) + one(b, a))
}

export function fourFactors(t: NbaTeamLine, o: NbaTeamLine, poss: number) {
  return {
    efg: t.fga ? (t.fgm + 0.5 * t.tpm) / t.fga : NaN,
    tovPct: poss ? t.tov / poss : NaN,
    orbPct: t.oreb + o.dreb ? t.oreb / (t.oreb + o.dreb) : NaN,
    ftRate: t.fga ? t.ftm / t.fga : NaN,
    ts: t.fga + t.fta ? t.pts / (2 * (t.fga + 0.44 * t.fta)) : NaN,
    ortg: poss ? (100 * t.pts) / poss : NaN,
    drtg: poss ? (100 * o.pts) / poss : NaN,
    astRate: t.fgm ? t.ast / t.fgm : NaN,
    threeRate: t.fga ? t.tpa / t.fga : NaN,
  }
}

/** Minutes of game time elapsed at a play (12-min quarters, 5-min OT for NBA; 15-min quarters, 10-min OT for NFL). */
export function elapsedMinutes(period: number, clock: string, league: 'nba' | 'nfl') {
  const q = league === 'nba' ? 12 : 15
  const ot = league === 'nba' ? 5 : 10
  const [m, s] = clock.split(':').map(Number)
  const left = (m || 0) + (s || 0) / 60
  const before = period <= 4 ? (period - 1) * q : 4 * q + (period - 5) * ot
  const len = period <= 4 ? q : ot
  return before + (len - left)
}

/** Our score margin over game time, from scoring plays. */
export function scoreFlow(s: Summary, ourHome: boolean, league: 'nba' | 'nfl') {
  const src: { period: { number: number }; clock: { displayValue: string }; awayScore?: number; homeScore?: number; text?: string }[] =
    league === 'nba' ? (s.plays ?? []).filter((p) => p.scoringPlay) : (s.scoringPlays ?? [])
  const pts = [{ t: 0, margin: 0, text: 'Start', score: '0-0' }]
  for (const p of src) {
    const home = p.homeScore ?? 0
    const away = p.awayScore ?? 0
    pts.push({
      t: Math.round(elapsedMinutes(p.period.number, p.clock.displayValue, league) * 100) / 100,
      margin: ourHome ? home - away : away - home,
      text: p.text ?? '',
      score: `${away}-${home}`,
    })
  }
  return pts
}

/** Largest unanswered scoring run for each side (NBA). */
export function biggestRuns(plays: Play[], teamIds: [string, string]) {
  const best: Record<string, number> = { [teamIds[0]]: 0, [teamIds[1]]: 0 }
  let cur = { team: '', pts: 0 }
  for (const p of plays) {
    if (!p.scoringPlay || !p.team) continue
    const v = p.scoreValue ?? 0
    if (p.team.id === cur.team) cur.pts += v
    else cur = { team: p.team.id, pts: v }
    best[cur.team] = Math.max(best[cur.team] ?? 0, cur.pts)
  }
  return best
}

// ---------------------------------------------------------------- NFL

const NON_SCRIMMAGE = /kickoff|punt|field goal|extra point|timeout|end (of )?(period|half|game)|two-minute|coin toss|penalty$/i

export function isDropback(p: Play) {
  return /\bpass\b|sacked|scrambles|spiked/i.test(p.text) || /pass|sack|interception/i.test(p.type?.text ?? '')
}

export function isScrimmage(p: Play) {
  const t = p.type?.text ?? ''
  if (NON_SCRIMMAGE.test(t)) return false
  if (/no play/i.test(p.text)) return false
  return p.start?.down !== undefined && p.start.down > 0
}

function isTd(p: Play) {
  return /touchdown/i.test(p.type?.text ?? '') || /TOUCHDOWN/.test(p.text)
}

/** Standard success-rate definition: 40% of yards to go on 1st, 60% on 2nd, 100% on 3rd/4th. */
export function isSuccess(p: Play) {
  if (isTd(p)) return true
  const y = p.statYardage ?? 0
  const d = p.start?.distance ?? 10
  const down = p.start?.down ?? 1
  if (down === 1) return y >= 0.4 * d
  if (down === 2) return y >= 0.6 * d
  return y >= d
}

export interface NflTeamAnalytics {
  plays: number
  yards: number
  ypp: number
  successRate: number
  passPlays: number
  rushPlays: number
  passYpp: number
  rushYpp: number
  passSuccess: number
  rushSuccess: number
  explosive: number
  earlyDownPassRate: number
  thirdDownAtt: number
  thirdDownConv: number
  avgThirdDownDist: number
  drives: number
  pointsDrives: number
  tdDrives: number
  avgStart: number
  redZoneTrips: number
  redZoneTds: number
  sacks: number
  turnovers: number
  threeAndOuts: number
}

/** Own-yard-line (1–99) from an ESPN position string like "NYJ 35". */
export function ownYardLine(text: string | undefined, teamAbbr: string) {
  if (!text) return NaN
  const m = text.match(/([A-Z]+)\s+(\d+)/)
  if (!m) return text.trim() === '50' ? 50 : NaN
  const n = Number(m[2])
  return m[1] === teamAbbr ? n : 100 - n
}

export function nflTeamAnalytics(drives: Drive[], teamId: string, teamAbbr: string): NflTeamAnalytics {
  const mine = drives.filter((d) => d.team.id === teamId)
  const plays = mine.flatMap((d) => d.plays ?? []).filter((p) => isScrimmage(p) && (p.start?.team?.id ?? teamId) === teamId)
  const pass = plays.filter(isDropback)
  const rush = plays.filter((p) => !isDropback(p))
  const yards = (ps: Play[]) => ps.reduce((a, p) => a + (p.statYardage ?? 0), 0)
  const rate = (ps: Play[], f: (p: Play) => boolean) => (ps.length ? ps.filter(f).length / ps.length : NaN)
  const early = plays.filter((p) => (p.start?.down ?? 0) <= 2)
  const third = plays.filter((p) => p.start?.down === 3)
  const thirdConv = third.filter((p) => isTd(p) || (p.statYardage ?? 0) >= (p.start?.distance ?? 99))
  const starts = mine.map((d) => ownYardLine(d.start?.text, teamAbbr)).filter(Number.isFinite)
  const rz = mine.filter((d) => (d.plays ?? []).some((p) => (p.start?.yardsToEndzone ?? 100) <= 20 && (p.start?.team?.id ?? teamId) === teamId))
  const scored = (d: Drive) => !!d.isScore
  const td = (d: Drive) => /TD|touchdown/i.test(d.result ?? d.displayResult ?? '')

  return {
    plays: plays.length,
    yards: yards(plays),
    ypp: plays.length ? yards(plays) / plays.length : NaN,
    successRate: rate(plays, isSuccess),
    passPlays: pass.length,
    rushPlays: rush.length,
    passYpp: pass.length ? yards(pass) / pass.length : NaN,
    rushYpp: rush.length ? yards(rush) / rush.length : NaN,
    passSuccess: rate(pass, isSuccess),
    rushSuccess: rate(rush, isSuccess),
    explosive: plays.filter((p) => (isDropback(p) ? (p.statYardage ?? 0) >= 20 : (p.statYardage ?? 0) >= 10)).length,
    earlyDownPassRate: rate(early, isDropback),
    thirdDownAtt: third.length,
    thirdDownConv: thirdConv.length,
    avgThirdDownDist: third.length ? third.reduce((a, p) => a + (p.start?.distance ?? 0), 0) / third.length : NaN,
    drives: mine.length,
    pointsDrives: mine.filter(scored).length,
    tdDrives: mine.filter(td).length,
    avgStart: starts.length ? starts.reduce((a, b) => a + b, 0) / starts.length : NaN,
    redZoneTrips: rz.length,
    redZoneTds: rz.filter(td).length,
    sacks: plays.filter((p) => /sack/i.test(p.type?.text ?? '') || /sacked/i.test(p.text)).length,
    turnovers: plays.filter((p) => p.isTurnover).length,
    threeAndOuts: mine.filter((d) => /punt/i.test(d.result ?? '') && (d.offensivePlays ?? 0) <= 3).length,
  }
}
