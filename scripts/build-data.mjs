// Builds season-analytics JSON into public/data/ (run in CI before `vite build`).
//
//   nyj.json – Jets advanced stats from nflverse play-by-play (EPA, success
//              rate, CPOE, PROE, …) with league ranks, plus per-player rates.
//   por.json – Blazers season analytics from every ESPN box score + play-by-play
//              (pace, ratings, four factors, usage, clutch, season shot chart).
//   nfl-league.json / nba-league.json – every qualified player in the league
//              (efficiency + volume) for the "vs League" scatter plots.
//   draft.json – inputs for the live NFL draft order: every team's schedule
//              (for strength of schedule) and the traded picks for next draft.
//
// Each part fails independently: if a source is down, that file records the
// error and the app shows a notice instead of breaking the build.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'
import Papa from 'papaparse'

const OUT = new URL('../public/data/', import.meta.url)
const UA = { 'user-agent': 'Mozilla/5.0 (blazers-jets-tracker data build)' }

const now = new Date()
// NFL seasons are named for the year they start (Sept); before March it's last year's.
const NFL_SEASON = Number(process.env.NFL_SEASON) || (now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1)

async function main() {
  await mkdir(OUT, { recursive: true })
  // ONLY=draft (comma-separated) rebuilds just those files, handy locally.
  const only = process.env.ONLY?.split(',')
  // nfl-league reuses the Jets play-by-play pass, so the file is only read once.
  let jets
  const once = () => (jets ??= buildJets())
  const builders = {
    nyj: async () => {
      const { leagueInput, ...body } = await once()
      return body
    },
    por: buildBlazers,
    'nfl-league': async () => buildNflLeague((await once()).leagueInput),
    'nba-league': buildNbaLeague,
    draft: buildDraft,
  }
  const names = Object.keys(builders).filter((n) => !only || only.includes(n))
  const results = await Promise.allSettled(names.map((n) => builders[n]()))
  for (const [name, r] of names.map((n, i) => [n, results[i]])) {
    const body = r.status === 'fulfilled' ? r.value : { available: false, error: String(r.reason?.message ?? r.reason) }
    body.updatedAt = new Date().toISOString()
    await writeFile(new URL(`${name}.json`, OUT), JSON.stringify(body))
    console.log(`${name}.json:`, r.status === 'fulfilled' ? 'ok' : `FAILED (${body.error})`)
  }
}

// ------------------------------------------------------------------ helpers

async function getJSON(url) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: UA })
    if (res.ok) return res.json()
    if (attempt >= 2 || res.status === 404) throw new Error(`${res.status} ${url}`)
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
  }
}

/** Stream a (optionally gzipped) CSV from a URL, calling onRow for each row object. */
async function streamCsv(url, onRow) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  let stream = Readable.fromWeb(res.body)
  if (url.endsWith('.gz')) stream = stream.pipe(createGunzip())
  await new Promise((resolve, reject) => {
    const parser = Papa.parse(Papa.NODE_STREAM_INPUT, { header: true, skipEmptyLines: true })
    parser.on('data', onRow)
    parser.on('end', resolve)
    parser.on('error', reject)
    stream.on('error', reject)
    stream.pipe(parser)
  })
}

async function pool(items, n, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx], idx)
      }
    }),
  )
  return out
}

const num = (v) => {
  const n = Number(v)
  return v === '' || v === 'NA' || v === undefined || !Number.isFinite(n) ? null : n
}
const round = (v, d = 3) => (v === null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d)
const div = (a, b) => (b ? a / b : null)

/** Rank `key` across rows (1 = highest unless ascending). Ties share a rank. */
function rankBy(rows, key, ascending = false) {
  const vals = rows.map((r) => r[key]).filter((v) => v !== null && Number.isFinite(v))
  const sorted = [...vals].sort((a, b) => (ascending ? a - b : b - a))
  return (v) => (v === null || !Number.isFinite(v) ? null : sorted.indexOf(v) + 1)
}

// ------------------------------------------------------------------ Jets / nflverse

const NFLVERSE = 'https://github.com/nflverse/nflverse-data/releases/download'

function newAcc() {
  return {
    plays: 0, epa: 0, success: 0,
    pass: 0, passEpa: 0, passSuccess: 0,
    rush: 0, rushEpa: 0, rushSuccess: 0,
    early: 0, earlyPass: 0,
    proe: 0, proeN: 0,
    cpoe: 0, cpoeN: 0,
    att: 0, airYards: 0, yac: 0, comp: 0,
    explosive: 0, sacks: 0, turnovers: 0,
    third: 0, thirdConv: 0,
    rz: 0, rzEpa: 0, rzSuccess: 0,
  }
}

