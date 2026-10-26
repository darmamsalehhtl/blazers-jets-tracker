// Builds season-analytics JSON into public/data/ (run in CI before `vite build`).
//
//   nyj.json – Jets advanced stats from nflverse play-by-play (EPA, success
//              rate, CPOE, PROE, …) with league ranks, plus per-player rates.
//   por.json – Blazers season analytics from every ESPN box score + play-by-play
//              (pace, ratings, four factors, usage, clutch, season shot chart).
//   nfl-league.json / nba-league.json – every qualified player in the league
//              (efficiency + volume) for the "vs League" scatter plots.
//   mvp.json – "if the season ended today" NFL and NBA MVP races (top 10 each,
//              plus where the best Jets/Blazers player ranks). NFL from nflverse
//              play-by-play + schedule, NBA from ESPN stats + standings; each
//              league fails on its own. Weights: MVP_WEIGHTS.
//   players-nfl.json / players-nba.json – every player on a current roster
//              (ESPN, all teams) for the team-page search, each with their MVP
//              standing (rank of N, score, gap) or the reason they aren't ranked.
//              Built from the same MVP run as mvp.json, so ranks always agree.
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
  // The MVP ranking is computed once and shared by mvp.json and the player search index.
  let mvpRun
  const mvpOnce = () => (mvpRun ??= buildMvp(async () => (await once()).leagueInput))
  const builders = {
    nyj: async () => {
      const { leagueInput, ...body } = await once()
      return body
    },
    por: buildBlazers,
    'nfl-league': async () => buildNflLeague((await once()).leagueInput),
    'nba-league': buildNbaLeague,
    mvp: async () => (await mvpOnce()).json,
    'players-nfl': async () => buildPlayerIndex('nfl', await mvpOnce()),
    'players-nba': async () => buildPlayerIndex('nba', await mvpOnce()),
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
  // Regular-season box-score totals per player for the MVP race (gsis id → totals).
  const mvpStats = new Map()
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
    // Kneel-downs count as (negative) rushes in official stats.
    if (p.season_type === 'REG' && p.posteam && (isScrimmage || p.play_type === 'qb_kneel')) collectMvpStats(p, mvpStats, get)
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
  const positions = new Map()
  const fullNames = new Map()
  await streamCsv(`${NFLVERSE}/players/players.csv`, (r) => {
    if (r.gsis_id && r.espn_id && r.espn_id !== 'NA') idMap.set(r.gsis_id, r.espn_id)
    if (r.gsis_id && r.position && r.position !== 'NA') positions.set(r.gsis_id, r.position)
    if (r.gsis_id && r.display_name && r.display_name !== 'NA') fullNames.set(r.gsis_id, r.display_name)
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
    leagueInput: { passers, receivers, rushers, idMap, weeks, mvpStats, positions, fullNames },
  }
}

/** Official-style box score totals (yards, TDs, turnovers, games) from one scrimmage play. */
function collectMvpStats(p, stats, get) {
  if (p.two_point_attempt === '1') return
  const one = (id) => {
    const s = get(stats, id, () => ({
      team: p.posteam, passYds: 0, passTd: 0, ints: 0, rushYds: 0, rushTd: 0, recYds: 0, recTd: 0, fumLost: 0, games: new Set(),
    }))
    s.team = p.posteam
    s.games.add(p.game_id)
    return s
  }
  const has = (id) => id && id !== 'NA'
  if (has(p.passer_player_id) && p.pass_attempt === '1') {
    const s = one(p.passer_player_id)
    s.passYds += num(p.passing_yards) ?? 0
    if (p.pass_touchdown === '1') s.passTd++
    if (p.interception === '1') s.ints++
  }
  if (has(p.receiver_player_id) && p.pass_attempt === '1') {
    const s = one(p.receiver_player_id)
    s.recYds += num(p.receiving_yards) ?? 0
    if (p.pass_touchdown === '1') s.recTd++
  }
  // Includes QB scrambles, like the official rushing stats.
  if (has(p.rusher_player_id) && p.rush_attempt === '1') {
    const s = one(p.rusher_player_id)
    s.rushYds += num(p.rushing_yards) ?? 0
    if (p.rush_touchdown === '1') s.rushTd++
  }
  if (p.fumble_lost === '1' && has(p.fumbled_1_player_id) && p.fumbled_1_team === p.posteam) one(p.fumbled_1_player_id).fumLost++
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

/** Team abbreviation → primary colour, for the rings around league players' faces. */
async function teamColors(sport, league) {
  const d = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams`)
  const teams = d.sports?.[0]?.leagues?.[0]?.teams ?? []
  return Object.fromEntries(teams.filter((x) => x.team.color).map(({ team }) => [team.abbreviation, `#${team.color}`]))
}

async function buildNflLeague(input) {
  if (!input) throw new Error('no play-by-play')
  const { passers, receivers, rushers, idMap, weeks } = input
  // Minimum volume scales with the season so early weeks still have plots.
  const min = { dropbacks: 12 * weeks, targets: 2.5 * weeks, carries: 5 * weeks, tackles: 1.5 * weeks }
  const r3 = (v) => round(v, 3)
  const espnAbbr = (a) => NFLVERSE_ABBR[a] ?? a

  const passing = [...passers.entries()]
    .filter(([, a]) => a.db >= min.dropbacks)
    .map(([id, a]) => ({
      id: idMap.get(id) ?? null, name: a.name, team: espnAbbr(a.team), db: a.db,
      epa: r3(div(a.epa, a.db)), totalEpa: round(a.epa, 1), success: r3(div(a.success, a.db)),
      cpoe: round(div(a.cpoe, a.cpoeN), 2), adot: round(div(a.air, a.att), 2), sackRate: r3(div(a.sacks, a.db)), intRate: r3(div(a.ints, a.att)),
    }))
  const receiving = [...receivers.entries()]
    .filter(([, a]) => a.tgt >= min.targets)
    .map(([id, a]) => ({
      id: idMap.get(id) ?? null, name: a.name, team: espnAbbr(a.team), tgt: a.tgt, rec: a.rec, yds: a.yds,
      tgtPerGame: round(a.tgt / weeks, 2),
      epa: r3(div(a.epa, a.tgt)), totalEpa: round(a.epa, 1), success: r3(div(a.success, a.tgt)), catchRate: r3(div(a.rec, a.tgt)),
      adot: round(div(a.air, a.tgt), 2), yac: round(div(a.yac, a.rec), 2), ypt: round(div(a.yds, a.tgt), 2),
    }))
  const rushing = [...rushers.entries()]
    .filter(([, a]) => a.car >= min.carries)
    .map(([id, a]) => ({
      id: idMap.get(id) ?? null, name: a.name, team: espnAbbr(a.team), car: a.car, yds: a.yds,
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

  const colors = await teamColors('football', 'nfl')
  return { available: true, season: NFL_SEASON, weeks, min, colors, passing, receiving, rushing, defense }
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
    colors: await teamColors('basketball', 'nba'),
    players,
  }
}

// ------------------------------------------------------------------ MVP race

// Weights live here so they're easy to tune. Each input is z-scored against the
// candidate pool; display score = 50 + 15 × weighted sum (clamped 0–100).
// Backtest (Oct 2026):
//   NFL 2025: Stafford (MVP) 1st, Maye 2nd, Allen 3rd; McCaffrey (finalist) 12th.
//   NFL 2024: Jackson, Goff, Allen (MVP) top 3; Barkley's 2,005-yard season 5th (3rd in the vote).
//     nonQb −0.8 put 4 non-QBs in the 2024 top 10, −1.2 left Barkley 10th.
//   NBA 2025-26: Gilgeous-Alexander (MVP) 1st, Jokic 2nd. Wembanyama (64 games, finalist via an
//     exception) is excluded by the 65-game rule, which can't see the league's exceptions.
const MVP_WEIGHTS = {
  nfl: { epa: 0.5, prod: 0.2, win: 0.3, nonQb: -1.0 },
  nba: { prod: 0.55, eff: 0.2, win: 0.25 },
}
const MVP_TOP = 10

/** Each league builds on its own; a failure becomes { available: false, error } for that league only. */
/**
 * Returns `json` (written as mvp.json) and `extra`: per league the full standings
 * and per-player volumes the player search index needs, or the league's error.
 */
async function buildMvp(nflInput) {
  const [nfl, nba] = await Promise.allSettled([buildMvpNfl(await nflInput().catch(() => null)), buildMvpNba()])
  const wrap = (r) => {
    if (r.status !== 'fulfilled') return { available: false, error: String(r.reason?.message ?? r.reason) }
    const { extra, ...league } = r.value
    return league
  }
  const extra = (r) => (r.status === 'fulfilled' ? r.value.extra : { error: String(r.reason?.message ?? r.reason) })
  return { json: { available: true, nfl: wrap(nfl), nba: wrap(nba) }, extra: { nfl: extra(nfl), nba: extra(nba) } }
}

/** Rank, score, gap (and 65-game risk) for one ranked player. */
const standingOf = (c, n) => ({ rank: c.rank, of: n, score: c.score, gap: c.gap, ...(c.atRisk ? { atRisk: true } : {}) })

function zScorer(values) {
  const v = values.filter((x) => Number.isFinite(x))
  const mean = v.reduce((a, b) => a + b, 0) / (v.length || 1)
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length || 1)) || 1
  return (x) => (Number.isFinite(x) ? (x - mean) / sd : 0)
}

/**
 * Weighted z-scores → display score, ranks, gap to leader, top factor.
 * Inputs listed in `grouped` are z-scored within each player's `groupOf` group
 * (e.g. position) instead of across the whole pool.
 */
function rankMvp(pool, inputs, weights, { extra = () => 0, groupOf = () => 'all', grouped = [] } = {}) {
  const scorers = {}
  for (const k of Object.keys(inputs)) {
    if (!grouped.includes(k)) {
      const z = zScorer(pool.map(inputs[k]))
      scorers[k] = (c) => z(inputs[k](c))
      continue
    }
    const byGroup = new Map()
    for (const g of new Set(pool.map(groupOf))) byGroup.set(g, zScorer(pool.filter((c) => groupOf(c) === g).map(inputs[k])))
    scorers[k] = (c) => byGroup.get(groupOf(c))(inputs[k](c))
  }
  for (const c of pool) {
    const parts = Object.fromEntries(Object.keys(inputs).map((k) => [k, weights[k] * scorers[k](c)]))
    const composite = Object.values(parts).reduce((a, b) => a + b, 0) + extra(c)
    c.score = Math.round(Math.max(0, Math.min(100, 50 + 15 * composite)) * 10) / 10
    c.top = Object.entries(parts).sort((a, b) => b[1] - a[1])[0]
  }
  pool.sort((a, b) => b.score - a.score)
  pool.forEach((c, i) => {
    c.rank = i + 1
    c.gap = Math.round((pool[0].score - c.score) * 10) / 10
  })
  return pool
}

function oursSummary(ranked, team) {
  const best = ranked.find((c) => c.team === team)
  if (!best) return { none: true }
  return { rank: best.rank, inTop: best.rank <= MVP_TOP, candidate: best.rank <= MVP_TOP ? undefined : best }
}

const recText = (r) => (r ? `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}` : '')

async function buildMvpNfl(input) {
  if (!input) throw new Error('no NFL play-by-play')
  const { passers, receivers, rushers, idMap, weeks, mvpStats, positions, fullNames } = input
  const records = await nflRecords()
  const winPct = (team) => {
    const r = records[team]
    const g = r ? r.w + r.l + r.t : 0
    return g ? (r.w + r.t / 2) / g : 0.5
  }
  const espnAbbr = (a) => NFLVERSE_ABBR[a] ?? a
  const SKILL = new Set(['RB', 'FB', 'WR', 'TE'])

  const pool = []
  for (const [id, s] of mvpStats) {
    const pos = positions.get(id) ?? ''
    const qb = pos === 'QB'
    const pass = passers.get(id)
    const rush = rushers.get(id)
    const rec = receivers.get(id)
    if (qb) {
      if (!pass || pass.db < 12 * weeks) continue
    } else {
      if (!SKILL.has(pos)) continue
      if ((rush?.car ?? 0) + (rec?.tgt ?? 0) < 8 * weeks) continue
    }
    const team = espnAbbr(s.team)
    const epa = qb ? (pass?.epa ?? 0) + (rush?.epa ?? 0) : (rec?.epa ?? 0) + (rush?.epa ?? 0)
    const yds = s.passYds + s.rushYds + s.recYds
    const td = s.passTd + s.rushTd + s.recTd
    const to = s.ints + s.fumLost
    pool.push({
      id: idMap.get(id) ?? null,
      name: fullNames.get(id) ?? pass?.name ?? rush?.name ?? rec?.name ?? id,
      team,
      pos,
      qb,
      record: recText(records[team]),
      win: winPct(team),
      epa: round(epa, 1),
      prod: yds + 20 * td - 45 * to,
      stats: {
        games: s.games.size, passYds: s.passYds, passTd: s.passTd, ints: s.ints,
        rushYds: s.rushYds, rushTd: s.rushTd, recYds: s.recYds, recTd: s.recTd, fumLost: s.fumLost,
        rec: rec?.rec ?? 0, car: rush?.car ?? 0,
      },
    })
  }
  if (!pool.length) throw new Error('no qualified NFL candidates yet')
  const w = MVP_WEIGHTS.nfl
  // EPA and production are compared within position (QB, RB, WR/TE): receivers pile up far
  // more raw EPA than backs, so a shared pool buries even a 2,000-yard rushing season.
  const group = (c) => (c.qb ? 'QB' : c.pos === 'RB' || c.pos === 'FB' ? 'RB' : 'REC')
  const ranked = rankMvp(pool, { epa: (c) => c.epa, prod: (c) => c.prod, win: (c) => c.win }, w, {
    extra: (c) => (c.qb ? 0 : w.nonQb),
    groupOf: group,
    grouped: ['epa', 'prod'],
  })
  const epaLeader = Math.max(...pool.map((c) => c.epa))
  const out = ranked.map(({ qb: _qb, prod: _prod, top, ...c }) => ({
    ...c,
    win: round(c.win),
    reason:
      top[1] <= 0
        ? 'Balanced season'
        : top[0] === 'win'
          ? `Team record (${c.record})`
          : top[0] === 'epa'
            ? c.epa === epaLeader
              ? `Leads the league in EPA (${c.epa > 0 ? '+' : ''}${c.epa})`
              : `Elite efficiency (${c.epa > 0 ? '+' : ''}${c.epa} EPA)`
            : `Huge production (${(c.stats.passYds + c.stats.rushYds + c.stats.recYds).toLocaleString('en-US')} yds, ${c.stats.passTd + c.stats.rushTd + c.stats.recTd} TD)`,
  }))
  return {
    available: true,
    season: NFL_SEASON,
    through: `Week ${weeks}`,
    smallSample: weeks < 4,
    poolSize: out.length,
    min: { dropbacks: 12 * weeks, touches: 8 * weeks },
    candidates: out.slice(0, MVP_TOP),
    ours: oursSummary(out, 'NYJ'),
    extra: {
      min: { dropbacks: 12 * weeks, touches: 8 * weeks },
      // Ranked players by ESPN id, plus by "name|team" for those nflverse couldn't map.
      standings: new Map(out.filter((c) => c.id).map((c) => [c.id, standingOf(c, out.length)])),
      byName: new Map(out.map((c) => [`${normName(c.name)}|${c.team}`, standingOf(c, out.length)])),
      volumes: nflVolumes(input),
    },
  }
}

/** Dropbacks, touches and games for every player with offensive plays, by ESPN id and by "name|team". */
function nflVolumes({ passers, rushers, receivers, mvpStats, idMap, fullNames }) {
  const byId = new Map()
  const byName = new Map()
  for (const [id, s] of mvpStats) {
    const v = { dropbacks: passers.get(id)?.db ?? 0, touches: (rushers.get(id)?.car ?? 0) + (receivers.get(id)?.tgt ?? 0), games: s.games.size }
    const espn = idMap.get(id)
    if (espn) byId.set(espn, v)
    if (fullNames.get(id)) byName.set(`${normName(fullNames.get(id))}|${NFLVERSE_ABBR[s.team] ?? s.team}`, v)
  }
  return { byId, byName }
}

/** Lowercase, accents and punctuation stripped: "Ja'Marr Chase Jr." → "jamarr chase jr". */
function normName(n) {
  return n
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.'’-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function buildMvpNba() {
  const sb = await getJSON(`${ESPN}/scoreboard`)
  const current = sb.leagues?.[0]?.season?.year
  const { rows, season } = await espnByAthlete('basketball', 'nba', current, 'offensive.avgPoints')
  if (!season || season.year !== current) throw new Error('the NBA regular season has no games yet')

  // Team records from the standings.
  const st = await getJSON(`https://site.api.espn.com/apis/v2/sports/basketball/nba/standings`)
  const records = {}
  const walk = (n) => {
    for (const e of n.standings?.entries ?? []) {
      const v = (type) => Number(e.stats.find((s) => s.type === type)?.value ?? 0)
      records[e.team.abbreviation] = { w: v('wins'), l: v('losses'), t: 0 }
    }
    n.children?.forEach(walk)
  }
  walk(st)

  const tot = (s, k) => s[k] ?? 0
  let lgPts = 0
  let lgTsa = 0
  for (const { stats: s } of rows) {
    lgPts += tot(s, 'offensive.points')
    lgTsa += tot(s, 'offensive.fieldGoalsAttempted') + 0.44 * tot(s, 'offensive.freeThrowsAttempted')
  }
  const lgTs = lgPts / (2 * lgTsa)

  const pool = []
  for (const { stats: s, ...r } of rows) {
    const gp = tot(s, 'general.gamesPlayed')
    const rec = records[r.team]
    if (!gp || !rec) continue
    const mpg = tot(s, 'general.minutes') / gp
    if (mpg < 25) continue
    const teamGames = rec.w + rec.l
    // 65-game rule, pro-rated: out once 18+ team games are missed, "at risk" when below pace.
    if (teamGames - gp > 17) continue
    const pts = tot(s, 'offensive.points')
    const fgm = tot(s, 'offensive.fieldGoalsMade')
    const fga = tot(s, 'offensive.fieldGoalsAttempted')
    const ftm = tot(s, 'offensive.freeThrowsMade')
    const fta = tot(s, 'offensive.freeThrowsAttempted')
    const reb = tot(s, 'general.rebounds')
    const ast = tot(s, 'offensive.assists')
    const stl = tot(s, 'defensive.steals')
    const blk = tot(s, 'defensive.blocks')
    const tov = tot(s, 'offensive.turnovers')
    const pf = tot(s, 'general.fouls')
    const tsa = fga + 0.44 * fta
    const ts = tsa ? pts / (2 * tsa) : 0
    pool.push({
      id: r.id,
      name: r.name,
      team: r.team,
      pos: r.pos,
      record: recText(rec),
      win: teamGames ? rec.w / teamGames : 0.5,
      atRisk: gp / Math.max(1, teamGames) < 65 / 82,
      gameScore: (pts + 0.4 * fgm - 0.7 * fga - 0.4 * (fta - ftm) + 0.35 * reb + stl + 0.7 * ast + 0.7 * blk - 0.4 * pf - tov) / gp,
      eff: (2 * (ts - lgTs) * tsa) / gp,
      stats: {
        games: gp, teamGames, mpg: round(mpg, 1),
        ppg: round(pts / gp, 1), rpg: round(reb / gp, 1), apg: round(ast / gp, 1), spg: round(stl / gp, 1), bpg: round(blk / gp, 1),
        ts: round(ts),
      },
    })
  }
  if (!pool.length) throw new Error('no qualified NBA candidates yet')
  const ranked = rankMvp(pool, { prod: (c) => c.gameScore, eff: (c) => c.eff, win: (c) => c.win }, MVP_WEIGHTS.nba)
  const effLeader = Math.max(...pool.map((c) => c.eff))
  const out = ranked.map(({ top, gameScore, eff, ...c }) => ({
    ...c,
    win: round(c.win),
    gameScore: round(gameScore, 1),
    reason:
      top[1] <= 0
        ? 'Balanced season'
        : top[0] === 'win'
          ? `Team record (${c.record})`
          : top[0] === 'eff'
            ? `${eff === effLeader ? 'Most efficient scorer' : 'Efficient scorer'} (${(c.stats.ts * 100).toFixed(1)}% TS)`
            : `Elite production (${c.stats.ppg} / ${c.stats.rpg} / ${c.stats.apg})`,
  }))
  const teamGames = Object.values(records).map((r) => r.w + r.l).sort((a, b) => a - b)
  const medianGames = teamGames[teamGames.length >> 1] ?? 0
  return {
    available: true,
    season: season.year,
    seasonLabel: season.displayName,
    through: `${medianGames} games`,
    smallSample: medianGames < 10,
    poolSize: out.length,
    lgTs: round(lgTs),
    candidates: out.slice(0, MVP_TOP),
    ours: oursSummary(out, 'POR'),
    extra: {
      standings: new Map(out.map((c) => [c.id, standingOf(c, out.length)])),
      // Every player with stats this season (not only the pool), for not-ranked reasons.
      volumes: new Map(
        rows.map(({ id, team, stats: s }) => {
          const gp = s['general.gamesPlayed'] ?? 0
          const rec = records[team]
          return [id, { gp, teamGames: rec ? rec.w + rec.l : 0, mpg: gp ? round((s['general.minutes'] ?? 0) / gp, 1) : 0 }]
        }),
      ),
    },
  }
}

// ------------------------------------------------------------------ Player search index

/**
 * Every player on a current roster of every team in the league. Failed teams are
 * retried once (getJSON already retries 5xx) and reported in `missingTeams`.
 */
async function leagueRosters(sport, league) {
  const d = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams`)
  const teams = (d.sports?.[0]?.leagues?.[0]?.teams ?? []).map((x) => x.team)
  const missingTeams = []
  const lists = await pool(teams, 8, async (team) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams/${team.id}/roster`)
        // NFL groups athletes by unit ({ position, items }), NBA lists them flat.
        const flat = (r.athletes ?? []).flatMap((a) => (Array.isArray(a.items) ? a.items : [a]))
        return flat.map((a) => ({ id: a.id, name: a.displayName ?? a.fullName, pos: a.position?.abbreviation ?? '', team: team.abbreviation }))
      } catch {
        // retry once below
      }
    }
    missingTeams.push(team.abbreviation)
    return []
  })
  const seen = new Set()
  const players = lists.flat().filter((p) => p.id && p.name && !seen.has(p.id) && seen.add(p.id))
  if (!players.length) throw new Error(`no ${league.toUpperCase()} rosters`)
  return { players, teamCount: teams.length, missingTeams }
}

