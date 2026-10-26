// Season analytics generated at build time by scripts/build-data.mjs.

import { useEffect, useState } from 'react'
import type { TeamKey } from './teams'

export interface NflSummary {
  plays: number
  epaPerPlay: number | null
  successRate: number | null
  passEpa: number | null
  rushEpa: number | null
  passSuccess: number | null
  rushSuccess: number | null
  passRate: number | null
  earlyDownPassRate: number | null
  proe: number | null
  cpoe: number | null
  adot: number | null
  yacPerCompletion: number | null
  explosiveRate: number | null
  sackRate: number | null
  turnovers: number
  thirdDownRate: number | null
  redZoneEpa: number | null
  redZoneSuccess: number | null
}

type Ranked<T> = T & { qualified: boolean; ranks: Record<string, number | null> | null; rankOf: number }

export interface NflPasser {
  id: string
  espnId: string | null
  name: string
  dropbacks: number
  epaPerDb: number | null
  totalEpa: number | null
  successRate: number | null
  cpoe: number | null
  adot: number | null
  sackRate: number | null
  ints: number
}
export interface NflReceiver {
  id: string
  espnId: string | null
  name: string
  targets: number
  receptions: number
  epaPerTarget: number | null
  totalEpa: number | null
  successRate: number | null
  catchRate: number | null
  adot: number | null
  yacPerRec: number | null
  yardsPerTarget: number | null
  airYards: number
}
export interface NflRusher {
  id: string
  espnId: string | null
  name: string
  carries: number
  epaPerRush: number | null
  totalEpa: number | null
  successRate: number | null
  ypc: number | null
  explosiveRate: number | null
}

export interface JetsData {
  available: boolean
  error?: string
  updatedAt: string
  season: number
  teamCount: number
  offense: NflSummary
  defense: NflSummary
  ranks: { off: Record<string, number | null>; def: Record<string, number | null> }
  league: { team: string; offEpa: number | null; defEpa: number | null; offSuccess: number | null; defSuccess: number | null }[]
  games: { week: number; opp: string; home: boolean; off: NflSummary; def: NflSummary }[]
  byDown: { off: Record<string, NflSummary>; def: Record<string, NflSummary> }
  byQuarter: { off: Record<string, NflSummary>; def: Record<string, NflSummary> }
  bigPlays: { week: number; qtr: number; clock: string; desc: string; wpa: number; opp: string }[]
  players: { passing: Ranked<NflPasser>[]; receiving: Ranked<NflReceiver>[]; rushing: Ranked<NflRusher>[] }
}

export interface NbaFactors {
  efg: number | null
  tov: number | null
  orb: number | null
  ftr: number | null
  ts: number | null
  threeRate: number | null
  astRate: number | null
}

export interface NbaPlayerAdv {
  id: string
  name: string
  pos?: string
  gp: number
  gs: number
  min: number
  mpg: number | null
  ppg: number | null
  rpg: number | null
  apg: number | null
  ts: number | null
  efg: number | null
  usg: number | null
  astPct: number | null
  rebPct: number | null
  orebPct: number | null
  drebPct: number | null
  tovPct: number | null
  astTo: number | null
  threeRate: number | null
  ftr: number | null
  tpPct: number | null
  ftPct: number | null
  fgPct: number | null
  pts36: number | null
  reb36: number | null
  ast36: number | null
  stl36: number | null
  blk36: number | null
  tov36: number | null
  pm: number
  pmPerGame: number | null
  games: { id: string; ts: number | null; pts: number; min: number }[]
}

export interface BlazersData {
  available: boolean
  error?: string
  updatedAt: string
  season: number
  seasonLabel: string
  isCurrent: boolean
  games: {
    id: string
    date: string
    type: 'regular' | 'playoffs'
    opp: string
    home: boolean
    win: boolean
    pf: number
    pa: number
    poss: number
    pace: number
    ortg: number
    drtg: number
    us: NbaFactors
    opp4: NbaFactors
  }[]
  totals: {
    gp: number
    wins: number
    pace: number
    ortg: number
    drtg: number
    ppg: number
    oppg: number
    us: NbaFactors
    opp: NbaFactors
    quarters: { pf: number[]; pa: number[] } | null
    clutch: { games: number; wins: number; losses: number; pf: number; pa: number }
    home: { w: number; l: number; net: number }
    away: { w: number; l: number; net: number }
  } | null
  players: NbaPlayerAdv[]
  /** [x, y, made, points, playerId] */
  shots: [number, number, 0 | 1, 2 | 3, string | null][]
  oppShots: [number, number, 0 | 1, 2 | 3][]
}

type DataFor<K extends TeamKey> = K extends 'nyj' ? JetsData : BlazersData

const cache = new Map<string, Promise<unknown>>()

/** Fetch one of the JSON files the CI build writes to /data/ (cached per page load). `null` = not yet. */
export function useDataFile<T>(name: string | null) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<Error>()
  useEffect(() => {
    if (!name) return
    let alive = true
    if (!cache.has(name)) {
      cache.set(
        name,
        fetch(`${import.meta.env.BASE_URL}data/${name}.json`, { cache: 'no-cache' }).then((r) => {
          if (!r.ok) throw new Error(`Season data not available (${r.status})`)
          return r.json()
        }),
      )
    }
    cache
      .get(name)!
      .then((d) => alive && setData(d as T))
      .catch((e) => {
        cache.delete(name)
        if (alive) setError(e as Error)
      })
    return () => {
      alive = false
    }
  }, [name])
  return { data, error }
}

export function useSeasonData<K extends TeamKey>(key: K) {
  return useDataFile<DataFor<K>>(key)
}