function addPlay(a, p) {
  const epa = num(p.epa)
  if (epa === null) return
  const isPass = p.pass === '1' || p.qb_dropback === '1'
  const yards = num(p.yards_gained) ?? 0
  const success = p.success === '1' ? 1 : 0
  a.plays++
  a.epa += epa
  a.success += success
  if (isPass) {
    a.pass++
    a.passEpa += epa
    a.passSuccess += success
    if (yards >= 20) a.explosive++
  } else {
    a.rush++
    a.rushEpa += epa
    a.rushSuccess += success
    if (yards >= 10) a.explosive++
  }
  const down = num(p.down)
  if (down === 1 || down === 2) {
    a.early++
    if (isPass) a.earlyPass++
  }
  if (down === 3) {
    a.third++
    if (p.third_down_converted === '1') a.thirdConv++
  }
  const poe = num(p.pass_oe)
  if (poe !== null) {
    a.proe += poe
    a.proeN++
  }
  const cpoe = num(p.cpoe)
  if (cpoe !== null) {
    a.cpoe += cpoe
    a.cpoeN++
  }
  if (p.pass_attempt === '1' && p.sack !== '1') {
    a.att++
    a.airYards += num(p.air_yards) ?? 0
    if (p.complete_pass === '1') {
      a.comp++
      a.yac += num(p.yards_after_catch) ?? 0
    }
  }
  if (p.sack === '1') a.sacks++
  if (p.interception === '1' || p.fumble_lost === '1') a.turnovers++
  if ((num(p.yardline_100) ?? 100) <= 20) {
    a.rz++
    a.rzEpa += epa
    a.rzSuccess += success
  }
}

function summarize(a) {
  return {
    plays: a.plays,
    epaPerPlay: round(div(a.epa, a.plays)),
    successRate: round(div(a.success, a.plays)),
    passEpa: round(div(a.passEpa, a.pass)),
    rushEpa: round(div(a.rushEpa, a.rush)),
    passSuccess: round(div(a.passSuccess, a.pass)),
    rushSuccess: round(div(a.rushSuccess, a.rush)),
    passRate: round(div(a.pass, a.plays)),
    earlyDownPassRate: round(div(a.earlyPass, a.early)),
    proe: round(div(a.proe, a.proeN), 2),
    cpoe: round(div(a.cpoe, a.cpoeN), 2),
    adot: round(div(a.airYards, a.att), 2),
    yacPerCompletion: round(div(a.yac, a.comp), 2),
    explosiveRate: round(div(a.explosive, a.plays)),
    sackRate: round(div(a.sacks, a.pass)),
    turnovers: a.turnovers,
    thirdDownRate: round(div(a.thirdConv, a.third)),
    redZoneEpa: round(div(a.rzEpa, a.rz)),
    redZoneSuccess: round(div(a.rzSuccess, a.rz)),
  }
}

// Metrics where a lower number is better for an offense (higher for a defense).
const OFF_LOWER_BETTER = new Set(['sackRate', 'turnovers'])
const RANK_KEYS = [
  'epaPerPlay', 'successRate', 'passEpa', 'rushEpa', 'passSuccess', 'rushSuccess', 'earlyDownPassRate',
  'proe', 'cpoe', 'adot', 'yacPerCompletion', 'explosiveRate', 'sackRate', 'thirdDownRate', 'redZoneEpa', 'redZoneSuccess',
]

async function buildJets(team = 'NYJ') {
  const off = new Map()
  const def = new Map()
  const games = new Map()
  const bigPlays = []
  const passers = new Map()
  const receivers = new Map()
  const rushers = new Map()
  const byDown = { off: {}, def: {} }
  const byQuarter = { off: {}, def: {} }
  const get = (m, k, init) => (m.has(k) ? m.get(k) : m.set(k, init()).get(k))

  let weeks = 0
  await streamCsv(`${NFLVERSE}/pbp/play_by_play_${NFL_SEASON}.csv.gz`, (p) => {
    if (p.season_type !== 'REG' && p.season_type !== 'POST') return
    if (p.season_type === 'REG') weeks = Math.max(weeks, num(p.week) ?? 0)
    const isScrimmage = p.play_type === 'pass' || p.play_type === 'run'
    const wpa = num(p.wpa)

    if ((p.posteam === team || p.defteam === team) && wpa !== null && p.desc) {
      const ours = p.posteam === team ? wpa : -wpa
      bigPlays.push({ week: num(p.week), qtr: num(p.qtr), clock: p.time, desc: p.desc, wpa: round(ours), opp: p.posteam === team ? p.defteam : p.posteam })
    }
    if (!isScrimmage || !p.posteam) return
    addPlay(get(off, p.posteam, newAcc), p)
    addPlay(get(def, p.defteam, newAcc), p)

    if (p.posteam !== team && p.defteam !== team) {
      collectPlayers(p, passers, receivers, rushers, get)
      return
    }
    collectPlayers(p, passers, receivers, rushers, get)
    const side = p.posteam === team ? 'off' : 'def'
    const g = get(games, p.game_id, () => ({
      week: num(p.week),
      opp: side === 'off' ? p.defteam : p.posteam,
      home: p.home_team === team,
      off: newAcc(),
      def: newAcc(),
    }))
    addPlay(g[side], p)
    const d = num(p.down)
    if (d) addPlay((byDown[side][d] ??= newAcc()), p)
    const q = Math.min(num(p.qtr) ?? 1, 5)
    addPlay((byQuarter[side][q] ??= newAcc()), p)
  })

  if (!off.size) throw new Error(`no nflverse play-by-play for ${NFL_SEASON} yet`)

  // League tables + ranks.
  const league = [...off.keys()].map((t) => ({ team: t, off: summarize(off.get(t)), def: summarize(def.get(t) ?? newAcc()) }))
  const ranks = { off: {}, def: {} }
  for (const k of RANK_KEYS) {
    const lowOff = OFF_LOWER_BETTER.has(k)
    const ro = rankBy(league.map((l) => l.off), k, lowOff)
    // For a defense, allowing less is better (except sack/turnover rates, where more is better).
    const rd = rankBy(league.map((l) => l.def), k, !lowOff)
    const me = league.find((l) => l.team === team)
    ranks.off[k] = ro(me?.off[k] ?? null)
    ranks.def[k] = rd(me?.def[k] ?? null)
  }

  // Map nflverse player ids → ESPN ids.
  const idMap = new Map()
  await streamCsv(`${NFLVERSE}/players/players.csv`, (r) => {
    if (r.gsis_id && r.espn_id && r.espn_id !== 'NA') idMap.set(r.gsis_id, r.espn_id)
  })

  const players = buildPlayerTables(passers, receivers, rushers, idMap, team)

  return {
    available: true,
    season: NFL_SEASON,
    team,
    teamCount: league.length,
    offense: summarize(off.get(team) ?? newAcc()),
    defense: summarize(def.get(team) ?? newAcc()),
    ranks,
    league: league.map((l) => ({ team: l.team, offEpa: l.off.epaPerPlay, defEpa: l.def.epaPerPlay, offSuccess: l.off.successRate, defSuccess: l.def.successRate })),
    games: [...games.values()]
      .sort((a, b) => a.week - b.week)
      .map((g) => ({ week: g.week, opp: g.opp, home: g.home, off: summarize(g.off), def: summarize(g.def) })),
    byDown: Object.fromEntries(['off', 'def'].map((s) => [s, Object.fromEntries(Object.entries(byDown[s]).map(([k, v]) => [k, summarize(v)]))])),
    byQuarter: Object.fromEntries(['off', 'def'].map((s) => [s, Object.fromEntries(Object.entries(byQuarter[s]).map(([k, v]) => [k, summarize(v)]))])),
    bigPlays: bigPlays.sort((a, b) => Math.abs(b.wpa) - Math.abs(a.wpa)).slice(0, 20),
    players,
    leagueInput: { passers, receivers, rushers, idMap, weeks },
  }
}