const MVP_POSITIONS_NFL = new Set(['QB', 'RB', 'FB', 'WR', 'TE'])

/** Why a current player isn't in the MVP pool, in plain words (design decision 3). */
function notRankedReason(league, p, extra) {
  if (league === 'nfl') {
    if (!MVP_POSITIONS_NFL.has(p.pos)) return "Defenders, linemen and specialists aren't ranked"
    const v = extra.volumes.byId.get(p.id) ?? extra.volumes.byName.get(`${normName(p.name)}|${p.team}`)
    if (!v || !v.games) return 'No games this season'
    if (p.pos === 'QB' && v.dropbacks < extra.min.dropbacks) return `Not enough dropbacks yet (${v.dropbacks} of ${extra.min.dropbacks})`
    if (p.pos !== 'QB' && v.touches < extra.min.touches) return `Not enough touches yet (${v.touches} of ${extra.min.touches})`
    return 'Not in the MVP pool'
  }
  const v = extra.volumes.get(p.id)
  if (!v || !v.gp) return 'No games this season'
  if (v.teamGames - v.gp > 17) return "Can't reach 65 games anymore"
  if (v.mpg < 25) return `Fewer than 25 minutes per game (${v.mpg.toFixed(1)})`
  return 'Not in the MVP pool'
}

