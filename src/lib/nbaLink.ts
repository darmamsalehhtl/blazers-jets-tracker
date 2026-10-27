import { useEffect, useState } from 'react'
import { useDataFile } from './seasonData'

// Link from a finished NBA game to its page on NBA.com (highlights, League Pass
// replay). NBA.com addresses games by its own id, which ESPN doesn't have, so:
//   1. nba-games.json from the data build (NBA.com schedule → id map),
//   2. if that's unavailable, the same schedule fetched here, once per visit,
//   3. otherwise NBA.com's games page for the day.

const NBA_SCHEDULE = 'https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json'
// NBA.com tricode → ESPN abbreviation where they differ (same table as scripts/build-data.mjs).
const NBA_TO_ESPN: Record<string, string> = { GSW: 'GS', NOP: 'NO', NYK: 'NY', SAS: 'SA', UTA: 'UTAH', WAS: 'WSH' }

export interface NbaGames {
  available: boolean
  error?: string
  season?: string
  /** "YYYY-MM-DD|AWAY|HOME" (Eastern date, ESPN codes) → "sac-vs-por-0022600012" */
  games?: Record<string, string>
}

export interface NbaLink {
  href: string
  /** true: the game's own page; false: the day's games page */
  direct: boolean
}

/** Minimal shape of an ESPN competition this needs. */
export interface GameRef {
  date: string
  competitors: { homeAway: 'home' | 'away'; team: { abbreviation: string } }[]
}

/** YYYY-MM-DD of an instant in US Eastern time, the date NBA.com files games under. */
export function easternDate(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(iso))
}

export function gameKey(comp: GameRef) {
  const team = (side: 'home' | 'away') => comp.competitors.find((c) => c.homeAway === side)?.team.abbreviation ?? ''
  return `${easternDate(comp.date)}|${team('away')}|${team('home')}`
}

export function dayUrl(comp: GameRef) {
  return `https://www.nba.com/games?date=${easternDate(comp.date)}`
}

export function resolve(comp: GameRef, games?: Record<string, string>): NbaLink {
  const path = games?.[gameKey(comp)]
  return path ? { href: `https://www.nba.com/game/${path}`, direct: true } : { href: dayUrl(comp), direct: false }
}

interface Feed {
  leagueSchedule?: {
    gameDates?: {
      games?: { gameId?: string; gameDateTimeUTC?: string; awayTeam?: { teamTricode?: string }; homeTeam?: { teamTricode?: string } }[]
    }[]
  }
}

/** The same map the build writes, from the raw NBA.com schedule feed. */
export function mapFromFeed(feed: Feed): Record<string, string> {
  const games: Record<string, string> = {}
  for (const g of feed.leagueSchedule?.gameDates?.flatMap((d) => d.games ?? []) ?? []) {
    const away = g.awayTeam?.teamTricode
    const home = g.homeTeam?.teamTricode
    if (!g.gameId || !g.gameDateTimeUTC || !away || !home) continue
    const [a, h] = [away, home].map((t) => NBA_TO_ESPN[t] ?? t)
    games[`${easternDate(g.gameDateTimeUTC)}|${a}|${h}`] = `${away.toLowerCase()}-vs-${home.toLowerCase()}-${g.gameId}`
  }
  return games
}

let browserMap: Promise<Record<string, string> | null> | undefined
/** Fallback when the build couldn't reach NBA.com: try from the browser, once per visit. */
function loadBrowserMap() {
  browserMap ??= fetch(NBA_SCHEDULE)
    .then((r) => (r.ok ? r.json() : null))
    .then((feed: Feed | null) => (feed ? mapFromFeed(feed) : null))
    .catch(() => null)
  return browserMap
}

/** The NBA.com link for a finished game; starts as the day page and upgrades once the id is known. */
export function useNbaLink(comp: GameRef): NbaLink {
  const { data, error } = useDataFile<NbaGames>('nba-games')
  const [fromBrowser, setFromBrowser] = useState<Record<string, string> | null>(null)
  const buildMissing = !!error || (data !== undefined && !data.available)

  useEffect(() => {
    if (!buildMissing) return
    let alive = true
    loadBrowserMap().then((m) => alive && setFromBrowser(m))
    return () => {
      alive = false
    }
  }, [buildMissing])

  return resolve(comp, data?.available ? data.games : (fromBrowser ?? undefined))
}