function collectPlayers(p, passers, receivers, rushers, get) {
  const epa = num(p.epa)
  if (epa === null) return
  const success = p.success === '1' ? 1 : 0
  const team = p.posteam
  if (p.qb_dropback === '1' && p.passer_player_id && p.passer_player_id !== 'NA') {
    const a = get(passers, p.passer_player_id, () => ({ name: p.passer_player_name, team, db: 0, epa: 0, success: 0, cpoe: 0, cpoeN: 0, att: 0, air: 0, sacks: 0, ints: 0 }))
    a.team = team
    a.db++
    a.epa += epa
    a.success += success
    const c = num(p.cpoe)
    if (c !== null) {
      a.cpoe += c
      a.cpoeN++
    }
    if (p.pass_attempt === '1' && p.sack !== '1') {
      a.att++
      a.air += num(p.air_yards) ?? 0
    }
    if (p.sack === '1') a.sacks++
    if (p.interception === '1') a.ints++
  }
  if (p.receiver_player_id && p.receiver_player_id !== 'NA' && p.pass_attempt === '1') {
    const a = get(receivers, p.receiver_player_id, () => ({ name: p.receiver_player_name, team, tgt: 0, rec: 0, epa: 0, success: 0, air: 0, yac: 0, yds: 0 }))
    a.team = team
    a.tgt++
    a.epa += epa
    a.success += success
    a.air += num(p.air_yards) ?? 0
    if (p.complete_pass === '1') {
      a.rec++
      a.yac += num(p.yards_after_catch) ?? 0
      a.yds += num(p.yards_gained) ?? 0
    }
  }
  if (p.rush_attempt === '1' && p.rusher_player_id && p.rusher_player_id !== 'NA' && p.qb_scramble !== '1') {
    const a = get(rushers, p.rusher_player_id, () => ({ name: p.rusher_player_name, team, car: 0, epa: 0, success: 0, yds: 0, explosive: 0 }))
    a.team = team
    a.car++
    a.epa += epa
    a.success += success
    const y = num(p.yards_gained) ?? 0
    a.yds += y
    if (y >= 10) a.explosive++
  }
}