/** players-nfl.json / players-nba.json: every rostered player with their MVP standing or the reason they have none. */
async function buildPlayerIndex(league, mvp) {
  const { players, teamCount, missingTeams } = await leagueRosters(league === 'nfl' ? 'football' : 'basketball', league)
  const extra = mvp.extra[league]
  const json = mvp.json[league]
  const rows = players.map((p) => {
    let standing
    if (extra.error) standing = { reason: 'MVP data unavailable' }
    else {
      standing = extra.standings.get(p.id) ?? (league === 'nfl' ? extra.byName.get(`${normName(p.name)}|${p.team}`) : undefined)
      standing ??= { reason: notRankedReason(league, p, extra) }
    }
    return { id: p.id, name: p.name, pos: p.pos, team: p.team, mvp: standing }
  })
  const ranked = rows.filter((r) => r.mvp.rank)
  if (!extra.error) {
    const missing = json.poolSize - ranked.length
    if (missing) console.warn(`players-${league}: ${missing} ranked MVP candidates not found on any roster`)
  }
  return {
    available: true,
    league,
    season: json.available ? json.season : undefined,
    teamCount,
    missingTeams,
    ranked: extra.error ? 0 : json.poolSize,
    leader: json.available ? json.candidates[0]?.name : undefined,
    mvpError: extra.error,
    players: rows,
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

/** This season's regular-season games (ESPN abbreviations), read once and shared. */
let scheduleOnce
function nflSchedule() {
  scheduleOnce ??= (async () => {
    const games = []
    const ab = (a) => NFLVERSE_ABBR[a] ?? a
    await streamCsv('https://github.com/nflverse/nfldata/raw/master/data/games.csv', (r) => {
      if (Number(r.season) !== NFL_SEASON || r.game_type !== 'REG') return
      games.push({ week: num(r.week), away: ab(r.away_team), home: ab(r.home_team), awayScore: num(r.away_score), homeScore: num(r.home_score) })
    })
    return games
  })()
  return scheduleOnce
}

/** Win/loss/tie record per team from finished regular-season games. */
async function nflRecords() {
  const rec = {}
  for (const g of await nflSchedule()) {
    if (g.awayScore === null || g.homeScore === null) continue
    for (const [team, us, them] of [[g.away, g.awayScore, g.homeScore], [g.home, g.homeScore, g.awayScore]]) {
      const r = (rec[team] ??= { w: 0, l: 0, t: 0 })
      if (us > them) r.w++
      else if (us < them) r.l++
      else r.t++
    }
  }
  return rec
}

async function buildDraft() {
  const draftYear = NFL_SEASON + 1
  // Full regular-season schedule → each team's 17 opponents (for strength of schedule).
  const opponents = {}
  for (const g of await nflSchedule()) {
    ;(opponents[g.away] ??= []).push(g.home)
    ;(opponents[g.home] ??= []).push(g.away)
  }
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