function buildPlayerTables(passers, receivers, rushers, idMap, team) {
  const qb = [...passers.entries()].map(([id, a]) => ({
    id, espnId: idMap.get(id) ?? null, name: a.name, team: a.team, dropbacks: a.db,
    epaPerDb: round(div(a.epa, a.db)), totalEpa: round(a.epa, 1), successRate: round(div(a.success, a.db)),
    cpoe: round(div(a.cpoe, a.cpoeN), 2), adot: round(div(a.air, a.att), 2), sackRate: round(div(a.sacks, a.db)), ints: a.ints,
  }))
  const wr = [...receivers.entries()].map(([id, a]) => ({
    id, espnId: idMap.get(id) ?? null, name: a.name, team: a.team, targets: a.tgt, receptions: a.rec,
    epaPerTarget: round(div(a.epa, a.tgt)), totalEpa: round(a.epa, 1), successRate: round(div(a.success, a.tgt)),
    catchRate: round(div(a.rec, a.tgt)), adot: round(div(a.air, a.tgt), 2), yacPerRec: round(div(a.yac, a.rec), 2),
    yardsPerTarget: round(div(a.yds, a.tgt), 2), airYards: a.air,
  }))
  const rb = [...rushers.entries()].map(([id, a]) => ({
    id, espnId: idMap.get(id) ?? null, name: a.name, team: a.team, carries: a.car,
    epaPerRush: round(div(a.epa, a.car)), totalEpa: round(a.epa, 1), successRate: round(div(a.success, a.car)),
    ypc: round(div(a.yds, a.car), 2), explosiveRate: round(div(a.explosive, a.car)),
  }))

  // League ranks among qualified players at each role.
  const qualify = (rows, key, min) => rows.filter((r) => r[key] >= min)
  const withRanks = (rows, keys, min, minKey) => {
    const q = qualify(rows, minKey, min)
    const rankers = Object.fromEntries(keys.map(([k, asc]) => [k, rankBy(q, k, asc)]))
    return rows
      .filter((r) => r.team === team)
      .map((r) => ({
        ...r,
        qualified: r[minKey] >= min,
        ranks: r[minKey] >= min ? Object.fromEntries(keys.map(([k]) => [k, rankers[k](r[k])])) : null,
        rankOf: q.length,
      }))
  }
  return {
    passing: withRanks(qb, [['epaPerDb'], ['totalEpa'], ['successRate'], ['cpoe'], ['adot'], ['sackRate', true]], 50, 'dropbacks'),
    receiving: withRanks(wr, [['epaPerTarget'], ['totalEpa'], ['successRate'], ['catchRate'], ['adot'], ['yacPerRec'], ['yardsPerTarget']], 15, 'targets'),
    rushing: withRanks(rb, [['epaPerRush'], ['totalEpa'], ['successRate'], ['ypc'], ['explosiveRate']], 25, 'carries'),
  }
}

// ------------------------------------------------------------------ Blazers / ESPN box scores

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'

async function buildBlazers(teamId = '22') {
  const sched = await getJSON(`${ESPN}/teams/${teamId}/schedule`)
  const current = sched.season.year
  const doneIn = (s) => s.events.filter((e) => e.competitions[0].status.type.completed)

  // Use this season once it has a regular-season game; until then show last season.
  let season = current
  let regular = doneIn(await getJSON(`${ESPN}/teams/${teamId}/schedule?seasontype=2&season=${current}`))
  if (!regular.length) {
    season = current - 1
    regular = doneIn(await getJSON(`${ESPN}/teams/${teamId}/schedule?seasontype=2&season=${season}`))
  }
  let playoffs = []
  try {
    playoffs = doneIn(await getJSON(`${ESPN}/teams/${teamId}/schedule?seasontype=3&season=${season}`))
  } catch {
    // No postseason.
  }
  const events = [...regular.map((e) => ({ e, type: 'regular' })), ...playoffs.map((e) => ({ e, type: 'playoffs' }))]

  const summaries = await pool(events, 6, async ({ e, type }) => {
    try {
      return { type, s: await getJSON(`${ESPN}/summary?event=${e.id}`) }
    } catch (err) {
      console.warn('skip', e.id, err.message)
      return null
    }
  })

  const games = []
  const players = new Map()
  const shots = []
  const oppShots = []
  const clutch = { games: 0, wins: 0, losses: 0, pf: 0, pa: 0 }
  const quarters = { pf: [0, 0, 0, 0], pa: [0, 0, 0, 0], n: 0 }

  for (const item of summaries) {
    if (!item) continue
    const { s, type } = item
    const comp = s.header.competitions[0]
    const us = comp.competitors.find((c) => c.team.id === teamId)
    const them = comp.competitors.find((c) => c.team.id !== teamId)
    const boxUs = s.boxscore?.teams?.find((t) => t.team.id === teamId)
    const boxThem = s.boxscore?.teams?.find((t) => t.team.id !== teamId)
    if (!us || !them || !boxUs || !boxThem) continue
    const pf = Number(us.score)
    const pa = Number(them.score)
    const periods = Math.max(us.linescores?.length ?? 4, 4)
    const minutes = 48 + 5 * (periods - 4)
    const a = line(boxUs, pf)
    const b = line(boxThem, pa)
    const poss = possessions(a, b)

    games.push({
      id: s.header.id,
      date: comp.date,
      type,
      opp: them.team.abbreviation,
      home: us.homeAway === 'home',
      win: pf > pa,
      pf,
      pa,
      poss: round(poss, 1),
      pace: round((48 * poss) / minutes, 1),
      ortg: round((100 * pf) / poss, 1),
      drtg: round((100 * pa) / poss, 1),
      us: factors(a, b),
      opp4: factors(b, a),
    })

    if (type === 'regular') {
      quarters.n++
      for (let q = 0; q < 4; q++) {
        quarters.pf[q] += Number(us.linescores?.[q]?.displayValue ?? 0)
        quarters.pa[q] += Number(them.linescores?.[q]?.displayValue ?? 0)
      }
    }

    // Player season accumulation from the box score.
    const tUs = { min: minutes * 5, fga: a.fga, fta: a.fta, tov: a.tov, fgm: a.fgm, reb: a.reb, oppReb: b.reb, oreb: a.oreb, dreb: a.dreb, oppOreb: b.oreb, oppDreb: b.dreb, poss }
    // Player and shot profiles use regular-season games only.
    const group = type === 'regular' ? s.boxscore.players?.find((p) => p.team.id === teamId)?.statistics?.[0] : undefined
    if (group) {
      const ix = (l) => group.labels.indexOf(l)
      for (const ath of group.athletes) {
        if (ath.didNotPlay || !ath.stats?.length) continue
        const st = ath.stats
        const mins = Number(st[ix('MIN')]) || 0
        if (!mins) continue
        const [fgm, fga] = pair(st[ix('FG')])
        const [tpm, tpa] = pair(st[ix('3PT')])
        const [ftm, fta] = pair(st[ix('FT')])
        const p = players.get(ath.athlete.id) ?? {
          id: ath.athlete.id, name: ath.athlete.displayName, pos: ath.athlete.position?.abbreviation,
          gp: 0, gs: 0, min: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, pm: 0,
          team: { min: 0, fga: 0, fta: 0, tov: 0, fgm: 0, reb: 0, oppReb: 0, oreb: 0, dreb: 0, oppOreb: 0, oppDreb: 0, poss: 0 },
          games: [],
        }
        p.gp++
        if (ath.starter) p.gs++
        p.min += mins
        p.pts += Number(st[ix('PTS')]) || 0
        p.fgm += fgm; p.fga += fga; p.tpm += tpm; p.tpa += tpa; p.ftm += ftm; p.fta += fta
        p.oreb += Number(st[ix('OREB')]) || 0
        p.dreb += Number(st[ix('DREB')]) || 0
        p.reb += Number(st[ix('REB')]) || 0
        p.ast += Number(st[ix('AST')]) || 0
        p.stl += Number(st[ix('STL')]) || 0
        p.blk += Number(st[ix('BLK')]) || 0
        p.tov += Number(st[ix('TO')]) || 0
        p.pf += Number(st[ix('PF')]) || 0
        p.pm += Number(st[ix('+/-')]) || 0
        for (const k of Object.keys(p.team)) p.team[k] += tUs[k]
        const gpts = Number(st[ix('PTS')]) || 0
        p.games.push({ id: s.header.id, ts: round(tsPct(gpts, fga, fta)), pts: gpts, min: mins })
        players.set(ath.athlete.id, p)
      }
    }

    // Shots (field goals only; free throws carry junk coordinates).
    for (const pl of type === 'regular' ? (s.plays ?? []) : []) {
      if (!pl.shootingPlay || !pl.coordinate || (pl.pointsAttempted !== 2 && pl.pointsAttempted !== 3)) continue
      const { x, y } = pl.coordinate
      if (x < -5 || x > 55 || y < -5 || y > 94) continue
      const row = [x, y, pl.scoringPlay ? 1 : 0, pl.pointsAttempted, pl.participants?.[0]?.athlete?.id ?? null]
      if (pl.team?.id === teamId) shots.push(row)
      else oppShots.push(row.slice(0, 4))
    }

    // Clutch: last 5:00 of the 4th/OT with the margin within 5.
    if (type === 'regular') {
      const ourHome = us.homeAway === 'home'
      let wasClutch = false
      let prevHome = 0
      let prevAway = 0
      for (const pl of s.plays ?? []) {
        const period = pl.period?.number ?? 0
        const [mm, ss] = (pl.clock?.displayValue ?? '0:0').split(':').map(Number)
        const left = (mm || 0) + (ss || 0) / 60
        const margin = Math.abs(prevHome - prevAway)
        const inClutch = period >= 4 && left <= 5 && margin <= 5
        if (inClutch) wasClutch = true
        if (pl.scoringPlay && inClutch) {
          const dh = (pl.homeScore ?? prevHome) - prevHome
          const da = (pl.awayScore ?? prevAway) - prevAway
          clutch.pf += ourHome ? dh : da
          clutch.pa += ourHome ? da : dh
        }
        if (pl.homeScore !== undefined) prevHome = pl.homeScore
        if (pl.awayScore !== undefined) prevAway = pl.awayScore
      }
      if (wasClutch) {
        clutch.games++
        if (pf > pa) clutch.wins++
        else clutch.losses++
      }
    }
  }

  games.sort((x, y) => new Date(x.date) - new Date(y.date))
  const reg = games.filter((g) => g.type === 'regular')
  const sum = (k) => reg.reduce((acc, g) => acc + g[k], 0)

  return {
    available: true,
    season,
    seasonLabel: `${season - 1}-${String(season).slice(2)}`,
    isCurrent: season === current,
    games,
    totals: reg.length
      ? {
          gp: reg.length,
          wins: reg.filter((g) => g.win).length,
          pace: round(sum('pace') / reg.length, 1),
          ortg: round((100 * sum('pf')) / sum('poss'), 1),
          drtg: round((100 * sum('pa')) / sum('poss'), 1),
          ppg: round(sum('pf') / reg.length, 1),
          oppg: round(sum('pa') / reg.length, 1),
          us: avgFactors(reg.map((g) => g.us)),
          opp: avgFactors(reg.map((g) => g.opp4)),
          quarters: quarters.n ? { pf: quarters.pf.map((v) => round(v / quarters.n, 1)), pa: quarters.pa.map((v) => round(v / quarters.n, 1)) } : null,
          clutch,
          home: record(reg.filter((g) => g.home)),
          away: record(reg.filter((g) => !g.home)),
        }
      : null,
    players: [...players.values()].map(playerAdvanced).sort((x, y) => y.min - x.min),
    shots,
    oppShots,
  }
}

function record(gs) {
  return { w: gs.filter((g) => g.win).length, l: gs.filter((g) => !g.win).length, net: round(gs.reduce((a, g) => a + g.pf - g.pa, 0) / Math.max(1, gs.length), 1) }
}

function pair(v) {
  const [a, b] = String(v ?? '').split('-').map(Number)
  return [a || 0, b || 0]
}

function stat(t, name) {
  return t.statistics.find((s) => s.name === name)?.displayValue
}

function line(t, pts) {
  const [fgm, fga] = pair(stat(t, 'fieldGoalsMade-fieldGoalsAttempted'))
  const [tpm, tpa] = pair(stat(t, 'threePointFieldGoalsMade-threePointFieldGoalsAttempted'))
  const [ftm, fta] = pair(stat(t, 'freeThrowsMade-freeThrowsAttempted'))
  const n = (k) => Number(stat(t, k)) || 0
  return { pts, fgm, fga, tpm, tpa, ftm, fta, oreb: n('offensiveRebounds'), dreb: n('defensiveRebounds'), reb: n('totalRebounds'), ast: n('assists'), tov: n('totalTurnovers') || n('turnovers') }
}

function possessions(a, b) {
  const one = (t, o) => t.fga + 0.4 * t.fta - 1.07 * (t.oreb / Math.max(1, t.oreb + o.dreb)) * (t.fga - t.fgm) + t.tov
  return 0.5 * (one(a, b) + one(b, a))
}

function tsPct(pts, fga, fta) {
  const d = 2 * (fga + 0.44 * fta)
  return d ? pts / d : null
}

function factors(t, o) {
  const poss = possessions(t, o)
  return {
    efg: round(div(t.fgm + 0.5 * t.tpm, t.fga)),
    tov: round(div(t.tov, poss)),
    orb: round(div(t.oreb, t.oreb + o.dreb)),
    ftr: round(div(t.ftm, t.fga)),
    ts: round(tsPct(t.pts, t.fga, t.fta)),
    threeRate: round(div(t.tpa, t.fga)),
    astRate: round(div(t.ast, t.fgm)),
  }
}

function avgFactors(list) {
  const keys = Object.keys(list[0] ?? {})
  return Object.fromEntries(keys.map((k) => [k, round(list.reduce((a, f) => a + (f[k] ?? 0), 0) / list.length)]))
}

function playerAdvanced(p) {
  const t = p.team
  // Basketball-Reference formulas using team totals from the games the player appeared in.
  const usg = div((p.fga + 0.44 * p.fta + p.tov) * (t.min / 5), p.min * (t.fga + 0.44 * t.fta + t.tov))
  const astPct = div(p.ast, (p.min / (t.min / 5)) * t.fgm - p.fgm)
  const rebPct = div(p.reb * (t.min / 5), p.min * (t.reb + t.oppReb))
  const orebPct = div(p.oreb * (t.min / 5), p.min * (t.oreb + t.oppDreb))
  const drebPct = div(p.dreb * (t.min / 5), p.min * (t.dreb + t.oppOreb))
  const per36 = (v) => round(div(v * 36, p.min), 1)
  return {
    id: p.id, name: p.name, pos: p.pos, gp: p.gp, gs: p.gs, min: round(p.min, 0), mpg: round(div(p.min, p.gp), 1),
    ppg: round(div(p.pts, p.gp), 1), rpg: round(div(p.reb, p.gp), 1), apg: round(div(p.ast, p.gp), 1),
    ts: round(tsPct(p.pts, p.fga, p.fta)), efg: round(div(p.fgm + 0.5 * p.tpm, p.fga)),
    usg: round(usg), astPct: round(astPct), rebPct: round(rebPct), orebPct: round(orebPct), drebPct: round(drebPct),
    tovPct: round(div(p.tov, p.fga + 0.44 * p.fta + p.tov)), astTo: round(div(p.ast, p.tov), 2),
    threeRate: round(div(p.tpa, p.fga)), ftr: round(div(p.fta, p.fga)),
    tpPct: round(div(p.tpm, p.tpa)), ftPct: round(div(p.ftm, p.fta)), fgPct: round(div(p.fgm, p.fga)),
    pts36: per36(p.pts), reb36: per36(p.reb), ast36: per36(p.ast), stl36: per36(p.stl), blk36: per36(p.blk), tov36: per36(p.tov),
    pm: p.pm, pmPerGame: round(div(p.pm, p.gp), 1),
    games: p.games,
  }
}

// ------------------------------------------------------------------ League-wide players (scatter plots)

const ESPN_STATS = 'https://site.web.api.espn.com/apis/common/v3/sports'

/** Every athlete on ESPN's league stats table, flattened to { name: number } per athlete. */
async function espnByAthlete(sport, league, season, sort) {
  const rows = []
  let ret
  for (let page = 1; ; page++) {
    const d = await getJSON(`${ESPN_STATS}/${sport}/${league}/statistics/byathlete?season=${season}&seasontype=2&limit=1000&page=${page}&sort=${sort}:desc`)
    ret = d.requestedSeason
    const names = Object.fromEntries((d.categories ?? []).map((c) => [c.name, c.names]))
    for (const a of d.athletes ?? []) {
      const stats = {}
      for (const c of a.categories) {
        const keys = names[c.name] ?? []
        c.totals?.forEach((v, i) => {
          const n = Number(String(v).replace(/,/g, ''))
          if (keys[i] && Number.isFinite(n)) stats[`${c.name}.${keys[i]}`] = n
        })
      }
      const ath = a.athlete
      rows.push({ id: ath.id, name: ath.displayName, team: ath.teamShortName ?? '', pos: ath.position?.abbreviation ?? '', stats })
    }
    if (page >= (d.pagination?.pages ?? 1)) break
  }
  return { rows, season: ret }
}

async function buildNflLeague(input) {
  if (!input) throw new Error('no play-by-play')
  const { passers, receivers, rushers, idMap, weeks } = input
  // Minimum volume scales with the season so early weeks still have plots.
  const min = { dropbacks: 12 * weeks, targets: 2.5 * weeks, carries: 5 * weeks, tackles: 1.5 * weeks }
  const r3 = (v) => round(v, 3)

  const passing = [...passers.entries()]
    .filter(([, a]) => a.db >= min.dropbacks)
    .map(([id, a]) => ({
      id: idMap.get(id) ?? null, name: a.name, team: a.team, db: a.db,
      epa: r3(div(a.epa, a.db)), totalEpa: round(a.epa, 1), success: r3(div(a.success, a.db)),
      cpoe: round(div(a.cpoe, a.cpoeN), 2), adot: round(div(a.air, a.att), 2), sackRate: r3(div(a.sacks, a.db)), intRate: r3(div(a.ints, a.att)),
    }))
  const receiving = [...receivers.entries()]
    .filter(([, a]) => a.tgt >= min.targets)
    .map(([id, a]) => ({
      id: idMap.get(id) ?? null, name: a.name, team: a.team, tgt: a.tgt, rec: a.rec, yds: a.yds,
      tgtPerGame: round(a.tgt / weeks, 2),
      epa: r3(div(a.epa, a.tgt)), totalEpa: round(a.epa, 1), success: r3(div(a.success, a.tgt)), catchRate: r3(div(a.rec, a.tgt)),
      adot: round(div(a.air, a.tgt), 2), yac: round(div(a.yac, a.rec), 2), ypt: round(div(a.yds, a.tgt), 2),
    }))
  const rushing = [...rushers.entries()]
    .filter(([, a]) => a.car >= min.carries)
    .map(([id, a]) => ({
      id: idMap.get(id) ?? null, name: a.name, team: a.team, car: a.car, yds: a.yds,
      epa: r3(div(a.epa, a.car)), totalEpa: round(a.epa, 1), success: r3(div(a.success, a.car)), ypc: round(div(a.yds, a.car), 2),
      explosive: r3(div(a.explosive, a.car)),
    }))

  const def = await espnByAthlete('football', 'nfl', NFL_SEASON, 'defensive.totalTackles')
  const defense = def.rows
    .map(({ stats: s, ...r }) => ({
      ...r,
      gp: s['general.gamesPlayed'] ?? 0,
      tackles: s['defensive.totalTackles'] ?? 0,
      sacks: s['defensive.sacks'] ?? 0,
      tfl: s['defensive.tacklesForLoss'] ?? 0,
      pd: s['defensive.passesDefended'] ?? 0,
      ints: s['defensiveinterceptions.interceptions'] ?? 0,
      ff: s['general.fumblesForced'] ?? 0,
    }))
    .filter((r) => r.tackles >= min.tackles || r.sacks >= weeks / 3 || r.pd >= weeks / 2)

  return { available: true, season: NFL_SEASON, weeks, min, passing, receiving, rushing, defense }
}

async function buildNbaLeague() {
  const sched = await getJSON(`${ESPN}/scoreboard`)
  const current = sched.leagues?.[0]?.season?.year ?? now.getFullYear() + (now.getMonth() >= 8 ? 1 : 0)
  // ESPN answers with last season until this one has games; label whatever it returned.
  const { rows, season } = await espnByAthlete('basketball', 'nba', current, 'offensive.avgPoints')
  const maxGp = Math.max(1, ...rows.map((r) => r.stats['general.gamesPlayed'] ?? 0))
  const players = rows
    .map(({ stats: s, ...r }) => {
      const gp = s['general.gamesPlayed'] ?? 0
      const min = s['general.minutes'] ?? 0
      const pts = s['offensive.points'] ?? 0
      const fga = s['offensive.fieldGoalsAttempted'] ?? 0
      const fgm = s['offensive.fieldGoalsMade'] ?? 0
      const tpa = s['offensive.threePointFieldGoalsAttempted'] ?? 0
      const tpm = s['offensive.threePointFieldGoalsMade'] ?? 0
      const fta = s['offensive.freeThrowsAttempted'] ?? 0
      const ast = s['offensive.assists'] ?? 0
      const tov = s['offensive.turnovers'] ?? 0
      const reb = s['general.rebounds'] ?? 0
      const stl = s['defensive.steals'] ?? 0
      const blk = s['defensive.blocks'] ?? 0
      const per36 = (v) => round(div(v * 36, min), 1)
      return {
        ...r, gp, mpg: round(div(min, gp), 1),
        ppg: round(div(pts, gp), 1), rpg: round(div(reb, gp), 1), apg: round(div(ast, gp), 1),
        spg: round(div(stl, gp), 1), bpg: round(div(blk, gp), 1), tpg: round(div(tov, gp), 1),
        tpaPg: round(div(tpa, gp), 1), fgaPg: round(div(fga, gp), 1),
        ts: round(div(pts, 2 * (fga + 0.44 * fta))), efg: round(div(fgm + 0.5 * tpm, fga)),
        fgPct: round(div(fgm, fga)), tpPct: round(div(tpm, tpa)), ftPct: round(s['offensive.freeThrowPct'] / 100),
        tpaRate: round(div(tpa, fga)), ftr: round(div(fta, fga)), astTo: round(div(ast, tov), 2),
        pts36: per36(pts), reb36: per36(reb), ast36: per36(ast), stl36: per36(stl), blk36: per36(blk), fga36: per36(fga),
      }
    })
    .filter((r) => r.gp >= Math.max(1, 0.3 * maxGp) && (r.mpg ?? 0) >= 12)
  return {
    available: true,
    season: season?.year ?? current,
    seasonLabel: season?.displayName ?? String(current),
    isCurrent: (season?.year ?? current) === current,
    minGames: Math.ceil(Math.max(1, 0.3 * maxGp)),
    players,
  }
}

// ------------------------------------------------------------------ NFL draft order inputs

// nflverse / Wikipedia team names → ESPN abbreviations.
const NFLVERSE_ABBR = { LA: 'LAR', WAS: 'WSH' }
const WIKI_TEAMS = {
  Arizona: 'ARI', Atlanta: 'ATL', Baltimore: 'BAL', Buffalo: 'BUF', Carolina: 'CAR', Chicago: 'CHI',
  Cincinnati: 'CIN', Cleveland: 'CLE', Dallas: 'DAL', Denver: 'DEN', Detroit: 'DET', 'Green Bay': 'GB',
  Houston: 'HOU', Indianapolis: 'IND', Jacksonville: 'JAX', 'Kansas City': 'KC', 'Las Vegas': 'LV',
  'LA Chargers': 'LAC', 'LA Rams': 'LAR', Miami: 'MIA', Minnesota: 'MIN', 'New England': 'NE',
  'New Orleans': 'NO', 'NY Giants': 'NYG', 'NY Jets': 'NYJ', Philadelphia: 'PHI', Pittsburgh: 'PIT',
  'San Francisco': 'SF', Seattle: 'SEA', 'Tampa Bay': 'TB', Tennessee: 'TEN', Washington: 'WSH',
}
const SNAPSHOT = new URL('./draft-trades-snapshot.json', import.meta.url)

async function buildDraft() {
  const draftYear = NFL_SEASON + 1
  // Full regular-season schedule → each team's 17 opponents (for strength of schedule).
  const opponents = {}
  const ab = (a) => NFLVERSE_ABBR[a] ?? a
  await streamCsv('https://github.com/nflverse/nfldata/raw/master/data/games.csv', (r) => {
    if (Number(r.season) !== NFL_SEASON || r.game_type !== 'REG') return
    const [away, home] = [ab(r.away_team), ab(r.home_team)]
    ;(opponents[away] ??= []).push(home)
    ;(opponents[home] ??= []).push(away)
  })
  if (Object.keys(opponents).length !== 32) throw new Error(`schedule for ${NFL_SEASON} incomplete`)

  let trades
  let tradesSource = 'wikipedia'
  try {
    trades = await fetchDraftTrades(draftYear)
    await writeFile(SNAPSHOT, JSON.stringify({ draftYear, trades }, null, 1) + '\n')
  } catch (e) {
    console.warn('draft trades: falling back to snapshot –', e.message)
    const snap = JSON.parse(await readFile(SNAPSHOT, 'utf8'))
    trades = snap.draftYear === draftYear ? snap.trades : []
    tradesSource = 'snapshot'
  }
  return { available: true, season: NFL_SEASON, draftYear, opponents, trades, tradesSource }
}

/**
 * Parse "Trades involving draft picks" from Wikipedia's `{year} NFL draft`
 * page. Each top-level entry is headed `Original → … → Owner (PD).` in bold.
 */
async function fetchDraftTrades(year) {
  const res = await fetch(`https://en.wikipedia.org/w/index.php?title=${year}_NFL_draft&action=raw`, { headers: UA })
  if (!res.ok) throw new Error(`${res.status} wikipedia`)
  const text = await res.text()
  const start = text.indexOf('==Trades involving draft picks==')
  if (start < 0) throw new Error('no trades section')
  const end = text.slice(start + 10).search(/\n==[^=]/)
  const section = end < 0 ? text.slice(start) : text.slice(start, start + 10 + end)
  const trades = []
  let roundNo = 0
  for (const line of section.split('\n')) {
    const r = line.match(/^===\s*Round (\d)\s*===/)
    if (r) roundNo = Number(r[1])
    if (!roundNo || !line.startsWith('*')) continue
    const head = line.replace(/\{\{Anchor\|[^}]*\}\}/gi, '').match(/'''([^']+)'''/)
    if (!head) continue
    const names = head[1]
      .replace(/\((PD|D)\)/g, '')
      .split('→')
      .map((s) => s.trim().replace(/\.$/, '').trim())
    const abbrs = names.map((n) => WIKI_TEAMS[n])
    if (abbrs.length < 2 || abbrs.some((a) => !a)) continue
    const body = line.slice(line.indexOf("'''", line.indexOf(head[1])) + 3)
    trades.push({
      round: roundNo,
      from: abbrs[0],
      to: abbrs[abbrs.length - 1],
      via: abbrs.slice(1, -1),
      conditional: /conditional/i.test(body.split('in exchange')[0]),
      earlierOf: /whichever is (earlier|higher|better)/i.test(body),
    })
  }
  if (trades.length < 5) throw new Error(`only ${trades.length} trades parsed`)
  return trades
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
